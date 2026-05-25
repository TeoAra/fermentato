import { motion } from "framer-motion";
import type { ReactNode } from "react";

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
  return (
    <div
      className="sticky top-0 z-30 bg-[#FAF7F1]/90 backdrop-blur-md border-b border-[#E8DED1]"
      role="tablist"
      aria-label="Sezioni del pub"
      data-testid="sticky-pub-tabs"
    >
      <div className="max-w-[720px] mx-auto">
        <div className="flex overflow-x-auto no-scrollbar px-2">
          {tabs.map((tab) => {
            const isActive = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.value)}
                className={`relative flex-shrink-0 h-12 min-h-[44px] px-4 inline-flex items-center gap-1.5 text-sm font-bold transition-colors ${
                  isActive ? "text-[#F59E0B]" : "text-[#6B6357] hover:text-[#151515]"
                }`}
                data-testid={`pub-tab-${tab.value}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="pub-tab-underline"
                    className="absolute left-2 right-2 -bottom-px h-[3px] rounded-full bg-[#F59E0B]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
