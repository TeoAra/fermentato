import { useEffect, useState } from "react";
import { useChromecast } from "@/hooks/useChromecast";

type Diag = {
  discoveryActive: boolean;
  deviceCount: number;
  devices: { name: string; modelName: string; deviceID: string; category: string }[];
} | null;

function getRegisteredPlugins(): string[] {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.Plugins) return [];
    return Object.keys(cap.Plugins).sort();
  } catch {
    return [];
  }
}

export function CastDiagnosticPanel() {
  const { getDiagnostics } = useChromecast();
  const [diag, setDiag] = useState<Diag>(null);
  const [pluginAvailable, setPluginAvailable] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [plugins, setPlugins] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const d = await getDiagnostics();
        if (!mounted) return;
        setPluginAvailable(d !== null);
        setDiag(d);
        setPlugins(getRegisteredPlugins());
        setLastUpdate(Date.now());
      } catch {
        if (!mounted) return;
        setPluginAvailable(false);
        setPlugins(getRegisteredPlugins());
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [getDiagnostics]);

  return (
    <div className="border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-3 bg-stone-50 dark:bg-stone-900/40 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-700 dark:text-stone-300">
          Diagnostica Cast
        </span>
        <span className="text-[10px] text-stone-400 font-mono">
          v2 · {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
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
        <span className="text-stone-700 dark:text-stone-300">CC1AD845 (default)</span>
        <span className="text-stone-500">Device trovati:</span>
        <span className={diag && diag.deviceCount > 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-stone-700 dark:text-stone-300"}>
          {diag === null ? "—" : diag.deviceCount}
        </span>
      </div>
      {diag && diag.devices.length > 0 && (
        <ul className="pt-1.5 border-t border-stone-200 dark:border-stone-800 space-y-0.5">
          {diag.devices.map((d, i) => (
            <li key={i} className="text-stone-700 dark:text-stone-300 font-mono">
              · {d.name} <span className="text-stone-400">({d.modelName})</span>
            </li>
          ))}
        </ul>
      )}
      {pluginAvailable === false && (
        <p className="pt-1.5 border-t border-stone-200 dark:border-stone-800 text-amber-600 dark:text-amber-400 leading-snug">
          Il plugin nativo Cast non è caricato. Probabilmente stai usando un build TestFlight vecchio: verifica su TestFlight che ci sia un build più recente disponibile e installalo.
        </p>
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
