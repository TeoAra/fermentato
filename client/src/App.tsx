import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, Component, ReactNode, lazy, Suspense } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { usePushBadge } from "@/hooks/use-push-badge";
import { NavigationProgress } from "@/components/navigation-progress";
import Lightbox from "@/components/lightbox";
import { PwaInstallPrompt, PushNotificationPrompt, AutoPushSubscriber, CapacitorPushPrompt, CapacitorLocationPrompt } from "@/components/pwa-prompt";
import { MobileHeader } from "@/components/mobile-header";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { BottomNavigation } from "@/components/bottom-navigation";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import CookieBanner from "@/components/CookieBanner";
import { AppUpdateCheck } from "@/components/app-update-check";
import { ThemeProvider } from "@/lib/theme";
import type { User } from "@shared/schema";

// ─── Page lazy imports — loaded only when the route is visited ───────────────
const NotFound           = lazy(() => import("@/pages/not-found"));
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
  <div className="min-h-screen bg-background dark:bg-[hsl(25,14%,7%)] overflow-hidden fade-in">
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

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    // Chunk load error dopo un nuovo deploy → ricarica la pagina automaticamente
    const isChunkError = error.message?.includes('Failed to fetch dynamically imported module')
      || error.message?.includes('Loading chunk')
      || error.name === 'ChunkLoadError';
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('_chunk_reload', String(now));
        window.location.reload();
        return;
      }
    }
    console.error("[RouteErrorBoundary] ERROR:", error.message);
    console.error("[RouteErrorBoundary] STACK:", error.stack);
    console.error("[RouteErrorBoundary] COMPONENT STACK:", info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || "Errore sconosciuto";
      const errStack = this.state.error?.stack || "";
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 dark:bg-gray-900 p-6">
          <div className="text-center max-w-lg space-y-3">
            <p className="text-4xl">🍺</p>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Qualcosa è andato storto</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-left">
              <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">{errMsg}</p>
            </div>
            <details className="text-left">
              <summary className="text-xs text-gray-400 cursor-pointer">Dettagli tecnici</summary>
              <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-40 bg-gray-100 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap break-all">{errStack}</pre>
            </details>
            <div className="flex gap-2 justify-center">
              <button
                className="mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
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

  // Note: Google OAuth new users now go directly to /dashboard (no onboarding redirect)

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
            // activeRole is customer/null — check roles array and userType as fallback
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
          <Route path="/registra-pub" component={RegistraPub} />
          <Route path="/pub-registration" component={RegistraPub} />
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
          <Route path="/prezzi" component={PrezziPageNew} />
          <Route path="/attiva-pub" component={AttivaPub} />
          <Route path="/supporto" component={SupportoPage} />
          <Route path="/festival/:slug" component={FestivalPublic} />
          <Route path="/festival-dashboard" component={FestivalDashboard} />
          <Route path="/festival" component={CreaFestival} />
          <Route path="/registra-festival" component={RegistraFestival} />
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
      <OnboardingTutorial />
    </div>
  );
}

function App() {
  // Refresh notification badge immediately when a push arrives
  usePushBadge();

  // Initialize Google Analytics when app loads
  useEffect(() => {
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
            <Toaster />
            <Lightbox />
            <AppUpdateCheck />
            <Router />
            <AutoPushSubscriber />
            <PwaInstallPrompt />
            <PushNotificationPrompt />
            <CapacitorLocationPrompt />
            <CapacitorPushPrompt />
            <CookieBanner />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
