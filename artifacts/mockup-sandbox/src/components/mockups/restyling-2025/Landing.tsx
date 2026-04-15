import { Search, MapPin, Beer, Building2, Star, ArrowRight, ScanLine, Users, Clock, Zap, TrendingUp } from "lucide-react";

export function Landing() {
  return (
    <div
      className="overflow-y-auto"
      style={{ fontFamily: "'Poppins', sans-serif", background: "#0d0805", color: "#f5ede0", minHeight: "100vh" }}
    >
      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-10 h-[64px]"
        style={{
          background: "rgba(13,8,5,0.95)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🍺</span>
          <span
            className="text-[22px] font-black tracking-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
          >
            Fermenta.to
          </span>
        </div>
        <div className="flex items-center gap-8">
          {["Birre", "Pub", "Birrifici", "Festival"].map((l) => (
            <a key={l} className="text-[13px] font-medium cursor-pointer" style={{ color: "#5a4432" }}>
              {l}
            </a>
          ))}
        </div>
        <button
          className="text-[13px] font-bold px-5 py-2.5 rounded-xl transition-all"
          style={{
            background: "linear-gradient(135deg, #f77104, #d45f03)",
            color: "#fff",
            boxShadow: "0 2px 12px rgba(247,113,4,0.25)",
          }}
        >
          Inizia gratis
        </button>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative px-10 pt-16 pb-20"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(247,113,4,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212,169,106,0.06) 0%, transparent 50%)",
        }}
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#22c55e" }}>
                14 locali live adesso a Milano
              </span>
            </div>

            <h1
              className="text-[52px] font-black leading-[1.02] tracking-tight mb-6"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Scopri cosa c'è
              <br />
              <span style={{ color: "#f77104", fontStyle: "italic" }}>
                alla spina adesso.
              </span>
            </h1>

            <p className="text-[17px] leading-relaxed mb-8 max-w-[480px]" style={{ color: "#a89070" }}>
              Taplist aggiornate in tempo reale dai pub vicini. Scansiona l'etichetta
              e sai tutto sulla birra. Gratis, immediato, senza registrazione obbligatoria.
            </p>

            <div className="flex items-center gap-3 mb-10">
              <button
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[14px] font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #f77104, #d45f03)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(247,113,4,0.3)",
                }}
              >
                Scopri cosa c'è in zona
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[14px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#a89070",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <Search className="w-4 h-4" />
                Esplora senza account
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              {[
                { n: "1.186k", l: "Birre" },
                { n: "8.2k", l: "Pub live" },
                { n: "2.4k", l: "Birrifici" },
              ].map((s) => (
                <div key={s.l}>
                  <p
                    className="text-[24px] font-black"
                    style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}
                  >
                    {s.n}
                  </p>
                  <p className="text-[11px]" style={{ color: "#5a4432" }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex justify-center items-center relative">
            {/* Glow */}
            <div
              className="absolute w-[300px] h-[300px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(247,113,4,0.15), transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
            />
            <div
              className="relative w-[260px] h-[540px] rounded-[44px] overflow-hidden"
              style={{ background: "#0d0805", border: "6px solid #1e1510", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}
            >
              {/* Mock screen */}
              <div className="h-full overflow-hidden" style={{ background: "#0d0805" }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-[14px] font-bold" style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}>Fermenta.to</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                    <span className="text-[9px]" style={{ color: "#22c55e" }}>14 live</span>
                  </div>
                </div>
                {/* Location bar */}
                <div className="flex items-center gap-1.5 px-4 py-2">
                  <MapPin className="w-3 h-3" style={{ color: "#f77104" }} />
                  <span className="text-[11px] font-medium" style={{ color: "#f5ede0" }}>Milano</span>
                </div>
                {/* Beer cards */}
                <div className="px-3 flex flex-col gap-2 mt-1">
                  {[
                    { name: "Tipopils", brewery: "Birrificio Italiano", pub: "Lambiczoon", dist: "0.3 km", hue: "#e9c46a", updated: "12 min fa" },
                    { name: "ReAle Extra", brewery: "Birra del Borgo", pub: "Hop Skin", dist: "0.9 km", hue: "#d4763e", updated: "28 min fa" },
                    { name: "Nora", brewery: "Baladin", pub: "Baladin", dist: "1.4 km", hue: "#c17f59", updated: "5 min fa" },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="rounded-xl overflow-hidden"
                      style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${b.hue}, transparent)` }} />
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${b.hue}22`, border: `1px solid ${b.hue}33` }}>
                          🍺
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold truncate" style={{ color: "#f5ede0" }}>{b.name}</p>
                          <p className="text-[9px]" style={{ color: "#5a4432" }}>{b.pub} · {b.dist}</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <span className="w-1 h-1 rounded-full" style={{ background: "#22c55e" }} />
                          <span className="text-[8px]" style={{ color: "#5a4432" }}>{b.updated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Scan badge */}
            <div
              className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl flex items-center justify-center text-white rotate-6"
              style={{ background: "linear-gradient(135deg, #f77104, #d45f03)", boxShadow: "0 4px 20px rgba(247,113,4,0.3)" }}
            >
              <ScanLine className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section
        className="px-10 py-16"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#f77104" }}>
              Come funziona
            </p>
            <h2
              className="text-[32px] font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
            >
              Tutto sulla birra artigianale, in un posto
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: MapPin, title: "Trova pub vicini", color: "#22d3ee", bg: "rgba(34,211,238,0.08)", desc: "GPS attivo → vedi i pub nei dintorni con taplist live, distanza, orari, status apertura." },
              { icon: ScanLine, title: "Scansiona le birre", color: "#f77104", bg: "rgba(247,113,4,0.08)", desc: "Inquadra l'etichetta. Ottieni scheda tecnica, recensioni, dove trovarla, abbinamenti." },
              { icon: Zap, title: "Taplist in tempo reale", color: "#22c55e", bg: "rgba(34,197,94,0.08)", desc: "I pub aggiornano cosa c'è in spina in 30 secondi. Tu lo vedi subito." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl p-7"
                  style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: f.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: f.color }} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[16px] font-bold mb-2" style={{ color: "#f5ede0" }}>{f.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#5a4432" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pub Onboarding ── */}
      <section className="px-10 py-16">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="rounded-3xl overflow-hidden p-10"
            style={{
              background: "linear-gradient(135deg, #1e1510 0%, #2a1e12 50%, #1e1510 100%)",
              border: "1px solid rgba(247,113,4,0.2)",
              boxShadow: "0 0 80px rgba(247,113,4,0.06)",
            }}
          >
            <div className="grid grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#f77104" }}>
                  Per i pub
                </p>
                <h2
                  className="text-[36px] font-black leading-tight tracking-tight mb-4"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
                >
                  Fatti trovare
                  <br />
                  dai tuoi clienti.
                </h2>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: "#a89070" }}>
                  Aggiorna la taplist in 30 secondi dal telefono.
                  I clienti nelle vicinanze ti trovano subito e vedono
                  cosa hai in spina oggi.
                </p>
                <div className="flex flex-col gap-2.5 mb-7">
                  {["Comparisci nelle ricerche di prossimità", "Taplist live visibile a tutti", "15 giorni di prova gratuita"].map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                      >
                        ✓
                      </span>
                      <span className="text-[13px]" style={{ color: "#a89070" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[14px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #f77104, #d45f03)",
                    color: "#fff",
                    boxShadow: "0 4px 20px rgba(247,113,4,0.3)",
                  }}
                >
                  Registra il tuo pub — 15 giorni gratis
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: "⏱", title: "30 secondi", desc: "Per aggiornare l'intera taplist" },
                  { icon: "📍", title: "Nearby discovery", desc: "Visibile ai clienti vicini in tempo reale" },
                  { icon: "📊", title: "Analytics", desc: "Quante persone hanno visto la tua taplist" },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl px-5 py-4 flex items-center gap-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-2xl flex-shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: "#f5ede0" }}>{f.title}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#5a4432" }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="px-10 py-20 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <h2
          className="text-[40px] font-black mb-4"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#f5ede0" }}
        >
          Pronto a esplorare?
        </h2>
        <p className="text-[16px] mb-8 max-w-[480px] mx-auto" style={{ color: "#5a4432" }}>
          Crea il profilo in 10 secondi. Nessun abbonamento, nessuna carta. 100% gratuito, per sempre.
        </p>
        <button
          className="px-10 py-4 rounded-2xl text-[15px] font-bold"
          style={{
            background: "linear-gradient(135deg, #f77104, #d45f03)",
            color: "#fff",
            boxShadow: "0 4px 24px rgba(247,113,4,0.3)",
          }}
        >
          Inizia gratis — è immediato
        </button>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-10 py-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🍺</span>
            <span className="text-[14px] font-semibold" style={{ fontFamily: "'Fraunces', serif", color: "#f5ede0" }}>
              Fermenta.to
            </span>
          </div>
          <p className="text-[12px]" style={{ color: "#2a1e12" }}>
            © 2025 Fermenta.to — La birra artigianale italiana
          </p>
        </div>
      </footer>
    </div>
  );
}
