use super::{AppState, ConnectRequest, DatabaseInfo, GraphData, GraphEdge, GraphNode, ItemCount, SchemaStats};
use neo4rs::{query, BoltType, ConfigBuilder, Graph};
use serde_json::{json, Value};

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    let uri = req.uri.as_deref().unwrap_or("").trim();
    let user = req.user.as_deref().unwrap_or("neo4j").trim();
    let password = req.password.as_deref().unwrap_or("").trim();
    let database = req.database.as_deref().unwrap_or("neo4j").trim();

    if uri.is_empty() { return Err("连接 URI 不能为空".into()); }
    if password.is_empty() { return Err("密码不能为空".into()); }

    let config = ConfigBuilder::default().uri(uri).user(user).password(password).db(database).build()
        .map_err(|e| format!("配置错误: {}", e))?;

    let graph = Graph::connect(config).await.map_err(|e| format!("Neo4j 连接失败: {}", e))?;

    let mut result = graph.execute(query("RETURN 1 AS ping")).await.map_err(|e| format!("连接验证失败: {}", e))?;
    let _row = result.next().await.map_err(|e| format!("连接验证失败: {}", e))?;

    {
        let mut g = state.neo4j_graph.lock().await;
        *g = Some(graph);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = true;
        info.db_type = "neo4j".to_string();
        info.connected = true;
        info.uri = uri.to_string();
        info.user = user.to_string();
        info.database = database.to_string();
    }
    Ok(format!("已成功连接到 Neo4j ({}@{})", database, uri))
}

pub async fn execute(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let graph_lock = state.neo4j_graph.lock().await;
    let graph = graph_lock.as_ref().ok_or("Neo4j 连接已断开，请重新连接")?;
    if super::is_write_query(cypher) { return execute_write(graph, cypher).await; }

    let mut result = graph.execute(query(cypher)).await.map_err(|e| format!("查询执行失败: {}", e))?;
    let mut nodes: Vec<GraphNode> = Vec::new(); let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen_node_ids = std::collections::HashSet::new(); let mut seen_edge_ids = std::collections::HashSet::new();
    let aliases = super::extract_return_aliases(cypher);
    while let Ok(Some(row)) = result.next().await {
        process_row(&row, &aliases, &mut nodes, &mut edges, &mut seen_node_ids, &mut seen_edge_ids);
    }
    Ok(GraphData { nodes, edges })
}

async fn execute_write(graph: &Graph, cypher: &str) -> Result<GraphData, String> {
    let mut txn = graph.start_txn().await.map_err(|e| format!("开启事务失败: {}", e))?;
    let mut nodes: Vec<GraphNode> = Vec::new(); let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen_node_ids = std::collections::HashSet::new(); let mut seen_edge_ids = std::collections::HashSet::new();
    let aliases = super::extract_return_aliases(cypher);
    {
        let mut stream = txn.execute(query(cypher)).await.map_err(|e| format!("查询执行失败: {}", e))?;
        loop {
            match stream.next(txn.handle()).await {
                Ok(Some(row)) => process_row(&row, &aliases, &mut nodes, &mut edges, &mut seen_node_ids, &mut seen_edge_ids),
                Ok(None) => break,
                Err(e) => { let _ = txn.rollback().await; return Err(format!("查询执行失败: {}", e)); }
            }
        }
    }
    txn.commit().await.map_err(|e| format!("提交事务失败: {}", e))?;
    Ok(GraphData { nodes, edges })
}

pub async fn list_databases(state: &AppState) -> Result<Vec<DatabaseInfo>, String> {
    let graph_lock = state.neo4j_graph.lock().await;
    let graph = graph_lock.as_ref().ok_or("Neo4j 连接不存在")?;
    let mut result = graph.execute(query("SHOW DATABASES")).await.map_err(|e| format!("查询数据库列表失败: {}", e))?;
    let mut databases = Vec::new();
    while let Ok(Some(row)) = result.next().await {
        let name: String = row.get("name").unwrap_or_default();
        let is_default: bool = row.get("default").unwrap_or(false);
        let status: String = row.get("currentStatus").unwrap_or_default();
        if name == "system" { continue; }
        databases.push(DatabaseInfo { name, is_default, status });
    }
    if databases.is_empty() {
        databases.push(DatabaseInfo { name: "neo4j".into(), is_default: true, status: "online".into() });
    }
    Ok(databases)
}

pub async fn switch_database(state: &AppState, db_name: &str) -> Result<String, String> {
    {
        let mut ci = state.connection_info.lock().await;
        ci.database = db_name.to_string();
    }
    Ok(format!("已切换到数据库: {}", db_name))
}

pub async fn get_schema_stats(state: &AppState) -> Result<SchemaStats, String> {
    let mut stats = SchemaStats { total_nodes: 0, total_edges: 0, labels: Vec::new(), rel_types: Vec::new() };
    let graph_lock = state.neo4j_graph.lock().await;
    let graph = graph_lock.as_ref().ok_or("Neo4j 连接已断开")?;
    if let Ok(mut res) = graph.execute(query("MATCH (n) RETURN count(n) AS c")).await {
        if let Ok(Some(row)) = res.next().await { stats.total_nodes = row.get("c").unwrap_or(0); }
    }
    if let Ok(mut res) = graph.execute(query("MATCH ()-[r]->() RETURN count(r) AS c")).await {
        if let Ok(Some(row)) = res.next().await { stats.total_edges = row.get("c").unwrap_or(0); }
    }
    if let Ok(mut res) = graph.execute(query("MATCH (n) WITH labels(n) AS labels UNWIND labels AS label RETURN label, count(*) AS c")).await {
        while let Ok(Some(row)) = res.next().await { stats.labels.push(ItemCount { name: row.get("label").unwrap_or_default(), count: row.get("c").unwrap_or(0) }); }
    }
    if let Ok(mut res) = graph.execute(query("MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS c")).await {
        while let Ok(Some(row)) = res.next().await { stats.rel_types.push(ItemCount { name: row.get("type").unwrap_or_default(), count: row.get("c").unwrap_or(0) }); }
    }
    stats.labels.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));
    stats.rel_types.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));
    Ok(stats)
}

// ==== 帮助方法 ====
fn process_row(
    row: &neo4rs::Row, aliases: &[String], nodes: &mut Vec<GraphNode>, edges: &mut Vec<GraphEdge>,
    seen_node_ids: &mut std::collections::HashSet<String>, seen_edge_ids: &mut std::collections::HashSet<String>,
) {
    for col in aliases {
        if let Ok(node) = row.get::<neo4rs::Node>(col) {
            let id_val = node.id().to_string();
            if seen_node_ids.insert(id_val.clone()) { nodes.push(extract_node(&node)); }
        }
        if let Ok(rel) = row.get::<neo4rs::Relation>(col) {
            let rel_id = rel.id().to_string();
            if seen_edge_ids.insert(rel_id.clone()) {
                edges.push(GraphEdge { id: rel_id, source: rel.start_node_id().to_string(), target: rel.end_node_id().to_string(), label: rel.typ().to_string(), properties: extract_rel_props(&rel) });
            }
        }
        if let Ok(path) = row.get::<neo4rs::Path>(col) {
            let path_nodes = path.nodes();
            let path_rels = path.rels();
            for node in &path_nodes {
                let id_val = node.id().to_string();
                if seen_node_ids.insert(id_val.clone()) { nodes.push(extract_node(node)); }
            }
            for (i, rel) in path_rels.iter().enumerate() {
                let rel_id = rel.id().to_string();
                if i >= path_nodes.len() || i + 1 >= path_nodes.len() { continue; }
                if seen_edge_ids.insert(rel_id.clone()) {
                    edges.push(GraphEdge { id: rel_id, source: path_nodes[i].id().to_string(), target: path_nodes[i + 1].id().to_string(), label: rel.typ().to_string(), properties: extract_path_rel_props(rel) });
                }
            }
        }
    }
}

fn extract_node(node: &neo4rs::Node) -> GraphNode {
    let mut props = serde_json::Map::new();
    for key in node.keys() {
        if let Ok(bt) = node.get::<BoltType>(&key) { props.insert(key.to_string(), bolt_to_json(&bt)); }
    }
    props.insert("_labels".to_string(), json!(node.labels().to_vec()));
    GraphNode { id: node.id().to_string(), properties: Value::Object(props) }
}

fn extract_rel_props(rel: &neo4rs::Relation) -> Value {
    let mut props = serde_json::Map::new();
    for key in rel.keys() {
        if let Ok(bt) = rel.get::<BoltType>(&key) { props.insert(key.to_string(), bolt_to_json(&bt)); }
    }
    Value::Object(props)
}

fn extract_path_rel_props(rel: &neo4rs::UnboundedRelation) -> Value {
    let mut props = serde_json::Map::new();
    for key in rel.keys() {
        if let Ok(bt) = rel.get::<BoltType>(&key) { props.insert(key.to_string(), bolt_to_json(&bt)); }
    }
    Value::Object(props)
}

fn bolt_to_json(bt: &BoltType) -> Value {
    match bt {
        BoltType::Null(_) => Value::Null,
        BoltType::Boolean(b) => json!(b.value),
        BoltType::Integer(i) => json!(i.value),
        BoltType::Float(f) => json!(f.value),
        BoltType::String(s) => Value::String(s.value.clone()),
        BoltType::List(l) => Value::Array(l.value.iter().map(bolt_to_json).collect()),
        BoltType::Map(m) => {
            let mut obj = serde_json::Map::new();
            for (k, v) in &m.value { obj.insert(k.value.clone(), bolt_to_json(v)); }
            Value::Object(obj)
        }
        BoltType::Bytes(b) => json!(b.value.iter().copied().collect::<Vec<u8>>()),
        other => Value::String(format!("{:?}", other)),
    }
}
