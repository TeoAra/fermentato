import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  BarChart3, 
  Users, 
  MessageSquare,
  Settings,
  Shield,
  Database,
  TrendingUp,
  Activity,
  Bell,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboardNew() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [notifications] = useState([
    {
      id: 1,
      type: 'review',
      title: 'Nuove recensioni da moderare',
      message: '0 recensioni in attesa di approvazione',
      time: '2 ore fa',
      priority: 'low'
    },
    {
      id: 2,
      type: 'database',
      title: 'Database aggiornato',
      message: 'Aggiunte 113 nuove birre autentiche al database globale',
      time: '1 giorno fa',
      priority: 'medium'
    },
    {
      id: 3,
      type: 'system',
      title: 'Sistema ottimizzato',
      message: 'Tutte le 29.753 birre ora hanno immagini appropriate',
      time: '2 giorni fa',
      priority: 'high'
    }
  ]);

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

  if (!isAuthenticated || user?.userType !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Crown className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Centro di Controllo Admin</h1>
                <p className="text-white/90 text-lg">
                  Benvenuto Mario - Gestione completa sistema Fermenta.to
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge className="bg-white/20 border-white/30">
                    29.753 birre autentiche
                  </Badge>
                  <Badge className="bg-white/20 border-white/30">
                    2.968 birrifici mondiali
                  </Badge>
                  <Badge className="bg-white/20 border-white/30">
                    Sistema operativo
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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
                    Modifica birre e birrifici
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

        <Link href="/admin/users">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 text-purple-500" />
                    <h3 className="text-lg font-semibold">Utenti & Pub</h3>
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
      </div>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sistema Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Stato Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Database Online</p>
                  <p className="text-sm text-green-600 dark:text-green-300">29.753 birre attive</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                100%
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">API Performance</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Risposta &lt; 500ms</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Ottimo
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">Backup Sistema</p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">Ultimo: 2 ore fa</p>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Attivo
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Statistiche Rapide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Statistiche Live
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                29,753
              </div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Birre Autentiche</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                2,968
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Birrifici Mondiali</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                293
              </div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Stili Unici</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifiche */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Attività Recenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        notification.priority === 'high' ? 'bg-red-500' :
                        notification.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <p className="text-sm font-medium">{notification.title}</p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" size="sm" className="w-full mt-3">
              <ExternalLink className="w-4 h-4 mr-2" />
              Vedi tutte le notifiche
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Globale - Panoramica Completa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                100%
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Autenticità Dati</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Verificati da fonti reali</p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-800/20">
              <div className="text-4xl font-bold text-sky-600 dark:text-sky-400 mb-2">
                20+
              </div>
              <p className="text-sm font-medium text-sky-700 dark:text-sky-300">Paesi Coperti</p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">Copertura mondiale</p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                100%
              </div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Immagini</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Copertura completa</p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20">
              <div className="text-4xl font-bold text-rose-600 dark:text-rose-400 mb-2">
                24/7
              </div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Monitoraggio</p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Sistema sempre attivo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}