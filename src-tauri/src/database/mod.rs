use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg(all(feature = "kuzu", feature = "lbug"))]
compile_error!(
    "feature `kuzu` 与 `lbug` 不能同时启用：lbug 派生自 kuzu，二者静态链接的 CRoaring / Parquet 等 C/C++ 依赖会在链接阶段符号冲突（ld: symbol(s) not found）。\
     请在 package.json 的 atlasConfig.features 中只保留其中一个（推荐：neo4j + lbug，或 neo4j + kuzu）。"
);

#[cfg(feature = "kuzu")]
pub mod kuzu;
#[cfg(feature = "lbug")]
pub mod lbug;
#[cfg(feature = "neo4j")]
pub mod neo4j;

// ===== 请求/响应结构 =====

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConnectRequest {
    pub is_neo4j: bool,
    pub db_type: Option<String>,
    pub uri: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub lbug_path: Option<String>,
    pub kuzu_path: Option<String>,
    pub database: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct QueryRequest {
    pub query: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct ConnectResponse {
    pub message: String,
    pub read_only: bool,
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
    #[cfg(feature = "neo4j")]
    pub neo4j_graph: Arc<Mutex<Option<neo4rs::Graph>>>,
    #[cfg(feature = "lbug")]
    pub lbug_db: Arc<Mutex<Option<::lbug::Database>>>,
    #[cfg(feature = "kuzu")]
    pub kuzu_db: Arc<Mutex<Option<::kuzu::Database>>>,
    pub connection_info: Arc<Mutex<ConnectionInfo>>,
}

#[derive(Debug, Clone, Default)]
pub struct ConnectionInfo {
    pub is_neo4j: bool,
    pub connected: bool,
    pub read_only: bool,
    pub db_type: String,
    pub uri: String,
    pub user: String,
    pub database: String,
    pub path: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            #[cfg(feature = "neo4j")]
            neo4j_graph: Arc::new(Mutex::new(None)),
            #[cfg(feature = "lbug")]
            lbug_db: Arc::new(Mutex::new(None)),
            #[cfg(feature = "kuzu")]
            kuzu_db: Arc::new(Mutex::new(None)),
            connection_info: Arc::new(Mutex::new(ConnectionInfo::default())),
        }
    }
}

// ===== Facade 门面方法 =====

pub async fn connect(state: &AppState, req: &ConnectRequest) -> Result<ConnectResponse, String> {
    let db_type = req.db_type.clone().unwrap_or_else(|| {
        if req.is_neo4j { "neo4j".to_string() } else { "lbug".to_string() }
    });

    match db_type.as_str() {
        #[cfg(feature = "neo4j")]
        "neo4j" => neo4j::connect(state, req).await,
        #[cfg(feature = "lbug")]
        "lbug" => lbug::connect(state, req).await,
        #[cfg(feature = "kuzu")]
        "kuzu" => kuzu::connect(state, req).await,
        other => Err(format!("不支持的数据库类型或未编译此功能: {}", other)),
    }
}

pub async fn execute(state: &AppState, cypher: &str) -> Result<GraphData, String> {
    let info = state.connection_info.lock().await.clone();
    if !info.connected { return Err("尚未连接数据库，请先点击「连接」按钮".into()); }

    match info.db_type.as_str() {
        #[cfg(feature = "neo4j")]
        "neo4j" => neo4j::execute(state, cypher).await,
        #[cfg(feature = "lbug")]
        "lbug" => lbug::execute(state, cypher).await,
        #[cfg(feature = "kuzu")]
        "kuzu" => kuzu::execute(state, cypher).await,
        other => Err(format!("未编译或不支持的数据库执行: {}", other)),
    }
}

pub async fn get_schema_stats(state: &AppState) -> Result<SchemaStats, String> {
    let info = state.connection_info.lock().await.clone();
    if !info.connected { return Err("尚未连接数据库".into()); }

    match info.db_type.as_str() {
        #[cfg(feature = "neo4j")]
        "neo4j" => neo4j::get_schema_stats(state).await,
        #[cfg(feature = "lbug")]
        "lbug" => lbug::get_schema_stats(state).await,
        #[cfg(feature = "kuzu")]
        "kuzu" => kuzu::get_schema_stats(state).await,
        _ => Ok(SchemaStats { total_nodes: 0, total_edges: 0, labels: vec![], rel_types: vec![] }),
    }
}

pub async fn list_databases(state: &AppState) -> Result<Vec<DatabaseInfo>, String> {
    let info = state.connection_info.lock().await.clone();
    if !info.connected { return Err("尚未连接数据库".into()); }

    match info.db_type.as_str() {
        #[cfg(feature = "neo4j")]
        "neo4j" => neo4j::list_databases(state).await,
        _ => Ok(vec![DatabaseInfo { name: "default".into(), is_default: true, status: "online".into() }])
    }
}

pub async fn switch_database(state: &AppState, db_name: &str) -> Result<String, String> {
    let info = state.connection_info.lock().await.clone();
    if !info.connected { return Err("尚未连接数据库".into()); }

    if info.db_type == "neo4j" {
        #[cfg(feature = "neo4j")]
        return neo4j::switch_database(state, db_name).await;
        #[cfg(not(feature = "neo4j"))]
        return Err("不支持多数据库".into());
    } else {
        Ok("此数据库仅支持单数据库".into())
    }
}

// ===== 通用工具方法 =====

pub fn is_write_query(cypher: &str) -> bool {
    let upper = cypher.to_uppercase();
    ["CREATE", "MERGE", "SET ", "DELETE", "REMOVE", "DETACH"].iter().any(|kw| upper.contains(kw))
}

pub fn extract_return_aliases(cypher: &str) -> Vec<String> {
    let mut aliases = Vec::new();
    let return_pos = find_keyword_pos(cypher, "RETURN");
    if let Some(pos) = return_pos {
        let after_return = &cypher[pos + 6..];
        let mut end_pos = after_return.len();
        for kw in ["LIMIT", "ORDER", "SKIP", "UNION"] {
            if let Some(p) = find_keyword_pos(after_return, kw) {
                if p < end_pos { end_pos = p; }
            }
        }
        let return_clause = &after_return[..end_pos];
        for part in return_clause.split(',') {
            let trimmed = part.trim();
            let alias = if let Some(as_pos) = trimmed.to_uppercase().rfind(" AS ") {
                trimmed[as_pos + 4..].trim()
            } else {
                let cut = trimmed.find(|c: char| c == '.' || c == '(' || c.is_whitespace());
                if let Some(p) = cut { &trimmed[..p] } else { trimmed }
            };
            let clean = alias.trim().to_string();
            if !clean.is_empty() && !aliases.contains(&clean) { aliases.push(clean); }
        }
    }
    if aliases.is_empty() {
        aliases.extend(["n", "m", "a", "b", "c", "r", "p", "node", "rel", "edge"].iter().map(|s| s.to_string()));
    }
    aliases
}

pub fn find_keyword_pos(haystack: &str, keyword: &str) -> Option<usize> {
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
        if before_ok && after_ok { return Some(abs); }
        start = abs + 1;
    }
    None
}

pub fn is_ident_byte(b: u8) -> bool { b.is_ascii_alphanumeric() || b == b'_' }
