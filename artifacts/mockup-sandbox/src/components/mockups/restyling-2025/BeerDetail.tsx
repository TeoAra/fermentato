import { ChevronLeft, Share2, Heart, Star, MapPin, Beer, Droplets, Thermometer, GlassWater, ChevronRight } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const STATS = [
  { icon: Droplets, label: "IBU", value: "55", color: "#d97706" },
  { icon: Beer, label: "ABV", value: "6.2%", color: "#ea580c" },
  { icon: Thermometer, label: "Temp", value: "8-10°C", color: "#0e7490" },
  { icon: GlassWater, label: "Bicchiere", value: "Tulipano", color: "#7c3aed" },
];

const WHERE_TO_FIND = [
  { name: "Lambiczoon", city: "Milano", dist: "0.3 km", type: "Alla spina", price: "€6.00" },
  { name: "Baladin Milano", city: "Milano", dist: "1.4 km", type: "Alla spina", price: "€7.00" },
  { name: "Hop Skin", city: "Milano", dist: "0.9 km", type: "Bottiglia", price: "€5.50" },
];

export function BeerDetail() {
  return (
    <div
      className="relative bg-[#f5f0eb] overflow-hidden"
      style={{ width: 390, minHeight: 844, fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 70 }}>
        {/* ── Top Bar (transparent over hero) ── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-[52px]">
          <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Heart className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </button>
            <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <Share2 className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Hero Image ── */}
        <div className="h-[220px] bg-gradient-to-b from-[#2d1b0e] via-[#4a3020] to-[#6b4d34] flex items-center justify-center relative">
          <div className="w-[110px] h-[110px] rounded-full bg-gradient-to-br from-[#d4a96a]/30 to-[#c17f59]/30 border-2 border-white/20 flex items-center justify-center shadow-2xl">
            <span className="text-5xl">🍺</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f5f0eb] to-transparent" />
        </div>

        {/* ── Beer Info Card ── */}
        <div className="relative -mt-4 mx-4 bg-white rounded-2xl border border-[#ece5dc] shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-5 pb-4">
            <h1
              className="text-[24px] font-bold text-[#1a1207] leading-tight tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Nebbia IPA
            </h1>
            <button className="flex items-center gap-1 mt-1">
              <span className="text-[13px] font-semibold text-[#ea580c]">Birrificio del Ducato</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#ea580c]" />
            </button>

            {/* Style + ABV pills */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] font-semibold text-[#92400e] bg-[#fef3c7] px-2.5 py-1 rounded-full">
                India Pale Ale
              </span>
              <span className="text-[11px] font-semibold text-[#7c7065] bg-[#f5f0eb] px-2.5 py-1 rounded-full">
                6.2% ABV
              </span>
              <span className="text-[11px] font-semibold text-[#7c7065] bg-[#f5f0eb] px-2.5 py-1 rounded-full">
                55 IBU
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#f2ede6]">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <Star key={i} className="w-4 h-4 text-[#d97706] fill-current" />
                ))}
                <Star className="w-4 h-4 text-[#d97706]" strokeWidth={2} fill="none" style={{ clipPath: "inset(0 70% 0 0)" }} />
                <Star className="w-4 h-4 text-[#ece5dc]" strokeWidth={1.5} />
              </div>
              <span className="text-[15px] font-bold text-[#1a1207]" style={{ fontFamily: "'Fraunces', serif" }}>
                4.3
              </span>
              <span className="text-[11px] text-[#a39889]">1.247 assaggi</span>
            </div>
          </div>

          {/* ── Stats Strip ── */}
          <div className="flex border-t border-[#f2ede6]">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`flex-1 flex flex-col items-center py-3.5 ${
                    i < STATS.length - 1 ? "border-r border-[#f2ede6]" : ""
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" style={{ color: stat.color }} strokeWidth={1.8} />
                  <span className="text-[9px] text-[#a39889] uppercase tracking-wider font-medium">{stat.label}</span>
                  <span className="text-[13px] font-bold text-[#1a1207] mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>
                    {stat.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA: Aggiungi assaggio ── */}
        <div className="mx-4 mt-4">
          <button className="w-full h-[48px] bg-[#ea580c] hover:bg-[#dc4f07] text-white font-semibold text-[14px] rounded-2xl transition-colors shadow-[0_4px_16px_rgba(234,88,12,0.25)]">
            Aggiungi assaggio
          </button>
        </div>

        {/* ── Dove trovarla ── */}
        <section className="mt-6 mx-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              className="text-[17px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Dove trovarla
            </h2>
            <span className="text-[11px] font-semibold text-[#0e7490] bg-[#ecfeff] px-2 py-0.5 rounded-full">
              {WHERE_TO_FIND.length} locali
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            {WHERE_TO_FIND.map((pub, i) => (
              <div key={pub.name}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2d1b0e] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🍻</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1a1207] truncate">{pub.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#a39889] flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{pub.city}
                      </span>
                      <span className="text-[11px] font-bold text-[#0e7490]">{pub.dist}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[#15803d] bg-[#f0fdf4] px-2 py-0.5 rounded-full">
                      {pub.type}
                    </span>
                    <span className="text-[12px] font-bold text-[#1a1207]">{pub.price}</span>
                  </div>
                </div>
                {i < WHERE_TO_FIND.length - 1 && <div className="h-px bg-[#f2ede6] ml-[4rem]" />}
              </div>
            ))}
          </div>
        </section>

        {/* ── Descrizione ── */}
        <section className="mt-6 mx-4 mb-6">
          <h2
            className="text-[17px] font-bold text-[#1a1207] mb-3"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Descrizione
          </h2>
          <div className="bg-white rounded-2xl border border-[#ece5dc] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] text-[#5c5147] leading-relaxed">
              Un'IPA d'ispirazione americana con un profilo aromatico complesso
              dominato da sentori di agrumi tropicali, pompelmo e mango.
              Il corpo medio e la carbonazione vivace sostengono
              un finale amaro ben bilanciato. Malti Pale e Caramello,
              luppoli Citra, Mosaic e Simcoe.
            </p>
          </div>
        </section>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
