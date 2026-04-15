import { Home, Bell, Search, ScanLine, Activity, User } from "lucide-react";

interface BottomNavProps {
  active?: "home" | "notifiche" | "cerca" | "scan" | "attivita" | "account";
}

const tabs = [
  { id: "home", icon: Home, label: "Home" },
  { id: "notifiche", icon: Bell, label: "Notifiche" },
  { id: "cerca", icon: Search, label: "Cerca" },
  { id: "scan", icon: ScanLine, label: "Scan" },
  { id: "attivita", icon: Activity, label: "Attività" },
  { id: "account", icon: User, label: "Account" },
] as const;

export function BottomNav({ active = "home" }: BottomNavProps) {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#ece5dc]/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center h-[54px]">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`flex-1 flex flex-col items-center justify-center gap-[2px] h-full transition-colors ${
                isActive ? "text-[#ea580c]" : "text-[#9e8d78]"
              }`}
            >
              <Icon
                className="w-[21px] h-[21px] transition-transform"
                strokeWidth={isActive ? 2.4 : 1.7}
                fill={isActive ? "currentColor" : "none"}
                style={isActive ? { fillOpacity: 0.12 } : {}}
              />
              <span
                className="text-[9.5px] font-semibold leading-none"
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
