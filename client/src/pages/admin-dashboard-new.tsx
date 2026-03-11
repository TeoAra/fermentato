import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  BarChart3, 
  Users, 
  Shield,
  Database,
  TrendingUp,
  Activity,
  ChevronRight,
  FileText,
  Beer,
  Store,
  Building2,
  ArrowLeft,
  Star,
  CalendarDays,
  RefreshCw,
  UserPlus,
  MapPin,
  Clock,
  Languages,
  Play,
  CheckCircle2,
  SkipForward,
  Lightbulb,
  PlusCircle
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface AdminStats {
  totalUsers: number;
  totalPubs: number;
  totalBreweries: number;
  totalBeers: number;
  totalReviews: number;
  totalTastings: number;
  totalEvents: number;
  lastUpdated: string;
}

interface GlobalStats {
  totalBeers: number;
  totalBreweries: number;
  uniqueStyles: number;
}


export default function AdminDashboardNew() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [translateResult, setTranslateResult] = useState<{ translated: number; skipped: number; processed: number; nextOffset: number } | null>(null);
  const [translateOffset, setTranslateOffset] = useState(0);

  const isAdminUser = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');

  const translateMutation = useMutation({
    mutationFn: async (offset: number) => {
      const res = await apiRequest(`/api/admin/translate-beers?batch=10&offset=${offset}`, { method: 'POST' });
      return res.json();
    },
    onSuccess: (data) => {
      setTranslateResult(data);
      setTranslateOffset(data.nextOffset);
    },
  });
  
  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/publican-requests/pending-count"],
    enabled: isAuthenticated && isAdminUser,
  });

  const { data: breweryPendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/brewery-requests/pending-count"],
    enabled: isAuthenticated && isAdminUser,
  });

  const { data: suggestionsPendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/suggestions/pending-count"],
    queryFn: () => fetch("/api/admin/suggestions/pending-count").then(r => r.json()),
    enabled: isAuthenticated && isAdminUser,
    refetchInterval: 30000,
  });

  const { data: additionsPendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/addition-requests/pending-count"],
    queryFn: () => fetch("/api/admin/addition-requests/pending-count").then(r => r.json()),
    enabled: isAuthenticated && isAdminUser,
    refetchInterval: 30000,
  });

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdminUser,
    refetchInterval: 120000,
  });

  const { data: globalStats } = useQuery<GlobalStats>({
    queryKey: ["/api/stats/global"],
    enabled: isAuthenticated && isAdminUser,
    refetchInterval: 120000,
  });

  const { data: allActivity = [], isError: activityError } = useQuery<any[]>({
    queryKey: ["/api/admin/recent-activity"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/recent-activity?limit=50`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isAuthenticated && isAdminUser,
    staleTime: 0,
    refetchInterval: 60000,
  });

  const recentActivity = activityFilter === 'all'
    ? allActivity.slice(0, 15)
    : allActivity.filter((item: any) => item.type === activityFilter);


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento dashboard amministrativa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) {
    return null;
  }


  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </Link>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Crown className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Centro di Controllo Admin</h1>
              <p className="text-white/90 text-lg">
                Benvenuto {(user as any)?.nickname || (user as any)?.firstName || 'Admin'} — Gestione completa sistema Fermenta.to
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <Badge className="bg-white/20 border-white/30">
                  {adminStats?.totalBeers?.toLocaleString() || globalStats?.totalBeers?.toLocaleString() || '...'} birre
                </Badge>
                <Badge className="bg-white/20 border-white/30">
                  {adminStats?.totalBreweries?.toLocaleString() || globalStats?.totalBreweries?.toLocaleString() || '...'} birrifici
                </Badge>
                <Badge className="bg-white/20 border-white/30">
                  {adminStats?.totalPubs?.toLocaleString() || '...'} pub
                </Badge>
                <Badge className="bg-white/20 border-white/30">
                  {adminStats?.totalUsers?.toLocaleString() || '...'} utenti
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/analytics">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                    <h3 className="text-lg font-semibold">Analytics</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Statistiche dettagliate e insights
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/content">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-8 h-8 text-green-500" />
                    <h3 className="text-lg font-semibold">Gestione Contenuti</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Birre, birrifici e pub
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/moderation">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-orange-500" />
                    <h3 className="text-lg font-semibold">Moderazione</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recensioni e segnalazioni
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/suggestions">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-500 group relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Lightbulb className="w-8 h-8 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Suggerimenti</h3>
                    {suggestionsPendingCount && suggestionsPendingCount.count > 0 && (
                      <Badge className="bg-yellow-500 text-white animate-pulse">
                        {suggestionsPendingCount.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Modifiche proposte dagli utenti
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/addition-requests">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500 group relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <PlusCircle className="w-8 h-8 text-green-500" />
                    <h3 className="text-lg font-semibold">Aggiunte</h3>
                    {additionsPendingCount && additionsPendingCount.count > 0 && (
                      <Badge className="bg-green-500 text-white animate-pulse">
                        {additionsPendingCount.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Birre e birrifici proposti dagli utenti
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 text-purple-500" />
                    <h3 className="text-lg font-semibold">Utenti</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestione community
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/publican-requests">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-amber-500 group relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-8 h-8 text-amber-500" />
                    <h3 className="text-lg font-semibold">Richieste</h3>
                    {pendingCount && pendingCount.count > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse">
                        {pendingCount.count} pub
                      </Badge>
                    )}
                    {breweryPendingCount && breweryPendingCount.count > 0 && (
                      <Badge className="bg-orange-500 text-white animate-pulse">
                        {breweryPendingCount.count} birrifici
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nuove registrazioni
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/pages">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-teal-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-8 h-8 text-teal-500" />
                    <h3 className="text-lg font-semibold">Pagine del sito</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Contatti, Chi Siamo, Prezzi, Supporto
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-500 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Stato Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Database</p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {(adminStats?.totalBeers || globalStats?.totalBeers || 0).toLocaleString()} birre
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Online
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">API</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Risposte in tempo reale</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Attivo
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">Push Notifications</p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">WebPush attivo</p>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Attivo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Statistiche Live
              </div>
              {adminStats?.lastUpdated && (
                <span className="text-xs text-gray-400 font-normal flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {formatDistanceToNow(new Date(adminStats.lastUpdated), { addSuffix: true, locale: it })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { icon: Beer, label: 'Birre', value: adminStats?.totalBeers || globalStats?.totalBeers || 0, from: 'from-blue-50', to: 'to-blue-100', darkFrom: 'dark:from-blue-900/20', darkTo: 'dark:to-blue-800/20', iconColor: 'text-blue-600', textColor: 'text-blue-800 dark:text-blue-200', valColor: 'text-blue-600 dark:text-blue-400' },
              { icon: Building2, label: 'Birrifici', value: adminStats?.totalBreweries || globalStats?.totalBreweries || 0, from: 'from-amber-50', to: 'to-amber-100', darkFrom: 'dark:from-amber-900/20', darkTo: 'dark:to-amber-800/20', iconColor: 'text-amber-600', textColor: 'text-amber-800 dark:text-amber-200', valColor: 'text-amber-600 dark:text-amber-400' },
              { icon: Store, label: 'Pub', value: adminStats?.totalPubs || 0, from: 'from-orange-50', to: 'to-orange-100', darkFrom: 'dark:from-orange-900/20', darkTo: 'dark:to-orange-800/20', iconColor: 'text-orange-600', textColor: 'text-orange-800 dark:text-orange-200', valColor: 'text-orange-600 dark:text-orange-400' },
              { icon: Users, label: 'Utenti', value: adminStats?.totalUsers || 0, from: 'from-purple-50', to: 'to-purple-100', darkFrom: 'dark:from-purple-900/20', darkTo: 'dark:to-purple-800/20', iconColor: 'text-purple-600', textColor: 'text-purple-800 dark:text-purple-200', valColor: 'text-purple-600 dark:text-purple-400' },
              { icon: Star, label: 'Recensioni', value: adminStats?.totalReviews || 0, from: 'from-yellow-50', to: 'to-yellow-100', darkFrom: 'dark:from-yellow-900/20', darkTo: 'dark:to-yellow-800/20', iconColor: 'text-yellow-600', textColor: 'text-yellow-800 dark:text-yellow-200', valColor: 'text-yellow-600 dark:text-yellow-400' },
              { icon: CalendarDays, label: 'Eventi', value: adminStats?.totalEvents || 0, from: 'from-green-50', to: 'to-green-100', darkFrom: 'dark:from-green-900/20', darkTo: 'dark:to-green-800/20', iconColor: 'text-green-600', textColor: 'text-green-800 dark:text-green-200', valColor: 'text-green-600 dark:text-green-400' },
            ].map(({ icon: Icon, label, value, from, to, darkFrom, darkTo, iconColor, textColor, valColor }) => (
              <div key={label} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${from} ${to} ${darkFrom} ${darkTo}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <span className={`font-medium ${textColor}`}>{label}</span>
                </div>
                <span className={`text-xl font-bold ${valColor}`}>
                  {value.toLocaleString('it-IT')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* Translation Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-teal-500" />
            Traduzione Automatica Descrizioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Traduci le descrizioni delle birre in italiano in lotti da 10 alla volta (via Gemini AI).
              Supporta qualsiasi lingua (inglese, danese, tedesco, ecc.). Le descrizioni già in italiano vengono saltate automaticamente.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => translateMutation.mutate(translateOffset)}
                disabled={translateMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {translateMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Traduzione in corso...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Traduci prossimo batch (10)</>
                )}
              </Button>
              {translateOffset > 0 && (
                <Button variant="outline" size="sm" onClick={() => { setTranslateOffset(0); setTranslateResult(null); }}>
                  <SkipForward className="w-4 h-4 mr-1" /> Reset offset
                </Button>
              )}
              {translateOffset > 0 && (
                <span className="text-sm text-gray-400">Offset corrente: {translateOffset.toLocaleString()}</span>
              )}
            </div>
            {translateResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {[
                  { label: 'Tradotte', value: translateResult.translated, icon: CheckCircle2, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                  { label: 'Saltate (già IT)', value: translateResult.skipped, icon: SkipForward, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/20' },
                  { label: 'Processate', value: translateResult.processed, icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Prossimo offset', value: translateResult.nextOffset, icon: Languages, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={`rounded-lg p-3 ${bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                    <span className={`text-xl font-bold ${color}`}>{value.toLocaleString('it-IT')}</span>
                  </div>
                ))}
              </div>
            )}
            {translateMutation.isError && (
              <p className="text-sm text-red-500">Errore durante la traduzione. Riprova tra qualche secondo.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            Attività Recente
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { key: 'all', label: 'Tutti' },
              { key: 'user', label: 'Utenti' },
              { key: 'pub', label: 'Pub' },
              { key: 'brewery', label: 'Birrifici' },
              { key: 'review', label: 'Recensioni' },
              { key: 'event', label: 'Eventi' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={activityFilter === key ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActivityFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activityError ? (
            <p className="text-center text-red-500 py-6">Errore nel caricamento attività</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-center text-gray-400 py-6">Nessuna attività recente</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.icon === 'user' ? 'bg-purple-100 dark:bg-purple-900/40' :
                    item.icon === 'pub' ? 'bg-blue-100 dark:bg-blue-900/40' :
                    item.icon === 'brewery' ? 'bg-amber-100 dark:bg-amber-900/40' :
                    item.icon === 'review' ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                    'bg-green-100 dark:bg-green-900/40'
                  }`}>
                    {item.icon === 'user' ? <UserPlus className="w-4 h-4 text-purple-500" /> :
                     item.icon === 'pub' ? <MapPin className="w-4 h-4 text-blue-500" /> :
                     item.icon === 'brewery' ? <Building2 className="w-4 h-4 text-amber-500" /> :
                     item.icon === 'review' ? <Star className="w-4 h-4 text-yellow-500" /> :
                     item.icon === 'event' ? <CalendarDays className="w-4 h-4 text-green-500" /> :
                     <Activity className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.action}</p>
                    <p className="text-sm text-gray-900 dark:text-white font-semibold truncate">{item.name}{item.detail ? <span className="font-normal text-gray-500"> · {item.detail}</span> : null}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.time && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: it })}
                      </span>
                    )}
                    {item.link && (
                      <Link href={item.link}>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-400 hover:text-gray-700">
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
