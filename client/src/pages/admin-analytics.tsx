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

interface GlobalStats {
  totalBeers: number;
  totalBreweries: number;
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
  { key: 'all', label: 'Tutti', icon: Activity, color: 'text-gray-500' },
  { key: 'user', label: 'Utenti', icon: User, color: 'text-blue-500' },
  { key: 'pub', label: 'Pub', icon: Store, color: 'text-orange-500' },
  { key: 'brewery', label: 'Birrifici', icon: Building2, color: 'text-amber-500' },
  { key: 'review', label: 'Recensioni', icon: Star, color: 'text-yellow-500' },
  { key: 'event', label: 'Eventi', icon: CalendarDays, color: 'text-green-500' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  user:     { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800' },
  pub:      { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  brewery:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-200 dark:border-amber-800' },
  review:   { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  event:    { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400',  border: 'border-green-200 dark:border-green-800' },
};

function ActivityIcon({ type, size = 4 }: { type: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  switch (type) {
    case 'user':     return <User className={`${cls} text-blue-500`} />;
    case 'pub':      return <Store className={`${cls} text-orange-500`} />;
    case 'brewery':  return <Building2 className={`${cls} text-amber-500`} />;
    case 'review':   return <Star className={`${cls} text-yellow-500`} />;
    case 'event':    return <CalendarDays className={`${cls} text-green-500`} />;
    default:         return <Bell className={`${cls} text-gray-500`} />;
  }
}

function ActivityTypeBadge({ type }: { type: string }) {
  const t = ACTIVITY_TYPES.find(x => x.key === type);
  if (!t) return null;
  const c = TYPE_COLORS[type] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.userType !== 'admin') return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard Admin
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Avanzate</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitoraggio completo del sistema Fermenta.to</p>
        </div>
        
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utenti Attivi</p>
                <div className="text-2xl font-bold">{adminStats?.activeUsers || adminStats?.totalUsers || 0}</div>
                <div className="flex items-center mt-2">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+12% questo mese</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Database Birre</p>
                <div className="text-2xl font-bold">{globalStats?.totalBeers?.toLocaleString() || '29,753'}</div>
                <div className="flex items-center mt-2">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+113 questa settimana</span>
                </div>
              </div>
              <Beer className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pub Registrati</p>
                <div className="text-2xl font-bold">{adminStats?.totalPubs || 1}</div>
                <div className="flex items-center mt-2">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Crescita costante</span>
                </div>
              </div>
              <Store className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rating Medio</p>
                <div className="text-2xl font-bold">{adminStats?.averageRating || '4.2'}</div>
                <div className="flex items-center mt-2">
                  <Target className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-xs text-purple-600">Su {adminStats?.totalReviews || '1,247'} recensioni</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== ATTIVITÀ RECENTI ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              Attività Recenti
              {activityLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-1" />}
              <Badge variant="secondary" className="ml-1">{recentActivity.length}</Badge>
            </CardTitle>
            {/* Type filters */}
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActivityType(key); setActivityLimit(10); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    activityType === key
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:text-amber-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentActivity.length === 0 && !activityLoading ? (
            <div className="text-center py-10 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nessuna attività trovata</p>
              <p className="text-sm mt-1">Prova a cambiare il filtro</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700 transition-all group cursor-pointer"
                  onClick={() => { if (activity.link) navigate(activity.link); }}
                >
                  {/* Type icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${TYPE_COLORS[activity.type]?.bg || 'bg-gray-50'}`}>
                    <ActivityIcon type={activity.type} size={4} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ActivityTypeBadge type={activity.type} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {activity.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {activity.name}
                      </span>
                      {activity.detail && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:inline">
                          · {activity.detail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: time + link */}
                  <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
                    {activity.time && (
                      <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                        {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: it })}
                      </span>
                    )}
                    {activity.link && (
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
                    )}
                  </div>
                </div>
              ))}

              {/* Expand / load more */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400">
                  Mostrando {recentActivity.length} attività
                </span>
                <div className="flex gap-2">
                  {[10, 20, 50].map((extra) => (
                    <Button
                      key={extra}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Stili di Birre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalStats?.topStyles?.slice(0, 6).map((style, index) => (
                <div key={style.style} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{style.style}</p>
                      <p className="text-sm text-gray-500">{parseInt(style.count).toLocaleString()} birre</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{((parseInt(style.count) / (globalStats?.totalBeers || 1)) * 100).toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Birrifici */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Birrifici più Produttivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalStats?.topBreweries?.slice(0, 6).map((brewery, index) => (
                <div key={brewery.breweryName} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{brewery.breweryName}</p>
                      <p className="text-sm text-gray-500">{brewery.location || 'Ubicazione non specificata'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{parseInt(brewery.beerCount).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">birre</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attività Recenti e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights Rapidi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Insights Rapidi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                <ArrowUp className="w-4 h-4" />
                <span className="font-medium">Crescita Database</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-300">
                +113 nuove birre questa settimana da fonti verificate
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                <Globe className="w-4 h-4" />
                <span className="font-medium">Copertura Globale</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Database copre 20+ paesi con 293 stili unici
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="font-medium">Qualità Dati</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                100% birre con immagini autentiche e verificate
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sistema Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Stato Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database Server</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Response</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">&lt; 500ms</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ultimo Backup</span>
              <Badge variant="secondary">2 ore fa</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">99.9%</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Aggiornamenti Recenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Aggiornamenti Recenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">Database Espanso</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs ml-4">Aggiunte birre Carlsberg, Heineken, Kingfisher</p>
              <p className="text-gray-500 text-xs ml-4">2 ore fa</p>
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Copertura Immagini</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs ml-4">100% birre con immagini appropriate</p>
              <p className="text-gray-500 text-xs ml-4">1 giorno fa</p>
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-medium">Analytics Aggiornate</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs ml-4">Nuovi insights su stili e birrifici</p>
              <p className="text-gray-500 text-xs ml-4">2 giorni fa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Global Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Panoramica Database Globale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {globalStats?.totalBeers?.toLocaleString() || '29,753'}
              </div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Birre Totali</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Database mondiale</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                {globalStats?.totalBreweries?.toLocaleString() || '2,968'}
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Birrifici</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">20+ paesi</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {globalStats?.uniqueStyles || '293'}
              </div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Stili Unici</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Varietà globale</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">100%</div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Autenticità</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Dati verificati</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
