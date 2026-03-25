import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Beer, Calendar, MapPin, Settings, AlertCircle, CheckCircle2, Trash2, CheckCheck, Loader2, ChevronDown, Factory, Store, CalendarDays, Heart, X, BellOff, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";
import type { Notification, NotificationPreference } from "@shared/schema";
import { subscribeToPush, unsubscribeFromPush } from "@/components/pwa-prompt";

const NOTIF_PAGE_SIZE = 10;

function getNotificationIcon(type: string) {
  const base = "h-5 w-5";
  switch (type) {
    case 'new_beer':
    case 'tap_change':
      return { icon: <Beer className={`${base} text-orange-600`} />, bg: 'bg-orange-50 dark:bg-orange-950/30' };
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
    case 'festival':
    case 'festival_interest':
    case 'festival_update':
      return { icon: <CalendarDays className={`${base} text-violet-600`} />, bg: 'bg-violet-50 dark:bg-violet-950/30' };
    default:
      return { icon: <Bell className={`${base} text-gray-500`} />, bg: 'bg-gray-100 dark:bg-gray-800' };
  }
}

function PrefRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
    else setNotifPerm('unsupported');
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per vedere le notifiche.", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: pushStatus, refetch: refetchPush } = useQuery<{ subscribed: boolean; subscriptionCount: number }>({
    queryKey: ['/api/push/status'], enabled: isAuthenticated,
  });
  const { data: notificationsList = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'], enabled: isAuthenticated,
  });
  const { data: preferences } = useQuery<NotificationPreference>({
    queryKey: ['/api/notification-preferences'], enabled: isAuthenticated,
  });

  const invalidateNotifs = () => {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] }),
  });

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
        toast({ title: "Notifiche attivate!", description: "Riceverai notifiche quando ci sono novità nei tuoi preferiti." });
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
      toast({ title: "Push disattivate", description: "Non riceverai più notifiche push su questo dispositivo." });
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

  if (authLoading || notifLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-orange-50/80 dark:bg-orange-950/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const unreadCount = notificationsList.filter(n => !n.isRead).length;
  const visible = showAll ? notificationsList : notificationsList.slice(0, NOTIF_PAGE_SIZE);
  const hasMore = notificationsList.length > NOTIF_PAGE_SIZE && !showAll;

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
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/20 text-primary hover:bg-orange-100 transition-colors"
            >
              {markAllReadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Segna lette
            </button>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-primary text-white' : 'bg-orange-50 dark:bg-orange-950/20 text-primary hover:bg-orange-100'}`}
          >
            {showSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Push permission banner */}
      {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${notifPerm === 'denied' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'}`}>
          <div className={`p-2 rounded-xl flex-shrink-0 ${notifPerm === 'denied' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <BellOff className={`h-4 w-4 ${notifPerm === 'denied' ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {notifPerm === 'denied' ? 'Notifiche bloccate' : 'Attiva le notifiche push'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {notifPerm === 'denied'
                ? 'Sblocca le notifiche nelle impostazioni del browser per ricevere aggiornamenti.'
                : 'Ricevi notifiche quando i tuoi pub preferiti aggiungono nuove birre alla spina.'}
            </p>
            {notifPerm !== 'denied' && (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #F77104 0%, #f5a623 100%)' }}
              >
                {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                Attiva notifiche push
              </button>
            )}
          </div>
        </div>
      )}

      {notifPerm === 'granted' && pushStatus?.subscribed && (
        <div className="rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex-1">Notifiche push attive su questo dispositivo</p>
        </div>
      )}

      {notifPerm === 'granted' && !pushStatus?.subscribed && (
        <div className="rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 flex-1">Permesso concesso ma non registrato. Clicca per completare l'attivazione.</p>
          <button onClick={handleSubscribe} disabled={isSubscribing} className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
            {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Attiva'}
          </button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] shadow-[0_4px_20px_rgba(247,113,4,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-50 dark:border-[hsl(25,12%,16%)] bg-[#FFF8F2] dark:bg-orange-950/10">
            <h2 className="font-bold text-foreground text-sm">Preferenze notifiche</h2>
          </div>
          <div className="p-5 space-y-5">
            <PrefRow
              label="Nuove birre in spina"
              description="Quando i tuoi locali preferiti aggiornano la taplist"
              checked={preferences?.tapChanges ?? true}
              onChange={(v) => updatePrefsMutation.mutate({ tapChanges: v })}
              disabled={updatePrefsMutation.isPending}
            />
            <PrefRow
              label="Eventi in zona"
              description="Degustazioni, festival e serate birrai"
              checked={preferences?.events ?? true}
              onChange={(v) => updatePrefsMutation.mutate({ events: v })}
              disabled={updatePrefsMutation.isPending}
            />
            <PrefRow
              label="Nuovi locali"
              description="Quando aprono nuovi pub nella tua zona"
              checked={preferences?.newPubs ?? false}
              onChange={(v) => updatePrefsMutation.mutate({ newPubs: v })}
              disabled={updatePrefsMutation.isPending}
            />

            <div className="border-t border-orange-50 dark:border-[hsl(25,12%,16%)] pt-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-bold text-foreground">Festival</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-snug">
                Metti "Mi Piace" ai festival dalla sezione <strong>Attività</strong> per ricevere aggiornamenti.
              </p>
              <div className="flex gap-2">
                <a href="/attivita" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 transition-colors">
                    <CalendarDays className="h-3.5 w-3.5" />Vedi festival
                  </button>
                </a>
                <a href="/festival" className="flex-1">
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                    <Heart className="h-3.5 w-3.5" />Preferiti
                  </button>
                </a>
              </div>
            </div>

            <div className="border-t border-orange-50 dark:border-[hsl(25,12%,16%)] pt-4 flex flex-wrap gap-2">
              {pushStatus?.subscribed && (
                <button
                  onClick={handleUnsubscribe}
                  disabled={isSubscribing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {isSubscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
                  Disattiva push
                </button>
              )}
              {notificationsList.length > 0 && (
                <button
                  onClick={() => deleteAllMutation.mutate()}
                  disabled={deleteAllMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {deleteAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Elimina tutte
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2.5">
        {visible.map((n) => {
          const { icon, bg } = getNotificationIcon(n.type);
          const link = getLink(n);
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`rounded-2xl border cursor-pointer transition-all duration-200 ${
                !n.isRead
                  ? 'bg-white dark:bg-[hsl(25,14%,10%)] border-orange-100 dark:border-orange-900/40 shadow-[0_2px_12px_rgba(247,113,4,0.08)]'
                  : 'bg-white dark:bg-[hsl(25,14%,10%)] border-orange-50 dark:border-[hsl(25,12%,16%)] hover:border-orange-100'
              } hover:shadow-[0_4px_20px_rgba(247,113,4,0.1)]`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${bg}`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground leading-snug">{n.title}</span>
                        {!n.isRead && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(247,113,4,0.12)', color: '#F77104' }}>
                            Nuova
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: it }) : ''}
                        </span>
                        {link && (
                          <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                            Apri <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Unread indicator bar */}
              {!n.isRead && (
                <div className="h-0.5 mx-4 mb-3 rounded-full" style={{ background: 'linear-gradient(90deg, #F77104, #f5a623)' }} />
              )}
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-orange-100 transition-all"
          >
            <ChevronDown className="h-4 w-4" />
            Mostra di più ({notificationsList.length - NOTIF_PAGE_SIZE} altre)
          </button>
        )}

        {notificationsList.length === 0 && (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-orange-100 dark:border-orange-900/30">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(247,113,4,0.1) 0%, rgba(245,166,35,0.1) 100%)' }}>
              <Bell className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Nessuna notifica</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-snug">
              Quando i tuoi locali preferiti aggiungeranno nuove birre o eventi, le notifiche appariranno qui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
