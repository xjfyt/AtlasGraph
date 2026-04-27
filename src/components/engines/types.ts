export interface EngineFormProps {
  uri?: string;
  setUri?: (v: string) => void;
  user?: string;
  setUser?: (v: string) => void;
  password?: string;
  setPassword?: (v: string) => void;
  lbugPath?: string;
  setLbugPath?: (v: string) => void;
  kuzuPath?: string;
  setKuzuPath?: (v: string) => void;
  openReadOnly?: boolean;
  setOpenReadOnly?: (v: boolean) => void;
  selectedDb?: string;
  setSelectedDb?: (v: string) => void;
}
