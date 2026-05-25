import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useAnyModalOpen } from "@/components/bottom-navigation";

export interface StickyTabDef {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface StickyPubTabsProps {
  tabs: StickyTabDef[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function StickyPubTabs({ tabs, activeTab, onTabChange }: StickyPubTabsProps) {
  const isAnyModalOpen = useAnyModalOpen();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const node = (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-[55] bg-white dark:bg-[#12151A] rounded-t-[32px] border-t border-x border-[#E8DED1] dark:border-white/[0.06] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)] transition-opacity duration-200 ${
        isAnyModalOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="tablist"
      aria-label="Sezioni del pub"
      data-testid="sticky-pub-tabs"
    >
      <div className="max-w-md mx-auto flex items-stretch justify-between px-1 py-1.5 gap-1">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.value)}
              data-testid={`pub-tab-${tab.value}`}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition-colors duration-200 active:scale-95 ${
                isActive
                  ? "text-[#F59E0B]"
                  : "text-[#6B6357] dark:text-[#B7BDC7] hover:text-[#151515] dark:hover:text-[#F5F5F5]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="pub-tab-pill"
                  className="absolute inset-0 rounded-2xl bg-[#FFF7EA] dark:bg-[#F59E0B]/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center justify-center [&>svg]:h-[20px] [&>svg]:w-[20px]">
                {tab.icon}
              </span>
              <span
                className={`relative z-10 text-[10px] leading-none tracking-tight ${
                  isActive ? "font-bold" : "font-semibold"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(node, document.body);
}
