import { ArrowLeft, Bell, Star, MapPin, Clock, Beer, Share2, Heart, Phone, Globe, ChevronRight, Navigation, Calendar, Users } from "lucide-react";

// ── Pagina pubblica Pub — dark mode ───────────────────────────
// La pagina che vede l'utente quando apre un pub dalla mappa,
// da una ricerca o da un link condiviso.
// Struttura: hero foto → taplist live (priorità) → info → eventi → recensioni
// ─────────────────────────────────────────────────────────────

const PUB = {
  name: "Luppolino Pub",
  city: "Navigli, Milano",
  address: "Via Corsico 12, 20144 Milano",
  dist: "400m",
  rating: 4.7,
  reviews: 312,
  open: true,
  closes: "01:30",
  phone: "+39 02 8375 4421",
  web: "luppolinopub.it",
  img: "/__mockup/images/pub-interior.png",
  followers: 1840,
  following: false,
  type: "Craft Beer Bar",
};

const TAPLIST = [
  { name: "Hop Skin Session IPA", brewery: "CRAK Brewery", style: "Session IPA", abv: "4.5%", ibu: 42, rating: 4.8, new: true },
  { name: "Duna Imperial Stout", brewery: "Del Borgo", style: "Imperial Stout", abv: "8.1%", ibu: 55, rating: 4.7, new: false },
  { name: "Sour Mango Berliner", brewery: "Revelation Cat", style: "Sour / Berliner", abv: "4.8%", ibu: 8, rating: 4.6, new: true },
  { name: "Nursia Extra", brewery: "Birra Nursia", style: "Belgian Tripel", abv: "7.2%", ibu: 28, rating: 4.5, new: false },
  { name: "Porter Notte Nera", brewery: "Birrificio Roma", style: "Robust Porter", abv: "6.8%", ibu: 36, rating: 4.4, new: false },
];

const EVENTS = [
  { title: "Degustazione CRAK", date: "Ven 28 Mar", time: "20:00", guests: 24 },
  { title: "Tap Takeover: Del Borgo", date: "Sab 5 Apr", time: "19:30", guests: 11 },
];

const REVIEWS = [
  { user: "Marco T.", initial: "M", rating: 5, text: "Selezione impeccabile, personale preparatissimo. Ritorno sempre.", ago: "2 giorni" },
  { user: "Sara V.", initial: "S", rating: 4, text: "Ottima Hop Skin IPA. Ambiente tranquillo per bere senza fretta.", ago: "5 giorni" },
];

export function PubPageMobile() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#080706",
      color: "#ede8e1",
      fontFamily: "'system-ui','-apple-system','Helvetica Neue',sans-serif",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── STATUS BAR ── */}
      <div style={{ padding: "10px 16px 4px", background: "#080706", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>19:15</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[3,4,5,5,5].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i > 2 ? "#ede8e1" : "#4a4540", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 11, color: "#ede8e1" }}>●●●</span>
        </div>
      </div>

      {/* ── TOPBAR ── */}
      <div style={{
        padding: "4px 14px 8px",
        background: "#080706",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ width: 34, height: 34, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color="#ede8e1" />
          </button>
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em" }}>{PUB.name}</p>
            <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{PUB.type}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={{ width: 34, height: 34, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Share2 size={15} color="#8a7d74" />
          </button>
          <button style={{ width: 34, height: 34, border: "1px solid #2a2420", borderRadius: 6, background: "#161412", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell size={15} color="#8a7d74" />
          </button>
        </div>
      </div>

      {/* ── HERO FOTO ── */}
      <div style={{ position: "relative", height: 200, overflow: "hidden", flexShrink: 0 }}>
        <img src={PUB.img} alt={PUB.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.7)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,7,6,0.95) 0%, rgba(8,7,6,0.2) 55%)" }} />
        {/* Info overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: "#ede8e1", margin: "0 0 5px", lineHeight: 1 }}>
            {PUB.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>{PUB.rating}</span>
              <span style={{ fontSize: 11, color: "#8a7d74" }}>({PUB.reviews})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} color="#8a7d74" />
              <span style={{ fontSize: 11, color: "#c8bdb4" }}>{PUB.city} · {PUB.dist}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: PUB.open ? "#34d399" : "#f87171" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: PUB.open ? "#34d399" : "#f87171" }}>
                {PUB.open ? `Aperto · chiude ${PUB.closes}` : "Chiuso"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA STRIP ── */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, background: "#0f0d0a", borderBottom: "1px solid #1f1d1a", flexShrink: 0 }}>
        <button style={{
          flex: 1, padding: "10px 0", background: "#f59e0b", color: "#080706",
          border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Navigation size={13} /> Indicazioni
        </button>
        <button style={{
          flex: 1, padding: "10px 0",
          background: PUB.following ? "#1a3020" : "#161412",
          color: PUB.following ? "#34d399" : "#ede8e1",
          border: `1px solid ${PUB.following ? "#2a5030" : "#2a2420"}`,
          borderRadius: 6, fontSize: 12, fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Heart size={13} fill={PUB.following ? "#34d399" : "none"} /> Segui
        </button>
        <button style={{
          width: 42, padding: "10px 0", background: "#161412",
          color: "#ede8e1", border: "1px solid #2a2420",
          borderRadius: 6, fontSize: 12, fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Phone size={13} />
        </button>
      </div>

      {/* ════ IN SPINA ADESSO — sezione principale ════ */}
      <div style={{ background: "#080706" }}>
        <div style={{ padding: "14px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 2px" }}>
              <span style={{ color: "#34d399" }}>●</span> LIVE
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#ede8e1", margin: 0 }}>
              In spina adesso
            </h2>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{TAPLIST.length} spine</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#1a1612" }}>
          {TAPLIST.map((tap, i) => (
            <div key={i} style={{
              background: "#080706", padding: "11px 16px",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}>
              {/* Numero spina */}
              <div style={{
                width: 28, height: 28, borderRadius: 4,
                background: "#1a1612", border: "1px solid #2a2420",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900, color: "#8a7d74", flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#ede8e1", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {tap.name}
                  </p>
                  {tap.new && (
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", background: "#f59e0b", color: "#080706", borderRadius: 3 }}>NEW</span>
                  )}
                </div>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{tap.brewery} · {tap.style}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", margin: "0 0 2px" }}>★ {tap.rating}</p>
                <p style={{ fontSize: 10, color: "#8a7d74", margin: 0 }}>{tap.abv} · {tap.ibu} IBU</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INFO ── */}
      <div style={{ background: "#0f0d0a", borderTop: "1px solid #1f1d1a", padding: "14px 16px" }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: "0 0 10px" }}>INFORMAZIONI</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: MapPin, text: PUB.address },
            { icon: Clock, text: `Aperto oggi · chiude alle ${PUB.closes}` },
            { icon: Globe, text: PUB.web },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon size={14} color="#8a7d74" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#c8bdb4" }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, padding: "9px 12px", background: "#161412", border: "1px solid #2a2420", borderRadius: 6 }}>
          <Users size={13} color="#8a7d74" />
          <span style={{ fontSize: 12, color: "#8a7d74" }}>
            <span style={{ fontWeight: 800, color: "#ede8e1" }}>{PUB.followers.toLocaleString("it-IT")}</span> follower su Fermenta.to
          </span>
        </div>
      </div>

      {/* ── EVENTI ── */}
      <div style={{ background: "#080706", borderTop: "1px solid #1f1d1a", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>EVENTI IN PROGRAMMA</p>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>Tutti →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EVENTS.map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 12px", background: "#0f0d0a", border: "1px solid #2a2420", borderRadius: 6, cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a1612", border: "1px solid #2a2420", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={14} color="#f59e0b" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#ede8e1", margin: "0 0 2px", letterSpacing: "-0.02em" }}>{ev.title}</p>
                <p style={{ fontSize: 11, color: "#8a7d74", margin: 0 }}>{ev.date} · {ev.time} · {ev.guests} iscritti</p>
              </div>
              <ChevronRight size={14} color="#8a7d74" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENSIONI ── */}
      <div style={{ background: "#0f0d0a", borderTop: "1px solid #1f1d1a", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7d74", margin: 0 }}>RECENSIONI</p>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>Tutte →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#2a2420" }}>
          {REVIEWS.map((r, i) => (
            <div key={i} style={{ background: "#0f0d0a", padding: "11px 0", display: "flex", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: "#1a1612", border: "1px solid #2a2420", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#f59e0b", flexShrink: 0 }}>
                {r.initial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ede8e1" }}>{r.user}</span>
                  <span style={{ fontSize: 10, color: "#8a7d74" }}>{r.ago}</span>
                </div>
                <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={10} fill={s <= r.rating ? "#f59e0b" : "none"} color={s <= r.rating ? "#f59e0b" : "#2a2420"} />
                  ))}
                </div>
                <p style={{ fontSize: 12, fontStyle: "italic", color: "#c8bdb4", margin: 0, lineHeight: 1.4 }}>"{r.text}"</p>
              </div>
            </div>
          ))}
        </div>
        <button style={{ width: "100%", marginTop: 10, padding: "11px 0", background: "transparent", border: "1px solid #2a2420", borderRadius: 6, fontSize: 12, fontWeight: 800, color: "#8a7d74", cursor: "pointer" }}>
          Scrivi una recensione
        </button>
      </div>

      <div style={{ height: 72 }} />

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(8,7,6,0.96)", backdropFilter: "blur(16px)",
        borderTop: "1px solid #1f1d1a",
        padding: "10px 0 16px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[
            { label: "Home" },
            { label: "Mappa", active: true },
            { label: "Birre" },
            { label: "Pub" },
            { label: "Profilo" },
          ].map(({ label, active }) => (
            <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", minWidth: 48, padding: "2px 0" }}>
              <Beer size={20} color={active ? "#f59e0b" : "#3a3530"} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? "#f59e0b" : "#3a3530", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
