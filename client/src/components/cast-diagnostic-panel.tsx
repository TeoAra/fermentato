import { useEffect, useState } from "react";

type Diag = {
  discoveryActive: boolean;
  deviceCount: number;
  devices: { name: string; modelName: string; deviceID: string; category: string }[];
  lastErrorCode?: number;
  lastErrorSource?: string;
  pluginBuildId?: string;
  appId?: string;
} | null;

const ERR_LABELS: Record<number, string> = {
  [-1]: "USER_CANCELLED (picker chiuso senza scegliere)",
  7:    "NETWORK_ERROR",
  15:   "TIMEOUT",
  2002: "APPLICATION_NOT_FOUND (app ID non registrato/pubblicato)",
  2003: "APPLICATION_NOT_RUNNING",
  2005: "AUTHENTICATION_FAILED (sender package non autorizzato in Cast Console)",
};

function getRegisteredPlugins(): string[] {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.Plugins) return [];
    return Object.keys(cap.Plugins).sort();
  } catch {
    return [];
  }
}

// Chiamata diretta al plugin nativo (bypassa useChromecast) per esporre
// l'eventuale errore grezzo dalla bridge nativa — fondamentale per capire
// se il metodo non esiste lato Swift o se crasha runtime.
async function callGetDiagnosticsDirect(): Promise<
  { ok: true; data: Diag } | { ok: false; error: string }
> {
  try {
    const cap = (window as any).Capacitor;
    const plugin = cap?.Plugins?.NativeCast;
    if (!plugin) return { ok: false, error: "Capacitor.Plugins.NativeCast assente" };
    if (typeof plugin.getDiagnostics !== "function") {
      return { ok: false, error: "metodo getDiagnostics non esposto da JS" };
    }
    const data = await plugin.getDiagnostics();
    return { ok: true, data };
  } catch (e: any) {
    const msg =
      e?.message ||
      e?.errorMessage ||
      (typeof e === "string" ? e : JSON.stringify(e ?? "?"));
    return { ok: false, error: msg };
  }
}

export function CastDiagnosticPanel() {
  const [diag, setDiag] = useState<Diag>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pluginAvailable, setPluginAvailable] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [plugins, setPlugins] = useState<string[]>([]);
  // Receiver ID configurato lato server (env CAST_APP_ID). 6666EC62 = custom
  // Fermenta, CC1AD845 = Default Media Receiver di Google (non funziona per
  // pagine web — solo media URL).
  const [serverAppId, setServerAppId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cast-config")
      .then((r) => r.json())
      .then((c) => setServerAppId(c?.appId ?? null))
      .catch(() => setServerAppId(null));
  }, []);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const r = await callGetDiagnosticsDirect();
      if (!mounted) return;
      setPlugins(getRegisteredPlugins());
      setLastUpdate(Date.now());
      if (r.ok) {
        setPluginAvailable(true);
        setDiag(r.data);
        setLastError(null);
      } else {
        setPluginAvailable(false);
        setDiag(null);
        setLastError(r.error);
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const isDefaultReceiver = serverAppId === "CC1AD845";
  const receiverLabel =
    serverAppId === null
      ? "…"
      : isDefaultReceiver
        ? `${serverAppId} (default Google — non funziona per HTML!)`
        : `${serverAppId} (custom Fermenta)`;

  return (
    <div className="border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-3 bg-stone-50 dark:bg-stone-900/40 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-700 dark:text-stone-300">
          Diagnostica Cast
        </span>
        <span className="text-[10px] text-stone-400 font-mono">
          v3 · {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
      {diag?.pluginBuildId && (
        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 -mt-1">
          plugin build: {diag.pluginBuildId}
        </div>
      )}
      {diag && !diag.pluginBuildId && (
        <div className="text-[10px] font-mono text-red-600 dark:text-red-400 -mt-1">
          ⚠ plugin Kotlin VECCHIO — rebuilda l'APK (./scripts/build-apk.sh)
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono">
        <span className="text-stone-500">Plugin nativo:</span>
        <span className={pluginAvailable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {pluginAvailable === null ? "…" : pluginAvailable ? "OK" : "NON DISPONIBILE"}
        </span>
        <span className="text-stone-500">Discovery:</span>
        <span className={diag?.discoveryActive ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
          {diag === null ? "—" : diag.discoveryActive ? "attiva" : "inattiva"}
        </span>
        <span className="text-stone-500">Receiver ID:</span>
        <span className={isDefaultReceiver ? "text-red-600 dark:text-red-400 font-bold" : "text-green-600 dark:text-green-400"}>
          {receiverLabel}
        </span>
        <span className="text-stone-500">Device trovati:</span>
        <span className={diag && diag.deviceCount > 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-stone-700 dark:text-stone-300"}>
          {diag === null ? "—" : diag.deviceCount}
        </span>
      </div>
      {diag && (diag.lastErrorCode ?? 0) !== 0 && (
        <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800">
          <p className="text-[11px] text-red-600 dark:text-red-400 font-mono leading-snug break-words">
            ❌ Ultimo errore: code {diag.lastErrorCode}
            {diag.lastErrorSource ? ` · ${diag.lastErrorSource}` : ""}
          </p>
          {ERR_LABELS[diag.lastErrorCode!] && (
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-snug mt-0.5">
              → {ERR_LABELS[diag.lastErrorCode!]}
            </p>
          )}
        </div>
      )}
      {diag && diag.devices.length > 0 && (
        <ul className="pt-1.5 border-t border-stone-200 dark:border-stone-800 space-y-0.5">
          {diag.devices.map((d, i) => (
            <li key={i} className="text-stone-700 dark:text-stone-300 font-mono">
              · {d.name} <span className="text-stone-400">({d.modelName})</span>
            </li>
          ))}
        </ul>
      )}
      {pluginAvailable === false && lastError && (
        <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800 space-y-1">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            Errore nativo:
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug font-mono break-words">
            {lastError}
          </p>
        </div>
      )}
      {plugins.length > 0 && (
        <details className="pt-1.5 border-t border-stone-200 dark:border-stone-800">
          <summary className="text-stone-500 cursor-pointer text-[11px]">
            Plugin Capacitor registrati ({plugins.length})
          </summary>
          <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
            {plugins.map((p) => (
              <li
                key={p}
                className={
                  p === "NativeCast"
                    ? "text-green-600 dark:text-green-400 font-bold"
                    : "text-stone-600 dark:text-stone-400"
                }
              >
                {p === "NativeCast" ? "✓ " : "· "}
                {p}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
