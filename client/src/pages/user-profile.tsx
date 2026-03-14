import { useState, useEffect, useRef } from "react";
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
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Settings,
  Building,
  Store,
  Map,
  Trophy,
  Factory,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
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

  const { data: passport } = useQuery<{
    regions: { region: string; location: string; beers_tasted: number; breweries_tasted: number }[];
    totalBeers: number;
    totalBreweries: number;
  }>({
    queryKey: ["/api/users/me/beer-passport"],
    queryFn: () => apiRequest("/api/users/me/beer-passport"),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
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

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'profile-images');
      const response = await fetch('/api/upload/image', { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Errore ${response.status}`);
      }
      if (!data.url) {
        throw new Error("Nessun URL ricevuto dal server");
      }
      await updateProfileMutation.mutateAsync({ profileImageUrl: data.url });
      toast({ title: "Foto aggiornata", description: "La tua immagine del profilo è stata aggiornata" });
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message || "Impossibile caricare la foto", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
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
              {/* Profile Image Upload - circular avatar with camera icon */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="relative w-24 h-24 group">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden bg-amber-500 flex items-center justify-center cursor-pointer ring-4 ring-amber-200 dark:ring-amber-800"
                    onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                  >
                    {typedUser.profileImageUrl ? (
                      <img src={typedUser.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white select-none">
                        {(typedUser.nickname || typedUser.firstName || 'U')[0].toUpperCase()}
                      </span>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      {!avatarUploading && (
                        <Camera className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {avatarUploading && (
                        <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 flex items-center justify-center hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-md"
                    disabled={avatarUploading}
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                <button
                  onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Caricamento..." : "Cambia foto"}
                </button>
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

            {/* ─── Beer Passport ─────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-amber-600" />
                  Beer Passport
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Le regioni italiane (e del mondo) che hai esplorato attraverso le birre
                </p>
              </CardHeader>
              <CardContent>
                {!passport || (passport.regions.length === 0 && passport.totalBeers === 0) ? (
                  <div className="text-center py-10 text-gray-400">
                    <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nessuna birra registrata ancora</p>
                    <p className="text-xs mt-1">Aggiungi le birre che hai assaggiato per costruire il tuo passport</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: Beer, label: "Birre", value: passport.totalBeers },
                        { icon: Factory, label: "Birrifici", value: passport.totalBreweries },
                        { icon: Map, label: "Regioni", value: passport.regions.length },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Region bars */}
                    {passport.regions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                          Regioni esplorate ({passport.regions.length})
                        </p>
                        {(() => {
                          const maxBeers = Math.max(...passport.regions.map(r => r.beers_tasted), 1);
                          return passport.regions.map((r, i) => (
                            <div key={r.region} className="flex items-center gap-3">
                              {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                              {i > 0 && <span className="w-3.5 h-3.5 flex-shrink-0 text-center text-xs text-gray-400 font-medium">{i + 1}</span>}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {r.region}{r.location && r.location !== r.region ? ` · ${r.location}` : ""}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                    {r.beers_tasted} birra{r.beers_tasted !== 1 ? "e" : ""}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round((r.beers_tasted / maxBeers) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
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