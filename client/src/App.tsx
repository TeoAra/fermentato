import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import Header from "@/components/header";

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
import AdminAnalytics from "@/pages/admin-analytics";
import AdminContent from "@/pages/admin-content";
import AdminModeration from "@/pages/admin-moderation";
import AdminEditPub from "@/pages/admin-edit-pub";
import ExplorePubs from "@/pages/explore-pubs";
import ExploreBreweries from "@/pages/explore-breweries";
import DemoLoginPage from "@/pages/demo-login-page";
import AuthPage from "@/pages/auth";
import BecomePublican from "@/pages/become-publican";
import TermsOfService from "@/pages/tos";
import PrivacyPolicy from "@/pages/privacy";
import { MobileHeader } from "@/components/mobile-header";
import { BottomNavigation } from "@/components/bottom-navigation";
import type { User } from "@shared/schema";

function Router() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const typedUser = user as User | null;
  
  // Track page views when routes change
  useAnalytics();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
      <main className="lg:pt-0 pt-14 pb-16 lg:pb-0">
        <Switch>
          <Route path="/" component={isLoading || !isAuthenticated ? Landing : Home} />
          <Route path="/login" component={AuthPage} />
          <Route path="/demo-login" component={DemoLoginPage} />
          <Route path="/pub/:id" component={PubDetail} />
          <Route path="/brewery/:id" component={BreweryDetail} />
          <Route path="/beer/:id" component={BeerDetail} />
          <Route path="/explore/pubs" component={ExplorePubs} />
          <Route path="/explore/breweries" component={ExploreBreweries} />
          {/* Dashboard routes based on user type or active role */}
          <Route path="/dashboard" component={
            (typedUser?.userType === 'pub_owner' || typedUser?.active_role === 'pub_owner') ? SmartPubDashboard : 
            UserProfile
          } />
          <Route path="/admin" component={AdminDashboardNew} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/content" component={AdminContent} />
          <Route path="/admin/moderation" component={AdminModeration} />
          <Route path="/admin/users" component={AdminDashboard} />
          <Route path="/admin/edit-pub/:id" component={AdminEditPub} />
          <Route path="/pub-registration" component={PubRegistration} />
          <Route path="/become-publican" component={BecomePublican} />
          <Route path="/tos" component={TermsOfService} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/activity" component={Activity} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
