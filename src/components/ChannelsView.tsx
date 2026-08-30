import { useState, useEffect, useCallback } from "react";
import type { Channel } from "../types";
import { API_BASE } from "../utils";
import { Check, Plus, PenLine, ToggleLeft, ToggleRight, X, ExternalLink } from "./Icons";

const COLORS = ["#E63946","#06b6d4","#10b981","#f59e0b","#ec4899","#f97316","#7C3AED","#6ee7b7","#fbbf24","#fb7185","#67e8f9","#86efac"];

interface ChannelsViewProps {
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function ChannelsView({ onToast }: ChannelsViewProps) {
  const [chs, setChs] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInput, setNewInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/channels`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.channels)) setChs(data.channels);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const saveAlias = async (id: string, name: string) => {
    if (!name.trim()) { setEditingId(null); return; }
    setChs((cs) => cs.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
    setEditingId(null);
    try {
      await fetch(`${API_BASE}/api/v1/channels/alias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: name.trim() }),
      });
      onToast("Name saved", "success");
    } catch {
      onToast("Failed to save name", "error");
    }
  };

  const toggleChannel = async (id: string, current: boolean) => {
    setChs((cs) => cs.map((c) => (c.id === id ? { ...c, active: !current } : c)));
    try {
      await fetch(`${API_BASE}/api/v1/channels/config/${encodeURIComponent(id)}/toggle`, { method: "PUT" });
    } catch {
      setChs((cs) => cs.map((c) => (c.id === id ? { ...c, active: current } : c)));
      onToast("Failed to toggle", "error");
    }
  };

  const deleteChannel = async (id: string) => {
    setDeleting(id);
    setChs((cs) => cs.filter((c) => c.id !== id));
    try {
      await fetch(`${API_BASE}/api/v1/channels/config/${encodeURIComponent(id)}`, { method: "DELETE" });
      onToast("Channel removed", "success");
    } catch {
      fetchChannels();
      onToast("Failed to delete", "error");
    } finally {
      setDeleting(null);
    }
  };

  const clearAllChannels = async () => {
    const all = [...chs];
    setChs([]);
    setConfirmClearAll(false);
    let failed = 0;
    for (const ch of all) {
      try {
        await fetch(`${API_BASE}/api/v1/channels/config/${encodeURIComponent(ch.id)}`, { method: "DELETE" });
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      onToast(`${failed} channels failed to delete`, "error");
      fetchChannels();
    } else {
      onToast(`Cleared ${all.length} channels`, "success");
    }
  };

  const addChannel = async () => {
    if (!newInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/channels/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: newInput.trim() }),
      });
      if (res.ok) {
        setNewInput("");
        setShowAdd(false);
        fetchChannels();
        onToast("Channel added", "success");
      } else {
        onToast("Failed to add channel", "error");
      }
    } catch {
      onToast("Error adding channel", "error");
    }
  };

  const telegramUrl = (id: string) => {
    if (id.startsWith("@")) return `https://t.me/${id.slice(1)}`;
    return null;
  };

  const active = chs.filter((c) => c.active).length;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div
        className="flex-shrink-0 -mx-5 -mt-5 px-5 pt-5 pb-4 mb-2 border-b"
        style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.07) 0%,var(--bg) 60%)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.12)" }}>
              <span className="text-lg">📡</span>
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Source Channels <span style={{ color: "#7C3AED", fontFamily: "'JetBrains Mono',monospace" }}>({chs.length})</span></p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{active} active · {chs.length - active} paused</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chs.length > 0 && (
              <button
                onClick={() => setConfirmClearAll(true)}
                className="text-xs font-semibold px-3 py-2 rounded-xl transition-fast"
                style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }}
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white transition-fast active:scale-95"
              style={{ background: "linear-gradient(135deg,#E63946,#c0392b)", boxShadow: "0 4px 14px rgba(230,57,70,0.28)" }}
            >
              <Plus size={12} /> {showAdd ? "Close" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Add input */}
      {showAdd && (
        <div className="flex items-center gap-2 p-3 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <input
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            placeholder="@channel or -1001234567890"
            className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none transition-fast"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}
            onKeyDown={(e) => e.key === "Enter" && addChannel()}
            autoFocus
          />
          <button
            onClick={addChannel}
            className="h-9 px-4 rounded-xl text-xs font-bold text-white transition-fast"
            style={{ background: "#E63946" }}
          >
            Add
          </button>
        </div>
      )}

      {/* Confirm clear all */}
      {confirmClearAll && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl border" style={{ background: "#1a0a0a", borderColor: "rgba(220,38,38,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Delete all {chs.length} channels?</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>This cannot be undone. You will need to add them back manually.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmClearAll(false)}
              className="flex-1 h-10 rounded-xl text-sm font-semibold transition-fast"
              style={{ background: "var(--bg-secondary)", color: "#9ca3af", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={clearAllChannels}
              className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-fast"
              style={{ background: "#dc2626" }}
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      {loading && chs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#E63946" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading channels…</p>
        </div>
      ) : chs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="text-3xl">📡</div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>No channels yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add a Telegram channel above to start monitoring deals.</p>
        </div>
      ) : (
        chs.map((ch, i) => {
          const color = ch.color || COLORS[i % COLORS.length];
          const tgUrl = telegramUrl(ch.id);
          return (
            <div
              key={ch.id}
              className="flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-fast"
              style={{
                background: "var(--bg-card)",
                borderLeft: `3px solid ${color}`,
                opacity: deleting === ch.id ? 0.4 : 1,
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: `${color}20`, color }}
              >
                {(ch.name || ch.id || "C")[0].toUpperCase()}
              </div>

              {/* Name + ID */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => { setEditingId(ch.id); setEditName(ch.name || ch.id); }}
              >
                {editingId === ch.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveAlias(ch.id, editName);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => saveAlias(ch.id, editName)}
                      className="flex-1 px-2 py-1 rounded-lg text-sm font-bold focus:outline-none"
                      style={{ background: "var(--bg-input)", border: "1px solid rgba(230,57,70,0.4)", color: "var(--text)" }}
                    />
                    <button onClick={() => saveAlias(ch.id, editName)} style={{ color: "#16a34a" }}>
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold transition-fast flex items-center gap-1.5 truncate" style={{ color: "var(--text)" }}>
                        {ch.name || ch.id}
                        <PenLine size={10} className="opacity-0 group-hover:opacity-60 transition-fast flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                      </p>
                      <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>{ch.id}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 24h count */}
              <div className="text-right flex-shrink-0 hidden sm:block">
                <p className="text-sm font-bold" style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {ch.deals_24h ?? ch.deals ?? 0}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>24h</p>
              </div>

              {/* Link to Telegram */}
              {tgUrl && (
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast hover:opacity-80"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
                  onClick={(e) => e.stopPropagation()}
                  title="Open in Telegram"
                >
                  <ExternalLink size={13} />
                </a>
              )}

              {/* Toggle */}
              <button
                onClick={() => toggleChannel(ch.id, ch.active)}
                className="flex-shrink-0 transition-fast"
              >
                {ch.active
                  ? <ToggleRight size={26} style={{ color: "#16a34a" }} />
                  : <ToggleLeft size={26} style={{ color: "var(--text-dim)" }} />}
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteChannel(ch.id)}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-fast hover:opacity-100"
                style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.12)", color: "#dc2626", opacity: 0.5 }}
                title="Remove channel"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
