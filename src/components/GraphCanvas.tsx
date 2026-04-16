import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { Node, Relationship, HitTargets } from "@neo4j-nvl/base";
import { ZoomIn, ZoomOut, Focus, Search, X, Download } from "lucide-react";

interface GraphCanvasProps {
  data: { nodes: any[]; edges: any[] };
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onCanvasClick?: () => void;
  onNodeRightClick?: (nodeId: string, clientX: number, clientY: number) => void;
  onEdgeRightClick?: (edgeId: string, clientX: number, clientY: number) => void;
  onCanvasRightClick?: (clientX: number, clientY: number) => void;
}

const COLORS = ["#F4B5BD", "#A5E1D3", "#FCE49E", "#CDB4DB", "#B9E1F9", "#FFDAC1", "#C1E1C1", "#FFC0CB"];

function getLabelColorIndex(labels: string[]): number {
  if (!labels || labels.length === 0) return 0;
  const label = labels[0];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % COLORS.length;
}

import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick, onNodeRightClick, onEdgeRightClick, onCanvasRightClick }: GraphCanvasProps) {
  const callbacksRef = useRef({ onNodeClick, onEdgeClick, onCanvasClick, onNodeRightClick, onEdgeRightClick, onCanvasRightClick });
  callbacksRef.current = { onNodeClick, onEdgeClick, onCanvasClick, onNodeRightClick, onEdgeRightClick, onCanvasRightClick };
  const nvlRef = useRef<any>(null);
  const [searchText, setSearchText] = useState("");

  const nvlNodes: Node[] = useMemo(() => {
    return data.nodes.map((n) => {
      const labels = n.properties?._labels || [];
      const colorIdx = labels.length > 0 ? getLabelColorIndex(labels) : ((n.properties?.level as number) || 0);
      const color = COLORS[colorIdx % COLORS.length];
      
      // 智能识别最佳实体名称（适配 Neo4j Browser 逻辑）
      const props = n.properties || {};
      const name = props.name || props.title || props.filename || props.value || props.id || props.code || `#${n.id}`;

      return {
        id: String(n.id),
        color,
        size: 30,
        caption: String(name),
      };
    });
  }, [data.nodes]);

  const nvlRels: Relationship[] = useMemo(() => {
    return data.edges.map((e) => ({
      id: String(e.id || `${e.source}-${e.target}`),
      from: String(e.source),
      to: String(e.target),
      caption: e.label || "",
      captionSize: 1.8,
    }));
  }, [data.edges]);

  const handleNodeClick = useCallback((node: Node, _hitTargets: HitTargets, _event: MouseEvent) => {
    if (callbacksRef.current.onNodeClick) {
      callbacksRef.current.onNodeClick(String(node.id));
    }
  }, []);

  const handleRelClick = useCallback((rel: Relationship, _hitTargets: HitTargets, _event: MouseEvent) => {
    if (callbacksRef.current.onEdgeClick) {
      callbacksRef.current.onEdgeClick(String(rel.id));
    }
  }, []);

  const handleCanvasClick = useCallback((_event: MouseEvent) => {
    if (callbacksRef.current.onCanvasClick) {
      callbacksRef.current.onCanvasClick();
    }
  }, []);

  const handleNodeRightClick = useCallback((node: Node, _hitTargets: HitTargets, event: MouseEvent) => {
    if (callbacksRef.current.onNodeRightClick) {
      callbacksRef.current.onNodeRightClick(String(node.id), event.clientX, event.clientY);
    }
  }, []);

  const handleRelRightClick = useCallback((rel: Relationship, _hitTargets: HitTargets, event: MouseEvent) => {
    if (callbacksRef.current.onEdgeRightClick) {
      callbacksRef.current.onEdgeRightClick(String(rel.id), event.clientX, event.clientY);
    }
  }, []);

  const handleCanvasRightClick = useCallback((event: MouseEvent) => {
    if (callbacksRef.current.onCanvasRightClick) {
      callbacksRef.current.onCanvasRightClick(event.clientX, event.clientY);
    }
  }, []);

  const handleZoomIn = () => {
    if (nvlRef.current) {
      nvlRef.current.setZoom(nvlRef.current.getScale() * 1.3);
    }
  };

  const handleZoomOut = () => {
    if (nvlRef.current) {
      nvlRef.current.setZoom(nvlRef.current.getScale() / 1.3);
    }
  };

  const handleFit = useCallback(() => {
    if (nvlRef.current) {
      nvlRef.current.fit();
    }
  }, []);

  const handleSearch = () => {
    if (!searchText.trim() || !nvlRef.current) return;
    // 不区分大小写匹配节点名称
    const matchedIds = nvlNodes
      .filter(n => (n.caption || "").toLowerCase().includes(searchText.toLowerCase()))
      .map(n => n.id);
    if (matchedIds.length > 0) {
      nvlRef.current.fit(matchedIds);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchText("");
  };

  const handleDownload = async () => {
    if (nvlRef.current) {
      try {
        const dataUrl = nvlRef.current.getImageDataUrl({ backgroundColor: "#ffffff" });
        if (!dataUrl) {
          alert("截图获取失败：渲染引擎可能尚在初始化");
          return;
        }
        
        // 提取 base64 数据体
        const base64Data = dataUrl.split(",")[1];
        if (!base64Data) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        
        // 唤起原生另存为对话框
        const filePath = await save({
          filters: [{ name: 'Image', extensions: ['png'] }],
          defaultPath: `kg_export_${timestamp}.png`,
        });

        // 如果用户选择了路径（没有取消操作）
        if (filePath) {
          // JS 中将 base64 解码并转成 uint8 字节数组
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // 通过原生 fs 接口真实写入文件
          await writeFile(filePath, bytes);
          alert("导出成功，图谱已保存至：" + filePath);
        }
      } catch (err) {
        alert("导出图片出现异常: " + String(err));
      }
    } else {
      alert("请等待画布加载完毕");
    }
  };

  useEffect(() => {
    if (data.nodes.length > 0) {
      const timer = setTimeout(() => {
        handleFit();
      }, 150); // 查询数据挂载后稍作延迟让 D3 引擎定位完成，随后自动自适应视口
      return () => clearTimeout(timer);
    }
  }, [data, handleFit]);

  if (nvlNodes.length === 0) return null;

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <InteractiveNvlWrapper
        ref={nvlRef}
        nodes={nvlNodes}
        rels={nvlRels}
        layout="d3Force"
        nvlOptions={{
          allowDynamicMinZoom: true,
          disableTelemetry: true,
        }}
        mouseEventCallbacks={{
          onNodeClick: handleNodeClick,
          onRelationshipClick: handleRelClick,
          onCanvasClick: handleCanvasClick,
          onNodeRightClick: handleNodeRightClick,
          onRelationshipRightClick: handleRelRightClick,
          onCanvasRightClick: handleCanvasRightClick,
          onPan: true,
          onZoom: true,
          onDrag: true,
        }}
      />
      {/* 右上角搜索与下载工具栏 */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          display: "flex",
          gap: 12,
          zIndex: 10,
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Search size={16} color="#64748b" style={{ marginRight: 8, cursor: "pointer" }} onClick={handleSearch} />
          <input 
            type="text" 
            placeholder="搜索实体..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ border: "none", outline: "none", background: "transparent", width: 140, fontSize: 14, color: "#334155" }}
          />
          {searchText && (
            <X size={16} color="#94a3b8" style={{ cursor: "pointer", marginLeft: 4 }} onClick={handleClearSearch} />
          )}
        </div>
        <button
          onClick={handleDownload}
          title="导出为PNG"
          style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", color: "#475569", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        >
          <Download size={18} />
        </button>
      </div>
      {/* 右下角视口控制工具栏 */}
      <div 
        style={{ 
          position: "absolute", 
          bottom: 24, 
          right: 24, 
          display: "flex", 
          gap: 6,
          background: "#ffffff",
          padding: "6px 8px",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0",
          zIndex: 10
        }}
      >
        <button 
          onClick={handleZoomIn} 
          title="放大" 
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#475569" }}
        >
          <ZoomIn size={18} />
        </button>
        <button 
          onClick={handleZoomOut} 
          title="缩小" 
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#475569" }}
        >
          <ZoomOut size={18} />
        </button>
        <div style={{ width: 1, backgroundColor: "#e2e8f0", margin: "4px 2px" }} />
        <button 
          onClick={handleFit} 
          title="适应屏幕" 
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#475569" }}
        >
          <Focus size={18} />
        </button>
      </div>
    </div>
  );
}
