import { useState } from 'react';
import {
  Bell, Search, Star, Home, Compass, QrCode, Heart, User,
  MapPin, ChevronRight, Navigation, Clock, Flame, TrendingUp
} from 'lucide-react';

const beers = [
  { name: 'Nebbia Rossa', style: 'IPA', brewery: 'Hype Brewing', rating: 4.3, abv: '6.2%', color: '#F77104' },
  { name: 'Luna Sour', style: 'Sour', brewery: 'Baladin', rating: 4.5, abv: '5.0%', color: '#CFA865' },
  { name: 'Orso Bruno', style: 'Stout', brewery: 'Birra del Borgo', rating: 4.1, abv: '7.1%', color: '#5C3D1E' },
];

const venues = [
  { name: 'Luppolino Pub', distance: '320m', beers: 14, rating: 4.6, open: true, tag: 'Tap Room' },
  { name: 'The Malt District', distance: '850m', beers: 22, rating: 4.8, open: true, tag: 'Craft Bar' },
  { name: 'Birreria Centrale', distance: '1.2km', beers: 8, rating: 4.2, open: false, tag: 'Pub' },
];

const trending = [
  { name: 'Vallée Blanche', style: 'Saison', brewery: 'Extraomnes', rating: 4.7, trend: '+18% questa settimana' },
  { name: 'Dada', style: 'American Pale Ale', brewery: 'Revelation Cat', rating: 4.4, trend: '+12% questa settimana' },
];

function MapPlaceholder() {
  return (
    <div className="relative w-full h-52 md:h-72 rounded-3xl overflow-hidden bg-[#E8F0E9] border border-[#d0dfd1]">
      <svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="280" fill="#EEF4EE" />
        <rect x="0" y="120" width="400" height="16" fill="#D8E8D8" />
        <rect x="160" y="0" width="14" height="280" fill="#D8E8D8" />
        <rect x="60" y="60" width="260" height="10" fill="#DFE8DF" />
        <rect x="0" y="190" width="130" height="10" fill="#DFE8DF" rx="5" />
        <rect x="270" y="50" width="130" height="10" fill="#DFE8DF" rx="5" />
        <rect x="80" y="170" width="60" height="44" rx="6" fill="#C8DCC8" />
        <rect x="260" y="90" width="80" height="55" rx="6" fill="#C8DCC8" />
        <rect x="30" y="50" width="50" height="36" rx="6" fill="#CADACD" />
        <circle cx="167" cy="128" r="12" fill="#F77104" />
        <circle cx="167" cy="128" r="7" fill="white" />
        <circle cx="280" cy="95" r="10" fill="#F98A0E" />
        <circle cx="280" cy="95" r="6" fill="white" />
        <circle cx="95" cy="155" r="9" fill="#CFA865" />
        <circle cx="95" cy="155" r="5" fill="white" />
        <circle cx="320" cy="180" r="8" fill="#F77104" opacity="0.6" />
        <circle cx="320" cy="180" r="4" fill="white" />
      </svg>
      <div className="absolute bottom-3 right-3 bg-white rounded-2xl px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-semibold text-[#F77104]">
        <Navigation size={12} /> La tua posizione
      </div>
      <div className="absolute top-3 left-3 bg-white rounded-2xl px-3 py-1.5 shadow-md text-xs font-bold text-slate-700">
        Roma · Prati
      </div>
    </div>
  );
}

function BottomNav({ active = 'explore' }: { active?: string }) {
  const items = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Esplora' },
    { id: 'scan', icon: QrCode, label: 'Scan' },
    { id: 'saved', icon: Heart, label: 'Salvati' },
    { id: 'profile', icon: User, label: 'Profilo' },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div className="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl shadow-orange-200/50 border border-orange-50">
        {items.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all ${id === active ? 'bg-[#F77104] text-white' : 'text-slate-400 hover:text-[#F77104]'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SideNav() {
  const items = [
    { icon: Home, label: 'Home' },
    { icon: Compass, label: 'Esplora', active: true },
    { icon: MapPin, label: 'Locali' },
    { icon: Heart, label: 'Salvati' },
    { icon: User, label: 'Profilo' },
  ];
  return (
    <aside className="hidden md:flex flex-col gap-2 w-20 items-center py-8 sticky top-0 h-screen border-r border-orange-100 bg-white/80 backdrop-blur shrink-0">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F77104] to-[#F98A0E] flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
        <span className="text-white font-black text-sm">F</span>
      </div>
      {items.map(({ icon: Icon, label, active }) => (
        <button key={label} title={label} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-[#F77104] text-white shadow-md shadow-orange-200' : 'text-slate-400 hover:bg-orange-50 hover:text-[#F77104]'}`}>
          <Icon size={22} />
        </button>
      ))}
    </aside>
  );
}

export function BeerDiscovery() {
  return (
    <div className="min-h-screen bg-[#FFF8F2] font-sans text-slate-800 flex">
      <SideNav />

      <div className="flex-1 overflow-y-auto pb-28 md:pb-8">
        {/* Top Header */}
        <header className="px-5 md:px-8 pt-12 md:pt-8 pb-4 flex justify-between items-start">
          <div>
            <p className="text-sm text-[#F77104] font-semibold uppercase tracking-wider mb-0.5">Fermenta.to</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Buonasera, Marco 👋</h1>
            <p className="text-sm text-slate-500 mt-1">Cosa vuoi assaggiare oggi?</p>
          </div>
          <button className="relative w-11 h-11 rounded-2xl bg-white shadow-sm border border-orange-100 flex items-center justify-center text-slate-500 mt-1">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#F77104] rounded-full" />
          </button>
        </header>

        {/* Search */}
        <div className="px-5 md:px-8 mb-6">
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-orange-100">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none" placeholder="Cerca birra, birrificio, locale..." />
          </div>
        </div>

        {/* Responsive grid: left content + right map */}
        <div className="px-5 md:px-8 md:grid md:grid-cols-5 md:gap-8 md:items-start">

          {/* LEFT COLUMN */}
          <div className="md:col-span-3 space-y-8">

            {/* Consigliati per te */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">Consigliati per te</h2>
                <button className="text-sm text-[#F77104] font-semibold flex items-center gap-0.5">Tutti <ChevronRight size={14} /></button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {beers.map((beer) => (
                  <div key={beer.name} className="shrink-0 w-44 bg-white rounded-3xl shadow-sm border border-orange-50 overflow-hidden">
                    <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${beer.color}22, ${beer.color}55)` }}>
                      <div className="w-16 h-16 rounded-full border-4 border-white/60 shadow-inner flex items-center justify-center text-3xl">🍺</div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-slate-900 truncate">{beer.name}</p>
                      <p className="text-xs text-slate-500 mb-2">{beer.brewery}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${beer.color}22`, color: beer.color }}>{beer.style}</span>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500"><Star size={11} fill="currentColor" />{beer.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* In tendenza */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={18} className="text-[#F77104]" /> In Tendenza</h2>
              </div>
              <div className="space-y-3">
                {trending.map((b) => (
                  <div key={b.name} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl shrink-0">🍻</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.brewery} · {b.style}</p>
                      <p className="text-xs text-[#F77104] font-semibold mt-0.5 flex items-center gap-1"><Flame size={10} /> {b.trend}</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500 shrink-0"><Star size={13} fill="currentColor" />{b.rating}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Locali — shown on mobile only, under map on desktop it's repeated */}
            <section className="md:hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">Locali vicino a te</h2>
                <button className="text-sm text-[#F77104] font-semibold flex items-center gap-0.5">Vedi mappa <ChevronRight size={14} /></button>
              </div>
              <MapPlaceholder />
              <div className="space-y-3 mt-4">
                {venues.map((v) => (
                  <div key={v.name} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-xl shrink-0">🍺</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900">{v.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v.open ? 'Aperto' : 'Chiuso'}</span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5"><MapPin size={10} />{v.distance}</span>
                        <span>{v.beers} birre alla spina</span>
                      </p>
                    </div>
                    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500 shrink-0"><Star size={13} fill="currentColor" />{v.rating}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN — map + venues on desktop */}
          <div className="hidden md:block md:col-span-2 space-y-5 sticky top-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><MapPin size={18} className="text-[#F77104]" /> Locali vicino a te</h2>
              <MapPlaceholder />
            </div>
            <div className="space-y-3">
              {venues.map((v) => (
                <div key={v.name} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50 cursor-pointer hover:border-orange-200 transition-colors">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-xl shrink-0">🍺</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900">{v.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.open ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v.open ? 'Aperto' : 'Chiuso'}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin size={10} />{v.distance}</span>
                      <span>{v.beers} birre alla spina</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500"><Star size={13} fill="currentColor" />{v.rating}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{v.tag}</span>
                  </div>
                </div>
              ))}
              <button className="w-full text-center text-sm text-[#F77104] font-semibold py-2 hover:underline">Mostra tutti i locali →</button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="explore" />
    </div>
  );
}
