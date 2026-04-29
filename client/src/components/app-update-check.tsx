import { useEffect, useState } from "react";
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

export function AppUpdateCheck() {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const check = async () => {
      try {
        const res = await fetch("/api/app-version");
        if (!res.ok) return;
        const data: VersionInfo = await res.json();
        if (semverLt(APP_VERSION, data.minimum)) {
          setVersionInfo(data);
          setUpdateRequired(true);
        }
      } catch {
        // Rete non disponibile — ignora silenziosamente
      }
    };

    const t = setTimeout(check, 3000);
    return () => clearTimeout(t);
  }, []);

  if (!updateRequired || !versionInfo) return null;

  const handleDownload = () => {
    setDownloading(true);
    window.open(versionInfo.downloadUrl, "_blank");
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
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
              È disponibile una nuova versione dell'app. Scaricala e installala per continuare a usare Fermenta.to.
            </p>
          )}

          <Button
            onClick={handleDownload}
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
