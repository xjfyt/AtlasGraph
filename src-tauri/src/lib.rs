pub mod database;

use database::{AppState, ConnectRequest, ConnectResponse, DatabaseInfo, GraphData, QueryRequest, SchemaStats, AppError};
use tauri::State;

#[tauri::command]
async fn get_supported_dbs() -> Result<Vec<String>, String> {
    let mut dbs = Vec::new();
    #[cfg(feature = "neo4j")]
    dbs.push("neo4j".to_string());
    #[cfg(feature = "lbug")]
    dbs.push("lbug".to_string());
    #[cfg(feature = "kuzu")]
    dbs.push("kuzu".to_string());
    Ok(dbs)
}

// ===== Tauri Commands =====

/// 连接数据库
#[tauri::command]
async fn connect_db(
    state: State<'_, AppState>,
    request: ConnectRequest,
) -> Result<ConnectResponse, AppError> {
    database::connect(&state, &request).await
}

/// 列出当前连接可用的数据库
#[tauri::command]
async fn list_databases(
    state: State<'_, AppState>,
    db_type: String,
) -> Result<Vec<DatabaseInfo>, AppError> {
    database::list_databases(&state, &db_type).await
}

/// 切换到指定数据库
#[tauri::command]
async fn switch_database(
    state: State<'_, AppState>,
    db_type: String,
    db_name: String,
) -> Result<String, AppError> {
    database::switch_database(&state, &db_type, &db_name).await
}

/// 执行 Cypher 查询
#[tauri::command]
async fn execute_cypher(
    state: State<'_, AppState>,
    request: QueryRequest,
) -> Result<GraphData, AppError> {
    let db_type = request.db_type.unwrap_or_else(|| "lbug".to_string());
    database::execute(&state, &db_type, &request.query).await
}

#[tauri::command]
async fn show_window(window: tauri::Window) {
    let _ = window.show();
}

#[tauri::command]
async fn get_schema_stats(
    state: State<'_, AppState>,
    db_type: String,
) -> Result<SchemaStats, AppError> {
    database::get_schema_stats(&state, &db_type).await
}

#[tauri::command]
async fn disconnect_db(
    state: State<'_, AppState>,
    db_type: String,
) -> Result<String, AppError> {
    database::disconnect(&state, &db_type).await
}

// ===== 应用入口 =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            connect_db,
            list_databases,
            switch_database,
            execute_cypher,
            show_window,
            get_schema_stats,
            disconnect_db,
            get_supported_dbs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
