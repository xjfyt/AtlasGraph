import { open } from "@tauri-apps/plugin-dialog";
import { IconFolderOpen } from "../icons";
import { EngineFormProps } from "./types";

export default function LbugForm({ lbugPath, setLbugPath, openReadOnly, setOpenReadOnly }: EngineFormProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Ladybug 数据库路径</label>
        <div className="flex gap-2 items-center">
          <input
            className="form-input flex-1 min-w-0"
            type="text"
            value={lbugPath}
            onChange={(e) => {
              let val = e.target.value.trim();
              val = val.replace(/^["']+|["']+$/g, '');
              setLbugPath?.(val);
            }}
            placeholder="./data/db"
          />
          <button
            className="icon-btn"
            title="选择本地 Ladybug 数据库文件"
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
        <div className="form-hint">指定本地 Ladybug 数据库路径；若路径不存在，应用会自动创建数据库。</div>
      </div>
      <label className="readonly-option">
        <input
          type="checkbox"
          checked={Boolean(openReadOnly)}
          onChange={(e) => setOpenReadOnly?.(e.target.checked)}
        />
        <span>以只读模式打开</span>
      </label>
    </>
  );
}
