import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
import { ImageUpload } from "@/components/image-upload";
import type { User as UserType } from "@shared/schema";
import UserFavoritesSection from "@/components/UserFavoritesSection";
import BeerTastingsEditor from "@/components/BeerTastingsEditorNew";
import { PubAutocomplete } from "@/components/PubAutocomplete";
import { RoleSwitcher } from "@/components/role-switcher";

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const typedUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(typedUser?.nickname || "");
  
  const [accountSettings, setAccountSettings] = useState({
    firstName: typedUser?.firstName || "",
    lastName: typedUser?.lastName || "",
    email: typedUser?.email || "",
  });

  const [tempNickname, setTempNickname] = useState(typedUser?.nickname || "");

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
  const { data: beerTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
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
      return apiRequest("/api/user/profile", { method: "PATCH" }, profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
      return apiRequest("/api/user/nickname", { method: "PATCH" }, { nickname: newNickname });
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !typedUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 pt-4 lg:pt-8">
        {/* Header with Avatar and Basic Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Image Upload */}
              <div className="w-28 md:w-36 flex-shrink-0">
                <ImageUpload
                  label=""
                  description=""
                  currentImageUrl={typedUser.profileImageUrl || undefined}
                  onImageChange={async (url) => {
                    if (url) {
                      try {
                        await updateProfileMutation.mutateAsync({ profileImageUrl: url });
                      } catch (e) {}
                    }
                  }}
                  folder="profile-images"
                  aspectRatio="square"
                  maxSize={5}
                  showFileInfo={false}
                  recommendedDimensions="200x200"
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                {/* Nome Utente Semplice */}
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
                    Iscritto il {typedUser.createdAt ? new Date(typedUser.createdAt).toLocaleDateString('it-IT') : 'N/A'}
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
            {/* Beer Tastings with Editor */}
            <BeerTastingsEditor beerTastings={beerTastings} />

            {/* Favorites Section - with links and remove buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Preferiti ({enrichedFavorites?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserFavoritesSection favorites={enrichedFavorites || []} />
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
                  {/* Role Switcher */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Ruolo Attivo
                    </label>
                    <RoleSwitcher />
                  </div>

                  <Separator />

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
      </div>
    </div>
  );
}