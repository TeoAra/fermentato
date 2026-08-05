import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import {
  BarChart3, Eye, TrendingUp, Beer, Calendar, Flame, MapPin, Store,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import ImageWithFallback from "@/components/image-with-fallback";

interface BreweryAnalyticsTabProps {
  breweryId: number;
}

interface ViewsSeries {
  date: string;
  views: number;
}

interface TopBeerByViews {
  beerId: number;
  beerName: string;
  imageUrl?: string | null;
  views: number;
}

interface StatsExtended {
  viewsWeek: number;
  viewsLast30: number;
  viewsSeries: ViewsSeries[];
  checkinSeries: { date: string; checkins: number }[];
  checkinsMonth: number;
  checkinsTotal: number;
  favorites: number;
  topBeersByViews?: TopBeerByViews[];
}

interface BeerOnTap {
  beerId: number;
  beerName: string;
  imageUrl?: string | null;
  updatedAt: string | null;
}

interface DistributionPub {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  logo_url?: string | null;
  beer_count: number;
  last_updated: string | null;
  beers_on_tap: BeerOnTap[];
}

const PERIOD_OPTIONS = [
  { label: "7g", days: 7 },
  { label: "30g", days: 30 },
  { label: "90g", days: 90 },
] as const;

/** Format a date string like "2026-07-01" → "1 lug" */
function fmtDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM", { locale: it });
  } catch {
    return dateStr;
  }
}

/** Format a timestamp to a relative-friendly string */
function fmtRelative(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: it });
  } catch {
    return "—";
  }
}

/** Thin label shown every N days so the x-axis isn't overcrowded */
function shouldShowLabel(idx: number, total: number): boolean {
  if (total <= 10) return true;
  if (total <= 20) return idx % 3 === 0;
  return idx % 7 === 0 || idx === total - 1;
}

export default function BreweryAnalyticsTab({ breweryId }: BreweryAnalyticsTabProps) {
  const [selectedDays, setSelectedDays] = useState<7 | 30 | 90>(30);

  const { data: stats, isLoading } = useQuery<StatsExtended>({
    queryKey: ["/api/breweries", breweryId, "stats-extended", selectedDays],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/stats-extended?days=${selectedDays}`),
    enabled: !!breweryId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: distribution, isLoading: isLoadingDist } = useQuery<DistributionPub[]>({
    queryKey: ["/api/breweries", breweryId, "distribution"],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/distribution`),
    enabled: !!breweryId,
    staleTime: 5 * 60 * 1000,
  });

  const viewsSeries: ViewsSeries[] = stats?.viewsSeries ?? [];
  const topBeersByViews: TopBeerByViews[] = stats?.topBeersByViews ?? [];
  const maxViews = viewsSeries.length > 0 ? Math.max(...viewsSeries.map((d) => d.views), 1) : 1;
  const pubList: DistributionPub[] = distribution ?? [];

  const periodLabel = selectedDays === 7 ? "7 giorni" : selectedDays === 90 ? "90 giorni" : "30 giorni";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics Birrificio</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Visite alle pagine birra negli ultimi {periodLabel}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Visite 7g</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? "—" : (stats?.viewsWeek ?? 0).toLocaleString("it")}
              </p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Visite {periodLabel}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? "—" : (stats?.viewsLast30 ?? 0).toLocaleString("it")}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Check-in {periodLabel}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? "—" : (stats?.checkinsMonth ?? 0).toLocaleString("it")}
              </p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <Beer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Birre top viste</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? "—" : topBeersByViews.length > 0 ? topBeersByViews[0].views.toLocaleString("it") : "—"}
              </p>
              {topBeersByViews.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{topBeersByViews[0].beerName}</p>
              )}
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Views Bar Chart */}
      <div className="space-y-3">
        {/* Chart header with period selector */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Visite giornaliere
          </h3>
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setSelectedDays(opt.days as 7 | 30 | 90)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedDays === opt.days
                    ? "bg-white dark:bg-stone-700 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="border-stone-200 dark:border-white/[0.06] p-4 sm:p-6">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Caricamento...
            </div>
          ) : viewsSeries.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center gap-2">
              <Eye className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nessuna visita registrata ancora.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Bar chart */}
              <div className="flex items-end gap-[2px] h-36 w-full">
                {viewsSeries.map((d, idx) => {
                  const heightPct = maxViews > 0 ? Math.max(2, Math.round((d.views / maxViews) * 100)) : 2;
                  const hasViews = d.views > 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center justify-end group relative h-full"
                      title={`${fmtDay(d.date)}: ${d.views} visite`}
                    >
                      <div
                        className={`w-full rounded-sm transition-all ${
                          hasViews
                            ? "bg-primary/80 group-hover:bg-primary"
                            : "bg-stone-100 dark:bg-stone-800"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      {/* Tooltip on hover */}
                      {hasViews && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 rounded pointer-events-none z-10">
                          {d.views}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex gap-[2px] w-full">
                {viewsSeries.map((d, idx) => (
                  <div key={d.date} className="flex-1 flex justify-center">
                    {shouldShowLabel(idx, viewsSeries.length) ? (
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground/70 truncate">
                        {fmtDay(d.date)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Top Beers by Views */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Birre più visitate (ultimi {periodLabel})
        </h3>

        <Card className="border-stone-200 dark:border-white/[0.06] overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
          ) : topBeersByViews.length === 0 ? (
            <div className="p-8 text-center">
              <Beer className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nessun dato di visita disponibile ancora.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Le visite vengono registrate quando gli utenti aprono la pagina di una birra.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
              {topBeersByViews.map((beer, idx) => {
                const barPct = Math.max(4, Math.round((beer.views / (topBeersByViews[0]?.views || 1)) * 100));
                return (
                  <div key={beer.beerId} className="px-4 py-3 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            : idx === 1
                            ? "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                            : idx === 2
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
                            : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Beer image */}
                      {beer.imageUrl ? (
                        <ImageWithFallback
                          src={beer.imageUrl}
                          alt={beer.beerName}
                          imageType="beer"
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-stone-100 dark:border-white/[0.06]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                          <Beer className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{beer.beerName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden max-w-[200px]">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {beer.views.toLocaleString("it")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Check-ins daily trend */}
      {stats?.checkinSeries && stats.checkinSeries.some((d) => d.checkins > 0) && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Check-in giornalieri (ultimi {periodLabel})
          </h3>

          <Card className="border-stone-200 dark:border-white/[0.06] p-4 sm:p-6">
            {(() => {
              const series = stats.checkinSeries;
              const maxC = Math.max(...series.map((d) => d.checkins), 1);
              return (
                <div className="space-y-2">
                  <div className="flex items-end gap-[2px] h-28 w-full">
                    {series.map((d, idx) => {
                      const hp = maxC > 0 ? Math.max(2, Math.round((d.checkins / maxC) * 100)) : 2;
                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center justify-end group relative h-full"
                          title={`${fmtDay(d.date)}: ${d.checkins} check-in`}
                        >
                          <div
                            className={`w-full rounded-sm transition-all ${
                              d.checkins > 0
                                ? "bg-amber-500/80 group-hover:bg-amber-500"
                                : "bg-stone-100 dark:bg-stone-800"
                            }`}
                            style={{ height: `${hp}%` }}
                          />
                          {d.checkins > 0 && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 rounded pointer-events-none z-10">
                              {d.checkins}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-[2px] w-full">
                    {series.map((d, idx) => (
                      <div key={d.date} className="flex-1 flex justify-center">
                        {shouldShowLabel(idx, series.length) ? (
                          <span className="text-[8px] sm:text-[9px] text-muted-foreground/70 truncate">
                            {fmtDay(d.date)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* Distribuzione — Pub che servono le tue birre */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Pub che servono le tue birre
          </h3>
          {!isLoadingDist && pubList.length > 0 && (
            <span className="text-xs text-muted-foreground bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full font-medium">
              {pubList.length} {pubList.length === 1 ? "locale" : "locali"}
            </span>
          )}
        </div>

        <Card className="border-stone-200 dark:border-white/[0.06] overflow-hidden">
          {isLoadingDist ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
          ) : pubList.length === 0 ? (
            <div className="p-8 text-center">
              <Store className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nessun pub sta attualmente servendo le tue birre alla spina.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Quando un pub aggiunge una tua birra alla sua taplist, apparirà qui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
              {pubList.map((pub) => {
                const beers = Array.isArray(pub.beers_on_tap) ? pub.beers_on_tap : [];
                return (
                  <div key={pub.id} className="px-4 py-4 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Pub logo / placeholder */}
                      {pub.logo_url ? (
                        <ImageWithFallback
                          src={pub.logo_url}
                          alt={pub.name}
                          imageType="pub"
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-white/[0.06]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                          <Store className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Pub name + beer count badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{pub.name}</span>
                          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {pub.beer_count} {pub.beer_count === 1 ? "birra" : "birre"}
                          </span>
                        </div>

                        {/* Location */}
                        {(pub.city || pub.region) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {[pub.city, pub.region].filter(Boolean).join(", ")}
                          </p>
                        )}

                        {/* Beers on tap chips */}
                        {beers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {beers.map((b) => (
                              <span
                                key={b.beerId}
                                className="inline-flex items-center gap-1 text-[11px] bg-stone-100 dark:bg-stone-800 text-foreground px-2 py-0.5 rounded-full"
                              >
                                <Beer className="h-3 w-3 text-muted-foreground" />
                                {b.beerName}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Last updated */}
                        {pub.last_updated && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                            Aggiornato il {fmtRelative(pub.last_updated)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
