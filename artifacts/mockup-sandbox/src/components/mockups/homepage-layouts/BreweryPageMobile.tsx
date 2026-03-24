import { ArrowLeft, Bell, Star, MapPin, Beer, Share2, Heart, Globe, ChevronRight, ArrowRight, Building2, Package } from "lucide-react";

// ── Pagina pubblica Birrificio — dark mode ─────────────────────
// La pagina del birrificio: catalogo birre, dove trovarle,
// storia del birrificio. Ottimizzata per la scoperta.
// ─────────────────────────────────────────────────────────────

const BREWERY = {
  name: "CRAK Brewery",
  tagline: "Luppolatura estrema. Ogni volta.",
  city: "Campagna, Salerno",
  founded: 2013,
  beers: 34,
  style: "American Craft · IPA-forward",
  rating: 4.8,
  reviews: 892,
  followers: 6240,
  following: false,
  img: "/__mockup/images/brewery-interior.png",
  about: "CRAK nasce nel 2013 a Campagna, in provincia di Salerno. Specializzati in IPA dalla luppolatura intensa, portano il West Coast style americano nel cuore del Sud Italia.",
};

const BEERS = [
  { name: "Hop Skin Session IPA", style: "Session IPA", abv: "4.5%", rating: 4.8, img: "/__mockup/images/hero-beer.png", new: true },
  { name: "Hop Skin Double IPA", style: "Double IPA", abv: "8.3%", rating: 4.9, img: "/__mockup/images/beer-cans.png", new: false },
  { name: "Pilsner CRAK", style: "Czech Pils", abv: "5.2%", rating: 4.5, img: "/__mockup/images/hero-beer.png", new: false },
  { name: "Blackout Stout", style: "Foreign Extra Stout", abv: "7.6%", rating: 4.6, img: "/__mockup/images/beer-cans.png", new: false },
  { name: "Citrus Sour", style: "Gose", abv: "4.2%", rating: 4.4, img: "/__mockup/images/hero-beer.png", new: true },
];

const PUBS_CARRYING = [
  { name: "Luppolino Pub", city: "Navigli, Milano", taps: 3, dist: "400m", open: true },
  { name: "The Brew House", city: "Pigneto, Roma", taps: 2, dist: "1.1 km", open: true },
  { name: "Birreria 27", city: "San Salvario, TO", taps: 4, dist: "2.3 km", open: true },
  { name: "Craft Corner", city: "Prati, Roma", taps: 1, dist: "3.0 km", open: false },
];

const RELEASES = [
  { title: "Hop Skin Hazy IPA — Limited Edition", desc: "Solo 500 lattine. Disponibile dal 1 aprile.", ago: "2 giorni" },
  { title: "Nuova etichetta Citrus Sour", desc: "Design rinnovato, ricetta invariata.", ago: "1 settimana" },
];

export function BreweryPageMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#080706",
      color: "#ede8e1",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── STATUS BAR ── */}
      <div style={{ padding: "10px 16px 4px", background: "#080706", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[3,4,5,5,5].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#ede8e1" : "#4a4540", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 11, color: "#ede8e1" }}>●●●</span>
        </div>
      </div>

      {/* ── TOPBAR ── */}
      <div style={{ padding: "4px 14px 8px", background: "#080706", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ width: 34, height: 34, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color="#ede8e1" />
          </button>
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em" }}>{BREWERY.name}</p>
            <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>Birrificio · {BREWERY.city}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={{ width: 34, height: 34, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Share2 size={15} color="#8a7d74" />
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{ position: "relative", height: 210, overflow: "hidden", flexShrink: 0 }}>
        <img src={BREWERY.img} alt={BREWERY.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.55)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.98) 0%, rgba(8,7,6,0.1) 55%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px" }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f59e0b", margin: "0 0 4px" }}>
            BIRRIFICIO ARTIGIANALE · EST. {BREWERY.founded}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#ede8e1", margin: "0 0 5px", lineHeight: 1 }}>
            {BREWERY.name}
          </h1>
          <p style={{ fontSize: 13, fontStyle: "italic", color: "#c8bdb4", margin: "0 0 8px" }}>{BREWERY.tagline}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>{BREWERY.rating}</span>
              <span style={{ fontSize: 11, color: "#8a7d74" }}>({BREWERY.reviews})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} color="#8a7d74" />
              <span style={{ fontSize: 11, color: "#c8bdb4" }}>{BREWERY.city}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Package size={11} color="#8a7d74" />
              <span style={{ fontSize: 11, color: "#c8bdb4" }}>{BREWERY.beers} birre</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA STRIP ── */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, background: "#0f0d0a", borderBottom: "1px solid #1f1d1a", flexShrink: 0 }}>
        <button style={{ flex: 1, padding: "10px 0", background: "#f59e0b", color: "#080706", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          Esplora le birre
        </button>
        <button style={{
          flex: 1, padding: "10px 0",
          background: BREWERY.following ? "#1a3020" : "#161412",
          color: BREWERY.following ? "#34d399" : "#ede8e1",
          border: `1px solid ${BREWERY.following ? "#2a5030" : "#2a2420"}`,
          borderRadius: 6, fontSize: 12, fontWeight: 800, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Heart size={13} fill={BREWERY.following ? "#34d399" : "none"} /> Segui
        </button>
      </div>

      {/* ── STATISTICHE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#1a1612", borderBottom: "1px solid #1a1612" }}>
        {[
          { value: BREWERY.beers, label: "Birre" },
          { value: `${(BREWERY.followers / 1000).toFixed(1)}k`, label: "Follower" },
          { value: BREWERY.founded, label: "Anno" },
        ].map((stat, i) => (
          <div key={i} style={{ background: "#0f0d0a", padding: "12px 0", textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#ede8e1", margin: "0 0 2px", letterSpacing: "-0.04em" }}>{stat.value}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#8a7d74", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── CATALOGO BIRRE — scroll orizzontale ── */}
      <div style={{ background: "#080706", paddingBottom: 6 }}>
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 2px" }}>CATALOGO</p>
            <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: "#ede8e1", margin: 0 }}>Le nostre birre</h2>
          </div>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}>Tutte {BREWERY.beers} →</span>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 10px", scrollbarWidth: "none" }}>
          {BEERS.map((beer, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 160,
              background: "#0f0d0a", border: "1px solid #2a2420",
              borderRadius: 8, overflow: "hidden", cursor: "pointer",
            }}>
              <div style={{ position: "relative", height: 110, overflow: "hidden" }}>
                <img src={beer.img} alt={beer.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.75)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.85) 0%, transparent 50%)" }} />
                {beer.new && (
                  <span style={{ position: "absolute", top: 7, left: 7, fontSize: 9, fontWeight: 800, padding: "2px 6px", background: "#f59e0b", color: "#080706", borderRadius: 3 }}>NUOVO</span>
                )}
                <span style={{ position: "absolute", bottom: 7, right: 7, fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>★ {beer.rating}</span>
              </div>
              <div style={{ padding: "8px 10px" }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f59e0b", margin: "0 0 2px" }}>{beer.style} · {beer.abv}</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{beer.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOVE TROVARCI ── */}
      <div style={{ background: "#0f0d0a", borderTop: "1px solid #1f1d1a" }}>
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 2px" }}>DISTRIBUZIONE</p>
            <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: "#ede8e1", margin: 0 }}>Dove trovarci</h2>
          </div>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}>Mappa →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#2a2420" }}>
          {PUBS_CARRYING.map((pub, i) => (
            <div key={i} style={{ background: "#0f0d0a", padding: "11px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{
                width: 34, height: 34, borderRadius: 6,
                background: "#1a1612", border: "1px solid #2a2420",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Building2 size={15} color="#8a7d74" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em" }}>{pub.name}</p>
                  <span style={{ fontSize: 10, color: pub.open ? "#34d399" : "#8a7d74", fontWeight: 700, flexShrink: 0 }}>
                    {pub.open ? "● Aperto" : "● Chiuso"}
                  </span>
                </div>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>
                  {pub.city} · {pub.dist}
                  <span style={{ color: "#f59e0b" }}> · {pub.taps} spine</span>
                </p>
              </div>
              <ChevronRight size={14} color="#8a7d74" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <div style={{ background: "#080706", borderTop: "1px solid #1f1d1a", padding: "14px 16px" }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 8px" }}>LA STORIA</p>
        <p style={{ fontSize: 13, color: "#c8bdb4", margin: "0 0 12px", lineHeight: 1.55, fontStyle: "italic" }}>
          "{BREWERY.about}"
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Globe size={13} color="#f59e0b" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>crakbrewery.it</span>
        </div>
      </div>

      {/* ── NOVITÀ / RELEASES ── */}
      <div style={{ background: "#0f0d0a", borderTop: "1px solid #1f1d1a", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>NOVITÀ</p>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>Tutte →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RELEASES.map((rel, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "#080706", border: "1px solid #2a2420", borderRadius: 6, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em", flex: 1 }}>{rel.title}</p>
                <span style={{ fontSize: 10, color: "#8a7d74", flexShrink: 0, paddingLeft: 8 }}>{rel.ago}</span>
              </div>
              <p style={{ fontSize: 11, color: "#8a7d74", margin: 0 }}>{rel.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 72 }} />

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(8,7,6,0.96)", backdropFilter: "blur(16px)",
        borderTop: "1px solid #1f1d1a",
        padding: "10px 0 16px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {["Home", "Mappa", "Birre", "Pub", "Profilo"].map((label, i) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", minWidth: 48, padding: "2px 0" }}>
              <Beer size={20} color={i === 2 ? "#f59e0b" : "#3a3530"} strokeWidth={i === 2 ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: i === 2 ? 800 : 500, color: i === 2 ? "#f59e0b" : "#3a3530", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
