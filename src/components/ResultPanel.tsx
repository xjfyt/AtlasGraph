import GraphCanvas from "./GraphCanvas";
import "./ResultPanel.css";
import DetailPanel from "./DetailPanel";
import GraphToolbar, { ActiveTool } from "./GraphToolbar";
import ContextMenu from "./ContextMenu";
import { IconGraph, IconTable, IconRaw, IconMaximize, IconX } from "./icons";
import { DetailInfo, ContextMenuState } from "../types";

interface ResultPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  graphData: { nodes: any[], edges: any[] };
  mergedData: { nodes: any[], edges: any[] };
  execTime: number | null;

  detail: DetailInfo | null;
  setDetail: (detail: DetailInfo | null) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
  drawingEdgeSource: string | null;
  setDrawingEdgeSource: (src: string | null) => void;

  handleNodeClick: (nodeId: string) => void;
  handleEdgeClick: (edgeId: string) => void;
  handleCanvasClick: () => void;
  handleNodeRightClick: (nodeId: string, x: number, y: number) => void;
  handleEdgeRightClick: (edgeId: string, x: number, y: number) => void;
  handleGlobalSearch?: (text: string) => Promise<string[]>;
  handleMenuItemClick: (action: string) => void;

  editingProp: string | null;
  setEditingProp: (prop: string | null) => void;
  editValue: string;
  setEditValue: (val: string) => void;
  savingProp: boolean;
  addingProp: boolean;
  setAddingProp: (val: boolean) => void;
  newPropKey: string;
  setNewPropKey: (key: string) => void;
  newPropValue: string;
  setNewPropValue: (val: string) => void;
  handleSaveProp: (key: string, val: string) => Promise<void>;
  handleDeleteProp: (key: string) => void;
  schemaLabels: string[];
  schemaRelTypes: string[];
  handleSaveTempEntity: (labelOrType: string, customProps: any) => Promise<void>;
  handleCancelTempEntity: () => void;
}

export default function ResultPanel({
  activeTab, setActiveTab, graphData, mergedData, execTime,
  detail, setDetail, activeTool, setActiveTool,
  contextMenu, setContextMenu, drawingEdgeSource, setDrawingEdgeSource,
  handleNodeClick, handleEdgeClick, handleCanvasClick,
  handleNodeRightClick, handleEdgeRightClick, handleGlobalSearch, handleMenuItemClick,
  editingProp, setEditingProp, editValue, setEditValue,
  savingProp, addingProp, setAddingProp,
  newPropKey, setNewPropKey, newPropValue, setNewPropValue,
  handleSaveProp, handleDeleteProp, schemaLabels, schemaRelTypes,
  handleSaveTempEntity, handleCancelTempEntity
}: ResultPanelProps) {
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
              <GraphToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
              {contextMenu && (
                <ContextMenu
                  contextMenu={contextMenu}
                  setContextMenu={setContextMenu}
                  handleMenuItemClick={handleMenuItemClick}
                  drawingEdgeSource={drawingEdgeSource}
                  setDrawingEdgeSource={setDrawingEdgeSource}
                />
              )}
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
          editingProp={editingProp}
          setEditingProp={setEditingProp}
          editValue={editValue}
          setEditValue={setEditValue}
          savingProp={savingProp}
          addingProp={addingProp}
          setAddingProp={setAddingProp}
          newPropKey={newPropKey}
          setNewPropKey={setNewPropKey}
          newPropValue={newPropValue}
          setNewPropValue={setNewPropValue}
          handleSaveProp={handleSaveProp}
          handleDeleteProp={handleDeleteProp}
          schemaLabels={schemaLabels}
          schemaRelTypes={schemaRelTypes}
          handleSaveTempEntity={handleSaveTempEntity}
          handleCancelTempEntity={handleCancelTempEntity}
        />
      )}
    </div>
  );
}
