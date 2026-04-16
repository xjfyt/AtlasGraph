import React from "react";
import { IconHistory } from "./icons";

interface HistoryItem {
  query: string;
  timestamp: number;
  nodeCount: number;
  edgeCount: number;
}

export interface HistoryViewProps {
  history: HistoryItem[];
  setHistory: (v: HistoryItem[]) => void;
  setQuery: (q: string) => void;
  setActiveNav: (nav: string) => void;
}

export default function HistoryView({ history, setHistory, setQuery, setActiveNav }: HistoryViewProps) {
  return (
    <div className="history-panel">
      <div className="form-section-title" style={{ marginBottom: 12 }}>最近执行的查询</div>
      {history.length === 0 ? (
        <div className="empty-state" style={{ position: 'relative', minHeight: 200 }}>
          <IconHistory />
          <p className="empty-title">暂无历史记录</p>
          <p className="empty-subtitle">执行查询后会自动保存</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((h, i) => (
            <div
              key={i}
              className="history-item"
              onClick={() => {
                setQuery(h.query);
                setActiveNav("database");
              }}
            >
              <div className="history-query">{h.query}</div>
              <div className="history-meta">
                <span>{new Date(h.timestamp).toLocaleString()}</span>
                <span>{h.nodeCount} 节点, {h.edgeCount} 关系</span>
              </div>
            </div>
          ))}
          <button
            className="history-clear-btn"
            onClick={() => setHistory([])}
          >
            清除历史记录
          </button>
        </div>
      )}
    </div>
  );
}
