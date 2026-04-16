import React from "react";
import { IconPanelLeft } from "./icons";

export interface HeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  connected: boolean;
  dbType: "neo4j" | "kuzu";
  uri: string;
  kuzuPath: string;
  databases: any[];
  selectedDb: string;
  user: string;
}

export default function Header({
  sidebarCollapsed, setSidebarCollapsed, connected, dbType, uri, kuzuPath, databases, selectedDb, user
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
            {dbType === "neo4j" ? uri : kuzuPath}
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
        引擎: <span>{dbType.toUpperCase()}</span>
      </div>
    </div>
  );
}
