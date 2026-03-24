import { Search, Navigation, Beer, Star, MapPin, Home, Map, Grid, User, ChevronRight, Building2 } from "lucide-react";

const R = "4px";

const PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png",
    taplist: ["Hop Skin IPA 6.5%", "Duna Stout 8.1%", "Weizen 5.0%"] },
  { name: "The Brew House", city: "Milano", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png",
    taplist: ["Revelation Sour 4.8%", "Nursia Extra 7.2%"] },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: true, img: "/__mockup/images/brewery-interior.png",
    taplist: ["Session IPA 5.2%", "Porter Notte 6.8%", "Saison 5.5%"] },
  { name: "Craft Corner", city: "Roma", dist: "3.0 km", taps: 7, rating: 4.2, open: false, img: "/__mockup/images/pub-interior.png",
    taplist: ["American Pale Ale 5.0%"] },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna", dist: "48 km", beers: 34, img: "/__mockup/images/brewery-interior.png", open: true },
  { name: "Del Borgo", city: "Borgorose", dist: "83 km", beers: 28, img: "/__mockup/images/brewery-interior.png", open: true },
  { name: "Revelation Cat", city: "Roma", dist: "1.9 km", beers: 19, img: "/__mockup/images/brewery-interior.png", open: false },
];

const MAP_PINS = [
  { x: "20%", y: "28%", type: "pub", name: "Luppolino" },
  { x: "52%", y: "40%", type: "pub", name: "Brew House" },
  { x: "35%", y: "62%", type: "brewery", name: "CRAK" },
  { x: "70%", y: "22%", type: "pub", name: "Birreria 27" },
  { x: "15%", y: "70%", type: "brewery", name: "Del Borgo" },
  { x: "78%", y: "58%", type: "pub", name: "Craft Corner" },
];

const TABS = ["Pub vicini", "Birrifici", "In spina adesso"];

export function MapFirst() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0908", color: "#ede8e1", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Full-screen map ── */}
      <div style={{ position: "relative", height: "56vh", minHeight: 340, overflow: "hidden", background: "#0e0d0c" }}>

        {/* Dark map grid */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="g" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
              <line x1="0" y1="36" x2="72" y2="36" stroke="#3a3530" strokeWidth="1" />
              <line x1="36" y1="0" x2="36" y2="72" stroke="#3a3530" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
          {/* Roads */}
          <rect x="28%" y="0" width="5%" height="100%" fill="rgba(42,38,32,0.7)" />
          <rect x="62%" y="0" width="4%" height="100%" fill="rgba(42,38,32,0.5)" />
          <rect x="0" y="33%" width="100%" height="5%" fill="rgba(42,38,32,0.7)" />
          <rect x="0" y="62%" width="100%" height="4%" fill="rgba(42,38,32,0.5)" />
          {/* Park */}
          <rect x="8%" y="12%" width="12%" height="8%" rx="2" fill="rgba(20,83,45,0.25)" />
          <rect x="72%" y="52%" width="9%" height="7%" rx="2" fill="rgba(20,83,45,0.2)" />
        </svg>

        {/* Pins */}
        {MAP_PINS.map((pin, i) => (
          <div key={i} style={{ position: "absolute", left: pin.x, top: pin.y, transform: "translate(-50%,-50%)", cursor: "pointer" }}>
            <div style={{
              width: 18, height: 18, borderRadius: R,
              background: i === 0 ? "#f59e0b" : pin.type === "pub" ? "#2a2420" : "#1a3020",
              border: i === 0 ? "none" : `1.5px solid ${pin.type === "pub" ? "#3a3530" : "#2a4830"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: i === 0 ? "0 0 0 5px rgba(245,158,11,0.2)" : "none"
            }}>
              {pin.type === "pub"
                ? <Beer size={9} color={i === 0 ? "#0a0908" : "#8a7d74"} />
                : <Building2 size={9} color="#4a9060" />
              }
            </div>
          </div>
        ))}

        {/* Gradient bottom */}
        <div style={{ position: "absolute", inset: "auto 0 0 0", height: 80, background: "linear-gradient(to bottom, transparent, #0a0908)" }} />

        {/* ── Top bar ── */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#ede8e1", flexShrink: 0 }}>
              fermenta<span style={{ color: "#f59e0b" }}>.to</span>
            </span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "rgba(20,18,16,0.92)", border: "1px solid #2a2420", borderRadius: R, padding: "0 12px", height: 40, backdropFilter: "blur(10px)" }}>
              <Search size={14} color="#8a7d74" />
              <input placeholder="Cerca pub, birrificio o birra…" style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 13, color: "#ede8e1" }} />
              <button style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 10, borderLeft: "1px solid #2a2420", fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>
                <Navigation size={12} /> GPS
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[
              { label: "Tutti", active: true },
              { label: "Pub" },
              { label: "Birrifici" },
              { label: "In spina" },
            ].map(({ label, active }) => (
              <button key={label} style={{
                padding: "5px 12px", borderRadius: R, fontSize: 11, fontWeight: 700,
                background: active ? "#f59e0b" : "rgba(20,18,16,0.85)",
                color: active ? "#0a0908" : "#ede8e1",
                border: active ? "none" : "1px solid #2a2420",
                backdropFilter: "blur(8px)",
                cursor: "pointer"
              }}>{label}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, background: "rgba(20,18,16,0.85)", border: "1px solid #2a2420", borderRadius: R, padding: "5px 10px", backdropFilter: "blur(8px)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#ede8e1" }}>12 aperti</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ position: "absolute", bottom: 14, right: 14, display: "flex", gap: 8, background: "rgba(20,18,16,0.90)", border: "1px solid #2a2420", borderRadius: R, padding: "6px 10px", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
            <span style={{ fontSize: 10, color: "#8a7d74" }}>Pub</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#2a4830", border: "1px solid #4a9060" }} />
            <span style={{ fontSize: 10, color: "#8a7d74" }}>Birrificio</span>
          </div>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div style={{ background: "#0a0908", padding: "8px 16px 16px" }}>
        {/* Handle */}
        <div style={{ width: 36, height: 3, background: "#2a2420", borderRadius: 2, margin: "0 auto 14px" }} />

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 1, background: "#1a1612", marginBottom: 16, borderRadius: R, overflow: "hidden" }}>
          {TABS.map((tab, i) => (
            <button key={tab} style={{
              flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 700,
              background: i === 0 ? "#f59e0b" : "transparent",
              color: i === 0 ? "#0a0908" : "#8a7d74",
              border: "none", cursor: "pointer"
            }}>{tab}</button>
          ))}
        </div>

        {/* ── Pub cards ── */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", marginBottom: 10 }}>
          PUB NELLE VICINANZE
        </p>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12, marginBottom: 18, scrollbarWidth: "none" }}>
          {PUBS.map((pub, i) => (
            <div key={i} style={{ flexShrink: 0, width: 248, background: "#161412", border: "1px solid #2a2420", borderRadius: R, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
                <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)" }} />
                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: "2px 7px", background: "rgba(12,11,9,0.80)", border: `1px solid ${pub.open ? "#2a4830" : "#2a2420"}`, color: pub.open ? "#34d399" : "#8a7d74", borderRadius: R }}>
                  {pub.open ? "● Aperto" : "● Chiuso"}
                </span>
                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 700, padding: "2px 7px", background: "#f59e0b", color: "#0a0908", borderRadius: R }}>
                  ★ {pub.rating}
                </span>
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ede8e1" }}>{pub.name}</span>
                  <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, flexShrink: 0 }}>{pub.dist}</span>
                </div>
                <p style={{ fontSize: 11, color: "#8a7d74", margin: "0 0 8px" }}>{pub.city} · {pub.taps} spine</p>
                {/* Mini taplist */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {pub.taplist.slice(0, 2).map((t, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", background: "#0c0b09", borderRadius: R }}>
                      <Beer size={9} color="#f59e0b" />
                      <span style={{ fontSize: 11, color: "#c8bdb4" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Birrifici ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>
            BIRRIFICI DEL TERRITORIO
          </p>
          <a style={{ fontSize: 11, color: "#f59e0b", cursor: "pointer" }}>Vedi tutti →</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#2a2420", marginBottom: 16 }}>
          {BREWERIES.map((b, i) => (
            <div key={i} style={{ background: "#161412", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: R, overflow: "hidden", flexShrink: 0 }}>
                <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#ede8e1", margin: "0 0 2px" }}>{b.name}</p>
                <p style={{ fontSize: 11, color: "#8a7d74", margin: 0 }}>{b.city} · {b.beers} birre · {b.dist}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: R, background: b.open ? "#0d2e1a" : "#2a2420", color: b.open ? "#34d399" : "#8a7d74", flexShrink: 0 }}>
                {b.open ? "Aperto" : "Chiuso"}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "14px", background: "#161412", border: "1px solid #2a2420", borderRadius: R }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Gestisci un pub?</p>
            <p style={{ fontSize: 11, color: "#8a7d74", marginBottom: 10 }}>Taplist live e visibilità sulla mappa.</p>
            <button style={{ width: "100%", padding: "7px 0", border: "1px solid #f59e0b", borderRadius: R, fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "transparent", cursor: "pointer" }}>Registrati →</button>
          </div>
          <div style={{ padding: "14px", background: "#161412", border: "1px solid #2a2420", borderRadius: R }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Hai un birrificio?</p>
            <p style={{ fontSize: 11, color: "#8a7d74", marginBottom: 10 }}>Pubblica le tue birre e raggiungi i fan.</p>
            <button style={{ width: "100%", padding: "7px 0", border: "1px solid #f59e0b", borderRadius: R, fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "transparent", cursor: "pointer" }}>Registrati →</button>
          </div>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ background: "#0a0908", borderTop: "1px solid #1a1612", padding: "10px 0 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[{ icon: Home, label: "Home", active: true }, { icon: Map, label: "Mappa" }, { icon: Beer, label: "Birre" }, { icon: User, label: "Profilo" }].map(({ icon: Icon, label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
              <Icon size={18} color={active ? "#f59e0b" : "#3a3530"} />
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#f59e0b" : "#3a3530" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
