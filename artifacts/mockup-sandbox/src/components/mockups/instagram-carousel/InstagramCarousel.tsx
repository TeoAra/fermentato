import { useState } from "react";

const slides = [
  {
    id: 1,
    bg: "linear-gradient(145deg, #1a1008 0%, #2d1a06 50%, #1a1008 100%)",
    type: "cover",
  },
  {
    id: 2,
    category: "UTENTE",
    categoryColor: "#f59e0b",
    bg: "#faf8f4",
    dark: false,
    icon: "🗺️",
    title: "Esplora la mappa",
    subtitle: "Trova i migliori pub e birrifici vicino a te",
    features: [
      { icon: "📍", text: "Ricerca per città, quartiere o posizione attuale" },
      { icon: "🍺", text: "Filtri per stile di birra e tipologia di locale" },
      { icon: "⭐", text: "Preferiti salvati e valutazioni della community" },
      { icon: "🕐", text: "Orari apertura in tempo reale con badge aperto/chiuso" },
    ],
  },
  {
    id: 3,
    category: "UTENTE",
    categoryColor: "#f59e0b",
    bg: "#faf8f4",
    dark: false,
    icon: "🍺",
    title: "Scopri nuove birre",
    subtitle: "Un database di migliaia di birre italiane e internazionali",
    features: [
      { icon: "🔍", text: "Cerca per stile, nome, birrificio o gradazione" },
      { icon: "📊", text: "Schede con ABV, IBU, colore, note di degustazione" },
      { icon: "🏆", text: "Le birre più amate dalla community italiana" },
      { icon: "🔗", text: "Link diretto al birrificio produttore" },
    ],
  },
  {
    id: 4,
    category: "UTENTE",
    categoryColor: "#f59e0b",
    bg: "#faf8f4",
    dark: false,
    icon: "📋",
    title: "Taplist live",
    subtitle: "Vedi in tempo reale cosa spillano i tuoi pub preferiti",
    features: [
      { icon: "⚡", text: "Aggiornamenti istantanei quando cambia la spillatura" },
      { icon: "❤️", text: "Salva le birre che ami per ritrovarle subito" },
      { icon: "🔔", text: "Segui i pub e ricevi aggiornamenti sulla taplist" },
      { icon: "🎯", text: "Scopri pub che hanno spillata la birra che cerchi" },
    ],
  },
  {
    id: 5,
    category: "PUB",
    categoryColor: "#fb923c",
    bg: "linear-gradient(145deg, #0f1a2e 0%, #1a2d4a 100%)",
    dark: true,
    icon: "🖥️",
    title: "Dashboard completa",
    subtitle: "Gestisci il tuo locale in pochi click",
    features: [
      { icon: "🍺", text: "Aggiorna la taplist in tempo reale, birra per birra" },
      { icon: "📸", text: "Foto, descrizioni e prezzi per ogni birra spillata" },
      { icon: "📊", text: "Statistiche visite, visualizzazioni e preferiti" },
      { icon: "👤", text: "Profilo pub completo con galleria e contatti" },
    ],
  },
  {
    id: 6,
    category: "PUB",
    categoryColor: "#fb923c",
    bg: "linear-gradient(145deg, #0f1a2e 0%, #1a2d4a 100%)",
    dark: true,
    icon: "⏰",
    title: "Orari sempre aggiornati",
    subtitle: "Gli utenti sanno sempre quando sei aperto",
    features: [
      { icon: "📅", text: "Orari settimanali per ogni giorno della settimana" },
      { icon: "🎄", text: "Giorni speciali: Natale, Ferragosto, chiusure ferie" },
      { icon: "⚡", text: "Badge aperto/chiuso aggiornato in automatico" },
      { icon: "📢", text: "Chiusure straordinarie visibili subito agli utenti" },
    ],
  },
  {
    id: 7,
    category: "PUB",
    categoryColor: "#fb923c",
    bg: "linear-gradient(145deg, #0f1a2e 0%, #1a2d4a 100%)",
    dark: true,
    icon: "🎉",
    title: "Promuovi i tuoi eventi",
    subtitle: "Porta nuovi clienti al tuo locale",
    features: [
      { icon: "🎪", text: "Crea eventi: serate a tema, degustazioni, quiz birra" },
      { icon: "📣", text: "Visibilità automatica a tutta la community locale" },
      { icon: "🎫", text: "Gestione presenze e numero partecipanti" },
      { icon: "📱", text: "Gli utenti salvano l'evento e ricevono reminder" },
    ],
  },
  {
    id: 8,
    category: "BIRRIFICIO",
    categoryColor: "#d97706",
    bg: "linear-gradient(145deg, #1c0f02 0%, #2d1a06 60%, #1c0f02 100%)",
    dark: true,
    icon: "🏭",
    title: "Il tuo birrificio online",
    subtitle: "Racconta la tua storia, fai conoscere le tue birre",
    features: [
      { icon: "📖", text: "Profilo con storia, filosofia e team del birrificio" },
      { icon: "🍺", text: "Catalogo completo con schede dettagliate per ogni birra" },
      { icon: "🗺️", text: "Mappa dei pub che spillano le tue birre" },
      { icon: "📷", text: "Galleria foto e logo professionale del brand" },
    ],
  },
  {
    id: 9,
    category: "FESTIVAL",
    categoryColor: "#22c55e",
    bg: "linear-gradient(145deg, #0a1f0a 0%, #132613 60%, #0a1f0a 100%)",
    dark: true,
    icon: "🎪",
    title: "Crea il tuo festival",
    subtitle: "La piattaforma perfetta per i grandi eventi birra",
    features: [
      { icon: "🏆", text: "Pagina dedicata con lineup birrifici e birre presenti" },
      { icon: "🎫", text: "Integrazione biglietti e gestione accessi" },
      { icon: "📍", text: "Mappa interattiva degli stand e dei birrifici partecipanti" },
      { icon: "📢", text: "Promozione automatica agli appassionati della zona" },
    ],
  },
  {
    id: 10,
    type: "cta",
    bg: "linear-gradient(145deg, #1a1008 0%, #2d1a06 50%, #1a1008 100%)",
  },
];

function CoverSlide() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(145deg, #1a1008 0%, #2d1a06 50%, #1a1008 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(251,146,60,0.1) 0%, transparent 50%)",
      }} />
      <div style={{ position: "relative", textAlign: "center", padding: "0 48px" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🍺</div>
        <div style={{
          fontSize: 64, fontWeight: 900, letterSpacing: "-2px",
          background: "linear-gradient(135deg, #fbbf24, #f97316, #fbbf24)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          lineHeight: 1, marginBottom: 12,
        }}>Fermenta.to</div>
        <div style={{
          fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.5px", marginBottom: 8,
        }}>La community italiana della birra artigianale</div>
        <div style={{
          width: 64, height: 3, background: "linear-gradient(90deg, #f59e0b, #fb923c)",
          borderRadius: 99, margin: "20px auto 24px",
        }} />
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", letterSpacing: "3px", textTransform: "uppercase" }}>
          Scopri tutte le funzioni →
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: "linear-gradient(90deg, #f59e0b, #fb923c, #f59e0b)",
      }} />
    </div>
  );
}

function CtaSlide() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(145deg, #1a1008 0%, #2d1a06 50%, #1a1008 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.18) 0%, transparent 65%)",
      }} />
      <div style={{ position: "relative", textAlign: "center", padding: "0 56px" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🍻</div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: "white",
          lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.5px",
        }}>Unisciti alla community</div>
        <div style={{ fontSize: 18, color: "rgba(255,255,255,0.65)", marginBottom: 36, lineHeight: 1.6 }}>
          Pub, birrifici e appassionati insieme sulla piattaforma italiana della birra artigianale
        </div>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #f59e0b, #fb923c)",
          borderRadius: 16, padding: "16px 40px",
          fontSize: 20, fontWeight: 800, color: "white",
          letterSpacing: "0.3px",
        }}>
          fermenta.to
        </div>
        <div style={{ marginTop: 32, display: "flex", gap: 24, justifyContent: "center" }}>
          {["Gratis per gli utenti", "Per pub e birrifici", "Festival & eventi"].map(t => (
            <div key={t} style={{
              fontSize: 12, color: "rgba(255,255,255,0.45)",
              borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12,
            }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentSlide({ slide }: { slide: any }) {
  const isDark = slide.dark;
  const textPrimary = isDark ? "rgba(255,255,255,0.95)" : "#1c1107";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "#6b5c42";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{
      width: "100%", height: "100%",
      background: slide.bg,
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "40px 44px",
      boxSizing: "border-box",
    }}>
      {isDark && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.08) 0%, transparent 50%)",
        }} />
      )}

      {/* Top: category pill + slide number */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, position: "relative" }}>
        <div style={{
          background: slide.categoryColor,
          borderRadius: 99, padding: "6px 18px",
          fontSize: 12, fontWeight: 800, color: "white",
          letterSpacing: "2px", textTransform: "uppercase",
        }}>
          {slide.category}
        </div>
        <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)", fontWeight: 600 }}>
          {slide.id} / 10
        </div>
      </div>

      {/* Hero icon */}
      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 16, position: "relative" }}>
        {slide.icon}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 36, fontWeight: 900, color: textPrimary,
        lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 10, position: "relative",
      }}>
        {slide.title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 16, color: slide.categoryColor, fontWeight: 600,
        marginBottom: 28, lineHeight: 1.4, position: "relative",
      }}>
        {slide.subtitle}
      </div>

      {/* Divider */}
      <div style={{
        width: 48, height: 3,
        background: slide.categoryColor,
        borderRadius: 99, marginBottom: 28, position: "relative",
      }} />

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, position: "relative" }}>
        {slide.features.map((f: any, i: number) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14, padding: "12px 16px",
          }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
            <span style={{ fontSize: 15, color: textPrimary, fontWeight: 500, lineHeight: 1.45 }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 24, paddingTop: 16,
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
        position: "relative",
      }}>
        <div style={{
          fontSize: 18, fontWeight: 800,
          background: "linear-gradient(135deg, #f59e0b, #fb923c)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          🍺 Fermenta.to
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {slides.filter(s => s.id > 1 && s.id < 10).map(s => (
            <div key={s.id} style={{
              width: s.id === slide.id ? 20 : 6,
              height: 6, borderRadius: 99,
              background: s.id === slide.id ? slide.categoryColor : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
              transition: "width 0.3s",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InstagramCarousel() {
  const [current, setCurrent] = useState(0);

  const goNext = () => setCurrent(i => Math.min(i + 1, slides.length - 1));
  const goPrev = () => setCurrent(i => Math.max(i - 1, 0));

  const slide = slides[current];

  return (
    <div style={{
      minHeight: "100vh", background: "#111",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "system-ui, sans-serif",
    }}>
      {/* Slide label */}
      <div style={{ marginBottom: 16, color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: "1px" }}>
        SLIDE {current + 1} di {slides.length}
        {slide.id > 1 && slide.id < 10 && ` — ${(slide as any).category}`}
        {slide.id === 1 && " — COVER"}
        {slide.id === 10 && " — CALL TO ACTION"}
      </div>

      {/* Slide container — 1:1 */}
      <div style={{
        width: 540, height: 540,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        position: "relative",
        flexShrink: 0,
      }}>
        {slide.id === 1 && <CoverSlide />}
        {slide.id === 10 && <CtaSlide />}
        {slide.id > 1 && slide.id < 10 && <ContentSlide slide={slide} />}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 24 }}>
        <button
          onClick={goPrev}
          disabled={current === 0}
          style={{
            background: current === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
            border: "none", borderRadius: 99, width: 44, height: 44,
            color: current === 0 ? "rgba(255,255,255,0.2)" : "white",
            fontSize: 20, cursor: current === 0 ? "default" : "pointer",
          }}
        >←</button>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 7, height: 7, borderRadius: 99,
                background: i === current ? "#f59e0b" : "rgba(255,255,255,0.25)",
                cursor: "pointer", transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={current === slides.length - 1}
          style={{
            background: current === slides.length - 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
            border: "none", borderRadius: 99, width: 44, height: 44,
            color: current === slides.length - 1 ? "rgba(255,255,255,0.2)" : "white",
            fontSize: 20, cursor: current === slides.length - 1 ? "default" : "pointer",
          }}
        >→</button>
      </div>

      {/* Thumbnail strip */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
        {slides.map((s, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: 52, height: 52, borderRadius: 8, overflow: "hidden",
              border: i === current ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)",
              cursor: "pointer", flexShrink: 0,
              background: (s as any).bg?.includes("gradient") ? (s as any).bg : (s as any).bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}
          >
            {s.id === 1 ? "🍺" : s.id === 10 ? "🍻" : (s as any).icon}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center" }}>
        Usa le frecce o clicca i thumbnail per navigare • Le slide sono 1:1 (formato Instagram)
      </div>
    </div>
  );
}
