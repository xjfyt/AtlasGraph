import { IconSun, IconMoon, IconMonitor } from "./icons";
import { useUIStore } from "../store/uiStore";

export default function ThemeView() {
  const { themeMode, setThemeMode } = useUIStore();
  
  const options = [
    { id: "light", label: "浅色", desc: "默认浅色主题", icon: <IconSun className={`w-[18px] h-[18px] ${themeMode === "light" ? "text-accent" : "text-text-muted"}`} /> },
    { id: "dark", label: "深色", desc: "深色主题，降低屏幕亮度", icon: <IconMoon className={`w-[18px] h-[18px] ${themeMode === "dark" ? "text-accent" : "text-text-muted"}`} /> },
    { id: "system", label: "跟随系统", desc: "自动跟随操作系统设置", icon: <IconMonitor className={`w-[18px] h-[18px] ${themeMode === "system" ? "text-accent" : "text-text-muted"}`} /> }
  ] as const;

  return (
    <div className="p-0">
      <div className="text-[13px] font-semibold text-text-muted uppercase tracking-wider mb-4">色彩模式</div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isActive = themeMode === opt.id;
          return (
            <button
              key={opt.id}
              className={`flex items-center gap-3 px-3.5 py-3 border rounded-xl cursor-pointer transition-all duration-150 text-left w-full
                ${isActive 
                  ? "border-accent bg-accent-bg" 
                  : "border-border-primary bg-bg-secondary hover:bg-bg-hover hover:border-text-faint"
                }
              `}
              onClick={() => setThemeMode(opt.id)}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-accent-bg-strong" : "bg-bg-tertiary"}`}>
                {opt.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-text-heading leading-none mb-1">{opt.label}</span>
                <span className="text-[11px] text-text-faint leading-none">{opt.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
