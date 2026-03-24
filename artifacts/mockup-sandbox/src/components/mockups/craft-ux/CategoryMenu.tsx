import { useState } from 'react';
import { Search, Home, Compass, Heart, User, ChevronRight, MapPin, Award, Leaf, Globe } from 'lucide-react';

const styles = [
  { name: 'IPA', emoji: '🍺', count: 2840, bg: 'from-orange-400 to-orange-600', text: 'text-white', sub: 'India Pale Ale' },
  { name: 'Lager', emoji: '🍻', count: 1920, bg: 'from-yellow-300 to-amber-400', text: 'text-amber-900', sub: 'Chiara & Fresca' },
  { name: 'Stout', emoji: '🖤', count: 890, bg: 'from-stone-700 to-stone-900', text: 'text-white', sub: 'Scura & Corposa' },
  { name: 'Weizen', emoji: '🌾', count: 640, bg: 'from-amber-300 to-yellow-500', text: 'text-amber-900', sub: 'Frumento' },
  { name: 'Saison', emoji: '🌿', count: 410, bg: 'from-green-400 to-emerald-600', text: 'text-white', sub: 'Stagionale Belga' },
  { name: 'Sour', emoji: '🍋', count: 730, bg: 'from-purple-400 to-violet-600', text: 'text-white', sub: 'Acida & Fruttata' },
  { name: 'APA', emoji: '🍊', count: 560, bg: 'from-orange-300 to-amber-500', text: 'text-white', sub: 'American Pale Ale' },
  { name: 'Porter', emoji: '☕', count: 380, bg: 'from-stone-500 to-stone-700', text: 'text-white', sub: 'Tostata' },
  { name: 'Belga', emoji: '🔔', count: 490, bg: 'from-blue-400 to-blue-600', text: 'text-white', sub: 'Tripel & Dubbel' },
  { name: 'Bock', emoji: '🦌', count: 210, bg: 'from-amber-700 to-amber-900', text: 'text-white', sub: 'Tedesca Forte' },
  { name: 'Pilsner', emoji: '🌕', count: 870, bg: 'from-yellow-200 to-yellow-400', text: 'text-yellow-900', sub: 'Boema & Ceca' },
  { name: 'Barleywine', emoji: '🍷', count: 145, bg: 'from-rose-600 to-rose-800', text: 'text-white', sub: 'Potente & Dolce' },
];

const exploreBy = [
  { icon: Globe, label: 'Regione', sublabel: '20 regioni italiane', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: MapPin, label: 'Vicino a te', sublabel: '14 locali entro 5km', color: 'bg-orange-50 text-[#F77104] border-orange-100' },
  { icon: Award, label: 'Premiati', sublabel: 'Gold & Silver 2024', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { icon: Leaf, label: 'Stagionali', sublabel: 'Birre di Primavera', color: 'bg-green-50 text-green-700 border-green-100' },
];

function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div className="flex items-center gap-0.5 bg-white rounded-full px-2 py-1.5 shadow-2xl shadow-orange-200/50 border border-orange-50">
        {[
          { icon: Home, label: 'Home' },
          { icon: Compass, label: 'Esplora', active: true },
          { icon: Search, label: 'Cerca' },
          { icon: Heart, label: 'Salvati' },
          { icon: User, label: 'Profilo' },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all ${active ? 'bg-[#F77104] text-white' : 'text-slate-400'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SideNav() {
  return (
    <aside className="hidden md:flex flex-col gap-2 w-20 items-center py-8 sticky top-0 h-screen border-r border-orange-100 bg-white/80 backdrop-blur shrink-0">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F77104] to-[#F98A0E] flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
        <span className="text-white font-black text-sm">F</span>
      </div>
      {[
        { icon: Home, label: 'Home' },
        { icon: Compass, label: 'Esplora', active: true },
        { icon: MapPin, label: 'Locali' },
        { icon: Heart, label: 'Salvati' },
        { icon: User, label: 'Profilo' },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} title={label} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-[#F77104] text-white shadow-md shadow-orange-200' : 'text-slate-400 hover:bg-orange-50 hover:text-[#F77104]'}`}>
          <Icon size={22} />
        </button>
      ))}
    </aside>
  );
}

export function CategoryMenu() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#FFF8F2] font-sans text-slate-800 flex">
      <SideNav />

      <div className="flex-1 overflow-y-auto pb-28 md:pb-8">
        {/* Header */}
        <header className="px-5 md:px-8 pt-12 md:pt-8 pb-4">
          <p className="text-sm text-[#F77104] font-semibold uppercase tracking-wider mb-0.5">Fermenta.to</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Esplora</h1>
          <p className="text-sm text-slate-500 mt-1">Birre, birrifici e locali italiani</p>
        </header>

        {/* Search */}
        <div className="px-5 md:px-8 mb-6">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-orange-100">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none" placeholder="Cerca stile, birrificio, locale..." />
          </div>
        </div>

        <div className="px-5 md:px-8 space-y-8">

          {/* Esplora per */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Esplora per</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exploreBy.map(({ icon: Icon, label, sublabel, color }) => (
                <button key={label} className={`flex items-center gap-3 p-4 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all text-left ${color}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Stili */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Per Stile</h2>
              <span className="text-xs text-slate-400 font-medium">{styles.length} stili</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {styles.map((style) => (
                <button
                  key={style.name}
                  onClick={() => setActiveFilter(style.name === activeFilter ? null : style.name)}
                  className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${activeFilter === style.name ? 'ring-2 ring-[#F77104] ring-offset-2' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.bg}`} />
                  <div className="relative z-10">
                    <span className="text-3xl mb-2 block">{style.emoji}</span>
                    <p className={`font-bold text-base leading-tight ${style.text}`}>{style.name}</p>
                    <p className={`text-[11px] mt-0.5 opacity-80 ${style.text}`}>{style.sub}</p>
                    <p className={`text-[11px] font-bold mt-2 opacity-90 ${style.text}`}>{style.count.toLocaleString()} birre</p>
                  </div>
                  {activeFilter === style.name && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-[#F77104] rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {activeFilter && (
              <div className="mt-4 bg-white rounded-2xl p-4 border border-orange-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Stai esplorando: <span className="text-[#F77104]">{activeFilter}</span></p>
                  <p className="text-sm text-slate-500 mt-0.5">{styles.find(s => s.name === activeFilter)?.count.toLocaleString()} birre disponibili</p>
                </div>
                <button className="bg-[#F77104] text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-[#e06703] transition-colors">
                  Vai <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>

          {/* Birrifici in evidenza */}
          <section className="pb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Birrifici in Evidenza</h2>
              <button className="text-sm text-[#F77104] font-semibold flex items-center gap-0.5">Tutti <ChevronRight size={14} /></button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {[
                { name: 'Baladin', region: 'Piemonte', beers: 28, rating: 4.7 },
                { name: 'Birra del Borgo', region: 'Lazio', beers: 22, rating: 4.6 },
                { name: 'Extraomnes', region: 'Lombardia', beers: 18, rating: 4.8 },
                { name: 'Hype Brewing', region: 'Campania', beers: 14, rating: 4.5 },
              ].map((b) => (
                <div key={b.name} className="shrink-0 w-44 bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl mb-3">🏭</div>
                  <p className="font-bold text-sm text-slate-900">{b.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{b.region}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">{b.beers} birre</span>
                    <span className="text-xs font-bold text-amber-500">★ {b.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
