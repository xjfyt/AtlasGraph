use super::{AppState, ConnectRequest, GraphData, GraphEdge, GraphNode, ItemCount, SchemaStats};
use serde_json::{json, Value};
use kuzu::{Connection, Database, SystemConfig, Value as KuzuValue, NodeVal, RelVal};

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    let raw_path = req.kuzu_path.as_deref().unwrap_or("").trim();
    if raw_path.is_empty() { return Err("Kuzu 数据库路径不能为空".into()); }

    let db_path = std::path::Path::new(raw_path);
    let path = if db_path.is_dir() {
        db_path.join("default.kuzu").to_str().ok_or_else(|| "路径包含非法字符".to_string())?.to_string()
    } else {
        if let Some(parent) = db_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("创建数据库目录失败: {}", e))?;
            }
        }
        raw_path.to_string()
    };

    let db = Database::new(&path, SystemConfig::default())
        .map_err(|e| format!("Kuzu Database 初始化失败: {}", e))?;

    {
        let mut kd = state.kuzu_db.lock().await;
        *kd = Some(db);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = false;
        info.db_type = "kuzu".to_string();
        info.connected = true;
        info.path = path.to_string();
        info.database = "default".to_string();
    }
    Ok(format!("已成功连接到 Kuzu: {}", path))
}

pub async fn execute(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let db_lock = state.kuzu_db.lock().await;
    let db = db_lock.as_ref().ok_or("Kuzu 连接不存在")?;
    let conn = Connection::new(db).map_err(|e| format!("初始化连接失败: {}", e))?;
    let result = conn.query(cypher).map_err(|e| format!("Kuzu 查询执行失败: {}", e))?;
    let mut nodes = std::collections::HashMap::new(); let mut edges = std::collections::HashMap::new();
    for row in result {
        for val in row { traverse_value(&val, &mut nodes, &mut edges); }
    }
    Ok(GraphData { nodes: nodes.into_values().collect(), edges: edges.into_values().collect() })
}

pub async fn get_schema_stats(state: &AppState) -> Result<SchemaStats, String> {
    let mut stats = SchemaStats { total_nodes: 0, total_edges: 0, labels: Vec::new(), rel_types: Vec::new() };
    let db_lock = state.kuzu_db.lock().await;
    let db = db_lock.as_ref().ok_or("Kuzu 连接已断开")?;
    let conn = Connection::new(db).map_err(|e| format!("连接失效: {}", e))?;
    if let Ok(mut res) = conn.query("CALL show_tables() RETURN *") {
        let mut node_tables = Vec::new(); let mut rel_tables = Vec::new();
        while let Some(row) = res.next() {
            let mut name_val = "".to_string(); let mut type_val = "".to_string();
            for v in &row {
                if let KuzuValue::String(s) = v {
                    if s == "NODE" || s == "REL" { type_val = s.clone(); continue; }
                }
            }
            if type_val == "NODE" {
                if let KuzuValue::String(s) = &row[1] { name_val = s.clone(); }
                if !name_val.is_empty() { node_tables.push(name_val); }
            } else if type_val == "REL" {
                if let KuzuValue::String(s) = &row[1] { name_val = s.clone(); }
                if !name_val.is_empty() { rel_tables.push(name_val); }
            }
        }
        for table_name in node_tables {
            if let Ok(mut c_res) = conn.query(&format!("MATCH (n:{}) RETURN count(n)", table_name)) {
                if let Some(c_row) = c_res.next() {
                    if !c_row.is_empty() {
                        if let KuzuValue::Int64(c) = c_row[0] { stats.total_nodes += c; stats.labels.push(ItemCount { name: table_name, count: c }); }
                    }
                }
            }
        }
        for table_name in rel_tables {
            if let Ok(mut c_res) = conn.query(&format!("MATCH ()-[r:{}]->() RETURN count(r)", table_name)) {
                if let Some(c_row) = c_res.next() {
                    if !c_row.is_empty() {
                        if let KuzuValue::Int64(c) = c_row[0] { stats.total_edges += c; stats.rel_types.push(ItemCount { name: table_name, count: c }); }
                    }
                }
            }
        }
    }
    Ok(stats)
}

fn traverse_value(val: &KuzuValue, nodes: &mut std::collections::HashMap<String, GraphNode>, edges: &mut std::collections::HashMap<String, GraphEdge>) {
    match val {
        KuzuValue::Node(n_val) => { let n = extract_node(n_val); nodes.insert(n.id.clone(), n); }
        KuzuValue::Rel(r_val) => { let e = extract_rel(r_val); edges.insert(e.id.clone(), e); }
        KuzuValue::RecursiveRel { nodes: n_list, rels: r_list } => {
            for n_val in n_list { let n = extract_node(n_val); nodes.insert(n.id.clone(), n); }
            for r_val in r_list { let e = extract_rel(r_val); edges.insert(e.id.clone(), e); }
        }
        KuzuValue::List(_, items) | KuzuValue::Array(_, items) => { for item in items { traverse_value(item, nodes, edges); } }
        KuzuValue::Struct(fields) => { for (_, item) in fields { traverse_value(item, nodes, edges); } }
        KuzuValue::Map(_, pairs) => { for (k, v) in pairs { traverse_value(k, nodes, edges); traverse_value(v, nodes, edges); } }
        KuzuValue::Union { value, .. } => { traverse_value(value, nodes, edges); }
        _ => {}
    }
}

fn extract_node(node: &NodeVal) -> GraphNode {
    let mut props = serde_json::Map::new();
    for (k, v) in node.get_properties() { props.insert(k.clone(), val_to_json(v)); }
    props.insert("_labels".to_string(), json!([node.get_label_name()]));
    GraphNode { id: format!("{}:{}", node.get_node_id().table_id, node.get_node_id().offset), properties: Value::Object(props) }
}

fn extract_rel(rel: &RelVal) -> GraphEdge {
    let mut props = serde_json::Map::new();
    for (k, v) in rel.get_properties() { props.insert(k.clone(), val_to_json(v)); }
    let src = rel.get_src_node(); let dst = rel.get_dst_node(); let label = rel.get_label_name();
    GraphEdge {
        id: format!("{}:{}-{}->{}:{}", src.table_id, src.offset, label, dst.table_id, dst.offset),
        source: format!("{}:{}", src.table_id, src.offset), target: format!("{}:{}", dst.table_id, dst.offset),
        label: label.to_string(), properties: Value::Object(props),
    }
}

fn val_to_json(val: &KuzuValue) -> Value {
    match val {
        KuzuValue::Bool(b) => json!(b),
        KuzuValue::Int64(i) => json!(i), KuzuValue::Int32(i) => json!(i), KuzuValue::Int16(i) => json!(i), KuzuValue::Int8(i) => json!(i),
        KuzuValue::UInt64(i) => json!(i), KuzuValue::UInt32(i) => json!(i), KuzuValue::UInt16(i) => json!(i), KuzuValue::UInt8(i) => json!(i),
        KuzuValue::Double(d) => json!(d), KuzuValue::Float(f) => json!(f),
        KuzuValue::String(s) => Value::String(s.clone()),
        KuzuValue::Date(d) => Value::String(d.to_string()),
        KuzuValue::Timestamp(t) => Value::String(t.to_string()),
        KuzuValue::Interval(i) => Value::String(i.to_string()),
        KuzuValue::List(_, l) => Value::Array(l.iter().map(val_to_json).collect()),
        _ => Value::String(format!("{:?}", val)),
    }
}
