import React from "react";
import { SlidersHorizontal, Search, Home, Bell, ScanLine, Activity, User, ChevronRight } from "lucide-react";

export function Explore() {
  const styles = [
    { name: "India Pale Ale", emoji: "🍺", img: "https://placehold.co/40x40/e2d4c4/7c6e5a?text=IPA" },
    { name: "Stout", emoji: "🖤", img: "https://placehold.co/40x40/2d1b0e/f5f0eb?text=ST" },
    { name: "Saison", emoji: "🌾", img: "https://placehold.co/40x40/e2d4c4/7c6e5a?text=SA" },
    { name: "Wit Bier", emoji: "🌿", img: "https://placehold.co/40x40/e2d4c4/7c6e5a?text=WIT" },
    { name: "Lager", emoji: "🇩🇪", img: "https://placehold.co/40x40/e2d4c4/7c6e5a?text=LAG" },
    { name: "Barleywine", emoji: "🔥", img: "https://placehold.co/40x40/2d1b0e/f5f0eb?text=BW" },
    { name: "Sour", emoji: "🍋", img: "https://placehold.co/40x40/e2d4c4/7c6e5a?text=SOU" },
    { name: "Porter", emoji: "🌑", img: "https://placehold.co/40x40/2d1b0e/f5f0eb?text=POR" },
  ];

  const breweries = [
    { name: "Birrificio del Ducato", city: "Parma", beers: "34 birre", img: "https://placehold.co/64x64/e2d4c4/7c6e5a?text=BDD" },
    { name: "Baladin", city: "Cuneo", beers: "56 birre", img: "https://placehold.co/64x64/e2d4c4/7c6e5a?text=BAL" },
    { name: "Opperbacco", city: "Loreto Aprutino", beers: "22 birre", img: "https://placehold.co/64x64/e2d4c4/7c6e5a?text=OPP" },
  ];

  return (
    <div className="relative w-[390px] min-h-[844px] bg-[#f5f0eb] text-[#1c1209] overflow-hidden font-['Poppins',sans-serif]">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white px-5 pt-14 pb-3 flex items-center justify-between shadow-sm">
        <h1 className="font-['Fraunces',serif] text-[22px] font-semibold tracking-tight">Esplora</h1>
        <button className="p-2 -mr-2 text-[#1c1209]">
          <SlidersHorizontal size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="px-5 py-4 pb-28 h-full overflow-y-auto no-scrollbar space-y-8">
        
        {/* Search */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c6e5a]">
            <Search size={20} strokeWidth={2} />
          </div>
          <input 
            type="text" 
            placeholder="Cerca birra, pub, birrificio..." 
            className="w-full bg-white border border-[#e2d4c4] rounded-xl py-3 pl-11 pr-4 text-[15px] outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] placeholder-[#9e8d78] transition-all shadow-sm"
          />
        </div>

        {/* Stili di birra */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Fraunces',serif] text-[20px] font-bold">Stili di birra</h2>
            <button className="text-[#ea580c] text-[14px] font-medium flex items-center gap-0.5">
              16 stili <ChevronRight size={16} />
            </button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5 pb-4 pt-1 no-scrollbar">
            <div className="grid grid-rows-2 grid-flow-col gap-3 w-max">
              {styles.map((style, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm p-2 pr-4 flex items-center gap-3 w-[160px] active:scale-95 transition-transform">
                  <img src={style.img} alt={style.name} className="w-10 h-10 rounded-lg object-cover bg-[#f5f0eb]" />
                  <span className="text-[13px] font-semibold leading-tight line-clamp-2">
                    {style.name} {style.emoji}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Birrifici italiani */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Fraunces',serif] text-[20px] font-bold">Birrifici italiani</h2>
            <button className="text-[#ea580c]">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5 pb-4 pt-1 no-scrollbar">
            <div className="flex gap-4 w-max">
              {breweries.map((brewery, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm p-4 w-[160px] flex flex-col items-center text-center active:scale-95 transition-transform">
                  <img src={brewery.img} alt={brewery.name} className="w-16 h-16 rounded-full mb-3 object-cover shadow-sm" />
                  <h3 className="text-[15px] font-semibold leading-tight mb-1">{brewery.name}</h3>
                  <p className="text-[13px] text-[#7c6e5a] mb-3">{brewery.city}</p>
                  <span className="bg-[#f5f0eb] text-[#1c1209] text-[11px] font-medium px-3 py-1 rounded-full w-full">
                    {brewery.beers}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Festival e eventi */}
        <section>
          <h2 className="font-['Fraunces',serif] text-[20px] font-bold mb-4">Festival e eventi</h2>
          <div className="overflow-x-auto -mx-5 px-5 pb-4 pt-1 no-scrollbar">
            <div className="flex gap-4 w-max">
              {[1, 2].map((_, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden w-[240px] h-[140px] shadow-sm active:scale-95 transition-transform">
                  <img 
                    src={`https://placehold.co/240x140/2d1b0e/f5f0eb?text=BirrExpo+2025`} 
                    alt="Event" 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1209]/80 to-transparent flex flex-col justify-end p-4">
                    <span className="bg-[#ea580c] text-white text-[10px] font-bold px-2.5 py-1 rounded-full w-max mb-2 uppercase tracking-wide">
                      12-14 Maggio
                    </span>
                    <h3 className="font-['Fraunces',serif] text-white text-[18px] font-medium leading-tight">
                      BirrExpo 2025
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-[#e2d4c4]/50 pb-safe pt-3 px-6 pb-6 flex items-center justify-between z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {[
          { icon: Home, active: false },
          { icon: Bell, active: false },
          { icon: Search, active: true },
          { icon: ScanLine, active: false },
          { icon: Activity, active: false },
          { icon: User, active: false },
        ].map((item, i) => (
          <button key={i} className={`flex flex-col items-center justify-center w-10 h-10 rounded-full transition-colors ${item.active ? 'text-[#ea580c] bg-[#ea580c]/10' : 'text-[#9e8d78] hover:text-[#7c6e5a]'}`}>
            <item.icon size={item.active ? 24 : 22} strokeWidth={item.active ? 2.5 : 2} />
          </button>
        ))}
      </div>

    </div>
  );
}
