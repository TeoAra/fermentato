/**
 * BreweryQuickStats — compact stats widget for the brewery owner dashboard overview.
 *
 * Shows at a glance:
 *  • Beer page views last 7 days (via beer_views)
 *  • Check-ins this month (user_beer_tastings for beers from this brewery)
 *  • Favorites count (favorites table with item_type = 'brewery')
 *  • Top beer (most tasted beer from this brewery)
 *
 * Also renders a small SVG sparkline for the 30-day check-in history.
 * Collapsible on mobile to avoid overwhelming the overview.
 *
 * Data is fetched from:
 *  - GET /api/breweries/:id/stats-extended
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Eye,
  Beer as BeerIcon,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Minus,
} from "lucide-react";

interface BreweryQuickStatsProps {
  breweryId: number;
}

/* ── tiny inline sparkline (SVG, no extra library) ──────────────────────── */
function Sparkline({
  values,
  color = "#f59e0b",
  height = 28,
  width = 72,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pts = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0 opacity-80"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── trend badge ────────────────────────────────────────────────────────── */
function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  if (Math.abs(pct) < 2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/50 px-1.5 py-0.5 rounded-full">
        <Minus className="w-2.5 h-2.5" /> stabile
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        up
          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
          : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
      }`}
    >
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

export default function BreweryQuickStats({ breweryId }: BreweryQuickStatsProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: stats } = useQuery<{
    favorites: number;
    checkinsMonth: number;
    checkinsTotal: number;
    topBeersAllTime: { id: number; name: string; checkins: number; avgRating: number; imageUrl?: string }[];
    checkinSeries: { date: string; checkins: number }[];
    viewsWeek: number;
    viewsLast30: number;
    viewsSeries: { date: string; views: number }[];
  }>({
    queryKey: ["/api/breweries", String(breweryId), "stats-extended"],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/stats-extended`),
    enabled: !!breweryId,
    staleTime: 10 * 1000,        // 10 s — server cache is busted on mutations; treat data stale quickly
    refetchInterval: 10 * 1000, // poll every 10 s so an open dashboard picks up changes without a manual refresh
  });

  /* derive prev-7-day views for ↑↓ trend */
  const viewsWeek = stats?.viewsWeek ?? 0;
  const prev7Views = stats?.viewsSeries
    ? stats.viewsSeries.slice(16, 23).reduce((s, d) => s + d.views, 0)
    : 0;
  const viewsTrendPct =
    prev7Views > 0
      ? Math.round(((viewsWeek - prev7Views) / prev7Views) * 100)
      : viewsWeek > 0
      ? 100
      : null;

  const favorites = stats?.favorites ?? 0;
  const checkinsMonth = stats?.checkinsMonth ?? 0;
  const topBeer = stats?.topBeersAllTime?.[0] ?? null;
  const checkinValues = (stats?.checkinSeries ?? []).map((d) => d.checkins);
  const viewValues = (stats?.viewsSeries ?? []).map((d) => d.views);

  /* ── mobile: show a compact summary row, expand for details ── */
  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* header (always visible) */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer lg:cursor-default select-none"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          Statistiche rapide
        </h3>
        <button
          className="lg:hidden text-muted-foreground p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
          aria-label={expanded ? "Comprimi" : "Espandi"}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* body — always visible on desktop (lg+), toggle on mobile */}
      <div className={`${expanded ? "block" : "hidden"} lg:block`}>
        <div className="px-4 pb-4 space-y-3">
          {/* 4-metric grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Visite birre */}
            <div className="bg-stone-50 dark:bg-[#12151A] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <Eye className="w-3 h-3" />
                Visite (7 giorni)
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-2xl font-black text-foreground leading-none">
                  {viewsWeek.toLocaleString("it-IT")}
                </span>
                <div className="flex flex-col items-end gap-0.5 pb-0.5">
                  <TrendBadge pct={viewsTrendPct} />
                  {viewValues.length > 1 && (
                    <Sparkline values={viewValues} color="#f59e0b" width={56} height={20} />
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tot. 30 giorni: {(stats?.viewsLast30 ?? 0).toLocaleString("it-IT")}
              </p>
            </div>

            {/* Check-in del mese */}
            <div className="bg-stone-50 dark:bg-[#12151A] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <BeerIcon className="w-3 h-3" />
                Check-in (30 gg)
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-2xl font-black text-foreground leading-none">
                  {checkinsMonth.toLocaleString("it-IT")}
                </span>
                {checkinValues.length > 1 && (
                  <Sparkline values={checkinValues} color="#8b5cf6" width={56} height={20} />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tot. sempre: {(stats?.checkinsTotal ?? 0).toLocaleString("it-IT")}
              </p>
            </div>

            {/* Preferiti */}
            <div className="bg-stone-50 dark:bg-[#12151A] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <Heart className="w-3 h-3" />
                Preferiti
              </div>
              <span className="text-2xl font-black text-foreground leading-none block">
                {favorites.toLocaleString("it-IT")}
              </span>
              <p className="text-[10px] text-muted-foreground">
                Utenti che hanno salvato il birrificio
              </p>
            </div>

            {/* Top beer */}
            <div className="bg-stone-50 dark:bg-[#12151A] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                <Star className="w-3 h-3" />
                Birra top
              </div>
              {topBeer ? (
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                    {topBeer.name}
                  </p>
                  <p className="text-[10px] font-semibold text-primary">
                    {topBeer.checkins} check-in
                    {topBeer.avgRating > 0 && (
                      <> · ★ {Number(topBeer.avgRating).toFixed(1)}</>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">
                  Ancora nessun check-in registrato
                </p>
              )}
            </div>
          </div>

          {/* 30-day full-width sparkline for check-ins */}
          {checkinValues.length > 1 && checkinValues.some((v) => v > 0) && (
            <div className="rounded-xl bg-stone-50 dark:bg-[#12151A] px-3 pt-2.5 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Check-in ultimi 30 giorni
              </p>
              <Sparkline
                values={checkinValues}
                color="#8b5cf6"
                width={500}
                height={36}
              />
            </div>
          )}
        </div>
      </div>

      {/* mobile collapsed preview */}
      {!expanded && (
        <div className="lg:hidden px-4 pb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <strong className="text-foreground">{viewsWeek}</strong> visite
            </span>
            <span className="flex items-center gap-1">
              <BeerIcon className="w-3.5 h-3.5 text-primary" />
              <strong className="text-foreground">{checkinsMonth}</strong> check-in
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-primary" />
              <strong className="text-foreground">{favorites}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
