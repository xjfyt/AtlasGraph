import { create } from 'zustand';

export interface DatabaseItem {
  name: string;
  is_default: boolean;
  status: string;
}

export interface EngineConnectionState {
  connected: boolean;
  readOnly: boolean;
  autoCreatedDb: boolean;
  openReadOnly: boolean;
  connecting: boolean;
  connectMsg: { ok: boolean; text: string } | null;
  databases: DatabaseItem[];
  selectedDb: string;
}

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

interface DBStore {
  supportedDbs: string[];
  dbType: string;
  uri: string;
  user: string;
  password: string;
  lbugPath: string;
  kuzuPath: string;
  engineStates: Record<string, EngineConnectionState>;
  schemaStats: any;
  schemaLabels: string[];
  schemaRelTypes: string[];
  
  setSupportedDbs: (dbs: string[]) => void;
  setDbType: (type: string) => void;
  setUri: (uri: string) => void;
  setUser: (user: string) => void;
  setPassword: (password: string) => void;
  setLbugPath: (path: string) => void;
  setKuzuPath: (path: string) => void;
  updateEngineState: (engine: string, patch: Partial<EngineConnectionState>) => void;
  setSchemaStats: (stats: any) => void;
  setSchemaLabels: (labels: string[]) => void;
  setSchemaRelTypes: (types: string[]) => void;
  resetSchema: () => void;
}

export const useDBStore = create<DBStore>((set) => ({
  supportedDbs: ["lbug", "neo4j"],
  dbType: "lbug",
  uri: "neo4j://localhost:7687",
  user: "neo4j",
  password: "mimouse313",
  lbugPath: "./data/db/graph.lbug",
  kuzuPath: "./data/db/graph.kuzu",
  engineStates: {
    neo4j: createEngineState("neo4j"),
    lbug: createEngineState("lbug"),
    kuzu: createEngineState("kuzu"),
  },
  schemaStats: null,
  schemaLabels: [],
  schemaRelTypes: [],

  setSupportedDbs: (dbs) => set({ supportedDbs: dbs }),
  setDbType: (type) => set({ dbType: type }),
  setUri: (uri) => set({ uri }),
  setUser: (user) => set({ user }),
  setPassword: (password) => set({ password }),
  setLbugPath: (path) => set({ lbugPath: path }),
  setKuzuPath: (path) => set({ kuzuPath: path }),
  updateEngineState: (engine, patch) => set((state) => ({
    engineStates: {
      ...state.engineStates,
      [engine]: {
        ...(state.engineStates[engine] ?? createEngineState(engine)),
        ...patch,
      },
    },
  })),
  setSchemaStats: (stats) => set({ schemaStats: stats }),
  setSchemaLabels: (labels) => set({ schemaLabels: labels }),
  setSchemaRelTypes: (types) => set({ schemaRelTypes: types }),
  resetSchema: () => set({ schemaStats: null, schemaLabels: [], schemaRelTypes: [] }),
}));
