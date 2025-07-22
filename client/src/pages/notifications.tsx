import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, MapPin, Beer, Calendar, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Eventi in zona</div>
              <div className="text-xs text-gray-500">Degustazioni, festival e eventi birrai nella tua zona</div>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Nuovi locali</div>
              <div className="text-xs text-gray-500">Quando aprono nuovi pub nella tua zona</div>
            </div>
            <Switch />
          </div>
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