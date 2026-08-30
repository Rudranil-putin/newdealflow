import { useState } from "react";
import type { Deal } from "../types";
import { catColor, fmt, fmtTime, fmtDate } from "../utils";
import ComposeModal from "./ComposeModal";
import { PenLine, Plus } from "./Icons";

interface PostedViewProps {
  deals: Deal[];
  onEdit: (d: Deal) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function PostedView({ deals, onEdit, onToast }: PostedViewProps) {
  const [activeTab, setActiveTab] = useState<"posted" | "drafts">("posted");
  const [showCompose, setShowCompose] = useState(false);

  const posted = deals.filter((d) => d.status === "approved").sort((a, b) => b.ts - a.ts);
  const drafts = deals.filter((d) => d.status === "draft").sort((a, b) => b.ts - a.ts);
  const T = Math.floor(Date.now() / 1000);
  const list = activeTab === "posted" ? posted : drafts;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onToast={onToast} />}

      {/* Header */}
      <div
        className="px-5 pt-4 pb-0 border-b flex-shrink-0"
        style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.07) 0%,var(--bg-card) 60%)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(22,163,74,0.12)" }}>
              <span className="text-lg">✅</span>
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{activeTab === "posted" ? "Posted History" : "Saved Drafts"}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {activeTab === "posted"
                  ? `${posted.length} approved · @dealsforindia`
                  : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""} saved`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-fast active:scale-95"
            style={{ background: "linear-gradient(135deg,#E63946,#c0392b)", boxShadow: "0 4px 14px rgba(230,57,70,0.28)" }}
          >
            <Plus size={12} /> Compose
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 -mb-px">
          {([["posted", `Posted ${posted.length}`], ["drafts", `Drafts ${drafts.length}`]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className="px-4 py-2 text-xs font-semibold border-b-2 transition-fast"
              style={{
                borderColor: activeTab === v ? "#E63946" : "transparent",
                color: activeTab === v ? "#E63946" : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 flex flex-col gap-2 max-w-2xl mx-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "var(--bg-secondary)" }}>
                {activeTab === "posted" ? "✅" : "📝"}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {activeTab === "posted" ? "No posts yet" : "No drafts saved"}
                </p>
                <p className="text-xs mt-1.5 max-w-xs" style={{ color: "var(--text-muted)" }}>
                  {activeTab === "posted"
                    ? "Approved deals appear here instantly."
                    : "Save a deal as draft from the edit modal."}
                </p>
              </div>
              {activeTab === "posted" && (
                <button
                  onClick={() => setShowCompose(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-fast"
                  style={{ background: "#E63946" }}
                >
                  <Plus size={13} /> Compose a deal
                </button>
              )}
            </div>
          ) : (
            list.map((entry, i) => {
              const accent = catColor[entry.category] || "#E63946";
              const isToday = fmtDate(entry.ts) === fmtDate(T);
              const showSep = i === 0 || fmtDate(list[i - 1].ts) !== fmtDate(entry.ts);
              return (
                <div key={entry.id}>
                  {showSep && (
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
                        {isToday ? "Today" : fmtDate(entry.ts)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    </div>
                  )}
                  <div
                    className="flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-fast"
                    style={{ background: "var(--bg-card)", borderLeft: `3px solid ${accent}` }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: `${accent}15` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-2xl" style={{ fontFamily: "'Segoe UI Emoji',sans-serif" }}>
                        {entry.catEmoji}
                      </div>
                      {entry.imgUrl && (
                        <img
                          src={entry.imgUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold leading-tight line-clamp-1" style={{ color: "var(--text)" }}>{entry.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {entry.price > 0 && (
                          <span className="text-[13px] font-black" style={{ color: accent, fontFamily: "'JetBrains Mono',monospace" }}>
                            {fmt(entry.price)}
                          </span>
                        )}
                        {entry.discount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
                            {Math.round(entry.discount)}% off
                          </span>
                        )}
                        {entry.autoPosted && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>
                            🤖 Auto
                          </span>
                        )}
                        {entry.status === "draft" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                            Draft
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
                        {fmtTime(entry.ts)}
                      </span>
                      {entry.status === "draft" ? (
                        <button
                          onClick={() => onEdit(entry)}
                          className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-lg font-semibold transition-fast"
                          style={{ background: "rgba(230,57,70,0.08)", color: "#E63946", border: "1px solid rgba(230,57,70,0.2)" }}
                        >
                          <PenLine size={8} /> Edit
                        </button>
                      ) : (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={
                            entry.affiliate
                              ? { background: "rgba(22,163,74,0.08)", color: "#4ade80" }
                              : { background: "var(--bg-secondary)", color: "var(--text-dim)" }
                          }
                        >
                          {entry.affiliate ? "Affiliated" : "No aff."}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
