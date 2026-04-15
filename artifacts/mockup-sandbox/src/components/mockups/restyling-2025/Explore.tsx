import { Search, SlidersHorizontal, Star, Beer, MapPin, TrendingUp, ChevronRight } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const STYLES = [
  { name: "IPA", emoji: "🍊", count: "3.2k", hue: "#d4763e", bg: "rgba(212,118,62,0.12)" },
  { name: "Stout", emoji: "🌑", count: "1.8k", hue: "#a89070", bg: "rgba(42,30,18,0.8)" },
  { name: "Saison", emoji: "🌾", count: "980", hue: "#e9c46a", bg: "rgba(233,196,106,0.1)" },
  { name: "Lager", emoji: "🍺", count: "2.4k", hue: "#22d3ee", bg: "rgba(34,211,238,0.08)" },
  { name: "Sour", emoji: "🍋", count: "760", hue: "#a3e635", bg: "rgba(163,230,53,0.1)" },
  { name: "Porter", emoji: "☕", count: "920", hue: "#c17f59", bg: "rgba(193,127,89,0.12)" },
  { name: "Wit", emoji: "🌿", count: "680", hue: "#86efac", bg: "rgba(134,239,172,0.08)" },
  { name: "Barleywine", emoji: "🔥", count: "340", hue: "#fb7185", bg: "rgba(251,113,133,0.1)" },
];

const TRENDING = [
  { name: "Tipopils", brewery: "Birrificio Italiano", style: "Pilsner", rating: 4.5, hue: "#e9c46a" },
  { name: "Isaac", brewery: "Baladin", style: "Witbier", rating: 4.3, hue: "#86efac" },
  { name: "ReAle Extra", brewery: "Birra del Borgo", style: "IPA", rating: 4.4, hue: "#d4763e" },
  { name: "Verdi Imperial", brewery: "Toccalmatto", style: "Stout", rating: 4.6, hue: "#5c3d28" },
];

const BREWERIES = [
  { name: "Birrificio Italiano", city: "Lurago Marinone", beers: 24, flag: "🇮🇹" },
  { name: "Baladin", city: "Piozzo (CN)", beers: 32, flag: "🇮🇹" },
  { name: "Birra del Borgo", city: "Borgorose (RI)", beers: 18, flag: "🇮🇹" },
];

export function Explore() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: 390, minHeight: 844, background: "#0d0805", fontFamily: "'Poppins', sans-serif", color: "#f5ede0" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 62 }}>

        {/* ── Top Bar ── */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 h-[56px]"
          style={{ background: "rgba(13,8,5,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <h1
            className="text-[20px] font-bold"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
          >
            Esplora
          </h1>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: "#a89070" }} strokeWidth={2} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pt-4 pb-1">
          <div
            className="flex items-center gap-3 h-[50px] rounded-2xl px-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#5a4432" }} strokeWidth={2} />
            <span className="text-[14px] flex-1" style={{ color: "#5a4432" }}>
              Cerca birra, pub, birrificio…
            </span>
          </div>
        </div>

        {/* ── Scope Tabs ── */}
        <div className="flex gap-2 px-5 mt-3 mb-5">
          {["Birre", "Pub", "Birrifici"].map((t, i) => (
            <button
              key={t}
              className="flex-1 text-[12px] font-semibold py-2 rounded-xl transition-all"
              style={
                i === 0
                  ? { background: "#f77104", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", color: "#5a4432", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Stili ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Stili
            </h2>
            <button className="text-[12px] font-semibold" style={{ color: "#f77104" }}>
              Tutti →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 px-5">
            {STYLES.map((s) => (
              <button
                key={s.name}
                className="flex flex-col items-center justify-center py-3.5 rounded-2xl transition-all active:scale-95"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.hue}22`,
                }}
              >
                <span className="text-xl mb-1">{s.emoji}</span>
                <span className="text-[11px] font-semibold" style={{ color: "#f5ede0" }}>
                  {s.name}
                </span>
                <span className="text-[9px] mt-0.5" style={{ color: "#5a4432" }}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Trending ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <div className="flex items-center gap-2">
              <h2
                className="text-[17px] font-bold"
                style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
              >
                Di tendenza
              </h2>
              <TrendingUp className="w-4 h-4" style={{ color: "#22c55e" }} />
            </div>
            <span className="text-[11px]" style={{ color: "#5a4432" }}>questa settimana</span>
          </div>
          <div
            className="mx-5 rounded-2xl overflow-hidden"
            style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {TRENDING.map((b, i) => (
              <div key={b.name}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="text-[14px] font-bold w-5 text-center flex-shrink-0"
                    style={{ fontFamily: "'Fraunces', serif", color: "#5a4432" }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      background: `radial-gradient(circle, ${b.hue}33, ${b.hue}11)`,
                      border: `1px solid ${b.hue}33`,
                    }}
                  >
                    🍺
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#f5ede0" }}>
                      {b.name}
                    </p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "#5a4432" }}>
                      {b.brewery} · {b.style}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="w-3 h-3" style={{ color: "#d4a96a" }} fill="#d4a96a" />
                    <span
                      className="text-[12px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}
                    >
                      {b.rating}
                    </span>
                  </div>
                </div>
                {i < TRENDING.length - 1 && (
                  <div className="h-px ml-[4.75rem]" style={{ background: "rgba(255,255,255,0.04)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Birrifici ── */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Birrifici italiani
            </h2>
            <button className="text-[12px] font-semibold" style={{ color: "#f77104" }}>
              Vedi tutti →
            </button>
          </div>
          <div
            className="flex gap-3 px-5 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {BREWERIES.map((b) => (
              <div
                key={b.name}
                className="flex-shrink-0 w-[180px] rounded-2xl p-4"
                style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-xl"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  🏭
                </div>
                <p className="text-[13px] font-semibold leading-tight" style={{ color: "#f5ede0" }}>
                  {b.name}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#5a4432" }}>
                  {b.flag} {b.city}
                </p>
                <div className="flex items-center gap-1 mt-2.5">
                  <Beer className="w-3 h-3" style={{ color: "#5a4432" }} />
                  <span className="text-[10px] font-semibold" style={{ color: "#5a4432" }}>
                    {b.beers} birre
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="cerca" theme="dark" />
    </div>
  );
}
