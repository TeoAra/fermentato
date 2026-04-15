import React from "react";
import { Home, Bell, Search, ScanLine, Activity, User, Star, MapPin, Wifi, Clock, Beer } from "lucide-react";

export function PubDetail() {
  return (
    <div 
      className="relative mx-auto bg-[#f5f0eb] overflow-y-auto overflow-x-hidden pb-20"
      style={{ width: "390px", minHeight: "844px", fontFamily: "'Poppins', sans-serif", color: "#1c1209" }}
    >
      {/* Cover Image */}
      <div className="w-full h-[200px]">
        <img 
          src="https://placehold.co/390x200/2d1b0e/f5f0eb?text=Porta+Venezia" 
          alt="Pub Cover"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info Card */}
      <div className="relative bg-white rounded-t-2xl -mt-6 z-10 px-5 pt-6 pb-6 shadow-sm border-b border-[#e8e0d4]">
        {/* Logo */}
        <div className="absolute top-0 right-4 -mt-8 w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
          <img 
            src="https://placehold.co/64x64/d4a96a/1c1209?text=PV" 
            alt="Pub Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-[22px] font-bold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
          La Birreria di Porta Venezia
        </h1>
        
        <p className="text-[13px] text-[#7c6e5a] mb-3 flex items-center gap-1">
          <MapPin size={14} />
          Via Melzo 22, Milano · 0.8 km
        </p>

        <div className="flex items-center gap-2 mb-4 text-[13px]">
          <div className="flex items-center text-amber-500 font-semibold">
            <Star size={14} className="fill-current mr-1" />
            4.5
          </div>
          <span className="text-[#7c6e5a]">(89 recensioni)</span>
          <span className="text-[#7c6e5a]">·</span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Aperto ora
          </span>
        </div>

        {/* Quick Info Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="bg-[#f5f0eb] px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 border border-[#e8e0d4]">
            <Beer size={14} className="text-[#7c6e5a]" />
            <span>Birre alla spina: 16</span>
          </div>
          <div className="bg-[#f5f0eb] px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 border border-[#e8e0d4]">
            <Clock size={14} className="text-[#7c6e5a]" />
            <span>Chiude: 01:00</span>
          </div>
          <div className="bg-[#f5f0eb] px-3 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 border border-[#e8e0d4]">
            <Wifi size={14} className="text-[#7c6e5a]" />
            <span>Wi-Fi ✓</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e8e0d4]">
          <button className="flex-1 pb-3 text-sm font-semibold text-[#ea580c] border-b-2 border-[#ea580c]">
            Spina
          </button>
          <button className="flex-1 pb-3 text-sm font-semibold text-[#7c6e5a]">
            Info
          </button>
          <button className="flex-1 pb-3 text-sm font-semibold text-[#7c6e5a]">
            Recensioni
          </button>
        </div>
      </div>

      {/* Taplist Section */}
      <div className="px-5 py-6">
        <h2 className="text-[18px] font-bold mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
          Birre alla spina
        </h2>

        <div className="flex flex-col gap-3">
          {[
            { name: "Nebbia IPA", brewery: "Lambrate", style: "IPA", abv: "6.5%", price: "€5.50", rating: "4.2" },
            { name: "Saison Farmhouse", brewery: "Extraomnes", style: "Saison", abv: "5.8%", price: "€6.00", rating: "4.0" },
            { name: "Imperial Stout", brewery: "Brewfist", style: "Stout", abv: "9.5%", price: "€7.00", rating: "4.6" },
            { name: "Wit Bier d'Estate", brewery: "Baladin", style: "Witbier", abv: "4.5%", price: "€5.00", rating: "3.9" },
            { name: "Lager Artigianale", brewery: "Poretti", style: "Lager", abv: "5.0%", price: "€4.50", rating: "3.8" }
          ].map((beer, i) => (
            <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-[#e8e0d4] flex items-center gap-3">
              <img 
                src={`https://placehold.co/48x48/d4a96a/1c1209?text=${i+1}`}
                alt={beer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="text-[14px] font-semibold leading-tight">{beer.name}</h3>
                  <span className="text-[14px] font-bold">{beer.price}</span>
                </div>
                <p className="text-[11px] text-[#7c6e5a] mb-1">{beer.brewery}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <span className="bg-[#f5f0eb] px-2 py-0.5 rounded text-[10px] text-[#7c6e5a] border border-[#e8e0d4]">{beer.style}</span>
                    <span className="bg-[#f5f0eb] px-2 py-0.5 rounded text-[10px] text-[#7c6e5a] border border-[#e8e0d4]">{beer.abv}</span>
                  </div>
                  <div className="flex items-center text-[11px] text-[#7c6e5a]">
                    <Star size={10} className="text-amber-500 fill-current mr-0.5" />
                    {beer.rating}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-[#e8e0d4] px-6 py-3 flex justify-between items-center z-50">
        <Home size={24} className="text-[#9e8d78]" />
        <Bell size={24} className="text-[#9e8d78]" />
        <Search size={24} className="text-[#ea580c]" />
        <ScanLine size={24} className="text-[#9e8d78]" />
        <Activity size={24} className="text-[#9e8d78]" />
        <User size={24} className="text-[#9e8d78]" />
      </div>
    </div>
  );
}
