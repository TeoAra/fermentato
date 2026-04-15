import { Search, MapPin, Star, Beer, ScanLine, Clock, TrendingUp, Heart, Navigation } from "lucide-react";

// ── DESIGN SYSTEM ── Fermenta.to v2 — Dark Premium

const tokens = {
  bg: "#0d0805",
  surface: "#161009",
  card: "#1e1510",
  cardElevated: "#231812",
  orange: "#f77104",
  amber: "#d4a96a",
  text: "#f5ede0",
  textSec: "#a89070",
  textDim: "#5a4432",
  border: "rgba(255,255,255,0.06)",
  green: "#22c55e",
  cyan: "#22d3ee",
};

const beerStyles = [
  { style: "Pilsner", hue: "#e9c46a" },
  { style: "IPA", hue: "#d4763e" },
  { style: "Stout", hue: "#5c3d28" },
  { style: "Saison", hue: "#e6c35c" },
  { style: "Sour", hue: "#a3e635" },
  { style: "Porter", hue: "#c17f59" },
];

export function DesignSystem() {
  return (
    <div
      className="overflow-y-auto p-6 flex flex-col gap-8"
      style={{
        background: tokens.bg,
        fontFamily: "'Poppins', sans-serif",
        color: tokens.text,
        minHeight: "100vh",
      }}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: tokens.orange }}>
          Fermenta.to
        </p>
        <h1
          className="text-[24px] font-black"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: tokens.text }}
        >
          Design System v2
        </h1>
        <p className="text-[12px] mt-1" style={{ color: tokens.textDim }}>Dark Premium · Craft Beer Discovery</p>
      </div>

      {/* ── Color Tokens ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Color Tokens
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: "Background", hex: tokens.bg },
            { name: "Surface", hex: tokens.surface },
            { name: "Card", hex: tokens.card },
            { name: "Orange", hex: tokens.orange },
            { name: "Amber", hex: tokens.amber },
            { name: "Text", hex: tokens.text },
            { name: "Text Sec", hex: tokens.textSec },
            { name: "Green", hex: tokens.green },
          ].map((c) => (
            <div key={c.name}>
              <div
                className="w-full h-10 rounded-xl mb-1.5"
                style={{ background: c.hex, border: "1px solid rgba(255,255,255,0.07)" }}
              />
              <p className="text-[9px] font-medium" style={{ color: tokens.textDim }}>{c.name}</p>
              <p className="text-[9px]" style={{ color: tokens.textDim }}>{c.hex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Beer Style Colors ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Beer Style Colors
        </p>
        <div className="flex gap-2 flex-wrap">
          {beerStyles.map((s) => (
            <div key={s.style} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${s.hue}88, ${s.hue}33)`,
                  border: `2px solid ${s.hue}44`,
                  boxShadow: `0 0 12px ${s.hue}22`,
                }}
              />
              <span className="text-[9px]" style={{ color: tokens.textDim }}>{s.style}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Typography
        </p>
        <div className="flex flex-col gap-2">
          <p className="text-[28px] font-black leading-tight" style={{ fontFamily: "'Fraunces', serif", color: tokens.text }}>
            Display 28px Fraunces
          </p>
          <p className="text-[20px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: tokens.text }}>
            Heading 20px Fraunces
          </p>
          <p className="text-[16px] font-bold" style={{ color: tokens.text }}>Body Bold 16px Poppins</p>
          <p className="text-[14px] font-medium" style={{ color: tokens.textSec }}>Body 14px Poppins</p>
          <p className="text-[11px] font-medium" style={{ color: tokens.textDim }}>Caption 11px Poppins</p>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tokens.textDim }}>
            Label 9px Poppins
          </p>
        </div>
      </section>

      {/* ── Buttons ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Buttons
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            className="w-full h-[48px] rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #f77104, #d45f03)", color: "#fff", boxShadow: "0 4px 20px rgba(247,113,4,0.3)" }}
          >
            <Beer className="w-4 h-4" />
            Primary CTA
          </button>
          <button
            className="w-full h-[44px] rounded-2xl text-[13px] font-semibold flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", color: tokens.textSec, border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Secondary
          </button>
          <div className="flex gap-2">
            <button
              className="flex-1 h-[40px] rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(34,197,94,0.15)", color: tokens.green, border: `1px solid ${tokens.green}30` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: tokens.green }} />
              Aperto
            </button>
            <button
              className="flex-1 h-[40px] rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Chiuso
            </button>
          </div>
        </div>
      </section>

      {/* ── Search Bar ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Search Bar
        </p>
        <div
          className="flex items-center gap-3 h-[50px] rounded-2xl px-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: tokens.textDim }} strokeWidth={2} />
          <span className="text-[14px] flex-1" style={{ color: tokens.textDim }}>
            Cerca birra, pub, birrificio…
          </span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(247,113,4,0.15)" }}
          >
            <ScanLine className="w-4 h-4" style={{ color: tokens.orange }} strokeWidth={2} />
          </div>
        </div>
      </section>

      {/* ── Chips ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Filter Chips
        </p>
        <div className="flex flex-wrap gap-2">
          {["Tutte", "IPA", "Stout", "Saison", "Lager", "Sour"].map((c, i) => (
            <button
              key={c}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold"
              style={
                i === 0
                  ? { background: tokens.orange, color: "#fff" }
                  : { background: "rgba(255,255,255,0.06)", color: tokens.textSec, border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* ── Beer Card ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Beer Card
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: tokens.card, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #d4763e, #a04e22)" }} />
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "radial-gradient(circle at 35% 35%, #d4763e55, #d4763e22)",
                border: "1.5px solid #d4763e44",
                boxShadow: "0 0 16px #d4763e22",
              }}
            >
              <span className="text-xl">🍺</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: tokens.text }}>
                  ReAle Extra
                </h3>
                <span className="text-[14px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: "#d4763e" }}>
                  €6.00
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: tokens.textSec }}>Birra del Borgo</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#d4763e22", color: "#d4763e" }}>IPA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: tokens.textSec }}>6.4%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color: tokens.text }}>🍻 Hop Skin</span>
              <span className="text-[11px] font-bold" style={{ color: tokens.cyan }}>📍 0.9 km</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.green }} />
              <span className="text-[10px]" style={{ color: tokens.textSec }}>28 min fa</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pub Card ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Pub Card
        </p>
        <div
          className="rounded-2xl p-4"
          style={{ background: tokens.card, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "#2a1e12" }}
            >
              🍻
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold" style={{ color: tokens.text }}>Lambiczoon</p>
                <span className="w-2 h-2 rounded-full" style={{ background: tokens.green }} />
              </div>
              <p className="text-[11px]" style={{ color: tokens.textDim }}>Porta Venezia</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,211,238,0.1)", color: tokens.cyan }}>14 🍺</span>
              <span className="text-[11px] font-bold" style={{ color: tokens.cyan }}>0.3 km</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" style={{ color: tokens.amber }} fill={tokens.amber} />
              <span className="text-[12px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: tokens.text }}>4.6</span>
            </div>
            <button
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(247,113,4,0.15)", color: tokens.orange }}
            >
              <Navigation className="w-3 h-3" />
              Vai
            </button>
          </div>
        </div>
      </section>

      {/* ── Freshness Badge ── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Freshness Badges
        </p>
        <div className="flex flex-col gap-2">
          {[
            { label: "5 min fa", color: tokens.green, alpha: "0.15" },
            { label: "45 min fa", color: tokens.amber, alpha: "0.12" },
            { label: "3 ore fa", color: tokens.textDim, alpha: "0.1" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: `rgba(${b.color === tokens.green ? "34,197,94" : b.color === tokens.amber ? "212,169,106" : "90,68,50"},${b.alpha})`, border: `1px solid ${b.color}30` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.color }} />
                <Clock className="w-3 h-3" style={{ color: b.color }} />
                <span className="text-[11px] font-semibold" style={{ color: b.color }}>
                  aggiornato {b.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Map Overlay Card ── */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: tokens.textDim }}>
          Map Overlay Card
        </p>
        <div className="relative h-[140px] rounded-2xl overflow-hidden">
          {/* Fake map bg */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a1207 0%, #0d0805 100%)" }}
          >
            <div className="grid grid-cols-6 grid-rows-4 gap-4 opacity-20 w-full h-full p-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="rounded" style={{ background: "#2a1e12" }} />
              ))}
            </div>
          </div>
          {/* Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 rounded-full" style={{ background: tokens.orange, boxShadow: `0 0 0 6px ${tokens.orange}33` }} />
          </div>
          {/* Overlay card */}
          <div
            className="absolute bottom-3 left-3 right-3 rounded-xl p-3 flex items-center gap-3"
            style={{ background: "rgba(13,8,5,0.9)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-xl">🍻</span>
            <div className="flex-1">
              <p className="text-[12px] font-bold" style={{ color: tokens.text }}>Lambiczoon</p>
              <p className="text-[10px]" style={{ color: tokens.textDim }}>14 spine · 0.3 km</p>
            </div>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tokens.green }} />
          </div>
        </div>
      </section>
    </div>
  );
}
