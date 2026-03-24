import { Search, Navigation, Beer, Star, MapPin, Home, Map, Grid, User, Building2, ChevronRight, ArrowRight, Users } from "lucide-react";

// ── La Piazza Editoriale ──────────────────────────────────────
// Unione di B (Il Catalogo) e C (La Piazza).
// Top: mappa ambientale atmosferica (C) con search brutalista (B).
// Scroll: sezione editoriale bianca con tipografia bold (B),
//         live updates (C), birrificio in evidenza (B),
//         pub card con taplist inline (C).
// ─────────────────────────────────────────────────────────────

const LIVE_UPDATES = [
  { pub: "Luppolino Pub", update: "Hop Skin IPA appena spillata", ago: "2 min", emoji: "🍺" },
  { pub: "The Brew House", update: "Taplist aggiornata — 3 nuove spine", ago: "8 min", emoji: "🔄" },
  { pub: "Birreria 27", update: "Evento stasera: Degustazione Stout", ago: "15 min", emoji: "🎉" },
];

const FEATURED = {
  name: "CRAK Brewery",
  tagline: "IPA come non le hai mai bevute.",
  city: "Campagna, Salerno",
  beers: 34,
  highlight: "Hop Skin Session IPA — 4.8 ★",
  img: "/__mockup/images/brewery-interior.png",
};

const PUBS = [
  {
    name: "Luppolino Pub", city: "Navigli, Milano", dist: "400m",
    taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png",
    taplist: ["Hop Skin IPA 6.5%", "Duna Stout 8.1%"],
  },
  {
    name: "The Brew House", city: "Pigneto, Roma", dist: "1.1 km",
    taps: 9, rating: 4.5, open: true, img: "/__mockup/images/brewery-interior.png",
    taplist: ["Sour Mango 4.8%", "Nursia Extra 7.2%"],
  },
  {
    name: "Birreria 27", city: "San Salvario, TO", dist: "2.3 km",
    taps: 22, rating: 4.8, open: true, img: "/__mockup/images/pub-interior.png",
    taplist: ["Session IPA 5.2%", "Porter Notte 6.8%"],
  },
];

const PINS = [
  { x: "19%", y: "33%", label: "Luppolino", active: true, type: "pub" },
  { x: "55%", y: "47%", label: "Brew House", type: "pub" },
  { x: "39%", y: "66%", label: "CRAK", type: "brewery" },
  { x: "73%", y: "25%", label: "Birreria 27", type: "pub" },
  { x: "14%", y: "73%", type: "brewery" },
  { x: "79%", y: "61%", type: "pub" },
];

const MODES = [
  { icon: Users, label: "Scopri", active: true },
  { icon: Building2, label: "Birrificio" },
  { icon: Beer, label: "Pub" },
];

const TABS = ["Pub vicini", "In spina", "Birrifici"];

export function UnifiedMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0f0d0a",
      color: "#ede8e1",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── STATUS BAR ── */}
      <div style={{ padding: "10px 18px 4px", background: "#0f0d0a", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[3,4,5,5,5].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#ede8e1" : "#4a4540", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 11, color: "#ede8e1" }}>●●●</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ZONA MAPPA — atmosferica (da C)
      ═══════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", height: 280, overflow: "hidden", flexShrink: 0 }}>

        {/* Sfondo ambientale: pub photo desaturato e scuro */}
        <img
          src="/__mockup/images/pub-interior.png"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.16) saturate(0.25)" }}
        />

        {/* Grid stradale */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="gx" x="0" y="0" width="58" height="58" patternUnits="userSpaceOnUse">
              <line x1="0" y1="29" x2="58" y2="29" stroke="#3a3228" strokeWidth="1" />
              <line x1="29" y1="0" x2="29" y2="58" stroke="#3a3228" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gx)" opacity="0.4" />
          <rect x="24%" y="0" width="6%" height="100%" fill="rgba(58,50,40,0.55)" />
          <rect x="61%" y="0" width="5%" height="100%" fill="rgba(58,50,40,0.42)" />
          <rect x="0" y="35%" width="100%" height="6%" fill="rgba(58,50,40,0.55)" />
          <rect x="0" y="64%" width="100%" height="4%" fill="rgba(58,50,40,0.38)" />
          <rect x="5%" y="9%" width="14%" height="10%" rx="3" fill="rgba(20,83,45,0.16)" />
        </svg>

        {/* Gradient bottom warm → sezione editoriale */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, transparent, #fafaf8)" }} />

        {/* PINS */}
        {PINS.map((pin, i) => (
          <div key={i} style={{ position: "absolute", left: pin.x, top: pin.y, transform: "translate(-50%,-50%)", cursor: "pointer" }}>
            {pin.active ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", background: "#f59e0b", color: "#0f0d0a", borderRadius: 4, whiteSpace: "nowrap", boxShadow: "0 2px 10px rgba(245,158,11,0.45)" }}>
                  {pin.label}
                </div>
                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "5px solid #f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 0 5px rgba(245,158,11,0.22)" }} />
              </div>
            ) : (
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: pin.type === "pub" ? "#2a2420" : "#1a3020",
                border: `1.5px solid ${pin.type === "pub" ? "#4a4030" : "#2a5030"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {pin.type === "pub"
                  ? <Beer size={7} color="#8a7d74" />
                  : <Building2 size={7} color="#4a9060" />
                }
              </div>
            )}
          </div>
        ))}

        {/* ── SEARCH BRUTALISTA (da B) floating sulla mappa ── */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 0 }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: "rgba(250,250,248,0.95)",
              border: "2px solid #111009",
              borderRadius: 8, padding: "0 12px", height: 42,
              boxShadow: "2px 2px 0 #111009",
              backdropFilter: "blur(8px)",
            }}>
              <Search size={14} color="#9d8e86" />
              <input
                placeholder="Pub, birrificio o birra…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#111009", fontWeight: 500 }}
              />
            </div>
            <button style={{
              width: 42, height: 42, border: "2px solid #111009",
              borderRadius: 8, background: "#f59e0b", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", marginLeft: 6,
              boxShadow: "2px 2px 0 #111009", flexShrink: 0
            }}>
              <Navigation size={16} color="#111009" />
            </button>
          </div>
        </div>

        {/* LIVE badge */}
        <div style={{ position: "absolute", bottom: 106, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(15,13,10,0.88)", border: "1px solid #2a2420", borderRadius: 6, padding: "5px 10px", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#ede8e1" }}>12 pub aperti · Milano</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SEZIONE EDITORIALE — da B, su bianco
      ═══════════════════════════════════════════════════════ */}
      <div style={{ background: "#fafaf8", flex: 1 }}>

        {/* ── Hero editoriale ── */}
        <div style={{ padding: "20px 18px 14px", borderBottom: "2px solid #111009" }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 6px" }}>
            fermenta<span style={{ color: "#d97706" }}>.to</span> · Milano
          </p>
          <h1 style={{ fontSize: 27, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#111009", margin: "0 0 12px" }}>
            Dove vuoi<br /><span style={{ fontStyle: "italic", color: "#d97706" }}>bere stasera?</span>
          </h1>

          {/* Mode selector brutalista */}
          <div style={{ display: "flex", gap: 6 }}>
            {MODES.map(({ icon: Icon, label, active }, i) => (
              <button key={i} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "8px 6px", fontSize: 11, fontWeight: active ? 800 : 600,
                background: active ? "#111009" : "#fafaf8",
                color: active ? "#fafaf8" : "#9d8e86",
                border: "2px solid #111009",
                borderRadius: 6, cursor: "pointer",
                boxShadow: active ? "2px 2px 0 #d97706" : "none",
              }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live updates (da C) ── */}
        <div style={{ borderBottom: "2px solid #111009" }}>
          <div style={{ padding: "10px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86", margin: 0 }}>
              <span style={{ color: "#34d399" }}>●</span> Aggiornamenti live
            </p>
            <span style={{ fontSize: 10, color: "#d97706", fontWeight: 700, cursor: "pointer" }}>Tutti →</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {LIVE_UPDATES.map((u, i) => (
              <div key={i} style={{ padding: "9px 18px", display: "flex", gap: 10, alignItems: "center", borderTop: i > 0 ? "1px solid #e5ddd5" : "none" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{u.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#111009", margin: "0 0 1px", letterSpacing: "-0.01em" }}>{u.pub}</p>
                  <p style={{ fontSize: 11, color: "#9d8e86", margin: 0 }}>{u.update}</p>
                </div>
                <span style={{ fontSize: 10, color: "#9d8e86", flexShrink: 0 }}>{u.ago}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Birrificio in evidenza (da B) — dark editorial block ── */}
        <div style={{ margin: "0" }}>
          <div style={{ position: "relative" }}>
            <img src={FEATURED.img} alt={FEATURED.name} style={{ width: "100%", height: 180, objectFit: "cover", filter: "brightness(0.4)" }} />
            <div style={{ position: "absolute", inset: 0, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f59e0b", margin: "0 0 4px" }}>
                BIRRIFICIO IN EVIDENZA · {FEATURED.city}
              </p>
              <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: "#fafaf8", margin: "0 0 3px", lineHeight: 1 }}>
                {FEATURED.name}
              </h2>
              <p style={{ fontSize: 13, fontStyle: "italic", color: "#c8bdb4", margin: "0 0 8px" }}>{FEATURED.tagline}</p>
              <p style={{ fontSize: 11, color: "#fafaf8" }}>⭐ {FEATURED.highlight} · {FEATURED.beers} birre</p>
            </div>
          </div>
          <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111009", borderBottom: "2px solid #111009" }}>
            <span style={{ fontSize: 11, color: "#8a7d74" }}>Fondata nel 2013 · {FEATURED.city}</span>
            <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>
              Scopri <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Pub vicini con tabs (da C) e taplist inline ── */}
        <div style={{ background: "#fafaf8" }}>
          <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>VICINO A TE</p>
              <h2 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: "#111009", margin: "0 0 10px" }}>Pub aperti adesso</h2>
            </div>
            <a style={{ fontSize: 11, fontWeight: 700, color: "#d97706", cursor: "pointer" }}>Mappa →</a>
          </div>

          {/* Tabs (da C) con stile brutalista (da B) */}
          <div style={{ display: "flex", gap: 0, margin: "0 18px 12px", border: "2px solid #111009", borderRadius: 6, overflow: "hidden" }}>
            {TABS.map((tab, i) => (
              <button key={tab} style={{
                flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 800,
                background: i === 0 ? "#111009" : "#fafaf8",
                color: i === 0 ? "#fafaf8" : "#9d8e86",
                border: "none",
                borderLeft: i > 0 ? "1.5px solid #111009" : "none",
                cursor: "pointer", letterSpacing: "-0.01em",
              }}>{tab}</button>
            ))}
          </div>

          {/* Pub cards con taplist inline (da C) */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 18px 16px", scrollbarWidth: "none" }}>
            {PUBS.map((pub, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 230,
                border: "2px solid #111009", borderRadius: 8, overflow: "hidden",
                background: "#fafaf8", cursor: "pointer",
                boxShadow: "2px 2px 0 #111009",
              }}>
                <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
                  <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.78)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(17,16,9,0.88) 0%, transparent 50%)" }} />
                  <span style={{ position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800, padding: "3px 8px", background: pub.open ? "#10b981" : "#6b7280", color: "#fff", borderRadius: 4 }}>
                    {pub.open ? "● Aperto" : "● Chiuso"}
                  </span>
                  <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 800, padding: "3px 8px", background: "#f59e0b", color: "#111009", borderRadius: 4 }}>
                    ★ {pub.rating}
                  </span>
                  <div style={{ position: "absolute", bottom: 8, left: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 900, color: "#fafaf8", margin: "0 0 1px", letterSpacing: "-0.03em" }}>{pub.name}</p>
                    <p style={{ fontSize: 10, color: "#c8bdb4", margin: 0 }}>{pub.city} · {pub.dist} · {pub.taps} spine</p>
                  </div>
                </div>
                {/* Taplist inline (da C) */}
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {pub.taplist.map((t, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 7px", background: "#f0ece8", borderRadius: 4 }}>
                      <Beer size={9} color="#d97706" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b6260" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA strip brutalista (da B) ── */}
        <div style={{ margin: "0 18px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "14px 12px", border: "2px solid #111009", borderRadius: 8, background: "#fafaf8", boxShadow: "2px 2px 0 #111009", cursor: "pointer" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#111009", margin: "0 0 3px" }}>Gestisci un pub?</p>
            <p style={{ fontSize: 10, color: "#9d8e86", margin: "0 0 10px" }}>Taplist live e visibilità.</p>
            <button style={{ width: "100%", padding: "7px 0", background: "#111009", color: "#fafaf8", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Inizia →</button>
          </div>
          <div style={{ padding: "14px 12px", border: "2px solid #111009", borderRadius: 8, background: "#fafaf8", boxShadow: "2px 2px 0 #d97706", cursor: "pointer" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#111009", margin: "0 0 3px" }}>Sei un birrificio?</p>
            <p style={{ fontSize: 10, color: "#9d8e86", margin: "0 0 10px" }}>Pubblica e raggiungi i fan.</p>
            <button style={{ width: "100%", padding: "7px 0", background: "#d97706", color: "#fafaf8", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Registrati →</button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV — brutalista (da B) ── */}
      <div style={{
        background: "#fafaf8",
        borderTop: "2px solid #111009",
        padding: "10px 0 16px",
        flexShrink: 0,
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
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? "#d97706" : "#c8bdb4", letterSpacing: "0.05em" }}>
                {label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
