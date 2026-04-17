import { open } from "@tauri-apps/plugin-dialog";
import { IconFolderOpen, IconSpinner, IconPlug } from "./icons";

export interface ConnectViewProps {
  dbType: "neo4j" | "lbug";
  setDbType: (v: "neo4j" | "lbug") => void;
  uri: string; setUri: (v: string) => void;
  user: string; setUser: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  lbugPath: string; setLbugPath: (v: string) => void;
  connected: boolean;
  connecting: boolean;
  connectMsg: { ok: boolean; text: string } | null;
  handleConnect: () => void;
  databases: { name: string; is_default: boolean; status: string }[];
  selectedDb: string; setSelectedDb: (v: string) => void;
  handleDbSwitch: (db: string) => void;
  schemaLabels: string[];
  schemaRelTypes: string[];
  schemaProperties: string[];
  TAG_COLORS: string[];
}

export default function ConnectView({
  dbType, setDbType, uri, setUri, user, setUser, password, setPassword,
  lbugPath, setLbugPath, connected, connecting, connectMsg, handleConnect,
  databases, selectedDb, setSelectedDb, handleDbSwitch, schemaLabels, schemaRelTypes, schemaProperties, TAG_COLORS
}: ConnectViewProps) {
  return (
    <>
      <div className="form-section">
        <div className="form-section-title">连接引擎</div>
        <div className="engine-toggle">
          <button className={dbType === "lbug" ? "active" : ""} onClick={() => setDbType("lbug")}>
            Ladybug (本地)
          </button>
          <button className={dbType === "neo4j" ? "active" : ""} onClick={() => setDbType("neo4j")}>
            Neo4j (远程)
          </button>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">连接参数</div>
        {dbType === "neo4j" ? (
          <>
            <div className="form-group">
              <label className="form-label">连接 URI</label>
              <input className="form-input" type="text" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="bolt://localhost:7687" />
            </div>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input className="form-input" type="text" value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">密码</label>
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">数据库名</label>
              <input className="form-input" type="text" value={selectedDb} onChange={(e) => setSelectedDb(e.target.value)} placeholder="neo4j" />
              <div className="form-hint">默认为 neo4j，可指定其他数据库</div>
            </div>
          </>
        ) : (
          <div className="form-group">
            <label className="form-label">Ladybug 数据库路径</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="form-input"
                type="text"
                value={lbugPath}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  val = val.replace(/^["']+|["']+$/g, '');
                  setLbugPath(val);
                }}
                placeholder="./data/db"
                style={{ flex: 1, minWidth: 0, padding: "8px 12px" }}
              />
              <button
                className="icon-btn"
                title="选择本地 Ladybug 数据库文件"
                style={{ width: '35px', height: '35px', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                onClick={async () => {
                  try {
                    const selected = await open({
                      directory: false,
                      multiple: false,
                      filters: [{ name: 'Ladybug Database', extensions: ['lbug', 'db'] }, { name: 'All Files', extensions: ['*'] }]
                    });
                    if (selected && !Array.isArray(selected)) {
                      setLbugPath(selected);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <IconFolderOpen />
              </button>
            </div>
            <div className="form-hint">指定本地 Ladybug 数据库文件的路径</div>
          </div>
        )}

        <button
          className={`connect-btn ${connecting ? "" : "primary"}`}
          onClick={handleConnect}
          style={connecting ? { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
        >
          {connecting ? <IconSpinner /> : <IconPlug />}
          {connecting ? "连接中... (点击取消)" : "连接"}
        </button>

        {connectMsg && (
          <div className={`connect-status ${connectMsg.ok ? "success" : "error"}`}>
            {connectMsg.ok ? "✓" : "✗"} {connectMsg.text}
          </div>
        )}
      </div>

      {connected && databases.length > 0 && (
        <div className="form-section">
          <div className="form-section-title">选择数据库</div>
          <select
            className="form-input"
            value={selectedDb}
            onChange={(e) => handleDbSwitch(e.target.value)}
            style={{ fontFamily: "inherit" }}
          >
            {databases.map((db) => (
              <option key={db.name} value={db.name}>
                {db.name} {db.is_default ? "(默认)" : ""} - {db.status}
              </option>
            ))}
          </select>
        </div>
      )}

    </>
  );
}
