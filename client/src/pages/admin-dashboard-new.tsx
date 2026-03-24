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
  PlusCircle,
  CreditCard
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-orange-100 dark:border-[hsl(25,12%,20%)] hover:bg-orange-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        <div className="bg-primary rounded-2xl p-8 text-white relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <Crown className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Centro di Controllo Admin</h1>
                <p className="text-white/90 text-lg">
                  Benvenuto {(user as any)?.nickname || (user as any)?.firstName || 'Admin'} — Gestione completa sistema Fermenta.to
                </p>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <Badge className="bg-white/20 border-white/30 text-white">
                    {adminStats?.totalBeers?.toLocaleString() || globalStats?.totalBeers?.toLocaleString() || '...'} birre
                  </Badge>
                  <Badge className="bg-white/20 border-white/30 text-white">
                    {adminStats?.totalBreweries?.toLocaleString() || globalStats?.totalBreweries?.toLocaleString() || '...'} birrifici
                  </Badge>
                  <Badge className="bg-white/20 border-white/30 text-white">
                    {adminStats?.totalPubs?.toLocaleString() || '...'} pub
                  </Badge>
                  <Badge className="bg-white/20 border-white/30 text-white">
                    {adminStats?.totalUsers?.toLocaleString() || '...'} utenti
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/analytics">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-blue-600 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                      <h3 className="text-lg font-semibold text-foreground">Analytics</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Statistiche dettagliate e insights
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/content">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-primary group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Gestione Contenuti</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Birre, birrifici e pub
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/moderation">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-8 h-8 text-orange-500" />
                      <h3 className="text-lg font-semibold text-foreground">Moderazione</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Recensioni e segnalazioni
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/suggestions">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-amber-500 group relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Lightbulb className="w-8 h-8 text-amber-500" />
                      <h3 className="text-lg font-semibold text-foreground">Suggerimenti</h3>
                      {suggestionsPendingCount && suggestionsPendingCount.count > 0 && (
                        <Badge className="bg-amber-500 text-white animate-pulse">
                          {suggestionsPendingCount.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Modifiche proposte dagli utenti
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/addition-requests">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-emerald-600 group relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <PlusCircle className="w-8 h-8 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-foreground">Aggiunte</h3>
                      {additionsPendingCount && additionsPendingCount.count > 0 && (
                        <Badge className="bg-emerald-600 text-white animate-pulse">
                          {additionsPendingCount.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Birre e birrifici proposti dagli utenti
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-8 h-8 text-purple-500" />
                      <h3 className="text-lg font-semibold text-foreground">Utenti</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gestione community
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/publican-requests">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-primary group relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Richieste</h3>
                      {pendingCount && pendingCount.count > 0 && (
                        <Badge className="bg-red-500 text-white animate-pulse">
                          {pendingCount.count} pub
                        </Badge>
                      )}
                      {breweryPendingCount && breweryPendingCount.count > 0 && (
                        <Badge className="bg-primary text-white animate-pulse">
                          {breweryPendingCount.count} birrifici
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nuove registrazioni
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pages">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-teal-500 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-8 h-8 text-teal-500" />
                      <h3 className="text-lg font-semibold text-foreground">Pagine del sito</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Contatti, Chi Siamo, Prezzi, Supporto
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-teal-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/subscriptions">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-emerald-600 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-8 h-8 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-foreground">Abbonamenti Pub</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scadenze, prove gratuite e regali
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/festivals">
            <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-primary group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarDays className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Festival</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gestione festival, taplist e iscrizioni
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="w-5 h-5 text-emerald-600" />
                Stato Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50/40 dark:bg-orange-950/10 border border-orange-50 dark:border-[hsl(25,12%,16%)]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-600 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-foreground">Database</p>
                    <p className="text-sm text-muted-foreground">
                      {(adminStats?.totalBeers || globalStats?.totalBeers || 0).toLocaleString()} birre
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">
                  Online
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50/40 dark:bg-orange-950/10 border border-orange-50 dark:border-[hsl(25,12%,16%)]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-foreground">API</p>
                    <p className="text-sm text-muted-foreground">Risposte in tempo reale</p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/20">
                  Attivo
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50/40 dark:bg-orange-950/10 border border-orange-50 dark:border-[hsl(25,12%,16%)]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">WebPush attivo</p>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/20">
                  Attivo
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Statistiche Live
                </div>
                {adminStats?.lastUpdated && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {formatDistanceToNow(new Date(adminStats.lastUpdated), { addSuffix: true, locale: it })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { icon: Beer, label: 'Birre', value: adminStats?.totalBeers || globalStats?.totalBeers || 0, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/10' },
                { icon: Building2, label: 'Birrifici', value: adminStats?.totalBreweries || globalStats?.totalBreweries || 0, color: 'text-primary', bgColor: 'bg-orange-50 dark:bg-orange-950/10' },
                { icon: Store, label: 'Pub', value: adminStats?.totalPubs || 0, color: 'text-primary', bgColor: 'bg-orange-50 dark:bg-orange-950/10' },
                { icon: Users, label: 'Utenti', value: adminStats?.totalUsers || 0, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/10' },
                { icon: Star, label: 'Recensioni', value: adminStats?.totalReviews || 0, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/10' },
                { icon: CalendarDays, label: 'Eventi', value: adminStats?.totalEvents || 0, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/10' },
              ].map(({ icon: Icon, label, value, color, bgColor }) => (
                <div key={label} className={`flex items-center justify-between p-3 rounded-xl ${bgColor} border border-orange-50/50 dark:border-[hsl(25,12%,16%)]/50`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="font-medium text-foreground">{label}</span>
                  </div>
                  <span className={`text-xl font-bold ${color}`}>
                    {value.toLocaleString('it-IT')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Translation Tool */}
        <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Languages className="w-5 h-5 text-teal-500" />
              Traduzione Automatica Descrizioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Traduci le descrizioni delle birre in italiano in lotti da 10 alla volta (via Gemini AI).
                Supporta qualsiasi lingua (inglese, danese, tedesco, ecc.). Le descrizioni già in italiano vengono saltate automaticamente.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => translateMutation.mutate(translateOffset)}
                  disabled={translateMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl"
                >
                  {translateMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Traduzione in corso...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Avvia traduzione (Offset: {translateOffset})
                    </div>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setTranslateOffset(prev => prev + 10)}
                  className="border-orange-100 dark:border-[hsl(25,12%,20%)] hover:bg-orange-50 rounded-xl"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Salta 10
                </Button>

                {translateResult && (
                  <Badge className="bg-emerald-50 text-emerald-700 py-1.5 px-3">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    {translateResult.translated} tradotte, {translateResult.skipped} saltate
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="w-5 h-5 text-primary" />
                Attività Recente
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {[
                    { key: 'all', label: 'Tutto' },
                    { key: 'user', label: 'Utenti' },
                    { key: 'review', label: 'Recensioni' },
                    { key: 'pub', label: 'Pub' },
                    { key: 'brewery', label: 'Birrifici' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActivityFilter(key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        activityFilter === key
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-orange-100 dark:border-[hsl(25,12%,20%)] text-muted-foreground hover:bg-orange-50/60"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activityError ? (
              <p className="text-center text-red-500 py-6">Errore nel caricamento attività</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nessuna attività recente</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-colors border border-transparent hover:border-orange-50/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.icon === 'user' ? 'bg-purple-100 text-purple-700' :
                      item.icon === 'pub' ? 'bg-orange-50 text-primary' :
                      item.icon === 'brewery' ? 'bg-blue-50 text-blue-700' :
                      item.icon === 'review' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.icon === 'user' ? <UserPlus className="w-4 h-4" /> :
                       item.icon === 'pub' ? <MapPin className="w-4 h-4" /> :
                       item.icon === 'brewery' ? <Building2 className="w-4 h-4" /> :
                       item.icon === 'review' ? <Star className="w-4 h-4" /> :
                       item.icon === 'event' ? <CalendarDays className="w-4 h-4" /> :
                       <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                      <p className="text-sm text-muted-foreground font-semibold truncate">{item.name}{item.detail ? <span className="font-normal text-muted-foreground/70"> · {item.detail}</span> : null}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.time && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: it })}
                        </span>
                      )}
                      {item.link && (
                        <Link href={item.link}>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-orange-50/60">
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
    </div>
  );
}
