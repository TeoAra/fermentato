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
import { Heart, Star, Beer, Store, Settings, User, Activity, Calendar, Edit3, Save, X } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function UserDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nickname: "",
    bio: "",
    profileImageUrl: "",
  });

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

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        nickname: user.nickname || "",
        bio: user.bio || "",
        profileImageUrl: user.profileImageUrl || "",
      });
    }
  }, [user]);

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Fetch user activities
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/user-activities"],
    enabled: isAuthenticated,
  });

  // Separate favorites by type
  const pubFavorites = favorites.filter((fav: any) => fav.itemType === 'pub');
  const breweryFavorites = favorites.filter((fav: any) => fav.itemType === 'brewery');
  const beerFavorites = favorites.filter((fav: any) => fav.itemType === 'beer');

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditingProfile(false);
      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche al tuo profilo sono state salvate",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il profilo",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Profile */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Card className="md:w-1/3">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage 
                  src={profileData.profileImageUrl || user?.profileImageUrl} 
                  alt={user?.firstName || "User"} 
                />
                <AvatarFallback className="text-2xl">
                  {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {isEditingProfile ? (
                <div className="w-full space-y-3">
                  <Input
                    placeholder="Nickname"
                    value={profileData.nickname}
                    onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                  />
                  <Textarea
                    placeholder="Racconta qualcosa di te..."
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Salva
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mb-2">
                    {profileData.nickname || user?.firstName || "Utente"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {user?.email}
                  </p>
                  {profileData.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {profileData.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    Iscritto {formatDistanceToNow(new Date(user?.joinedAt || user?.createdAt || new Date()), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Modifica Profilo
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pub Preferiti
                  </p>
                  <div className="text-2xl font-bold">{pubFavorites.length}</div>
                </div>
                <Store className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Birrifici Seguiti
                  </p>
                  <div className="text-2xl font-bold">{breweryFavorites.length}</div>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Birre Preferite
                  </p>
                  <div className="text-2xl font-bold">{beerFavorites.length}</div>
                </div>
                <Beer className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="favorites">Preferiti</TabsTrigger>
          <TabsTrigger value="activity">Attività</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="space-y-6">
          {/* Pub Favorites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Pub Preferiti ({pubFavorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pubFavorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pubFavorites.map((favorite: any) => (
                    <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                            <Store className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Pub #{favorite.itemId}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Aggiunto {formatDistanceToNow(new Date(favorite.createdAt), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Non hai ancora pub preferiti. Inizia a esplorare!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Brewery Favorites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Birrifici Seguiti ({breweryFavorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breweryFavorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {breweryFavorites.map((favorite: any) => (
                    <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                            <Star className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Birrificio #{favorite.itemId}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Seguito {formatDistanceToNow(new Date(favorite.createdAt), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Non segui ancora nessun birrificio. Scopri nuovi produttori!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Beer Favorites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5" />
                Birre Preferite ({beerFavorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beerFavorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {beerFavorites.map((favorite: any) => (
                    <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                            <Beer className="h-6 w-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Birra #{favorite.itemId}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Aggiunta {formatDistanceToNow(new Date(favorite.createdAt), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Non hai ancora birre preferite. Inizia a degustare!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Attività Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(activity.createdAt), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Nessuna attività recente
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Impostazioni Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Notifiche Email</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ricevi aggiornamenti sui tuoi pub preferiti
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configura
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Privacy</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestisci la visibilità del tuo profilo
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Modifica
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium text-red-600">Elimina Account</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rimuovi permanentemente il tuo account
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Elimina
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}