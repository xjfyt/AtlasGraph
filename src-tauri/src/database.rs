use kuzu::{Connection, Database, SystemConfig, Value as KuzuValue, NodeVal, RelVal};
use neo4rs::{ConfigBuilder, Graph, query};
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
    pub kuzu_path: Option<String>,
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
    pub kuzu_db: Arc<Mutex<Option<Database>>>,
    pub connection_info: Arc<Mutex<ConnectionInfo>>,
}

#[derive(Debug, Clone, Default)]
pub struct ConnectionInfo {
    pub is_neo4j: bool,
    pub connected: bool,
    pub uri: String,
    pub user: String,
    pub database: String,
    pub kuzu_path: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            neo4j_graph: Arc::new(Mutex::new(None)),
            kuzu_db: Arc::new(Mutex::new(None)),
            connection_info: Arc::new(Mutex::new(ConnectionInfo::default())),
        }
    }
}

// ===== 连接数据库 =====

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    if req.is_neo4j {
        connect_neo4j(state, req).await
    } else {
        connect_kuzu(state, req).await
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

async fn connect_kuzu(state: &AppState, req: &ConnectRequest) -> Result<String, String> {
    let path = req.kuzu_path.as_deref().unwrap_or("").trim();
    if path.is_empty() {
        return Err("Kuzu 数据库路径不能为空".into());
    }

    // 建立真实的 Kuzu 连接
    let db = Database::new(path, SystemConfig::default())
        .map_err(|e| format!("Kuzu Database 初始化失败: {}", e))?;

    {
        let mut g = state.neo4j_graph.lock().await;
        *g = None; // 清除 neo4j 连接
    }
    {
        let mut kd = state.kuzu_db.lock().await;
        *kd = Some(db);
    }
    {
        let mut info = state.connection_info.lock().await;
        info.is_neo4j = false;
        info.connected = true;
        info.kuzu_path = path.to_string();
        info.database = "default".to_string();
    }

    // 简单的连接验证
    {
        let db_lock = state.kuzu_db.lock().await;
        if let Some(db_ref) = db_lock.as_ref() {
            let conn = Connection::new(db_ref).map_err(|e| format!("无法创建验证连接: {}", e))?;
            conn.query("MATCH (n) RETURN n LIMIT 1").map_err(|e| format!("连接验证失败: {}", e))?;
        }
    }

    Ok(format!("已成功连接到 Kuzu: {}", path))
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
        // Kuzu 只有一个默认数据库
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
        Ok("Kuzu 仅支持单数据库".into())
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
        execute_kuzu(state, cypher).await
    }
}

async fn execute_neo4j(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let graph_lock = state.neo4j_graph.lock().await;
    let graph = graph_lock.as_ref().ok_or("Neo4j 连接已断开，请重新连接")?;

    let mut result = graph
        .execute(query(cypher))
        .await
        .map_err(|e| format!("查询执行失败: {}", e))?;

    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut seen_node_ids = std::collections::HashSet::new();
    let mut seen_edge_ids = std::collections::HashSet::new();

    while let Ok(Some(row)) = result.next().await {
        // 从查询的 RETURN 子句中推断可能的变量名
        // 同时尝试常见别名 a-z, n, m, p, r, rel, src, dst, node, edge 等
        let aliases = extract_return_aliases(cypher);
        for col in &aliases {
            // 尝试提取为 Node
            if let Ok(node) = row.get::<neo4rs::Node>(col) {
                let id_val = node.id().to_string();
                if seen_node_ids.insert(id_val.clone()) {
                    let labels = node.labels().to_vec();
                    let mut props = serde_json::Map::new();

                    // 提取节点的所有 key
                    for key in node.keys() {
                        if let Ok(val) = node.get::<String>(&key) {
                            props.insert(key.to_string(), Value::String(val));
                        } else if let Ok(val) = node.get::<i64>(&key) {
                            props.insert(key.to_string(), json!(val));
                        } else if let Ok(val) = node.get::<f64>(&key) {
                            props.insert(key.to_string(), json!(val));
                        } else if let Ok(val) = node.get::<bool>(&key) {
                            props.insert(key.to_string(), json!(val));
                        }
                    }

                    // 增加 _labels 便于前端使用
                    props.insert("_labels".to_string(), json!(labels));

                    nodes.push(GraphNode {
                        id: id_val,
                        properties: Value::Object(props),
                    });
                }
            }

            // 尝试提取为 Relation
            if let Ok(rel) = row.get::<neo4rs::Relation>(col) {
                let rel_id = rel.id().to_string();
                if seen_edge_ids.insert(rel_id.clone()) {
                    let rel_type = rel.typ().to_string();
                    let start_id = rel.start_node_id().to_string();
                    let end_id = rel.end_node_id().to_string();

                    let mut props = serde_json::Map::new();
                    for key in rel.keys() {
                        if let Ok(val) = rel.get::<String>(&key) {
                            props.insert(key.to_string(), Value::String(val));
                        } else if let Ok(val) = rel.get::<i64>(&key) {
                            props.insert(key.to_string(), json!(val));
                        } else if let Ok(val) = rel.get::<f64>(&key) {
                            props.insert(key.to_string(), json!(val));
                        } else if let Ok(val) = rel.get::<bool>(&key) {
                            props.insert(key.to_string(), json!(val));
                        }
                    }

                    edges.push(GraphEdge {
                        id: rel_id,
                        source: start_id,
                        target: end_id,
                        label: rel_type,
                        properties: Value::Object(props),
                    });
                }
            }

            // 尝试提取为 UnboundedRelation (MATCH path 返回的)
            if let Ok(rel) = row.get::<neo4rs::UnboundedRelation>(col) {
                let rel_id = rel.id().to_string();
                if seen_edge_ids.insert(rel_id.clone()) {
                    let rel_type = rel.typ().to_string();

                    let mut props = serde_json::Map::new();
                    for key in rel.keys() {
                        if let Ok(val) = rel.get::<String>(&key) {
                            props.insert(key.to_string(), Value::String(val));
                        } else if let Ok(val) = rel.get::<i64>(&key) {
                            props.insert(key.to_string(), json!(val));
                        }
                    }

                    edges.push(GraphEdge {
                        id: rel_id,
                        source: "".into(),
                        target: "".into(),
                        label: rel_type,
                        properties: Value::Object(props),
                    });
                }
            }

            // 尝试提取为 Path (MATCH p=()-[]->() RETURN p 返回的)
            if let Ok(path) = row.get::<neo4rs::Path>(col) {
                let path_nodes = path.nodes();
                let path_rels = path.rels();

                for node in &path_nodes {
                    let id_val = node.id().to_string();
                    if seen_node_ids.insert(id_val.clone()) {
                        let labels = node.labels().to_vec();
                        let mut props = serde_json::Map::new();
                        for key in node.keys() {
                            if let Ok(val) = node.get::<String>(&key) {
                                props.insert(key.to_string(), Value::String(val));
                            } else if let Ok(val) = node.get::<i64>(&key) {
                                props.insert(key.to_string(), json!(val));
                            } else if let Ok(val) = node.get::<f64>(&key) {
                                props.insert(key.to_string(), json!(val));
                            } else if let Ok(val) = node.get::<bool>(&key) {
                                props.insert(key.to_string(), json!(val));
                            }
                        }
                        props.insert("_labels".to_string(), json!(labels));
                        nodes.push(GraphNode {
                            id: id_val,
                            properties: Value::Object(props),
                        });
                    }
                }

                for (i, rel) in path_rels.iter().enumerate() {
                    let rel_id = rel.id().to_string();
                    if seen_edge_ids.insert(rel_id.clone()) {
                        let rel_type = rel.typ().to_string();
                        let source = if i < path_nodes.len() { path_nodes[i].id().to_string() } else { "".into() };
                        let target = if i + 1 < path_nodes.len() { path_nodes[i + 1].id().to_string() } else { "".into() };

                        let mut props = serde_json::Map::new();
                        for key in rel.keys() {
                            if let Ok(val) = rel.get::<String>(&key) {
                                props.insert(key.to_string(), Value::String(val));
                            } else if let Ok(val) = rel.get::<i64>(&key) {
                                props.insert(key.to_string(), json!(val));
                            } else if let Ok(val) = rel.get::<f64>(&key) {
                                props.insert(key.to_string(), json!(val));
                            } else if let Ok(val) = rel.get::<bool>(&key) {
                                props.insert(key.to_string(), json!(val));
                            }
                        }

                        edges.push(GraphEdge {
                            id: rel_id,
                            source,
                            target,
                            label: rel_type,
                            properties: Value::Object(props),
                        });
                    }
                }
            }
        }
    }

    Ok(GraphData { nodes, edges })
}

/// 从 Cypher 查询的 RETURN 子句中提取变量别名
/// 例如 "MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 10" => ["a", "r", "b"]
fn extract_return_aliases(cypher: &str) -> Vec<String> {
    let upper = cypher.to_uppercase();
    let mut aliases = Vec::new();

    // 找到 RETURN 关键字后的部分
    if let Some(pos) = upper.find("RETURN") {
        let after_return = &cypher[pos + 6..];
        // 截取到 LIMIT / ORDER BY / SKIP 等关键字之前
        let end_keywords = ["LIMIT", "ORDER", "SKIP", "UNION"];
        let after_upper = after_return.to_uppercase();
        let mut end_pos = after_return.len();
        for kw in &end_keywords {
            if let Some(p) = after_upper.find(kw) {
                if p < end_pos {
                    end_pos = p;
                }
            }
        }
        let return_clause = &after_return[..end_pos];

        // 按逗号分割
        for part in return_clause.split(',') {
            let trimmed = part.trim();
            // 处理 "expr AS alias" 的情况
            let alias = if let Some(as_pos) = trimmed.to_uppercase().rfind(" AS ") {
                trimmed[as_pos + 4..].trim()
            } else {
                // 取最简单的变量名（去掉属性访问如 a.name）
                let dot_pos = trimmed.find('.');
                if let Some(dp) = dot_pos {
                    &trimmed[..dp]
                } else {
                    trimmed
                }
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

/// 转换 Kuzu Value 为 Json
fn kuzu_val_to_json(val: &KuzuValue) -> Value {
    match val {
        KuzuValue::Bool(b) => json!(b),
        KuzuValue::Int64(i) => json!(i),
        KuzuValue::Int32(i) => json!(i),
        KuzuValue::Int16(i) => json!(i),
        KuzuValue::Int8(i) => json!(i),
        KuzuValue::UInt64(i) => json!(i),
        KuzuValue::UInt32(i) => json!(i),
        KuzuValue::UInt16(i) => json!(i),
        KuzuValue::UInt8(i) => json!(i),
        KuzuValue::Double(d) => json!(d),
        KuzuValue::Float(f) => json!(f),
        KuzuValue::String(s) => Value::String(s.clone()),
        KuzuValue::Date(d) => Value::String(d.to_string()),
        KuzuValue::Timestamp(t) => Value::String(t.to_string()),
        KuzuValue::Interval(i) => Value::String(i.to_string()),
        KuzuValue::List(_, l) => Value::Array(l.iter().map(kuzu_val_to_json).collect()),
        _ => Value::String(format!("{:?}", val)),
    }
}

/// 将 Kuzu 的 NodeVal 解析为 GraphNode
fn extract_kuzu_node(node: &NodeVal) -> GraphNode {
    let mut props = serde_json::Map::new();
    for (k, v) in node.get_properties() {
        props.insert(k.clone(), kuzu_val_to_json(v));
    }
    props.insert("_labels".to_string(), json!([node.get_label_name()]));

    GraphNode {
        id: format!("{}:{}", node.get_node_id().table_id, node.get_node_id().offset),
        properties: Value::Object(props),
    }
}

/// 将 Kuzu 的 RelVal 解析为 GraphEdge
fn extract_kuzu_rel(rel: &RelVal) -> GraphEdge {
    let mut props = serde_json::Map::new();
    for (k, v) in rel.get_properties() {
        props.insert(k.clone(), kuzu_val_to_json(v));
    }

    GraphEdge {
        id: format!("{}:{}-{}", rel.get_src_node().table_id, rel.get_src_node().offset, rel.get_dst_node().offset),
        source: format!("{}:{}", rel.get_src_node().table_id, rel.get_src_node().offset),
        target: format!("{}:{}", rel.get_dst_node().table_id, rel.get_dst_node().offset),
        label: rel.get_label_name().to_string(),
        properties: Value::Object(props),
    }
}

/// 执行 Kuzu 真实查询
async fn execute_kuzu(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let db_lock = state.kuzu_db.lock().await;
    let db = db_lock.as_ref().ok_or("Kuzu 连接不存在")?;
    let conn = Connection::new(db).map_err(|e| format!("初始化连接失败: {}", e))?;

    let mut result = conn.query(cypher)
        .map_err(|e| format!("Kuzu 查询执行失败: {}", e))?;

    let mut nodes: std::collections::HashMap<String, GraphNode> = std::collections::HashMap::new();
    let mut edges: std::collections::HashMap<String, GraphEdge> = std::collections::HashMap::new();

    while let Some(row) = result.next() {
        for val in row.into_iter() {
            match val {
                KuzuValue::Node(node_val) => {
                    let n = extract_kuzu_node(&node_val);
                    nodes.insert(n.id.clone(), n);
                }
                KuzuValue::Rel(rel_val) => {
                    let e = extract_kuzu_rel(&rel_val);
                    edges.insert(e.id.clone(), e);
                }
                KuzuValue::RecursiveRel { .. } => {
                    // Recursive rel parsing is skipped for basic layout temporarily
                }
                _ => {}
            }
        }
    }

    Ok(GraphData {
        nodes: nodes.into_values().collect(),
        edges: edges.into_values().collect(),
    })
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
        let db_lock = state.kuzu_db.lock().await;
        let db = db_lock.as_ref().ok_or("Kuzu 连接已断开")?;
        let conn = Connection::new(db).map_err(|e| format!("连接失效: {}", e))?;

        let mut stats = SchemaStats {
            total_nodes: 0,
            total_edges: 0,
            labels: Vec::new(),
            rel_types: Vec::new(),
        };

        // Kuzu 中获取 schema 的常见方式：
        // Kuzu 支持 `CALL show_tables() RETURN *` 获取所有的节点和边表
        if let Ok(mut res) = conn.query("CALL show_tables() RETURN *") {
            let mut node_tables = Vec::new();
            let mut rel_tables = Vec::new();

            while let Some(row) = res.next() {
                // 通常表返回包含 "name" 和 "type"
                if row.len() >= 2 {
                    let name = match &row[1] { // index 1 is typical for 'name' in some versions, but better safe
                        KuzuValue::String(s) => s.clone(),
                        _ => format!("{:?}", row[1])
                    };
                    let type_str = match &row[2] {
                        KuzuValue::String(s) => s.clone(),
                        _ => format!("{:?}", row[2])
                    };
                    
                    if type_str == "NODE" {
                        node_tables.push(name);
                    } else if type_str == "REL" {
                        rel_tables.push(name);
                    } else {
                        // Kuzu 0.11 CALL show_tables column 1 is name, 2 is type in newer versions
                        // Let's iterate row and find type 
                        let mut name_val = "".to_string();
                        let mut type_val = "".to_string();
                        for v in &row {
                            if let KuzuValue::String(s) = v {
                                if s == "NODE" || s == "REL" { type_val = s.clone(); continue;}
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
                }
            }

            // 对每张节点表查询 Count
            for table_name in node_tables {
                if let Ok(mut c_res) = conn.query(&format!("MATCH (n:{}) RETURN count(n)", table_name)) {
                    if let Some(c_row) = c_res.next() {
                        if !c_row.is_empty() {
                            if let KuzuValue::Int64(c) = c_row[0] {
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
                            if let KuzuValue::Int64(c) = c_row[0] {
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
