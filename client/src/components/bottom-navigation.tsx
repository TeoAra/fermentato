import { User, Home, Bell, Zap, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { isIosEdgeToEdge } from "@/lib/safe-area-estimate";

/**
 * Renderizza i dock interni dei dashboard tramite portal direttamente in
 * document.body, bypassando il main-content-wrapper che ha will-change:transform
 * e intrappola position:fixed impedendo l'ancoraggio al viewport.
 */
export function DockPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

// ── Context: consente ai dashboard con dock proprio di sopprimere la global nav ──
interface BottomNavHideCtxType {
  hide: () => void;
  show: () => void;
  isHidden: boolean;
}
const BottomNavHideCtx = createContext<BottomNavHideCtxType>({
  hide: () => {},
  show: () => {},
  isHidden: false,
});

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [hideCount, setHideCount] = useState(0);
  const hide = useCallback(() => setHideCount(n => n + 1), []);
  const show = useCallback(() => setHideCount(n => Math.max(0, n - 1)), []);
  return (
    <BottomNavHideCtx.Provider value={{ hide, show, isHidden: hideCount > 0 }}>
      {children}
    </BottomNavHideCtx.Provider>
  );
}

/**
 * Chiama questo hook all'interno di qualsiasi pagina che ha un proprio dock
 * bottom. Nasconde la BottomNavigation globale finché la pagina è montata.
 */
export function useHideGlobalBottomNav() {
  const { hide, show } = useContext(BottomNavHideCtx);
  useEffect(() => {
    hide();
    return () => { show(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Rileva se c'è un Dialog/Sheet/AlertDialog aperto controllando la presenza
// di un overlay scuro fixed (backdrop Radix). Quando è aperto, nascondiamo
// la bottom nav così il modale ha più spazio e non ci sono sovrapposizioni.
export function useAnyModalOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      // FindBeerSheet non usa un backdrop .fixed (usa .absolute dentro .fixed)
      // → rileva il suo stato tramite la classe sul body impostata in FindBeerSheet.tsx
      if (document.body.classList.contains('find-beer-open')) {
        setOpen(true);
        return;
      }
      // Overlay Radix (Dialog, Sheet, AlertDialog): cercano sempre .fixed.inset-0.bg-black/
      const overlays = document.querySelectorAll('.fixed.inset-0');
      for (const el of overlays) {
        const cls = (el as HTMLElement).className || '';
        if (cls.includes('bg-black/') || cls.includes('bg-black\\/')) {
          setOpen(true);
          return;
        }
      }
      setOpen(false);
    };
    // Osserva childList (aggiunta/rimozione elementi) E attributi del body
    // (classList change per 'find-beer-open')
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    check();
    return () => observer.disconnect();
  }, []);
  return open;
}

/**
 * iOS WKWebView lascia i layer GPU dei fixed chrome (header globale + dock dei
 * dashboard, compositati con translateZ(0)) "incollati" a un offset di scroll
 * stale quando un overlay Radix (Dialog/Sheet/AlertDialog → react-remove-scroll)
 * toglie il lock dello scroll del body. Effetto visibile alla CHIUSURA del
 * modale: l'header risale sotto la status bar e il dock si stacca dal bordo
 * inferiore, e ci restano finché un reflow successivo non li ri-ancora.
 *
 * Qui forziamo quel reflow: alla transizione modale aperto→chiuso aggiungiamo
 * per un frame la classe `.fix-chrome-repaint` su <html> (vedi index.css), che
 * azzera il transform sui soli fixed chrome → iOS ricrea il layer alla posizione
 * corretta rispetto al viewport. transform:none e translateZ(0) dipingono alla
 * stessa posizione (nessun salto) e le --frozen-sat/sab non vengono toccate
 * (nessun ritorno del jump di env()). No-op fuori da iOS edge-to-edge.
 *
 * Va chiamato UNA sola volta a livello di App (non per pagina).
 */
export function useRepaintFixedChromeOnModalClose(): void {
  const isAnyModalOpen = useAnyModalOpen();
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isAnyModalOpen;
    // Solo sulla transizione aperto→chiuso, e solo su iOS edge-to-edge.
    if (!wasOpen || isAnyModalOpen) return;
    if (!isIosEdgeToEdge()) return;

    const root = document.documentElement;
    let removeRaf = 0;
    const kick = () => {
      root.classList.add("fix-chrome-repaint");
      // Forza un reflow: il layer composito viene distrutto e ri-posizionato
      // rispetto al viewport corrente.
      void root.offsetHeight;
      cancelAnimationFrame(removeRaf);
      removeRaf = requestAnimationFrame(() => {
        root.classList.remove("fix-chrome-repaint");
      });
    };

    // Aspetta che l'animazione di uscita Radix + il cleanup di react-remove-scroll
    // siano atterrati prima del repaint (doppio rAF), con un fallback a tempo per
    // le chiusure più lente in PWA standalone. Eseguire kick più volte è innocuo:
    // su chrome già corretto transform:none dipinge alla stessa posizione.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(kick);
    });
    const tFallback = window.setTimeout(kick, 180);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(removeRaf);
      clearTimeout(tFallback);
      root.classList.remove("fix-chrome-repaint");
    };
  }, [isAnyModalOpen]);
}

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { isHidden } = useContext(BottomNavHideCtx);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Nascosta esplicitamente da un dock interno (context — blindato, indipendente dalla route)
  if (isHidden) return null;

  if (location.startsWith("/tv/") || location.startsWith("/festival-tv/")) return null;
  // Pagine di dettaglio: la bottom bar globale viene sostituita dal dock
  // contestuale specifico della pagina (pub, birrificio, birra, festival, evento, utente).
  if (
    location.startsWith("/pub/") ||
    location.startsWith("/pubs/") ||
    location.startsWith("/brewery/") ||
    location.startsWith("/breweries/") ||
    location.startsWith("/beer/") ||
    location.startsWith("/festival/") ||
    location.startsWith("/event/") ||
    location.startsWith("/user/") ||
    location === "/dashboard" ||
    location.startsWith("/dashboard/") ||
    location.startsWith("/pub-dashboard") ||
    location.startsWith("/brewery-dashboard") ||
    location === "/profile" ||
    location.startsWith("/profile/") ||
    location.startsWith("/user-dashboard")
  ) return null;

  const typedUser = user as any;
  const avatarUrl = typedUser?.profileImageUrl;

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const homeActive    = isActive("/");
  const notifActive   = isActive("/notifications");
  const activityActive = isActive("/activity");
  const accountActive = isActive("/profile") || isActive("/login") || isActive("/auth") || isActive("/dashboard");

  const Tab = ({
    active,
    icon,
    label,
    badge,
  }: {
    active: boolean;
    icon: ReactNode;
    label: string;
    badge?: ReactNode;
  }) => (
    <div className="flex-1 flex flex-col items-center justify-start gap-0.5 pt-2.5 cursor-pointer select-none">
      <span
        className={`relative inline-flex items-center justify-center transition-colors ${
          active ? "text-primary" : "text-stone-400 dark:text-stone-500"
        }`}
      >
        {icon}
        {badge}
      </span>
      <span
        className={`text-[10px] tracking-tight transition-colors ${
          active ? "font-semibold text-primary" : "font-medium text-stone-500 dark:text-stone-400"
        }`}
      >
        {label}
      </span>
    </div>
  );

  return (
    <>
      <nav
        className="bottom-nav-fixed lg:hidden fixed bottom-0 left-0 right-0 z-[55] bg-white dark:bg-[#0B0D10] rounded-t-[32px] border-t border-x border-stone-100 dark:border-white/[0.06] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: "max(calc(var(--frozen-sab) - 16px), 0px)" }}
      >
        <div className="relative flex items-stretch h-[64px] px-2">

          {/* Home */}
          <Link href="/" className="flex-1 flex">
            <Tab
              active={homeActive}
              label="Home"
              icon={
                <Home
                  className="h-[22px] w-[22px]"
                  strokeWidth={homeActive ? 2.5 : 1.8}
                  fill={homeActive ? "currentColor" : "none"}
                  style={homeActive ? { fillOpacity: 0.12 } : {}}
                />
              }
            />
          </Link>

          {/* Notifiche */}
          <Link href="/notifications" className="flex-1 flex">
            <Tab
              active={notifActive}
              label="Notifiche"
              icon={
                <Bell
                  className="h-[22px] w-[22px]"
                  strokeWidth={notifActive ? 2.5 : 1.8}
                  fill={notifActive ? "currentColor" : "none"}
                  style={notifActive ? { fillOpacity: 0.12 } : {}}
                />
              }
              badge={
                unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : undefined
              }
            />
          </Link>

          {/* Spacer for FAB Cerca */}
          <div className="w-16 flex-shrink-0" aria-hidden="true" />

          {/* Attività */}
          <Link href="/activity" className="flex-1 flex">
            <Tab
              active={activityActive}
              label="Attività"
              icon={
                <Zap
                  className="h-[22px] w-[22px]"
                  strokeWidth={activityActive ? 2.5 : 1.8}
                  fill={activityActive ? "currentColor" : "none"}
                  style={activityActive ? { fillOpacity: 0.12 } : {}}
                />
              }
            />
          </Link>

          {/* Account */}
          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex-1 flex">
            <Tab
              active={accountActive}
              label="Account"
              icon={
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="profilo"
                    className={`h-[22px] w-[22px] rounded-full object-cover border-2 transition-all ${
                      accountActive
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-stone-200 dark:border-[#23262E]"
                    }`}
                  />
                ) : (
                  <User
                    className="h-[22px] w-[22px]"
                    strokeWidth={accountActive ? 2.5 : 1.8}
                    fill={accountActive ? "currentColor" : "none"}
                    style={accountActive ? { fillOpacity: 0.12 } : {}}
                  />
                )
              }
            />
          </Link>

          {/* FAB Cerca — centrale, sporge sopra la barra */}
          <button
            type="button"
            onClick={() => setLocation("/search")}
            aria-label="Cerca"
            className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_20px_rgba(232,119,34,0.45)] border-4 border-white dark:border-[#0B0D10] transition-transform active:scale-95 z-[1]"
          >
            <Search className="w-6 h-6" strokeWidth={2.5} />
          </button>

        </div>
      </nav>
    </>
  );
}
