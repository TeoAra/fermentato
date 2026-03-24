import { Search, Navigation, Beer, Star, MapPin, Home, Map, Grid, User, Clock } from "lucide-react";

const NEARBY_PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "The Brew House", city: "Milano", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/brewery-interior.png" },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "Craft Corner", city: "Roma", dist: "3.0 km", taps: 7, rating: 4.2, open: false, img: "/__mockup/images/brewery-interior.png" },
];

const TRENDING_BEERS = [
  { name: "Hop Skin IPA", brewery: "CRAK", style: "IPA", abv: "6.5%", rating: 4.8, img: "/__mockup/images/hero-beer.png" },
  { name: "Duna Imperial", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 4.7, img: "/__mockup/images/beer-cans.png" },
  { name: "Sour Mango", brewery: "Rev. Cat", style: "Sour", abv: "4.8%", rating: 4.6, img: "/__mockup/images/hero-beer.png" },
  { name: "Weizen Estate", brewery: "Hop Skin", style: "Weizen", abv: "5.0%", rating: 4.5, img: "/__mockup/images/beer-cans.png" },
];

// Simulated map pins
const MAP_PINS = [
  { x: "22%", y: "30%", name: "Luppolino" },
  { x: "55%", y: "42%", name: "Brew House" },
  { x: "38%", y: "60%", name: "Birreria 27" },
  { x: "72%", y: "25%", name: "Craft Corner" },
  { x: "15%", y: "68%", name: "Hops & Grains" },
  { x: "80%", y: "58%", name: "Malt Room" },
];

const TABS = ["Vicino a te", "In spina", "Trending"];
const FILTERS = ["Tutti", "Pub", "Birrifici", "In spina"];

export function MapFirst() {
  return (
    <div className="min-h-screen" style={{ background: "#09090b", fontFamily: "system-ui, -apple-system, sans-serif", color: "#fafafa" }}>

      {/* ── Full-screen map hero ─────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "62vh", minHeight: 380 }}>

        {/* Simulated dark map */}
        <div className="absolute inset-0" style={{ background: "#111116" }}>
          {/* Street grid via CSS */}
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.22 }}>
            <defs>
              <pattern id="grid-h" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <line x1="0" y1="40" x2="80" y2="40" stroke="#3f3f46" strokeWidth="1" />
              </pattern>
              <pattern id="grid-v" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <line x1="40" y1="0" x2="40" y2="80" stroke="#3f3f46" strokeWidth="1" />
              </pattern>
              <pattern id="diagonal" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="80" y2="160" stroke="#3f3f46" strokeWidth="0.7" />
                <line x1="80" y1="0" x2="160" y2="160" stroke="#3f3f46" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-h)" />
            <rect width="100%" height="100%" fill="url(#grid-v)" />
            <rect width="100%" height="100%" fill="url(#diagonal)" />
            {/* Road shapes */}
            <rect x="30%" y="0" width="6%" height="100%" fill="rgba(39,39,42,0.6)" />
            <rect x="60%" y="0" width="4%" height="100%" fill="rgba(39,39,42,0.5)" />
            <rect x="0" y="35%" width="100%" height="5%" fill="rgba(39,39,42,0.6)" />
            <rect x="0" y="65%" width="100%" height="4%" fill="rgba(39,39,42,0.5)" />
          </svg>
          {/* Subtle green parks */}
          <div className="absolute" style={{ left: "10%", top: "15%", width: 100, height: 60, background: "#14532d22", borderRadius: 8 }} />
          <div className="absolute" style={{ left: "70%", top: "55%", width: 70, height: 50, background: "#14532d22", borderRadius: 8 }} />
        </div>

        {/* Map pins */}
        {MAP_PINS.map((pin, i) => (
          <div key={i} className="absolute" style={{ left: pin.x, top: pin.y, transform: "translate(-50%, -50%)" }}>
            <div className="relative group cursor-pointer">
              <div className="w-5 h-5 rounded-full shadow-[0_0_0_6px_rgba(245,158,11,0.18)]"
                style={{ background: i === 0 ? "#f59e0b" : "#3f3f46", border: i === 0 ? "none" : "1.5px solid #52525b" }} />
              {/* Tooltip on hover */}
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ background: "#18181b", border: "1px solid #27272a", color: "#fafafa" }}>
                  {pin.name}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Gradient overlay at bottom for bottom sheet */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: 80, background: "linear-gradient(to bottom, transparent, #09090b)" }} />

        {/* ── Top bar: floating ── */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[17px]" style={{ color: "#fafafa" }}>
              fermenta<span style={{ color: "#f59e0b" }}>.to</span>
            </span>
            <div className="flex-1 flex items-center gap-2 rounded-2xl px-4 h-11"
              style={{ background: "rgba(24,24,27,0.90)", backdropFilter: "blur(12px)", border: "1px solid #27272a" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#a1a1aa" }} />
              <input
                placeholder="Cerca pub, birrificio o birra..."
                className="bg-transparent flex-1 text-[13px] outline-none"
                style={{ color: "#fafafa" }}
              />
              <button className="flex items-center gap-1.5 text-[12px] font-bold pl-3" style={{ borderLeft: "1px solid #27272a", color: "#f59e0b" }}>
                <Navigation className="w-3.5 h-3.5" />
                GPS
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map((f, i) => (
              <button key={f}
                className="text-[12px] font-bold px-4 py-1.5 rounded-full flex-shrink-0 transition-colors"
                style={i === 0
                  ? { background: "#f59e0b", color: "#09090b", border: "none" }
                  : { background: "rgba(24,24,27,0.90)", backdropFilter: "blur(8px)", border: "1px solid #27272a", color: "#fafafa" }
                }>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live counter badge ── */}
        <div className="absolute bottom-6 left-4 flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: "rgba(24,24,27,0.90)", backdropFilter: "blur(8px)", border: "1px solid #27272a" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#34d399" }} />
          <span className="text-[12px] font-bold" style={{ color: "#fafafa" }}>12 pub aperti in quest'area</span>
        </div>

        {/* ── Expand map button ── */}
        <div className="absolute bottom-6 right-4">
          <button className="text-[12px] font-bold px-4 py-2 rounded-full"
            style={{ background: "rgba(24,24,27,0.90)", backdropFilter: "blur(8px)", border: "1px solid #27272a", color: "#f59e0b" }}>
            Espandi mappa
          </button>
        </div>
      </div>

      {/* ── Bottom sheet ─────────────────────────────────── */}
      <div style={{ background: "#09090b" }} className="px-4 pt-2 pb-6">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "#27272a" }} />

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "#18181b" }}>
          {TABS.map((tab, i) => (
            <button key={tab}
              className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors"
              style={i === 0
                ? { background: "#f59e0b", color: "#09090b" }
                : { background: "transparent", color: "#a1a1aa" }
              }>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Pub cards: horizontal scroll ── */}
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3 px-1" style={{ color: "#52525b" }}>
          Pub nelle vicinanze
        </p>
        <div className="flex gap-3 overflow-x-auto pb-3 mb-6" style={{ scrollbarWidth: "none" }}>
          {NEARBY_PUBS.map((pub, i) => (
            <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
              style={{ width: 240, background: "#18181b", border: "1px solid #27272a" }}>
              <div className="relative" style={{ height: 136 }}>
                <img src={pub.img} alt={pub.name} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)" }} />
                <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                  style={pub.open
                    ? { background: "rgba(9,9,11,0.75)", border: "1px solid #27272a", color: "#fafafa", backdropFilter: "blur(4px)" }
                    : { background: "rgba(9,9,11,0.75)", border: "1px solid #27272a", color: "#71717a", backdropFilter: "blur(4px)" }
                  }>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pub.open ? "#34d399" : "#52525b" }} />
                  {pub.open ? "Aperto" : "Chiuso"}
                </span>
                <span className="absolute top-2.5 right-2.5 text-[11px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "#f59e0b", color: "#09090b" }}>
                  ★ {pub.rating}
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-[14px]" style={{ color: "#fafafa" }}>{pub.name}</h3>
                  <span className="text-[12px] font-semibold" style={{ color: "#f59e0b" }}>{pub.dist}</span>
                </div>
                <p className="text-[12px] mb-3" style={{ color: "#71717a" }}>{pub.city}</p>
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#27272a", color: "#a1a1aa" }}>
                    🍺 {pub.taps} spine
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                    ● Live
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trending beers: 2-col grid ── */}
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3 px-1" style={{ color: "#52525b" }}>
          Birre di tendenza
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TRENDING_BEERS.map((beer, i) => (
            <div key={i} className="rounded-2xl overflow-hidden cursor-pointer group"
              style={{ background: "#18181b", border: "1px solid #27272a" }}>
              <div className="relative" style={{ height: 100 }}>
                <img src={beer.img} alt={beer.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)" }} />
                <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#f59e0b22", border: "1px solid #f59e0b55", color: "#f59e0b" }}>
                  {beer.style}
                </span>
              </div>
              <div className="p-3">
                <p className="font-bold text-[13px] leading-tight mb-0.5 truncate" style={{ color: "#fafafa" }}>{beer.name}</p>
                <p className="text-[11px] mb-1" style={{ color: "#71717a" }}>{beer.brewery} · {beer.abv}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" style={{ color: "#f59e0b" }} />
                  <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>{beer.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom nav bar ───────────────────────────────── */}
      <div className="sticky bottom-0 px-4 pb-2" style={{ background: "#09090b", borderTop: "1px solid #18181b" }}>
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Map, label: "Mappa" },
            { icon: Grid, label: "Birre" },
            { icon: User, label: "Profilo" },
          ].map(({ icon: Icon, label, active }) => (
            <button key={label} className="flex flex-col items-center gap-1">
              <Icon className="w-5 h-5" style={{ color: active ? "#f59e0b" : "#52525b" }} />
              <span className="text-[10px] font-semibold" style={{ color: active ? "#f59e0b" : "#52525b" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
