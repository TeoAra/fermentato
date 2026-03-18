import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets, Search, Star, UtensilsCrossed, Beer, ChevronDown, ChevronUp,
  MapPin, CheckCircle2, XCircle, Loader2, Clock, Calendar,
} from "lucide-react";

const ALLERGEN_LABELS: Record<string, string> = {
  glutine: "Glutine", crostacei: "Crostacei", uova: "Uova", pesce: "Pesce",
  arachidi: "Arachidi", soia: "Soia", latte: "Latte",
  "frutta a guscio": "Frutta a guscio", sedano: "Sedano", senape: "Senape",
  sesamo: "Sesamo", solfiti: "Solfiti", lupini: "Lupini", molluschi: "Molluschi",
};

type ScheduleSlot = { label: string; date?: string; openFrom: string; openTo: string };

interface FestivalData {
  festival: {
    id: number; name: string; description: string | null; location: string | null;
    startDate: string | null; endDate: string | null; logoUrl: string | null;
    coverImageUrl: string | null; showFood: boolean; isActive: boolean;
    schedule: ScheduleSlot[] | null;
  };
  taps: Array<{
    id: number; tapNumber: number; beerId: number | null;
    customBeerName: string | null; customBreweryName: string | null;
    style: string | null; abv: string | null; notes: string | null;
    isAvailable: boolean; beerName: string | null; beerStyle: string | null;
    beerAbv: string | null; beerImageUrl: string | null;
    breweryId: number | null; breweryName: string | null; breweryLogoUrl: string | null;
    avgRating: number | null; ratingCount: number; userRating: number | null;
  }>;
  food: Array<{
    id: number; name: string; description: string | null; price: string | null;
    category: string | null; isAvailable: boolean; allergens: string[] | null;
  }>;
}

function StarRating({ tapId, slug, current, avg, count }: {
  tapId: number; slug: string; current: number | null; avg: number | null; count: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(current);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (rating: number) =>
      apiRequest(`/api/festivals/${slug}/taps/${tapId}/rate`, { method: "POST" }, { rating }),
    onSuccess: (data: any) => {
      setSelected(data.userRating);
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug] });
    },
    onError: () => toast({ title: "Errore nel voto", variant: "destructive" }),
  });

  const display = hovered ?? selected;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
              (display ?? 0) >= n
                ? "bg-amber-500 text-white scale-110"
                : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-amber-200"
            }`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => rateMutation.mutate(n)}
            disabled={rateMutation.isPending}
          >
            {n}
          </button>
        ))}
        {rateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
      </div>
      {(avg !== null && count > 0) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Media: <span className="font-bold text-amber-600">{avg.toFixed(1)}</span>
          <span className="ml-1 opacity-60">({count} vot{count === 1 ? "o" : "i"})</span>
          {selected && <span className="ml-2 text-green-600 font-medium">Il tuo voto: {selected}</span>}
        </p>
      )}
    </div>
  );
}

function TapCard({ tap, slug, isAuth }: { tap: FestivalData["taps"][0]; slug: string; isAuth: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const beerName = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
  const breweryName = tap.breweryName || tap.customBreweryName;
  const style = tap.beerStyle || tap.style;
  const abv = tap.beerAbv || tap.abv;

  return (
    <Card className={`border transition-all ${tap.isAvailable ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Tap number badge */}
          <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${
            tap.isAvailable ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
          }`}>
            {tap.tapNumber}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {tap.beerId ? (
                    <Link href={`/beer/${tap.beerId}`}>
                      <span className={`font-semibold text-sm hover:underline cursor-pointer ${tap.isAvailable ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>
                        {beerName}
                      </span>
                    </Link>
                  ) : (
                    <span className={`font-semibold text-sm ${tap.isAvailable ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>
                      {beerName}
                    </span>
                  )}
                  {!tap.isAvailable && (
                    <Badge variant="outline" className="text-xs text-red-500 border-red-200 py-0">Finita</Badge>
                  )}
                </div>

                {/* Brewery row with logo */}
                {(breweryName || tap.breweryLogoUrl) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {tap.breweryLogoUrl && (
                      <img src={tap.breweryLogoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                    )}
                    {tap.breweryId ? (
                      <Link href={`/brewery/${tap.breweryId}`}>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer">{breweryName}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{breweryName}</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {style && <Badge variant="secondary" className="text-xs py-0">{style}</Badge>}
                  {abv && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" />{abv}% ABV
                    </span>
                  )}
                  {tap.avgRating !== null && tap.ratingCount > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" />{tap.avgRating?.toFixed(1)}
                      <span className="text-gray-400">({tap.ratingCount})</span>
                    </span>
                  )}
                </div>
              </div>

              {tap.isAvailable && isAuth && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="flex-shrink-0 text-amber-500 hover:text-amber-600 transition-colors"
                >
                  {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              )}
            </div>

            {/* Beer image (shown when expanded) */}
            {expanded && tap.beerImageUrl && (
              <div className="mt-2">
                <img src={tap.beerImageUrl} alt={beerName} className="h-24 w-24 object-cover rounded-xl" />
              </div>
            )}

            {tap.notes && !expanded && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{tap.notes}</p>
            )}

            {expanded && tap.isAvailable && isAuth && (
              <div className="mt-3 border-t pt-3 dark:border-gray-700">
                {tap.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{tap.notes}</p>}
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Il tuo voto (1–10):</p>
                <StarRating tapId={tap.id} slug={slug} current={tap.userRating} avg={tap.avgRating} count={tap.ratingCount} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FoodCategoryBlock({ category, items }: {
  category: string;
  items: FestivalData["food"];
}) {
  const [expanded, setExpanded] = useState(true);
  const available = items.filter(i => i.isAvailable).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{category}</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {available}/{items.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(item => (
            <div key={item.id} className={`px-4 py-3 ${!item.isAvailable ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${!item.isAvailable ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                      {item.name}
                    </span>
                    {!item.isAvailable && (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-200 py-0">Esaurito</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                  )}
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.allergens.map(a => (
                        <span key={a} className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 px-1.5 py-0.5 rounded-full">
                          {ALLERGEN_LABELS[a.toLowerCase()] ?? a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {item.price && (
                  <span className="font-bold text-amber-600 text-sm whitespace-nowrap">€{parseFloat(item.price).toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FestivalPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(true);

  const { data, isLoading, isError, error } = useQuery<FestivalData, { status: number; message: string }>({
    queryKey: ["/api/festivals", slug],
    queryFn: async () => {
      const r = await fetch(`/api/festivals/${slug}`, { credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err: any = new Error(body.message || "Errore");
        err.status = r.status;
        throw err;
      }
      return r.json();
    },
    refetchInterval: 30000,
    retry: false,
  });

  const filteredTaps = useMemo(() => {
    if (!data?.taps) return [];
    return data.taps.filter(t => {
      if (!showUnavailable && !t.isAvailable) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const name = (t.beerName || t.customBeerName || "").toLowerCase();
      const brew = (t.breweryName || t.customBreweryName || "").toLowerCase();
      const style = (t.beerStyle || t.style || "").toLowerCase();
      const num = String(t.tapNumber);
      return name.includes(q) || brew.includes(q) || style.includes(q) || num.includes(q);
    });
  }, [data?.taps, search, showUnavailable]);

  const foodByCategory = useMemo(() => {
    if (!data?.food) return {};
    const acc: Record<string, typeof data.food> = {};
    data.food.forEach(item => {
      const cat = item.category || "Altro";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
    });
    return acc;
  }, [data?.food]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
        <p className="text-gray-600">Caricamento festival...</p>
      </div>
    </div>
  );

  const isNotActive = isError && (error as any)?.status === 403;

  if (isError || !data?.festival) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center space-y-3 max-w-xs px-4">
        <Beer className="h-12 w-12 text-gray-300 mx-auto" />
        {isNotActive ? (
          <>
            <h2 className="text-xl font-bold text-gray-700">Festival non ancora attivo</h2>
            <p className="text-gray-500">Il taplist digitale di questo festival non è ancora disponibile. Riprova a breve!</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-700">Festival non trovato</h2>
            <p className="text-gray-500">Controlla il QR code e riprova.</p>
          </>
        )}
      </div>
    </div>
  );

  const { festival, taps } = data;
  const availableCount = taps.filter(t => t.isAvailable).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div
        className="relative text-white overflow-hidden"
        style={festival.coverImageUrl ? {
          background: "linear-gradient(to right, rgba(180,83,9,0.88), rgba(234,88,12,0.85))",
        } : undefined}
      >
        {festival.coverImageUrl && (
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage: `url(${festival.coverImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.45)",
            }}
          />
        )}
        {!festival.coverImageUrl && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-amber-600 to-orange-600" />
        )}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {festival.logoUrl && (
              <img src={festival.logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight">{festival.name}</h1>
              {festival.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(festival.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-100 text-sm flex items-center gap-1 mt-0.5 hover:text-white transition-colors underline-offset-2 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{festival.location}</span>
                </a>
              )}
              {/* Dates */}
              {(festival.startDate || festival.endDate) && (
                <p className="text-amber-100/80 text-xs flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  {festival.startDate && new Date(festival.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                  {festival.startDate && festival.endDate && festival.startDate !== festival.endDate && " — "}
                  {festival.endDate && festival.startDate !== festival.endDate && new Date(festival.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {festival.description && (
                <p className="text-amber-100/80 text-xs mt-1 line-clamp-2">{festival.description}</p>
              )}
            </div>
          </div>

          {/* Schedule */}
          {festival.schedule && festival.schedule.length > 0 && (
            <div className="mt-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-100 text-xs font-semibold uppercase tracking-wide mb-1">
                <Clock className="h-3.5 w-3.5" />Orari
              </div>
              {festival.schedule.map((slot, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-amber-100 font-medium">
                    {slot.date
                      ? new Date(slot.date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
                      : slot.label}
                  </span>
                  <span className="text-white font-bold">{slot.openFrom} – {slot.openTo}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-3 mt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{availableCount}</div>
              <div className="text-xs text-amber-100">spine disponibili</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{taps.length}</div>
              <div className="text-xs text-amber-100">spine totali</div>
            </div>
            {!isAuthenticated && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
                <div className="text-xs text-amber-100 mb-1">Per votare le birre</div>
                <a href="/api/login" className="text-xs font-bold underline">Accedi →</a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <Tabs defaultValue="taps">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="taps" className="flex-1 gap-1.5">
              <Beer className="h-4 w-4" />
              Birre ({availableCount}/{taps.length})
            </TabsTrigger>
            {festival.showFood && data.food.length > 0 && (
              <TabsTrigger value="food" className="flex-1 gap-1.5">
                <UtensilsCrossed className="h-4 w-4" />
                Cibo ({data.food.filter(f => f.isAvailable).length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="taps" className="space-y-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome, birrificio, stile, n. spina..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-white dark:bg-gray-800"
                />
              </div>
              <Button
                variant={showUnavailable ? "outline" : "default"}
                size="sm"
                onClick={() => setShowUnavailable(v => !v)}
                className="gap-1 whitespace-nowrap text-xs"
              >
                {showUnavailable ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {showUnavailable ? "Nascondi finite" : "Mostra tutte"}
              </Button>
            </div>

            {filteredTaps.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Beer className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nessuna birra trovata</p>
              </div>
            ) : (
              filteredTaps.map(tap => (
                <TapCard key={tap.id} tap={tap} slug={slug!} isAuth={isAuthenticated} />
              ))
            )}
          </TabsContent>

          {festival.showFood && (
            <TabsContent value="food" className="space-y-3">
              {Object.keys(foodByCategory).length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Nessuna voce nel menu</p>
                </div>
              ) : (
                Object.entries(foodByCategory).map(([category, items]) => (
                  <FoodCategoryBlock key={category} category={category} items={items} />
                ))
              )}
              <p className="text-xs text-center text-gray-400 pt-2">
                I prezzi includono IVA · Informare il personale di eventuali allergie
              </p>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="text-center py-6 text-xs text-gray-400">
        <a href="/" className="hover:text-amber-600 transition-colors">Fermenta.to</a>
        {" · "}Aggiornato ogni 30 secondi
      </div>
    </div>
  );
}
