import React from "react";
import { IconX } from "./icons";
import { Trash2, PlusCircle } from "lucide-react";

export interface DetailInfo {
  type: "node" | "edge";
  id: string;
  label?: string;
  labels?: string[];
  source?: string;
  target?: string;
  properties: Record<string, any>;
}

export interface DetailPanelProps {
  detail: DetailInfo;
  setDetail: (v: DetailInfo | null) => void;
  editingProp: string | null;
  setEditingProp: (v: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  savingProp: boolean;
  addingProp: boolean;
  setAddingProp: (v: boolean) => void;
  newPropKey: string;
  setNewPropKey: (v: string) => void;
  newPropValue: string;
  setNewPropValue: (v: string) => void;
  handleSaveProp: (key: string, value: string) => Promise<void>;
  handleDeleteProp: (key: string) => void;
}

export default function DetailPanel({
  detail, setDetail, editingProp, setEditingProp, editValue, setEditValue,
  savingProp, addingProp, setAddingProp, newPropKey, setNewPropKey,
  newPropValue, setNewPropValue, handleSaveProp, handleDeleteProp
}: DetailPanelProps) {
  return (
    <div className="detail-panel-right">
      <div className="detail-panel-header">
        <div className="detail-type">
          <span className={`detail-type-badge ${detail.type}`}>
            {detail.type === "node" ? "节点" : "关系"}
          </span>
          <span className="detail-title">
            {detail.type === "node"
              ? (detail.properties?.name || `#${detail.id}`)
              : (detail.label || "RELATIONSHIP")}
          </span>
        </div>
        <button className="detail-close-btn" onClick={() => setDetail(null)}>
          <IconX />
        </button>
      </div>

      {detail.type === "node" && detail.labels && detail.labels.length > 0 && (
        <div className="detail-labels">
          {detail.labels.map((l) => (
            <span key={l} className="detail-label-tag">{l}</span>
          ))}
        </div>
      )}

      {detail.type === "edge" && (
        <div className="detail-edge-info">
          <div className="detail-edge-visual">
            <span className="detail-edge-node">{detail.source}</span>
            <span className="detail-edge-arrow">→</span>
            <span className="detail-edge-type">{detail.label}</span>
            <span className="detail-edge-arrow">→</span>
            <span className="detail-edge-node">{detail.target}</span>
          </div>
        </div>
      )}

      <div className="detail-panel-body">
        <div className="detail-section-title">PROPERTIES</div>
        <div className="detail-prop-row">
          <span className="detail-prop-key">id</span>
          <span className="detail-prop-value">{detail.id}</span>
        </div>
        {Object.entries(detail.properties)
          .filter(([key]) => key !== "_labels")
          .map(([key, val]) => (
            <div className="detail-prop-row" key={key} style={{ position: 'relative' }} 
                 onMouseEnter={e => {
                   const btn = e.currentTarget.querySelector('.detail-prop-del-btn') as HTMLElement;
                   if(btn) btn.style.opacity = '1';
                 }}
                 onMouseLeave={e => {
                   const btn = e.currentTarget.querySelector('.detail-prop-del-btn') as HTMLElement;
                   if(btn) btn.style.opacity = '0';
                 }}>
              <span className="detail-prop-key">{key}</span>
              {editingProp === key ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, marginTop: -4 }}>
                  <textarea
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '6px 8px',
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      border: '1px solid var(--accent)',
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      minHeight: 48,
                      outline: 'none',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
                      transition: 'all 0.2s'
                    }}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => setEditingProp(null)}
                      disabled={savingProp}
                    >
                      取消
                    </button>
                    <button
                      style={{ padding: '5px 16px', fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,224,0.2)', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                      onClick={() => handleSaveProp(key, editValue)}
                      disabled={savingProp}
                    >
                      {savingProp ? '保存中...' : '确认修改'}
                    </button>
                  </div>
                </div>
              ) : (
                <span
                  className="detail-prop-value"
                  title="点击修改内容"
                  style={{ cursor: 'pointer', borderBottom: '1px dashed transparent', paddingBottom: 1, flex: 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderBottom = '1px dashed var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderBottom = '1px dashed transparent'}
                  onClick={() => { setEditingProp(key); setEditValue(typeof val === "object" ? JSON.stringify(val) : String(val)); }}
                >
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              )}
              {editingProp !== key && (
                <button 
                  className="detail-prop-del-btn"
                  title="从数据库删除此属性"
                  onClick={() => handleDeleteProp(key)}
                  style={{ position: 'absolute', right: 0, top: 4, opacity: 0, background: 'transparent', border: 'none', color: 'var(--error-text)', cursor: 'pointer', transition: 'all 0.2s', padding: 2 }}
                >
                  <Trash2 size={12}/>
                </button>
              )}
            </div>
          ))}
        
        {addingProp ? (
          <div style={{ padding: '12px 0 0 0', marginTop: 12, borderTop: '1px solid var(--border-light)' }}>
            <input 
              placeholder="属性名 (Key)" 
              value={newPropKey} 
              onChange={e => setNewPropKey(e.target.value)} 
              style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} 
              autoFocus
            />
            <textarea 
              placeholder="属性值 (Value)" 
              value={newPropValue} 
              onChange={e => setNewPropValue(e.target.value)} 
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', minHeight: 60, resize: 'vertical', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} 
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
               <button onClick={() => { setAddingProp(false); setNewPropKey(""); setNewPropValue(""); }} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>取消</button>
               <button onClick={() => {
                  if(newPropKey && newPropKey.trim()) {
                     handleSaveProp(newPropKey.trim(), newPropValue).then(() => { setAddingProp(false); setNewPropKey(""); setNewPropValue(""); });
                  }
               }} style={{ padding: '5px 16px', fontSize: 11, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,224,0.2)' }}>
                 {savingProp ? '保存中...' : '保存新字段'}
               </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button 
              onClick={() => setAddingProp(true)}
              style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', width: '100%', padding: '8px', fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
               <PlusCircle size={14}/> 添加新属性字段
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
