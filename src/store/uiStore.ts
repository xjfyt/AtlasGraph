import { create } from 'zustand';
import { ThemeMode, ContextMenuState, DetailInfo } from '../types';
import { ActiveTool } from '../components/GraphToolbar';

interface UIStore {
  themeMode: ThemeMode;
  activeNav: string;
  activeTab: string;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  detail: DetailInfo | null;
  contextMenu: ContextMenuState | null;
  activeTool: ActiveTool;
  
  setThemeMode: (mode: ThemeMode) => void;
  setActiveNav: (nav: string) => void;
  setActiveTab: (tab: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setDetail: (detail: DetailInfo | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  themeMode: (localStorage.getItem("theme-mode") as ThemeMode) || "light",
  activeNav: "database",
  activeTab: "graph",
  sidebarCollapsed: false,
  sidebarWidth: 280,
  detail: null,
  contextMenu: null,
  activeTool: "pointer",

  setThemeMode: (mode) => set({ themeMode: mode }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setDetail: (detail) => set({ detail }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
