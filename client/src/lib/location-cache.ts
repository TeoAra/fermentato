import { isFreshLocation, type LocationSnapshot } from "@shared/location-policy";
import type { SimplePosition } from "./geolocation";

export function readCachedLocation(): LocationSnapshot | null {
  try {
    const raw = localStorage.getItem("fermenta:userLocation");
    const location: unknown = raw ? JSON.parse(raw) : null;
    return isFreshLocation(location) ? location : null;
  } catch { return null; }
}

export function cacheLocation(position: SimplePosition): void {
  const { latitude: lat, longitude: lng, accuracy } = position.coords;
  try {
    localStorage.setItem("fermenta:userLocation", JSON.stringify({ lat, lng, accuracy, timestamp: position.timestamp }));
  } catch {}
}
