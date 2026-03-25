import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Beer, MapPin, Store, Users, Navigation, Star,
  ChevronRight, Building2, Search, CheckCircle2,
  Crown, Shield, ArrowRight, Zap, Sparkles, TrendingUp, QrCode
} from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import HomepageMap from "@/components/homepage-map";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TESTIMONIALS = [
  {
    quote: "Finalmente un'app che capisce il craft beer italiano. Trovo sempre qualcosa di nuovo vicino a me.",
    name: "Luca M.", role: "Appassionato craft", city: "Milano", rating: 5, avatar: "LM",
  },
  {
    quote: "Ho triplicato le visite al pub da quando siamo su Fermenta.to. I clienti arrivano già informati sulla taplist.",
    name: "Giulia R.", role: "Pub Owner · Roma", city: "Roma", rating: 5, avatar: "GR",
  },
  {
    quote: "Come birrificio abbiamo guadagnato visibilità nazionale in poche settimane. Lo strumento che mancava.",
    name: "Marco B.", role: "Brewery Owner", city: "Torino", rating: 5, avatar: "MB",
  },
];

export default function Landing() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('granted'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"] });

  const { data: breweriesFallback } = useQuery({
    queryKey: ["/api/breweries", "landing-fallback"],
    queryFn: () => fetch("/api/breweries?random=true&limit=4").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: breweriesNearby, isLoading: breweriesNearbyLoading } = useQuery({
    queryKey: ["/api/breweries/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: () => fetch(`/api/breweries/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&limit=4`).then(r => r.json()),
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
  });

  const { data: breweriesForMap } = useQuery({
    queryKey: ["/api/breweries/nearby", userLocation?.lat, userLocation?.lng, "map"],
    queryFn: () => fetch(`/api/breweries/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&limit=80`).then(r => r.json()),
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalStats } = useQuery<any>({ queryKey: ["/api/stats"] });

  const nearbyHasResults = Array.isArray(breweriesNearby) && breweriesNearby.length > 0;

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 3);
    return [...(pubs as any[])]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude && parseFloat(pub.latitude) !== 0
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 3);
  }, [pubs, userLocation]);

  const sortedBreweries = useMemo(() => {
    if (userLocation && nearbyHasResults) return breweriesNearby as any[];
    return Array.isArray(breweriesFallback) ? breweriesFallback : [];
  }, [userLocation, nearbyHasResults, breweriesNearby, breweriesFallback]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('granted'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const totalBreweries = globalStats?.totalBreweries ?? 0;
  const totalBeers = globalStats?.totalBeers ?? 0;
  const totalPubs = globalStats?.totalPubs ?? 0;

  return (
    <div className="min-h-screen bg-[#FFF8F2] dark:bg-[hsl(25,14%,7%)]">

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(247,113,4,0.12),transparent)] dark:opacity-40" />
          <div
            className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, #F77104 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32 text-center">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/15 border border-primary/20 text-primary text-sm font-semibold mb-8">
            <Sparkles className="w-4 h-4" />
            La piattaforma #1 del craft beer italiano
          </div>

          {/* Headline — the most important line on the page */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-stone-900 dark:text-white mb-6 leading-[1.05] tracking-tight">
            Trova la birra perfetta.<br />
            <span style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Sempre vicina a te.
            </span>
          </h1>

          {/* Sub-headline — explains the 3 things in one sentence */}
          <p className="text-xl text-stone-500 dark:text-stone-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Fermenta.to ti connette a <strong className="text-stone-700 dark:text-stone-300">pub artigianali</strong>,{" "}
            <strong className="text-stone-700 dark:text-stone-300">birrifici italiani</strong> e{" "}
            <strong className="text-stone-700 dark:text-stone-300">oltre {totalBeers > 0 ? (totalBeers / 1000000).toFixed(1) + "M" : "1M"} birre</strong> — tutto in un'unica app gratuita.
          </p>

          {/* CTA group — ONE primary, one ghost */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <a href="/api/login">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-bold rounded-2xl text-white border-0 shadow-xl shadow-orange-200/50 dark:shadow-orange-900/30 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}
              >
                <Users className="mr-2 w-5 h-5" />
                Inizia gratis — è immediato
              </Button>
            </a>
            <Link href="/explore/breweries">
              <Button
                size="lg"
                variant="ghost"
                className="h-14 px-8 text-base font-semibold rounded-2xl text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-white/5 backdrop-blur-sm"
              >
                <Search className="mr-2 w-5 h-5" />
                Esplora senza account
              </Button>
            </Link>
          </div>

          {/* Live stats pills */}
          {totalBreweries > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: Building2, val: totalBreweries.toLocaleString("it-IT"), label: "birrifici" },
                { icon: Store, val: totalPubs.toLocaleString("it-IT"), label: "pub" },
                { icon: Beer, val: totalBeers > 0 ? (totalBeers / 1000).toFixed(0) + "k" : "—", label: "birre" },
              ].map(({ icon: Icon, val, label }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/8 rounded-full border border-stone-100 dark:border-stone-800 shadow-sm">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-bold text-stone-900 dark:text-white text-sm">{val}</span>
                  <span className="text-stone-400 dark:text-stone-500 text-sm">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smooth fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#FFF8F2] dark:to-[hsl(25,14%,7%)]" />
      </section>

      {/* ─── SOCIAL PROOF BAR ────────────────────────────────────────────── */}
      <section className="border-y border-stone-100 dark:border-stone-800 bg-white/50 dark:bg-white/3 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> 100% gratuito per gli utenti
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.8 / 5 media recensioni pub
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Navigation className="w-4 h-4 text-primary" /> Geolocalizzazione in tempo reale
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-blue-500" /> Dati verificati dalla community
          </span>
        </div>
      </section>

      {/* ─── VALUE PROPS ─────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Perché Fermenta.to</p>
            <h2 className="text-4xl lg:text-5xl font-black text-stone-900 dark:text-white mb-4 leading-tight">
              Tutto il craft beer italiano<br className="hidden sm:block" /> in un'unica app
            </h2>
            <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-lg">
              Che tu sia un appassionato, un gestore di pub o un birrificio — Fermenta.to ha qualcosa per te.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🗺️",
                title: "Trova il pub giusto in 10 secondi",
                desc: "Geolocalizzazione in tempo reale con taplist aggiornata, orari e recensioni. Sai già cosa berrai prima di uscire di casa.",
                cta: "Cerca pub vicini",
                href: "/explore/pubs",
                accent: "bg-orange-50 dark:bg-orange-900/15 border-orange-100 dark:border-orange-900/30",
                ctaClass: "text-primary",
              },
              {
                emoji: "🍺",
                title: "Esplora 1M+ di birre artigianali",
                desc: "Il catalogo più completo d'Europa: stile, ABV, IBU, birrificio di origine, disponibilità locale e recensioni della community.",
                cta: "Esplora il catalogo",
                href: "/search",
                accent: "bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-900/30",
                ctaClass: "text-amber-600 dark:text-amber-400",
              },
              {
                emoji: "🏭",
                title: "Scopri i birrifici italiani",
                desc: "Oltre 50.000 birrifici mappati. Visita i più vicini, segui le uscite stagionali e connettiti direttamente con i produttori.",
                cta: "Esplora birrifici",
                href: "/explore/breweries",
                accent: "bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700",
                ctaClass: "text-stone-700 dark:text-stone-300",
              },
            ].map((card) => (
              <div key={card.title} className={`rounded-3xl p-8 border ${card.accent} flex flex-col`}>
                <div className="text-5xl mb-5">{card.emoji}</div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-3 leading-snug">{card.title}</h3>
                <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed flex-1 mb-6">{card.desc}</p>
                <Link href={card.href}>
                  <span className={`flex items-center gap-1.5 text-sm font-bold ${card.ctaClass} group`}>
                    {card.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAP + GPS ───────────────────────────────────────────────────── */}
      <section className="py-6 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
                {locationStatus === 'granted' ? '📍 La tua zona' : '🗺️ Esplora la mappa'}
              </p>
              <h2 className="text-3xl lg:text-4xl font-black text-stone-900 dark:text-white">
                {locationStatus === 'granted' ? 'Vicino a te adesso' : 'Pub e birrifici in Italia'}
              </h2>
            </div>
            {locationStatus !== 'granted' && (
              <Button
                onClick={handleRequestLocation}
                disabled={locationStatus === 'requesting'}
                className="rounded-2xl h-11 px-5 font-bold text-white border-0 shadow-md shadow-orange-200/40"
                style={{ background: "linear-gradient(135deg,#F77104,#f5a623)" }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {locationStatus === 'requesting' ? 'Ricerca...' : 'Attiva GPS'}
              </Button>
            )}
          </div>

          {locationStatus === 'granted' ? (
            <HomepageMap
              pubs={Array.isArray(pubs) ? pubs : []}
              breweries={Array.isArray(breweriesForMap) && breweriesForMap.length > 0 ? breweriesForMap : (Array.isArray(breweriesFallback) ? breweriesFallback : [])}
              userLocation={userLocation}
              isLoading={pubsLoading || breweriesNearbyLoading}
              onLocate={(loc) => { setUserLocation(loc); setLocationStatus('granted'); }}
            />
          ) : (
            <div className="rounded-3xl overflow-hidden border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 h-80 flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-stone-700 dark:text-stone-300 font-semibold mb-1">Attiva la posizione per la mappa live</p>
                <p className="text-stone-400 text-sm">Vedi pub e birrifici in tempo reale attorno a te</p>
              </div>
              <Button
                onClick={handleRequestLocation}
                size="sm"
                className="rounded-xl font-bold text-white border-0"
                style={{ background: "linear-gradient(135deg,#F77104,#f5a623)" }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Attiva GPS
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ─── PUB VICINI ──────────────────────────────────────────────────── */}
      <section className="py-6 pb-20 bg-white/40 dark:bg-white/2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Locali</p>
              <h2 className="text-3xl font-black text-stone-900 dark:text-white">
                {userLocation ? 'Pub vicini a te' : 'Pub consigliati'}
              </h2>
            </div>
            <Link href="/explore/pubs">
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-orange-50 dark:hover:bg-orange-900/20 font-bold rounded-xl">
                Vedi tutti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {pubsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-stone-100 dark:bg-stone-800 rounded-3xl h-80 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPubs.map((pub: any) => (
                <PubCard key={pub.id} pub={pub} distance={userLocation && pub._distance !== Infinity ? pub._distance : undefined} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── BIRRIFICI ───────────────────────────────────────────────────── */}
      <section className="py-6 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Produttori</p>
              <h2 className="text-3xl font-black text-stone-900 dark:text-white">
                {nearbyHasResults ? 'Birrifici vicini' : 'Birrifici in evidenza'}
              </h2>
            </div>
            <Link href="/explore/breweries">
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-orange-50 dark:hover:bg-orange-900/20 font-bold rounded-xl">
                Vedi tutti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {Array.isArray(breweriesFallback) && breweriesFallback.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-stone-100 dark:bg-stone-800 rounded-3xl h-72 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedBreweries.map((brewery: any) => (
                <BreweryCard key={brewery.id} brewery={brewery} beerCount={brewery.beerCount ?? 0}
                  distance={nearbyHasResults && brewery._distance != null && isFinite(brewery._distance) ? brewery._distance : undefined} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white/40 dark:bg-white/2">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Chi usa Fermenta.to</p>
            <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-4">
              Già amato da pub, birrifici<br className="hidden sm:block" /> e appassionati italiani
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white dark:bg-stone-900 rounded-3xl p-7 border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-6 flex-1 text-[15px]">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs text-stone-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR BUSINESS ────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Per le attività</p>
            <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-4">
              Sei un pub o un birrificio?
            </h2>
            <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-lg">
              Porta la tua attività online e raggiungi migliaia di appassionati ogni giorno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Pub plan */}
            <div className="rounded-3xl p-8 text-white shadow-xl shadow-orange-200/50 dark:shadow-orange-900/30 flex flex-col"
              style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 60%, #f5a623 100%)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-xl">Piano Pub Pro</p>
                  <p className="text-white/70 text-sm">Per pub e birrerie</p>
                </div>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-5xl font-black">€65</span>
                <span className="text-white/70 mb-2 text-sm">/anno</span>
              </div>
              <p className="text-white/70 text-xs mb-6">Equivale a meno di 18 centesimi al giorno</p>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  "Taplist digitale illimitata e in tempo reale",
                  "Analytics clienti e notifiche push",
                  "QR Code personalizzato + modalità TV",
                  "Badge profilo verificato con priorità in mappa",
                  "15 giorni di prova gratuita — zero rischi",
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-white/80 flex-shrink-0 mt-0.5" />
                    <span className="text-white/90">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/registra-pub">
                <Button className="w-full h-12 rounded-2xl bg-white text-primary hover:bg-orange-50 font-bold text-base border-0 shadow-none">
                  <Zap className="w-4 h-4 mr-2" />
                  Registra il tuo pub — 15 giorni gratis
                </Button>
              </Link>
            </div>

            {/* Brewery plan */}
            <div className="rounded-3xl p-8 text-white shadow-xl border border-stone-700 flex flex-col"
              style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-black text-xl">Birrificio Verificato</p>
                  <p className="text-white/40 text-sm">Per produttori artigianali</p>
                </div>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-5xl font-black">€95</span>
                <span className="text-white/40 mb-2 text-sm">/anno</span>
              </div>
              <p className="text-white/40 text-xs mb-6">Visibilità nazionale garantita</p>
              <div className="space-y-2.5 mb-8 flex-1">
                {[
                  "Profilo birrificio verificato e prioritario",
                  "Catalogo completo delle tue birre",
                  "Link diretto al tuo e-commerce o shop",
                  "Festival Mode per eventi e degustazioni",
                  "Analytics dettagliate su visualizzazioni",
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-white/70">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/prezzi">
                <Button className="w-full h-12 rounded-2xl font-bold text-base border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary shadow-none">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Scopri il piano birrificio
                </Button>
              </Link>
            </div>
          </div>

          {/* Urgency hint */}
          <p className="text-center text-stone-400 dark:text-stone-500 text-sm mt-6">
            🔥 <strong className="text-stone-600 dark:text-stone-400">Offerta lancio:</strong> i primi 100 pub ottengono il primo anno a <strong className="text-primary">€49</strong> invece di €65
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl p-12 lg:p-16 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative">
              <div className="text-5xl mb-6">🍺</div>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                Inizia a esplorare<br />il craft beer italiano
              </h2>
              <p className="text-white/80 mb-8 text-lg max-w-lg mx-auto">
                Gratuito per sempre per gli appassionati. Registrati in 30 secondi con Google.
              </p>
              <a href="/api/login">
                <Button size="lg" className="h-14 px-10 text-base font-black rounded-2xl bg-white text-primary hover:bg-orange-50 border-0 shadow-xl shadow-black/20">
                  <Users className="mr-2 w-5 h-5" />
                  Accedi con Google — è gratis
                </Button>
              </a>
              <p className="text-white/60 text-xs mt-4">Nessuna carta di credito · Nessuna email di spam</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
