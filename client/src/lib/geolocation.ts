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
import { isFreshLocation, LOCATION_FIX_MAX_AGE } from "@shared/location-policy";
export type { LocationSnapshot } from "@shared/location-policy";

export interface SimplePosition {
  timestamp: number;
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
  if (options.enableHighAccuracy !== false) {
    return locateAccurately({ timeout: options.timeout ?? 25000 });
  }
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    // Su native, il plugin chiede automaticamente il permesso al primo
    // getCurrentPosition mostrando il dialog di sistema iOS/Android.
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 25000,
      maximumAge: options.maximumAge ?? 0,
    });
    return {
      timestamp: pos.timestamp,
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
          timestamp: p.timestamp,
          coords: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
          },
        }),
      (err) => reject(err),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 25000,
        maximumAge: options.maximumAge ?? 0,
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

export function isLocationPermissionDenied(error: any): boolean {
  return error?.code === 1 || error?.code === "OS-PLUG-GLOC-0003" ||
    /permission|denied|negat/i.test(error?.message ?? "");
}

/** A bounded, cancellable GPS acquisition: a coarse fix must not stop refinement. */
export async function locateAccurately({
  signal,
  onPosition,
  timeout = 25000,
}: {
  signal?: AbortSignal;
  onPosition?: (position: SimplePosition) => void;
  timeout?: number;
} = {}): Promise<SimplePosition> {
  if (!isGeolocationAvailable()) throw new Error("geolocation_unsupported");
  if (signal?.aborted) throw new DOMException("Location request cancelled", "AbortError");
  const native = isNative() ? (await import("@capacitor/geolocation")).Geolocation : null;
  if (native) {
    const permission = await native.requestPermissions({ permissions: ["location"] });
    if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
      throw Object.assign(new Error("Location permission denied"), { code: 1 });
    }
  }
  if (signal?.aborted) throw new DOMException("Location request cancelled", "AbortError");
  return new Promise((resolve, reject) => {
    let best: SimplePosition | null = null;
    let stopped = false;
    let browserId: number | undefined;
    let nativeId: string | undefined;
    const clearWatch = () => {
      if (browserId !== undefined) navigator.geolocation.clearWatch(browserId);
      if (nativeId !== undefined) void native?.clearWatch({ id: nativeId }).catch(() => {});
    };
    const finish = (error?: unknown) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      clearWatch();
      if (error) reject(error);
      else if (best) resolve(best);
      else reject(Object.assign(new Error("Location unavailable"), { code: 3 }));
    };
    const abort = () => finish(new DOMException("Location request cancelled", "AbortError"));
    const timer = setTimeout(() => finish(), timeout);
    signal?.addEventListener("abort", abort, { once: true });
    const accept = (position: SimplePosition) => {
      if (stopped) return;
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      if (!isFreshLocation({ lat, lng, accuracy, timestamp: position.timestamp }, Date.now(), LOCATION_FIX_MAX_AGE)) return;
      // Compare fixes from THIS acquisition, never a previous session.
      if (!best || accuracy <= best.coords.accuracy) {
        best = position;
        onPosition?.(position);
      }
      if (accuracy <= 50) finish();
    };
    const fail = (error: unknown) => {
      if (isLocationPermissionDenied(error)) finish(error);
      // Temporary provider timeouts/unavailability can be followed by a GPS fix.
    };
    if (native) {
      native.watchPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 25000, minimumUpdateInterval: 1000 }, (position, error) => {
        if (error) fail(error);
        else if (position) accept(position);
      }).then(id => {
        nativeId = id;
        if (stopped) clearWatch();
      }).catch(error => finish(error));
    } else {
      browserId = navigator.geolocation.watchPosition(accept, fail, { enableHighAccuracy: true, maximumAge: 0, timeout });
      if (stopped) clearWatch();
    }
  });
}

export async function hasLocationPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const permission = await Geolocation.checkPermissions();
      return permission.location === "granted" || permission.coarseLocation === "granted";
    }
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch { return false; }
}
