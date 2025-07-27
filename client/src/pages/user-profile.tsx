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
  ChevronUp,
  Trash2,
  AlertTriangle,
  Settings,
  Building,
  Store
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import type { User as UserType } from "@shared/schema";
import UserFavoritesSection from "@/components/UserFavoritesSection";
import BeerTastingsEditor from "@/components/BeerTastingsEditorNew";
import { PubAutocomplete } from "@/components/PubAutocomplete";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const typedUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(typedUser?.nickname || "");
  
  const [editedProfile, setEditedProfile] = useState({
    nickname: typedUser?.nickname || "",
    bio: typedUser?.bio || "",
    favoriteStyles: typedUser?.favoriteStyles || [],
    profileImageUrl: typedUser?.profileImageUrl || "",
  });
  
  const [accountSettings, setAccountSettings] = useState({
    firstName: typedUser?.firstName || "",
    lastName: typedUser?.lastName || "",
    email: typedUser?.email || "",
  });

  const [tempNickname, setTempNickname] = useState(typedUser?.nickname || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Handle redirects for unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso Richiesto",
        description: "Devi effettuare l'accesso per vedere il profilo.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Data fetching
  const { data: beerTastings = [] } = useQuery({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: beerStyles = [] } = useQuery({
    queryKey: ["/api/beers/styles"],
    enabled: isAuthenticated,
  });

  // Process enriched favorites with item names  
  const enrichedFavorites = Array.isArray(favorites) ? favorites.map((fav: any) => ({
    ...fav,
    itemName: fav.itemName || `${fav.itemType} #${fav.itemId}`
  })) : [];

  // Check if nickname can be updated (15 days limit)
  const canUpdateNickname = () => {
    if (!typedUser?.lastNicknameUpdate) return true;
    const lastUpdate = new Date(typedUser.lastNicknameUpdate);
    const now = new Date();
    const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    return daysDiff >= 15;
  };

  const getDaysUntilNicknameUpdate = () => {
    if (!typedUser?.lastNicknameUpdate) return 0;
    const lastUpdate = new Date(typedUser.lastNicknameUpdate);
    const now = new Date();
    const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    return Math.ceil(15 - daysDiff);
  };

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest("/api/user/profile", "PATCH", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo",
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

  const nicknameUpdateMutation = useMutation({
    mutationFn: async (newNickname: string) => {
      return apiRequest("/api/user/nickname", "PATCH", { nickname: newNickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditingNickname(false);
      toast({
        title: "Nickname aggiornato",
        description: "Il tuo nickname è stato modificato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il nickname.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/auth/user/delete`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Account eliminato",
        description: "Il tuo account è stato eliminato definitivamente.",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'account.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleNicknameSave = () => {
    if (!canUpdateNickname()) {
      toast({
        title: "Limite raggiunto",
        description: `Puoi cambiare il nickname tra ${getDaysUntilNicknameUpdate()} giorni`,
        variant: "destructive",
      });
      return;
    }
    nicknameUpdateMutation.mutate(tempNickname);
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !typedUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Avatar and Basic Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Image - Clickable */}
              <div className="relative">
                <Avatar className="w-24 h-24 cursor-pointer" onClick={() => document.getElementById('profile-image-input')?.click()}>
                  <AvatarImage src={typedUser.profileImageUrl || ""} />
                  <AvatarFallback className="bg-amber-600 text-white text-2xl">
                    {typedUser.nickname?.[0]?.toUpperCase() || typedUser.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-amber-600 rounded-full p-1">
                  <Upload className="w-3 h-3 text-white" />
                </div>
                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfileImageFile(file);
                      try {
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        const response = await fetch('/api/user/upload-profile-image', {
                          method: 'POST',
                          body: formData,
                        });
                        
                        if (response.ok) {
                          const { imageUrl } = await response.json();
                          // Update user profile with new image
                          await updateProfileMutation.mutateAsync({ profileImageUrl: imageUrl });
                          toast({
                            title: "Immagine caricata",
                            description: "L'immagine del profilo è stata aggiornata con successo",
                            variant: "default",
                          });
                        } else {
                          throw new Error('Upload failed');
                        }
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Impossibile caricare l'immagine",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                {/* Nickname with Edit Button */}
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="w-48"
                        placeholder="Inserisci nickname"
                      />
                      <Button
                        size="sm"
                        onClick={handleNicknameSave}
                        disabled={nicknameUpdateMutation.isPending || !canUpdateNickname()}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingNickname(false);
                          setTempNickname(typedUser.nickname || "");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {typedUser.nickname || "Utente senza nome"}
                      </h1>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingNickname(true)}
                        disabled={!canUpdateNickname()}
                        title={!canUpdateNickname() ? `Disponibile tra ${getDaysUntilNicknameUpdate()} giorni` : "Modifica nickname"}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Badge variant={typedUser.userType === 'admin' ? 'default' : 'secondary'}>
                    {typedUser.userType === 'admin' ? 'Amministratore' : 
                     typedUser.userType === 'pub_owner' ? 'Proprietario Pub' : 'Cliente'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Iscritto il {new Date(typedUser.createdAt).toLocaleDateString('it-IT')}
                  </Badge>
                </div>

                {/* Admin Panel Button - Under Role */}
                {typedUser.userType === 'admin' && (
                  <div className="mt-2">
                    <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
                      <Link href="/admin">
                        <Shield className="w-4 h-4 mr-2" />
                        Pannello Admin
                      </Link>
                    </Button>
                  </div>
                )}

                {typedUser.bio && (
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {typedUser.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Public Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Favorite Styles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Stili Preferiti</span>
                  {!isEditing && (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                      <div className="grid grid-cols-2 gap-2">
                        {beerStyles.map((styleObj: any) => {
                          const isSelected = editedProfile.favoriteStyles.includes(styleObj.style);
                          return (
                            <button
                              key={styleObj.style}
                              type="button"
                              onClick={() => {
                                const currentStyles = editedProfile.favoriteStyles;
                                if (isSelected) {
                                  setEditedProfile({
                                    ...editedProfile,
                                    favoriteStyles: currentStyles.filter(s => s !== styleObj.style)
                                  });
                                } else if (currentStyles.length < 5) {
                                  setEditedProfile({
                                    ...editedProfile,
                                    favoriteStyles: [...currentStyles, styleObj.style]
                                  });
                                }
                              }}
                              className={`p-2 rounded-lg text-xs font-medium transition-all border-2 ${
                                isSelected
                                  ? 'border-amber-400 shadow-md transform scale-105'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                              }`}
                              style={{
                                backgroundColor: isSelected ? styleObj.color : 'transparent',
                                color: isSelected ? '#fff' : 'inherit',
                                textShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                              }}
                              disabled={!isSelected && editedProfile.favoriteStyles.length >= 5}
                            >
                              {styleObj.style}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Selezionati: {editedProfile.favoriteStyles.length}/5
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Salvando..." : "Salva"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedProfile({
                            nickname: typedUser?.nickname || "",
                            bio: typedUser?.bio || "",
                            favoriteStyles: typedUser?.favoriteStyles || [],
                            profileImageUrl: typedUser?.profileImageUrl || "",
                          });
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {typedUser.favoriteStyles && typedUser.favoriteStyles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {typedUser.favoriteStyles.map((style: string) => {
                          const styleObj = beerStyles.find((s: any) => s.style === style);
                          return (
                            <span
                              key={style}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                              style={{
                                backgroundColor: styleObj?.color || '#D68910',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            >
                              <Beer className="w-3 h-3 mr-1" />
                              {style}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Nessuno stile selezionato
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Beer Tastings with Editor */}
            <BeerTastingsEditor beerTastings={beerTastings} />

            {/* Favorites Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Preferiti ({enrichedFavorites?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedFavorites && enrichedFavorites.length > 0 ? (
                  <div className="space-y-2">
                    {enrichedFavorites.slice(0, 5).map((fav: any) => (
                      <div key={fav.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {fav.itemType === 'brewery' ? 'Birrificio' : 
                             fav.itemType === 'pub' ? 'Pub' : 'Birra'}
                          </Badge>
                          <span className="text-sm">{fav.itemName || `${fav.itemType} #${fav.itemId}`}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(fav.createdAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    ))}
                    {enrichedFavorites.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        e altri {enrichedFavorites.length - 5} preferiti...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Nessun preferito ancora
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Account Settings */}
          <div className="space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowAccountSettings(!showAccountSettings)}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Impostazioni Account
                  </div>
                  {showAccountSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
              {showAccountSettings && (
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <Input
                      value={accountSettings.firstName}
                      onChange={(e) => setAccountSettings({ ...accountSettings, firstName: e.target.value })}
                      placeholder="Il tuo nome"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cognome
                    </label>
                    <Input
                      value={accountSettings.lastName}
                      onChange={(e) => setAccountSettings({ ...accountSettings, lastName: e.target.value })}
                      placeholder="Il tuo cognome"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={accountSettings.email}
                        onChange={(e) => setAccountSettings({ ...accountSettings, email: e.target.value })}
                        placeholder="La tua email"
                      />
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Button variant="outline" className="w-full">
                      <Key className="w-4 h-4 mr-2" />
                      Cambia Password
                    </Button>
                  </div>

                  <Separator />

                  {/* Delete Account */}
                  <div className="space-y-2">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimina Account
                    </Button>
                    
                    {showDeleteConfirm && (
                      <div className="p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800 dark:text-red-200">
                            Conferma eliminazione
                          </span>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                          Questa azione è irreversibile. Tutti i tuoi dati saranno eliminati permanentemente.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleteAccountMutation.isPending}
                          >
                            {deleteAccountMutation.isPending ? "Eliminando..." : "Conferma Eliminazione"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* User Favorites Section */}
        <UserFavoritesSection enrichedFavorites={enrichedFavorites} />
      </div>
    </div>
  );
}