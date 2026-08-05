/**
 * useGeolocation — manages geolocation permission state + cached position.
 *
 * Uses the universal getCurrentPosition helper (Capacitor on native,
 * navigator.geolocation on web/PWA) so it works correctly on iOS/Android
 * native apps as well as the browser.
 */
import { useState, useCallback } from "react";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

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
  /** Call to trigger (or re-trigger) geolocation permission request. */
  request: () => void;
  /** Clear cached position and reset to idle. */
  clear: () => void;
}

const CACHE_KEY = "fermenta:userLocation";

function readCached(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function useGeolocation(): GeoState {
  const [status, setStatus] = useState<GeoStatus>(() => {
    if (!isGeolocationAvailable()) return "unsupported";
    return readCached() ? "granted" : "idle";
  });
  const [lat, setLat] = useState<number | null>(() => readCached()?.lat ?? null);
  const [lng, setLng] = useState<number | null>(() => readCached()?.lng ?? null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    if (!isGeolocationAvailable()) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: false, timeout: 12000 });
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);
      setStatus("granted");
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ lat: latitude, lng: longitude }));
      } catch {}
    } catch (err: any) {
      // code === 1 ↔ PERMISSION_DENIED (web); Capacitor throws same string
      const isDenied =
        err?.code === 1 ||
        err?.message?.includes("PERMISSION_DENIED") ||
        err?.message?.includes("denied");
      if (isDenied) {
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
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    setLat(null);
    setLng(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { status, lat, lng, error, request, clear };
}
