import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Beer, 
  Store, 
  Globe,
  Calendar,
  Target,
  Activity,
  ArrowUp,
  ArrowLeft,
  User,
  Building2,
  MapPin,
  Star,
  CalendarDays,
  Bell,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { PageContainer } from "@/components/layout/page-container";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

interface GlobalStats {
  totalBeers: number;
  totalBreweries: number;
  totalPubs: number;
  totalReviews: number;
  totalEvents: number;
  uniqueStyles: number;
  topStyles: Array<{ style: string; count: string }>;
  topBreweries: Array<{ breweryName: string; location: string; beerCount: string }>;
  lastUpdated: string;
}

interface AdminStats {
  totalUsers: number;
  totalPubs: number;
  totalBreweries: number;
  totalBeers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  averageRating: number;
  totalReviews: number;
  totalTastings: number;
  totalEvents: number;
  totalFestivals: number;
  pendingPubRequests: number;
  pendingBreweryRequests: number;
}

interface GrowthPoint {
  month: string;
  users: number;
  pubs: number;
  breweries: number;
  beers: number;
  newUsers: number;
  newPubs: number;
  newBeers: number;
}

interface PopularBeer {
  id: number;
  name: string;
  brewery: string;
  style: string;
  avgRating: number;
  reviewCount: number;
  availableAt: number;
}

interface RecentActivity {
  type: string;
  action: string;
  name: string;
  detail?: string;
  time: string;
  icon: string;
  link?: string;
  itemId?: number;
}

const ACTIVITY_TYPES = [
  { key: 'all', label: 'Tutti', icon: Activity, color: 'text-muted-foreground' },
  { key: 'user', label: 'Utenti', icon: User, color: 'text-blue-500' },
  { key: 'pub', label: 'Pub', icon: Store, color: 'text-primary' },
  { key: 'brewery', label: 'Birrifici', icon: Building2, color: 'text-primary' },
  { key: 'review', label: 'Recensioni', icon: Star, color: 'text-yellow-500' },
  { key: 'event', label: 'Eventi', icon: CalendarDays, color: 'text-emerald-500' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  user:     { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800' },
  pub:      { bg: 'bg-stone-50 dark:bg-stone-900/20', text: 'text-primary dark:text-orange-400', border: 'border-stone-200 dark:border-stone-700' },
  brewery:  { bg: 'bg-stone-50 dark:bg-stone-900/20',  text: 'text-primary dark:text-orange-400',  border: 'border-stone-200 dark:border-stone-700' },
  review:   { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  event:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-600 dark:text-emerald-400',  border: 'border-emerald-200 dark:border-emerald-800' },
};

function ActivityIcon({ type, size = 4 }: { type: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  switch (type) {
    case 'user':     return <User className={`${cls} text-blue-500`} />;
    case 'pub':      return <Store className={`${cls} text-primary`} />;
    case 'brewery':  return <Building2 className={`${cls} text-primary`} />;
    case 'review':   return <Star className={`${cls} text-yellow-500`} />;
    case 'event':    return <CalendarDays className={`${cls} text-emerald-500`} />;
    default:         return <Bell className={`${cls} text-muted-foreground`} />;
  }
}

function ActivityTypeBadge({ type }: { type: string }) {
  const t = ACTIVITY_TYPES.find(x => x.key === type);
  if (!t) return null;
  const c = TYPE_COLORS[type] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <ActivityIcon type={type} size={3} />
      {t.label}
    </span>
  );
}

export default function AdminAnalytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const [activityType, setActivityType] = useState<string>('all');
  const [activityLimit, setActivityLimit] = useState<number>(10);

  const { data: globalStats } = useQuery<GlobalStats>({
    queryKey: ["/api/stats/global"],
    enabled: isAuthenticated && (user as any)?.userType === 'admin',
  });

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && (user as any)?.userType === 'admin',
  });

  const { data: growthData = [] } = useQuery<GrowthPoint[]>({
    queryKey: ["/api/admin/analytics/growth"],
    enabled: isAuthenticated && (user as any)?.userType === 'admin',
  });

  const { data: popularBeers = [] } = useQuery<PopularBeer[]>({
    queryKey: ["/api/admin/analytics/popular-beers"],
    enabled: isAuthenticated && (user as any)?.userType === 'admin',
  });

  const { data: allActivityData = [], isFetching: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/admin/recent-activity"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/recent-activity?limit=100`, { credentials: 'include' });
      return res.json();
    },
    enabled: isAuthenticated && (user as any)?.userType === 'admin',
    staleTime: 0,
    refetchInterval: 120000,
  });

  const recentActivity = (activityType === 'all'
    ? allActivityData
    : allActivityData.filter((item: any) => item.type === activityType)
  ).slice(0, activityLimit);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Caricamento analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.userType !== 'admin') return null;

  return (
    <div className="bg-background min-h-screen">
      <PageContainer variant="wide" className="py-6 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Avanzate</h1>
            <p className="text-muted-foreground mt-1">Monitoraggio completo del sistema Fermenta.to</p>
          </div>
          
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Utenti Attivi (30g)</p>
                  <div className="text-2xl font-bold text-foreground">{(adminStats?.activeUsers ?? 0).toLocaleString()}</div>
                  <div className="flex items-center mt-2">
                    {(adminStats?.newUsersThisMonth ?? 0) > 0 ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-emerald-500 mr-1" />
                        <span className="text-xs text-emerald-600 font-medium">+{adminStats?.newUsersThisMonth} nuovi questo mese</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Su {(adminStats?.totalUsers ?? 0).toLocaleString()} totali</span>
                    )}
                  </div>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Database Birre</p>
                  <div className="text-2xl font-bold text-foreground">{globalStats?.totalBeers?.toLocaleString() || '—'}</div>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-emerald-600 font-medium">Dati in tempo reale</span>
                  </div>
                </div>
                <Beer className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pub Registrati</p>
                  <div className="text-2xl font-bold text-foreground">{(adminStats?.totalPubs ?? 0).toLocaleString()}</div>
                  <div className="flex items-center mt-2">
                    {(adminStats?.pendingPubRequests ?? 0) > 0 ? (
                      <Link href="/admin/publican-requests" className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline">
                        {adminStats?.pendingPubRequests} richieste in attesa
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nessuna richiesta in attesa</span>
                    )}
                  </div>
                </div>
                <Store className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rating Medio</p>
                  <div className="text-2xl font-bold text-foreground">{adminStats?.averageRating ? adminStats.averageRating.toFixed(1) : '—'}</div>
                  <div className="flex items-center mt-2">
                    <Target className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-xs text-purple-600 font-medium">Su {(adminStats?.totalReviews || globalStats?.totalReviews || 0).toLocaleString()} recensioni</span>
                  </div>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== ATTIVITÀ RECENTI ===== */}
        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100 dark:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 font-bold text-foreground">
                <Activity className="w-5 h-5 text-primary" />
                Attività Recenti
                {activityLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />}
                <Badge variant="secondary" className="ml-1 bg-stone-50 text-primary dark:bg-stone-900/20">{recentActivity.length}</Badge>
              </CardTitle>
              {/* Type filters */}
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActivityType(key); setActivityLimit(10); }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      activityType === key
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white dark:bg-[hsl(25,14%,12%)] text-muted-foreground border-stone-200 dark:border-border hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivity.length === 0 && !activityLoading ? (
              <div className="text-center py-10 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessuna attività trovata</p>
                <p className="text-sm mt-1">Prova a cambiare il filtro</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-stone-50/30 dark:hover:bg-stone-900/10 hover:border-stone-200 dark:hover:border-[hsl(25,12%,20%)] transition-all group cursor-pointer"
                    onClick={() => { if (activity.link) navigate(activity.link); }}
                  >
                    {/* Type icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${TYPE_COLORS[activity.type]?.bg || 'bg-muted'}`}>
                      <ActivityIcon type={activity.type} size={4} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ActivityTypeBadge type={activity.type} />
                        <span className="text-sm font-medium text-foreground truncate">
                          {activity.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {activity.name}
                        </span>
                        {activity.detail && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            · {activity.detail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: time + link */}
                    <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
                      {activity.time && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                          {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: it })}
                        </span>
                      )}
                      {activity.link && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Expand / load more */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-100 dark:border-border">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {recentActivity.length} attività
                  </span>
                  <div className="flex gap-2">
                    {[10, 20, 50].map((extra) => (
                      <Button
                        key={extra}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl"
                        onClick={() => setActivityLimit(prev => prev + extra)}
                        disabled={activityLoading}
                      >
                        +{extra}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Stili Birre */}
          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
            <CardHeader className="border-b border-stone-100 dark:border-border">
              <CardTitle className="flex items-center gap-2 font-bold text-foreground">
                <BarChart3 className="w-5 h-5 text-primary" />
                Top Stili di Birre
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {globalStats?.topStyles?.slice(0, 6).map((style, index) => (
                  <div key={style.style} className="flex items-center justify-between p-3 rounded-xl bg-stone-50/30 dark:bg-stone-900/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{style.style}</p>
                        <p className="text-sm text-muted-foreground">{parseInt(style.count).toLocaleString()} birre</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white dark:bg-[hsl(25,14%,15%)] text-primary font-semibold">{((parseInt(style.count) / (globalStats?.totalBeers || 1)) * 100).toFixed(1)}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Birrifici */}
          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
            <CardHeader className="border-b border-stone-100 dark:border-border">
              <CardTitle className="flex items-center gap-2 font-bold text-foreground">
                <Globe className="w-5 h-5 text-primary" />
                Birrifici più Produttivi
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {globalStats?.topBreweries?.slice(0, 6).map((brewery, index) => (
                  <div key={brewery.breweryName} className="flex items-center justify-between p-3 rounded-xl bg-stone-50/30 dark:bg-stone-900/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{brewery.breweryName}</p>
                        <p className="text-sm text-muted-foreground">{brewery.location || 'Ubicazione non specificata'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{parseInt(brewery.beerCount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">birre</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crescita Piattaforma (real time-series) */}
        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
          <CardHeader className="border-b border-stone-100 dark:border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-bold text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Crescita ultimi 6 mesi
              </CardTitle>
              <Badge variant="secondary" className="bg-stone-50 dark:bg-stone-900/20 text-primary font-medium">Cumulato</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {growthData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                Nessun dato di crescita disponibile
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gUsers"     x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.45}/><stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gPubs"      x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(24,95%,53%)"  stopOpacity={0.45}/><stop offset="100%" stopColor="hsl(24,95%,53%)"  stopOpacity={0}/></linearGradient>
                      <linearGradient id="gBreweries" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.45}/><stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(0,0%,80%,0.2)" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(0,0%,55%)"/>
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(0,0%,55%)" allowDecimals={false}/>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid hsl(0,0%,85%)', background: 'hsl(0,0%,100%)', fontSize: 12 }}
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }}/>
                    <Area type="monotone" dataKey="users"     name="Utenti"    stroke="hsl(217,91%,60%)" strokeWidth={2} fill="url(#gUsers)"/>
                    <Area type="monotone" dataKey="pubs"      name="Pub"       stroke="hsl(24,95%,53%)"  strokeWidth={2} fill="url(#gPubs)"/>
                    <Area type="monotone" dataKey="breweries" name="Birrifici" stroke="hsl(160,84%,39%)" strokeWidth={2} fill="url(#gBreweries)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Birre più recensite */}
        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
          <CardHeader className="border-b border-stone-100 dark:border-border">
            <CardTitle className="flex items-center gap-2 font-bold text-foreground">
              <Beer className="w-5 h-5 text-primary" />
              Birre più Recensite
              <Badge variant="secondary" className="ml-1 bg-stone-50 text-primary dark:bg-stone-900/20">{popularBeers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {popularBeers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Beer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessuna recensione ancora</p>
                <p className="text-sm mt-1">Le birre più recensite appariranno qui appena gli utenti inizieranno a valutarle</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popularBeers.map((b, i) => (
                  <Link key={b.id} href={`/birre/${b.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 dark:border-border hover:border-primary/40 hover:bg-stone-50/30 dark:hover:bg-stone-900/10 transition-all cursor-pointer">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.brewery} · {b.style}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                          {b.avgRating?.toFixed(1) || '—'}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {b.reviewCount} rec · {b.availableAt} pub
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Global Overview */}
        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
          <CardHeader className="border-b border-stone-100 dark:border-border">
            <CardTitle className="flex items-center gap-2 font-bold text-foreground">
              <Globe className="w-5 h-5 text-primary" />
              Panoramica Database Globale
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-100 dark:border-blue-900/50">
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">
                  {globalStats?.totalBeers?.toLocaleString() || '—'}
                </div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Birre Totali</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 font-medium">Database mondiale</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                  {globalStats?.totalBreweries?.toLocaleString() || '—'}
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Birrifici</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-medium">Produttori censiti</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-stone-200 dark:border-stone-700/50">
                <div className="text-4xl font-black text-primary dark:text-orange-400 mb-2">
                  {globalStats?.uniqueStyles || '—'}
                </div>
                <p className="text-sm font-bold text-primary dark:text-orange-400 uppercase tracking-wider">Stili Unici</p>
                <p className="text-xs text-primary/70 dark:text-orange-400/70 mt-1 font-medium">Varietà catalogate</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-100 dark:border-purple-900/50">
                <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-2">
                  {globalStats?.totalReviews?.toLocaleString() || '—'}
                </div>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Recensioni</p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1 font-medium">Community feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
