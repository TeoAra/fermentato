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
  MapPin, CheckCircle2, XCircle, Loader2, Clock, Calendar, Trophy, Info,
  Pencil, ExternalLink,
} from "lucide-react";
import { FestivalLikeButton } from "@/components/festival-like-button";
import { ShareButton } from "@/components/share-button";

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
    managerId: string | null;
  };
  taps: Array<{
    id: number; tapNumber: number; beerId: number | null;
    customBeerName: string | null; customBreweryName: string | null;
    style: string | null; abv: string | null; notes: string | null;
    isAvailable: boolean; tapType: string | null;
    beerName: string | null; beerStyle: string | null;
    beerAbv: string | null; beerImageUrl: string | null;
    beerDescription: string | null;
    breweryId: number | null; breweryName: string | null; breweryLogoUrl: string | null;
    avgRating: number | null; ratingCount: number; userRating: number | null;
    prices: Record<string, number> | null;
  }>;
  food: Array<{
    id: number; name: string; description: string | null; price: string | null;
    category: string | null; isAvailable: boolean; allergens: string[] | null;
  }>;
  rankings: Array<{
    tapNumber: number; beerName: string; beerImageUrl: string | null;
    breweryName: string | null; avg: number; count: number;
  }>;
}

// ── Slider Rating ────────────────────────────────────────────────────────────
function SliderRating({ tapId, slug, current, avg, count }: {
  tapId: number; slug: string; current: number | null; avg: number | null; count: number;
}) {
  const [localValue, setLocalValue] = useState<number>(current ?? 5);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (rating: number) =>
      apiRequest(`/api/festivals/${slug}/taps/${tapId}/rate`, { method: "POST" }, { rating }),
    onSuccess: (data: any) => {
      setLocalValue(data.userRating);
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug] });
    },
    onError: () => toast({ title: "Errore nel voto", variant: "destructive" }),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(parseInt(e.target.value));
    setIsDragging(true);
  };

  const handleRelease = () => {
    setIsDragging(false);
    rateMutation.mutate(localValue);
  };

  const displayVal = isDragging ? localValue : (current ?? localValue);
  const pct = ((displayVal - 1) / 9) * 100;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Il tuo voto:</span>
        <span className={`text-lg font-bold ${
          displayVal >= 8 ? "text-green-600" : displayVal >= 5 ? "text-amber-500" : "text-red-500"
        }`}>{displayVal}/10</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={displayVal}
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          disabled={rateMutation.isPending}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500"
          style={{
            background: `linear-gradient(to right, #f59e0b ${pct}%, #e5e7eb ${pct}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-0.5">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>
      {rateMutation.isPending && (
        <div className="flex items-center gap-1.5 mt-1">
          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
          <span className="text-xs text-gray-400">Salvataggio…</span>
        </div>
      )}
      {(avg !== null && count > 0) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-bold text-amber-600">{avg.toFixed(1)}</span>
          <span className="opacity-60">({count} vot{count === 1 ? "o" : "i"})</span>
          {current && <span className="text-green-600 font-medium ml-1">· Tuo: {current}</span>}
        </div>
      )}
    </div>
  );
}

// ── Tap Card ─────────────────────────────────────────────────────────────────
function TapCard({ tap, slug, isAuth, isManager }: {
  tap: FestivalData["taps"][0]; slug: string; isAuth: boolean; isManager: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const beerName = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
  const breweryName = tap.breweryName || tap.customBreweryName;
  const style = tap.beerStyle || tap.style;
  const abv = tap.beerAbv || tap.abv;
  const imageUrl = tap.beerImageUrl;
  const isPompa = tap.tapType === "pompa";
  const hasPrices = tap.prices && Object.keys(tap.prices).length > 0;
  const hasDescription = !!tap.beerDescription;
  const descriptionMissing = tap.beerId && !hasDescription && isManager;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all ${
      tap.isAvailable
        ? "border-gray-200 dark:border-gray-700"
        : "border-gray-100 dark:border-gray-800 opacity-60"
    }`}>
      {/* Collapsed row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          {/* Tap number badge */}
          <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${
            tap.isAvailable
              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
          }`}>
            {tap.tapNumber}
          </div>

          {/* Beer image */}
          {imageUrl ? (
            <img src={imageUrl} alt={beerName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Beer className="h-5 w-5 text-gray-300" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {tap.beerId ? (
                <Link href={`/beer/${tap.beerId}`} onClick={e => e.stopPropagation()}>
                  <span className={`font-semibold text-sm hover:underline cursor-pointer ${
                    tap.isAvailable ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"
                  }`}>{beerName}</span>
                </Link>
              ) : (
                <span className={`font-semibold text-sm ${
                  tap.isAvailable ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"
                }`}>{beerName}</span>
              )}
              {!tap.isAvailable && (
                <Badge variant="outline" className="text-xs text-red-500 border-red-200 py-0">Finita</Badge>
              )}
              {isPompa && (
                <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-1.5 py-0 rounded-full">
                  In pompa
                </span>
              )}
            </div>

            {(breweryName || tap.breweryLogoUrl) && (
              <div className="flex items-center gap-1 mt-0.5">
                {tap.breweryLogoUrl && (
                  <img src={tap.breweryLogoUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                )}
                {tap.breweryId ? (
                  <Link href={`/brewery/${tap.breweryId}`} onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer">{breweryName}</span>
                  </Link>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{breweryName}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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
              {hasPrices && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Object.entries(tap.prices!).map(([size, price]) => `${size} €${price.toFixed(2)}`).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          {tap.isAvailable && (
            <div className="flex-shrink-0 text-amber-500">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          )}
        </div>

        {!expanded && tap.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-[92px] line-clamp-1">{tap.notes}</p>
        )}
      </button>

      {/* Expanded content */}
      {expanded && tap.isAvailable && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          {/* Notes */}
          {tap.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{tap.notes}</p>
          )}

          {/* Beer description */}
          {hasDescription && (
            <div className="mb-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />Descrizione
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{tap.beerDescription}</p>
            </div>
          )}

          {/* Manager edit link when description is missing */}
          {descriptionMissing && (
            <div className="mb-3 border border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-2">Descrizione birra mancante</p>
              <Link href={`/beer/${tap.beerId}`}>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                  <Pencil className="h-3 w-3" />Modifica birra
                </Button>
              </Link>
            </div>
          )}

          {/* Prices (multiple sizes) */}
          {hasPrices && (
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.entries(tap.prices!).map(([size, price]) => (
                <div key={size} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{size}</div>
                  <div className="font-bold text-amber-600 text-sm">€{price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Rating */}
          {isAuth ? (
            <SliderRating tapId={tap.id} slug={slug} current={tap.userRating} avg={tap.avgRating} count={tap.ratingCount} />
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              {tap.avgRating !== null && tap.ratingCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="font-bold">{tap.avgRating.toFixed(1)}</span>
                  <span className="text-gray-400">({tap.ratingCount} vot{tap.ratingCount === 1 ? "o" : "i"})</span>
                </div>
              )}
              <a href="/api/login" className="ml-auto text-xs text-amber-600 font-medium hover:underline">
                Accedi per votare →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Food Category Block ───────────────────────────────────────────────────────
function FoodCategoryBlock({ category, items }: { category: string; items: FestivalData["food"] }) {
  const [expanded, setExpanded] = useState(false);
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

// ── Rankings Tab ─────────────────────────────────────────────────────────────
function RankingsTab({ rankings }: { rankings: FestivalData["rankings"] }) {
  if (rankings.length === 0) return (
    <div className="text-center py-10 text-gray-400">
      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p>Ancora nessun voto</p>
      <p className="text-xs mt-1">Espandi le birre per votarle!</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {rankings.map((t, i) => (
        <div key={t.tapNumber} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
          <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${
            i === 0 ? "bg-yellow-100 text-yellow-700" :
            i === 1 ? "bg-gray-200 text-gray-600" :
            i === 2 ? "bg-orange-100 text-orange-600" :
            "bg-gray-50 dark:bg-gray-700 text-gray-500"
          }`}>
            {i + 1}
          </div>
          {t.beerImageUrl ? (
            <img src={t.beerImageUrl} alt={t.beerName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <Beer className="h-5 w-5 text-amber-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{t.beerName}</p>
            {t.breweryName && (
              <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{t.breweryName}</p>
            )}
            <p className="text-xs text-gray-400">Spina #{t.tapNumber} · {t.count} vot{t.count === 1 ? "o" : "i"}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-amber-600">{t.avg.toFixed(1)}</div>
            <div className="flex items-center gap-0.5 justify-end">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(t.avg / 2) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FestivalPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

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

  const { festival, taps, rankings = [] } = data;
  const availableCount = taps.filter(t => t.isAvailable).length;

  const isManager = !!(user && festival.managerId && (user as any).id === festival.managerId) ||
    !!(user && ((user as any).roles?.includes("admin") || (user as any).activeRole === "admin"));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover image banner */}
      {festival.coverImageUrl ? (
        <div className="relative w-full h-52 overflow-hidden">
          <img src={festival.coverImageUrl} alt={festival.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-amber-600 to-orange-600" />
      )}

      {/* Info card */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {festival.logoUrl && (
                <img
                  src={festival.logoUrl}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover shadow-md flex-shrink-0 border-2 border-white"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{festival.name}</h1>
                {festival.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(festival.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 text-sm flex items-center gap-1 mt-1 hover:text-amber-600 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{festival.location}</span>
                  </a>
                )}
                {(festival.startDate || festival.endDate) && (
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    {festival.startDate && formatDate(festival.startDate)}
                    {festival.startDate && festival.endDate && festival.startDate !== festival.endDate && " — "}
                    {festival.endDate && festival.startDate !== festival.endDate && formatDate(festival.endDate)}
                  </p>
                )}
              </div>
            </div>

            {/* Schedule */}
            {festival.schedule && festival.schedule.length > 0 && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
                  <Clock className="h-3.5 w-3.5" />Orari
                </div>
                {festival.schedule.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {slot.date
                        ? new Date(slot.date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
                        : slot.label}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">{slot.openFrom} – {slot.openTo}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Like + Share */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <FestivalLikeButton festivalId={festival.id} className="flex-1" />
              <ShareButton
                title={festival.name}
                text={`Scopri le birre al festival ${festival.name}!`}
                url={window.location.href}
                label="Condividi"
                className="flex-1"
              />
              {!isAuthenticated && (
                <a href="/api/login" className="flex-1">
                  <button className="w-full text-xs font-bold text-amber-600 border border-amber-200 rounded-md px-3 py-2 hover:bg-amber-50 transition-colors">
                    Accedi per votare →
                  </button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description – separate expandable card */}
        {festival.description && (
          <div className="mt-3">
            <button
              className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between text-left shadow-sm hover:border-amber-300 transition-colors"
              onClick={() => setDescExpanded(v => !v)}
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-500" />Sul festival
              </span>
              {descExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {descExpanded && (
              <div className="bg-white dark:bg-gray-800 rounded-b-2xl border border-t-0 border-gray-200 dark:border-gray-700 px-4 pb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{festival.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content tabs */}
      <div className="max-w-2xl mx-auto px-4 py-4 mt-2">
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
            <TabsTrigger value="rankings" className="flex-1 gap-1.5">
              <Trophy className="h-4 w-4" />
              Classifica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taps" className="space-y-2">
            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome, birrificio, stile…"
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
                <TapCard key={tap.id} tap={tap} slug={slug!} isAuth={isAuthenticated} isManager={isManager} />
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

          <TabsContent value="rankings" className="space-y-2">
            <RankingsTab rankings={rankings} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="text-center py-6 text-xs text-gray-400">
        <a href="/" className="hover:text-amber-600 transition-colors">Fermenta.to</a>
        {" · "}Aggiornato ogni 30 secondi
      </div>
    </div>
  );
}
