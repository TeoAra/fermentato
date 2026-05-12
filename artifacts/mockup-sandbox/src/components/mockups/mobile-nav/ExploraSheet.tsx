import React from 'react';
import { Home, Compass, Search, User, Bell, MapPin } from 'lucide-react';

export function ExploraSheet() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900 p-4 font-sans">
      <div className="w-[390px] h-[780px] bg-neutral-50 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl ring-8 ring-neutral-800">
        {/* Status Bar space */}
        <div className="h-12 w-full bg-white flex items-end justify-between px-6 pb-2 shrink-0 z-20">
          <div className="text-xs font-semibold text-black">9:41</div>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-3 bg-black rounded-sm"></div>
            <div className="w-3 h-3 bg-black rounded-full"></div>
            <div className="w-5 h-3 bg-black rounded-sm"></div>
          </div>
        </div>

        {/* Header */}
        <div className="h-[56px] bg-white border-b border-neutral-100 flex items-center justify-between px-4 shrink-0 z-20">
          <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden">
            <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="font-bold text-lg tracking-tight" style={{ color: '#0F0F10' }}>Fermenta.to</div>
          <div className="relative">
            <Bell className="w-6 h-6 text-neutral-600" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#E87722' }}>
              3
            </div>
          </div>
        </div>

        {/* Chip Row */}
        <div className="bg-white px-4 py-3 shrink-0 z-10 shadow-[0_4px_10px_rgba(0,0,0,0.02)] relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="px-4 py-1.5 rounded-full border border-neutral-200 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-neutral-600">
              <span>🍺</span> Birre
            </div>
            <div className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-white" style={{ backgroundColor: '#E87722' }}>
              <span>🏭</span> Birrifici
            </div>
            <div className="px-4 py-1.5 rounded-full border border-neutral-200 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-neutral-600">
              <span>🍻</span> Pub
            </div>
            <div className="px-4 py-1.5 rounded-full border border-neutral-200 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 text-neutral-600">
              <span>🎉</span> Festival
            </div>
          </div>
        </div>

        {/* Content - Brewery List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
          {[
            { name: "CRAK Brewery", city: "Campodarsego, PD", style: "Modern Craft", rating: 4.8 },
            { name: "Birrificio Italiano", city: "Lurago Marinone, CO", style: "Traditional", rating: 4.9 },
            { name: "Ca' del Brado", city: "Osteria Grande, BO", style: "Wild Ales", rating: 4.7 },
            { name: "Ritual Lab", city: "Formello, RM", style: "Sour Ales", rating: 4.6 },
            { name: "Lambrate", city: "Milano, MI", style: "Classic", rating: 4.5 }
          ].map((brewery, i) => (
            <div key={i} className="bg-white p-3 rounded-2xl flex gap-3 items-center shadow-sm border border-neutral-100">
              <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200 text-2xl">
                🏭
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-neutral-900 truncate">{brewery.name}</h3>
                <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{brewery.city}</span>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  {brewery.style} • ⭐ {brewery.rating}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Nav */}
        <div className="bg-white rounded-b-[40px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pt-2 pb-[20px] px-2 flex justify-between shrink-0 relative z-30 h-[84px]">
          <div className="flex-1 flex flex-col items-center justify-center gap-1 text-neutral-400 py-1 h-[48px]">
            <Home className="w-6 h-6" />
            <span className="text-[11px] font-medium">Home</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-1 h-[48px] relative" style={{ color: '#E87722' }}>
            <Compass className="w-6 h-6" />
            <span className="text-[11px] font-medium">Scopri</span>
            <div className="absolute -bottom-[20px] w-8 h-[3px] rounded-t-full" style={{ backgroundColor: '#E87722' }}></div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-1 text-neutral-400 py-1 h-[48px]">
            <Search className="w-6 h-6" />
            <span className="text-[11px] font-medium">Cerca</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-1 text-neutral-400 py-1 h-[48px]">
            <User className="w-6 h-6" />
            <span className="text-[11px] font-medium">Account</span>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full z-40"></div>
      </div>
      
      {/* Hide scrollbar styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
