import { motion } from "framer-motion";
import type { ReactNode } from "react";
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
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8DED1] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] transition-opacity duration-200 ${
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
                isActive ? "text-[#F59E0B]" : "text-[#6B6357] hover:text-[#151515]"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="pub-tab-pill"
                  className="absolute inset-0 rounded-2xl bg-[#FFF7EA]"
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
}
