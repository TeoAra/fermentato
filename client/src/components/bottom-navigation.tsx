import { User, Home, Users, Activity, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isIosEdgeToEdge } from "@/lib/safe-area-estimate";
import { isNativeApp } from "@/lib/platform";

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
 * iOS WKWebView lascia i layer GPU del chrome fisso persistente (header globale,
 * mini-bar dei dashboard, dock — marcati `.ios-fixed-chrome` / `.bottom-nav-fixed`)
 * "incollati" a un offset di scroll stale ogni volta che viene creato o distrutto
 * un layer composito: apertura/chiusura di un overlay Radix (Dialog/Sheet/
 * AlertDialog/Popover/Select/Tooltip), comparsa di una notifica, fine di
 * un'animazione/transizione, resize del visual viewport (tastiera, rotazione),
 * ritorno in foreground. Effetto: l'header risale sotto la status bar e il dock si
 * stacca dal bordo inferiore, e ci restano finché un reflow successivo non li
 * ri-ancora.
 *
 * Qui ri-ancoriamo quel chrome in modo GLOBALE: a ogni evento potenzialmente
 * "stranding" pianifichiamo (debounce di coda + max-wait) un repaint di UN frame
 * che aggiunge la classe `.fix-chrome-repaint` su <html> (vedi index.css) →
 * transform:none sul solo chrome marcato → iOS distrugge e ricrea il layer alla
 * posizione corretta rispetto al viewport. transform:none e translateZ(0)
 * dipingono alla stessa posizione (nessun salto); le --frozen-sat/sab non vengono
 * toccate (nessun ritorno del jump di env()); overlay e toast NON sono nel
 * selettore → nessun glitch sulle loro animazioni. No-op fuori da iOS
 * edge-to-edge.
 *
 * Va chiamato UNA sola volta a livello di App (non per pagina).
 */
export function useReanchorIosFixedChrome(): void {
  useEffect(() => {
    if (!isIosEdgeToEdge()) return;
    // iOS NATIVO: il chrome non è più GPU-compositato (de-compositing CSS scoped
    // [data-platform="ios"] in index.css) → non esiste alcun layer da ri-ancorare
    // e qualsiasi reflow forzato qui non farebbe che perturbare WKWebView senza
    // motivo. Questo hook resta attivo SOLO per la PWA standalone / Safari mobile,
    // dove il chrome è ancora compositato e il repaint serve davvero.
    if (isNativeApp) return;

    const root = document.documentElement;
    let debounceTimer = 0;
    let maxWaitTimer = 0;
    let removeRaf = 0;

    const kick = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = 0;
      window.clearTimeout(maxWaitTimer);
      maxWaitTimer = 0;
      root.classList.add("fix-chrome-repaint");
      // Forza un reflow: i layer compositi del chrome vengono distrutti e
      // ri-posizionati rispetto al viewport corrente.
      void root.offsetHeight;
      cancelAnimationFrame(removeRaf);
      removeRaf = requestAnimationFrame(() => {
        root.classList.remove("fix-chrome-repaint");
      });
    };

    // Coalescenza: debounce di coda (~110ms) + max-wait (~420ms) così anche
    // un'attività continua (animazioni a catena) ri-ancora periodicamente senza
    // forzare un reflow a ogni singolo evento. Su chrome già corretto il repaint
    // è invisibile (transform:none dipinge alla stessa posizione di translateZ(0)).
    const schedule = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(kick, 110);
      if (!maxWaitTimer) maxWaitTimer = window.setTimeout(kick, 420);
    };

    // 1) Mount/unmount dei portal Radix (overlay, popover, dropdown, select,
    //    tooltip) come figli del body + cambi di classe del body (find-beer-open).
    //    Niente subtree:true → evita il rumore dei re-render dentro #root.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // 2) Inizio/fine di animazioni e transizioni ovunque (toast, fade overlay,
    //    layer creati al volo) — in cattura per intercettare anche i nodi in #root.
    const animEvents = [
      "animationstart",
      "animationend",
      "animationcancel",
      "transitionrun",
      "transitionend",
      "transitioncancel",
    ] as const;
    for (const ev of animEvents) {
      document.addEventListener(ev, schedule, true);
    }

    // 3) Cambi di viewport / lifecycle che ri-compongono i fixed (tastiera,
    //    rotazione, ritorno in foreground, ripristino bfcache).
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", schedule);

    let vvThrottle = 0;
    const vv = window.visualViewport;
    const onViewport = () => {
      if (vvThrottle) return;
      vvThrottle = window.setTimeout(() => {
        vvThrottle = 0;
        schedule();
      }, 200);
    };
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", onViewport);

    // 4) Notifiche IN-APP (la "pill" nera del Toaster) e push native: la comparsa
    //    e soprattutto l'AUTO-dismiss (~3.5s) della pill — e il banner push nativo —
    //    possono ri-comporre i layer GPU senza un evento DOM affidabile sull'USCITA
    //    (la pill è figlia di un container persistente: il suo unmount NON cambia il
    //    childList del body). Su questi segnali facciamo un "burst" di re-anchor
    //    scaglionati che coprono sia la comparsa sia la sparizione. capacitor-native.ts
    //    dispatcha questi CustomEvent su window; sul web non vengono mai emessi → innocui.
    let burstTimers: number[] = [];
    const scheduleBurst = () => {
      schedule();
      // Limita l'insieme dei timer: azzera il burst precedente così trigger
      // frequenti (es. toast in serie) non accumulano setTimeout pendenti.
      for (const t of burstTimers) window.clearTimeout(t);
      burstTimers = [];
      for (const d of [400, 1200, 2600, 4000]) {
        burstTimers.push(window.setTimeout(schedule, d));
      }
    };
    window.addEventListener("native-push-received", scheduleBurst);
    window.addEventListener("native-push-action", scheduleBurst);
    window.addEventListener("native-app-resume", scheduleBurst);
    // Toast IN-APP (la "pill" nera): la Toaster dispatcha questo evento a ogni
    // apertura/dismiss. La pill è figlia di un container persistente, quindi il
    // MutationObserver su document.body non la vede → segnale esplicito.
    window.addEventListener("app-toast-changed", scheduleBurst);

    // 5) Rete di sicurezza definitiva: qualunque cosa abbia "staccato" il chrome
    //    (toast, banner, re-composite senza evento intercettabile), il primo tocco
    //    dell'utente lo ri-ancora. Su chrome già corretto il repaint è invisibile.
    document.addEventListener("pointerdown", schedule, true);

    return () => {
      observer.disconnect();
      for (const ev of animEvents) {
        document.removeEventListener(ev, schedule, true);
      }
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("native-push-received", scheduleBurst);
      window.removeEventListener("native-push-action", scheduleBurst);
      window.removeEventListener("native-app-resume", scheduleBurst);
      window.removeEventListener("app-toast-changed", scheduleBurst);
      document.removeEventListener("pointerdown", schedule, true);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", onViewport);
      for (const t of burstTimers) window.clearTimeout(t);
      window.clearTimeout(debounceTimer);
      window.clearTimeout(maxWaitTimer);
      window.clearTimeout(vvThrottle);
      cancelAnimationFrame(removeRaf);
      root.classList.remove("fix-chrome-repaint");
    };
  }, []);
}

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { isHidden } = useContext(BottomNavHideCtx);

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

  const homeActive      = isActive("/");
  const communityActive = isActive("/community");
  const activityActive  = isActive("/activity");
  const accountActive   = isActive("/profile") || isActive("/login") || isActive("/auth") || isActive("/dashboard");

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

          {/* Community */}
          <Link href="/community" className="flex-1 flex">
            <Tab
              active={communityActive}
              label="Community"
              icon={
                <Users
                  className="h-[22px] w-[22px]"
                  strokeWidth={communityActive ? 2.5 : 1.8}
                  fill={communityActive ? "currentColor" : "none"}
                  style={communityActive ? { fillOpacity: 0.12 } : {}}
                />
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
                <Activity
                  className="h-[22px] w-[22px]"
                  strokeWidth={activityActive ? 2.5 : 1.8}
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
            className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_20px_rgba(232,119,34,0.45)] border-4 border-white dark:border-[#0B0D10] active:opacity-80 transition-opacity z-[1]"
          >
            <Search className="w-6 h-6" strokeWidth={2.5} />
          </button>

        </div>
      </nav>
    </>
  );
}
