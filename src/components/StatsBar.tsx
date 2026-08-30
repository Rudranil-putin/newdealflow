import type { Deal, DailyStats } from "../types";

interface StatsBarProps {
  deals: Deal[];
  stats: DailyStats;
  sessionNew: number;
}

export default function StatsBar({ deals, stats, sessionNew }: StatsBarProps) {
  const pending = deals.filter((d) => d.status === "pending").length;
  const approved = deals.filter((d) => d.status === "approved").length;
  const rejected = deals.filter((d) => d.status === "rejected").length;
  const scored = deals.filter((d) => d.score > 0);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const affiliateCount = deals.filter((d) => d.affiliate).length;
  const affiliatePct = deals.length > 0 ? Math.round((affiliateCount / deals.length) * 100) : 0;

  const items = [
    { label: "Pending",  value: pending,           color: "#f59e0b", mobileVisible: true },
    { label: "Approved", value: approved,           color: "#16a34a", mobileVisible: true },
    { label: "Avg",      value: avgScore,           color: "#E63946", mobileVisible: true },
    { label: "Rejected", value: rejected,           color: "#dc2626", mobileVisible: false },
    { label: "Aff%",     value: `${affiliatePct}%`, color: "#06b6d4", mobileVisible: false },
    { label: "Session",  value: `+${sessionNew}`,   color: "#7C3AED", mobileVisible: false },
    { label: "Dupes",    value: stats.dup,           color: "var(--text-muted)", mobileVisible: false },
  ];

  return (
    <div
      className="flex-shrink-0 flex items-center gap-0 overflow-x-auto no-scrollbar px-4 md:px-6 border-b"
      style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)", minHeight: 40 }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex items-center gap-0 flex-shrink-0${item.mobileVisible ? "" : " hidden md:flex"}`}
        >
          {i > 0 && <div className="w-px h-3 mx-3 flex-shrink-0" style={{ background: "var(--border)" }} />}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-[10px] font-medium" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
              {item.label}
            </span>
            <span className="text-[11px] font-black" style={{ color: item.color, fontFamily: "'JetBrains Mono',monospace" }}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
