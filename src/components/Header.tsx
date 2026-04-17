import { IconPanelLeft, IconDatabase, IconCloud, IconPlug, IconFolderOpen } from "./icons";
import "./Header.css";

export interface HeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  connected: boolean;
  dbType: string;
  uri: string;
  lbugPath: string;
  databases: any[];
  selectedDb: string;
  user: string;
}

export default function Header({
  sidebarCollapsed, setSidebarCollapsed, connected, dbType, uri, lbugPath, databases, selectedDb, user
}: HeaderProps) {
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
            {dbType === "neo4j" ? uri : lbugPath}
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
      </div>
      <div className="topbar-user">
        引擎: <span style={{ textTransform: "uppercase" }}>{dbType}</span>
      </div>
    </div>
  );
}
