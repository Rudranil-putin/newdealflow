import { scoreColor } from "../utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  verdict?: string;
}

export default function ScoreRing({ score, size = 36, verdict }: ScoreRingProps) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  const pct = score / 100;

  return (
    <div className="relative flex-shrink-0 group" style={{ width: size, height: size }} title={verdict}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color}90)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: size < 40 ? 9 : 11, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {score === 0 ? "?" : score}
        </span>
      </div>
      {verdict && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
        >
          {verdict}
        </div>
      )}
    </div>
  );
}
