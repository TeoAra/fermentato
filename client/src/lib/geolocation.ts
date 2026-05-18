/**
 * Universal geolocation helper.
 *
 * Su app nativa (Capacitor iOS/Android) usa il plugin @capacitor/geolocation
 * che mostra il dialog di sistema iOS/Android. Su web usa navigator.geolocation
 * (dialog del browser / PWA).
 *
 * Questo evita che l'app nativa richieda permessi tramite l'API web del WebView,
 * che genererebbe prompt PWA-style fuori posto dentro l'app.
 */
import { Capacitor } from "@capacitor/core";

export interface SimplePosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface GetPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const isNative = () => Capacitor.isNativePlatform();

/**
 * Ottiene la posizione corrente. Promise-based, funziona su native e web.
 * Lancia un Error se il permesso è negato o la posizione non disponibile.
 */
export async function getCurrentPosition(
  options: GetPositionOptions = {},
): Promise<SimplePosition> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    // Su native, il plugin chiede automaticamente il permesso al primo
    // getCurrentPosition mostrando il dialog di sistema iOS/Android.
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? false,
      timeout: options.timeout ?? 8000,
      maximumAge: options.maximumAge ?? 60000,
    });
    return {
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      },
    };
  }

  if (!navigator.geolocation) {
    throw new Error("geolocation_unsupported");
  }
  return new Promise<SimplePosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          coords: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
          },
        }),
      (err) => reject(err),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeout ?? 8000,
        maximumAge: options.maximumAge ?? 60000,
      },
    );
  });
}

/**
 * True se la geolocalizzazione è in qualche modo disponibile sulla piattaforma.
 */
export function isGeolocationAvailable(): boolean {
  return isNative() || (typeof navigator !== "undefined" && !!navigator.geolocation);
}
