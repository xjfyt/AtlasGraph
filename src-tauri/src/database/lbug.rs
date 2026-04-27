use super::{AppState, ConnectRequest, ConnectResponse, GraphData, GraphEdge, GraphNode, ItemCount, SchemaStats};
use serde_json::{json, Value};
use lbug::{Connection, Database, SystemConfig, Value as LbugValue, NodeVal, RelVal};

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<ConnectResponse, String> {
    let path = req.lbug_path.as_deref().unwrap_or("").trim();
    if path.is_empty() { return Err("Ladybug 数据库路径不能为空".into()); }
    let db_path = std::path::Path::new(path);

    if let Some(parent) = db_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("创建数据库目录失败: {}", e))?;
        }
    }

    let auto_created = !db_path.exists();

    {
        let mut kd = state.lbug_db.lock().await;
        *kd = None;
    }
    {
        let mut info = state.connection_info.lock().await;
        info.connected = false;
        info.read_only = false;
    }

    let rw_err = match Database::new(path, SystemConfig::default()) {
        Ok(db) => {
            let mut info = state.connection_info.lock().await;
            info.read_only = false;
            drop(info);
            return finish_connect(state, path, db, false, auto_created).await;
        }
        Err(err) => err,
    };

    let db = Database::new(path, SystemConfig::default().read_only(true))
        .map_err(|ro_err| {
            format!(
                "Ladybug Database 初始化失败: {}; 只读打开也失败: {}",
                rw_err, ro_err
            )
        })?;

    finish_connect(state, path, db, true, auto_created).await
}

async fn finish_connect(
    state: &AppState,
    path: &str,
    db: Database,
    read_only: bool,
    auto_created: bool,
) -> Result<ConnectResponse, String> {

    {
        let mut kd = state.lbug_db.lock().await;
        *kd = Some(db);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = false;
        info.db_type = "lbug".to_string();
        info.connected = true;
        info.read_only = read_only;
        info.path = path.to_string();
        info.database = "default".to_string();
    }

    {
        let db_lock = state.lbug_db.lock().await;
        if let Some(db_ref) = db_lock.as_ref() {
            let conn = Connection::new(db_ref).map_err(|e| format!("无法创建验证连接: {}", e))?;
            conn.query("MATCH (n) RETURN n LIMIT 1").map_err(|e| format!("连接验证失败: {}", e))?;
        }
    }

    let message = if auto_created && read_only {
        format!("目标路径不存在，已自动创建新的 Ladybug 数据库，并以只读模式连接: {}", path)
    } else if auto_created {
        format!("目标路径不存在，已自动创建并连接到新的 Ladybug 数据库: {}", path)
    } else if read_only {
        format!("已以只读模式连接到 Ladybug: {}", path)
    } else {
        format!("已成功连接到 Ladybug: {}", path)
    };

    Ok(ConnectResponse { message, read_only, auto_created })
}

pub async fn execute(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let db_lock = state.lbug_db.lock().await;
    let db = db_lock.as_ref().ok_or("Ladybug 连接不存在")?;
    let conn = Connection::new(db).map_err(|e| format!("初始化连接失败: {}", e))?;
    let result = conn.query(cypher).map_err(|e| format!("Ladybug 查询执行失败: {}", e))?;
    let mut nodes = std::collections::HashMap::new(); let mut edges = std::collections::HashMap::new();
    for row in result {
        for val in row { traverse_value(&val, &mut nodes, &mut edges); }
    }
    if super::is_write_query(cypher) { let _ = conn.query("CHECKPOINT;"); }
    Ok(GraphData { nodes: nodes.into_values().collect(), edges: edges.into_values().collect() })
}

pub async fn get_schema_stats(state: &AppState) -> Result<SchemaStats, String> {
    let mut stats = SchemaStats { total_nodes: 0, total_edges: 0, labels: Vec::new(), rel_types: Vec::new() };
    let db_lock = state.lbug_db.lock().await;
    let db = db_lock.as_ref().ok_or("Ladybug 连接已断开")?;
    let conn = Connection::new(db).map_err(|e| format!("连接失效: {}", e))?;
    if let Ok(mut res) = conn.query("CALL show_tables() RETURN *") {
        let mut node_tables = Vec::new(); let mut rel_tables = Vec::new();
        while let Some(row) = res.next() {
            let mut name_val = "".to_string(); let mut type_val = "".to_string();
            for v in &row {
                if let LbugValue::String(s) = v {
                    if s == "NODE" || s == "REL" { type_val = s.clone(); continue; }
                }
            }
            if type_val == "NODE" {
                if let LbugValue::String(s) = &row[1] { name_val = s.clone(); }
                if !name_val.is_empty() { node_tables.push(name_val); }
            } else if type_val == "REL" {
                if let LbugValue::String(s) = &row[1] { name_val = s.clone(); }
                if !name_val.is_empty() { rel_tables.push(name_val); }
            }
        }
        for table_name in node_tables {
            if let Ok(mut c_res) = conn.query(&format!("MATCH (n:{}) RETURN count(n)", table_name)) {
                if let Some(c_row) = c_res.next() {
                    if !c_row.is_empty() {
                        if let LbugValue::Int64(c) = c_row[0] { stats.total_nodes += c; stats.labels.push(ItemCount { name: table_name, count: c }); }
                    }
                }
            }
        }
        for table_name in rel_tables {
            if let Ok(mut c_res) = conn.query(&format!("MATCH ()-[r:{}]->() RETURN count(r)", table_name)) {
                if let Some(c_row) = c_res.next() {
                    if !c_row.is_empty() {
                        if let LbugValue::Int64(c) = c_row[0] { stats.total_edges += c; stats.rel_types.push(ItemCount { name: table_name, count: c }); }
                    }
                }
            }
        }
    }
    Ok(stats)
}

fn traverse_value(val: &LbugValue, nodes: &mut std::collections::HashMap<String, GraphNode>, edges: &mut std::collections::HashMap<String, GraphEdge>) {
    match val {
        LbugValue::Node(n_val) => { let n = extract_node(n_val); nodes.insert(n.id.clone(), n); }
        LbugValue::Rel(r_val) => { let e = extract_rel(r_val); edges.insert(e.id.clone(), e); }
        LbugValue::RecursiveRel { nodes: n_list, rels: r_list } => {
            for n_val in n_list { let n = extract_node(n_val); nodes.insert(n.id.clone(), n); }
            for r_val in r_list { let e = extract_rel(r_val); edges.insert(e.id.clone(), e); }
        }
        LbugValue::List(_, items) | LbugValue::Array(_, items) => { for item in items { traverse_value(item, nodes, edges); } }
        LbugValue::Struct(fields) => { for (_, item) in fields { traverse_value(item, nodes, edges); } }
        LbugValue::Map(_, pairs) => { for (k, v) in pairs { traverse_value(k, nodes, edges); traverse_value(v, nodes, edges); } }
        LbugValue::Union { value, .. } => { traverse_value(value, nodes, edges); }
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

fn val_to_json(val: &LbugValue) -> Value {
    match val {
        LbugValue::Bool(b) => json!(b),
        LbugValue::Int64(i) => json!(i), LbugValue::Int32(i) => json!(i), LbugValue::Int16(i) => json!(i), LbugValue::Int8(i) => json!(i),
        LbugValue::UInt64(i) => json!(i), LbugValue::UInt32(i) => json!(i), LbugValue::UInt16(i) => json!(i), LbugValue::UInt8(i) => json!(i),
        LbugValue::Double(d) => json!(d), LbugValue::Float(f) => json!(f),
        LbugValue::String(s) => Value::String(s.clone()),
        LbugValue::Date(d) => Value::String(d.to_string()),
        LbugValue::Timestamp(t) => Value::String(t.to_string()),
        LbugValue::Interval(i) => Value::String(i.to_string()),
        LbugValue::List(_, l) => Value::Array(l.iter().map(val_to_json).collect()),
        _ => Value::String(format!("{:?}", val)),
    }
}
