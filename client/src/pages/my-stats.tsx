import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { BarChart3, Award, Flame, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";

const FORMAT_LABELS: Record<string, string> = {
  spina: "Alla spina", bottiglia: "Bottiglia", lattina: "Lattina", growler: "Growler",
};

const BADGE_DEFS = [
  { key: "primo_sorso", icon: "🍺", name: "Primo Sorso", description: "Primo assaggio" },
  { key: "esploratore", icon: "🧭", name: "Esploratore", description: "10 assaggi" },
  { key: "degustatore", icon: "🎓", name: "Degustatore", description: "25 assaggi" },
  { key: "sommelier", icon: "🏆", name: "Sommelier", description: "50 assaggi" },
  { key: "guru", icon: "⭐", name: "Guru della Birra", description: "100 assaggi" },
  { key: "critico", icon: "✍️", name: "Critico", description: "10 note scritte" },
  { key: "fotografo", icon: "📸", name: "Fotografo", description: "Prima foto" },
  { key: "cacciatore_stili", icon: "🎯", name: "Cacciatore di Stili", description: "5 stili diversi" },
  { key: "globe_trotter", icon: "🌍", name: "Globe Trotter", description: "10 stili diversi" },
  { key: "perfezionista", icon: "💎", name: "Perfezionista", description: "Voto 5.0 dato" },
  { key: "sociale", icon: "👥", name: "Sociale", description: "5 amici seguiti" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 font-poppins">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-primary mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MyStats() {
  const { isAuthenticated } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: badges = [], isLoading: badgesLoading } = useQuery<any[]>({
    queryKey: ["/api/user/badges"],
    enabled: isAuthenticated,
  });

  const { data: recs, isLoading: recsLoading } = useQuery<any>({
    queryKey: ["/api/user/recommendations"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <BarChart3 className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per vedere le tue statistiche</p>
          <Link href="/auth"><Button className="bg-primary text-white">Accedi</Button></Link>
        </div>
      </div>
    );
  }

  const earnedBadges = badges.filter((b: any) => b.earned);
  const totalFormat = (stats?.formatBreakdown ?? []).reduce((s: number, f: any) => s + parseInt(f.cnt), 0);

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] pb-24">
      <Helmet><title>Le mie statistiche | Fermenta.to</title></Helmet>

      <div className="bg-white dark:bg-[hsl(220,5%,18%)] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">Le mie statistiche</h1>
        <p className="text-sm text-stone-500 mt-0.5">Il tuo profilo brassicolo</p>
      </div>

      <div className="p-4 space-y-5">

        {/* Summary cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Assaggi totali" value={stats?.total ?? 0} />
            <StatCard label="Voto medio" value={stats?.avgRating ? `${stats.avgRating}/5` : "—"} />
            <StatCard
              label="Streak attuale"
              value={stats?.currentStreak ?? 0}
              sub={stats?.currentStreak > 0 ? "giorni consecutivi 🔥" : "Inizia oggi!"}
            />
            <StatCard label="Stili esplorati" value={stats?.topStyles?.length ?? 0} />
          </div>
        )}

        {/* Top styles */}
        {!statsLoading && stats?.topStyles?.length > 0 && (
          <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Stili preferiti
              </h2>
            </div>
            <div className="divide-y divide-stone-50 dark:divide-[hsl(220,5%,22%)]">
              {stats.topStyles.map((s: any, i: number) => (
                <div key={s.style} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{s.style}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-stone-100 dark:bg-[hsl(220,5%,25%)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (parseInt(s.cnt) / (stats?.topStyles[0]?.cnt ?? 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-400">{s.cnt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Format breakdown */}
        {!statsLoading && stats?.formatBreakdown?.length > 0 && (
          <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins">Formato preferito</h2>
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {stats.formatBreakdown.map((f: any) => (
                <div key={f.format} className="flex items-center gap-2 bg-stone-50 dark:bg-[hsl(220,5%,22%)] rounded-xl px-3 py-1.5">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{FORMAT_LABELS[f.format] ?? f.format}</span>
                  <span className="text-xs text-stone-400">{Math.round((parseInt(f.cnt) / totalFormat) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top breweries */}
        {!statsLoading && stats?.topBreweries?.length > 0 && (
          <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Birrifici preferiti
              </h2>
            </div>
            <div className="divide-y divide-stone-50 dark:divide-[hsl(220,5%,22%)]">
              {stats.topBreweries.map((br: any, i: number) => (
                <div key={br.name} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs text-stone-400 w-4 text-right">{i + 1}</span>
                  {br.logo_url ? (
                    <img src={br.logo_url} alt={br.name} className="w-8 h-8 object-contain rounded-lg bg-stone-50 dark:bg-[hsl(220,5%,22%)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[hsl(220,5%,22%)]" />
                  )}
                  <p className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200">{br.name}</p>
                  <span className="text-xs text-stone-400">{br.cnt} birre</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Badge
            </h2>
            <span className="text-xs text-stone-400">{earnedBadges.length}/{BADGE_DEFS.length}</span>
          </div>
          {badgesLoading ? (
            <div className="px-4 pb-4">
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <div className="px-4 pb-4 grid grid-cols-4 gap-2">
              {(badges.length > 0 ? badges : BADGE_DEFS.map(b => ({ ...b, earned: false }))).map((badge: any) => (
                <div
                  key={badge.key}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${badge.earned ? "opacity-100" : "opacity-25 grayscale"}`}
                  title={badge.description}
                >
                  <span className="text-2xl leading-none">{badge.icon}</span>
                  <span className="text-[9px] font-medium text-stone-600 dark:text-stone-400 leading-tight line-clamp-2">{badge.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Sommelier recommendations */}
        {!recsLoading && recs?.recommendations?.length > 0 && (
          <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins flex items-center gap-2">
                🤖 Sommelier AI
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">{recs.reason}</p>
            </div>
            <div className="px-4 pb-4 flex gap-3 overflow-x-auto scrollbar-hide">
              {recs.recommendations.slice(0, 6).map((beer: any) => (
                <Link key={beer.id} href={`/beer/${beer.id}`} className="flex-shrink-0 w-32">
                  <div className="aspect-square rounded-xl overflow-hidden bg-stone-50 dark:bg-[hsl(220,5%,22%)] mb-2">
                    {beer.image_url ? (
                      <img src={beer.image_url} alt={beer.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">🍺</div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-tight line-clamp-2">{beer.name}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{beer.brewery_name}</p>
                  {beer.avg_rating && (
                    <p className="text-[10px] text-primary font-bold mt-0.5">★ {parseFloat(beer.avg_rating).toFixed(1)}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top beers */}
        {!statsLoading && stats?.topBeers?.length > 0 && (
          <div className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold text-sm text-stone-700 dark:text-stone-300 font-poppins flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" /> Le mie preferite
              </h2>
            </div>
            <div className="divide-y divide-stone-50 dark:divide-[hsl(220,5%,22%)]">
              {stats.topBeers.slice(0, 5).map((beer: any, i: number) => (
                <Link key={beer.id} href={`/beer/${beer.id}`} className="px-4 py-3 flex items-center gap-3 active:bg-stone-50 dark:active:bg-[hsl(220,5%,22%)]">
                  <span className="text-xs text-stone-400 w-4 text-right">{i + 1}</span>
                  {beer.image_url ? (
                    <img src={beer.image_url} alt={beer.name} className="w-10 h-10 object-contain rounded-xl bg-stone-50 dark:bg-[hsl(220,5%,22%)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-[hsl(220,5%,22%)] flex items-center justify-center text-stone-300 text-lg">🍺</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{beer.name}</p>
                    <p className="text-xs text-stone-400">{beer.style}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{parseFloat(beer.rating).toFixed(1)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
