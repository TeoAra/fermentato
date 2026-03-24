import { Search, MapPin, Star, Beer, Building2, Users, Home, Map, Grid, User, ChevronRight, ArrowRight } from "lucide-react";

// ── Il Catalogo ───────────────────────────────────────────────
// Concept: Fermenta.to come catalogo editoriale italiano.
// Layout da rivista di design: grande tipografia brutalista,
// white space generoso, immagini a tutta larghezza.
// Ogni birrificio / pub ha la sua "pagina" da sfogliare.
// ─────────────────────────────────────────────────────────────

const FEATURED = {
  name: "CRAK Brewery",
  tagline: "IPA come non le hai mai bevute",
  city: "Campagna, Salerno",
  founded: "2013",
  beers: 34,
  img: "/__mockup/images/brewery-interior.png",
  highlight: "Hop Skin Session IPA — 4.8 ★",
};

const PUBS = [
  { name: "Luppolino Pub", city: "Navigli, Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "The Brew House", city: "Pigneto, Roma", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "Birreria 27", city: "San Salvario, TO", dist: "2.3 km", taps: 22, rating: 4.8, open: false, img: "/__mockup/images/pub-interior.png" },
];

const BEERS = [
  { name: "Hop Skin IPA", brewery: "CRAK", style: "IPA", abv: "6.5%", rating: 4.8, img: "/__mockup/images/hero-beer.png" },
  { name: "Duna Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 4.7, img: "/__mockup/images/beer-cans.png" },
  { name: "Sour Mango", brewery: "Rev. Cat", style: "Sour", abv: "4.8%", rating: 4.6, img: "/__mockup/images/hero-beer.png" },
];

const MODES = [
  { icon: Users, label: "Scopri", active: true },
  { icon: Building2, label: "Birrifici" },
  { icon: Beer, label: "Pub" },
];

export function SearchFirstMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#fafaf8",
      color: "#111009",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── STATUS BAR simulata ── */}
      <div style={{ padding: "10px 18px 6px", display: "flex", justifyContent: "space-between", background: "#fafaf8" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#111009" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[3,4,5,5,5].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#111009" : "#d4cfc8", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 11, color: "#111009" }}>●●●</span>
        </div>
      </div>

      {/* ── HEADER editoriale ── */}
      <div style={{ padding: "12px 18px 14px", borderBottom: "2px solid #111009", background: "#fafaf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8bdb4", margin: "0 0 2px" }}>
              La birra artigianale italiana
            </p>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#111009" }}>
              fermenta<span style={{ color: "#d97706" }}>.to</span>
            </span>
          </div>
          <button style={{ width: 38, height: 38, border: "2px solid #111009", borderRadius: 6, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #d97706" }}>
            <Search size={16} color="#111009" />
          </button>
        </div>
      </div>

      {/* ── HERO SEARCH ── */}
      <div style={{ padding: "18px 18px 14px", background: "#fafaf8" }}>
        <h1 style={{
          fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em",
          lineHeight: 1.05, margin: "0 0 14px", color: "#111009"
        }}>
          Dove vuoi<br /><span style={{ fontStyle: "italic", color: "#d97706" }}>bere stasera?</span>
        </h1>

        {/* Search bar brutalista */}
        <div style={{
          display: "flex", border: "2px solid #111009", borderRadius: 8,
          overflow: "hidden", boxShadow: "3px 3px 0 #111009", marginBottom: 12
        }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
            <Search size={15} color="#9d8e86" />
            <input
              placeholder="Birra, pub o birrificio…"
              style={{ flex: 1, padding: "11px 0", fontSize: 14, border: "none", outline: "none", color: "#111009", background: "transparent" }}
            />
          </div>
          <button style={{ padding: "0 16px", background: "#111009", color: "#fafaf8", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.01em" }}>
            Cerca
          </button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {MODES.map(({ icon: Icon, label, active }, i) => (
            <button key={i} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "8px 6px", fontSize: 12, fontWeight: active ? 800 : 600,
              background: active ? "#111009" : "#fafaf8",
              color: active ? "#fafaf8" : "#9d8e86",
              border: "2px solid #111009",
              borderRadius: 6, cursor: "pointer",
              boxShadow: active ? "2px 2px 0 #d97706" : "none"
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEATURED BREWERY — carta editoriale ── */}
      <div style={{ margin: "0 0 0", background: "#111009" }}>
        <div style={{ position: "relative" }}>
          <img src={FEATURED.img} alt={FEATURED.name} style={{ width: "100%", height: 200, objectFit: "cover", filter: "brightness(0.45)" }} />
          <div style={{ position: "absolute", inset: 0, padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f59e0b", margin: "0 0 4px" }}>
              BIRRIFICIO IN EVIDENZA · {FEATURED.city}
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#fafaf8", margin: "0 0 4px", lineHeight: 1 }}>
              {FEATURED.name}
            </h2>
            <p style={{ fontSize: 13, fontStyle: "italic", color: "#c8bdb4", margin: "0 0 10px" }}>{FEATURED.tagline}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#fafaf8" }}>⭐ {FEATURED.highlight}</span>
              <span style={{ fontSize: 11, color: "#8a7d74" }}>{FEATURED.beers} birre</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#8a7d74" }}>Fondata nel {FEATURED.founded} · {FEATURED.city}</span>
          <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>
            Scopri <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── PUB vicini ── */}
      <div style={{ background: "#fafaf8" }}>
        <div style={{ padding: "18px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>VICINO A TE</p>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#111009", margin: 0 }}>Pub aperti adesso</h2>
          </div>
          <a style={{ fontSize: 11, fontWeight: 700, color: "#d97706", cursor: "pointer" }}>Mappa →</a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 0 4px" }}>
          {PUBS.map((pub, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 18px", borderTop: "1px solid #e5ddd5", cursor: "pointer" }}>
              <div style={{ width: 68, height: 68, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "2px solid #111009" }}>
                <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111009", margin: 0, letterSpacing: "-0.02em" }}>{pub.name}</h3>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", flexShrink: 0 }}>★ {pub.rating}</span>
                </div>
                <p style={{ fontSize: 11, color: "#9d8e86", margin: "0 0 7px" }}>{pub.city} · {pub.dist}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: pub.open ? "#ecfdf5" : "#f5f5f4", color: pub.open ? "#059669" : "#9d8e86", border: `1px solid ${pub.open ? "#a7f3d0" : "#e5ddd5"}`, borderRadius: 4 }}>
                    {pub.open ? "● Aperto" : "● Chiuso"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: "#fef3c7", color: "#92400e", borderRadius: 4 }}>
                    🍺 {pub.taps} spine
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BIRRE trending — scroll ── */}
      <div style={{ background: "#fafaf8", paddingBottom: 14 }}>
        <div style={{ padding: "18px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>TRENDING</p>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#111009", margin: 0 }}>Birre della settimana</h2>
          </div>
          <a style={{ fontSize: 11, fontWeight: 700, color: "#d97706", cursor: "pointer" }}>Tutte →</a>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 18px", scrollbarWidth: "none" }}>
          {BEERS.map((beer, i) => (
            <div key={i} style={{ flexShrink: 0, width: 150, border: "2px solid #111009", borderRadius: 8, overflow: "hidden", cursor: "pointer", boxShadow: "2px 2px 0 #111009" }}>
              <div style={{ position: "relative", height: 110 }}>
                <img src={beer.img} alt={beer.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(17,16,9,0.8) 0%, transparent 55%)" }} />
                <span style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>★ {beer.rating}</span>
              </div>
              <div style={{ padding: "8px 10px", background: "#fafaf8" }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#d97706", margin: "0 0 2px" }}>{beer.style} · {beer.abv}</p>
                <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-0.02em", color: "#111009", margin: "0 0 1px", lineHeight: 1.2 }}>{beer.name}</p>
                <p style={{ fontSize: 10, color: "#9d8e86", margin: 0 }}>{beer.brewery}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA strip ── */}
      <div style={{ margin: "0 18px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ padding: "14px 12px", border: "2px solid #111009", borderRadius: 8, background: "#fafaf8", boxShadow: "2px 2px 0 #111009", cursor: "pointer" }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#111009", margin: "0 0 4px" }}>Sei un birrificio?</p>
          <p style={{ fontSize: 10, color: "#9d8e86", margin: "0 0 10px" }}>Pubblica e raggiungi migliaia di appassionati.</p>
          <button style={{ width: "100%", padding: "7px 0", background: "#d97706", color: "#fafaf8", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Registrati →</button>
        </div>
        <div style={{ padding: "14px 12px", border: "2px solid #111009", borderRadius: 8, background: "#111009", boxShadow: "2px 2px 0 #d97706", cursor: "pointer" }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#fafaf8", margin: "0 0 4px" }}>Gestisci un pub?</p>
          <p style={{ fontSize: 10, color: "#8a7d74", margin: "0 0 10px" }}>Taplist live e visibilità aumentata.</p>
          <button style={{ width: "100%", padding: "7px 0", background: "#d97706", color: "#111009", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Inizia →</button>
        </div>
      </div>

      <div style={{ height: 72 }} />

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "#fafaf8",
        borderTop: "2px solid #111009",
        padding: "10px 0 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Map, label: "Mappa" },
            { icon: Beer, label: "Birre" },
            { icon: Grid, label: "Pub" },
            { icon: User, label: "Profilo" },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", minWidth: 48, padding: "2px 0" }}>
              <Icon size={20} color={active ? "#d97706" : "#c8bdb4"} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? "#d97706" : "#c8bdb4", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
