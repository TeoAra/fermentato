/**
 * useChromecast — Hook centralizzato per Google Cast.
 *
 * Su iOS/Android native (Capacitor) usa il plugin NativeCast che wrappa
 * il Google Cast SDK nativo (Swift su iOS, Kotlin su Android).
 *
 * Su browser/PWA usa il Google Cast JS SDK caricato in index.html.
 *
 * castState:
 *  "unavailable"    → SDK non disponibile
 *  "no_devices"     → nessun Chromecast trovato sulla rete
 *  "not_connected"  → dispositivo trovato, pronto per connettersi
 *  "connecting"     → connessione in corso
 *  "connected"      → taplist in streaming sulla TV
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

// ── Tipo del plugin nativo ────────────────────────────────────────────────────
interface NativeCastPlugin {
  initialize(options: { appId: string }): Promise<{ success: boolean }>;
  showPickerAndLoad(options: { url: string; title?: string }): Promise<{ success: boolean; loaded?: boolean }>;
  endSession(): Promise<{ success: boolean }>;
  getState(): Promise<{ state: string }>;
  getDiagnostics(): Promise<{
    discoveryActive: boolean;
    deviceCount: number;
    devices: Array<{ name: string; modelName: string; deviceID: string; category: string }>;
  }>;
  addListener(event: "castStateChanged", handler: (data: { state: string; deviceName?: string }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const NativeCast = registerPlugin<NativeCastPlugin>("NativeCast");

// ── Tipo pubblico ────────────────────────────────────────────────────────────
export type CastState =
  | "unavailable"
  | "no_devices"
  | "not_connected"
  | "connecting"
  | "connected";

export interface CastDiagnostics {
  discoveryActive: boolean;
  deviceCount: number;
  devices: Array<{ name: string; modelName: string; deviceID: string; category: string }>;
}

interface UseChromecastReturn {
  castState: CastState;
  deviceName: string;
  castToTV: (url: string, title?: string) => Promise<boolean>;
  stopCasting: () => void;
  isAvailable: boolean;
  isConnected: boolean;
  getDiagnostics: () => Promise<CastDiagnostics | null>;
}

// Entrambe le piattaforme native usano il plugin NativeCast
const isNative = Capacitor.isNativePlatform();
const isNativeIos = isNative && Capacitor.getPlatform() === "ios";

// ── Hook principale ──────────────────────────────────────────────────────────
export function useChromecast(): UseChromecastReturn {
  const [castState, setCastState] = useState<CastState>("unavailable");
  const [deviceName, setDeviceName] = useState("");
  // 6666EC62 = Fermenta custom Web Receiver registrato su Google Cast Developer
  // Console. È quello che sa interpretare l'URL della taplist (es. /tv/7) e
  // mostrarla a schermo intero sulla TV. Il Default Media Receiver di Google
  // (CC1AD845) NON funziona per pagine HTML — accetta solo URL media (mp4/m3u8).
  // Viene confermato dal /api/cast-config a runtime (env var CAST_APP_ID).
  const [appId, setAppId] = useState("6666EC62");
  const listenerRef = useRef<PluginListenerHandle | null>(null);

  // Carica app ID dal server
  useEffect(() => {
    fetch("/api/cast-config")
      .then((r) => r.json())
      .then((c) => { if (c.appId) setAppId(c.appId); })
      .catch(() => {});
  }, []);

  // ── iOS + Android native: inizializza il plugin NativeCast ────────────────
  useEffect(() => {
    if (!isNative) return;

    let mounted = true;
    NativeCast.initialize({ appId })
      .then(() => NativeCast.getState())
      .then(({ state }) => {
        if (mounted) setCastState(state as CastState);
      })
      .catch(() => {
        // Plugin non disponibile (es. emulatore senza Play Services)
        if (mounted) setCastState("unavailable");
      });

    NativeCast.addListener("castStateChanged", (data) => {
      if (!mounted) return;
      setCastState(data.state as CastState);
      setDeviceName(data.deviceName ?? "");
    }).then((handle) => {
      listenerRef.current = handle;
    }).catch(() => {});

    return () => {
      mounted = false;
      listenerRef.current?.remove();
    };
  }, [appId]);

  // ── Web / PWA: usa il Google Cast JS SDK ──────────────────────────────────
  useEffect(() => {
    if (isNative) return;

    const init = () => {
      const w = window as any;
      if (!w.cast?.framework) return;

      const framework = w.cast.framework;
      const CastStateEnum = framework.CastState;
      const ctx = framework.CastContext.getInstance();

      const updateState = () => {
        const cs = ctx.getCastState();
        if (cs === CastStateEnum.NO_DEVICES_AVAILABLE) {
          setCastState("no_devices");
          setDeviceName("");
        } else if (cs === CastStateEnum.NOT_CONNECTED) {
          setCastState("not_connected");
          setDeviceName("");
        } else if (cs === CastStateEnum.CONNECTING) {
          setCastState("connecting");
        } else if (cs === CastStateEnum.CONNECTED) {
          setCastState("connected");
          const session = ctx.getCurrentSession();
          setDeviceName(session?.getCastDevice()?.friendlyName || "TV");
        } else {
          setCastState("unavailable");
          setDeviceName("");
        }
      };

      ctx.addEventListener(framework.CastContextEventType.CAST_STATE_CHANGED, updateState);
      updateState();
    };

    if ((window as any).__castAvailable) {
      init();
    } else {
      window.addEventListener("castAvailable", init, { once: true });
    }
    return () => window.removeEventListener("castAvailable", init);
  }, []);

  // ── castToTV ──────────────────────────────────────────────────────────────
  const castToTV = useCallback(
    async (url: string, title = "Fermenta.to"): Promise<boolean> => {
      // iOS + Android native: usa il plugin NativeCast
      if (isNative) {
        try {
          setCastState("connecting");
          // Timeout 30s: se l'utente chiude il picker senza scegliere un dispositivo,
          // la Promise nativa rimane pending indefinitamente (keepAlive=true in Swift).
          // Dopo 30s consideriamo l'operazione annullata e torniamo a "not_connected".
          const result = await Promise.race([
            NativeCast.showPickerAndLoad({ url, title }),
            new Promise<{ success: boolean }>((_resolve, reject) =>
              setTimeout(() => reject(new Error("picker_timeout")), 30_000)
            ),
          ]);
          if (!result.success) setCastState("not_connected");
          return result.success;
        } catch {
          setCastState("not_connected");
          return false;
        }
      }

      // Web / PWA: usa il Cast JS SDK
      const w = window as any;
      const framework = w.cast?.framework;
      if (!framework) return false;

      const ctx = framework.CastContext.getInstance();
      if (appId) {
        ctx.setOptions({
          receiverApplicationId: appId,
          autoJoinPolicy: w.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? "origin_scoped",
        });
      }

      try {
        setCastState("connecting");
        await ctx.requestSession();

        const session = ctx.getCurrentSession();
        if (!session) { setCastState("not_connected"); return false; }

        const device = session.getCastDevice();
        setDeviceName(device?.friendlyName || "TV");
        setCastState("connected");

        try {
          await new Promise<void>((resolve, reject) => {
            session.sendMessage(
              "urn:x-cast:fermenta.to",
              { url, title },
              () => resolve(),
              (err: any) => reject(err)
            );
          });
          return true;
        } catch {
          return true;
        }
      } catch (err: any) {
        if (err?.code === "cancel" || err?.message === "cancel" || err?.code === "CANCEL") {
          setCastState("not_connected");
          return false;
        }
        setCastState("not_connected");
        return false;
      }
    },
    [appId]
  );

  // ── stopCasting ───────────────────────────────────────────────────────────
  const stopCasting = useCallback(() => {
    if (isNative) {
      NativeCast.endSession().catch(() => {});
      setCastState("not_connected");
      setDeviceName("");
      return;
    }
    const w = window as any;
    const ctx = w.cast?.framework?.CastContext?.getInstance();
    if (ctx) {
      ctx.endCurrentSession(true);
      setCastState("not_connected");
      setDeviceName("");
    }
  }, []);

  // Espone la diagnostica del Cast SDK (solo iOS native). Utile per mostrare
  // in-app quanti device sono stati trovati e i loro nomi quando il picker
  // sembra vuoto — evita di dover collegare l'iPhone a un Mac per Console.app.
  const getDiagnostics = useCallback(async (): Promise<CastDiagnostics | null> => {
    if (!isNative) return null;
    try {
      return await NativeCast.getDiagnostics();
    } catch {
      return null;
    }
  }, []);

  return {
    castState,
    deviceName,
    castToTV,
    stopCasting,
    isAvailable: castState !== "unavailable" && castState !== "no_devices",
    isConnected: castState === "connected",
    getDiagnostics,
  };
}
