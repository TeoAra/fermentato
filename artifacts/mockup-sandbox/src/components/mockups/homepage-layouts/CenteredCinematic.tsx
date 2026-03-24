import React from "react";
import { Search, MapPin, Star, Beer, Clock, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Mock Data
const STYLE_CHIPS = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison"];

const PUB_CARDS = [
  {
    id: 1,
    name: "Luppolino Pub",
    city: "Roma",
    distance: "1.2 km",
    rating: 4.8,
    beersOnTap: 12,
    isOpen: true,
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
  },
  {
    id: 2,
    name: "The Brew House",
    city: "Milano",
    distance: "3.5 km",
    rating: 4.6,
    beersOnTap: 8,
    isOpen: true,
    image: "https://images.unsplash.com/photo-1575037614876-c38e4d28f711?w=800&q=80",
  },
  {
    id: 3,
    name: "Birreria 27",
    city: "Bologna",
    distance: "5.0 km",
    rating: 4.9,
    beersOnTap: 15,
    isOpen: false,
    image: "https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=800&q=80",
  },
];

const BREWERIES = [
  "Birrificio CRAK",
  "Birra Nursia",
  "Hop Skin",
  "Beerland",
  "Del Borgo",
  "Revelation Cat",
];

const ON_TAP_NOW = [
  { pub: "Luppolino Pub", beer: "Guerrilla IPA", brewery: "Birrificio CRAK", style: "IPA" },
  { pub: "The Brew House", beer: "Reale Extra", brewery: "Del Borgo", style: "IPA" },
  { pub: "Birreria 27", beer: "Saison Dupont", brewery: "Brasserie Dupont", style: "Saison" },
  { pub: "Luppolino Pub", beer: "Spaceman", brewery: "BrewFist", style: "IPA" },
];

export function CenteredCinematic() {
  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] font-sans text-neutral-900 selection:bg-amber-500/30">
      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center min-h-[100vh] bg-[#0d0a08] text-white px-6 py-20 text-center overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1614315584025-cb2156827c19?w=1600&q=80"
            alt="Atmospheric beer background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a08] via-[#0d0a08]/80 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-12 mt-10">
          
          {/* Main Headline */}
          <h1 
            className="font-['Bricolage_Grotesque'] font-extrabold leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(3rem, 8vw, 5rem)" }}
          >
            Trova la tua <br />
            <span className="text-amber-500">prossima birra</span>
          </h1>

          {/* Search Bar */}
          <div className="w-full max-w-2xl relative group">
            <div className="absolute -inset-1 bg-amber-500/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2 pl-6 shadow-2xl">
              <Search className="w-6 h-6 text-white/50 mr-3" />
              <Input
                type="text"
                placeholder="Cerca birre, pub, birrifici..."
                className="flex-1 bg-transparent border-none text-white placeholder:text-white/50 text-lg focus-visible:ring-0 px-0 shadow-none h-12"
              />
              <Button className="rounded-full bg-amber-500 hover:bg-amber-600 text-[#0d0a08] font-bold px-8 h-12 text-lg ml-2 transition-transform active:scale-95">
                Cerca
              </Button>
            </div>
          </div>

          {/* Style Chips */}
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
            {STYLE_CHIPS.map((style) => (
              <button
                key={style}
                className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-amber-500 hover:text-[#0d0a08] border border-white/10 text-white/80 font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {style}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-extrabold text-amber-500 font-['Bricolage_Grotesque'] tracking-tight">12.847</span>
              <span className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">Birre</span>
            </div>
            <div className="w-[1px] h-12 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-extrabold text-amber-500 font-['Bricolage_Grotesque'] tracking-tight">532</span>
              <span className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">Birrifici</span>
            </div>
            <div className="w-[1px] h-12 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-extrabold text-amber-500 font-['Bricolage_Grotesque'] tracking-tight">148</span>
              <span className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">Pub</span>
            </div>
          </div>
        </div>

        {/* Gradient Transition to Content */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[hsl(38,14%,97%)] pointer-events-none" />
      </section>

      {/* PRIMARY SECTION: PUB VICINI */}
      <section className="py-24 px-6 relative z-10 bg-[hsl(38,14%,97%)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
              <h2 className="text-3xl md:text-4xl font-extrabold font-['Bricolage_Grotesque'] text-neutral-900 tracking-tight">
                Pub Vicini
              </h2>
            </div>
            <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 font-semibold">
              Vedi tutti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <ScrollArea className="w-full pb-8 -mx-6 px-6 md:mx-0 md:px-0">
            <div className="flex gap-6 w-max">
              {PUB_CARDS.map((pub) => (
                <div key={pub.id} className="w-[320px] md:w-[380px] shrink-0 group cursor-pointer">
                  <div className="relative h-48 rounded-3xl overflow-hidden mb-4 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                    <img 
                      src={pub.image} 
                      alt={pub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-black font-bold border-none shadow-sm">
                        <MapPin className="w-3 h-3 mr-1" /> {pub.distance}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      {pub.isOpen ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-bold border-none shadow-sm">Aperto</Badge>
                      ) : (
                        <Badge className="bg-rose-500 hover:bg-rose-500 text-white font-bold border-none shadow-sm">Chiuso</Badge>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-xl font-bold font-['Bricolage_Grotesque'] leading-tight">{pub.name}</h3>
                      <p className="text-white/80 text-sm flex items-center mt-1 font-medium">
                        {pub.city} <span className="mx-2 opacity-50">•</span> <Star className="w-3 h-3 text-amber-400 mr-1 fill-amber-400" /> {pub.rating}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 text-neutral-600">
                    <div className="flex items-center gap-2 font-medium">
                      <Beer className="w-5 h-5 text-amber-500" />
                      <span><strong className="text-neutral-900">{pub.beersOnTap}</strong> birre alla spina</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden md:flex" />
          </ScrollArea>
        </div>
      </section>

      {/* SECONDARY SECTION: IN SPINA ADESSO */}
      <section className="py-24 px-6 bg-white border-y border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
              <h2 className="text-3xl md:text-4xl font-extrabold font-['Bricolage_Grotesque'] text-neutral-900 tracking-tight">
                In Spina Adesso
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ON_TAP_NOW.map((item, idx) => (
              <Card key={idx} className="border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group overflow-hidden bg-[hsl(38,14%,99%)]">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-bold uppercase tracking-wide text-[10px]">
                      {item.style}
                    </Badge>
                    <Clock className="w-4 h-4 text-neutral-400" />
                  </div>
                  <h4 className="text-xl font-bold text-neutral-900 font-['Bricolage_Grotesque'] mb-1 group-hover:text-amber-600 transition-colors">
                    {item.beer}
                  </h4>
                  <p className="text-neutral-500 text-sm font-medium mb-6">{item.brewery}</p>
                  
                  <div className="pt-4 border-t border-neutral-200/60 flex items-center gap-2 text-sm text-neutral-600">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium truncate">{item.pub}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TERTIARY SECTION: BREWERIES */}
      <section className="py-24 px-6 bg-[hsl(38,14%,97%)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
              <h2 className="text-3xl md:text-4xl font-extrabold font-['Bricolage_Grotesque'] text-neutral-900 tracking-tight">
                Birrifici in Evidenza
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {BREWERIES.map((brewery) => (
              <div 
                key={brewery}
                className="bg-white border border-neutral-200 rounded-2xl px-6 py-4 flex items-center gap-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Beer className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{brewery}</h4>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">Italia</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENTS SECTION */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
            <h2 className="text-3xl md:text-4xl font-extrabold font-['Bricolage_Grotesque'] text-neutral-900 tracking-tight">
              Ultime Novità
            </h2>
          </div>

          <div className="bg-neutral-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <Badge className="bg-amber-500 text-black hover:bg-amber-500 mb-6 font-bold">Nuova Tap Room</Badge>
              <h3 className="text-3xl md:text-4xl font-extrabold font-['Bricolage_Grotesque'] mb-4 leading-tight">
                Birrificio CRAK apre le porte della nuova sede.
              </h3>
              <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                Scopri la nuova struttura, le visite guidate e le birre in edizione limitata disponibili solo in tap room a partire da questo weekend.
              </p>
              <Button className="bg-white text-neutral-900 hover:bg-neutral-200 rounded-full px-8 py-6 text-lg font-bold">
                Leggi la notizia
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER (Simple mockup) */}
      <footer className="bg-[#0d0a08] text-white/50 py-12 px-6 text-center text-sm font-medium border-t border-white/10">
        <p>© 2025 Fermenta.to. Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
}
