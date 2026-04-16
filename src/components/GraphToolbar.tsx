import { MousePointer2, PlusSquare, MoveRight } from "lucide-react";

export type ActiveTool = "pointer" | "create_node" | "create_edge";

interface GraphToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export default function GraphToolbar({ activeTool, setActiveTool }: GraphToolbarProps) {
  return (
    <div
      className="graph-toolbar"
      style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        background: "var(--bg-primary, #ffffff)",
        padding: "6px 8px",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        border: "1px solid var(--border, #e2e8f0)",
        zIndex: 50,
      }}
    >
      <button
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: activeTool === "pointer" ? "var(--brand-primary, #3b82f6)" : "transparent",
          color: activeTool === "pointer" ? "#ffffff" : "var(--text-primary, #1e293b)",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onClick={() => setActiveTool("pointer")}
        title="选择与拖拽 (Pointer)"
      >
        <MousePointer2 size={18} />
      </button>

      <div style={{ width: 1, backgroundColor: "var(--border, #e2e8f0)", margin: "4px 0" }} />

      <button
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: activeTool === "create_node" ? "var(--brand-primary, #3b82f6)" : "transparent",
          color: activeTool === "create_node" ? "#ffffff" : "var(--text-primary, #1e293b)",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onClick={() => setActiveTool("create_node")}
        title="添加节点 (Add Node)"
      >
        <PlusSquare size={18} />
      </button>

      <button
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: activeTool === "create_edge" ? "var(--brand-primary, #3b82f6)" : "transparent",
          color: activeTool === "create_edge" ? "#ffffff" : "var(--text-primary, #1e293b)",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onClick={() => setActiveTool("create_edge")}
        title="添加连线 (Add Relationship)"
      >
        <MoveRight size={18} />
      </button>
    </div>
  );
}
