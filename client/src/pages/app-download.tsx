import { useState, useEffect } from "react";
import { Download, Smartphone, Globe, CheckCircle2, ChevronRight, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "desktop";
}

export default function AppDownload() {
  const [platform] = useState(detectPlatform);
  const [apkAvailable, setApkAvailable] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/download/apk", { method: "HEAD" })
      .then(r => setApkAvailable(r.ok))
      .catch(() => setApkAvailable(false));
  }, []);

  const handleApkDownload = () => {
    setDownloading(true);
    window.location.href = "/api/download/apk";
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-[22px] bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden border border-primary/20">
            <img src="/icons/icon-192.png" alt="Fermenta.to" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            <span className="text-4xl" style={{display:'none'}}>🍺</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Fermenta.to</h1>
          <p className="text-sm text-muted-foreground">La birra artigianale italiana, in tasca</p>
        </div>

        {/* Android — APK diretto */}
        {(platform === "android" || platform === "desktop") && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4 space-y-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Android APK</p>
                  <p className="text-xs text-muted-foreground">Installazione diretta</p>
                </div>
              </div>

              {apkAvailable === true && (
                <Button
                  className="w-full gap-2 py-5 text-base bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApkDownload}
                  disabled={downloading}
                >
                  <Download className="h-5 w-5" />
                  {downloading ? "Download in corso…" : "Scarica APK"}
                </Button>
              )}

              {apkAvailable === false && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                    APK in preparazione — riprova tra qualche ora
                  </p>
                </div>
              )}

              {apkAvailable === null && (
                <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
              )}

              {apkAvailable && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">Come installare:</p>
                  {[
                    "Scarica l'APK con il pulsante sopra",
                    "Apri il file scaricato",
                    "Consenti \"Installa app da fonti sconosciute\" se richiesto",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-bold text-primary mt-0.5 w-3 shrink-0">{i + 1}.</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PWA alternativa */}
            <div className="rounded-2xl p-4 space-y-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Oppure: versione web</p>
                  <p className="text-xs text-muted-foreground">Aggiornata automaticamente</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.location.href = "/"}
              >
                Vai alla web app
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* iOS */}
        {platform === "ios" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4 space-y-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-500/10 flex items-center justify-center shrink-0">
                  <Apple className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">iPhone / iPad</p>
                  <p className="text-xs text-muted-foreground">App Store — prossimamente</p>
                </div>
              </div>
              <div className="bg-stone-50 dark:bg-[#15202B]/50 border border-stone-200 dark:border-[#2F3D4D] rounded-xl p-3">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  La versione App Store è in arrivo. Nel frattempo usa la <strong>web app</strong> — la salvi sullo schermo home e funziona come un'app.
                </p>
              </div>
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                onClick={() => window.location.href = "/"}
              >
                Apri la web app
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-2xl p-4 space-y-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <p className="text-xs font-medium text-muted-foreground">Come salvarla sullo schermo home:</p>
              {[
                "Apri fermenta.to in Chrome o Safari",
                "Tocca il menu ⋮ (Chrome) o il tasto condividi (Safari)",
                "Seleziona \"Aggiungi a schermata Home\"",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Versione web sempre aggiornata su{" "}
          <a href="/" className="text-primary font-medium underline-offset-2 hover:underline">
            fermenta.to
          </a>
        </p>
      </div>
    </div>
  );
}
