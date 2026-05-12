import React from "react";
import { Bell, Home, Beer, Factory, Users, User, Search, ChevronRight } from "lucide-react";

export function FloatingBar() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black overflow-hidden font-sans">
      {/* iPhone Mockup Container */}
      <div 
        className="relative w-[390px] h-[780px] bg-[#0F0F10] rounded-[48px] shadow-2xl overflow-hidden border-[8px] border-[#1C1C1E]"
        style={{
          boxShadow: "0 0 0 1px #333, 0 20px 40px -10px rgba(0,0,0,0.8)"
        }}
      >
        {/* Status Bar Space */}
        <div className="h-[44px] w-full flex items-end justify-between px-6 pb-2 text-white/90 text-xs font-semibold z-50 relative">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-3 bg-white/90 rounded-sm"></div>
            <div className="w-3 h-3 bg-white/90 rounded-full"></div>
            <div className="w-5 h-2.5 bg-white/90 rounded-[2px] border border-white/90"></div>
          </div>
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-black rounded-full z-50"></div>

        {/* Header */}
        <header className="absolute top-[44px] left-0 right-0 h-[52px] flex items-center justify-between px-6 z-40 bg-[#0F0F10]/80 backdrop-blur-md border-b border-white/5">
          <div className="w-6"></div> {/* Spacer for centering */}
          <h1 className="text-xl font-black text-[#E87722] tracking-tight">Fermenta.to</h1>
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/80">
            <Bell size={18} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="absolute inset-0 top-[96px] pb-[160px] overflow-y-auto hide-scrollbar">
          
          {/* Hero Banner */}
          <div className="mx-4 mt-4 p-6 rounded-3xl bg-gradient-to-br from-[#E87722] to-[#B35612] relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 text-white/20">
              <Beer size={120} strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 leading-tight relative z-10 w-[80%]">
              Scopri la tua prossima birra preferita
            </h2>
            <button className="mt-4 bg-white text-[#E87722] px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 shadow-lg shadow-orange-900/20">
              Esplora ora <ChevronRight size={16} />
            </button>
          </div>

          {/* Section Title */}
          <div className="px-6 mt-8 mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Esplora Birre</h3>
            <span className="text-sm text-[#E87722] font-medium">Vedi tutte</span>
          </div>

          {/* Cards List */}
          <div className="px-4 flex flex-col gap-4">
            {/* Card 1 */}
            <div className="bg-[#1C1C1E] p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-3xl">
                🍺
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#E87722] mb-1">INDIA PALE ALE</div>
                <h4 className="text-white font-semibold mb-1">Hazy & Hoppy</h4>
                <p className="text-stone-400 text-xs">Agrumata, amara, profumata</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1C1C1E] p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-stone-800 to-black flex items-center justify-center text-3xl border border-white/5">
                ☕
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-stone-400 mb-1">STOUT & PORTER</div>
                <h4 className="text-white font-semibold mb-1">Dark & Roasted</h4>
                <p className="text-stone-400 text-xs">Caffè, cioccolato, tostatura</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1C1C1E] p-4 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500/20 to-green-500/20 flex items-center justify-center text-3xl">
                🍋
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#E87722] mb-1">SOUR ALE</div>
                <h4 className="text-white font-semibold mb-1">Tart & Funky</h4>
                <p className="text-stone-400 text-xs">Acida, fruttata, rinfrescante</p>
              </div>
            </div>
            
             {/* Card 4 */}
             <div className="bg-[#1C1C1E] p-4 rounded-2xl flex items-center gap-4 border border-white/5 opacity-50">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-200/10 to-amber-200/10 flex items-center justify-center text-3xl">
                🌾
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-stone-400 mb-1">BELGIAN ALE</div>
                <h4 className="text-white font-semibold mb-1">Spicy & Complex</h4>
                <p className="text-stone-400 text-xs">Spezie, lievito, dolcezza</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating UI Elements (Bottom) */}
        <div className="absolute bottom-[24px] left-0 right-0 flex flex-col items-center pointer-events-none">
          
          {/* Floating Search Button */}
          <button className="pointer-events-auto mb-4 bg-[rgba(30,30,32,0.85)] backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-black/50 transition-transform active:scale-95">
            <Search size={16} className="text-white/80" />
            <span className="text-white font-medium text-sm">Cerca una birra</span>
          </button>

          {/* Main Floating Nav Bar */}
          <nav className="pointer-events-auto w-[280px] h-[60px] bg-[rgba(20,20,22,0.85)] backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-between px-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            
            <button className="w-[50px] h-[44px] flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-[#E87722] rounded-full scale-100 transition-transform"></div>
              <Home size={22} className="text-white relative z-10" strokeWidth={2.5} />
            </button>

            <button className="w-[50px] h-[44px] flex items-center justify-center relative group">
              <Beer size={22} className="text-stone-400 group-hover:text-white transition-colors" strokeWidth={2} />
            </button>

            <button className="w-[50px] h-[44px] flex items-center justify-center relative group">
              <Factory size={22} className="text-stone-400 group-hover:text-white transition-colors" strokeWidth={2} />
            </button>

            <button className="w-[50px] h-[44px] flex items-center justify-center relative group">
              <Users size={22} className="text-stone-400 group-hover:text-white transition-colors" strokeWidth={2} />
            </button>

            <button className="w-[50px] h-[44px] flex items-center justify-center relative group">
              <User size={22} className="text-stone-400 group-hover:text-white transition-colors" strokeWidth={2} />
            </button>

          </nav>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white rounded-full z-50"></div>
        
      </div>
      
      {/* Styles for scrollbar hiding */}
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
