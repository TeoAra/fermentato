import { Search, MapPin, Beer, Building2, Star, ArrowRight, ChevronRight, Smartphone, ScanLine, Users } from "lucide-react";

export function Landing() {
  return (
    <div
      className="bg-[#f5f0eb] overflow-y-auto"
      style={{ fontFamily: "'Poppins', sans-serif", minHeight: "100vh" }}
    >
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#ece5dc]/60">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 h-[60px]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍺</span>
            <span
              className="text-[20px] font-bold text-[#1a1207] tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Fermenta.to
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a className="text-[13px] font-medium text-[#7c7065] hover:text-[#1a1207] transition-colors">Birre</a>
            <a className="text-[13px] font-medium text-[#7c7065] hover:text-[#1a1207] transition-colors">Pub</a>
            <a className="text-[13px] font-medium text-[#7c7065] hover:text-[#1a1207] transition-colors">Birrifici</a>
            <a className="text-[13px] font-medium text-[#7c7065] hover:text-[#1a1207] transition-colors">Festival</a>
          </div>
          <button className="bg-[#ea580c] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#dc4f07] transition-colors shadow-[0_2px_8px_rgba(234,88,12,0.2)]">
            Accedi gratis
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-16">
        <div className="grid grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[12px] font-medium text-[#7c7065]">1.186.000 birre catalogate</span>
            </div>
            <h1
              className="text-[52px] font-black text-[#1a1207] leading-[1.05] tracking-tight mb-6"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              La birra artigianale,
              <br />
              <span className="text-[#ea580c]" style={{ fontStyle: "italic" }}>
                a portata di mano.
              </span>
            </h1>
            <p className="text-[17px] text-[#7c7065] leading-relaxed mb-8 max-w-[480px]">
              Trova i pub vicini con le taplist aggiornate in tempo reale. Scopri birrifici
              da tutto il mondo. Scansiona l'etichetta e sai tutto.
            </p>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-[#ea580c] text-white text-[14px] font-semibold px-6 py-3.5 rounded-2xl hover:bg-[#dc4f07] transition-colors shadow-[0_4px_16px_rgba(234,88,12,0.25)]">
                Inizia gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 bg-white text-[#1a1207] text-[14px] font-semibold px-6 py-3.5 rounded-2xl border border-[#ece5dc] hover:bg-[#faf7f2] transition-colors">
                <Search className="w-4 h-4 text-[#7c7065]" />
                Esplora senza account
              </button>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-[280px] h-[560px] bg-white rounded-[40px] border-[6px] border-[#1a1207] shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-b from-[#1a1207] to-[#2d1b0e] h-full p-4 pt-10">
                  {/* Fake app screen */}
                  <div className="bg-[#f5f0eb] rounded-2xl h-full overflow-hidden">
                    <div className="bg-white px-4 py-3 border-b border-[#ece5dc]">
                      <span className="text-[14px] font-bold text-[#1a1207]" style={{ fontFamily: "'Fraunces', serif" }}>
                        Fermenta.to
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="bg-white rounded-xl p-3 mb-2.5 border border-[#ece5dc]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2d1b0e] to-[#4a3020]" />
                          <div>
                            <div className="w-20 h-2.5 bg-[#1a1207] rounded-full" />
                            <div className="w-14 h-2 bg-[#ece5dc] rounded-full mt-1" />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-14 h-5 bg-[#ecfeff] rounded-full" />
                          <div className="w-10 h-5 bg-[#f0fdf4] rounded-full" />
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 mb-2.5 border border-[#ece5dc]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a96a] to-[#c17f59]" />
                          <div>
                            <div className="w-24 h-2.5 bg-[#1a1207] rounded-full" />
                            <div className="w-16 h-2 bg-[#ece5dc] rounded-full mt-1" />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-12 h-5 bg-[#fef3c7] rounded-full" />
                          <div className="w-16 h-5 bg-[#ecfeff] rounded-full" />
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-[#ece5dc]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3d2b1f] to-[#5c4033]" />
                          <div>
                            <div className="w-16 h-2.5 bg-[#1a1207] rounded-full" />
                            <div className="w-20 h-2 bg-[#ece5dc] rounded-full mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-[#ea580c] rounded-2xl flex items-center justify-center shadow-lg rotate-6">
                <ScanLine className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white border-y border-[#ece5dc]">
        <div className="max-w-[1200px] mx-auto px-8 py-16">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold text-[#ea580c] uppercase tracking-widest mb-2">Come funziona</p>
            <h2
              className="text-[32px] font-bold text-[#1a1207] tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Tutto sulla birra artigianale, in un'app
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: MapPin, title: "Trova pub vicini",
                desc: "Geolocalizzazione GPS e taplist aggiornate in tempo reale. Sai cosa c'è alla spina prima di uscire.",
                color: "#0e7490", bg: "#ecfeff"
              },
              {
                icon: ScanLine, title: "Scansiona etichette",
                desc: "Inquadra la birra con la fotocamera e ottieni scheda tecnica, recensioni e abbinamenti.",
                color: "#ea580c", bg: "#fef3ea"
              },
              {
                icon: Building2, title: "Esplora birrifici",
                desc: "2.400 birrifici italiani e 50.000 nel mondo. Catalogo completo con stili, ABV e dove trovarle.",
                color: "#7c3aed", bg: "#f5f3ff"
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-[#faf7f2] rounded-2xl p-7 border border-[#ece5dc] shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: f.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: f.color }} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1a1207] mb-2">{f.title}</h3>
                  <p className="text-[13px] text-[#7c7065] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-[#1a1207]">
        <div className="max-w-[1200px] mx-auto px-8 py-12">
          <div className="flex justify-around text-center">
            {[
              { n: "1.186.000", l: "Birre catalogate", icon: Beer },
              { n: "8.200+", l: "Pub con taplist live", icon: MapPin },
              { n: "2.400", l: "Birrifici italiani", icon: Building2 },
              { n: "50.000+", l: "Birrifici nel mondo", icon: Users },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.l}>
                  <Icon className="w-5 h-5 text-[#a39889] mx-auto mb-2" strokeWidth={1.5} />
                  <p
                    className="text-[28px] font-bold text-white tracking-tight"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {s.n}
                  </p>
                  <p className="text-[12px] text-[#a39889] mt-1">{s.l}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-[1200px] mx-auto px-8 py-20 text-center">
        <h2
          className="text-[36px] font-bold text-[#1a1207] tracking-tight mb-4"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Pronto a esplorare?
        </h2>
        <p className="text-[16px] text-[#7c7065] mb-8 max-w-[500px] mx-auto">
          Crea il tuo profilo in 10 secondi. Nessuna carta di credito, nessun abbonamento.
          100% gratuito, per sempre.
        </p>
        <button className="bg-[#ea580c] text-white text-[15px] font-semibold px-8 py-4 rounded-2xl hover:bg-[#dc4f07] transition-colors shadow-[0_4px_20px_rgba(234,88,12,0.25)]">
          Inizia gratis — è immediato
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#1a1207] border-t border-[#2d1b0e]">
        <div className="max-w-[1200px] mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍺</span>
              <span className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Fraunces', serif" }}>
                Fermenta.to
              </span>
            </div>
            <p className="text-[12px] text-[#7c7065]">© 2025 Fermenta.to — La birra artigianale italiana</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
