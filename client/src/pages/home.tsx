import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  Beer, MapPin, Heart, Store, TrendingUp, Navigation, Building2,
  Megaphone, Newspaper, Rocket, Users, Droplets, Search, ChevronRight,
  Star, Clock, Zap, Package,
} from "lucide-react";
import Footer from "@/components/footer";
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

function fmtDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const STYLE_CHIPS = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison", "Porter", "Pale Ale"];

function subscriptionLabel(status: string | null | undefined): string {
  if (status === 'active') return '✓ Abbonamento attivo';
  if (status === 'trial') return '◑ Prova gratuita';
  return '○ Abbonamento scaduto';
}

/* ─────────────────────────────────────────────────────────────────── */

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
    if (!userLocation) return (pubs as any[]).slice(0, 6);
    return [...(pubs as any[])]
      .map(p => ({
        ...p,
        _distance: p.latitude && p.longitude
          ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude))
          : Infinity,
      }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 6);
  }, [pubs, userLocation]);

  const isOwner = (user as any)?.userType === 'pub_owner';
  const isBreweryOwner = (user as any)?.userType === 'brewery_owner';
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');
  const isAdminWithPubs = (user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0;

  return (
    <div className="min-h-screen" style={{ background: "#080706", color: "#ede8e1" }}>

      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5"
          style={{ background: "rgba(15,13,10,0.95)", borderBottom: "1px solid #2a2420", backdropFilter: "blur(8px)" }}>
          {isRefreshing ? (
            <div className="flex items-center gap-2" style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              Aggiornamento in corso…
            </div>
          ) : (
            <p style={{ color: "#8a7d74", fontSize: 12, fontWeight: 600 }}>↓ Rilascia per aggiornare</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SEZIONE MAPPA — atmosferica, ambientale
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative" }}>
        {/* Wrapper con sfumatura in basso verso #080706 */}
        <div style={{ position: "relative" }}>
          <HomepageMap
            pubs={Array.isArray(pubs) ? pubs : []}
            breweries={Array.isArray(allBreweries) ? allBreweries : (Array.isArray(breweries) ? breweries : [])}
            userLocation={userLocation}
            isLoading={pubsLoading}
            onLocate={(loc) => { setUserLocation(loc); setLocationStatus('granted'); }}
          />
          {/* Gradiente bottom per fusione con sezione dati */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to bottom, transparent, #080706)", pointerEvents: "none" }} />
        </div>

        {/* GPS banner in stile dark */}
        {locationStatus === 'denied' && (
          <div className="mx-4 mt-3 mb-0 flex items-center justify-between gap-4 px-4 py-3 rounded-lg"
            style={{ background: "#161412", border: "1px solid #2a2420" }}>
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 flex-shrink-0" style={{ color: "#f59e0b" }} />
              <p style={{ fontSize: 12, color: "#c8bdb4" }}>Attiva la posizione per vedere i locali più vicini</p>
            </div>
            <button onClick={handleRequestLocation}
              className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-bold"
              style={{ background: "#f59e0b", color: "#080706" }}>
              GPS
            </button>
          </div>
        )}
        {locationStatus === 'granted' && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-md"
            style={{ background: "#0f1a12", border: "1px solid #1a3020" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>Posizione attiva — risultati per vicinanza</p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENUTO PRINCIPALE
      ═══════════════════════════════════════════════════════════════ */}
      <main className="px-4" style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* ─── SEARCH ─────────────────────────────────────────────────────── */}
        <div className="mt-4">
          <form onSubmit={handleHeroSearch} style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              background: "#161412", border: "1px solid #2a2420",
              borderRadius: 8, padding: "0 14px", height: 44,
            }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#8a7d74" }} />
              <input
                type="text"
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                placeholder="Cerca birre, pub, birrifici…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#ede8e1" }}
              />
            </div>
            <button type="submit" style={{
              padding: "0 18px", height: 44, background: "#f59e0b", color: "#080706",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", flexShrink: 0,
            }}>
              Cerca
            </button>
          </form>

          {/* Style chips */}
          <div className="flex gap-2 flex-wrap mt-3">
            {STYLE_CHIPS.map(style => (
              <button key={style} onClick={() => handleStyleChip(style)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 10px",
                  background: "#161412", border: "1px solid #2a2420",
                  borderRadius: 6, color: "#8a7d74", cursor: "pointer",
                }}>
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* ─── OWNER QUICK ACTIONS ────────────────────────────────────────── */}
        {(isOwner || isAdminWithPubs || isBreweryOwner || isAdmin) && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(isOwner || isAdminWithPubs) && (
              <Link href="/dashboard">
                <OwnerAction icon={Store} label="Gestisci il pub" sub="Taplist live →" />
              </Link>
            )}
            {isBreweryOwner && (
              <Link href="/brewery-dashboard">
                <OwnerAction icon={Building2} label="Il mio birrificio" sub="Dashboard →" />
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin">
                <OwnerAction icon={TrendingUp} label="Admin Panel" sub="Gestisci →" />
              </Link>
            )}
          </div>
        )}

        {/* ─── IL TUO PUB ─────────────────────────────────────────────────── */}
        {(isOwner || isAdminWithPubs) && Array.isArray(myPubs) && myPubs.length > 0 && (
          <section className="mt-7">
            <SecHead label="IL TUO PUB" title="Gestisci" href="/dashboard" linkLabel="Dashboard →" />
            <div className="mt-3 flex flex-col gap-2">
              {(myPubs as any[]).map((pub: any) => (
                <PubOwnerCard key={pub.id} pub={pub} />
              ))}
            </div>
          </section>
        )}

        {/* ─── IL TUO BIRRIFICIO ──────────────────────────────────────────── */}
        {isBreweryOwner && myBreweryData?.brewery && (
          <section className="mt-7">
            <SecHead label="IL TUO BIRRIFICIO" title={myBreweryData.brewery.name} href="/brewery-dashboard" linkLabel="Gestisci →" />
            <Link href={`/brewery/${myBreweryData.brewery.id}`}>
              <div className="mt-3 flex items-center gap-3 p-4 rounded-lg"
                style={{ background: "#161412", border: "1px solid #2a2420" }}>
                {myBreweryData.brewery.logoUrl ? (
                  <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid #2a2420" }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
                    <Building2 className="w-5 h-5" style={{ color: "#f59e0b" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ fontSize: 14, color: "#ede8e1", letterSpacing: "-0.02em" }}>
                    {myBreweryData.brewery.name}
                  </p>
                  <p style={{ fontSize: 11, color: "#8a7d74", marginTop: 1 }}>
                    {myBreweryData.brewery.location} · {myBreweryData.beers?.length ?? 0} birre
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#8a7d74" }} />
              </div>
            </Link>
          </section>
        )}

        {/* ─── IN SPINA ADESSO ─────────────────────────────────────────────── */}
        {(taplistActivity as any[]).length > 0 && !isOwner && (
          <section className="mt-7">
            <SecHead label="LIVE" title="In spina adesso" href="/explore/pubs" dot="green" />
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-ios" style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
              {(taplistActivity as any[]).map((item: any) => (
                <Link key={item.id} href={`/pub/${item.pub_id}`}>
                  <div className="flex-shrink-0 w-36 cursor-pointer" style={{ borderRadius: 8, overflow: "hidden", background: "#161412", border: "1px solid #2a2420" }}>
                    <div style={{ position: "relative", height: 96, overflow: "hidden" }}>
                      {item.beer_image ? (
                        <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" style={{ filter: "brightness(0.8)" }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                          <Beer className="w-7 h-7" style={{ color: "#080706", opacity: 0.7 }} />
                        </div>
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.75) 0%, transparent 55%)" }} />
                      <span style={{
                        position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 800,
                        padding: "2px 6px", borderRadius: 4,
                        background: item.tap_type === 'pompa' ? "#7c3aed" : "#d97706",
                        color: "#fff",
                      }}>
                        {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                      </span>
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}
                        className="line-clamp-1">{item.beer_name}</p>
                      {item.beer_style && <p style={{ fontSize: 10, color: "#8a7d74", marginBottom: 4 }} className="line-clamp-1">{item.beer_style}</p>}
                      <div className="flex items-center gap-1">
                        {item.pub_logo ? (
                          <img src={item.pub_logo} alt={item.pub_name} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <Store className="w-3 h-3 flex-shrink-0" style={{ color: "#8a7d74" }} />
                        )}
                        <p style={{ fontSize: 10, color: "#8a7d74" }} className="truncate">{item.pub_name}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── PUB VICINI ─────────────────────────────────────────────────── */}
        {!isOwner && !isAdminWithPubs && (
          <section className="mt-7">
            <SecHead
              label="VICINO A TE"
              title={userLocation ? "Pub vicini" : "Pub consigliati"}
              href="/explore/pubs"
            />
            {pubsLoading ? (
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-52 h-48 rounded-lg animate-pulse"
                    style={{ background: "#161412" }} />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-ios"
                style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
                {sortedPubs.map((pub: any) => (
                  <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                    <PubCard pub={pub} userLocation={userLocation} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── BIRRIFICI ─────────────────────────────────────────────────── */}
        {breweries.length > 0 && !isOwner && (
          <section className="mt-7">
            <SecHead label="SCOPRI" title="Birrifici artigianali" href="/explore/breweries" />
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-ios"
              style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
              {breweries.map((brewery: any) => {
                const bg = brewery.coverImageUrl || brewery.logoUrl;
                return (
                  <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                    <div className="flex-shrink-0 cursor-pointer" style={{ width: 140, borderRadius: 8, overflow: "hidden", background: "#161412", border: "1px solid #2a2420" }}>
                      <div style={{ position: "relative", height: 88, overflow: "hidden" }}>
                        {bg ? (
                          <img src={bg} alt={brewery.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: "rgba(255,255,255,0.7)" }}>
                              {brewery.name?.[0]?.toUpperCase() ?? "B"}
                            </span>
                          </div>
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.8) 0%, transparent 55%)" }} />
                        {(brewery.location || brewery.region) && (
                          <div className="absolute bottom-1.5 left-2 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.75)" }} />
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 600 }} className="truncate max-w-[100px]">
                              {brewery.city || brewery.location || brewery.region}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", letterSpacing: "-0.02em", lineHeight: 1.2 }} className="line-clamp-2">
                          {brewery.name}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── ULTIME DAI BIRRIFICI ────────────────────────────────────────── */}
        {(homeAnnouncements as any[]).length > 0 && (
          <section className="mt-7">
            <SecHead label="NOVITÀ" title="Dai birrifici" />
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-ios"
              style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
              {(homeAnnouncements as any[]).map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string }> = {
                  news:    { label: "Novità",      color: "#2563eb" },
                  release: { label: "Nuova Birra", color: "#d97706" },
                  collab:  { label: "Collab",      color: "#7c3aed" },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="flex-shrink-0 cursor-pointer" style={{
                      width: 200, padding: "14px", borderRadius: 8,
                      background: "#161412", border: "1px solid #2a2420",
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        {ann.breweryLogo ? (
                          <img src={ann.breweryLogo} alt={ann.breweryName}
                            className="w-7 h-7 rounded-full object-contain flex-shrink-0"
                            style={{ background: "#1a1612", padding: 2 }} />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "#f59e0b" }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: "#080706" }}>{ann.breweryName?.[0]}</span>
                          </div>
                        )}
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#c8bdb4" }} className="truncate">{ann.breweryName}</p>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: t.color, color: "#fff", display: "inline-block", marginBottom: 8 }}>
                        {t.label}
                      </span>
                      <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", letterSpacing: "-0.01em", lineHeight: 1.35 }} className="line-clamp-2">
                        {ann.title}
                      </p>
                      {ann.releaseDate && (
                        <p style={{ fontSize: 10, color: "#8a7d74", marginTop: 6 }}>
                          Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}
                        </p>
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
          <section className="mt-7">
            <SecHead label="TENDENZE" title="Stili più amati" href="/explore/beers" linkLabel="Esplora →" />
            <div className="mt-3" style={{ border: "1px solid #1f1d1a", borderRadius: 8, overflow: "hidden" }}>
              {(() => {
                const top = popularStyles.slice(0, 8);
                const max = top[0]?.count ?? 1;
                return top.map((s, i) => (
                  <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                    <div className="flex items-center gap-3 py-2.5 px-4 cursor-pointer"
                      style={{ borderBottom: i < top.length - 1 ? "1px solid #1f1d1a" : "none", background: "#080706" }}>
                      <span style={{ width: 20, textAlign: "right", fontSize: 11, fontWeight: 800, color: i < 3 ? "#f59e0b" : "#8a7d74", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#ede8e1", marginBottom: 4, letterSpacing: "-0.01em" }} className="truncate">
                          {s.style}
                        </p>
                        <div style={{ height: 3, background: "#1f1d1a", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#f59e0b", borderRadius: 2, width: `${Math.round((s.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", flexShrink: 0, tabularNums: true } as any}>
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
        {user && Array.isArray(favorites) && (favorites as any[]).length > 0 && (
          <section className="mt-7">
            <SecHead label="I TUOI" title="Preferiti" href="/dashboard?tab=favorites" linkLabel="Tutti →" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(favorites as any[]).filter((f: any) => ['pub', 'brewery', 'beer'].includes(f.itemType) && f.itemName).slice(0, 6).map((fav: any) => {
                const href = fav.itemType === 'pub' ? `/pub/${fav.itemId}` : fav.itemType === 'brewery' ? `/brewery/${fav.itemId}` : `/beer/${fav.itemId}`;
                const TypeIcon = fav.itemType === 'pub' ? Store : fav.itemType === 'brewery' ? Building2 : Beer;
                return (
                  <Link key={fav.id} href={href}>
                    <div className="cursor-pointer p-3 flex flex-col items-center text-center gap-2 rounded-lg"
                      style={{ background: "#161412", border: "1px solid #2a2420" }}>
                      {fav.itemImageUrl ? (
                        <img src={fav.itemImageUrl} alt={fav.itemName}
                          className="w-10 h-10 rounded-lg object-cover"
                          style={{ border: "1px solid #2a2420" }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: "#f59e0b" }}>
                          <TypeIcon className="w-5 h-5" style={{ color: "#080706" }} />
                        </div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#ede8e1", lineHeight: 1.2 }} className="line-clamp-2">
                        {fav.itemName}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── STATS COMMUNITY ─────────────────────────────────────────────── */}
        <section className="mt-8 mb-8">
          <div style={{ borderRadius: 10, background: "#161412", border: "1px solid #2a2420", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a7d74", textAlign: "center", marginBottom: 16 }}>
                La community fermenta<span style={{ color: "#f59e0b" }}>.to</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#2a2420", marginBottom: 1 }}>
                {[
                  { value: globalStats?.totalBeers, label: "Birre", color: "#f59e0b" },
                  { value: globalStats?.totalBreweries, label: "Birrifici", color: "#38bdf8" },
                  { value: globalStats?.uniqueStyles, label: "Stili", color: "#34d399" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#161412", padding: "14px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
                      {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                    </p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#8a7d74", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#2a2420" }}>
                {[
                  { value: globalStats?.totalUsers, label: "Utenti", color: "#a78bfa" },
                  { value: globalStats?.totalPubs, label: "Pub", color: "#fb923c" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#161412", padding: "12px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 }}>
                      {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                    </p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#8a7d74", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA per non iscritti ───────────────────────────────────────── */}
        {!isAuthenticated && (
          <div className="mb-8 grid grid-cols-2 gap-3">
            <Link href="/become-publican">
              <div className="p-4 rounded-lg cursor-pointer" style={{ background: "#161412", border: "1px solid #2a2420" }}>
                <Store className="w-5 h-5 mb-2" style={{ color: "#f59e0b" }} />
                <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", marginBottom: 3 }}>Gestisci un pub?</p>
                <p style={{ fontSize: 10, color: "#8a7d74", marginBottom: 10 }}>Taplist live e visibilità.</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>Inizia →</span>
              </div>
            </Link>
            <Link href="/become-publican">
              <div className="p-4 rounded-lg cursor-pointer" style={{ background: "#161412", border: "1px solid #2a2420" }}>
                <Building2 className="w-5 h-5 mb-2" style={{ color: "#f59e0b" }} />
                <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", marginBottom: 3 }}>Sei un birrificio?</p>
                <p style={{ fontSize: 10, color: "#8a7d74", marginBottom: 10 }}>Pubblica le tue birre.</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>Registrati →</span>
              </div>
            </Link>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SecHead({
  label, title, href, linkLabel = "Vedi tutti →", dot,
}: {
  label: string; title: string; href?: string; linkLabel?: string; dot?: "green";
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", marginBottom: 3 }}>
          {dot && <span style={{ color: "#34d399", marginRight: 4 }}>●</span>}
          {label}
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#ede8e1", margin: 0, lineHeight: 1.1 }}>
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{linkLabel}</span>
        </Link>
      )}
    </div>
  );
}

function OwnerAction({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="p-4 rounded-lg cursor-pointer" style={{ background: "#161412", border: "1px solid #2a2420" }}>
      <Icon className="w-5 h-5 mb-2" style={{ color: "#f59e0b" }} />
      <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{sub}</p>
    </div>
  );
}

function PubCard({ pub, userLocation }: { pub: any; userLocation: { lat: number; lng: number } | null }) {
  const img = pub.coverImageUrl || pub.logoUrl || pub.imageUrl;
  const dist = userLocation && pub._distance != null && pub._distance !== Infinity
    ? fmtDist(pub._distance) : null;

  return (
    <div className="flex-shrink-0 cursor-pointer" style={{ width: 220, borderRadius: 8, overflow: "hidden", background: "#161412", border: "1px solid #2a2420" }}>
      <div style={{ position: "relative", height: 132, overflow: "hidden" }}>
        {img ? (
          <img src={img} alt={pub.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a1612, #2a2420)" }}>
            <Store className="w-8 h-8" style={{ color: "#3a3530" }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.9) 0%, transparent 55%)" }} />
        {pub.rating && (
          <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 800, padding: "2px 7px", background: "#f59e0b", color: "#080706", borderRadius: 4 }}>
            ★ {Number(pub.rating).toFixed(1)}
          </span>
        )}
        <div style={{ position: "absolute", bottom: 8, left: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#ede8e1", letterSpacing: "-0.03em", marginBottom: 2, lineHeight: 1.1 }} className="line-clamp-1">
            {pub.name}
          </p>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 10, color: "#c8bdb4" }}>
              {pub.city || pub.address || "Italia"}{dist ? ` · ${dist}` : ""}
            </span>
          </div>
        </div>
      </div>
      {/* Taplist count */}
      {pub.tapCount != null && (
        <div style={{ padding: "7px 10px", borderTop: "1px solid #1f1d1a", display: "flex", alignItems: "center", gap: 5 }}>
          <Beer className="w-3 h-3" style={{ color: "#f59e0b" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#8a7d74" }}>{pub.tapCount} spine</span>
        </div>
      )}
    </div>
  );
}

function PubOwnerCard({ pub }: { pub: any }) {
  const img = pub.logoUrl || pub.coverImageUrl || pub.imageUrl;
  return (
    <Link href="/dashboard">
      <div className="flex items-center gap-3 p-4 rounded-lg cursor-pointer"
        style={{ background: "#161412", border: "1px solid #2a2420" }}>
        {img ? (
          <img src={img} alt={pub.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            style={{ border: "1px solid #2a2420" }} />
        ) : (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
            <Store className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 14, fontWeight: 800, color: "#ede8e1", letterSpacing: "-0.02em" }} className="truncate">{pub.name}</p>
          <p style={{ fontSize: 11, color: "#8a7d74", marginTop: 1 }} className="truncate">{pub.address}</p>
          {pub.subscriptionStatus && (
            <p style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", marginTop: 3 }}>
              {subscriptionLabel(pub.subscriptionStatus)}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#8a7d74" }} />
      </div>
    </Link>
  );
}
