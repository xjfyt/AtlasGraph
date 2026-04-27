import "./ConnectView.css";
import { IconSpinner, IconPlug } from "./icons";
import Neo4jForm from "./engines/Neo4jForm";
import LbugForm from "./engines/LbugForm";
import KuzuForm from "./engines/KuzuForm";

export interface ConnectViewProps {
  dbType: string;
  setDbType: (v: string) => void;
  supportedDbs: string[];
  uri: string; setUri: (v: string) => void;
  user: string; setUser: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  lbugPath: string; setLbugPath: (v: string) => void;
  kuzuPath: string; setKuzuPath: (v: string) => void;
  openReadOnly: boolean;
  setOpenReadOnly: (v: boolean) => void;
  connected: boolean;
  readOnly: boolean;
  autoCreatedDb: boolean;
  connecting: boolean;
  connectMsg: { ok: boolean; text: string } | null;
  handleConnect: () => void;
  databases: { name: string; is_default: boolean; status: string }[];
  selectedDb: string; setSelectedDb: (v: string) => void;
  handleDbSwitch: (db: string) => void;
}

export default function ConnectView({
  dbType, setDbType, supportedDbs, uri, setUri, user, setUser, password, setPassword,
  lbugPath, setLbugPath, kuzuPath, setKuzuPath, openReadOnly, setOpenReadOnly, connected, readOnly, autoCreatedDb, connecting, connectMsg, handleConnect,
  databases, selectedDb, setSelectedDb, handleDbSwitch
}: ConnectViewProps) {
  return (
    <>
      <div className="form-section">
        <div className="form-section-title">连接引擎</div>
        <div className="engine-toggle">
          {supportedDbs.includes("lbug") && (
            <button className={dbType === "lbug" ? "active" : ""} onClick={() => setDbType("lbug")}>
              Ladybug (本地)
            </button>
          )}
          {supportedDbs.includes("neo4j") && (
            <button className={dbType === "neo4j" ? "active" : ""} onClick={() => setDbType("neo4j")}>
              Neo4j (远程)
            </button>
          )}
          {supportedDbs.includes("kuzu") && (
            <button className={dbType === "kuzu" ? "active" : ""} onClick={() => setDbType("kuzu")}>
              Kuzu (本地)
            </button>
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">连接参数</div>
        {dbType === "neo4j" && (
          <Neo4jForm uri={uri} setUri={setUri} user={user} setUser={setUser} password={password} setPassword={setPassword} selectedDb={selectedDb} setSelectedDb={setSelectedDb} />
        )}
        {dbType === "lbug" && (
          <LbugForm lbugPath={lbugPath} setLbugPath={setLbugPath} openReadOnly={openReadOnly} setOpenReadOnly={setOpenReadOnly} />
        )}
        {dbType === "kuzu" && (
          <KuzuForm kuzuPath={kuzuPath} setKuzuPath={setKuzuPath} openReadOnly={openReadOnly} setOpenReadOnly={setOpenReadOnly} />
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

        {connected && (
          <div className={`connection-mode ${readOnly ? "readonly" : "readwrite"}`}>
            当前打开方式: {readOnly ? "只读" : "读写"}
          </div>
        )}

        {connected && autoCreatedDb && (
          <div className="connection-note">
            当前数据库不存在，已自动创建空库并打开。请先创建 Schema 或导入数据后再查询。
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
