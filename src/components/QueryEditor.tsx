import { IconSpinner, IconPlay } from "./icons";
import { useGraphStore } from "../store/graphStore";
import { useDBStore } from "../store/dbStore";
import { useDatabaseActions } from "../hooks/useDatabaseActions";

export default function QueryEditor() {
  const { query, setQuery, loading } = useGraphStore();
  const { dbType, engineStates } = useDBStore();
  const { handleExecute } = useDatabaseActions();

  const selectedDb = engineStates[dbType]?.selectedDb || "default";
  return (
    <div className="bg-bg-card rounded-lg border border-border-primary overflow-hidden shrink-0 shadow-sm relative flex items-start">
      <div className="flex items-center gap-2 py-3.5 pl-4 pr-1 shrink-0">
        <span className="font-mono text-xs font-semibold text-accent bg-accent-bg px-2 py-0.5 rounded">{dbType === "neo4j" ? selectedDb : dbType}</span>
        <span className="font-mono font-bold text-sm text-accent select-none">$</span>
      </div>
      <textarea
        className="w-full py-3 pr-14 pl-2 border-none outline-none resize-none font-mono text-[13px] text-text-code bg-transparent leading-relaxed h-[80px] placeholder:text-text-faint"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExecute(query);
        }}
        placeholder="MATCH (n) RETURN n LIMIT 25"
        spellCheck={false}
      />
      <button 
        className="absolute right-3 bottom-3 w-10 h-10 border-none bg-accent text-white rounded-lg cursor-pointer flex items-center justify-center transition-colors duration-150 shadow-[0_2px_6px_rgba(37,99,235,0.3)] hover:bg-accent-hover disabled:bg-text-faint disabled:shadow-none disabled:cursor-not-allowed [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0" 
        onClick={() => handleExecute(query)} 
        disabled={loading} 
        title="执行查询 (Ctrl+Enter)"
      >
        {loading ? <IconSpinner /> : <IconPlay />}
      </button>
    </div>
  );
}
