import { useState, useEffect, useCallback } from "react";
import type { Deal, DealStatus } from "../types";
import { fetchDesiDeals, mapRawToDeal, apiApprove, apiReject } from "../utils";
import DealCard from "./DealCard";
import { Search } from "./Icons";

interface DesiDimeViewProps {
  sharedWS: WebSocket | null;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function DesiDimeView({ sharedWS, onToast }: DesiDimeViewProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDesiDeals()
      .then((d) => { setDeals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Wire up shared WS — fixed version (actually attaches listener)
  useEffect(() => {
    if (!sharedWS) return;
    const handler = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "new_deal" && msg.deal) {
          const raw = msg.deal;
          if (raw.source_channel?.toLowerCase().includes("desidime")) {
            const newDeal = { ...mapRawToDeal(raw), channel: "DesiDime" };
            setDeals((prev) => [newDeal, ...prev.filter((d) => d.id !== newDeal.id)]);
          }
        }
      } catch {}
    };
    sharedWS.addEventListener("message", handler);
    return () => sharedWS.removeEventListener("message", handler);
  }, [sharedWS]);

  const approve = useCallback(
    (id: string) => {
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "approved" as DealStatus } : d)));
      onToast("Approved ✓", "success");
      apiApprove(id).then((ok) => {
        if (!ok) {
          setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "pending" as DealStatus } : d)));
          onToast("Approve failed — reverted", "error");
        }
      });
    },
    [onToast]
  );

  const reject = useCallback(
    (id: string) => {
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "rejected" as DealStatus } : d)));
      onToast("Rejected", "error");
      apiReject(id).then((ok) => {
        if (!ok) {
          setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "pending" as DealStatus } : d)));
          onToast("Reject failed — reverted", "error");
        }
      });
    },
    [onToast]
  );

  const edit = useCallback(() => onToast("Edit not available for DesiDime deals", "info"), [onToast]);

  const visible = deals.filter(
    (d) => !search.trim() || d.title.toLowerCase().includes(search.toLowerCase())
  );
  const pendingCount = deals.filter((d) => d.status === "pending").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3 border-b flex flex-col gap-3"
        style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.08) 0%,var(--bg-card) 60%)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(6,182,212,0.12)" }}>
            <span className="text-lg">🛍️</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>DesiDime</span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#06b6d4", boxShadow: "0 0 6px #06b6d4" }} />
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", fontFamily: "'JetBrains Mono',monospace" }}>
                {pendingCount} pending
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Live deal scraper · auto-updated via WebSocket</p>
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DesiDime deals…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-fast"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#06b6d4" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading DesiDime deals…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-4xl">🛍️</div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No DesiDime deals found</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>New deals from DesiDime will appear here automatically via WebSocket.</p>
          </div>
        ) : (
          <div className="deal-grid">
            {visible.map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                onApprove={approve}
                onReject={reject}
                onEdit={edit}
                onCopyToast={(msg) => onToast(msg, "info")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
