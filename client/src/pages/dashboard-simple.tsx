import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, Beer, Settings, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect pub owners immediately - they should never see this dashboard
  useEffect(() => {
    if (user?.userType === 'pub_owner') {
      // Force redirect to pub dashboard - this prevents showing the wrong dashboard
      return;
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per vedere la dashboard...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: userFavorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated && user?.userType !== 'pub_owner'
  });

  // Pub owners should never see this - they get redirected by routing
  if (user?.userType === 'pub_owner') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Cliente
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Il tuo profilo birraio personale
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && user.userType === 'admin' && (
            <Link href="/admin">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Shield className="w-4 h-4 mr-2" />
                Pannello Admin
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pub Preferiti</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(userFavorites) ? userFavorites.length : 0}</div>
            <p className="text-xs text-muted-foreground">I tuoi locali preferiti</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Birre Assaggiate</CardTitle>
            <Beer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Birre provate quest'anno</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valutazioni</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Recensioni scritte</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20">
              <div className="text-center">
                <Beer className="h-6 w-6 mx-auto mb-2" />
                <div>Trova Pub Vicini</div>
              </div>
            </Button>
            <Button variant="outline" className="h-20">
              <div className="text-center">
                <Heart className="h-6 w-6 mx-auto mb-2" />
                <div>Gestisci Preferiti</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Nessuna attività recente. Inizia esplorando pub e birre!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}