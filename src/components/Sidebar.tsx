import type { Tab, DailyStats, WSStatus } from "../types";
import WSStatusDot from "./WSStatusDot";
import { Flame, CheckSquare, Radio, Settings2, Sun, Moon, ShoppingBag } from "./Icons";

const NAV: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "Review", icon: Flame, label: "Review" },
  { id: "DesiDime", icon: ShoppingBag, label: "DesiDime" },
  { id: "Posted", icon: CheckSquare, label: "Posted" },
  { id: "Channels", icon: Radio, label: "Channels" },
  { id: "Settings", icon: Settings2, label: "Settings" },
];

interface SidebarProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  pending: number;
  dark: boolean;
  setDark: (v: boolean) => void;
  stats: DailyStats;
  wsStatus: WSStatus;
  wsRetry: number;
  onWSReconnect: () => void;
}

export default function Sidebar({ tab, setTab, pending, dark, setDark, stats, wsStatus, wsRetry, onWSReconnect }: SidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-shrink-0 flex-col border-r"
      style={{ width: 220, background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, rgba(230,57,70,0.06) 0%, transparent 100%)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[15px] flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#E63946 0%,#c0392b 100%)", boxShadow: "0 4px 12px rgba(230,57,70,0.35)" }}
        >
          D
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black tracking-tight" style={{ color: "var(--text)" }}>DealFlow</p>
          <WSStatusDot status={wsStatus} retryCount={wsRetry} onReconnect={onWSReconnect} showLabel />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-fast focus-ring"
              style={{
                background: active ? "rgba(230,57,70,0.08)" : "transparent",
                color: active ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: "#E63946" }}
                />
              )}
              <Icon size={15} style={{ color: active ? "#E63946" : undefined }} />
              {label}
              {id === "DesiDime" && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#06b6d4", boxShadow: "0 0 6px #06b6d4" }} />
              )}
              {id === "Review" && pending > 0 && (
                <span
                  className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white flex-shrink-0"
                  style={{ background: "#E63946", fontFamily: "'JetBrains Mono',monospace" }}
                >
                  {pending > 99 ? "99+" : pending}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Stats footer */}
      <div className="px-3 pb-4 pt-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
            {stats.date}
          </span>
          <button
            onClick={() => setDark(!dark)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-fast hover:opacity-80"
            style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
          >
            {dark ? <Sun size={11} /> : <Moon size={11} />}
          </button>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {([
            ["📤", "Posted",  stats.posted,       "#E63946"],
            ["🤖", "Auto",    stats.auto_posted,  "#7C3AED"],
            ["✅", "Checked", stats.checked,       "#16a34a"],
            ["🚫", "Scam",    stats.scam,          "#dc2626"],
            ["🔄", "Dupes",   stats.dup,           "#f59e0b"],
            ["❓", "Unrated", stats.unrated,       "var(--text-muted)"],
          ] as const).map(([emoji, label, val, color]) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
              style={{ background: "var(--bg-secondary)" }}
            >
              <span className="text-[12px]">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>{label}</p>
                <p className="text-[12px] font-black leading-none" style={{ color, fontFamily: "'JetBrains Mono',monospace" }}>{val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
