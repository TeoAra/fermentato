import { Search, Navigation, Beer, Star, MapPin, Home, Map, Grid, User, Building2, ChevronRight, Zap } from "lucide-react";

// ── La Piazza ─────────────────────────────────────────────────
// Concept: la piazza italiana — il luogo dove si scopre cosa
// succede, dove si incontra la gente, dove si sceglie la serata.
// Mappa ambientale (non tecnica), colori caldi terracotta/ambra,
// bottom sheet che si apre come una conversazione.
// ─────────────────────────────────────────────────────────────

const LIVE_UPDATES = [
  { pub: "Luppolino Pub", update: "Hop Skin IPA appena spillata", ago: "2 min", icon: "🍺" },
  { pub: "The Brew House", update: "Taplist aggiornata — 3 nuove spine", ago: "8 min", icon: "🔄" },
  { pub: "Birreria 27", update: "Evento live: Degustazione Stout", ago: "15 min", icon: "🎉" },
];

const PUBS_VICINI = [
  { name: "Luppolino Pub", city: "Navigli", dist: "400m", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png", taplist: ["Hop Skin IPA 6.5%", "Duna Stout 8.1%"] },
  { name: "The Brew House", city: "Pigneto", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/brewery-interior.png", taplist: ["Sour Mango 4.8%", "Nursia Extra 7.2%"] },
  { name: "Birreria 27", city: "San Salvario", dist: "2.3 km", taps: 22, rating: 4.8, open: true, img: "/__mockup/images/pub-interior.png", taplist: ["Session IPA 5.2%", "Porter Notte 6.8%"] },
  { name: "Craft Corner", city: "Prati", dist: "3.0 km", taps: 7, rating: 4.2, open: false, img: "/__mockup/images/pub-interior.png", taplist: [] },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna", beers: 34, img: "/__mockup/images/brewery-interior.png" },
  { name: "Del Borgo", city: "Borgorose", beers: 28, img: "/__mockup/images/brewery-interior.png" },
  { name: "Revelation Cat", city: "Roma", beers: 19, img: "/__mockup/images/brewery-interior.png" },
];

// Pins posizionati manualmente per sembrare una mappa reale
const PINS = [
  { x: "18%", y: "32%", label: "Luppolino", active: true, type: "pub" },
  { x: "54%", y: "46%", label: "Brew House", type: "pub" },
  { x: "38%", y: "65%", label: "CRAK", type: "brewery" },
  { x: "72%", y: "24%", label: "Birreria 27", type: "pub" },
  { x: "14%", y: "72%", label: "Del Borgo", type: "brewery" },
  { x: "78%", y: "60%", label: "Craft Corner", type: "pub" },
];

const TABS = ["Vicino a te", "In spina", "Birrifici"];

export function MapFirstMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0f0d0a",
      color: "#ede8e1",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── STATUS BAR simulata ── */}
      <div style={{ padding: "10px 18px 4px", background: "#0f0d0a", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[3,4,5,5,5].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#ede8e1" : "#4a4540", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 11, color: "#ede8e1" }}>●●●</span>
        </div>
      </div>

      {/* ── MAPPA HERO ── */}
      <div style={{ position: "relative", height: "44%", minHeight: 240, overflow: "hidden", flexShrink: 0 }}>

        {/* Immagine di sfondo come "mappa ambientale" */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src="/__mockup/images/pub-interior.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.18) saturate(0.3)" }} />
        </div>

        {/* Grid stradale sopra */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="g3" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <line x1="0" y1="30" x2="60" y2="30" stroke="#3a3228" strokeWidth="1" />
              <line x1="30" y1="0" x2="30" y2="60" stroke="#3a3228" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g3)" opacity="0.35" />
          {/* Strade principali */}
          <rect x="25%" y="0" width="6%" height="100%" fill="rgba(58,50,40,0.6)" />
          <rect x="62%" y="0" width="5%" height="100%" fill="rgba(58,50,40,0.45)" />
          <rect x="0" y="36%" width="100%" height="6%" fill="rgba(58,50,40,0.6)" />
          <rect x="0" y="65%" width="100%" height="4%" fill="rgba(58,50,40,0.4)" />
          {/* Parco */}
          <rect x="6%" y="10%" width="14%" height="10%" rx="3" fill="rgba(20,83,45,0.18)" />
        </svg>

        {/* Overlay gradiente warm */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(245,158,11,0.04) 0%, transparent 65%)" }} />

        {/* PINS */}
        {PINS.map((pin, i) => (
          <div key={i} style={{ position: "absolute", left: pin.x, top: pin.y, transform: "translate(-50%,-50%)", cursor: "pointer" }}>
            {pin.active ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", background: "#f59e0b", color: "#0f0d0a", borderRadius: 4, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(245,158,11,0.4)" }}>
                  {pin.label}
                </div>
                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "5px solid #f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 0 5px rgba(245,158,11,0.25)" }} />
              </div>
            ) : (
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: pin.type === "pub" ? "#2a2420" : "#1a3020",
                border: `1.5px solid ${pin.type === "pub" ? "#4a4030" : "#2a5030"}`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {pin.type === "pub"
                  ? <Beer size={7} color="#8a7d74" />
                  : <Building2 size={7} color="#4a9060" />
                }
              </div>
            )}
          </div>
        ))}

        {/* Bottom gradient */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, transparent, #0f0d0a)" }} />

        {/* TOP BAR floating */}
        <div style={{ position: "absolute", top: 8, left: 10, right: 10, display: "flex", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: "rgba(15,13,10,0.90)", border: "1px solid #2a2420", borderRadius: 8, padding: "0 12px", height: 40, backdropFilter: "blur(12px)" }}>
            <Search size={14} color="#8a7d74" />
            <input placeholder="La piazza vicino a te…" style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 13, color: "#ede8e1" }} />
          </div>
          <button style={{ width: 40, height: 40, border: "1px solid #2a2420", borderRadius: 8, background: "rgba(15,13,10,0.90)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            <Navigation size={16} color="#f59e0b" />
          </button>
        </div>

        {/* LIVE badge */}
        <div style={{ position: "absolute", bottom: 18, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(15,13,10,0.90)", border: "1px solid #2a2420", borderRadius: 6, padding: "5px 10px", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#ede8e1" }}>12 pub aperti · Milano</span>
        </div>

        {/* Expand button */}
        <div style={{ position: "absolute", bottom: 18, right: 10 }}>
          <button style={{ fontSize: 10, fontWeight: 800, padding: "5px 10px", background: "rgba(15,13,10,0.90)", border: "1px solid #2a2420", borderRadius: 6, color: "#f59e0b", cursor: "pointer", backdropFilter: "blur(8px)" }}>
            Espandi
          </button>
        </div>
      </div>

      {/* ── BOTTOM SHEET ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0f0d0a" }}>

        {/* Handle */}
        <div style={{ width: 36, height: 3, background: "#2a2420", borderRadius: 2, margin: "10px auto" }} />

        {/* LIVE UPDATES — novità immediate */}
        <div style={{ padding: "0 14px 10px" }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 8px" }}>
            <span style={{ color: "#34d399" }}>●</span> Aggiornamenti live
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a" }}>
            {LIVE_UPDATES.map((u, i) => (
              <div key={i} style={{ background: "#0f0d0a", padding: "9px 0", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{u.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1", margin: "0 0 1px", lineHeight: 1.2 }}>
                    {u.pub}
                  </p>
                  <p style={{ fontSize: 11, color: "#8a7d74", margin: 0 }}>{u.update}</p>
                </div>
                <span style={{ fontSize: 10, color: "#8a7d74", flexShrink: 0 }}>{u.ago}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 1, background: "#1a1612", margin: "4px 14px 12px", borderRadius: 6, overflow: "hidden" }}>
          {TABS.map((tab, i) => (
            <button key={tab} style={{
              flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 800,
              background: i === 0 ? "#f59e0b" : "transparent",
              color: i === 0 ? "#0f0d0a" : "#8a7d74",
              border: "none", cursor: "pointer",
              letterSpacing: "-0.01em"
            }}>{tab}</button>
          ))}
        </div>

        {/* PUB CARDS — horizontal scroll con taplist inline */}
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 14px 8px" }}>PUB VICINI</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 14px 14px", scrollbarWidth: "none" }}>
          {PUBS_VICINI.map((pub, i) => (
            <div key={i} style={{ flexShrink: 0, width: 220, background: "#1a1612", border: "1px solid #2a2420", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
                <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.8)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,13,10,0.85) 0%, transparent 50%)" }} />
                <span style={{ position: "absolute", top: 7, left: 7, fontSize: 9, fontWeight: 800, padding: "2px 7px", background: pub.open ? "rgba(15,13,10,0.82)" : "rgba(15,13,10,0.82)", border: `1px solid ${pub.open ? "#2a4830" : "#2a2420"}`, color: pub.open ? "#34d399" : "#8a7d74", borderRadius: 4, backdropFilter: "blur(4px)" }}>
                  {pub.open ? "● Aperto" : "● Chiuso"}
                </span>
                <span style={{ position: "absolute", top: 7, right: 7, fontSize: 11, fontWeight: 800, padding: "2px 7px", background: "#f59e0b", color: "#0f0d0a", borderRadius: 4 }}>★ {pub.rating}</span>
                <div style={{ position: "absolute", bottom: 8, left: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#ede8e1", margin: "0 0 1px", letterSpacing: "-0.02em" }}>{pub.name}</p>
                  <p style={{ fontSize: 10, color: "#c8bdb4", margin: 0 }}>{pub.city} · {pub.dist} · {pub.taps} spine</p>
                </div>
              </div>
              {/* Taplist inline */}
              {pub.taplist.length > 0 && (
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
                  {pub.taplist.map((t, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "#0f0d0a", borderRadius: 4 }}>
                      <Beer size={9} color="#f59e0b" />
                      <span style={{ fontSize: 10, color: "#c8bdb4" }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* BIRRIFICI — lista compatta */}
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "4px 14px 8px" }}>BIRRIFICI DEL TERRITORIO</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#2a2420", margin: "0 14px 14px" }}>
          {BREWERIES.map((b, i) => (
            <div key={i} style={{ background: "#1a1612", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", margin: "0 0 1px", letterSpacing: "-0.02em" }}>{b.name}</p>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{b.city} · {b.beers} birre</p>
              </div>
              <ChevronRight size={14} color="#8a7d74" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "0 14px 14px" }}>
          {[["🍺 Gestisci il pub", "Taplist live"], ["🏭 Sei un birrificio?", "Pubblica le birre"]].map(([title, sub], i) => (
            <div key={i} style={{ padding: "12px", background: "#1a1612", border: "1px solid #2a2420", borderRadius: 8, cursor: "pointer" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", margin: "0 0 3px" }}>{title}</p>
              <p style={{ fontSize: 10, color: "#8a7d74", margin: "0 0 9px" }}>{sub}</p>
              <button style={{ width: "100%", padding: "6px 0", border: "1px solid #f59e0b", borderRadius: 4, fontSize: 10, fontWeight: 800, color: "#f59e0b", background: "transparent", cursor: "pointer" }}>Inizia →</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{
        background: "rgba(15,13,10,0.96)", backdropFilter: "blur(16px)",
        borderTop: "1px solid #1f1d1a",
        padding: "10px 0 16px",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[
            { icon: Home, label: "Home" },
            { icon: Map, label: "Mappa", active: true },
            { icon: Beer, label: "Birre" },
            { icon: Grid, label: "Pub" },
            { icon: User, label: "Profilo" },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", minWidth: 48, padding: "2px 0" }}>
              <Icon size={20} color={active ? "#f59e0b" : "#3a3530"} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? "#f59e0b" : "#3a3530", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
