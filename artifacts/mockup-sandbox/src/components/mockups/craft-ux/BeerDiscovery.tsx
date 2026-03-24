import { 
  Bell, 
  Search, 
  Star, 
  Home, 
  Compass, 
  QrCode, 
  Heart, 
  User,
  ChevronRight
} from 'lucide-react';

export function BeerDiscovery() {
  return (
    <div className="w-[390px] h-[844px] bg-[#FFF8F2] mx-auto overflow-y-auto relative font-['DM_Sans'] text-slate-800 shadow-2xl overflow-x-hidden">
      {/* Scrollable Content */}
      <div className="pb-32">
        
        {/* 1. Top Header */}
        <header className="px-6 pt-12 pb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Buonasera, Marco <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Cosa vuoi assaggiare oggi?
              </p>
            </div>
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(247,113,4,0.08)] relative">
              <Bell size={20} className="text-slate-700" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#F77104] rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* 2. Search Bar */}
        <div className="px-6 mt-4">
          <div className="bg-white/80 backdrop-blur-sm border border-orange-100 rounded-full flex items-center px-4 py-3.5 shadow-[0_4px_20px_rgba(247,113,4,0.05)] transition-shadow focus-within:shadow-[0_4px_20px_rgba(247,113,4,0.15)]">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Cerca birra, stile, birrificio..." 
              className="bg-transparent border-none outline-none ml-3 w-full text-sm font-medium placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* 3. Style Filter Chips */}
        <div className="mt-6 pl-6 flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide pr-6">
          {['IPA', 'Lager', 'Saison', 'Stout', 'Weizen', 'Sour'].map((style, idx) => (
            <button 
              key={style}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                idx === 0 
                  ? 'bg-gradient-to-r from-[#F77104] to-[#FFA040] text-white shadow-[0_4px_12px_rgba(247,113,4,0.25)]' 
                  : 'bg-white text-slate-600 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-orange-50'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* 4. Consigliati per te */}
        <section className="mt-8">
          <div className="px-6 flex justify-between items-end">
            <h2 className="text-xl font-bold text-slate-900">Consigliati per te</h2>
            <button className="text-sm font-bold text-[#F77104] flex items-center">
              Vedi tutti <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="mt-4 pl-6 flex gap-4 overflow-x-auto pb-6 scrollbar-hide pr-6">
            {/* Beer Card 1 */}
            <div className="w-[160px] shrink-0 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(247,113,4,0.10)] p-2">
              <div className="h-[140px] rounded-[18px] bg-gradient-to-tr from-[#F77104] to-[#FFC580] relative overflow-hidden flex items-center justify-center">
                {/* Decorative abstract shapes for the placeholder image */}
                <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/20 blur-md"></div>
                <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/5 blur-md"></div>
                <div className="w-8 h-24 bg-white/30 rounded-full blur-sm rotate-12"></div>
                
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star size={10} className="text-[#F77104] fill-[#F77104]" />
                  <span className="text-[10px] font-bold text-slate-800">4.5</span>
                </div>
              </div>
              <div className="p-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#F77104] bg-orange-100/50 px-2 py-0.5 rounded-full inline-block mb-1">IPA</span>
                <h3 className="font-bold text-[15px] leading-tight text-slate-900 truncate">Luppolo Spaziale</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">Birrificio Galattico</p>
              </div>
            </div>

            {/* Beer Card 2 */}
            <div className="w-[160px] shrink-0 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(247,113,4,0.06)] p-2">
              <div className="h-[140px] rounded-[18px] bg-gradient-to-tr from-amber-400 to-yellow-200 relative overflow-hidden flex items-center justify-center">
                <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-white/20 blur-lg"></div>
                <div className="w-10 h-20 bg-black/10 rounded-full blur-md -rotate-12"></div>
                
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star size={10} className="text-[#F77104] fill-[#F77104]" />
                  <span className="text-[10px] font-bold text-slate-800">4.2</span>
                </div>
              </div>
              <div className="p-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full inline-block mb-1">Saison</span>
                <h3 className="font-bold text-[15px] leading-tight text-slate-900 truncate">Raggio di Sole</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">Agricola Chiara</p>
              </div>
            </div>

            {/* Beer Card 3 */}
            <div className="w-[160px] shrink-0 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(247,113,4,0.06)] p-2">
              <div className="h-[140px] rounded-[18px] bg-gradient-to-tr from-slate-800 to-slate-500 relative overflow-hidden flex items-center justify-center">
                <div className="absolute left-0 bottom-0 w-24 h-24 rounded-full bg-white/10 blur-md"></div>
                <div className="w-12 h-16 bg-black/30 rounded-full blur-md rotate-45"></div>
                
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star size={10} className="text-[#F77104] fill-[#F77104]" />
                  <span className="text-[10px] font-bold text-slate-800">4.8</span>
                </div>
              </div>
              <div className="p-2 mt-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block mb-1">Stout</span>
                <h3 className="font-bold text-[15px] leading-tight text-slate-900 truncate">Notte Fondente</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">Mastro Birraio</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. In Tendenza */}
        <section className="mt-2 px-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">In Tendenza</h2>
          <div className="flex flex-col gap-3">
            
            {/* List Item 1 */}
            <div className="bg-white p-2.5 rounded-[20px] shadow-[0_4px_20px_rgba(247,113,4,0.06)] flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-gradient-to-br from-[#F77104]/80 to-amber-300 flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full flex items-center justify-center font-bold text-white/50 text-2xl italic">#1</div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Amber Ale</span>
                <h3 className="font-bold text-[15px] leading-tight text-slate-900 truncate mt-0.5">Ambrata Delizia</h3>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5 truncate">Birra Viva</p>
              </div>
              <div className="px-3 py-1.5 bg-orange-50 rounded-xl flex items-center gap-1 mr-1">
                <Star size={12} className="text-[#F77104] fill-[#F77104]" />
                <span className="text-xs font-bold text-[#F77104]">4.4</span>
              </div>
            </div>

            {/* List Item 2 */}
            <div className="bg-white p-2.5 rounded-[20px] shadow-[0_4px_20px_rgba(247,113,4,0.06)] flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-gradient-to-br from-yellow-300 to-yellow-100 flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                <div className="w-full h-full flex items-center justify-center font-bold text-black/10 text-2xl italic">#2</div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-yellow-600">Pilsner</span>
                <h3 className="font-bold text-[15px] leading-tight text-slate-900 truncate mt-0.5">Fresca Estate</h3>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5 truncate">Sorgente</p>
              </div>
              <div className="px-3 py-1.5 bg-orange-50 rounded-xl flex items-center gap-1 mr-1">
                <Star size={12} className="text-[#F77104] fill-[#F77104]" />
                <span className="text-xs font-bold text-[#F77104]">4.1</span>
              </div>
            </div>

          </div>
        </section>

        {/* 6. Scopri per Stile */}
        <section className="mt-8 px-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Scopri per Stile</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-[20px] bg-gradient-to-br from-[#F77104] to-orange-400 p-4 flex flex-col justify-end relative overflow-hidden shadow-sm">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/20 blur-lg"></div>
              <h3 className="text-white font-bold text-lg z-10">IPA</h3>
              <p className="text-white/80 text-xs font-medium z-10 mt-0.5">142 birre</p>
            </div>
            
            <div className="h-28 rounded-[20px] bg-gradient-to-br from-amber-400 to-yellow-400 p-4 flex flex-col justify-end relative overflow-hidden shadow-sm">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/30 blur-lg"></div>
              <h3 className="text-amber-900 font-bold text-lg z-10">Lager</h3>
              <p className="text-amber-800/80 text-xs font-medium z-10 mt-0.5">85 birre</p>
            </div>
            
            <div className="h-28 rounded-[20px] bg-gradient-to-br from-slate-800 to-slate-600 p-4 flex flex-col justify-end relative overflow-hidden shadow-sm">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 blur-lg"></div>
              <h3 className="text-white font-bold text-lg z-10">Stout</h3>
              <p className="text-slate-300 text-xs font-medium z-10 mt-0.5">43 birre</p>
            </div>
            
            <div className="h-28 rounded-[20px] bg-gradient-to-br from-yellow-500 to-yellow-300 p-4 flex flex-col justify-end relative overflow-hidden shadow-sm">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/30 blur-lg"></div>
              <h3 className="text-yellow-900 font-bold text-lg z-10">Weizen</h3>
              <p className="text-yellow-900/70 text-xs font-medium z-10 mt-0.5">67 birre</p>
            </div>
          </div>
        </section>

      </div>

      {/* 7. Floating Bottom Navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[342px] bg-white rounded-full shadow-[0_8px_30px_rgba(247,113,4,0.15)] px-6 py-4 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors">
          <Home size={22} strokeWidth={2.5} />
        </button>
        <button className="flex flex-col items-center gap-1 text-[#F77104]">
          <Compass size={22} strokeWidth={2.5} className="drop-shadow-[0_2px_4px_rgba(247,113,4,0.3)]" />
          <span className="text-[10px] font-bold mt-0.5">Esplora</span>
        </button>
        <button className="flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-br from-[#F77104] to-[#FFA040] rounded-full text-white shadow-[0_4px_12px_rgba(247,113,4,0.3)] -mt-8 border-4 border-[#FFF8F2]">
          <QrCode size={20} strokeWidth={2.5} />
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors">
          <Heart size={22} strokeWidth={2.5} />
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors">
          <User size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Global styles for hiding scrollbar but keeping functionality */}
      <style dangerouslySetInline={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        @keyframes wave {
          0% { transform: rotate(0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate(0.0deg) }
          100% { transform: rotate(0.0deg) }
        }
        .animate-wave {
          animation: wave 2s infinite;
          transform-origin: 70% 70%;
        }
      `}} />
    </div>
  );
}
