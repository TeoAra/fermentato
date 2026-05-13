import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "@/lib/app-version";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

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

// ── Banner leggero per web / PWA ─────────────────────────────────────────────
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

// ── Schermata blocco per APK nativo datato ────────────────────────────────────
function NativeUpdateBlock({ versionInfo, downloading, onDownload }: {
  versionInfo: VersionInfo;
  downloading: boolean;
  onDownload: () => void;
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
          {versionInfo.releaseNotes ? (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {versionInfo.releaseNotes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              È disponibile una nuova versione dell'app. Scaricala e installala per continuare.
            </p>
          )}

          <Button
            onClick={onDownload}
            disabled={downloading}
            className="w-full h-12 text-base font-bold"
            style={{ background: "linear-gradient(135deg, #f77104 0%, #e05a00 100%)" }}
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Apertura…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Scarica aggiornamento
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Dopo il download, apri il file .apk per installarlo.{"\n"}
            Potrebbe essere necessario abilitare le sorgenti sconosciute.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────
export function AppUpdateCheck() {
  const isNative = Capacitor.isNativePlatform();

  // Native: hard-block se versione APK < minimo richiesto dal server
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Web: banner leggero se la versione del server cambia dopo il caricamento
  const [webUpdateAvailable, setWebUpdateAvailable] = useState(false);
  const [webBannerDismissed, setWebBannerDismissed] = useState(false);
  const loadedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minuti

    const check = async () => {
      try {
        const res = await fetch("/api/app-version");
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
    };

    const t = setTimeout(check, 3000);
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [isNative]);

  const handleDownload = () => {
    setDownloading(true);
    window.open(versionInfo!.downloadUrl, "_blank");
    setTimeout(() => setDownloading(false), 3000);
  };

  if (isNative && updateRequired && versionInfo) {
    return (
      <NativeUpdateBlock
        versionInfo={versionInfo}
        downloading={downloading}
        onDownload={handleDownload}
      />
    );
  }

  if (!isNative && webUpdateAvailable && !webBannerDismissed) {
    return <WebUpdateBanner onDismiss={() => setWebBannerDismissed(true)} />;
  }

  return null;
}
