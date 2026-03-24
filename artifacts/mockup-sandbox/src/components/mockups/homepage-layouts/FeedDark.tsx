import { Search, Star, Beer, ChevronRight, ArrowRight, Zap } from "lucide-react";

const R = "4px";

const FEED = [
  { user: "Marco T.", initial: "M", beer: "Hop Skin IPA", brewery: "CRAK Brewery", style: "IPA", abv: "6.5%", rating: 4, note: "Agrumata e intensa, luppolatura fantastica.", ago: "3 min" },
  { user: "Giulia R.", initial: "G", beer: "Nursia Extra", brewery: "Birra Nursia", style: "Belgian", abv: "7.2%", rating: 5, note: "Complessa e morbida. La migliore dell'anno.", ago: "11 min" },
  { user: "Luca B.", initial: "L", beer: "Revelation Sour", brewery: "Revelation Cat", style: "Sour", abv: "4.8%", rating: 4, note: "Fresca e piacevole per l'estate.", ago: "22 min" },
  { user: "Sara M.", initial: "S", beer: "Duna Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 5, note: "Corposa, cioccolatosa, vellutata.", ago: "35 min" },
  { user: "Paolo F.", initial: "P", beer: "Ambrata Piemontese", brewery: "Beerland", style: "Amber", abv: "5.4%", rating: 3, note: "Equilibrata e maltata. Facile da bere.", ago: "1h" },
];

const BREWERIES = [
  { name: "CRAK Brewery", city: "Campagna (SA)", beers: 34, latest: "Hop Skin Session IPA", img: "/__mockup/images/brewery-interior.png" },
  { name: "Del Borgo", city: "Borgorose (RI)", beers: 28, latest: "Duna Imperial Stout", img: "/__mockup/images/brewery-interior.png" },
  { name: "Revelation Cat", city: "Roma", beers: 19, latest: "Sour Mango Berliner", img: "/__mockup/images/brewery-interior.png" },
];

const TAPLISTS = [
  { pub: "Luppolino Pub", city: "Milano", updatedAgo: "5 min", taps: ["Hop Skin IPA 6.5%", "Duna Stout 8.1%", "Weizen Estate 5.0%"], open: true },
  { pub: "The Brew House", city: "Roma", updatedAgo: "18 min", taps: ["Revelation Sour 4.8%", "Nursia Extra 7.2%"], open: true },
];

const STYLES = ["IPA", "Stout", "Sour", "Lager", "Weizen", "Porter", "Saison", "Belgian"];

export function FeedDark() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0b09", color: "#ede8e1", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ background: "#0c0b09", borderBottom: "1px solid #1f1d1a", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#ede8e1", letterSpacing: "-0.02em" }}>
            fermenta<span style={{ color: "#f59e0b" }}>.to</span>
          </span>
          <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#8a7d74" }}>
            {["Birre", "Birrifici", "Pub", "Festival", "Mappa"].map(l => <a key={l} style={{ cursor: "pointer" }}>{l}</a>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "6px 14px", border: "1px solid #1f1d1a", borderRadius: R, fontSize: 13, color: "#8a7d74", background: "transparent", cursor: "pointer" }}>Accedi</button>
            <button style={{ padding: "6px 14px", borderRadius: R, fontSize: 13, fontWeight: 700, background: "#f59e0b", color: "#0c0b09", border: "none", cursor: "pointer" }}>Iscriviti</button>
          </div>
        </div>
      </div>

      {/* ── Hero search bar ── */}
      <div style={{ background: "#0c0b09", borderBottom: "1px solid #1f1d1a", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#161412", border: "1px solid #1f1d1a", borderRadius: R, padding: "0 14px", height: 42 }}>
              <Search size={15} color="#8a7d74" />
              <input placeholder="Cerca birra, birrificio o pub…" style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 13, color: "#ede8e1" }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {STYLES.map(s => (
                <button key={s} style={{ padding: "6px 12px", border: "1px solid #1f1d1a", borderRadius: R, fontSize: 12, fontWeight: 600, color: "#8a7d74", background: "#161412", cursor: "pointer", whiteSpace: "nowrap" }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#1f1d1a" }}>

        {/* ── COL 1: UTENTE — Feed assaggi ── */}
        <div style={{ background: "#0c0b09", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d74", marginBottom: 2 }}>UTENTE</p>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#ede8e1", margin: 0 }}>Cosa stanno bevendo</h2>
            </div>
            <a style={{ fontSize: 11, color: "#f59e0b", cursor: "pointer" }}>Tutto →</a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a" }}>
            {FEED.map((item, i) => (
              <div key={i} style={{ background: "#0c0b09", padding: "12px 0", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: R, background: "#161412", border: "1px solid #1f1d1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
                  {item.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, margin: "0 0 2px" }}>
                    <span style={{ fontWeight: 600, color: "#ede8e1" }}>{item.user}</span>
                    <span style={{ color: "#8a7d74" }}> · </span>
                    <span style={{ color: "#f59e0b", fontWeight: 700 }}>{item.beer}</span>
                  </p>
                  <p style={{ fontSize: 11, color: "#8a7d74", margin: "0 0 4px" }}>{item.brewery} · {item.style} · {item.abv}</p>
                  <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={10} fill={s <= item.rating ? "#f59e0b" : "none"} color={s <= item.rating ? "#f59e0b" : "#2a2420"} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "#c8bdb4", margin: 0, fontStyle: "italic" }}>"{item.note}"</p>
                </div>
                <span style={{ fontSize: 10, color: "#8a7d74", flexShrink: 0 }}>{item.ago}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── COL 2: BIRRIFICIO — Ultimi rilasci ── */}
        <div style={{ background: "#0c0b09", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d74", marginBottom: 2 }}>BIRRIFICIO</p>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#ede8e1", margin: 0 }}>Nuove uscite</h2>
            </div>
            <a style={{ fontSize: 11, color: "#f59e0b", cursor: "pointer" }}>Tutti →</a>
          </div>

          {/* Brewery cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a", marginBottom: 16 }}>
            {BREWERIES.map((b, i) => (
              <div key={i} style={{ background: "#0c0b09", padding: "12px 0", display: "flex", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, borderRadius: R, overflow: "hidden", flexShrink: 0, border: "1px solid #1f1d1a" }}>
                  <img src={b.img} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#ede8e1", margin: "0 0 2px" }}>{b.name}</p>
                  <p style={{ fontSize: 11, color: "#8a7d74", margin: "0 0 5px" }}>{b.city} · {b.beers} birre</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Zap size={10} color="#f59e0b" />
                    <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>Nuovo: {b.latest}</span>
                  </div>
                </div>
                <ChevronRight size={14} color="#8a7d74" style={{ flexShrink: 0, marginTop: 2 }} />
              </div>
            ))}
          </div>

          {/* CTA birrificio */}
          <div style={{ border: "1px solid #1f1d1a", borderRadius: R, padding: "14px 16px", background: "#161412" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Sei un birrificio?</p>
            <p style={{ fontSize: 11, color: "#8a7d74", marginBottom: 10 }}>Pubblica le tue birre, gestisci la scheda e raggiungi migliaia di appassionati.</p>
            <button style={{ width: "100%", padding: "8px 0", background: "#f59e0b", color: "#0c0b09", border: "none", borderRadius: R, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Registra il birrificio →
            </button>
          </div>
        </div>

        {/* ── COL 3: PUBLICAN — Taplist live ── */}
        <div style={{ background: "#0c0b09", padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d74", marginBottom: 2 }}>PUB</p>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#ede8e1", margin: 0 }}>Taplist aggiornate</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1f1d1a", marginBottom: 16 }}>
            {TAPLISTS.map((t, i) => (
              <div key={i} style={{ background: "#0c0b09", padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#ede8e1", margin: "0 0 2px" }}>{t.pub}</p>
                    <p style={{ fontSize: 11, color: "#8a7d74", margin: 0 }}>{t.city} · aggiornato {t.updatedAgo} fa</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", background: "#0d2e1a", color: "#34d399", borderRadius: R }}>
                    {t.open ? "Aperto" : "Chiuso"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {t.taps.map((tap, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#161412", borderRadius: R }}>
                      <Beer size={11} color="#f59e0b" />
                      <span style={{ fontSize: 12, color: "#c8bdb4" }}>{tap}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA publican */}
          <div style={{ border: "1px solid #1f1d1a", borderRadius: R, padding: "14px 16px", background: "#161412" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Sei un gestore di pub?</p>
            <p style={{ fontSize: 11, color: "#8a7d74", marginBottom: 10 }}>Aggiorna la taplist in tempo reale, gestisci eventi e attira nuovi clienti.</p>
            <button style={{ width: "100%", padding: "8px 0", background: "transparent", color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: R, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Gestisci il tuo pub →
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#1f1d1a" }}>
            {[["12.847", "Birre"], ["532", "Birrifici"], ["148", "Pub"], ["4.210", "Utenti"]].map(([n, l]) => (
              <div key={l} style={{ background: "#0c0b09", padding: "10px 0", textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>{n}</p>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
