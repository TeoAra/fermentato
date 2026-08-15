import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Beer as BeerIcon, MapPin } from "lucide-react";

/**
 * ProfileStats — richer overview stats for the self-profile page.
 * Uses existing endpoints only (beer-tastings + cellar + wishlist) and
 * computes distributions / counts client-side. All cache keys are
 * JSON-array serialized and custom queryFns use `r.ok` checks.
 */
export default function ProfileStats({
  tastings,
  isAuthenticated,
}: {
  tastings: any[];
  isAuthenticated: boolean;
}) {
  const { data: cellar = [] } = useQuery<any[]>({
    queryKey: ["/api/user/cellar"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  const { data: wishlist = [] } = useQuery<any[]>({
    queryKey: ["/api/user/wishlist"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  const cellarCount = Array.isArray(cellar) ? cellar.length : 0;
  const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;

  const {
    ratingDistribution,
    totalRated,
    avgRating,
    topStyles,
    venueCount,
  } = useMemo(() => {
    const rated = (tastings || []).filter((t: any) => t.rating != null && !isNaN(parseFloat(String(t.rating))));
    // Rating distribution 1..5 (rounded)
    const dist = [0, 0, 0, 0, 0]; // index 0 => 1 star
    let sum = 0;
    for (const t of rated) {
      const r = parseFloat(String(t.rating));
      sum += r;
      const bucket = Math.min(5, Math.max(1, Math.round(r)));
      dist[bucket - 1] += 1;
    }
    // Top styles
    const styleCounts: Record<string, number> = {};
    for (const t of tastings || []) {
      const style = t.beer?.style || t.beerStyle;
      if (style) styleCounts[style] = (styleCounts[style] || 0) + 1;
    }
    const top = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    // Distinct venues visited (pub check-ins)
    const venues = new Set<number | string>();
    for (const t of tastings || []) {
      if (t.pubId) venues.add(t.pubId);
    }
    return {
      ratingDistribution: dist,
      totalRated: rated.length,
      avgRating: rated.length ? sum / rated.length : 0,
      topStyles: top,
      venueCount: venues.size,
    };
  }, [tastings]);

  const maxStyleCount = topStyles.length ? topStyles[0][1] : 0;

  return (
    <div className="space-y-4">
      {/* Compact counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Cantina", value: cellarCount, emoji: "🍷" },
          { label: "Wishlist", value: wishlistCount, emoji: "❤️" },
          { label: "Locali visitati", value: venueCount, emoji: "📍" },
        ].map(({ label, value, emoji }) => (
          <Card
            key={label}
            className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06]"
          >
            <CardContent className="p-3 text-center">
              <div className="text-lg">{emoji}</div>
              <div className="text-xl font-extrabold text-foreground dark:text-white leading-tight">{value}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rating distribution */}
      {totalRated > 0 && (
        <Card className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Distribuzione voti
              </h3>
              <span className="text-xs text-muted-foreground">
                Media <strong className="text-foreground dark:text-white">{avgRating.toFixed(1)}</strong> · {totalRated} voti
              </span>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingDistribution[stars - 1];
                const pct = totalRated ? Math.round((count / totalRated) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 w-8 text-xs text-muted-foreground tabular-nums justify-end">
                      {stars}
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    </span>
                    <div className="flex-1 h-2.5 bg-stone-200 dark:bg-[#12151A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-stone-400 tabular-nums text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top styles bevuti */}
      {topStyles.length > 0 && (
        <Card className="border-0 shadow-md bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06]">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2 text-sm mb-3">
              <BeerIcon className="w-4 h-4 text-amber-500" />
              Stili più bevuti
            </h3>
            <div className="space-y-2">
              {topStyles.map(([style, count]) => {
                const pct = maxStyleCount ? Math.round((count / maxStyleCount) * 100) : 0;
                return (
                  <div key={style} className="flex items-center gap-2">
                    <span className="w-28 sm:w-36 text-xs text-foreground dark:text-stone-200 truncate">{style}</span>
                    <div className="flex-1 h-2.5 bg-stone-200 dark:bg-[#12151A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-xs text-stone-400 tabular-nums text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
