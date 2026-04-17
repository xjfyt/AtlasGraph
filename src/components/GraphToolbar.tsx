import { useState, useRef, useEffect } from "react";
import { MousePointer2, PlusSquare, MoveRight, GripHorizontal } from "lucide-react";

export type ActiveTool = "pointer" | "create_node" | "create_edge";

interface GraphToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export default function GraphToolbar({ activeTool, setActiveTool }: GraphToolbarProps) {
  const [position, setPosition] = useState({ x: 16, y: 100 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    if (toolbarRef.current?.parentElement) {
      const parent = toolbarRef.current.parentElement;
      setContainerSize({ width: parent.clientWidth, height: parent.clientHeight });
      setPosition({ x: 16, y: parent.clientHeight / 2 - 80 });
    }
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !toolbarRef.current?.parentElement) return;
      const parent = toolbarRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      let newX = dragRef.current.initX + dx;
      let newY = dragRef.current.initY + dy;
      
      const maxX = parentRect.width - toolbarRect.width;
      const maxY = parentRect.height - toolbarRect.height;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY)); 

      setPosition({ x: newX, y: newY });
      setContainerSize({ width: parentRect.width, height: parentRect.height });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // 通过距离感应：距离上下边界较近时，视为想要横向停靠；距离左右边界较近时，视为竖排
  // 留出 250px 的充足判定空间给下方，因为竖着的工具栏高度可能比较难滑到底
  const isHorizontal = position.y < 120 || position.y > containerSize.height - 250;

  return (
    <div
      ref={toolbarRef}
      className="graph-toolbar"
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap: 8,
        background: "var(--bg-primary, #ffffff)",
        padding: "8px",
        borderRadius: 12,
        boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.2)" : "0 4px 16px rgba(0,0,0,0.1)",
        border: "1px solid var(--border, #e2e8f0)",
        zIndex: 50,
        opacity: isDragging ? 0.9 : 1,
        transition: isDragging ? "none" : "box-shadow 0.2s",
      }}
    >
      <div 
        onPointerDown={handlePointerDown}
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center', 
          color: 'var(--text-faint, #94a3b8)', 
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: isHorizontal ? "0 4px" : "4px 0",
        }}
        title="拖动面板"
      >
        <GripHorizontal size={16} style={{ transform: isHorizontal ? 'rotate(90deg)' : 'none' }} />
      </div>

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
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onClick={() => setActiveTool("pointer")}
        title="选择与拖拽 (Pointer)"
      >
        <MousePointer2 size={18} />
      </button>

      <div style={{ 
        width: isHorizontal ? 1 : "auto", 
        height: isHorizontal ? "auto" : 1,
        alignSelf: "stretch",
        backgroundColor: "var(--border, #e2e8f0)", 
        margin: "0" 
      }} />

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
          borderRadius: 8,
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
          borderRadius: 8,
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
