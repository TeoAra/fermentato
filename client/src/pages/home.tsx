import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  Beer, MapPin, Store, TrendingUp, Navigation, Building2,
  Search, ChevronRight, ArrowRight,
} from "lucide-react";
import Footer from "@/components/footer";
import HomepageMap from "@/components/homepage-map";

/* ─── helpers ─────────────────────────────────────────────────── */

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmtDist(km: number) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }
function subscriptionLabel(s?: string | null) {
  if (s === 'active') return '✓ Abbonamento attivo';
  if (s === 'trial')  return '◑ Prova gratuita';
  return '○ Scaduto';
}

const STYLE_CHIPS = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison", "Porter", "Pale Ale"];

/* ─── design tokens (identici al mockup) ─────────────────────── */
const C = {
  bg:       "#fafaf8",
  dark:     "#111009",
  border:   "2px solid #111009",
  amber:    "#d97706",
  amberLt:  "#f59e0b",
  muted:    "#9d8e86",
  green:    "#10b981",
  shadow:   "2px 2px 0 #111009",
  tapBg:    "#f0ece8",
};

/* ─── section header (identico al mockup) ────────────────────── */
function SecHead({ label, title, href, linkLabel = "Tutti →", live = false }: {
  label: string; title: string; href?: string; linkLabel?: string; live?: boolean;
}) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 2 }}>
          {live && <span style={{ color: "#34d399" }}>● </span>}{label}
        </p>
        <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: C.dark, margin: 0, lineHeight: 1.05 }}>{title}</h2>
      </div>
      {href && (
        <Link href={href}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>{linkLabel}</span>
        </Link>
      )}
    </div>
  );
}

/* ─── pub card con taplist inline (identica al mockup) ───────── */
function PubCard({ pub, userLocation }: { pub: any; userLocation: { lat: number; lng: number } | null }) {
  const img = pub.coverImageUrl || pub.logoUrl || pub.imageUrl;
  const dist = userLocation && pub._distance != null && pub._distance !== Infinity ? fmtDist(pub._distance) : null;
  const taps: any[] = Array.isArray(pub.taplist) ? pub.taplist.slice(0, 2) : [];
  return (
    <div style={{
      flexShrink: 0, width: 230,
      border: C.border, borderRadius: 8, overflow: "hidden",
      background: C.bg, cursor: "pointer",
      boxShadow: C.shadow,
    }}>
      {/* Photo */}
      <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
        {img ? (
          <img src={img} alt={pub.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.78)" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a1612,#2a2420)" }}>
            <Store className="w-8 h-8" style={{ color: "#3a3530" }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(17,16,9,.88) 0%,transparent 50%)" }} />
        <span style={{ position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800, padding: "3px 8px", background: pub.isOpen !== false ? C.green : "#6b7280", color: "#fff", borderRadius: 4 }}>
          {pub.isOpen !== false ? "● Aperto" : "● Chiuso"}
        </span>
        {pub.rating && (
          <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 800, padding: "3px 8px", background: C.amberLt, color: C.dark, borderRadius: 4 }}>
            ★ {Number(pub.rating).toFixed(1)}
          </span>
        )}
        <div style={{ position: "absolute", bottom: 8, left: 10, right: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#fafaf8", margin: "0 0 1px", letterSpacing: "-0.03em" }} className="line-clamp-1">{pub.name}</p>
          <p style={{ fontSize: 10, color: "#c8bdb4", margin: 0 }}>
            {pub.city || pub.address || "Italia"}{dist ? ` · ${dist}` : ""}{pub.tapCount ? ` · ${pub.tapCount} spine` : ""}
          </p>
        </div>
      </div>
      {/* Taplist inline */}
      {taps.length > 0 && (
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {taps.map((t: any, j: number) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", background: C.tapBg, borderRadius: 4 }}>
              <Beer size={9} color={C.amber} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b6260" }} className="truncate">
                {t.beerName || t.beer_name || t.name}{(t.abv || t.beer_abv) ? ` ${t.abv || t.beer_abv}%` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── component principale ───────────────────────────────────── */

const TABS = ["Pub vicini", "In spina", "Birrifici"];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [heroSearch, setHeroSearch]   = useState("");
  const [activeTab, setActiveTab]     = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle'|'requesting'|'granted'|'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      p => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('granted'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      p => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('granted'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
  };

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => { await queryClient.invalidateQueries(); }, [queryClient]);
  const { isPulling, isRefreshing } = usePullToRefresh(handleRefresh);

  /* queries */
  const { data: pubs, isLoading: pubsLoading } = useQuery({ queryKey: ["/api/pubs"], staleTime: 5 * 60 * 1000 });
  const { data: breweriesRaw } = useQuery({
    queryKey: ["/api/breweries"],
    queryFn: () => fetch("/api/breweries?random=true&limit=40").then(r => r.json()),
    staleTime: 0, gcTime: 2 * 60 * 1000, refetchOnMount: true, refetchOnWindowFocus: false,
  });
  const breweries: any[] = useMemo(() => {
    if (!Array.isArray(breweriesRaw) || !breweriesRaw.length) return [];
    return [...breweriesRaw].sort(() => Math.random() - 0.5).slice(0, 12);
  }, [breweriesRaw]);

  const { data: taplistActivity = [] }   = useQuery<any[]>({ queryKey: ["/api/home/taplist-activity"], staleTime: 2 * 60 * 1000 });
  const { data: homeAnnouncements = [] } = useQuery<any[]>({ queryKey: ["/api/home/announcements"],    staleTime: 5 * 60 * 1000 });
  const { data: popularStyles }          = useQuery<{ style: string; count: number }[]>({ queryKey: ["/api/beers/popular-styles"], staleTime: 10 * 60 * 1000 });
  const { data: allBreweries }           = useQuery({ queryKey: ["/api/breweries/all"], staleTime: 5 * 60 * 1000 });
  const { data: favorites }              = useQuery({ queryKey: ["/api/favorites"],     enabled: !!user });
  const { data: myPubs }                 = useQuery({
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

  /* derived */
  const sortedPubs: any[] = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 6);
    return [...(pubs as any[])]
      .map(p => ({ ...p, _distance: p.latitude && p.longitude ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude)) : Infinity }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 6);
  }, [pubs, userLocation]);

  const openPubCount = Array.isArray(pubs) ? (pubs as any[]).filter((p: any) => p.isOpen !== false).length : 0;

  const isOwner         = (user as any)?.userType === 'pub_owner';
  const isBreweryOwner  = (user as any)?.userType === 'brewery_owner';
  const isAdmin         = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');
  const isAdminWithPubs = (user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0;

  const featuredBrewery: any = breweries[0] ?? null;

  /* ─── render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.dark }}>

      {/* pull-to-refresh */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5"
          style={{ background: "rgba(250,250,248,0.96)", borderBottom: "1px solid #e5ddd5", backdropFilter: "blur(8px)" }}>
          {isRefreshing
            ? <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: C.amberLt, borderTopColor: "transparent" }} />
                Aggiornamento…
              </div>
            : <p style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>↓ Rilascia per aggiornare</p>
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ZONA MAPPA — atmosferica con search floating (mockup §1)
      ═══════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", height: 280, overflow: "hidden", flexShrink: 0, background: "#0f0d0a" }}>

        {/* Mappa reale */}
        <HomepageMap
          pubs={Array.isArray(pubs) ? pubs : []}
          breweries={Array.isArray(allBreweries) ? allBreweries : breweries}
          userLocation={userLocation}
          isLoading={pubsLoading}
          onLocate={loc => { setUserLocation(loc); setLocationStatus('granted'); }}
        />

        {/* Overlay griglia stradale SVG */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" x="0" y="0" width="58" height="58" patternUnits="userSpaceOnUse">
              <line x1="0" y1="29" x2="58" y2="29" stroke="#3a3228" strokeWidth="1" />
              <line x1="29" y1="0" x2="29" y2="58" stroke="#3a3228" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.35" />
          {/* strade principali */}
          <rect x="24%" y="0" width="6%"  height="100%" fill="rgba(58,50,40,0.45)" />
          <rect x="61%" y="0" width="5%"  height="100%" fill="rgba(58,50,40,0.32)" />
          <rect x="0" y="35%" width="100%" height="6%" fill="rgba(58,50,40,0.45)" />
          <rect x="0" y="64%" width="100%" height="4%" fill="rgba(58,50,40,0.28)" />
        </svg>

        {/* Gradiente bottom → #fafaf8 (identico al mockup) */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, transparent, #fafaf8)", pointerEvents: "none" }} />

        {/* ── SEARCH FLOATING sulla mappa (identica al mockup) ── */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 10 }}>
          <form onSubmit={handleHeroSearch} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: "rgba(250,250,248,0.95)",
              border: C.border, borderRadius: 8,
              padding: "0 12px", height: 42,
              boxShadow: C.shadow,
              backdropFilter: "blur(8px)",
            }}>
              <Search size={14} color={C.muted} />
              <input
                type="text" value={heroSearch} onChange={e => setHeroSearch(e.target.value)}
                placeholder="Pub, birrificio o birra…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: C.dark, fontWeight: 500 }}
              />
            </div>
            <button type="button" onClick={handleGPS} style={{
              width: 42, height: 42, border: C.border,
              borderRadius: 8, background: locationStatus === 'granted' ? C.green : C.amberLt,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: C.shadow, flexShrink: 0,
            }}>
              <Navigation size={16} color={C.dark} />
            </button>
          </form>

          {/* Style chips flottanti */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {STYLE_CHIPS.slice(0, 5).map(style => (
              <button key={style} onClick={() => navigate(`/explore/beers?style=${encodeURIComponent(style)}`)}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 9px",
                  background: "rgba(250,250,248,0.9)", border: "1.5px solid #111009",
                  borderRadius: 5, color: C.dark, cursor: "pointer",
                  backdropFilter: "blur(6px)",
                }}>
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Badge LIVE floating (identico al mockup) */}
        {openPubCount > 0 && (
          <div style={{
            position: "absolute", bottom: 106, left: 10, zIndex: 10,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(15,13,10,0.88)", border: "1px solid #2a2420",
            borderRadius: 6, padding: "5px 10px", backdropFilter: "blur(8px)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#ede8e1" }}>
              {openPubCount} pub apert{openPubCount === 1 ? 'o' : 'i'}
              {locationStatus === 'granted' ? " · vicino a te" : " in Italia"}
            </span>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          SEZIONE EDITORIALE — white, da mockup §2
      ═══════════════════════════════════════════════════════ */}
      <div style={{ background: C.bg, maxWidth: 640, margin: "0 auto" }}>

        {/* ── Owner quick actions ── */}
        {(isOwner || isAdminWithPubs || isBreweryOwner || isAdmin) && (
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #111009", display: "flex", gap: 8 }}>
            {(isOwner || isAdminWithPubs) && (
              <Link href="/dashboard" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: C.border, borderRadius: 8, cursor: "pointer", boxShadow: C.shadow, background: C.dark }}>
                  <Store size={16} color={C.amberLt} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.bg, margin: "0 0 2px" }}>Il mio pub</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amberLt, margin: 0 }}>Dashboard →</p>
                </div>
              </Link>
            )}
            {isBreweryOwner && (
              <Link href="/brewery-dashboard" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: C.border, borderRadius: 8, cursor: "pointer", boxShadow: `2px 2px 0 ${C.amber}`, background: C.bg }}>
                  <Building2 size={16} color={C.amber} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.dark, margin: "0 0 2px" }}>Il mio birrificio</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amber, margin: 0 }}>Gestisci →</p>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: C.border, borderRadius: 8, cursor: "pointer", boxShadow: C.shadow, background: C.bg }}>
                  <TrendingUp size={16} color={C.amber} style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.dark, margin: "0 0 2px" }}>Admin</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amber, margin: 0 }}>Pannello →</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Il tuo pub (owner view) ── */}
        {(isOwner || isAdminWithPubs) && Array.isArray(myPubs) && myPubs.length > 0 && (
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #111009" }}>
            <SecHead label="IL TUO PUB" title="Gestisci" href="/dashboard" linkLabel="Dashboard →" />
            {(myPubs as any[]).map((pub: any) => (
              <Link key={pub.id} href="/dashboard">
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: C.border, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", background: C.bg, marginTop: 8 }}>
                  {(pub.logoUrl || pub.coverImageUrl)
                    ? <img src={pub.logoUrl || pub.coverImageUrl} alt={pub.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.dark }}>
                        <Store size={18} color={C.amberLt} />
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }} className="truncate">{pub.name}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 1 }} className="truncate">{pub.address}</p>
                    {pub.subscriptionStatus && <p style={{ fontSize: 10, fontWeight: 700, color: C.amber, marginTop: 2 }}>{subscriptionLabel(pub.subscriptionStatus)}</p>}
                  </div>
                  <ChevronRight size={16} color={C.muted} className="flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Il tuo birrificio (brewery owner view) ── */}
        {isBreweryOwner && myBreweryData?.brewery && (
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #111009" }}>
            <SecHead label="IL TUO BIRRIFICIO" title={myBreweryData.brewery.name} href="/brewery-dashboard" linkLabel="Gestisci →" />
            <Link href={`/brewery/${myBreweryData.brewery.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: C.border, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", background: C.bg, marginTop: 8 }}>
                {myBreweryData.brewery.logoUrl
                  ? <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.dark }}>
                      <Building2 size={18} color={C.amberLt} />
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em" }} className="truncate">{myBreweryData.brewery.name}</p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {myBreweryData.brewery.location} · {myBreweryData.beers?.length ?? 0} birre
                  </p>
                </div>
                <ChevronRight size={16} color={C.muted} className="flex-shrink-0" />
              </div>
            </Link>
          </div>
        )}

        {/* ── Live updates (da mockup §2.1) ── */}
        {(taplistActivity as any[]).length > 0 && !isOwner && (
          <div style={{ borderBottom: "2px solid #111009" }}>
            <div style={{ padding: "10px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, margin: 0 }}>
                <span style={{ color: "#34d399" }}>●</span> Aggiornamenti live
              </p>
              <Link href="/explore/pubs"><span style={{ fontSize: 10, color: C.amber, fontWeight: 700, cursor: "pointer" }}>Tutti →</span></Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {(taplistActivity as any[]).slice(0, 3).map((item: any, i: number) => (
                <Link key={item.id} href={`/pub/${item.pub_id}`}>
                  <div style={{ padding: "9px 18px", display: "flex", gap: 10, alignItems: "center", borderTop: i > 0 ? "1px solid #e5ddd5" : "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🍺</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.dark, margin: "0 0 1px", letterSpacing: "-0.01em" }} className="truncate">{item.pub_name}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }} className="truncate">
                        {item.beer_name}{item.beer_style ? ` · ${item.beer_style}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: item.tap_type === 'pompa' ? "#7c3aed" : C.amberLt, color: "#fff", flexShrink: 0 }}>
                      {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Birrificio in evidenza — dark editorial block (da mockup §2.2) ── */}
        {featuredBrewery && !isOwner && (
          <Link href={`/brewery/${featuredBrewery.id}`}>
            <div style={{ cursor: "pointer" }}>
              <div style={{ position: "relative" }}>
                {(featuredBrewery.coverImageUrl || featuredBrewery.logoUrl) ? (
                  <img src={featuredBrewery.coverImageUrl || featuredBrewery.logoUrl} alt={featuredBrewery.name}
                    className="w-full object-cover" style={{ height: 180, filter: "brightness(0.4)" }} />
                ) : (
                  <div style={{ height: 180, background: "linear-gradient(135deg,#1a1612,#2a2018)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: C.amberLt, margin: "0 0 4px" }}>
                    BIRRIFICIO IN EVIDENZA{(featuredBrewery.city || featuredBrewery.location) ? ` · ${featuredBrewery.city || featuredBrewery.location}` : ""}
                  </p>
                  <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fafaf8", margin: "0 0 3px", lineHeight: 1 }}>
                    {featuredBrewery.name}
                  </h2>
                  {featuredBrewery.description && (
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "#c8bdb4", margin: "0 0 6px" }} className="line-clamp-2">
                      {featuredBrewery.description}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.dark, borderBottom: "2px solid #111009" }}>
                <span style={{ fontSize: 11, color: "#8a7d74" }}>
                  {featuredBrewery.city || featuredBrewery.location || "Italia"}
                  {featuredBrewery.yearFounded ? ` · Est. ${featuredBrewery.yearFounded}` : ""}
                </span>
                <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: C.amberLt, background: "transparent", border: "none", cursor: "pointer" }}>
                  Scopri <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </Link>
        )}

        {/* ── Pub vicini con tabs e taplist inline (da mockup §2.3) ── */}
        {!isOwner && !isAdminWithPubs && (
          <div style={{ background: C.bg }}>
            {/* Header */}
            <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, margin: "0 0 2px" }}>VICINO A TE</p>
                <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: C.dark, margin: "0 0 10px" }}>
                  {userLocation ? "Pub aperti adesso" : "Pub consigliati"}
                </h2>
              </div>
              <Link href="/explore/pubs"><span style={{ fontSize: 11, fontWeight: 700, color: C.amber, cursor: "pointer" }}>Mappa →</span></Link>
            </div>

            {/* Tabs brutalisti (identici al mockup) */}
            <div style={{ display: "flex", gap: 0, margin: "0 18px 12px", border: "2px solid #111009", borderRadius: 6, overflow: "hidden" }}>
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)} style={{
                  flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 800,
                  background: activeTab === i ? C.dark : C.bg,
                  color: activeTab === i ? C.bg : C.muted,
                  border: "none", borderLeft: i > 0 ? "1.5px solid #111009" : "none",
                  cursor: "pointer", letterSpacing: "-0.01em",
                }}>{tab}</button>
              ))}
            </div>

            {/* Tab: Pub vicini */}
            {activeTab === 0 && (
              pubsLoading
                ? <div style={{ display: "flex", gap: 8, overflow: "auto", padding: "0 18px 16px" }}>
                    {[...Array(3)].map((_, i) => <div key={i} style={{ flexShrink: 0, width: 230, height: 176, borderRadius: 8, background: "#e5ddd5", animation: "pulse 1.5s infinite" }} />)}
                  </div>
                : <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ padding: "0 18px 16px" }}>
                    {sortedPubs.map(pub => (
                      <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                        <PubCard pub={pub} userLocation={userLocation} />
                      </Link>
                    ))}
                  </div>
            )}

            {/* Tab: In spina */}
            {activeTab === 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ padding: "0 18px 16px" }}>
                {(taplistActivity as any[]).map((item: any) => (
                  <Link key={item.id} href={`/pub/${item.pub_id}`}>
                    <div style={{ flexShrink: 0, width: 148, border: C.border, borderRadius: 8, overflow: "hidden", boxShadow: C.shadow, background: C.bg, cursor: "pointer" }}>
                      <div style={{ position: "relative", height: 96 }}>
                        {item.beer_image
                          ? <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" style={{ filter: "brightness(0.8)" }} />
                          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                              <Beer size={24} color="rgba(255,255,255,0.7)" />
                            </div>
                        }
                        <span style={{ position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: item.tap_type === 'pompa' ? "#7c3aed" : C.amberLt, color: "#fff" }}>
                          {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                        </span>
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }} className="line-clamp-1">{item.beer_name}</p>
                        {item.beer_style && <p style={{ fontSize: 10, color: C.muted, marginBottom: 3 }} className="line-clamp-1">{item.beer_style}</p>}
                        <p style={{ fontSize: 10, color: C.muted }} className="truncate">{item.pub_name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Tab: Birrifici */}
            {activeTab === 2 && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ padding: "0 18px 16px" }}>
                {breweries.map((brewery: any) => {
                  const bg = brewery.coverImageUrl || brewery.logoUrl;
                  return (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                      <div style={{ flexShrink: 0, width: 148, border: C.border, borderRadius: 8, overflow: "hidden", boxShadow: C.shadow, background: C.bg, cursor: "pointer" }}>
                        <div style={{ position: "relative", height: 88 }}>
                          {bg
                            ? <img src={bg} alt={brewery.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
                            : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)" }}>
                                <span style={{ fontSize: 26, fontWeight: 900, color: "rgba(255,255,255,0.7)" }}>{brewery.name?.[0]?.toUpperCase()}</span>
                              </div>
                          }
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(17,16,9,.7) 0%,transparent 55%)" }} />
                          {(brewery.city || brewery.location) && (
                            <div className="absolute bottom-1.5 left-2 flex items-center gap-0.5">
                              <MapPin size={9} color="rgba(255,255,255,0.8)" />
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", fontWeight: 600 }} className="truncate">{brewery.city || brewery.location}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: C.dark, letterSpacing: "-0.02em", lineHeight: 1.2 }} className="line-clamp-2">{brewery.name}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Ultime dai birrifici ── */}
        {(homeAnnouncements as any[]).length > 0 && (
          <div style={{ borderTop: "2px solid #111009" }}>
            <div style={{ padding: "14px 18px 0" }}>
              <SecHead label="NOVITÀ" title="Dai birrifici" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ padding: "0 18px 16px" }}>
              {(homeAnnouncements as any[]).map((ann: any) => {
                const typeMap: Record<string, { label: string; bg: string }> = {
                  news:    { label: "Novità",      bg: "#2563eb" },
                  release: { label: "Nuova Birra", bg: C.amberLt },
                  collab:  { label: "Collab",      bg: "#7c3aed" },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div style={{ flexShrink: 0, width: 200, padding: 14, border: C.border, borderRadius: 8, boxShadow: C.shadow, background: C.bg, cursor: "pointer" }}>
                      <div className="flex items-center gap-2 mb-3">
                        {ann.breweryLogo
                          ? <img src={ann.breweryLogo} alt={ann.breweryName} className="w-6 h-6 rounded-full object-contain flex-shrink-0" />
                          : <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.amberLt }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: C.dark }}>{ann.breweryName?.[0]}</span>
                            </div>
                        }
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted }} className="truncate">{ann.breweryName}</p>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: t.bg, color: "#fff", display: "inline-block", marginBottom: 8 }}>{t.label}</span>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.dark, letterSpacing: "-0.01em", lineHeight: 1.35 }} className="line-clamp-2">{ann.title}</p>
                      {ann.releaseDate && <p style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stili più amati ── */}
        {isAuthenticated && Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div style={{ borderTop: "2px solid #111009" }}>
            <div style={{ padding: "14px 18px 0" }}>
              <SecHead label="TENDENZE" title="Stili più amati" href="/explore/beers" linkLabel="Esplora →" />
            </div>
            <div style={{ margin: "0 18px 14px", border: "2px solid #111009", borderRadius: 8, overflow: "hidden", boxShadow: C.shadow }}>
              {popularStyles.slice(0, 8).map((s, i) => {
                const max = popularStyles[0]?.count ?? 1;
                return (
                  <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < 7 ? "1px solid #e5ddd5" : "none", background: C.bg, cursor: "pointer" }}>
                      <span style={{ width: 18, textAlign: "right", fontSize: 11, fontWeight: 800, color: i < 3 ? C.amberLt : C.muted, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }} className="truncate">{s.style}</p>
                        <div style={{ height: 3, background: "#e5ddd5", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: C.amberLt, borderRadius: 2, width: `${Math.round((s.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, flexShrink: 0 }}>{s.count.toLocaleString('it-IT')}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Preferiti ── */}
        {user && Array.isArray(favorites) && (favorites as any[]).length > 0 && (
          <div style={{ padding: "14px 18px", borderTop: "2px solid #111009" }}>
            <SecHead label="I TUOI" title="Preferiti" href="/dashboard?tab=favorites" linkLabel="Tutti →" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(favorites as any[]).filter((f: any) => ['pub','brewery','beer'].includes(f.itemType) && f.itemName).slice(0, 6).map((fav: any) => {
                const href = fav.itemType === 'pub' ? `/pub/${fav.itemId}` : fav.itemType === 'brewery' ? `/brewery/${fav.itemId}` : `/beer/${fav.itemId}`;
                const TypeIcon = fav.itemType === 'pub' ? Store : fav.itemType === 'brewery' ? Building2 : Beer;
                return (
                  <Link key={fav.id} href={href}>
                    <div style={{ padding: "12px 8px", border: C.border, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: C.bg }}>
                      {fav.itemImageUrl
                        ? <img src={fav.itemImageUrl} alt={fav.itemName} className="w-10 h-10 rounded-lg object-cover" />
                        : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: C.amberLt }}>
                            <TypeIcon size={18} color={C.dark} />
                          </div>
                      }
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.dark, lineHeight: 1.2, textAlign: "center" }} className="line-clamp-2">{fav.itemName}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats community ── */}
        <div style={{ padding: "14px 18px", borderTop: "2px solid #111009" }}>
          <div style={{ border: "2px solid #111009", borderRadius: 8, overflow: "hidden", boxShadow: C.shadow }}>
            <div style={{ background: C.dark, padding: "10px 18px", textAlign: "center", borderBottom: "1px solid #2a2420" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>
                La community fermenta<span style={{ color: C.amberLt }}>.to</span>
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {[
                { value: globalStats?.totalBeers,     label: "Birre",    color: C.amberLt },
                { value: globalStats?.totalBreweries, label: "Birrifici", color: "#38bdf8" },
                { value: globalStats?.uniqueStyles,   label: "Stili",    color: "#34d399" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "14px 0", textAlign: "center", borderRight: i < 2 ? "1px solid #e5ddd5" : "none" }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 }}>
                    {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #e5ddd5" }}>
              {[
                { value: globalStats?.totalUsers, label: "Utenti", color: "#a78bfa" },
                { value: globalStats?.totalPubs,  label: "Pub",    color: "#fb923c" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "12px 0", textAlign: "center", borderRight: i === 0 ? "1px solid #e5ddd5" : "none" }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 }}>
                    {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA strip brutalista (da mockup §2.4) ── */}
        <div style={{ padding: "0 18px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderTop: "2px solid #111009" }}>
          <Link href="/become-publican">
            <div style={{ padding: "14px 12px", border: C.border, borderRadius: 8, background: C.bg, boxShadow: C.shadow, cursor: "pointer" }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.dark, margin: "0 0 3px" }}>Gestisci un pub?</p>
              <p style={{ fontSize: 10, color: C.muted, margin: "0 0 10px" }}>Taplist live e visibilità.</p>
              <button style={{ width: "100%", padding: "7px 0", background: C.dark, color: C.bg, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                Inizia →
              </button>
            </div>
          </Link>
          <Link href="/become-publican">
            <div style={{ padding: "14px 12px", border: C.border, borderRadius: 8, background: C.bg, boxShadow: `2px 2px 0 ${C.amber}`, cursor: "pointer" }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.dark, margin: "0 0 3px" }}>Sei un birrificio?</p>
              <p style={{ fontSize: 10, color: C.muted, margin: "0 0 10px" }}>Pubblica e raggiungi i fan.</p>
              <button style={{ width: "100%", padding: "7px 0", background: C.amber, color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                Registrati →
              </button>
            </div>
          </Link>
        </div>

      </div>

      <Footer />
    </div>
  );
}
