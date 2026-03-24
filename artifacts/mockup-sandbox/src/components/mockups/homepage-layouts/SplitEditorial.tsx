import React from "react";
import { Search, MapPin, Beer, Map, ChevronRight, Star, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const styles = ["IPA", "Stout", "Lager", "Sour", "Weizen", "Saison", "Pilsner", "Pale Ale"];

const nearestPubs = [
  { name: "Luppolino Pub", city: "Milano", distance: "0.8 km", rating: 4.8 },
  { name: "The Brew House", city: "Roma", distance: "1.2 km", rating: 4.6 },
  { name: "Birreria 27", city: "Bologna", distance: "2.5 km", rating: 4.9 },
];

const pubs = [
  {
    name: "Luppolino Pub",
    city: "Milano",
    distance: "0.8 km",
    rating: 4.8,
    onTap: 12,
    isOpen: true,
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=500&h=300&fit=crop",
  },
  {
    name: "The Brew House",
    city: "Roma",
    distance: "1.2 km",
    rating: 4.6,
    onTap: 8,
    isOpen: false,
    image: "https://images.unsplash.com/photo-1575037614876-c38e4d28f738?w=500&h=300&fit=crop",
  },
  {
    name: "Birreria 27",
    city: "Bologna",
    distance: "2.5 km",
    rating: 4.9,
    onTap: 15,
    isOpen: true,
    image: "https://images.unsplash.com/photo-1582222105717-313b29c97b81?w=500&h=300&fit=crop",
  },
];

const breweries = [
  { name: "Birrificio CRAK", location: "Campodarsego (PD)", beers: 24, badge: "Nuovi Arrivi" },
  { name: "Birra Nursia", location: "Norcia (PG)", beers: 12 },
  { name: "Hop Skin", location: "Curno (BG)", beers: 18 },
  { name: "Beerland", location: "Torino (TO)", beers: 31 },
  { name: "Del Borgo", location: "Borgorose (RI)", beers: 45, badge: "Eventi" },
  { name: "Revelation Cat", location: "Roma (RM)", beers: 15 },
];

const tapBeers = [
  { name: "Guerrilla", brewery: "CRAK Brewery", style: "IPA", abv: "5.8%", pub: "Luppolino Pub" },
  { name: "Spaceman", brewery: "BrewFist", style: "West Coast IPA", abv: "7.0%", pub: "Birreria 27" },
  { name: "ReAle", brewery: "Birra del Borgo", style: "American Pale Ale", abv: "6.4%", pub: "The Brew House" },
  { name: "Pils", brewery: "Elav", style: "Pilsner", abv: "5.0%", pub: "Luppolino Pub" },
];

export function SplitEditorial() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans text-zinc-900">
      
      {/* LEFT COLUMN: EDITORIAL CONTENT */}
      <div className="w-full md:w-[58%] flex flex-col min-h-screen relative z-10 bg-white shadow-xl shadow-black/5">
        
        {/* Header / Nav */}
        <header className="px-8 py-6 flex justify-between items-center border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Beer className="h-6 w-6 text-amber-500" />
            <span className="font-['Bricolage_Grotesque'] text-xl font-bold tracking-tight text-[#0d0a08]">
              Fermenta.to
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="#" className="hover:text-amber-500 transition-colors hidden sm:block">Birre</a>
            <a href="#" className="hover:text-amber-500 transition-colors hidden sm:block">Pub</a>
            <a href="#" className="hover:text-amber-500 transition-colors hidden sm:block">Birrifici</a>
            <Button variant="ghost" className="font-medium">Accedi</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full px-6">
              Registrati
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <main className="flex-1 pb-20">
          <div className="px-8 pt-16 pb-12 max-w-3xl mx-auto">
            <span className="text-amber-500 font-semibold tracking-widest text-sm uppercase mb-4 block">
              La birra artigianale italiana
            </span>
            <h1 className="font-['Bricolage_Grotesque'] text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-[#0d0a08] mb-6">
              Trova la tua <br />
              <span className="relative">
                <span className="relative z-10">prossima birra</span>
                <span className="absolute bottom-1 left-0 w-full h-4 bg-amber-200/50 -z-10 skew-x-[-15deg] transform"></span>
              </span>
            </h1>
            
            <p className="text-lg text-zinc-600 mb-10 max-w-xl leading-relaxed">
              Esplora migliaia di birre artigianali, scopri quali sono in spina vicino a te in questo momento e supporta i birrifici indipendenti italiani.
            </p>

            {/* Search */}
            <div className="bg-white p-2 rounded-2xl shadow-lg shadow-zinc-200/50 border border-zinc-100 flex items-center mb-8 relative z-20 focus-within:ring-4 ring-amber-500/20 transition-all">
              <Search className="h-5 w-5 text-zinc-400 ml-3" />
              <Input 
                placeholder="Cerca una birra, uno stile, un pub..." 
                className="border-0 shadow-none focus-visible:ring-0 text-base h-12 bg-transparent w-full"
              />
              <Button className="bg-[#0d0a08] hover:bg-black text-white h-12 rounded-xl px-8 font-medium">
                Cerca
              </Button>
            </div>

            {/* Styles Chips */}
            <div className="flex flex-wrap gap-2 mb-12">
              <span className="text-sm font-medium text-zinc-500 py-1.5 mr-2">Stili popolari:</span>
              {styles.map((style) => (
                <button 
                  key={style}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                >
                  {style}
                </button>
              ))}
            </div>

          </div>

          {/* Stats Bar */}
          <div className="border-y border-zinc-100 bg-zinc-50/50 py-8 px-8">
            <div className="max-w-3xl mx-auto flex flex-wrap justify-between items-center gap-6">
              <div className="text-center sm:text-left">
                <div className="font-['Bricolage_Grotesque'] text-3xl font-bold text-[#0d0a08]">12.847</div>
                <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mt-1">Birre</div>
              </div>
              <div className="w-px h-10 bg-zinc-200 hidden sm:block"></div>
              <div className="text-center sm:text-left">
                <div className="font-['Bricolage_Grotesque'] text-3xl font-bold text-[#0d0a08]">532</div>
                <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mt-1">Birrifici</div>
              </div>
              <div className="w-px h-10 bg-zinc-200 hidden sm:block"></div>
              <div className="text-center sm:text-left">
                <div className="font-['Bricolage_Grotesque'] text-3xl font-bold text-[#0d0a08]">148</div>
                <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mt-1">Pub</div>
              </div>
            </div>
          </div>

          {/* In Spina Adesso */}
          <section className="px-8 py-16 max-w-4xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="font-['Bricolage_Grotesque'] text-3xl font-bold text-[#0d0a08] mb-2 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                  In Spina Adesso
                </h2>
                <p className="text-zinc-500">Le birre appena attaccate nei pub vicini</p>
              </div>
              <Button variant="outline" className="hidden sm:flex gap-2">Vedi tutte <ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tapBeers.map((beer, i) => (
                <div key={i} className="group border border-zinc-100 bg-white rounded-2xl p-4 hover:border-amber-200 hover:shadow-md transition-all flex gap-4 cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Beer className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-zinc-900 leading-tight group-hover:text-amber-600 transition-colors">{beer.name}</h4>
                    <p className="text-sm text-zinc-500 mb-2">{beer.brewery} • {beer.style} • {beer.abv}</p>
                    <div className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                      <MapPin className="h-3 w-3 mr-1" />
                      In spina da {beer.pub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pubs List */}
          <section className="px-8 pb-16 max-w-4xl mx-auto">
             <div className="flex justify-between items-end mb-8">
              <h2 className="font-['Bricolage_Grotesque'] text-3xl font-bold text-[#0d0a08]">
                Pub Popolari
              </h2>
              <Button variant="link" className="text-amber-600 hover:text-amber-700 p-0">
                Esplora mappa
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pubs.map((pub, i) => (
                <Card key={i} className="overflow-hidden border-0 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-32 w-full relative">
                    <img src={pub.image} alt={pub.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className={pub.isOpen ? "bg-green-500/90 hover:bg-green-500" : "bg-zinc-500/90 hover:bg-zinc-500"}>
                        {pub.isOpen ? "Aperto" : "Chiuso"}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 border border-t-0 border-zinc-100 rounded-b-xl">
                    <h3 className="font-bold text-lg mb-1 truncate">{pub.name}</h3>
                    <div className="flex items-center text-sm text-zinc-500 mb-3">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {pub.city} • {pub.distance}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center bg-amber-50 px-2 py-1 rounded text-amber-700 text-xs font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 mr-1" />
                        {pub.rating}
                      </div>
                      <div className="text-xs font-medium text-zinc-600">
                        <span className="text-zinc-900 font-bold">{pub.onTap}</span> birre in spina
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Breweries Horizontal Scroll */}
          <section className="pl-8 pb-16 bg-zinc-900 pt-16 mt-8 overflow-hidden rounded-tr-[3rem]">
            <div className="max-w-4xl mx-auto pr-8 flex justify-between items-end mb-8">
              <h2 className="font-['Bricolage_Grotesque'] text-3xl font-bold text-white">
                Birrifici in Evidenza
              </h2>
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap pb-4">
              <div className="flex w-max space-x-4 pr-8">
                {breweries.map((brewery, i) => (
                  <div key={i} className="w-[280px] bg-zinc-800/80 backdrop-blur border border-zinc-700 p-5 rounded-2xl shrink-0 flex flex-col hover:border-amber-500/50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-zinc-700 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors text-zinc-300">
                        <span className="font-['Bricolage_Grotesque'] font-bold text-xl">{brewery.name.charAt(0)}</span>
                      </div>
                      {brewery.badge && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs font-normal">
                          {brewery.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-lg mb-1 truncate">{brewery.name}</h3>
                    <p className="text-zinc-400 text-sm mb-4 flex items-center"><MapPin className="w-3 h-3 mr-1"/> {brewery.location}</p>
                    <div className="mt-auto text-sm font-medium text-amber-400">
                      {brewery.beers} birre nel database
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="bg-zinc-800" />
            </ScrollArea>
          </section>
        </main>
      </div>

      {/* RIGHT COLUMN: STICKY MAP PANEL */}
      <div className="hidden md:block w-[42%] bg-[#0d0a08] sticky top-0 h-screen overflow-hidden border-l border-zinc-800 relative z-0">
        
        {/* Map Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 bg-gradient-to-b from-[#0d0a08] to-transparent">
          <div className="flex items-center justify-between">
            <h3 className="font-['Bricolage_Grotesque'] text-white text-2xl font-bold flex items-center gap-2">
              <Map className="text-amber-500 h-6 w-6" /> Mappa Live
            </h3>
            
            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-full flex gap-1 border border-white/10">
              <button className="px-3 py-1 text-xs font-medium text-black bg-amber-500 rounded-full">Pub</button>
              <button className="px-3 py-1 text-xs font-medium text-white hover:bg-white/10 rounded-full transition-colors">Birrifici</button>
              <button className="px-3 py-1 text-xs font-medium text-white hover:bg-white/10 rounded-full transition-colors">Tutti</button>
            </div>
          </div>
        </div>

        {/* CSS Art / Simulated Map Background */}
        <div className="absolute inset-0 z-0 opacity-40">
          {/* Map Grid Pattern */}
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}></div>
          
          {/* Diagonal fake streets */}
          <div className="absolute top-[20%] left-[-10%] w-[120%] h-px bg-zinc-600 rotate-12"></div>
          <div className="absolute top-[60%] left-[-10%] w-[120%] h-px bg-zinc-600 -rotate-6"></div>
          <div className="absolute top-[-10%] left-[40%] w-px h-[120%] bg-zinc-600 rotate-[20deg]"></div>
          <div className="absolute top-[30%] left-[20%] w-[400px] h-[300px] border border-zinc-700/50 rounded-[40px] skew-x-12"></div>
        </div>

        {/* Map Pins */}
        <div className="absolute inset-0 z-10">
          {/* Pin 1 - Active */}
          <div className="absolute top-[40%] left-[30%] flex flex-col items-center animate-bounce-slow">
            <div className="bg-amber-500 text-black px-2 py-1 rounded shadow-lg text-xs font-bold mb-1 whitespace-nowrap z-20">Luppolino Pub</div>
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.6)] z-10 relative">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              {/* Ping effect */}
              <div className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Pin 2 */}
          <div className="absolute top-[25%] left-[65%] flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="w-4 h-4 bg-zinc-300 rounded-full flex items-center justify-center shadow-lg relative">
              <div className="w-1.5 h-1.5 bg-[#0d0a08] rounded-full"></div>
            </div>
            <div className="text-zinc-300 text-[10px] mt-1 font-medium bg-[#0d0a08]/80 px-1 rounded">The Brew House</div>
          </div>

          {/* Pin 3 */}
          <div className="absolute top-[65%] left-[55%] flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
             <div className="w-4 h-4 bg-zinc-300 rounded-full flex items-center justify-center shadow-lg relative">
              <div className="w-1.5 h-1.5 bg-[#0d0a08] rounded-full"></div>
            </div>
            <div className="text-zinc-300 text-[10px] mt-1 font-medium bg-[#0d0a08]/80 px-1 rounded">Birreria 27</div>
          </div>

          {/* Pin 4 */}
          <div className="absolute top-[75%] left-[20%] flex flex-col items-center opacity-50">
             <div className="w-3 h-3 bg-zinc-500 rounded-full flex items-center justify-center relative"></div>
          </div>
          
          {/* Pin 5 */}
          <div className="absolute top-[15%] left-[15%] flex flex-col items-center opacity-50">
             <div className="w-3 h-3 bg-amber-700 rounded-full flex items-center justify-center relative"></div>
          </div>
        </div>

        {/* Floating Pub Info Panel (Bottom of right col) */}
        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="bg-[#1a1512]/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-medium text-sm">Più vicini a te</h4>
              <div className="flex items-center text-xs text-amber-500 font-medium">
                <Clock className="w-3 h-3 mr-1" /> Aggiornato ora
              </div>
            </div>
            
            <div className="space-y-3">
              {nearestPubs.map((pub, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-colors cursor-pointer border border-white/5 hover:border-amber-500/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      <span className="font-bold text-sm">{i+1}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{pub.name}</div>
                      <div className="text-zinc-500 text-xs">{pub.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-300 text-xs font-medium bg-black/30 px-2 py-1 rounded">{pub.distance}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white rounded-xl">
              Cerca in quest'area
            </Button>
          </div>
        </div>

      </div>
      
    </div>
  );
}
