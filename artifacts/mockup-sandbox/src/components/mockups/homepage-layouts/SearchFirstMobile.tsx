import { Search, MapPin, Star, ChevronRight, Beer, Building2, Users, Bell, Home, Map, Grid, User, Download } from "lucide-react";

const R = "4px";

const NEARBY_PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "The Brew House", city: "Roma", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: false, img: "/__mockup/images/pub-interior.png" },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna", beers: 34, img: "/__mockup/images/brewery-interior.png" },
  { name: "Del Borgo", city: "Borgorose", beers: 28, img: "/__mockup/images/brewery-interior.png" },
  { name: "Revelation Cat", city: "Roma", beers: 19, img: "/__mockup/images/brewery-interior.png" },
];

const BEERS = [
  { name: "Hop Skin IPA", brewery: "CRAK", style: "IPA", abv: "6.5%", rating: 4.8, img: "/__mockup/images/hero-beer.png" },
  { name: "Duna Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 4.7, img: "/__mockup/images/beer-cans.png" },
  { name: "Sour Mango", brewery: "Rev. Cat", style: "Sour", abv: "4.8%", rating: 4.6, img: "/__mockup/images/hero-beer.png" },
  { name: "Weizen Estate", brewery: "Hop Skin", style: "Weizen", abv: "5.0%", rating: 4.5, img: "/__mockup/images/beer-cans.png" },
];

const MODES = [
  { icon: Users, label: "Appassionato", active: true },
  { icon: Building2, label: "Birrificio" },
  { icon: Beer, label: "Pub" },
];

export function SearchFirstMobile() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#f7f4f0", color: "#1a1410", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", overflowY: "auto" }}>

      {/* ── Install prompt ── */}
      <div style={{ background: "#fef3c7", borderBottom: "1px solid #fcd34d", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <Download size={12} color="#92400e" />
        <span style={{ flex: 1, fontSize: 11, color: "#92400e" }}>Installa l'app — funziona anche offline</span>
        <button style={{ fontSize: 11, fontWeight: 700, color: "#92400e", background: "transparent", border: "none", cursor: "pointer" }}>Installa</button>
      </div>

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5ddd5", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>
          fermenta<span style={{ color: "#d97706" }}>.to</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f7f4f0", border: "1px solid #e5ddd5", borderRadius: R, padding: "4px 8px" }}>
            <MapPin size={10} color="#d97706" />
            <span style={{ fontSize: 11, color: "#6b6260" }}>Milano</span>
          </div>
          <button style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
            <Bell size={18} color="#9d8e86" />
          </button>
        </div>
      </div>

      {/* ── Search hero (compact mobile) ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5ddd5", padding: "16px 14px 14px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#1a1410", margin: "0 0 12px", lineHeight: 1.1 }}>
          Dove vuoi<br />bere stasera?
        </h1>

        {/* Search bar */}
        <div style={{ display: "flex", border: "1.5px solid #1a1410", borderRadius: R, overflow: "hidden", boxShadow: "2px 2px 0 #1a1410", marginBottom: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRight: "1px solid #e5ddd5" }}>
            <Search size={14} color="#9d8e86" />
            <input placeholder="Birra, pub o birrificio…" style={{ flex: 1, padding: "10px 0", fontSize: 13, border: "none", outline: "none", color: "#1a1410", background: "transparent" }} />
          </div>
          <button style={{ padding: "0 16px", background: "#1a1410", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cerca</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {MODES.map(({ icon: Icon, label, active }, i) => (
            <button key={i} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "7px 6px", border: `1.5px solid ${active ? "#1a1410" : "#e5ddd5"}`,
              borderRadius: R, fontSize: 11, fontWeight: active ? 700 : 500,
              background: active ? "#1a1410" : "#fff",
              color: active ? "#fff" : "#6b6260",
              cursor: "pointer",
              boxShadow: active ? "1.5px 1.5px 0 #d97706" : "none"
            }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pub vicini ── */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>VICINO A TE</p>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1410", margin: 0, letterSpacing: "-0.02em" }}>Pub aperti adesso</h2>
          </div>
          <a style={{ fontSize: 11, color: "#d97706", fontWeight: 600, cursor: "pointer" }}>Mappa →</a>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#e5ddd5", margin: "0 0 14px" }}>
        {NEARBY_PUBS.map((pub, i) => (
          <div key={i} style={{ background: "#fff", display: "flex", gap: 12, padding: "12px 14px", cursor: "pointer" }}>
            <div style={{ width: 64, height: 64, borderRadius: R, overflow: "hidden", flexShrink: 0 }}>
              <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1410", margin: 0, lineHeight: 1.2 }}>{pub.name}</h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>★ {pub.rating}</span>
              </div>
              <p style={{ fontSize: 11, color: "#9d8e86", margin: "0 0 6px" }}>{pub.city} · {pub.dist}</p>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: pub.open ? "#ecfdf5" : "#f3f4f6", color: pub.open ? "#059669" : "#6b7280", borderRadius: R }}>
                  {pub.open ? "● Aperto" : "● Chiuso"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", background: "#fef3c7", color: "#92400e", borderRadius: R }}>🍺 {pub.taps} spine</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Birrifici scroll ── */}
      <div style={{ padding: "0 14px 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>BIRRIFICI</p>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1410", margin: 0, letterSpacing: "-0.02em" }}>Produttori italiani</h2>
          </div>
          <a style={{ fontSize: 11, color: "#d97706", fontWeight: 600, cursor: "pointer" }}>Tutti →</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 14px 14px", scrollbarWidth: "none" }}>
        {BREWERIES.map((b, i) => (
          <div key={i} style={{ flexShrink: 0, width: 130, background: "#fff", border: "1px solid #e5ddd5", borderRadius: R, overflow: "hidden", cursor: "pointer" }}>
            <div style={{ height: 80, overflow: "hidden" }}>
              <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "8px 10px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", margin: "0 0 2px", lineHeight: 1.2 }}>{b.name}</p>
              <p style={{ fontSize: 10, color: "#9d8e86", margin: 0 }}>{b.city} · {b.beers} birre</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Birre scroll ── */}
      <div style={{ padding: "0 14px 8px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", margin: "0 0 2px" }}>TRENDING</p>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1410", margin: "0 0 10px", letterSpacing: "-0.02em" }}>Birre della settimana</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#e5ddd5", marginBottom: 14 }}>
        {BEERS.map((beer, i) => (
          <div key={i} style={{ background: "#fff", cursor: "pointer" }}>
            <div style={{ position: "relative", height: 100, overflow: "hidden" }}>
              <img src={beer.img} alt={beer.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
              <span style={{ position: "absolute", bottom: 7, left: 8, fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>★ {beer.rating}</span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d97706", margin: "0 0 2px" }}>{beer.style} · {beer.abv}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", margin: "0 0 1px", lineHeight: 1.2 }}>{beer.name}</p>
              <p style={{ fontSize: 10, color: "#9d8e86", margin: 0 }}>{beer.brewery}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA strip */}
      <div style={{ margin: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ padding: "12px", border: "1.5px solid #1a1410", borderRadius: R, background: "#fff", boxShadow: "2px 2px 0 #1a1410" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 6 }}>Hai un birrificio?</p>
          <button style={{ width: "100%", padding: "7px 0", background: "#d97706", color: "#fff", border: "none", borderRadius: R, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Registrati</button>
        </div>
        <div style={{ padding: "12px", border: "1.5px solid #1a1410", borderRadius: R, background: "#fff", boxShadow: "2px 2px 0 #1a1410" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1410", marginBottom: 6 }}>Gestisci un pub?</p>
          <button style={{ width: "100%", padding: "7px 0", background: "#1a1410", color: "#fff", border: "none", borderRadius: R, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Vai al pannello</button>
        </div>
      </div>

      <div style={{ height: 60 }} />

      {/* ── Bottom nav ── */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e5ddd5", padding: "8px 0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[{ icon: Home, label: "Home", active: true }, { icon: Map, label: "Mappa" }, { icon: Beer, label: "Birre" }, { icon: Grid, label: "Pub" }, { icon: User, label: "Profilo" }].map(({ icon: Icon, label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", minWidth: 44, padding: "4px 0" }}>
              <Icon size={19} color={active ? "#d97706" : "#c8bdb4"} />
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#d97706" : "#c8bdb4" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
