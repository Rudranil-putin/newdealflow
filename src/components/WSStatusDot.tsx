import type { WSStatus } from "../types";
import { WifiOff } from "./Icons";

interface WSStatusDotProps {
  status: WSStatus;
  retryCount?: number;
  onReconnect?: () => void;
  showLabel?: boolean;
}

export default function WSStatusDot({ status, retryCount = 0, onReconnect, showLabel }: WSStatusDotProps) {
  const color =
    status === "connected" ? "#16a34a" : status === "reconnecting" ? "#f59e0b" : "#dc2626";

  const label =
    status === "connected"
      ? "Live"
      : status === "reconnecting"
        ? `Reconnecting${retryCount > 0 ? ` (${retryCount})` : ""}…`
        : "Disconnected";

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-shrink-0" style={{ width: 8, height: 8 }}>
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: color,
            opacity: 0.3,
            animation:
              status === "connected"
                ? "pulse 1.5s ease-in-out infinite"
                : status === "reconnecting"
                  ? "pulseSlow 2s ease-in-out infinite"
                  : "none",
            transform: "scale(1.8)",
          }}
        />
        <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      </div>
      {showLabel && (
        <span
          className="text-[9px] font-semibold uppercase tracking-widest"
          style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {label}
        </span>
      )}
      {status === "disconnected" && onReconnect && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-fast"
          style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
        >
          <WifiOff size={8} /> Reconnect
        </button>
      )}
    </div>
  );
}
