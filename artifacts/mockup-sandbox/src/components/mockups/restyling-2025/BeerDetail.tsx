import { ChevronLeft, Share2, Heart, Star, MapPin, Beer, Droplets, Thermometer, GlassWater, ChevronRight, Clock, Plus } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const BEER_COLOR = ["#d4763e", "#a04e22"];

const STATS = [
  { icon: Droplets, label: "IBU", value: "55", color: "#22d3ee" },
  { icon: Beer, label: "ABV", value: "6.2%", color: "#f77104" },
  { icon: Thermometer, label: "Temp", value: "8–10°", color: "#a78bfa" },
  { icon: GlassWater, label: "Bicchiere", value: "Tulip", color: "#d4a96a" },
];

const WHERE = [
  { name: "Lambiczoon", city: "Porta Venezia", dist: "0.3 km", type: "Spina", price: "€6.00", updated: "5 min fa" },
  { name: "Hop Skin", city: "Navigli", dist: "0.9 km", type: "Spina", price: "€6.50", updated: "1h fa" },
  { name: "Baladin Milano", city: "Brera", dist: "1.4 km", type: "Bottiglia", price: "€5.50", updated: null },
];

export function BeerDetail() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: 390, minHeight: 844, background: "#0d0805", fontFamily: "'Poppins', sans-serif", color: "#f5ede0" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 62 }}>

        {/* ── Hero ── */}
        <div
          className="relative h-[280px] flex flex-col items-center justify-end pb-6"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${BEER_COLOR[0]}33 0%, #0d0805 70%)`,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Top actions */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3">
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "#f5ede0" }} />
            </button>
            <div className="flex gap-2">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
              >
                <Heart className="w-[17px] h-[17px]" style={{ color: "#f5ede0" }} strokeWidth={2} />
              </button>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
              >
                <Share2 className="w-[17px] h-[17px]" style={{ color: "#f5ede0" }} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Beer image glow */}
          <div
            className="w-[110px] h-[110px] rounded-full flex items-center justify-center mb-4"
            style={{
              background: `radial-gradient(circle at 40% 35%, ${BEER_COLOR[0]}44, ${BEER_COLOR[1]}22)`,
              border: `2px solid ${BEER_COLOR[0]}44`,
              boxShadow: `0 0 40px ${BEER_COLOR[0]}33, 0 0 80px ${BEER_COLOR[0]}18`,
            }}
          >
            <span className="text-5xl">🍺</span>
          </div>

          {/* Color accent line */}
          <div
            className="w-16 h-1 rounded-full mx-auto"
            style={{ background: `linear-gradient(90deg, ${BEER_COLOR[0]}, ${BEER_COLOR[1]})` }}
          />
        </div>

        {/* ── Beer Info ── */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-2 mb-1">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${BEER_COLOR[0]}22`, color: BEER_COLOR[0] }}
            >
              India Pale Ale
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "#a89070" }}
            >
              6.2% ABV
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "#a89070" }}
            >
              55 IBU
            </span>
          </div>

          <h1
            className="text-[28px] font-black tracking-tight leading-tight mt-2"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
          >
            Nebbia IPA
          </h1>
          <button className="flex items-center gap-1 mt-1.5">
            <span className="text-[14px] font-semibold" style={{ color: "#f77104" }}>
              Birrificio del Ducato
            </span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#f77104" }} />
          </button>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <Star key={i} className="w-3.5 h-3.5" style={{ color: "#d4a96a" }} fill="#d4a96a" />
              ))}
              <Star className="w-3.5 h-3.5" style={{ color: "#2a1e12" }} fill="#2a1e12" strokeWidth={1.5} />
            </div>
            <span
              className="text-[16px] font-bold"
              style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}
            >
              4.3
            </span>
            <span className="text-[11px]" style={{ color: "#5a4432" }}>1.247 assaggi</span>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div
          className="mx-5 rounded-2xl overflow-hidden mb-4"
          style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="grid grid-cols-4">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`flex flex-col items-center py-4 ${i < 3 ? "border-r" : ""}`}
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <Icon className="w-4 h-4 mb-1.5" style={{ color: s.color }} strokeWidth={1.8} />
                  <span className="text-[9px] uppercase font-medium tracking-wider" style={{ color: "#5a4432" }}>
                    {s.label}
                  </span>
                  <span
                    className="text-[13px] font-bold mt-0.5"
                    style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}
                  >
                    {s.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="mx-5 mb-5">
          <button
            className="w-full h-[50px] rounded-2xl flex items-center justify-center gap-2 text-[14px] font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #f77104, #d45f03)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(247,113,4,0.3)",
            }}
          >
            <Plus className="w-4 h-4" />
            Aggiungi assaggio
          </button>
        </div>

        {/* ── Dove trovarla ── */}
        <section className="px-5 mb-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              className="text-[17px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Dove trovarla
            </h2>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
            >
              {WHERE.length} locali
            </span>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {WHERE.map((pub, i) => (
              <div key={pub.name}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: "#2a1e12" }}
                  >
                    🍻
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#f5ede0" }}>
                      {pub.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" style={{ color: "#5a4432" }} />
                      <span className="text-[11px]" style={{ color: "#5a4432" }}>{pub.city}</span>
                      <span className="text-[11px] font-bold" style={{ color: "#22d3ee" }}>{pub.dist}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={
                        pub.type === "Spina"
                          ? { background: "rgba(34,197,94,0.15)", color: "#22c55e" }
                          : { background: "rgba(255,255,255,0.07)", color: "#a89070" }
                      }
                    >
                      {pub.type}
                    </span>
                    <span
                      className="text-[14px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: "#d4a96a" }}
                    >
                      {pub.price}
                    </span>
                    {pub.updated && (
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                        <span className="text-[9px]" style={{ color: "#5a4432" }}>{pub.updated}</span>
                      </div>
                    )}
                  </div>
                </div>
                {i < WHERE.length - 1 && (
                  <div className="h-px ml-[4rem]" style={{ background: "rgba(255,255,255,0.04)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Descrizione ── */}
        <section className="px-5 mb-6">
          <h2
            className="text-[17px] font-bold mb-3"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
          >
            Descrizione
          </h2>
          <div
            className="rounded-2xl p-4"
            style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: "#a89070" }}>
              Un'IPA d'ispirazione americana dal profilo aromatico complesso: agrumi tropicali,
              pompelmo e mango. Il corpo medio e la carbonazione vivace supportano
              un finale amaro pulito e persistente. Luppoli Citra, Mosaic e Simcoe.
            </p>
          </div>
        </section>
      </div>

      <BottomNav active="home" theme="dark" />
    </div>
  );
}
