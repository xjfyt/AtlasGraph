import React from "react";
import "./Sidebar.css";
import { IconDatabase, IconHistory, IconPalette, IconChevronRight, IconChevronLeft } from "./icons";

interface SidebarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  sidebarWidth: number;
  handleResizeStart: (e: React.MouseEvent) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export default function Sidebar({
  activeNav, setActiveNav, sidebarCollapsed, setSidebarCollapsed,
  sidebarWidth, handleResizeStart, sidebarRef, children
}: SidebarProps) {
  return (
    <>
      <nav className="nav-rail">
        <img src="/favicon.png" alt="KG" style={{ width: 36, height: 36, marginBottom: 16, borderRadius: 8, objectFit: 'contain', background: 'white' }} />
        <button className={`nav-btn ${activeNav === "database" ? "active" : ""}`} onClick={() => { setActiveNav("database"); setSidebarCollapsed(false); }} title="查询与连接">
          <IconDatabase />
        </button>
        <button className={`nav-btn ${activeNav === "history" ? "active" : ""}`} onClick={() => { setActiveNav("history"); setSidebarCollapsed(false); }} title="历史记录">
          <IconHistory />
        </button>
        {sidebarCollapsed && (
          <button
            className="sidebar-expand-btn"
            title="展开侧边栏"
            onClick={() => setSidebarCollapsed(false)}
          >
            <IconChevronRight />
          </button>
        )}
        <div className="nav-spacer" />
        <button className={`nav-btn ${activeNav === "theme" ? "active" : ""}`} onClick={() => { setActiveNav("theme"); setSidebarCollapsed(false); }} title="色彩调节">
          <IconPalette />
        </button>
      </nav>

      <div
        ref={sidebarRef}
        className={`sidebar-wrapper ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>知识图谱可视化工具</h2>
            <button
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(true)}
              title="收起侧边栏"
            >
              <IconChevronLeft />
            </button>
          </div>

          <div className="sidebar-body">
            {children}
          </div>
        </aside>

        <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
      </div>
    </>
  );
}
