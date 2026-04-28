import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useDBStore } from "../store/dbStore";
import { useGraphStore } from "../store/graphStore";
import { friendlyDbError } from "../utils/dbUtils";

type ConnectResponse = {
  message: string;
  read_only: boolean;
  auto_created: boolean;
};

export function useDatabaseActions() {
  const dbStore = useDBStore();
  const graphStore = useGraphStore();
  const connectIdRef = useRef<Record<string, number>>({});

  const fetchSchema = useCallback(async (engine: string = dbStore.dbType) => {
    try {
      const stats: any = await invoke("get_schema_stats", { dbType: engine });
      dbStore.setSchemaStats(stats);
      dbStore.setSchemaLabels(stats.labels.map((l: any) => l.name));
      dbStore.setSchemaRelTypes(stats.rel_types.map((t: any) => t.name));
    } catch { /* ignore */ }
  }, [dbStore]);

  const handleExecute = useCallback(async (queryText: string, engine: string = dbStore.dbType) => {
    graphStore.setLoading(true);
    graphStore.setError("");
    const startTime = performance.now();
    try {
      const result: any = await invoke("execute_cypher", {
        request: { query: queryText, db_type: engine },
      });
      const endTime = performance.now();
      graphStore.setExecTime(endTime - startTime);

      const nodesMap = new Map<string, any>();
      const edgesMap = new Map<string, any>();

      result.nodes?.forEach((n: any) => {
        if (!nodesMap.has(String(n.id))) nodesMap.set(String(n.id), n);
      });

      result.edges?.forEach((e: any) => {
        const eid = String(e.id || `${e.source}-${e.target}`);
        if (!edgesMap.has(eid)) edgesMap.set(eid, e);
      });

      for (const e of edgesMap.values()) {
        if (e.source && !nodesMap.has(String(e.source))) {
          nodesMap.set(String(e.source), { id: e.source, properties: { _labels: ["Unknown"] } });
        }
        if (e.target && !nodesMap.has(String(e.target))) {
          nodesMap.set(String(e.target), { id: e.target, properties: { _labels: ["Unknown"] } });
        }
      }

      const nodes = Array.from(nodesMap.values());
      const edges = Array.from(edgesMap.values());

      graphStore.setTempData({ nodes: [], edges: [] });
      graphStore.setGraphData({ nodes, edges });
      graphStore.addHistory(queryText, nodes.length, edges.length);
    } catch (err: any) {
      graphStore.setError(friendlyDbError(err));
    } finally {
      graphStore.setLoading(false);
    }
  }, [dbStore.dbType, graphStore]);

  const handleConnect = useCallback(async () => {
    const engine = dbStore.dbType;
    const state = dbStore.engineStates[engine];

    if (state?.connecting) {
      connectIdRef.current[engine] = (connectIdRef.current[engine] ?? 0) + 1;
      dbStore.updateEngineState(engine, {
        connecting: false,
        readOnly: false,
        autoCreatedDb: false,
        connectMsg: { ok: false, text: "已取消连接" },
      });
      return;
    }

    if (state?.connected) {
      try {
        const message = await invoke<string>("disconnect_db", { dbType: engine });
        dbStore.updateEngineState(engine, {
          connected: false,
          readOnly: false,
          autoCreatedDb: false,
          connecting: false,
          connectMsg: { ok: true, text: String(message) },
          databases: [],
          selectedDb: engine === "neo4j" ? "neo4j" : "default",
        });
        graphStore.setGraphData({ nodes: [], edges: [] });
        graphStore.setTempData({ nodes: [], edges: [] });
        dbStore.resetSchema();
        graphStore.setError("");
      } catch (err: any) {
        dbStore.updateEngineState(engine, {
          connectMsg: { ok: false, text: friendlyDbError(err) },
        });
      }
      return;
    }

    const currentId = (connectIdRef.current[engine] ?? 0) + 1;
    connectIdRef.current[engine] = currentId;
    dbStore.updateEngineState(engine, {
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
          uri: engine === "neo4j" ? dbStore.uri : null,
          user: engine === "neo4j" ? dbStore.user : null,
          password: engine === "neo4j" ? dbStore.password : null,
          lbug_path: engine === "lbug" ? dbStore.lbugPath : null,
          kuzu_path: engine === "kuzu" ? dbStore.kuzuPath : null,
          database: engine === "neo4j" ? (state?.selectedDb || "neo4j") : "default",
          read_only: engine === "neo4j" ? false : state?.openReadOnly,
        },
      });
      if (currentId !== connectIdRef.current[engine]) return;
      dbStore.updateEngineState(engine, {
        connected: true,
        readOnly: Boolean(resp.read_only),
        autoCreatedDb: Boolean(resp.auto_created),
        connectMsg: { ok: true, text: String(resp.message) },
      });

      try {
        const dbs: any = await invoke("list_databases", { dbType: engine });
        if (currentId !== connectIdRef.current[engine]) return;
        const def = dbs.find((d: any) => d.is_default);
        dbStore.updateEngineState(engine, {
          databases: dbs,
          selectedDb: def?.name || (engine === "neo4j" ? state?.selectedDb || "neo4j" : "default"),
        });
      } catch (_) { /* ignore */ }

      await fetchSchema(engine);
      if (!resp.auto_created) {
        handleExecute("MATCH p=()-[]->() RETURN p LIMIT 25;", engine);
      } else {
        graphStore.setGraphData({ nodes: [], edges: [] });
        graphStore.setTempData({ nodes: [], edges: [] });
        graphStore.setError("");
      }
    } catch (err: any) {
      if (currentId !== connectIdRef.current[engine]) return;
      dbStore.updateEngineState(engine, {
        connected: false,
        readOnly: false,
        autoCreatedDb: false,
        connectMsg: { ok: false, text: friendlyDbError(err) },
      });
    } finally {
      if (currentId === connectIdRef.current[engine]) {
        dbStore.updateEngineState(engine, { connecting: false });
      }
    }
  }, [dbStore, graphStore, fetchSchema, handleExecute]);

  const handleDbSwitch = useCallback(async (dbName: string) => {
    dbStore.updateEngineState(dbStore.dbType, { selectedDb: dbName });
    try {
      await invoke("switch_database", { dbType: dbStore.dbType, dbName });
      fetchSchema(dbStore.dbType);
    } catch (_) { /* ignore */ }
  }, [dbStore, fetchSchema]);

  return { fetchSchema, handleExecute, handleConnect, handleDbSwitch };
}
