use lbug::{Connection, Database, SystemConfig, Value as LbugValue, NodeVal, RelVal};
use neo4rs::{BoltType, ConfigBuilder, Graph, query};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;

// ===== 请求/响应结构 =====

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConnectRequest {
    pub is_neo4j: bool,
    pub uri: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub lbug_path: Option<String>,
    pub database: Option<String>, // 指定数据库名称
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct QueryRequest {
    pub query: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Serialize, Debug, Clone)]
pub struct GraphNode {
    pub id: String,
    pub properties: Value,
}

#[derive(Serialize, Debug, Clone)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub label: String,
    pub properties: Value,
}

#[derive(Serialize, Debug, Clone)]
pub struct DatabaseInfo {
    pub name: String,
    pub is_default: bool,
    pub status: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct SchemaStats {
    pub total_nodes: i64,
    pub total_edges: i64,
    pub labels: Vec<ItemCount>,
    pub rel_types: Vec<ItemCount>,
}

#[derive(Serialize, Debug, Clone)]
pub struct ItemCount {
    pub name: String,
    pub count: i64,
}

// ===== 连接状态 =====

pub struct AppState {
    pub neo4j_graph: Arc<Mutex<Option<Graph>>>,
    pub lbug_db: Arc<Mutex<Option<Database>>>,
    pub connection_info: Arc<Mutex<ConnectionInfo>>,
}

#[derive(Debug, Clone, Default)]
pub struct ConnectionInfo {
    pub is_neo4j: bool,
    pub connected: bool,
    pub uri: String,
    pub user: String,
    pub database: String,
    pub lbug_path: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            neo4j_graph: Arc::new(Mutex::new(None)),
            lbug_db: Arc::new(Mutex::new(None)),
            connection_info: Arc::new(Mutex::new(ConnectionInfo::default())),
        }
    }
}

// ===== 连接数据库 =====

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    if req.is_neo4j {
        connect_neo4j(state, req).await
    } else {
        connect_lbug(state, req).await
    }
}

async fn connect_neo4j(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    let uri = req.uri.as_deref().unwrap_or("").trim();
    let user = req.user.as_deref().unwrap_or("neo4j").trim();
    let password = req.password.as_deref().unwrap_or("").trim();
    let database = req.database.as_deref().unwrap_or("neo4j").trim();

    if uri.is_empty() {
        return Err("连接 URI 不能为空".into());
    }
    if password.is_empty() {
        return Err("密码不能为空".into());
    }

    // 构建配置
    let config = ConfigBuilder::default()
        .uri(uri)
        .user(user)
        .password(password)
        .db(database)
        .build()
        .map_err(|e| format!("配置错误: {}", e))?;

    // 尝试连接
    let graph = Graph::connect(config)
        .await
        .map_err(|e| format!("Neo4j 连接失败: {}", e))?;

    // 验证连接：执行一个简单查询
    let mut result = graph
        .execute(query("RETURN 1 AS ping"))
        .await
        .map_err(|e| format!("连接验证失败: {}", e))?;

    let _row = result
        .next()
        .await
        .map_err(|e| format!("连接验证失败: {}", e))?;

    // 保存连接
    {
        let mut g = state.neo4j_graph.lock().await;
        *g = Some(graph);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = true;
        info.connected = true;
        info.uri = uri.to_string();
        info.user = user.to_string();
        info.database = database.to_string();
    }

    Ok(format!("已成功连接到 Neo4j ({}@{})", database, uri))
}

async fn connect_lbug(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    let path = req.lbug_path.as_deref().unwrap_or("").trim();
    if path.is_empty() {
        return Err("Ladybug 数据库路径不能为空".into());
    }

    // 先释放已有连接/Database，让 Drop 释放文件锁，避免重复连接同一数据库时报 lock 错误
    {
        let mut kd = state.lbug_db.lock().await;
        *kd = None;
    }
    {
        let mut g = state.neo4j_graph.lock().await;
        *g = None;
    }
    {
        let mut info = state.connection_info.lock().await;
        info.connected = false;
    }

    // 建立真实的 Ladybug 连接
    let db = Database::new(path, SystemConfig::default())
        .map_err(|e| format!("Ladybug Database 初始化失败: {}", e))?;

    {
        let mut kd = state.lbug_db.lock().await;
        *kd = Some(db);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = false;
        info.connected = true;
        info.lbug_path = path.to_string();
        info.database = "default".to_string();
    }

    // 简单的连接验证
    {
        let db_lock = state.lbug_db.lock().await;
        if let Some(db_ref) = db_lock.as_ref() {
            let conn = Connection::new(db_ref).map_err(|e| format!("无法创建验证连接: {}", e))?;
            conn.query("MATCH (n) RETURN n LIMIT 1").map_err(|e| format!("连接验证失败: {}", e))?;
        }
    }

    Ok(format!("已成功连接到 Ladybug: {}", path))
}

// ===== 列出数据库 =====

pub async fn list_databases(state: &AppState) -> Result<Vec<DatabaseInfo>, String> {
    let info = state.connection_info.lock().await.clone();

    if !info.connected {
        return Err("尚未连接数据库".into());
    }

    if info.is_neo4j {
        let graph_lock = state.neo4j_graph.lock().await;
        let graph = graph_lock.as_ref().ok_or("Neo4j 连接不存在")?;

        let mut result = graph
            .execute(query("SHOW DATABASES"))
            .await
            .map_err(|e| format!("查询数据库列表失败: {}", e))?;

        let mut databases = Vec::new();
        while let Ok(Some(row)) = result.next().await {
            let name: String = row.get("name").unwrap_or_default();
            let is_default: bool = row.get("default").unwrap_or(false);
            let status: String = row.get("currentStatus").unwrap_or_default();

            // 跳过 system 数据库
            if name == "system" {
                continue;
            }

            databases.push(DatabaseInfo {
                name,
                is_default,
                status,
            });
        }

        if databases.is_empty() {
            // 如果 SHOW DATABASES 没返回结果（可能是社区版），返回默认
            databases.push(DatabaseInfo {
                name: "neo4j".into(),
                is_default: true,
                status: "online".into(),
            });
        }

        Ok(databases)
    } else {
        // Ladybug 只有一个默认数据库
        Ok(vec![DatabaseInfo {
            name: "default".into(),
            is_default: true,
            status: "online".into(),
        }])
    }
}

// ===== 切换数据库 =====

pub async fn switch_database(state: &AppState, db_name: &str) -> Result<String, String> {
    let info = state.connection_info.lock().await.clone();

    if !info.connected {
        return Err("尚未连接数据库".into());
    }

    if info.is_neo4j {
        // 更新 connection_info 中的 database
        // 注意: 完整实现中应存储密码并重新连接到新数据库
        {
            let mut ci = state.connection_info.lock().await;
            ci.database = db_name.to_string();
        }

        Ok(format!("已切换到数据库: {}", db_name))
    } else {
        Ok("Ladybug 仅支持单数据库".into())
    }
}

// ===== 执行 Cypher 查询 =====

pub async fn execute(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let info = state.connection_info.lock().await.clone();

    if !info.connected {
        return Err("尚未连接数据库，请先点击「连接」按钮".into());
    }

    if info.is_neo4j {
        execute_neo4j(state, cypher).await
    } else {
        execute_lbug(state, cypher).await
    }
}

fn is_write_query(cypher: &str) -> bool {
    let upper = cypher.to_uppercase();
    ["CREATE", "MERGE", "SET ", "DELETE", "REMOVE", "DETACH"]
        .iter()
        .any(|kw| upper.contains(kw))
}

/// 把 neo4rs 的 BoltType 转成 serde_json::Value（用于把节点/边属性暴露给前端）。
/// 没有 catch-all 类型在 BoltType 上，所以这里穷举枚举的所有变体。
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
            for (k, v) in &m.value {
                obj.insert(k.value.clone(), bolt_to_json(v));
            }
            Value::Object(obj)
        }
        BoltType::Bytes(b) => json!(b.value.iter().copied().collect::<Vec<u8>>()),
        // 时间/几何/复合类型：转字符串展示，避免数据丢失
        other => Value::String(format!("{:?}", other)),
    }
}

fn extract_neo4j_node(node: &neo4rs::Node) -> GraphNode {
    let mut props = serde_json::Map::new();
    for key in node.keys() {
        if let Ok(bt) = node.get::<BoltType>(&key) {
            props.insert(key.to_string(), bolt_to_json(&bt));
        }
    }
    props.insert("_labels".to_string(), json!(node.labels().to_vec()));
    GraphNode { id: node.id().to_string(), properties: Value::Object(props) }
}

fn extract_neo4j_rel_props(rel: &neo4rs::Relation) -> Value {
    let mut props = serde_json::Map::new();
    for key in rel.keys() {
        if let Ok(bt) = rel.get::<BoltType>(&key) {
            props.insert(key.to_string(), bolt_to_json(&bt));
        }
    }
    Value::Object(props)
}

fn extract_neo4j_path_rel_props(rel: &neo4rs::UnboundedRelation) -> Value {
    let mut props = serde_json::Map::new();
    for key in rel.keys() {
        if let Ok(bt) = rel.get::<BoltType>(&key) {
            props.insert(key.to_string(), bolt_to_json(&bt));
        }
    }
    Value::Object(props)
}

fn process_neo4j_row(
    row: &neo4rs::Row,
    aliases: &[String],
    nodes: &mut Vec<GraphNode>,
    edges: &mut Vec<GraphEdge>,
    seen_node_ids: &mut std::collections::HashSet<String>,
    seen_edge_ids: &mut std::collections::HashSet<String>,
) {
    for col in aliases {
        if let Ok(node) = row.get::<neo4rs::Node>(col) {
            let id_val = node.id().to_string();
            if seen_node_ids.insert(id_val.clone()) {
                nodes.push(extract_neo4j_node(&node));
            }
        }

        if let Ok(rel) = row.get::<neo4rs::Relation>(col) {
            let rel_id = rel.id().to_string();
            if seen_edge_ids.insert(rel_id.clone()) {
                edges.push(GraphEdge {
                    id: rel_id,
                    source: rel.start_node_id().to_string(),
                    target: rel.end_node_id().to_string(),
                    label: rel.typ().to_string(),
                    properties: extract_neo4j_rel_props(&rel),
                });
            }
        }

        // UnboundedRelation 没有起止节点 ID，渲染层会因 from/to 为空而崩溃 -> 直接跳过
        // 完整的 Relation/Path 路径会单独处理

        if let Ok(path) = row.get::<neo4rs::Path>(col) {
            let path_nodes = path.nodes();
            let path_rels = path.rels();
            for node in &path_nodes {
                let id_val = node.id().to_string();
                if seen_node_ids.insert(id_val.clone()) {
                    nodes.push(extract_neo4j_node(node));
                }
            }
            for (i, rel) in path_rels.iter().enumerate() {
                let rel_id = rel.id().to_string();
                // 必须能在 path_nodes 中找到两端节点；否则跳过，避免推送 source/target 为空的边
                if i >= path_nodes.len() || i + 1 >= path_nodes.len() {
                    continue;
                }
                if seen_edge_ids.insert(rel_id.clone()) {
                    edges.push(GraphEdge {
                        id: rel_id,
                        source: path_nodes[i].id().to_string(),
                        target: path_nodes[i + 1].id().to_string(),
                        label: rel.typ().to_string(),
                        properties: extract_neo4j_path_rel_props(rel),
                    });
                }
            }
        }
    }
}

async fn execute_neo4j_write(graph: &Graph, cypher: &str) -> Result<GraphData, String> {
    let mut txn = graph
        .start_txn()
        .await
        .map_err(|e| format!("开启事务失败: {}", e))?;

    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen_node_ids = std::collections::HashSet::new();
    let mut seen_edge_ids = std::collections::HashSet::new();
    let aliases = extract_return_aliases(cypher);

    {
        let mut stream = txn
            .execute(query(cypher))
            .await
            .map_err(|e| format!("查询执行失败: {}", e))?;

        loop {
            match stream.next(txn.handle()).await {
                Ok(Some(row)) => process_neo4j_row(
                    &row, &aliases,
                    &mut nodes, &mut edges,
                    &mut seen_node_ids, &mut seen_edge_ids,
                ),
                Ok(None) => break,
                Err(e) => {
                    let _ = txn.rollback().await;
                    return Err(format!("查询执行失败: {}", e));
                }
            }
        }
    }

    txn.commit()
        .await
        .map_err(|e| format!("提交事务失败: {}", e))?;

    Ok(GraphData { nodes, edges })
}

async fn execute_neo4j(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let graph_lock = state.neo4j_graph.lock().await;
    let graph = graph_lock.as_ref().ok_or("Neo4j 连接已断开，请重新连接")?;

    // 写操作显式使用事务 + commit，避免某些情况下自动提交不生效
    if is_write_query(cypher) {
        return execute_neo4j_write(graph, cypher).await;
    }

    let mut result = graph
        .execute(query(cypher))
        .await
        .map_err(|e| format!("查询执行失败: {}", e))?;

    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen_node_ids = std::collections::HashSet::new();
    let mut seen_edge_ids = std::collections::HashSet::new();
    let aliases = extract_return_aliases(cypher);

    while let Ok(Some(row)) = result.next().await {
        process_neo4j_row(
            &row, &aliases,
            &mut nodes, &mut edges,
            &mut seen_node_ids, &mut seen_edge_ids,
        );
    }

    Ok(GraphData { nodes, edges })
}

/// 从 Cypher 查询的 RETURN 子句中提取变量别名
/// 例如 "MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 10" => ["a", "r", "b"]
fn extract_return_aliases(cypher: &str) -> Vec<String> {
    let mut aliases = Vec::new();

    // 用单词边界查找 RETURN，避免匹配到 returnedValue 等变量名内的子串
    let return_pos = find_keyword_pos(cypher, "RETURN");
    if let Some(pos) = return_pos {
        let after_return = &cypher[pos + 6..];
        // 截取到 LIMIT / ORDER / SKIP / UNION 关键字之前（同样要单词边界）
        let mut end_pos = after_return.len();
        for kw in ["LIMIT", "ORDER", "SKIP", "UNION"] {
            if let Some(p) = find_keyword_pos(after_return, kw) {
                if p < end_pos {
                    end_pos = p;
                }
            }
        }
        let return_clause = &after_return[..end_pos];

        // 按逗号分割（注意：括号内的逗号也会被切割，对常见 RETURN a,r,b 足够；高级用法可能需要更复杂的解析）
        for part in return_clause.split(',') {
            let trimmed = part.trim();
            // 处理 "expr AS alias" 的情况
            let alias = if let Some(as_pos) = trimmed.to_uppercase().rfind(" AS ") {
                trimmed[as_pos + 4..].trim()
            } else {
                // 取最简单的变量名（去掉属性访问如 a.name 或函数 count(n)）
                let cut = trimmed.find(|c: char| c == '.' || c == '(' || c.is_whitespace());
                if let Some(p) = cut { &trimmed[..p] } else { trimmed }
            };

            let clean = alias.trim().to_string();
            if !clean.is_empty() && !aliases.contains(&clean) {
                aliases.push(clean);
            }
        }
    }

    // 如果解析失败，添加常用别名兜底
    if aliases.is_empty() {
        aliases.extend(["n", "m", "a", "b", "c", "r", "p", "node", "rel", "edge"]
            .iter().map(|s| s.to_string()));
    }

    aliases
}

/// 在文本中查找关键字（不区分大小写，且必须有单词边界），返回首次出现的字节位置。
/// 避免把 `RETURN` 匹配到 `returnedValue`、把 `LIMIT` 匹配到 `LIMITED` 等情况。
fn find_keyword_pos(haystack: &str, keyword: &str) -> Option<usize> {
    let upper = haystack.to_uppercase();
    let kw = keyword.to_uppercase();
    let kw_len = kw.len();
    let bytes = upper.as_bytes();
    let mut start = 0;
    while let Some(idx) = upper[start..].find(&kw) {
        let abs = start + idx;
        let before_ok = abs == 0 || !is_ident_byte(bytes[abs - 1]);
        let after_idx = abs + kw_len;
        let after_ok = after_idx >= bytes.len() || !is_ident_byte(bytes[after_idx]);
        if before_ok && after_ok {
            return Some(abs);
        }
        start = abs + 1;
    }
    None
}

fn is_ident_byte(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// 转换 Ladybug Value 为 Json
fn lbug_val_to_json(val: &LbugValue) -> Value {
    match val {
        LbugValue::Bool(b) => json!(b),
        LbugValue::Int64(i) => json!(i),
        LbugValue::Int32(i) => json!(i),
        LbugValue::Int16(i) => json!(i),
        LbugValue::Int8(i) => json!(i),
        LbugValue::UInt64(i) => json!(i),
        LbugValue::UInt32(i) => json!(i),
        LbugValue::UInt16(i) => json!(i),
        LbugValue::UInt8(i) => json!(i),
        LbugValue::Double(d) => json!(d),
        LbugValue::Float(f) => json!(f),
        LbugValue::String(s) => Value::String(s.clone()),
        LbugValue::Date(d) => Value::String(d.to_string()),
        LbugValue::Timestamp(t) => Value::String(t.to_string()),
        LbugValue::Interval(i) => Value::String(i.to_string()),
        LbugValue::List(_, l) => Value::Array(l.iter().map(lbug_val_to_json).collect()),
        _ => Value::String(format!("{:?}", val)),
    }
}

/// 将 Ladybug 的 NodeVal 解析为 GraphNode
fn extract_lbug_node(node: &NodeVal) -> GraphNode {
    let mut props = serde_json::Map::new();
    for (k, v) in node.get_properties() {
        props.insert(k.clone(), lbug_val_to_json(v));
    }
    props.insert("_labels".to_string(), json!([node.get_label_name()]));

    GraphNode {
        id: format!("{}:{}", node.get_node_id().table_id, node.get_node_id().offset),
        properties: Value::Object(props),
    }
}

/// 将 Ladybug 的 RelVal 解析为 GraphEdge
fn extract_lbug_rel(rel: &RelVal) -> GraphEdge {
    let mut props = serde_json::Map::new();
    for (k, v) in rel.get_properties() {
        props.insert(k.clone(), lbug_val_to_json(v));
    }

    let src = rel.get_src_node();
    let dst = rel.get_dst_node();
    let label = rel.get_label_name();
    GraphEdge {
        // 旧格式 "srcTable:srcOff-dstOff" 缺少 dst_table_id 与 label，多重边/异表边会冲突
        id: format!("{}:{}-{}->{}:{}", src.table_id, src.offset, label, dst.table_id, dst.offset),
        source: format!("{}:{}", src.table_id, src.offset),
        target: format!("{}:{}", dst.table_id, dst.offset),
        label: label.to_string(),
        properties: Value::Object(props),
    }
}

/// 执行 Ladybug 真实查询
async fn execute_lbug(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let db_lock = state.lbug_db.lock().await;
    let db = db_lock.as_ref().ok_or("Ladybug 连接不存在")?;
    let conn = Connection::new(db).map_err(|e| format!("初始化连接失败: {}", e))?;

    eprintln!("[lbug] query: {}", cypher);
    let result = conn.query(cypher)
        .map_err(|e| {
            eprintln!("[lbug] query failed: {}", e);
            format!("Ladybug 查询执行失败: {}", e)
        })?;

    let mut nodes: std::collections::HashMap<String, GraphNode> = std::collections::HashMap::new();
    let mut edges: std::collections::HashMap<String, GraphEdge> = std::collections::HashMap::new();
    let mut row_count = 0usize;

    for row in result {
        row_count += 1;
        for val in row {
            traverse_lbug_value(&val, &mut nodes, &mut edges);
        }
    }
    eprintln!("[lbug] rows={}, nodes={}, edges={}", row_count, nodes.len(), edges.len());

    // 写操作后显式 CHECKPOINT，确保 WAL 落盘到主数据库文件
    if is_write_query(cypher) {
        match conn.query("CHECKPOINT;") {
            Ok(_) => eprintln!("[lbug] checkpoint ok"),
            Err(e) => eprintln!("[lbug] checkpoint warn: {}", e),
        }
    }

    Ok(GraphData {
        nodes: nodes.into_values().collect(),
        edges: edges.into_values().collect(),
    })
}

fn traverse_lbug_value(
    val: &LbugValue,
    nodes: &mut std::collections::HashMap<String, GraphNode>,
    edges: &mut std::collections::HashMap<String, GraphEdge>,
) {
    match val {
        LbugValue::Node(node_val) => {
            let n = extract_lbug_node(node_val);
            nodes.insert(n.id.clone(), n);
        }
        LbugValue::Rel(rel_val) => {
            let e = extract_lbug_rel(rel_val);
            edges.insert(e.id.clone(), e);
        }
        LbugValue::RecursiveRel { nodes: n_list, rels: r_list } => {
            for n_val in n_list {
                let n = extract_lbug_node(n_val);
                nodes.insert(n.id.clone(), n);
            }
            for r_val in r_list {
                let e = extract_lbug_rel(r_val);
                edges.insert(e.id.clone(), e);
            }
        }
        LbugValue::List(_, items) | LbugValue::Array(_, items) => {
            for item in items {
                traverse_lbug_value(item, nodes, edges);
            }
        }
        LbugValue::Struct(fields) => {
            for (_, item) in fields {
                traverse_lbug_value(item, nodes, edges);
            }
        }
        LbugValue::Map(_, pairs) => {
            for (k, v) in pairs {
                traverse_lbug_value(k, nodes, edges);
                traverse_lbug_value(v, nodes, edges);
            }
        }
        LbugValue::Union { value, .. } => {
            traverse_lbug_value(value, nodes, edges);
        }
        _ => {}
    }
}

// ===== 获取 Schema 统计 =====

pub async fn get_schema_stats(state: &AppState) -> Result<SchemaStats, String> {
    let info = state.connection_info.lock().await.clone();
    if !info.connected {
        return Err("尚未连接数据库".into());
    }

    if info.is_neo4j {
        let graph_lock = state.neo4j_graph.lock().await;
        let graph = graph_lock.as_ref().ok_or("Neo4j 连接已断开")?;

        let mut stats = SchemaStats {
            total_nodes: 0,
            total_edges: 0,
            labels: Vec::new(),
            rel_types: Vec::new(),
        };

        if let Ok(mut res) = graph.execute(query("MATCH (n) RETURN count(n) AS c")).await {
            if let Ok(Some(row)) = res.next().await {
                stats.total_nodes = row.get("c").unwrap_or(0);
            }
        }
        if let Ok(mut res) = graph.execute(query("MATCH ()-[r]->() RETURN count(r) AS c")).await {
            if let Ok(Some(row)) = res.next().await {
                stats.total_edges = row.get("c").unwrap_or(0);
            }
        }
        if let Ok(mut res) = graph.execute(query("MATCH (n) WITH labels(n) AS labels UNWIND labels AS label RETURN label, count(*) AS c")).await {
            while let Ok(Some(row)) = res.next().await {
                stats.labels.push(ItemCount { name: row.get("label").unwrap_or_default(), count: row.get("c").unwrap_or(0) });
            }
        }
        if let Ok(mut res) = graph.execute(query("MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS c")).await {
            while let Ok(Some(row)) = res.next().await {
                stats.rel_types.push(ItemCount { name: row.get("type").unwrap_or_default(), count: row.get("c").unwrap_or(0) });
            }
        }

        stats.labels.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));
        stats.rel_types.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));

        Ok(stats)
    } else {
        let db_lock = state.lbug_db.lock().await;
        let db = db_lock.as_ref().ok_or("Ladybug 连接已断开")?;
        let conn = Connection::new(db).map_err(|e| format!("连接失效: {}", e))?;

        let mut stats = SchemaStats {
            total_nodes: 0,
            total_edges: 0,
            labels: Vec::new(),
            rel_types: Vec::new(),
        };

        // Ladybug 中获取 schema 的常见方式：
        // Ladybug 支持 `CALL show_tables() RETURN *` 获取所有的节点和边表
        if let Ok(mut res) = conn.query("CALL show_tables() RETURN *") {
            let mut node_tables = Vec::new();
            let mut rel_tables = Vec::new();

            while let Some(row) = res.next() {
                // 通常表返回包含 "name" 和 "type"
                if row.len() >= 2 {
                    let name = match &row[1] { // index 1 is typical for 'name' in some versions, but better safe
                        LbugValue::String(s) => s.clone(),
                        _ => format!("{:?}", row[1])
                    };
                    let type_str = match &row[2] {
                        LbugValue::String(s) => s.clone(),
                        _ => format!("{:?}", row[2])
                    };
                    
                    if type_str == "NODE" {
                        node_tables.push(name);
                    } else if type_str == "REL" {
                        rel_tables.push(name);
                    } else {
                        // Ladybug 0.11 CALL show_tables column 1 is name, 2 is type in newer versions
                        // Let's iterate row and find type 
                        let mut name_val = "".to_string();
                        let mut type_val = "".to_string();
                        for v in &row {
                            if let LbugValue::String(s) = v {
                                if s == "NODE" || s == "REL" { type_val = s.clone(); continue;}
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
                }
            }

            // 对每张节点表查询 Count
            for table_name in node_tables {
                if let Ok(mut c_res) = conn.query(&format!("MATCH (n:{}) RETURN count(n)", table_name)) {
                    if let Some(c_row) = c_res.next() {
                        if !c_row.is_empty() {
                            if let LbugValue::Int64(c) = c_row[0] {
                                stats.total_nodes += c;
                                stats.labels.push(ItemCount { name: table_name, count: c });
                            }
                        }
                    }
                }
            }

            // 对每张边表查询 Count
            for table_name in rel_tables {
                if let Ok(mut c_res) = conn.query(&format!("MATCH ()-[r:{}]->() RETURN count(r)", table_name)) {
                    if let Some(c_row) = c_res.next() {
                        if !c_row.is_empty() {
                            if let LbugValue::Int64(c) = c_row[0] {
                                stats.total_edges += c;
                                stats.rel_types.push(ItemCount { name: table_name, count: c });
                            }
                        }
                    }
                }
            }
        }

        stats.labels.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));
        stats.rel_types.sort_by(|a, b| b.count.cmp(&a.count).then(a.name.cmp(&b.name)));

        Ok(stats)
    }
}
