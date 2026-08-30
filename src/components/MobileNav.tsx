import type { Tab } from "../types";
import { Flame, CheckSquare, Radio, Settings2, ShoppingBag } from "./Icons";

const NAV: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "Review", icon: Flame, label: "Review" },
  { id: "DesiDime", icon: ShoppingBag, label: "Deals" },
  { id: "Posted", icon: CheckSquare, label: "Posted" },
  { id: "Channels", icon: Radio, label: "Channels" },
  { id: "Settings", icon: Settings2, label: "Settings" },
];

interface MobileNavProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  pending: number;
}

export default function MobileNav({ tab, setTab, pending }: MobileNavProps) {
  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-stretch border-t"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border)",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {NAV.map(({ id, icon: Icon, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-fast"
            style={{ color: active ? "#E63946" : "var(--text-dim)" }}
          >
            {active && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full"
                style={{ background: "#E63946" }}
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
            {id === "Review" && pending > 0 && (
              <span
                className="absolute top-2 right-[calc(50%-20px)] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white"
                style={{ background: "#E63946" }}
              >
                {pending > 9 ? "9+" : pending}
              </span>
            )}
            {id === "DesiDime" && (
              <span
                className="absolute top-2 right-[calc(50%-20px)] w-2 h-2 rounded-full"
                style={{ background: "#06b6d4" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
