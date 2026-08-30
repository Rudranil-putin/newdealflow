import { useState, useRef, useCallback } from "react";
import { X, Check, Upload } from "./Icons";
import { apiCompose, API_BASE } from "../utils";

const CATEGORIES = [
  "🔌 Electronics", "👗 Fashion", "🏠 Home & Kitchen", "💄 Beauty",
  "⚽ Sports", "💳 Banking", "🍔 Food", "💻 Computers",
  "🛒 Grocery", "✈️ Travel", "📚 Books", "🎮 Gaming", "🎁 General",
];

async function uploadImage(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/api/v1/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      return d.url || d.img_url || d.path || null;
    }
  } catch {}
  return null;
}

interface ComposeModalProps {
  onClose: () => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function ComposeModal({ onClose, onToast }: ComposeModalProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { onToast("Only image files", "error"); return; }
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImgPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to backend
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) {
      setImgUrl(url);
      setImgPreview(url);
      onToast("Image uploaded ✓", "success");
    } else {
      // Fallback: keep local data URL as preview, but warn
      onToast("Upload failed — image preview only", "info");
    }
  }, [onToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/"));
    if (file) handleFile(file);
  }, [handleFile]);

  const submit = async (approve = true) => {
    if (!title.trim()) { onToast("Title is required", "error"); return; }
    setSubmitting(true);
    const ok = await apiCompose({
      title: title.trim(),
      price: Number(price) || 0,
      mrp: Number(mrp) || 0,
      imgUrl: imgUrl.trim(),
      text: text.trim(),
      category,
    });
    setSubmitting(false);
    if (ok) {
      onToast(approve ? "Deal composed & approved ✓" : "Deal saved as draft", "success");
      onClose();
    } else {
      onToast("Compose failed — check API connection", "error");
    }
  };

  const clearImage = () => { setImgUrl(""); setImgPreview(""); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPaste={onPaste}
    >
      <div
        className="w-full md:max-w-lg max-h-[92dvh] flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(230,57,70,0.15)" }}>
            <span className="text-base">✍️</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Compose Deal</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Paste an image anywhere · Ctrl+V</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-fast" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Category */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-fast"
                  style={{
                    background: category === cat ? "rgba(230,57,70,0.12)" : "var(--bg-secondary)",
                    color: category === cat ? "#E63946" : "var(--text-muted)",
                    border: category === cat ? "1px solid rgba(230,57,70,0.25)" : "1px solid transparent",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-dim)" }}>
              Title <span style={{ color: "#E63946" }}>*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product name @ ₹Price"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-fast"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            {([["Sale Price (₹)", price, setPrice], ["MRP (₹)", mrp, setMrp]] as const).map(([label, val, setter]) => (
              <div key={label}>
                <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-dim)" }}>{label}</label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-fast"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}
                />
              </div>
            ))}
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-dim)" }}>Product Image</label>

            {imgPreview ? (
              /* Preview */
              <div className="relative rounded-xl overflow-hidden" style={{ height: 160 }}>
                <img src={imgPreview} alt="preview" className="w-full h-full object-contain" style={{ background: "var(--bg-secondary)" }} />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                >
                  <X size={12} />
                </button>
                {imgUrl && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono truncate max-w-[80%]" style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)" }}>
                    {imgUrl}
                  </div>
                )}
              </div>
            ) : (
              /* Drop zone */
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-2.5 py-8 cursor-pointer transition-fast"
                style={{
                  border: `2px dashed ${dragging ? "#E63946" : "var(--border)"}`,
                  background: dragging ? "rgba(230,57,70,0.05)" : "var(--bg-secondary)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(230,57,70,0.1)" }}>
                  <Upload size={18} style={{ color: "#E63946" }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Drop image or click to browse</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>PNG, JPG, WebP · or Paste Ctrl+V</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            )}

            {/* Manual URL input */}
            <input
              value={imgUrl}
              onChange={(e) => { setImgUrl(e.target.value); if (e.target.value) setImgPreview(e.target.value); else setImgPreview(""); }}
              placeholder="or paste image URL…"
              className="w-full mt-2 px-3 py-2 rounded-xl text-xs focus:outline-none transition-fast"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}
            />
          </div>

          {/* Post text */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-dim)" }}>Post Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Write the Telegram post text here…"
              className="w-full px-3.5 py-3 rounded-xl focus:outline-none resize-none transition-fast text-sm"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2.5 px-5 py-3.5 border-t flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-fast"
            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => submit(false)}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-fast disabled:opacity-40"
            style={{ background: "var(--bg-secondary)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Save Draft
          </button>
          <button
            onClick={() => submit(true)}
            disabled={submitting || uploading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-fast active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#E63946,#c0392b)", boxShadow: "0 4px 20px rgba(230,57,70,0.3)" }}
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={14} /> Compose & Approve</>}
          </button>
        </div>
      </div>
    </div>
  );
}
