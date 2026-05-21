import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { APP_VERSION } from "@/lib/app-version";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface VersionInfo {
  current: string;
  minimum: string;
  downloadUrl: string;
  releaseNotes: string;
}

function semverLt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return true;
    if (na > nb) return false;
  }
  return false;
}

// ── Banner morbido (non-bloccante) per web, PWA e iOS ──────────────────────────
// Su iOS non blocchiamo mai l'utente: l'aggiornamento dipende da App Store
// e non possiamo forzarlo. L'utente può ignorare il banner e continuare.
function SoftUpdateBanner({
  version,
  onReload,
  onDismiss,
}: {
  version: string;
  onReload: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-nav-above left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white dark:bg-[#15202B] border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
        <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-snug">
            Nuova versione disponibile ({version})
          </p>
        </div>
        <Button
          size="sm"
          onClick={onReload}
          className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs h-8 px-3"
        >
          Ricarica
        </Button>
        <button
          onClick={onDismiss}
          className="text-stone-400 hover:text-stone-600 flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Dialog blocco SOLO per Android ──────────────────────────────────────────────
// Su Android tu controlli l'APK (build locale su VPS). Quando la versione
// installata è obsoleta, blocchiamo con un reload — l'app è una shell che
// carica JS dal server (capacitor.config server.url), quindi basta ricaricare.
function AndroidHardBlock({ versionInfo, onReload }: {
  versionInfo: VersionInfo;
  onReload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4">
      <div className="bg-white dark:bg-[#15202B] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div
          className="px-6 pt-8 pb-4 text-center"
          style={{ background: "linear-gradient(135deg, #f77104 0%, #e05a00 100%)" }}
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Aggiornamento richiesto</h2>
          <p className="text-white/80 text-sm mt-1">
            Versione installata: <strong>{APP_VERSION}</strong> · Richiesta: <strong>{versionInfo.minimum}</strong>
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {versionInfo.releaseNotes || "È disponibile una nuova versione. Ricarica l'app per aggiornare."}
          </p>

          <Button
            onClick={onReload}
            className="w-full h-12 text-base font-bold"
            style={{ background: "linear-gradient(135deg, #f77104 0%, #e05a00 100%)" }}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Ricarica app
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            L'app si ricaricherà per scaricare la versione aggiornata dal server.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principale ───────────────────────────────────────────────────────────────
// Strategia per piattaforma:
//   • Android  → hard block (dialog modale) — tu controlli l'APK
//   • iOS      → soft banner (ignorabile)   — aggiornamento via App Store
//   • Web/PWA  → soft banner (ignorabile)   — reload quando l'utente vuole
export function AppUpdateCheck() {
  const isNative = Capacitor.isNativePlatform();
  const platform = isNative ? Capacitor.getPlatform() : null;
  const isAndroid = platform === "android";
  const isIOS = platform === "ios";

  // Android: hard-block; iOS/Web: soft banner
  const [androidBlocked, setAndroidBlocked] = useState(false);
  const [androidVersionInfo, setAndroidVersionInfo] = useState<VersionInfo | null>(null);

  const [softUpdateVisible, setSoftUpdateVisible] = useState(false);
  const [softUpdateVersion, setSoftUpdateVersion] = useState("");
  const [softBannerDismissed, setSoftBannerDismissed] = useState(false);

  const loadedVersionRef = useRef<string | null>(null);
  const lastForegroundRef = useRef<number>(Date.now());

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const data: VersionInfo = await res.json();

      if (isAndroid) {
        // Android: blocco forzato se versione installata < minimo
        if (semverLt(APP_VERSION, data.minimum)) {
          setAndroidVersionInfo(data);
          setAndroidBlocked(true);
        }
      } else {
        // iOS / Web: banner morbido quando la versione sul server cambia
        if (loadedVersionRef.current === null) {
          loadedVersionRef.current = data.current;
        } else if (data.current !== loadedVersionRef.current && !softBannerDismissed) {
          setSoftUpdateVersion(data.current);
          setSoftUpdateVisible(true);
        }
      }
    } catch {
      // Rete non disponibile — ignora silenziosamente
    }
  }, [isAndroid, softBannerDismissed]);

  // Check periodico all'avvio e ogni 5 minuti
  useEffect(() => {
    const t = setTimeout(check, 3000);
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [check]);

  // Auto-reload quando l'app nativa torna in primo piano:
  // se è stata in background per più di 5 min, ricarica per prendere
  // eventuali aggiornamenti JS dal server (capacitor.config server.url).
  useEffect(() => {
    if (!isNative) return;
    let listener: { remove: () => void } | null = null;

    const setup = async () => {
      listener = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        const now = Date.now();
        // Torna in primo piano dopo > 5 min in background → ricarica
        if (now - lastForegroundRef.current > 5 * 60 * 1000) {
          window.location.reload();
        }
        lastForegroundRef.current = now;
        // Controlla anche se la versione minima è cambiata
        check();
      });
    };
    setup();
    return () => { listener?.remove(); };
  }, [isNative, check]);

  const handleReload = () => {
    window.location.reload();
  };

  // Android: dialog bloccante
  if (isAndroid && androidBlocked && androidVersionInfo) {
    return (
      <AndroidHardBlock
        versionInfo={androidVersionInfo}
        onReload={handleReload}
      />
    );
  }

  // iOS / Web: banner morbido non-bloccante
  if (softUpdateVisible && !softBannerDismissed) {
    return (
      <SoftUpdateBanner
        version={softUpdateVersion}
        onReload={handleReload}
        onDismiss={() => setSoftBannerDismissed(true)}
      />
    );
  }

  return null;
}
