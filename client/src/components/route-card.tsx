import { useState } from "react";
import LocationPreviewMap from "@/components/location-preview-map";
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
import { readCachedLocation, cacheLocation } from "@/lib/location-cache";

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
    return readCachedLocation();
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
        cacheLocation(pos);
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
                <LocationPreviewMap latitude={destination.lat} longitude={destination.lng} label={`Percorso verso ${destinationName}`} route={data.geometry} origin={origin} />
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

