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
    return `tab-btn ${isActive ? "is-active" : ""}`;
  };

  return (
    <div className="flex-1 min-h-0 flex gap-0 overflow-hidden">
      <div className={`flex-1 min-w-0 bg-bg-card rounded-[10px] border border-border-primary flex flex-col overflow-hidden shadow-sm transition-[border-radius] duration-200 ${detail ? "rounded-tr-none rounded-br-none border-r-0" : ""}`}>
        <div className="result-tabs">
          <div className="result-tabs-left">
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
          <div className="result-tabs-right">
            <button className="tab-icon-btn" title="全屏"><IconMaximize /></button>
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
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-2.5 rounded-full text-[13px] shadow-md z-50 flex items-center gap-2">
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
            <div className="table-view custom-scrollbar">
              {graphData.nodes.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>类型</th>
                      <th>标签/关系</th>
                      <th>属性</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graphData.nodes.map((n: any) => (
                      <tr key={`n-${n.id}`} onClick={() => handleNodeClick(String(n.id))} className="cursor-pointer">
                        <td>{n.id}</td>
                        <td><span className="data-type-badge node">节点</span></td>
                        <td>{(n.properties?._labels || []).join(", ")}</td>
                        <td className="prop-cell">{n.properties?.name || JSON.stringify(n.properties).slice(0, 80)}</td>
                      </tr>
                    ))}
                    {graphData.edges.map((e: any) => (
                      <tr key={`e-${e.id}`} onClick={() => handleEdgeClick(String(e.id))} className="cursor-pointer">
                        <td>{e.id}</td>
                        <td><span className="data-type-badge edge">关系</span></td>
                        <td>{e.label}</td>
                        <td className="prop-cell">{e.source} → {e.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">尚无数据，执行查询后会在这里显示表格结果</div>
              )}
            </div>
          )}
          {activeTab === "raw" && (
            <div className="table-view custom-scrollbar">
              {graphData.nodes.length > 0 ? (
                <pre>{JSON.stringify(graphData, null, 2)}</pre>
              ) : (
                <div className="empty-state">尚无数据，执行查询后会在这里显示原始结果</div>
              )}
            </div>
          )}
        </div>

        <div className="h-[30px] min-h-[30px] bg-bg-secondary border-t border-border-light flex items-center px-3.5 text-[11px] text-text-faint gap-4">
          {execTime !== null && <span>已在 {execTime} ms 后开始流式返回，共 {graphData.nodes.length + graphData.edges.length} 条记录</span>}
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
