import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TapListManager } from "@/components/taplist-manager";
import { BottleListManager } from "@/components/bottle-list-manager";
import { MenuManager } from "@/components/menu-manager";
import { useDemoAuth } from "@/hooks/useDemoAuth";
import { Beer, Wine, Utensils, Building2, LogIn, LogOut } from "lucide-react";

interface Pub {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
}

interface TapItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  priceSmall?: string;
  priceMedium?: string;
  priceLarge?: string;
  tapNumber?: number;
  description?: string;
  isVisible: boolean;
}

interface BottleItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  price: string;
  quantity: number;
  size?: string;
  vintage?: string;
  description?: string;
  isVisible: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  isVisible: boolean;
  orderIndex: number;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens: string[];
  isVisible: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  orderIndex: number;
}

export default function DemoDashboard() {
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);
  const { user, isAuthenticated, isLoading, login, logout, isLoggingIn, isLoggingOut } = useDemoAuth();

  // Set demo user flag
  useEffect(() => {
    localStorage.setItem('demo_user', 'true');
  }, []);

  // Get demo pubs
  const { data: pubs = [], isLoading: pubsLoading } = useQuery<Pub[]>({
    queryKey: ["/api/demo-pubs"],
  });

  // Get pub details
  const { data: tapList = [] } = useQuery<TapItem[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "taplist"],
    enabled: !!selectedPub?.id,
  });

  const { data: bottleList = [] } = useQuery<BottleItem[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "bottles"],
    enabled: !!selectedPub?.id,
  });

  const { data: menu = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "menu"],
    enabled: !!selectedPub?.id,
  });

  useEffect(() => {
    if (pubs && pubs.length > 0 && !selectedPub) {
      setSelectedPub(pubs[0]);
    }
  }, [pubs, selectedPub]);

  if (isLoading || pubsLoading) {
    return <div className="flex items-center justify-center h-64">Caricamento...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Accesso Demo Richiesto</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Per testare le funzionalità di gestione del pub, effettua l'accesso demo.
        </p>
        <Button 
          onClick={() => login()} 
          disabled={isLoggingIn}
          className="w-full"
        >
          <LogIn className="w-4 h-4 mr-2" />
          {isLoggingIn ? "Accesso in corso..." : "Accedi come Demo Pub"}
        </Button>
      </div>
    );
  }

  if (!pubs || pubs.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Nessun Pub Demo</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Non ci sono pub demo disponibili al momento.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Gestisci i tuoi pub e le loro tap list (modalità demo)
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Benvenuto, {user.firstName} {user.lastName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Building2 className="w-4 h-4 mr-2" />
            Modalità Demo
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => logout()}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? "Disconnessione..." : "Esci"}
          </Button>
        </div>
      </div>

      {/* Selezione Pub */}
      {pubs.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="font-medium">Pub selezionato:</span>
              <div className="flex gap-2">
                {pubs.map((pub) => (
                  <Button
                    key={pub.id}
                    variant={selectedPub?.id === pub.id ? "default" : "outline"}
                    onClick={() => setSelectedPub(pub)}
                  >
                    {pub.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPub && (
        <div className="space-y-6">
          {/* Info Pub */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedPub.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {selectedPub.address}, {selectedPub.city} ({selectedPub.region})
                  </CardDescription>
                  {selectedPub.description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      {selectedPub.description}
                    </p>
                  )}
                </div>
                {selectedPub.logoUrl && (
                  <img
                    src={selectedPub.logoUrl}
                    alt={selectedPub.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabs per gestione */}
          <Tabs defaultValue="taplist" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="taplist" className="flex items-center gap-2">
                <Beer className="w-4 h-4" />
                Tap List ({tapList.length})
              </TabsTrigger>
              <TabsTrigger value="bottles" className="flex items-center gap-2">
                <Wine className="w-4 h-4" />
                Cantina ({bottleList.length})
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Menu ({menu.length})
              </TabsTrigger>
            </TabsList>

            {/* Tap List */}
            <TabsContent value="taplist">
              <TapListManager pubId={selectedPub.id} tapList={tapList} />
            </TabsContent>

            {/* Cantina Birre */}
            <TabsContent value="bottles">
              <BottleListManager pubId={selectedPub.id} bottleList={bottleList} />
            </TabsContent>

            {/* Menu Cibo */}
            <TabsContent value="menu">
              <MenuManager pubId={selectedPub.id} menu={menu} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}