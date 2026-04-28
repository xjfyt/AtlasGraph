import GraphCanvas from "./GraphCanvas";
import DetailPanel from "./DetailPanel";
import GraphToolbar from "./GraphToolbar";
import ContextMenu from "./ContextMenu";
import { IconGraph, IconTable, IconRaw, IconMaximize, IconX } from "./icons";
import { useGraphStore } from "../store/graphStore";
import { useUIStore } from "../store/uiStore";

interface ResultPanelProps {
  mergedData: { nodes: any[], edges: any[] };

  handleNodeClick: (nodeId: string) => void;
  handleEdgeClick: (edgeId: string) => void;
  handleCanvasClick: () => void;
  handleNodeRightClick: (nodeId: string, x: number, y: number) => void;
  handleEdgeRightClick: (edgeId: string, x: number, y: number) => void;
  handleGlobalSearch?: (text: string) => Promise<string[]>;
  handleMenuItemClick: (action: string) => void;

  handleSaveProp: (key: string, val: string) => Promise<void>;
  handleDeleteProp: (key: string) => void;
  handleSaveTempEntity: (labelOrType: string, customProps: any) => Promise<void>;
  handleCancelTempEntity: () => void;
}

export default function ResultPanel({
  mergedData,
  handleNodeClick, handleEdgeClick, handleCanvasClick,
  handleNodeRightClick, handleEdgeRightClick, handleGlobalSearch, handleMenuItemClick,
  handleSaveProp, handleDeleteProp,
  handleSaveTempEntity, handleCancelTempEntity
}: ResultPanelProps) {
  const { graphData, execTime, drawingEdgeSource, setDrawingEdgeSource } = useGraphStore();
  const { activeTab, setActiveTab, detail, setDetail, setActiveTool } = useUIStore();

  const getTabBtnClass = (isActive: boolean) => {
    return `px-4 py-3 border-none bg-transparent text-[13px] font-medium cursor-pointer border-b-2 flex items-center gap-2 transition-all duration-150 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0 [&>svg]:mr-1 ${
      isActive
        ? "text-accent border-accent font-bold"
        : "text-text-faint border-transparent hover:text-text-primary"
    }`;
  };

  return (
    <div className="flex-1 min-h-0 flex gap-0 overflow-hidden">
      <div className={`flex-1 min-w-0 bg-bg-card rounded-lg border border-border-primary flex flex-col overflow-hidden shadow-sm transition-[border-radius] duration-200 ${detail ? "rounded-tr-none rounded-br-none border-r-0" : ""}`}>
        <div className="flex items-center justify-between border-b border-border-light bg-bg-secondary px-3.5 shrink-0">
          <div className="flex gap-0">
            <button className={getTabBtnClass(activeTab === "graph")} onClick={() => setActiveTab("graph")}>
              <IconGraph />Graph
            </button>
            <button className={getTabBtnClass(activeTab === "table")} onClick={() => setActiveTab("table")}>
              <IconTable />Table
            </button>
            <button className={getTabBtnClass(activeTab === "raw")} onClick={() => setActiveTab("raw")}>
              <IconRaw />RAW
            </button>
          </div>
          <div className="flex gap-1">
            <button className="icon-btn" title="全屏"><IconMaximize /></button>
          </div>
        </div>

        <div className="flex-1 relative min-h-0 overflow-hidden bg-bg-graph">
          {activeTab === "graph" && (
            <>
              <GraphCanvas
                data={mergedData}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onCanvasClick={handleCanvasClick}
                onNodeRightClick={handleNodeRightClick}
                onEdgeRightClick={handleEdgeRightClick}
                onGlobalSearch={handleGlobalSearch}
              />
              <GraphToolbar />
              <ContextMenu handleMenuItemClick={handleMenuItemClick} />
              {drawingEdgeSource && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-2 rounded-full text-[13px] shadow-md z-50 flex items-center gap-2">
                  <span>请点击希望连接的目标节点...</span>
                  <button onClick={() => {
                    setDrawingEdgeSource(null);
                    setActiveTool("pointer");
                  }} className="bg-transparent border-none text-white cursor-pointer opacity-80 flex items-center">
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === "table" && (
            <div className="absolute inset-0 overflow-auto p-3.5 bg-bg-secondary custom-scrollbar">
              {graphData.nodes.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 bg-bg-tertiary border-b-2 border-border-primary font-semibold text-text-primary sticky top-0">ID</th>
                      <th className="text-left px-3 py-2 bg-bg-tertiary border-b-2 border-border-primary font-semibold text-text-primary sticky top-0">类型</th>
                      <th className="text-left px-3 py-2 bg-bg-tertiary border-b-2 border-border-primary font-semibold text-text-primary sticky top-0">标签/关系</th>
                      <th className="text-left px-3 py-2 bg-bg-tertiary border-b-2 border-border-primary font-semibold text-text-primary sticky top-0">属性</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.nodes.map((n: any) => (
                      <tr key={`n-${n.id}`} onClick={() => handleNodeClick(String(n.id))} className="cursor-pointer hover:bg-bg-hover">
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">{n.id}</td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">节点</span>
                        </td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">{(n.properties?._labels || []).join(", ")}</td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary font-mono text-[11px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{n.properties?.name || JSON.stringify(n.properties).slice(0, 80)}</td>
                      </tr>
                    ))}
                    {graphData.edges.map((e: any) => (
                      <tr key={`e-${e.id}`} onClick={() => handleEdgeClick(String(e.id))} className="cursor-pointer hover:bg-bg-hover">
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">{e.id}</td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300">关系</span>
                        </td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary">{e.label}</td>
                        <td className="px-3 py-1.5 border-b border-border-light text-text-primary font-mono text-[11px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{e.source} → {e.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center text-text-faint font-medium">尚无数据</div>
              )}
            </div>
          )}
          {activeTab === "raw" && (
            <div className="absolute inset-0 overflow-auto p-3.5 bg-bg-secondary custom-scrollbar">
              {graphData.nodes.length > 0 ? (
                <pre className="bg-bg-card border border-border-primary p-3.5 rounded-lg text-xs font-mono text-text-code whitespace-pre-wrap break-all">{JSON.stringify(graphData, null, 2)}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-text-faint font-medium">尚无数据</div>
              )}
            </div>
          )}
        </div>

        <div className="h-[30px] min-h-[30px] bg-bg-secondary border-t border-border-light flex items-center px-3.5 text-[11px] text-text-faint gap-4">
          {execTime !== null && <span>Started streaming {graphData.nodes.length + graphData.edges.length} records after {execTime} ms</span>}
        </div>
      </div>

      {detail && (
        <DetailPanel
          detail={detail}
          setDetail={setDetail}
          handleSaveProp={handleSaveProp}
          handleDeleteProp={handleDeleteProp}
          handleSaveTempEntity={handleSaveTempEntity}
          handleCancelTempEntity={handleCancelTempEntity}
        />
      )}
    </div>
  );
}
