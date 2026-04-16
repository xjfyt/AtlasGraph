import { useState, useEffect, useRef } from "react";

export interface CreationModalConfig {
  type: "node" | "edge";
  sourceId?: string;
  targetId?: string;
}

interface CreationModalProps {
  config: CreationModalConfig;
  onConfirm: (labelOrType: string) => void;
  onCancel: () => void;
}

export default function CreationModal({ config, onConfirm, onCancel }: CreationModalProps) {
  const [inputValue, setInputValue] = useState(config.type === "node" ? "NewClass" : "RELATED_TO");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-primary, #ffffff)",
          padding: "24px",
          borderRadius: "12px",
          width: "360px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          border: "1px solid var(--border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
        onClick={(e) => e.stopPropagation()} // 阻止冒泡避免触发关闭
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary, #1e293b)" }}>
            {config.type === "node" ? "创建新实体" : "建立实体关联"}
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
            {config.type === "node" 
              ? "请分配实体类别(Label)，例如 Person 或 Company" 
              : "请设置关系的名称(Type)，例如 KNOWS 或 BELONGS_TO"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
              color: "var(--text-primary, #1e293b)",
              backgroundColor: "var(--bg-secondary, #f8fafc)",
            }}
            placeholder={config.type === "node" ? "实体类别" : "关系类型"}
          />

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--border, #e2e8f0)",
                background: "transparent",
                color: "var(--text-muted, #64748b)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                padding: "8px 16px",
                border: "none",
                background: inputValue.trim() ? "var(--brand-primary, #3b82f6)" : "var(--border, #cbd5e1)",
                color: "#ffffff",
                borderRadius: "6px",
                cursor: inputValue.trim() ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              完成并插入图谱
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
