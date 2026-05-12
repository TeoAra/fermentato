/**
 * useChromecast — Hook centralizzato per Google Cast SDK.
 *
 * Funziona ovunque sia caricato cast_sender.js (index.html).
 * Non funziona su iOS Safari (il Cast SDK richiede Chrome).
 *
 * castState:
 *  "unavailable"    → SDK non caricato (non Chrome, o blocco CSP)
 *  "no_devices"     → SDK ok ma nessun Chromecast trovato sulla rete
 *  "not_connected"  → Chromecast trovato, pronto per connettersi
 *  "connecting"     → connessione in corso
 *  "connected"      → taplist in streaming sulla TV
 */
import { useState, useEffect, useCallback } from "react";

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

export function useChromecast(): UseChromecastReturn {
  const [castState, setCastState] = useState<CastState>("unavailable");
  const [deviceName, setDeviceName] = useState("");
  const [appId, setAppId] = useState("");

  // Carica app ID dal server (env CAST_APP_ID)
  useEffect(() => {
    fetch("/api/cast-config")
      .then((r) => r.json())
      .then((config) => setAppId(config.appId || "CC1AD845"))
      .catch(() => setAppId("CC1AD845"));
  }, []);

  useEffect(() => {
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

      // Listener persistente per i cambiamenti di stato
      ctx.addEventListener(
        framework.CastContextEventType.CAST_STATE_CHANGED,
        updateState
      );

      // Stato iniziale
      updateState();
    };

    if ((window as any).__castAvailable) {
      init();
    } else {
      window.addEventListener("castAvailable", init, { once: true });
    }
    return () => window.removeEventListener("castAvailable", init);
  }, []);

  /**
   * Connette al Chromecast e carica l'URL sulla TV.
   * Prima tenta loadMedia() (apre la pagina web direttamente sul TV),
   * poi sendMessage() come fallback per receiver custom con listener.
   */
  const castToTV = useCallback(
    async (url: string, title = "Fermenta.to"): Promise<boolean> => {
      const w = window as any;
      const framework = w.cast?.framework;
      if (!framework) return false;

      const ctx = framework.CastContext.getInstance();

      // Configura l'app ID prima di aprire il picker
      if (appId) {
        ctx.setOptions({
          receiverApplicationId: appId,
          autoJoinPolicy:
            w.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? "origin_scoped",
        });
      }

      try {
        setCastState("connecting");
        await ctx.requestSession();

        const session = ctx.getCurrentSession();
        if (!session) {
          setCastState("not_connected");
          return false;
        }

        const device = session.getCastDevice();
        setDeviceName(device?.friendlyName || "TV");
        setCastState("connected");

        // Tentativo 1: loadMedia — apre la URL direttamente come pagina web sul receiver
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
          // Tentativo 2: sendMessage al receiver custom (namespace fermenta.to)
          try {
            await session.sendMessage("urn:x-cast:fermenta.to", { url, title });
            return true;
          } catch {
            // Il receiver è connesso ma non riesce ad aprire la pagina.
            // La TV è comunque connessa — l'utente può usare l'app Cast nativa.
            return true;
          }
        }
      } catch (err: any) {
        // L'utente ha annullato il picker (cancel/abort) — non è un errore
        if (
          err?.code === "cancel" ||
          err?.message === "cancel" ||
          err?.code === "CANCEL"
        ) {
          setCastState("not_connected");
          return false;
        }
        setCastState("not_connected");
        return false;
      }
    },
    [appId]
  );

  const stopCasting = useCallback(() => {
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
