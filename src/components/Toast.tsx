import { useEffect } from "react";
import type { Toast as ToastType } from "../types";
import { Check, X, AlertTriangle } from "./Icons";

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none" style={{ minWidth: 260 }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 2800);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colors = {
    success: { bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.25)", icon: "#16a34a", text: "#4ade80" },
    error:   { bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.25)", icon: "#dc2626", text: "#f87171" },
    info:    { bg: "var(--bg-card)",        border: "var(--border)",        icon: "var(--text-muted)", text: "var(--text)" },
  }[toast.type];

  const Icon = toast.type === "success" ? Check : toast.type === "error" ? X : AlertTriangle;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto animate-slide-down"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${colors.icon}22` }}>
        <Icon size={11} style={{ color: colors.icon }} strokeWidth={2.5} />
      </div>
      <span className="text-xs font-medium flex-1" style={{ color: colors.text }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="w-4 h-4 flex items-center justify-center opacity-40 hover:opacity-100 transition-fast flex-shrink-0"
        style={{ color: colors.text }}
      >
        <X size={10} />
      </button>
    </div>
  );
}
