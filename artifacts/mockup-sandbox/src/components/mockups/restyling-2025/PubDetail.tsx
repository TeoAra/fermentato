import { ChevronLeft, Share2, Heart, Star, MapPin, Navigation, Phone, Clock, Beer, ChevronRight, Wifi } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const TABS = ["Spina", "Cantina", "Info"];

const TAPLIST = [
  { name: "Tipopils", brewery: "Birrificio Italiano", style: "Pilsner", abv: "5.2%", price: "€5.00", color: "#e9c46a" },
  { name: "Nebbia IPA", brewery: "Birrificio del Ducato", style: "IPA", abv: "6.2%", price: "€6.00", color: "#d4763e" },
  { name: "Nora", brewery: "Baladin", style: "Ale speziata", abv: "6.8%", price: "€6.50", color: "#c17f59" },
  { name: "ReAle Extra", brewery: "Birra del Borgo", style: "IPA", abv: "6.4%", price: "€6.00", color: "#b8651a" },
  { name: "Verdi Imperial", brewery: "Toccalmatto", style: "Stout", abv: "8.5%", price: "€7.50", color: "#3d2b1f" },
  { name: "Wayan", brewery: "Baladin", style: "Saison", abv: "5.8%", price: "€6.00", color: "#e6c35c" },
];

export function PubDetail() {
  return (
    <div
      className="relative bg-[#f5f0eb] overflow-hidden"
      style={{ width: 390, minHeight: 844, fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 70 }}>
        {/* ── Top Bar (transparent) ── */}
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

        {/* ── Cover Image ── */}
        <div className="h-[200px] bg-gradient-to-br from-[#1a0f06] via-[#2d1b0e] to-[#4a3020] flex items-end relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="text-8xl">🍻</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f5f0eb] to-transparent" />
        </div>

        {/* ── Pub Identity ── */}
        <div className="relative -mt-8 mx-4">
          <div className="flex items-end gap-3.5">
            <div className="w-[72px] h-[72px] rounded-2xl bg-white border-[3px] border-white shadow-lg flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🍻</span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1
                className="text-[22px] font-bold text-[#1a1207] leading-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Lambiczoon
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#a39889]" />
                <span className="text-[12px] text-[#7c7065]">Via Friuli 46, Milano</span>
              </div>
            </div>
          </div>

          {/* ── At a Glance Strip ── */}
          <div className="flex items-center gap-2.5 mt-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Aperto · chiude 01:00
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0e7490] bg-[#ecfeff] px-2.5 py-1 rounded-full">
              <Beer className="w-3 h-3" />
              14 spine
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#d97706] bg-[#fef3c7] px-2 py-1 rounded-full">
              <Star className="w-3 h-3 fill-current" />
              4.6
            </span>
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex gap-2.5 mt-4">
            <button className="flex-1 flex items-center justify-center gap-2 h-[42px] bg-[#ea580c] text-white text-[13px] font-semibold rounded-xl shadow-[0_3px_12px_rgba(234,88,12,0.2)]">
              <Navigation className="w-4 h-4" />
              Indicazioni
            </button>
            <button className="flex items-center justify-center w-[42px] h-[42px] bg-white border border-[#ece5dc] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <Phone className="w-4 h-4 text-[#7c7065]" strokeWidth={2} />
            </button>
            <button className="flex items-center justify-center w-[42px] h-[42px] bg-white border border-[#ece5dc] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <Clock className="w-4 h-4 text-[#7c7065]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex mt-5 mx-4 bg-white rounded-xl border border-[#ece5dc] p-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all ${
                i === 0
                  ? "bg-[#1a1207] text-white shadow-sm"
                  : "text-[#7c7065] hover:text-[#1a1207]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Taplist ── */}
        <section className="mt-4 mx-4 mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              className="text-[15px] font-bold text-[#1a1207]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Birre alla spina
            </h2>
            <span className="text-[11px] text-[#a39889] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Agg. 2h fa
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            {TAPLIST.map((beer, i) => (
              <div key={beer.name}>
                <div className="flex items-center gap-3 px-4 py-3 active:bg-[#faf7f2] transition-colors">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${beer.color}dd, ${beer.color}88)` }}
                  >
                    <span className="text-sm">🍺</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1a1207] truncate">{beer.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#a39889] truncate">{beer.brewery}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[#7c7065] bg-[#f5f0eb] px-2 py-0.5 rounded-full">
                      {beer.style} · {beer.abv}
                    </span>
                    <span className="text-[13px] font-bold text-[#1a1207]" style={{ fontFamily: "'Fraunces', serif" }}>
                      {beer.price}
                    </span>
                  </div>
                </div>
                {i < TAPLIST.length - 1 && <div className="h-px bg-[#f2ede6] ml-[4rem]" />}
              </div>
            ))}
          </div>
        </section>

        {/* ── Info Quick Cards ── */}
        <section className="mx-4 mb-6">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white rounded-xl border border-[#ece5dc] p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <Wifi className="w-4 h-4 text-[#0e7490] mx-auto mb-1" />
              <span className="text-[10px] font-semibold text-[#1a1207]">Wi-Fi</span>
            </div>
            <div className="bg-white rounded-xl border border-[#ece5dc] p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <span className="text-base mb-1 block">🐕</span>
              <span className="text-[10px] font-semibold text-[#1a1207]">Dog friendly</span>
            </div>
            <div className="bg-white rounded-xl border border-[#ece5dc] p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <span className="text-base mb-1 block">🌿</span>
              <span className="text-[10px] font-semibold text-[#1a1207]">Giardino</span>
            </div>
          </div>
        </section>
      </div>

      <BottomNav active="cerca" />
    </div>
  );
}
