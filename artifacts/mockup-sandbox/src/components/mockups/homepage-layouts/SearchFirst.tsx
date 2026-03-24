import { Search, MapPin, Star, ChevronRight, Beer, Building2, Users } from "lucide-react";

const R = "4px";

const PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png", speciality: "14 birre artigianali alla spina" },
  { name: "The Brew House", city: "Roma", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png", speciality: "Selezione belga e americana" },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: false, img: "/__mockup/images/pub-interior.png", speciality: "Birrificio in loco, visite guidate" },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna (SA)", beers: 34, style: "IPA / Sour", img: "/__mockup/images/brewery-interior.png" },
  { name: "Del Borgo", city: "Borgorose (RI)", beers: 28, style: "Imperial / Farmhouse", img: "/__mockup/images/brewery-interior.png" },
  { name: "Revelation Cat", city: "Roma", beers: 19, style: "Sour / Hazy", img: "/__mockup/images/brewery-interior.png" },
  { name: "Birra Nursia", city: "Norcia (PG)", beers: 12, style: "Belgian / Abbey", img: "/__mockup/images/brewery-interior.png" },
];

const BEERS = [
  { name: "Hop Skin Session IPA", brewery: "CRAK", style: "IPA", abv: "6.5%", rating: 4.8, img: "/__mockup/images/hero-beer.png" },
  { name: "Duna Imperial Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 4.7, img: "/__mockup/images/beer-cans.png" },
  { name: "Sour Mango Berliner", brewery: "Rev. Cat", style: "Sour", abv: "4.8%", rating: 4.6, img: "/__mockup/images/hero-beer.png" },
  { name: "Weizen Estate", brewery: "Hop Skin", style: "Weizen", abv: "5.0%", rating: 4.5, img: "/__mockup/images/beer-cans.png" },
];

export function SearchFirst() {
  return (
    <div style={{ minHeight: "100vh", background: "#f7f4f0", color: "#1a1410", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5ddd5", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
            fermenta<span style={{ color: "#d97706" }}>.to</span>
          </span>
          <div style={{ display: "flex", gap: 28, fontSize: 13, color: "#6b6260" }}>
            {["Birre", "Birrifici", "Pub", "Festival", "Mappa"].map(l => <a key={l} style={{ cursor: "pointer" }}>{l}</a>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "6px 14px", border: "1px solid #e5ddd5", borderRadius: R, fontSize: 13, color: "#6b6260", background: "transparent", cursor: "pointer" }}>Accedi</button>
            <button style={{ padding: "6px 14px", borderRadius: R, fontSize: 13, fontWeight: 700, background: "#d97706", color: "#fff", border: "none", cursor: "pointer" }}>Iscriviti</button>
          </div>
        </div>
      </div>

      {/* ── Hero: search centrato ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5ddd5", padding: "48px 24px 40px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d97706", marginBottom: 14 }}>
            La piattaforma italiana della birra artigianale
          </p>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.03em", color: "#1a1410", marginBottom: 28 }}>
            Dove vuoi<br />bere stasera?
          </h1>

          {/* Search bar */}
          <div style={{ display: "flex", border: "1.5px solid #1a1410", borderRadius: R, overflow: "hidden", boxShadow: "3px 3px 0 #1a1410" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderRight: "1px solid #e5ddd5" }}>
              <Search size={16} color="#9d8e86" />
              <input placeholder="Birra, pub o birrificio…" style={{ flex: 1, padding: "12px 0", fontSize: 14, border: "none", outline: "none", color: "#1a1410", background: "transparent" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderRight: "1px solid #e5ddd5", minWidth: 140 }}>
              <MapPin size={14} color="#d97706" />
              <span style={{ fontSize: 13, color: "#6b6260" }}>Milano, IT</span>
            </div>
            <button style={{ padding: "0 24px", background: "#1a1410", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cerca</button>
          </div>

          {/* Role selector */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {[
              { icon: Users, label: "Sono un appassionato", active: true },
              { icon: Building2, label: "Ho un birrificio" },
              { icon: Beer, label: "Gestisco un pub" },
            ].map(({ icon: Icon, label, active }, i) => (
              <button key={i} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                border: `1.5px solid ${active ? "#1a1410" : "#e5ddd5"}`,
                borderRadius: R, fontSize: 12, fontWeight: active ? 700 : 500,
                background: active ? "#1a1410" : "#fff",
                color: active ? "#fff" : "#6b6260",
                cursor: "pointer",
                boxShadow: active ? "2px 2px 0 #d97706" : "none"
              }}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content: 3 col grid ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── Section: Pub aperti vicino a te ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", marginBottom: 3 }}>VICINO A TE · UTENTE</p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1410", margin: 0, letterSpacing: "-0.02em" }}>Pub aperti adesso</h2>
            </div>
            <a style={{ fontSize: 12, fontWeight: 600, color: "#d97706", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Vedi mappa <ChevronRight size={14} />
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "#e5ddd5" }}>
            {PUBS.map((pub, i) => (
              <div key={i} style={{ background: "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                  <img src={pub.img} alt={pub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)" }} />
                  <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, fontWeight: 700, padding: "3px 8px", background: pub.open ? "#10b981" : "#6b6260", color: "#fff", borderRadius: R }}>
                    {pub.open ? "● Aperto" : "Chiuso"}
                  </span>
                  <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: R }}>
                    ★ {pub.rating}
                  </span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1410", margin: 0 }}>{pub.name}</h3>
                    <span style={{ fontSize: 11, color: "#9d8e86", marginLeft: 8, flexShrink: 0 }}>{pub.dist}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#9d8e86", margin: "0 0 8px" }}>{pub.city}</p>
                  <p style={{ fontSize: 12, color: "#6b6260", margin: "0 0 10px" }}>{pub.speciality}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: "#fef3c7", color: "#92400e", borderRadius: R }}>🍺 {pub.taps} spine</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section: 2 col — birrifici + birre ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>

          {/* Birrifici */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", marginBottom: 3 }}>BIRRIFICIO</p>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1410", margin: 0, letterSpacing: "-0.02em" }}>Produttori italiani</h2>
              </div>
              <a style={{ fontSize: 12, fontWeight: 600, color: "#d97706", cursor: "pointer" }}>Tutti →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#e5ddd5" }}>
              {BREWERIES.map((b, i) => (
                <div key={i} style={{ background: "#fff", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: R, overflow: "hidden", flexShrink: 0, border: "1px solid #e5ddd5" }}>
                    <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1410", margin: "0 0 2px" }}>{b.name}</p>
                    <p style={{ fontSize: 11, color: "#9d8e86", margin: "0 0 3px" }}>{b.city} · {b.beers} birre</p>
                    <p style={{ fontSize: 11, color: "#d97706", fontWeight: 600, margin: 0 }}>{b.style}</p>
                  </div>
                  <ChevronRight size={14} color="#9d8e86" />
                </div>
              ))}
            </div>
            {/* CTA birrificio */}
            <div style={{ marginTop: 12, padding: "14px 16px", border: "1.5px solid #1a1410", borderRadius: R, background: "#fff", boxShadow: "2px 2px 0 #1a1410" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Hai un birrificio?</p>
              <p style={{ fontSize: 11, color: "#6b6260", marginBottom: 10 }}>Pubblica le tue birre e raggiungi migliaia di appassionati.</p>
              <button style={{ width: "100%", padding: "8px 0", background: "#d97706", color: "#fff", border: "none", borderRadius: R, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Registra il birrificio</button>
            </div>
          </div>

          {/* Birre */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9d8e86", marginBottom: 3 }}>IN EVIDENZA</p>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1410", margin: 0, letterSpacing: "-0.02em" }}>Birre di tendenza</h2>
              </div>
              <a style={{ fontSize: 12, fontWeight: 600, color: "#d97706", cursor: "pointer" }}>Tutte →</a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#e5ddd5" }}>
              {BEERS.map((beer, i) => (
                <div key={i} style={{ background: "#fff", cursor: "pointer" }}>
                  <div style={{ position: "relative", height: 110, overflow: "hidden" }}>
                    <img src={beer.img} alt={beer.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
                    <span style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>★ {beer.rating}</span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d97706", marginBottom: 2 }}>{beer.style} · {beer.abv}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", margin: "0 0 2px", lineHeight: 1.3 }}>{beer.name}</p>
                    <p style={{ fontSize: 11, color: "#9d8e86", margin: 0 }}>{beer.brewery}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* CTA pub */}
            <div style={{ marginTop: 12, padding: "14px 16px", border: "1.5px solid #1a1410", borderRadius: R, background: "#fff", boxShadow: "2px 2px 0 #1a1410" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", marginBottom: 4 }}>Gestisci un pub?</p>
              <p style={{ fontSize: 11, color: "#6b6260", marginBottom: 10 }}>Taplist live, gestione eventi e visibilità aumentata.</p>
              <button style={{ width: "100%", padding: "8px 0", background: "#1a1410", color: "#fff", border: "none", borderRadius: R, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Porta il tuo pub online</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
