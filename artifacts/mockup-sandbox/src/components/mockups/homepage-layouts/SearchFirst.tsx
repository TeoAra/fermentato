import { Search, MapPin, Star, ChevronRight, Clock } from "lucide-react";

const TRENDING_BEERS = [
  { name: "Hop Skin Session IPA", brewery: "CRAK Brewery", style: "IPA", rating: 4.8, reviews: 312, img: "/__mockup/images/hero-beer.png" },
  { name: "Duna Imperial Stout", brewery: "Del Borgo", style: "Stout", rating: 4.7, reviews: 208, img: "/__mockup/images/beer-cans.png" },
  { name: "Sour Mango Berliner", brewery: "Revelation Cat", style: "Sour", rating: 4.6, reviews: 184, img: "/__mockup/images/hero-beer.png" },
  { name: "Weizen Classica", brewery: "Hop Skin", style: "Weizen", rating: 4.5, reviews: 95, img: "/__mockup/images/beer-cans.png" },
  { name: "Ambrata Piemontese", brewery: "Beerland", style: "Amber", rating: 4.4, reviews: 76, img: "/__mockup/images/hero-beer.png" },
];

const PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "The Brew House", city: "Roma", dist: "1.1 km", taps: 9, rating: 4.5, open: true, img: "/__mockup/images/pub-interior.png" },
  { name: "Birreria 27", city: "Torino", dist: "2.3 km", taps: 22, rating: 4.8, open: false, img: "/__mockup/images/pub-interior.png" },
];

const CATS = ["🍺 IPA", "🍫 Stout", "🏠 Pub", "🏭 Birrifici", "🎪 Festival", "🗺 Mappa"];

export function SearchFirst() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1410" }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="h-16 flex items-center justify-between px-8" style={{ borderBottom: "1px solid #f0ece8" }}>
        <span className="font-extrabold text-[17px]" style={{ color: "#1a1410" }}>
          fermenta<span style={{ color: "#d97706" }}>.to</span>
        </span>
        <div className="hidden md:flex items-center gap-7 text-[14px]">
          {["Pub", "Birrifici", "Birre", "Festival"].map(l => (
            <a key={l} className="cursor-pointer font-medium" style={{ color: "#6b6260" }}>{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl text-[14px] font-medium" style={{ color: "#6b6260", border: "1px solid #e8e0d8" }}>
            Accedi
          </button>
          <button className="px-4 py-2 rounded-xl text-[14px] font-bold" style={{ background: "#d97706", color: "#fff" }}>
            Iscriviti
          </button>
        </div>
      </nav>

      {/* ── Giant search hero ────────────────────────────── */}
      <div className="px-8 pt-14 pb-12" style={{ background: "#fff" }}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "#d97706" }}>
            12.847 birre · 532 birrifici · 148 pub
          </p>
          <h1 className="font-extrabold leading-[1.04] tracking-tight mb-7" style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", color: "#1a1410" }}>
            Dove vuoi<br />bere stasera?
          </h1>

          {/* Search bar */}
          <div className="flex rounded-2xl overflow-hidden mb-5" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)", border: "1px solid #e8e0d8" }}>
            <div className="flex-1 flex items-center gap-3 px-5" style={{ borderRight: "1px solid #e8e0d8" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#9d8e86" }} />
              <input
                placeholder="Cerca birra, pub o birrificio..."
                className="flex-1 py-4 text-[14px] bg-transparent outline-none"
                style={{ color: "#1a1410" }}
              />
            </div>
            <div className="flex items-center gap-2 px-4" style={{ borderRight: "1px solid #e8e0d8", minWidth: 140 }}>
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#d97706" }} />
              <span className="text-[13px] font-medium" style={{ color: "#6b6260" }}>Milano, IT</span>
            </div>
            <button className="px-6 font-bold text-[14px]" style={{ background: "#d97706", color: "#fff" }}>
              Cerca
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            {CATS.map((c, i) => (
              <button key={c}
                className="px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-all"
                style={i === 0
                  ? { background: "#fef3c7", color: "#92400e", border: "1.5px solid #fcd34d" }
                  : { background: "#f9f6f3", color: "#6b6260", border: "1px solid #e8e0d8" }
                }>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────── */}
      <div style={{ background: "#f9f6f3" }} className="px-8 py-10">
        <div className="max-w-6xl mx-auto">

          {/* ── Trending beers ── */}
          <section className="mb-12">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: "#9d8e86" }}>QUESTA SETTIMANA</p>
                <h2 className="text-xl font-bold" style={{ color: "#1a1410" }}>Birre di tendenza</h2>
              </div>
              <a className="text-[13px] font-semibold flex items-center gap-1 cursor-pointer" style={{ color: "#d97706" }}>
                Vedi tutte <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
              {TRENDING_BEERS.map((beer, i) => (
                <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5"
                  style={{ width: 168, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div className="relative" style={{ height: 160 }}>
                    <img src={beer.img} alt={beer.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" style={{ color: "#f59e0b" }} />
                      <span className="text-[11px] font-bold text-white">{beer.rating}</span>
                      <span className="text-[10px] text-white/70">({beer.reviews})</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#d97706" }}>{beer.style}</p>
                    <p className="text-[13px] font-bold leading-tight mb-0.5 line-clamp-2" style={{ color: "#1a1410" }}>{beer.name}</p>
                    <p className="text-[11px]" style={{ color: "#9d8e86" }}>{beer.brewery}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Pub aperti ── */}
          <section className="mb-12">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: "#9d8e86" }}>VICINO A TE</p>
                <h2 className="text-xl font-bold" style={{ color: "#1a1410" }}>Pub aperti adesso</h2>
              </div>
              <a className="text-[13px] font-semibold flex items-center gap-1 cursor-pointer" style={{ color: "#d97706" }}>
                Vedi sulla mappa <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {PUBS.map((pub, i) => (
                <div key={i} className="rounded-2xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5"
                  style={{ background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div className="relative" style={{ height: 176 }}>
                    <img src={pub.img} alt={pub.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)" }} />
                    <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: pub.open ? "#10b981" : "rgba(0,0,0,0.55)", color: "#fff" }}>
                      {pub.open ? "● Aperto" : "Chiuso"}
                    </span>
                    <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(4px)" }}>
                      ★ {pub.rating}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1" style={{ fontSize: 15, color: "#1a1410" }}>{pub.name}</h3>
                    <p className="text-[13px] flex items-center gap-1 mb-3" style={{ color: "#9d8e86" }}>
                      <MapPin className="w-3 h-3" /> {pub.city} · {pub.dist}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "#fef3c7", color: "#92400e" }}>
                        🍺 {pub.taps} spine
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA strip ── */}
          <div className="rounded-3xl px-8 py-8 flex items-center justify-between" style={{ background: "#1a1410" }}>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Sei un proprietario di pub o birrificio?</h3>
              <p className="text-sm" style={{ color: "#8a7d74" }}>Porta la tua attività su Fermenta.to. Gratis per iniziare.</p>
            </div>
            <button className="px-6 py-3 rounded-xl font-bold text-[14px] flex-shrink-0" style={{ background: "#f59e0b", color: "#0f0d0b" }}>
              Registrati →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
