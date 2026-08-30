import { useState, useEffect, useCallback, useRef } from "react";
import type { Deal, DealStatus, Tab, WSStatus, Toast, DailyStats } from "./types";
import {
  fetchPendingDeals, fetchDailyStats, apiApprove, apiReject, apiEdit,
  mapRawToDeal, EMPTY_STATS, WS_URL,
} from "./utils";
import { ToastContainer } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import MobileHeader from "./components/MobileHeader";
import MobileNav from "./components/MobileNav";
import ReviewView from "./components/ReviewView";
import DesiDimeView from "./components/DesiDimeView";
import PostedView from "./components/PostedView";
import ChannelsView from "./components/ChannelsView";
import SettingsView from "./components/SettingsView";
import EditModal from "./components/EditModal";

let toastSeq = 0;

export default function App() {
  const [tab, setTab] = useState<Tab>("Review");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);
  const [wsStatus, setWsStatus] = useState<WSStatus>("disconnected");
  const [wsRetry, setWsRetry] = useState(0);
  const [stats, setStats] = useState<DailyStats>(EMPTY_STATS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sessionNew, setSessionNew] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef(0);
  const aliveRef = useRef(true);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = String(++toastSeq);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load deals from API
  const loadDeals = useCallback(async () => {
    try {
      const apiDeals = await fetchPendingDeals();
      if (apiDeals.length > 0) setDeals(apiDeals);
    } catch {}
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const s = await fetchDailyStats();
      setStats(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadDeals();
    loadStats();
    const timer = setInterval(loadDeals, 15_000);
    return () => clearInterval(timer);
  }, [loadDeals, loadStats]);

  // WebSocket with reconnect
  const connectWS = useCallback(() => {
    if (!aliveRef.current) return;
    let ws: WebSocket;
    try { ws = new WebSocket(WS_URL); } catch { return; }

    wsRef.current = ws;
    setWsStatus("reconnecting");

    ws.onopen = () => {
      wsRetryRef.current = 0;
      setWsRetry(0);
      setWsStatus("connected");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "new_deal" && msg.deal) {
          const newDeal = mapRawToDeal(msg.deal);
          setDeals((prev) => [newDeal, ...prev.filter((d) => d.id !== newDeal.id)]);
          setSessionNew((n) => n + 1);
          addToast("New deal arrived", "info");
        } else if (msg.type === "deal_approved" && msg.deal_id) {
          setDeals((prev) =>
            prev.map((d) => (d.id === msg.deal_id ? { ...d, status: "approved" as DealStatus } : d))
          );
        } else if (msg.type === "stats_update" && msg.stats) {
          setStats(msg.stats);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      if (!aliveRef.current) return;
      const delay = Math.min(1000 * 2 ** wsRetryRef.current, 30_000);
      wsRetryRef.current++;
      setWsRetry(wsRetryRef.current);
      setTimeout(connectWS, delay);
    };

    ws.onerror = () => ws.close();
  }, [addToast]);

  useEffect(() => {
    aliveRef.current = true;
    connectWS();
    return () => {
      aliveRef.current = false;
      wsRef.current?.close();
    };
  }, [connectWS]);

  const manualReconnect = useCallback(() => {
    wsRetryRef.current = 0;
    setWsRetry(0);
    wsRef.current?.close();
    setTimeout(connectWS, 200);
  }, [connectWS]);

  // Approve — optimistic
  const approve = useCallback(
    (id: string) => {
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "approved" as DealStatus } : d)));
      try { navigator.vibrate?.(12); } catch {}
      apiApprove(id).then((ok) => {
        if (!ok) {
          setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "pending" as DealStatus } : d)));
          addToast("Approve failed — reverted", "error");
        }
      });
    },
    [addToast]
  );

  // Reject — optimistic
  const reject = useCallback(
    (id: string) => {
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "rejected" as DealStatus } : d)));
      try { navigator.vibrate?.([8, 30, 8]); } catch {}
      apiReject(id).then((ok) => {
        if (!ok) {
          setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, status: "pending" as DealStatus } : d)));
          addToast("Reject failed — reverted", "error");
        }
      });
    },
    [addToast]
  );

  // Save Draft
  const saveDraft = useCallback(
    (changes: Partial<Deal>) => {
      if (!editing) return;
      setDeals((ds) =>
        ds.map((d) => (d.id === editing.id ? { ...d, ...changes, status: "draft" as DealStatus } : d))
      );
      addToast("Draft saved", "info");
      apiEdit(editing.id, changes as Record<string, unknown>);
    },
    [editing, addToast]
  );

  // Save & Approve
  const saveApprove = useCallback(
    (changes: Partial<Deal>) => {
      if (!editing) return;
      setDeals((ds) =>
        ds.map((d) => (d.id === editing.id ? { ...d, ...changes, status: "approved" as DealStatus } : d))
      );
      addToast("Saved & Approved ✓", "success");
      apiEdit(editing.id, changes as Record<string, unknown>).then(() =>
        apiApprove(editing.id, changes as Record<string, unknown>)
      );
    },
    [editing, addToast]
  );

  // Remove deal (spam)
  const removeDeal = useCallback((id: string) => {
    setDeals((ds) => ds.filter((d) => d.id !== id));
  }, []);

  const pending = deals.filter((d) => d.status === "pending").length;

  const sharedProps = { dark, setDark, wsStatus, wsRetry, onWSReconnect: manualReconnect };

  return (
    <div style={{ height: "100dvh", background: "var(--bg)" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <Sidebar tab={tab} setTab={setTab} pending={pending} stats={stats} {...sharedProps} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader tab={tab} pending={pending} {...sharedProps} />

            <div className="flex-1 flex flex-col overflow-hidden">
              {tab === "Review" && (
                <ReviewView
                  deals={deals}
                  stats={stats}
                  sessionNew={sessionNew}
                  onApprove={approve}
                  onReject={reject}
                  onEdit={setEditing}
                  onToast={addToast}
                />
              )}
              {tab === "DesiDime" && (
                <DesiDimeView sharedWS={wsRef.current} onToast={addToast} />
              )}
              {tab === "Posted" && (
                <PostedView deals={deals} onEdit={setEditing} onToast={addToast} />
              )}
              {tab === "Channels" && <ChannelsView onToast={addToast} />}
              {tab === "Settings" && <SettingsView dark={dark} setDark={setDark} onToast={addToast} />}
            </div>

            <MobileNav tab={tab} setTab={setTab} pending={pending} />
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          deal={editing}
          onClose={() => setEditing(null)}
          onSaveDraft={saveDraft}
          onSaveApprove={saveApprove}
          onRemove={removeDeal}
          onToast={addToast}
        />
      )}
    </div>
  );
}
