import { open } from "@tauri-apps/plugin-dialog";
import { IconFolderOpen } from "../icons";
import { EngineFormProps } from "./types";

export default function LbugForm({ lbugPath, setLbugPath }: EngineFormProps) {
  return (
    <div className="form-group">
      <label className="form-label">Ladybug 数据库路径</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          className="form-input"
          type="text"
          value={lbugPath}
          onChange={(e) => {
            let val = e.target.value.trim();
            val = val.replace(/^["']+|["']+$/g, '');
            setLbugPath?.(val);
          }}
          placeholder="./data/db"
          style={{ flex: 1, minWidth: 0, padding: "8px 12px" }}
        />
        <button
          className="icon-btn"
          title="选择本地 Ladybug 数据库文件"
          style={{ width: '35px', height: '35px', flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
          onClick={async () => {
            try {
              const selected = await open({
                directory: false,
                multiple: false,
                filters: [{ name: 'Ladybug Database', extensions: ['lbug', 'db'] }, { name: 'All Files', extensions: ['*'] }]
              });
              if (selected && !Array.isArray(selected)) {
                setLbugPath?.(selected);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <IconFolderOpen />
        </button>
      </div>
      <div className="form-hint">指定本地 Ladybug 数据库文件的路径</div>
    </div>
  );
}
