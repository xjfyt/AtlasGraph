import { open } from "@tauri-apps/plugin-dialog";
import { IconFolderOpen } from "../icons";
import { EngineFormProps } from "./types";

export default function KuzuForm({ kuzuPath, setKuzuPath }: EngineFormProps) {
  return (
    <div className="form-group">
      <label className="form-label">Kuzu 数据库路径</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          className="form-input"
          type="text"
          value={kuzuPath}
          onChange={(e) => {
            let val = e.target.value.trim();
            val = val.replace(/^["']+|["']+$/g, '');
            setKuzuPath?.(val);
          }}
          placeholder="./data/db/graph.kuzu"
          style={{ flex: 1, minWidth: 0, padding: "8px 12px" }}
        />
        <button
          className="icon-btn"
          title="选择本地 Kuzu 数据库目录或文件"
          style={{ width: '35px', height: '35px', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
          onClick={async () => {
            try {
              const selected = await open({
                directory: true, // Kuzu can just be a dir
                multiple: false,
              });
              if (selected && !Array.isArray(selected)) {
                setKuzuPath?.(selected);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <IconFolderOpen />
        </button>
      </div>
      <div className="form-hint">指定本地 Kuzu 数据库目录的路径</div>
    </div>
  );
}
