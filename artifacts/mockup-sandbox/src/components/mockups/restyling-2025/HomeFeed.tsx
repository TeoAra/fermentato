import { Search, MapPin, Bell, SlidersHorizontal, ChevronRight, TrendingUp } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const STYLES = ["Tutte", "IPA", "Stout", "Saison", "Lager", "Sour", "Wit"];

const LIVE_BEERS = [
  {
    name: "Tipopils",
    brewery: "Birrificio Italiano",
    pub: "Lambiczoon",
    dist: "0.3 km",
    style: "Pilsner",
    abv: "5.2%",
    price: "€5.00",
    updated: "12 min fa",
    hue: ["#e9c46a", "#c49a2a"],
  },
  {
    name: "ReAle Extra",
    brewery: "Birra del Borgo",
    pub: "Hop Skin",
    dist: "0.9 km",
    style: "IPA",
    abv: "6.4%",
    price: "€6.00",
    updated: "28 min fa",
    hue: ["#d4763e", "#a04e22"],
  },
  {
    name: "Nora",
    brewery: "Baladin",
    pub: "Baladin Milano",
    dist: "1.4 km",
    style: "Ale speziata",
    abv: "6.8%",
    price: "€6.50",
    updated: "5 min fa",
    hue: ["#c17f59", "#8b4e2a"],
  },
  {
    name: "Verdi Imperial Stout",
    brewery: "Toccalmatto",
    pub: "Lambiczoon",
    dist: "0.3 km",
    style: "Stout",
    abv: "8.5%",
    price: "€7.50",
    updated: "3 min fa",
    hue: ["#5c3d28", "#2a1e12"],
  },
];

const PUBS = [
  { name: "Lambiczoon", area: "Porta Venezia", taps: 14, open: true, dist: "0.3 km" },
  { name: "Hop Skin", area: "Navigli", taps: 8, open: true, dist: "0.9 km" },
  { name: "Baladin Milano", area: "Brera", taps: 18, open: true, dist: "1.4 km" },
  { name: "Birrocefalo", area: "Isola", taps: 10, open: false, dist: "2.1 km" },
];

export function HomeFeed() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 390,
        minHeight: 844,
        background: "#0d0805",
        fontFamily: "'Poppins', sans-serif",
        color: "#f5ede0",
      }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 62 }}>
        {/* ── Top Bar ── */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 h-[56px]"
          style={{ background: "rgba(13,8,5,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[22px] font-black tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Fermenta.to
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <Bell className="w-[17px] h-[17px]" style={{ color: "#a89070" }} strokeWidth={1.8} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#f77104" }}
              />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg, #d4a96a, #a06a2a)", color: "#fff" }}
            >
              MR
            </div>
          </div>
        </div>

        {/* ── Location + Stats ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: "#f77104" }} />
            <span className="text-[13px] font-medium" style={{ color: "#f5ede0" }}>Milano</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#5a4432" }} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-[12px] font-semibold" style={{ color: "#22c55e" }}>
              14 locali live
            </span>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-5 pb-4">
          <div
            className="flex items-center gap-3 h-[50px] rounded-2xl px-4"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#5a4432" }} strokeWidth={2} />
            <span className="text-[14px] flex-1" style={{ color: "#5a4432" }}>
              Cerca birra, pub, birrificio…
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(247,113,4,0.15)" }}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: "#f77104" }} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* ── Style Filter Chips ── */}
        <div
          className="flex gap-2 px-5 pb-5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {STYLES.map((s, i) => (
            <button
              key={s}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={
                i === 0
                  ? { background: "#f77104", color: "#fff" }
                  : { background: "rgba(255,255,255,0.07)", color: "#a89070", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── In Spina Adesso ── */}
        <div className="px-5 mb-1">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-[18px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              In spina adesso
            </h2>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#22c55e" }}>
                aggiornato live
              </span>
            </div>
          </div>
        </div>

        {/* ── Beer Cards ── */}
        <div className="px-5 flex flex-col gap-3 mb-6">
          {LIVE_BEERS.map((beer) => (
            <div
              key={beer.name}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#1e1510",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 0 transparent`,
              }}
            >
              {/* Beer color band */}
              <div
                className="h-[3px]"
                style={{ background: `linear-gradient(90deg, ${beer.hue[0]}, ${beer.hue[1]})` }}
              />
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                {/* Beer circle icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${beer.hue[0]}55, ${beer.hue[1]}33)`,
                    border: `1.5px solid ${beer.hue[0]}44`,
                    boxShadow: `0 0 16px ${beer.hue[0]}22`,
                  }}
                >
                  <span className="text-xl">🍺</span>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="text-[16px] font-bold leading-tight"
                      style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
                    >
                      {beer.name}
                    </h3>
                    <span
                      className="text-[14px] font-bold flex-shrink-0"
                      style={{ fontFamily: "'Fraunces', serif", color: beer.hue[0] }}
                    >
                      {beer.price}
                    </span>
                  </div>
                  {/* Brewery */}
                  <p className="text-[11px] mt-0.5" style={{ color: "#a89070" }}>
                    {beer.brewery}
                  </p>
                  {/* Style + ABV chips */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${beer.hue[0]}22`, color: beer.hue[0] }}
                    >
                      {beer.style}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#a89070" }}
                    >
                      {beer.abv}
                    </span>
                  </div>
                </div>
              </div>
              {/* Bottom info bar */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: "#f5ede0" }}>
                    🍻 {beer.pub}
                  </span>
                  <span className="text-[11px]" style={{ color: "#5a4432" }}>·</span>
                  <span className="text-[11px] font-bold" style={{ color: "#22d3ee" }}>
                    📍 {beer.dist}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#a89070" }}>
                    {beer.updated}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pub vicini ── */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[18px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Pub vicini
            </h2>
            <button className="text-[12px] font-semibold" style={{ color: "#f77104" }}>
              Mappa →
            </button>
          </div>
          <div
            className="flex gap-3 px-5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {PUBS.map((pub) => (
              <div
                key={pub.name}
                className="flex-shrink-0 w-[160px] rounded-2xl p-3.5"
                style={{
                  background: "#1e1510",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: "#2a1e12" }}
                  >
                    🍻
                  </div>
                  {pub.open ? (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
                  ) : (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                  )}
                </div>
                <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "#f5ede0" }}>
                  {pub.name}
                </p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "#5a4432" }}>{pub.area}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
                  >
                    {pub.taps} 🍺
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: "#22d3ee" }}>
                    {pub.dist}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sei un pub? CTA ── */}
        <div className="mx-5 mb-6 rounded-2xl overflow-hidden">
          <div
            className="p-5"
            style={{
              background: "linear-gradient(135deg, #1e1510 0%, #2a1e12 100%)",
              border: "1px solid rgba(247,113,4,0.2)",
              boxShadow: "0 0 32px rgba(247,113,4,0.08)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#f77104" }}
                >
                  Per i pub
                </p>
                <h3
                  className="text-[17px] font-bold leading-tight mb-2"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
                >
                  Fatti trovare dai tuoi clienti
                </h3>
                <p className="text-[12px] leading-relaxed mb-3" style={{ color: "#a89070" }}>
                  Aggiorna la taplist in 30 secondi. Clienti nelle vicinanze ti trovano subito.
                </p>
                <button
                  className="text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
                  style={{ background: "#f77104", color: "#fff" }}
                >
                  Registra il tuo pub →
                </button>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ background: "rgba(247,113,4,0.15)" }}
              >
                🏠
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav active="home" theme="dark" />
    </div>
  );
}
