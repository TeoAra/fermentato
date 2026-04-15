import React from "react";
import { Search, Scan, Activity, ArrowRight, Beer, MapPin, Star, ChevronRight } from "lucide-react";

export function Landing() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Poppins:wght@300;400;500;600;700&display=swap');
        
        .font-fraunces { font-family: 'Fraunces', Georgia, serif; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}} />
      
      <div className="min-h-screen bg-[#f5f0eb] overflow-y-auto font-poppins text-[#1c1209] flex flex-col items-center">
        {/* Desktop Container */}
        <div className="w-full max-w-[1280px] bg-[#f5f0eb] min-h-screen relative shadow-2xl flex flex-col">
          
          {/* Navbar */}
          <nav className="bg-[#1c1209] text-white px-8 py-5 flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-3">
              <Beer className="w-7 h-7 text-[#ea580c]" />
              <span className="font-fraunces text-2xl font-bold tracking-tight">Fermenta.to</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-[15px] font-medium">
              <a href="#" className="hover:text-[#ea580c] transition-colors">Birrifici</a>
              <a href="#" className="hover:text-[#ea580c] transition-colors">Pub</a>
              <a href="#" className="hover:text-[#ea580c] transition-colors">Festival</a>
            </div>
            
            <button className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-full font-semibold transition-colors">
              Accedi
            </button>
          </nav>

          {/* Hero Section */}
          <section className="px-12 py-20 md:py-32 flex flex-col md:flex-row items-center gap-16">
            {/* Left Content */}
            <div className="flex-1 space-y-8">
              <h1 className="font-fraunces text-5xl md:text-7xl font-bold leading-[1.1] text-[#1c1209]">
                Trova la birra<br />artigianale <br/><i className="font-light text-[#ea580c]">perfetta.</i>
              </h1>
              <p className="text-xl text-[#7c6e5a] max-w-lg leading-relaxed">
                Il magazine e tracker #1 in Italia. Scopri nuovi stili, segui i tuoi birrifici preferiti e trova le migliori taplist vicino a te.
              </p>
              
              <div className="flex items-center gap-4 pt-4">
                <button className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20">
                  Inizia gratis
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="border-2 border-[#1c1209] hover:bg-[#1c1209] hover:text-white text-[#1c1209] px-8 py-4 rounded-full font-semibold text-lg transition-colors">
                  Esplora
                </button>
              </div>
            </div>
            
            {/* Right Mosaic */}
            <div className="flex-1 w-full relative">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6 pt-12">
                  <img src="https://placehold.co/400x500/d4a96a/1c1209?text=🍺+IPA" alt="IPA Beer" className="w-full rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] object-cover aspect-[4/5] hover:scale-[1.02] transition-transform duration-500" />
                  <img src="https://placehold.co/400x400/b8860b/1c1209?text=🍺+Stout" alt="Stout Beer" className="w-full rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] object-cover aspect-square hover:scale-[1.02] transition-transform duration-500" />
                </div>
                <div className="space-y-6">
                  <img src="https://placehold.co/400x400/cd853f/1c1209?text=🍺+Saison" alt="Saison Beer" className="w-full rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] object-cover aspect-square hover:scale-[1.02] transition-transform duration-500" />
                  <img src="https://placehold.co/400x500/deb887/1c1209?text=🍺+Lager" alt="Lager Beer" className="w-full rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.1)] object-cover aspect-[4/5] hover:scale-[1.02] transition-transform duration-500" />
                </div>
              </div>
            </div>
          </section>

          {/* Features Strip */}
          <section className="px-12 py-20 bg-white border-y border-[#e8e0d4]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Feature 1 */}
              <div className="flex flex-col gap-6">
                <div className="w-14 h-14 rounded-full bg-[#ea580c]/10 flex items-center justify-center">
                  <Scan className="w-7 h-7 text-[#ea580c]" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-2xl text-[#1c1209] mb-3">Scan + Abbina</h3>
                  <p className="text-[#7c6e5a] text-lg leading-relaxed">Scansiona l'etichetta o il menu per scoprire valutazioni, stili e abbinamenti gastronomici perfetti.</p>
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="flex flex-col gap-6">
                <div className="w-14 h-14 rounded-full bg-[#ea580c]/10 flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-[#ea580c]" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-2xl text-[#1c1209] mb-3">Scopri Pub</h3>
                  <p className="text-[#7c6e5a] text-lg leading-relaxed">Trova i migliori locali indipendenti, controlla le loro taplist in tempo reale e naviga sulla mappa.</p>
                </div>
              </div>
              
              {/* Feature 3 */}
              <div className="flex flex-col gap-6">
                <div className="w-14 h-14 rounded-full bg-[#ea580c]/10 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-[#ea580c]" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-2xl text-[#1c1209] mb-3">Segui Birrifici</h3>
                  <p className="text-[#7c6e5a] text-lg leading-relaxed">Resta aggiornato sulle nuove uscite, gli eventi speciali e le novità dei maestri birrai italiani.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Trending Beers Section */}
          <section className="px-12 py-24">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="font-fraunces text-3xl font-bold text-[#1c1209] mb-2">Birre del Momento</h2>
                <p className="text-[#7c6e5a]">Le produzioni italiane più amate dalla community.</p>
              </div>
              <button className="flex items-center gap-2 text-[#ea580c] font-medium hover:text-[#c2410c] transition-colors">
                Vedi tutte <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              {[
                { name: "Nebbia IPA", brewery: "Birrificio del Ducato", style: "India Pale Ale", rating: "4.2", color: "d4a96a" },
                { name: "Arancio Meccanico", brewery: "Opperbacco", style: "Saison", rating: "4.5", color: "cd853f" },
                { name: "Isaac", brewery: "Baladin", style: "Wit Bier", rating: "4.7", color: "f5deb3" },
                { name: "Moretti Radler", brewery: "Birra Moretti", style: "Lager Artigianale", rating: "3.8", color: "deb887" }
              ].map((beer, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] border border-[#e8e0d4] hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="aspect-square rounded-xl bg-[#f5f0eb] mb-4 overflow-hidden relative">
                    <img src={`https://placehold.co/400x400/${beer.color}/1c1209?text=🍺`} alt={beer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#ea580c] text-[#ea580c]" /> {beer.rating}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-block px-2 py-0.5 border border-[#e8e0d4] rounded-full text-[10px] uppercase tracking-[0.08em] text-[#7c6e5a] mb-1">
                      {beer.style}
                    </div>
                    <h4 className="font-fraunces font-bold text-xl text-[#1c1209] leading-tight truncate">{beer.name}</h4>
                    <p className="text-sm text-[#7c6e5a] truncate">{beer.brewery}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Pubs Section */}
          <section className="px-12 py-24 bg-[#1c1209] text-white">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="font-fraunces text-3xl font-bold text-[#f5f0eb] mb-2">Pub in Evidenza</h2>
                <p className="text-[#a89f91]">I migliori locali dove gustare birra artigianale.</p>
              </div>
              <button className="flex items-center gap-2 text-[#ea580c] font-medium hover:text-[#ea580c]/80 transition-colors">
                Esplora mappa <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {[
                { name: "La Birreria di Porta Venezia", city: "Milano", desc: "Selezione di 20 spine a rotazione continua con focus su birrifici locali.", img: "8b5a2b" },
                { name: "The Pub Garden", city: "Roma", desc: "Un'oasi verde nel cuore della città. 15 spine artigianali e cucina di ricerca.", img: "5c4033" }
              ].map((pub, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[16/9]">
                  <img src={`https://placehold.co/800x450/${pub.img}/f5f0eb?text=Pub`} alt={pub.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1209] via-[#1c1209]/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="flex items-center gap-2 text-[#ea580c] text-sm font-semibold mb-2 uppercase tracking-wider">
                      <MapPin className="w-4 h-4" /> {pub.city}
                    </div>
                    <h3 className="font-fraunces text-3xl font-bold text-white mb-2">{pub.name}</h3>
                    <p className="text-[#e8e0d4] max-w-md">{pub.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats Bar */}
          <section className="bg-[#e8e0d4] text-[#1c1209] py-20 px-8 text-center">
            <h2 className="font-fraunces text-4xl md:text-6xl font-bold tracking-tight">
              <span className="text-[#ea580c]">1.200.000</span> birre <span className="text-[#7c6e5a] mx-2">·</span> <span className="text-[#ea580c]">8.000</span> pub <span className="text-[#7c6e5a] mx-2">·</span> <span className="text-[#ea580c]">2.500</span> birrifici
            </h2>
            <p className="font-poppins text-[#7c6e5a] mt-6 text-lg uppercase tracking-[0.15em] font-medium">
              La community della birra artigianale
            </p>
          </section>

          {/* Footer */}
          <footer className="bg-[#1c1209] px-12 py-16 text-[#7c6e5a] mt-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-[#2a1e12] pb-12">
              <div className="space-y-4 max-w-sm">
                <div className="flex items-center gap-3">
                  <Beer className="w-8 h-8 text-[#ea580c]" />
                  <span className="font-fraunces text-3xl font-bold text-[#f5f0eb]">Fermenta.to</span>
                </div>
                <p className="text-sm leading-relaxed">
                  L'enciclopedia e il tracker definitivo per gli amanti della birra artigianale in Italia. Scopri, assaggia, recensisci.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-x-12 gap-y-6">
                <div className="space-y-3">
                  <h4 className="text-[#f5f0eb] font-semibold text-sm uppercase tracking-wider">Esplora</h4>
                  <div className="flex flex-col gap-2 text-sm">
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Birre</a>
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Birrifici</a>
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Pub & Locali</a>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[#f5f0eb] font-semibold text-sm uppercase tracking-wider">Progetto</h4>
                  <div className="flex flex-col gap-2 text-sm">
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Chi Siamo</a>
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Per i Locali</a>
                    <a href="#" className="hover:text-[#ea580c] transition-colors">Contatti</a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <div>&copy; 2025 Fermenta.to. Tutti i diritti riservati.</div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Termini di Servizio</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              </div>
            </div>
          </footer>
          
        </div>
      </div>
    </>
  );
}

export default Landing;
