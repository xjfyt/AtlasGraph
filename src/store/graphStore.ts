import { create } from 'zustand';
import { HistoryItem } from '../types';

interface GraphStore {
  query: string;
  graphData: { nodes: any[]; edges: any[] };
  tempData: { nodes: any[]; edges: any[] };
  loading: boolean;
  error: string;
  execTime: number | null;
  drawingEdgeSource: string | null;
  history: HistoryItem[];

  setQuery: (q: string) => void;
  setGraphData: (data: { nodes: any[]; edges: any[] }) => void;
  setTempData: (data: { nodes: any[]; edges: any[] }) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string) => void;
  setExecTime: (t: number | null) => void;
  setDrawingEdgeSource: (s: string | null) => void;
  addHistory: (q: string, nodeCount: number, edgeCount: number) => void;
  clearHistory: () => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  query: "MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25",
  graphData: { nodes: [], edges: [] },
  tempData: { nodes: [], edges: [] },
  loading: false,
  error: "",
  execTime: null,
  drawingEdgeSource: null,
  history: (() => {
    try {
      const saved = localStorage.getItem("cypher-history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })(),

  setQuery: (q) => set({ query: q }),
  setGraphData: (data) => set({ graphData: data }),
  setTempData: (data) => set({ tempData: data }),
  setLoading: (l) => set({ loading: l }),
  setError: (e) => set({ error: e }),
  setExecTime: (t) => set({ execTime: t }),
  setDrawingEdgeSource: (s) => set({ drawingEdgeSource: s }),
  addHistory: (q, nodeCount, edgeCount) => set((state) => {
    const filtered = state.history.filter(h => h.query !== q);
    const newHistory = [{ query: q, timestamp: Date.now(), nodeCount, edgeCount }, ...filtered].slice(0, 50);
    try { localStorage.setItem("cypher-history", JSON.stringify(newHistory)); } catch { /* ignore */ }
    return { history: newHistory };
  }),
  clearHistory: () => {
    try { localStorage.removeItem("cypher-history"); } catch { /* ignore */ }
    set({ history: [] });
  }
}));
