import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Beer, Search, Bell, User, LogOut, Shield, Store, Activity, Building2, ChevronDown } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SearchResults from "@/components/search-results";
import SearchDialog from "@/components/search-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_LINKS = [
  { label: "Birrifici",   href: "/explore/breweries" },
  { label: "Pub & Locali", href: "/explore/pubs" },
  { label: "Birre",       href: "/search" },
  { label: "Festival",    href: "/festival" },
  { label: "Prezzi",      href: "/prezzi" },
];

const roleLabels: Record<string, string> = {
  customer: "Utente",
  pub_owner: "Pub Owner",
  brewery_owner: "Brewery Owner",
  admin: "Admin",
};
const roleIcons: Record<string, any> = {
  customer: User,
  pub_owner: Store,
  brewery_owner: Beer,
  admin: Shield,
};

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const typedUser = user as UserType | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults]  = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const hasMultipleRoles = (typedUser?.roles?.length ?? 0) > 1;

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && hasMultipleRoles,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      apiRequest("/api/auth/switch-role", { method: "POST" }, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeRole = (typedUser as any)?.activeRole || typedUser?.userType || "customer";

  return (
    <>
      {/* ── Desktop header — brutalista editorial ── */}
      <header className="hidden lg:block sticky top-0 z-50">
        {/* Top accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #111009 0%, #d97706 50%, #111009 100%)" }} />

        {/* Main header bar */}
        <div style={{ background: "#fafaf8", borderBottom: "2px solid #111009" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 64, gap: 0 }}>

            {/* Logo */}
            <Link href="/" style={{ flexShrink: 0, marginRight: 40, textDecoration: "none" }}>
              <img src="/logo-full.png" alt="Fermenta.to" style={{ height: 36, width: "auto" }} />
            </Link>

            {/* Main nav */}
            <nav style={{ display: "flex", alignItems: "stretch", flex: 1, height: "100%" }}>
              {NAV_LINKS.map(({ label, href }) => {
                const isActive = href === "/" ? location === "/" : location.startsWith(href);
                return (
                  <Link key={href} href={href} style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", height: "100%",
                      padding: "0 16px", position: "relative", cursor: "pointer",
                      fontSize: 13, fontWeight: isActive ? 800 : 600,
                      color: isActive ? "#111009" : "#9d8e86",
                      letterSpacing: isActive ? "-0.01em" : "0",
                      transition: "color 0.15s",
                      borderRight: "none",
                    }}>
                      {label}
                      {/* Active underline indicator */}
                      {isActive && (
                        <span style={{
                          position: "absolute", bottom: 0, left: 8, right: 8,
                          height: 3, background: "#d97706", borderRadius: "3px 3px 0 0",
                        }} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Search bar */}
            <div ref={searchRef} style={{ width: 220, flexShrink: 0, marginRight: 12, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", border: "2px solid #111009", borderRadius: 6, height: 36, overflow: "hidden", boxShadow: "2px 2px 0 #111009", background: "#fafaf8" }}>
                <Search size={13} color="#9d8e86" style={{ marginLeft: 10, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Cerca birre, pub, birrifici…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowResults(e.target.value.length > 1); }}
                  onFocus={() => setShowResults(searchQuery.length > 1)}
                  onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`; }}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#111009", padding: "0 8px" }}
                  data-testid="search-input-desktop"
                />
                <Link href={searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search"}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#d97706", marginRight: 10, flexShrink: 0 }}>↵</span>
                </Link>
              </div>
              {showResults && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100 }}>
                  <SearchResults query={searchQuery} onClose={() => setShowResults(false)} />
                </div>
              )}
            </div>

            {/* User section */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

              {/* Bell */}
              {isAuthenticated && (
                <Link href="/notifications" style={{ textDecoration: "none" }}>
                  <button style={{
                    position: "relative", width: 36, height: 36,
                    border: "2px solid #111009", borderRadius: 6,
                    background: "#fafaf8", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", boxShadow: "1px 1px 0 #111009",
                  }}>
                    <Bell size={14} color="#9d8e86" />
                    {(unreadData?.count ?? 0) > 0 && (
                      <span style={{
                        position: "absolute", top: 3, right: 3,
                        minWidth: 13, height: 13, padding: "0 2px",
                        background: "#ef4444", color: "#fff",
                        fontSize: 8, fontWeight: 800, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                      }}>
                        {(unreadData?.count ?? 0) > 9 ? "9+" : unreadData?.count}
                      </span>
                    )}
                  </button>
                </Link>
              )}

              {/* User menu */}
              {isAuthenticated && typedUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "0 10px 0 6px", height: 36,
                      border: "2px solid #111009", borderRadius: 6,
                      background: "#fafaf8", cursor: "pointer", boxShadow: "2px 2px 0 #111009",
                    }} data-testid="user-menu-button">
                      <Avatar style={{ width: 24, height: 24 }}>
                        {typedUser.profileImageUrl && <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || "Profilo"} />}
                        <AvatarFallback style={{ background: "#d97706", color: "#111009", fontSize: 11, fontWeight: 800 }}>
                          {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111009", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {typedUser.firstName || typedUser.email?.split("@")[0]}
                      </span>
                      <ChevronDown size={11} color="#9d8e86" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" style={{ width: 240, border: "2px solid #111009", borderRadius: 8, boxShadow: "3px 3px 0 #111009", background: "#fafaf8" }}>
                    {/* Role header */}
                    <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #e5ddd5" }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: "#111009", margin: 0 }}>
                        {typedUser.firstName ? `${typedUser.firstName} ${typedUser.lastName || ""}`.trim() : typedUser.email?.split("@")[0]}
                      </p>
                      {rolesData && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#d97706", margin: "2px 0 0" }}>
                          {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                        </p>
                      )}
                    </div>

                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, textDecoration: "none", color: "#111009" }}>
                        {(() => { const Icon = roleIcons[activeRole] || User; return <Icon size={14} />; })()}
                        {activeRole === "pub_owner" ? "Pannello pub" : activeRole === "brewery_owner" ? "Pannello birrificio" : activeRole === "admin" ? "Admin Panel" : "Il mio profilo"}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/activity" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, textDecoration: "none", color: "#111009" }}>
                        <Activity size={14} />
                        Attività
                      </Link>
                    </DropdownMenuItem>

                    {/* Role switcher */}
                    {rolesData && rolesData.roles.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9d8e86", padding: "4px 14px" }}>
                          Cambia modalità
                        </DropdownMenuLabel>
                        {rolesData.roles.filter(r => r !== rolesData.activeRole).map(role => {
                          const Icon = roleIcons[role] || User;
                          return (
                            <DropdownMenuItem key={role}
                              onClick={() => switchRoleMutation.mutate(role)}
                              disabled={switchRoleMutation.isPending}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
                              <Icon size={14} />
                              Passa a {roleLabels[role] || role}
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#dc2626" }}
                      data-testid="logout-button"
                      onClick={() => fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => (window.location.href = "/"))}>
                      <LogOut size={14} />
                      Esci
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login" data-testid="login-button" style={{ textDecoration: "none" }}>
                  <button style={{
                    padding: "0 16px", height: 36,
                    background: "#111009", color: "#fafaf8",
                    border: "2px solid #111009", borderRadius: 6,
                    fontSize: 12, fontWeight: 800, cursor: "pointer",
                    boxShadow: "2px 2px 0 #d97706",
                  }}>
                    Accedi
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
