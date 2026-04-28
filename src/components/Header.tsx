import { IconPanelLeft } from "./icons";
import { useUIStore } from "../store/uiStore";
import { useDBStore } from "../store/dbStore";

export default function Header() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { dbType, uri, lbugPath, kuzuPath, engineStates, user } = useDBStore();

  const state = engineStates[dbType];
  const connected = state?.connected ?? false;
  const readOnly = state?.readOnly ?? false;
  const autoCreatedDb = state?.autoCreatedDb ?? false;
  const databases = state?.databases ?? [];
  const selectedDb = state?.selectedDb ?? "default";

  const instanceLabel = dbType === "neo4j" ? uri : dbType === "kuzu" ? kuzuPath : lbugPath;
  return (
    <div className="h-11 min-h-[44px] bg-bg-primary border-b border-border-primary flex items-center px-5 justify-between text-[13px] gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {sidebarCollapsed && (
          <button className="icon-btn" onClick={() => setSidebarCollapsed(false)} title="展开侧边栏">
            <IconPanelLeft />
          </button>
        )}
        <div className="flex items-center gap-2 bg-bg-secondary px-3 py-1 rounded-md border border-border-primary min-w-0">
          <span className="text-xs text-text-muted shrink-0">Instance:</span>
          {connected ? (
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-30"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
          ) : (
            <div className="h-2 w-2 rounded-full bg-text-faint shrink-0" />
          )}
          <span className="font-mono text-xs text-text-primary truncate max-w-[260px]">
            {instanceLabel || "未设置连接目标"}
          </span>
        </div>
        {connected && databases.length > 0 && (
          <div className="soft-chip">
            <span>Database:</span>
            <span>{selectedDb}</span>
          </div>
        )}
        {connected && dbType === "neo4j" && (
          <div className="soft-chip">
            <span>User:</span>
            <span>{user}</span>
          </div>
        )}
        {connected && (
          <div className={`soft-chip ${
            readOnly
              ? "text-amber-700 bg-orange-50 border-orange-300 dark:text-amber-500 dark:bg-amber-900/30 dark:border-amber-700/50"
              : "text-green-800 bg-green-50 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50"
          }`}>
            {readOnly ? "只读" : "读写"}
          </div>
        )}
        {connected && autoCreatedDb && (
          <div className="soft-chip border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-800/50 dark:text-blue-400 dark:bg-blue-900/30">
            新建库
          </div>
        )}
      </div>
      <div className="text-xs text-text-muted shrink-0 flex items-center gap-2">
        <span>引擎:</span>
        <span className="inline-flex items-center rounded px-2 py-0.5 font-medium uppercase text-text-primary bg-bg-tertiary">
          {dbType}
        </span>
      </div>
    </div>
  );
}
