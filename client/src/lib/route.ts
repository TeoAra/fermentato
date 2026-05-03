import { useQuery } from "@tanstack/react-query";

export type LatLng = { lat: number; lng: number };
export type RouteMode = "driving" | "walking" | "cycling";

export type RouteData = {
  distanceM: number;
  durationS: number;
  geometry: { type: "LineString"; coordinates: [number, number][] } | null;
  isStraightLine: boolean;
  source: "osrm" | "cache" | "fallback-haversine";
  reason?: string;
};

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return "<1 min";
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function makeKey(from: LatLng | null, to: LatLng | null, mode: RouteMode): unknown[] {
  return [
    "/api/route",
    from?.lat?.toFixed(4),
    from?.lng?.toFixed(4),
    to?.lat?.toFixed(4),
    to?.lng?.toFixed(4),
    mode,
  ];
}

async function fetchRoute(from: LatLng, to: LatLng, mode: RouteMode): Promise<RouteData> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
    mode,
  });
  const res = await fetch(`/api/route?${params.toString()}`);
  if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
  return (await res.json()) as RouteData;
}

/**
 * Hook react-query per il calcolo del percorso reale via OSRM.
 * `enabled=false` per default: si attiva solo quando l'utente clicca
 * "Calcola percorso reale" o quando il chiamante lo abilita esplicitamente.
 */
export function useRouteDistance(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  options: { mode?: RouteMode; enabled?: boolean } = {},
) {
  const mode = options.mode || "driving";
  const ready = !!from && !!to && !!options.enabled;
  return useQuery<RouteData>({
    queryKey: makeKey(from || null, to || null, mode),
    queryFn: () => fetchRoute(from!, to!, mode),
    enabled: ready,
    staleTime: 60 * 60 * 1000, // 1h client-side (server cacha 24h)
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Versione fetch-and-forget per quando l'hook non è disponibile (es. fuori
 * da componenti React): esegue la chiamata e ritorna la promise.
 */
export async function fetchRouteDistance(
  from: LatLng,
  to: LatLng,
  mode: RouteMode = "driving",
): Promise<RouteData> {
  return fetchRoute(from, to, mode);
}
