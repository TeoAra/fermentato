/**
 * DesktopAnchorNav — horizontal anchor-link strip, desktop-only (lg:flex).
 * Smooth-scrolls to sections identified by `id` and highlights the active
 * section using IntersectionObserver.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface AnchorNavTab {
  value: string;   // matches the section id: `section-<value>`
  label: string;
  icon?: ReactNode;
}

interface Props {
  tabs: AnchorNavTab[];
}

const SECTION_PREFIX = "section-";

export default function DesktopAnchorNav({ tabs }: Props) {
  const [activeSection, setActiveSection] = useState<string>(tabs[0]?.value ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Map of sectionId → ratio visible — we pick the one with highest ratio
    const ratioMap: Record<string, number> = {};

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.replace(SECTION_PREFIX, "");
          ratioMap[id] = entry.intersectionRatio;
        }
        // Active = section with highest intersection ratio (prefer first on tie)
        let best = "";
        let bestRatio = -1;
        for (const tab of tabs) {
          const r = ratioMap[tab.value] ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = tab.value;
          }
        }
        if (best && bestRatio > 0) setActiveSection(best);
      },
      {
        root: null,
        // Trigger at multiple thresholds for smooth tracking
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        // Top margin accounts for sticky header (68px) + anchor nav (~48px).
        // Bottom margin shrinks the detection zone so only the section
        // currently occupying the upper half of the viewport wins.
        rootMargin: "-120px 0px -40% 0px",
      },
    );

    for (const tab of tabs) {
      const el = document.getElementById(`${SECTION_PREFIX}${tab.value}`);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [tabs]);

  const scrollToSection = (value: string) => {
    const el = document.getElementById(`${SECTION_PREFIX}${value}`);
    if (!el) return;
    // Offset = desktop header (68px) + this nav bar + a little breathing room
    const HEADER_HEIGHT = 68;
    const navHeight = navRef.current?.offsetHeight ?? 48;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - navHeight - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSection(value);
  };

  return (
    <div
      ref={navRef}
      className="hidden lg:flex sticky top-[68px] z-40 bg-[#FAF7F1]/90 dark:bg-[#0B0D10]/90 backdrop-blur-md border-b border-[#E8DED1] dark:border-white/[0.06]"
    >
      <nav
        className="max-w-7xl mx-auto w-full px-8 flex items-center gap-1"
        aria-label="Navigazione sezioni"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === activeSection;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollToSection(tab.value)}
              className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors duration-150 whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "border-[#F59E0B] text-[#F59E0B]"
                  : "border-transparent text-[#6B6357] dark:text-[#B7BDC7] hover:text-[#151515] dark:hover:text-[#F5F5F5]"
              }`}
            >
              {tab.icon && (
                <span className="[&>svg]:h-[16px] [&>svg]:w-[16px]">{tab.icon}</span>
              )}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* hidden ref for indicator measurement */}
      <span ref={indicatorRef} className="sr-only" aria-hidden />
    </div>
  );
}
