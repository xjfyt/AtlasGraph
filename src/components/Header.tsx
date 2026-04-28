import { IconPanelLeft } from "./icons";
import "./Header.css";
import { useUIStore } from "../store/uiStore";
import { useDBStore } from "../store/dbStore";

export default function Header() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { dbType, uri, lbugPath, kuzuPath, engineStates, user } = useDBStore();

  const state = engineStates[dbType];
  const connected = state?.connected ?? false;
  const readOnly = state?.readOnly ?? false;
  const autoCreatedDb = state?.autoCreatedDb ?? false;
  const databases = state?.databases ?? [];
  const selectedDb = state?.selectedDb ?? "default";

  const instanceLabel = dbType === "neo4j" ? uri : dbType === "kuzu" ? kuzuPath : lbugPath;
  return (
    <div className="topbar">
      <div className="topbar-left">
        {sidebarCollapsed && (
          <button className="icon-btn" onClick={() => setSidebarCollapsed(false)} title="展开侧边栏">
            <IconPanelLeft />
          </button>
        )}
        <div className="topbar-status">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Instance:</span>
          <div className={`status-dot ${connected ? "connected" : "disconnected"}`} />
          <span style={{ fontFamily: "'SF Mono','Consolas',monospace", fontSize: 12 }}>
            {instanceLabel}
          </span>
        </div>
        {connected && databases.length > 0 && (
          <div className="topbar-db-info">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Database:</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{selectedDb}</span>
          </div>
        )}
        {connected && dbType === "neo4j" && (
          <div className="topbar-db-info">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>User:</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{user}</span>
          </div>
        )}
        {connected && (
          <div className={`topbar-mode ${readOnly ? "readonly" : "readwrite"}`}>
            {readOnly ? "只读" : "读写"}
          </div>
        )}
        {connected && autoCreatedDb && (
          <div className="topbar-note">
            新建库
          </div>
        )}
      </div>
      <div className="topbar-user">
        引擎: <span style={{ textTransform: "uppercase" }}>{dbType}</span>
      </div>
    </div>
  );
}
