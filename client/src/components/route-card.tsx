import { useState } from "react";
import { Map as PigeonMap, GeoJson, Marker } from "pigeon-maps";
import { osmTileProvider } from "@/lib/map-tiles";
import { Navigation, Footprints, Bike, Car, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRouteDistance,
  formatDistance,
  formatDuration,
  type LatLng,
  type RouteMode,
} from "@/lib/route";
import { getMapNavigationUrl } from "@/lib/utils";
import { getCurrentPosition, isGeolocationAvailable } from "@/lib/geolocation";

interface RouteCardProps {
  destination: LatLng;
  destinationName: string;
  destinationAddress?: string;
}

const HAS_CUSTOM_OSRM = !!(import.meta as any).env?.VITE_OSRM_BASE_URL;
const MODES: Array<{ value: RouteMode; label: string; icon: typeof Car; estimateOnly?: boolean }> = [
  { value: "driving", label: "Auto", icon: Car },
  { value: "walking", label: HAS_CUSTOM_OSRM ? "A piedi" : "A piedi (stima)", icon: Footprints, estimateOnly: !HAS_CUSTOM_OSRM },
  { value: "cycling", label: HAS_CUSTOM_OSRM ? "Bici" : "Bici (stima)", icon: Bike, estimateOnly: !HAS_CUSTOM_OSRM },
];

/**
 * Pannello "Come arrivare" con percorso reale OSRM e mini mappa.
 * Recupera la posizione utente da localStorage (chiave fermenta:userLocation)
 * o, in mancanza, propone all'utente di consentire la geolocalizzazione.
 */
export default function RouteCard({ destination, destinationName, destinationAddress }: RouteCardProps) {
  const [origin, setOrigin] = useState<LatLng | null>(() => {
    try {
      const c = localStorage.getItem("fermenta:userLocation");
      if (!c) return null;
      const o = JSON.parse(c);
      if (typeof o?.lat === "number" && typeof o?.lng === "number") return o;
    } catch {}
    return null;
  });
  const [mode, setMode] = useState<RouteMode>("driving");
  const [enabled, setEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useRouteDistance(origin, destination, { mode, enabled });

  const handleLocate = () => {
    if (!isGeolocationAvailable()) {
      setLocateError("Geolocalizzazione non disponibile");
      return;
    }
    setLocating(true);
    setLocateError(null);
    getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
      .then((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(loc);
        try { localStorage.setItem("fermenta:userLocation", JSON.stringify(loc)); } catch {}
        setEnabled(true);
        setLocating(false);
      })
      .catch((err: any) => {
        setLocateError(err?.message || "Impossibile ottenere la posizione");
        setLocating(false);
      });
  };

  const handleCalculate = () => {
    if (!origin) {
      handleLocate();
      return;
    }
    setEnabled(true);
    refetch();
  };

  // Bounds per la mini mappa
  const polyline: [number, number][] = data?.geometry?.coordinates
    ? data.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    : origin
      ? [[origin.lat, origin.lng], [destination.lat, destination.lng]]
      : [];

  const center: [number, number] = polyline.length > 0
    ? [
      (polyline.reduce((s, p) => s + p[0], 0) / polyline.length),
      (polyline.reduce((s, p) => s + p[1], 0) / polyline.length),
    ]
    : [destination.lat, destination.lng];

  const zoom = polyline.length > 1
    ? Math.max(8, Math.min(14, 14 - Math.round(Math.log2(Math.max(1, distanceBetween(polyline[0], polyline[polyline.length - 1]))))))
    : 13;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              Come arrivare
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Percorso reale su strada (non in linea d'aria)
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5 mb-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => { setMode(m.value); if (enabled) refetch(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 border-stone-200 dark:border-[#23262E]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* CTA / risultato */}
        {!enabled && (
          <Button
            onClick={handleCalculate}
            disabled={locating}
            className="w-full"
            data-testid="button-calculate-route"
          >
            {locating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Localizzo…</>
            ) : (
              <><Navigation className="w-4 h-4 mr-2" /> Calcola percorso reale</>
            )}
          </Button>
        )}

        {locateError && !enabled && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {locateError}
          </p>
        )}

        {enabled && isLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calcolo percorso…
          </div>
        )}

        {enabled && isError && (
          <div className="text-xs text-destructive py-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Impossibile calcolare il percorso
          </div>
        )}

        {enabled && data && (
          <div className="mt-1">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-stone-50 dark:bg-[#0B0D10]/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Distanza</p>
                <p className="text-xl font-black text-foreground">{formatDistance(data.distanceM)}</p>
              </div>
              <div className="bg-stone-50 dark:bg-[#0B0D10]/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Durata</p>
                <p className="text-xl font-black text-foreground">{formatDuration(data.durationS)}</p>
              </div>
            </div>
            {data.isStraightLine && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Servizio di routing non disponibile: distanza calcolata in linea d'aria.
              </p>
            )}

            {/* Mini mappa con polyline */}
            {data.geometry && data.geometry.coordinates.length > 1 && origin && (
              <div className="rounded-xl overflow-hidden border border-border h-44 relative">
                <PigeonMap
                  defaultCenter={center}
                  defaultZoom={zoom}
                  provider={osmTileProvider}
                  attribution={false}
                  mouseEvents={false}
                  touchEvents={false}
                >
                  <GeoJson
                    data={{
                      type: "FeatureCollection",
                      features: [
                        {
                          type: "Feature",
                          geometry: data.geometry,
                          properties: {},
                        },
                      ],
                    }}
                    styleCallback={() => ({
                      stroke: "#F77104",
                      strokeWidth: "4",
                      fill: "none",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      opacity: 0.85,
                    })}
                  />
                  <Marker anchor={[origin.lat, origin.lng]} color="#0ea5e9" />
                  <Marker anchor={[destination.lat, destination.lng]} color="#F77104" />
                </PigeonMap>
              </div>
            )}
          </div>
        )}

        {/* Apri in maps esterni */}
        <a
          href={getMapNavigationUrl(destinationName, destinationAddress || `${destination.lat},${destination.lng}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-[#23262E] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#1A1D24]/40 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          Apri in Google/Apple Maps
        </a>
      </div>
    </div>
  );
}

function distanceBetween(a: [number, number], b: [number, number]): number {
  // Distanza approssimativa in km tra due punti per stimare lo zoom della mappa.
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

