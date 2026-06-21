import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
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
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  Star,
  Beer as BeerIcon,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Camera,
  CalendarDays,
  MapPin,
  Home as HomeIcon,
  Info as InfoIcon,
  Shield,

  ArrowLeft,
  Lock,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnyModalOpen, useHideGlobalBottomNav, DockPortal } from "@/components/bottom-navigation";
import type { User as UserType } from "@shared/schema";
import UserFavoritesSection from "@/components/UserFavoritesSection";
import { FestivalLikeButton } from "@/components/festival-like-button";
import { ShareButton } from "@/components/share-button";
import BeerTastingsEditor from "@/components/BeerTastingsEditorNew";
import RichTextEditor, { RichTextDisplay, isRichContentEmpty } from "@/components/rich-text-editor";
import { getBadgeForCount, getNextBadge, getProgressToNextBadge } from "@/lib/badges";
import { RoleSwitcherBanner } from "@/components/role-switcher-banner";
import { StatsGrid } from "@/components/dashboard-primitives";
import { Star as StarIcon, Heart as HeartIcon, Award as AwardIcon } from "lucide-react";

function StylesPickerOverview({ current, onChange, onSave, isSaving }: {
  current: string[];
  onChange: (s: string[]) => void;
  onSave: (styles: string[]) => void;
  isSaving: boolean;
}) {
  const [styleSearch, setStyleSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { data: dbStyles = [] } = useQuery<{ style: string }[]>({
    queryKey: ["/api/beers/styles"],
    staleTime: 1000 * 60 * 60,
  });

  const allStyles = dbStyles.map(s => s.style).filter(Boolean).sort();
  const searchFiltered = styleSearch.trim()
    ? allStyles.filter(s => s.toLowerCase().includes(styleSearch.toLowerCase()))
    : allStyles;
  const SHOW_LIMIT = 30;
  const visibleStyles = showAll ? searchFiltered : searchFiltered.slice(0, SHOW_LIMIT);

  const toggle = (style: string) => {
    if (current.includes(style)) {
      const updated = current.filter(s => s !== style);
      onChange(updated);
      onSave(updated);
    } else if (current.length < 10) {
      const updated = [...current, style];
      onChange(updated);
      onSave(updated);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2">
            <BeerIcon className="w-4 h-4 text-amber-500" />
            Stili Preferiti
            <span className="text-xs text-stone-400 font-normal bg-stone-100 dark:bg-[#1A1D24] px-1.5 py-0.5 rounded-full">{current.length}/10</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Seleziona fino a 10 stili. Si salvano automaticamente.</p>
        </div>
        {isSaving && <span className="text-xs text-orange-500 animate-pulse">Salvando...</span>}
      </div>

      {/* Currently selected */}
      {current.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-stone-50 dark:bg-[#0B0D10]/10 rounded-xl border border-stone-100 dark:border-[#23262E]/30">
          {current.map(style => (
            <button
              key={style}
              onClick={() => toggle(style)}
              className="flex items-center gap-1 text-xs bg-primary text-white px-2.5 py-1 rounded-full font-medium shadow-sm hover:bg-primary transition-colors"
            >
              ✓ {style} <X className="w-3 h-3 opacity-70" />
            </button>
          ))}
          <button
            onClick={() => { onChange([]); onSave([]); }}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Rimuovi tutti
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <Input
          value={styleSearch}
          onChange={e => { setStyleSearch(e.target.value); setShowAll(false); }}
          placeholder={`Cerca tra ${allStyles.length} stili dal database...`}
          className="pl-9 text-sm border-stone-300 dark:border-gray-600 focus:border-orange-400 h-9"
        />
        {styleSearch && (
          <button onClick={() => setStyleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-stone-400 hover:text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Style badges — solo quando si sta cercando */}
      {styleSearch.trim() ? (
        <>
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
            {visibleStyles.map(style => {
              const selected = current.includes(style);
              const disabled = !selected && current.length >= 10;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => !disabled && toggle(style)}
                  disabled={disabled}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150 ${
                    selected
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : disabled
                      ? 'bg-stone-50 dark:bg-[#0B0D10] border-gray-100 dark:border-[#23262E] text-stone-300 dark:text-muted-foreground cursor-not-allowed'
                      : 'bg-white dark:bg-[#1A1D24] border-stone-200 dark:border-[#23262E] text-muted-foreground dark:text-stone-300 hover:border-primary/30 hover:bg-stone-50 dark:hover:bg-stone-900/20 hover:text-primary'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
          {searchFiltered.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-2">Nessuno stile trovato per "{styleSearch}"</p>
          )}
        </>
      ) : current.length === 0 && (
        <p className="text-xs text-stone-400 text-center py-3">
          Cerca uno stile qui sopra per aggiungerlo ai preferiti
        </p>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState<boolean>(true);
  type ProfileTab = 'overview' | 'favorites' | 'reviews' | 'info' | 'security';
  // SSR-safe: parte da "favorites" (valida desktop e mobile). In effect
  // client switchiamo a "overview" se siamo su mobile e gestiamo i resize.
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('favorites');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    setActiveProfileTab((prev) => (!mq.matches && prev === 'favorites' ? 'overview' : prev));
    const handler = (e: MediaQueryListEvent) => {
      setActiveProfileTab((prev) => {
        if (e.matches && prev === 'overview') return 'favorites';
        return prev;
      });
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  const isProfileModalOpen = useAnyModalOpen();
  useHideGlobalBottomNav();
  
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
        setLocation("/login");
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'success') {
      setTimeout(() => {
        toast({
          title: "Benvenuto su Fermenta.to!",
          description: "La tua email è stata verificata. Inizia a esplorare birre, pub e birrifici.",
        });
      }, 800);
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  const { data: beerTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const { data: enrichedFavorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: festivalFavorites = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites", "festival"],
    queryFn: async () => {
      const r = await fetch("/api/favorites/festival", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
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
      setIsPublicProfile((typedUser as any).isPublic ?? true);
    }
  }, [(typedUser as any)?.isPublic]);

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
        setTimeout(() => setLocation("/login"), 500);
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
        setTimeout(() => setLocation("/login"), 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare il nickname",
        variant: "destructive",
      });
    },
  });

  const privacyMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      return apiRequest("/api/user/privacy", { method: "PATCH" }, { isPublic });
    },
    onSuccess: (_data, isPublic) => {
      setIsPublicProfile(isPublic);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: isPublic ? "Profilo reso pubblico" : "Profilo reso privato",
        description: isPublic
          ? "Il tuo profilo è ora visibile a tutti"
          : "Il tuo profilo è ora visibile solo a te",
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare le impostazioni privacy", variant: "destructive" });
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

  const compressImage = (file: File, maxPx = 1200, quality = 0.82): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
            else                 { width = Math.round(width * maxPx / height); height = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Compressione fallita')),
            'image/jpeg', quality
          );
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleAvatarUpload = async (file: File) => {
    if (!file || !canUpdateProfileImage()) return;
    if ((typedUser as any)?.email && (typedUser as any)?.isEmailVerified === false) {
      toast({ title: "Email non verificata", description: "Verifica la tua email prima di cambiare la foto profilo", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressed, 'profile.jpg');
      formData.append('folder', 'profile-images');
      const response = await fetch('/api/upload/image', { method: 'POST', body: formData, credentials: 'include' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Errore ${response.status}`);
      }
      const data = await response.json();
      if (!data.url) throw new Error("Nessun URL ricevuto dal server");
      await updateProfileMutation.mutateAsync({ profileImageUrl: data.url } as any);
      toast({ title: "Foto aggiornata", description: "La tua immagine del profilo è stata aggiornata" });
    } catch (e: any) {
      toast({ title: "Errore upload", description: e.message || "Impossibile caricare la foto", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-orange-200/50 rounded-xl mb-4"></div>
          <div className="h-64 bg-stone-100/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !typedUser) {
    return null;
  }

  const isPubOwner = typedUser?.userType === 'pub_owner' || typedUser?.activeRole === 'pub_owner';
  const isBreweryOwner = typedUser?.userType === 'brewery_owner' || typedUser?.activeRole === 'brewery_owner';

  return (
    <div className="min-h-screen bg-background dark:bg-background">
    <div
      className={`container mx-auto px-4 py-8 max-w-4xl ${activeProfileTab !== 'overview' ? 'lg:!pt-8 lg:!pb-8' : ''}`}
      style={{
        paddingBottom: 'calc(96px + var(--frozen-sab))',
        paddingTop: activeProfileTab !== 'overview' ? 'calc(var(--mobile-top-offset) + 56px)' : undefined,
      }}
    >
      <div className="space-y-6">
        {/* Role switcher banner for pub/brewery owners */}
        <div className={activeProfileTab !== 'overview' ? 'hidden lg:block' : ''}>
          <RoleSwitcherBanner currentView="profile" />
        </div>

        {/* Header Card */}
        <Card className={`border-0 shadow-xl text-white overflow-hidden relative ${activeProfileTab !== 'overview' ? 'hidden lg:block' : ''}`} style={{ background: 'linear-gradient(135deg, hsl(25,18%,10%) 0%, hsl(20,15%,18%) 50%, hsl(30,12%,24%) 100%)' }}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10" />
          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="relative w-32 h-32 md:w-36 md:h-36 group">
                  <div
                    className={`w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden ring-4 ring-white/30 shadow-2xl flex items-center justify-center bg-primary ${canUpdateProfileImage() ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => canUpdateProfileImage() && !avatarUploading && avatarInputRef.current?.click()}
                  >
                    {typedUser.profileImageUrl ? (
                      <img src={typedUser.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white select-none">
                        {(typedUser.nickname || typedUser.firstName || 'U')[0].toUpperCase()}
                      </span>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      {avatarUploading ? (
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : canUpdateProfileImage() ? (
                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      ) : null}
                    </div>
                  </div>
                  {canUpdateProfileImage() && (
                    <button
                      onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                      className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary border-2 border-white/70 flex items-center justify-center hover:bg-primary active:bg-primary/80 transition-colors shadow-lg"
                      disabled={avatarUploading}
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  )}
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
                {avatarUploading && (
                  <span className="text-xs text-white/80">Caricamento...</span>
                )}
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
        <Tabs value={activeProfileTab} onValueChange={(v) => setActiveProfileTab(v as ProfileTab)} className="w-full">
          <div className="hidden lg:flex gap-1 bg-white dark:bg-card rounded-2xl p-1 border border-stone-100 dark:border-border shadow-sm mb-4">
            {[
              { value: 'favorites', label: 'Preferiti' },
              { value: 'reviews', label: 'Recensioni' },
              { value: 'info', label: 'Info' },
              { value: 'security', label: 'Sicurezza' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveProfileTab(value as ProfileTab)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-all ${activeProfileTab === value ? 'bg-background dark:bg-[#1A1D24] text-primary dark:text-orange-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <TabsContent value="overview" className="space-y-4">
            {/* Stats row */}
            {(() => {
              const reviewCount = beerTastings.filter((t: any) => t.rating != null).length;
              const badge = getBadgeForCount(reviewCount);
              const nextBadge = getNextBadge(reviewCount);
              const progress = getProgressToNextBadge(reviewCount);
              return (
                <StatsGrid
                  cols={3}
                  items={[
                    { icon: StarIcon,  label: "Recensioni", value: reviewCount, accent: "amber" },
                    { icon: HeartIcon, label: "Preferiti",  value: Array.isArray(enrichedFavorites) ? enrichedFavorites.length : 0, accent: "red" },
                    { icon: AwardIcon, label: badge.name,   value: <span className="text-xl">{badge.emoji}</span>, accent: "purple" },
                  ]}
                />
              );
            })()}

            {/* Badge progress */}
            {(() => {
              const reviewCount = beerTastings.filter((t: any) => t.rating != null).length;
              const badge = getBadgeForCount(reviewCount);
              const nextBadge = getNextBadge(reviewCount);
              const progress = getProgressToNextBadge(reviewCount);
              return nextBadge ? (
                <Card className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{badge.emoji}</span>
                        <span className="text-sm font-semibold text-foreground dark:text-gray-200">{badge.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>→ {nextBadge.emoji} {nextBadge.name}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-stone-200 dark:bg-[#12151A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5 text-right">
                      {reviewCount} / {nextBadge.minReviews} recensioni
                    </p>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Quick links to new features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/my-stats", icon: "📊", label: "Statistiche", sub: "Stili, birrifici, streak" },
                { href: "/my-cellar", icon: "🍷", label: "Cantina", sub: "Bottiglie a casa tua" },
                { href: "/my-wishlist", icon: "❤️", label: "Wishlist", sub: "Da assaggiare" },
                { href: "/activity", icon: "👥", label: "Attività", sub: "Feed, amici e zona" },
              ].map(({ href, icon, label, sub }) => (
                <Link key={href} href={href}>
                  <div className="bg-white dark:bg-[#1A1D24] rounded-2xl p-3.5 shadow-sm flex items-center gap-3 active:opacity-80 transition-opacity border border-stone-100 dark:border-[hsl(220,5%,27%)]">
                    <span className="text-xl">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 font-poppins">{label}</p>
                      <p className="text-[10px] text-stone-400 leading-tight">{sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bio */}
            <Card className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2 text-foreground dark:text-white">
                    <User className="w-4 h-4 text-orange-500" />
                    Bio
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-muted-foreground hover:text-orange-600 h-7 px-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    {isEditing ? "Annulla" : "Modifica"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <RichTextEditor
                      content={editedProfile.bio}
                      onChange={(html) => setEditedProfile({ ...editedProfile, bio: html })}
                      placeholder="Racconta qualcosa di te, cosa ami bere..."
                      maxChars={1000}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {updateProfileMutation.isPending ? "Salvando..." : "Salva"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditedProfile({ nickname: typedUser?.nickname || "", bio: typedUser?.bio || "", favoriteStyles: typedUser?.favoriteStyles || [], profileImageUrl: typedUser?.profileImageUrl || "" }); }} className="border-stone-300">
                        <X className="w-3.5 h-3.5 mr-1.5" />Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  isRichContentEmpty(typedUser.bio) ? (
                    <p className="text-sm text-muted-foreground dark:text-stone-300 leading-relaxed">
                      <span className="italic text-stone-400">Nessuna bio — clicca Modifica per aggiungerne una</span>
                    </p>
                  ) : (
                    <RichTextDisplay html={typedUser.bio || ""} className="text-sm" />
                  )
                )}
              </CardContent>
            </Card>

            {/* Stili Preferiti */}
            <Card className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardContent className="p-5">
                <StylesPickerOverview
                  current={editedProfile.favoriteStyles}
                  onChange={(styles) => setEditedProfile(prev => ({ ...prev, favoriteStyles: styles }))}
                  onSave={(styles) => updateProfileMutation.mutate({ favoriteStyles: styles } as any)}
                  isSaving={updateProfileMutation.isPending}
                />
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {/* Festival preferiti */}
            {Array.isArray(festivalFavorites) && festivalFavorites.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground dark:text-white text-base">
                    <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    Festival preferiti ({festivalFavorites.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {festivalFavorites.map((fav: any) => {
                      const fest = fav.festival || fav;
                      const name = fest.name || fav.itemName || `Festival #${fav.itemId}`;
                      const slug = fest.slug;
                      const location = fest.location;
                      const coverUrl = fest.coverImageUrl;
                      const logoUrl = fest.logoUrl;
                      const startDate = fest.startDate
                        ? new Date(fest.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
                        : null;
                      const festLink = slug ? `/festival/${slug}` : null;
                      return (
                        <div key={fav.id || fav.itemId} className="flex flex-col rounded-xl overflow-hidden border border-gray-100 dark:border-[#23262E] bg-white dark:bg-[#1A1D24] hover:shadow-md transition-all">
                          {coverUrl && (
                            <div className="h-20 relative overflow-hidden">
                              <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            </div>
                          )}
                          <div className="p-3 flex-1">
                            <div className="flex items-start gap-2">
                              {logoUrl && (
                                <img src={logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground dark:text-white truncate">{name}</p>
                                {location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />{location}
                                  </p>
                                )}
                                {startDate && (
                                  <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                                    <CalendarDays className="h-3 w-3 flex-shrink-0" />{startDate}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {festLink ? (
                                <a href={festLink} className="flex-1">
                                  <button className="w-full text-xs font-medium text-primary border border-stone-200 rounded-md px-2 py-1 hover:bg-stone-50 transition-colors">
                                    Taplist →
                                  </button>
                                </a>
                              ) : (
                                <span className="flex-1 text-xs text-stone-400 italic self-center">Festival non più disponibile</span>
                              )}
                              <FestivalLikeButton festivalId={fav.itemId || fest.id} showLabel={false} />
                              {festLink && (
                                <ShareButton
                                  title={name}
                                  text={`Scopri le birre al festival ${name}!`}
                                  url={`${window.location.origin}${festLink}`}
                                  size="sm"
                                  variant="outline"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preferiti pub/birrificio/birra */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
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

          <TabsContent value="reviews" className="space-y-6">
            <BeerTastingsEditor beerTastings={beerTastings} />
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
                    <InfoIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  Info personali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Foto Profilo</label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {typedUser?.profileImageUrl ? (
                        <img
                          src={typedUser.profileImageUrl}
                          alt="Foto profilo"
                          className="w-20 h-20 rounded-full object-cover border-2 border-stone-200 dark:border-white/10"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center border-2 border-stone-200 dark:border-white/10">
                          <span className="text-white text-2xl font-bold">
                            {(typedUser?.nickname || "U")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 dark:bg-white/[0.06] hover:bg-stone-200 dark:hover:bg-white/10 text-sm font-medium transition-colors">
                        <Camera className="w-4 h-4" />
                        Cambia foto
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={avatarUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Max 5 MB.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Nome Utente (Nickname)</label>
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        className="flex-1 border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
                        placeholder="Inserisci nickname"
                      />
                      <Button
                        size="sm"
                        onClick={handleNicknameSave}
                        disabled={nicknameUpdateMutation.isPending || !canUpdateNickname()}
                        className="bg-primary hover:bg-primary/90 text-white"
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
                        className="border-stone-300 hover:bg-stone-50 dark:border-[#23262E]"
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
                        className="border-stone-300 hover:bg-stone-50 hover:text-orange-700 dark:border-[#23262E] dark:hover:bg-[#1A1D24]/40"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {canUpdateNickname() 
                      ? "Puoi modificare il nickname ogni 15 giorni"
                      : `Potrai modificare il nickname tra ${getDaysUntilNicknameUpdate()} giorni`
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Email</label>
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        className="flex-1 border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
                        placeholder="Inserisci email"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsEditingEmail(false);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white"
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
                        className="border-stone-300 hover:bg-stone-50 dark:border-[#23262E]"
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
                        className="border-stone-300 hover:bg-stone-50 hover:text-orange-700 dark:border-[#23262E] dark:hover:bg-[#1A1D24]/40"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Puoi modificare l'email ogni 15 giorni
                  </p>
                </div>

                <div className="border-t border-stone-200 dark:border-[#23262E] pt-4">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground dark:text-stone-300 flex items-center gap-2">
                    {isPublicProfile ? <Eye className="h-4 w-4 text-orange-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    Privacy Profilo
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#1A1D24] rounded-xl">
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium text-foreground dark:text-white">
                        {isPublicProfile ? "Profilo Pubblico" : "Profilo Privato"}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-stone-400 mt-0.5">
                        {isPublicProfile
                          ? "Chiunque può vedere il tuo profilo, badge e recensioni tramite /user/" + (typedUser?.nickname || "tu")
                          : "Solo tu puoi vedere il tuo profilo"}
                      </p>
                    </div>
                    <Switch
                      checked={isPublicProfile}
                      onCheckedChange={(val) => privacyMutation.mutate(val)}
                      disabled={privacyMutation.isPending}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  {isPublicProfile && typedUser?.nickname && (
                    <a
                      href={`/user/${typedUser.nickname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visualizza il tuo profilo pubblico
                    </a>
                  )}
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  Sicurezza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PasswordChangeForm />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <div className="p-2 bg-stone-100 dark:bg-[#1A1D24]/50 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  Zona Pericolo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-stone-400 mb-4">L'eliminazione è permanente e non può essere annullata.</p>
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
                      <p className="text-sm text-muted-foreground dark:text-stone-400">
                        Sei sicuro? Tutti i tuoi dati verranno eliminati permanentemente.
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

        {/* ── STICKY MINI TOP BAR via Portal (avoids will-change:transform containing-block trap) ── */}
        {activeProfileTab !== 'overview' && !isProfileModalOpen && (
          <DockPortal>
          <div
            className="lg:hidden fixed inset-x-0 z-40"
            style={{ top: 'var(--mobile-top-offset)' }}
          >
            <div className="bg-white/70 dark:bg-[#0B0B0C]/70 backdrop-blur-xl border-b border-stone-200/60 dark:border-white/[0.06]">
              <div className="flex items-center gap-3 px-3 h-14">
                <button
                  onClick={() => setActiveProfileTab('overview')}
                  aria-label="Torna alla panoramica"
                  className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {typedUser?.profileImageUrl ? (
                    <img
                      src={typedUser.profileImageUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {(typedUser.nickname || typedUser.firstName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-foreground truncate leading-tight">
                      {typedUser?.nickname || 'Profilo'}
                    </div>
                    <div className="text-[10px] font-semibold text-primary capitalize leading-tight">
                      {activeProfileTab === 'favorites' && 'Preferiti'}
                      {activeProfileTab === 'reviews' && 'Recensioni'}
                      {activeProfileTab === 'info' && 'Info personali'}
                      {activeProfileTab === 'security' && 'Sicurezza'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </DockPortal>
        )}

        {/* ── BOTTOM DOCK PROFILO (mobile only) — stesso pattern di BottomNavigation ── */}
        <DockPortal>
        <nav
          className={`bottom-nav-fixed lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0B0D10] rounded-t-[32px] border-t border-x border-stone-100 dark:border-white/[0.06] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)] transition-opacity duration-200 ${
            isProfileModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ paddingBottom: 'max(var(--frozen-sab) - 16px, 0px)' }}
          aria-label="Navigazione profilo"
          role="tablist"
        >
          <div className="px-2">
            <div>
              <div className="flex items-stretch justify-between p-1.5 gap-1">
                {([
                  { id: 'overview',  label: 'Home',       Icon: HomeIcon },
                  { id: 'favorites', label: 'Preferiti',  Icon: Heart },
                  { id: 'reviews',   label: 'Recensioni', Icon: StarIcon },
                  { id: 'info',      label: 'Info',       Icon: InfoIcon },
                  { id: 'security',  label: 'Sicurezza',  Icon: Lock },
                ] as { id: ProfileTab; label: string; Icon: any }[]).map(({ id, label, Icon }) => {
                  const active = activeProfileTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveProfileTab(id)}
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? 'page' : undefined}
                      aria-label={label}
                      data-testid={`profile-dock-${id}`}
                      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-[20px] transition-all duration-200 active:scale-95 ${
                        active
                          ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                          : 'text-stone-500 dark:text-stone-400 hover:text-foreground'
                      }`}
                    >
                      <Icon
                        className="h-[20px] w-[20px]"
                        strokeWidth={active ? 2.6 : 1.8}
                        fill={active ? 'currentColor' : 'none'}
                        style={active ? { fillOpacity: 0.18 } : {}}
                      />
                      <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
        </DockPortal>
      </div>
    </div>
    </div>
  );

  function PasswordChangeForm() {
    const isSocialAccount = !(typedUser as any).hasPassword;

    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!isSocialAccount && !passwordData.currentPassword) {
        toast({ title: "Errore", description: "Inserisci la password attuale", variant: "destructive" });
        return;
      }

      if (!passwordData.newPassword) {
        toast({ title: "Errore", description: "Inserisci la nuova password", variant: "destructive" });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({ title: "Errore", description: "Le password non coincidono", variant: "destructive" });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast({ title: "Errore", description: "La password deve essere di almeno 6 caratteri", variant: "destructive" });
        return;
      }

      passwordChangeMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    };

    return (
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {isSocialAccount && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-500">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Account Google</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Hai effettuato l'accesso tramite Google. Puoi impostare una password per accedere anche con email.
              </p>
            </div>
          </div>
        )}

        {!isSocialAccount && (
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Password Attuale</label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Inserisci password attuale"
              className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">
            {isSocialAccount ? "Nuova Password" : "Nuova Password"}
          </label>
          <Input
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Min. 6 caratteri"
            className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground dark:text-stone-300">Conferma Password</label>
          <Input
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Ripeti la password"
            className="border-stone-300 focus:border-orange-400 focus:ring-orange-400/20"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg"
          disabled={passwordChangeMutation.isPending}
        >
          {passwordChangeMutation.isPending ? "Salvataggio..." : isSocialAccount ? "Imposta Password" : "Cambia Password"}
        </Button>
      </form>
    );
  }
}
