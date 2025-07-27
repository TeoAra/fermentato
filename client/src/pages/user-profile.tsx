import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Star, 
  Beer, 
  Calendar, 
  Edit3, 
  Save, 
  X,
  Heart,
  Shield,
  Mail,
  Key,
  Upload,
  ChevronDown,
  ChevronUp
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
    nickname: typedUser?.nickname || "",
    firstName: typedUser?.firstName || "",
    lastName: typedUser?.lastName || "",
    bio: typedUser?.bio || "",
    favoriteStyle: typedUser?.favoriteStyle || "",
    profileImageUrl: typedUser?.profileImageUrl || "",
  });
  
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    tastings: false,
    favorites: false,
    account: false
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

  // Fetch unique beer styles for dropdown
  const { data: beerStyles = [] } = useQuery({
    queryKey: ["/api/beers/styles"],
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
      nickname: typedUser?.nickname || "",
      firstName: typedUser?.firstName || "",
      lastName: typedUser?.lastName || "",
      bio: typedUser?.bio || "",
      favoriteStyle: typedUser?.favoriteStyle || "",
      profileImageUrl: typedUser?.profileImageUrl || "",
    });
    setIsEditing(false);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const canChangeEmail = () => {
    if (!typedUser?.lastEmailChange) return true;
    const daysSinceChange = (Date.now() - new Date(typedUser.lastEmailChange).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 15;
  };

  const canChangePassword = () => {
    if (!typedUser?.lastPasswordChange) return true;
    const daysSinceChange = (Date.now() - new Date(typedUser.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 15;
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
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Header Mobile-First */}
      <div className="text-center mb-6">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarImage src={typedUser.profileImageUrl || ""} />
          <AvatarFallback className="text-xl bg-amber-100 dark:bg-amber-900">
            {typedUser.nickname?.charAt(0) || typedUser.firstName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {typedUser.userType === 'customer' ? (typedUser.nickname || 'Utente') : `${typedUser.firstName} ${typedUser.lastName}`}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
          {typedUser.email}
        </p>
        <Badge variant="outline" className="mb-4">
          {typedUser.userType === 'admin' ? 'Amministratore' : 
           typedUser.userType === 'pub_owner' ? 'Proprietario Pub' : 'Cliente'}
        </Badge>
        
        {typedUser.userType === 'admin' && (
          <Link href="/admin">
            <Button className="bg-red-600 hover:bg-red-700 text-white mb-4">
              <Shield className="w-4 h-4 mr-2" />
              Pannello Admin
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile-First Sections */}
      <div className="space-y-4">

        {/* Profile Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('profile')}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Il Mio Profilo
                <Badge variant="secondary" className="ml-2">
                  {typedUser.userType === 'customer' ? 'Pubblico: Nickname' : 'Pubblico: Nome'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {!isEditing && expandedSections.profile && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
                {expandedSections.profile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
          
          {expandedSections.profile && (
            <CardContent className="space-y-4">
              {isEditing && (
                <div className="flex gap-2 mb-4">
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

              <div className="space-y-4">
                {/* Nickname for customers, Name for owners/admins */}
                {typedUser.userType === 'customer' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nickname (Pubblico)
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedProfile.nickname}
                        onChange={(e) => setEditedProfile({ ...editedProfile, nickname: e.target.value })}
                        className="mt-1"
                        placeholder="Il tuo nickname pubblico"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                        {typedUser.nickname || "Non specificato"}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nome (Pubblico)
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedProfile.firstName}
                          onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                          {typedUser.firstName || "Non specificato"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cognome (Pubblico)
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedProfile.lastName}
                          onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                          {typedUser.lastName || "Non specificato"}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Favorite Style from Database */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stile Preferito
                  </label>
                  {isEditing ? (
                    <select
                      value={editedProfile.favoriteStyle}
                      onChange={(e) => setEditedProfile({ ...editedProfile, favoriteStyle: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="">Seleziona uno stile...</option>
                      {beerStyles.map((style: string) => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
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

                {/* Bio */}
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

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  Membro dal {new Date(typedUser.createdAt).toLocaleDateString('it-IT')}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Beer Tastings Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('tastings')}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5" />
                Birre Assaggiate ({beerTastings.length})
              </CardTitle>
              {expandedSections.tastings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          
          {expandedSections.tastings && (
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
          )}
        </Card>

        {/* Favorites Section - Fixed Display */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('favorites')}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                I Miei Preferiti ({favorites.length})
              </CardTitle>
              {expandedSections.favorites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          
          {expandedSections.favorites && (
            <CardContent>
              {favorites.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Nessun preferito salvato
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Inizia ad esplorare e salva i tuoi pub, birrifici e birre preferiti!
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/explore/pubs">Esplora Pub</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/explore/breweries">Esplora Birrifici</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {favorites.map((favorite: any) => {
                    const getItemIcon = () => {
                      switch (favorite.itemType) {
                        case 'pub': return '🍺';
                        case 'brewery': return '🏭';
                        case 'beer': return '🍻';
                        default: return '❤️';
                      }
                    };

                    const getItemLink = () => {
                      switch (favorite.itemType) {
                        case 'pub': return `/pub/${favorite.itemId}`;
                        case 'brewery': return `/brewery/${favorite.itemId}`;
                        case 'beer': return `/beer/${favorite.itemId}`;
                        default: return '#';
                      }
                    };

                    return (
                      <Link key={favorite.id} href={getItemLink()}>
                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="text-2xl">{getItemIcon()}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm line-clamp-1">
                              {favorite.itemName || `${favorite.itemType} #${favorite.itemId}`}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {favorite.itemType === 'pub' ? 'Pub' : 
                               favorite.itemType === 'brewery' ? 'Birrificio' : 'Birra'}
                            </div>
                          </div>
                          <div className="text-red-500">
                            <Heart className="w-4 h-4 fill-current" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>



        {/* Account Settings Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('account')}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Impostazioni Account
              </CardTitle>
              {expandedSections.account ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          
          {expandedSections.account && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4" />
                    <h4 className="font-medium">Modifica Email</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Email attuale: {typedUser.email}
                  </p>
                  {canChangeEmail() ? (
                    <Button size="sm" variant="outline">
                      Cambia Email
                    </Button>
                  ) : (
                    <div>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                        Puoi modificare l'email ogni 15 giorni
                      </p>
                      <Button size="sm" variant="outline" disabled>
                        Cambia Email
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4" />
                    <h4 className="font-medium">Modifica Password</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Ultimo cambio password: {typedUser.lastPasswordChange ? 
                      new Date(typedUser.lastPasswordChange).toLocaleDateString('it-IT') : 'Mai'
                    }
                  </p>
                  {canChangePassword() ? (
                    <Button size="sm" variant="outline">
                      Cambia Password
                    </Button>
                  ) : (
                    <div>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                        Puoi modificare la password ogni 15 giorni
                      </p>
                      <Button size="sm" variant="outline" disabled>
                        Cambia Password
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
}