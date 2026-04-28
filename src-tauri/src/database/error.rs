use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("数据库连接错误: {0}")]
    ConnectionError(String),
    
    #[error("查询执行失败: {0}")]
    QueryError(String),
    
    #[error("系统错误: {0}")]
    SystemError(String),

    #[error("无效的操作: {0}")]
    InvalidOperation(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
