import type { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export interface FloatingBottomBarItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  role?: "tab";
  testId?: string;
}

interface FloatingBottomBarProps {
  label: string;
  items: FloatingBottomBarItem[];
  hidden?: boolean;
  role?: "tablist";
  testId?: string;
  className?: string;
}

function ItemContent({ item }: { item: FloatingBottomBarItem }) {
  return (
    <>
      <span className="floating-bottom-bar__icon" aria-hidden="true">
        {item.icon}
        {item.badge}
      </span>
      <span className="sr-only">{item.label}</span>
    </>
  );
}

export function FloatingBottomBar({
  label,
  items,
  hidden = false,
  role,
  testId,
  className,
}: FloatingBottomBarProps) {
  const selectedTabId = items.find(item => item.role === "tab" && item.active)?.id
    ?? items.find(item => item.role === "tab")?.id;
  return (
    <nav
      aria-label={label}
      aria-hidden={hidden || undefined}
      role={role}
      className={cn("floating-bottom-bar bottom-nav-fixed lg:hidden", hidden && "is-hidden", className)}
      data-floating-bottom-bar
      data-hidden={hidden ? "true" : "false"}
      data-testid={testId}
      onKeyDown={role === "tablist" ? event => {
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
        const current = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
        const index = current ? tabs.indexOf(current) : -1;
        if (index < 0) return;
        if (event.key === " ") {
          event.preventDefault();
          current?.click();
          return;
        }
        let next: number;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
      } : undefined}
    >
      <div className="floating-bottom-bar__items">
        {items.map((item) => {
          const commonProps = {
            "aria-label": item.label,
            title: item.label,
            "aria-current": item.active && item.role !== "tab" ? ("page" as const) : undefined,
            "aria-selected": item.role === "tab" ? Boolean(item.active) : undefined,
            role: item.role,
            tabIndex: hidden ? -1 : item.role === "tab" ? (item.id === selectedTabId ? 0 : -1) : undefined,
            "data-active": item.active ? "true" : "false",
            "data-nav-item": item.id,
            "data-testid": item.testId,
            className: cn(
              "floating-bottom-bar__item",
              item.active && "is-active",
            ),
          };
          const content = <ItemContent item={item} />;

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} {...commonProps}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-pressed={item.role ? undefined : Boolean(item.active)}
              {...commonProps}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
