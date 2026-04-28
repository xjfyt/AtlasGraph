import "./QueryEditor.css";
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
    <div className="query-editor">
      <div className="query-body">
        <div className="query-prefix">
          <span className="query-db-label">{dbType === "neo4j" ? selectedDb : dbType}</span>
          <span className="query-prompt">$</span>
        </div>
        <textarea
          className="query-textarea"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleExecute(query);
          }}
          placeholder="MATCH (n) RETURN n LIMIT 25"
          spellCheck={false}
        />
        <button className="query-run-btn" onClick={() => handleExecute(query)} disabled={loading} title="执行查询 (Ctrl+Enter)">
          {loading ? <IconSpinner /> : <IconPlay />}
        </button>
      </div>
    </div>
  );
}
