import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { EyeOff, PinOff, Link, Undo2, Maximize, Trash2, PlusCircle, ArrowUpRight } from "lucide-react";
import "./App.css";
import GraphCanvas from "./components/GraphCanvas";
import ConnectView from "./components/ConnectView";
import HistoryView from "./components/HistoryView";
import ThemeView from "./components/ThemeView";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ContextMenu from "./components/ContextMenu";
import DetailPanel from "./components/DetailPanel";
import GraphToolbar, { ActiveTool } from "./components/GraphToolbar";
import { IconLayout, IconGraph, IconTable, IconRaw, IconMaximize, IconSpinner, IconPlay, IconX } from "./components/icons";
const GRAPH_COLORS = ["#F4B5BD", "#A5E1D3", "#FCE49E", "#CDB4DB", "#B9E1F9", "#FFDAC1"];

/* ===== 详情类型定义 ===== */
interface DetailInfo {
  type: "node" | "edge";
  id: string;
  label?: string;
  labels?: string[];
  source?: string;
  target?: string;
  isTemp?: boolean;
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

  // 右键菜单
  interface ContextMenuState {
    type: "node" | "edge";
    id: string;
    x: number;
    y: number;
  }
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingProp, setSavingProp] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("pointer");
  const [tempData, setTempData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] });
  const [drawingEdgeSource, setDrawingEdgeSource] = useState<string | null>(null);
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
    setTempData({ nodes: [], edges: [] });
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

  // ===== 安全合并图谱数据 (防止缺节点导致 NVL 白屏) =====
  const mergeGraphData = useCallback((prev: { nodes: any[], edges: any[] }, result: { nodes: any[], edges: any[] }, append: boolean = false) => {
    const newNodes = append ? [...prev.nodes] : [];
    const newEdges = append ? [...prev.edges] : [];

    result.nodes?.forEach((n: any) => {
      if (!newNodes.find((pn) => String(pn.id) === String(n.id))) newNodes.push(n);
    });

    result.edges?.forEach((e: any) => {
      const eid = e.id || `${e.source}-${e.target}`;
      if (!newEdges.find((pe) => String(pe.id || `${pe.source}-${pe.target}`) === String(eid))) newEdges.push(e);
    });

    // Safety check for InteractiveNvlWrapper: Ensure all edges have their nodes defined
    newEdges.forEach(e => {
      if (e.source && !newNodes.find(n => String(n.id) === String(e.source))) {
        newNodes.push({ id: e.source, properties: { _labels: ["Unknown"] } });
      }
      if (e.target && !newNodes.find(n => String(n.id) === String(e.target))) {
        newNodes.push({ id: e.target, properties: { _labels: ["Unknown"] } });
      }
    });

    return { nodes: newNodes, edges: newEdges };
  }, []);

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
    setContextMenu(null);
    setTempData({ nodes: [], edges: [] });
    const t0 = performance.now();
    try {
      const result: any = await invoke("execute_cypher", {
        request: { query: q },
      });
      setGraphData(mergeGraphData({ nodes: [], edges: [] }, result));
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
          delQuery = dbType === "neo4j" 
            ? `MATCH (n) WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' DETACH DELETE n`
            : `MATCH (n) WHERE toString(offset(id(n))) = '${id.split(':').pop()}' DETACH DELETE n`;
        } else {
          delQuery = dbType === "neo4j"
            ? `MATCH ()-[r]-() WHERE elementId(r) = '${id}' OR toString(id(r)) = '${id}' DELETE r`
            : `MATCH ()-[r]-() WHERE toString(offset(id(r))) = '${id.split(':').pop()}' DELETE r`;
        }
        try {
          await invoke("execute_cypher", { request: { query: delQuery } });
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
          setError(err.toString());
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
        // Fallback for Kuzu
        expandQuery = `MATCH (a)-[r]-(b) WHERE toString(offset(id(a))) = '${id.split(':').pop()}' RETURN a, r, b LIMIT 50`;
      }
      setLoading(true);
      try {
        const result: any = await invoke("execute_cypher", {
          request: { query: expandQuery },
        });
        setGraphData((prev) => mergeGraphData(prev, result, true));
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    } else if (action === "show_rels" && type === "node") {
      let relQuery = "";
      if (dbType === "neo4j") {
        relQuery = `MATCH (n)-[r]-() WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' RETURN r LIMIT 50`;
      } else {
        relQuery = `MATCH (a)-[r]-() WHERE toString(offset(id(a))) = '${id.split(':').pop()}' RETURN r LIMIT 50`;
      }
      setLoading(true);
      try {
        const result: any = await invoke("execute_cypher", {
          request: { query: relQuery },
        });
        setGraphData((prev) => mergeGraphData(prev, result, true));
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    } else if (action === "show_rels" && type === "edge") {
      // Edges typically don't show more rels, but we can query adjacent relationships
      const edge = graphData.edges.find((e) => String(e.id || `${e.source}-${e.target}`) === String(id));
      if (edge && edge.source && edge.target) {
        let relQuery = "";
        if (dbType === "neo4j") {
          relQuery = `MATCH (n)-[r]-() WHERE elementId(n) IN ['${edge.source}', '${edge.target}'] OR toString(id(n)) IN ['${edge.source}', '${edge.target}'] RETURN r LIMIT 50`;
        } else {
          relQuery = `MATCH (a)-[r]-() WHERE toString(offset(id(a))) IN ['${String(edge.source).split(':').pop()}', '${String(edge.target).split(':').pop()}'] RETURN r LIMIT 50`;
        }
        setLoading(true);
        try {
          const result: any = await invoke("execute_cypher", { request: { query: relQuery } });
          setGraphData((prev) => mergeGraphData(prev, result, true));
        } catch (err: any) { setError(err.toString()); } finally { setLoading(false); }
      }
    }
  };

  // 处理属性保存
  const handleSaveProp = async (key: string, val: string) => {
    if (!detail) return;
    setSavingProp(true);
    let parsedVal: any = val;
    if (!isNaN(Number(val)) && val.trim() !== "") parsedVal = Number(val);
    let cypherVal = typeof parsedVal === "string" ? `'${parsedVal.replace(/'/g, "\\'")}'` : parsedVal;

    let updateQuery = "";
    if (detail.type === "node") {
      if (dbType === "neo4j") {
        updateQuery = `MATCH (n) WHERE elementId(n) = '${detail.id}' OR toString(id(n)) = '${detail.id}' SET n.\`${key}\` = ${cypherVal}`;
      } else {
        updateQuery = `MATCH (n) WHERE toString(offset(id(n))) = '${detail.id.split(':').pop()}' SET n.\`${key}\` = ${cypherVal}`;
      }
    } else {
      if (dbType === "neo4j") {
        updateQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${detail.id}' OR toString(id(r)) = '${detail.id}' SET r.\`${key}\` = ${cypherVal}`;
      } else {
        updateQuery = `MATCH ()-[r]-() WHERE toString(offset(id(r))) = '${detail.id.split(':').pop()}' SET r.\`${key}\` = ${cypherVal}`;
      }
    }

    try {
      await invoke("execute_cypher", { request: { query: updateQuery } });

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
      setError(`保存失败: ${err.toString()}`);
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
      updateQuery = dbType === "neo4j"
        ? `MATCH (n) WHERE elementId(n) = '${detail.id}' OR toString(id(n)) = '${detail.id}' REMOVE n.\`${key}\``
        : `MATCH (n) WHERE toString(offset(id(n))) = '${detail.id.split(':').pop()}' REMOVE n.\`${key}\``;
    } else {
      updateQuery = dbType === "neo4j"
        ? `MATCH ()-[r]-() WHERE elementId(r) = '${detail.id}' OR toString(id(r)) = '${detail.id}' REMOVE r.\`${key}\``
        : `MATCH ()-[r]-() WHERE toString(offset(id(r))) = '${detail.id.split(':').pop()}' REMOVE r.\`${key}\``;
    }
    
    try {
      await invoke("execute_cypher", { request: { query: updateQuery } });
      setGraphData(prev => {
        if (detail.type === "node") {
          return {
            ...prev,
            nodes: prev.nodes.map(n => {
               if (String(n.id) === String(detail.id)) {
                 const newProps = { ...n.properties };
                 delete newProps[key];
                 return { ...n, properties: newProps };
               }
               return n;
            })
          };
        } else {
          return {
            ...prev,
            edges: prev.edges.map(e => {
               if (String(e.id || `${e.source}-${e.target}`) === String(detail.id)) {
                 const newProps = { ...e.properties };
                 delete newProps[key];
                 return { ...e, properties: newProps };
               }
               return e;
            })
          };
        }
      });
      setDetail(prev => {
        if (!prev) return null;
        const newProps = { ...prev.properties };
        delete newProps[key];
        return { ...prev, properties: newProps };
      });
    } catch(err: any) {
      setError(`删除属性失败: ${err.toString()}`);
    } finally {
      setSavingProp(false);
    }
  };

  const handleSaveTempEntity = async (labelOrType: string, customProps: any) => {
    if (!detail || !detail.isTemp) return;
    setSavingProp(true);
    let createQuery = "";

    const propsStr = Object.keys(customProps).length > 0 
      ? `{${Object.entries(customProps).map(([k, v]) => `\`${k}\`: ${JSON.stringify(v)}`).join(', ')}}`
      : `{name: 'New Node'}`;

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
        createQuery = `MATCH (a), (b) WHERE (elementId(a) = '${sourceId}' OR toString(id(a)) = '${sourceId}') AND (elementId(b) = '${targetId}' OR toString(id(b)) = '${targetId}') CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      } else {
        createQuery = `MATCH (a), (b) WHERE toString(offset(id(a))) = '${sourceId.split(':').pop()}' AND toString(offset(id(b))) = '${targetId.split(':').pop()}' CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      }
    }

    try {
      const result: any = await invoke("execute_cypher", { request: { query: createQuery } });
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
      setError(err.toString());
    } finally {
      setSavingProp(false);
    }
  };

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

  const TAG_COLORS = ["tag-pink", "tag-green", "tag-yellow", "tag-blue", "tag-purple", "tag-orange"];

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
          <ConnectView
            dbType={dbType} setDbType={setDbType} uri={uri} setUri={setUri} user={user} setUser={setUser}
            password={password} setPassword={setPassword} kuzuPath={kuzuPath} setKuzuPath={setKuzuPath}
            connected={connected} connecting={connecting} connectMsg={connectMsg} handleConnect={handleConnect}
            databases={databases} selectedDb={selectedDb} setSelectedDb={setSelectedDb} handleDbSwitch={handleDbSwitch}
            schemaLabels={schemaLabels} schemaRelTypes={schemaRelTypes} schemaProperties={schemaProperties} TAG_COLORS={TAG_COLORS}
          />
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
          connected={connected} dbType={dbType} uri={uri} kuzuPath={kuzuPath}
          databases={databases} selectedDb={selectedDb} user={user}
        />

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
                    <>
                      <GraphCanvas
                        data={mergedData}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        onCanvasClick={handleCanvasClick}
                        onNodeRightClick={handleNodeRightClick}
                        onEdgeRightClick={handleEdgeRightClick}
                      />
                      <GraphToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
                      {contextMenu && (
                        <ContextMenu
                          contextMenu={contextMenu}
                          setContextMenu={setContextMenu}
                          handleMenuItemClick={handleMenuItemClick}
                          drawingEdgeSource={drawingEdgeSource}
                          setDrawingEdgeSource={setDrawingEdgeSource}
                        />
                      )}
                      {drawingEdgeSource && (
                        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 13, boxShadow: 'var(--shadow-md)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>请点击希望连接的目标节点...</span>
                          <button onClick={() => {
                            setDrawingEdgeSource(null);
                            setActiveTool("pointer");
                          }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                            <IconX />
                          </button>
                        </div>
                      )}
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
                          {(schemaStats ? schemaStats.labels : Object.entries(labelCounts).map(([name, count]) => ({ name, count }))).map((lbl: any, i: number) => (
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
                          {(schemaStats ? schemaStats.rel_types : Object.entries(typeCounts).map(([name, count]) => ({ name, count }))).map((rel: any) => (
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
              <DetailPanel
                detail={detail}
                setDetail={setDetail}
                editingProp={editingProp}
                setEditingProp={setEditingProp}
                editValue={editValue}
                setEditValue={setEditValue}
                savingProp={savingProp}
                addingProp={addingProp}
                setAddingProp={setAddingProp}
                newPropKey={newPropKey}
                setNewPropKey={setNewPropKey}
                newPropValue={newPropValue}
                setNewPropValue={setNewPropValue}
                handleSaveProp={handleSaveProp}
                handleDeleteProp={handleDeleteProp}
                schemaLabels={schemaLabels}
                schemaRelTypes={schemaRelTypes}
                handleSaveTempEntity={handleSaveTempEntity}
                handleCancelTempEntity={handleCancelTempEntity}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
