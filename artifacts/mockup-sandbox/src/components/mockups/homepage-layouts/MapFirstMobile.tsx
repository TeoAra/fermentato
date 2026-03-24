import { Search, Navigation, Beer, Star, MapPin, Home, Map, Grid, User, Building2, Bell, Download, ChevronRight } from "lucide-react";

const R = "4px";

const PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png", taplist: ["Hop Skin IPA 6.5%", "Duna Stout 8.1%"] },
  { name: "The Brew House", city: "Milano", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png", taplist: ["Revelation Sour 4.8%", "Nursia Extra 7.2%"] },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: true, img: "/__mockup/images/brewery-interior.png", taplist: ["Session IPA 5.2%", "Porter Notte 6.8%"] },
  { name: "Craft Corner", city: "Roma", dist: "3.0 km", taps: 7, rating: 4.2, open: false, img: "/__mockup/images/pub-interior.png", taplist: ["Pale Ale 5.0%"] },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna", dist: "48 km", beers: 34, img: "/__mockup/images/brewery-interior.png" },
  { name: "Del Borgo", city: "Borgorose", dist: "83 km", beers: 28, img: "/__mockup/images/brewery-interior.png" },
  { name: "Revelation Cat", city: "Roma", dist: "1.9 km", beers: 19, img: "/__mockup/images/brewery-interior.png" },
];

const MAP_PINS = [
  { x: "22%", y: "30%", type: "pub", active: true },
  { x: "55%", y: "44%", type: "pub" },
  { x: "36%", y: "64%", type: "brewery" },
  { x: "72%", y: "25%", type: "pub" },
  { x: "14%", y: "70%", type: "brewery" },
  { x: "80%", y: "58%", type: "pub" },
];

const FILTERS = ["Tutti", "Pub", "Birrifici", "In spina"];
const TABS = ["Pub vicini", "Birrifici", "In spina"];

export function MapFirstMobile() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0908", color: "#ede8e1", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Install prompt ── */}
      <div style={{ background: "#161412", borderBottom: "1px solid #1f1d1a", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Download size={12} color="#f59e0b" />
        <span style={{ flex: 1, fontSize: 10, color: "#8a7d74" }}>Installa l'app per usare la mappa offline</span>
        <button style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>Installa</button>
      </div>

      {/* ── Map area ── */}
      <div style={{ position: "relative", flex: "0 0 42%", minHeight: 220, background: "#0e0d0c", overflow: "hidden" }}>

        {/* Grid */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="g2" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
              <line x1="0" y1="28" x2="56" y2="28" stroke="#3a3530" strokeWidth="1" />
              <line x1="28" y1="0" x2="28" y2="56" stroke="#3a3530" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
          <rect x="26%" y="0" width="5%" height="100%" fill="rgba(42,38,32,0.7)" />
          <rect x="60%" y="0" width="4%" height="100%" fill="rgba(42,38,32,0.5)" />
          <rect x="0" y="36%" width="100%" height="5%" fill="rgba(42,38,32,0.7)" />
          <rect x="0" y="64%" width="100%" height="4%" fill="rgba(42,38,32,0.5)" />
          <rect x="6%" y="10%" width="12%" height="8%" rx="2" fill="rgba(20,83,45,0.22)" />
        </svg>

        {/* Pins */}
        {MAP_PINS.map((pin, i) => (
          <div key={i} style={{ position: "absolute", left: pin.x, top: pin.y, transform: "translate(-50%,-50%)" }}>
            <div style={{
              width: 16, height: 16, borderRadius: R,
              background: pin.active ? "#f59e0b" : pin.type === "pub" ? "#2a2420" : "#1a3020",
              border: pin.active ? "none" : `1px solid ${pin.type === "pub" ? "#3a3530" : "#2a4830"}`,
              boxShadow: pin.active ? "0 0 0 5px rgba(245,158,11,0.2)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {pin.type === "pub"
                ? <Beer size={8} color={pin.active ? "#0a0908" : "#8a7d74"} />
                : <Building2 size={8} color="#4a9060" />
              }
            </div>
          </div>
        ))}

        {/* Gradient */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to bottom, transparent, #0a0908)" }} />

        {/* Top bar overlay */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#ede8e1", flexShrink: 0 }}>
              fermenta<span style={{ color: "#f59e0b" }}>.to</span>
            </span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(20,18,16,0.92)", border: "1px solid #2a2420", borderRadius: R, padding: "0 10px", height: 36, backdropFilter: "blur(10px)" }}>
              <Search size={13} color="#8a7d74" />
              <input placeholder="Cerca vicino a te…" style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 12, color: "#ede8e1" }} />
              <button style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 8, borderLeft: "1px solid #2a2420", fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>
                <Navigation size={11} />GPS
              </button>
            </div>
            <button style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
              <Bell size={17} color="#8a7d74" />
              <span style={{ position: "absolute", top: 0, right: 0, width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", border: "1px solid #0a0908" }} />
            </button>
          </div>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
            {FILTERS.map((f, i) => (
              <button key={f} style={{
                padding: "4px 10px", borderRadius: R, fontSize: 10, fontWeight: 700,
                background: i === 0 ? "#f59e0b" : "rgba(20,18,16,0.88)",
                color: i === 0 ? "#0a0908" : "#ede8e1",
                border: i === 0 ? "none" : "1px solid #2a2420",
                backdropFilter: "blur(8px)", cursor: "pointer"
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Live badge */}
        <div style={{ position: "absolute", bottom: 14, left: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(20,18,16,0.90)", border: "1px solid #2a2420", borderRadius: R, padding: "5px 8px", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>12 aperti</span>
        </div>
      </div>

      {/* ── Scrollable bottom content ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0a0908" }}>
        {/* Handle */}
        <div style={{ width: 32, height: 3, background: "#2a2420", borderRadius: 2, margin: "8px auto" }} />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 1, background: "#1a1612", margin: "0 12px 12px", borderRadius: R, overflow: "hidden" }}>
          {TABS.map((tab, i) => (
            <button key={tab} style={{
              flex: 1, padding: "8px 0", fontSize: 10, fontWeight: 700,
              background: i === 0 ? "#f59e0b" : "transparent",
              color: i === 0 ? "#0a0908" : "#8a7d74",
              border: "none", cursor: "pointer"
            }}>{tab}</button>
          ))}
        </div>

        {/* Pub cards */}
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: "0 12px 8px" }}>PUB VICINI</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 12px 12px", scrollbarWidth: "none" }}>
          {PUBS.map((pub, i) => (
            <div key={i} style={{ flexShrink: 0, width: 210, background: "#161412", border: "1px solid #2a2420", borderRadius: R, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "relative", height: 110, overflow: "hidden" }}>
                <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)" }} />
                <span style={{ position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "rgba(12,11,9,0.82)", border: `1px solid ${pub.open ? "#2a4830" : "#2a2420"}`, color: pub.open ? "#34d399" : "#8a7d74", borderRadius: R }}>
                  {pub.open ? "● Aperto" : "● Chiuso"}
                </span>
                <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10, fontWeight: 700, padding: "2px 6px", background: "#f59e0b", color: "#0a0908", borderRadius: R }}>★ {pub.rating}</span>
              </div>
              <div style={{ padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>{pub.name}</span>
                  <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>{pub.dist}</span>
                </div>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: "0 0 7px" }}>{pub.city} · {pub.taps} spine</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {pub.taplist.map((t, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 5px", background: "#0c0b09", borderRadius: R }}>
                      <Beer size={8} color="#f59e0b" />
                      <span style={{ fontSize: 10, color: "#c8bdb4" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Breweries */}
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: "4px 12px 8px" }}>BIRRIFICI DEL TERRITORIO</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#2a2420", margin: "0 12px 12px" }}>
          {BREWERIES.map((b, i) => (
            <div key={i} style={{ background: "#161412", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: R, overflow: "hidden", flexShrink: 0 }}>
                <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1", margin: "0 0 2px" }}>{b.name}</p>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{b.city} · {b.beers} birre · {b.dist}</p>
              </div>
              <ChevronRight size={13} color="#8a7d74" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, margin: "0 12px 12px" }}>
          {[["Gestisci un pub?", "Taplist live e visibilità"], ["Hai un birrificio?", "Pubblica le tue birre"]].map(([title, sub], i) => (
            <div key={i} style={{ padding: "12px", background: "#161412", border: "1px solid #2a2420", borderRadius: R }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 10, color: "#8a7d74", marginBottom: 8 }}>{sub}</p>
              <button style={{ width: "100%", padding: "6px 0", border: "1px solid #f59e0b", borderRadius: R, fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "transparent", cursor: "pointer" }}>Registrati →</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ background: "#0a0908", borderTop: "1px solid #1a1612", padding: "8px 0 4px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[{ icon: Home, label: "Home", active: false }, { icon: Map, label: "Mappa", active: true }, { icon: Beer, label: "Birre" }, { icon: Grid, label: "Pub" }, { icon: User, label: "Profilo" }].map(({ icon: Icon, label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", minWidth: 44, padding: "4px 0" }}>
              <Icon size={19} color={active ? "#f59e0b" : "#3a3530"} />
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#f59e0b" : "#3a3530" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
