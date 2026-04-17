import "./QueryEditor.css";
import { IconSpinner, IconPlay } from "./icons";

interface QueryEditorProps {
  dbType: string;
  selectedDb: string;
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  handleExecute: () => void;
}

export default function QueryEditor({
  dbType,
  selectedDb,
  query,
  setQuery,
  loading,
  handleExecute
}: QueryEditorProps) {
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
  );
}
