import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Beer, MapPin, Store, Users, Navigation,
  ChevronRight, Building2, Search, CheckCircle2,
  Crown, Shield, ArrowRight, Zap, Sparkles,
  TrendingUp, Flame, Star, Bookmark, ChevronDown
} from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
const HomepageMap = lazy(() => import("@/components/homepage-map"));
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";
import { isIosNative, isNativeApp } from "@/lib/platform";
import NewsStrip from "@/components/news-strip";

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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function Landing() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [showPubs, setShowPubs] = useState(true);
  const [showBreweries, setShowBreweries] = useState(true);
  const [distanceKm, setDistanceKm] = useState(10);
  const [showDistancePicker, setShowDistancePicker] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      setLocationStatus('idle');
      return;
    }
    if (!isGeolocationAvailable()) { setLocationStatus('denied'); return; }
    setLocationStatus('requesting');
    getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 })
      .then((pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('granted'); })
      .catch(() => setLocationStatus('denied'));
  }, []);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"] });

  const { data: breweriesFallback } = useQuery({
    queryKey: ["/api/breweries", "landing-fallback"],
    queryFn: () => fetch("/api/breweries?random=true&limit=12").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: breweriesNearby } = useQuery({
    queryKey: ["/api/breweries/nearby", userLocation?.lat, userLocation?.lng],
    queryFn: () => fetch(`/api/breweries/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&limit=12`).then(r => r.json()),
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
  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({ queryKey: ["/api/beers/popular-styles"], staleTime: 10 * 60 * 1000 });
  const { data: taplistActivity = [] } = useQuery<any[]>({ queryKey: ["/api/home/taplist-activity"], staleTime: 2 * 60 * 1000 });

  const nearbyHasResults = Array.isArray(breweriesNearby) && breweriesNearby.length > 0;

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 6);
    return [...(pubs as any[])]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude && parseFloat(pub.latitude) !== 0
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(pub.latitude), parseFloat(pub.longitude))
          : null,
      }))
      .filter((pub) => pub._distance === null || pub._distance <= distanceKm)
      .sort((a, b) => {
        if (a._distance === null && b._distance === null) return 0;
        if (a._distance === null) return 1;
        if (b._distance === null) return -1;
        return a._distance - b._distance;
      })
      .slice(0, 6);
  }, [pubs, userLocation, distanceKm]);

  const sortedBreweries = useMemo(() => {
    if (userLocation && nearbyHasResults) return breweriesNearby as any[];
    return Array.isArray(breweriesFallback) ? breweriesFallback : [];
  }, [userLocation, nearbyHasResults, breweriesNearby, breweriesFallback]);

  const handleRequestLocation = () => {
    if (!isGeolocationAvailable()) return;
    setLocationStatus('requesting');
    getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then((pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('granted'); })
      .catch(() => setLocationStatus('denied'));
  };

  const totalBreweries = globalStats?.totalBreweries ?? 0;
  const totalBeers = globalStats?.totalBeers ?? 0;
  const totalPubs = globalStats?.totalPubs ?? 0;
  const animBreweries = useCountUp(totalBreweries, 1400, 450);
  const animPubs = useCountUp(totalPubs, 1400, 550);
  const animBeers = useCountUp(totalBeers, 1400, 650);

  const breweryOfDay = useMemo(() => {
    const src = Array.isArray(sortedBreweries) ? sortedBreweries : [];
    const withCover = src.filter((b: any) => b.coverImageUrl || b.logoUrl);
    return withCover[0] ?? src[0] ?? null;
  }, [sortedBreweries]);

  return (
    <div className="min-h-screen bg-background">
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
        <script type="application/ld+json">{JSON.stringify([{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "Cos'è Fermenta.to?", "acceptedAnswer": { "@type": "Answer", "text": "Fermenta.to è la piattaforma italiana dedicata alla birra artigianale." } },
            { "@type": "Question", "name": "Come posso trovare pub con birre artigianali vicino a me?", "acceptedAnswer": { "@type": "Answer", "text": "Su Fermenta.to puoi usare la sezione 'Esplora Pub' per trovare i locali craft beer più vicini." } },
          ]
        }])}</script>
      </Helmet>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — mappa + chip + heading + CTA (stile homepage loggata)
      ═══════════════════════════════════════════════════════════════ */}
      <PageContainer as="main" variant="wide" className="pt-4 pb-8">

        {/* Map card */}
        <div className="relative rounded-3xl overflow-hidden bg-stone-200 dark:bg-[#0B0D10] shadow-card h-[300px] lg:h-[260px]" style={{ maxHeight: 300 }}>
          <div className="absolute inset-0 overflow-hidden" style={{ maxHeight: '100%' }}>
            <Suspense fallback={<div className="w-full h-full bg-stone-200 dark:bg-[#1A1D24]" />}>
              <HomepageMap
                pubs={Array.isArray(pubs) ? pubs as any[] : []}
                breweries={(() => {
                  const src = Array.isArray(breweriesForMap) && breweriesForMap.length > 0
                    ? breweriesForMap
                    : (Array.isArray(breweriesFallback) ? breweriesFallback : []);
                  return (src as any[]).filter((b: any) => b.latitude && b.longitude);
                })()}
                userLocation={userLocation}
                isLoading={pubsLoading}
                showPubs={showPubs}
                showBreweries={showBreweries}
                distanceKm={userLocation ? distanceKm : undefined}
                onLocate={(loc) => { setUserLocation(loc); setLocationStatus('granted'); }}
                showControls={false}
                fixedHeight={300}
              />
            </Suspense>
          </div>

          {/* Location chip */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            {locationStatus === 'granted' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-white/95 dark:bg-card/95 backdrop-blur-md text-primary rounded-full px-2.5 py-1.5 shadow-card-sm border border-primary/15">
                <MapPin className="w-3 h-3" /> Vicino a te
              </span>
            )}
            {locationStatus === 'requesting' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-amber-500 text-white rounded-full px-2.5 py-1.5 animate-pulse shadow-card-sm">
                <Navigation className="w-3 h-3" /> Ricerca GPS…
              </span>
            )}
          </div>
        </div>

        {/* Filter chips below map */}
        <div className="flex items-center gap-2 mt-3 pb-0.5">
          {/* Distance picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDistancePicker(v => !v)}
              className="tap-scale flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-2 text-[13px] font-bold text-foreground shadow-card-sm whitespace-nowrap"
            >
              {distanceKm} km <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showDistancePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDistancePicker(false)} />
                <div className="absolute top-11 left-0 z-50 bg-card border border-border rounded-2xl shadow-card overflow-hidden min-w-[110px]">
                  {[1, 5, 10, 15, 20, 30, 50, 100].map(d => (
                    <button
                      key={d}
                      onClick={() => { setDistanceKm(d); setShowDistancePicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${distanceKm === d ? 'text-primary bg-orange-50 dark:bg-orange-900/20' : 'text-foreground hover:bg-muted'}`}
                    >
                      {d} km
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <button
              onClick={() => setShowPubs(v => !v)}
              className={`tap-scale flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold border transition-colors whitespace-nowrap shadow-card-sm ${
                showPubs ? 'bg-primary border-primary text-white' : 'bg-card border-border text-foreground'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Pub
            </button>
            <button
              onClick={() => setShowBreweries(v => !v)}
              className={`tap-scale flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold border transition-colors whitespace-nowrap shadow-card-sm ${
                showBreweries ? 'bg-amber-500 border-amber-500 text-white' : 'bg-card border-border text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Birrifici
            </button>
            <Link href="/search" className="flex-shrink-0">
              <button className="tap-scale w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full shadow-card-sm text-foreground" aria-label="Cerca birre">
                <Search className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Content block — heading + CTAs */}
        <div className="mt-4">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-foreground leading-[1.15] tracking-tight">
            Trova la birra perfetta.<br />
            <span className="text-primary">Sempre vicina a te.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Pub, birrifici e{" "}
            {totalBeers > 0 ? (
              <strong className="text-foreground">{(totalBeers / 1000).toFixed(0)}k birre</strong>
            ) : (
              <strong className="text-foreground">migliaia di birre</strong>
            )}{" "}
            — tutto in un'unica app gratuita.
          </p>

          {/* CTAs */}
          <div className="flex gap-2.5 mt-4">
            <Link href="/login" className="flex-1">
              <button className="tap-scale btn-orange-glow w-full flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-card">
                <Users className="w-4 h-4" />
                Inizia gratis
              </button>
            </Link>
            <Link href="/explore/pubs" className="flex-1">
              <button className="tap-scale w-full flex items-center justify-center gap-1.5 bg-card text-foreground text-sm font-bold px-4 py-3 rounded-2xl border-2 border-primary/25 shadow-card-sm">
                <Store className="w-4 h-4 text-primary" />
                Esplora pub
              </button>
            </Link>
          </div>

          {/* GPS opt-in */}
          {locationStatus !== 'granted' && locationStatus !== 'requesting' && (
            <button
              onClick={handleRequestLocation}
              className="tap-scale w-full mt-2.5 flex items-center justify-center gap-1.5 text-primary text-[13px] font-bold px-4 py-2 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-primary/15"
            >
              <Navigation className="w-3.5 h-3.5" />
              Usa la mia posizione
            </button>
          )}

          {/* NewsStrip */}
          <div className="mt-5">
            <NewsStrip variant="hero" limit={6} />
          </div>
        </div>

        {/* ─── STATS ROW ────────────────────────────────────────── */}
        {globalStats && (
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: Building2, val: animBreweries.toLocaleString("it-IT"), label: "Birrifici", color: "bg-amber-100 dark:bg-amber-900/25", iconColor: "text-amber-500" },
              { icon: Store, val: animPubs.toLocaleString("it-IT"), label: "Pub", color: "bg-orange-100 dark:bg-orange-900/25", iconColor: "text-primary" },
              { icon: Beer, val: (() => {
                if (!animBeers) return "—";
                if (animBeers < 1000) return animBeers.toString();
                const k = Math.round(animBeers / 100) / 10;
                return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "k";
              })(), label: "Birre", color: "bg-blue-100 dark:bg-blue-900/25", iconColor: "text-blue-500" },
            ].map(({ icon: Icon, val, label, color, iconColor }) => (
              <div key={label} className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center">
                <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-4.5 h-4.5 ${iconColor}`} style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none tabular-nums">{val}</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── BIRRIFICIO IN EVIDENZA ────────────────────────────── */}
        {breweryOfDay && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Consigliato per te
              </h2>
              <Link href="/explore/breweries">
                <button className="text-sm font-semibold text-primary">Vedi tutti →</button>
              </Link>
            </div>
            <Link href={`/brewery/${breweryOfDay.id}`}>
              <div className="tap-scale relative rounded-3xl overflow-hidden cursor-pointer shadow-card" style={{ height: '168px' }}>
                {(breweryOfDay.coverImageUrl || breweryOfDay.logoUrl) ? (
                  <img src={breweryOfDay.coverImageUrl || breweryOfDay.logoUrl} alt={breweryOfDay.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a0800 0%, #3d1200 50%, #7a2800 100%)' }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-300 mb-1.5 uppercase tracking-wide">
                    <Star className="w-3 h-3" fill="currentColor" /> In evidenza
                  </span>
                  <p className="text-white/65 text-[11px] font-medium mb-0.5">Birrificio del giorno</p>
                  <p className="text-white text-[18px] font-extrabold leading-tight">{breweryOfDay.name}</p>
                  {breweryOfDay.location && (
                    <p className="text-white/60 text-[11px] mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{breweryOfDay.location}
                    </p>
                  )}
                  <button className="mt-3 self-start text-[12px] font-bold bg-white text-stone-900 rounded-full px-4 py-1.5 shadow-md">
                    Scopri il birrificio →
                  </button>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ─── ORA IN SPINA ─────────────────────────────────────── */}
        {(taplistActivity as any[]).length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-primary" />
                Ora in spina vicino a te
              </h2>
              <Link href="/explore/pubs">
                <button className="text-sm font-semibold text-primary">Vedi tutto →</button>
              </Link>
            </div>
            <div className="flex gap-3 -mx-4 px-4 overflow-x-auto scrollbar-hide pb-2">
              {(taplistActivity as any[]).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="tap-scale flex-shrink-0 w-[148px] cursor-pointer">
                    <div className="relative h-[112px] rounded-2xl overflow-hidden mb-2 bg-muted shadow-card-sm">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-[#c95000] flex items-center justify-center">
                          <Beer className="w-8 h-8 text-white/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      {item.beer_abv && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/45 backdrop-blur-sm rounded-full px-2 py-0.5">
                          {item.beer_abv}%
                        </span>
                      )}
                      <span className={`absolute top-2 left-2 text-[9px] font-extrabold text-white rounded-full px-1.5 py-0.5 uppercase ${item.tap_type === 'pompa' ? 'bg-violet-600' : 'bg-primary'}`}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{item.beer_name}</p>
                    {item.beer_style && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.beer_style}</p>}
                    <div className="flex items-center gap-1 mt-1.5">
                      {item.pub_logo
                        ? <img src={item.pub_logo} alt={item.pub_name} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                        : <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                      <p className="text-[10px] text-muted-foreground truncate">{item.pub_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── PUB LIST ─────────────────────────────────────────── */}
        {sortedPubs.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                {userLocation ? 'Pub vicini a te' : 'Pub consigliati'}
              </h2>
              <Link href="/explore/pubs">
                <button className="text-sm font-semibold text-primary">Vedi tutti →</button>
              </Link>
            </div>
            {pubsLoading ? (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/[0.06] overflow-hidden">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 border-b border-border last:border-0 animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {sortedPubs.slice(0, 5).map((pub: any, idx: number) => {
                  const tap = (taplistActivity as any[]).find((t: any) => t.pub_id === pub.id);
                  const isLast = idx === Math.min(4, sortedPubs.length - 1);
                  return (
                    <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                      <div className={`tap-scale flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 ${!isLast ? 'border-b border-border' : ''}`}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                          {pub.logoUrl
                            ? <img src={pub.logoUrl} alt={pub.name} className="w-10 h-10 object-cover" />
                            : <Store className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">{pub.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {pub.city || pub.address?.split(',')[0]}
                            {pub._distance != null ? ` · ${formatDist(pub._distance)}` : ''}
                          </p>
                        </div>
                        {tap ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-[11px] font-medium text-foreground truncate max-w-[80px]">{tap.beer_name}</p>
                              <p className="text-[10px] text-muted-foreground">{tap.beer_style}</p>
                            </div>
                            {tap.beer_image
                              ? <img src={tap.beer_image} alt={tap.beer_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                              : <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0"><Beer className="w-4 h-4 text-primary" /></div>
                            }
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ─── TREND STILI ──────────────────────────────────────── */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <section className="mt-6">
            <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Stili di tendenza
                </h3>
                <Link href="/explore/beers">
                  <span className="text-[11px] font-semibold text-primary">Vedi tutto →</span>
                </Link>
              </div>
              <div className="space-y-2.5">
                {(() => {
                  const top = popularStyles.slice(0, 5);
                  const max = top[0]?.count ?? 1;
                  return top.map((s, i) => (
                    <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span className={`text-[10px] font-bold w-3 text-right flex-shrink-0 ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[11px] font-medium text-foreground truncate">{s.style}</p>
                            <p className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">{Math.round((s.count / max) * 100)}%</p>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.round((s.count / max) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>
          </section>
        )}

        {/* ─── BIRRIFICI ────────────────────────────────────────── */}
        {sortedBreweries.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-amber-500 flex-shrink-0" />
                {nearbyHasResults ? 'Birrifici vicini' : 'Birrifici in evidenza'}
              </h2>
              <Link href="/explore/breweries">
                <button className="text-sm font-semibold text-primary">Vedi tutti →</button>
              </Link>
            </div>
            <div className="flex gap-3 -mx-4 px-4 overflow-x-auto scrollbar-hide pb-2">
              {sortedBreweries.slice(0, 8).map((brewery: any) => (
                <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                  <div className="tap-scale flex-shrink-0 w-[140px] cursor-pointer">
                    <div className="relative h-[100px] rounded-2xl overflow-hidden mb-2 bg-muted shadow-card-sm">
                      {brewery.coverImageUrl || brewery.logoUrl ? (
                        <img src={brewery.coverImageUrl || brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-white/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <p className="text-[13px] font-semibold text-foreground line-clamp-1 leading-tight">{brewery.name}</p>
                    {brewery.location && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{brewery.location}</p>}
                    {brewery._distance != null && isFinite(brewery._distance) && (
                      <p className="text-[10px] text-primary font-semibold mt-0.5">{formatDist(brewery._distance)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      {/* ─── PERCHÉ FERMENTA ─────────────────────────────────────────────── */}
      <div className="border-t border-border mt-4">
        <PageContainer variant="wide" className="py-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Perché Fermenta.to</p>
            <h2 className="text-[22px] font-extrabold text-foreground leading-tight">
              Tutto il craft beer, in un'unica app
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: MapPin, emoji: "🗺️", title: "Trova il pub giusto", desc: "Taplist live, orari e geolocalizzazione in tempo reale.", cta: "Cerca pub", href: "/explore/pubs", accent: "bg-orange-100 dark:bg-orange-900/25 text-primary" },
              { icon: Beer, emoji: "🍺", title: "Catalogo vastissimo", desc: "Stile, ABV, IBU e disponibilità locale. Migliaia di etichette.", cta: "Esplora birre", href: "/search", accent: "bg-amber-100 dark:bg-amber-900/25 text-amber-500" },
              { icon: Building2, emoji: "🏭", title: "Birrifici dal mondo", desc: "Oltre 50.000 birrifici mappati — vicini e lontani.", cta: "Esplora birrifici", href: "/explore/breweries", accent: "bg-stone-100 dark:bg-stone-800 text-stone-500" },
            ].map((card) => (
              <Link key={card.title} href={card.href}>
                <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-white/80 dark:hover:bg-white/[0.06]">
                  <div className={`w-12 h-12 rounded-2xl ${card.accent} flex items-center justify-center flex-shrink-0 text-2xl`}>
                    {card.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground">{card.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-primary flex-shrink-0">
                    {card.cta} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Social proof mini-row */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { icon: CheckCircle2, label: "100% gratuito per gli utenti", color: "text-green-500" },
              { icon: Shield, label: "Dati verificati dalla community", color: "text-blue-500" },
              { icon: Sparkles, label: "Aggiornato in tempo reale", color: "text-amber-500" },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 border border-border">
                <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
              </span>
            ))}
          </div>
        </PageContainer>
      </div>

      {/* ─── PER LE ATTIVITÀ ─────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <PageContainer variant="wide" className="py-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Per le attività</p>
            <h2 className="text-[22px] font-extrabold text-foreground leading-tight">Sei un pub o un birrificio?</h2>
            <p className="text-sm text-muted-foreground mt-1">Porta la tua attività online e raggiungi migliaia di appassionati.</p>
          </div>

          <div className="space-y-3">
            {/* Pub Pro — nascosto su iOS */}
            {!isIosNative && (
              <div className="rounded-2xl p-5 text-white shadow-card overflow-hidden"
                style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 60%, #f5a623 100%)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-[16px]">Piano Pub Pro</p>
                    <p className="text-white/70 text-[12px]">Per pub e birrerie · €65/anno</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  {["Taplist digitale illimitata in tempo reale", "Analytics clienti e notifiche push", "QR Code + modalità TV · 15 giorni gratis"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-[12px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                      <span className="text-white/90">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/registra-pub">
                  <button className="tap-scale w-full bg-white text-primary font-bold text-sm py-2.5 rounded-xl shadow-sm">
                    <Zap className="w-4 h-4 inline mr-1.5" />
                    Registra il tuo pub — 15 giorni gratis
                  </button>
                </Link>
              </div>
            )}

            {/* Brewery — free */}
            <div className="rounded-2xl p-5 border border-border bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/25 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-[16px] text-foreground">Birrificio Verificato</p>
                    <p className="text-muted-foreground text-[12px]">Per produttori artigianali</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/25 flex-shrink-0">GRATIS</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {["Profilo verificato e visibile in mappa", "Catalogo birre con stile e ABV", "Analytics su visualizzazioni e interesse"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-[12px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-foreground/80">{f}</span>
                  </div>
                ))}
              </div>
              {!isIosNative && (
                <Link href="/prezzi">
                  <button className="tap-scale w-full bg-primary/10 dark:bg-primary/15 text-primary font-bold text-sm py-2.5 rounded-xl border border-primary/20">
                    <Building2 className="w-4 h-4 inline mr-1.5" />
                    Registra il tuo birrificio gratis
                  </button>
                </Link>
              )}
            </div>

            {/* Festival Mode — nascosto su iOS */}
            {!isIosNative && (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center gap-4">
                <div className="text-3xl flex-shrink-0">🎪</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Festival Mode</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Taplist live per fiere ed eventi · €50 una tantum</p>
                </div>
                <Link href="/festival" className="flex-shrink-0">
                  <button className="tap-scale flex items-center gap-1 text-[12px] font-bold text-primary">
                    Scopri <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </PageContainer>
      </div>

      {/* ─── DOWNLOAD APP ────────────────────────────────────────────────── */}
      {!isNativeApp && (
        <div className="border-t border-border">
          <PageContainer variant="wide" className="py-8">
            <div className="text-center mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">App gratuita</p>
              <h2 className="text-[22px] font-extrabold text-foreground leading-tight">Scarica Fermenta.to</h2>
              <p className="text-sm text-muted-foreground mt-1">Disponibile su iOS e Android</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* App Store */}
              <a
                href="https://apps.apple.com/it/app/fermenta-to/id6769051632"
                target="_blank" rel="noopener noreferrer"
                className="tap-scale flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-black text-white shadow-lg w-full sm:w-auto justify-center sm:justify-start"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white flex-shrink-0">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/70 leading-none mb-0.5">Scarica su</p>
                  <p className="text-[15px] font-black leading-none">App Store</p>
                </div>
              </a>
              {/* Google Play */}
              <a
                href="https://play.google.com/store/apps/details?id=to.fermenta.app"
                target="_blank" rel="noopener noreferrer"
                className="tap-scale flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#01875f] text-white shadow-lg w-full sm:w-auto justify-center sm:justify-start"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white flex-shrink-0">
                  <path d="M3.18 23.76c.33.18.7.2 1.05.06L16.42 11.5l-3.28-3.28L3.18 23.76zm15.2-13.3-3.07-1.77-3.42 3.42 3.42 3.42 3.1-1.79c.88-.51.88-1.77-.03-2.28zm-14.7-8.2c-.35-.14-.72-.12-1.05.06L16.42 11.3l-3.28-3.28L3.68 2.26zm0 0"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/70 leading-none mb-0.5">Scarica su</p>
                  <p className="text-[15px] font-black leading-none">Google Play</p>
                </div>
              </a>
            </div>
          </PageContainer>
        </div>
      )}

      {/* ─── FINAL CTA ───────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <PageContainer variant="wide" className="py-8">
          <div className="rounded-3xl p-8 relative overflow-hidden text-center"
            style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative">
              <div className="text-4xl mb-4">🍺</div>
              <h2 className="text-[22px] font-extrabold text-white mb-2 leading-tight">
                Inizia a esplorare il craft beer
              </h2>
              <p className="text-white/80 mb-5 text-sm">Gratuito per sempre. Registrati in 30 secondi con Google.</p>
              <Link href="/login">
                <button className="tap-scale inline-flex items-center gap-2 bg-white text-primary font-black text-sm px-8 py-3 rounded-2xl shadow-xl shadow-black/20">
                  <Users className="w-4 h-4" />
                  Registrati — è gratis
                </button>
              </Link>
              <p className="text-white/60 text-xs mt-3">Nessuna carta di credito · Nessuna email di spam</p>
            </div>
          </div>
        </PageContainer>
      </div>

      <Footer />
    </div>
  );
}
