#!/usr/bin/env node
/**
 * Export craft-ux mockup screens as standalone HTML files
 * Output: exports/figma-screens/*.html + figma-screens.zip
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// We'll generate HTML files that use Tailwind Play CDN
// and inline SVG icons — no bundler needed

const SCREENS = [
  { name: "01-Home-BeerDiscovery", title: "Home – Beer Discovery" },
  { name: "02-PubDetail-Page", title: "Pub Detail Page" },
  { name: "03-BeerDetail-Page", title: "Beer Detail Page" },
  { name: "04-Category-Menu", title: "Category Menu" },
];

const HTML_WRAPPER = (title: string, body: string) => `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Fermenta.to Craft UX</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#F77104',
            'primary-light': '#f5a623',
          },
          fontFamily: {
            sans: ['DM Sans', 'sans-serif'],
          },
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
  <style>
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    body { margin: 0; background: #FFF8F2; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

// ─── Screen 1: Home – Beer Discovery ────────────────────────────────────────
const screen1 = `
<div class="min-h-screen bg-[#FFF8F2] font-sans text-slate-800 flex">

  <!-- Desktop Sidebar -->
  <aside class="hidden md:flex flex-col items-center gap-2 w-20 py-8 sticky top-0 h-screen border-r border-orange-100 bg-white/80 shrink-0">
    <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-200" style="background: linear-gradient(135deg,#F77104,#f5a623)">
      <span class="text-white font-black text-sm">🍺</span>
    </div>
    ${['Home','Esplora','Locali','Salvati','Profilo'].map((l, i) => `
    <button class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${i===1 ? 'bg-[#F77104] text-white shadow-md shadow-orange-200' : 'text-slate-400 hover:bg-orange-50 hover:text-[#F77104]'}" title="${l}">
      <span class="text-base">${['🏠','🧭','📍','❤️','👤'][i]}</span>
    </button>`).join('')}
  </aside>

  <!-- Main Content -->
  <div class="flex-1 overflow-y-auto pb-28 md:pb-8 max-w-4xl">

    <!-- Header -->
    <header class="px-5 md:px-8 pt-12 md:pt-8 pb-4 flex justify-between items-start">
      <div>
        <p class="text-sm text-[#F77104] font-semibold uppercase tracking-wider mb-0.5">Fermenta.to</p>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">Buonasera, Marco 👋</h1>
        <p class="text-sm text-slate-500 mt-1">Cosa vuoi assaggiare oggi?</p>
      </div>
      <button class="relative w-11 h-11 rounded-2xl bg-white shadow-sm border border-orange-100 flex items-center justify-center text-slate-500 mt-1">
        🔔
        <span class="absolute top-2 right-2 w-2 h-2 bg-[#F77104] rounded-full"></span>
      </button>
    </header>

    <!-- Search -->
    <div class="px-5 md:px-8 mb-6">
      <div class="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-orange-100">
        <span class="text-slate-400 shrink-0">🔍</span>
        <span class="text-sm text-slate-400">Cerca birra, birrificio, locale...</span>
      </div>
    </div>

    <!-- Grid -->
    <div class="px-5 md:px-8 md:grid md:grid-cols-5 md:gap-8 md:items-start">
      <div class="md:col-span-3 space-y-8">

        <!-- Consigliati -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold text-slate-900">Consigliati per te</h2>
            <button class="text-sm text-[#F77104] font-semibold">Tutti →</button>
          </div>
          <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            ${[
              {name:'Nebbia Rossa',style:'IPA',brewery:'Hype Brewing',rating:'4.3',abv:'6.2%',color:'#F77104'},
              {name:'Luna Sour',style:'Sour',brewery:'Baladin',rating:'4.5',abv:'5.0%',color:'#CFA865'},
              {name:'Orso Bruno',style:'Stout',brewery:'Birra del Borgo',rating:'4.1',abv:'7.1%',color:'#5C3D1E'},
            ].map(b => `
            <div class="shrink-0 w-44 bg-white rounded-3xl shadow-sm border border-orange-50 overflow-hidden">
              <div class="h-32 flex items-center justify-center" style="background: linear-gradient(135deg,${b.color}22,${b.color}55)">
                <div class="w-16 h-16 rounded-full border-4 border-white/60 shadow-inner flex items-center justify-center text-3xl">🍺</div>
              </div>
              <div class="p-3">
                <p class="font-bold text-sm text-slate-900 truncate">${b.name}</p>
                <p class="text-xs text-slate-500 mb-2">${b.brewery}</p>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${b.color}22;color:${b.color}">${b.style}</span>
                  <span class="text-xs font-bold text-amber-500">⭐ ${b.rating}</span>
                </div>
              </div>
            </div>`).join('')}
          </div>
        </section>

        <!-- Locali vicini -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold text-slate-900">Locali vicino a te</h2>
            <button class="text-sm text-[#F77104] font-semibold">Vedi mappa →</button>
          </div>
          <div class="space-y-3">
            ${[
              {name:'Luppolino Pub',distance:'320m',beers:14,rating:'4.6',open:true,tag:'Tap Room'},
              {name:'The Malt District',distance:'850m',beers:22,rating:'4.8',open:true,tag:'Craft Bar'},
              {name:'Birreria Centrale',distance:'1.2km',beers:8,rating:'4.2',open:false,tag:'Pub'},
            ].map(v => `
            <div class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style="background:#F7710415">
                <span class="text-xl">🏠</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="font-bold text-sm text-slate-900 truncate">${v.name}</p>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold shrink-0">${v.tag}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span>📍 ${v.distance}</span>
                  <span>🍺 ${v.beers} birre</span>
                  <span>⭐ ${v.rating}</span>
                </div>
              </div>
              <span class="text-xs font-semibold px-2 py-1 rounded-full ${v.open ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}">${v.open ? 'Aperto' : 'Chiuso'}</span>
            </div>`).join('')}
          </div>
        </section>

        <!-- Trending -->
        <section>
          <div class="flex items-center gap-2 mb-3">
            <span class="text-base">📈</span>
            <h2 class="text-lg font-bold text-slate-900">In tendenza</h2>
          </div>
          <div class="space-y-3">
            ${[
              {name:'Vallée Blanche',style:'Saison',brewery:'Extraomnes',rating:'4.7',trend:'+18% questa settimana'},
              {name:'Dada',style:'APA',brewery:'Revelation Cat',rating:'4.4',trend:'+12% questa settimana'},
            ].map(b => `
            <div class="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-orange-50">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                <span>🍺</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-slate-900 truncate">${b.name}</p>
                <p class="text-xs text-slate-500">${b.brewery} · ${b.style}</p>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xs font-bold text-amber-500">⭐ ${b.rating}</div>
                <div class="text-[10px] text-emerald-500 font-semibold">${b.trend}</div>
              </div>
            </div>`).join('')}
          </div>
        </section>
      </div>

      <!-- Right: Map -->
      <div class="md:col-span-2 mt-8 md:mt-0 md:sticky md:top-8">
        <div class="relative w-full h-52 md:h-80 rounded-3xl overflow-hidden border border-orange-100 shadow-sm" style="background:#E8F0E9">
          <div style="width:100%;height:100%;background:linear-gradient(135deg,#d8e8d8,#eef4ee);display:flex;align-items:center;justify-content:center;">
            <div style="text-align:center;color:#88a888">
              <div style="font-size:40px">🗺️</div>
              <p style="font-size:12px;margin-top:8px;font-weight:600">Mappa interattiva</p>
            </div>
          </div>
          <div class="absolute bottom-3 right-3 bg-white rounded-2xl px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-semibold text-[#F77104]">
            🧭 La tua posizione
          </div>
          <div class="absolute top-3 left-3 bg-white rounded-2xl px-3 py-1.5 shadow-md text-xs font-bold text-slate-700">
            Roma · Prati
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile Bottom Nav -->
  <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
    <div class="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl border border-orange-50">
      ${['🏠 Home','🧭 Esplora','📷 Scan','❤️ Salvati','👤 Profilo'].map((l, i) => `
      <button class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full ${i===1 ? 'bg-[#F77104] text-white' : 'text-slate-400'}">
        <span class="text-base">${l.split(' ')[0]}</span>
        <span class="text-[10px] font-semibold">${l.split(' ')[1]}</span>
      </button>`).join('')}
    </div>
  </nav>
</div>`;

// ─── Screen 2: Pub Detail ────────────────────────────────────────────────────
const screen2 = `
<div class="min-h-screen bg-[#FFF8F2] font-sans text-slate-800 flex">
  <!-- Sidebar (same as screen 1) -->
  <aside class="hidden md:flex flex-col items-center gap-2 w-20 py-8 sticky top-0 h-screen border-r border-orange-100 bg-white/80 shrink-0">
    <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style="background:linear-gradient(135deg,#F77104,#f5a623)">
      <span class="text-white font-black text-sm">🍺</span>
    </div>
    ${['🏠','🧭','📍','❤️','👤'].map((e, i) => `<button class="w-12 h-12 rounded-2xl flex items-center justify-center ${i===2?'bg-[#F77104] text-white':'text-slate-400 hover:bg-orange-50'}"><span class="text-base">${e}</span></button>`).join('')}
  </aside>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto pb-28 md:pb-8">
    <!-- Hero -->
    <div class="relative h-64 md:h-80 overflow-hidden" style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:80px;opacity:0.3">🏠</div>
      <div class="absolute inset-0" style="background:linear-gradient(to top,rgba(0,0,0,0.7),transparent)"></div>
      <button class="absolute top-4 left-4 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">←</button>
      <button class="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">↗</button>
      <div class="absolute bottom-0 left-0 right-0 px-5 pb-5">
        <div class="flex items-end justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-400 text-white">Aperto ora</span>
              <span class="text-xs text-white/70">Chiude alle 00:00</span>
            </div>
            <h1 class="text-2xl font-bold text-white">Luppolino Pub</h1>
            <p class="text-sm text-white/80 flex items-center gap-1 mt-0.5">📍 Via Santa Maria Maggiore 12, Roma · Prati</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black text-white">4.6</div>
            <div class="text-yellow-400 text-sm">★★★★☆</div>
            <div class="text-xs text-white/60">847 recensioni</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick stats -->
    <div class="px-5 md:px-8 -mt-4 mb-6 relative z-10">
      <div class="grid grid-cols-3 gap-3">
        ${[
          {emoji:'🍺',val:'14',label:'Birre alla spina'},
          {emoji:'💰',val:'€€',label:'Fascia di prezzo'},
          {emoji:'📍',val:'320m',label:'Da te'},
        ].map(s => `
        <div class="bg-white rounded-2xl p-3 text-center shadow-sm border border-orange-50">
          <div class="text-xl mb-1">${s.emoji}</div>
          <div class="text-base font-black text-slate-900">${s.val}</div>
          <div class="text-[10px] text-slate-500">${s.label}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Taplist -->
    <div class="px-5 md:px-8 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-900">🍺 Birre alla spina</h2>
        <button class="text-sm text-[#F77104] font-semibold">Tutte →</button>
      </div>
      <div class="space-y-3">
        ${[
          {name:'Nebbia Rossa',style:'IPA',abv:'6.2%',brewery:'Hype Brewing',rating:'4.3',price:'6.50',color:'#F77104'},
          {name:'Dada',style:'APA',abv:'5.4%',brewery:'Revelation Cat',rating:'4.4',price:'5.80',color:'#CFA865'},
          {name:'Luna Sour',style:'Sour',abv:'5.0%',brewery:'Baladin',rating:'4.5',price:'6.00',color:'#E8A838'},
          {name:'Orso Bruno',style:'Stout',abv:'7.1%',brewery:'Birra del Borgo',rating:'4.1',price:'7.00',color:'#5C3D1E'},
        ].map(b => `
        <div class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style="background:${b.color}18">
            <span class="text-xl">🍺</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="font-bold text-sm text-slate-900 truncate">${b.name}</p>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style="background:${b.color}18;color:${b.color}">${b.style}</span>
            </div>
            <p class="text-xs text-slate-500">${b.brewery} · ${b.abv} ABV · ⭐ ${b.rating}</p>
          </div>
          <div class="text-right shrink-0">
            <div class="font-bold text-slate-900">€${b.price}</div>
            <div class="text-[10px] text-slate-400">/ pinta</div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Reviews -->
    <div class="px-5 md:px-8 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-900">💬 Recensioni</h2>
        <button class="text-sm font-semibold px-3 py-1.5 rounded-xl border border-[#F77104] text-[#F77104]">Scrivi</button>
      </div>
      <div class="space-y-4">
        ${[
          {user:'Giulia M.',avatar:'GM',rating:5,date:'2 giorni fa',text:'Selezione fantastica, personale preparato. La Nebbia Rossa alla spina è una poesia. Tornerò sicuro!'},
          {user:'Marco R.',avatar:'MR',rating:4,date:'1 settimana fa',text:'Bel locale, atmosfera curata. Ottima rotazione delle birre stagionali.'},
        ].map(r => `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-orange-50">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-[#F77104] text-xs font-bold">${r.avatar}</div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-slate-900">${r.user}</div>
              <div class="flex items-center gap-2">
                <div class="text-yellow-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                <span class="text-xs text-slate-400">${r.date}</span>
              </div>
            </div>
          </div>
          <p class="text-sm text-slate-600 leading-relaxed">${r.text}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Mobile Bottom Nav -->
  <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
    <div class="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl border border-orange-50">
      ${['🏠 Home','🧭 Esplora','📷 Scan','❤️ Salvati','👤 Profilo'].map((l, i) => `
      <button class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full ${i===2?'bg-[#F77104] text-white':'text-slate-400'}">
        <span class="text-base">${l.split(' ')[0]}</span>
        <span class="text-[10px] font-semibold">${l.split(' ')[1]}</span>
      </button>`).join('')}
    </div>
  </nav>
</div>`;

// ─── Screen 3: Beer Detail ───────────────────────────────────────────────────
const screen3 = `
<div class="min-h-screen bg-[#FFF8F2] font-sans pb-28 md:pb-0">
  <!-- Hero Header -->
  <div class="relative overflow-hidden" style="background:linear-gradient(160deg,#F77104 0%,#f98a0e 40%,#f5a623 100%);min-height:300px">
    <div style="position:absolute;inset:0;opacity:0.1;background:radial-gradient(circle at 70% 50%,white,transparent)"></div>
    <button class="absolute top-12 left-5 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">←</button>
    <button class="absolute top-12 right-5 w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">❤️</button>

    <div class="flex flex-col items-center pt-16 pb-8 px-6">
      <div class="w-28 h-28 rounded-full bg-white/25 backdrop-blur-sm border-4 border-white/40 flex items-center justify-center mb-4 shadow-2xl">
        <span class="text-6xl">🍺</span>
      </div>
      <span class="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">IPA · 6.2% ABV</span>
      <h1 class="text-3xl font-black text-white mb-1">Nebbia Rossa</h1>
      <p class="text-white/80 text-sm font-medium mb-4">Hype Brewing · Milano</p>
      <div class="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1.5">
        <span class="text-yellow-300">★</span>
        <span class="text-white font-bold">4.3</span>
        <span class="text-white/60 text-xs ml-1">/ 5 · 247 check-in</span>
      </div>
    </div>
  </div>

  <!-- Stats pills -->
  <div class="px-5 -mt-4 mb-6 flex gap-3 overflow-x-auto scrollbar-hide">
    ${[
      {label:'ABV',val:'6.2%',bg:'bg-orange-50',text:'text-[#F77104]'},
      {label:'IBU',val:'55',bg:'bg-amber-50',text:'text-amber-600'},
      {label:'EBC',val:'18',bg:'bg-stone-100',text:'text-stone-600'},
      {label:'Cal',val:'210',bg:'bg-rose-50',text:'text-rose-500'},
    ].map(s => `
    <div class="shrink-0 ${s.bg} rounded-2xl px-4 py-2.5 text-center shadow-sm border border-orange-50">
      <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">${s.label}</div>
      <div class="text-lg font-black ${s.text} mt-0.5">${s.val}</div>
    </div>`).join('')}
  </div>

  <!-- Description -->
  <div class="px-5 mb-6">
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
      <h3 class="font-bold text-slate-900 mb-2">Descrizione</h3>
      <p class="text-sm text-slate-600 leading-relaxed">Una IPA dal carattere intenso con note di frutta tropicale, agrumi e un finale amaro deciso. Luppolatura massiccia con Citra e Simcoe. Colore ambrato carico, schiuma compatta. Perfetta per gli amanti del luppolo.</p>
      <div class="flex flex-wrap gap-2 mt-3">
        ${['Fruttata','Luppolata','Amara','Agrumata'].map(t => `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#F77104]">${t}</span>`).join('')}
      </div>
    </div>
  </div>

  <!-- Birrificio -->
  <div class="px-5 mb-6">
    <div class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
      <div class="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 text-2xl">🏭</div>
      <div class="flex-1">
        <p class="text-xs text-slate-400 font-medium uppercase tracking-wide">Birrificio</p>
        <p class="font-bold text-slate-900">Hype Brewing</p>
        <p class="text-xs text-slate-500">Milano, Lombardia · Est. 2015</p>
      </div>
      <span class="text-[#F77104] text-sm font-bold">→</span>
    </div>
  </div>

  <!-- Dove trovarla -->
  <div class="px-5 mb-6">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-slate-900">📍 Dove trovarla</h3>
      <button class="text-sm text-[#F77104] font-semibold">Vedi tutti →</button>
    </div>
    <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      ${[
        {name:'Luppolino Pub',distance:'320m',city:'Roma'},
        {name:'The Malt District',distance:'850m',city:'Roma'},
      ].map(p => `
      <div class="shrink-0 w-44 bg-white rounded-2xl p-3 shadow-sm border border-orange-50">
        <p class="font-bold text-sm text-slate-900 truncate">${p.name}</p>
        <p class="text-xs text-slate-500 mt-0.5">📍 ${p.distance} · ${p.city}</p>
      </div>`).join('')}
    </div>
  </div>

  <!-- CTA -->
  <div class="px-5 pb-8">
    <button class="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-orange-200" style="background:linear-gradient(135deg,#F77104,#f5a623)">
      📷 Fai check-in con questa birra
    </button>
  </div>

  <!-- Mobile Bottom Nav -->
  <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
    <div class="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl border border-orange-50">
      ${['🏠 Home','🧭 Esplora','📷 Scan','❤️ Salvati','👤 Profilo'].map((l, i) => `
      <button class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full ${i===2?'bg-[#F77104] text-white':'text-slate-400'}">
        <span class="text-base">${l.split(' ')[0]}</span>
        <span class="text-[10px] font-semibold">${l.split(' ')[1]}</span>
      </button>`).join('')}
    </div>
  </nav>
</div>`;

// ─── Screen 4: Explore / Category Menu ──────────────────────────────────────
const screen4 = `
<div class="min-h-screen bg-[#FFF8F2] font-sans pb-28">
  <!-- Header -->
  <div class="px-5 pt-12 pb-4 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Esplora 🧭</h1>
      <p class="text-sm text-slate-500 mt-0.5">Birre, birrifici e pub in Italia</p>
    </div>
    <button class="w-10 h-10 rounded-2xl bg-white border border-orange-100 flex items-center justify-center shadow-sm text-slate-500">
      🔍
    </button>
  </div>

  <!-- Category chips -->
  <div class="px-5 mb-6">
    <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      ${['Tutti','IPA 🌿','Stout 🌑','Sour 🍋','Saison 🌾','Weizen 🌻','Porter 🍫','Pilsner 🌼'].map((c, i) => `
      <button class="shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${i===0?'text-white shadow-md shadow-orange-200':'bg-white text-slate-600 border border-orange-100'}" style="${i===0?'background:linear-gradient(135deg,#F77104,#f5a623)':''}">
        ${c}
      </button>`).join('')}
    </div>
  </div>

  <!-- Section: Birrifici in evidenza -->
  <div class="px-5 mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-900">🏭 Birrifici in evidenza</h2>
      <button class="text-sm text-[#F77104] font-semibold">Tutti →</button>
    </div>
    <div class="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
      ${[
        {name:'Hype Brewing',city:'Milano',beers:24,style:'IPA specialist'},
        {name:'Baladin',city:'Piozzo (CN)',beers:18,style:'Belgian styles'},
        {name:'Birra del Borgo',city:'Borgorose (RI)',beers:21,style:'Craft & creative'},
        {name:'Extraomnes',city:'Marnate (VA)',beers:16,style:'Belgian & Saison'},
      ].map(b => `
      <div class="shrink-0 w-40 bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50">
        <div class="h-24 flex items-center justify-center" style="background:linear-gradient(135deg,#F7710415,#F7710430)">
          <span class="text-4xl">🏭</span>
        </div>
        <div class="p-3">
          <p class="font-bold text-sm text-slate-900 leading-tight">${b.name}</p>
          <p class="text-xs text-slate-400 mt-0.5">📍 ${b.city}</p>
          <p class="text-xs text-[#F77104] font-semibold mt-1">${b.beers} birre · ${b.style}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Section: Pub top -->
  <div class="px-5 mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-900">🏠 Pub top d'Italia</h2>
      <button class="text-sm text-[#F77104] font-semibold">Mappa →</button>
    </div>
    <div class="space-y-3">
      ${[
        {name:'Luppolino Pub',city:'Roma',rating:'4.8',beers:22,tag:'Tap Room'},
        {name:'Open Baladin Torino',city:'Torino',rating:'4.7',beers:36,tag:'Flagship'},
        {name:'Birroteca',city:'Milano',rating:'4.6',beers:18,tag:'Craft Bar'},
      ].map((p, i) => `
      <div class="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-orange-50">
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm ${i===0?'bg-yellow-100 text-yellow-600':i===1?'bg-stone-100 text-stone-500':'bg-orange-50 text-orange-400'}">
          ${['🥇','🥈','🥉'][i]}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-bold text-sm text-slate-900 truncate">${p.name}</p>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">${p.tag}</span>
          </div>
          <p class="text-xs text-slate-500">📍 ${p.city} · 🍺 ${p.beers} birre</p>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm font-black text-slate-900">⭐ ${p.rating}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Section: Birre del momento -->
  <div class="px-5">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-900">🔥 Birre del momento</h2>
      <button class="text-sm text-[#F77104] font-semibold">Tutte →</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      ${[
        {name:'Nebbia Rossa',style:'IPA',brewery:'Hype',rating:'4.3',color:'#F77104'},
        {name:'Luna Sour',style:'Sour',brewery:'Baladin',rating:'4.5',color:'#CFA865'},
        {name:'Vallée Blanche',style:'Saison',brewery:'Extraomnes',rating:'4.7',color:'#88B04B'},
        {name:'Orso Bruno',style:'Stout',brewery:'Del Borgo',rating:'4.1',color:'#5C3D1E'},
      ].map(b => `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-orange-50">
        <div class="h-24 flex items-center justify-center" style="background:linear-gradient(135deg,${b.color}18,${b.color}35)">
          <span class="text-4xl">🍺</span>
        </div>
        <div class="p-3">
          <p class="font-bold text-sm text-slate-900 leading-tight truncate">${b.name}</p>
          <p class="text-xs text-slate-500">${b.brewery}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background:${b.color}18;color:${b.color}">${b.style}</span>
            <span class="text-xs font-bold text-amber-500">⭐ ${b.rating}</span>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Mobile Bottom Nav -->
  <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
    <div class="flex items-center gap-1 bg-white rounded-full px-4 py-3 shadow-2xl border border-orange-50">
      ${['🏠 Home','🧭 Esplora','📷 Scan','❤️ Salvati','👤 Profilo'].map((l, i) => `
      <button class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-full ${i===1?'bg-[#F77104] text-white':'text-slate-400'}">
        <span class="text-base">${l.split(' ')[0]}</span>
        <span class="text-[10px] font-semibold">${l.split(' ')[1]}</span>
      </button>`).join('')}
    </div>
  </nav>
</div>`;

// ─── Write files ─────────────────────────────────────────────────────────────
const outDir = path.join(process.cwd(), "exports/figma-screens");
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { name: "01-Home-BeerDiscovery.html", title: "Home – Beer Discovery", body: screen1 },
  { name: "02-PubDetail-Page.html", title: "Pub Detail Page", body: screen2 },
  { name: "03-BeerDetail-Page.html", title: "Beer Detail Page", body: screen3 },
  { name: "04-Explore-Category.html", title: "Esplora & Categorie", body: screen4 },
];

for (const f of files) {
  const html = HTML_WRAPPER(f.title, f.body);
  fs.writeFileSync(path.join(outDir, f.name), html, "utf8");
  console.log(`✅ Written: ${f.name} (${Math.round(html.length / 1024)}kb)`);
}

// Create ZIP
execSync(`cd exports && zip -r figma-screens.zip figma-screens/`, { stdio: "inherit" });
console.log("\n🎉 Done! File: exports/figma-screens.zip");
