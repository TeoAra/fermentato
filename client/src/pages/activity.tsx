import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Calendar, Users, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activity() {
  const [activeTab, setActiveTab] = useState("nearby");

  // Mock data per ora - in futuro dal backend
  const { data: nearbyPubs, isLoading: loadingPubs } = useQuery({
    queryKey: ["/api/pubs"],
    select: (data: any) => Array.isArray(data) ? data.slice(0, 6) : [] // Solo i primi 6 per "zona"
  });

  const events = [
    {
      id: 1,
      title: "Degustazione Birre Belghe",
      pub: "Malto & Luppolo",
      date: "Sabato 25 Gennaio",
      time: "20:00",
      attendees: 15,
      maxAttendees: 25,
      type: "tasting"
    },
    {
      id: 2,
      title: "Live Music & Craft Beer",
      pub: "Birra & Baccalà",
      date: "Venerdì 24 Gennaio",
      time: "21:30",
      attendees: 8,
      maxAttendees: 30,
      type: "music"
    },
    {
      id: 3,
      title: "Torneo Beer Pong",
      pub: "Il Luppoleto",
      date: "Domenica 26 Gennaio",
      time: "19:00",
      attendees: 12,
      maxAttendees: 16,
      type: "game"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: "new_beer",
      pub: "Malto & Luppolo",
      beer: "Hoppy Lager",
      time: "30 min fa"
    },
    {
      id: 2,
      type: "event_created",
      pub: "Birra & Baccalà",
      event: "Serata Weiss",
      time: "2 ore fa"
    },
    {
      id: 3,
      type: "new_pub",
      pub: "Craft Corner",
      location: "Via Roma, 15",
      time: "1 giorno fa"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attività in Zona</h1>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtri
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab("nearby")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "nearby" 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Locali Vicini
          </button>
          <button 
            onClick={() => setActiveTab("events")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "events" 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Eventi
          </button>
          <button 
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "activity" 
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Attività
          </button>
        </div>

        {/* Locali Vicini */}
        {activeTab === "nearby" && (
          <div>
            {loadingPubs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyPubs?.map((pub: any) => (
                  <Card key={pub.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{pub.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{pub.address}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {Math.floor(Math.random() * 5) + 1} km
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Aperto
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Eventi */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge className={
                          event.type === "tasting" ? "bg-orange-100 text-orange-800" :
                          event.type === "music" ? "bg-purple-100 text-purple-800" :
                          "bg-green-100 text-green-800"
                        }>
                          {event.type === "tasting" ? "Degustazione" :
                           event.type === "music" ? "Musica" : "Gioco"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {event.pub}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {event.date} • {event.time}
                        </span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Users className="h-4 w-4" />
                          <span>{event.attendees}/{event.maxAttendees}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Attività Recente */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <Card key={activity.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <div className="flex-1">
                      {activity.type === "new_beer" && (
                        <p className="text-sm">
                          <span className="font-medium">{activity.pub}</span> ha aggiunto 
                          <span className="font-medium text-orange-600"> {activity.beer}</span> in spina
                        </p>
                      )}
                      {activity.type === "event_created" && (
                        <p className="text-sm">
                          <span className="font-medium">{activity.pub}</span> ha creato l'evento 
                          <span className="font-medium text-blue-600"> {activity.event}</span>
                        </p>
                      )}
                      {activity.type === "new_pub" && (
                        <p className="text-sm">
                          Nuovo locale: <span className="font-medium">{activity.pub}</span> in {activity.location}
                        </p>
                      )}
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}