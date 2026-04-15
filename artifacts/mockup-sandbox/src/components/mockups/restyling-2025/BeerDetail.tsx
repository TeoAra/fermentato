import React, { useState } from 'react';
import { ChevronLeft, Share2, Home, Bell, Search, ScanLine, Activity, User, Star, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export function BeerDetail() {
  const [descExpanded, setDescExpanded] = useState(false);

  return (
    <div className="w-[390px] min-h-[844px] bg-[#f5f0eb] flex flex-col font-['Poppins',sans-serif] text-[#1c1209] overflow-y-auto overflow-x-hidden pb-24 relative shadow-[0_0_40px_rgba(0,0,0,0.1)]">
      {/* Google Fonts */}
      <style dangerouslySetInlineStyle={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
      `}} />

      {/* Top Bar */}
      <div className="h-14 bg-white flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
        <button className="p-2 -ml-2 text-[#1c1209]">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-[15px]">Dettaglio Birra</span>
        <button className="p-2 -mr-2 text-[#1c1209]">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Image */}
      <div className="w-full h-[220px]">
        <img 
          src="https://placehold.co/390x220/d4a96a/1c1209?text=Nebbia+IPA" 
          alt="Nebbia IPA" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-t-[24px] -mt-4 relative z-10 px-5 pt-6 pb-6 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
        <h1 className="font-['Fraunces',serif] text-[26px] font-bold leading-tight mb-1 text-[#1c1209]">
          Nebbia IPA
        </h1>
        
        <button className="text-[#ea580c] font-semibold text-[15px] mb-4 flex items-center">
          Birrificio del Ducato
          <span className="ml-1 text-lg leading-none">→</span>
        </button>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-white border border-[#e8e0d4] rounded-full text-[13px] font-medium text-[#7c6e5a]">
            India Pale Ale
          </span>
          <span className="px-3 py-1 bg-white border border-[#e8e0d4] rounded-full text-[13px] font-bold text-[#1c1209]">
            6.2% ABV
          </span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center text-[#d4a96a]">
            <span className="font-bold text-[16px] mr-1 text-[#1c1209]">4.3</span>
            <Star className="w-4 h-4 fill-current" />
          </div>
          <span className="text-[13px] text-[#7c6e5a]">(1.247 assaggi)</span>
        </div>

        {/* Stat Chips */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#f5f0eb] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#7c6e5a] font-medium uppercase tracking-wider mb-1">IBU</span>
            <span className="font-bold text-[16px] text-[#1c1209]">55</span>
          </div>
          <div className="bg-[#f5f0eb] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#7c6e5a] font-medium uppercase tracking-wider mb-1">SRM</span>
            <span className="font-bold text-[16px] text-[#1c1209]">8</span>
          </div>
          <div className="bg-[#f5f0eb] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#7c6e5a] font-medium uppercase tracking-wider mb-1">OG</span>
            <span className="font-bold text-[16px] text-[#1c1209]">1.062</span>
          </div>
        </div>

        {/* CTA */}
        <button className="w-full bg-[#ea580c] text-white rounded-xl py-3.5 font-semibold text-[15px] shadow-sm active:scale-[0.98] transition-transform">
          Aggiungi assaggio
        </button>
      </div>

      {/* Descrizione Section */}
      <div className="px-5 py-6">
        <h2 className="font-['Fraunces',serif] text-[18px] font-bold text-[#1c1209] mb-3">
          Descrizione
        </h2>
        <div className="text-[14px] leading-relaxed text-[#7c6e5a]">
          <p className={descExpanded ? "" : "line-clamp-3"}>
            Una India Pale Ale dal colore dorato intenso con riflessi aranciati e una schiuma bianca, fine e persistente. Al naso esplode con un bouquet tropicale di mango, frutto della passione e ananas, seguito da note agrumate di pompelmo e un leggero tocco resinoso dato dal dry hopping generoso. In bocca l'attacco è morbido e maltato, con sentori di biscotto e caramello che bilanciano perfettamente l'amaro finale, netto e pulito. Un corpo medio e una carbonazione vivace la rendono estremamente beverina, nascondendo bene i suoi 6.2 gradi.
          </p>
          <button 
            onClick={() => setDescExpanded(!descExpanded)}
            className="text-[#ea580c] font-medium mt-1 flex items-center"
          >
            {descExpanded ? (
              <>Meno dettagli <ChevronUp className="w-4 h-4 ml-1" /></>
            ) : (
              <>Leggi tutto <ChevronDown className="w-4 h-4 ml-1" /></>
            )}
          </button>
        </div>
      </div>

      {/* Dove Trovarla Section */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Fraunces',serif] text-[18px] font-bold text-[#1c1209]">
            Dove trovarla
          </h2>
          <button className="text-[13px] font-medium text-[#ea580c]">Vedi mappa</button>
        </div>

        <div className="space-y-3">
          {/* Pub Card 1 */}
          <div className="bg-white p-4 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5f0eb] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#7c6e5a]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] text-[#1c1209] truncate">Luppolo Station</h3>
              <p className="text-[13px] text-[#7c6e5a] mb-2 truncate">Via Flaminia 12, Roma</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#f0f9ff] text-[#0369a1] text-[11px] font-bold rounded">1.2 km</span>
                <span className="px-2 py-0.5 bg-[#f5f0eb] text-[#7c6e5a] text-[11px] font-medium rounded">Alla spina</span>
              </div>
            </div>
          </div>

          {/* Pub Card 2 */}
          <div className="bg-white p-4 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5f0eb] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#7c6e5a]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] text-[#1c1209] truncate">Pork'n'Roll</h3>
              <p className="text-[13px] text-[#7c6e5a] mb-2 truncate">Via Carlo Caneva 15, Roma</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#f0f9ff] text-[#0369a1] text-[11px] font-bold rounded">3.4 km</span>
                <span className="px-2 py-0.5 bg-[#f5f0eb] text-[#7c6e5a] text-[11px] font-medium rounded">In lattina</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-[390px] h-[80px] bg-white border-t border-[#e8e0d4] flex justify-around items-center px-2 pb-5 z-50">
        <div className="flex flex-col items-center justify-center w-14 gap-1">
          <Home className="w-6 h-6 text-[#9e8d78]" strokeWidth={2} />
          <span className="text-[9px] text-[#9e8d78] font-medium">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center w-14 gap-1">
          <Bell className="w-6 h-6 text-[#9e8d78]" strokeWidth={2} />
          <span className="text-[9px] text-[#9e8d78] font-medium">Notifiche</span>
        </div>
        <div className="flex flex-col items-center justify-center w-14 gap-1">
          <Search className="w-6 h-6 text-[#9e8d78]" strokeWidth={2} />
          <span className="text-[9px] text-[#9e8d78] font-medium">Cerca</span>
        </div>
        <div className="flex flex-col items-center justify-center w-14 gap-1 relative -top-3">
          <div className="w-12 h-12 bg-[#1c1209] rounded-full flex items-center justify-center shadow-lg">
            <ScanLine className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center w-14 gap-1">
          <Activity className="w-6 h-6 text-[#ea580c]" strokeWidth={2.5} />
          <span className="text-[9px] text-[#ea580c] font-bold">Attività</span>
        </div>
        <div className="flex flex-col items-center justify-center w-14 gap-1">
          <User className="w-6 h-6 text-[#9e8d78]" strokeWidth={2} />
          <span className="text-[9px] text-[#9e8d78] font-medium">Profilo</span>
        </div>
      </div>
    </div>
  );
}
