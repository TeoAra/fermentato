/**
 * useGeolocation — manages geolocation permission state + cached position.
 *
 * Uses the universal getCurrentPosition helper (Capacitor on native,
 * navigator.geolocation on web/PWA) so it works correctly on iOS/Android
 * native apps as well as the browser.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { locateAccurately, isGeolocationAvailable, isLocationPermissionDenied, hasLocationPermission } from "@/lib/geolocation";
import { readCachedLocation, cacheLocation } from "@/lib/location-cache";

export type GeoStatus =
  | "idle"        // never requested
  | "requesting"  // in-flight
  | "granted"     // position available
  | "denied"      // permission denied
  | "error"       // other error
  | "unsupported";// geolocation not available on this platform

export interface GeoState {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  error: string | null;
  accuracy: number | null;
  isCached: boolean;
  requestId: number;
  /** Call to trigger (or re-trigger) geolocation permission request. */
  request: () => void;
  /** Clear cached position and reset to idle. */
  clear: () => void;
}

const CACHE_KEY = "fermenta:userLocation";

export function useGeolocation({ auto = false }: { auto?: boolean } = {}): GeoState {
  const [cached] = useState(readCachedLocation);
  const [status, setStatus] = useState<GeoStatus>(() => {
    if (!isGeolocationAvailable()) return "unsupported";
    return cached ? "granted" : "idle";
  });
  const [lat, setLat] = useState<number | null>(cached?.lat ?? null);
  const [lng, setLng] = useState<number | null>(cached?.lng ?? null);
  const [accuracy, setAccuracy] = useState<number | null>(cached?.accuracy ?? null);
  const [isCached, setIsCached] = useState(!!cached);
  const [requestId, setRequestId] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    if (!isGeolocationAvailable()) {
      setStatus("unsupported");
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRequestId(value => value + 1);
    setIsCached(true);
    setStatus("requesting");
    setError(null);
    try {
      const pos = await locateAccurately({
        signal: controller.signal,
        onPosition: position => {
          if (controller.signal.aborted) return;
          const { latitude, longitude, accuracy } = position.coords;
          setLat(latitude);
          setLng(longitude);
          setAccuracy(accuracy);
          setIsCached(false);
          cacheLocation(position);
        },
      });
      if (controller.signal.aborted) return;
      setStatus("granted");
      if (pos.coords.accuracy > 1000) {
        setError("Posizione approssimativa: attiva la posizione precisa nelle impostazioni e riprova, possibilmente all’aperto.");
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      if (isLocationPermissionDenied(err)) {
        setStatus("denied");
        setError(
          "Permesso di geolocalizzazione negato. Abilitalo nelle impostazioni del browser o del dispositivo."
        );
      } else {
        setStatus("error");
        setError("Impossibile ottenere la posizione. Verifica di avere il GPS attivo e riprova.");
      }
    }
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    setLat(null);
    setLng(null);
    setAccuracy(null);
    setIsCached(false);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const autoRequest = () => void hasLocationPermission().then(granted => {
      if (mounted && granted) void request();
    });
    const onVisible = () => { if (auto && document.visibilityState === "visible") autoRequest(); };
    const onNativePermission = () => { if (auto) void request(); };
    if (auto) autoRequest();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("capacitor-location-start", onNativePermission);
    return () => {
      mounted = false;
      controllerRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("capacitor-location-start", onNativePermission);
    };
  }, [auto, request]);

  return { status, lat, lng, accuracy, isCached, requestId, error, request, clear };
}
