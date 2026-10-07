export interface LocationSnapshot {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export const LOCATION_CACHE_MAX_AGE = 5 * 60 * 1000;
export const LOCATION_FIX_MAX_AGE = 60 * 1000;

export function isFreshLocation(value: unknown, now = Date.now(), maxAge = LOCATION_CACHE_MAX_AGE): value is LocationSnapshot {
  const location = value as LocationSnapshot | null;
  return !!location &&
    Number.isFinite(location.lat) && Math.abs(location.lat) <= 90 &&
    Number.isFinite(location.lng) && Math.abs(location.lng) <= 180 &&
    Number.isFinite(location.accuracy) && location.accuracy >= 0 &&
    Number.isFinite(location.timestamp) &&
    location.timestamp <= now + 10_000 && now - location.timestamp <= maxAge;
}
