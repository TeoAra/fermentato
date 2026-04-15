import React from "react";
import { 
  Search, 
  MapPin, 
  Heart, 
  Star, 
  Home, 
  Bell, 
  ScanLine, 
  Activity, 
  User 
} from "lucide-react";

export function HomeFeed() {
  return (
    <div 
      className="relative overflow-y-auto"
      style={{
        width: "390px",
        minHeight: "844px",
        background: "#f5f0eb",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Top Bar */}
      <div className="bg-white h-14 flex items-center justify-between px-4 sticky top-0 z-10 border-b border-[#e8e0d4]">
        <div 
          className="text-[22px] text-[#1c1209]" 
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700 }}
        >
          Fermenta.to
        </div>
        <div className="flex items-center gap-4">
          <Search size={20} color="#1c1209" />
          <div className="bg-[#e8e0d4] text-[#1c1209] rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
            MR
          </div>
        </div>
      </div>

      {/* Location Row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="bg-[#e8e0d4] text-[#1c1209] px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
          <MapPin size={14} />
          Milano, IT
        </div>
        <button className="text-[#ea580c] text-sm font-medium">
          Cambia
        </button>
      </div>

      {/* In evidenza */}
      <div className="mt-2 mb-6">
        <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {/* Card 1 */}
          <div className="min-w-[280px] bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden snap-start">
            <img 
              src="https://placehold.co/600x400/e8e0d4/1c1209?text=Lambic+Festival" 
              alt="Cover" 
              className="h-[160px] w-full object-cover"
            />
            <div className="p-3">
              <h3 className="font-semibold text-[#1c1209] text-base mb-1">Lambiczoon Milano</h3>
              <div className="text-xs text-[#7c6e5a] flex items-center gap-1">
                <span className="text-[#ea580c]">🔴</span> Aperto · 12 birre alla spina
              </div>
            </div>
          </div>
          {/* Card 2 */}
          <div className="min-w-[280px] bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden snap-start">
            <img 
              src="https://placehold.co/600x400/d4c5b0/1c1209?text=Tap+Takeover" 
              alt="Cover" 
              className="h-[160px] w-full object-cover"
            />
            <div className="p-3">
              <h3 className="font-semibold text-[#1c1209] text-base mb-1">Pils Pub</h3>
              <div className="text-xs text-[#7c6e5a] flex items-center gap-1">
                <span className="text-[#ea580c]">🔴</span> Aperto · 8 birre alla spina
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Birre in zona */}
      <div className="mb-6">
        <div className="px-4 py-2 flex items-center justify-between mb-2">
          <h2 
            className="text-[20px] text-[#1c1209]"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700 }}
          >
            Birre in zona
          </h2>
          <button className="text-[#7c6e5a] text-sm flex items-center gap-1">
            Vedi tutte &rarr;
          </button>
        </div>
        
        <div className="px-4 flex flex-col gap-3">
          {[
            { name: "Spaceman", brewery: "BrewFist", style: "IPA", rating: 4.5 },
            { name: "Kikka", brewery: "Birrificio Italiano", style: "Pilsner", rating: 4.2 },
            { name: "Super", brewery: "Baladin", style: "Belgian Strong Ale", rating: 4.8 }
          ].map((beer, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex items-center gap-3">
              <img 
                src={`https://placehold.co/112x112/e8e0d4/1c1209?text=${beer.name[0]}`} 
                alt={beer.name} 
                className="w-14 h-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold text-[#1c1209] text-sm">{beer.name}</div>
                <div className="text-[#7c6e5a] text-xs">{beer.brewery}</div>
                <div className="border border-[#e8e0d4] px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider text-[#7c6e5a] inline-block mt-1 bg-white">
                  {beer.style}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Heart size={18} color="#e8e0d4" />
                <div className="flex items-center gap-0.5">
                  <Star size={12} fill="#d97706" color="#d97706" />
                  <span className="text-xs font-medium text-[#1c1209]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                    {beer.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pub vicini */}
      <div className="mb-24">
        <div className="px-4 py-2 mb-2">
          <h2 
            className="text-[20px] text-[#1c1209]"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700 }}
          >
            Pub vicini
          </h2>
        </div>
        
        <div className="px-4 flex flex-col gap-3">
          {[
            { name: "Hop Milano", distance: "400m", status: "Aperto" },
            { name: "Bere Buona Birra", distance: "1.2km", status: "Chiuso" }
          ].map((pub, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex items-center gap-3">
              <img 
                src={`https://placehold.co/96x96/d4c5b0/1c1209?text=${pub.name[0]}`} 
                alt={pub.name} 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold text-[#1c1209] text-sm mb-1">{pub.name}</div>
                <div className="flex items-center gap-2">
                  <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium">
                    {pub.distance}
                  </span>
                  <span className="text-[#7c6e5a] text-xs">
                    {pub.status === "Aperto" ? "🔴 Aperto ora" : "⚪ Chiuso"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-[390px] bg-white/90 backdrop-blur-xl border-t border-[#e8e0d4] flex items-center justify-around h-[84px] pb-5 px-2 z-20">
        <button className="flex flex-col items-center gap-1 w-12">
          <Home size={24} color="#ea580c" />
          <span className="text-[9px] font-medium text-[#ea580c]">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-12">
          <Bell size={24} color="#9e8d78" />
          <span className="text-[9px] font-medium text-[#9e8d78]">Notifiche</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-12">
          <Search size={24} color="#9e8d78" />
          <span className="text-[9px] font-medium text-[#9e8d78]">Cerca</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-12 relative -top-3">
          <div className="bg-[#ea580c] w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
            <ScanLine size={24} />
          </div>
          <span className="text-[9px] font-medium text-[#9e8d78] mt-1">Scan</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-12">
          <Activity size={24} color="#9e8d78" />
          <span className="text-[9px] font-medium text-[#9e8d78]">Attività</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-12">
          <User size={24} color="#9e8d78" />
          <span className="text-[9px] font-medium text-[#9e8d78]">Profilo</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
