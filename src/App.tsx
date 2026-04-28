import { useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

import ConnectView from "./components/ConnectView";
import HistoryView from "./components/HistoryView";
import ThemeView from "./components/ThemeView";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import QueryEditor from "./components/QueryEditor";
import ResultPanel from "./components/ResultPanel";
const GRAPH_COLORS = ["#F4B5BD", "#A5E1D3", "#FCE49E", "#CDB4DB", "#B9E1F9", "#FFDAC1"];

import { toCypherLiteral, parseUserValue, lbugOffset, friendlyDbError } from "./utils/dbUtils";

import { useDBStore } from "./store/dbStore";
import { useGraphStore } from "./store/graphStore";
import { useUIStore } from "./store/uiStore";
import { useDatabaseActions } from "./hooks/useDatabaseActions";

function App() {
  const dbStore = useDBStore();
  const graphStore = useGraphStore();
  const uiStore = useUIStore();
  const { handleExecute } = useDatabaseActions();

  useEffect(() => {
    invoke("show_window");
  }, []);

  useEffect(() => {
    localStorage.setItem("theme-mode", uiStore.themeMode);
    const root = document.documentElement;

    const applyTheme = (dark: boolean) => {
      if (dark) {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
    };

    if (uiStore.themeMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(uiStore.themeMode === "dark");
    }
  }, [uiStore.themeMode]);

  useEffect(() => {
    invoke<string[]>("get_supported_dbs").then(dbs => {
      dbStore.setSupportedDbs(dbs);
      if (dbs.length > 0 && !dbs.includes(dbStore.dbType)) {
        dbStore.setDbType(dbs[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (uiStore.activeTool !== "create_edge") {
      graphStore.setDrawingEdgeSource(null);
    }
  }, [uiStore.activeTool]);

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

  const handleNodeClick = useCallback((nodeId: string) => {
    uiStore.setContextMenu(null);

    if (uiStore.activeTool === "create_edge") {
      if (!graphStore.drawingEdgeSource) {
        graphStore.setDrawingEdgeSource(nodeId);
      } else {
        if (graphStore.drawingEdgeSource !== nodeId) {
          const tempId = `temp_edge_${Date.now()}`;
          const newEdge = { id: tempId, source: graphStore.drawingEdgeSource, target: nodeId, label: "Unassigned", properties: {}, isTemp: true };
          graphStore.setTempData({ ...graphStore.tempData, edges: [...graphStore.tempData.edges, newEdge] });
          graphStore.setDrawingEdgeSource(null);
          uiStore.setActiveTool("pointer");
          setTimeout(() => {
            uiStore.setDetail({
              type: "edge",
              id: tempId,
              label: "Unassigned",
              source: graphStore.drawingEdgeSource!,
              target: nodeId,
              properties: {},
              isTemp: true
            });
          }, 50);
        } else {
          graphStore.setDrawingEdgeSource(null);
        }
      }
      return;
    }

    const allNodes = [...graphStore.graphData.nodes, ...graphStore.tempData.nodes];
    const node = allNodes.find((n) => String(n.id) === String(nodeId));
    if (node) {
      const props = node.properties || {};
      const labels = props._labels || [];
      uiStore.setDetail({
        type: "node",
        id: node.id,
        labels: labels,
        properties: props,
        isTemp: node.isTemp
      });
    }
  }, [graphStore.graphData, graphStore.tempData, graphStore.drawingEdgeSource, uiStore.activeTool]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    uiStore.setContextMenu(null);
    if (uiStore.activeTool !== "pointer") {
      uiStore.setActiveTool("pointer");
    }
    const allEdges = [...graphStore.graphData.edges, ...graphStore.tempData.edges];
    const edge = allEdges.find((e) => {
      const eid = e.id || `${e.source}-${e.target}`;
      return String(eid) === String(edgeId);
    });
    if (edge) {
      uiStore.setDetail({
        type: "edge",
        id: edge.id || `${edge.source}-${edge.target}`,
        label: edge.label,
        source: edge.source,
        target: edge.target,
        properties: edge.properties || {},
        isTemp: edge.isTemp
      });
    }
  }, [graphStore.graphData, graphStore.tempData, uiStore.activeTool]);

  const handleCanvasClick = useCallback(() => {
    uiStore.setDetail(null);
    uiStore.setContextMenu(null);
    if (uiStore.activeTool === "create_node") {
      const tempId = `temp_node_${Date.now()}`;
      const newNode = { id: tempId, properties: { _labels: ["NewEntity"], name: "未保存节点" }, isTemp: true };
      graphStore.setTempData({ ...graphStore.tempData, nodes: [...graphStore.tempData.nodes, newNode] });
      uiStore.setActiveTool("pointer");
      setTimeout(() => {
        uiStore.setDetail({
          type: "node",
          id: tempId,
          labels: ["NewEntity"],
          properties: { name: "未保存节点" },
          isTemp: true
        });
      }, 50);
    }
  }, [uiStore.activeTool, graphStore.tempData]);

  const handleNodeRightClick = useCallback((nodeId: string, x: number, y: number) => {
    uiStore.setContextMenu({ type: "node", id: nodeId, x, y });
  }, []);

  const handleEdgeRightClick = useCallback((edgeId: string, x: number, y: number) => {
    uiStore.setContextMenu({ type: "edge", id: edgeId, x, y });
  }, []);

  const executeCypher = async (queryText: string, engine: string = dbStore.dbType) => {
    return invoke("execute_cypher", {
      request: { query: queryText, db_type: engine },
    });
  };

  const handleMenuItemClick = async (action: string) => {
    if (!uiStore.contextMenu) return;
    const { type, id } = uiStore.contextMenu;
    uiStore.setContextMenu(null);

    if (action === "dismiss") {
      if (type === "node") {
        graphStore.setGraphData({
          nodes: graphStore.graphData.nodes.filter(n => String(n.id) !== String(id)),
          edges: graphStore.graphData.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
        });
      } else {
        graphStore.setGraphData({
          nodes: graphStore.graphData.nodes,
          edges: graphStore.graphData.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
        });
      }
    } else if (action === "delete_db") {
      if (window.confirm("确定要从数据库中彻底删除吗？这无法撤销！")) {
        graphStore.setLoading(true);
        let delQuery = "";
        if (type === "node") {
          if (dbStore.dbType === "neo4j") {
            delQuery = `MATCH (n) WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' DETACH DELETE n`;
          } else {
            const off = lbugOffset(id);
            if (off === null) {
              graphStore.setError(`无法解析节点 ID: ${id}`);
              graphStore.setLoading(false);
              return;
            }
            delQuery = `MATCH (n) WHERE offset(id(n)) = ${off} DETACH DELETE n`;
          }
        } else {
          if (dbStore.dbType === "neo4j") {
            delQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${id}' OR toString(id(r)) = '${id}' DELETE r`;
          } else {
            const edge = graphStore.graphData.edges.find(e => String(e.id || `${e.source}-${e.target}`) === String(id));
            const srcOff = edge?.source ? lbugOffset(edge.source) : null;
            const dstOff = edge?.target ? lbugOffset(edge.target) : null;
            const lbl = edge?.label;
            if (!edge || !srcOff || !dstOff || !lbl) {
              graphStore.setError(`无法定位关系: ${id}`);
              graphStore.setLoading(false);
              return;
            }
            delQuery = `MATCH (a)-[r:\`${lbl}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} DELETE r`;
          }
        }
        try {
          await executeCypher(delQuery);
          if (type === "node") {
            graphStore.setGraphData({
              nodes: graphStore.graphData.nodes.filter(n => String(n.id) !== String(id)),
              edges: graphStore.graphData.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
            });
          } else {
            graphStore.setGraphData({
              nodes: graphStore.graphData.nodes,
              edges: graphStore.graphData.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
            });
          }
        } catch (err: any) {
          graphStore.setError(`删除失败: ${friendlyDbError(err)}`);
        } finally {
          graphStore.setLoading(false);
        }
      }
    } else if (action === "undo_connect") {
      if (type === "node") {
        graphStore.setGraphData({
          nodes: graphStore.graphData.nodes,
          edges: graphStore.graphData.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id))
        });
      } else {
        graphStore.setGraphData({
          nodes: graphStore.graphData.nodes,
          edges: graphStore.graphData.edges.filter(e => String(e.id || `${e.source}-${e.target}`) !== String(id))
        });
      }
    } else if (action === "expand" && type === "node") {
      let expandQuery = "";
      if (dbStore.dbType === "neo4j") {
        expandQuery = `MATCH (n)-[r]-(m) WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' RETURN n, r, m LIMIT 50`;
      } else {
        const off = lbugOffset(id);
        if (off === null) { graphStore.setError(`无法解析节点 ID: ${id}`); return; }
        expandQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) = ${off} RETURN a, r, b LIMIT 50`;
      }
      graphStore.setLoading(true);
      try {
        const result: any = await executeCypher(expandQuery);
        graphStore.setGraphData(mergeGraphData(graphStore.graphData, result, true));
      } catch (err: any) {
        graphStore.setError(`展开邻居失败: ${friendlyDbError(err)}`);
      } finally {
        graphStore.setLoading(false);
      }
    } else if (action === "show_rels" && type === "node") {
      let relQuery = "";
      if (dbStore.dbType === "neo4j") {
        relQuery = `MATCH (n)-[r]-() WHERE elementId(n) = '${id}' OR toString(id(n)) = '${id}' RETURN r LIMIT 50`;
      } else {
        const off = lbugOffset(id);
        if (off === null) { graphStore.setError(`无法解析节点 ID: ${id}`); return; }
        relQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) = ${off} RETURN a, r, b LIMIT 50`;
      }
      graphStore.setLoading(true);
      try {
        const result: any = await executeCypher(relQuery);
        graphStore.setGraphData(mergeGraphData(graphStore.graphData, result, true));
      } catch (err: any) {
        graphStore.setError(`查询关系失败: ${friendlyDbError(err)}`);
      } finally {
        graphStore.setLoading(false);
      }
    } else if (action === "show_rels" && type === "edge") {
      const edge = graphStore.graphData.edges.find((e) => String(e.id || `${e.source}-${e.target}`) === String(id));
      if (edge && edge.source && edge.target) {
        let relQuery = "";
        if (dbStore.dbType === "neo4j") {
          relQuery = `MATCH (n)-[r]-(m) WHERE elementId(n) IN ['${edge.source}', '${edge.target}'] OR toString(id(n)) IN ['${edge.source}', '${edge.target}'] RETURN n, r, m LIMIT 50`;
        } else {
          const so = lbugOffset(edge.source);
          const to = lbugOffset(edge.target);
          if (!so || !to) { graphStore.setError(`无法解析端点 ID`); return; }
          relQuery = `MATCH (a)-[r]-(b) WHERE offset(id(a)) IN [${so}, ${to}] RETURN a, r, b LIMIT 50`;
        }
        graphStore.setLoading(true);
        try {
          const result: any = await executeCypher(relQuery);
          graphStore.setGraphData(mergeGraphData(graphStore.graphData, result, true));
        } catch (err: any) {
          graphStore.setError(`查询关系失败: ${friendlyDbError(err)}`);
        } finally {
          graphStore.setLoading(false);
        }
      }
    }
  };

  const handleSaveProp = async (key: string, val: string) => {
    if (!uiStore.detail) return;
    const parsedVal = parseUserValue(val);
    const cypherVal = toCypherLiteral(parsedVal);

    let updateQuery = "";
    if (uiStore.detail.type === "node") {
      if (dbStore.dbType === "neo4j") {
        updateQuery = `MATCH (n) WHERE elementId(n) = '${uiStore.detail.id}' OR toString(id(n)) = '${uiStore.detail.id}' SET n.\`${key}\` = ${cypherVal}`;
      } else {
        const off = lbugOffset(uiStore.detail.id);
        if (off === null) {
          graphStore.setError(`无法解析节点 ID: ${uiStore.detail.id}`);
          return;
        }
        updateQuery = `MATCH (n) WHERE offset(id(n)) = ${off} SET n.\`${key}\` = ${cypherVal}`;
      }
    } else {
      if (dbStore.dbType === "neo4j") {
        updateQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${uiStore.detail.id}' OR toString(id(r)) = '${uiStore.detail.id}' SET r.\`${key}\` = ${cypherVal}`;
      } else {
        const srcOff = uiStore.detail.source ? lbugOffset(uiStore.detail.source) : null;
        const dstOff = uiStore.detail.target ? lbugOffset(uiStore.detail.target) : null;
        if (!srcOff || !dstOff || !uiStore.detail.label) {
          graphStore.setError(`无法定位关系（缺少 source/target/label）`);
          return;
        }
        updateQuery = `MATCH (a)-[r:\`${uiStore.detail.label}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} SET r.\`${key}\` = ${cypherVal}`;
      }
    }

    try {
      await executeCypher(updateQuery);
      graphStore.setGraphData({
        ...graphStore.graphData,
        nodes: uiStore.detail.type === "node" ? graphStore.graphData.nodes.map(n => String(n.id) === String(uiStore.detail!.id) ? { ...n, properties: { ...n.properties, [key]: parsedVal } } : n) : graphStore.graphData.nodes,
        edges: uiStore.detail.type !== "node" ? graphStore.graphData.edges.map(e => String(e.id || `${e.source}-${e.target}`) === String(uiStore.detail!.id) ? { ...e, properties: { ...e.properties, [key]: parsedVal } } : e) : graphStore.graphData.edges
      });
      uiStore.setDetail({ ...uiStore.detail, properties: { ...uiStore.detail.properties, [key]: parsedVal } });
    } catch (err: any) {
      graphStore.setError(`保存失败: ${friendlyDbError(err)}`);
    }
  };

  const handleDeleteProp = async (key: string) => {
    if (!uiStore.detail) return;
    let updateQuery = "";
    if (uiStore.detail.type === "node") {
      if (dbStore.dbType === "neo4j") {
        updateQuery = `MATCH (n) WHERE elementId(n) = '${uiStore.detail.id}' OR toString(id(n)) = '${uiStore.detail.id}' REMOVE n.\`${key}\``;
      } else {
        const off = lbugOffset(uiStore.detail.id);
        if (off === null) {
          graphStore.setError(`无法解析节点 ID: ${uiStore.detail.id}`);
          return;
        }
        updateQuery = `MATCH (n) WHERE offset(id(n)) = ${off} SET n.\`${key}\` = null`;
      }
    } else {
      if (dbStore.dbType === "neo4j") {
        updateQuery = `MATCH ()-[r]-() WHERE elementId(r) = '${uiStore.detail.id}' OR toString(id(r)) = '${uiStore.detail.id}' REMOVE r.\`${key}\``;
      } else {
        const srcOff = uiStore.detail.source ? lbugOffset(uiStore.detail.source) : null;
        const dstOff = uiStore.detail.target ? lbugOffset(uiStore.detail.target) : null;
        if (!srcOff || !dstOff || !uiStore.detail.label) {
          graphStore.setError(`无法定位关系（缺少 source/target/label）`);
          return;
        }
        updateQuery = `MATCH (a)-[r:\`${uiStore.detail.label}\`]->(b) WHERE offset(id(a)) = ${srcOff} AND offset(id(b)) = ${dstOff} SET r.\`${key}\` = null`;
      }
    }
    
    try {
      await executeCypher(updateQuery);
      const removeKey = dbStore.dbType === "neo4j";
      const applyDelete = (props: Record<string, any>) => {
        const next = { ...props };
        if (removeKey) delete next[key]; else next[key] = null;
        return next;
      };
      graphStore.setGraphData({
        ...graphStore.graphData,
        nodes: uiStore.detail.type === "node" ? graphStore.graphData.nodes.map(n => String(n.id) === String(uiStore.detail!.id) ? { ...n, properties: applyDelete(n.properties) } : n) : graphStore.graphData.nodes,
        edges: uiStore.detail.type !== "node" ? graphStore.graphData.edges.map(e => String(e.id || `${e.source}-${e.target}`) === String(uiStore.detail!.id) ? { ...e, properties: applyDelete(e.properties) } : e) : graphStore.graphData.edges
      });
      uiStore.setDetail({ ...uiStore.detail, properties: applyDelete(uiStore.detail.properties) });
    } catch(err: any) {
      graphStore.setError(`删除属性失败: ${friendlyDbError(err)}`);
    }
  };

  const handleSaveTempEntity = async (labelOrType: string, customProps: any) => {
    if (!uiStore.detail || !uiStore.detail.isTemp) return;
    let createQuery = "";

    const uniqSuffix = Date.now();
    const needsPk = dbStore.dbType !== "neo4j" && uiStore.detail.type === "node" && !("id" in customProps);
    const defaultNodeProps: Record<string, any> = uiStore.detail.type === "node"
      ? (needsPk ? { id: uniqSuffix, name: `New Node ${uniqSuffix}` } : { name: `New Node ${uniqSuffix}` })
      : {};
    const effectiveProps = Object.keys(customProps).length > 0 ? customProps : defaultNodeProps;
    const propsStr = Object.keys(effectiveProps).length > 0 ? toCypherLiteral(effectiveProps) : ``;

    if (uiStore.detail.type === "node") {
      const lbls = labelOrType.split(",").map(s => s.trim()).filter(Boolean);
      if (lbls.length > 0) {
        const labels = lbls.map(l => `:\`${l}\``).join("");
        createQuery = `CREATE (n${labels} ${propsStr}) RETURN n`;
      } else {
        createQuery = `CREATE (n ${propsStr}) RETURN n`;
      }
    } else if (uiStore.detail.type === "edge" && uiStore.detail.source && uiStore.detail.target) {
      const sourceId = uiStore.detail.source;
      const targetId = uiStore.detail.target;
      if (dbStore.dbType === "neo4j") {
        createQuery = `MATCH (a) WHERE elementId(a) = '${sourceId}' OR toString(id(a)) = '${sourceId}' WITH a MATCH (b) WHERE elementId(b) = '${targetId}' OR toString(id(b)) = '${targetId}' CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      } else {
        const srcOffset = lbugOffset(sourceId);
        const dstOffset = lbugOffset(targetId);
        if (!srcOffset || !dstOffset) {
          graphStore.setError(`无法解析源/目标节点 ID`);
          return;
        }
        const srcNode = graphStore.graphData.nodes.find(n => String(n.id) === String(sourceId));
        const dstNode = graphStore.graphData.nodes.find(n => String(n.id) === String(targetId));
        const srcLabel = srcNode?.properties?._labels?.[0];
        const dstLabel = dstNode?.properties?._labels?.[0];
        const aPart = srcLabel ? `(a:\`${srcLabel}\`)` : `(a)`;
        const bPart = dstLabel ? `(b:\`${dstLabel}\`)` : `(b)`;
        createQuery = `MATCH ${aPart} WHERE offset(id(a)) = ${srcOffset} WITH a MATCH ${bPart} WHERE offset(id(b)) = ${dstOffset} CREATE (a)-[r:\`${labelOrType}\` ${propsStr}]->(b) RETURN a, r, b`;
      }
    }

    try {
      const result: any = await executeCypher(createQuery);

      if (uiStore.detail.type === "edge" && (!result.edges || result.edges.length === 0)) {
        graphStore.setError(`关系创建失败：未能定位源或目标节点。`);
        return;
      }
      if (uiStore.detail.type === "node" && (!result.nodes || result.nodes.length === 0)) {
        graphStore.setError(`节点创建失败：CREATE 没有返回任何节点。`);
        return;
      }

      graphStore.setTempData({
        nodes: graphStore.tempData.nodes.filter(n => String(n.id) !== String(uiStore.detail!.id)),
        edges: graphStore.tempData.edges.filter(e => String(e.id) !== String(uiStore.detail!.id))
      });
      graphStore.setGraphData(mergeGraphData(graphStore.graphData, result, true));

      if (uiStore.detail.type === "node" && result.nodes?.length > 0) {
        const n = result.nodes[0];
        uiStore.setDetail({ type: "node", id: n.id, labels: n.properties?._labels || [], properties: n.properties || {} });
      } else if (uiStore.detail.type === "edge" && result.edges?.length > 0) {
        const e = result.edges[0];
        uiStore.setDetail({ type: "edge", id: e.id || `${e.source}-${e.target}`, label: e.label, source: e.source, target: e.target, properties: e.properties || {} });
      } else {
        uiStore.setDetail(null);
      }
    } catch (err: any) {
      graphStore.setError(`创建失败: ${friendlyDbError(err)}`);
    }
  };

  const handleGlobalSearch = useCallback(async (text: string): Promise<string[]> => {
    const trimmed = text.trim();
    if (!trimmed || !dbStore.engineStates[dbStore.dbType]?.connected) return [];
    const lit = toCypherLiteral(trimmed.toLowerCase());

    let q: string;
    if (dbStore.dbType === "neo4j") {
      q = `MATCH (n) WHERE toLower(toString(coalesce(n.name, n.title, n.filename, n.value, n.code, ''))) CONTAINS ${lit} RETURN n LIMIT 100`;
    } else {
      q = `MATCH (n) WHERE LOWER(n.name) CONTAINS ${lit} RETURN n LIMIT 100`;
    }

    try {
      const result: any = await executeCypher(q);
      if (result.nodes?.length > 0) {
        graphStore.setGraphData(mergeGraphData(graphStore.graphData, result, true));
        return result.nodes.map((n: any) => String(n.id));
      }
    } catch (err: any) {
      graphStore.setError(`全局搜索失败: ${friendlyDbError(err)}`);
    }
    return [];
  }, [dbStore.engineStates, dbStore.dbType, mergeGraphData, graphStore]);

  const handleCancelTempEntity = () => {
    if (!uiStore.detail || !uiStore.detail.isTemp) return;
    graphStore.setTempData({
      nodes: graphStore.tempData.nodes.filter(n => String(n.id) !== String(uiStore.detail!.id)),
      edges: graphStore.tempData.edges.filter(e => String(e.id) !== String(uiStore.detail!.id))
    });
    uiStore.setDetail(null);
  };

  const labelCounts: Record<string, number> = {};
  graphStore.graphData.nodes.forEach(n => {
    const labels = n.properties?._labels || ["Unknown"];
    labels.forEach((l: string) => { labelCounts[l] = (labelCounts[l] || 0) + 1; });
  });
  const typeCounts: Record<string, number> = {};
  graphStore.graphData.edges.forEach(e => {
    const t = e.label || "UNKNOWN";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const mergedData = useMemo(() => ({
    nodes: [...graphStore.graphData.nodes, ...graphStore.tempData.nodes],
    edges: [...graphStore.graphData.edges, ...graphStore.tempData.edges]
  }), [graphStore.graphData, graphStore.tempData]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <Sidebar>
        {uiStore.activeNav === "database" && (
          <>
            <ConnectView />
            <div className="form-section pt-4 border-t border-border-light">
              <div className="form-section-title">图谱概览</div>
              <div className="mb-2" style={{ marginTop: 10 }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] font-semibold text-text-heading">所有实体 ({dbStore.schemaStats ? dbStore.schemaStats.total_nodes : graphStore.graphData.nodes.length})</span>
                </div>
                <div
                  className="flex items-center gap-2 px-1.5 py-1 mb-1.5 text-xs rounded transition-colors duration-150 cursor-pointer hover:bg-bg-hover"
                  onClick={() => handleExecute(`MATCH (n) RETURN n LIMIT 25`)}
                  title="点击查询所有实体"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#cbd5e1" }} />
                  <span className="text-text-faint font-mono text-[10px]">*({dbStore.schemaStats ? dbStore.schemaStats.total_nodes : graphStore.graphData.nodes.length})</span>
                  <span className="text-text-primary font-medium">所有实体</span>
                </div>
                {(dbStore.schemaStats ? dbStore.schemaStats.labels : Object.entries(labelCounts).map(([name, count]) => ({ name, count }))).map((lbl: any, i: number) => (
                  <div
                    key={lbl.name}
                    className="flex items-center gap-2 px-1.5 py-1 mb-1.5 text-xs rounded transition-colors duration-150 cursor-pointer hover:bg-bg-hover"
                    onClick={() => handleExecute(`MATCH (n:\`${lbl.name}\`) RETURN n LIMIT 25`)}
                    title={`点击查询 ${lbl.name} 实体`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: GRAPH_COLORS[i % GRAPH_COLORS.length] }} />
                    <span className="text-text-faint font-mono text-[10px]">*({lbl.count})</span>
                    <span className="text-text-primary font-medium">{lbl.name} ({lbl.count})</span>
                  </div>
                ))}
              </div>
              <div className="mb-2" style={{ marginTop: 24 }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-semibold text-text-heading">所有关系 ({dbStore.schemaStats ? dbStore.schemaStats.total_edges : graphStore.graphData.edges.length})</span>
                </div>
                <div
                  className="flex items-center gap-2 px-1.5 py-1 mb-1.5 text-xs rounded transition-colors duration-150 cursor-pointer hover:bg-bg-hover"
                  onClick={() => handleExecute(`MATCH p=()-[]->() RETURN p LIMIT 25`)}
                  title="点击查询所有关系"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#94a3b8" }} />
                  <span className="text-text-faint font-mono text-[10px]">*({dbStore.schemaStats ? dbStore.schemaStats.total_edges : graphStore.graphData.edges.length})</span>
                  <span className="text-text-primary font-medium">所有关系</span>
                </div>
                {(dbStore.schemaStats ? dbStore.schemaStats.rel_types : Object.entries(typeCounts).map(([name, count]) => ({ name, count }))).map((rel: any) => (
                  <div
                    key={rel.name}
                    className="flex items-center gap-2 px-1.5 py-1 mb-1.5 text-xs rounded transition-colors duration-150 cursor-pointer hover:bg-bg-hover"
                    onClick={() => handleExecute(`MATCH p=()-[r:\`${rel.name}\`]->() RETURN p LIMIT 25`)}
                    title={`点击查询 ${rel.name} 关系`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#94a3b8" }} />
                    <span className="text-text-faint font-mono text-[10px]">*({rel.count})</span>
                    <span className="text-text-primary font-medium">{rel.name} ({rel.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {uiStore.activeNav === "history" && <HistoryView />}
        {uiStore.activeNav === "theme" && <ThemeView />}
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0 bg-bg-workspace overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
          <QueryEditor />
          {graphStore.error && (
            <div className="error-box">
              <span>⚠️</span>
              <span>{graphStore.error}</span>
            </div>
          )}
          <ResultPanel
            mergedData={mergedData}
            handleNodeClick={handleNodeClick}
            handleEdgeClick={handleEdgeClick}
            handleCanvasClick={handleCanvasClick}
            handleNodeRightClick={handleNodeRightClick}
            handleEdgeRightClick={handleEdgeRightClick}
            handleGlobalSearch={handleGlobalSearch}
            handleMenuItemClick={handleMenuItemClick}
            handleSaveProp={handleSaveProp}
            handleDeleteProp={handleDeleteProp}
            handleSaveTempEntity={handleSaveTempEntity}
            handleCancelTempEntity={handleCancelTempEntity}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
