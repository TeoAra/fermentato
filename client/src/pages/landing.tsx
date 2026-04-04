import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Beer, MapPin, Store, Users, Navigation,
  ChevronRight, Building2, Search, CheckCircle2,
  Crown, Shield, ArrowRight, Zap, Sparkles
} from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import HomepageMap from "@/components/homepage-map";

function useCountUp(target: number, duration = 1400, startDelay = 300) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  const startValue = useRef(0);
  const displayValue = useRef(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    startValue.current = prevTarget.current === 0 ? 0 : displayValue.current;
    prevTarget.current = target;
    if (target === 0) { setValue(0); return; }
    if (typeof window === 'undefined') { setValue(target); return; }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setValue(target); return; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const id = setTimeout(() => {
      const from = startValue.current;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        const next = Math.round(from + (target - from) * e);
        displayValue.current = next;
        setValue(next);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      clearTimeout(id);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, startDelay]);
  return value;
}

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, className: `reveal-section${visible ? ' is-visible' : ''}` };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  const animBreweries = useCountUp(totalBreweries, 1400, 450);
  const animPubs = useCountUp(totalPubs, 1400, 550);
  const animBeers = useCountUp(totalBeers, 1400, 650);

  const valuePropsReveal = useScrollReveal();
  const mapReveal = useScrollReveal();
  const pubsReveal = useScrollReveal();
  const breweriesReveal = useScrollReveal();
  const businessReveal = useScrollReveal();

  return (
    <div className="min-h-screen bg-background slide-up">
      <Helmet>
        <title>Fermenta.to — La community italiana della birra artigianale</title>
        <meta name="description" content="Iscriviti a Fermenta.to, la piattaforma per chi ama la birra artigianale. Trova pub e birrifici, assaggia, recensisci e condividi con la community." />
        <meta property="og:title" content="Fermenta.to — La community italiana della birra artigianale" />
        <meta property="og:description" content="Iscriviti a Fermenta.to, la piattaforma per chi ama la birra artigianale. Trova pub e birrifici, assaggia, recensisci e condividi con la community." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/" />
        <meta property="og:site_name" content="Fermenta.to" />
        <meta property="og:image" content="https://fermenta.to/logo-full.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://fermenta.to/" />
      </Helmet>

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(247,113,4,0.07),transparent)]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-12 lg:pb-32 text-center">

          {/* Eyebrow pill */}
          <div
            className="slide-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/15 border border-primary/20 text-primary text-sm font-semibold mb-8"
            style={{ animationDelay: '0ms' }}
          >
            <Sparkles className="w-4 h-4" />
            Il tuo punto di riferimento sulla birra artigianale
          </div>

          {/* Headline — the most important line on the page */}
          <h1
            className="slide-up display-serif text-5xl sm:text-6xl lg:text-7xl font-black text-stone-900 dark:text-white mb-6 leading-[1.05]"
            style={{ animationDelay: '80ms' }}
          >
            Trova la birra perfetta.<br />
            <span className="text-primary">Sempre vicina a te.</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="slide-up text-xl text-stone-500 dark:text-stone-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Fermenta.to ti connette a <strong className="text-stone-700 dark:text-stone-300">pub artigianali</strong>,{" "}
            <strong className="text-stone-700 dark:text-stone-300">birrifici da tutto il mondo</strong> e{" "}
            <strong className="text-stone-700 dark:text-stone-300">oltre {totalBeers > 0 ? (totalBeers / 1000).toFixed(0) + "k" : "1M"} birre</strong> — tutto in un'unica app gratuita.
          </p>

          {/* CTA group — ONE primary, one ghost */}
          <div
            className="slide-up flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
            style={{ animationDelay: '240ms' }}
          >
            <a href="/api/login">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-bold rounded-2xl text-white border-0 shadow-xl shadow-orange-200/50 dark:shadow-orange-900/30 active:scale-[0.97] transition-transform"
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
                className="h-14 px-8 text-base font-semibold rounded-2xl text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-white/5 backdrop-blur-sm active:scale-[0.97] transition-transform"
              >
                <Search className="mr-2 w-5 h-5" />
                Esplora senza account
              </Button>
            </Link>
          </div>

          {/* Live stats pills — animated count-up */}
          {globalStats && (
            <div
              className="slide-up flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: '340ms' }}
            >
              {[
                { icon: Building2, val: animBreweries.toLocaleString("it-IT"), label: "birrifici" },
                { icon: Store, val: animPubs.toLocaleString("it-IT"), label: "pub" },
                { icon: Beer, val: (() => { if (!animBeers) return "—"; if (animBeers < 1000) return animBeers.toString(); const k = Math.round(animBeers / 100) / 10; return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "k"; })(), label: "birre" },
              ].map(({ icon: Icon, val, label }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/8 rounded-full border border-stone-100 dark:border-stone-800 shadow-sm tabular-nums">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-bold text-stone-900 dark:text-white text-sm min-w-[2.5rem] text-right">{val}</span>
                  <span className="text-stone-400 dark:text-stone-500 text-sm">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smooth fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-background" />
      </section>

      {/* ─── SOCIAL PROOF BAR ────────────────────────────────────────────── */}
      <section className="border-y border-stone-100 dark:border-stone-800 bg-white/50 dark:bg-white/3 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> 100% gratuito per gli utenti
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Navigation className="w-4 h-4 text-primary" /> Geolocalizzazione in tempo reale
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4 text-amber-500" /> Birrifici da tutto il mondo
          </span>
          <span className="hidden sm:block text-stone-200 dark:text-stone-700">|</span>
          <span className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-blue-500" /> Dati verificati dalla community
          </span>
        </div>
      </section>

      {/* ─── VALUE PROPS ─────────────────────────────────────────────────── */}
      <section ref={valuePropsReveal.ref} className={`${valuePropsReveal.className} py-20 lg:py-28`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Perché Fermenta.to</p>
            <h2 className="display-serif text-4xl lg:text-5xl font-black text-stone-900 dark:text-white mb-4 leading-tight">
              Tutto il craft beer,<br className="hidden sm:block" /> in un'unica app
            </h2>
            <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-lg">
              Che tu sia un appassionato, un gestore di pub o un birrificio — Fermenta.to ha qualcosa per te.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🗺️",
                title: "Trova il pub giusto in pochi secondi",
                desc: "Geolocalizzazione in tempo reale con taplist aggiornata e orari. Sai già cosa berrai prima di uscire di casa.",
                cta: "Cerca pub vicini",
                href: "/explore/pubs",
                accent: "bg-orange-50 dark:bg-orange-900/15 border-orange-100 dark:border-orange-900/30",
                ctaClass: "text-primary",
              },
              {
                emoji: "🍺",
                title: "Un catalogo vastissimo di birre",
                desc: "Stile, ABV, IBU, birrificio di origine e disponibilità locale. Migliaia di etichette da esplorare e scoprire.",
                cta: "Esplora il catalogo",
                href: "/search",
                accent: "bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-900/30",
                ctaClass: "text-amber-600 dark:text-amber-400",
              },
              {
                emoji: "🏭",
                title: "Birrifici da tutto il mondo",
                desc: "Oltre 50.000 birrifici mappati in tutto il mondo. Visita i più vicini, segui le uscite stagionali e scopri nuovi produttori.",
                cta: "Esplora birrifici",
                href: "/explore/breweries",
                accent: "bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700",
                ctaClass: "text-stone-700 dark:text-stone-300",
              },
            ].map((card, i) => (
              <Link key={card.title} href={card.href}>
                <div
                  className={`interactive-card rounded-3xl p-8 border ${card.accent} flex flex-col h-full group`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="text-5xl mb-5">{card.emoji}</div>
                  <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-3 leading-snug">{card.title}</h3>
                  <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed flex-1 mb-6">{card.desc}</p>
                  <span className={`flex items-center gap-1.5 text-sm font-bold ${card.ctaClass}`}>
                    {card.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAP + GPS ───────────────────────────────────────────────────── */}
      <section ref={mapReveal.ref} className={`${mapReveal.className} py-6 pb-20`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
                {locationStatus === 'granted' ? '📍 La tua zona' : '🗺️ Esplora la mappa'}
              </p>
              <h2 className="display-serif text-3xl lg:text-4xl font-black text-stone-900 dark:text-white">
                {locationStatus === 'granted' ? 'Vicino a te adesso' : 'Pub e birrifici nel mondo'}
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
      <section ref={pubsReveal.ref} className={`${pubsReveal.className} py-6 pb-20 bg-white/40 dark:bg-white/2`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Locali</p>
              <h2 className="display-serif text-3xl font-black text-stone-900 dark:text-white">
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
      <section ref={breweriesReveal.ref} className={`${breweriesReveal.className} py-6 pb-20`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Produttori</p>
              <h2 className="display-serif text-3xl font-black text-stone-900 dark:text-white">
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

      {/* ─── FOR BUSINESS ────────────────────────────────────────────────── */}
      <section ref={businessReveal.ref} className={`${businessReveal.className} py-20 lg:py-28`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Per le attività</p>
            <h2 className="display-serif text-4xl font-black text-stone-900 dark:text-white mb-4">
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

            {/* Brewery plan — free */}
            <div className="rounded-3xl p-8 text-white shadow-xl border border-stone-700 flex flex-col"
              style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)" }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-xl">Birrificio Verificato</p>
                    <p className="text-white/40 text-sm">Per produttori artigianali</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                  GRATUITO
                </span>
              </div>
              <div className="mb-2">
                <span className="text-5xl font-black">€0</span>
              </div>
              <p className="text-white/40 text-xs mb-6">Sempre gratuito per i birrifici</p>
              <div className="space-y-2.5 mb-5 flex-1">
                {[
                  "Profilo birrificio verificato e visibile in mappa",
                  "Catalogo completo delle tue birre e stili",
                  "Link diretto al tuo sito o shop online",
                  "Analytics su visualizzazioni e interesse",
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-white/70">{f}</span>
                  </div>
                ))}
              </div>
              {/* Brewpub note */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-6">
                <p className="text-xs font-black text-amber-400 uppercase tracking-wider mb-1.5">🍻 Sei un brewpub?</p>
                <p className="text-white/60 text-xs leading-relaxed">
                  Se produci e somministri, ottieni accesso a <strong className="text-white/80">entrambi i pannelli</strong> — birrificio verificato + gestione pub — al solo costo del Piano Pub Pro. Nessun extra.
                </p>
              </div>
              <Link href="/prezzi">
                <Button className="w-full h-12 rounded-2xl font-bold text-base border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary shadow-none">
                  <Building2 className="w-4 h-4 mr-2" />
                  Registra il tuo birrificio gratis
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Festival Mode — full-width banner below both cards ── */}
          <div className="mt-6 rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-0">
              <div className="p-8">
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">🎪 Festival Mode</p>
                <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">
                  Porta Fermenta.to alle tue fiere ed eventi
                </h3>
                <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed max-w-xl mb-4">
                  Attiva la modalità festival per il tuo evento e trasforma il tuo stand in un punto di controllo live: i visitatori scansionano il QR, tracciano gli assaggi in tempo reale e tu gestisci code e comunicazioni direttamente dall'app.
                </p>
                <Link href="/festival">
                  <Button size="sm" className="rounded-xl font-bold text-white border-0"
                    style={{ background: "linear-gradient(135deg,#F77104,#f5a623)" }}>
                    Scopri Festival Mode
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="hidden md:flex flex-col items-center justify-center px-10 py-8 bg-stone-50 dark:bg-stone-800/60 border-l border-stone-100 dark:border-stone-700 h-full gap-2 min-w-[200px]">
                <div className="text-5xl mb-1">🎪</div>
                <span className="text-3xl font-black text-stone-900 dark:text-white">€50</span>
                <span className="text-xs text-stone-400 dark:text-stone-500 text-center">una tantum<br />per evento</span>
              </div>
            </div>
          </div>
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
              <h2 className="display-serif text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
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
