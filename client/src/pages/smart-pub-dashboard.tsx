import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Store, 
  Beer, 
  Users, 
  TrendingUp, 
  Plus, 
  BarChart3, 
  Star, 
  MapPin,
  Clock,
  Edit3,
  Settings,
  Menu as MenuIcon,
  Utensils,
  Image,
  Upload,
  DollarSign,
  Eye,
  EyeOff,
  Calendar,
  Sparkles,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function SmartPubDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect non-pub-owners
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.userType !== 'pub_owner')) {
      toast({
        title: "Accesso negato",
        description: "Solo i proprietari di pub possono accedere a questa dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = user ? "/" : "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch pub data
  const { data: userPubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/pubs/by-owner"],
    enabled: isAuthenticated && user?.userType === 'pub_owner',
  });

  const currentPub = userPubs?.[0];

  // Fetch tap list
  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "taplist"],
    enabled: !!currentPub?.id,
  });

  // Fetch menu data
  const { data: menuData = [] } = useQuery({
    queryKey: ["/api/pubs", currentPub?.id, "menu"],
    enabled: !!currentPub?.id,
  });

  // Mock analytics data (in real app, this would come from the backend)
  const analyticsData = {
    dailyVisitors: 127,
    weeklyGrowth: 12.5,
    popularBeers: 8,
    averageRating: 4.7,
    revenue: 2340,
    events: 3
  };

  if (isLoading || pubsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPub) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-12 h-12 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Benvenuto su Fermenta.to!</h1>
            <p className="text-gray-600 mb-4">
              Registra il tuo pub per iniziare a gestire tap list, menu e molto altro.
            </p>
            <Link href="/pub-registration">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Registra il Tuo Pub
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Smart Header with Pub Info */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                {currentPub.logoUrl ? (
                  <img 
                    src={currentPub.logoUrl} 
                    alt={currentPub.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <Store className="w-10 h-10" />
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{currentPub.name}</h1>
              <div className="flex items-center gap-4 text-white/90">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{currentPub.city}, {currentPub.region}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{currentPub.rating || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Aperto ora</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="gap-2 bg-white/20 hover:bg-white/30 border-0">
                <Edit3 className="w-4 h-4" />
                Modifica Pub
              </Button>
              <Button variant="secondary" size="sm" className="gap-2 bg-white/20 hover:bg-white/30 border-0">
                <Settings className="w-4 h-4" />
                Impostazioni
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/10 rounded-full translate-y-12"></div>
      </div>

      {/* Smart Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Visitatori Oggi</p>
                <div className="text-2xl font-bold">{analyticsData.dailyVisitors}</div>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +{analyticsData.weeklyGrowth}% questa settimana
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Birre in Carta</p>
                <div className="text-2xl font-bold">{tapList.length}</div>
                <p className="text-xs text-gray-500 mt-1">{analyticsData.popularBeers} popolari</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Beer className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating Medio</p>
                <div className="text-2xl font-bold">{analyticsData.averageRating}</div>
                <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-current" />
                  Eccellente
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ricavi Oggi</p>
                <div className="text-2xl font-bold">€{analyticsData.revenue}</div>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +18% vs ieri
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Tabs with Icons and Badges */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Panoramica</span>
          </TabsTrigger>
          <TabsTrigger value="taplist" className="gap-2">
            <Beer className="w-4 h-4" />
            <span className="hidden sm:inline">Tap List</span>
            <Badge variant="secondary" className="ml-1">{tapList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-2">
            <MenuIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Eventi</span>
            <Badge variant="secondary" className="ml-1">{analyticsData.events}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Azioni Rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start gap-3 h-12">
                  <Plus className="w-5 h-5" />
                  Aggiungi Nuova Birra alla Tap List
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                  <Upload className="w-5 h-5" />
                  Carica Foto del Pub
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                  <Utensils className="w-5 h-5" />
                  Aggiorna Menu Cibo
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 h-12">
                  <Calendar className="w-5 h-5" />
                  Programma Evento
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Attività Recenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nuova birra aggiunta alla tap list</p>
                      <p className="text-xs text-gray-500">2 ore fa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Menu cibo aggiornato</p>
                      <p className="text-xs text-gray-500">5 ore fa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nuovo evento programmato</p>
                      <p className="text-xs text-gray-500">1 giorno fa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="taplist" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestione Tap List</h3>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Aggiungi Birra
            </Button>
          </div>
          
          {tapList.length > 0 ? (
            <div className="grid gap-4">
              {tapList.map((item: any) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Beer className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Birra #{item.beerId}</h4>
                          <p className="text-sm text-gray-600">€{item.price || "N/A"} • {item.size || "0.4L"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Attiva" : "Non disponibile"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Beer className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna birra in tap list</h3>
                <p className="text-gray-600 mb-4">Inizia aggiungendo le prime birre alla tua collezione</p>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Aggiungi Prima Birra
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Menu Cibo</h3>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Piatto
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <Utensils className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Menu in costruzione</h3>
              <p className="text-gray-600 mb-4">Aggiungi categorie e piatti per il tuo menu</p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Crea Menu
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics Avanzate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics in arrivo</h3>
                <p className="text-gray-600">Presto disponibili grafici dettagliati su visite, vendite e preferenze</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Gestione Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Galleria Media</h3>
                <p className="text-gray-600 mb-4">Carica foto del tuo pub, piatti e birre</p>
                <Button className="gap-2">
                  <Upload className="w-4 h-4" />
                  Carica Foto
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Eventi e Promozioni</h3>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Evento
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun evento programmato</h3>
              <p className="text-gray-600 mb-4">Crea eventi per attirare più clienti</p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Programma Evento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}