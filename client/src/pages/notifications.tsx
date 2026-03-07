import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Beer, Calendar, MapPin, Settings, AlertCircle, CheckCircle2, Trash2, CheckCheck, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";
import type { Notification, NotificationPreference } from "@shared/schema";
import { subscribeToPush, unsubscribeFromPush } from "@/components/pwa-prompt";

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showSettings, setShowSettings] = useState(false);

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
  const [isSendingTest, setIsSendingTest] = useState(false);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta le notifiche push",
        variant: "destructive",
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const result = await subscribeToPush();
      const permission = Notification.permission;
      setNotificationPermission(permission);
      
      if (result.success) {
        refetchPushStatus();
        toast({
          title: "Notifiche push attivate!",
          description: "Riceverai notifiche sul dispositivo quando ci sono novita' nei tuoi preferiti.",
        });
      } else {
        toast({
          title: "Registrazione push fallita",
          description: result.error || "Errore sconosciuto. Prova a ricaricare la pagina.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile attivare le notifiche push",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    setIsSendingTest(true);
    try {
      const res = await apiRequest('/api/push/test', { method: 'POST' });
      toast({
        title: "Notifica di test inviata!",
        description: "Dovresti riceverla sul dispositivo entro pochi secondi.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile inviare la notifica di test",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleUnsubscribePush = async () => {
    setIsSubscribing(true);
    try {
      await unsubscribeFromPush();
      refetchPushStatus();
      toast({
        title: "Notifiche push disattivate",
        description: "Non riceverai piu' notifiche push su questo dispositivo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile disattivare le notifiche push",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per vedere le notifiche...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.pubId) {
      setLocation(`/pub/${notification.pubId}`);
    } else if (notification.breweryId) {
      setLocation(`/brewery/${notification.breweryId}`);
    }
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
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  Notifiche push {pushStatus?.subscribed ? 'attive' : 'abilitate ma non registrate'}
                </p>
                {pushStatus?.subscribed ? (
                  <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                    Questo dispositivo ricevera' notifiche quando i tuoi pub preferiti aggiornano le spine.
                  </p>
                ) : (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                    Hai dato il permesso ma la registrazione push non e' completa. Clicca "Registra" per completare.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!pushStatus?.subscribed && (
                    <Button
                      size="sm"
                      onClick={requestNotificationPermission}
                      disabled={isSubscribing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubscribing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bell className="h-4 w-4 mr-1" />}
                      Registra
                    </Button>
                  )}
                  {pushStatus?.subscribed && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestPush}
                        disabled={isSendingTest}
                        className="border-green-300 text-green-800 hover:bg-green-100 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-900/30"
                      >
                        {isSendingTest ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                        Invia notifica di test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleUnsubscribePush}
                        disabled={isSubscribing}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disattiva push
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notificationsList.map((notification) => (
          <Card 
            key={notification.id} 
            className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!notification.isRead ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{notification.title}</span>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">Nuovo</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {notification.message}
                  </p>
                  
                  <span className="text-xs text-gray-500">
                    {notification.createdAt
                      ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: it })
                      : ''}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotificationMutation.mutate(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {notificationsList.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nessuna notifica
              </h3>
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
