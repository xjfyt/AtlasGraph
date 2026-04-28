export interface DetailInfo {
  type: "node" | "edge";
  id: string;
  label?: string;
  labels?: string[];
  source?: string;
  target?: string;
  isTemp?: boolean;
  properties: Record<string, any>;
}

export interface HistoryItem {
  query: string;
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
}

export type ThemeMode = "light" | "dark" | "system";

export interface ContextMenuState {
  type: "node" | "edge";
  id: string;
  x: number;
  y: number;
  edgeCount?: number;
}
