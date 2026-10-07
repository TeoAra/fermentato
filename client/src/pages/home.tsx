import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useGeolocation } from "@/hooks/useGeolocation";
import HomeMapPanel from "@/components/home-map-panel";
import PullToRefreshIndicator from "@/components/pull-to-refresh-indicator";
import { Beer, MapPin, Heart, Store, Building2, ChevronRight, Users, Bell, Bookmark, Star, TrendingUp, Zap, Flame, Search } from "lucide-react";
import Footer from "@/components/footer";
import PubCard from "@/components/pub-card";
import BreweryCard from "@/components/brewery-card";
import { Button } from "@/components/ui/button";
import NewsStrip from "@/components/news-strip";
import { PageContainer } from "@/components/layout/page-container";


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

function formatDist(km: number | null | undefined): string {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/* ─────────────────────────────────────────────────────────────
   Shared homepage building blocks — consistent section rhythm
   ───────────────────────────────────────────────────────────── */

/** Standard section header: accent bar or icon + title + optional "vedi tutti" link. */
function SectionHeader({
  title,
  icon: Icon,
  href,
  linkLabel = "Vedi tutti",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="section-title flex items-center gap-2">
        {Icon ? (
          <Icon className="w-[18px] h-[18px] text-primary flex-shrink-0" />
        ) : (
          <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
        )}
        {title}
      </h2>
      {href && (
        <Link href={href} className="tap-scale text-[13px] font-bold text-primary flex items-center gap-0.5 whitespace-nowrap">
          {linkLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const geo = useGeolocation({ auto: true });
  const userLocation = useMemo(() => geo.lat !== null && geo.lng !== null ? { lat: geo.lat, lng: geo.lng } : null, [geo.lat, geo.lng]);
  const handleRequestLocation = geo.request;
  const [distanceKm, setDistanceKm] = useState(10);
  const [showPubs, setShowPubs] = useState(true);
  const [showBreweries, setShowBreweries] = useState(true);

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient]);
  const refresh = usePullToRefresh(handleRefresh);

  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"], staleTime: 5 * 60 * 1000 });
  const { data: breweriesRaw } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=40").then(r => r.json()),
    staleTime: 0, gcTime: 2 * 60 * 1000, refetchOnMount: true, refetchOnWindowFocus: false,
  });
  const breweries = useMemo(() => {
    if (!Array.isArray(breweriesRaw) || breweriesRaw.length === 0) return [];
    return [...breweriesRaw].sort(() => Math.random() - 0.5).slice(0, 12);
  }, [breweriesRaw]);

  const { data: taplistActivity = [] } = useQuery<any[]>({ queryKey: ["/api/home/taplist-activity"], staleTime: 2 * 60 * 1000 });
  const { data: homeAnnouncements = [] } = useQuery<any[]>({ queryKey: ["/api/home/announcements"], staleTime: 5 * 60 * 1000 });
  const { data: popularStyles } = useQuery<{ style: string; count: number }[]>({ queryKey: ["/api/beers/popular-styles"], staleTime: 10 * 60 * 1000 });
  const { data: allBreweries } = useQuery({ queryKey: ["/api/breweries/map"], staleTime: 10 * 60 * 1000 });
  const { data: favorites } = useQuery({ queryKey: ["/api/favorites"], enabled: !!user });
  const { data: myPubs } = useQuery({ queryKey: ["/api/my-pubs"], enabled: isAuthenticated && ((user as any)?.userType === 'pub_owner' || (user as any)?.userType === 'admin') });
  const { data: myBreweryData } = useQuery<{ brewery: any; beers: any[] }>({ queryKey: ["/api/brewery/mine"], enabled: isAuthenticated && (user as any)?.userType === 'brewery_owner' });
  const { data: globalStats } = useQuery<{ totalBeers: number; totalBreweries: number; uniqueStyles: number; totalUsers: number; totalPubs: number }>({ queryKey: ["/api/stats"], staleTime: 60 * 1000 });
  const { data: userStats } = useQuery<{ total: number; totalCheckins: number; totalReviews: number; avgRating: number; streak: number; topStyles: any[]; topBreweries: any[] }>({
    queryKey: ["/api/user/stats"], enabled: isAuthenticated, staleTime: 5 * 60 * 1000,
  });

  const sortedPubs = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 8);
    return [...(pubs as any[])]
      .map((pub: any) => ({
        ...pub,
        _distance: pub.latitude && pub.longitude
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
      .slice(0, 10);
  }, [pubs, userLocation, distanceKm]);

  const typedUser = user as any;
  const savedCount = Array.isArray(favorites) ? (favorites as any[]).length : 0;
  const breweryOfDay = useMemo(() => {
    const withCover = breweries.filter((b: any) => b.coverImageUrl || b.logoUrl);
    return withCover[0] ?? breweries[0] ?? null;
  }, [breweries]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia</title>
        <meta name="description" content="Scopri i migliori pub e birrifici artigianali d'Italia. Consulta taplist in tempo reale, orari di apertura e assaggia le migliori birre craft." />
        <meta property="og:title" content="Fermenta.to — Birre Artigianali, Pub e Birrifici in Italia" />
        <meta property="og:description" content="Scopri i migliori pub e birrifici artigianali d'Italia." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fermenta.to/" />
        <meta property="og:image" content="https://fermenta.to/logo-full.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://fermenta.to/" />
      </Helmet>

      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator {...refresh} />

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Value proposition + prominent search, then live map
          Inside the main wide container so it expands on large screens
      ═══════════════════════════════════════════════════════════════ */}
      <PageContainer as="main" variant="wide" className="pt-5 pb-28">
        {/* ── Value proposition ── */}
        <div className="mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary mb-2">
            Fermenta.to
          </p>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-foreground leading-[1.12] tracking-tight">
            Scopri birre artigianali,
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">pub e la community</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-2.5 leading-relaxed max-w-xl">
            Trova cosa bere vicino a te — taplist live, birrifici da scoprire e appassionati come te, in un tap.
          </p>
        </div>

        {/* ── Prominent search entry point ── */}
        <Link href="/search" aria-label="Cerca birre, pub e birrifici">
          <div className="tap-scale group flex items-center gap-3 w-full bg-card border-2 border-primary/20 rounded-2xl px-4 py-3.5 shadow-card mb-3 transition-colors hover:border-primary/40">
            <Search className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="flex-1 text-[15px] text-muted-foreground font-medium truncate">
              Cerca birre, pub o birrifici…
            </span>
            <span className="tap-scale flex-shrink-0 inline-flex items-center justify-center bg-primary text-white text-[13px] font-bold rounded-xl px-3.5 py-1.5">
              Cerca
            </span>
          </div>
        </Link>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <Link href="/explore/pubs" className="tap-scale w-full flex items-center justify-center gap-1.5 bg-card text-foreground text-[13.5px] font-bold px-3 py-3 rounded-2xl border border-border shadow-card-sm">
            <Store className="w-4 h-4 text-primary" />
            Esplora pub
          </Link>
          <Link href="/explore/breweries" className="tap-scale w-full flex items-center justify-center gap-1.5 bg-card text-foreground text-[13.5px] font-bold px-3 py-3 rounded-2xl border border-border shadow-card-sm">
            <Building2 className="w-4 h-4 text-amber-500" />
            Birrifici
          </Link>
        </div>

        <HomeMapPanel
          pubs={Array.isArray(pubs) ? pubs as any[] : []}
          breweries={Array.isArray(allBreweries) ? allBreweries as any[] : (Array.isArray(breweries) ? breweries : [])}
          userLocation={userLocation}
          accuracy={geo.accuracy}
          isCached={geo.isCached}
          locationStatus={geo.status}
          locationError={geo.error}
          recenterToken={geo.requestId}
          onRequestLocation={handleRequestLocation}
          isLoading={pubsLoading}
          distanceKm={distanceKm}
          onDistanceChange={setDistanceKm}
          showPubs={showPubs}
          onShowPubsChange={setShowPubs}
          showBreweries={showBreweries}
          onShowBreweriesChange={setShowBreweries}
        />

        {/* News strip dentro l'Hero */}
        <div className="mt-6">
          <NewsStrip variant="hero" limit={6} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            OWNER SECTIONS — Pub owner / Brewery owner
        ═══════════════════════════════════════════════════════════════ */}
        {(typedUser?.userType === 'pub_owner' || (typedUser?.userType === 'admin' && Array.isArray(myPubs) && (myPubs as any[]).length > 0)) ? (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Pub
              </h2>
              <Button asChild size="sm" variant="ghost" className="text-primary font-semibold text-sm">
                <Link href="/dashboard">Dashboard →</Link>
              </Button>
            </div>
            {pubsLoading ? (
              <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            ) : Array.isArray(myPubs) && (myPubs as any[]).length > 0 ? (
              <div className="space-y-3">
                {(myPubs as any[]).map((pub: any) => (
                  <div key={pub.id} className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                      {pub.logoUrl ? <img src={pub.logoUrl} alt={pub.name} className="w-14 h-14 object-cover" /> : <Store className="w-6 h-6 text-primary/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{pub.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pub.address}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button asChild size="sm" className="font-medium text-xs px-3">
                        <Link href="/dashboard">Gestisci</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="text-xs px-3 w-full border-border">
                        <Link href={`/pub/${pub.slug || pub.id}`}>Pagina</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/[0.06] p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <p className="text-muted-foreground text-sm mb-3">Non hai ancora registrato nessun pub</p>
                <Button asChild size="sm">
                  <Link href="/registra-pub">Registra il tuo pub</Link>
                </Button>
              </div>
            )}
          </section>
        ) : null}

        {typedUser?.userType === 'brewery_owner' && myBreweryData?.brewery && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary flex-shrink-0" />
                Il Tuo Birrificio
              </h2>
              <Button asChild size="sm" variant="ghost" className="text-primary font-semibold text-sm">
                <Link href="/brewery-dashboard">Gestisci →</Link>
              </Button>
            </div>
            <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {myBreweryData.brewery.logoUrl
                  ? <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-14 h-14 object-contain" />
                  : <Building2 className="w-6 h-6 text-primary/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{myBreweryData.brewery.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{myBreweryData.brewery.location}
                </p>
                <p className="text-xs text-primary mt-1">{myBreweryData.beers?.length ?? 0} birre nel catalogo</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button asChild size="sm" className="font-medium text-xs px-3">
                  <Link href="/brewery-dashboard">Gestisci</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-xs px-3 w-full border-border">
                  <Link href={`/brewery/${myBreweryData.brewery.id}`}>Pagina</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            USER STATS ROW — bevute · recensioni · salvate
        ═══════════════════════════════════════════════════════════════ */}
        {isAuthenticated && (
          <div className="grid grid-cols-3 gap-3 mt-8">
            {/* Bevute */}
            <Link href="/dashboard?tab=tastings">
              <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center cursor-pointer transition-all duration-200">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/25 flex items-center justify-center mx-auto mb-2">
                  <Beer className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{userStats?.totalCheckins ?? userStats?.total ?? 0}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">Check-in</p>
                {(userStats?.totalCheckins ?? userStats?.total ?? 0) > 0 ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Birre assaggiate</p>
                ) : null}
              </div>
            </Link>

            {/* Salvate */}
            <Link href="/dashboard?tab=favorites">
              <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center cursor-pointer transition-all duration-200">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/25 flex items-center justify-center mx-auto mb-2">
                  <Star className="w-4.5 h-4.5 text-amber-500" style={{ width: 18, height: 18 }} fill="currentColor" />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{savedCount}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">Preferiti</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Birre salvate</p>
              </div>
            </Link>

            {/* Check-in / XP */}
            <Link href="/dashboard">
              <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center cursor-pointer transition-all duration-200">
                <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/25 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4.5 h-4.5 text-red-500" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-[22px] font-extrabold text-foreground leading-none">{(userStats?.totalCheckins ?? userStats?.total ?? 0) * 20}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">XP totali</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Livello Beer</p>
              </div>
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ORA VICINO A TE — taplist horizontal scroll
        ═══════════════════════════════════════════════════════════════ */}
        {(taplistActivity as any[]).length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Ora in spina" icon={Flame} href="/explore/pubs" linkLabel="Vedi tutto" />
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

        {/* ═══════════════════════════════════════════════════════════════
            BIRRIFICIO DEL GIORNO — full-width hero card
        ═══════════════════════════════════════════════════════════════ */}
        {breweryOfDay && typedUser?.userType !== 'pub_owner' && (
          <section className="mt-8">
            <SectionHeader title="Birrificio in evidenza" icon={Star} href="/explore/breweries" linkLabel="Vedi tutti" />
            <Link href={`/brewery/${breweryOfDay.id}`}>
              <div className="tap-scale relative rounded-3xl overflow-hidden cursor-pointer shadow-card" style={{ height: '168px' }}>
                {(breweryOfDay.coverImageUrl || breweryOfDay.logoUrl) ? (
                  <img
                    src={breweryOfDay.coverImageUrl || breweryOfDay.logoUrl}
                    alt={breweryOfDay.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a0800 0%, #3d1200 50%, #7a2800 100%)' }} />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-300 mb-1.5 uppercase tracking-wide">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Consigliato per te
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

        {/* ═══════════════════════════════════════════════════════════════
            IN SPINA VICINO A TE — pub list with taplist
        ═══════════════════════════════════════════════════════════════ */}
        {(pubsLoading || sortedPubs.length > 0) && (
          <section className="mt-8">
            <SectionHeader
              title={userLocation ? "Pub vicino a te" : "Pub consigliati"}
              icon={MapPin}
              href="/explore/pubs"
              linkLabel="Vedi tutti"
            />
            {pubsLoading ? (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 3 ? 'border-b border-border' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                      <div className="h-2.5 w-1/3 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              {sortedPubs.slice(0, 4).map((pub: any, idx: number) => {
                const tap = (taplistActivity as any[]).find((t: any) => t.pub_id === pub.id);
                const isLast = idx === Math.min(3, sortedPubs.length - 1);
                return (
                  <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                    <div className={`tap-scale flex items-center gap-3 px-4 py-3.5 ${!isLast ? 'border-b border-border' : ''}`}>
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
                            <p className="text-[11px] font-medium text-foreground truncate max-w-[90px]">{tap.beer_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {tap.beer_style}
                              {tap.beer_abv ? ` · ${tap.beer_abv}%` : ''}
                            </p>
                          </div>
                          {tap.beer_image
                            ? <img src={tap.beer_image} alt={tap.beer_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                            : (
                              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                <Beer className="w-4 h-4 text-primary" />
                              </div>
                            )}
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

        {/* ═══════════════════════════════════════════════════════════════
            TREND DEL MOMENTO  +  IL TUO PROFILO  (2-col grid)
        ═══════════════════════════════════════════════════════════════ */}
        {Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div className={`grid gap-3 mt-8 ${isAuthenticated ? 'grid-cols-2' : 'grid-cols-1'}`}>

            {/* Trend del momento */}
            <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trend
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
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700"
                              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            {/* Il tuo profilo (only if authenticated) */}
            {isAuthenticated && (
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-foreground">Profilo</h3>
                  <Link href="/dashboard">
                    <span className="text-[11px] font-semibold text-primary">Vai →</span>
                  </Link>
                </div>
                {/* Avatar + level */}
                <div className="flex items-center gap-2 mb-3">
                  {typedUser?.profileImageUrl ? (
                    <img src={typedUser.profileImageUrl} alt="profilo" className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                      <span className="text-sm font-bold text-primary">{typedUser?.username?.[0]?.toUpperCase() ?? '?'}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-primary">Luppolo Junior</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{typedUser?.username}</p>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 text-center mb-3">
                  <div>
                    <p className="text-[16px] font-extrabold text-foreground leading-none">{userStats?.totalCheckins ?? userStats?.total ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Check-in</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-[16px] font-extrabold text-foreground leading-none">{userStats?.totalReviews ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Rec.</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-extrabold text-foreground leading-none">{savedCount}</p>
                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Salvate</p>
                  </div>
                </div>
                {/* XP bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">XP</span>
                    <span className="text-[10px] font-bold text-primary">{(userStats?.totalCheckins ?? userStats?.total ?? 0) * 20} / 600</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round(((userStats?.totalCheckins ?? userStats?.total ?? 0) * 20 / 600) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            BIRRIFICI DA SCOPRIRE (only desktop or when no taplist)
        ═══════════════════════════════════════════════════════════════ */}
        {breweries.length > 0 && (taplistActivity as any[]).length === 0 && (
          <section className="mt-8">
            <SectionHeader title="Birrifici da scoprire" icon={Building2} href="/explore/breweries" linkLabel="Vedi tutti" />
            <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              {breweries.slice(0, 5).map((brewery: any, idx: number) => (
                <BreweryCard key={brewery.id} brewery={brewery} isLast={idx === Math.min(4, breweries.length - 1)} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ATTIVITÀ DALLA COMMUNITY
        ═══════════════════════════════════════════════════════════════ */}
        {((taplistActivity as any[]).length > 0 || homeAnnouncements.length > 0) && (
          <section className="mt-8">
            <SectionHeader title="Dalla community" icon={Users} href="/activity" linkLabel="Vedi tutto" />
            <div className="space-y-2">
              {(taplistActivity as any[]).slice(0, 4).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_slug || item.pub_id}`}>
                  <div className="tap-scale flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    {item.beer_image ? (
                      <img src={item.beer_image} alt={item.beer_name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <Beer className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground leading-snug">
                        <span className="font-bold">{item.pub_name}</span> ha aggiunto{' '}
                        <span className="font-bold">{item.beer_name}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.beer_style}{item.beer_abv ? ` · ${item.beer_abv}%` : ''}
                      </p>
                    </div>
                    {item.pub_logo ? (
                      <img src={item.pub_logo} alt={item.pub_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
              {homeAnnouncements.slice(0, 2).map((ann: any) => (
                <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                  <div className="tap-scale flex items-center gap-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    {ann.breweryLogo ? (
                      <img src={ann.breweryLogo} alt={ann.breweryName} className="w-10 h-10 rounded-full object-contain bg-muted flex-shrink-0 p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#c95000] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{ann.breweryName?.[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground leading-snug">
                        <span className="font-bold">{ann.breweryName}</span>: {ann.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {ann.type === 'release' ? '🍺 Nuova birra' : ann.type === 'collab' ? '🤝 Collab' : '📰 Novità'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            I TUOI PREFERITI
        ═══════════════════════════════════════════════════════════════ */}
        {user && Array.isArray(favorites) && (favorites as any[]).length > 0 && (
          <section className="mt-8">
            <SectionHeader title="I tuoi preferiti" icon={Bookmark} href="/dashboard?tab=favorites" linkLabel="Vedi tutti" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(favorites as any[]).filter((f: any) => ['pub', 'brewery', 'beer'].includes(f.itemType) && f.itemName).slice(0, 6).map((favorite: any) => {
                const href = favorite.itemType === 'pub' ? `/pub/${favorite.itemId}`
                  : favorite.itemType === 'brewery' ? `/brewery/${favorite.itemId}`
                  : `/beer/${favorite.itemId}`;
                const TypeIcon = favorite.itemType === 'pub' ? Store : Beer;
                return (
                  <Link key={favorite.id} href={href}>
                    <div className="tap-scale bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-pointer text-center transition-all duration-200">
                      {favorite.itemImageUrl ? (
                        <img src={favorite.itemImageUrl} alt={favorite.itemName} className="w-10 h-10 rounded-full object-cover mx-auto mb-2 ring-2 ring-orange-100 dark:ring-orange-900/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">{favorite.itemName}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            GUEST CTA — per utenti non autenticati
        ═══════════════════════════════════════════════════════════════ */}
        {!isAuthenticated && (
          <section className="mt-8">
            <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #f98a0e 55%, #f5a623 100%)' }}>
              <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/07 pointer-events-none" />
              <div className="relative">
                <p className="text-white/80 text-[11px] font-extrabold uppercase tracking-widest mb-1.5">Sei nuovo?</p>
                <h3 className="text-[20px] font-extrabold text-white leading-tight mb-2">
                  Unisciti alla community
                </h3>
                <p className="text-white/80 text-sm leading-snug mb-5">
                  Salva i tuoi preferiti, tieni il diario degli assaggi e scopri birre con persone come te.
                </p>
                <Link
                  href="/api/login"
                  className="inline-flex tap-scale bg-white text-primary font-bold rounded-full h-11 px-6 text-sm shadow-lg items-center justify-center"
                >
                  Registrati gratis →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            COMMUNITY STATS
        ═══════════════════════════════════════════════════════════════ */}
        <section className="mt-8">
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <p className="text-[11px] font-bold text-center text-muted-foreground mb-4 uppercase tracking-[0.14em]">
              La Community Fermenta.to
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="text-center min-w-0 px-1">
                <div className="text-base sm:text-2xl font-extrabold text-primary tabular-nums leading-tight break-words">
                  {globalStats?.totalBeers != null ? globalStats.totalBeers.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birre</div>
              </div>
              <div className="text-center min-w-0 px-1 border-x border-border">
                <div className="text-base sm:text-2xl font-extrabold text-primary tabular-nums leading-tight break-words">
                  {globalStats?.totalBreweries != null ? globalStats.totalBreweries.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Birrifici</div>
              </div>
              <div className="text-center min-w-0 px-1">
                <div className="text-base sm:text-2xl font-extrabold text-primary tabular-nums leading-tight break-words">
                  {globalStats?.uniqueStyles != null ? globalStats.uniqueStyles.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Stili</div>
              </div>
            </div>
            <div className="border-t border-border mb-4" />
            <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-center sm:gap-16">
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl font-extrabold text-primary tabular-nums leading-tight">
                  {globalStats?.totalUsers != null ? globalStats.totalUsers.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Utenti</div>
              </div>
              <div className="text-center min-w-0">
                <div className="text-lg sm:text-xl font-extrabold text-primary tabular-nums leading-tight">
                  {globalStats?.totalPubs != null ? globalStats.totalPubs.toLocaleString('it-IT') : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">Pub</div>
              </div>
            </div>
          </div>
        </section>

      </PageContainer>

      <Footer />
    </div>
  );
}
