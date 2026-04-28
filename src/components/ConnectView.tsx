import { IconSpinner, IconPlug } from "./icons";
import Neo4jForm from "./engines/Neo4jForm";
import LbugForm from "./engines/LbugForm";
import KuzuForm from "./engines/KuzuForm";
import { useDBStore } from "../store/dbStore";
import { useDatabaseActions } from "../hooks/useDatabaseActions";

export default function ConnectView() {
  const {
    supportedDbs, dbType, setDbType, uri, setUri, user, setUser, password, setPassword,
    lbugPath, setLbugPath, kuzuPath, setKuzuPath, engineStates, updateEngineState
  } = useDBStore();

  const { handleConnect, handleDbSwitch } = useDatabaseActions();

  const state = engineStates[dbType];
  const connected = state?.connected ?? false;
  const readOnly = state?.readOnly ?? false;
  const autoCreatedDb = state?.autoCreatedDb ?? false;
  const openReadOnly = state?.openReadOnly ?? false;
  const connecting = state?.connecting ?? false;
  const connectMsg = state?.connectMsg ?? null;
  const databases = state?.databases ?? [];
  const selectedDb = state?.selectedDb ?? "default";

  const setOpenReadOnly = (val: boolean) => updateEngineState(dbType, { openReadOnly: val });
  const setSelectedDb = (val: string) => updateEngineState(dbType, { selectedDb: val });

  return (
    <>
      <div className="form-section">
        <div className="form-section-title">连接引擎</div>
        <div className="toggle-group">
          {supportedDbs.includes("lbug") && (
            <button className={`toggle-button ${dbType === "lbug" ? "is-active" : ""}`} onClick={() => setDbType("lbug")}>
              Ladybug (本地)
            </button>
          )}
          {supportedDbs.includes("neo4j") && (
            <button className={`toggle-button ${dbType === "neo4j" ? "is-active" : ""}`} onClick={() => setDbType("neo4j")}>
              Neo4j (远程)
            </button>
          )}
          {supportedDbs.includes("kuzu") && (
            <button className={`toggle-button ${dbType === "kuzu" ? "is-active" : ""}`} onClick={() => setDbType("kuzu")}>
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
          className={connecting ? "secondary-btn flex items-center justify-center gap-1.5" : "primary-btn"}
          onClick={handleConnect}
        >
          {connecting ? <IconSpinner className="w-4 h-4" /> : <IconPlug className="w-4 h-4" />}
          {connecting ? "连接中... (点击取消)" : connected ? "断开" : "连接"}
        </button>

        {connectMsg && (
          <div className={`status-banner mt-2.5 ${
            connectMsg.ok
              ? "bg-success-bg text-success-text border-success-border"
              : "bg-error-bg text-error-text border-error-border"
          }`}>
            <span>{connectMsg.ok ? "✓" : "✗"}</span>
            <span>{connectMsg.text}</span>
          </div>
        )}

        {connected && (
          <div className={`status-banner mt-2.5 ${
            readOnly
              ? "text-amber-700 bg-orange-50 border-orange-300 dark:text-amber-500 dark:bg-amber-900/30 dark:border-amber-700/50"
              : "text-green-800 bg-green-50 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50"
          }`}>
            <span>{readOnly ? "只读模式" : "读写模式"}</span>
            <span className="text-current/80">当前连接已使用 {readOnly ? "只读" : "读写"} 权限打开。</span>
          </div>
        )}

        {connected && autoCreatedDb && (
          <div className="status-banner mt-2.5 text-[#1d4ed8] bg-[#eff6ff] border-[#93c5fd] dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50">
            <span>当前数据库不存在，已自动创建空库并打开。</span>
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
