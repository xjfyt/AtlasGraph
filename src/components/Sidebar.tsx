import React, { useRef, useCallback } from "react";
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

  const getNavBtnClass = (isActive: boolean) => {
    return `w-10 h-10 border-none rounded-[10px] cursor-pointer flex items-center justify-center transition-all duration-150 relative ${
      isActive
        ? "bg-accent-bg-strong text-accent-text"
        : "bg-transparent text-nav-text hover:bg-nav-hover-bg hover:text-nav-hover-text"
    }`;
  };

  return (
    <>
      <nav className="w-14 min-w-[56px] bg-nav-bg flex flex-col items-center py-4 gap-1 z-20 border-r border-border-primary">
        <img src="/favicon.png" alt="KG" className="w-9 h-9 mb-4 rounded-lg object-contain bg-white shrink-0" />

        <button className={getNavBtnClass(activeNav === "database")} onClick={() => { setActiveNav("database"); setSidebarCollapsed(false); }} title="查询与连接">
          <IconDatabase className="w-5 h-5 shrink-0" />
        </button>
        <button className={getNavBtnClass(activeNav === "history")} onClick={() => { setActiveNav("history"); setSidebarCollapsed(false); }} title="历史记录">
          <IconHistory className="w-5 h-5 shrink-0" />
        </button>
        {sidebarCollapsed && (
          <button
            className={getNavBtnClass(false)}
            title="展开侧边栏"
            onClick={() => setSidebarCollapsed(false)}
          >
            <IconChevronRight className="w-5 h-5 shrink-0" />
          </button>
        )}
        <div className="flex-1" />
        <button className={getNavBtnClass(activeNav === "theme")} onClick={() => { setActiveNav("theme"); setSidebarCollapsed(false); }} title="色彩调节">
          <IconPalette className="w-5 h-5 shrink-0" />
        </button>
      </nav>

      <div
        ref={sidebarRef}
        className={`relative flex shrink-0 z-10 transition-[width] duration-200 ease-in-out ${sidebarCollapsed ? "overflow-hidden" : ""}`}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        <aside className="w-full bg-bg-primary border-r border-border-primary flex flex-col overflow-hidden h-full">
          <div className="px-5 pt-4 pb-3 border-b border-border-light flex items-center justify-between gap-3">
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-text-heading m-0 leading-tight">AtlasGraph</h2>
                <div className="text-[11px] text-text-muted mt-0.5">
                  知识图谱可视化工具
                </div>
              </div>
            )}
            <button
              className="w-7 h-7 rounded-md border border-border-primary bg-bg-secondary text-text-muted cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-bg-hover hover:text-text-primary shrink-0"
              onClick={() => setSidebarCollapsed(true)}
              title="收起侧边栏"
            >
              <IconChevronLeft className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 custom-scrollbar">
            {children}
          </div>
        </aside>

        {!sidebarCollapsed && (
          <div
            className="absolute top-0 -right-[3px] w-1.5 h-full cursor-col-resize z-15 bg-transparent hover:bg-accent hover:opacity-40"
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </>
  );
}
