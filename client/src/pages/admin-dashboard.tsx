import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Store, 
  Beer, 
  Star, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Edit3,
  Save,
  Trash2,
  Crown,
  Activity,
  Database,
  TrendingUp,
  Eye,
  MessageSquare,
  Flag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.userType !== 'admin')) {
      toast({
        title: "Accesso negato",
        description: "Solo gli amministratori possono accedere a questa dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = user ? "/" : "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch admin statistics - using real global data
  const { data: stats } = useQuery({
    queryKey: ["/api/stats/global"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch admin-specific stats for user management
  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch all users for management
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch all pubs for management
  const { data: allPubs = [] } = useQuery({
    queryKey: ["/api/admin/pubs"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch all breweries for management  
  const { data: allBreweries = [] } = useQuery({
    queryKey: ["/api/admin/breweries"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch all beers for management
  const { data: allBeers = [] } = useQuery({
    queryKey: ["/api/admin/beers"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Fetch pending reviews
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ["/api/admin/reviews/pending"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Update beer mutation
  const updateBeerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/beers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beers"] });
      toast({
        title: "Birra aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
    },
  });

  // Update brewery mutation
  const updateBreweryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/breweries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breweries"] });
      toast({
        title: "Birrificio aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
    },
  });

  // Approve/Reject review mutation
  const reviewActionMutation = useMutation({
    mutationFn: async ({ reviewId, action }: { reviewId: number; action: 'approve' | 'reject' }) => {
      return apiRequest(`/api/admin/reviews/${reviewId}/${action}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending"] });
      toast({
        title: "Recensione processata",
        description: "L'azione è stata completata con successo",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento dashboard amministrativa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Amministrativa</h1>
              <p className="text-white/90">
                Benvenuto {user?.firstName || "Amministratore"} - Controllo completo del sistema Fermenta.to
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utenti Totali</p>
                <div className="text-2xl font-bold">{adminStats?.totalUsers || allUsers.length}</div>
                <p className="text-xs text-gray-500 mt-1">Clienti e pub owner attivi</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pub Registrati</p>
                <div className="text-2xl font-bold">{adminStats?.totalPubs || allPubs.length}</div>
                <p className="text-xs text-gray-500 mt-1">Locali verificati</p>
              </div>
              <Store className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Birrifici Mondiali</p>
                <div className="text-2xl font-bold">{stats?.totalBreweries?.toLocaleString() || '2,968'}</div>
                <p className="text-xs text-gray-500 mt-1">Da 20+ paesi</p>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Birre Autentiche</p>
                <div className="text-2xl font-bold">{stats?.totalBeers?.toLocaleString() || '29,753'}</div>
                <p className="text-xs text-gray-500 mt-1">{stats?.uniqueStyles || 293} stili unici</p>
              </div>
              <Beer className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Database className="w-4 h-4" />
            Contenuti
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Recensioni
            {pendingReviews.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingReviews.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Attività Recenti del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nuovo pub registrato</p>
                      <p className="text-xs text-gray-500">2 ore fa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                    <Database className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Database aggiornato con nuove birre</p>
                      <p className="text-xs text-gray-500">5 ore fa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <Flag className="w-5 h-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nuova recensione da moderare</p>
                      <p className="text-xs text-gray-500">1 giorno fa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Azioni Richieste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10">
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {pendingReviews.length} recensioni in attesa
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Richiede moderazione immediata
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setActiveTab("reviews")}>
                      Rivedi
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestione Utenti</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Esporta Lista</Button>
              <Button size="sm">Nuovo Utente</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Iscrizione</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {allUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback>
                                {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.firstName || user.nickname || "Utente"}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={user.userType === 'admin' ? 'destructive' : user.userType === 'pub_owner' ? 'default' : 'secondary'}>
                            {user.userType === 'admin' ? 'Admin' : user.userType === 'pub_owner' ? 'Pub Owner' : 'Cliente'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: it })}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Attivo
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Tabs defaultValue="beers" className="w-full">
            <TabsList>
              <TabsTrigger value="beers">Birre ({allBeers.length})</TabsTrigger>
              <TabsTrigger value="breweries">Birrifici ({allBreweries.length})</TabsTrigger>
              <TabsTrigger value="pubs">Pub ({allPubs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="beers" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Gestione Birre</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Importa Birre</Button>
                  <Button size="sm">Nuova Birra</Button>
                </div>
              </div>

              <div className="grid gap-4">
                {allBeers.slice(0, 10).map((beer: any) => (
                  <Card key={beer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Beer className="w-6 w-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold">{beer.name}</h5>
                            <p className="text-sm text-gray-600">
                              {beer.style} • {beer.abv}% ABV • Birrificio #{beer.breweryId}
                            </p>
                            {beer.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {beer.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const newDescription = prompt("Nuova descrizione:", beer.description || "");
                              if (newDescription !== null) {
                                updateBeerMutation.mutate({ 
                                  id: beer.id, 
                                  data: { description: newDescription } 
                                });
                              }
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="breweries" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Gestione Birrifici</h4>
                <Button size="sm">Nuovo Birrificio</Button>
              </div>

              <div className="grid gap-4">
                {allBreweries.slice(0, 10).map((brewery: any) => (
                  <Card key={brewery.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Star className="w-6 w-6 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold">{brewery.name}</h5>
                            <p className="text-sm text-gray-600">
                              {brewery.location}, {brewery.region}
                            </p>
                            {brewery.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {brewery.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const newDescription = prompt("Nuova descrizione:", brewery.description || "");
                              if (newDescription !== null) {
                                updateBreweryMutation.mutate({ 
                                  id: brewery.id, 
                                  data: { description: newDescription } 
                                });
                              }
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Moderazione Recensioni</h3>
            <Badge variant="destructive">
              {pendingReviews.length} in attesa
            </Badge>
          </div>

          {pendingReviews.length > 0 ? (
            <div className="space-y-4">
              {pendingReviews.map((review: any) => (
                <Card key={review.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Utente #{review.userId}</p>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: it })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {review.comment}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => reviewActionMutation.mutate({ reviewId: review.id, action: 'approve' })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approva
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => reviewActionMutation.mutate({ reviewId: review.id, action: 'reject' })}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rifiuta
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
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tutto sotto controllo!</h3>
                <p className="text-gray-600">Non ci sono recensioni in attesa di moderazione</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Stili di Birre
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topStyles?.slice(0, 8).map((style: any, index: number) => (
                    <div key={style.style} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{style.style}</p>
                          <p className="text-sm text-gray-500">{parseInt(style.count).toLocaleString()} birre</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                            style={{ width: `${Math.min(100, (parseInt(style.count) / parseInt(stats.topStyles[0].count)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Birrifici più Produttivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topBreweries?.slice(0, 8).map((brewery: any, index: number) => (
                    <div key={brewery.breweryName} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{brewery.breweryName}</p>
                          <p className="text-sm text-gray-500">{brewery.location || 'Ubicazione non specificata'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{parseInt(brewery.beerCount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">birre</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistiche Database Globale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.totalBeers?.toLocaleString() || '29,753'}
                  </div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">Birre Totali</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Database mondiale</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats?.totalBreweries?.toLocaleString() || '2,968'}
                  </div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mt-1">Birrifici</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">20+ paesi</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {stats?.uniqueStyles || '293'}
                  </div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mt-1">Stili Unici</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Varietà globale</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {stats?.lastUpdated ? formatDistanceToNow(new Date(stats.lastUpdated), { locale: it }) : 'Ora'}
                  </div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mt-1">Ultimo Aggiornamento</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Dati in tempo reale</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurazione Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Modalità Manutenzione</h4>
                    <p className="text-sm text-gray-600">Disabilita l'accesso pubblico</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Attiva
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Backup Database</h4>
                    <p className="text-sm text-gray-600">Esegui backup completo</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Esegui
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Gestione Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Aggiorna Database Birre</h4>
                    <p className="text-sm text-gray-600">Sincronizza con fonti esterne</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Aggiorna
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Pulisci Cache</h4>
                    <p className="text-sm text-gray-600">Svuota cache di sistema</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Pulisci
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}