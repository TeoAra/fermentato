import { 
  ChevronLeft, 
  Share, 
  Star, 
  ChevronRight, 
  Heart, 
  Home, 
  Compass, 
  QrCode, 
  User, 
  Share2,
  Beer
} from 'lucide-react';

export function BeerDetail() {
  return (
    <div className="w-[390px] h-[844px] bg-[#FFF8F2] overflow-y-auto font-['DM_Sans'] relative pb-24 shadow-2xl mx-auto border-[8px] border-zinc-900 rounded-[40px] flex flex-col hide-scrollbar">
      {/* Header Bar */}
      <div className="absolute top-0 w-full z-20 px-4 pt-12 pb-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
          <ChevronLeft size={24} />
        </button>
        <div className="text-white font-bold text-lg tracking-wider">FERMENTA.TO</div>
        <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
          <Share size={20} />
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[320px] bg-gradient-to-tr from-[#F77104] to-[#ff9e44] shrink-0">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 60%)' }}></div>
        <img 
          src="https://images.unsplash.com/photo-1614316047248-cb5fbdf6ee56?auto=format&fit=crop&q=80&w=600" 
          alt="Beer texture"
          className="w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        <div className="absolute bottom-12 left-0 w-full flex justify-center z-10">
          <div className="px-4 py-1.5 bg-white/30 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/40 shadow-lg">
            IPA — American
          </div>
        </div>
      </div>

      {/* Content Container (overlaps hero) */}
      <div className="relative z-10 -mt-6 px-4 flex-1 flex flex-col gap-6">
        
        {/* Beer Info Section */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(247,113,4,0.08)] flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h1 className="text-[28px] font-bold text-gray-900 leading-tight">Nebbia Rossa</h1>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=100&q=80" alt="Brewery logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-gray-800">Birrificio Hype</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-[#FFF3E0] text-[#F77104] rounded-full text-sm font-bold">6.2% ABV</span>
            <span className="px-3 py-1 bg-[#FFF3E0] text-[#F77104] rounded-full text-sm font-bold">45 IBU</span>
            <span className="px-3 py-1 bg-[#FFF3E0] text-[#F77104] rounded-full text-sm font-bold flex items-center gap-1">
              🏆 Gold Medal 2024
            </span>
          </div>

          <div className="flex items-center gap-3 my-1">
            <span className="text-3xl font-extrabold text-gray-900">4.3</span>
            <div className="flex flex-col">
              <div className="flex text-[#F77104]">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" className="opacity-40" />
              </div>
              <span className="text-xs text-gray-500 font-medium">(128 assaggi)</span>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed">
            Un'esplosione di luppoli americani con note di pompelmo, pino e un finale resinoso. Corpo medio e amaro persistente ma bilanciato.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button className="w-full h-14 bg-gradient-to-r from-[#F77104] to-[#FF8C33] text-white rounded-full font-bold text-lg shadow-[0_8px_20px_rgba(247,113,4,0.3)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
            <span className="text-2xl">🍺</span> Segna Assaggio
          </button>
          
          <div className="flex gap-3">
            <button className="flex-1 h-12 bg-white rounded-full font-semibold text-gray-700 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center gap-2 border border-gray-100">
              <Heart size={18} className="text-gray-400" /> Preferita
            </button>
            <button className="flex-1 h-12 bg-white rounded-full font-semibold text-gray-700 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center gap-2 border border-gray-100">
              <Share2 size={18} className="text-gray-400" /> Condividi
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="font-bold text-lg text-gray-900 px-1">Recensioni Recenti</h3>
          
          {/* Review 1 */}
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(247,113,4,0.05)] flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F77104] text-white flex items-center justify-center font-bold">
                  MC
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Marco C.</div>
                  <div className="flex text-[#F77104] gap-0.5 mt-0.5">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium">Ieri</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Fantastica! I profumi agrumati sono incredibili. Perfetta per una serata estiva. Sicuramente una delle mie IPA preferite di quest'anno.
            </p>

            {/* Owner Reply */}
            <div className="mt-2 bg-[#FFF3E0] rounded-[16px] p-4 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F77104]"></div>
              <div className="flex items-center gap-2">
                <Beer size={14} className="text-[#F77104]" />
                <span className="text-xs font-bold text-[#F77104] uppercase tracking-wide">Risposta del birrificio</span>
              </div>
              <p className="text-gray-800 text-sm">
                Grazie Marco! Siamo felicissimi che ti sia piaciuta. Abbiamo usato un nuovo blend di luppoli per questo lotto.
              </p>
            </div>
          </div>

          {/* Review 2 */}
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(247,113,4,0.05)] flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  LA
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Laura A.</div>
                  <div className="flex text-[#F77104] gap-0.5 mt-0.5">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} className="text-gray-300" />
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium">3 gg fa</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Molto buona, l'amaro non è troppo invasivo. Avrei preferito un po' più di corpo, ma nel complesso un'ottima birra.
            </p>
          </div>
        </div>

        {/* Similar Beers */}
        <div className="flex flex-col gap-4 mt-4 mb-8">
          <h3 className="font-bold text-lg text-gray-900 px-1">Birre dello stesso birrificio</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4">
            
            <div className="w-[140px] shrink-0 bg-white rounded-[20px] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col gap-2">
              <div className="w-full h-24 bg-gray-100 rounded-[12px] overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=300&q=80" alt="Lager" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 truncate">Luce Chiara</h4>
                <p className="text-xs text-gray-500">Pilsner • 4.8%</p>
              </div>
            </div>

            <div className="w-[140px] shrink-0 bg-white rounded-[20px] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col gap-2">
              <div className="w-full h-24 bg-gray-100 rounded-[12px] overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1600788886242-5c96aabe3757?auto=format&fit=crop&w=300&q=80" alt="Stout" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 truncate">Notte Nera</h4>
                <p className="text-xs text-gray-500">Stout • 7.5%</p>
              </div>
            </div>

            <div className="w-[140px] shrink-0 bg-white rounded-[20px] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col gap-2">
              <div className="w-full h-24 bg-gray-100 rounded-[12px] overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1566810260655-b778732e4d0d?auto=format&fit=crop&w=300&q=80" alt="APA" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 truncate">Sole Giallo</h4>
                <p className="text-xs text-gray-500">APA • 5.5%</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[340px] h-[64px] bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between px-6 z-50">
        <button className="flex flex-col items-center justify-center gap-1 text-gray-400">
          <Home size={24} />
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-gray-400">
          <Compass size={24} />
        </button>
        <button className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F77104] text-white shadow-[0_4px_15px_rgba(247,113,4,0.4)] -translate-y-2">
          <QrCode size={24} />
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-gray-400">
          <Heart size={24} />
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-gray-400">
          <User size={24} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
