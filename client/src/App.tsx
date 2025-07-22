import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Header from "@/components/header";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PubDetail from "@/pages/pub-detail";
import BreweryDetail from "@/pages/brewery-detail";
import BeerDetail from "@/pages/beer-detail";
import PubDashboard from "@/pages/pub-dashboard";
import PubRegistration from "@/pages/pub-registration";
import Notifications from "@/pages/notifications";
import Activity from "@/pages/activity";
import Dashboard from "@/pages/dashboard";
import { MobileHeader } from "@/components/mobile-header";
import { BottomNavigation } from "@/components/bottom-navigation";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
          <Route path="/pub/:id" component={PubDetail} />
          <Route path="/brewery/:id" component={BreweryDetail} />
          <Route path="/beer/:id" component={BeerDetail} />
          {/* Dashboard routes based on user type */}
          <Route path="/dashboard" component={() => {
            if (user?.userType === 'pub_owner') {
              return <PubDashboard />;
            }
            return <Dashboard />;
          }} />
          <Route path="/pub-registration" component={PubRegistration} />
          <Route path="/pub-dashboard" component={PubDashboard} />
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
