import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2, Navigation, Clock, AlertCircle, Beer, Trash2, X, Calendar, CalendarDays, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import { EventCategoryBadge, EventShareButtons, EventInterestButton } from "@/components/events-manager";
import { FestivalLikeButton } from "@/components/festival-like-button";
import { ShareButton } from "@/components/share-button";

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

function formatDistance(distance: number): string {
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

export default function Activity() {
  const [radius, setRadius] = useState("10");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
    if (!navigator.geolocation) {
      setLocationError("La geolocalizzazione non è supportata dal tuo browser");
      return;
    }

    setRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setRequestingLocation(false);
      },
      (error) => {
        setRequestingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Permesso negato. Abilita la geolocalizzazione nelle impostazioni del browser.");
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
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const { data: allPubs, isLoading: loadingPubs } = useQuery({
    queryKey: ["/api/pubs"],
  });

  const { data: tapChanges = [], isLoading: loadingTapChanges } = useQuery<TapChange[]>({
    queryKey: ["/api/recent-tap-changes"],
  });

  const { data: upcomingEvents = [], isLoading: loadingEvents } = useQuery<any[]>({
    queryKey: ["/api/events/upcoming"],
  });

  const { data: activeFestivals = [], isLoading: loadingFestivals } = useQuery<any[]>({
    queryKey: ["/api/festivals/public"],
  });

  const nearbyPubs = userLocation && Array.isArray(allPubs)
    ? allPubs
        .map((pub: any) => {
          if (pub.latitude && pub.longitude) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              parseFloat(pub.latitude),
              parseFloat(pub.longitude)
            );
            return { ...pub, distance };
          }
          return { ...pub, distance: 9999 };
        })
        .filter((pub: any) => pub.distance <= parseFloat(radius))
        .sort((a: any, b: any) => a.distance - b.distance)
    : Array.isArray(allPubs) ? allPubs.slice(0, 10) : [];

  const nearbyEvents = useMemo(() => {
    if (!Array.isArray(upcomingEvents)) return [];
    
    if (!userLocation) return upcomingEvents.slice(0, 10);
    
    return upcomingEvents
      .map((ev: any) => {
        if (ev.pub?.latitude && ev.pub?.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            parseFloat(ev.pub.latitude),
            parseFloat(ev.pub.longitude)
          );
          return { ...ev, distance };
        }
        // Pub without coordinates: include it without distance filter
        return { ...ev, distance: null };
      })
      .filter((ev: any) => ev.distance === null || ev.distance <= parseFloat(radius))
      .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [upcomingEvents, userLocation, radius]);

  const nearbyTapChanges = useMemo(() => {
    const filtered = tapChanges.filter(tc => !dismissedIds.has(tc.id));
    
    if (!userLocation) return filtered;
    
    return filtered
      .map(tc => {
        if (tc.pubLatitude && tc.pubLongitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            parseFloat(tc.pubLatitude),
            parseFloat(tc.pubLongitude)
          );
          return { ...tc, distance };
        }
        return { ...tc, distance: 9999 };
      })
      .filter(tc => tc.distance <= parseFloat(radius))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tapChanges, userLocation, radius, dismissedIds]);

  const dismissChange = (id: number) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissedTapChanges', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const clearAllDismissed = () => {
    setDismissedIds(new Set());
    localStorage.removeItem('dismissedTapChanges');
  };

  const dismissAll = () => {
    const allIds = nearbyTapChanges.map(tc => tc.id);
    setDismissedIds(prev => {
      const next = new Set(Array.from(prev).concat(allIds));
      localStorage.setItem('dismissedTapChanges', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24 slide-up">
      {/* Pull to refresh indicator */}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground dark:text-white">Attività in Zona</h1>
        <div className="flex items-center gap-2">
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger className="w-24" data-testid="select-radius">
              <SelectValue placeholder="Raggio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 km</SelectItem>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={requestLocation}
            disabled={requestingLocation}
            data-testid="button-refresh-location"
          >
            {requestingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {locationError && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">{locationError}</p>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-yellow-700 dark:text-yellow-300"
              onClick={requestLocation}
            >
              Riprova
            </Button>
          </div>
        </div>
      )}

      {!userLocation && !requestingLocation && !locationError && (
        <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-card border border-stone-100 dark:border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
            <Navigation className="h-5 w-5 text-stone-500 dark:text-stone-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Attiva la posizione</p>
            <p className="text-xs text-muted-foreground mt-0.5">Per vedere pub, eventi e birre vicino a te</p>
          </div>
          <Button onClick={requestLocation} size="sm" className="bg-primary hover:bg-primary/90 text-white flex-shrink-0 rounded-xl h-8 px-3 text-xs font-bold">
            Attiva
          </Button>
        </div>
      )}

      {userLocation && (
        <div className="mb-4 text-sm text-muted-foreground dark:text-stone-400 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" />
          <span>Posizione rilevata · Risultati entro <strong>{radius} km</strong></span>
        </div>
      )}

      <div className="space-y-8">
        {/* SECTION 1: Locali Vicini */}
        <section>
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            Locali Vicini
          </h2>
          {loadingPubs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : nearbyPubs.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-stone-800/50 rounded-xl">
              <MapPin className="h-10 w-10 text-stone-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground dark:text-stone-400">Nessun pub trovato entro {radius} km</p>
              <Button variant="link" size="sm" onClick={() => setRadius("50")}>Espandi a 50 km</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(showMorePubs ? nearbyPubs : nearbyPubs.slice(0, 10)).map((pub: any) => {
                  const openStatus = getOpenStatus(pub.openingHours);
                  return (
                    <Link key={pub.id} href={`/pub/${pub.id}`}>
                      <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer h-full">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-stone-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm mb-1 truncate">{pub.name}</h3>
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="line-clamp-1">
                                  {userLocation && pub.distance !== 9999 ? pub.city || pub.address?.split(',').pop()?.trim() : pub.address}
                                </span>
                                {userLocation && pub.distance !== 9999 && (
                                  <span className="font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                    {formatDistance(pub.distance)}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-xs ${openStatus.color}`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {openStatus.label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              {nearbyPubs.length > 10 && !showMorePubs && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setShowMorePubs(true)}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Mostra di più ({nearbyPubs.length - 10} altri locali)
                </Button>
              )}
            </>
          )}
        </section>

        {/* SECTION 2: Eventi in Zona */}
        <section>
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-pink-600" />
            Eventi in Zona
            {nearbyEvents.length > 0 && (
              <Badge className="ml-1 bg-pink-600 text-white text-xs px-1.5 py-0">{nearbyEvents.length}</Badge>
            )}
          </h2>
          {loadingEvents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
          ) : nearbyEvents.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-stone-800/50 rounded-xl">
              <CalendarDays className="h-10 w-10 text-stone-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground dark:text-stone-400">Nessun evento in programma entro {radius} km</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyEvents.map((ev: any) => (
                <Card 
                  key={ev.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {ev.imageUrl ? (
                        <img src={ev.imageUrl} alt={ev.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="h-6 w-6 text-pink-600" />
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mb-1.5">
                          <Link href={`/pub/${ev.pubId}`} onClick={(e: any) => e.stopPropagation()}>
                            <span className="text-orange-600 hover:underline font-medium cursor-pointer">{ev.pub?.name}</span>
                          </Link>
                          {ev.pub?.city && <span>• {ev.pub.city}</span>}
                          {ev.distance !== undefined && ev.distance !== null && (
                            <span className="font-medium text-blue-600 dark:text-blue-400">{formatDistance(ev.distance)}</span>
                          )}
                        </div>
                        <EventInterestButton eventId={ev.id} type="pub" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: Festival in Evidenza */}
        <section>
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-600" />
            Festival in Evidenza
            {Array.isArray(activeFestivals) && activeFestivals.length > 0 && (
              <Badge className="ml-1 bg-amber-600 text-white text-xs px-1.5 py-0">{activeFestivals.length}</Badge>
            )}
          </h2>
          {loadingFestivals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : !Array.isArray(activeFestivals) || activeFestivals.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-stone-800/50 rounded-xl">
              <CalendarDays className="h-10 w-10 text-stone-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground dark:text-stone-400">Nessun festival attivo al momento</p>
              <Link href="/festival">
                <Button variant="link" size="sm">Scopri i festival →</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeFestivals.map((fest: any) => {
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
                      <div className="flex items-start gap-3">
                        {fest.logoUrl && (
                          <img src={fest.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{fest.name}</h3>
                          {fest.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />{fest.location}
                            </p>
                          )}
                          {(startDate || endDate) && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {startDate}{startDate && endDate && startDate !== endDate ? ` — ${endDate}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/festival/${fest.slug}`} className="flex-1">
                          <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs">
                            Vedi taplist
                          </Button>
                        </Link>
                        <FestivalLikeButton festivalId={fest.id} showLabel={false} />
                        <ShareButton
                          title={fest.name}
                          text={`Scopri le birre al festival ${fest.name}!`}
                          url={festUrl}
                          size="sm"
                          variant="outline"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 4: Birre in Zona */}
        <section>
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-600" />
            Birre in Zona
            {nearbyTapChanges.length > 0 && (
              <Badge className="ml-1 bg-orange-600 text-white text-xs px-1.5 py-0">{nearbyTapChanges.length}</Badge>
            )}
          </h2>

          {nearbyTapChanges.length > 0 && (
            <div className="flex items-center justify-end gap-2 mb-3">
              {dismissedIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllDismissed} className="text-xs text-muted-foreground">
                  Ripristina nascoste
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={dismissAll} className="text-xs">
                <Trash2 className="h-3 w-3 mr-1" />
                Nascondi tutte
              </Button>
            </div>
          )}

          {loadingTapChanges ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : nearbyTapChanges.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-stone-800/50 rounded-xl">
              <Beer className="h-10 w-10 text-stone-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground dark:text-stone-400">
                {dismissedIds.size > 0
                  ? "Hai nascosto tutte le notifiche."
                  : `Nessuna birra aggiunta o rimossa entro ${radius} km negli ultimi 30 giorni.`}
              </p>
              {dismissedIds.size > 0 ? (
                <Button variant="link" size="sm" onClick={clearAllDismissed}>Ripristina nascoste</Button>
              ) : (
                <Button variant="link" size="sm" onClick={() => setRadius("50")}>Espandi a 50 km</Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyTapChanges.map((tc) => (
                <Card key={tc.id} className="hover:shadow-sm transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tc.type === 'beer_removed' 
                          ? 'bg-red-100 dark:bg-red-900/20' 
                          : 'bg-stone-100 dark:bg-orange-900/20'
                      }`}>
                        <Beer className={`h-5 w-5 ${
                          tc.type === 'beer_removed' ? 'text-red-600' : 'text-orange-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          {tc.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Link href={`/pub/${tc.pubId}`}>
                            <span className="text-xs text-orange-600 hover:underline font-medium cursor-pointer">
                              {tc.pubName}
                            </span>
                          </Link>
                          {tc.pubCity && (
                            <span className="text-xs text-stone-400">• {tc.pubCity}</span>
                          )}
                          {'distance' in tc && (tc as any).distance !== 9999 && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {formatDistance((tc as any).distance)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-400 mt-1 block">
                          {formatDistanceToNow(new Date(tc.createdAt), { addSuffix: true, locale: it })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-red-500"
                        onClick={() => dismissChange(tc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Event Detail Popup */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedEvent && (
            <>
              {selectedEvent.imageUrl && (
                <div className="relative h-48 sm:h-56">
                  <img 
                    src={selectedEvent.imageUrl} 
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
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
                    <span className="text-sm text-orange-600 hover:underline font-semibold cursor-pointer">
                      {selectedEvent.pub?.name}
                    </span>
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
