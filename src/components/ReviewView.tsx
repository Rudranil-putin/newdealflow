import { useState, useEffect, useCallback, useRef } from "react";
import type { Deal, FilterMode, Channel as ChannelConfig } from "../types";
import DealCard from "./DealCard";
import StatsBar from "./StatsBar";
import BatchFooter from "./BatchFooter";
import { Search, RefreshCw, CheckSquare } from "./Icons";
import type { DailyStats } from "../types";
import { API_BASE } from "../utils";

interface Channel { raw: string; name: string; }

interface ReviewViewProps {
  deals: Deal[];
  stats: DailyStats;
  sessionNew: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (d: Deal) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function ReviewView({ deals, stats, sessionNew, onApprove, onReject, onEdit, onToast }: ReviewViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("pending");
  const [page, setPage] = useState(1);
  const [sendTG, setSendTG] = useState(true);
  const [sendWA, setSendWA] = useState(false);
  const [sendX, setSendX] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [showChannelDrop, setShowChannelDrop] = useState(false);
  const [apiChannels, setApiChannels] = useState<ChannelConfig[]>([]);
  const PAGE_SIZE = 100;
  const gridRef = useRef<HTMLDivElement>(null);

  // Close channel dropdown on outside click
  useEffect(() => {
    if (!showChannelDrop) return;
    const close = () => setShowChannelDrop(false);
    document.addEventListener("click", close, { capture: true, once: true });
    return () => document.removeEventListener("click", close, { capture: true });
  }, [showChannelDrop]);

  // Fetch channel list from API so pills show before any deals load
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/channels`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.channels) setApiChannels(d.channels); })
      .catch(() => {});
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Normalize channel name for reliable matching (avoids @username vs -100... mismatch)
  const normName = (s: string) => String(s).trim().replace(/^@/, "").toLowerCase();

  // Build unique channel list keyed by normalized display name
  const channels: Channel[] = (() => {
    const map = new Map<string, string>(); // normName → display name
    // API channels: prefer their stored name, fall back to id
    for (const ch of apiChannels) {
      const display = ch.name && ch.name !== ch.id ? ch.name : ch.id;
      map.set(normName(display), display);
    }
    // Fill from deals in case API missed channels
    for (const d of deals) {
      const key = normName(d.channel);
      if (!map.has(key)) map.set(key, d.channel);
    }
    return [...map.entries()].map(([key, name]) => ({ raw: key, name }));
  })();

  let visible = deals.filter((d) => {
    if (filter !== "all" && d.status !== filter) return false;
    // Filter by normalized display name — bypasses @username vs numeric ID format issues
    if (channelFilter && normName(d.channel) !== channelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.channel.toLowerCase().includes(q);
    }
    return true;
  });
  visible = [...visible].sort((a, b) => b.ts - a.ts);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedVisible = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pending = deals.filter((d) => d.status === "pending").length;
  const approved = deals.filter((d) => d.status === "approved").length;
  const rejected = deals.filter((d) => d.status === "rejected").length;

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showMobileSheet) return;
      const deal = pagedVisible[focusedIdx];
      switch (e.key) {
        case "a": case "A":
          if (deal?.status === "pending") { onApprove(deal.id); onToast("Approved ✓", "success"); }
          break;
        case "r": case "R":
          if (deal?.status === "pending") { onReject(deal.id); onToast("Rejected", "error"); }
          break;
        case "e": case "E":
          if (deal) onEdit(deal);
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedIdx((i) => Math.min(i + 1, pagedVisible.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIdx((i) => Math.max(i - 1, 0));
          break;
        case " ":
          e.preventDefault();
          if (deal?.status === "pending") { onApprove(deal.id); onToast("Approved ✓", "success"); }
          break;
        case "b": case "B":
          setBatchMode((v) => !v);
          break;
        case "Escape":
          setSelected(new Set());
          setBatchMode(false);
          setChannelFilter(null);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showMobileSheet, pagedVisible, focusedIdx, onApprove, onReject, onEdit, onToast]);

  const approveAll = useCallback(async () => {
    const ids = [...selected].filter((id) => deals.find((x) => x.id === id)?.status === "pending");
    for (const id of ids) onApprove(id);
    onToast(`Approved ${ids.length} deals`, "success");
    setSelected(new Set());
    setBatchMode(false);
  }, [selected, deals, onApprove, onToast]);

  const rejectAll = useCallback(async () => {
    const ids = [...selected].filter((id) => deals.find((x) => x.id === id)?.status === "pending");
    for (const id of ids) onReject(id);
    onToast(`Rejected ${ids.length} deals`, "error");
    setSelected(new Set());
    setBatchMode(false);
  }, [selected, deals, onReject, onToast]);

  // Grid scroll bottom padding: MobileNav (60px) + optional BatchFooter (64px)
  const gridPb = batchMode && selected.size > 0
    ? "calc(env(safe-area-inset-bottom,0px) + 124px)"
    : "calc(env(safe-area-inset-bottom,0px) + 60px)";

  // channelFilter is now a normalized name key
  const activeChannelName = channelFilter
    ? (channels.find((c) => c.raw === channelFilter)?.name || channelFilter).replace(/^@/, "")
    : null;

  // DealCard onChannelClick gives us channelRaw — convert to normName key
  const handleChannelClick = (channelRaw: string) => {
    // Find by raw ID match or fall back to normName of channelRaw
    const deal = deals.find((d) => d.channelRaw === channelRaw);
    if (deal) setChannelFilter(normName(deal.channel));
  };

  const channelDropdown = channels.length > 0 && (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setShowChannelDrop((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-fast whitespace-nowrap"
        style={{
          background: channelFilter ? "rgba(230,57,70,0.12)" : "var(--bg-secondary)",
          color: channelFilter ? "#E63946" : "var(--text-muted)",
          border: channelFilter ? "1px solid rgba(230,57,70,0.25)" : "1px solid var(--border)",
        }}
      >
        {activeChannelName ? `# ${activeChannelName}` : "Channel"}
        <span style={{ opacity: 0.5, fontSize: 8 }}>▾</span>
      </button>
      {showChannelDrop && (
        <div
          className="absolute top-full mt-1 right-0 z-50 rounded-xl overflow-hidden py-1 min-w-[160px] max-h-64 overflow-y-auto no-scrollbar"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
        >
          <button
            onClick={() => { setChannelFilter(null); setPage(1); setShowChannelDrop(false); }}
            className="w-full text-left px-3 py-2 text-[11px] font-semibold transition-fast"
            style={{ color: !channelFilter ? "#E63946" : "var(--text-muted)", background: !channelFilter ? "rgba(230,57,70,0.08)" : "transparent" }}
          >
            All channels
          </button>
          {channels.map(({ raw, name }) => (
            <button
              key={raw}
              onClick={() => { setChannelFilter(raw); setPage(1); setShowChannelDrop(false); }}
              className="w-full text-left px-3 py-2 text-[11px] font-semibold transition-fast truncate"
              style={{ color: channelFilter === raw ? "#E63946" : "var(--text-muted)", background: channelFilter === raw ? "rgba(230,57,70,0.08)" : "transparent" }}
            >
              {name.replace(/^@/, "")}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const broadcastButtons = (
    [
      { id: "tg", label: "✈️ Telegram", active: sendTG, toggle: () => { setSendTG((v) => !v); } },
      { id: "wa", label: "💬 WhatsApp", active: sendWA, toggle: () => { setSendWA((v) => !v); } },
      { id: "x",  label: "𝕏",           active: sendX,  toggle: () => { setSendX((v) => !v); } },
    ]
  ).map(({ id, label, active, toggle }) => (
    <button
      key={id}
      onClick={toggle}
      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 h-11 md:h-auto px-3 md:py-1 rounded-xl md:rounded-lg text-xs font-semibold transition-fast"
      style={{
        background: active ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "#4ade80" : "var(--text-dim)",
        border: active ? "1px solid rgba(22,163,74,0.2)" : `1px solid var(--border)`,
      }}
    >
      {label}
      {active && <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#16a34a" }} />}
    </button>
  ));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats bar */}
      <StatsBar deals={deals} stats={stats} sessionNew={sessionNew} />

      {/* Toolbar */}
      <div
        className="flex-shrink-0 px-4 md:px-6 py-3 border-b flex flex-col gap-2.5"
        style={{ background: "linear-gradient(180deg,rgba(230,57,70,0.04) 0%,var(--bg-card) 100%)", borderColor: "var(--border)" }}
      >
        {/* Row 1: Search + mobile batch/overflow, desktop batch */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search deals or channels…"
              className="w-full pl-8 pr-4 py-2.5 md:py-2 rounded-xl text-sm focus:outline-none transition-fast"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Mobile-only: batch icon + sheet button */}
          <button
            onClick={() => { setBatchMode((v) => !v); setSelected(new Set()); }}
            className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast"
            style={{
              background: batchMode ? "rgba(230,57,70,0.1)" : "var(--bg-secondary)",
              border: batchMode ? "1px solid rgba(230,57,70,0.3)" : `1px solid var(--border)`,
              color: batchMode ? "#E63946" : "var(--text-muted)",
            }}
          >
            <CheckSquare size={16} />
          </button>
          <button
            onClick={() => setShowMobileSheet(true)}
            className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span className="text-base font-bold leading-none">···</span>
          </button>

          {/* Desktop-only: batch text button */}
          <button
            onClick={() => { setBatchMode((v) => !v); setSelected(new Set()); }}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-fast"
            style={{
              background: batchMode ? "rgba(230,57,70,0.1)" : "var(--bg-secondary)",
              border: batchMode ? "1px solid rgba(230,57,70,0.3)" : `1px solid var(--border)`,
              color: batchMode ? "#E63946" : "var(--text-muted)",
            }}
          >
            {batchMode ? "✕ Batch" : "□ Batch"}
          </button>
        </div>

        {/* Row 2: Status pills + channel dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 rounded-xl overflow-x-auto no-scrollbar flex-1" style={{ background: "var(--bg-sidebar)" }}>
            {([["pending", pending], ["approved", approved], ["rejected", rejected], ["all", deals.length]] as const).map(([v, cnt]) => (
              <button
                key={v}
                onClick={() => { setFilter(v); setPage(1); }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-fast flex-shrink-0"
                style={{
                  background: filter === v ? "var(--bg-secondary)" : "transparent",
                  color: filter === v ? "var(--text)" : "var(--text-muted)",
                  boxShadow: filter === v ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {v} <span className="font-mono opacity-50 ml-0.5" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{cnt}</span>
              </button>
            ))}
          </div>
          {channelDropdown}
        </div>

        {/* Row 3: Broadcast — desktop only */}
        <div
          className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl flex-wrap"
          style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#16a34a" }} />
            <span className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>Broadcast</span>
          </div>
          <div className="flex items-center gap-2">{broadcastButtons}</div>
        </div>
      </div>

      {/* Mobile bottom sheet — sort + broadcast */}
      {showMobileSheet && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-fade-in"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowMobileSheet(false)}
        >
          <div
            className="rounded-t-2xl flex flex-col gap-5 px-5 pt-4 pb-6 animate-slide-up"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom,0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-8 h-1 rounded-full self-center" style={{ background: "var(--border)" }} />

            {/* Channels */}
            {channels.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-dim)" }}>Channel</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar rounded-xl" style={{ background: "var(--bg-sidebar)" }}>
                  <button
                    onClick={() => { setChannelFilter(null); setPage(1); setShowMobileSheet(false); }}
                    className="text-left px-3 py-2.5 text-[12px] font-semibold transition-fast"
                    style={{ color: !channelFilter ? "#E63946" : "var(--text-muted)" }}
                  >
                    All channels
                  </button>
                  {channels.map(({ raw, name }) => (
                    <button
                      key={raw}
                      onClick={() => { setChannelFilter(raw); setPage(1); setShowMobileSheet(false); }}
                      className="text-left px-3 py-2.5 text-[12px] font-semibold transition-fast truncate"
                      style={{ color: channelFilter === raw ? "#E63946" : "var(--text-muted)" }}
                    >
                      {name.replace(/^@/, "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Broadcast */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#16a34a" }} />
                <p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: "var(--text-dim)" }}>Broadcast</p>
              </div>
              <div className="flex gap-2">{broadcastButtons}</div>
            </div>

            <button
              className="h-11 rounded-2xl text-sm font-bold transition-fast"
              style={{ background: "var(--bg-secondary)", color: "var(--text)", border: "1px solid var(--border)" }}
              onClick={() => setShowMobileSheet(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:pb-4"
        style={{ paddingBottom: gridPb }}
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "var(--bg-secondary)" }}>🔍</div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No deals found</p>
            <button
              onClick={() => { setSearch(""); setFilter("pending"); setChannelFilter(null); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#E63946" }}
            >
              <RefreshCw size={13} /> Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="deal-grid">
              {pagedVisible.map((d, i) => (
                <DealCard
                  key={d.id}
                  deal={d}
                  batchMode={batchMode}
                  selected={selected.has(d.id)}
                  onToggleSelect={toggleSelect}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEdit={onEdit}
                  onChannelClick={handleChannelClick}
                  onCopyToast={(msg) => onToast(msg, "success")}
                  focused={!batchMode && i === focusedIdx}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-11 px-4 rounded-xl text-xs font-bold transition-fast disabled:opacity-30"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    Prev
                  </button>
                  <span className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "var(--bg-muted)", color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-11 px-4 rounded-xl text-xs font-bold transition-fast disabled:opacity-30"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {batchMode && (
        <BatchFooter
          count={selected.size}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
