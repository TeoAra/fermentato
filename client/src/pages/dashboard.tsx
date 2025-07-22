import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Store, 
  Beer, 
  MapPin, 
  Heart, 
  Calendar, 
  Settings, 
  Plus, 
  Pencil,
  Bell,
  TrendingUp,
  Users,
  Star,
  Clock,
  ChefHat
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

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

  // Mock data per ora - in futuro dal backend
  const { data: userPubs } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated
  });

  const { data: userFavorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated
  });

  const isPubOwner = user?.userType === "pub_owner" || (userPubs && userPubs.length > 0);

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
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isPubOwner ? "Gestisci il tuo locale" : "Il tuo profilo birraio"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni
          </Button>
          {isPubOwner && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Birra
            </Button>
          )}
        </div>
      </div>

      {isPubOwner ? (
        // Dashboard Proprietario Pub
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Clienti Oggi
                    </p>
                    <div className="text-2xl font-bold">24</div>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Birre Attive
                    </p>
                    <div className="text-2xl font-bold">6/8</div>
                  </div>
                  <Beer className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Fatturato Mese
                    </p>
                    <div className="text-2xl font-bold">€12.5K</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Rating Medio
                    </p>
                    <div className="text-2xl font-bold">4.8</div>
                  </div>
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pub Owner Tabs */}
          <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab("taplist")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "taplist" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Lista Spine
              </button>
              <button 
                onClick={() => setActiveTab("menu")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "menu" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Menu Cibo
              </button>
              <button 
                onClick={() => setActiveTab("events")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "events" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Eventi
              </button>
              <button 
                onClick={() => setActiveTab("analytics")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "analytics" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Statistiche
              </button>
            </div>

            {/* Tap List Management */}
            {activeTab === "taplist" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Lista Spine</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Birra
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 1, name: "Baladin Super", brewery: "Baladin", price: "€6.50", tap: 1, available: true },
                    { id: 2, name: "Punk IPA", brewery: "BrewDog", price: "€5.80", tap: 2, available: true },
                    { id: 3, name: "Weiss", brewery: "Birrificio locale", price: "€4.50", tap: 3, available: false },
                  ].map((beer) => (
                    <Card key={beer.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={beer.available ? "default" : "secondary"}>
                              Spina {beer.tap}
                            </Badge>
                            <Switch checked={beer.available} />
                          </div>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                        <h4 className="font-semibold">{beer.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{beer.brewery}</p>
                        <p className="text-lg font-bold text-orange-600">{beer.price}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Management */}
            {activeTab === "menu" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Menu Cibo</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Piatto
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { id: 1, name: "Hamburger Classico", category: "Burger", price: "€12.00" },
                    { id: 2, name: "Patatine Artigianali", category: "Contorni", price: "€4.50" },
                    { id: 3, name: "Tagliata di Manzo", category: "Secondi", price: "€18.00" },
                  ].map((dish) => (
                    <Card key={dish.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ChefHat className="h-8 w-8 text-gray-400" />
                            <div>
                              <h4 className="font-semibold">{dish.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{dish.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-orange-600">{dish.price}</span>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Events Management */}
            {activeTab === "events" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Eventi</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Evento
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { id: 1, title: "Degustazione Birre Belghe", date: "25 Gen", time: "20:00", attendees: 15 },
                    { id: 2, title: "Live Music Night", date: "28 Gen", time: "21:30", attendees: 8 },
                  ].map((event) => (
                    <Card key={event.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-blue-600" />
                            <div>
                              <h4 className="font-semibold">{event.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {event.date} • {event.time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>{event.attendees} partecipanti</Badge>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Dashboard Cliente
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Locali Preferiti
                    </p>
                    <div className="text-2xl font-bold">{userFavorites?.length || 0}</div>
                  </div>
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Birre Provate
                    </p>
                    <div className="text-2xl font-bold">47</div>
                  </div>
                  <Beer className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Check-in Mese
                    </p>
                    <div className="text-2xl font-bold">12</div>
                  </div>
                  <MapPin className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Sections */}
          <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "favorites" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Preferiti
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "history" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Cronologia
              </button>
              <button 
                onClick={() => setActiveTab("events")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "events" 
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                I Miei Eventi
              </button>
            </div>

            {/* Favorites */}
            {activeTab === "favorites" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">I Tuoi Locali Preferiti</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userFavorites?.map((pub: any) => (
                    <Card key={pub.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                            <Store className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{pub.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{pub.address}</p>
                            <Badge variant="outline" className="text-xs">
                              6 nuove birre
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <p className="text-gray-500 dark:text-gray-400">
                      Non hai ancora locali preferiti. Inizia a esplorare!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}