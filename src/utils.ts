import type { Deal, DailyStats } from "./types";

export const API_BASE = "https://api.rudranil.me";
export const WS_URL = "wss://api.rudranil.me/ws";

export const fmt = (p: number) => (p === 0 ? "Free" : `₹${p.toLocaleString("en-IN")}`);

export const fmtAgo = (ts: number) => {
  const d = Math.floor(Date.now() / 1000 - ts);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
};

export const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const scoreColor = (s: number) =>
  s === 0 ? "#6b7280" : s >= 75 ? "#16a34a" : s >= 50 ? "#f59e0b" : "#dc2626";

export const catColor: Record<string, string> = {
  Electronics: "#7C3AED",
  Fashion: "#ec4899",
  "Home & Kitchen": "#f59e0b",
  Home: "#f59e0b",
  Beauty: "#f472b6",
  Sports: "#10b981",
  Banking: "#f59e0b",
  Food: "#f97316",
  Computers: "#06b6d4",
  General: "#9496B8",
  Grocery: "#10b981",
  Travel: "#06b6d4",
  Books: "#f59e0b",
  Kids: "#f97316",
  Gaming: "#7C3AED",
};

export const discBg = (pct: number) =>
  pct >= 70 ? "#dc2626" : pct >= 40 ? "#ea580c" : "#16a34a";

export const extractEmoji = (cat: string) => cat.split(" ")[0] || "🛍️";
export const extractCatName = (cat: string) => cat.split(" ").slice(1).join(" ") || cat;

export const toChName = (ch?: string): string => {
  if (!ch) return "";
  if (ch.includes("bblbblp") || ch === "-1003871814319") return "redditcontent";
  const clean = ch.replace(/^@/, "");
  if (/^-?\d+$/.test(clean)) return clean;
  return clean
    .split(/[_-]/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
};

export const buildVerdict = (s: number | null) =>
  s === null
    ? "Unrated — review manually."
    : s >= 8
      ? "Strong deal — high confidence score."
      : s >= 6
        ? "Decent deal — worth reviewing."
        : s >= 4
          ? "Borderline — check if genuine."
          : "Low quality — likely spam.";

export const buildSignals = (d: {
  prices: { discount_pct: number | null };
  affiliate_applied: boolean;
  coupon: string | null;
  bank_offers?: string[];
  platforms?: string[];
  flash?: unknown;
}): string[] => {
  const s: string[] = [];
  if (d.prices.discount_pct && d.prices.discount_pct > 0)
    s.push(`${Math.round(d.prices.discount_pct)}% off`);
  if (d.affiliate_applied) s.push("Affiliated");
  if (d.coupon) s.push(`COUPON:${d.coupon}`);
  if (d.bank_offers && d.bank_offers.length > 0)
    s.push(`${d.bank_offers.length} bank offer${d.bank_offers.length > 1 ? "s" : ""}`);
  if (d.platforms?.[0]) s.push(d.platforms[0]);
  if (d.flash) s.push("Flash sale");
  return s.slice(0, 4);
};

export const extractUrls = (text: string): string[] => [
  ...((text.match(/https?:\/\/[^\s]+/g)) || []),
];

export const stripAffTag = (url: string): string => {
  try {
    const u = new URL(url);
    u.searchParams.delete("tag");
    u.searchParams.delete("ref");
    u.searchParams.delete("smid");
    return u.toString();
  } catch {
    return url;
  }
};

export const EMPTY_STATS: DailyStats = {
  date: new Date().toISOString().split("T")[0],
  posted: 0,
  checked: 0,
  dup: 0,
  unrated: 0,
  affiliate: 0,
  auto_posted: 0,
  scam: 0,
};

// ── API helpers ───────────────────────────────────────────────────────────────

interface RawDeal {
  fp_hash?: string;
  prod_name?: string;
  prices: { sale?: number | null; mrp?: number | null; discount_pct?: number | null };
  category: string;
  source_channel: string;
  score?: number | null;
  deal_type?: string;
  affiliate_applied: boolean;
  coupon?: string | null;
  img_url?: string;
  img_path?: string;
  platforms?: string[];
  original_text?: string;
  aff_text?: string;
  ts: number;
  bank_offers?: string[];
  flash?: unknown;
  auto_posted?: boolean;
  _forceStatus?: import("./types").DealStatus;
}

export function mapRawToDeal(d: RawDeal, fallbackId?: string): Deal {
  const id = d.fp_hash ?? fallbackId ?? String(d.ts);
  let imgUrl = "";
  if (d.img_url && !d.img_url.includes("74.225.250.0")) imgUrl = d.img_url;
  else if (d.img_url?.includes("74.225.250.0")) {
    const match = d.img_url.match(/\/images\/(.+)$/);
    if (match) imgUrl = `${API_BASE}/images/${match[1]}`;
  } else if (d.img_path) {
    const fname = d.img_path.includes("/images/")
      ? "images/" + d.img_path.split("/images/").pop()
      : d.img_path;
    imgUrl = `${API_BASE}/${fname}`;
  }

  return {
    id,
    title: d.prod_name || "Untitled Deal",
    price: d.prices.sale ?? 0,
    mrp: d.prices.mrp ?? 0,
    discount: d.prices.discount_pct ?? 0,
    category: extractCatName(d.category),
    catEmoji: extractEmoji(d.category),
    channel: toChName(d.source_channel),
    channelRaw: d.source_channel,
    score: d.score != null ? Math.min(100, Math.round(d.score * 10)) : 0,
    ts: Math.floor(d.ts),
    status: d._forceStatus ?? "pending",
    dealType: d.deal_type === "trick" ? "trick" : "product",
    affiliate: d.affiliate_applied,
    coupon: d.coupon ?? null,
    imgUrl,
    platforms: d.platforms || [],
    originalText: d.original_text || "",
    affText: d.aff_text || d.original_text || "",
    verdict: buildVerdict(d.score ?? null),
    signals: buildSignals({
      prices: { discount_pct: d.prices.discount_pct ?? null },
      affiliate_applied: d.affiliate_applied,
      coupon: d.coupon ?? null,
      bank_offers: d.bank_offers,
      platforms: d.platforms,
      flash: d.flash,
    }),
    autoPosted: d.auto_posted ?? false,
  };
}

export async function fetchPendingDeals(): Promise<Deal[]> {
  const [pendingRes, recentRes] = await Promise.all([
    fetch(`${API_BASE}/api/v1/deals/pending?limit=1000`).catch(() => null),
    fetch(`${API_BASE}/api/v1/deals/recent?limit=300`).catch(() => null),
  ]);
  let rows: (RawDeal & { _forceStatus?: import("./types").DealStatus })[] = [];
  if (pendingRes?.ok) {
    const data = await pendingRes.json();
    const list = Array.isArray(data?.deals) ? data.deals : Array.isArray(data) ? data : [];
    rows = rows.concat(list.map((d: RawDeal) => ({ ...d, _forceStatus: "pending" as const })));
  }
  if (recentRes?.ok) {
    const data = await recentRes.json();
    const list = Array.isArray(data?.deals) ? data.deals : Array.isArray(data) ? data : [];
    rows = rows.concat(list.map((d: RawDeal) => ({ ...d, _forceStatus: "approved" as const })));
  }
  return rows
    .map((d, i) => mapRawToDeal(d, String(i)))
    .sort((a, b) => b.ts - a.ts);
}

export async function fetchDailyStats(): Promise<DailyStats> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/stats`);
    if (res.ok) return await res.json();
  } catch {}
  return EMPTY_STATS;
}

export async function apiApprove(id: string, changes?: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes ?? {}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiReject(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/reject`, { method: "PUT" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiEdit(id: string, changes: Record<string, unknown>): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = {};
    if ("title" in changes) payload.prod_name = changes.title;
    if ("affText" in changes) payload.aff_text = changes.affText;
    if ("imgUrl" in changes) payload.img_url = changes.imgUrl;
    if ("price" in changes || "mrp" in changes) {
      payload.prices = { sale: changes.price, mrp: changes.mrp };
    }
    if ("coupon" in changes) payload.coupon = changes.coupon;
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiRetryAffiliate(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/retry-affiliate`, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.aff_text || data.affText || null;
  } catch {
    return null;
  }
}

export async function apiScrapeImage(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/scrape-image`, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.img_url || data.imgUrl || null;
  } catch {
    return null;
  }
}

export async function apiSpam(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/spam`, { method: "PUT" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiAiRewrite(id: string, instruction: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/${id}/ai-rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || data.rewritten_text || null;
  } catch {
    return null;
  }
}

export async function fetchDesiDeals(): Promise<Deal[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/desidime?limit=60`);
    if (res.ok) {
      const data = await res.json();
      const rows: RawDeal[] = Array.isArray(data?.deals)
        ? data.deals
        : Array.isArray(data)
          ? data
          : Object.entries(data as Record<string, RawDeal>).map(([k, v]) => ({
              ...v,
              fp_hash: k,
            }));
      if (rows.length > 0) return rows.map((d, i) => ({ ...mapRawToDeal(d, String(i)), channel: "DesiDime" }));
    }
  } catch {}
  return [];
}

export async function apiCompose(payload: {
  title: string;
  price: number;
  mrp: number;
  imgUrl: string;
  text: string;
  category: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/deals/compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prod_name: payload.title,
        prices: { sale: payload.price, mrp: payload.mrp },
        img_url: payload.imgUrl,
        aff_text: payload.text,
        category: payload.category,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
