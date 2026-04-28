import { IconHistory } from "./icons";
import { useGraphStore } from "../store/graphStore";
import { useUIStore } from "../store/uiStore";

export default function HistoryView() {
  const { history, setQuery, clearHistory } = useGraphStore();
  const { setActiveNav } = useUIStore();
  return (
    <div className="p-0">
      <div className="text-[13px] font-semibold text-text-heading mb-3">最近执行的查询</div>
      {history.length === 0 ? (
        <div className="relative min-h-[200px] flex flex-col items-center justify-center text-center gap-3">
          <div className="text-text-muted"><IconHistory /></div>
          <p className="text-[13px] font-semibold text-text-muted m-0">暂无历史记录</p>
          <p className="text-[11px] text-text-faint m-0">执行查询后会自动保存</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {history.map((h, i) => (
            <div
              key={i}
              className="px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 border border-transparent hover:bg-bg-hover hover:border-border-primary"
              onClick={() => {
                setQuery(h.query);
                setActiveNav("database");
              }}
            >
              <div className="font-mono text-xs text-text-primary leading-relaxed break-all mb-1">{h.query}</div>
              <div className="flex justify-between text-[11px] text-text-faint">
                <span>{new Date(h.timestamp).toLocaleString()}</span>
                <span>{h.nodeCount} 节点, {h.edgeCount} 关系</span>
              </div>
            </div>
          ))}
          <button
            className="mt-3 px-3 py-1.5 border border-border-primary bg-transparent text-text-muted rounded-md text-xs cursor-pointer transition-all duration-150 w-full hover:bg-error-bg hover:text-error-text hover:border-error-border"
            onClick={clearHistory}
          >
            清除历史记录
          </button>
        </div>
      )}
    </div>
  );
}
