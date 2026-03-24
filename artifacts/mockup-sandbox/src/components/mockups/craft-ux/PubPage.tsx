import { useState } from 'react';
import {
  ChevronLeft, Share2, Star, MapPin, Clock, Phone, Globe,
  Home, Compass, QrCode, Heart, User, ChevronRight,
  Instagram, ExternalLink, Navigation, Droplets
} from 'lucide-react';

const tapList = [
  { name: 'Nebbia Rossa', style: 'IPA', abv: '6.2%', brewery: 'Hype Brewing', rating: 4.3, price: '6.50', color: '#F77104' },
  { name: 'Dada', style: 'APA', abv: '5.4%', brewery: 'Revelation Cat', rating: 4.4, price: '5.80', color: '#CFA865' },
  { name: 'Luna Sour', style: 'Sour', abv: '5.0%', brewery: 'Baladin', rating: 4.5, price: '6.00', color: '#E8A838' },
  { name: 'Orso Bruno', style: 'Stout', abv: '7.1%', brewery: 'Birra del Borgo', rating: 4.1, price: '7.00', color: '#5C3D1E' },
  { name: 'Vallée Blanche', style: 'Saison', abv: '6.8%', brewery: 'Extraomnes', rating: 4.7, price: '6.80', color: '#88B04B' },
  { name: 'Rurale', style: 'Witbier', abv: '4.5%', brewery: 'Birrificio Italiano', rating: 4.0, price: '5.50', color: '#D4A843' },
];

const reviews = [
  { user: 'Giulia M.', avatar: 'GM', rating: 5, date: '2 giorni fa', text: 'Selezione fantastica, personale preparato. La Nebbia Rossa alla spina è una poesia. Tornerò sicuro!', reply: 'Grazie Giulia! La Nebbia Rossa è il nostro orgoglio. Ti aspettiamo presto 🍻' },
  { user: 'Marco R.', avatar: 'MR', rating: 4, date: '1 settimana fa', text: 'Bel locale, atmosfera curata. Ottima rotazione delle birre stagionali. Solo il rumore potrebbe essere gestito meglio nelle serate affollate.' },
  { user: 'Francesca T.', avatar: 'FT', rating: 5, date: '2 settimane fa', text: 'Il miglior craft bar di Roma zona Prati. Birre sempre fresche e staff super disponibile nel consigliare gli abbinamenti.' },
];

const hours = [
  { day: 'Lun–Ven', time: '17:00 – 00:00' },
  { day: 'Sabato', time: '15:00 – 01:00' },
  { day: 'Domenica', time: '15:00 – 23:00' },
];

function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div className="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl shadow-orange-200/50 border border-orange-50">
        {[
          { icon: Home, label: 'Home' },
          { icon: Compass, label: 'Esplora' },
          { icon: QrCode, label: 'Scan', active: true },
          { icon: Heart, label: 'Salvati' },
          { icon: User, label: 'Profilo' },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all ${active ? 'bg-[#F77104] text-white' : 'text-slate-400'}`}>
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
    { icon: Compass, label: 'Esplora' },
    { icon: MapPin, label: 'Locali', active: true },
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

function MapMini() {
  return (
    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-[#E8F0E9] border border-[#d0dfd1]">
      <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="160" fill="#EEF4EE" />
        <rect x="0" y="65" width="400" height="12" fill="#D8E8D8" />
        <rect x="180" y="0" width="12" height="160" fill="#D8E8D8" />
        <rect x="0" y="110" width="150" height="8" fill="#DFE8DF" rx="4" />
        <rect x="270" y="30" width="130" height="8" fill="#DFE8DF" rx="4" />
        <rect x="60" y="20" width="70" height="40" rx="6" fill="#C8DCC8" />
        <rect x="260" y="90" width="90" height="50" rx="6" fill="#C8DCC8" />
        <circle cx="186" cy="71" r="14" fill="#F77104" />
        <circle cx="186" cy="71" r="8" fill="white" />
      </svg>
      <div className="absolute bottom-2 right-2 bg-white rounded-xl px-2.5 py-1 shadow-md flex items-center gap-1 text-xs font-semibold text-[#F77104]">
        <Navigation size={10} /> Indicazioni
      </div>
    </div>
  );
}

export function PubPage() {
  const [tab, setTab] = useState<'info' | 'taplist' | 'reviews'>('taplist');
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-screen bg-[#FFF8F2] font-sans text-slate-800 flex">
      <SideNav />

      <div className="flex-1 overflow-y-auto pb-28 md:pb-8">

        {/* Hero */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)' }} />
          </div>
          {/* Top controls */}
          <div className="absolute top-0 left-0 right-0 pt-12 md:pt-6 px-4 flex justify-between items-center z-10">
            <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setSaved(!saved)} className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${saved ? 'bg-[#F77104] text-white' : 'bg-black/20 text-white'}`}>
                <Heart size={18} fill={saved ? 'white' : 'none'} />
              </button>
              <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
                <Share2 size={18} />
              </button>
            </div>
          </div>
          {/* Large pub emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl opacity-30">🍺</span>
          </div>
          {/* Category badge */}
          <div className="absolute bottom-4 left-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">Craft Bar · Tap Room</span>
          </div>
        </div>

        {/* Main card overlapping hero */}
        <div className="-mt-6 relative z-10 mx-0 md:mx-8">
          <div className="bg-white rounded-t-3xl md:rounded-3xl px-5 md:px-8 pt-6 pb-4 shadow-lg">

            {/* Pub name + rating */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">Luppolino Pub</h1>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><MapPin size={13} className="text-[#F77104]" /> Via Sant'Agostino 12, Roma · Prati</p>
              </div>
              <div className="text-center shrink-0">
                <div className="text-3xl font-black text-[#F77104]">4.6</div>
                <div className="flex items-center gap-0.5 justify-center">
                  {[1,2,3,4,5].map(i => <Star key={i} size={10} fill={i <= 4 ? '#F77104' : '#e5e7eb'} className={i <= 4 ? 'text-[#F77104]' : 'text-gray-200'} />)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">218 recensioni</p>
              </div>
            </div>

            {/* Status + quick info pills */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="flex items-center gap-1.5 text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Aperto ora
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-[#F77104] px-3 py-1.5 rounded-full">
                <Droplets size={12} /> 14 birre alla spina
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                <Clock size={12} /> Chiude a 00:00
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#FFF8F2] rounded-2xl p-1">
              {(['taplist', 'info', 'reviews'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white text-[#F77104] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t === 'taplist' ? '🍺 Spina' : t === 'info' ? 'ℹ️ Info' : '⭐ Rec.'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-5 md:px-8 py-5 space-y-3">

            {/* TAPLIST TAB */}
            {tab === 'taplist' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500 font-medium">Aggiornato oggi alle 15:30</p>
                  <button className="text-xs text-[#F77104] font-semibold">Segnala variazione</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tapList.map((beer) => (
                    <div key={beer.name} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50 hover:border-orange-200 transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${beer.color}18` }}>🍺</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{beer.name}</p>
                        <p className="text-xs text-slate-500 truncate">{beer.brewery}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${beer.color}20`, color: beer.color }}>{beer.style}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{beer.abv}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-slate-900">{beer.price}€</p>
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold justify-end"><Star size={10} fill="currentColor" />{beer.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* INFO TAB */}
            {tab === 'info' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
                  <h3 className="font-bold text-sm text-slate-900 mb-3">Orari</h3>
                  {hours.map(({ day, time }) => (
                    <div key={day} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600 font-medium">{day}</span>
                      <span className="text-slate-900 font-semibold">{time}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Contatti</h3>
                  {[
                    { icon: Phone, text: '+39 06 1234 5678' },
                    { icon: Globe, text: 'luppolinopub.it' },
                    { icon: Instagram, text: '@luppolinopub' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#F77104] shrink-0"><Icon size={15} /></div>
                      <span className="text-slate-700 font-medium">{text}</span>
                      <ExternalLink size={12} className="text-slate-400 ml-auto" />
                    </div>
                  ))}
                </div>
                <MapMini />
                <p className="text-xs text-center text-slate-400">Via Sant'Agostino 12 · Roma, Prati</p>
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-black text-[#F77104]">4.6</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={i <= 4 ? '#F77104' : '#e5e7eb'} className={i <= 4 ? 'text-[#F77104]' : 'text-gray-200'} />)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">218 recensioni</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map((s) => {
                      const w = [60,25,10,4,1][5-s];
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-2">{s}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-[#F77104] h-1.5 rounded-full" style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews.map((r) => (
                  <div key={r.user} className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F77104] to-[#F98A0E] flex items-center justify-center text-white font-bold text-sm">
                          {r.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{r.user}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} size={11} fill={i <= r.rating ? '#F77104' : '#e5e7eb'} className={i <= r.rating ? 'text-[#F77104]' : 'text-gray-200'} />)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{r.date}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{r.text}</p>
                    {r.reply && (
                      <div className="mt-3 bg-[#FFF3E0] rounded-xl p-3 border-l-2 border-[#F77104]">
                        <p className="text-xs font-bold text-[#F77104] mb-1">🍺 Risposta del locale</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{r.reply}</p>
                      </div>
                    )}
                  </div>
                ))}

                <button className="w-full bg-white border border-orange-200 rounded-2xl py-4 text-[#F77104] font-bold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                  <Star size={16} fill="#F77104" /> Scrivi una recensione
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
