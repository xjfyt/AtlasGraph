import { IconSun, IconMoon, IconMonitor } from "./icons";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeViewProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export default function ThemeView({ themeMode, setThemeMode }: ThemeViewProps) {
  return (
    <div className="theme-panel">
      <div className="form-section-title" style={{ marginBottom: 16 }}>色彩模式</div>
      <div className="theme-options">
        <button
          className={`theme-option ${themeMode === "light" ? "active" : ""}`}
          onClick={() => setThemeMode("light")}
        >
          <div className="theme-option-icon"><IconSun /></div>
          <div className="theme-option-label">浅色</div>
          <div className="theme-option-desc">默认浅色主题</div>
        </button>
        <button
          className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
          onClick={() => setThemeMode("dark")}
        >
          <div className="theme-option-icon"><IconMoon /></div>
          <div className="theme-option-label">深色</div>
          <div className="theme-option-desc">深色主题，降低屏幕亮度</div>
        </button>
        <button
          className={`theme-option ${themeMode === "system" ? "active" : ""}`}
          onClick={() => setThemeMode("system")}
        >
          <div className="theme-option-icon"><IconMonitor /></div>
          <div className="theme-option-label">跟随系统</div>
          <div className="theme-option-desc">自动跟随操作系统设置</div>
        </button>
      </div>
    </div>
  );
}
