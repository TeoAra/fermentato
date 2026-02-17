import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Textarea,
} from "@/components/ui/textarea";
import {
  User,
  Heart,
  Calendar,
  Edit3,
  Save,
  X,
  Settings,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User as UserType } from "@shared/schema";
import UserFavoritesSection from "@/components/UserFavoritesSection";
import BeerTastingsEditor from "@/components/BeerTastingsEditorNew";
import { ImageUpload } from "@/components/image-upload";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [editedProfile, setEditedProfile] = useState({
    nickname: "",
    bio: "",
    favoriteStyles: [] as string[],
    profileImageUrl: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Devi essere autenticato per accedere al profilo",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: beerTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const { data: enrichedFavorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("/api/user/password", { method: "PATCH" }, data);
    },
    onSuccess: (response) => {
      toast({
        title: "Password aggiornata",
        description: response.message || "Password modificata con successo",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile modificare la password",
        variant: "destructive",
      });
    },
  });

  const typedUser = user as UserType;

  useEffect(() => {
    if (typedUser) {
      setEditedProfile({
        nickname: typedUser.nickname || "",
        bio: typedUser.bio || "",
        favoriteStyles: typedUser.favoriteStyles || [],
        profileImageUrl: typedUser.profileImageUrl || "",
      });
      setTempNickname(typedUser.nickname || "");
      setTempEmail(typedUser.email || "");
    }
  }, [typedUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserType>) => {
      return apiRequest("/api/user/profile", { method: "PATCH" }, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessione scaduta",
          description: "Effettuando il login di nuovo...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il profilo",
        variant: "destructive",
      });
    },
  });

  const nicknameUpdateMutation = useMutation({
    mutationFn: async (nickname: string) => {
      return apiRequest("/api/user/nickname", { method: "PATCH" }, { nickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditingNickname(false);
      toast({
        title: "Nickname aggiornato",
        description: "Il tuo nickname è stato modificato con successo",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessione scaduta",
          description: "Effettuando il login di nuovo...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il nickname",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleNicknameSave = () => {
    nicknameUpdateMutation.mutate(tempNickname);
  };

  const canUpdateNickname = () => {
    if (!(typedUser as any)?.nicknameLastUpdated) return true;
    const lastUpdate = new Date((typedUser as any).nicknameLastUpdated);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return diffInDays >= 15;
  };

  const getDaysUntilNicknameUpdate = () => {
    if (!(typedUser as any)?.nicknameLastUpdated) return 0;
    const lastUpdate = new Date((typedUser as any).nicknameLastUpdated);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, 15 - diffInDays);
  };

  const canUpdateProfileImage = () => {
    if (!(typedUser as any)?.lastProfileImageUpdate) return true;
    const lastUpdate = new Date((typedUser as any).lastProfileImageUpdate);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return diffInDays >= 15;
  };

  const getDaysUntilProfileImageUpdate = () => {
    if (!(typedUser as any)?.lastProfileImageUpdate) return 0;
    const lastUpdate = new Date((typedUser as any).lastProfileImageUpdate);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, 15 - diffInDays);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-orange-200/50 rounded-xl mb-4"></div>
          <div className="h-64 bg-orange-100/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !typedUser) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-32 h-32 md:w-36 md:h-36 flex-shrink-0 rounded-full overflow-hidden ring-4 ring-white/30 shadow-2xl [&>div]:!space-y-0 [&>div>div:first-child]:hidden [&_div.relative]:!rounded-full [&_div.aspect-square]:!max-w-none [&_div.aspect-square]:!border-0 [&_div.aspect-square]:!shadow-none [&_div.aspect-square]:!rounded-none">
                <ImageUpload
                  label=""
                  description=""
                  currentImageUrl={typedUser.profileImageUrl || undefined}
                  onImageChange={async (url) => {
                    if (url) {
                      try {
                        await updateProfileMutation.mutateAsync({ profileImageUrl: url, lastProfileImageUpdate: new Date() } as any);
                      } catch (e) {}
                    }
                  }}
                  folder="profile-images"
                  aspectRatio="square"
                  maxSize={5}
                  showFileInfo={false}
                  disabled={!canUpdateProfileImage()}
                  hideStateIcon={true}
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  {typedUser.nickname || "Utente senza nome"}
                </h1>

                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30">
                    {typedUser.userType === 'admin' ? 'Amministratore' : 
                     typedUser.userType === 'pub_owner' ? 'Proprietario Pub' : 'Cliente'}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs hover:bg-white/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    Iscritto il {typedUser.createdAt ? new Date(typedUser.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                  </Badge>
                </div>

                {!canUpdateProfileImage() && (
                  <p className="text-xs text-white/70 mt-1">
                    Potrai cambiare l'immagine profilo tra {getDaysUntilProfileImageUpdate()} giorni
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-orange-100 dark:border-gray-700 rounded-xl p-1 shadow-lg">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Panoramica</TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Preferiti</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Impostazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-orange-100/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    Informazioni Profilo
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                    className="border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800 dark:hover:bg-orange-900/30"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? "Annulla" : "Modifica"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Bio</label>
                      <Textarea
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                        placeholder="Racconta qualcosa di te..."
                        rows={3}
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
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
                        className="border-orange-200 hover:bg-orange-50 dark:border-orange-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Bio</h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        {typedUser.bio || "Nessuna biografia disponibile"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <BeerTastingsEditor beerTastings={beerTastings} />
          </TabsContent>

          <TabsContent value="favorites">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Heart className="w-5 h-5 text-orange-600" />
                  </div>
                  I Tuoi Preferiti ({Array.isArray(enrichedFavorites) ? enrichedFavorites.length : 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserFavoritesSection favorites={Array.isArray(enrichedFavorites) ? enrichedFavorites : []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  Impostazioni Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nome Utente (Nickname)</label>
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="flex-1 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
                        placeholder="Inserisci nickname"
                      />
                      <Button
                        size="sm"
                        onClick={handleNicknameSave}
                        disabled={nicknameUpdateMutation.isPending || !canUpdateNickname()}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
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
                        className="border-orange-200 hover:bg-orange-50 dark:border-orange-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={typedUser.nickname || ""}
                        disabled
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingNickname(true)}
                        disabled={!canUpdateNickname()}
                        title={!canUpdateNickname() ? `Disponibile tra ${getDaysUntilNicknameUpdate()} giorni` : "Modifica nickname"}
                        className="border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800 dark:hover:bg-orange-900/30"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {canUpdateNickname() 
                      ? "Puoi modificare il nickname ogni 15 giorni"
                      : `Potrai modificare il nickname tra ${getDaysUntilNicknameUpdate()} giorni`
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        className="flex-1 border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
                        placeholder="Inserisci email"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsEditingEmail(false);
                        }}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingEmail(false);
                          setTempEmail(typedUser.email || "");
                        }}
                        className="border-orange-200 hover:bg-orange-50 dark:border-orange-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={typedUser.email || ""}
                        disabled
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingEmail(true)}
                        className="border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800 dark:hover:bg-orange-900/30"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Puoi modificare l'email ogni 15 giorni
                  </p>
                </div>

                <div className="border-t border-orange-100 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">Sicurezza</h3>
                  <PasswordChangeForm />
                </div>

                <div className="border-t border-orange-100 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium mb-4 text-red-600">Zona Pericolo</h3>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full"
                    >
                      Cancella Account
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sei sicuro? Questa azione non può essere annullata e tutti i tuoi dati verranno eliminati permanentemente.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await apiRequest('/api/user/delete', { method: 'DELETE' });
                              toast({
                                title: "Account eliminato",
                                description: "Il tuo account è stato eliminato con successo",
                              });
                              window.location.href = "/";
                            } catch (error) {
                              toast({
                                title: "Errore",
                                description: "Impossibile eliminare l'account",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1"
                        >
                          Sì, elimina definitivamente
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1"
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  function PasswordChangeForm() {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        toast({
          title: "Errore",
          description: "Compila tutti i campi",
          variant: "destructive",
        });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Errore", 
          description: "Le password non coincidono",
          variant: "destructive",
        });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast({
          title: "Errore",
          description: "La password deve essere di almeno 6 caratteri",
          variant: "destructive",
        });
        return;
      }

      passwordChangeMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    };

    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Password Attuale</label>
          <Input
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Inserisci password attuale"
            required
            className="border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nuova Password</label>
          <Input
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Inserisci nuova password (min. 6 caratteri)"
            required
            className="border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Conferma Nuova Password</label>
          <Input
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Conferma nuova password"
            required
            className="border-orange-200 focus:border-orange-400 focus:ring-orange-400/20"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          disabled={passwordChangeMutation.isPending}
        >
          {passwordChangeMutation.isPending ? "Aggiornamento..." : "Cambia Password"}
        </Button>
      </form>
    );
  }
}
