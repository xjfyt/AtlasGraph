import { useRef, useMemo, useCallback } from "react";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { Node, Relationship, HitTargets } from "@neo4j-nvl/base";

interface GraphCanvasProps {
  data: { nodes: any[]; edges: any[] };
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onCanvasClick?: () => void;
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

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick }: GraphCanvasProps) {
  const callbacksRef = useRef({ onNodeClick, onEdgeClick, onCanvasClick });
  callbacksRef.current = { onNodeClick, onEdgeClick, onCanvasClick };

  const nvlNodes: Node[] = useMemo(() => {
    return data.nodes.map((n) => {
      const labels = n.properties?._labels || [];
      const colorIdx = labels.length > 0 ? getLabelColorIndex(labels) : ((n.properties?.level as number) || 0);
      const color = COLORS[colorIdx % COLORS.length];
      const name = n.properties?.name || `#${n.id}`;

      return {
        id: String(n.id),
        color,
        size: 30,
        caption: String(name),
        captionSize: 2.5,
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

  if (nvlNodes.length === 0) return null;

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <InteractiveNvlWrapper
        nodes={nvlNodes}
        rels={nvlRels}
        layout="forceDirected"
        nvlOptions={{
          allowDynamicMinZoom: true,
          disableTelemetry: true,
        }}
        mouseEventCallbacks={{
          onNodeClick: handleNodeClick,
          onRelationshipClick: handleRelClick,
          onCanvasClick: handleCanvasClick,
          onPan: true,
          onZoom: true,
          onDrag: true,
        }}
      />
    </div>
  );
}
