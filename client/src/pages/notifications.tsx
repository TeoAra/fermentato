import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Beer, Calendar, MapPin, Settings, AlertCircle, CheckCircle2, Trash2, CheckCheck, Loader2, ChevronDown, Factory, Store, CalendarDays, Heart, X, BellOff, ArrowRight, Moon, MessageCircle, Users, Megaphone, Flag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";
import type { Notification, NotificationPreference } from "@shared/schema";
import { subscribeToPush, unsubscribeFromPush } from "@/components/pwa-prompt";

const NOTIF_PAGE_SIZE = 20;

// Matrice categorie × canale: ogni categoria ha 2 chiavi indipendenti
// — `inAppKey` (es. tapChanges) e `pushKey` (es. tapChangesPush)
type CatInAppKey = 'tapChanges' | 'events' | 'newPubs' |
  'checkinLikes' | 'checkinComments' | 'newFollowers' |
  'breweryReplies' | 'reportUpdates' | 'adminBroadcasts';
type CatPushKey = `${CatInAppKey}Push`;
type CatEmailKey = `${CatInAppKey}Email`;
const CATEGORIES: Array<{
  inAppKey: CatInAppKey;
  pushKey: CatPushKey;
  emailKey: CatEmailKey;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
}> = [
  { inAppKey: 'tapChanges',     pushKey: 'tapChangesPush',     emailKey: 'tapChangesEmail',     label: 'Nuove birre in spina',  description: 'Quando i tuoi locali aggiornano la taplist',         icon: Beer,         iconColor: 'text-orange-600' },
  { inAppKey: 'events',         pushKey: 'eventsPush',         emailKey: 'eventsEmail',         label: 'Eventi in zona',        description: 'Degustazioni, festival e serate birrai',             icon: Calendar,     iconColor: 'text-blue-600' },
  { inAppKey: 'newPubs',        pushKey: 'newPubsPush',        emailKey: 'newPubsEmail',        label: 'Nuovi locali',          description: 'Quando aprono nuovi pub vicino a te',                icon: MapPin,       iconColor: 'text-emerald-600' },
  { inAppKey: 'checkinLikes',   pushKey: 'checkinLikesPush',   emailKey: 'checkinLikesEmail',   label: 'Like sui tuoi check-in',description: 'Quando qualcuno mette mi piace alle tue birre',      icon: Heart,        iconColor: 'text-rose-600' },
  { inAppKey: 'checkinComments',pushKey: 'checkinCommentsPush',emailKey: 'checkinCommentsEmail',label: 'Commenti ai check-in',  description: 'Risposte e commenti sotto i tuoi check-in',          icon: MessageCircle,iconColor: 'text-violet-600' },
  { inAppKey: 'newFollowers',   pushKey: 'newFollowersPush',   emailKey: 'newFollowersEmail',   label: 'Nuovi follower e amici',description: 'Quando qualcuno ti segue o fa check-in',             icon: Users,        iconColor: 'text-sky-600' },
  { inAppKey: 'breweryReplies', pushKey: 'breweryRepliesPush', emailKey: 'breweryRepliesEmail', label: 'Risposte birrificio',   description: 'Quando un birrificio risponde a te',                 icon: Factory,      iconColor: 'text-amber-600' },
  { inAppKey: 'reportUpdates',  pushKey: 'reportUpdatesPush',  emailKey: 'reportUpdatesEmail',  label: 'Esito segnalazioni',    description: 'Quando i moderatori gestiscono le tue segnalazioni', icon: Flag,         iconColor: 'text-red-500' },
  { inAppKey: 'adminBroadcasts',pushKey: 'adminBroadcastsPush',emailKey: 'adminBroadcastsEmail',label: 'Annunci Fermenta.to',   description: 'Comunicazioni ufficiali della redazione',            icon: Megaphone,    iconColor: 'text-primary' },
];

function getNotificationIcon(type: string) {
  const base = "h-5 w-5";
  switch (type) {
    case 'new_beer':
    case 'tap_change':
      return { icon: <Beer className={`${base} text-orange-600`} />, bg: 'bg-stone-50 dark:bg-[#0B0D10]/30' };
    case 'beer_removed':
      return { icon: <Beer className={`${base} text-red-500`} />, bg: 'bg-red-50 dark:bg-red-950/30' };
    case 'event':
      return { icon: <Calendar className={`${base} text-blue-600`} />, bg: 'bg-blue-50 dark:bg-blue-950/30' };
    case 'new_pub':
      return { icon: <MapPin className={`${base} text-emerald-600`} />, bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    case 'new_brewery_request':
      return { icon: <Factory className={`${base} text-amber-600`} />, bg: 'bg-amber-50 dark:bg-amber-950/30' };
    case 'new_pub_request':
      return { icon: <Store className={`${base} text-amber-600`} />, bg: 'bg-amber-50 dark:bg-amber-950/30' };
    case 'checkin_like':
      return { icon: <Heart className={`${base} text-rose-500`} />, bg: 'bg-rose-50 dark:bg-rose-950/30' };
    case 'checkin_comment':
      return { icon: <MessageCircle className={`${base} text-violet-600`} />, bg: 'bg-violet-50 dark:bg-violet-950/30' };
    case 'moderation':
      return { icon: <Flag className={`${base} text-red-500`} />, bg: 'bg-red-50 dark:bg-red-950/30' };
    case 'festival':
    case 'festival_interest':
    case 'festival_update':
      return { icon: <CalendarDays className={`${base} text-violet-600`} />, bg: 'bg-violet-50 dark:bg-violet-950/30' };
    default:
      return { icon: <Bell className={`${base} text-muted-foreground`} />, bg: 'bg-stone-100 dark:bg-[#1A1D24]' };
  }
}

// Filtri disponibili nello storico
const HISTORY_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tutte' },
  { value: 'tap_change', label: 'Spine' },
  { value: 'new_beer', label: 'Birre' },
  { value: 'event', label: 'Eventi' },
  { value: 'moderation', label: 'Segnalazioni' },
  { value: 'new_pub_request', label: 'Richieste pub' },
  { value: 'new_brewery_request', label: 'Richieste birrificio' },
];

function isIosDevice() { return /iPad|iPhone|iPod/.test(navigator.userAgent); }
function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
function isNativeCapacitorApp() {
  return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
}

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [tab, setTab] = useState<'storia' | 'preferenze'>('storia');
  const [page, setPage] = useState(0);
  const [accumulated, setAccumulated] = useState<Notification[]>([]);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [pushDiag, setPushDiag] = useState<any>(null);

  // Ascolta gli aggiornamenti diagnostici della registrazione push nativa
  useEffect(() => {
    const handler = (e: Event) => setPushDiag((e as CustomEvent).detail);
    window.addEventListener('native-push-diagnostic', handler);
    return () => window.removeEventListener('native-push-diagnostic', handler);
  }, []);

  // Su app nativa (IPA/APK) non mostriamo mai il banner "installa da Safari":
  // siamo già dentro l'app, il problema non si pone.
  const iosNotStandalone = isIosDevice() && !isStandaloneMode() && !isNativeCapacitorApp();

  // Reset paginazione quando cambia il filtro
  useEffect(() => { setPage(0); setAccumulated([]); }, [filter]);

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
    else setNotifPerm('unsupported');
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per vedere le notifiche.", variant: "destructive" });
      setTimeout(() => { setLocation('/login'); }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const { data: pushStatus, refetch: refetchPush } = useQuery<{ subscribed: boolean; subscriptionCount: number }>({
    queryKey: ['/api/push/status'], enabled: isAuthenticated,
  });
  const { data: pageData, isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', filter, page],
    queryFn: async () => {
      const offset = page * NOTIF_PAGE_SIZE;
      const params = new URLSearchParams({ limit: String(NOTIF_PAGE_SIZE), offset: String(offset) });
      if (filter !== 'all') params.set('type', filter);
      const r = await fetch(`/api/notifications?${params}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,  // aggiornamento automatico ogni 30s (nuove notifiche in tempo reale)
  });

  // Accumula i risultati di pagine successive (modalità "Carica altre")
  // NOTE: pageData must NOT use a default `= []` in destructuring — a new [] on every
  // render would make this effect loop infinitely (new reference → setState → re-render).
  useEffect(() => {
    if (!pageData) return;
    if (page === 0) setAccumulated(pageData);
    else if (pageData.length > 0) setAccumulated(prev => {
      const seen = new Set(prev.map(n => n.id));
      return [...prev, ...pageData.filter(n => !seen.has(n.id))];
    });
  }, [pageData, page]);
  const notificationsList = accumulated;
  const hasMore = (pageData?.length ?? 0) === NOTIF_PAGE_SIZE;
  const { data: preferences } = useQuery<NotificationPreference>({
    queryKey: ['/api/notification-preferences'], enabled: isAuthenticated,
  });

  // Quando l'app torna in foreground (da background), aggiorna subito la lista.
  // Cattura anche le notifiche push arrivate mentre l'app era in background.
  useEffect(() => {
    const onResume = () => {
      setPage(0);
      setAccumulated([]);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    };
    window.addEventListener('native-app-resume', onResume);
    // Anche su browser/PWA: aggiorna quando l'utente torna sulla tab
    document.addEventListener('visibilitychange', () => { if (!document.hidden) onResume(); });
    return () => {
      window.removeEventListener('native-app-resume', onResume);
    };
  }, []);

  const invalidateNotifs = () => {
    // Reset paginazione + accumulatore dopo mutazioni (delete/mark-read),
    // così la lista riflette sempre lo stato server senza voci stantie.
    setPage(0);
    setAccumulated([]);
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: invalidateNotifs,
  });
  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: invalidateNotifs,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateNotifs,
  });
  const deleteAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications', { method: 'DELETE' }),
    onSuccess: () => { invalidateNotifs(); toast({ title: "Notifiche eliminate" }); },
  });
  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreference>) =>
      apiRequest('/api/notification-preferences', { method: 'PATCH' }, prefs),
    // (definito sotto: setPref typed helper per evitare cast)
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: ['/api/notification-preferences'] });
      const prev = queryClient.getQueryData<NotificationPreference>(['/api/notification-preferences']);
      if (prev) queryClient.setQueryData(['/api/notification-preferences'], { ...prev, ...newPrefs });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(['/api/notification-preferences'], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] }),
  });
  // Helper tipato: aggiorna una singola preferenza preservando keyof NotificationPreference.
  const setPref = <K extends keyof NotificationPreference>(key: K, value: NotificationPreference[K]) => {
    updatePrefsMutation.mutate({ [key]: value } as Partial<NotificationPreference>);
  };

  const handleSubscribe = async () => {
    if (!('Notification' in window)) {
      toast({ title: "Non supportato", description: "Il tuo browser non supporta le notifiche push.", variant: "destructive" });
      return;
    }
    setIsSubscribing(true);
    try {
      const result = await subscribeToPush();
      setNotifPerm(Notification.permission);
      if (result.success) {
        refetchPush();
        toast({ title: "Notifiche attivate!", description: "Riceverai notifiche quando ci sono novità." });
      } else {
        toast({ title: "Registrazione fallita", description: result.error || "Prova a ricaricare la pagina.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message || "Impossibile attivare le notifiche.", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeFromPush();
      refetchPush();
      toast({ title: "Push disattivate" });
    } catch {
      toast({ title: "Errore", description: "Impossibile disattivare le notifiche push.", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  const getLink = (n: Notification): string | null => {
    switch (n.type) {
      case 'new_brewery_request': return '/admin/publican-requests?section=brewery';
      case 'new_pub_request': return '/admin/publican-requests?section=pub';
      default:
        if (n.pubId) return `/pub/${n.pubId}`;
        if (n.breweryId) return `/brewery/${n.breweryId}`;
        return null;
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    const link = getLink(n);
    if (link) setLocation(link);
  };

  const unreadCount = useMemo(() => notificationsList.filter(n => !n.isRead).length, [notificationsList]);
  const visible = notificationsList;

  if (authLoading || (notifLoading && notificationsList.length === 0)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-stone-50/80 dark:bg-[#0B0D10]/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const pushMaster = preferences?.pushEnabled !== false;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F77104 0%, #f5a623 100%)' }}>
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground leading-tight">Notifiche</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} non {unreadCount === 1 ? 'letta' : 'lette'}</p>
            )}
          </div>
        </div>
        {tab === 'storia' && unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-50 dark:bg-[#0B0D10]/20 text-primary hover:bg-stone-100 transition-colors"
            data-testid="button-mark-all-read"
          >
            {markAllReadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Segna lette
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-50 dark:bg-[#0B0D10]/20 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setTab('storia')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'storia' ? 'bg-white dark:bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          data-testid="tab-storia"
        >
          Storico
        </button>
        <button
          onClick={() => setTab('preferenze')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${tab === 'preferenze' ? 'bg-white dark:bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
          data-testid="tab-preferenze"
        >
          <Settings className="h-3.5 w-3.5" /> Preferenze
        </button>
      </div>

      {/* Push permission banner — sempre visibile in alto se non concesse */}
      {iosNotStandalone ? (
        <div className="rounded-2xl p-4 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 flex items-start gap-3">
          <div className="p-2 rounded-xl flex-shrink-0 bg-amber-100 dark:bg-amber-900/30">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Notifiche push su iPhone</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Su iPhone le notifiche push richiedono iOS 16.4+ e l'app installata dalla schermata home.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 leading-snug font-medium">
              In Safari: Condividi → "Aggiungi a schermata Home" → apri l'app installata
            </p>
          </div>
        </div>
      ) : notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${notifPerm === 'denied' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-card border-stone-100 dark:border-border'}`}>
          <div className={`p-2 rounded-xl flex-shrink-0 ${notifPerm === 'denied' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-stone-100 dark:bg-[#1A1D24]'}`}>
            <BellOff className={`h-4 w-4 ${notifPerm === 'denied' ? 'text-red-600' : 'text-stone-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {notifPerm === 'denied' ? 'Notifiche bloccate' : 'Attiva le notifiche push'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {notifPerm === 'denied'
                ? 'Sblocca le notifiche nelle impostazioni del browser per ricevere aggiornamenti.'
                : 'Ricevi avvisi quando ci sono novità sui tuoi locali, birre o amici.'}
            </p>
            {notifPerm !== 'denied' && !isNativeCapacitorApp() && (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #F77104 0%, #f5a623 100%)' }}
                data-testid="button-subscribe-push"
              >
                {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                Attiva notifiche push
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB STORICO ─────────────────────────────────────────────────── */}
      {tab === 'storia' && (
        <>
          {/* Filtro categoria */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {HISTORY_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  filter === f.value
                    ? 'bg-primary text-white'
                    : 'bg-stone-50 dark:bg-[#0B0D10]/20 text-muted-foreground hover:bg-stone-100'
                }`}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {(() => {
              const newOnes = visible.filter(n => !n.isRead);
              const oldOnes = visible.filter(n => n.isRead);
              const renderCard = (n: any) => {
                const { icon, bg } = getNotificationIcon(n.type);
                const link = getLink(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`rounded-2xl border cursor-pointer transition-all duration-200 ease-out active:scale-[0.99] backdrop-blur-xl hover:border-primary/30 ${
                      !n.isRead
                        ? 'bg-white/70 dark:bg-white/[0.04] border-white/40 dark:border-white/[0.06] shadow-[0_2px_12px_rgba(247,113,4,0.08)]'
                        : 'bg-white/70 dark:bg-white/[0.04] border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                    } hover:shadow-[0_4px_20px_rgba(247,113,4,0.1)]`}
                    data-testid={`notif-card-${n.id}`}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${bg}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-foreground leading-snug">{n.title}</span>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] text-muted-foreground">
                                {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: it }) : ''}
                              </span>
                              {link && (
                                <span className="text-xs font-extrabold text-primary inline-flex items-center gap-0.5 bg-primary/10 px-2.5 py-1.5 rounded-full">
                                  Apri <ArrowRight className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                            className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {!n.isRead && (
                      <div className="h-0.5 mx-4 mb-3 rounded-full" style={{ background: 'linear-gradient(90deg, #F77104, #f5a623)' }} />
                    )}
                  </div>
                );
              };
              return (
                <>
                  {newOnes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground px-1 pb-0.5 pt-1">
                        Nuove ({newOnes.length})
                      </p>
                      {newOnes.map(renderCard)}
                    </div>
                  )}
                  {oldOnes.length > 0 && (
                    <div className="space-y-2">
                      <p className={`text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground px-1 pb-0.5 ${newOnes.length > 0 ? 'pt-4' : 'pt-1'}`}>
                        Meno recenti
                      </p>
                      {oldOnes.map(renderCard)}
                    </div>
                  )}
                </>
              );
            })()}

            {hasMore && (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={notifLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-stone-200 transition-all"
                data-testid="button-show-more"
              >
                {notifLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                Carica altre
              </button>
            )}

            {notificationsList.length === 0 && (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed border-stone-200 dark:border-[#23262E]/30">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(247,113,4,0.1) 0%, rgba(245,166,35,0.1) 100%)' }}>
                  <Bell className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Nessuna notifica</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-snug">
                  {filter === 'all'
                    ? 'Quando ci saranno novità le vedrai qui.'
                    : 'Nessuna notifica per questa categoria.'}
                </p>
              </div>
            )}

            {notificationsList.length > 0 && (
              <button
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                className="w-full mt-4 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors"
                data-testid="button-delete-all"
              >
                {deleteAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Elimina tutte
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── TAB PREFERENZE ─────────────────────────────────────────────── */}
      {tab === 'preferenze' && (
        <div className="space-y-4">
          {/* Master push toggle + status */}
          <div className="rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-stone-100 dark:bg-[#1A1D24] flex-shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Notifiche push</p>
                  <p className="text-xs text-muted-foreground">Master switch globale</p>
                </div>
              </div>
              <Switch
                checked={pushMaster}
                onCheckedChange={async (v) => {
                  updatePrefsMutation.mutate({ pushEnabled: v });
                  // Su app nativa: richiede permesso iOS/Android se non ancora concesso
                  if (v && isNativeCapacitorApp()) {
                    try {
                      const { registerNativePush } = await import('@/services/capacitor-native');
                      await registerNativePush();
                    } catch {}
                  }
                }}
                disabled={iosNotStandalone}
                data-testid="switch-push-master"
              />
            </div>
            {iosNotStandalone ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Richiede l'app installata dalla schermata home (Safari → Condividi → Aggiungi a schermata Home)</span>
              </div>
            ) : (
              <>
                {notifPerm === 'granted' && pushStatus?.subscribed && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Push attive su questo dispositivo
                  </div>
                )}
                {notifPerm === 'granted' && !pushStatus?.subscribed && (
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-primary" />Permesso concesso, registra il dispositivo</span>
                    <button onClick={handleSubscribe} disabled={isSubscribing} className="font-bold text-primary hover:underline">
                      {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Attiva'}
                    </button>
                  </div>
                )}
                {/* Pulsante ri-registrazione manuale per app nativa Android/iOS */}
                {isNativeCapacitorApp() && (
                  <button
                    onClick={async () => {
                      setIsSubscribing(true);
                      try {
                        localStorage.removeItem('capacitor-push-permission');
                        const { registerNativePush } = await import('@/services/capacitor-native');
                        const result = await registerNativePush();
                        localStorage.setItem('capacitor-push-permission', result);
                        setTimeout(() => refetchPush(), 3000);
                        toast({ title: result === 'granted' ? '✓ Token registrato' : 'Permesso non concesso — controlla le impostazioni di sistema', duration: 4000 });
                      } catch {
                        toast({ title: 'Errore registrazione push', variant: 'destructive' });
                      } finally {
                        setIsSubscribing(false);
                      }
                    }}
                    disabled={isSubscribing}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                  >
                    {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                    Riregistra questo dispositivo
                  </button>
                )}
                {/* Pannello diagnostico push nativa — visibile per capire dove fallisce */}
                {isNativeCapacitorApp() && pushDiag && (
                  <div className="mt-3 rounded-xl bg-muted/50 border border-border p-3 text-[11px] font-mono space-y-1">
                    <div className="font-bold text-xs font-sans mb-1.5 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" /> Diagnostica push
                    </div>
                    <div>Piattaforma: <span className="text-primary">{pushDiag.platform}</span></div>
                    <div>Fase: <span className="text-primary">{pushDiag.step}</span></div>
                    {pushDiag.permission && <div>Permesso: {pushDiag.permission}</div>}
                    {typeof pushDiag.tokenReceived === 'boolean' && (
                      <div>Token FCM: {pushDiag.tokenReceived ? `✓ ${pushDiag.tokenPreview ?? ''}` : '✗ non ricevuto'}</div>
                    )}
                    {pushDiag.saveStatus !== undefined && <div>Salvataggio server: {String(pushDiag.saveStatus)}</div>}
                    {pushDiag.error && <div className="text-red-600 dark:text-red-400 break-all">Errore: {pushDiag.error}</div>}
                  </div>
                )}
                {notifPerm === 'granted' && pushStatus?.subscribed && (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={isSubscribing}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
                    Disattiva push su questo dispositivo
                  </button>
                )}
              </>
            )}
          </div>

          {/* Matrice categorie × canali */}
          <div className="rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 dark:border-border bg-background dark:bg-[#0B0D10]/10 flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm">Categorie</h2>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <span className="w-12 text-center">In-app</span>
                <span className="w-12 text-center">Push</span>
                <span className="w-12 text-center">Email</span>
              </div>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-border">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const inAppMaster = preferences?.inAppEnabled !== false;
                const emailMaster = preferences?.emailEnabled !== false;
                const inAppOn = preferences?.[cat.inAppKey] !== false;
                const pushOn = preferences?.[cat.pushKey] !== false;
                const emailOn = preferences?.[cat.emailKey] === true;
                return (
                  <div key={cat.inAppKey} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-stone-50 dark:bg-[#0B0D10]/30 flex-shrink-0">
                      <Icon className={`h-4 w-4 ${cat.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={inAppOn && inAppMaster}
                          onCheckedChange={(v) => setPref(cat.inAppKey, v)}
                          disabled={!inAppMaster}
                          data-testid={`switch-${cat.inAppKey}-inapp`}
                        />
                      </div>
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={pushOn && pushMaster}
                          onCheckedChange={(v) => setPref(cat.pushKey, v)}
                          disabled={!pushMaster}
                          data-testid={`switch-${cat.inAppKey}-push`}
                        />
                      </div>
                      <div className="w-12 flex justify-center">
                        <Switch
                          checked={emailOn && emailMaster}
                          onCheckedChange={(v) => setPref(cat.emailKey, v)}
                          disabled={!emailMaster}
                          data-testid={`switch-${cat.inAppKey}-email`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-stone-100 dark:border-border bg-stone-50/50 dark:bg-[#0B0D10]/10 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Notifiche dentro l'app</p>
                <Switch
                  checked={preferences?.inAppEnabled !== false}
                  onCheckedChange={(v) => setPref('inAppEnabled', v)}
                  data-testid="switch-inapp-master"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Email di sintesi</p>
                <Switch
                  checked={preferences?.emailEnabled !== false}
                  onCheckedChange={(v) => setPref('emailEnabled', v)}
                  data-testid="switch-email-master"
                />
              </div>
            </div>
          </div>

          {/* Quiet hours */}
          <div className="rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-violet-50 dark:bg-violet-950/30">
                <Moon className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Ore di silenzio</p>
                <p className="text-xs text-muted-foreground">Niente push in fascia notturna</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Inizio</span>
                <input
                  type="time"
                  value={preferences?.quietHoursStart ?? ''}
                  onChange={(e) => setPref('quietHoursStart', e.target.value || null)}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-border bg-background px-3 py-2 text-sm font-semibold"
                  data-testid="input-quiet-start"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fine</span>
                <input
                  type="time"
                  value={preferences?.quietHoursEnd ?? ''}
                  onChange={(e) => setPref('quietHoursEnd', e.target.value || null)}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-border bg-background px-3 py-2 text-sm font-semibold"
                  data-testid="input-quiet-end"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setPref('quietHoursMode', 'queue')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${preferences?.quietHoursMode !== 'skip' ? 'bg-primary text-white' : 'bg-stone-50 dark:bg-[#0B0D10]/20 text-muted-foreground'}`}
                data-testid="button-mode-queue"
              >
                Rimanda
              </button>
              <button
                onClick={() => setPref('quietHoursMode', 'skip')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${preferences?.quietHoursMode === 'skip' ? 'bg-primary text-white' : 'bg-stone-50 dark:bg-[#0B0D10]/20 text-muted-foreground'}`}
                data-testid="button-mode-skip"
              >
                Scarta
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
              {preferences?.quietHoursMode === 'skip'
                ? 'Le notifiche durante questa fascia non verranno inviate.'
                : 'Le notifiche durante questa fascia verranno inviate alla fine del periodo.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
