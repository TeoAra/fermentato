import React from 'react';
import { Home, Beer, Search, Users, User, Bell, ChevronRight, MapPin } from 'lucide-react';

export function TabFAB() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 p-8 font-sans">
      {/* Phone Frame */}
      <div className="w-[390px] h-[780px] bg-[#0F0F10] rounded-[40px] border-[8px] border-zinc-900 overflow-hidden relative shadow-2xl flex flex-col text-white">
        
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between sticky top-0 z-10 bg-[#0F0F10]/90 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
              <img src="https://i.pravatar.cc/100?img=33" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <Bell className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 font-bold text-lg tracking-tight">
            Fermenta.to
          </div>
          <div className="w-8"></div> {/* Spacer for center alignment */}
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
          {/* Hero */}
          <div className="p-4 mt-2">
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl p-6 relative overflow-hidden border border-white/5">
              <div className="relative z-10">
                <span className="text-[#E87722] text-xs font-bold uppercase tracking-wider mb-1 block">In Evidenza</span>
                <h2 className="text-2xl font-bold mb-2">Nuovi Arrivi</h2>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed max-w-[80%]">Scopri le ultime birre artigianali aggiunte alla taplist dei tuoi pub preferiti.</p>
                <button className="bg-[#E87722] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-[#E87722]/20">Scopri di più</button>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Beer className="w-40 h-40" />
              </div>
            </div>
          </div>

          {/* Feed/Cards */}
          <div className="px-4 pb-8">
            <h3 className="text-lg font-bold mb-4 mt-2 flex items-center justify-between">
              Birre Popolari
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </h3>
            <div className="space-y-4">
              {[
                { name: "Luppolo Spaziale", style: "IPA", brewery: "Birrificio Galattico", abv: "6.5%", pub: "Pub Centrale" },
                { name: "Notte Scura", style: "Stout", brewery: "Monaci Neri", abv: "8.0%", pub: "The Hop Corner" },
                { name: "Chiara Estate", style: "Pilsner", brewery: "Sole e Malto", abv: "4.8%", pub: "Beer House" }
              ].map((beer, i) => (
                <div key={i} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex gap-4 items-center">
                  <div className="w-16 h-20 bg-zinc-800 rounded-xl shrink-0 flex items-center justify-center border border-white/5">
                    <Beer className="w-8 h-8 text-zinc-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-base">{beer.name}</h4>
                      <span className="text-[#E87722] text-[10px] font-bold bg-[#E87722]/10 px-2 py-1 rounded-md">{beer.style}</span>
                    </div>
                    <p className="text-zinc-400 text-xs mb-2">{beer.brewery} • {beer.abv}</p>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <MapPin className="w-3 h-3" />
                      <span>{beer.pub}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="absolute bottom-0 left-0 right-0 bg-white text-zinc-400 rounded-t-[32px] pt-3 pb-[20px] px-6 flex justify-between items-start h-[84px] shadow-[0_-10px_40px_rgba(0,0,0,0.6)] border-t border-zinc-200/20 z-50">
          
          <div className="flex flex-col items-center gap-1 w-12 cursor-pointer text-[#E87722]">
            <Home className="w-[22px] h-[22px] stroke-[2.5]" />
            <span className="text-[10px] font-semibold">Home</span>
            <div className="w-1 h-1 rounded-full bg-[#E87722] mt-0.5"></div>
          </div>

          <div className="flex flex-col items-center gap-1 w-12 cursor-pointer mt-1">
            <Beer className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-medium">Birre</span>
          </div>

          {/* Spacer for FAB */}
          <div className="w-16"></div>

          <div className="flex flex-col items-center gap-1 w-12 cursor-pointer mt-1">
            <Users className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-medium">Sociale</span>
          </div>

          <div className="flex flex-col items-center gap-1 w-12 cursor-pointer mt-1">
            <User className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-medium">Account</span>
          </div>

          {/* FAB */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7">
            <div className="w-14 h-14 bg-[#E87722] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(232,119,34,0.4)] text-white border-4 border-[#0F0F10] transition-transform active:scale-95">
              <Search className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
