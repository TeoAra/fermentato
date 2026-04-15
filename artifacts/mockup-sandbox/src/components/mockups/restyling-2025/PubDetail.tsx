import { ChevronLeft, Share2, Heart, Star, MapPin, Navigation, Phone, Clock, Beer, Wifi, ChevronRight } from "lucide-react";
import { BottomNav } from "./_shared/BottomNav";

const TABS = ["Spina", "Cantina", "Info"];

const TAPLIST = [
  { name: "Tipopils", brewery: "Birrificio Italiano", style: "Pilsner", abv: "5.2%", price: "€5.00", hue: "#e9c46a", updated: "12 min fa" },
  { name: "Nebbia IPA", brewery: "Birrificio del Ducato", style: "IPA", abv: "6.2%", price: "€6.00", hue: "#d4763e", updated: "28 min fa" },
  { name: "Nora", brewery: "Baladin", style: "Ale speziata", abv: "6.8%", price: "€6.50", hue: "#c17f59", updated: "5 min fa" },
  { name: "ReAle Extra", brewery: "Birra del Borgo", style: "IPA", abv: "6.4%", price: "€6.00", hue: "#b8651a", updated: "1h fa" },
  { name: "Verdi Imperial Stout", brewery: "Toccalmatto", style: "Stout", abv: "8.5%", price: "€7.50", hue: "#5c3d28", updated: "3 min fa" },
  { name: "Wayan", brewery: "Baladin", style: "Saison", abv: "5.8%", price: "€6.00", hue: "#e6c35c", updated: "45 min fa" },
];

export function PubDetail() {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: 390, minHeight: 844, background: "#0d0805", fontFamily: "'Poppins', sans-serif", color: "#f5ede0" }}
    >
      <div className="overflow-y-auto" style={{ height: 844, paddingBottom: 62 }}>

        {/* ── Hero Cover ── */}
        <div
          className="relative h-[200px] flex items-end"
          style={{
            background: "linear-gradient(160deg, #1e1510 0%, #0d0805 60%)",
          }}
        >
          {/* Atmospheric top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-10">
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(13,8,5,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "#f5ede0" }} />
            </button>
            <div className="flex gap-2">
              {[Heart, Share2].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(13,8,5,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon className="w-[17px] h-[17px]" style={{ color: "#f5ede0" }} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          {/* Atmospheric large emoji */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-[100px]">🍻</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: "linear-gradient(to top, #0d0805, transparent)" }} />
        </div>

        {/* ── Pub Identity ── */}
        <div className="relative -mt-6 px-5">
          <div className="flex items-end gap-4">
            <div
              className="w-[70px] h-[70px] rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: "#1e1510",
                border: "2px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              🍻
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1
                className="text-[22px] font-black leading-tight tracking-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
              >
                Lambiczoon
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3" style={{ color: "#5a4432" }} />
                <span className="text-[12px]" style={{ color: "#a89070" }}>Via Friuli 46, Milano</span>
              </div>
            </div>
          </div>

          {/* Status + stats pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              Aperto · chiude 01:00
            </span>
            <span
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}
            >
              <Beer className="w-3 h-3" />
              14 spine
            </span>
            <span
              className="flex items-center gap-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(212,169,106,0.1)", color: "#d4a96a" }}
            >
              <Star className="w-3 h-3" fill="#d4a96a" />
              4.6
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2.5 mt-4">
            <button
              className="flex-1 flex items-center justify-center gap-2 h-[44px] rounded-xl text-[13px] font-bold"
              style={{
                background: "linear-gradient(135deg, #f77104, #d45f03)",
                color: "#fff",
                boxShadow: "0 3px 16px rgba(247,113,4,0.25)",
              }}
            >
              <Navigation className="w-4 h-4" />
              Indicazioni
            </button>
            <button
              className="w-[44px] h-[44px] flex items-center justify-center rounded-xl"
              style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Phone className="w-4 h-4" style={{ color: "#a89070" }} strokeWidth={2} />
            </button>
            <button
              className="w-[44px] h-[44px] flex items-center justify-center rounded-xl"
              style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Clock className="w-4 h-4" style={{ color: "#a89070" }} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex mt-5 mx-5 rounded-xl overflow-hidden p-1" style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className="flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all"
              style={
                i === 0
                  ? { background: "rgba(247,113,4,0.9)", color: "#fff" }
                  : { color: "#5a4432" }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Taplist ── */}
        <section className="mt-4 mx-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-[15px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Birre alla spina
            </h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-[10px] font-medium" style={{ color: "#a89070" }}>live</span>
            </div>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {TAPLIST.map((beer, i) => (
              <div key={beer.name}>
                {/* Beer color band */}
                <div
                  className="flex items-center gap-3 px-4 py-3 relative overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ background: beer.hue }}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      background: `radial-gradient(circle, ${beer.hue}33, ${beer.hue}11)`,
                      border: `1.5px solid ${beer.hue}44`,
                    }}
                  >
                    🍺
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#f5ede0" }}>
                      {beer.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#5a4432" }}>
                      {beer.brewery} · {beer.style} · {beer.abv}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-[14px] font-bold"
                      style={{ fontFamily: "'Fraunces', serif", color: "#d4a96a" }}
                    >
                      {beer.price}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: beer.updated.includes("min") ? "#22c55e" : "#5a4432" }} />
                      <span className="text-[9px]" style={{ color: "#5a4432" }}>{beer.updated}</span>
                    </div>
                  </div>
                </div>
                {i < TAPLIST.length - 1 && (
                  <div className="h-px ml-[4rem]" style={{ background: "rgba(255,255,255,0.04)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Amenities ── */}
        <div className="flex gap-2 mx-5 mb-6">
          {[
            { icon: "📶", label: "Wi-Fi" },
            { icon: "🐕", label: "Dog OK" },
            { icon: "🌿", label: "Giardino" },
            { icon: "🎵", label: "Live music" },
          ].map((a) => (
            <div
              key={a.label}
              className="flex-1 flex flex-col items-center py-3 rounded-xl"
              style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-base mb-1">{a.icon}</span>
              <span className="text-[9px] font-medium" style={{ color: "#5a4432" }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="cerca" theme="dark" />
    </div>
  );
}
