import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Beer, Calendar, MapPin, Settings, AlertCircle, CheckCircle2, Trash2, CheckCheck, Loader2, ChevronDown, Factory, Store, CalendarDays, Heart, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";
import type { Notification, NotificationPreference } from "@shared/schema";
import { subscribeToPush, unsubscribeFromPush } from "@/components/pwa-prompt";

const NOTIF_PAGE_SIZE = 10;

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showSettings, setShowSettings] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const { data: pushStatus, refetch: refetchPushStatus } = useQuery<{ subscribed: boolean; subscriptionCount: number }>({
    queryKey: ['/api/push/status'],
    enabled: isAuthenticated,
  });

  const [isSubscribing, setIsSubscribing] = useState(false);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: "Non supportato", description: "Il tuo browser non supporta le notifiche push", variant: "destructive" });
      return;
    }
    setIsSubscribing(true);
    try {
      const result = await subscribeToPush();
      const permission = Notification.permission;
      setNotificationPermission(permission);
      if (result.success) {
        refetchPushStatus();
        toast({ title: "Notifiche push attivate!", description: "Riceverai notifiche sul dispositivo quando ci sono novita' nei tuoi preferiti." });
      } else {
        toast({ title: "Registrazione push fallita", description: result.error || "Errore sconosciuto. Prova a ricaricare la pagina.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Errore", description: error?.message || "Impossibile attivare le notifiche push", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribePush = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeFromPush();
      refetchPushStatus();
      toast({ title: "Notifiche push disattivate", description: "Non riceverai piu' notifiche push su questo dispositivo." });
    } catch {
      toast({ title: "Errore", description: "Impossibile disattivare le notifiche push", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Accesso richiesto", description: "Effettua l'accesso per vedere le notifiche...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: notificationsList = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
  });

  const { data: preferences } = useQuery<NotificationPreference>({
    queryKey: ['/api/notification-preferences'],
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({ title: "Notifiche eliminate", description: "Tutte le notifiche sono state eliminate." });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreference>) =>
      apiRequest('/api/notification-preferences', { method: 'PATCH' }, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
    },
  });

  const handlePrefToggle = (key: 'tapChanges' | 'events' | 'newPubs', value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  const getNotificationLink = (notification: Notification): string | null => {
    switch (notification.type) {
      case 'new_brewery_request':
        return '/admin/publican-requests?section=brewery';
      case 'new_pub_request':
        return '/admin/publican-requests?section=pub';
      default:
        if (notification.pubId) return `/pub/${notification.pubId}`;
        if (notification.breweryId) return `/brewery/${notification.breweryId}`;
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link) setLocation(link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_beer':
      case 'tap_change':
        return <Beer className="h-5 w-5 text-orange-600" />;
      case 'beer_removed':
        return <Beer className="h-5 w-5 text-red-500" />;
      case 'event':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'new_pub':
        return <MapPin className="h-5 w-5 text-green-600" />;
      case 'new_brewery_request':
        return <Factory className="h-5 w-5 text-amber-600" />;
      case 'new_pub_request':
        return <Store className="h-5 w-5 text-amber-600" />;
      case 'festival':
      case 'festival_interest':
      case 'festival_update':
        return <CalendarDays className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  if (authLoading || notifLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const unreadCount = notificationsList.filter(n => !n.isRead).length;
  const visibleNotifications = showAll ? notificationsList : notificationsList.slice(0, NOTIF_PAGE_SIZE);
  const hasMore = notificationsList.length > NOTIF_PAGE_SIZE;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifiche</h1>
          {unreadCount > 0 && (
            <Badge className="bg-orange-600 text-white">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Segna tutto letto</span>
              <span className="sm:hidden">Letti</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="whitespace-nowrap"
          >
            <Settings className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Impostazioni</span>
            <span className="sm:hidden">Imp.</span>
          </Button>
        </div>
      </div>

      {/* Push status banner */}
      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
        <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {notificationPermission === 'denied' ? 'Notifiche bloccate' : 'Attiva le notifiche push'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {notificationPermission === 'denied'
                    ? "Le notifiche sono state bloccate. Per riattivarle, vai nelle impostazioni del browser e consenti le notifiche per questo sito."
                    : "Ricevi notifiche sul dispositivo quando i tuoi pub preferiti aggiungono nuove birre alla spina."}
                </p>
                {notificationPermission !== 'denied' && (
                  <Button
                    onClick={requestNotificationPermission}
                    disabled={isSubscribing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isSubscribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                    Attiva notifiche push
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notificationPermission === 'granted' && (
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Notifiche push {pushStatus?.subscribed ? 'attive' : 'abilitate ma non registrate'}
                </p>
                {!pushStatus?.subscribed && (
                  <Button size="sm" onClick={requestNotificationPermission} disabled={isSubscribing} className="mt-2 bg-green-600 hover:bg-green-700">
                    {isSubscribing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bell className="h-4 w-4 mr-1" />}
                    Registra
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Preferenze Notifiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Nuove birre in spina</div>
                <div className="text-xs text-gray-500">Notifiche quando i tuoi locali preferiti aggiungono o rimuovono birre</div>
              </div>
              <Switch
                checked={preferences?.tapChanges ?? true}
                onCheckedChange={(val) => handlePrefToggle('tapChanges', val)}
                disabled={updatePrefsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Eventi in zona</div>
                <div className="text-xs text-gray-500">Degustazioni, festival e eventi birrai nella tua zona</div>
              </div>
              <Switch
                checked={preferences?.events ?? true}
                onCheckedChange={(val) => handlePrefToggle('events', val)}
                disabled={updatePrefsMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Nuovi locali</div>
                <div className="text-xs text-gray-500">Quando aprono nuovi pub nella tua zona</div>
              </div>
              <Switch
                checked={preferences?.newPubs ?? false}
                onCheckedChange={(val) => handlePrefToggle('newPubs', val)}
                disabled={updatePrefsMutation.isPending}
              />
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Festival</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Metti "Mi Piace" ai festival che ti interessano direttamente dalla loro taplist.
                Trovi i festival attivi nella sezione <strong>Attività</strong>.
              </p>
              <div className="flex gap-2">
                <a href="/attivita" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <CalendarDays className="h-3.5 w-3.5" />Vedi festival
                  </Button>
                </a>
                <a href="/festival" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-500" />I miei preferiti
                  </Button>
                </a>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-wrap gap-2">
              {pushStatus?.subscribed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnsubscribePush}
                  disabled={isSubscribing}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {isSubscribing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Disattiva push
                </Button>
              )}
              {notificationsList.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteAllMutation.mutate()}
                  disabled={deleteAllMutation.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {deleteAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Elimina tutte
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visibleNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.isRead ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{notification.title}</span>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">Nuovo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{notification.message}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {notification.createdAt
                        ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: it })
                        : ''}
                    </span>
                    {getNotificationLink(notification) && (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Vai alla richiesta →
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={(e) => { e.stopPropagation(); deleteNotificationMutation.mutate(notification.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {hasMore && !showAll && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAll(true)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Mostra di più ({notificationsList.length - NOTIF_PAGE_SIZE} altre)
          </Button>
        )}

        {notificationsList.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nessuna notifica</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Quando i tuoi locali preferiti aggiungeranno nuove birre o eventi,
                le notifiche appariranno qui.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
