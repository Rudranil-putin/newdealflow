import { useState, useEffect } from "react";
import { API_BASE } from "../utils";
import { Check, CheckCircle2, Shield, Sun, Moon } from "./Icons";

interface SettingsViewProps {
  dark: boolean;
  setDark: (v: boolean) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface AppSettings {
  outputChannel: string;
  stylePrompt: string;
  dedupHours: number;
  maxPerCycle: number;
}

const DEFAULT: AppSettings = {
  outputChannel: "@dealsforindia",
  stylePrompt: "Write in a casual, enthusiastic style. Use emojis sparingly. Highlight the key benefits and price clearly. Keep under 900 characters.",
  dedupHours: 24,
  maxPerCycle: 40,
};

export default function SettingsView({ dark, setDark, onToast }: SettingsViewProps) {
  const [s, setS] = useState<AppSettings>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setS((prev) => ({
              ...prev,
              outputChannel: data.settings.CURATED_CHANNEL || prev.outputChannel,
              stylePrompt: data.settings.AI_STYLE_PROMPT || prev.stylePrompt,
              dedupHours: data.settings.FP_TTL_HOURS || prev.dedupHours,
              maxPerCycle: data.settings.MAX_POSTS_CYCLE || prev.maxPerCycle,
            }));
          }
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CURATED_CHANNEL: s.outputChannel,
          AI_STYLE_PROMPT: s.stylePrompt,
          FP_TTL_HOURS: s.dedupHours,
          MAX_POSTS_CYCLE: s.maxPerCycle,
        }),
      });
      if (res.ok) {
        setSaved(true);
        onToast("Settings saved", "success");
        setTimeout(() => setSaved(false), 2500);
      } else {
        onToast("Failed to save settings", "error");
      }
    } catch {
      onToast("Error saving settings", "error");
    }
  };

  const section = (label: string, children: React.ReactNode) => (
    <div className="flex-shrink-0 rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>{label}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );

  const fieldLabel = (label: string, sub?: string) => (
    <div className="mb-2">
      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "#E63946" }} />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex-shrink-0"
        style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.07) 0%,var(--bg-card) 60%)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
            <span className="text-lg">⚙️</span>
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Settings</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Bot pipeline configuration</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 max-w-2xl mx-auto flex flex-col gap-5">

      {section("Appearance",
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Theme</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{dark ? "Dark mode active" : "Light mode active"}</p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-fast hover:opacity-80"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      )}

      {section("Output",
        <div className="flex flex-col gap-5">
          <div>
            {fieldLabel("Output Channel", "Telegram channel where approved deals are posted.")}
            <input
              value={s.outputChannel}
              onChange={(e) => setS((v) => ({ ...v, outputChannel: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-fast font-mono"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}
            />
          </div>
          <div>
            {fieldLabel(`Max Posts per Cycle — `, "Maximum deals to post per scrape cycle.")}
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={50} value={s.maxPerCycle}
                onChange={(e) => setS((v) => ({ ...v, maxPerCycle: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-bold font-mono w-8 text-right" style={{ color: "#E63946", fontFamily: "'JetBrains Mono',monospace" }}>
                {s.maxPerCycle}
              </span>
            </div>
            <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
              <span>1</span><span>50</span>
            </div>
          </div>
        </div>
      )}

      {section("AI Rewrite",
        <div>
          {fieldLabel("Style Prompt", "Instruction given to AI when rewriting deal posts.")}
          <textarea
            value={s.stylePrompt}
            onChange={(e) => setS((v) => ({ ...v, stylePrompt: e.target.value }))}
            rows={4}
            className="w-full px-3.5 py-3 rounded-xl text-sm focus:outline-none resize-none transition-fast"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
      )}

      {section("Deduplication",
        <div>
          {fieldLabel("FP Hash TTL", "Deals with the same fingerprint within this window are blocked as duplicates.")}
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={72} value={s.dedupHours}
              onChange={(e) => setS((v) => ({ ...v, dedupHours: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm font-bold font-mono w-10 text-right" style={{ color: "#E63946", fontFamily: "'JetBrains Mono',monospace" }}>
              {s.dedupHours}h
            </span>
          </div>
          <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace" }}>
            <span>1h</span><span>72h</span>
          </div>
        </div>
      )}

      {section("API Keys",
        <div className="flex flex-col gap-2">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Keys are server-side only and not exposed in the UI.</p>
          {["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "EARNKARO_API_KEY"].map((k) => (
            <div key={k} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <Shield size={11} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-mono flex-1" style={{ color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{k}</span>
              <CheckCircle2 size={12} style={{ color: "#16a34a" }} />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={save}
        className="flex-shrink-0 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-fast active:scale-[0.98]"
        style={{
          background: saved ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#E63946,#c0392b)",
          boxShadow: `0 4px 24px ${saved ? "rgba(22,163,74,0.28)" : "rgba(230,57,70,0.28)"}`,
        }}
      >
        {saved ? <><CheckCircle2 size={15} /> Saved!</> : <><Check size={15} /> Save Settings</>}
      </button>

      </div>
    </div>
  );
}
