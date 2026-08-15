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
import ProfileStats from "@/components/profile/ProfileStats";
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
  type ProfileTab = 'overview' | 'favorites' | 'reviews';
  const PROFILE_TAB_KEY = 'profile:lastTab';
  const isValidTab = (v: string | null): v is ProfileTab =>
    v === 'overview' || v === 'favorites' || v === 'reviews';
  // Default consistente su desktop e mobile: "overview". Persistiamo l'ultima
  // tab in sessionStorage così torni dove eri.
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('overview');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(PROFILE_TAB_KEY);
      if (isValidTab(stored)) setActiveProfileTab(stored);
    } catch {}
  }, []);
  const changeProfileTab = (tab: ProfileTab) => {
    setActiveProfileTab(tab);
    try { sessionStorage.setItem(PROFILE_TAB_KEY, tab); } catch {}
  };
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

  const getProfileImageAvailableFrom = () => {
    if (!(typedUser as any)?.lastProfileImageUpdate) return "";
    const available = new Date((typedUser as any).lastProfileImageUpdate);
    available.setDate(available.getDate() + 15);
    return available.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
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
                    Foto profilo disponibile dal {getProfileImageAvailableFrom()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeProfileTab} onValueChange={(v) => changeProfileTab(v as ProfileTab)} className="w-full">
          <div className="hidden lg:flex gap-1 bg-white dark:bg-card rounded-2xl p-1 border border-stone-100 dark:border-border shadow-sm mb-4">
            {[
              { value: 'overview', label: 'Panoramica' },
              { value: 'favorites', label: 'Preferiti' },
              { value: 'reviews', label: 'Recensioni' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => changeProfileTab(value as ProfileTab)}
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

            {/* Statistiche dettagliate */}
            <ProfileStats tastings={beerTastings} isAuthenticated={isAuthenticated} />

            {/* Quick links to new features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/my-stats", icon: "📊", label: "Statistiche", sub: "Stili, birrifici, streak" },
                { href: "/my-cellar", icon: "🍷", label: "Cantina", sub: "Bottiglie a casa tua" },
                { href: "/my-wishlist", icon: "❤️", label: "Wishlist", sub: "Da assaggiare" },
                { href: "/activity", icon: "👥", label: "Attività", sub: "Feed, amici e zona" },
                { href: "/impostazioni", icon: "⚙️", label: "Impostazioni", sub: "Account, privacy, password" },
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

        </Tabs>

        {/* ── STICKY MINI TOP BAR via Portal (avoids will-change:transform containing-block trap) ── */}
        {activeProfileTab !== 'overview' && !isProfileModalOpen && (
          <DockPortal>
          <div
            className="ios-fixed-chrome lg:hidden fixed inset-x-0 z-40"
            style={{ top: 'var(--mobile-top-offset)' }}
          >
            <div className="bg-white dark:bg-[#0B0D10] border-b border-stone-200/60 dark:border-white/[0.06]">
              <div className="flex items-center gap-3 px-3 h-14">
                <button
                  onClick={() => changeProfileTab('overview')}
                  aria-label="Torna alla panoramica"
                  className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center active:opacity-70 transition-opacity"
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
                  { id: 'settings',  label: 'Impostazioni', Icon: Settings, href: '/impostazioni' },
                ] as { id: ProfileTab | 'settings'; label: string; Icon: any; href?: string }[]).map(({ id, label, Icon, href }) => {
                  const active = !href && activeProfileTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { if (href) { setLocation(href); } else { changeProfileTab(id as ProfileTab); } }}
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
}
