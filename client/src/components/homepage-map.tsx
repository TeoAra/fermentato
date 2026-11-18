import { useState, useEffect, useRef, useMemo } from "react";
import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { X, Plus, Minus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import Supercluster from "supercluster";
import HomeVectorMap, { type HomeMapProject } from "@/components/home-vector-map";
import { MAP_MARKER_COLORS, MAP_MARKER_PATH, MAP_MARKER_SIZE } from "@/lib/map-theme";

const PUB_COLOR = MAP_MARKER_COLORS.pub;
const BREWERY_COLOR = MAP_MARKER_COLORS.brewery;

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radiusToZoom(km: number): number {
  if (km <= 5)  return 13;
  if (km <= 10) return 12;
  if (km <= 15) return 11;
  if (km <= 20) return 11;
  if (km <= 30) return 10;
  if (km <= 50) return 9;
  return 8;
}

interface MapPub {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  logoUrl?: string | null;
  city?: string | null;
  slug?: string | null;
}

interface MapBrewery {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  logoUrl?: string | null;
  location?: string | null;
  country?: string | null;
}

interface HomepageMapProps {
  pubs: MapPub[];
  breweries: MapBrewery[];
  userLocation?: { lat: number; lng: number } | null;
  accuracy?: number | null;
  recenterToken?: number;
  isLoading?: boolean;
  showPubs?: boolean;
  showBreweries?: boolean;
  distanceKm?: number;
  showControls?: boolean;
  externalZoom?: number;
  onZoomChange?: (z: number) => void;
  fixedHeight?: number;
  popupPlacement?: "bottom" | "top-left";
  showSummary?: boolean;
  onSelectionChange?: (venue: SelectedMapVenue | null) => void;
}

export interface SelectedMapVenue {
  type: "pub" | "brewery";
  id: number;
  name: string;
  sub: string;
  href: string;
  logoUrl?: string | null;
}

export default function HomepageMap({
  pubs,
  breweries,
  userLocation,
  accuracy,
  recenterToken,
  isLoading,
  showPubs = true,
  showBreweries = true,
  distanceKm,
  showControls = true,
  externalZoom,
  onZoomChange,
  fixedHeight,
  popupPlacement = "bottom",
  showSummary = true,
  onSelectionChange,
}: HomepageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(fixedHeight ?? 300);
  const [center, setCenter] = useState<[number, number]>(() => userLocation ? [userLocation.lat, userLocation.lng] : [42.0, 12.5]);
  const [zoom, setZoom] = useState(externalZoom ?? 5.4);

  const updateZoom = (z: number) => {
    setZoom(z);
    onZoomChange?.(z);
  };

  const displayZoom = externalZoom !== undefined ? externalZoom : zoom;
  const [selected, setSelected] = useState<SelectedMapVenue | null>(null);
  useEffect(() => { onSelectionChange?.(selected); }, [selected, onSelectionChange]);
  const hasFlewRef = useRef(false);
  const userPannedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevDistRef = useRef<number | undefined>(undefined);

  const trackPanStart = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const trackPanMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
      userPannedRef.current = true;
    }
  };

  useEffect(() => {
    if (fixedHeight) {
      setMapHeight(fixedHeight);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    let lastH = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const parent = el.parentElement;
        const parentH = parent?.clientHeight ?? 0;
        const candidate = parentH > 0 ? parentH : el.offsetHeight;
        const h = Math.max(candidate, 0);
        if (h > 0 && Math.abs(h - lastH) > 2) {
          lastH = h;
          setMapHeight(h);
        }
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [fixedHeight]);

  useEffect(() => {
    if (!userLocation || hasFlewRef.current || userPannedRef.current) return;
    hasFlewRef.current = true;
    setCenter([userLocation.lat, userLocation.lng]);
    updateZoom(radiusToZoom(distanceKm ?? 10));
  }, [userLocation, distanceKm]);

  useEffect(() => {
    if (!userLocation || !distanceKm || userPannedRef.current) return;
    if (prevDistRef.current === distanceKm) return;
    prevDistRef.current = distanceKm;
    setCenter([userLocation.lat, userLocation.lng]);
    updateZoom(radiusToZoom(distanceKm));
  }, [distanceKm, userLocation]);

  useEffect(() => {
    if (!userLocation || recenterToken === undefined || recenterToken === 0) return;
    userPannedRef.current = false;
    hasFlewRef.current = true;
    setCenter([userLocation.lat, userLocation.lng]);
    updateZoom(radiusToZoom(distanceKm ?? 10));
  }, [recenterToken]);

  useEffect(() => {
    if (!userLocation || userPannedRef.current) return;
    setCenter([userLocation.lat, userLocation.lng]);
  }, [userLocation?.lat, userLocation?.lng]);

  const geoFilteredPubs = useMemo(() => {
    if (!showPubs) return [];
    const valid = pubs.filter(p =>
      p.latitude && p.longitude &&
      !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))
    );
    if (!userLocation || !distanceKm) return valid;
    return valid.filter(p =>
      haversineDist(userLocation.lat, userLocation.lng, parseFloat(p.latitude!), parseFloat(p.longitude!)) <= distanceKm
    );
  }, [pubs, showPubs, userLocation, distanceKm]);

  const geoFilteredBreweries = useMemo(() => {
    if (!showBreweries) return [];
    const valid = breweries.filter(b =>
      b.latitude && b.longitude &&
      !isNaN(parseFloat(b.latitude!)) && !isNaN(parseFloat(b.longitude!))
    );
    if (!userLocation || !distanceKm) return valid;
    return valid.filter(b =>
      haversineDist(userLocation.lat, userLocation.lng, parseFloat(b.latitude!), parseFloat(b.longitude!)) <= distanceKm
    );
  }, [breweries, showBreweries, userLocation, distanceKm]);

  useEffect(() => {
    if (!selected) return;
    const visible = selected.type === "pub" ? geoFilteredPubs : geoFilteredBreweries;
    if (!visible.some(venue => venue.id === selected.id)) setSelected(null);
  }, [selected, geoFilteredPubs, geoFilteredBreweries]);

  const pubCount = geoFilteredPubs.length;
  const breweryCount = geoFilteredBreweries.length;
  // ── Clustering with Supercluster ─────────────────────────────────────
  const [bounds, setBounds] = useState<{ ne: [number, number]; sw: [number, number] } | null>(null);
  const [mapError, setMapError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const clusterIndex = useMemo(() => {
    const idx = new Supercluster<{
      kind: "pub" | "brewery";
      data: any;
    }>({ radius: 60, maxZoom: 16, minPoints: 3 });
    const points = [
      ...geoFilteredPubs.map(p => ({
        type: "Feature" as const,
        properties: { kind: "pub" as const, data: p },
        geometry: { type: "Point" as const, coordinates: [parseFloat(p.longitude!), parseFloat(p.latitude!)] },
      })),
      ...geoFilteredBreweries.map(b => ({
        type: "Feature" as const,
        properties: { kind: "brewery" as const, data: b },
        geometry: { type: "Point" as const, coordinates: [parseFloat(b.longitude!), parseFloat(b.latitude!)] },
      })),
    ];
    idx.load(points);
    return idx;
  }, [geoFilteredPubs, geoFilteredBreweries]);

  const clusters = useMemo(() => {
    if (!bounds) return [];
    const bbox: [number, number, number, number] = [bounds.sw[1], bounds.sw[0], bounds.ne[1], bounds.ne[0]];
    try {
      return clusterIndex.getClusters(bbox, Math.round(displayZoom));
    } catch {
      return [];
    }
  }, [clusterIndex, bounds, displayZoom]);

  return (
    <div
      ref={containerRef}
      data-map-center={center.join(",")}
      data-map-zoom={displayZoom}
      className="relative w-full overflow-hidden"
      onPointerDown={trackPanStart}
      onPointerMove={trackPanMove}
      onPointerUp={() => { pointerStartRef.current = null; }}
      onPointerCancel={() => { pointerStartRef.current = null; }}
      data-no-pull="true"
      style={{ touchAction: "none", height: fixedHeight ? `${fixedHeight}px` : '100%', maxHeight: fixedHeight ? `${fixedHeight}px` : undefined }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#fff7ea]/90">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin motion-reduce:animate-none rounded-full border-[3px] border-[#e8d8bd] border-t-[#f59e0b]" />
            <span className="text-sm font-medium text-[#6b6254]">Caricamento mappa…</span>
          </div>
        </div>
      )}

      {mapHeight > 0 && (
        <div style={{ position: "relative", zIndex: 0, height: mapHeight }}>
        <HomeVectorMap
          center={center}
          zoom={displayZoom}
          retryToken={retryToken}
          onBoundsChanged={({ center: c, zoom: z, bounds: b }) => {
            setCenter(c);
            updateZoom(z);
            setBounds(b);
          }}
          onMapClick={() => setSelected(null)}
          onError={() => setMapError(true)}
        >
          {({ project, width, height, mounted }) => {
            if (!mounted) return null;
            const locate = (lat: number, lng: number) => project(lat, lng);
            const accuracyRing = userLocation && accuracy != null && accuracy > 0
              ? createAccuracyPath(project, userLocation.lat, userLocation.lng, accuracy)
              : "";
            return (
              <>
                {accuracyRing && (
                  <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
                    <path d={accuracyRing} fill="rgba(245,158,11,.12)" stroke="rgba(217,119,6,.48)" strokeWidth="1.25" />
                  </svg>
                )}
                {userLocation && (() => {
                  const point = locate(userLocation.lat, userLocation.lng);
                  return (
                    <div aria-label="La tua posizione" role="img" style={{ position: "absolute", left: point.x, top: point.y, zIndex: 6, transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", background: "#f59e0b", border: "3px solid #fff7ea", boxShadow: "0 1px 5px rgba(86,63,27,.32)", pointerEvents: "none" }} />
                  );
                })()}
                {clusters.map((c: any) => {
                  const [lng, lat] = c.geometry.coordinates;
                  const point = locate(lat, lng);
                  const anchored = (zIndex: number): CSSProperties => ({
                    position: "absolute", left: point.x, top: point.y, zIndex,
                    transform: "translate(-50%,-50%)", pointerEvents: "auto",
                  });
                  if (c.properties.cluster) {
                    const count = c.properties.point_count as number;
                    return (
                      <button
                        key={`cluster-${c.id}`}
                        type="button"
                        aria-label={`Ingrandisci mappa: ${count} luoghi`}
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const expansion = clusterIndex.getClusterExpansionZoom(c.id as number);
                            updateZoom(Math.min(expansion + 0.001, 18));
                            setCenter([lat, lng]);
                          } catch { /* Cluster may have changed between frames. */ }
                        }}
                        style={{ ...anchored(10), minWidth: 44, height: 44, padding: 0, border: 0, background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}
                      >
                        <span style={{ minWidth: 30, height: 30, padding: "0 6px", display: "grid", placeItems: "center", borderRadius: 10, background: "#f59e0b", border: "1px solid #fff7ea", boxShadow: "0 1px 4px rgba(91,65,22,.18)", color: "#493a20", fontWeight: 800, fontSize: 11 }}>{count}</span>
                      </button>
                    );
                  }
                  const { kind, data } = c.properties;
                  if (kind === "pub") {
                    const pub = data;
                    const isSelected = selected?.type === "pub" && selected.id === pub.id;
                    return (
                      <MarkerPin
                        key={`pub-${pub.id}`}
                        type="pub"
                        name={pub.name}
                        isSelected={isSelected}
                        style={anchored(isSelected ? 1000 : 5)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) { setSelected(null); return; }
                          setSelected({ type: "pub", id: pub.id, name: pub.name, sub: pub.city || "", href: pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`, logoUrl: pub.logoUrl });
                        }}
                      />
                    );
                  }
                  const brewery = data;
                  const isSelected = selected?.type === "brewery" && selected.id === brewery.id;
                  const sub = [brewery.location, brewery.country].filter(Boolean).join(", ");
                  return (
                    <MarkerPin
                      key={`brewery-${brewery.id}`}
                      type="brewery"
                      name={brewery.name}
                      isSelected={isSelected}
                      style={anchored(isSelected ? 1000 : 5)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) { setSelected(null); return; }
                        setSelected({ type: "brewery", id: brewery.id, name: brewery.name, sub, href: `/brewery/${brewery.id}`, logoUrl: brewery.logoUrl });
                      }}
                    />
                  );
                })}
              </>
            );
          }}
        </HomeVectorMap>
        </div>
      )}
      {selected && <MapPopup selected={selected} placement={popupPlacement} onClose={() => setSelected(null)} />}
      {mapError && (
        <div role="alert" className="absolute left-3 top-3 z-30 flex max-w-[min(300px,calc(100%-24px))] items-center gap-3 rounded-xl border border-[#ead7b7] bg-[#fff7ea] px-3 py-2 text-xs text-[#635640] shadow-sm">
          <span>Mappa non disponibile. Controlla la connessione.</span>
          <button type="button" onClick={() => { setMapError(false); setRetryToken(v => v + 1); }} className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-[#9a5b08] hover:bg-[#f8ead3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f59e0b]">Riprova</button>
        </div>
      )}

      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
          <button
            type="button"
            aria-label="Ingrandisci mappa"
            onClick={() => updateZoom(Math.min(displayZoom + 1, 18))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm transition-colors hover:bg-[#fff0d5]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Riduci mappa"
            onClick={() => updateZoom(Math.max(displayZoom - 1, 2))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm transition-colors hover:bg-[#fff0d5]"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {showSummary && !isLoading && (pubCount + breweryCount > 0) && (
        <div className="absolute bottom-5 left-3 z-20">
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm"
            style={{
              background: "rgba(255,247,234,.96)",
              borderColor: "#ead7b7",
              color: "#675239",
            }}
          >
            {showPubs && (
              <>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: PUB_COLOR }} />
                <span>{pubCount} pub</span>
              </>
            )}
            {showPubs && showBreweries && <span style={{ color: "#cdbb9b" }}>·</span>}
            {showBreweries && (
              <>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: BREWERY_COLOR }} />
                <span>{breweryCount} birrifici</span>
              </>
            )}
          </div>
        </div>
      )}
      {!isLoading && pubCount + breweryCount === 0 && (
        <div role="status" className="absolute left-1/2 top-1/2 z-20 w-[min(280px,calc(100%-36px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#ead7b7] bg-[#fff7ea]/95 px-4 py-3 text-center shadow-md">
          <p className="text-sm font-semibold text-[#635640]">Nessun risultato con questi filtri</p>
          <p className="mt-1 text-xs text-[#827761]">{userLocation ? `Prova ad ampliare il raggio oltre ${distanceKm} km o modifica le categorie.` : "Modifica le categorie o esplora un’altra area."}</p>
        </div>
      )}
    </div>
  );
}

function MarkerPin({
  type, name, isSelected, onClick, style,
}: {
  type: "pub" | "brewery";
  name: string;
  isSelected: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  style: CSSProperties;
}) {
  const pinColor = MAP_MARKER_COLORS[type];

  return (
    <button
      type="button"
      aria-label={`${type === "pub" ? "Pub" : "Birrificio"}: ${name}${isSelected ? ", selezionato" : ""}`}
      onClick={onClick}
      style={{
        ...style,
        width: 44, height: 44, background: "transparent", border: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0,
      }}
    >
      <span style={{
        width: MAP_MARKER_SIZE, height: MAP_MARKER_SIZE,
        display: "block",
        filter: "drop-shadow(0 1px 2px rgba(54,44,28,.26))",
      }}>
        <svg aria-hidden="true" width={MAP_MARKER_SIZE} height={MAP_MARKER_SIZE} viewBox="0 0 24 24" fill={pinColor}>
          <path d={MAP_MARKER_PATH} stroke={isSelected ? "#fff7ea" : "none"} strokeWidth={isSelected ? 2.4 : 0} strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

function createAccuracyPath(project: HomeMapProject, lat: number, lng: number, radiusMeters: number): string {
  const points: string[] = [];
  const angularDistance = radiusMeters / 6371008.8;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  for (let step = 0; step <= 64; step += 1) {
    const bearing = step / 64 * Math.PI * 2;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
    const point = project(lat2 * 180 / Math.PI, lng2 * 180 / Math.PI);
    points.push(`${step === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  }
  return `${points.join(" ")} Z`;
}

function MapPopup({ selected, placement, onClose }: { selected: SelectedMapVenue; placement: "bottom" | "top-left"; onClose: () => void }) {
  const label = selected.type === "pub" ? "Pub" : "Birrificio";

  return (
    <div
      style={{
        position: "absolute",
        top: placement === "top-left" ? 12 : undefined,
        bottom: placement === "bottom" ? "var(--map-popup-bottom, 76px)" : undefined,
        left: 12,
        right: 12,
        maxWidth: 420,
        maxHeight: "calc(100% - var(--map-popup-bottom, 76px) - 12px)",
        borderRadius: 16,
        overflowY: "auto",
        zIndex: 30,
      }}
      className="border border-[#ead7b7] bg-[#fff7ea] text-[#493a20] shadow-md"
      data-testid="home-map-selected-venue"
      data-venue-type={selected.type}
      aria-label={`${label} selezionato`}
      aria-live="polite"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="p-2.5">
        <div className="flex min-h-11 items-start gap-2">
          {selected.logoUrl && (
            <img
              src={selected.logoUrl}
              alt=""
              className="mt-1 h-8 w-8 shrink-0 rounded-lg object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <p className="line-clamp-2 text-sm font-semibold leading-tight" title={selected.name}>{selected.name}</p>
          </div>
          <button
            type="button"
            aria-label="Chiudi dettagli locale"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#827761] hover:bg-[#f8ead3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
          >
            <X size={16} />
          </button>
        </div>
        {selected.sub && (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={selected.sub}>
            {selected.sub}
          </p>
        )}
        <Link
          href={selected.href}
          className="mt-1 flex min-h-11 items-center justify-between rounded-lg px-1 text-xs font-semibold text-[#9a5b08] hover:bg-[#f8ead3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
        >
          Apri scheda <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
