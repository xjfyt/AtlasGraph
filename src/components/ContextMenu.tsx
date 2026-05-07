import { Maximize, EyeOff, PinOff, Link, Undo2, Trash2, PlusSquare, Eraser } from "lucide-react";
import { useUIStore } from "../store/uiStore";

export interface ContextMenuProps {
  handleMenuItemClick: (action: string) => void;
}

export default function ContextMenu({ handleMenuItemClick }: ContextMenuProps) {
  const { contextMenu, setContextMenu } = useUIStore();

  if (!contextMenu) return null;
  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 100,
        background: 'var(--bg-primary)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '8px',
        padding: '8px 0',
        minWidth: '220px',
        border: '1px solid var(--border)'
      }}
      onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
    >
      {contextMenu.type === "node" ? (
        <>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("expand")}>
            <Maximize size={16} /> 展开选中节点
          </button>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("dismiss")}>
            <EyeOff size={16} /> 隐藏选中节点
          </button>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("unpin")}>
            <PinOff size={16} /> 取消固定
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={() => handleMenuItemClick("show_rels")}>
            <Link size={16} /> 显示所有关系
          </button>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("undo_connect")}>
            <Undo2 size={16} /> 隐藏关联关系
            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>
              隐藏 {contextMenu.edgeCount || 0} 个关系
            </span>
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item delete" style={{ color: 'var(--error-text)' }} onClick={() => handleMenuItemClick("delete_db")}>
            <Trash2 size={16} /> 删除节点
          </button>
        </>
      ) : contextMenu.type === "edge" ? (
        <>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("dismiss")}>
            <EyeOff size={16} /> 隐藏选中关系
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={() => handleMenuItemClick("show_rels")}>
            <Link size={16} /> 显示所有关系
          </button>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("undo_connect")}>
            <Undo2 size={16} /> 撤销连接
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item delete" style={{ color: 'var(--error-text)' }} onClick={() => handleMenuItemClick("delete_db")}>
            <Trash2 size={16} /> 删除关系
          </button>
        </>
      ) : contextMenu.type === "canvas" ? (
        <>
          <button className="context-menu-item" onClick={() => handleMenuItemClick("add_node")}>
            <PlusSquare size={16} /> 添加新节点
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={() => handleMenuItemClick("clear_canvas")}>
            <Eraser size={16} /> 清空当前画布
          </button>
        </>
      ) : null}
    </div>
  );
}
