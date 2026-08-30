import { useEffect } from "react";
import { X, Maximize2 } from "./Icons";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      <div
        className="relative animate-scale-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt=""
          className="max-w-[92vw] max-h-[86dvh] object-contain rounded-2xl"
          style={{ boxShadow: "0 0 80px rgba(0,0,0,0.6)" }}
        />
        <button
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-fast"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      <p className="absolute bottom-5 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        Click anywhere to close · ESC
      </p>
    </div>
  );
}
