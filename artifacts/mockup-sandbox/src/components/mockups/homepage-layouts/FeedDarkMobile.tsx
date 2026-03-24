import { Search, Star, Beer, MapPin, Bell, ChevronRight, Home, Map, Grid, User, Zap, Download } from "lucide-react";

const R = "4px";

const FEED = [
  { user: "Marco T.", initial: "M", beer: "Hop Skin IPA", brewery: "CRAK Brewery", style: "IPA", abv: "6.5%", rating: 4, note: "Agrumata e intensa, luppolatura fantastica.", ago: "3 min" },
  { user: "Giulia R.", initial: "G", beer: "Nursia Extra", brewery: "Birra Nursia", style: "Belgian", abv: "7.2%", rating: 5, note: "Complessa e morbida. La migliore dell'anno.", ago: "11 min" },
  { user: "Luca B.", initial: "L", beer: "Revelation Sour", brewery: "Revelation Cat", style: "Sour", abv: "4.8%", rating: 4, note: "Fresca e piacevole per l'estate.", ago: "22 min" },
  { user: "Sara M.", initial: "S", beer: "Duna Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 5, note: "Corposa, cioccolatosa, vellutata.", ago: "35 min" },
  { user: "Paolo F.", initial: "P", beer: "Ambrata Piemontese", brewery: "Beerland", style: "Amber", abv: "5.4%", rating: 3, note: "Equilibrata e maltata. Facile da bere.", ago: "1h" },
];

const STYLES = ["Tutti", "IPA", "Stout", "Sour", "Lager", "Weizen", "Porter", "Saison"];

const TAPLIST_ALERT = { pub: "Luppolino Pub", beer: "Hop Skin IPA", ago: "5 min" };

export function FeedDarkMobile() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0c0b09", color: "#ede8e1", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>

      {/* ── Install prompt ── */}
      <div style={{ background: "#1a1612", borderBottom: "1px solid #1f1d1a", padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <Download size={13} color="#f59e0b" />
        <span style={{ flex: 1, fontSize: 11, color: "#c8bdb4" }}>Installa l'app per funzionare offline</span>
        <button style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "transparent", border: "none", cursor: "pointer" }}>Installa</button>
        <button style={{ fontSize: 11, color: "#8a7d74", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
      </div>

      {/* ── Header ── */}
      <div style={{ background: "#0c0b09", borderBottom: "1px solid #1f1d1a", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: "#ede8e1", letterSpacing: "-0.02em" }}>
          fermenta<span style={{ color: "#f59e0b" }}>.to</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#161412", border: "1px solid #1f1d1a", borderRadius: R, padding: "4px 8px" }}>
            <MapPin size={10} color="#f59e0b" />
            <span style={{ fontSize: 11, color: "#8a7d74" }}>Milano</span>
          </div>
          <button style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
            <Bell size={18} color="#8a7d74" />
            <span style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", border: "1.5px solid #0c0b09" }} />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: R, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0c0b09" }}>M</div>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1f1d1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#161412", border: "1px solid #1f1d1a", borderRadius: R, padding: "0 12px", height: 40 }}>
          <Search size={14} color="#8a7d74" />
          <input placeholder="Cerca birra, birrificio o pub…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#ede8e1" }} />
        </div>
      </div>

      {/* ── Style chips ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 14px", borderBottom: "1px solid #1f1d1a", scrollbarWidth: "none" }}>
        {STYLES.map((s, i) => (
          <button key={s} style={{
            flexShrink: 0, padding: "5px 12px", borderRadius: R, fontSize: 12, fontWeight: 600,
            background: i === 0 ? "#f59e0b" : "#161412",
            color: i === 0 ? "#0c0b09" : "#8a7d74",
            border: i === 0 ? "none" : "1px solid #1f1d1a",
            cursor: "pointer"
          }}>{s}</button>
        ))}
      </div>

      {/* ── Taplist alert ── */}
      <div style={{ margin: "10px 14px 0", background: "#161412", border: "1px solid #1f1d1a", borderRadius: R, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <Zap size={14} color="#f59e0b" />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: "#ede8e1" }}>
            <span style={{ fontWeight: 700, color: "#f59e0b" }}>{TAPLIST_ALERT.pub}</span>
            <span style={{ color: "#8a7d74" }}> ha aggiunto </span>
            <span style={{ fontWeight: 600 }}>{TAPLIST_ALERT.beer}</span>
          </span>
          <p style={{ fontSize: 10, color: "#8a7d74", margin: "2px 0 0" }}>{TAPLIST_ALERT.ago} fa</p>
        </div>
        <ChevronRight size={13} color="#8a7d74" />
      </div>

      {/* ── Feed label ── */}
      <div style={{ padding: "14px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>ATTIVITÀ RECENTE</p>
        <a style={{ fontSize: 11, color: "#f59e0b", cursor: "pointer" }}>Filtra ↓</a>
      </div>

      {/* ── Feed items ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a", marginBottom: 10 }}>
        {FEED.map((item, i) => (
          <div key={i} style={{ background: "#0c0b09", padding: "12px 14px", display: "flex", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: R, background: "#161412", border: "1px solid #1f1d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>
              {item.initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, margin: "0 0 2px", lineHeight: 1.3 }}>
                <span style={{ fontWeight: 600, color: "#ede8e1" }}>{item.user}</span>
                <span style={{ color: "#8a7d74" }}> ha assaggiato </span>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{item.beer}</span>
              </p>
              <p style={{ fontSize: 11, color: "#8a7d74", margin: "0 0 5px" }}>{item.brewery} · {item.style} · {item.abv}</p>
              <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={11} fill={s <= item.rating ? "#f59e0b" : "none"} color={s <= item.rating ? "#f59e0b" : "#2a2420"} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#c8bdb4", margin: 0, fontStyle: "italic" }}>"{item.note}"</p>
            </div>
            <span style={{ fontSize: 10, color: "#8a7d74", flexShrink: 0, paddingTop: 2 }}>{item.ago}</span>
          </div>
        ))}
      </div>

      {/* Spacer for bottom nav */}
      <div style={{ height: 60 }} />

      {/* ── Bottom nav ── */}
      <div style={{ position: "sticky", bottom: 0, background: "#0c0b09", borderTop: "1px solid #1f1d1a", padding: "8px 0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[{ icon: Home, label: "Home", active: true }, { icon: Map, label: "Mappa" }, { icon: Beer, label: "Birre" }, { icon: Grid, label: "Pub" }, { icon: User, label: "Profilo" }].map(({ icon: Icon, label, active }) => (
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
