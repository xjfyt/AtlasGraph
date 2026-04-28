import React, { useRef, useCallback } from "react";
import "./Sidebar.css";
import { IconDatabase, IconHistory, IconPalette, IconChevronRight, IconChevronLeft } from "./icons";
import { useUIStore } from "../store/uiStore";

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const {
    activeNav, setActiveNav, sidebarCollapsed, setSidebarCollapsed,
    sidebarWidth, setSidebarWidth
  } = useUIStore();
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(220, Math.min(500, startWidth + delta));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth, setSidebarWidth]);

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
            {!sidebarCollapsed && (
              <div className="sidebar-title-text">
                <h2>AtlasGraph</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  知识图谱可视化工具
                </div>
              </div>
            )}
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
