import { useState, useEffect } from "react";
import { IconX } from "./icons";
import { Trash2, PlusCircle } from "lucide-react";
import { DetailInfo } from "../types";
import { useDBStore } from "../store/dbStore";

export interface DetailPanelProps {
  detail: DetailInfo;
  setDetail: (v: DetailInfo | null) => void;
  handleSaveProp: (key: string, value: string) => Promise<void>;
  handleDeleteProp: (key: string) => void;
  handleSaveTempEntity?: (labelOrType: string, customProps: any) => Promise<void>;
  handleCancelTempEntity?: () => void;
}

export default function DetailPanel({
  detail, setDetail, handleSaveProp: outerHandleSaveProp, handleDeleteProp: outerHandleDeleteProp,
  handleSaveTempEntity, handleCancelTempEntity
}: DetailPanelProps) {
  const { schemaLabels, schemaRelTypes } = useDBStore();
  
  const [editingProp, setEditingProp] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingProp, setAddingProp] = useState(false);
  const [newPropKey, setNewPropKey] = useState("");
  const [newPropValue, setNewPropValue] = useState("");
  const [savingProp, setSavingProp] = useState(false);

  const handleSaveProp = async (k: string, v: string) => {
    setSavingProp(true);
    await outerHandleSaveProp(k, v);
    setSavingProp(false);
    setEditingProp(null);
  };
  
  const handleDeleteProp = (k: string) => {
    outerHandleDeleteProp(k);
  };
  const [tempLabel, setTempLabel] = useState("");
  
  useEffect(() => {
    setTempLabel("");
  }, [detail]);
  
  return (
    <div className="w-[320px] min-w-[320px] bg-bg-card border border-l-0 border-border-primary rounded-r-lg flex flex-col overflow-hidden shadow-sm animate-slide-in-right">
      <div className="px-3.5 py-3 border-b border-border-light flex items-center justify-between shrink-0 bg-bg-secondary">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${detail.type === "node" ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300" : "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300"}`}>
            {detail.type === "node" ? "节点" : "关系"}
          </span>
          <span className="text-text-heading font-semibold">
            {detail.type === "node"
              ? (detail.properties?.name || `#${detail.id}`)
              : (detail.label || "RELATIONSHIP")}
          </span>
        </div>
        <button className="w-6 h-6 border-none bg-transparent text-text-faint cursor-pointer rounded flex items-center justify-center hover:bg-bg-hover hover:text-text-primary [&>svg]:w-3.5 [&>svg]:h-3.5" onClick={() => setDetail(null)}>
          <IconX />
        </button>
      </div>

      {detail.type === "node" && detail.labels && detail.labels.length > 0 && (
        <div className="px-3.5 py-2 flex flex-wrap gap-1.5 border-b border-border-light">
          {detail.labels.map((l) => (
            <span key={l} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">{l}</span>
          ))}
        </div>
      )}

      {detail.type === "edge" && (
        <div className="px-3.5 py-2.5 border-b border-border-light bg-bg-secondary">
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="px-2 py-0.5 bg-bg-tertiary rounded text-[11px] font-mono text-text-primary">{detail.source}</span>
            <span className="text-text-faint font-bold">→</span>
            <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-[11px] font-mono font-semibold dark:bg-pink-500/20 dark:text-pink-300">{detail.label}</span>
            <span className="text-text-faint font-bold">→</span>
            <span className="px-2 py-0.5 bg-bg-tertiary rounded text-[11px] font-mono text-text-primary">{detail.target}</span>
          </div>
        </div>
      )}

      {detail.isTemp ? (
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="bg-orange-50 text-orange-800 border border-orange-200 px-3 py-2 rounded mb-3 text-xs flex items-center gap-1.5 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50">
            <span>⚠️</span> 尚未保存至图谱
          </div>
          <div className="form-group mb-4">
            <label className="form-label font-semibold">{detail.type === "node" ? "选择或新建类别 (Label)" : "选择或新建关系类型 (Type)"}</label>
            <input 
              list="schema-list" 
              type="text" 
              className="form-input" 
              value={tempLabel} 
              onChange={e => setTempLabel(e.target.value)} 
              placeholder={detail.type === "node" ? "例如: Person" : "例如: KNOWS"} 
              autoFocus 
            />
            <datalist id="schema-list">
               {(detail.type === "node" ? schemaLabels : schemaRelTypes).map(l => <option key={l} value={l} />)}
            </datalist>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
               onClick={() => handleSaveTempEntity && handleSaveTempEntity(tempLabel || (detail.type === 'node' ? 'NewEntity' : 'Unassigned'), {})}
               disabled={savingProp}
               className="flex-1 p-2 text-[13px] font-semibold bg-accent text-white border-none rounded-md cursor-pointer transition-all duration-200 disabled:opacity-70 hover:bg-accent-hover"
            >
              {savingProp ? "提交中..." : "保存进数据库"}
            </button>
            <button 
               onClick={() => handleCancelTempEntity && handleCancelTempEntity()}
               disabled={savingProp}
               className="flex-1 p-2 text-[13px] font-semibold bg-transparent text-text-muted border border-border-primary rounded-md cursor-pointer transition-all duration-200 hover:bg-bg-hover hover:text-text-primary"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
      <div className="p-3.5 overflow-y-auto flex-1 custom-scrollbar">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.08em] mb-2 pb-1.5 border-b border-border-light">PROPERTIES</div>
        <div className="flex items-start py-1.5 border-b border-border-light gap-2">
          <span className="text-xs font-semibold text-text-muted min-w-[80px] shrink-0 font-mono">id</span>
          <span className="text-xs text-text-heading break-all leading-relaxed">{detail.id}</span>
        </div>
        {Object.entries(detail.properties)
          .filter(([key]) => key !== "_labels")
          .map(([key, val]) => (
            <div className="flex items-start py-1.5 border-b border-border-light gap-2 last:border-none group relative" key={key}>
              <span className="text-xs font-semibold text-text-muted min-w-[80px] shrink-0 font-mono">{key}</span>
              {editingProp === key ? (
                <div className="flex flex-col gap-2 flex-1 min-w-0 -mt-1">
                  <textarea
                    className="w-full px-2 py-1.5 text-xs leading-relaxed font-inherit border border-accent rounded-md bg-bg-secondary text-text-primary resize-y min-h-[48px] outline-none shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all duration-200"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="px-3 py-1 text-[11px] font-medium bg-transparent text-text-muted border border-border-primary rounded-md cursor-pointer transition-all duration-200 hover:bg-bg-tertiary hover:text-text-primary"
                      onClick={() => setEditingProp(null)}
                      disabled={savingProp}
                    >
                      取消
                    </button>
                    <button
                      className="px-4 py-1 text-[11px] font-semibold bg-accent text-white border-none rounded-md cursor-pointer shadow-[0_2px_4px_rgba(37,99,224,0.2)] transition-all duration-200 hover:brightness-110"
                      onClick={() => handleSaveProp(key, editValue)}
                      disabled={savingProp}
                    >
                      {savingProp ? '保存中...' : '确认修改'}
                    </button>
                  </div>
                </div>
              ) : (
                <span
                  className="text-xs text-text-heading break-all leading-relaxed flex-1 border-b border-dashed border-transparent pb-px cursor-pointer hover:border-accent"
                  title="点击修改内容"
                  onClick={() => { setEditingProp(key); setEditValue(typeof val === "object" ? JSON.stringify(val) : String(val)); }}
                >
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              )}
              {editingProp !== key && (
                <button 
                  className="absolute right-0 top-1 opacity-0 bg-transparent border-none text-error-text cursor-pointer transition-all duration-200 p-0.5 group-hover:opacity-100 hover:bg-error-bg hover:rounded"
                  title="从数据库删除此属性"
                  onClick={() => handleDeleteProp(key)}
                >
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          ))}
        
        {addingProp ? (
          <div className="pt-3 mt-3 border-t border-border-light">
            <input 
              placeholder="属性名 (Key)" 
              value={newPropKey} 
              onChange={e => setNewPropKey(e.target.value)} 
              className="w-full mb-2 px-2 py-1.5 text-xs rounded border border-border-primary bg-bg-primary text-text-primary outline-none focus:border-accent"
              autoFocus
            />
            <textarea 
              placeholder="属性值 (Value)" 
              value={newPropValue} 
              onChange={e => setNewPropValue(e.target.value)} 
              className="w-full px-2 py-1.5 text-xs rounded border border-border-primary bg-bg-primary text-text-primary outline-none focus:border-accent min-h-[60px] resize-y"
            />
            <div className="flex gap-1.5 justify-end mt-2">
               <button onClick={() => { setAddingProp(false); setNewPropKey(""); setNewPropValue(""); }} className="px-3 py-1 text-[11px] font-medium bg-transparent border-none cursor-pointer text-text-muted hover:text-text-primary">取消</button>
               <button onClick={() => {
                  if(newPropKey && newPropKey.trim()) {
                     handleSaveProp(newPropKey.trim(), newPropValue).then(() => { setAddingProp(false); setNewPropKey(""); setNewPropValue(""); });
                  }
               }} className="px-4 py-1 text-[11px] font-semibold bg-accent text-white border-none rounded-md cursor-pointer shadow-[0_2px_4px_rgba(37,99,224,0.2)] hover:bg-accent-hover">
                 {savingProp ? '保存中...' : '保存新字段'}
               </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setAddingProp(true)}
              className="w-full p-2 text-[11px] font-medium flex justify-center items-center gap-1 bg-transparent border border-dashed border-border-primary text-text-muted rounded-md cursor-pointer transition-all duration-200 hover:text-text-primary hover:border-text-muted hover:bg-bg-hover"
            >
               <PlusCircle size={14}/> 添加新属性字段
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
