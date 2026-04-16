pub mod database;

use database::{AppState, ConnectRequest, DatabaseInfo, GraphData, QueryRequest};
use tauri::State;

// ===== Tauri Commands =====

/// 连接数据库
#[tauri::command]
async fn connect_db(
    state: State<'_, AppState>,
    request: ConnectRequest,
) -> Result<String, String> {
    database::connect(&state, &request).await
}

/// 列出当前连接可用的数据库
#[tauri::command]
async fn list_databases(
    state: State<'_, AppState>,
) -> Result<Vec<DatabaseInfo>, String> {
    database::list_databases(&state).await
}

/// 切换到指定数据库
#[tauri::command]
async fn switch_database(
    state: State<'_, AppState>,
    db_name: String,
) -> Result<String, String> {
    database::switch_database(&state, &db_name).await
}

/// 执行 Cypher 查询
#[tauri::command]
async fn execute_cypher(
    state: State<'_, AppState>,
    request: QueryRequest,
) -> Result<GraphData, String> {
    database::execute(&state, &request.query).await
}

#[tauri::command]
async fn show_window(window: tauri::Window) {
    let _ = window.show();
}

// ===== 应用入口 =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            connect_db,
            list_databases,
            switch_database,
            execute_cypher,
            show_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
