import type { Tab, WSStatus } from "../types";
import WSStatusDot from "./WSStatusDot";
import { Sun, Moon } from "./Icons";

interface MobileHeaderProps {
  tab: Tab;
  pending: number;
  dark: boolean;
  setDark: (v: boolean) => void;
  wsStatus: WSStatus;
  wsRetry: number;
  onWSReconnect: () => void;
}

const TAB_META: Record<string, { emoji: string; accent: string }> = {
  Review:   { emoji: "🔥", accent: "#E63946" },
  DesiDime: { emoji: "🛍️", accent: "#06b6d4" },
  Posted:   { emoji: "✅", accent: "#16a34a" },
  Channels: { emoji: "📡", accent: "#7C3AED" },
  Settings: { emoji: "⚙️", accent: "#f59e0b" },
};

export default function MobileHeader({ tab, pending, dark, setDark, wsStatus, wsRetry, onWSReconnect }: MobileHeaderProps) {
  const meta = TAB_META[tab] ?? { emoji: "◆", accent: "#E63946" };
  return (
    <header
      className="md:hidden flex items-center gap-3 px-4 border-b flex-shrink-0"
      style={{
        minHeight: 52,
        background: `linear-gradient(135deg, ${meta.accent}10 0%, var(--bg-sidebar) 60%)`,
        borderColor: "var(--border)",
      }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-[13px] flex-shrink-0"
        style={{ background: `linear-gradient(135deg,#E63946,#c0392b)`, boxShadow: "0 2px 8px rgba(230,57,70,0.3)" }}
      >
        D
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base leading-none">{meta.emoji}</span>
        <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{tab}</span>
        {tab === "Review" && pending > 0 && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-white flex-shrink-0" style={{ background: "#E63946", fontFamily: "'JetBrains Mono',monospace" }}>
            {pending}
          </span>
        )}
      </div>
      <WSStatusDot status={wsStatus} retryCount={wsRetry} onReconnect={onWSReconnect} />
      <button
        onClick={() => setDark(!dark)}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-fast"
        style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </header>
  );
}
