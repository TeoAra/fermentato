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
      className={`fixed left-0 right-0 z-40 transition-opacity duration-200 ${
        isAnyModalOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      role="tablist"
      aria-label="Sezioni del pub"
      data-testid="sticky-pub-tabs"
    >
      <div className="mx-auto max-w-md px-4">
        <div className="bg-white/85 backdrop-blur-2xl rounded-[28px] border border-[#E8DED1] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)]">
          <div className="flex items-stretch justify-between p-1.5 gap-1">
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
                  className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-[20px] transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "text-[#6B6357] hover:text-[#151515]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="pub-tab-pill"
                      className="absolute inset-0 rounded-[20px] bg-[#F59E0B]/10"
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
        </div>
      </div>
    </nav>
  );
}
