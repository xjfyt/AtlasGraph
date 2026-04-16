import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import GraphCanvas from "./components/GraphCanvas";

/* ===== SVG 图标 ===== */
const IconDatabase = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6,3 20,12 6,21"/></svg>
);
const IconGraph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
    <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/><line x1="15.5" y1="7.5" x2="8.5" y2="16.5"/>
  </svg>
);
const IconTable = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);
const IconRaw = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
// @ts-ignore
const IconLayout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/>
    <line x1="10" y1="11.5" x2="6.5" y2="15.5"/><line x1="14" y1="11.5" x2="17.5" y2="15.5"/>
  </svg>
);
// @ts-ignore
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconMaximize = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const IconSpinner = () => (
  <svg className="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.4"/><path d="M12 2a10 10 0 0 0-10 10"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconPlug = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPanelLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconMonitor = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconPalette = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12" r="1.5"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.7 1.7-1.5 0-.4-.2-.7-.4-1-.2-.3-.3-.6-.3-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z"/>
  </svg>
);
const IconFolderOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const GRAPH_COLORS = ["#F4B5BD", "#A5E1D3", "#FCE49E", "#CDB4DB", "#B9E1F9", "#FFDAC1"];

/* ===== 详情类型定义 ===== */
interface DetailInfo {
  type: "node" | "edge";
  id: string;
  label?: string;
  labels?: string[];
  source?: string;
  target?: string;
  properties: Record<string, any>;
}

interface HistoryItem {
  query: string;
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
}

type ThemeMode = "light" | "dark" | "system";

function App() {
  useEffect(() => {
    // 等待 React 挂载完成后再显示窗口，避免白屏闪烁
    invoke("show_window");
  }, []);

  // 主题
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("theme-mode") as ThemeMode) || "light";
  });

  useEffect(() => {
    localStorage.setItem("theme-mode", themeMode);
    const root = document.documentElement;

    const applyTheme = (dark: boolean) => {
      if (dark) {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
    };

    if (themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(themeMode === "dark");
    }
  }, [themeMode]);

  // 数据库配置
  const [dbType, setDbType] = useState<"neo4j" | "kuzu">("kuzu");
  const [uri, setUri] = useState("neo4j://localhost:7687");
  const [user, setUser] = useState("neo4j");
  const [password, setPassword] = useState("mimouse313");
  const [kuzuPath, setKuzuPath] = useState("./data/db/kuzu_db.kuzu");

  // 连接状态
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const connectIdRef = useRef(0);

  // 侧边导航栏
  const [activeNav, setActiveNav] = useState("database");

  // 多数据库
  const [databases, setDatabases] = useState<{ name: string; is_default: boolean; status: string }[]>([]);
  const [selectedDb, setSelectedDb] = useState("neo4j");

  // 查询
  const [query, setQuery] = useState("MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25");
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("graph");
  const [execTime, setExecTime] = useState<number | null>(null);

  // 侧边栏
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 详情面板 (点击节点/边) - 右侧显示
  const [detail, setDetail] = useState<DetailInfo | null>(null);

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("cypher-history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Schema 信息
  const [schemaStats, setSchemaStats] = useState<any>(null);
  const [schemaLabels, setSchemaLabels] = useState<string[]>([]);
  const [schemaRelTypes, setSchemaRelTypes] = useState<string[]>([]);
  const [schemaProperties, setSchemaProperties] = useState<string[]>([]);

  // 持久化历史记录
  useEffect(() => {
    try {
      localStorage.setItem("cypher-history", JSON.stringify(history.slice(0, 50)));
    } catch { /* ignore */ }
  }, [history]);

  // ===== 侧边栏拖拽调整宽度 =====
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
  }, [sidebarWidth]);

  // ===== 获取 Schema =====
  const fetchSchema = async () => {
    try {
      const stats: any = await invoke("get_schema_stats");
      setSchemaStats(stats);
      setSchemaLabels(stats.labels.map((l: any) => l.name));
      setSchemaRelTypes(stats.rel_types.map((t: any) => t.name));
    } catch { /* ignore */ }

    try {
      const propResult: any = await invoke("execute_cypher", {
        request: { query: "CALL db.propertyKeys() YIELD propertyKey RETURN propertyKey" },
      });
      if (propResult.nodes) {
        const keys = propResult.nodes.map((n: any) => {
          const props = n.properties;
          if (typeof props === "object" && props.propertyKey) return props.propertyKey;
          return null;
        }).filter(Boolean);
        if (keys.length > 0) setSchemaProperties(keys);
      }
    } catch { /* ignore */ }
  };

  // ===== 连接数据库 =====
  const handleConnect = async () => {
    if (connecting) {
      connectIdRef.current += 1;
      setConnecting(false);
      setConnectMsg({ ok: false, text: "已取消连接" });
      return;
    }

    const currentId = ++connectIdRef.current;
    setConnecting(true);
    setConnectMsg(null);
    setDatabases([]);
    try {
      const msg: any = await invoke("connect_db", {
        request: {
          is_neo4j: dbType === "neo4j",
          uri: dbType === "neo4j" ? uri : null,
          user: dbType === "neo4j" ? user : null,
          password: dbType === "neo4j" ? password : null,
          kuzu_path: dbType === "kuzu" ? kuzuPath : null,
          database: dbType === "neo4j" ? (selectedDb || "neo4j") : "default",
        },
      });
      if (currentId !== connectIdRef.current) return;
      setConnected(true);
      setConnectMsg({ ok: true, text: String(msg) });

      try {
        const dbs: any = await invoke("list_databases");
        if (currentId !== connectIdRef.current) return;
        setDatabases(dbs);
        const def = dbs.find((d: any) => d.is_default);
        if (def) setSelectedDb(def.name);
      } catch (_) { /* ignore */ }

      await fetchSchema();
      // 连接成功后，自动执行特定的初始化查询
      handleExecute("MATCH p=()-[]->() RETURN p LIMIT 25;");
    } catch (err: any) {
      if (currentId !== connectIdRef.current) return;
      setConnected(false);
      setConnectMsg({ ok: false, text: err.toString() });
    } finally {
      if (currentId === connectIdRef.current) {
        setConnecting(false);
      }
    }
  };

  // 切换引擎时重置连接状态
  useEffect(() => {
    setConnected(false);
    setConnectMsg(null);
    setDatabases([]);
    setGraphData({ nodes: [], edges: [] });
    setSelectedDb(dbType === "neo4j" ? "neo4j" : "default");
    setSchemaLabels([]);
    setSchemaRelTypes([]);
    setSchemaProperties([]);
  }, [dbType]);

  // ===== 切换数据库 =====
  const handleDbSwitch = async (dbName: string) => {
    setSelectedDb(dbName);
    try {
      await invoke("switch_database", { dbName });
      fetchSchema();
    } catch (_) { /* ignore */ }
  };

  // ===== 添加历史记录 =====
  const addHistory = (q: string, nodeCount: number, edgeCount: number) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.query !== q);
      return [{ query: q, timestamp: Date.now(), nodeCount, edgeCount }, ...filtered].slice(0, 50);
    });
  };

  // ===== 执行查询 =====
  const handleExecute = async (override?: string | any) => {
    const q = typeof override === "string" ? override : query;
    if (!q.trim()) return;
    
    if (typeof override === "string") setQuery(q);
    setLoading(true);
    setError("");
    setExecTime(null);
    setDetail(null);
    const t0 = performance.now();
    try {
      const result: any = await invoke("execute_cypher", {
        request: { query: q },
      });
      setGraphData(result);
      setExecTime(Math.round(performance.now() - t0));
      addHistory(q, result.nodes?.length || 0, result.edges?.length || 0);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  // ===== 节点/边点击回调 =====
  const handleNodeClick = useCallback((nodeId: string) => {
    const node = graphData.nodes.find((n) => String(n.id) === String(nodeId));
    if (node) {
      const props = node.properties || {};
      const labels = props._labels || [];
      setDetail({
        type: "node",
        id: node.id,
        labels: labels,
        properties: props,
      });
    }
  }, [graphData]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    const edge = graphData.edges.find((e) => {
      const eid = e.id || `${e.source}-${e.target}`;
      return String(eid) === String(edgeId);
    });
    if (edge) {
      setDetail({
        type: "edge",
        id: edge.id || `${edge.source}-${edge.target}`,
        label: edge.label,
        source: edge.source,
        target: edge.target,
        properties: edge.properties || {},
      });
    }
  }, [graphData]);

  const handleCanvasClick = useCallback(() => {
    setDetail(null);
  }, []);

  // ===== 概览数据计算 =====
  const labelCounts: Record<string, number> = {};
  graphData.nodes.forEach(n => {
    const labels = n.properties?._labels || ["Unknown"];
    labels.forEach((l: string) => { labelCounts[l] = (labelCounts[l] || 0) + 1; });
  });
  const typeCounts: Record<string, number> = {};
  graphData.edges.forEach(e => {
    const t = e.label || "UNKNOWN";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // 点击概览标签 → 自动执行查询
  const handleOverviewAllNodesClick = () => {
    handleExecute(`MATCH (n) RETURN n LIMIT 25`);
  };
  const handleOverviewAllRelsClick = () => {
    handleExecute(`MATCH p=()-[]->() RETURN p LIMIT 25`);
  };
  const handleOverviewLabelClick = (label: string) => {
    handleExecute(`MATCH (n:\`${label}\`) RETURN n LIMIT 25`);
  };
  const handleOverviewRelClick = (relType: string) => {
    handleExecute(`MATCH p=()-[r:\`${relType}\`]->() RETURN p LIMIT 25`);
  };

  const TAG_COLORS = ["tag-pink", "tag-green", "tag-yellow", "tag-blue", "tag-purple", "tag-orange"];

  return (
    <div className="app-layout">
      {/* ===== 左侧导航栏 ===== */}
      <nav className="nav-rail">
        <div className="nav-logo">咪鼠</div>
        <button className={`nav-btn ${activeNav === "database" ? "active" : ""}`} onClick={() => { setActiveNav("database"); setSidebarCollapsed(false); }} title="查询与连接"><IconDatabase /></button>
        <button className={`nav-btn ${activeNav === "history" ? "active" : ""}`} onClick={() => { setActiveNav("history"); setSidebarCollapsed(false); }} title="历史记录"><IconHistory /></button>
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
        <button className={`nav-btn ${activeNav === "theme" ? "active" : ""}`} onClick={() => { setActiveNav("theme"); setSidebarCollapsed(false); }} title="色彩调节"><IconPalette /></button>
      </nav>

      {/* ===== 数据库配置侧边栏 ===== */}
      <div
        ref={sidebarRef}
        className={`sidebar-wrapper ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>咪鼠图谱可视化</h2>
            <button
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(true)}
              title="收起侧边栏"
            >
              <IconChevronLeft />
            </button>
          </div>

          <div className="sidebar-body">
            {activeNav === "database" && (
              <>
                <div className="form-section">
                  <div className="form-section-title">连接引擎</div>
                  <div className="engine-toggle">
                    <button className={dbType === "kuzu" ? "active" : ""} onClick={() => setDbType("kuzu")}>
                      Kuzu (本地)
                    </button>
                    <button className={dbType === "neo4j" ? "active" : ""} onClick={() => setDbType("neo4j")}>
                      Neo4j (远程)
                    </button>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">连接参数</div>
                  {dbType === "neo4j" ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">连接 URI</label>
                        <input className="form-input" type="text" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="bolt://localhost:7687" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">用户名</label>
                        <input className="form-input" type="text" value={user} onChange={(e) => setUser(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">密码</label>
                        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">数据库名</label>
                        <input className="form-input" type="text" value={selectedDb} onChange={(e) => setSelectedDb(e.target.value)} placeholder="neo4j" />
                        <div className="form-hint">默认为 neo4j，可指定其他数据库</div>
                      </div>
                    </>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Kuzu 数据库路径</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          className="form-input" 
                          type="text" 
                          value={kuzuPath} 
                          onChange={(e) => {
                            let val = e.target.value.trim();
                            val = val.replace(/^["']+|["']+$/g, '');
                            setKuzuPath(val);
                          }} 
                          placeholder="./data/db" 
                          style={{ flex: 1, minWidth: 0, padding: "8px 12px" }} 
                        />
                        <button 
                          className="icon-btn" 
                          title="选择本地 Kuzu 数据库目录"
                          style={{ width: '35px', height: '35px', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                          onClick={async () => {
                            try {
                              const selected = await open({
                                directory: false,
                                multiple: false,
                                filters: [{ name: 'Kuzu Database', extensions: ['kuzu', 'kz', 'db'] }, { name: 'All Files', extensions: ['*'] }]
                              });
                              if (selected && !Array.isArray(selected)) {
                                setKuzuPath(selected);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <IconFolderOpen />
                        </button>
                      </div>
                      <div className="form-hint">指定本地 Kuzu 数据库文件的路径</div>
                    </div>
                  )}

                  <button
                    className={`connect-btn ${connecting ? "" : "primary"}`}
                    onClick={handleConnect}
                    style={connecting ? { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                  >
                    {connecting ? <IconSpinner /> : <IconPlug />}
                    {connecting ? "连接中... (点击取消)" : "连接"}
                  </button>

                  {connectMsg && (
                    <div className={`connect-status ${connectMsg.ok ? "success" : "error"}`}>
                      {connectMsg.ok ? "✓" : "✗"} {connectMsg.text}
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
                      style={{ fontFamily: "inherit" }}
                    >
                      {databases.map((db) => (
                        <option key={db.name} value={db.name}>
                          {db.name} {db.is_default ? "(默认)" : ""} - {db.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-section schema-section">
                  <div className="form-section-title">数据模式概览</div>
                  <div style={{ marginBottom: 10 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>节点标签</div>
                    <div className="tag-list">
                      {schemaLabels.length > 0 ? (
                        schemaLabels.map((label, i) => (
                          <span key={label} className={`tag ${TAG_COLORS[i % TAG_COLORS.length]}`}>{label}</span>
                        ))
                      ) : (
                        <span className="form-hint">连接数据库后显示</span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>关系类型</div>
                    <div className="tag-list">
                      {schemaRelTypes.length > 0 ? (
                        schemaRelTypes.map((rt) => (
                          <span key={rt} className="tag-mono">{rt}</span>
                        ))
                      ) : (
                        <span className="form-hint">连接数据库后显示</span>
                      )}
                    </div>
                  </div>
                  {schemaProperties.length > 0 && (
                    <div>
                      <div className="form-label" style={{ marginBottom: 4 }}>属性键</div>
                      <div className="tag-list">
                        {schemaProperties.map((pk) => (
                          <span key={pk} className="tag-mono">{pk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeNav === "history" && (
              <div className="history-panel">
                <div className="form-section-title" style={{ marginBottom: 12 }}>最近执行的查询</div>
                {history.length === 0 ? (
                  <div className="empty-state" style={{ position: 'relative', minHeight: 200 }}>
                    <IconHistory />
                    <p className="empty-title">暂无历史记录</p>
                    <p className="empty-subtitle">执行查询后会自动保存</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map((h, i) => (
                      <div
                        key={i}
                        className="history-item"
                        onClick={() => {
                          setQuery(h.query);
                          setActiveNav("database");
                        }}
                      >
                        <div className="history-query">{h.query}</div>
                        <div className="history-meta">
                          <span>{new Date(h.timestamp).toLocaleString()}</span>
                          <span>{h.nodeCount} 节点, {h.edgeCount} 关系</span>
                        </div>
                      </div>
                    ))}
                    <button
                      className="history-clear-btn"
                      onClick={() => setHistory([])}
                    >
                      清除历史记录
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeNav === "theme" && (
              <div className="theme-panel">
                <div className="form-section-title" style={{ marginBottom: 16 }}>色彩模式</div>
                <div className="theme-options">
                  <button
                    className={`theme-option ${themeMode === "light" ? "active" : ""}`}
                    onClick={() => setThemeMode("light")}
                  >
                    <div className="theme-option-icon"><IconSun /></div>
                    <div className="theme-option-label">浅色</div>
                    <div className="theme-option-desc">默认浅色主题</div>
                  </button>
                  <button
                    className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
                    onClick={() => setThemeMode("dark")}
                  >
                    <div className="theme-option-icon"><IconMoon /></div>
                    <div className="theme-option-label">深色</div>
                    <div className="theme-option-desc">深色主题，降低屏幕亮度</div>
                  </button>
                  <button
                    className={`theme-option ${themeMode === "system" ? "active" : ""}`}
                    onClick={() => setThemeMode("system")}
                  >
                    <div className="theme-option-icon"><IconMonitor /></div>
                    <div className="theme-option-label">跟随系统</div>
                    <div className="theme-option-desc">自动跟随操作系统设置</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
      </div>

      {/* ===== 主工作区 ===== */}
      <main className="main-area">
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
            {connected && (
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

        <div className="workspace">
          <div className="query-editor">
            <div className="query-body">
              <div className="query-prefix">
                <span className="query-db-label">{dbType === "neo4j" ? selectedDb : "kuzu"}</span>
                <span className="query-prompt">$</span>
              </div>
              <textarea
                className="query-textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExecute();
                }}
                placeholder="MATCH (n) RETURN n LIMIT 25"
                spellCheck={false}
              />
              <button className="query-run-btn" onClick={handleExecute} disabled={loading} title="执行查询 (Ctrl+Enter)">
                {loading ? <IconSpinner /> : <IconPlay />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 结果面板 + 右侧属性面板 */}
          <div className="result-wrapper">
            <div className={`result-panel ${detail ? "with-detail" : ""}`}>
              <div className="result-tabs">
                <div className="result-tabs-left">
                  <button className={`tab-btn ${activeTab === "graph" ? "active" : ""}`} onClick={() => setActiveTab("graph")}>
                    <IconGraph />Graph
                  </button>
                  <button className={`tab-btn ${activeTab === "table" ? "active" : ""}`} onClick={() => setActiveTab("table")}>
                    <IconTable />Table
                  </button>
                  <button className={`tab-btn ${activeTab === "raw" ? "active" : ""}`} onClick={() => setActiveTab("raw")}>
                    <IconRaw />RAW
                  </button>
                </div>
                <div className="result-tabs-right">
                  <button className="icon-btn" title="全屏"><IconMaximize /></button>
                </div>
              </div>

              <div className="graph-container">
                {activeTab === "graph" && (
                  graphData.nodes.length > 0 ? (
                    <>
                      <GraphCanvas
                        data={graphData}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        onCanvasClick={handleCanvasClick}
                      />
                      {/* 左侧概览面板 - Neo4j 风格 */}
                      <div className="result-overview">
                        <h4>图谱概览</h4>
                        <div className="overview-section">
                          <div className="overview-row" style={{ marginBottom: 8 }}>
                            <span className="label">所有实体 ({schemaStats ? schemaStats.total_nodes : graphData.nodes.length})</span>
                          </div>
                          <div
                            className="overview-label-row clickable"
                            onClick={handleOverviewAllNodesClick}
                            title="点击查询所有实体"
                          >
                            <span className="overview-dot" style={{ background: "#cbd5e1" }} />
                            <span className="overview-label-text">*({schemaStats ? schemaStats.total_nodes : graphData.nodes.length})</span>
                            <span className="overview-label-name">所有实体</span>
                          </div>
                          {(schemaStats ? schemaStats.labels : Object.entries(labelCounts).map(([name, count]) => ({name, count}))).map((lbl: any, i: number) => (
                            <div
                              key={lbl.name}
                              className="overview-label-row clickable"
                              onClick={() => handleOverviewLabelClick(lbl.name)}
                              title={`点击查询 ${lbl.name} 实体`}
                            >
                              <span className="overview-dot" style={{ background: GRAPH_COLORS[i % GRAPH_COLORS.length] }} />
                              <span className="overview-label-text">*({lbl.count})</span>
                              <span className="overview-label-name">{lbl.name} ({lbl.count})</span>
                            </div>
                          ))}
                        </div>
                        <div className="overview-section">
                          <div className="overview-row" style={{ marginBottom: 8 }}>
                            <span className="label">所有关系 ({schemaStats ? schemaStats.total_edges : graphData.edges.length})</span>
                          </div>
                          <div
                            className="overview-label-row clickable"
                            onClick={handleOverviewAllRelsClick}
                            title="点击查询所有关系"
                          >
                            <span className="overview-dot" style={{ background: "#94a3b8" }} />
                            <span className="overview-label-text">*({schemaStats ? schemaStats.total_edges : graphData.edges.length})</span>
                            <span className="overview-label-name">所有关系</span>
                          </div>
                          {(schemaStats ? schemaStats.rel_types : Object.entries(typeCounts).map(([name, count]) => ({name, count}))).map((rel: any) => (
                            <div
                              key={rel.name}
                              className="overview-label-row clickable"
                              onClick={() => handleOverviewRelClick(rel.name)}
                              title={`点击查询 ${rel.name} 关系`}
                            >
                              <span className="overview-dot" style={{ background: "#94a3b8" }} />
                              <span className="overview-label-text">*({rel.count})</span>
                              <span className="overview-label-name">{rel.name} ({rel.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <IconLayout />
                      <p className="empty-title">尚无查询结果</p>
                      <p className="empty-subtitle">在上方输入 Cypher 语句并按 Ctrl+Enter 执行查询</p>
                    </div>
                  )
                )}
                {activeTab === "table" && (
                  <div className="table-view">
                    {graphData.nodes.length > 0 ? (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>类型</th>
                            <th>标签/关系</th>
                            <th>属性</th>
                          </tr>
                        </thead>
                        <tbody>
                          {graphData.nodes.map((n: any) => (
                            <tr key={`n-${n.id}`} onClick={() => handleNodeClick(String(n.id))} style={{ cursor: 'pointer' }}>
                              <td>{n.id}</td>
                              <td><span className="detail-type-badge node">节点</span></td>
                              <td>{(n.properties?._labels || []).join(", ")}</td>
                              <td className="prop-cell">{n.properties?.name || JSON.stringify(n.properties).slice(0, 80)}</td>
                            </tr>
                          ))}
                          {graphData.edges.map((e: any) => (
                            <tr key={`e-${e.id}`} onClick={() => handleEdgeClick(String(e.id))} style={{ cursor: 'pointer' }}>
                              <td>{e.id}</td>
                              <td><span className="detail-type-badge edge">关系</span></td>
                              <td>{e.label}</td>
                              <td className="prop-cell">{e.source} → {e.target}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-msg">尚无数据</div>
                    )}
                  </div>
                )}
                {activeTab === "raw" && (
                  <div className="table-view">
                    {graphData.nodes.length > 0 ? (
                      <pre>{JSON.stringify(graphData, null, 2)}</pre>
                    ) : (
                      <div className="empty-msg">尚无数据</div>
                    )}
                  </div>
                )}
              </div>

              <div className="result-footer">
                {execTime !== null && <span>Started streaming {graphData.nodes.length + graphData.edges.length} records after {execTime} ms</span>}
              </div>
            </div>

            {/* 右侧属性详情面板 */}
            {detail && (
              <div className="detail-panel-right">
                <div className="detail-panel-header">
                  <div className="detail-type">
                    <span className={`detail-type-badge ${detail.type}`}>
                      {detail.type === "node" ? "节点" : "关系"}
                    </span>
                    <span className="detail-title">
                      {detail.type === "node"
                        ? (detail.properties?.name || `#${detail.id}`)
                        : (detail.label || "RELATIONSHIP")}
                    </span>
                  </div>
                  <button className="detail-close-btn" onClick={() => setDetail(null)}>
                    <IconX />
                  </button>
                </div>

                {detail.type === "node" && detail.labels && detail.labels.length > 0 && (
                  <div className="detail-labels">
                    {detail.labels.map((l) => (
                      <span key={l} className="detail-label-tag">{l}</span>
                    ))}
                  </div>
                )}

                {detail.type === "edge" && (
                  <div className="detail-edge-info">
                    <div className="detail-edge-visual">
                      <span className="detail-edge-node">{detail.source}</span>
                      <span className="detail-edge-arrow">→</span>
                      <span className="detail-edge-type">{detail.label}</span>
                      <span className="detail-edge-arrow">→</span>
                      <span className="detail-edge-node">{detail.target}</span>
                    </div>
                  </div>
                )}

                <div className="detail-panel-body">
                  <div className="detail-section-title">Properties</div>
                  <div className="detail-prop-row">
                    <span className="detail-prop-key">&lt;id&gt;</span>
                    <span className="detail-prop-value">{detail.id}</span>
                  </div>
                  {Object.entries(detail.properties)
                    .filter(([key]) => key !== "_labels")
                    .map(([key, val]) => (
                      <div className="detail-prop-row" key={key}>
                        <span className="detail-prop-key">{key}</span>
                        <span className="detail-prop-value">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
