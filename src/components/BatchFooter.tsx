import { Check, X } from "./Icons";

interface BatchFooterProps {
  count: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
}

export default function BatchFooter({ count, onApproveAll, onRejectAll, onClear }: BatchFooterProps) {
  if (count === 0) return null;
  return (
    <div
      className="batch-footer fixed bottom-0 left-0 right-0 md:left-[220px] z-50 flex items-center gap-3 px-5 animate-batch-up"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
        paddingTop: 14,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
      }}
    >
      <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}>
        ☑ {count} selected
      </span>
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onClear}
          className="h-11 px-4 rounded-xl text-xs font-semibold transition-fast"
          style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Clear
        </button>
        <button
          onClick={onRejectAll}
          className="h-11 flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold transition-fast active:scale-95"
          style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
        >
          <X size={12} strokeWidth={2.5} /> Reject All
        </button>
        <button
          onClick={onApproveAll}
          className="h-11 flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold transition-fast active:scale-95 text-white"
          style={{ background: "#16a34a", boxShadow: "0 4px 16px rgba(22,163,74,0.25)" }}
        >
          <Check size={12} strokeWidth={2.5} /> Approve All
        </button>
      </div>
    </div>
  );
}
