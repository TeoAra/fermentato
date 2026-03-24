import React, { useState } from "react";
import { Search, MapPin, Beer, Star, Clock, ChevronRight, Store, Factory, ArrowRight } from "lucide-react";

export function AppFeed() {
  const [activeTab, setActiveTab] = useState("Tutti");
  const [searchQuery, setSearchQuery] = useState("");

  const styles = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison"];

  const stories = [
    { id: 1, beer: "Guerrilla", pub: "Luppolino", img: "https://images.unsplash.com/photo-1575037614876-c38e4d44f5b8?w=150&h=150&fit=crop" },
    { id: 2, beer: "Spaceman", pub: "The Brew House", img: "https://images.unsplash.com/photo-1566816174697-768a35ee9716?w=150&h=150&fit=crop" },
    { id: 3, beer: "Keto", pub: "Birreria 27", img: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=150&h=150&fit=crop" },
    { id: 4, beer: "Pils", pub: "Hop Skin", img: "https://images.unsplash.com/photo-1657223197176-508ea7cc9e31?w=150&h=150&fit=crop" },
    { id: 5, beer: "Saison", pub: "Beerland", img: "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=150&h=150&fit=crop" },
    { id: 6, beer: "Stout", pub: "Del Borgo", img: "https://images.unsplash.com/photo-1623594042857-e1df79612306?w=150&h=150&fit=crop" },
    { id: 7, beer: "IPA", pub: "CRAK", img: "https://images.unsplash.com/photo-1559526642-c3f001ea68ee?w=150&h=150&fit=crop" },
    { id: 8, beer: "Sour", pub: "Nursia", img: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=150&h=150&fit=crop" },
    { id: 9, beer: "Weizen", pub: "Revelation", img: "https://images.unsplash.com/photo-1563514984551-912a2f8fc718?w=150&h=150&fit=crop" },
    { id: 10, beer: "Bock", pub: "Luppolino", img: "https://images.unsplash.com/photo-1505075937365-21d3f9468087?w=150&h=150&fit=crop" },
    { id: 11, beer: "Lager", pub: "Beerland", img: "https://images.unsplash.com/photo-1575037614876-c38e4d44f5b8?w=150&h=150&fit=crop" },
    { id: 12, beer: "Gose", pub: "Birreria 27", img: "https://images.unsplash.com/photo-1566816174697-768a35ee9716?w=150&h=150&fit=crop" },
  ];

  const feed = [
    {
      id: 1,
      type: "pub",
      title: "Luppolino Pub",
      subtitle: "Roma • Aperto ora",
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop",
      distance: "1.2 km",
      rating: "4.8",
      beers: "12 spine",
      tags: ["Pub", "Food"]
    },
    {
      id: 2,
      type: "beer",
      title: "Guerrilla IPA",
      subtitle: "Birrificio CRAK",
      image: "https://images.unsplash.com/photo-1566816174697-768a35ee9716?w=200&h=200&fit=crop",
      distance: null,
      rating: "4.5",
      beers: null,
      tags: ["IPA", "6.5%"]
    },
    {
      id: 3,
      type: "brewery",
      title: "Hop Skin",
      subtitle: "Curno (BG)",
      image: "https://images.unsplash.com/photo-1596464518177-3cc7dc0db1ba?w=200&h=200&fit=crop",
      distance: "45 km",
      rating: "4.9",
      beers: "8 birre",
      tags: ["Birrificio", "Taproom"]
    },
    {
      id: 4,
      type: "pub",
      title: "The Brew House",
      subtitle: "Milano • Chiuso",
      image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=200&h=200&fit=crop",
      distance: "3.4 km",
      rating: "4.6",
      beers: "8 spine",
      tags: ["Pub", "Eventi"]
    },
    {
      id: 5,
      type: "beer",
      title: "Spaceman",
      subtitle: "BrewFist",
      image: "https://images.unsplash.com/photo-1657223197176-508ea7cc9e31?w=200&h=200&fit=crop",
      distance: null,
      rating: "4.7",
      beers: null,
      tags: ["West Coast IPA", "7.0%"]
    },
    {
      id: 6,
      type: "pub",
      title: "Birreria 27",
      subtitle: "Torino • Aperto ora",
      image: "https://images.unsplash.com/photo-1218314170364-e1b9b183693e?w=200&h=200&fit=crop",
      distance: "2.1 km",
      rating: "4.4",
      beers: "15 spine",
      tags: ["Pub"]
    },
    {
      id: 7,
      type: "brewery",
      title: "Birra Nursia",
      subtitle: "Norcia (PG)",
      image: "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?w=200&h=200&fit=crop",
      distance: "120 km",
      rating: "4.9",
      beers: "4 birre",
      tags: ["Birrificio", "Monastico"]
    },
    {
      id: 8,
      type: "beer",
      title: "ReAle",
      subtitle: "Birra del Borgo",
      image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=200&h=200&fit=crop",
      distance: null,
      rating: "4.3",
      beers: null,
      tags: ["APA", "6.4%"]
    }
  ];

  const getIcon = (type: string) => {
    if (type === "pub") return <Store className="w-4 h-4 text-amber-600" />;
    if (type === "brewery") return <Factory className="w-4 h-4 text-amber-600" />;
    return <Beer className="w-4 h-4 text-amber-600" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 max-w-md mx-auto sm:max-w-none shadow-xl border-x border-slate-200">
      {/* 1. Hero: Ultra compact, dark */}
      <div className="bg-[#1a1008] text-white px-4 pt-6 pb-4 rounded-b-xl sticky top-0 z-20 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-500" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Fermenta.to
            </h1>
            <p className="text-xs text-amber-200/70 font-medium">Trova la tua prossima birra</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Beer className="w-4 h-4 text-amber-400" />
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-3 border-0 bg-white/10 text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 rounded-xl sm:text-sm transition-all"
            placeholder="Cerca birre, pub, birrifici..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-400 hover:text-amber-300">
            <MapPin className="h-4 w-4" />
          </button>
        </div>

        {/* Style chips in hero */}
        <div className="flex overflow-x-auto gap-2 mt-4 pb-1 no-scrollbar hide-scrollbar">
          {styles.map(style => (
            <button key={style} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium whitespace-nowrap hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 transition-colors">
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* 2. In Spina as Stories */}
      <div className="pt-4 pb-2 px-0 bg-white shadow-sm mb-2">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
            In Spina Adesso <span className="text-orange-500">🔥</span>
          </h2>
          <span className="text-[10px] font-medium text-amber-600 cursor-pointer">Vedi tutti</span>
        </div>
        
        <div className="flex overflow-x-auto gap-4 px-4 pb-2 no-scrollbar hide-scrollbar">
          {stories.map(story => (
            <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-orange-500">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                  <img src={story.img} alt={story.beer} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-800 truncate w-16 text-center">{story.beer}</span>
              <span className="text-[9px] text-slate-500 truncate w-16 text-center">{story.pub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Stats Strip */}
      <div className="bg-amber-50/80 border-y border-amber-100 py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-medium text-amber-800 shadow-sm mb-2">
        <span>12.847 birre</span>
        <span className="text-amber-300">•</span>
        <span>532 birrifici</span>
        <span className="text-amber-300">•</span>
        <span>148 pub</span>
      </div>

      {/* 4. Tab Bar (Sticky) */}
      <div className="sticky top-[148px] z-10 bg-white border-b border-slate-200 flex px-2 overflow-x-auto hide-scrollbar shadow-sm">
        {["Tutti", "Pub", "Birre", "Birrifici"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[80px] py-3 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === tab 
                ? "border-amber-500 text-amber-600" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 5. Feed */}
      <div className="px-3 py-3 flex flex-col gap-3">
        {feed.map((item, idx) => (
          <div 
            key={item.id} 
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform"
          >
            {/* Left Image */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 relative">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
                {getIcon(item.type)}
              </div>
            </div>
            
            {/* Right Content */}
            <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <h3 className="font-bold text-slate-900 truncate pr-2 text-sm sm:text-base leading-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {item.title}
                </h3>
                {item.distance && (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                    <MapPin className="w-3 h-3" /> {item.distance}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-slate-500 truncate mb-2">{item.subtitle}</p>
              
              <div className="flex flex-wrap gap-2 mt-auto">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {item.rating}
                </div>
                
                {item.beers && (
                  <>
                    <span className="text-slate-300 text-[10px]">•</span>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Beer className="w-3 h-3 text-slate-400" />
                      {item.beers}
                    </div>
                  </>
                )}
                
                <span className="text-slate-300 text-[10px] hidden sm:inline">•</span>
                
                <div className="flex gap-1 ml-auto sm:ml-0">
                  {item.tags.slice(0,2).map(tag => (
                    <span key={tag} className="text-[9px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 6. Bottom CTA */}
      <div className="px-4 py-6 text-center">
        <button className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md w-full sm:w-auto">
          Scopri di più sulla mappa
          <ArrowRight className="w-4 h-4" />
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
