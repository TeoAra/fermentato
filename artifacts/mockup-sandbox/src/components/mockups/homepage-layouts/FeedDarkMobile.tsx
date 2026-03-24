import { MapPin, Bell, Search, Star, Beer, ChevronRight, Home, Map, Grid, User, Navigation } from "lucide-react";

// ── La Serata ────────────────────────────────────────────────
// Concept: ogni serata è unica. L'app ti accoglie come se
// sapesse dove sei e cosa vuoi. Hero emozionale, card grandi
// con peek del prossimo elemento per invitare lo swipe.
// Colori: dark profondo + ambra + terracotta.
// ────────────────────────────────────────────────────────────

const SERATA_CARDS = [
  {
    name: "Luppolino Pub",
    city: "Navigli, Milano",
    dist: "0.4 km",
    img: "/__mockup/images/pub-interior.png",
    beer: "Hop Skin IPA",
    taps: 14,
    rating: 4.7,
    open: true,
    tag: "SOLD OUT 3 spine",
  },
  {
    name: "The Brew House",
    city: "Pigneto, Roma",
    dist: "1.1 km",
    img: "/__mockup/images/brewery-interior.png",
    beer: "Duna Imperial Stout",
    taps: 9,
    rating: 4.5,
    open: true,
    tag: "Evento stasera",
  },
  {
    name: "Birreria 27",
    city: "San Salvario, Torino",
    dist: "2.3 km",
    img: "/__mockup/images/pub-interior.png",
    beer: "Session IPA",
    taps: 22,
    rating: 4.8,
    open: true,
    tag: "22 spine live",
  },
];

const FEED = [
  { user: "Marco T.", initial: "M", beer: "Hop Skin IPA", brewery: "CRAK", style: "IPA", rating: 5, note: "Incredibile questo lotto. Luppolatura perfetta.", ago: "4 min" },
  { user: "Giulia R.", initial: "G", beer: "Nursia Extra", brewery: "Birra Nursia", style: "Belgian", rating: 4, note: "Complessa, morbida, da meditazione.", ago: "12 min" },
  { user: "Luca B.", initial: "L", beer: "Sour Mango", brewery: "Rev. Cat", style: "Sour", rating: 4, note: "Fresca e piacevole. Perfetta per stasera.", ago: "31 min" },
];

export function FeedDarkMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#080706",
      color: "#ede8e1",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── STATUS BAR simulata ── */}
      <div style={{ padding: "10px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {[3,4,5,5,5].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#ede8e1" : "#4a4540", borderRadius: 1 }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#ede8e1" }}>●●●</span>
        </div>
      </div>

      {/* ── HERO HEADER ── */}
      <div style={{ padding: "8px 18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 13, color: "#8a7d74", margin: "0 0 2px", fontWeight: 500 }}>
              <span style={{ color: "#34d399" }}>●</span> Milano · Navigli
            </p>
            <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#ede8e1" }}>
              Buona<br />
              <span style={{ fontStyle: "italic", color: "#f59e0b" }}>serata.</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button style={{ width: 38, height: 38, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Search size={16} color="#8a7d74" />
            </button>
            <button style={{ position: "relative", width: 38, height: 38, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Bell size={16} color="#8a7d74" />
              <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", border: "1.5px solid #080706" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SEZIONE: Dove andare stasera — swipe cards ── */}
      <div style={{ paddingLeft: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingRight: 18, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>
            Dove andare stasera
          </p>
          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, cursor: "pointer" }}>Mappa →</span>
        </div>

        {/* Horizontal scroll con peek */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingRight: 18, paddingBottom: 4, scrollbarWidth: "none" }}>
          {SERATA_CARDS.map((card, i) => (
            <div key={i} style={{
              flexShrink: 0,
              width: 270,
              borderRadius: 8,
              overflow: "hidden",
              background: "#111009",
              border: "1px solid #2a2420",
              cursor: "pointer",
            }}>
              {/* Immagine */}
              <div style={{ position: "relative", height: 168, overflow: "hidden" }}>
                <img src={card.img} alt={card.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.75)" }} />
                {/* Gradiente */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.92) 0%, rgba(8,7,6,0.1) 55%)" }} />
                {/* Tag evento */}
                <div style={{ position: "absolute", top: 10, left: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", background: "#f59e0b", color: "#080706", borderRadius: 4 }}>
                    {card.tag}
                  </span>
                </div>
                {/* Rating */}
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: 12, fontWeight: 800, padding: "3px 8px", background: "rgba(8,7,6,0.75)", color: "#f59e0b", borderRadius: 4, backdropFilter: "blur(4px)" }}>
                  ★ {card.rating}
                </span>
                {/* Info sotto immagine */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "#ede8e1", margin: "0 0 2px", letterSpacing: "-0.02em" }}>{card.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <MapPin size={10} color="#f59e0b" />
                    <span style={{ fontSize: 11, color: "#c8bdb4" }}>{card.city} · {card.dist}</span>
                  </div>
                </div>
              </div>
              {/* Footer card */}
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #2a2420" }}>
                <div style={{ display: "flex", align: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ede8e1" }}>Aperto</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#8a7d74" }}>· {card.taps} spine</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Beer size={11} color="#f59e0b" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>{card.beer}</span>
                </div>
              </div>
            </div>
          ))}
          {/* Peek spacer */}
          <div style={{ flexShrink: 0, width: 8 }} />
        </div>
      </div>

      {/* ── SEZIONE: Cosa bevono adesso ── */}
      <div style={{ paddingLeft: 18, paddingRight: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>
            Cosa bevono adesso
          </p>
          <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, cursor: "pointer" }}>Tutti →</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a" }}>
          {FEED.map((item, i) => (
            <div key={i} style={{ background: "#080706", padding: "13px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 6,
                background: "#1a1612", border: "1px solid #2a2420",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "#f59e0b", flexShrink: 0
              }}>
                {item.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, margin: "0 0 3px", lineHeight: 1.3 }}>
                  <span style={{ fontWeight: 700, color: "#ede8e1" }}>{item.user}</span>
                  <span style={{ color: "#8a7d74" }}> · </span>
                  <span style={{ fontStyle: "italic", fontWeight: 800, color: "#f59e0b" }}>{item.beer}</span>
                </p>
                <p style={{ fontSize: 11, color: "#8a7d74", margin: "0 0 5px" }}>{item.brewery} · {item.style}</p>
                <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={11} fill={s <= item.rating ? "#f59e0b" : "none"} color={s <= item.rating ? "#f59e0b" : "#2a2420"} />
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#c8bdb4", margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>"{item.note}"</p>
              </div>
              <span style={{ fontSize: 10, color: "#8a7d74", flexShrink: 0, paddingTop: 2 }}>{item.ago}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Birrificio + Pub ── */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button style={{
            padding: "14px 10px", background: "#161412", border: "1px solid #2a2420",
            borderRadius: 8, cursor: "pointer", textAlign: "left"
          }}>
            <Beer size={16} color="#f59e0b" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 11, fontWeight: 800, color: "#ede8e1", margin: "0 0 2px" }}>Gestisci il pub</p>
            <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>Taplist live →</p>
          </button>
          <button style={{
            padding: "14px 10px", background: "#161412", border: "1px solid #2a2420",
            borderRadius: 8, cursor: "pointer", textAlign: "left"
          }}>
            <Search size={16} color="#f59e0b" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 11, fontWeight: 800, color: "#ede8e1", margin: "0 0 2px" }}>Sei un birrificio?</p>
            <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>Pubblica le birre →</p>
          </button>
        </div>
      </div>

      <div style={{ height: 72 }} />

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(8,7,6,0.96)", backdropFilter: "blur(16px)",
        borderTop: "1px solid #1f1d1a",
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
              <Icon size={20} color={active ? "#f59e0b" : "#3a3530"} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? "#f59e0b" : "#3a3530", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
