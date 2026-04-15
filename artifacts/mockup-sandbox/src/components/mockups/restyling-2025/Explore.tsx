import { Search, SlidersHorizontal, ChevronRight, Star, Beer, MapPin } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const STYLES = [
  { name: "IPA", emoji: "🍊", count: 3240, bg: "#fef3c7" },
  { name: "Stout", emoji: "🖤", count: 1820, bg: "#292524" },
  { name: "Saison", emoji: "🌾", count: 980, bg: "#fef9c3" },
  { name: "Lager", emoji: "🍺", count: 2450, bg: "#ecfeff" },
  { name: "Sour", emoji: "🍋", count: 760, bg: "#fef3c7" },
  { name: "Porter", emoji: "☕", count: 920, bg: "#44403c" },
  { name: "Wit", emoji: "🌿", count: 680, bg: "#f0fdf4" },
  { name: "Barleywine", emoji: "🔥", count: 340, bg: "#fef2f2" },
];

const TRENDING_BEERS = [
  { name: "Tipopils", brewery: "Birrificio Italiano", style: "Pilsner", rating: 4.5 },
  { name: "Isaac", brewery: "Baladin", style: "Witbier", rating: 4.3 },
  { name: "ReAle Extra", brewery: "Birra del Borgo", style: "IPA", rating: 4.4 },
];

const BREWERIES = [
  { name: "Birrificio Italiano", city: "Lurago Marinone (CO)", beers: 24, flag: "🇮🇹" },
  { name: "Baladin", city: "Piozzo (CN)", beers: 32, flag: "🇮🇹" },
  { name: "Toccalmatto", city: "Fidenza (PR)", beers: 18, flag: "🇮🇹" },
];

export function Explore() {
  return (
    <div
      className="relative bg-[#f5f0eb] overflow-hidden"
      style={{ width: 390, minHeight: 844, fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 70 }}>
        {/* ── Top Bar ── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-[#ece5dc]/60">
          <div className="flex items-center justify-between px-5 h-[52px]">
            <h1
              className="text-[20px] font-bold text-[#1a1207] tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Esplora
            </h1>
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f5f0eb] transition-colors">
              <SlidersHorizontal className="w-[18px] h-[18px] text-[#7c7065]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 h-[48px] border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <Search className="w-[18px] h-[18px] text-[#a39889] flex-shrink-0" strokeWidth={1.8} />
            <span className="text-[14px] text-[#a39889]">Cerca birra, pub, birrificio…</span>
          </div>
        </div>

        {/* ── Scope Tabs ── */}
        <div className="flex gap-2 px-5 mt-3 mb-4">
          {["Birre", "Pub", "Birrifici"].map((t, i) => (
            <button
              key={t}
              className={`flex-1 text-[12px] font-semibold py-2 rounded-xl transition-all ${
                i === 0
                  ? "bg-[#1a1207] text-white shadow-sm"
                  : "bg-white text-[#7c7065] border border-[#ece5dc]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Stili di Birra ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Stili
            </h2>
            <button className="text-[12px] font-semibold text-[#ea580c]">Tutti →</button>
          </div>
          <div className="grid grid-cols-4 gap-2 px-5">
            {STYLES.map((style) => {
              const isDark = style.bg === "#292524" || style.bg === "#44403c";
              return (
                <button
                  key={style.name}
                  className="flex flex-col items-center justify-center py-3 rounded-2xl border border-[#ece5dc] transition-all active:scale-95 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  style={{ background: style.bg }}
                >
                  <span className="text-xl mb-1">{style.emoji}</span>
                  <span className={`text-[11px] font-semibold leading-tight ${isDark ? "text-white" : "text-[#1a1207]"}`}>
                    {style.name}
                  </span>
                  <span className={`text-[9px] mt-0.5 ${isDark ? "text-white/60" : "text-[#a39889]"}`}>
                    {(style.count / 1000).toFixed(1)}k
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Trending ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Di tendenza
            </h2>
            <span className="text-[11px] text-[#a39889]">questa settimana</span>
          </div>
          <div className="mx-5 bg-white rounded-2xl border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            {TRENDING_BEERS.map((beer, i) => (
              <div key={beer.name}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-[#f5f0eb] flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-bold text-[#7c7065]" style={{ fontFamily: "'Fraunces', serif" }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#d4a96a] to-[#c17f59] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🍺</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1a1207] truncate">{beer.name}</p>
                    <p className="text-[11px] text-[#a39889] truncate">{beer.brewery} · {beer.style}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="w-3 h-3 text-[#d97706] fill-current" />
                    <span className="text-[12px] font-bold text-[#1a1207]">{beer.rating}</span>
                  </div>
                </div>
                {i < TRENDING_BEERS.length - 1 && <div className="h-px bg-[#f2ede6] ml-[4.75rem]" />}
              </div>
            ))}
          </div>
        </section>

        {/* ── Birrifici in primo piano ── */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Birrifici italiani
            </h2>
            <button className="text-[12px] font-semibold text-[#ea580c]">Vedi tutti →</button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {BREWERIES.map((b) => (
              <div
                key={b.name}
                className="flex-shrink-0 w-[180px] bg-white rounded-2xl border border-[#ece5dc] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2d1b0e] to-[#4a3020] flex items-center justify-center mb-3 shadow-md">
                  <span className="text-xl">🏭</span>
                </div>
                <p className="text-[13px] font-semibold text-[#1a1207] leading-tight">{b.name}</p>
                <p className="text-[11px] text-[#a39889] mt-0.5 flex items-center gap-1">
                  <span>{b.flag}</span>
                  {b.city}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Beer className="w-3 h-3 text-[#7c7065]" />
                  <span className="text-[10px] font-semibold text-[#7c7065]">{b.beers} birre</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="cerca" />
    </div>
  );
}
