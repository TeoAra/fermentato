import { Search, MapPin, Star, Navigation, Beer, Droplets, Clock } from "lucide-react";

const FEED_ITEMS = [
  { user: "Marco T.", initial: "M", beer: "Hop Skin IPA", brewery: "CRAK Brewery", style: "IPA", abv: "6.5%", rating: 4, note: "Agrumata e intensa, luppolatura fantastica.", ago: "3 min fa", color: "#f59e0b" },
  { user: "Giulia R.", initial: "G", beer: "Nursia Extra", brewery: "Birra Nursia", style: "Belgian", abv: "7.2%", rating: 5, note: "Complessa e morbida. La migliore che abbia bevuto quest'anno.", ago: "11 min fa", color: "#8b5cf6" },
  { user: "Luca B.", initial: "L", beer: "Revelation Sour", brewery: "Revelation Cat", style: "Sour", abv: "4.8%", rating: 4, note: "Fresca e piacevole, ottima per l'estate.", ago: "22 min fa", color: "#10b981" },
  { user: "Sara M.", initial: "S", beer: "Duna Stout", brewery: "Del Borgo", style: "Stout", abv: "8.1%", rating: 5, note: "Corposa, cioccolatosa, vellutata. Da abbinare con il formaggio.", ago: "35 min fa", color: "#ef4444" },
  { user: "Paolo F.", initial: "P", beer: "Ambrata Piemontese", brewery: "Beerland", style: "Amber", abv: "5.4%", rating: 3, note: "Equilibrata e maltata. Facile da bere.", ago: "1 ora fa", color: "#f59e0b" },
  { user: "Chiara V.", initial: "C", beer: "Weizen Classica", brewery: "Hop Skin", style: "Weizen", abv: "5.0%", rating: 4, note: "Banana e chiodi di garofano ben bilanciati.", ago: "2 ore fa", color: "#06b6d4" },
];

const NEARBY_PUBS = [
  { name: "Luppolino Pub", city: "Milano", dist: "0.4 km", taps: 14, rating: 4.7, open: true },
  { name: "The Brew House", city: "Milano", dist: "1.1 km", taps: 9, rating: 4.5, open: true },
];

const STYLES = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Porter", "Belgian", "Saison"];
const STATS = [
  { n: "12.847", label: "Birre" },
  { n: "532", label: "Birrifici" },
  { n: "148", label: "Pub" },
  { n: "4.210", label: "Utenti" },
];

export function FeedDark() {
  return (
    <div className="min-h-screen text-[#f5f0eb]" style={{ background: "#0f0d0b", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav style={{ background: "rgba(15,13,11,0.96)", borderBottom: "1px solid #2a2420" }}
        className="sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-extrabold text-[17px] tracking-tight" style={{ color: "#f5f0eb" }}>
            fermenta<span style={{ color: "#f59e0b" }}>.to</span>
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {["Birre", "Pub", "Birrifici", "Festival"].map(l => (
              <a key={l} className="cursor-pointer transition-colors" style={{ color: "#8a7d74" }}>{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={{ color: "#8a7d74", border: "1px solid #2a2420" }}>
              Accedi
            </button>
            <button className="px-4 py-1.5 rounded-full text-sm font-bold transition-opacity hover:opacity-90" style={{ background: "#f59e0b", color: "#0f0d0b" }}>
              Iscriviti
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero: compact search ─────────────────────────── */}
      <div style={{ background: "#0f0d0b", borderBottom: "1px solid #2a2420" }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#f5f0eb" }}>
            Cosa stanno bevendo?
          </h1>
          <p className="text-sm mb-5" style={{ color: "#8a7d74" }}>
            Scopri le birre artigianali italiane, segui la community, trova il tuo prossimo preferito.
          </p>
          <div className="flex gap-2 max-w-xl">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-4 h-11" style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#8a7d74" }} />
              <input
                placeholder="Cerca birra, pub o birrificio..."
                className="bg-transparent flex-1 text-sm outline-none"
                style={{ color: "#f5f0eb" }}
              />
            </div>
            <button className="h-11 px-5 rounded-xl font-bold text-sm" style={{ background: "#f59e0b", color: "#0f0d0b" }}>
              Cerca
            </button>
          </div>
        </div>
      </div>

      {/* ── 2-col layout ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6" style={{ display: "grid", gridTemplateColumns: "1fr 288px", gap: "24px" }}>

        {/* Left: Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#8a7d74" }}>
              Attività recente
            </p>
            <button className="text-[12px] font-semibold" style={{ color: "#f59e0b" }}>
              Filtra per stile ↓
            </button>
          </div>

          <div className="space-y-3">
            {FEED_ITEMS.map((item, i) => (
              <div key={i} className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.005]"
                style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: item.color + "22", color: item.color }}>
                    {item.initial}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug mb-1">
                      <span className="font-semibold" style={{ color: "#f5f0eb" }}>{item.user}</span>
                      <span style={{ color: "#8a7d74" }}> ha assaggiato </span>
                      <span className="font-bold" style={{ color: "#f59e0b" }}>{item.beer}</span>
                    </p>
                    <p className="text-[12px] mb-2" style={{ color: "#8a7d74" }}>
                      {item.brewery} · {item.style} · {item.abv}
                    </p>
                    {/* Stars */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className="w-3.5 h-3.5" fill={s <= item.rating ? "#f59e0b" : "none"} style={{ color: s <= item.rating ? "#f59e0b" : "#2a2420" }} />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>{item.rating}.0</span>
                    </div>
                    {/* Note */}
                    <p className="text-[13px] italic leading-snug" style={{ color: "#c8bdb4" }}>"{item.note}"</p>
                  </div>
                  {/* Time */}
                  <span className="text-[11px] flex-shrink-0 pt-0.5" style={{ color: "#8a7d74" }}>{item.ago}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Stili */}
          <div className="rounded-2xl p-4" style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "#8a7d74" }}>
              Esplora per stile
            </p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button key={s} className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  style={{ border: "1px solid #2a2420", color: "#8a7d74" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pub vicini */}
          <div className="rounded-2xl p-4" style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "#8a7d74" }}>
              Pub vicini a te
            </p>
            <div className="space-y-3">
              {NEARBY_PUBS.map((pub, i) => (
                <div key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0f0d0b" }}>
                    <Beer className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-amber-400 transition-colors" style={{ color: "#f5f0eb" }}>{pub.name}</p>
                    <p className="text-[11px]" style={{ color: "#8a7d74" }}>{pub.dist} · {pub.taps} spine</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[11px] font-bold" style={{ color: "#f59e0b" }}>★ {pub.rating}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#0d2e1a", color: "#34d399" }}>Aperto</span>
                  </div>
                </div>
              ))}
              <button className="w-full text-center text-[12px] font-semibold pt-2" style={{ color: "#f59e0b", borderTop: "1px solid #2a2420" }}>
                Vedi tutti sulla mappa →
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl p-4" style={{ background: "#1a1612", border: "1px solid #2a2420" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-4" style={{ color: "#8a7d74" }}>
              La community
            </p>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-extrabold tabular-nums" style={{ color: "#f59e0b" }}>{s.n}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#8a7d74" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
