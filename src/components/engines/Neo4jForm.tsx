import { EngineFormProps } from "./types";

export default function Neo4jForm({ uri, setUri, user, setUser, password, setPassword, selectedDb, setSelectedDb }: EngineFormProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">连接 URI</label>
        <input className="form-input" type="text" value={uri} onChange={(e) => setUri?.(e.target.value)} placeholder="bolt://localhost:7687" />
      </div>
      <div className="form-group">
        <label className="form-label">用户名</label>
        <input className="form-input" type="text" value={user} onChange={(e) => setUser?.(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">密码</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword?.(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">数据库名</label>
        <input className="form-input" type="text" value={selectedDb} onChange={(e) => setSelectedDb?.(e.target.value)} placeholder="neo4j" />
        <div className="form-hint">默认为 neo4j，可指定其他数据库</div>
      </div>
    </>
  );
}
