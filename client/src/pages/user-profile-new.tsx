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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
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
  Upload,
  Edit3,
  Save,
  X,
  Settings,
  Beer,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User as UserType } from "@shared/schema";
import UserFavoritesSection from "@/components/UserFavoritesSection";
import BeerTastingsEditor from "@/components/BeerTastingsEditorNew";
import { StyleMultiSelect } from "@/components/StyleMultiSelect";
import { ImageUpload } from "@/components/image-upload";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Password change state
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

  // Redirect if not authenticated
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

  // Beer Tastings Query
  const { data: beerTastings = [] } = useQuery({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  // Favorites Query
  const { data: enrichedFavorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("/api/user/password", "PATCH", data);
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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserType>) => {
      return apiRequest("/api/user/profile", "PATCH", updates);
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

  // Nickname update mutation
  const nicknameUpdateMutation = useMutation({
    mutationFn: async (nickname: string) => {
      return apiRequest("/api/user/nickname", "PATCH", { nickname });
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
    if (!typedUser?.nicknameLastUpdated) return true;
    const lastUpdate = new Date(typedUser.nicknameLastUpdated);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return diffInDays >= 15;
  };

  const getDaysUntilNicknameUpdate = () => {
    if (!typedUser?.nicknameLastUpdated) return 0;
    const lastUpdate = new Date(typedUser.nicknameLastUpdated);
    const now = new Date();
    const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, 15 - diffInDays);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
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
                        
                        const response = await apiRequest('/api/user/upload-profile-image', 'POST', formData);
                        
                        if (response.imageUrl) {
                          await updateProfileMutation.mutateAsync({ profileImageUrl: response.imageUrl });
                          toast({
                            title: "Immagine caricata",
                            description: "L'immagine del profilo è stata aggiornata con successo",
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {typedUser.nickname || "Utente senza nome"}
                </h1>

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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="favorites">Preferiti</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Profile Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informazioni Profilo
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
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
                      <label className="block text-sm font-medium mb-2">Bio</label>
                      <Textarea
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                        placeholder="Racconta qualcosa di te..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Stili Preferiti</label>
                      <StyleMultiSelect
                        value={editedProfile.favoriteStyles}
                        onValueChange={(styles) => setEditedProfile({ ...editedProfile, favoriteStyles: styles })}
                        maxSelections={5}
                      />
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
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        {typedUser.bio || "Nessuna biografia disponibile"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Stili Preferiti</h4>
                      {typedUser.favoriteStyles && typedUser.favoriteStyles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {typedUser.favoriteStyles.map((style: string) => (
                            <Badge key={style} variant="secondary" className="flex items-center gap-1">
                              <Beer className="w-3 h-3" />
                              {style}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">
                          Nessuno stile selezionato
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Beer Tastings */}
            <BeerTastingsEditor beerTastings={beerTastings} />
          </TabsContent>

          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  I Tuoi Preferiti ({enrichedFavorites?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedFavorites && enrichedFavorites.length > 0 ? (
                  <div className="space-y-3">
                    {enrichedFavorites.map((fav: any) => (
                      <div key={fav.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize text-xs">
                            {fav.itemType === 'brewery' ? 'Birrificio' : 
                             fav.itemType === 'pub' ? 'Pub' : 'Birra'}
                          </Badge>
                          <span className="font-medium">{fav.itemName || `${fav.itemType} #${fav.itemId}`}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(fav.createdAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Non hai ancora aggiunto nessun preferito. Inizia a esplorare birre, pub e birrifici!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Impostazioni Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome Utente (Nickname)</label>
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="flex-1"
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
                  <label className="block text-sm font-medium mb-2">Email</label>
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        className="flex-1"
                        placeholder="Inserisci email"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          // Handle email save logic here
                          setIsEditingEmail(false);
                        }}
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
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Puoi modificare l'email ogni 15 giorni
                  </p>
                </div>

                {/* Password Change Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-4">Sicurezza</h3>
                  <PasswordChangeForm />
                </div>

                <div className="border-t pt-4">
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
                      <p className="text-sm text-gray-600">
                        Sei sicuro? Questa azione non può essere annullata e tutti i tuoi dati verranno eliminati permanentemente.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await apiRequest('/api/user/delete', 'DELETE');
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

  // Password Change Form Component
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
          <label className="block text-sm font-medium mb-2">Password Attuale</label>
          <Input
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Inserisci password attuale"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Nuova Password</label>
          <Input
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Inserisci nuova password (min. 6 caratteri)"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Conferma Nuova Password</label>
          <Input
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Conferma nuova password"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={passwordChangeMutation.isPending}
        >
          {passwordChangeMutation.isPending ? "Aggiornamento..." : "Cambia Password"}
        </Button>
      </form>
    );
  }
}