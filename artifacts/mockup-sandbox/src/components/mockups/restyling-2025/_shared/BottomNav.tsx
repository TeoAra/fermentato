import { Home, Bell, Search, ScanLine, Activity, User } from "lucide-react";

interface BottomNavProps {
  active?: "home" | "notifiche" | "cerca" | "scan" | "attivita" | "account";
  theme?: "dark" | "light";
}

const TABS = [
  { id: "home", icon: Home, label: "Home" },
  { id: "notifiche", icon: Bell, label: "Notifiche" },
  { id: "cerca", icon: Search, label: "Cerca" },
  { id: "scan", icon: ScanLine, label: "Scan" },
  { id: "attivita", icon: Activity, label: "Attività" },
  { id: "account", icon: User, label: "Account" },
] as const;

export function BottomNav({ active = "home", theme = "dark" }: BottomNavProps) {
  const isDark = theme === "dark";
  return (
    <nav
      className="absolute bottom-0 left-0 right-0"
      style={{
        background: isDark
          ? "rgba(13, 8, 5, 0.97)"
          : "rgba(255,255,255,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: isDark
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center h-[54px]">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          const activeColor = "#f77104";
          const inactiveColor = isDark ? "#5a4432" : "#9e8d78";
          return (
            <button
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center gap-[2px] h-full transition-all"
              style={{ color: isActive ? activeColor : inactiveColor }}
            >
              <Icon
                style={{ width: isActive ? 22 : 20, height: isActive ? 22 : 20 }}
                strokeWidth={isActive ? 2.3 : 1.7}
              />
              <span
                className="text-[9px] font-semibold leading-none"
                style={{ letterSpacing: "0.01em" }}
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
