import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  Beer, MapPin, Heart, Store, TrendingUp, Navigation, Building2,
  Megaphone, Newspaper, Rocket, Users, Droplets, Search, ChevronRight,
  ArrowRight,
} from "lucide-react";
import Footer from "@/components/footer";
import HomepageMap from "@/components/homepage-map";

// ─── helpers ────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function subscriptionLabel(status?: string | null) {
  if (status === 'active') return '✓ Abbonamento attivo';
  if (status === 'trial') return '◑ Prova gratuita';
  return '○ Scaduto';
}

const STYLE_CHIPS = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison", "Porter", "Pale Ale"];

// ─── colour tokens ───────────────────────────────────────────────────────────
// Map section: dark atmospheric
// Content section: warm editorial white (#fafaf8) — matches UnifiedMobile
const C = {
  bg:         "#fafaf8",
  mapBg:      "#0f0d0a",
  border:     "#111009",
  borderSoft: "#e5ddd5",
  text:       "#111009",
  textSoft:   "#9d8e86",
  textMuted:  "#c8bdb4",
  amber:      "#d97706",
  amberLight: "#f59e0b",
  green:      "#059669",
  card:       "#fafaf8",
  shadow:     "2px 2px 0 #111009",
};

// ─── Section header — editorial style ───────────────────────────────────────
function SecHead({ label, title, href, linkLabel = "Tutti →", live = false }: {
  label: string; title: string; href?: string; linkLabel?: string; live?: boolean;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textSoft, marginBottom: 2 }}>
          {live && <span style={{ color: "#059669", marginRight: 4 }}>●</span>}{label}
        </p>
        <h2 style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.035em", color: C.text, margin: 0, lineHeight: 1.05 }}>
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>{linkLabel}</span>
        </Link>
      )}
    </div>
  );
}

// ─── Pub card — with taplist inline ──────────────────────────────────────────
function PubCard({ pub, userLocation }: { pub: any; userLocation: { lat: number; lng: number } | null }) {
  const img = pub.coverImageUrl || pub.logoUrl || pub.imageUrl;
  const dist = userLocation && pub._distance != null && pub._distance !== Infinity ? fmtDist(pub._distance) : null;
  const taps: any[] = Array.isArray(pub.taplist) ? pub.taplist.slice(0, 2) : [];

  return (
    <div className="flex-shrink-0" style={{
      width: 230, borderRadius: 8, overflow: "hidden",
      border: `2px solid ${C.border}`, background: C.card,
      boxShadow: C.shadow, cursor: "pointer",
    }}>
      {/* Photo */}
      <div style={{ position: "relative", height: 132, overflow: "hidden" }}>
        {img ? (
          <img src={img} alt={pub.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.8)" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a1612, #2a2420)" }}>
            <Store className="w-8 h-8" style={{ color: "#3a3530" }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(17,16,9,0.88) 0%, transparent 50%)" }} />
        {/* Open badge */}
        <span style={{
          position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800,
          padding: "3px 8px", borderRadius: 4,
          background: pub.isOpen !== false ? "#059669" : "#6b7280", color: "#fff",
        }}>
          {pub.isOpen !== false ? "● Aperto" : "● Chiuso"}
        </span>
        {/* Rating */}
        {pub.rating && (
          <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 800, padding: "3px 8px", background: C.amberLight, color: C.mapBg, borderRadius: 4 }}>
            ★ {Number(pub.rating).toFixed(1)}
          </span>
        )}
        {/* Name + location */}
        <div style={{ position: "absolute", bottom: 8, left: 10, right: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#fafaf8", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 2 }} className="line-clamp-1">
            {pub.name}
          </p>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "#c8bdb4" }} />
            <span style={{ fontSize: 10, color: "#c8bdb4" }}>
              {pub.city || pub.address || "Italia"}{dist ? ` · ${dist}` : ""}
              {pub.tapCount ? ` · ${pub.tapCount} spine` : ""}
            </span>
          </div>
        </div>
      </div>
      {/* Taplist inline */}
      {taps.length > 0 && (
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {taps.map((t: any, j: number) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", background: "#f0ece8", borderRadius: 4 }}>
              <Beer className="w-2.5 h-2.5 flex-shrink-0" style={{ color: C.amber }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b6260" }} className="truncate">
                {t.beerName || t.beer_name || t.name}
                {(t.abv || t.beer_abv) ? ` · ${t.abv || t.beer_abv}%` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

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
      p => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('granted'); },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const handleRequestLocation = () => {
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

  // ── Queries ──
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

  // ── Derived ──
  const sortedPubs: any[] = useMemo(() => {
    if (!Array.isArray(pubs)) return [];
    if (!userLocation) return (pubs as any[]).slice(0, 6);
    return [...(pubs as any[])]
      .map(p => ({ ...p, _distance: p.latitude && p.longitude ? haversineDistance(userLocation.lat, userLocation.lng, parseFloat(p.latitude), parseFloat(p.longitude)) : Infinity }))
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 6);
  }, [pubs, userLocation]);

  const isOwner         = (user as any)?.userType === 'pub_owner';
  const isBreweryOwner  = (user as any)?.userType === 'brewery_owner';
  const isAdmin         = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');
  const isAdminWithPubs = (user as any)?.userType === 'admin' && Array.isArray(myPubs) && myPubs.length > 0;

  // Pick a featured brewery from the loaded list for the editorial block
  const featuredBrewery: any = breweries[0] ?? null;

  // ── Tabs ──
  const TABS = ["Pub vicini", "In spina", "Birrifici"];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center py-2.5"
          style={{ background: "rgba(255,255,255,0.95)", borderBottom: `1px solid ${C.borderSoft}`, backdropFilter: "blur(8px)" }}>
          {isRefreshing
            ? <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.amberLight, borderTopColor: "transparent" }} />
                Aggiornamento…
              </div>
            : <p style={{ fontSize: 12, fontWeight: 600, color: C.textSoft }}>↓ Rilascia per aggiornare</p>
          }
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MAPPA ATMOSFERICA — dark, con search brutalista floating
      ════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", background: C.mapBg }}>
        <HomepageMap
          pubs={Array.isArray(pubs) ? pubs : []}
          breweries={Array.isArray(allBreweries) ? allBreweries : breweries}
          userLocation={userLocation}
          isLoading={pubsLoading}
          onLocate={loc => { setUserLocation(loc); setLocationStatus('granted'); }}
        />
        {/* Gradiente fusione mappa → sezione bianca */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56, background: `linear-gradient(to bottom, transparent, ${C.bg})`, pointerEvents: "none" }} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEZIONE EDITORIALE — warm white, editorial
      ════════════════════════════════════════════════════════════ */}
      <div style={{ background: C.bg, maxWidth: 640, margin: "0 auto" }}>

        {/* ── Search brutalista ── */}
        <div style={{ padding: "4px 16px 14px", borderBottom: `2px solid ${C.border}` }}>
          <form onSubmit={handleHeroSearch} style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              background: C.bg, border: `2px solid ${C.border}`, borderRadius: 8,
              padding: "0 14px", height: 44, boxShadow: C.shadow,
            }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.textSoft }} />
              <input
                type="text" value={heroSearch} onChange={e => setHeroSearch(e.target.value)}
                placeholder="Pub, birrificio o birra…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: C.text, fontWeight: 500 }}
              />
            </div>
            <button type="submit" style={{
              padding: "0 18px", height: 44, background: C.text, color: C.bg,
              border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer",
              boxShadow: `2px 2px 0 ${C.amber}`, flexShrink: 0,
            }}>
              Cerca
            </button>
          </form>

          {/* Style chips */}
          <div className="flex gap-2 flex-wrap mt-3">
            {STYLE_CHIPS.map(style => (
              <button key={style} onClick={() => navigate(`/explore/beers?style=${encodeURIComponent(style)}`)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: "4px 10px",
                  background: C.bg, border: `2px solid ${C.border}`,
                  borderRadius: 6, color: C.textSoft, cursor: "pointer",
                }}>
                {style}
              </button>
            ))}
          </div>

          {/* GPS status */}
          {locationStatus === 'denied' && (
            <div className="flex items-center justify-between gap-3 mt-3 px-3 py-2.5 rounded-lg"
              style={{ background: "#fef3c7", border: `1px solid #fde68a` }}>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 flex-shrink-0" style={{ color: C.amber }} />
                <p style={{ fontSize: 12, color: "#92400e" }}>Attiva la posizione per i pub vicini</p>
              </div>
              <button onClick={handleRequestLocation} style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", background: C.amber, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", flexShrink: 0 }}>
                GPS
              </button>
            </div>
          )}
          {locationStatus === 'granted' && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Posizione attiva — risultati per vicinanza</p>
            </div>
          )}
        </div>

        {/* ── Owner quick actions ── */}
        {(isOwner || isAdminWithPubs || isBreweryOwner || isAdmin) && (
          <div style={{ padding: "14px 16px", borderBottom: `2px solid ${C.border}`, display: "flex", gap: 8 }}>
            {(isOwner || isAdminWithPubs) && (
              <Link href="/dashboard" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: `2px solid ${C.border}`, borderRadius: 8, cursor: "pointer", boxShadow: C.shadow, background: C.text }}>
                  <Store className="w-4 h-4 mb-2" style={{ color: C.amberLight }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.bg, marginBottom: 2 }}>Il mio pub</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amberLight }}>Dashboard →</p>
                </div>
              </Link>
            )}
            {isBreweryOwner && (
              <Link href="/brewery-dashboard" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: `2px solid ${C.border}`, borderRadius: 8, cursor: "pointer", boxShadow: `2px 2px 0 ${C.amber}`, background: C.bg }}>
                  <Building2 className="w-4 h-4 mb-2" style={{ color: C.amber }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 2 }}>Il mio birrificio</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amber }}>Gestisci →</p>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" style={{ flex: 1 }}>
                <div style={{ padding: "12px", border: `2px solid ${C.border}`, borderRadius: 8, cursor: "pointer", boxShadow: C.shadow, background: C.bg }}>
                  <TrendingUp className="w-4 h-4 mb-2" style={{ color: C.amber }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 2 }}>Admin</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.amber }}>Pannello →</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── Live updates taplist ── */}
        {(taplistActivity as any[]).length > 0 && !isOwner && (
          <div style={{ borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: "14px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textSoft, margin: 0 }}>
                <span style={{ color: C.green }}>●</span> Aggiornamenti live
              </p>
              <Link href="/explore/pubs"><span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>Tutti →</span></Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(taplistActivity as any[]).slice(0, 3).map((item: any, i: number) => (
                <Link key={item.id} href={`/pub/${item.pub_id}`}>
                  <div style={{ padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", borderTop: i > 0 ? `1px solid ${C.borderSoft}` : "none", cursor: "pointer" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🍺</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.text, margin: "0 0 1px", letterSpacing: "-0.01em" }} className="truncate">
                        {item.pub_name}
                      </p>
                      <p style={{ fontSize: 11, color: C.textSoft, margin: 0 }} className="truncate">
                        {item.beer_name}{item.beer_style ? ` · ${item.beer_style}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: item.tap_type === 'pompa' ? "#7c3aed" : C.amberLight, color: "#fff", flexShrink: 0 }}>
                      {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Birrificio in evidenza — blocco editoriale scuro ── */}
        {featuredBrewery && !isOwner && (
          <Link href={`/brewery/${featuredBrewery.id}`}>
            <div style={{ cursor: "pointer" }}>
              <div style={{ position: "relative" }}>
                {(featuredBrewery.coverImageUrl || featuredBrewery.logoUrl) ? (
                  <img src={featuredBrewery.coverImageUrl || featuredBrewery.logoUrl} alt={featuredBrewery.name}
                    className="w-full object-cover" style={{ height: 188, filter: "brightness(0.42)" }} />
                ) : (
                  <div style={{ height: 188, background: "linear-gradient(135deg, #1a1612, #2a2018)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, padding: "16px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: C.amberLight, margin: "0 0 4px" }}>
                    BIRRIFICIO IN EVIDENZA{featuredBrewery.location ? ` · ${featuredBrewery.city || featuredBrewery.location}` : ""}
                  </p>
                  <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fafaf8", margin: "0 0 4px", lineHeight: 1 }}>
                    {featuredBrewery.name}
                  </h2>
                  {featuredBrewery.description && (
                    <p style={{ fontSize: 12, fontStyle: "italic", color: "#c8bdb4", margin: "0 0 8px" }} className="line-clamp-2">
                      {featuredBrewery.description}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.text, borderBottom: `2px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: "#8a7d74" }}>
                  {featuredBrewery.city || featuredBrewery.location || "Italia"}
                  {featuredBrewery.yearFounded ? ` · Est. ${featuredBrewery.yearFounded}` : ""}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: C.amberLight }}>
                  Scopri <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* ── Pub vicini + tabs ── */}
        {!isOwner && !isAdminWithPubs && (
          <div style={{ borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: "16px 16px 0" }}>
              <SecHead
                label="VICINO A TE"
                title={userLocation ? "Pub aperti adesso" : "Pub consigliati"}
                href="/explore/pubs"
              />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", margin: "0 16px 14px", border: `2px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)} style={{
                  flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 800,
                  background: activeTab === i ? C.text : C.bg,
                  color: activeTab === i ? C.bg : C.textSoft,
                  border: "none", borderLeft: i > 0 ? `1.5px solid ${C.border}` : "none",
                  cursor: "pointer", letterSpacing: "-0.01em",
                }}>{tab}</button>
              ))}
            </div>

            {/* Tab content: Pub vicini */}
            {activeTab === 0 && (
              pubsLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-4 px-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-52 h-44 rounded-lg animate-pulse" style={{ background: "#e5ddd5" }} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ paddingLeft: 16, paddingRight: 16 }}>
                  {sortedPubs.map(pub => (
                    <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
                      <PubCard pub={pub} userLocation={userLocation} />
                    </Link>
                  ))}
                </div>
              )
            )}

            {/* Tab content: In spina */}
            {activeTab === 1 && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ paddingLeft: 16, paddingRight: 16 }}>
                {(taplistActivity as any[]).map((item: any) => (
                  <Link key={item.id} href={`/pub/${item.pub_id}`}>
                    <div className="flex-shrink-0" style={{ width: 148, cursor: "pointer", border: `2px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: C.shadow, background: C.bg }}>
                      <div style={{ position: "relative", height: 96 }}>
                        {item.beer_image ? (
                          <img src={item.beer_image} alt={item.beer_name} className="w-full h-full object-cover" style={{ filter: "brightness(0.8)" }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            <Beer className="w-7 h-7" style={{ color: "rgba(255,255,255,0.7)" }} />
                          </div>
                        )}
                        <span style={{ position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: item.tap_type === 'pompa' ? "#7c3aed" : C.amberLight, color: "#fff" }}>
                          {item.tap_type === 'pompa' ? 'Pompa' : 'Spina'}
                        </span>
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }} className="line-clamp-1">{item.beer_name}</p>
                        {item.beer_style && <p style={{ fontSize: 10, color: C.textSoft, marginBottom: 3 }} className="line-clamp-1">{item.beer_style}</p>}
                        <p style={{ fontSize: 10, color: C.textSoft }} className="truncate">{item.pub_name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Tab content: Birrifici */}
            {activeTab === 2 && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ paddingLeft: 16, paddingRight: 16 }}>
                {breweries.map((brewery: any) => {
                  const bg = brewery.coverImageUrl || brewery.logoUrl;
                  return (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                      <div className="flex-shrink-0" style={{ width: 148, border: `2px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: C.shadow, background: C.bg, cursor: "pointer" }}>
                        <div style={{ position: "relative", height: 88 }}>
                          {bg ? (
                            <img src={bg} alt={brewery.name} className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}>
                              <span style={{ fontSize: 28, fontWeight: 900, color: "rgba(255,255,255,0.7)" }}>{brewery.name?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(17,16,9,0.7) 0%, transparent 55%)" }} />
                          {(brewery.city || brewery.location) && (
                            <div className="absolute bottom-1.5 left-2 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.8)" }} />
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", fontWeight: 600 }} className="truncate">{brewery.city || brewery.location}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <p style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2 }} className="line-clamp-2">{brewery.name}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Il tuo pub (owner) ── */}
        {(isOwner || isAdminWithPubs) && Array.isArray(myPubs) && myPubs.length > 0 && (
          <div style={{ padding: "16px", borderBottom: `2px solid ${C.border}` }}>
            <SecHead label="IL TUO PUB" title="Gestisci" href="/dashboard" linkLabel="Dashboard →" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(myPubs as any[]).map((pub: any) => (
                <Link key={pub.id} href="/dashboard">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", background: C.bg }}>
                    {(pub.logoUrl || pub.coverImageUrl) ? (
                      <img src={pub.logoUrl || pub.coverImageUrl} alt={pub.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" style={{ border: `1px solid ${C.borderSoft}` }} />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.text }}>
                        <Store className="w-5 h-5" style={{ color: C.amberLight }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }} className="truncate">{pub.name}</p>
                      <p style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }} className="truncate">{pub.address}</p>
                      {pub.subscriptionStatus && <p style={{ fontSize: 10, fontWeight: 700, color: C.amber, marginTop: 3 }}>{subscriptionLabel(pub.subscriptionStatus)}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.textSoft }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Il tuo birrificio (owner) ── */}
        {isBreweryOwner && myBreweryData?.brewery && (
          <div style={{ padding: "16px", borderBottom: `2px solid ${C.border}` }}>
            <SecHead label="IL TUO BIRRIFICIO" title={myBreweryData.brewery.name} href="/brewery-dashboard" linkLabel="Gestisci →" />
            <Link href={`/brewery/${myBreweryData.brewery.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", background: C.bg }}>
                {myBreweryData.brewery.logoUrl ? (
                  <img src={myBreweryData.brewery.logoUrl} alt={myBreweryData.brewery.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.text }}>
                    <Building2 className="w-5 h-5" style={{ color: C.amberLight }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }} className="truncate">{myBreweryData.brewery.name}</p>
                  <p style={{ fontSize: 11, color: C.textSoft, marginTop: 1 }}>{myBreweryData.brewery.location} · {myBreweryData.beers?.length ?? 0} birre nel catalogo</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.textSoft }} />
              </div>
            </Link>
          </div>
        )}

        {/* ── Ultime dai birrifici ── */}
        {(homeAnnouncements as any[]).length > 0 && (
          <div style={{ borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: "16px 16px 0" }}>
              <SecHead label="NOVITÀ" title="Dai birrifici" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-ios" style={{ paddingLeft: 16, paddingRight: 16 }}>
              {(homeAnnouncements as any[]).map((ann: any) => {
                const typeMap: Record<string, { label: string; bg: string }> = {
                  news:    { label: "Novità",      bg: "#2563eb" },
                  release: { label: "Nuova Birra", bg: C.amberLight },
                  collab:  { label: "Collab",      bg: "#7c3aed" },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <Link key={ann.id} href={`/brewery/${ann.breweryId}`}>
                    <div className="flex-shrink-0" style={{ width: 200, padding: "14px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadow, background: C.bg, cursor: "pointer" }}>
                      <div className="flex items-center gap-2 mb-3">
                        {ann.breweryLogo ? (
                          <img src={ann.breweryLogo} alt={ann.breweryName} className="w-7 h-7 rounded-full object-contain flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.amberLight }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: C.mapBg }}>{ann.breweryName?.[0]}</span>
                          </div>
                        )}
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.textSoft }} className="truncate">{ann.breweryName}</p>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: t.bg, color: "#fff", display: "inline-block", marginBottom: 8 }}>
                        {t.label}
                      </span>
                      <p style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "-0.01em", lineHeight: 1.35 }} className="line-clamp-2">{ann.title}</p>
                      {ann.releaseDate && <p style={{ fontSize: 10, color: C.textSoft, marginTop: 6 }}>Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stili più amati ── */}
        {isAuthenticated && Array.isArray(popularStyles) && popularStyles.length > 0 && (
          <div style={{ borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: "16px 16px 0" }}>
              <SecHead label="TENDENZE" title="Stili più amati" href="/explore/beers" linkLabel="Esplora →" />
            </div>
            <div style={{ margin: "0 16px 16px", border: `2px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {popularStyles.slice(0, 8).map((s, i) => {
                const max = popularStyles[0]?.count ?? 1;
                return (
                  <Link key={s.style} href={`/explore/beers?style=${encodeURIComponent(s.style)}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < 7 ? `1px solid ${C.borderSoft}` : "none", background: C.bg, cursor: "pointer" }}>
                      <span style={{ width: 18, textAlign: "right", fontSize: 11, fontWeight: 800, color: i < 3 ? C.amberLight : C.textSoft, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }} className="truncate">{s.style}</p>
                        <div style={{ height: 3, background: C.borderSoft, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: C.amberLight, borderRadius: 2, width: `${Math.round((s.count / max) * 100)}%` }} />
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
          <div style={{ padding: "16px", borderBottom: `2px solid ${C.border}` }}>
            <SecHead label="I TUOI" title="Preferiti" href="/dashboard?tab=favorites" linkLabel="Tutti →" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(favorites as any[]).filter((f: any) => ['pub','brewery','beer'].includes(f.itemType) && f.itemName).slice(0, 6).map((fav: any) => {
                const href = fav.itemType === 'pub' ? `/pub/${fav.itemId}` : fav.itemType === 'brewery' ? `/brewery/${fav.itemId}` : `/beer/${fav.itemId}`;
                const TypeIcon = fav.itemType === 'pub' ? Store : fav.itemType === 'brewery' ? Building2 : Beer;
                return (
                  <Link key={fav.id} href={href}>
                    <div style={{ padding: "12px 8px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: C.bg }}>
                      {fav.itemImageUrl ? (
                        <img src={fav.itemImageUrl} alt={fav.itemName} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: C.amberLight }}>
                          <TypeIcon className="w-5 h-5" style={{ color: C.mapBg }} />
                        </div>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.2, textAlign: "center" }} className="line-clamp-2">{fav.itemName}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats community ── */}
        <div style={{ padding: "16px", borderBottom: `2px solid ${C.border}` }}>
          <div style={{ border: `2px solid ${C.border}`, borderRadius: 8, overflow: "hidden", boxShadow: C.shadow }}>
            <div style={{ background: C.text, padding: "12px 16px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>
                La community fermenta<span style={{ color: C.amberLight }}>.to</span>
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
              {[
                { value: globalStats?.totalBeers, label: "Birre", color: C.amberLight },
                { value: globalStats?.totalBreweries, label: "Birrifici", color: "#38bdf8" },
                { value: globalStats?.uniqueStyles, label: "Stili", color: "#34d399" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "14px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${C.borderSoft}` : "none" }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 }}>
                    {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${C.borderSoft}` }}>
              {[
                { value: globalStats?.totalUsers, label: "Utenti", color: "#a78bfa" },
                { value: globalStats?.totalPubs, label: "Pub", color: "#fb923c" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "12px 0", textAlign: "center", borderRight: i === 0 ? `1px solid ${C.borderSoft}` : "none" }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3 }}>
                    {s.value != null ? s.value.toLocaleString('it-IT') : '—'}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA per non autenticati ── */}
        {!isAuthenticated && (
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderBottom: `2px solid ${C.border}` }}>
            <Link href="/become-publican">
              <div style={{ padding: "14px 12px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: C.shadow, cursor: "pointer", background: C.bg }}>
                <Store className="w-5 h-5 mb-2" style={{ color: C.amber }} />
                <p style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 3 }}>Gestisci un pub?</p>
                <p style={{ fontSize: 10, color: C.textSoft, marginBottom: 10 }}>Taplist live e visibilità.</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.amber }}>Inizia →</span>
              </div>
            </Link>
            <Link href="/become-publican">
              <div style={{ padding: "14px 12px", border: `2px solid ${C.border}`, borderRadius: 8, boxShadow: `2px 2px 0 ${C.amber}`, cursor: "pointer", background: C.bg }}>
                <Building2 className="w-5 h-5 mb-2" style={{ color: C.amber }} />
                <p style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 3 }}>Sei un birrificio?</p>
                <p style={{ fontSize: 10, color: C.textSoft, marginBottom: 10 }}>Pubblica le tue birre.</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.amber }}>Registrati →</span>
              </div>
            </Link>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
