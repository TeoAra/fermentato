import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Star, 
  Beer, 
  Calendar, 
  Edit3, 
  Save, 
  X,
  Heart,
  ThumbsUp,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import type { User as UserType } from "@shared/schema";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const typedUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    firstName: typedUser?.firstName || "",
    lastName: typedUser?.lastName || "",
    bio: typedUser?.bio || "",
    location: typedUser?.location || "",
    favoriteStyle: typedUser?.favoriteStyle || "",
  });

  // Fetch user's beer tastings
  const { data: beerTastings = [] } = useQuery({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  // Fetch user's favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest("/api/user/profile", "PATCH", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Successo",
        description: "Profilo aggiornato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del profilo",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleCancelEdit = () => {
    setEditedProfile({
      firstName: typedUser?.firstName || "",
      lastName: typedUser?.lastName || "",
      bio: typedUser?.bio || "",
      location: typedUser?.location || "",
      favoriteStyle: typedUser?.favoriteStyle || "",
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

  if (!isAuthenticated || !typedUser) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Accesso richiesto</h1>
        <p className="text-gray-600 mb-4">Effettua l'accesso per vedere il tuo profilo</p>
        <Button asChild>
          <a href="/api/login">Accedi</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Il Mio Profilo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci il tuo profilo e le tue birre preferite
          </p>
        </div>
        {typedUser.userType === 'admin' && (
          <Link href="/admin">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Shield className="w-4 h-4 mr-2" />
              Pannello Admin
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="tastings">Birre Assaggiate ({beerTastings.length})</TabsTrigger>
          <TabsTrigger value="favorites">Preferiti ({favorites.length})</TabsTrigger>
          <TabsTrigger value="activity">Attività</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informazioni Personali
                </CardTitle>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modifica
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salva
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annulla
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={typedUser.profileImageUrl || ""} />
                  <AvatarFallback className="text-lg">
                    {typedUser.firstName?.charAt(0)}{typedUser.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {typedUser.firstName} {typedUser.lastName}
                  </h3>
                  <p className="text-gray-600">{typedUser.email}</p>
                  <Badge variant="outline" className="mt-1">
                    {typedUser.userType === 'admin' ? 'Amministratore' : 
                     typedUser.userType === 'pub_owner' ? 'Proprietario Pub' : 'Cliente'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.firstName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {typedUser.firstName || "Non specificato"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cognome
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.lastName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {typedUser.lastName || "Non specificato"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Posizione
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.location}
                      onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                      className="mt-1"
                      placeholder="Città, Regione"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      {typedUser.location ? (
                        <>
                          <MapPin className="w-4 h-4" />
                          {typedUser.location}
                        </>
                      ) : (
                        "Non specificato"
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stile Preferito
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedProfile.favoriteStyle}
                      onChange={(e) => setEditedProfile({ ...editedProfile, favoriteStyle: e.target.value })}
                      className="mt-1"
                      placeholder="es. IPA, Stout, Lager..."
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100 flex items-center gap-1">
                      {typedUser.favoriteStyle ? (
                        <>
                          <Beer className="w-4 h-4" />
                          {typedUser.favoriteStyle}
                        </>
                      ) : (
                        "Non specificato"
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Biografia
                </label>
                {isEditing ? (
                  <Textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    className="mt-1"
                    placeholder="Raccontaci qualcosa di te e delle tue preferenze birrarie..."
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {typedUser.bio || "Nessuna biografia inserita"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                Membro dal {new Date(typedUser.createdAt).toLocaleDateString('it-IT')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beer Tastings Tab */}
        <TabsContent value="tastings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5" />
                Le Mie Birre Assaggiate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beerTastings.length === 0 ? (
                <div className="text-center py-8">
                  <Beer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Nessuna birra assaggiata
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Inizia ad esplorare e assaggiare birre per tenere traccia dei tuoi gusti!
                  </p>
                  <Button asChild>
                    <Link href="/explore/breweries">Esplora Birrifici</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {beerTastings.map((tasting: any) => (
                    <Card key={tasting.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <img
                            src={tasting.beer?.imageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9"}
                            alt={tasting.beer?.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {tasting.beer?.name}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-1">
                              {tasting.brewery?.name}
                            </p>
                            {tasting.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i}
                                    className={`w-3 h-3 ${i < tasting.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            )}
                            {tasting.personalNotes && (
                              <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                                {tasting.personalNotes}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(tasting.tastedAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pub Preferiti */}
            {favorites.filter((fav: any) => fav.itemType === 'pub').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Pub Preferiti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favorites
                      .filter((fav: any) => fav.itemType === 'pub')
                      .map((favorite: any) => (
                        <Link key={favorite.id} href={`/pub/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="font-medium text-sm">
                              {favorite.itemName || `Pub #${favorite.itemId}`}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Clicca per vedere
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Birrifici Preferiti */}
            {favorites.filter((fav: any) => fav.itemType === 'brewery').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Birrifici Preferiti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favorites
                      .filter((fav: any) => fav.itemType === 'brewery')
                      .map((favorite: any) => (
                        <Link key={favorite.id} href={`/brewery/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="font-medium text-sm">
                              {favorite.itemName || `Birrificio #${favorite.itemId}`}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Clicca per vedere
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Birre Preferite */}
            {favorites.filter((fav: any) => fav.itemType === 'beer').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Birre Preferite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favorites
                      .filter((fav: any) => fav.itemType === 'beer')
                      .map((favorite: any) => (
                        <Link key={favorite.id} href={`/beer/${favorite.itemId}`}>
                          <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="font-medium text-sm">
                              {favorite.itemName || `Birra #${favorite.itemId}`}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Clicca per vedere
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {favorites.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nessun preferito salvato
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Inizia ad esplorare e salva i tuoi pub, birrifici e birre preferiti!
                </p>
                <div className="flex gap-2 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/explore/pubs">Esplora Pub</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/explore/breweries">Esplora Birrifici</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5" />
                Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ThumbsUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Funzione in sviluppo
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Presto potrai vedere qui tutte le tue attività: preferiti aggiunti, birre assaggiate, recensioni scritte e molto altro!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}