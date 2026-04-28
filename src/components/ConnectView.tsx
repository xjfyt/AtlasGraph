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

  const getToggleBtnClass = (isActive: boolean) => {
    return `flex-1 py-1.5 border-none text-[13px] rounded-md cursor-pointer transition-all duration-150 ${
      isActive
        ? "bg-bg-primary text-accent font-semibold shadow-sm"
        : "bg-transparent text-text-muted font-medium hover:bg-bg-hover hover:text-text-primary"
    }`;
  };

  return (
    <>
      <div className="form-section">
        <div className="form-section-title">连接引擎</div>
        <div className="flex bg-bg-tertiary rounded-lg p-[3px] border border-border-primary">
          {supportedDbs.includes("lbug") && (
            <button className={getToggleBtnClass(dbType === "lbug")} onClick={() => setDbType("lbug")}>
              Ladybug (本地)
            </button>
          )}
          {supportedDbs.includes("neo4j") && (
            <button className={getToggleBtnClass(dbType === "neo4j")} onClick={() => setDbType("neo4j")}>
              Neo4j (远程)
            </button>
          )}
          {supportedDbs.includes("kuzu") && (
            <button className={getToggleBtnClass(dbType === "kuzu")} onClick={() => setDbType("kuzu")}>
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
          className={`w-full py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150 ${
            connecting
              ? "bg-bg-secondary text-text-muted border border-border-primary opacity-80"
              : "bg-accent text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)] hover:bg-accent-hover"
          }`}
          onClick={handleConnect}
        >
          {connecting ? <IconSpinner /> : <IconPlug className="w-4 h-4" />}
          {connecting ? "连接中... (点击取消)" : connected ? "断开" : "连接"}
        </button>

        {connectMsg && (
          <div className={`flex items-start gap-1.5 px-3 py-2 rounded-lg text-xs font-medium mt-2.5 break-all border ${
            connectMsg.ok
              ? "bg-success-bg text-success-text border-success-border"
              : "bg-error-bg text-error-text border-error-border"
          }`}>
            <span>{connectMsg.ok ? "✓" : "✗"}</span>
            <span className="leading-relaxed">{connectMsg.text}</span>
          </div>
        )}

        {connected && (
          <div className={`mt-2.5 px-2.5 py-[7px] rounded-lg text-xs font-semibold border ${
            readOnly
              ? "text-amber-700 bg-orange-50 border-orange-300 dark:text-amber-500 dark:bg-amber-900/30 dark:border-amber-700/50"
              : "text-green-800 bg-green-50 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50"
          }`}>
            当前打开方式: {readOnly ? "只读" : "读写"}
          </div>
        )}

        {connected && autoCreatedDb && (
          <div className="mt-2.5 px-2.5 py-2 rounded-lg text-xs leading-relaxed text-[#1d4ed8] bg-[#eff6ff] border border-[#93c5fd] dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50">
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
