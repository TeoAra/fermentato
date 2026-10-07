import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAnyModalOpen } from "@/components/bottom-navigation";
import { CircleHelp } from "lucide-react";
import { FloatingBottomBar } from "@/components/floating-bottom-bar";

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
    <FloatingBottomBar
      label="Sezioni del locale"
      testId="sticky-pub-tabs"
      hidden={isAnyModalOpen}
      role="tablist"
      items={tabs.map((tab) => ({
        id: tab.value,
        label: tab.label,
        icon: tab.icon ?? <CircleHelp />,
        active: tab.value === activeTab,
        role: "tab" as const,
        onClick: () => onTabChange(tab.value),
        testId: `pub-tab-${tab.value}`,
      }))}
    />
  );

  return createPortal(node, document.body);
}
