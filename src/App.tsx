import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";


import "./App.css";
import ConnectView from "./components/ConnectView";
import HistoryView from "./components/HistoryView";
import ThemeView from "./components/ThemeView";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { ActiveTool } from "./components/GraphToolbar";
import QueryEditor from "./components/QueryEditor";
import ResultPanel from "./components/ResultPanel";
const GRAPH_COLORS = ["#F4B5BD", "#A5E1D3", "#FCE49E", "#CDB4DB", "#B9E1F9", "#FFDAC1"];

import { toCypherLiteral, parseUserValue, lbugOffset, friendlyDbError } from "./utils/dbUtils";
import { DetailInfo, HistoryItem, ThemeMode, ContextMenuState } from "./types";

type ConnectResponse = {
  message: string;
  read_only: boolean;
  auto_created: boolean;
};

type DatabaseItem = {
  name: string;
  is_default: boolean;
  status: string;
};

type EngineConnectionState = {
  connected: boolean;
  readOnly: boolean;
  autoCreatedDb: boolean;
  openReadOnly: boolean;
  connecting: boolean;
  connectMsg: { ok: boolean; text: string } | null;
  databases: DatabaseItem[];
  selectedDb: string;
};

const createEngineState = (engine: string): EngineConnectionState => ({
  connected: false,
  readOnly: false,
  autoCreatedDb: false,
  openReadOnly: false,
  connecting: false,
  connectMsg: null,
  databases: [],
  selectedDb: engine === "neo4j" ? "neo4j" : "default",
});

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
  const [supportedDbs, setSupportedDbs] = useState<string[]>(["lbug", "neo4j"]);
  const [dbType, setDbType] = useState<string>("lbug");
  const [uri, setUri] = useState("neo4j://localhost:7687");
  const [user, setUser] = useState("neo4j");
  const [password, setPassword] = useState("mimouse313");
  const [lbugPath, setLbugPath] = useState("./data/db/graph.lbug");
  const [kuzuPath, setKuzuPath] = useState("./data/db/graph.kuzu");

  useEffect(() => {
    invoke<string[]>("get_supported_dbs").then(dbs => {
      setSupportedDbs(dbs);
      if (dbs.length > 0 && !dbs.includes(dbType)) {
        setDbType(dbs[0]);
      }
    }).catch(console.error);
  }, []);

  // 连接状态
  const [engineStates, setEngineStates] = useState<Record<string, EngineConnectionState>>({
    neo4j: createEngineState("neo4j"),
    lbug: createEngineState("lbug"),
    kuzu: createEngineState("kuzu"),
  });
  const connectIdRef = useRef<Record<string, number>>({});
  const queryIdRef = useRef(0);

  // 侧边导航栏
  const [activeNav, setActiveNav] = useState("database");

  // 多数据库
  const currentEngineState = engineStates[dbType] ?? createEngineState(dbType);
  const connected = currentEngineState.connected;
  const readOnly = currentEngineState.readOnly;
  const autoCreatedDb = currentEngineState.autoCreatedDb;
  const openReadOnly = currentEngineState.openReadOnly;
  const connecting = currentEngineState.connecting;
  const connectMsg = currentEngineState.connectMsg;
  const databases = currentEngineState.databases;
  const selectedDb = currentEngineState.selectedDb;

  const updateEngineState = useCallback((engine: string, patch: Partial<EngineConnectionState>) => {
    setEngineStates(prev => ({
      ...prev,
      [engine]: {
        ...(prev[engine] ?? createEngineState(engine)),
        ...patch,
      },
    }));
  }, []);
  const setOpenReadOnly = useCallback((value: boolean) => {
    updateEngineState(dbType, { openReadOnly: value });
  }, [dbType, updateEngineState]);
  const setSelectedDb = useCallback((value: string) => {
    updateEngineState(dbType, { selectedDb: value });
  }, [dbType, updateEngineState]);

  // 查询
  const [query, setQuery] = useState("MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 25");
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("graph");
  const [execTime, setExecTime] = useState<number | null>(null);

  // 侧边栏
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 详情面板 (点击节点/边) - 右侧显示
  const [detail, setDetail] = useState<DetailInfo | null>(null);

  // 右键菜单

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingProp, setSavingProp] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("pointer");
  const [tempData, setTempData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [drawingEdgeSource, setDrawingEdgeSource] = useState<string | null>(null);
  // 切换工具时清掉正在画的边的临时端点
  useEffect(() => {
    if (activeTool !== "create_edge") {
      setDrawingEdgeSource(null);
    }
  }, [activeTool]);
  const [addingProp, setAddingProp] = useState(false);
  const [newPropKey, setNewPropKey] = useState("");
  const [newPropValue, setNewPropValue] = useState("");

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
  const fetchSchema = async (engine: string = dbType) => {
    try {
      const stats: any = await invoke("get_schema_stats", { dbType: engine });
      setSchemaStats(stats);
      setSchemaLabels(stats.labels.map((l: any) => l.name));
      setSchemaRelTypes(stats.rel_types.map((t: any) => t.name));
    } catch { /* ignore */ }

  };

  const executeCypher = useCallback(async (queryText: string, engine: string = dbType) => {
    return invoke("execute_cypher", {
      request: { query: queryText, db_type: engine },
    });
  }, [dbType]);

  // ===== 连接数据库 =====
  const handleConnect = async () => {
    const engine = dbType;
    const state = engineStates[engine] ?? createEngineState(engine);

    if (state.connecting) {
      connectIdRef.current[engine] = (connectIdRef.current[engine] ?? 0) + 1;
      updateEngineState(engine, {
        connecting: false,
        readOnly: false,
        autoCreatedDb: false,
        connectMsg: { ok: false, text: "已取消连接" },
      });
      return;
    }

    if (state.connected) {
      try {
        const message = await invoke<string>("disconnect_db", { dbType: engine });
        updateEngineState(engine, {
          connected: false,
          readOnly: false,
          autoCreatedDb: false,
          connecting: false,
          connectMsg: { ok: true, text: String(message) },
          databases: [],
          selectedDb: engine === "neo4j" ? "neo4j" : "default",
        });
        setGraphData({ nodes: [], edges: [] });
        setTempData({ nodes: [], edges: [] });
        setSchemaStats(null);
        setSchemaLabels([]);
        setSchemaRelTypes([]);
        setError("");
      } catch (err: any) {
        updateEngineState(engine, {
          connectMsg: { ok: false, text: friendlyDbError(err) },
        });
      }
      return;
    }

    const currentId = (connectIdRef.current[engine] ?? 0) + 1;
    connectIdRef.current[engine] = currentId;
    updateEngineState(engine, {
      connecting: true,
      readOnly: false,
      autoCreatedDb: false,
      connectMsg: null,
      databases: [],
    });
    try {
      const resp = await invoke<ConnectResponse>("connect_db", {
        request: {
          is_neo4j: engine === "neo4j",
          db_type: engine,
          uri: engine === "neo4j" ? uri : null,
          user: engine === "neo4j" ? user : null,
          password: engine === "neo4j" ? password : null,
          lbug_path: engine === "lbug" ? lbugPath : null,
          kuzu_path: engine === "kuzu" ? kuzuPath : null,
          database: engine === "neo4j" ? (state.selectedDb || "neo4j") : "default",
          read_only: engine === "neo4j" ? false : state.openReadOnly,
        },
      });
      if (currentId !== connectIdRef.current[engine]) return;
      updateEngineState(engine, {
        connected: true,
        readOnly: Boolean(resp.read_only),
        autoCreatedDb: Boolean(resp.auto_created),
        connectMsg: { ok: true, text: String(resp.message) },
      });

      try {
        const dbs: any = await invoke("list_databases", { dbType: engine });
        if (currentId !== connectIdRef.current[engine]) return;
        const def = dbs.find((d: any) => d.is_default);
        updateEngineState(engine, {
          databases: dbs,
          selectedDb: def?.name || (engine === "neo4j" ? state.selectedDb || "neo4j" : "default"),
        });
      } catch (_) { /* ignore */ }

      await fetchSchema(engine);
      if (!resp.auto_created) {
        // 连接已有数据库后，自动执行初始化查询
        handleExecute("MATCH p=()-[]->() RETURN p LIMIT 25;", engine);
      } else {
        setGraphData({ nodes: [], edges: [] });
        setTempData({ nodes: [], edges: [] });
        setError("");
      }
    } catch (err: any) {
      if (currentId !== connectIdRef.current[engine]) return;
      updateEngineState(engine, {
        connected: false,
        readOnly: false,
        autoCreatedDb: false,
        connectMsg: { ok: false, text: friendlyDbError(err) },
      });
    } finally {
      if (currentId === connectIdRef.current[engine]) {
        updateEngineState(engine, { connecting: false });
      }
    }
  };

  // 切换引擎时只刷新当前视图，不断开其他连接
  useEffect(() => {
    setGraphData({ nodes: [], edges: [] });
    setTempData({ nodes: [], edges: [] });
    setError("");
    setSchemaStats(null);
    setSchemaLabels([]);
    setSchemaRelTypes([]);
    if (connected) {
      fetchSchema(dbType);
    }
  }, [dbType]);

  // ===== 切换数据库 =====
  const handleDbSwitch = async (dbName: string) => {
    updateEngineState(dbType, { selectedDb: dbName });
    try {
      await invoke("switch_database", { dbType, dbName });
      fetchSchema(dbType);
    } catch (_) { /* ignore */ }
  };

  // ===== 安全合并图谱数据 (防止缺节点导致 NVL 白屏) =====
  const mergeGraphData = useCallback((prev: { nodes: any[], edges: any[] }, result: { nodes: any[], edges: any[] }, append: boolean = false) => {
    const nodesMap = new Map<string, any>();
    const edgesMap = new Map<string, any>();

    if (append) {
      prev.nodes.forEach(n => nodesMap.set(String(n.id), n));
      prev.edges.forEach(e => {
        const eid = String(e.id || `${e.source}-${e.target}`);
        edgesMap.set(eid, e);
      });
    }

    result.nodes?.forEach((n: any) => {
      if (!nodesMap.has(String(n.id))) {
        nodesMap.set(String(n.id), n);
      }
    });

    result.edges?.forEach((e: any) => {
      const eid = String(e.id || `${e.source}-${e.target}`);
      if (!edgesMap.has(eid)) {
        edgesMap.set(eid, e);
      }
    });

    // Safety check for InteractiveNvlWrapper: Ensure all edges have their nodes defined
    for (const e of edgesMap.values()) {
      if (e.source && !nodesMap.has(String(e.source))) {
        nodesMap.set(String(e.source), { id: e.source, properties: { _labels: ["Unknown"] } });
      }
      if (e.target && !nodesMap.has(String(e.target))) {
        nodesMap.set(String(e.target), { id: e.target, properties: { _labels: ["Unknown"] } });
      }
    }

    return { nodes: Array.from(nodesMap.values()), edges: Array.from(edgesMap.values()) };
  }, []);

  // ===== 添加历史记录 =====
  const addHistory = (q: string, nodeCount: number, edgeCount: number) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.query !== q);
      return [{ query: q, timestamp: Date.now(), nodeCount, edgeCount }, ...filtered].slice(0, 50);
    });
  };

  // ===== 执行查询 =====
  const handleExecute = async (override?: string | any, engine: string = dbType) => {
    const q = typeof override === "string" ? override : query;
    if (!q.trim()) return;

    if (typeof override === "string" && engine === dbType) setQuery(q);
    const myId = ++queryIdRef.current;
    setLoading(true);
    setError("");
    setExecTime(null);
    setDetail(null);
    setContextMenu(null);
    setTempData({ nodes: [], edges: [] });
    const t0 = performance.now();
    try {
      const result: any = await executeCypher(q, engine);
      // 防止旧请求覆盖新请求
      if (myId !== queryIdRef.current) return;
      setGraphData(mergeGraphData({ nodes: [], edges: [] }, result));
      setExecTime(Math.round(performance.now() - t0));
      addHistory(q, result.nodes?.length || 0, result.edges?.length || 0);
    } catch (err: any) {
      if (myId !== queryIdRef.current) return;
      setError(`查询执行失败: ${friendlyDbError(err)}`);
    } finally {
      if (myId === queryIdRef.current) setLoading(false);
    }
  };

  // ===== 节点/边点击回调 =====
  const handleNodeClick = useCallback((nodeId: string) => {
    setContextMenu(null);

    if (activeTool === "create_edge") {
      if (!drawingEdgeSource) {
        setDrawingEdgeSource(nodeId);
      } else {
        if (drawingEdgeSource !== nodeId) {
          const tempId = `temp_edge_${Date.now()}`;
          const newEdge = { id: tempId, source: drawingEdgeSource, target: nodeId, label: "Unassigned", properties: {}, isTemp: true };
          setTempData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
          setDrawingEdgeSource(null);
          setActiveTool("pointer");
          setTimeout(() => {
            setDetail({
              type: "edge",
              id: tempId,
              label: "Unassigned",
              source: drawingEdgeSource,
              target: nodeId,
              properties: {},
              isTemp: true
            });
          }, 50);
        } else {
          setDrawingEdgeSource(null);
        }
      }
      return;
    }

    const allNodes = [...graphData.nodes, ...tempData.nodes];
    const node = allNodes.find((n) => String(n.id) === String(nodeId));
    if (node) {
      const props = node.properties || {};
      const labels = props._labels || [];
      setDetail({
        type: "node",
        id: node.id,
        labels: labels,
        properties: props,
        isTemp: node.isTemp
      });
    }
  }, [graphData, tempData, drawingEdgeSource, activeTool]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setContextMenu(null);
    if (activeTool !== "pointer") {
      setActiveTool("pointer");
    }
    const allEdges = [...graphData.edges, ...tempData.edges];
    const edge = allEdges.find((e) => {
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
        isTemp: edge.isTemp
      });
    }
  }, [graphData, tempData, activeTool]);

  const handleCanvasClick = useCallback(() => {
    setDetail(null);
    setContextMenu(null);
    if (activeTool === "create_node") {
      const tempId = `temp_node_${Date.now()}`;
      const newNode = { id: tempId, properties: { _labels: ["NewEntity"], name: "未保存节点" }, isTemp: true };
      setTempData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
      setActiveTool("pointer");
      setTimeout(() => {
        setDetail({
          type: "node",
          id: tempId,
          labels: ["NewEntity"],
          properties: { name: "未保存节点" },
          isTemp: true
        });
      }, 50);
    }
  }, [activeTool]);

  // 右键菜单事件
  const handleNodeRightClick = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ type: "node", id: nodeId, x, y });
  }, []);

  const handleEdgeRightClick = useCallback((edgeId: string, x: number, y: number) => {
    setContextMenu({ type: "edge", id: edgeId, x, y });
  }, []);




  // 处理菜单项点击
  const handleMenuItemClick = async (action: string) => {
    if (!contextMenu) return;
    const { type, id } = contextMenu;
    setContextMenu(null);

    if (action === "dismiss") {
      if (type === "node") {
        setGraphData(prev => ({
          nodes: prev.nodes.filter(n => String(n.id) !== String(id)),
          edges: prev.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
        }));
      } else {
        setGraphData(prev => ({
          nodes: prev.nodes,
          edges: prev.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
        }));
      }
    } else if (action === "delete_db") {
      if (window.confirm("确定要从数据库中彻底删除吗？这无法撤销！")) {
        setLoading(true);
        let delQuery = "";
        if (type === "node") {
          if (dbType === "neo4j") {
            delQuery = `MATCH (n) WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' DETACH DELETE n`;
          } else {
            const off = lbugOffset(id);
            if (off === null) {
              setError(`无法解析节点 ID: ${id}`);
              setLoading(false);
              return;
            }
            delQuery = `MATCH (n) WHERE offset(id(n)) = ${off} DETACH DELETE n`;
          }
        } else {
          if (dbType === "neo4j") {
            delQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${id}' OR toString(id(r)) = '${id}' DELETE r`;
          } else {
            // Ladybug 关系：根据 graphData 找出 source/target/label 重组查询
            const edge = graphData.edges.find(e => String(e.id || `${e.source}-${e.target}`) === String(id));
            const srcOff = edge?.source ? lbugOffset(edge.source) : null;
            const dstOff = edge?.target ? lbugOffset(edge.target) : null;
            const lbl = edge?.label;
            if (!edge || !srcOff || !dstOff || !lbl) {
              setError(`无法定位关系: ${id}`);
              setLoading(false);
              return;
            }
            delQuery = `MATCH (a)-[r:\`${lbl}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} DELETE r`;
          }
        }
        try {
          await executeCypher(delQuery);
          if (type === "node") {
            setGraphData(prev => ({
              nodes: prev.nodes.filter(n => String(n.id) !== String(id)),
              edges: prev.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
            }));
          } else {
            setGraphData(prev => ({
              nodes: prev.nodes,
              edges: prev.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
            }));
          }
        } catch (err: any) {
          setError(`删除失败: ${friendlyDbError(err)}`);
        } finally {
          setLoading(false);
        }
      }
    } else if (action === "undo_connect") {
      if (type === "node") {
        setGraphData(prev => ({
          nodes: prev.nodes,
          edges: prev.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
        }));
      } else {
        setGraphData(prev => ({
          nodes: prev.nodes,
          edges: prev.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
        }));
      }
    } else if (action === "unpin" && type === "node") {
      // NVL 内部 API 尚未完全暴露用于取消固定，这里可以在此处对接内部 ref
      console.log(`Unpin requested for node ${id}`);
    } else if (action === "expand" && type === "node") {
      let expandQuery = "";
      if (dbType === "neo4j") {
        expandQuery = `MATCH (n)-[r]-(m) WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' RETURN n, r, m LIMIT 50`;
      } else {
        const off = lbugOffset(id);
        if (off === null) { setError(`无法解析节点 ID: ${id}`); return; }
        expandQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) = ${off} RETURN a, r, b LIMIT 50`;
      }
      setLoading(true);
      try {
        const result: any = await executeCypher(expandQuery);
        setGraphData((prev) => mergeGraphData(prev, result, true));
      } catch (err: any) {
        setError(`展开邻居失败: ${friendlyDbError(err)}`);
      } finally {
        setLoading(false);
      }
    } else if (action === "show_rels" && type === "node") {
      let relQuery = "";
      if (dbType === "neo4j") {
        relQuery = `MATCH (n)-[r]-() WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' RETURN r LIMIT 50`;
      } else {
        const off = lbugOffset(id);
        if (off === null) { setError(`无法解析节点 ID: ${id}`); return; }
        // 注意：返回 r 时同时需要返回端点否则 r 是 UnboundedRelation；改为返回 a/r/b 让前端构边
        relQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) = ${off} RETURN a, r, b LIMIT 50`;
      }
      setLoading(true);
      try {
        const result: any = await executeCypher(relQuery);
        setGraphData((prev) => mergeGraphData(prev, result, true));
      } catch (err: any) {
        setError(`查询关系失败: ${friendlyDbError(err)}`);
      } finally {
        setLoading(false);
      }
    } else if (action === "show_rels" && type === "edge") {
      // 通过该关系两端点扩展更多关系
      const edge = graphData.edges.find((e) => String(e.id || `${e.source}-${e.target}`) === String(id));
      if (edge && edge.source && edge.target) {
        let relQuery = "";
        if (dbType === "neo4j") {
          relQuery = `MATCH (n)-[r]-(m) WHERE elementId(n) IN ['${edge.source}', '${edge.target}'] OR toString(id(n)) IN ['${edge.source}', '${edge.target}'] RETURN n, r, m LIMIT 50`;
        } else {
          const so = lbugOffset(edge.source);
          const to = lbugOffset(edge.target);
          if (!so || !to) { setError(`无法解析端点 ID`); return; }
          relQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) IN [${so}, ${to}] RETURN a, r, b LIMIT 50`;
        }
        setLoading(true);
        try {
          const result: any = await executeCypher(relQuery);
          setGraphData((prev) => mergeGraphData(prev, result, true));
        } catch (err: any) {
          setError(`查询关系失败: ${friendlyDbError(err)}`);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // 处理属性保存
  const handleSaveProp = async (key: string, val: string) => {
    if (!detail) return;
    setSavingProp(true);
    const parsedVal = parseUserValue(val);
    const cypherVal = toCypherLiteral(parsedVal);

    let updateQuery = "";
    if (detail.type === "node") {
      if (dbType === "neo4j") {
        updateQuery = `MATCH (n) WHERE elementId(n) = '${detail.id}' OR toString(id(n)) = '${detail.id}' SET n.\`${key}\` = ${cypherVal}`;
      } else {
        const off = lbugOffset(detail.id);
        if (off === null) {
          setError(`无法解析节点 ID: ${detail.id}`);
          setSavingProp(false);
          return;
        }
        updateQuery = `MATCH (n) WHERE offset(id(n)) = ${off} SET n.\`${key}\` = ${cypherVal}`;
      }
    } else {
      if (dbType === "neo4j") {
        updateQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${detail.id}' OR toString(id(r)) = '${detail.id}' SET r.\`${key}\` = ${cypherVal}`;
      } else {
        // Ladybug 关系 ID 形如 "srcTable:srcOff-Label->dstTable:dstOff"，无法用 offset(id(r))
        // 改用 source/target/label 重新定位
        const srcOff = detail.source ? lbugOffset(detail.source) : null;
        const dstOff = detail.target ? lbugOffset(detail.target) : null;
        if (!srcOff || !dstOff || !detail.label) {
          setError(`无法定位关系（缺少 source/target/label）`);
          setSavingProp(false);
          return;
        }
        updateQuery = `MATCH (a)-[r:\`${detail.label}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} SET r.\`${key}\` = ${cypherVal}`;
      }
    }

    try {
      await executeCypher(updateQuery);

      // 本地刷新数据
      setGraphData(prev => {
        if (detail.type === "node") {
          return {
            ...prev,
            nodes: prev.nodes.map(n => String(n.id) === String(detail.id) ? { ...n, properties: { ...n.properties, [key]: parsedVal } } : n)
          };
        } else {
          return {
            ...prev,
            edges: prev.edges.map(e => String(e.id || `${e.source}-${e.target}`) === String(detail.id) ? { ...e, properties: { ...e.properties, [key]: parsedVal } } : e)
          };
        }
      });
      setDetail(prev => prev ? { ...prev, properties: { ...prev.properties, [key]: parsedVal } } : null);
      setEditingProp(null);
    } catch (err: any) {
      setError(`保存失败: ${friendlyDbError(err)}`);
    } finally {
      setSavingProp(false);
    }
  };

  const handleDeleteProp = async (key: string) => {
    if (!detail) return;
    if (!window.confirm(`确定要从数据库删除属性 [${key}] 吗？`)) return;
    setSavingProp(true);
    let updateQuery = "";
    if (detail.type === "node") {
      if (dbType === "neo4j") {
        updateQuery = `MATCH (n) WHERE elementId(n) = '${detail.id}' OR toString(id(n)) = '${detail.id}' REMOVE n.\`${key}\``;
      } else {
        const off = lbugOffset(detail.id);
        if (off === null) {
          setError(`无法解析节点 ID: ${detail.id}`);
          setSavingProp(false);
          return;
        }
        // Ladybug 不支持 REMOVE，使用 SET = null
        updateQuery = `MATCH (n) WHERE offset(id(n)) = ${off} SET n.\`${key}\` = null`;
      }
    } else {
      if (dbType === "neo4j") {
        updateQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${detail.id}' OR toString(id(r)) = '${detail.id}' REMOVE r.\`${key}\``;
      } else {
        const srcOff = detail.source ? lbugOffset(detail.source) : null;
        const dstOff = detail.target ? lbugOffset(detail.target) : null;
        if (!srcOff || !dstOff || !detail.label) {
          setError(`无法定位关系（缺少 source/target/label）`);
          setSavingProp(false);
          return;
        }
        updateQuery = `MATCH (a)-[r:\`${detail.label}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} SET r.\`${key}\` = null`;
      }
    }
    
    try {
      await executeCypher(updateQuery);
      // Neo4j REMOVE 真正去掉 key；Ladybug SET=null 只把值设为 null，key 仍存在
      const removeKey = dbType === "neo4j";
      const applyDelete = (props: Record<string, any>) => {
        const next = { ...props };
        if (removeKey) delete next[key]; else next[key] = null;
        return next;
      };
      setGraphData(prev => {
        if (detail.type === "node") {
          return {
            ...prev,
            nodes: prev.nodes.map(n =>
              String(n.id) === String(detail.id)
                ? { ...n, properties: applyDelete(n.properties) }
                : n
            )
          };
        } else {
          return {
            ...prev,
            edges: prev.edges.map(e =>
              String(e.id || `${e.source}-${e.target}`) === String(detail.id)
                ? { ...e, properties: applyDelete(e.properties) }
                : e
            )
          };
        }
      });
      setDetail(prev => prev ? { ...prev, properties: applyDelete(prev.properties) } : null);
    } catch(err: any) {
      setError(`删除属性失败: ${friendlyDbError(err)}`);
    } finally {
      setSavingProp(false);
    }
  };

  const handleSaveTempEntity = async (labelOrType: string, customProps: any) => {
    if (!detail || !detail.isTemp) return;
    setSavingProp(true);
    let createQuery = "";

    // 默认属性：节点附带唯一化的 name 以避开常见的唯一索引冲突；Ladybug 还需补主键
    const uniqSuffix = Date.now();
    const needsPk = dbType !== "neo4j" && detail.type === "node" && !("id" in customProps);
    const defaultNodeProps: Record<string, any> = detail.type === "node"
      ? (needsPk ? { id: uniqSuffix, name: `New Node ${uniqSuffix}` } : { name: `New Node ${uniqSuffix}` })
      : {};
    const effectiveProps = Object.keys(customProps).length > 0
      ? customProps
      : defaultNodeProps;

    const propsStr = Object.keys(effectiveProps).length > 0
      ? toCypherLiteral(effectiveProps)
      : ``;

    if (detail.type === "node") {
      const lbls = labelOrType.split(",").map(s => s.trim()).filter(Boolean);
      if (lbls.length > 0) {
        const labels = lbls.map(l => `:\`${l}\``).join("");
        createQuery = `CREATE (n${labels} ${propsStr}) RETURN n`;
      } else {
        createQuery = `CREATE (n ${propsStr}) RETURN n`;
      }
    } else if (detail.type === "edge" && detail.source && detail.target) {
      const sourceId = detail.source;
      const targetId = detail.target;
      if (dbType === "neo4j") {
        // 拆成两个 MATCH，避免 (a),(b) 的 N^2 笛卡儿积并让意图更清晰
        createQuery = `MATCH (a) WHERE elementId(a) = '${sourceId}' OR toString(id(a)) = '${sourceId}' WITH a MATCH (b) WHERE elementId(b) = '${targetId}' OR toString(id(b)) = '${targetId}' CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      } else {
        // Ladybug: toString() 不存在；用 offset(id(x)) 整型比较；按 label 约束减少笛卡儿积
        const srcOffset = lbugOffset(sourceId);
        const dstOffset = lbugOffset(targetId);
        if (!srcOffset || !dstOffset) {
          setError(`无法解析源/目标节点 ID`);
          setSavingProp(false);
          return;
        }
        const srcNode = graphData.nodes.find(n => String(n.id) === String(sourceId));
        const dstNode = graphData.nodes.find(n => String(n.id) === String(targetId));
        const srcLabel = srcNode?.properties?._labels?.[0];
        const dstLabel = dstNode?.properties?._labels?.[0];
        const aPart = srcLabel ? `(a:\`${srcLabel}\`)` : `(a)`;
        const bPart = dstLabel ? `(b:\`${dstLabel}\`)` : `(b)`;
        // 拆成两个 MATCH，避免 (a), (b) 笛卡儿积扫描
        createQuery = `MATCH ${aPart} WHERE offset(id(a)) = ${srcOffset} WITH a MATCH ${bPart} WHERE offset(id(b)) = ${dstOffset} CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      }
    }

    try {
      console.log("[handleSaveTempEntity] query:", createQuery);
      const result: any = await executeCypher(createQuery);
      console.log("[handleSaveTempEntity] result:", result);

      // 关系创建：若 MATCH 未命中源/目标，不会报错但也不会有新边，显式提醒用户
      if (detail.type === "edge" && (!result.edges || result.edges.length === 0)) {
        setSavingProp(false);
        setError(`关系创建失败：未能定位源或目标节点 (source=${detail.source}, target=${detail.target})。请确认这些节点仍存在于数据库中。`);
        return;
      }
      // 节点创建：若返回为空，CREATE 实际未成功（例如 Ladybug 没预定义 NODE TABLE）
      if (detail.type === "node" && (!result.nodes || result.nodes.length === 0)) {
        setSavingProp(false);
        setError(`节点创建失败：CREATE 没有返回任何节点。可能是 Ladybug 未预先定义 NODE TABLE（${labelOrType}），或主键属性不匹配。`);
        return;
      }

      setTempData(prev => ({
        nodes: prev.nodes.filter(n => String(n.id) !== String(detail.id)),
        edges: prev.edges.filter(e => String(e.id) !== String(detail.id))
      }));
      setGraphData(prev => mergeGraphData(prev, result, true));

      if (detail.type === "node" && result.nodes?.length > 0) {
        const n = result.nodes[0];
        setDetail({
          type: "node",
          id: n.id,
          labels: n.properties?._labels || [],
          properties: n.properties || {}
        });
      } else if (detail.type === "edge" && result.edges?.length > 0) {
        const e = result.edges[0];
        setDetail({
          type: "edge",
          id: e.id || `${e.source}-${e.target}`,
          label: e.label,
          source: e.source,
          target: e.target,
          properties: e.properties || {}
        });
      } else {
        setDetail(null);
      }
    } catch (err: any) {
      setError(`创建失败: ${friendlyDbError(err)}`);
    } finally {
      setSavingProp(false);
    }
  };

  // ===== 全库搜索：直接查数据库，将匹配节点合并进画布 =====
  const handleGlobalSearch = useCallback(async (text: string): Promise<string[]> => {
    const trimmed = text.trim();
    if (!trimmed || !connected) return [];
    const lit = toCypherLiteral(trimmed.toLowerCase());

    let q: string;
    if (dbType === "neo4j") {
      // 对常见显示字段做不区分大小写的模糊匹配
      q = `MATCH (n) WHERE toLower(toString(coalesce(n.name, n.title, n.filename, n.value, n.code, ''))) CONTAINS ${lit} RETURN n LIMIT 100`;
    } else {
      // Ladybug：按 name 进行模糊匹配（其余字段因表模式异构不便统一处理）
      q = `MATCH (n) WHERE LOWER(n.name) CONTAINS ${lit} RETURN n LIMIT 100`;
    }

    try {
      const result: any = await executeCypher(q);
      if (result.nodes?.length > 0) {
        setGraphData(prev => mergeGraphData(prev, result, true));
        return result.nodes.map((n: any) => String(n.id));
      }
    } catch (err: any) {
      setError(`全局搜索失败: ${friendlyDbError(err)}`);
    }
    return [];
  }, [connected, dbType, mergeGraphData]);

  const handleCancelTempEntity = () => {
    if (!detail || !detail.isTemp) return;
    setTempData(prev => ({
      nodes: prev.nodes.filter(n => String(n.id) !== String(detail.id)),
      edges: prev.edges.filter(e => String(e.id) !== String(detail.id))
    }));
    setDetail(null);
  };

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


  const mergedData = useMemo(() => ({
    nodes: [...graphData.nodes, ...tempData.nodes],
    edges: [...graphData.edges, ...tempData.edges]
  }), [graphData, tempData]);

  return (
    <div className="app-layout">
      {/* ===== 数据库配置侧边栏 ===== */}
      <Sidebar
        activeNav={activeNav} setActiveNav={setActiveNav}
        sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        sidebarWidth={sidebarWidth} handleResizeStart={handleResizeStart} sidebarRef={sidebarRef}
      >
        {activeNav === "database" && (
          <>
            <ConnectView
              dbType={dbType} setDbType={setDbType} supportedDbs={supportedDbs} uri={uri} setUri={setUri} user={user} setUser={setUser}
              password={password} setPassword={setPassword} lbugPath={lbugPath} setLbugPath={setLbugPath} kuzuPath={kuzuPath} setKuzuPath={setKuzuPath}
              openReadOnly={openReadOnly} setOpenReadOnly={setOpenReadOnly}
              connected={connected} readOnly={readOnly} autoCreatedDb={autoCreatedDb} connecting={connecting} connectMsg={connectMsg} handleConnect={handleConnect}
              databases={databases} selectedDb={selectedDb} setSelectedDb={setSelectedDb} handleDbSwitch={handleDbSwitch}
            />
            {/* 替换原数据模式概览的图谱概览 */}
            <div className="form-section schema-section">
              <div className="form-section-title">图谱概览</div>
              <div className="overview-section" style={{ marginTop: 10 }}>
                <div className="overview-row" style={{ marginBottom: 8 }}>
                  <span className="label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>所有实体 ({schemaStats ? schemaStats.total_nodes : graphData.nodes.length})</span>
                </div>
                <div
                  className="overview-label-row clickable"
                  onClick={handleOverviewAllNodesClick}
                  title="点击查询所有实体"
                  style={{ marginBottom: 4 }}
                >
                  <span className="overview-dot" style={{ background: "#cbd5e1" }} />
                  <span className="overview-label-text">*({schemaStats ? schemaStats.total_nodes : graphData.nodes.length})</span>
                  <span className="overview-label-name">所有实体</span>
                </div>
                {(schemaStats ? schemaStats.labels : Object.entries(labelCounts).map(([name, count]) => ({ name, count }))).map((lbl: any, i: number) => (
                  <div
                    key={lbl.name}
                    className="overview-label-row clickable"
                    onClick={() => handleOverviewLabelClick(lbl.name)}
                    title={`点击查询 ${lbl.name} 实体`}
                    style={{ marginBottom: 4 }}
                  >
                    <span className="overview-dot" style={{ background: GRAPH_COLORS[i % GRAPH_COLORS.length] }} />
                    <span className="overview-label-text">*({lbl.count})</span>
                    <span className="overview-label-name">{lbl.name} ({lbl.count})</span>
                  </div>
                ))}
              </div>
              <div className="overview-section" style={{ marginTop: 16 }}>
                <div className="overview-row" style={{ marginBottom: 8 }}>
                  <span className="label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>所有关系 ({schemaStats ? schemaStats.total_edges : graphData.edges.length})</span>
                </div>
                <div
                  className="overview-label-row clickable"
                  onClick={handleOverviewAllRelsClick}
                  title="点击查询所有关系"
                  style={{ marginBottom: 4 }}
                >
                  <span className="overview-dot" style={{ background: "#94a3b8" }} />
                  <span className="overview-label-text">*({schemaStats ? schemaStats.total_edges : graphData.edges.length})</span>
                  <span className="overview-label-name">所有关系</span>
                </div>
                {(schemaStats ? schemaStats.rel_types : Object.entries(typeCounts).map(([name, count]) => ({ name, count }))).map((rel: any) => (
                  <div
                    key={rel.name}
                    className="overview-label-row clickable"
                    onClick={() => handleOverviewRelClick(rel.name)}
                    title={`点击查询 ${rel.name} 关系`}
                    style={{ marginBottom: 4 }}
                  >
                    <span className="overview-dot" style={{ background: "#94a3b8" }} />
                    <span className="overview-label-text">*({rel.count})</span>
                    <span className="overview-label-name">{rel.name} ({rel.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {activeNav === "history" && (
          <HistoryView history={history} setHistory={setHistory} setQuery={setQuery} setActiveNav={setActiveNav} />
        )}
        {activeNav === "theme" && (
          <ThemeView themeMode={themeMode} setThemeMode={setThemeMode} />
        )}
      </Sidebar>

      {/* ===== 主工作区 ===== */}
      <main className="main-area">
        <Header 
          sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
          connected={connected} readOnly={readOnly} autoCreatedDb={autoCreatedDb} dbType={dbType} uri={uri} lbugPath={lbugPath} kuzuPath={kuzuPath}
          databases={databases} selectedDb={selectedDb} user={user}
        />

        <div className="workspace">
          <QueryEditor 
            dbType={dbType} 
            selectedDb={selectedDb} 
            query={query} 
            setQuery={setQuery} 
            loading={loading} 
            handleExecute={handleExecute} 
          />

          {error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 结果面板 + 右侧属性面板 */}
          <ResultPanel
            activeTab={activeTab} setActiveTab={setActiveTab}
            graphData={graphData} mergedData={mergedData} execTime={execTime}
            detail={detail} setDetail={setDetail}
            activeTool={activeTool} setActiveTool={setActiveTool}
            contextMenu={contextMenu} setContextMenu={setContextMenu}
            drawingEdgeSource={drawingEdgeSource} setDrawingEdgeSource={setDrawingEdgeSource}
            handleNodeClick={handleNodeClick} handleEdgeClick={handleEdgeClick} handleCanvasClick={handleCanvasClick}
            handleNodeRightClick={handleNodeRightClick} handleEdgeRightClick={handleEdgeRightClick}
            handleGlobalSearch={handleGlobalSearch} handleMenuItemClick={handleMenuItemClick}
            editingProp={editingProp} setEditingProp={setEditingProp}
            editValue={editValue} setEditValue={setEditValue}
            savingProp={savingProp} addingProp={addingProp} setAddingProp={setAddingProp}
            newPropKey={newPropKey} setNewPropKey={setNewPropKey}
            newPropValue={newPropValue} setNewPropValue={setNewPropValue}
            handleSaveProp={handleSaveProp} handleDeleteProp={handleDeleteProp}
            schemaLabels={schemaLabels} schemaRelTypes={schemaRelTypes}
            handleSaveTempEntity={handleSaveTempEntity} handleCancelTempEntity={handleCancelTempEntity}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
