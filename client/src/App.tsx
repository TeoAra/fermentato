import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useMemo, Component, ReactNode, lazy, Suspense } from "react";
import { initGA } from "./lib/analytics";
import { Capacitor } from "@capacitor/core";
import { useAnalytics } from "./hooks/use-analytics";
import { usePushBadge } from "@/hooks/use-push-badge";
import { NavigationProgress } from "@/components/navigation-progress";
import Lightbox from "@/components/lightbox";
const PwaInstallPrompt        = lazy(() => import("@/components/pwa-prompt").then(m => ({ default: m.PwaInstallPrompt })));
const PushNotificationPrompt  = lazy(() => import("@/components/pwa-prompt").then(m => ({ default: m.PushNotificationPrompt })));
const AutoPushSubscriber      = lazy(() => import("@/components/pwa-prompt").then(m => ({ default: m.AutoPushSubscriber })));
const CapacitorPushPrompt     = lazy(() => import("@/components/pwa-prompt").then(m => ({ default: m.CapacitorPushPrompt })));
const CapacitorLocationPrompt = lazy(() => import("@/components/pwa-prompt").then(m => ({ default: m.CapacitorLocationPrompt })));
import { MobileHeader } from "@/components/mobile-header";
const OnboardingTutorial = lazy(() => import("@/components/OnboardingTutorial").then(m => ({ default: m.OnboardingTutorial })));
import { BottomNavigation, BottomNavProvider } from "@/components/bottom-navigation";
import { DesktopSidebar } from "@/components/desktop-sidebar";
const CookieBanner = lazy(() => import("@/components/CookieBanner"));
import { AppUpdateCheck } from "@/components/app-update-check";
import { ThemeProvider } from "@/lib/theme";
import { isIosNative, isNativeApp } from "@/lib/platform";
import { NativeSplashOverlay } from "@/components/native-splash-overlay";
import type { User } from "@shared/schema";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=to.fermenta.app";
const APP_STORE_URL  = "https://apps.apple.com/it/app/fermenta-to/id6769051632";

// ─── Android Google Play install banner (browser only, not native app) ───────
function AndroidAppBanner() {
  const isAndroidBrowser = useMemo(() => {
    if (isNativeApp) return false;
    return /Android/i.test(navigator.userAgent);
  }, []);
  const [visible, setVisible] = useState(() => {
    if (!isAndroidBrowser) return false;
    try { return sessionStorage.getItem("android-app-banner-dismissed") !== "1"; } catch { return true; }
  });
  if (!isAndroidBrowser || !visible) return null;
  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem("android-app-banner-dismissed", "1"); } catch {}
    window.dispatchEvent(new CustomEvent("android-banner-dismissed"));
  };
  return (
    <div className="fixed left-3 right-3 z-[60] flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1C1F26] border border-stone-200 dark:border-[#2A2D35] rounded-2xl shadow-xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)" }}>
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 flex items-center justify-center">
        <img src="/icons/icon-192.png" alt="Fermenta.to" className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-foreground leading-tight">Fermenta.to su Google Play</p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Gratuita · Birre artigianali italiane</p>
      </div>
      <a
        href={PLAY_STORE_URL}
        target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#01875f] text-white text-[12px] font-bold tap-scale"
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white flex-shrink-0"><path d="M3.18 23.76c.33.18.7.2 1.05.06l11.65-11.65L12.6 9.5 3.18 23.76zm15.2-13.3-3.07-1.77-3.42 3.42 3.42 3.42 3.1-1.79c.88-.51.88-1.77-.03-2.28zm-14.7-8.2c-.35-.14-.72-.12-1.05.06L12.6 11.3l3.28-3.28L3.68 2.26zm0 0"/></svg>
        Scarica
      </a>
      <button onClick={dismiss} aria-label="Chiudi" className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-stone-400 tap-scale rounded-full hover:bg-stone-100 dark:hover:bg-[#2A2D35]">
        <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}


// ─── iOS App Store install banner (browser only, not native app) ─────────────
function IosAppBanner() {
  const isIosBrowser = useMemo(() => {
    if (isNativeApp) return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  }, []);
  const [visible, setVisible] = useState(() => {
    if (!isIosBrowser) return false;
    try { return sessionStorage.getItem("ios-app-banner-dismissed") !== "1"; } catch { return true; }
  });
  if (!isIosBrowser || !visible) return null;
  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem("ios-app-banner-dismissed", "1"); } catch {}
  };
  return (
    <div className="fixed left-3 right-3 z-[60] flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1C1F26] border border-stone-200 dark:border-[#2A2D35] rounded-2xl shadow-xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)" }}>
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 flex items-center justify-center">
        <img src="/icons/icon-192.png" alt="Fermenta.to" className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-foreground leading-tight">Fermenta.to su App Store</p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Gratuita · Disponibile anche su Google Play</p>
      </div>
      <a
        href={APP_STORE_URL}
        target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black text-white text-[12px] font-bold tap-scale"
      >
        <svg viewBox="0 0 14 14" className="w-3 h-3 fill-white flex-shrink-0"><path d="M7 0C3.134 0 0 3.134 0 7s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm.35 10.5c-.192 0-.35-.158-.35-.35V7.35H4.55a.35.35 0 0 1 0-.7H7V3.85a.35.35 0 0 1 .7 0V6.65h2.45a.35.35 0 0 1 0 .7H7.7v2.8c0 .192-.158.35-.35.35z"/></svg>
        Scarica
      </a>
      <button onClick={dismiss} aria-label="Chiudi" className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-stone-400 tap-scale rounded-full hover:bg-stone-100 dark:hover:bg-[#2A2D35]">
        <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

// ─── Page lazy imports — loaded only when the route is visited ───────────────
const NotFound           = lazy(() => import("@/pages/not-found"));
const AccountDelete      = lazy(() => import("@/pages/account-delete"));
const Landing            = lazy(() => import("@/pages/landing"));
const Home               = lazy(() => import("@/pages/home"));
const PubDetail          = lazy(() => import("@/pages/pub-detail"));
const BreweryDetail      = lazy(() => import("@/pages/brewery-detail"));
const BeerDetail         = lazy(() => import("@/pages/beer-detail"));
const SmartPubDashboard  = lazy(() => import("@/pages/smart-pub-dashboard"));
const BreweryDashboard   = lazy(() => import("@/pages/brewery-dashboard"));
const UserProfile        = lazy(() => import("@/pages/user-profile-new"));
const AdminDashboard     = lazy(() => import("@/pages/admin-dashboard"));
const AdminDashboardNew  = lazy(() => import("@/pages/admin-dashboard-new"));
const AdminAnalytics     = lazy(() => import("@/pages/admin-analytics"));
const AdminContent       = lazy(() => import("@/pages/admin-content"));
const AdminModeration    = lazy(() => import("@/pages/admin-moderation"));
const AdminSuggestions   = lazy(() => import("@/pages/admin-suggestions"));
const AdminAdditionRequests = lazy(() => import("@/pages/admin-addition-requests"));
const AdminPublicanRequests = lazy(() => import("@/pages/admin-publican-requests"));
const AdminEditPub       = lazy(() => import("@/pages/admin-edit-pub"));
const AdminEditBrewery   = lazy(() => import("@/pages/admin-edit-brewery"));
const AdminPages         = lazy(() => import("@/pages/admin-pages"));
const AdminDuplicates    = lazy(() => import("@/pages/admin-duplicates"));
const AdminSubscriptions = lazy(() => import("@/pages/admin-subscriptions"));
const AdminFestivals     = lazy(() => import("@/pages/admin-festivals"));
const ExplorePubs        = lazy(() => import("@/pages/explore-pubs"));
const ExploreBreweries   = lazy(() => import("@/pages/explore-breweries"));
const ExploreBeers       = lazy(() => import("@/pages/explore-beers"));
const SearchPage         = lazy(() => import("@/pages/search"));
const AuthPage           = lazy(() => import("@/pages/auth"));
const DemoLoginPage      = lazy(() => import("@/pages/demo-login-page"));
const BecomePublican     = lazy(() => import("@/pages/become-publican"));
const RegistraPub        = lazy(() => import("@/pages/registra-pub"));
const AttivaPub          = lazy(() => import("@/pages/attiva-pub"));
const Onboarding         = lazy(() => import("@/pages/onboarding"));
const Notifications      = lazy(() => import("@/pages/notifications"));
const Activity           = lazy(() => import("@/pages/activity"));
const Eventi             = lazy(() => import("@/pages/eventi"));
const EventDetail        = lazy(() => import("@/pages/event-detail"));
const UserPublicProfile  = lazy(() => import("@/pages/user-public-profile"));
const UserDashboard      = lazy(() => import("@/pages/user-dashboard"));
const Dashboard          = lazy(() => import("@/pages/dashboard-simple"));
const PubDashboard       = lazy(() => import("@/pages/pub-dashboard"));
const TaplistTV          = lazy(() => import("@/pages/taplist-tv"));
const FestivalTV         = lazy(() => import("@/pages/festival-tv"));
const FestivalPublic     = lazy(() => import("@/pages/festival-public"));
const FestivalDashboard  = lazy(() => import("@/pages/festival-dashboard"));
const CreaFestival       = lazy(() => import("@/pages/crea-festival"));
const RegistraFestival   = lazy(() => import("@/pages/registra-festival"));
const TermsOfService     = lazy(() => import("@/pages/tos"));
const PrivacyPolicy      = lazy(() => import("@/pages/privacy"));
const PrezziPageNew      = lazy(() => import("@/pages/prezzi"));
const IosWebOnlyPage     = lazy(() => import("@/pages/ios-web-only"));
const ResetPassword      = lazy(() => import("@/pages/reset-password"));
const ContattiPage       = lazy(() => import("@/pages/static-page").then(m => ({ default: m.ContattiPage })));
const ChiSiamoPage       = lazy(() => import("@/pages/static-page").then(m => ({ default: m.ChiSiamoPage })));
const SupportoPage       = lazy(() => import("@/pages/static-page").then(m => ({ default: m.SupportoPage })));
const MyCellar           = lazy(() => import("@/pages/my-cellar"));
const MyWishlist         = lazy(() => import("@/pages/my-wishlist"));
const MyStats            = lazy(() => import("@/pages/my-stats"));
const Scan               = lazy(() => import("@/pages/scan"));
const ScanHistory        = lazy(() => import("@/pages/scan-history"));
const SocialFeed         = lazy(() => import("@/pages/social-feed"));
const MicroblogNew       = lazy(() => import("@/pages/microblog-new"));
const HashtagPage        = lazy(() => import("@/pages/hashtag"));
const NewsPage           = lazy(() => import("@/pages/news"));
const AdminBroadcast     = lazy(() => import("@/pages/admin-broadcast"));
const AppDownload        = lazy(() => import("@/pages/app-download"));
// ─────────────────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
  <div className="min-h-screen bg-background dark:bg-[#0B0D10] overflow-hidden fade-in">
    <div className="max-w-2xl mx-auto px-6 pt-20 pb-12 text-center space-y-5">
      {/* Brand identity: hop icon + wordmark shimmer */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="skeleton w-7 h-7 rounded-full" />
        <div className="skeleton h-5 w-28 rounded-lg" />
      </div>
      <div className="skeleton mx-auto h-8 w-52 rounded-full" />
      <div className="space-y-3">
        <div className="skeleton mx-auto h-11 w-4/5 rounded-2xl" />
        <div className="skeleton mx-auto h-11 w-3/5 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <div className="skeleton mx-auto h-5 w-full rounded-xl" />
        <div className="skeleton mx-auto h-5 w-5/6 rounded-xl" />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <div className="skeleton h-14 w-56 rounded-2xl" />
        <div className="skeleton h-14 w-48 rounded-2xl" />
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <div className="skeleton h-9 w-28 rounded-full" />
        <div className="skeleton h-9 w-24 rounded-full" />
        <div className="skeleton h-9 w-28 rounded-full" />
      </div>
    </div>
    <div className="max-w-6xl mx-auto px-6 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton h-52 rounded-3xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// Helper: costruisce un URL cache-busting preservando il path corrente,
// RIMUOVENDO eventuali parametri `_v` accumulati da reload precedenti.
function buildFreshUrl(): string {
  const pathname = window.location.pathname || '/';
  const params = new URLSearchParams(window.location.search);
  params.delete('_v');
  params.set('_v', String(Date.now()));
  return window.location.origin + pathname + '?' + params.toString() + window.location.hash;
}

// Helper: annulla la registrazione di tutti i service worker e cancella tutte
// le cache (sia quelle del SW che le Cache Storage). Usato quando il SW vecchio
// sta servendo risposte avvelenate (HTML cached come fosse un chunk JS).
async function nukeServiceWorkerAndCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch (e) {
    console.warn('[nukeServiceWorkerAndCaches]', e);
  }
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    // Chunk load error dopo un nuovo deploy → ricarica la pagina automaticamente.
    // Su Safari/iOS WebKit il chunk stale restituisce HTML al posto di JS
    // e il browser lancia "'text/html' is not a valid JavaScript MIME type".
    const isChunkError = error.message?.includes('Failed to fetch dynamically imported module')
      || error.message?.includes('Loading chunk')
      || error.message?.includes('is not a valid JavaScript MIME type')
      || error.message?.includes('Failed to load module script')
      || error.name === 'ChunkLoadError';
    if (isChunkError) {
      // NIENTE auto-reload aggressivo: mostriamo subito la schermata
      // "Aggiornamento disponibile" con il pulsante Ricarica (che fa il nuke
      // completo solo se l'utente lo chiede esplicitamente).
      // Motivazione: auto-reload + nuke distruttivo causava flash di errore
      // visibile, perdita di scroll/stato, e in alcuni casi loop di reload.
      sessionStorage.removeItem('_chunk_reload_attempts');
    }
    console.error("[RouteErrorBoundary] ERROR:", error.message);
    console.error("[RouteErrorBoundary] STACK:", error.stack);
    console.error("[RouteErrorBoundary] COMPONENT STACK:", info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Errore sconosciuto";
      const errStack = this.state.error?.stack || "";
      const isChunkError = errMsg.includes('Failed to fetch dynamically imported module')
        || errMsg.includes('Loading chunk')
        || errMsg.includes('is not a valid JavaScript MIME type')
        || errMsg.includes('Failed to load module script')
        || this.state.error?.name === 'ChunkLoadError';
      const handleForceReload = async () => {
        sessionStorage.removeItem('_chunk_reload_attempts');
        // Annulla SW e cache PRIMA di ricaricare: l'auto-reload ha già fallito
        // più volte, quindi il SW vecchio sta sicuramente servendo cache rotte.
        await nukeServiceWorkerAndCaches();
        window.location.replace(buildFreshUrl());
      };
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 dark:bg-[#0B0D10] p-6">
          <div className="text-center max-w-lg space-y-3">
            <p className="text-4xl">🍺</p>
            {isChunkError ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Aggiornamento disponibile</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  L'app è stata aggiornata sul server. Tocca <strong>Ricarica</strong> per caricare la versione più recente.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Qualcosa è andato storto</h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-left">
                  <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">{errMsg}</p>
                </div>
                <details className="text-left">
                  <summary className="text-xs text-gray-400 cursor-pointer">Dettagli tecnici</summary>
                  <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-40 bg-gray-100 dark:bg-[#1A1D24] rounded p-2 whitespace-pre-wrap break-all">{errStack}</pre>
                </details>
              </>
            )}
            <div className="flex gap-2 justify-center">
              {isChunkError ? (
                <button
                  className="mt-2 px-6 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                  onClick={handleForceReload}
                >
                  Ricarica
                </button>
              ) : (
                <>
                  <button
                    className="mt-2 px-4 py-2 bg-gray-100 dark:bg-[#12151A] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#23262E]"
                    onClick={() => { navigator.clipboard?.writeText(errMsg + "\n\n" + errStack).catch(() => {}); }}
                  >
                    Copia errore
                  </button>
                  <button
                    className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                    onClick={() => { this.setState({ hasError: false, error: null }); window.history.back(); }}
                  >
                    Torna indietro
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component to scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}
function Router() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const typedUser = user as User | null;
  const [location, navigate] = useLocation();
  
  // Track page views when routes change
  useAnalytics();

  // Menu open: apply body class so CSS can scale main content
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [isMobileMenuOpen]);

  // Redirect to onboarding for new users arriving via social login (Google/Apple)
  useEffect(() => {
    if (!isLoading && isAuthenticated && typedUser?.needsOnboarding && location !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [isLoading, isAuthenticated, typedUser?.needsOnboarding, location, navigate]);

  // Su Android nativo (APK), i pub owner vengono portati direttamente alla
  // pagina taplist TV del loro locale all'avvio — come su iOS.
  // La pagina /tv/:id è più leggera della SmartPubDashboard e mostra subito
  // la taplist senza dover aprire il pannello Cast manualmente.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
    if (!isNativeAndroid) return;
    const isPubOwner = typedUser?.activeRole === "pub_owner"
      || (typedUser?.roles || []).includes("pub_owner")
      || typedUser?.userType === "pub_owner";
    if (!isPubOwner) return;
    const pubId = typedUser?.managedPubId;
    if (!pubId) return;
    // Solo se si è alla root (avvio app) — non sovrascrivere navigazioni esplicite
    if (location === "/" || location === "") {
      navigate(`/tv/${pubId}`);
    }
  }, [isLoading, isAuthenticated, typedUser?.activeRole, typedUser?.managedPubId, location, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Scroll to top on route change */}
      <ScrollToTop />
      {/* Navigation progress bar */}
      <NavigationProgress />

      <div className="main-content-wrapper">
      {/* Desktop Topbar — full-width sticky top, lg+ only */}
      <DesktopSidebar />

      {/* Mobile Header — shown only below lg */}
      <MobileHeader 
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />

      {/* Main Content — pt-14 mobile header (h-14), desktop topbar is h-16 so lg:pt-16 */}
      <div>
      <main className="main-content-pb lg:pb-8" style={{ paddingTop: 'var(--mobile-top-offset)' }}>
        <RouteErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
        <div key={location.split('?')[0]} className="route-fade">
        <Switch>
          <Route path="/" component={isLoading || !isAuthenticated ? Landing : Home} />
          <Route path="/login" component={AuthPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/account/delete" component={AccountDelete} />
          <Route path="/demo-login" component={DemoLoginPage} />
          <Route path="/pub/:id" component={PubDetail} />
          <Route path="/brewery/:id" component={BreweryDetail} />
          <Route path="/beer/:id" component={BeerDetail} />
          <Route path="/explore/pubs" component={ExplorePubs} />
          <Route path="/explore/breweries" component={ExploreBreweries} />
          <Route path="/explore/beers" component={ExploreBeers} />
          {/* Dashboard routes — activeRole is the source of truth.
              Fallback checks roles[] + userType to handle the brief transitional window
              when the user navigates before the role-switch API response arrives. */}
          <Route path="/dashboard" component={(
            typedUser?.activeRole === 'pub_owner' ? SmartPubDashboard :
            typedUser?.activeRole === 'brewery_owner' ? BreweryDashboard :
            typedUser?.activeRole === 'admin' ? AdminDashboardNew :
            typedUser?.activeRole === 'customer' ? UserProfile :
            // activeRole null/unset — check roles array and userType as fallback
            (typedUser?.roles || []).includes('pub_owner') || typedUser?.userType === 'pub_owner' ? SmartPubDashboard :
            (typedUser?.roles || []).includes('brewery_owner') || typedUser?.userType === 'brewery_owner' ? BreweryDashboard :
            (typedUser?.roles || []).includes('admin') || typedUser?.userType === 'admin' ? AdminDashboardNew :
            UserProfile
          ) as any} />
          {/* /profile always shows the user profile regardless of active role */}
          <Route path="/profile" component={UserProfile} />
          <Route path="/admin" component={AdminDashboardNew} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/content" component={AdminContent} />
          <Route path="/admin/duplicates" component={AdminDuplicates} />
          <Route path="/admin/moderation" component={AdminModeration} />
          <Route path="/admin/suggestions" component={AdminSuggestions} />
          <Route path="/admin/addition-requests" component={AdminAdditionRequests} />
          <Route path="/admin/publican-requests" component={AdminPublicanRequests} />
          <Route path="/admin/users" component={AdminDashboard} />
          <Route path="/admin/edit-pub/:id" component={AdminEditPub} />
          <Route path="/admin/edit-brewery/:id" component={AdminEditBrewery} />
          <Route path="/admin/pages" component={AdminPages} />
          <Route path="/admin/subscriptions" component={AdminSubscriptions} />
          <Route path="/admin/festivals" component={AdminFestivals} />
          <Route path="/registra-pub" component={isIosNative ? IosWebOnlyPage : RegistraPub} />
          <Route path="/pub-registration" component={isIosNative ? IosWebOnlyPage : RegistraPub} />
          <Route path="/become-publican" component={BecomePublican} />
          <Route path="/brewery-dashboard" component={BreweryDashboard as any} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/tos" component={TermsOfService} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/user/:nickname" component={UserPublicProfile} />
          <Route path="/search" component={SearchPage} />
          <Route path="/activity" component={Activity} />
          <Route path="/eventi" component={Eventi} />
          <Route path="/events">{() => { window.location.replace("/eventi"); return null; }}</Route>
          <Route path="/eventi/:type/:id" component={EventDetail} />
          <Route path="/my-cellar" component={MyCellar} />
          <Route path="/my-wishlist" component={MyWishlist} />
          <Route path="/my-stats" component={MyStats} />
          <Route path="/contatti" component={ContattiPage} />
          <Route path="/chi-siamo" component={ChiSiamoPage} />
          <Route path="/prezzi" component={isIosNative ? IosWebOnlyPage : PrezziPageNew} />
          <Route path="/attiva-pub" component={isIosNative ? IosWebOnlyPage : AttivaPub} />
          <Route path="/supporto" component={SupportoPage} />
          <Route path="/festival/:slug" component={FestivalPublic} />
          <Route path="/festival-dashboard" component={FestivalDashboard} />
          <Route path="/festival" component={isIosNative ? IosWebOnlyPage : CreaFestival} />
          <Route path="/registra-festival" component={isIosNative ? IosWebOnlyPage : RegistraFestival} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/scan/history" component={ScanHistory} />
          <Route path="/scan" component={Scan} />
          <Route path="/feed" component={SocialFeed} />
          <Route path="/microblog/nuovo" component={MicroblogNew} />
          <Route path="/hashtag/:tag" component={HashtagPage} />
          <Route path="/news" component={NewsPage} />
          <Route path="/admin/broadcast" component={AdminBroadcast} />
          <Route path="/admin/broadcasts" component={AdminBroadcast} />
          <Route path="/app/download" component={AppDownload} />
          <Route component={NotFound} />
        </Switch>
        </div>
        </Suspense>
        </RouteErrorBoundary>
      </main>
      </div>

      </div>{/* /main-content-wrapper */}

      {/* Bottom Navigation — fixed to viewport, outside main-content-wrapper to avoid will-change:transform containing-block trap */}
      <BottomNavigation />

      {/* Tutorial iniziale (mostrato al primo avvio in PWA installata o app nativa) */}
      <Suspense fallback={null}><OnboardingTutorial /></Suspense>
    </div>
  );
}

function App() {
  // Refresh notification badge immediately when a push arrives
  usePushBadge();

  // Initialize Google Analytics when app loads.
  // Apple guideline 5.1.2: niente tracking nelle app native senza ATT.
  // Disattiviamo GA su iOS/Android nativi; sul web rimane attivo.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    initGA();
  }, []);

  const [location] = useLocation();

  if (location.startsWith("/tv/")) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/tv/:id" component={TaplistTV} />
          </Switch>
        </Suspense>
      </QueryClientProvider>
    );
  }

  if (location.startsWith("/festival-tv/")) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/festival-tv/:slug" component={FestivalTV} />
          </Switch>
        </Suspense>
      </QueryClientProvider>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <NativeSplashOverlay />
            <Toaster />
            <Lightbox />
            <AppUpdateCheck />
            <BottomNavProvider>
            <Router />
            </BottomNavProvider>
            <Suspense fallback={null}>
              <AutoPushSubscriber />
              <PwaInstallPrompt />
              <PushNotificationPrompt />
              <CapacitorLocationPrompt />
              <CapacitorPushPrompt />
              <CookieBanner />
            </Suspense>
            <AndroidAppBanner />
            <IosAppBanner />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
