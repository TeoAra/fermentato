import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  Beer, MapPin, Heart, Store, TrendingUp, Navigation, Building2,
  Megaphone, Newspaper, Rocket, Users, Droplets, Search, ChevronRight,
} from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import HomepageMap from "@/components/homepage-map";
import { Button } from "@/components/ui/button";

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

const STYLE_CHIPS = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison", "Porter", "Pale Ale"];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [heroSearch, setHeroSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('granted'); },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('granted'); },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
  };

  const handleStyleChip = (style: string) => {
    navigate(`/explore/beers?style=${encodeURIComponent(style)}`);
  };

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient]);
  const { isPulling, isRefreshing } = usePullToRefresh(handleRefresh);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"], staleTime: 5 * 60 * 1000 });
  const { data: breweriesRaw } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=40").then(r => r.json()),
    staleTime: 0, gcTime: 2 * 60 * 1000, refetchOnMount: true, refetchOnWindowFocus: false,
  });
  const breweries = useMemo(() => {
    if (!Array.isArray(breweriesRaw) || !breweriesRaw.length) return [];
    return [...breweriesRaw].sort(() => Math.random() - 0.5).slice(0, 12);
  }, [breweriesRaw]);

  const { data: taplistActivity = [] } = useQuery<any[]>({ queryKey: ["/api/home/taplist-activity"], staleTime: 2 * 60 * 1000 });
  const { data: homeAnnouncements = [] } = useQuery<any[]>({ queryKey: ["/api/home/announcements"], staleTime: 5 * 60 * 1000 });
  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({ queryKey: ["/api/beers/popular-styles"], staleTime: 10 * 60 * 1000 });
  const { data: allBreweries } = useQuery({ queryKey: ["/api/breweries/all"], staleTime: 5 * 60 * 1000 });
  const { data: favorites } = useQuery({ queryKey: ["/api/favorites"], enabled: !!user });
  const { data: myPubs } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated && ((user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin'),
  });
  const { data: myBreweryData } = useQuery<{ brewery: any; beers: any[] }>({
    queryKey: ["/api/brewery/mine"],
    enabled: isAuthenticated && (user as any)?.userType === 'brewery_owner',
  });
  const { data: globalStats } = useQuery<{ totalBeers: number; totalBreweries: number; uniqueStyles: number; totalUsers: number; totalPubs: number }>({
    queryKey: ["/api/stats"], staleTime: 60 * 1000,
  });

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 3);
    return [...(pubs as any[])]
      .map(p => ({
        ...p,
        _distance: p.latitude && p.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 3);
  }, [pubs, userLocation]);

  const isOwner = (user as any)?.userType === 'pub_owner';
  const isBreweryOwner = (user as any)?.userType === 'brewery_owner';
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');
  const isAdminWithPubs = (user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0;

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">

      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5 bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 backdrop-blur-sm">
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              Aggiornamento in corso...
            </div>
          ) : (
            <p className="text-amber-600 dark:text-amber-400 text-xs font-medium">↓ Rilascia per aggiornare</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HERO — dark, atmospheric, search-first
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: 'clamp(400px, 55vw, 540px)' }}>
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-[hsl(22,28%,6%)]">
          <img
            src="/hero-beer.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-40 dark:opacity-35"
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center" style={{ minHeight: 'clamp(400px, 55vw, 540px)' }}>
          <div className="pt-12 pb-14 md:pt-16 md:pb-20 max-w-xl lg:max-w-2xl">

            {/* Eyebrow */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="h-px w-8 bg-amber-400 flex-shrink-0" />
              <span className="text-amber-400 text-[11px] font-bold uppercase tracking-[0.18em]">
                La birra artigianale italiana
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-[2.6rem] md:text-[3.2rem] lg:text-[3.6rem] font-extrabold text-white leading-[1.06] tracking-tight mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              Trova la tua<br />
              <span className="text-amber-400">prossima birra</span>
            </h1>

            {/* Stats trust line */}
            {globalStats ? (
              <p className="text-white/55 text-sm mb-7 font-medium tabular-nums">
                {globalStats.totalBeers.toLocaleString('it-IT')} birre
                <span className="mx-2.5 text-white/25">·</span>
                {globalStats.totalBreweries.toLocaleString('it-IT')} birrifici
                <span className="mx-2.5 text-white/25">·</span>
                {globalStats.totalPubs.toLocaleString('it-IT')} pub
              </p>
            ) : (
              <div className="h-5 mb-7" />
            )}

            {/* Search bar */}
            <form onSubmit={handleHeroSearch} className="flex gap-2 mb-4 max-w-lg">
              <div className="flex-1 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 focus-within:bg-white/15 focus-within:border-white/35 transition-all">
                <Search className="w-4 h-4 text-white/45 flex-shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={e => setHeroSearch(e.target.value)}
                  placeholder="Cerca birre, pub, birrifici..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/40 text-[15px] font-medium outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-bold px-5 rounded-2xl transition-colors text-sm whitespace-nowrap shadow-lg"
              >
                Cerca
              </button>
            </form>

            {/* Style chips */}
            <div className="flex gap-2 flex-wrap mb-6">
              {STYLE_CHIPS.map(style => (
                <button
                  key={style}
                  onClick={() => handleStyleChip(style)}
                  className="text-[12px] font-semibold text-white/75 border border-white/20 hover:border-amber-400/50 hover:text-amber-300 rounded-full px-3 py-1 transition-all backdrop-blur-sm bg-white/5 hover:bg-amber-400/10"
                >
                  {style}
                </button>
              ))}
            </div>

            {/* Owner CTAs */}
            {(isOwner || isAdminWithPubs || isBreweryOwner || isAdmin) && (
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <Link href="/dashboard">
                    <button className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl px-3 py-2 transition-all bg-white/5 hover:bg-white/10">
                      <Store className="w-3.5 h-3.5" /> Gestisci Pub
                    </button>
                  </Link>
                )}
                {isBreweryOwner && (
                  <Link href="/brewery-dashboard">
                    <button className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl px-3 py-2 transition-all bg-white/5 hover:bg-white/10">
                      <Building2 className="w-3.5 h-3.5" /> Il Mio Birrificio
                    </button>
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin">
                    <button className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl px-3 py-2 transition-all bg-white/5 hover:bg-white/10">
                      <TrendingUp className="w-3.5 h-3.5" /> Admin
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* GPS banner */}
        {locationStatus === 'denied' && (
          <div className="mt-6 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Attiva la posizione per vedere i locali più vicini a te
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRequestLocation}
              className="flex-shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900 text-xs">
              Attiva GPS
            </Button>
          </div>
        )}
        {locationStatus === 'granted' && (
          <div className="mt-6 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              Posizione attiva — risultati ordinati per vicinanza
            </p>
          </div>
        )}

        {/* ─── MAPPA ──────────────────────────────────────────────────────── */}
        <div className="mt-8">
          <HomepageMap
            pubs={Array.isArray(pubs) ? pubs : []}
            breweries={Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : [])}
            userLocation={userLocation}
            isLoading={pubsLoading}
            onLocate={(loc) => { setUserLocation(loc); setLocationStatus('granted'); }}
          />
        </div>

        {/* ─── IL TUO PUB (pub owner / admin con pub) ─────────────────────── */}
        {(isOwner || isAdminWithPubs) && (
          <section className="mt-10">
            <SectionHeader icon={Store} title="Il Tuo Pub" href="/dashboard" linkLabel="Dashboard" primary />
            {pubsLoading ? (
              <div className="h-24 bg-gray-100 dark:bg-neutral-800 rounded-2xl animate-pulse mt-4" />
            ) : Array.isArray(myPubs) && myPubs.length > 0 ? (
              <div className="space-y-3 mt-4">
                {(myPubs as any[]).map((pub: any) => (
                  <OwnerCard
                    key={pub.id}
                    image={pub.logoUrl || pub.coverImageUrl || pub.imageUrl}
                    name={pub.name}
                    sub={pub.address}
                    badge={pub.isVerified ? '✓ Verificato' : undefined}
                    statusLabel={subscriptionLabel(pub.subscriptionStatus)}
                    Icon={Store}
                    manageHref="/dashboard"
                    pageHref={`/pub/${pub.slug || pub.id}`}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-neutral-800/50 p-6 text-center">
                <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Nessun pub registrato</p>
                <Link href="/registra-pub"><Button size="sm">Registra il tuo pub</Button></Link>
              </div>
            )}
          </section>
        )}

        {/* ─── IL TUO BIRRIFICIO (brewery owner) ──────────────────────────── */}
        {isBreweryOwner && myBreweryData?.brewery && (
          <section className="mt-10">
            <SectionHeader icon={Building2} title="Il Tuo Birrificio" href="/brewery-dashboard" linkLabel="Gestisci" primary />
            <div className="mt-4">
              <OwnerCard
                image={myBreweryData.brewery.logoUrl}
                name={myBreweryData.brewery.name}
                sub={myBreweryData.brewery.location}
                badge={`${myBreweryData.beers?.length ?? 0} birre nel catalogo`}
                Icon={Building2}
                manageHref="/brewery-dashboard"
                pageHref={`/brewery/${myBreweryData.brewery.id}`}
              />
            </div>
          </section>
        )}

        {/* ─── IN SPINA ADESSO ─────────────────────────────────────────────── */}
        {(taplistActivity as any[]).length > 0 && !isOwner && (
          <section className="mt-10">
            <SectionHeader icon={Droplets} title="In Spina Adesso" href="/explore/pubs" primary />
            <div className="flex gap-3 overflow-x-auto pb-2 mt-4 -mx-1 px-1 scrollbar-hide scroll-ios">
              {(taplistActivity as any[]).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_id}`}>
                  <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                    <div className="relative h-[100px] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                          <Beer className="w-8 h-8 text-white opacity-70" />
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.tap_type === 'pompa' ? 'bg-violet-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.beer_name}</p>
                    {item.beer_style && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{item.beer_style}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      {item.pub_logo ? (
                        <img src={item.pub_logo} alt={item.pub_name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <Store className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.pub_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── PUB VICINI / CONSIGLIATI ────────────────────────────────────── */}
        {!isOwner && !isAdminWithPubs && (
          <section className="mt-10">
            <SectionHeader
              icon={MapPin}
              title={userLocation ? 'Pub Vicini a Te' : 'Pub Consigliati'}
              href="/explore/pubs"
              primary
            />
            {pubsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-gray-100 dark:bg-neutral-800 h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {sortedPubs.map((pub: any) => (
                  <PubCard
                    key={pub.id}
                    pub={pub}
                    distance={userLocation && pub._distance !== Infinity ? pub._distance : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── BIRRIFICI DA SCOPRIRE ───────────────────────────────────────── */}
        {breweries.length > 0 && !isOwner && (
          <section className="mt-10">
            <SectionHeader icon={Building2} title="Birrifici da Scoprire" href="/explore/breweries" />
            <div className="flex gap-3 overflow-x-auto pb-2 mt-4 -mx-1 px-1 scrollbar-hide scroll-ios">
              {breweries.map((brewery: any) => {
                const bg = brewery.coverImageUrl || brewery.logoUrl;
                const initial = brewery.name?.[0]?.toUpperCase() ?? "B";
                return (
                  <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                    <div className="group flex-shrink-0 w-[148px] cursor-pointer">
                      <div className="relative h-[100px] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                        {bg ? (
                          <img src={bg} alt={brewery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white/80">{initial}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {(brewery.location || brewery.region) && (
                          <span className="absolute bottom-1.5 left-2 text-[10px] text-white/90 font-medium truncate max-w-[120px] flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {brewery.city || brewery.location || brewery.region}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{brewery.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── ULTIME DAI BIRRIFICI ────────────────────────────────────────── */}
        {(homeAnnouncements as any[]).length > 0 && (
          <section className="mt-10">
            <SectionHeader icon={Megaphone} title="Ultime dai Birrifici" />
            <div className="flex gap-3 overflow-x-auto pb-2 mt-4 -mx-1 px-1 scrollbar-hide scroll-ios">
              {(homeAnnouncements as any[]).map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                  news:    { label: "Novità",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",       Icon: Newspaper },
                  release: { label: "Nuova Birra", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",   Icon: Rocket },
                  collab:  { label: "Collab",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", Icon: Users },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="group flex-shrink-0 w-[200px] p-3.5 rounded-2xl border border-[hsl(36,14%,87%)] dark:border-[hsl(25,12%,17%)] bg-white dark:bg-[hsl(25,12%,11%)] hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-2 mb-2.5">
                        {ann.breweryLogo ? (
                          <img src={ann.breweryLogo} alt={ann.breweryName} className="w-8 h-8 rounded-full object-contain bg-amber-50 dark:bg-amber-900/20 flex-shrink-0 p-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{ann.breweryName?.[0]}</span>
                          </div>
                        )}
                        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">{ann.breweryName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${t.color}`}>
                        <t.Icon className="w-2.5 h-2.5" />{t.label}
                      </span>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{ann.title}</p>
                      {ann.releaseDate && (
                        <p className="text-[10px] text-gray-400 mt-1.5">Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── STILI PIÙ AMATI ─────────────────────────────────────────────── */}
        {isAuthenticated && Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <section className="mt-10">
            <SectionHeader icon={Beer} title="Stili più Amati" href="/explore/beers" linkLabel="Esplora" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              {(() => {
                const top = popularStyles.slice(0, 10);
                const max = top[0]?.count ?? 1;
                return top.map((s, i) => (
                  <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                    <div className="group flex items-center gap-3 py-2.5 border-b border-[hsl(36,14%,90%)] dark:border-[hsl(25,12%,16%)] last:border-0 cursor-pointer hover:bg-[hsl(38,20%,97%)] dark:hover:bg-[hsl(25,12%,12%)] rounded-lg px-1 transition-colors">
                      <span className={`flex-shrink-0 w-5 text-right text-[11px] font-bold ${i < 3 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-600'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[hsl(28,14%,18%)] dark:text-[hsl(35,10%,82%)] group-hover:text-amber-700 dark:group-hover:text-amber-400 truncate transition-colors leading-tight mb-1">
                          {s.style}
                        </p>
                        <div className="h-1 bg-[hsl(36,14%,88%)] dark:bg-[hsl(25,12%,18%)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all"
                            style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        {s.count.toLocaleString('it-IT')}
                      </span>
                    </div>
                  </Link>
                ));
              })()}
            </div>
          </section>
        )}

        {/* ─── I TUOI PREFERITI ────────────────────────────────────────────── */}
        {user && Array.isArray(favorites) && favorites.length > 0 && (
          <section className="mt-10">
            <SectionHeader icon={Heart} title="I Tuoi Preferiti" href="/dashboard?tab=favorites" linkLabel="Vedi tutti" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              {(favorites as any[]).filter((f: any) => ['pub', 'brewery', 'beer'].includes(f.itemType) && f.itemName).slice(0, 12).map((fav: any) => {
                const href = fav.itemType === 'pub' ? `/pub/${fav.itemId}` : fav.itemType === 'brewery' ? `/brewery/${fav.itemId}` : `/beer/${fav.itemId}`;
                const typeColor = fav.itemType === 'pub' ? 'bg-blue-500' : fav.itemType === 'brewery' ? 'bg-amber-500' : 'bg-emerald-500';
                const TypeIcon = fav.itemType === 'pub' ? Store : Beer;
                return (
                  <Link key={fav.id} href={href}>
                    <div className="group relative bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-3 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 cursor-pointer h-full">
                      <div className={`absolute top-2 right-2 ${typeColor} rounded-full p-1`}>
                        <TypeIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex flex-col items-center text-center gap-2">
                        {fav.itemImageUrl ? (
                          <img src={fav.itemImageUrl} alt={fav.itemName} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${typeColor} flex items-center justify-center`}>
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">{fav.itemName}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── STATS COMMUNITY ─────────────────────────────────────────────── */}
        <section className="mt-12 mb-12">
          <div className="rounded-3xl bg-[hsl(22,28%,8%)] dark:bg-[hsl(22,28%,6%)] overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.06]">
              <img src="/hero-beer.jpg" alt="" aria-hidden className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-10">
              <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-[0.18em] text-center mb-6">
                La community Fermenta.to
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatBlock
                  value={globalStats?.totalBeers}
                  label="Birre"
                  color="text-amber-400"
                />
                <StatBlock
                  value={globalStats?.totalBreweries}
                  label="Birrifici"
                  color="text-sky-400"
                  bordered
                />
                <StatBlock
                  value={globalStats?.uniqueStyles}
                  label="Stili"
                  color="text-teal-400"
                />
              </div>
              <div className="border-t border-white/10 pt-5 flex justify-center gap-12">
                <StatBlock value={globalStats?.totalUsers} label="Utenti" color="text-emerald-400" small />
                <StatBlock value={globalStats?.totalPubs} label="Pub" color="text-violet-400" small />
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

/* ─── Helper components ─────────────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon, title, href, linkLabel = "Vedi tutti", primary = false,
}: {
  icon: any; title: string; href?: string; linkLabel?: string; primary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {primary && <span className="h-5 w-0.5 rounded-full bg-amber-500 flex-shrink-0" />}
        <Icon className={`flex-shrink-0 text-amber-500 dark:text-amber-400 ${primary ? 'w-5 h-5' : 'w-4 h-4'}`} />
        <h2 className={`font-bold text-[hsl(28,18%,13%)] dark:text-[hsl(40,12%,92%)] tracking-tight ${primary ? 'text-xl' : 'text-base'}`}>
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href}>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-0.5 transition-colors">
            {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}

function StatBlock({
  value, label, color, bordered = false, small = false,
}: {
  value?: number; label: string; color: string; bordered?: boolean; small?: boolean;
}) {
  return (
    <div className={`text-center ${bordered ? 'border-x border-white/10' : ''}`}>
      <div className={`${small ? 'text-2xl' : 'text-3xl'} font-extrabold tabular-nums leading-tight ${color}`}
        style={{ fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {value != null ? value.toLocaleString('it-IT') : '—'}
      </div>
      <div className="text-[10px] text-white/45 mt-1.5 font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
}

function OwnerCard({
  image, name, sub, badge, statusLabel, Icon, manageHref, pageHref,
}: {
  image?: string | null; name: string; sub?: string; badge?: string; statusLabel?: string;
  Icon: any; manageHref: string; pageHref: string;
}) {
  return (
    <div className="bg-white dark:bg-[hsl(25,12%,12%)] border border-[hsl(36,14%,88%)] dark:border-[hsl(25,12%,17%)] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
        {image ? (
          <img src={image} alt={name} className="w-14 h-14 object-cover" />
        ) : (
          <Icon className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white truncate text-[15px]">{name}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-neutral-400 truncate mt-0.5">{sub}</p>}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {badge && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
          {statusLabel && (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{statusLabel}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <Link href={manageHref}>
          <button className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">Gestisci</button>
        </Link>
        <Link href={pageHref}>
          <button className="text-xs font-medium border border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-500 px-3 py-1.5 rounded-lg transition-colors w-full text-center">Pagina</button>
        </Link>
      </div>
    </div>
  );
}

function subscriptionLabel(status?: string): string | undefined {
  if (!status || status === 'none') return undefined;
  if (status === 'trial') return '⏱ Prova attiva';
  if (status === 'active') return '✓ Piano attivo';
  if (status === 'gifted') return '🎁 Piano gifted';
  return status;
}
