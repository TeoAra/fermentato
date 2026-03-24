import { Menu, X, LogOut, LogIn, User, Store, Beer, Shield, Search, ChevronRight, MapPin, Home, Bell, Activity, QrCode, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";
import SearchDialog from "@/components/search-dialog";

interface MobileHeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const roleLabels: Record<string, string> = {
  customer: "Utente",
  pub_owner: "Pub Owner",
  brewery_owner: "Brewery Owner",
  admin: "Amministratore",
};
const roleIcons: Record<string, any> = {
  customer: User,
  pub_owner: Store,
  brewery_owner: Beer,
  admin: Shield,
};

export function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const typedUser = user as UserType | undefined;
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: rolesData } = useQuery<{ roles: string[]; activeRole: string }>({
    queryKey: ["/api/auth/roles"],
    enabled: isAuthenticated && (typedUser?.roles?.length ?? 0) > 1,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 120000,
  });

  const { data: myFestivals } = useQuery<any[]>({
    queryKey: ["/api/admin/festivals"],
    enabled: isAuthenticated,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      apiRequest("/api/auth/switch-role", { method: "POST" }, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onMenuToggle();
      window.location.reload();
    },
  });

  const activeRole = (typedUser as any)?.activeRole || typedUser?.userType || "customer";

  function MenuItem({ href, icon: Icon, label, desc, onClick }: { href: string; icon: any; label: string; desc?: string; onClick?: () => void }) {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href} onClick={() => { onMenuToggle(); onClick?.(); }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px", borderRadius: 8,
          background: isActive ? "#fef3c7" : "transparent",
          border: isActive ? "1.5px solid #d97706" : "1.5px solid transparent",
          marginBottom: 2,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: 8,
            background: isActive ? "#d97706" : "#f0ece8",
            border: "1.5px solid " + (isActive ? "#111009" : "#e5ddd5"),
          }}>
            <Icon size={16} color={isActive ? "#fff" : "#9d8e86"} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? "#111009" : "#3a3530" }}>{label}</div>
            {desc && <div style={{ fontSize: 11, color: "#9d8e86", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</div>}
          </div>
          <ChevronRight size={13} color="#c5bdb8" />
        </div>
      </Link>
    );
  }

  return (
    <>
      {/* ── Mobile top bar — dark brutalista ── */}
      <header className="lg:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 56 }}>
        {/* Dark bar */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#111009",
          borderBottom: "2px solid #d97706",
        }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "100%" }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <img src="/logo-dark-mode.png" alt="Fermenta.to" style={{ height: 32, width: "auto" }} />
          </Link>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer" }}
              aria-label="Cerca"
            >
              <Search size={16} color="rgba(255,255,255,0.75)" />
            </button>

            {/* Bell */}
            {isAuthenticated && typedUser && (
              <Link href="/notifications" style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6 }}>
                  <Bell size={16} color="rgba(255,255,255,0.75)" />
                </div>
                {(unreadData?.count ?? 0) > 0 && (
                  <span style={{
                    position: "absolute", top: 4, right: 4,
                    minWidth: 14, height: 14, padding: "0 2px",
                    background: "#ef4444", color: "#fff",
                    fontSize: 8, fontWeight: 800, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}>
                    {(unreadData?.count ?? 0) > 9 ? "9+" : unreadData?.count}
                  </span>
                )}
              </Link>
            )}

            {/* Avatar */}
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard">
                <Avatar style={{ width: 32, height: 32, border: "2px solid #d97706" }}>
                  {typedUser.profileImageUrl && <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || "Profilo"} />}
                  <AvatarFallback style={{ background: "#d97706", color: "#111009", fontSize: 12, fontWeight: 800 }}>
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login" style={{ textDecoration: "none" }}>
                <button style={{ padding: "0 12px", height: 32, background: "#d97706", color: "#111009", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                  Accedi
                </button>
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={onMenuToggle}
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer" }}
              aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
            >
              {isMenuOpen ? <X size={16} color="rgba(255,255,255,0.85)" /> : <Menu size={16} color="rgba(255,255,255,0.85)" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Slide-in menu — cream editorial ── */}
      <Sheet open={isMenuOpen} onOpenChange={(open) => { if (!open) onMenuToggle(); }}>
        <SheetContent side="right" style={{ width: 300, padding: 0, display: "flex", flexDirection: "column", background: "#fafaf8", borderLeft: "2px solid #111009", boxShadow: "-4px 0 0 #111009" }}>
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>

          {/* User header */}
          <div style={{ padding: "20px 16px 14px", borderBottom: "2px solid #e5ddd5", background: "#fff" }}>
            {isAuthenticated && typedUser ? (
              <Link href="/dashboard" onClick={onMenuToggle} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar style={{ width: 44, height: 44, border: "2px solid #d97706", borderRadius: 8 }}>
                    {typedUser.profileImageUrl && <AvatarImage src={typedUser.profileImageUrl} alt={typedUser.nickname || "Profilo"} />}
                    <AvatarFallback style={{ background: "#d97706", color: "#111009", fontWeight: 800, fontSize: 16 }}>
                      {typedUser.nickname?.[0]?.toUpperCase() || typedUser.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#111009", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {typedUser.nickname || typedUser.firstName || typedUser.email?.split("@")[0]}
                    </div>
                    {rolesData && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {roleLabels[rolesData.activeRole] || rolesData.activeRole}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} color="#c5bdb8" />
                </div>
              </Link>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f0ece8", border: "2px solid #e5ddd5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={20} color="#9d8e86" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111009" }}>Ospite</div>
                  <button
                    onClick={() => { onMenuToggle(); window.location.href = "/login"; }}
                    style={{ fontSize: 11, color: "#d97706", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    Accedi o registrati →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0" }}>
            <MenuItem href="/" icon={Home} label="Home" />

            <div style={{ padding: "12px 6px 6px" }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86" }}>Esplora</span>
            </div>
            <MenuItem href="/search" icon={Search} label="Ricerca birre" desc="Oltre 1 milione di birre" />
            <MenuItem href="/explore/breweries" icon={Building2Icon} label="Birrifici" desc="Artigianali italiani e internazionali" />
            <MenuItem href="/explore/pubs" icon={MapPin} label="Pub & Locali" desc="Dove bere artigianale in Italia" />
            <MenuItem href="/festival" icon={QrCode} label="Festival" desc="Festival di birra artigianale" />

            {isAuthenticated && (
              <>
                <div style={{ padding: "12px 6px 6px" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86" }}>Account</span>
                </div>
                <MenuItem href="/dashboard" icon={User} label="Il mio profilo" />
                <MenuItem href="/activity" icon={Activity} label="Attività" />
                <MenuItem href="/notifications" icon={Bell} label="Notifiche" />
                {((user as any)?.activeRole === "admin" || (!(user as any)?.activeRole && (user as any)?.userType === "admin")) && (
                  <MenuItem href="/admin" icon={Shield} label="Admin Panel" />
                )}

                {myFestivals && myFestivals.length > 0 && (
                  <>
                    <div style={{ padding: "12px 6px 6px" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86" }}>Festival</span>
                    </div>
                    <MenuItem href="/festival-dashboard" icon={QrCode} label="Festival Dashboard" desc={`${myFestivals.length} festival attiv${myFestivals.length > 1 ? "i" : "o"}`} />
                    <MenuItem href="/festival" icon={Building2} label="Crea un nuovo festival" />
                  </>
                )}
              </>
            )}

            {/* Role switcher */}
            {rolesData && rolesData.roles.length > 1 && (
              <>
                <div style={{ padding: "12px 6px 6px" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86" }}>Cambia modalità</span>
                </div>
                {rolesData.roles.filter(r => r !== rolesData.activeRole).map(role => {
                  const Icon = roleIcons[role] || User;
                  return (
                    <button
                      key={role}
                      onClick={() => switchRoleMutation.mutate(role)}
                      disabled={switchRoleMutation.isPending}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 8, background: "transparent", border: "1.5px solid transparent", cursor: "pointer", marginBottom: 2 }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f0ece8", border: "1.5px solid #e5ddd5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={16} color="#9d8e86" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#3a3530" }}>Passa a {roleLabels[role]}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom: logout */}
          <div style={{ padding: "10px", borderTop: "2px solid #e5ddd5" }}>
            {isAuthenticated ? (
              <button
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 8, background: "#fff5f5", border: "1.5px solid #fca5a5", cursor: "pointer", color: "#dc2626" }}
                onClick={() => { onMenuToggle(); fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => (window.location.href = "/")); }}
                data-testid="logout-button-mobile"
              >
                <LogOut size={16} color="#dc2626" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Esci</span>
              </button>
            ) : (
              <button
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 8, background: "#d97706", border: "2px solid #111009", cursor: "pointer", boxShadow: "2px 2px 0 #111009" }}
                onClick={() => { onMenuToggle(); window.location.href = "/login"; }}
              >
                <LogIn size={16} color="#fff" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Accedi</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

function Building2Icon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}
