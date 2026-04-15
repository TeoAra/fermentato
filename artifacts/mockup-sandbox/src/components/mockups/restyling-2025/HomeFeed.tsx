import { Search, MapPin, ChevronRight, Star, Beer, Clock } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const PUBS_FEATURED = [
  { name: "Lambiczoon", area: "Navigli", taps: 14, dist: "0.3 km", open: true, img: "🍻" },
  { name: "Birrificio Italiano", area: "Lurago Marinone", taps: 22, dist: "18 km", open: true, img: "🏭" },
];

const ON_TAP = [
  { name: "Tipopils", brewery: "Birrificio Italiano", style: "Pilsner", abv: "5.2%", color: "#e9c46a" },
  { name: "ReAle Extra", brewery: "Birra del Borgo", style: "IPA", abv: "6.4%", color: "#d4763e" },
  { name: "Nora", brewery: "Baladin", style: "Ale speziata", abv: "6.8%", color: "#c17f59" },
  { name: "Verdi Imperial", brewery: "Toccalmatto", style: "Stout", abv: "8.5%", color: "#3d2b1f" },
  { name: "Wayan", brewery: "Baladin", style: "Saison", abv: "5.8%", color: "#e6c35c" },
];

const PUBS_NEARBY = [
  { name: "Lambiczoon", city: "Milano", dist: "0.3 km", taps: 14, open: true, rating: 4.6 },
  { name: "Hop Skin", city: "Milano", dist: "0.9 km", taps: 8, open: true, rating: 4.3 },
  { name: "Baladin Milano", city: "Milano", dist: "1.4 km", taps: 18, open: false, rating: 4.5 },
];

export function HomeFeed() {
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
              Fermenta.to
            </h1>
            <div className="flex items-center gap-3">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f5f0eb] transition-colors">
                <Search className="w-[18px] h-[18px] text-[#7c7065]" strokeWidth={2} />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a96a] to-[#c17f59] flex items-center justify-center">
                <span className="text-white text-[11px] font-bold">MR</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Location Context ── */}
        <div className="px-5 pt-4 pb-1">
          <button className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7c7065] bg-white rounded-full px-3 py-1.5 border border-[#ece5dc] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <MapPin className="w-3 h-3 text-[#ea580c]" />
            Milano, Italia
            <ChevronRight className="w-3 h-3 text-[#a39889]" />
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-5 pt-3 pb-4">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 h-[48px] border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <Search className="w-[18px] h-[18px] text-[#a39889] flex-shrink-0" strokeWidth={1.8} />
            <span className="text-[14px] text-[#a39889]">Cerca birra, pub, birrificio…</span>
          </div>
        </div>

        {/* ── In Evidenza ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              In evidenza
            </h2>
            <button className="text-[12px] font-semibold text-[#ea580c]">Vedi tutti</button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {PUBS_FEATURED.map((pub) => (
              <div
                key={pub.name}
                className="flex-shrink-0 w-[260px] rounded-2xl overflow-hidden bg-white border border-[#ece5dc] shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
              >
                <div className="h-[120px] bg-gradient-to-br from-[#2d1b0e] to-[#4a3020] flex items-center justify-center relative">
                  <span className="text-4xl">{pub.img}</span>
                  {pub.open && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      Aperto
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {pub.dist}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-[14px] font-semibold text-[#1a1207] leading-tight">{pub.name}</p>
                  <p className="text-[11px] text-[#7c7065] mt-0.5">{pub.area}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[#0e7490] bg-[#ecfeff] px-2 py-0.5 rounded-full">
                      <Beer className="w-3 h-3" />
                      {pub.taps} spine
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── In Spina Adesso ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              In spina adesso
            </h2>
            <span className="text-[11px] text-[#a39889]">
              <Clock className="w-3 h-3 inline mr-0.5" />
              Aggiornato live
            </span>
          </div>
          <div className="flex gap-4 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {ON_TAP.map((beer) => (
              <div key={beer.name} className="flex-shrink-0 flex flex-col items-center w-[68px]">
                <div
                  className="w-[56px] h-[56px] rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center mb-1.5"
                  style={{ background: `linear-gradient(135deg, ${beer.color}dd, ${beer.color}88)` }}
                >
                  <span className="text-white text-lg">🍺</span>
                </div>
                <p className="text-[10px] font-semibold text-[#1a1207] text-center leading-tight line-clamp-2">
                  {beer.name}
                </p>
                <p className="text-[9px] text-[#a39889] text-center mt-0.5">{beer.abv}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pub Vicini ── */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between px-5 mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Pub vicini
            </h2>
            <button className="text-[12px] font-semibold text-[#ea580c]">Mappa →</button>
          </div>
          <div className="mx-5 bg-white rounded-2xl border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            {PUBS_NEARBY.map((pub, i) => (
              <div key={pub.name}>
                <div className="flex items-center gap-3 px-4 py-3 active:bg-[#faf7f2] transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2d1b0e] to-[#4a3020] flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🍻</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-semibold text-[#1a1207] truncate">{pub.name}</p>
                      {pub.open ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#a39889]">{pub.city}</span>
                      <span className="text-[11px] font-bold text-[#0e7490]">{pub.dist}</span>
                      <span className="text-[11px] text-[#a39889]">·</span>
                      <span className="flex items-center gap-0.5 text-[11px] text-[#d97706]">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {pub.rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[#0e7490] bg-[#ecfeff] px-2 py-0.5 rounded-full">
                      {pub.taps} 🍺
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#d5cdc2]" />
                  </div>
                </div>
                {i < PUBS_NEARBY.length - 1 && (
                  <div className="h-px bg-[#f2ede6] ml-[4.25rem]" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Community Stats ── */}
        <section className="mx-5 mb-6 bg-[#1a1207] rounded-2xl p-5 text-center">
          <p
            className="text-[11px] font-semibold text-[#a39889] uppercase tracking-widest mb-3"
          >
            La community italiana
          </p>
          <div className="flex justify-around">
            {[
              { n: "1.186k", l: "Birre" },
              { n: "8.2k", l: "Pub" },
              { n: "2.4k", l: "Birrifici" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-[22px] font-bold text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                  {s.n}
                </p>
                <p className="text-[10px] text-[#a39889] mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Bottom Nav ── */}
      <BottomNav active="home" />
    </div>
  );
}
