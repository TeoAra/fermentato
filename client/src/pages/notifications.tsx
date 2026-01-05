import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, MapPin, Beer, Calendar, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta le notifiche push",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notifiche attivate!",
          description: "Riceverai notifiche per nuove birre, eventi e altro",
        });
        new Notification("Fermenta.to", {
          body: "Le notifiche sono state attivate con successo!",
          icon: "/favicon.ico"
        });
      } else if (permission === 'denied') {
        toast({
          title: "Notifiche bloccate",
          description: "Puoi abilitarle dalle impostazioni del browser",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile richiedere il permesso per le notifiche",
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Effettua l'accesso per vedere le notifiche...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
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

  // Mock notifications - in realtà verrebbero dal backend
  const notifications = [
    {
      id: 1,
      type: "tap_change",
      pub: "Malto & Luppolo",
      beer: "Baladin Super",
      message: "Nuova birra in spina",
      time: "2 ore fa",
      isRead: false
    },
    {
      id: 2,
      type: "event",
      pub: "Birra & Baccalà",
      message: "Evento degustazione birre belghe",
      time: "1 giorno fa",
      isRead: false
    },
    {
      id: 3,
      type: "favorite",
      pub: "Il Luppoleto",
      beer: "Brewdog Punk IPA",
      message: "Il tuo locale preferito ha aggiunto una nuova birra",
      time: "3 giorni fa",
      isRead: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifiche</h1>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Impostazioni
        </Button>
      </div>

      {/* Push Notification Permission */}
      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
        <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Abilita le notifiche push
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ricevi notifiche in tempo reale quando i tuoi pub preferiti aggiungono nuove birre o creano eventi.
                </p>
                <Button 
                  onClick={requestNotificationPermission}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="button-enable-notifications"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Attiva notifiche
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notificationPermission === 'granted' && (
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Notifiche push attive! Riceverai aggiornamenti in tempo reale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Preferenze Notifiche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Nuove birre in spina</div>
              <div className="text-xs text-gray-500">Notifiche quando i tuoi locali preferiti aggiungono nuove birre</div>
            </div>
            <Switch defaultChecked disabled={notificationPermission !== 'granted'} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Eventi in zona</div>
              <div className="text-xs text-gray-500">Degustazioni, festival e eventi birrai nella tua zona</div>
            </div>
            <Switch defaultChecked disabled={notificationPermission !== 'granted'} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Nuovi locali</div>
              <div className="text-xs text-gray-500">Quando aprono nuovi pub nella tua zona</div>
            </div>
            <Switch disabled={notificationPermission !== 'granted'} />
          </div>

          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <p className="text-xs text-gray-500 italic">
              Attiva le notifiche push per gestire queste preferenze
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={notification.id} className={`${!notification.isRead ? 'border-orange-200 dark:border-orange-800' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {notification.type === "tap_change" && <Beer className="h-5 w-5 text-orange-600" />}
                  {notification.type === "event" && <Calendar className="h-5 w-5 text-blue-600" />}
                  {notification.type === "favorite" && <MapPin className="h-5 w-5 text-green-600" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{notification.pub}</span>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs">Nuovo</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {notification.message}
                    {notification.beer && (
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {" • " + notification.beer}
                      </span>
                    )}
                  </p>
                  
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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