import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2, Navigation, Clock, AlertCircle, Beer, Trash2, X, Calendar, CalendarDays, ChevronDown, Users, Package, Search, UserPlus, UserMinus, BarChart3, Award, TrendingUp, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import { EventCategoryBadge, EventShareButtons, EventInterestButton } from "@/components/events-manager";
import { FestivalLikeButton } from "@/components/festival-like-button";
import { ShareButton } from "@/components/share-button";
import { Helmet } from "react-helmet-async";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

type OpenStatus = 'open' | 'closing_soon' | 'opening_soon' | 'closed';

function getOpenStatus(openingHours: any): { status: OpenStatus; label: string; color: string } {
  if (!openingHours) return { status: 'closed', label: 'Orari non disponibili', color: 'text-muted-foreground' };
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) {
    return { status: 'closed', label: 'Chiuso oggi', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
  }
  
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    const isOpen = closeTime < openTime 
      ? (currentTime >= openTime || currentTime <= closeTime)
      : (currentTime >= openTime && currentTime <= closeTime);
    
    if (isOpen) {
      const minutesToClose = closeTime < openTime 
        ? (currentTime >= openTime ? (24 * 60 - currentTime + closeTime) : (closeTime - currentTime))
        : (closeTime - currentTime);
      
      if (minutesToClose <= 30) {
        return { status: 'closing_soon', label: `Chiude tra ${minutesToClose} min`, color: 'text-orange-600 bg-stone-50 dark:bg-orange-900/20' };
      }
      return { status: 'open', label: 'Aperto', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
    } else {
      const minutesToOpen = openTime - currentTime;
      if (minutesToOpen > 0 && minutesToOpen <= 60) {
        return { status: 'opening_soon', label: `Apre tra ${minutesToOpen} min`, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };
      }
      return { status: 'closed', label: 'Chiuso', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' };
    }
  }
  
  return { status: 'open', label: 'Aperto', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface TapChange {
  id: number;
  type: string;
  title: string;
  message: string;
  pubId: number;
  beerId: number | null;
  createdAt: string;
  pubName: string;
  pubCity: string;
  pubLatitude: string | null;
  pubLongitude: string | null;
}
function RatingStars({ rating }: { rating: number }) {
  const r = parseFloat(rating.toString());
  return <span className="text-primary font-bold text-xs">{"★".repeat(Math.round(r))}{"☆".repeat(5 - Math.round(r))} {r.toFixed(1)}</span>;
}

function UserAvatar({ user, size = 9 }: { user: any; size?: number }) {
  const name = user.display_name ?? user.nickname ?? "?";
  const sizeClass = `w-${size} h-${size}`;
  return user.profile_image_url ? (
    <img src={user.profile_image_url} alt={name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary text-sm font-bold">{name[0].toUpperCase()}</span>
    </div>
  );
}

function UserRow({ user, followingIds, onToggle }: { user: any; followingIds: Set<string>; onToggle: (id: string, following: boolean) => void }) {
  const handle = user.username ?? user.nickname;
  const name = user.display_name ?? ([user.first_name, user.last_name].filter(Boolean).join(" ") || handle);
  const isFollowing = followingIds.has(user.id);
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <Link href={`/user/${handle}`}>
        <UserAvatar user={{ ...user, display_name: name }} size={10} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/user/${handle}`}>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm truncate">{name}</p>
          {handle && <p className="text-xs text-stone-400 truncate">@{handle}</p>}
        </Link>
      </div>
      <button
        onClick={() => onToggle(user.id, isFollowing)}
        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
          isFollowing ? "bg-stone-100 dark:bg-[#1B2735] text-stone-600 dark:text-stone-300" : "bg-primary text-white"
        }`}
      >
        {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
        {isFollowing ? "Segui già" : "Segui"}
      </button>
    </div>
  );
}

const BADGE_DEFS = [
  { key: "primo_sorso", icon: "🍺", name: "Primo Sorso" },
  { key: "esploratore", icon: "🧭", name: "Esploratore" },
  { key: "degustatore", icon: "🎓", name: "Degustatore" },
  { key: "sommelier", icon: "🏆", name: "Sommelier" },
  { key: "guru", icon: "⭐", name: "Guru della Birra" },
  { key: "critico", icon: "✍️", name: "Critico" },
  { key: "fotografo", icon: "📸", name: "Fotografo" },
  { key: "cacciatore_stili", icon: "🎯", name: "Cacciatore di Stili" },
  { key: "globe_trotter", icon: "🌍", name: "Globe Trotter" },
  { key: "perfezionista", icon: "💎", name: "Perfezionista" },
  { key: "sociale", icon: "👥", name: "Sociale" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-[#1B2735] rounded-2xl p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 font-poppins">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-primary mt-0.5">{sub}</p>}
    </div>
  );
}
const FORMAT_LABELS: Record<string, string> = { spina: "Alla spina", bottiglia: "Bottiglia", lattina: "Lattina", growler: "Growler" };

function formatDistance(distance: number): string {
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

export default function Activity() {
  const { data: currentUser } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false });
  const isAuthenticated = !!currentUser;
  const { toast } = useToast();
  const [radius, setRadius] = useState("10");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(userSearch), 350); return () => clearTimeout(t); }, [userSearch]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showMorePubs, setShowMorePubs] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('dismissedTapChanges');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { isPulling, isRefreshing, pullProgress } = usePullToRefresh(handleRefresh);

  const requestLocation = () => {
    if (!isGeolocationAvailable()) {
      setLocationError("La geolocalizzazione non è supportata dal tuo dispositivo");
      return;
    }
    setRequestingLocation(true);
    setLocationError(null);
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then((position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setRequestingLocation(false);
      })
      .catch((error: any) => {
        setRequestingLocation(false);
        switch (error?.code) {
          case error?.PERMISSION_DENIED:
            setLocationError("Permesso negato. Abilita la geolocalizzazione nelle impostazioni.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Posizione non disponibile");
            break;
          case error.TIMEOUT:
            setLocationError("Timeout nella richiesta di posizione");
            break;
          default:
            setLocationError("Errore nella geolocalizzazione");
        }
      });
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const auth = !!currentUser;
  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({ queryKey: ["/api/user/feed"], enabled: auth });
  const { data: following = [], isLoading: followingLoading } = useQuery<any[]>({ queryKey: ["/api/user/following"], enabled: auth });
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<any[]>({
    queryKey: ["/api/users/search", debouncedSearch],
    queryFn: () => fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`).then(r => r.json()),
    enabled: debouncedSearch.length >= 2,
  });
  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/user/stats"], enabled: auth });
  const { data: badges = [], isLoading: badgesLoading } = useQuery<any[]>({ queryKey: ["/api/user/badges"], enabled: auth });
  const followingIds = new Set<string>((following as any[]).map((u: any) => u.id));
  const followMutation = useMemo(() => ({
    mutate: ({ id, following }: { id: string; following: boolean }) => apiRequest(`/api/users/${id}/follow`, { method: following ? "DELETE" : "POST" })
  }), []);
  const earnedBadges = badges.filter((b: any) => b.earned);
  const { data: allPubs, isLoading: loadingPubs } = useQuery({ queryKey: ["/api/pubs"] });
  const { data: favoriteBeers = [], isLoading: loadingFavoriteBeers } = useQuery<any[]>({ queryKey: ["/api/favorites/beer"], enabled: auth });
  const { data: popularBeersNearbyData = [], isLoading: loadingPopularBeers } = useQuery<any[]>({
    queryKey: ["/api/beers/popular-nearby", userLocation?.lat, userLocation?.lng, radius],
    queryFn: () =>
      fetch(`/api/beers/popular-nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&radiusKm=${radius}&limit=12`).then((r) => r.json()),
    enabled: !!userLocation,
  });
  const { data: upcomingEvents = [], isLoading: loadingEvents } = useQuery<any[]>({ queryKey: ["/api/events/upcoming"] });
  const { data: activeFestivals = [], isLoading: loadingFestivals } = useQuery<any[]>({ queryKey: ["/api/festivals/public"] });
  const nearbyPubs = useMemo(() => {
    if (!Array.isArray(allPubs)) return [];
    if (!userLocation) return allPubs;
    const radiusKm = parseFloat(radius);
    return (allPubs as any[])
      .map((pub: any) => {
        if (pub.latitude && pub.longitude) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude));
          return { ...pub, distance };
        }
        return { ...pub, distance: null };
      })
      .filter((pub: any) => pub.distance === null || pub.distance <= radiusKm)
      .sort((a: any, b: any) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }, [allPubs, userLocation, radius]);

  const nearbyEvents = useMemo(() => {
    if (!Array.isArray(upcomingEvents)) return [];
    if (!userLocation) return upcomingEvents.slice(0, 10);
    return (upcomingEvents as any[])
      .map((ev: any) => {
        if (ev.pub?.latitude && ev.pub?.longitude) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(ev.pub.latitude), parseFloat(ev.pub.longitude));
          return { ...ev, distance };
        }
        return { ...ev, distance: null };
      })
      .filter((ev: any) => ev.distance === null || ev.distance <= parseFloat(radius))
      .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [upcomingEvents, userLocation, radius]);

  const favoriteBeersNearby = useMemo(() => {
    if (!Array.isArray(favoriteBeers) || !userLocation) return [];
    const radiusKm = parseFloat(radius);
    return favoriteBeers
      .map((fav: any) => {
        const beer = fav.beer ?? fav;
        const pub = beer?.pub ?? beer?.brewery?.pub ?? beer?.breweryPub ?? beer?.pub;
        const lat = pub?.latitude ?? beer?.pubLatitude ?? beer?.brewery?.latitude;
        const lng = pub?.longitude ?? beer?.pubLongitude ?? beer?.brewery?.longitude;
        if (!lat || !lng) return null;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, parseFloat(lat), parseFloat(lng));
        return distance <= radiusKm ? { ...fav, beer, pub, distance } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance);
  }, [favoriteBeers, userLocation, radius]);

  // Prefer the aggregated "popular nearby" data (ranked by check-ins +
  // favorites across all users), and fall back to the user's own
  // favoriteBeersNearby when the aggregated list is empty.
  const aggregatedReady = !loadingPopularBeers && Array.isArray(popularBeersNearbyData);
  const useFallback = aggregatedReady && popularBeersNearbyData.length === 0;
  const popularBeersNearby = useMemo(() => {
    if (Array.isArray(popularBeersNearbyData) && popularBeersNearbyData.length > 0) {
      return popularBeersNearbyData;
    }
    return favoriteBeersNearby;
  }, [popularBeersNearbyData, favoriteBeersNearby]);
  // Show loader while the aggregated dataset is still in flight; only
  // wait on the favorites query when we know we're going to fall back.
  const loadingPopularSection = loadingPopularBeers || (useFallback && loadingFavoriteBeers);

  const dismissChange = (id: number) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissedTapChanges', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const TapChangeCard = ({ tc, showDismiss = false }: { tc: any; showDismiss?: boolean }) => (
    <Card key={tc.id} className="hover:shadow-sm transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.type === 'beer_removed' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-stone-100 dark:bg-orange-900/20'}`}>
            <Beer className={`h-5 w-5 ${tc.type === 'beer_removed' ? 'text-red-600' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground dark:text-white">{tc.message}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Link href={`/pub/${tc.pubId}`}>
                <span className="text-xs text-orange-600 hover:underline font-medium cursor-pointer">{tc.pubName}</span>
              </Link>
              {tc.pubCity && <span className="text-xs text-stone-400">• {tc.pubCity}</span>}
              {'distance' in tc && (tc as any).distance !== null && (tc as any).distance !== 9999 && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatDistance((tc as any).distance)}</span>
              )}
            </div>
            <span className="text-xs text-stone-400 mt-1 block">
              {formatDistanceToNow(new Date(tc.createdAt), { addSuffix: true, locale: it })}
            </span>
          </div>
          {showDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-red-500"
              onClick={() => dismissChange(tc.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24 slide-up">
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5 bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 backdrop-blur-sm">
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Aggiornamento in corso...
            </div>
          ) : (
            <div className="text-amber-600 dark:text-amber-400 text-xs font-medium">↓ Rilascia per aggiornare</div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-foreground dark:text-white">Attività in Zona</h1>
        <div className="flex items-center gap-2">
          <Select value={radius} onValueChange={(v) => { setRadius(v); setShowMorePubs(false); }}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Raggio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="15">15 km</SelectItem>
              <SelectItem value="20">20 km</SelectItem>
              <SelectItem value="30">30 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
              <SelectItem value="100">100 km</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={requestLocation} disabled={requestingLocation}>
            {requestingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {locationError && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">{locationError}</p>
            <Button variant="link" size="sm" className="p-0 h-auto text-yellow-700 dark:text-yellow-300" onClick={requestLocation}>Riprova</Button>
          </div>
        </div>
      )}

      {!userLocation && !requestingLocation && !locationError && (
        <div className="mb-4 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-[#1B2735] flex items-center justify-center flex-shrink-0">
            <Navigation className="h-5 w-5 text-stone-500 dark:text-stone-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Posizione</p>
            <p className="text-xs text-muted-foreground mt-0.5">Per vedere pub, eventi e birre vicino a te</p>
          </div>
          <Button onClick={requestLocation} size="sm" className="bg-primary hover:bg-primary/90 text-white flex-shrink-0 rounded-xl h-8 px-3 text-xs font-bold">
            Continua
          </Button>
        </div>
      )}

      {userLocation && (
        <div className="mb-4 text-sm text-muted-foreground dark:text-stone-400 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" />
          <span>Posizione rilevata · Risultati entro <strong>{radius} km</strong></span>
        </div>
      )}

      <Helmet><title>Attività | Fermenta.to</title></Helmet>
      <Tabs defaultValue="inzona">
        <TabsList className="w-full mb-6 bg-stone-100 dark:bg-[#1B2735]/60 p-1 rounded-xl h-auto">
          <TabsTrigger value="inzona" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-stone-700 data-[state=active]:shadow-sm py-2">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            In Zona
          </TabsTrigger>
          <TabsTrigger value="festival" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-stone-700 data-[state=active]:shadow-sm py-2">
            <CalendarDays className="h-3.5 w-3.5 mr-1" />
            Festival
          </TabsTrigger>
          <TabsTrigger value="sociale" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-stone-700 data-[state=active]:shadow-sm py-2">
            <Users className="h-3.5 w-3.5 mr-1" />
            Sociale
          </TabsTrigger>
        </TabsList>

        {/* TAB: IN ZONA */}
        <TabsContent value="inzona" className="space-y-8 mt-0">

          {/* Locali Vicini */}
          <section>
            <h2 className="text-base font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              Locali Vicini
            </h2>
            {loadingPubs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
              </div>
            ) : nearbyPubs.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 dark:bg-[#1B2735]/50 rounded-xl">
                <MapPin className="h-9 w-9 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nessun pub trovato entro {radius} km</p>
                <Button variant="link" size="sm" onClick={() => setRadius("100")}>Espandi a 100 km</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(showMorePubs ? nearbyPubs : nearbyPubs.slice(0, 6)).map((pub: any) => {
                    const openStatus = getOpenStatus(pub.openingHours);
                    const cover = pub.coverImageUrl || pub.logoUrl || pub.imageUrl;
                    return (
                      <Link key={pub.id} href={`/pub/${pub.id}`}>
                        <div className="relative h-36 rounded-2xl overflow-hidden bg-stone-800 cursor-pointer tap-scale group">
                          {cover ? (
                            <img src={cover} alt={pub.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/60 to-stone-900 flex items-center justify-center">
                              <MapPin className="h-8 w-8 text-orange-400/60" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          {/* Open status badge */}
                          <div className="absolute top-2 right-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                              openStatus.label === 'Aperto' ? 'bg-emerald-500/80 text-white' : 'bg-black/50 text-white/80'
                            }`}>
                              {openStatus.label}
                            </span>
                          </div>
                          {/* Info overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="text-white font-bold text-sm leading-tight line-clamp-1">{pub.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {pub.city && <span className="text-white/65 text-[10px] truncate">{pub.city}</span>}
                              {userLocation && pub.distance !== null && (
                                <span className="text-[10px] font-bold text-orange-300 whitespace-nowrap">{formatDistance(pub.distance)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {nearbyPubs.length > 6 && !showMorePubs && (
                  <Button variant="outline" className="w-full mt-3 rounded-2xl" onClick={() => setShowMorePubs(true)}>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Mostra di più ({nearbyPubs.length - 6} altri locali)
                  </Button>
                )}
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground dark:text-white flex items-center gap-2">
                <Beer className="h-4 w-4 text-orange-600" />
                Birre più popolari in zona
                {popularBeersNearby.length > 0 && (
                  <Badge className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0">{popularBeersNearby.length}</Badge>
                )}
              </h2>
              {popularBeersNearby.length > 3 && (
                <Link href="/explore/beers">
                  <button className="text-[11px] font-bold text-primary hover:underline">Vedi tutto</button>
                </Link>
              )}
            </div>
            {loadingPopularSection ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
              </div>
            ) : popularBeersNearby.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 dark:bg-[#1B2735]/50 rounded-xl">
                <Beer className="h-9 w-9 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nessuna birra popolare trovata entro {radius} km</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {popularBeersNearby
                  .slice(0, 8)
                  .filter((item: any) => (item?.beer?.id ?? item?.id) != null)
                  .map((item: any) => {
                  const beer = item.beer ?? item;
                  const img = beer?.imageUrl || beer?.logoUrl || beer?.brewery?.logoUrl;
                  return (
                    <Link key={item.id ?? beer?.id} href={`/beer/${beer?.id ?? item.id}`}>
                      <div className="flex-shrink-0 w-[140px] group transition-transform duration-150 ease-out active:scale-[0.97]">
                        <div className="w-full h-[140px] rounded-2xl overflow-hidden bg-stone-100 dark:bg-[#1B2735] border border-stone-100 dark:border-[#2F3D4D]/30 mb-2 relative">
                          {img ? (
                            <img src={img} alt={beer?.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-[#15202B]">
                              <Beer className="h-10 w-10 text-orange-400/50" />
                            </div>
                          )}
                          {item.distance != null && (
                            <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-black/55 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                              {formatDistance(item.distance)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-foreground line-clamp-1 leading-tight">{beer?.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                          {beer?.style || beer?.brewery?.name || item.pub?.name || ''}
                        </p>
                        {beer?.abv && (
                          <p className="text-[10px] font-bold text-primary mt-0.5">{beer.abv}% ABV</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Eventi vicini */}
          <section>
            <h2 className="text-base font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-pink-600" />
              Eventi vicini
              {nearbyEvents.length > 0 && (
                <Badge className="ml-1 bg-pink-600 text-white text-xs px-1.5 py-0">{nearbyEvents.length}</Badge>
              )}
            </h2>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-pink-600" />
              </div>
            ) : nearbyEvents.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 dark:bg-[#1B2735]/50 rounded-xl">
                <CalendarDays className="h-9 w-9 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nessun evento in programma entro {radius} km</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nearbyEvents.slice(0, 5).map((ev: any) => (
                  <Card key={ev.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {ev.imageUrl ? (
                          <img src={ev.imageUrl} alt={ev.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="h-5 w-5 text-pink-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <EventCategoryBadge category={ev.category} />
                            <h3 className="font-semibold text-sm truncate">{ev.title}</h3>
                          </div>
                          <div className="flex items-center text-xs text-pink-600 dark:text-pink-400 gap-1 mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(ev.eventDate), "EEE d MMM 'alle' HH:mm", { locale: it })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Link href={`/pub/${ev.pubId}`} onClick={(e: any) => e.stopPropagation()}>
                              <span className="text-orange-600 hover:underline font-medium cursor-pointer">{ev.pub?.name}</span>
                            </Link>
                            {ev.pub?.city && <span>• {ev.pub.city}</span>}
                            {ev.distance !== undefined && ev.distance !== null && (
                              <span className="font-medium text-blue-600 dark:text-blue-400">{formatDistance(ev.distance)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="sociale" className="mt-0">
          <div className="p-4 space-y-5">
            <div className="bg-white dark:bg-[#1B2735] rounded-2xl shadow-sm p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Cerca per nome o nickname…" className="pl-9 rounded-xl" />
              </div>
              {debouncedSearch.length >= 2 && (
                <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-700/30">
                  {searchLoading ? (
                    <div className="py-4 text-sm text-stone-400">Caricamento...</div>
                  ) : (
                    searchResults.map((u: any) => (
                      <UserRow key={u.id} user={u} followingIds={followingIds} onToggle={(id, following) => followMutation.mutate({ id, following })} />
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {statsLoading ? null : (
                <>
                  <StatCard label="Assaggi" value={stats?.total ?? 0} />
                  <StatCard label="Voto medio" value={stats?.avgRating ? `${stats.avgRating} ★` : "—"} />
                  <StatCard label="Streak" value={stats?.currentStreak ? `${stats.currentStreak}🔥` : "—"} />
                </>
              )}
            </div>
            <div className="bg-white dark:bg-[#1B2735] rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Feed amici</p>
              {feedLoading ? (
                <div className="text-sm text-stone-400">Caricamento...</div>
              ) : feed.length === 0 ? (
                <p className="text-sm text-stone-400">Nessuna attività recente</p>
              ) : (
                feed.map((item: any) => (
                  <div key={item.id} className="py-3 border-t first:border-t-0 border-stone-100 dark:border-[#2F3D4D]/30">
                    <p className="text-sm font-semibold">{item.beer_name}</p>
                    <p className="text-xs text-stone-400">{item.brewery_name}</p>
                    {item.notes && <p className="text-xs italic text-stone-500">"{item.notes}"</p>}
                  </div>
                ))
              )}
            </div>
            <div className="bg-white dark:bg-[#1B2735] rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Badge · {earnedBadges.length}/{BADGE_DEFS.length}</p>
              <div className="grid grid-cols-4 gap-2">
                {BADGE_DEFS.map((def: any) => {
                  const earned = badges.find((b: any) => b.key === def.key)?.earned;
                  return (
                    <div key={def.key} className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center ${earned ? "bg-primary/10" : "bg-stone-50 dark:bg-[#1B2735] opacity-40"}`}>
                      <span className="text-2xl">{def.icon}</span>
                      <p className="text-[9px] font-bold text-stone-600 dark:text-stone-300 leading-tight">{def.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: FESTIVAL */}
        <TabsContent value="festival" className="mt-0">
          <section>
            <h2 className="text-base font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              Festival in Evidenza
              {Array.isArray(activeFestivals) && activeFestivals.length > 0 && (
                <Badge className="ml-1 bg-amber-600 text-white text-xs px-1.5 py-0">{activeFestivals.length}</Badge>
              )}
            </h2>
            {loadingFestivals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
              </div>
            ) : !Array.isArray(activeFestivals) || activeFestivals.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 dark:bg-[#1B2735]/50 rounded-xl">
                <CalendarDays className="h-10 w-10 text-stone-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nessun festival attivo al momento</p>
                <Link href="/festival">
                  <Button variant="link" size="sm">Scopri i festival →</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeFestivals as any[]).map((fest: any) => {
                  const startDate = fest.startDate
                    ? new Date(fest.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
                    : null;
                  const endDate = fest.endDate
                    ? new Date(fest.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
                    : null;
                  const festUrl = `${window.location.origin}/festival/${fest.slug}`;
                  return (
                    <Card key={fest.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                      {fest.coverImageUrl && (
                        <div className="relative h-28 overflow-hidden">
                          <img src={fest.coverImageUrl} alt={fest.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-bold text-base mb-1 truncate">{fest.name}</h3>
                        {(startDate || endDate) && (
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {startDate}{endDate && startDate !== endDate ? ` → ${endDate}` : ""}
                          </p>
                        )}
                        {fest.location && (
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {fest.location}
                          </p>
                        )}
                        {fest.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{fest.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Link href={`/festival/${fest.slug}`} className="flex-1">
                            <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs">
                              Vedi taplist
                            </Button>
                          </Link>
                          <FestivalLikeButton festivalId={fest.id} showLabel={false} />
                          <ShareButton title={fest.name} text={`Scopri le birre al festival ${fest.name}!`} url={festUrl} size="sm" variant="outline" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

      </Tabs>

      {/* Event Detail Popup */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedEvent && (
            <>
              {selectedEvent.imageUrl && (
                <div className="relative h-48 sm:h-56">
                  <img src={selectedEvent.imageUrl} alt={selectedEvent.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <EventCategoryBadge category={selectedEvent.category} />
                  </div>
                </div>
              )}
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!selectedEvent.imageUrl && <EventCategoryBadge category={selectedEvent.category} />}
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(selectedEvent.eventDate), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
                </div>
                {selectedEvent.endDate && (
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>fino alle {format(new Date(selectedEvent.endDate), "HH:mm", { locale: it })}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-muted-foreground dark:text-stone-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <Link href={`/pub/${selectedEvent.pubId}`} onClick={() => setSelectedEvent(null)}>
                    <span className="text-sm text-orange-600 hover:underline font-semibold cursor-pointer">{selectedEvent.pub?.name}</span>
                  </Link>
                  {selectedEvent.pub?.city && (
                    <span className="text-sm text-muted-foreground">• {selectedEvent.pub.city}</span>
                  )}
                </div>
                <EventInterestButton eventId={selectedEvent.id} type="pub" />
                <div className="pt-3 border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Condividi questo evento</p>
                  <EventShareButtons event={selectedEvent} pubId={selectedEvent.pubId} size="default" />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
