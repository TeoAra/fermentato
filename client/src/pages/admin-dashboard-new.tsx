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
  CreditCard,
  Megaphone
} from "lucide-react";
import { Link } from "wouter";
import { DashboardContainer, DashboardHero, DashboardNavCard, StatsGrid } from "@/components/dashboard-primitives";
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
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Caricamento dashboard amministrativa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) {
    return null;
  }


  const adminName = (user as any)?.nickname || (user as any)?.firstName || 'Admin';
  return (
    <DashboardContainer size="wide">
        <div className="flex items-center justify-between gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-xl" aria-label="Torna alla home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        <DashboardHero
          variant="primary"
          icon={Crown}
          title="Centro di Controllo Admin"
          subtitle={<>Benvenuto <b>{adminName}</b> — Gestione completa Fermenta.to</>}
          badges={[
            { label: `${(adminStats?.totalBeers ?? globalStats?.totalBeers ?? 0).toLocaleString()} birre` },
            { label: `${(adminStats?.totalBreweries ?? globalStats?.totalBreweries ?? 0).toLocaleString()} birrifici` },
            { label: `${(adminStats?.totalPubs ?? 0).toLocaleString()} pub` },
            { label: `${(adminStats?.totalUsers ?? 0).toLocaleString()} utenti` },
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <DashboardNavCard href="/admin/analytics" icon={BarChart3} title="Analytics" description="Statistiche e insights" accent="blue" />
          <DashboardNavCard href="/admin/content" icon={Database} title="Gestione Contenuti" description="Birre, birrifici e pub" accent="primary" />
          <DashboardNavCard href="/admin/moderation" icon={Shield} title="Moderazione" description="Recensioni e segnalazioni" accent="amber" />
          <DashboardNavCard href="/admin/suggestions" icon={Lightbulb} title="Suggerimenti" description="Modifiche proposte dagli utenti" accent="amber" badge={suggestionsPendingCount?.count} />
          <DashboardNavCard href="/admin/addition-requests" icon={PlusCircle} title="Aggiunte" description="Birre e birrifici proposti" accent="emerald" badge={additionsPendingCount?.count} />
          <DashboardNavCard href="/admin/users" icon={Users} title="Utenti" description="Gestione community" accent="purple" />
          <DashboardNavCard href="/admin/publican-requests" icon={FileText} title="Richieste" description="Pub e birrifici da approvare" accent="red" badge={(pendingCount?.count ?? 0) + (breweryPendingCount?.count ?? 0) || undefined} />
          <DashboardNavCard href="/admin/pages" icon={FileText} title="Pagine del sito" description="Contatti, Chi siamo, Prezzi" accent="stone" />
          <DashboardNavCard href="/admin/subscriptions" icon={CreditCard} title="Abbonamenti Pub" description="Scadenze, trial e regali" accent="emerald" />
          <DashboardNavCard href="/admin/festivals" icon={CalendarDays} title="Festival" description="Taplist e iscrizioni" accent="primary" />
          <DashboardNavCard href="/admin/broadcast" icon={Megaphone} title="Push & News" description="Notifiche broadcast e RSS" accent="primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="w-5 h-5 text-emerald-600" />
                Stato Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/40 dark:bg-[#15202B]/10 border border-stone-100 dark:border-border">
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

              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/40 dark:bg-[#15202B]/10 border border-stone-100 dark:border-border">
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

              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50/40 dark:bg-[#15202B]/10 border border-stone-100 dark:border-border">
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

          <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
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
                { icon: Building2, label: 'Birrifici', value: adminStats?.totalBreweries || globalStats?.totalBreweries || 0, color: 'text-primary', bgColor: 'bg-stone-50 dark:bg-[#15202B]/10' },
                { icon: Store, label: 'Pub', value: adminStats?.totalPubs || 0, color: 'text-primary', bgColor: 'bg-stone-50 dark:bg-[#15202B]/10' },
                { icon: Users, label: 'Utenti', value: adminStats?.totalUsers || 0, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/10' },
                { icon: Star, label: 'Recensioni', value: adminStats?.totalReviews || 0, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/10' },
                { icon: CalendarDays, label: 'Eventi', value: adminStats?.totalEvents || 0, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/10' },
              ].map(({ icon: Icon, label, value, color, bgColor }) => (
                <div key={label} className={`flex items-center justify-between p-3 rounded-xl ${bgColor} border border-stone-100/50 dark:border-border/50`}>
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
        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
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
                  className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl"
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

        <Card className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm">
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
                          : "border-stone-200 dark:border-border text-muted-foreground hover:bg-stone-50/60"
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
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50/30 dark:hover:bg-stone-900/10 transition-colors border border-transparent hover:border-stone-100/50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.icon === 'user' ? 'bg-purple-100 text-purple-700' :
                      item.icon === 'pub' ? 'bg-stone-50 text-primary' :
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
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-stone-50/60">
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
    </DashboardContainer>
  );
}
