import { useState, useMemo, useEffect, useCallback } from "react";
import { richTextToPlain, isRichContentEmpty } from "@/components/rich-text-editor";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { format, isToday, isTomorrow, isThisWeek, addDays, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarDays, Search, MapPin, Filter, Loader2, X, Beer, Building2, ArrowRight, Clock,
  List, Map as MapIcon, Navigation, Navigation2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, EventCategoryBadge } from "@/components/events-manager";
import { EventMap, type EventMapPin } from "@/components/event-map";

type PublicEvent = {
  id: number;
  sourceType: "pub" | "brewery";
  title: string;
  description: string | null;
  category: string | null;
  eventDate: string;
  endDate: string | null;
  imageUrl: string | null;
  venueId: number;
  venueName: string;
  venueSlug: string | null;
  venueCity: string | null;
  venueLogoUrl: string | null;
  venueLatitude: string | null;
  venueLongitude: string | null;
};

type Range = "all" | "today" | "tomorrow" | "week" | "month" | "past";
type ViewMode = "list" | "map";

function rangeToDates(range: Range): { from?: Date; to?: Date } {
  const now = new Date();
  switch (range) {
    case "today":    return { from: now, to: endOfDay(now) };
    case "tomorrow": {
      const t = addDays(now, 1);
      return { from: startOfDay(t), to: endOfDay(t) };
    }
    case "week":     return { from: now, to: endOfDay(addDays(now, 7)) };
    case "month":    return { from: now, to: endOfDay(addDays(now, 30)) };
    case "past":     return { from: new Date(0), to: now };
    default:         return {};
  }
}

function formatEventTime(date: Date) {
  if (isToday(date)) return `Oggi · ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Domani · ${format(date, "HH:mm")}`;
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, "EEEE 'alle' HH:mm", { locale: it });
  return format(date, "d MMM 'alle' HH:mm", { locale: it });
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function EventiPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [source, setSource] = useState<"all" | "pub" | "brewery">("all");
  const [range, setRange] = useState<Range>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const PAGE_SIZE = 30;
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { from, to } = useMemo(() => rangeToDates(range), [range]);

  // Reset pagination whenever filters change so we don't over-fetch on a new query.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [q, city, category, source, range]);

  // In map mode or nearby mode, fetch a large set so the map/distance sort is complete.
  // Server cap is 500; these modes need the full applicable result set.
  const effectiveLimit = viewMode === "map" || userLocation ? 500 : limit;

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (city.trim()) params.set("city", city.trim());
  if (category !== "all") params.set("category", category);
  if (source !== "all") params.set("source", source);
  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());
  params.set("limit", String(effectiveLimit));
  params.set("offset", "0");

  const queryString = params.toString();

  const { data, isLoading, isFetching } = useQuery<{ events: PublicEvent[]; totalCount: number }>({
    queryKey: ["/api/events/public", queryString],
    queryFn: () => fetch(`/api/events/public?${queryString}`).then(r => {
      if (!r.ok) throw new Error("Errore caricamento eventi");
      return r.json();
    }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const rawEvents = data?.events ?? [];
  const total = data?.totalCount ?? 0;

  // City autocomplete suggestions (distinct cities with upcoming events).
  const { data: citiesData } = useQuery<{ cities: string[] }>({
    queryKey: ["/api/events/cities"],
    queryFn: () => fetch(`/api/events/cities`).then(r => {
      if (!r.ok) throw new Error("Errore caricamento città");
      return r.json();
    }),
    staleTime: 5 * 60_000,
  });
  const cities = citiesData?.cities ?? [];

  // Sort by distance when user location is known
  const events = useMemo(() => {
    if (!userLocation) return rawEvents;
    const withDist = rawEvents.map(ev => {
      const lat = ev.venueLatitude ? parseFloat(ev.venueLatitude) : null;
      const lng = ev.venueLongitude ? parseFloat(ev.venueLongitude) : null;
      const dist = lat && lng && !isNaN(lat) && !isNaN(lng)
        ? haversineKm(userLocation.lat, userLocation.lng, lat, lng)
        : Infinity;
      return { ...ev, _dist: dist };
    });
    return withDist.sort((a, b) => a._dist - b._dist);
  }, [rawEvents, userLocation]);

  const hasMore = rawEvents.length < total && viewMode === "list";

  // Group by day for nice section headings (list view)
  const grouped = useMemo(() => {
    if (userLocation) {
      // When sorting by distance, don't group by date — show flat sorted list
      return null;
    }
    const map = new Map<string, PublicEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.eventDate);
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    const result = Array.from(map.entries()).map(([date, list]) => ({ date, list }));
    return range === "past" ? result.reverse() : result;
  }, [events, range, userLocation]);

  const hasActiveFilters = q || city || category !== "all" || source !== "all" || range !== "all";

  // Map pins: events with valid coordinates
  const mapPins = useMemo<EventMapPin[]>(() =>
    events
      .filter(ev => ev.venueLatitude && ev.venueLongitude)
      .map(ev => ({
        id: ev.id,
        sourceType: ev.sourceType,
        title: ev.title,
        venueName: ev.venueName,
        venueSlug: ev.venueSlug,
        latitude: ev.venueLatitude,
        longitude: ev.venueLongitude,
      })),
    [events]
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalizzazione non supportata dal browser");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Posizione non disponibile. Verifica i permessi del browser.");
        setLocating(false);
      },
      { timeout: 10_000, enableHighAccuracy: false }
    );
  }, []);

  const handleClearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 to-white dark:from-[#0B0D10] dark:to-[#0F1820]">
      <Helmet>
        <title>Eventi birrari in Italia · Fermenta.to</title>
        <meta name="description" content="Scopri tutti gli eventi nei pub e birrifici italiani: degustazioni, live music, feste e molto altro. Trova un evento vicino a te." />
        <meta property="og:title" content="Eventi birrari in Italia · Fermenta.to" />
      </Helmet>

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-10 lg:pt-14 lg:pb-14">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-6 w-6" />
            <span className="text-xs uppercase tracking-widest opacity-90">Cosa fare in Italia</span>
          </div>
          <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight">Eventi birrari</h1>
          <p className="text-white/85 mt-2 max-w-xl">
            Degustazioni, live music, festival e serate speciali nei migliori pub e birrifici d'Italia.
          </p>

          {/* Search */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cerca per nome evento, locale o tema…"
                className="pl-9 h-11 bg-white text-foreground rounded-xl border-0"
                data-testid="input-event-search"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Pulisci"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              className="h-11 rounded-xl gap-2"
              onClick={() => setShowFilters(s => !s)}
              data-testid="btn-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              Filtri{hasActiveFilters ? " ●" : ""}
            </Button>
          </div>

          {/* Quick range chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {([
              { v: "all",      l: "Tutti" },
              { v: "today",    l: "Oggi" },
              { v: "tomorrow", l: "Domani" },
              { v: "past",     l: "Passati" },
              { v: "week",     l: "Questa settimana" },
              { v: "month",    l: "Questo mese" },
            ] as { v: Range; l: string }[]).map(opt => (
              <button
                key={opt.v}
                onClick={() => setRange(opt.v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                  range === opt.v
                    ? "bg-white text-purple-700 shadow"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
                data-testid={`chip-range-${opt.v}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Advanced filters */}
        {showFilters && (
          <Card className="mb-5 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1 block">Città</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Es. Milano"
                    className="pl-8 h-9"
                    list="event-cities"
                    autoComplete="off"
                    data-testid="input-event-city"
                  />
                  <datalist id="event-cities">
                    {cities.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1 block">Categoria</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9" data-testid="select-event-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le categorie</SelectItem>
                    {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1 block">Dove</label>
                <Select value={source} onValueChange={(v: any) => setSource(v)}>
                  <SelectTrigger className="h-9" data-testid="select-event-source"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Pub e Birrifici</SelectItem>
                    <SelectItem value="pub">Solo Pub</SelectItem>
                    <SelectItem value="brewery">Solo Birrifici</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-3 flex justify-end">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setQ(""); setCity(""); setCategory("all"); setSource("all"); setRange("all"); }}
                    data-testid="btn-clear-filters"
                  >
                    Reset filtri
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Toolbar: count + view toggle + nearby */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Caricamento…" : `${total} ${total === 1 ? "evento trovato" : "eventi trovati"}`}
          </p>

          <div className="flex items-center gap-2">
            {/* Vicino a me */}
            {userLocation ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400 h-9"
                onClick={handleClearLocation}
                data-testid="btn-clear-location"
              >
                <Navigation2 className="h-3.5 w-3.5" />
                Vicino a me ✓
                <X className="h-3 w-3 ml-0.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl h-9"
                onClick={handleLocateMe}
                disabled={locating}
                data-testid="btn-locate-me"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                Vicino a me
              </Button>
            )}

            {/* List / Map toggle */}
            <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden h-9">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 text-xs font-semibold transition ${
                  viewMode === "list"
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
                }`}
                data-testid="btn-view-list"
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 text-xs font-semibold transition border-l border-stone-200 dark:border-stone-700 ${
                  viewMode === "map"
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
                }`}
                data-testid="btn-view-map"
              >
                <MapIcon className="h-3.5 w-3.5" />
                Mappa
              </button>
            </div>
          </div>
        </div>

        {/* Location error */}
        {locationError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <X className="h-4 w-4 flex-shrink-0" />
            {locationError}
          </div>
        )}

        {/* MAP VIEW */}
        {viewMode === "map" && (
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center" style={{ height: 520 }}>
                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                <EventMap
                  pins={mapPins}
                  height="520px"
                  userLocation={userLocation}
                />
                {mapPins.length === 0 && events.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Nessun evento con coordinate disponibili per la mappa.
                    <button className="ml-1 underline text-purple-600" onClick={() => setViewMode("list")}>
                      Torna alla lista
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
              </div>
            ) : events.length === 0 ? (
              <Card className="border-dashed bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <CardContent className="py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground dark:text-white">Nessun evento trovato</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prova a cambiare filtri o periodo.
                  </p>
                </CardContent>
              </Card>
            ) : userLocation ? (
              /* Flat distance-sorted list */
              <div className="space-y-3">
                {(events as (PublicEvent & { _dist?: number })[]).map(ev => (
                  <EventCard
                    key={`${ev.sourceType}-${ev.id}`}
                    ev={ev}
                    distanceKm={ev._dist !== Infinity ? ev._dist : undefined}
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={() => setLimit(l => l + PAGE_SIZE)}
                      disabled={isFetching}
                      data-testid="btn-load-more-events"
                    >
                      {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Carica altri eventi
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Grouped by day */
              <div className="space-y-8">
                {(grouped ?? []).map(({ date, list }) => {
                  const d = new Date(date);
                  const heading = isToday(d) ? "Oggi"
                    : isTomorrow(d) ? "Domani"
                    : format(d, "EEEE d MMMM", { locale: it });
                  return (
                    <section key={date}>
                      <h2 className="text-sm uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-3">
                        {heading}
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {list.map(ev => <EventCard key={`${ev.sourceType}-${ev.id}`} ev={ev} />)}
                      </div>
                    </section>
                  );
                })}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={() => setLimit(l => l + PAGE_SIZE)}
                      disabled={isFetching}
                      data-testid="btn-load-more-events"
                    >
                      {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Carica altri eventi
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EventCard({ ev, distanceKm }: { ev: PublicEvent; distanceKm?: number }) {

  const startDate = new Date(ev.eventDate);
  const SourceIcon = ev.sourceType === "brewery" ? Building2 : Beer;
  const venueLabel = ev.venueCity || (ev.sourceType === "brewery" ? "Birrificio" : "Pub");
  const href = `/eventi/${ev.sourceType}/${ev.id}`;

  return (
    <Link href={href}>
      <a className="block group" data-testid={`card-event-${ev.sourceType}-${ev.id}`}>
        <Card className="overflow-hidden bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 active:scale-[0.99] h-full">
          {ev.imageUrl ? (
            <div className="relative h-40 bg-stone-100 dark:bg-[#1A1D24]">
              <img src={ev.imageUrl} alt={ev.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 flex gap-1.5">
                <Badge className="bg-white/95 text-stone-800 hover:bg-white border-0 text-[10px] gap-1">
                  <SourceIcon className="h-3 w-3" />
                  {ev.sourceType === "brewery" ? "Birrificio" : "Pub"}
                </Badge>
                {ev.category && <EventCategoryBadge category={ev.category} />}
                {distanceKm !== undefined && (
                  <Badge className="bg-blue-500/90 text-white hover:bg-blue-500 border-0 text-[10px] gap-1">
                    <Navigation2 className="h-2.5 w-2.5" />
                    {formatDistance(distanceKm)}
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <p className="text-xs font-medium opacity-90 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatEventTime(startDate)}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center">
              <CalendarDays className="h-10 w-10 text-white/80" />
              <div className="absolute top-2 left-2 flex gap-1.5">
                <Badge className="bg-white/95 text-stone-800 hover:bg-white border-0 text-[10px] gap-1">
                  <SourceIcon className="h-3 w-3" />
                  {ev.sourceType === "brewery" ? "Birrificio" : "Pub"}
                </Badge>
                {ev.category && <EventCategoryBadge category={ev.category} />}
                {distanceKm !== undefined && (
                  <Badge className="bg-blue-500/90 text-white hover:bg-blue-500 border-0 text-[10px] gap-1">
                    <Navigation2 className="h-2.5 w-2.5" />
                    {formatDistance(distanceKm)}
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <p className="text-xs font-medium opacity-90 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatEventTime(startDate)}
                </p>
              </div>
            </div>
          )}
          <CardContent className="p-4">
            <h3 className="font-bold text-foreground dark:text-white line-clamp-2 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              {ev.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{ev.venueName}</span>
              <span>·</span>
              <span className="truncate">{venueLabel}</span>
            </div>
            {!isRichContentEmpty(ev.description) && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{richTextToPlain(ev.description)}</p>
            )}
            <div className="flex items-center justify-end mt-3 text-xs font-semibold text-purple-700 dark:text-purple-400">
              Dettagli <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
