import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Beer, MapPin, Heart, Store, Users, Navigation, Star, Award, Zap, ChevronRight, Building2, Search, TrendingUp, Globe, Sparkles, CheckCircle2, Crown, Shield } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import HomepageMap from "@/components/homepage-map";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Landing() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"] });

  const { data: breweries, isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/breweries", "landing"],
    queryFn: () => fetch("/api/breweries?limit=80").then(r => r.json()),
  });

  const { data: globalStats } = useQuery<any>({ queryKey: ["/api/stats/global"] });

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return pubs.slice(0, 3);
    return [...pubs]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude &&
          parseFloat(pub.latitude) !== 0 && parseFloat(pub.longitude) !== 0
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 3);
  }, [pubs, userLocation]);

  const sortedBreweries = useMemo(() => {
    if (!Array.isArray(breweries)) return [];
    if (!userLocation) {
      const shuffled = [...breweries].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 4);
    }
    return [...breweries]
      .map((b: any) => ({
        ...b,
        _distance: b.latitude && b.longitude &&
          parseFloat(b.latitude) !== 0 && parseFloat(b.longitude) !== 0
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(b.latitude), parseFloat(b.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 4);
  }, [breweries, userLocation]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-slate-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 min-h-[520px] lg:min-h-[580px]">
        <div className="absolute inset-0">
          <img
            src="/hero-beer.jpg"
            alt="Craft beer"
            className="w-full h-full object-cover opacity-10 dark:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-amber-50/70 to-transparent dark:from-gray-900/95 dark:via-slate-900/80 dark:to-transparent"></div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/8 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-teal-400/8 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium mb-6 border border-amber-500/20 dark:border-amber-500/30">
                <Globe className="w-4 h-4" />
                La piattaforma del craft beer
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
                Scopri il nuovo modo<br />
                <span className="text-amber-500 dark:text-amber-400">di bere artigianale</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-lg">
                Trova pub, birrifici e la perfetta birra artigianale vicino a te. La community globale del craft beer e non solo.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/api/login">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold shadow-lg px-8 border-0">
                    <Users className="mr-2 w-5 h-5" />
                    Accedi o Registrati
                  </Button>
                </a>
                <Link href="/explore/breweries">
                  <Button size="lg" className="bg-gray-900/8 hover:bg-gray-900/15 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold px-8 border border-gray-900/15 dark:border-white/20 backdrop-blur-sm">
                    <Search className="mr-2 w-5 h-5" />
                    Esplora la mappa
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex flex-col gap-4">
              {[
                {
                  icon: Beer,
                  color: "from-amber-500 to-orange-500",
                  title: "Migliaia di birre",
                  desc: "Catalogo completo con stili, ABV e recensioni della community",
                },
                {
                  icon: MapPin,
                  color: "from-teal-500 to-cyan-500",
                  title: "Pub e birrifici vicini",
                  desc: "Geolocalizzazione per trovare i locali migliori in ogni città",
                },
                {
                  icon: TrendingUp,
                  color: "from-purple-500 to-violet-500",
                  title: "Badge e progressi",
                  desc: "Scala i livelli da Germoglio a Leggenda del Luppolo",
                },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BANNER ===== */}
      {globalStats && (
        <section className="bg-amber-50 dark:bg-gradient-to-r dark:from-slate-800 dark:to-gray-800 py-7 border-y border-amber-100 dark:border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: (globalStats.totalBreweries || 0).toLocaleString("it-IT"), label: "Birrifici", icon: Building2, accent: "text-amber-500 dark:text-amber-400" },
                { value: (globalStats.totalBeers || 0).toLocaleString("it-IT"), label: "Birre", icon: Beer, accent: "text-amber-600 dark:text-orange-400" },
                { value: (globalStats.totalPubs || 0).toLocaleString("it-IT"), label: "Pub", icon: Store, accent: "text-teal-600 dark:text-teal-400" },
                { value: (globalStats.totalUsers || 0).toLocaleString("it-IT"), label: "Appassionati", icon: Users, accent: "text-purple-600 dark:text-purple-400" },
              ].map(({ value, label, icon: Icon, accent }) => (
                <div key={label} className="flex flex-col items-center">
                  <Icon className={`w-5 h-5 mb-2 ${accent}`} />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16 lg:space-y-20">

        {/* ===== QUICK NAV ===== */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/explore/pubs">
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-8 text-center group hover:scale-105 hover:shadow-md dark:hover:shadow-slate-700/30 transition-all duration-300 cursor-pointer shadow-sm">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Trova Pub Vicini</h3>
                <p className="text-gray-500 dark:text-gray-400">Scopri i migliori pub nella tua zona</p>
              </div>
            </Link>
            <Link href="/explore/breweries">
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-8 text-center group hover:scale-105 hover:shadow-md dark:hover:shadow-slate-700/30 transition-all duration-300 cursor-pointer shadow-sm">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <Beer className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Esplora Birrifici</h3>
                <p className="text-gray-500 dark:text-gray-400">Birrifici artigianali da tutto il mondo</p>
              </div>
            </Link>
            <a href="/api/login">
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-8 text-center group hover:scale-105 hover:shadow-md dark:hover:shadow-slate-700/30 transition-all duration-300 cursor-pointer shadow-sm">
                <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl inline-flex mb-4 group-hover:scale-110 transition-transform">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">I Tuoi Preferiti</h3>
                <p className="text-gray-500 dark:text-gray-400">Accedi per gestire i tuoi preferiti</p>
              </div>
            </a>
          </div>
        </section>

        {/* ===== COME FUNZIONA ===== */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Come funziona</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Tutto quello che ti serve per esplorare il mondo del craft beer in tre semplici passi</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Navigation,
                title: "Attiva la posizione",
                desc: "Lascia che Fermenta.to trovi i pub e birrifici più vicini a te, ovunque tu sia nel mondo.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                step: "02",
                icon: Beer,
                title: "Esplora il catalogo",
                desc: "Sfoglia migliaia di birre artigianali, leggi le recensioni della community e scopri nuovi stili.",
                color: "from-amber-500 to-orange-500",
              },
              {
                step: "03",
                icon: Star,
                title: "Recensisci e condividi",
                desc: "Crea il tuo profilo, lascia recensioni e costruisci la tua reputazione da esperto birrofilo.",
                color: "from-purple-500 to-pink-500",
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-slate-700/30 transition-shadow">
                <div className="absolute -top-4 -left-2 text-6xl font-black text-gray-100 dark:text-slate-700 select-none leading-none">{step}</div>
                <div className={`relative p-3 bg-gradient-to-br ${color} rounded-xl inline-flex mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 relative">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed relative">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== GPS BANNER ===== */}
        {locationStatus === 'denied' && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Attiva la posizione per vedere pub e birrifici più vicini a te
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRequestLocation}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900 flex-shrink-0 ml-4">
              <Navigation className="w-4 h-4 mr-1" />
              Attiva GPS
            </Button>
          </div>
        )}
        {locationStatus === 'granted' && (
          <div className="-mt-8 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <Navigation className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">Posizione attiva — risultati ordinati per vicinanza</p>
          </div>
        )}

        {/* ===== MAPPA INTERATTIVA ===== */}
        {locationStatus === 'granted' ? (
          <section>
            <HomepageMap
              pubs={Array.isArray(pubs) ? pubs : []}
              breweries={Array.isArray(breweries) ? breweries : []}
              userLocation={userLocation}
              isLoading={pubsLoading || breweriesLoading}
              onLocate={(loc) => {
                setUserLocation(loc);
                setLocationStatus('granted');
              }}
            />
          </section>
        ) : locationStatus !== 'denied' && (
          <section className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-8 text-center">
            <MapPin className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-3">
              Attiva la posizione per vedere pub e birrifici sulla mappa
            </p>
            <Button size="sm" onClick={handleRequestLocation} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Navigation className="w-4 h-4 mr-2" />
              Attiva GPS
            </Button>
          </section>
        )}

        {/* ===== PUB VICINI ===== */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                <Store className="h-6 w-6 text-white" />
              </div>
              {userLocation ? 'Pub Vicini' : 'Pub Consigliati'}
            </h2>
            <Link href="/explore/pubs">
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                Vedi tutti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {pubsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-slate-800 rounded-xl h-80 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPubs.map((pub: any) => (
                <PubCard key={pub.id} pub={pub} distance={userLocation && pub._distance !== Infinity ? pub._distance : undefined} />
              ))}
            </div>
          )}
        </section>

        {/* ===== BIRRIFICI VICINI ===== */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              {userLocation ? 'Birrifici Vicini' : 'Birrifici in Evidenza'}
            </h2>
            <Link href="/explore/breweries">
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                Vedi tutti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {breweriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-slate-800 rounded-xl h-72 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedBreweries.map((brewery: any) => (
                <BreweryCard key={brewery.id} brewery={brewery} distance={userLocation && brewery._distance !== Infinity ? brewery._distance : undefined} />
              ))}
            </div>
          )}
        </section>

        {/* ===== PRICING TEASER ===== */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Sei un pub o un birrificio?</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Porta la tua attività online e raggiungi migliaia di appassionati del craft beer</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Pub plan teaser */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl shadow-amber-200 dark:shadow-amber-900/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">Piano Pub Pro</p>
                  <p className="text-white/70 text-sm">Per pub e birrerie</p>
                </div>
              </div>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold">€65</span>
                <span className="text-white/70 mb-1 text-sm">/anno</span>
              </div>
              <div className="space-y-2 mb-5">
                {["Taplist digitale illimitata", "Analytics e notifiche push", "QR Code + modalità TV", "Badge profilo verificato"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-white/80 flex-shrink-0" />
                    <span className="text-white/90">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/attiva-pub">
                <Button className="w-full bg-white text-amber-600 hover:bg-amber-50 font-bold shadow-none">
                  <Zap className="w-4 h-4 mr-2" />
                  Registrati
                </Button>
              </Link>
            </div>

            {/* Brewery plan teaser */}
            <div className="bg-gradient-to-br from-slate-800 to-gray-900 dark:from-slate-700 dark:to-gray-800 rounded-2xl p-6 text-white shadow-xl border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">Birrificio Verificato</p>
                  <p className="text-white/50 text-sm">Per produttori artigianali</p>
                </div>
              </div>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-orange-400">€0</span>
                <span className="text-white/50 mb-1 text-sm">/sempre</span>
              </div>
              <div className="space-y-2 mb-5">
                {["Catalogo birre illimitato", "Analytics dettagliate", "Badge verificato ufficiale", "Notifiche push ai follower"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-orange-400/80 flex-shrink-0" />
                    <span className="text-white/80">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/prezzi">
                <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white font-bold">
                  <Building2 className="w-4 h-4 mr-2" />
                  Scopri come funziona
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link href="/prezzi">
              <Button variant="ghost" className="text-amber-600 dark:text-amber-400 font-semibold">
                Confronta tutti i piani <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ===== CTA ISCRIZIONE ===== */}
        <section>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-slate-100 dark:from-slate-800 dark:via-gray-900 dark:to-slate-900 p-10 lg:p-16 text-center border border-amber-100 dark:border-white/5">
            <div className="absolute top-0 left-0 w-72 h-72 bg-amber-400/15 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-400/15 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium mb-6 border border-amber-500/20 dark:border-amber-500/30">
                <Globe className="w-3.5 h-3.5" />
                Unisciti alla community globale
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Diventa parte del<br />
                <span className="text-amber-500 dark:text-amber-400">movimento craft beer</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-lg mx-auto">
                Recensisci birre, scopri pub, segui i tuoi birrifici preferiti e connettiti con appassionati da tutto il mondo.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/api/login">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold shadow-xl px-10 border-0">
                    <Users className="mr-2 w-5 h-5" />
                    Crea il tuo account gratis
                  </Button>
                </a>
                <Link href="/explore/breweries">
                  <Button size="lg" className="bg-gray-900/8 hover:bg-gray-900/15 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold px-8 border border-gray-900/15 dark:border-white/20 backdrop-blur-sm">
                    <Award className="mr-2 w-5 h-5" />
                    Scopri i birrifici
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
