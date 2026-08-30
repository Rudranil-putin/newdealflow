export type DealStatus = "pending" | "approved" | "rejected" | "draft";
export type DealType = "product" | "trick";
export type Tab = "Review" | "DesiDime" | "Posted" | "Channels" | "Settings";
export type WSStatus = "connected" | "reconnecting" | "disconnected";
export type SortMode = "score" | "latest" | "discount";
export type FilterMode = "pending" | "approved" | "rejected" | "all";

export interface Deal {
  id: string;
  title: string;
  price: number;
  mrp: number;
  discount: number;
  category: string;
  catEmoji: string;
  channel: string;
  channelRaw: string;
  score: number;
  ts: number;
  status: DealStatus;
  dealType: DealType;
  affiliate: boolean;
  coupon: string | null;
  imgUrl: string;
  platforms: string[];
  originalText: string;
  affText: string;
  verdict: string;
  signals: string[];
  autoPosted?: boolean;
}

export interface DailyStats {
  date: string;
  posted: number;
  checked: number;
  dup: number;
  unrated: number;
  affiliate: number;
  auto_posted: number;
  scam: number;
}

export interface Channel {
  id: string;
  name: string;
  active: boolean;
  deals: number;
  deals_24h?: number;
  color: string;
}

export interface AppSettings {
  outputChannel: string;
  stylePrompt: string;
  dedupHours: number;
  maxPerCycle: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
