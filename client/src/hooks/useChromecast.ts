/**
 * useChromecast — Hook centralizzato per Google Cast.
 *
 * Su iOS native (Capacitor) usa il plugin Swift NativeCast che wrappa
 * il Google Cast iOS SDK nativo.
 *
 * Su browser (PWA / Android WebView) usa il Google Cast JS SDK caricato
 * in index.html tramite cast_sender.js.
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

interface UseChromecastReturn {
  castState: CastState;
  deviceName: string;
  castToTV: (url: string, title?: string) => Promise<boolean>;
  stopCasting: () => void;
  isAvailable: boolean;
  isConnected: boolean;
}

const isNativeIos =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

// ── Hook principale ──────────────────────────────────────────────────────────
export function useChromecast(): UseChromecastReturn {
  const [castState, setCastState] = useState<CastState>("unavailable");
  const [deviceName, setDeviceName] = useState("");
  const [appId, setAppId] = useState("CC1AD845");
  const listenerRef = useRef<PluginListenerHandle | null>(null);

  // Carica app ID dal server
  useEffect(() => {
    fetch("/api/cast-config")
      .then((r) => r.json())
      .then((c) => { if (c.appId) setAppId(c.appId); })
      .catch(() => {});
  }, []);

  // ── iOS native: inizializza il plugin Swift e ascolta gli eventi ──────────
  useEffect(() => {
    if (!isNativeIos) return;

    let mounted = true;
    NativeCast.initialize({ appId })
      .then(() => NativeCast.getState())
      .then(({ state }) => {
        if (mounted) setCastState(state as CastState);
      })
      .catch(() => {});

    NativeCast.addListener("castStateChanged", (data) => {
      if (!mounted) return;
      setCastState(data.state as CastState);
      setDeviceName(data.deviceName ?? "");
    }).then((handle) => {
      listenerRef.current = handle;
    });

    return () => {
      mounted = false;
      listenerRef.current?.remove();
    };
  }, [appId]);

  // ── Web / PWA: usa il Google Cast JS SDK ──────────────────────────────────
  useEffect(() => {
    if (isNativeIos) return;

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
      // iOS native: usa il plugin Swift
      if (isNativeIos) {
        try {
          setCastState("connecting");
          const result = await NativeCast.showPickerAndLoad({ url, title });
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
          const media = new w.chrome.cast.media.MediaInfo(url, "text/html");
          media.metadata = new w.chrome.cast.media.GenericMediaMetadata();
          media.metadata.title = title;
          const loadReq = new w.chrome.cast.media.LoadRequest(media);
          await new Promise<void>((resolve, reject) => {
            session.loadMedia(loadReq, resolve, reject);
          });
          return true;
        } catch {
          try {
            await session.sendMessage("urn:x-cast:fermenta.to", { url, title });
            return true;
          } catch {
            return true;
          }
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
    if (isNativeIos) {
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

  return {
    castState,
    deviceName,
    castToTV,
    stopCasting,
    isAvailable: castState !== "unavailable" && castState !== "no_devices",
    isConnected: castState === "connected",
  };
}
