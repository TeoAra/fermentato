import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { User, Store, Factory } from "lucide-react";

type CurrentView = "profile" | "pub" | "brewery";

const ROLE_CONFIG: Record<string, { view: CurrentView; label: string; icon: typeof User; href: string; role: string }> = {
  profile:  { view: "profile",  label: "Profilo utente",     icon: User,    href: "/profile",            role: "customer" },
  pub:      { view: "pub",      label: "Gestione pub",        icon: Store,   href: "/dashboard",          role: "pub_owner" },
  brewery:  { view: "brewery",  label: "Dashboard birrificio", icon: Factory, href: "/brewery-dashboard",  role: "brewery_owner" },
};

interface RoleSwitcherBannerProps {
  currentView: CurrentView;
}

export function RoleSwitcherBanner({ currentView }: RoleSwitcherBannerProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const typedUser = user as any;

  const userRoles: string[] = typedUser?.roles || [];
  const userType: string = typedUser?.userType || "customer";

  const hasPub      = userRoles.includes("pub_owner")      || userType === "pub_owner";
  const hasBrewery  = userRoles.includes("brewery_owner")  || userType === "brewery_owner";
  const hasAdmin    = userRoles.includes("admin")          || userType === "admin";

  if (!hasPub && !hasBrewery && !hasAdmin) return null;

  const targets: CurrentView[] = [];
  if (currentView !== "profile") targets.push("profile");
  if (hasPub     && currentView !== "pub")     targets.push("pub");
  if (hasBrewery && currentView !== "brewery") targets.push("brewery");

  if (targets.length === 0) return null;

  const currentConfig = ROLE_CONFIG[currentView];

  function switchTo(view: CurrentView) {
    const config = ROLE_CONFIG[view];
    // Navigate immediately — critical for iOS Safari which feels laggy with async-before-navigate.
    // The role switch is fire-and-forget; the cache invalidation will refresh user data shortly after.
    navigate(config.href);
    apiRequest("/api/auth/switch-role", { method: "POST" }, { role: config.role })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }))
      .catch(() => {});
  }

  const bgClass = {
    profile:  "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/60",
    pub:      "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40",
    brewery:  "bg-stone-50 dark:bg-orange-900/20 border-stone-300 dark:border-[#23262E]/40",
  }[currentView];

  const textClass = {
    profile:  "text-neutral-600 dark:text-neutral-300",
    pub:      "text-amber-800 dark:text-amber-200",
    brewery:  "text-orange-800 dark:text-orange-200",
  }[currentView];

  const linkClass = {
    profile:  "text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200",
    pub:      "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100",
    brewery:  "text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100",
  }[currentView];

  const CurrentIcon = currentConfig.icon;

  return (
    <div className={`flex items-center justify-between border rounded-xl px-4 py-2.5 ${bgClass}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${textClass}`}>
        <CurrentIcon className="h-4 w-4" />
        {currentConfig.label}
      </div>
      <div className="flex items-center gap-3">
        {targets.map((view) => {
          const cfg = ROLE_CONFIG[view];
          const Icon = cfg.icon;
          return (
            <button
              key={view}
              onClick={() => switchTo(view)}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors px-2 py-1.5 -my-1 rounded-lg active:opacity-70 ${linkClass}`}
            >
              <Icon className="h-4 w-4" />
              {cfg.label} →
            </button>
          );
        })}
      </div>
    </div>
  );
}
