import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { usePushBadge } from "@/hooks/use-push-badge";
import Header from "@/components/header";
import { PwaInstallPrompt, PushNotificationPrompt, AutoPushSubscriber } from "@/components/pwa-prompt";

// Component to scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PubDetail from "@/pages/pub-detail";
import BreweryDetail from "@/pages/brewery-detail";
import BeerDetail from "@/pages/beer-detail";
import PubDashboard from "@/pages/pub-dashboard";
import SmartPubDashboard from "@/pages/smart-pub-dashboard";
import PubRegistration from "@/pages/pub-registration";
import Notifications from "@/pages/notifications";
import Activity from "@/pages/activity";
import Dashboard from "@/pages/dashboard-simple";
import UserDashboard from "@/pages/user-dashboard";
import UserProfile from "@/pages/user-profile-new";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminDashboardNew from "@/pages/admin-dashboard-new";
import AdminPublicanRequests from "@/pages/admin-publican-requests";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminContent from "@/pages/admin-content";
import AdminModeration from "@/pages/admin-moderation";
import AdminSuggestions from "@/pages/admin-suggestions";
import AdminAdditionRequests from "@/pages/admin-addition-requests";
import AdminEditPub from "@/pages/admin-edit-pub";
import ExplorePubs from "@/pages/explore-pubs";
import ExploreBreweries from "@/pages/explore-breweries";
import ExploreBeers from "@/pages/explore-beers";
import DemoLoginPage from "@/pages/demo-login-page";
import AuthPage from "@/pages/auth";
import BecomePublican from "@/pages/become-publican";
import BreweryDashboard from "@/pages/brewery-dashboard";
import TermsOfService from "@/pages/tos";
import PrivacyPolicy from "@/pages/privacy";
import TaplistTV from "@/pages/taplist-tv";
import Onboarding from "@/pages/onboarding";
import UserPublicProfile from "@/pages/user-public-profile";
import SearchPage from "@/pages/search";
import ScanPage from "@/pages/scan";
import ScanHistoryPage from "@/pages/scan-history";
import AdminPages from "@/pages/admin-pages";
import AdminDuplicates from "@/pages/admin-duplicates";
import AdminSubscriptions from "@/pages/admin-subscriptions";
import RegistraPub from "@/pages/registra-pub";
import PrezziPageNew from "@/pages/prezzi";
import AttivaPub from "@/pages/attiva-pub";
import { ContattiPage, ChiSiamoPage, SupportoPage } from "@/pages/static-page";
import { MobileHeader } from "@/components/mobile-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import CookieBanner from "@/components/CookieBanner";
import { ThemeProvider } from "@/lib/theme";
import type { User } from "@shared/schema";

function Router() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const typedUser = user as User | null;
  const [location, navigate] = useLocation();
  
  // Track page views when routes change
  useAnalytics();

  // Note: Google OAuth new users now go directly to /dashboard (no onboarding redirect)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Scroll to top on route change */}
      <ScrollToTop />
      
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>
      
      {/* Mobile Header */}
      <MobileHeader 
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />
      
      {/* Main Content */}
      <main className="lg:pt-0 pt-16 pb-16 lg:pb-0">
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
          {/* Dashboard routes — activeRole is the source of truth */}
          <Route path="/dashboard" component={
            typedUser?.activeRole === 'pub_owner' ? SmartPubDashboard :
            typedUser?.activeRole === 'brewery_owner' ? BreweryDashboard :
            typedUser?.activeRole === 'admin' ? AdminDashboardNew :
            typedUser?.activeRole === 'customer' ? UserProfile :
            // Fallback for legacy accounts with no activeRole set
            !typedUser?.activeRole && typedUser?.userType === 'pub_owner' ? SmartPubDashboard :
            !typedUser?.activeRole && typedUser?.userType === 'brewery_owner' ? BreweryDashboard :
            UserProfile
          } />
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
          <Route path="/admin/pages" component={AdminPages} />
          <Route path="/admin/subscriptions" component={AdminSubscriptions} />
          <Route path="/registra-pub" component={RegistraPub} />
          <Route path="/pub-registration" component={PubRegistration} />
          <Route path="/become-publican" component={BecomePublican} />
          <Route path="/brewery-dashboard" component={BreweryDashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/tos" component={TermsOfService} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/user/:nickname" component={UserPublicProfile} />
          <Route path="/search" component={SearchPage} />
          <Route path="/scan" component={ScanPage} />
          <Route path="/scan/history" component={ScanHistoryPage} />
          <Route path="/activity" component={Activity} />
          <Route path="/contatti" component={ContattiPage} />
          <Route path="/chi-siamo" component={ChiSiamoPage} />
          <Route path="/prezzi" component={PrezziPageNew} />
          <Route path="/attiva-pub" component={AttivaPub} />
          <Route path="/supporto" component={SupportoPage} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function App() {
  // Refresh notification badge immediately when a push arrives
  usePushBadge();

  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  const [location] = useLocation();

  if (location.startsWith("/tv/")) {
    return (
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/tv/:id" component={TaplistTV} />
        </Switch>
      </QueryClientProvider>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
            <AutoPushSubscriber />
            <PwaInstallPrompt />
            <PushNotificationPrompt />
            <CookieBanner />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
