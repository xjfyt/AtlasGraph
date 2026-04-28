import GraphCanvas from "./GraphCanvas";
import "./ResultPanel.css";
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

  return (
    <div className="result-wrapper">
      <div className={`result-panel ${detail ? "with-detail" : ""}`}>
        <div className="result-tabs">
          <div className="result-tabs-left">
            <button className={`tab-btn ${activeTab === "graph" ? "active" : ""}`} onClick={() => setActiveTab("graph")}>
              <IconGraph />Graph
            </button>
            <button className={`tab-btn ${activeTab === "table" ? "active" : ""}`} onClick={() => setActiveTab("table")}>
              <IconTable />Table
            </button>
            <button className={`tab-btn ${activeTab === "raw" ? "active" : ""}`} onClick={() => setActiveTab("raw")}>
              <IconRaw />RAW
            </button>
          </div>
          <div className="result-tabs-right">
            <button className="icon-btn" title="全屏"><IconMaximize /></button>
          </div>
        </div>

        <div className="graph-container">
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
                <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 13, boxShadow: 'var(--shadow-md)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>请点击希望连接的目标节点...</span>
                  <button onClick={() => {
                    setDrawingEdgeSource(null);
                    setActiveTool("pointer");
                  }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                    <IconX />
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === "table" && (
            <div className="table-view">
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
                      <tr key={`n-${n.id}`} onClick={() => handleNodeClick(String(n.id))} style={{ cursor: 'pointer' }}>
                        <td>{n.id}</td>
                        <td><span className="detail-type-badge node">节点</span></td>
                        <td>{(n.properties?._labels || []).join(", ")}</td>
                        <td className="prop-cell">{n.properties?.name || JSON.stringify(n.properties).slice(0, 80)}</td>
                      </tr>
                    ))}
                    {graphData.edges.map((e: any) => (
                      <tr key={`e-${e.id}`} onClick={() => handleEdgeClick(String(e.id))} style={{ cursor: 'pointer' }}>
                        <td>{e.id}</td>
                        <td><span className="detail-type-badge edge">关系</span></td>
                        <td>{e.label}</td>
                        <td className="prop-cell">{e.source} → {e.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-msg">尚无数据</div>
              )}
            </div>
          )}
          {activeTab === "raw" && (
            <div className="table-view">
              {graphData.nodes.length > 0 ? (
                <pre>{JSON.stringify(graphData, null, 2)}</pre>
              ) : (
                <div className="empty-msg">尚无数据</div>
              )}
            </div>
          )}
        </div>

        <div className="result-footer">
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
