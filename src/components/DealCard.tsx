import { useState, useRef } from "react";
import type { Deal } from "../types";
import { catColor, discBg, fmt, fmtAgo } from "../utils";
import ImageLightbox from "./ImageLightbox";
import { Check, X, PenLine, Zap, Tag, FileText, Maximize2 } from "./Icons";

const SWIPE_THRESHOLD = 80;

function rubberband(x: number) {
  return x * (1 - 0.25 * Math.log(1 + Math.abs(x) / SWIPE_THRESHOLD));
}

interface DealCardProps {
  deal: Deal;
  batchMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (d: Deal) => void;
  onChannelClick?: (channelRaw: string) => void;
  onCopyToast?: (msg: string) => void;
  focused?: boolean;
}

export default function DealCard({
  deal,
  batchMode,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit,
  onChannelClick,
  onCopyToast,
  focused,
}: DealCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"right" | "left" | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isScrolling = useRef<boolean | null>(null);

  const accent = catColor[deal.category] || "#9496B8";
  const isPending = deal.status === "pending";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    onCopyToast?.(label);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPending || batchMode) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPending || batchMode || !swiping) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (isScrolling.current === null) {
      if (Math.abs(dy) > Math.abs(dx)) { isScrolling.current = true; setSwiping(false); return; }
      isScrolling.current = false;
    }
    if (isScrolling.current) return;

    e.preventDefault();
    setSwipeX(rubberband(dx));
  };

  const handleTouchEnd = () => {
    if (!isPending || batchMode) return;
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      const dir = swipeX > 0 ? "right" : "left";
      try { navigator.vibrate?.(10); } catch {}
      setSwipeDir(dir);
      setTimeout(() => {
        if (dir === "right") onApprove(deal.id);
        else onReject(deal.id);
      }, 280);
    } else {
      setSwipeX(0);
      setSwiping(false);
    }
  };

  const revealOpacityRight = Math.min(1, Math.max(0, swipeX) / SWIPE_THRESHOLD);
  const revealOpacityLeft  = Math.min(1, Math.max(0, -swipeX) / SWIPE_THRESHOLD);

  return (
    <>
      {lightbox && deal.imgUrl && (
        <ImageLightbox src={deal.imgUrl} onClose={() => setLightbox(false)} />
      )}

      {/* Swipe reveal container */}
      <div className="relative overflow-hidden rounded-xl deal-card-lift transition-mid">
        {/* Green approve reveal */}
        <div
          className="absolute inset-0 rounded-xl flex items-center pl-5"
          style={{ background: "#16a34a", opacity: revealOpacityRight, pointerEvents: "none" }}
        >
          <span className="text-white font-black text-xl">✓ APPROVE</span>
        </div>
        {/* Red reject reveal */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-end pr-5"
          style={{ background: "#dc2626", opacity: revealOpacityLeft, pointerEvents: "none" }}
        >
          <span className="text-white font-black text-xl">✗ REJECT</span>
        </div>

        {/* Card */}
        <div
          className={`relative flex flex-col rounded-xl overflow-hidden transition-mid${swipeDir === "right" ? " swipe-exit-right" : swipeDir === "left" ? " swipe-exit-left" : ""}`}
          style={{
            background: "var(--bg-card)",
            boxShadow: focused
              ? "0 0 0 2px #E63946, 0 4px 20px rgba(0,0,0,0.3)"
              : "0 2px 8px rgba(0,0,0,0.18)",
            transform: swipeDir ? undefined : `translateX(${swipeX}px) rotate(${swipeX * 0.025}deg)`,
            transition: swiping ? "none" : swipeDir ? undefined : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            touchAction: swiping && !isScrolling.current ? "none" : "pan-y",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Batch checkbox */}
          {batchMode && (
            <button
              onClick={() => onToggleSelect?.(deal.id)}
              className="absolute top-2 left-2 z-20 w-11 h-11 flex items-center justify-center transition-fast"
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{
                  background: selected ? "#E63946" : "rgba(0,0,0,0.6)",
                  border: selected ? "none" : "1.5px solid rgba(255,255,255,0.3)",
                }}
              >
                {selected && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          )}

          {/* Image zone */}
          <div
            className="deal-card-image relative overflow-hidden flex-shrink-0 cursor-zoom-in"
            style={{
              background: deal.imgUrl && !imgErr
                ? `radial-gradient(ellipse at 50% 80%, ${accent}25 0%, transparent 70%)`
                : `${accent}10`,
            }}
            onClick={() => !imgErr && deal.imgUrl && setLightbox(true)}
          >
            {deal.imgUrl && !imgErr ? (
              <>
                <img
                  src={deal.imgUrl}
                  alt={deal.title}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ padding: 8, zIndex: 2 }}
                  onError={() => setImgErr(true)}
                />
                <img
                  src={deal.imgUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.1, filter: "blur(20px) saturate(1.5)", zIndex: 0 }}
                  onError={() => {}}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle, ${accent}15 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                    opacity: 0.4,
                    zIndex: 1,
                  }}
                />
                <div
                  className="absolute bottom-2 left-2.5 text-xl leading-none z-10"
                  style={{ fontFamily: "'Segoe UI Emoji','Apple Color Emoji',sans-serif", filter: `drop-shadow(0 2px 6px ${accent}80)`, userSelect: "none" }}
                >
                  {deal.catEmoji}
                </div>
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-fast" style={{ background: "rgba(0,0,0,0.22)" }}>
                  <Maximize2 size={18} className="text-white/70" />
                </div>
                <div className="absolute bottom-2 right-2 z-10">
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}28` }}>
                    {deal.category}
                  </span>
                </div>
                <div
                  className="absolute top-2 right-2 z-10 text-[11px] font-medium"
                  style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace" }}
                >
                  {fmtAgo(deal.ts)}
                </div>
              </>
            ) : (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle, ${accent}12 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                    opacity: 0.35,
                  }}
                />
                <div className="w-full h-full flex items-center justify-center text-4xl" style={{ fontFamily: "'Segoe UI Emoji','Apple Color Emoji',sans-serif" }}>
                  {deal.catEmoji}
                </div>
                <div className="absolute top-2 right-2 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {fmtAgo(deal.ts)}
                </div>
              </>
            )}

            {/* Discount badge */}
            {deal.discount > 0 && (
              <div
                className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md font-bold leading-none text-white"
                style={{ background: discBg(deal.discount), fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}
              >
                {Math.round(deal.discount)}% OFF
              </div>
            )}

            {/* Trick badge */}
            {deal.dealType === "trick" && (
              <div className="absolute bottom-7 left-2 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>
                TRICK
              </div>
            )}

            {/* Affiliate */}
            {deal.affiliate && (
              <div className="absolute top-8 right-2 z-10 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }} title="Affiliated">
                <Zap size={8} className="text-white" strokeWidth={2.5} />
              </div>
            )}

            {/* Status overlay */}
            {deal.status === "approved" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(22,163,74,0.80)" }}>
                <Check size={32} className="text-white" strokeWidth={3} />
              </div>
            )}
            {deal.status === "rejected" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(220,38,38,0.80)" }}>
                <X size={32} className="text-white" strokeWidth={3} />
              </div>
            )}
            {deal.status === "draft" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(245,158,11,0.80)" }}>
                <FileText size={24} className="text-white" />
                <span className="text-white text-[11px] font-bold">Draft</span>
              </div>
            )}
          </div>

          {/* Info section */}
          <div
            className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-2"
            onClick={() => !swiping && isPending && !batchMode && onEdit(deal)}
            style={{ cursor: isPending && !batchMode ? "pointer" : "default" }}
          >
            <p
              className="text-[13px] font-semibold leading-snug"
              style={{
                color: "var(--text)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {deal.title}
            </p>

            {/* Price row */}
            <div className="flex items-center gap-2 flex-wrap">
              {deal.price > 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[16px] font-black tracking-tight"
                    style={{ color: accent, fontFamily: "'JetBrains Mono',monospace" }}
                  >
                    {fmt(deal.price)}
                  </span>
                  {deal.mrp > 0 && deal.mrp > deal.price && (
                    <span className="text-[11px] line-through" style={{ color: "var(--text-dim)" }}>
                      {fmt(deal.mrp)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                  Trick / Loot
                </span>
              )}
              {deal.affiliate && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-0.5" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
                  <Zap size={8} /> Aff
                </span>
              )}
            </div>

            {/* Signals */}
            {deal.signals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {deal.signals.map((sig, i) => {
                  const isCoupon = sig.startsWith("COUPON:");
                  const couponCode = isCoupon ? sig.replace("COUPON:", "") : null;
                  return isCoupon ? (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(couponCode!, `${couponCode} copied!`); }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-fast active:scale-95"
                      style={{ background: "rgba(251,191,36,0.1)", color: "#f59e0b", border: "1px dashed rgba(251,191,36,0.25)" }}
                    >
                      <Tag size={8} />{couponCode} 📋
                    </button>
                  ) : (
                    <span key={i} className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: "var(--bg-muted)", color: "var(--text-dim)" }}>
                      {sig}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Channel pill */}
            <button
              className="mt-auto flex items-center gap-1.5 self-start px-2 py-1 rounded-lg transition-fast active:scale-95"
              style={{ background: `${accent}14` }}
              onClick={(e) => { e.stopPropagation(); onChannelClick?.(deal.channelRaw); }}
              title={`Filter: ${deal.channel}`}
            >
              <span
                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                style={{ background: accent }}
              >
                {(deal.channel[0] || "?").toUpperCase()}
              </span>
              <span className="text-[10px] font-semibold truncate max-w-[100px]" style={{ color: accent }}>
                {deal.channel.replace(/^@/, "")}
              </span>
            </button>

            {/* Action buttons */}
            {!batchMode && (
              isPending ? (
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onReject(deal.id)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast active:scale-95"
                    style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
                    title="Reject"
                  >
                    <X size={14} style={{ color: "#dc2626" }} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onEdit(deal)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast active:scale-95"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                    title="Edit"
                  >
                    <PenLine size={13} />
                  </button>
                  <button
                    onClick={() => onApprove(deal.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-[12px] font-bold transition-fast active:scale-95"
                    style={{ background: "rgba(22,163,74,0.12)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}
                  >
                    <Check size={13} strokeWidth={2.5} /> Approve
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span
                    className="flex-1 text-center text-[11px] font-bold py-2 rounded-xl"
                    style={{
                      background: deal.status === "approved" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                      color: deal.status === "approved" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {deal.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                  </span>
                  <button
                    onClick={() => onEdit(deal)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-fast"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    <PenLine size={13} />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
