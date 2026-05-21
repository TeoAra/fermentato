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

// ── Banner leggero per web / PWA ────────────────────────────────────────────
function WebUpdateBanner({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), 30_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-nav-above left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white dark:bg-[#15202B] border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
        <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <p className="flex-1 text-sm text-stone-700 dark:text-stone-300 leading-snug">
          Nuova versione disponibile
        </p>
        <Button
          size="sm"
          onClick={() => window.location.reload()}
          className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs h-8 px-3"
        >
          Aggiorna
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

// ── Dialog blocco per nativo (shell che carica JS da server.url) ────────────
// Quando server.url è attivo in capacitor.config.ts, l'app è una shell:
// il JS viene sempre caricato dal server, non dal bundle locale.
// Quindi per aggiornare basta ricaricare la pagina — non serve scaricare
// un nuovo APK. Il blocco mostra "Ricarica app" invece di "Scarica".
function NativeReloadBlock({ versionInfo, onReload }: {
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
export function AppUpdateCheck() {
  const isNative = Capacitor.isNativePlatform();

  // Native: hard-block se versione installata < minimo richiesto dal server
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  // Web: banner leggero se la versione del server cambia dopo il caricamento
  const [webUpdateAvailable, setWebUpdateAvailable] = useState(false);
  const [webBannerDismissed, setWebBannerDismissed] = useState(false);
  const loadedVersionRef = useRef<string | null>(null);
  const lastForegroundRef = useRef<number>(Date.now());

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const data: VersionInfo = await res.json();

      if (isNative) {
        // APK: blocco forzato se versione installata < minimo
        if (semverLt(APP_VERSION, data.minimum)) {
          setVersionInfo(data);
          setUpdateRequired(true);
        }
      } else {
        // Web: prima chiamata → memorizza versione corrente
        if (loadedVersionRef.current === null) {
          loadedVersionRef.current = data.current;
        } else if (data.current !== loadedVersionRef.current) {
          // Versione cambiata → nuovo deploy disponibile
          setWebUpdateAvailable(true);
        }
      }
    } catch {
      // Rete non disponibile — ignora silenziosamente
    }
  }, [isNative]);

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
        // Se torna in primo piano dopo > 5 min in background, ricarica
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

  if (isNative && updateRequired && versionInfo) {
    return (
      <NativeReloadBlock
        versionInfo={versionInfo}
        onReload={handleReload}
      />
    );
  }

  if (!isNative && webUpdateAvailable && !webBannerDismissed) {
    return <WebUpdateBanner onDismiss={() => setWebBannerDismissed(true)} />;
  }

  return null;
}
