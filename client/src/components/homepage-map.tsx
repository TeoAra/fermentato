import { useState, useEffect, useRef, useMemo } from "react";
import { Map, Overlay } from "pigeon-maps";
import { Capacitor } from "@capacitor/core";
import { X, Plus, Minus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import Supercluster from "supercluster";
import { osmTileProvider } from "@/lib/map-tiles";

const PUB_COLOR = "#F77104";
const BREWERY_COLOR = "#9B4E10";

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

const mapTileProvider = osmTileProvider;

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
  const [center, setCenter] = useState<[number, number]>([42.0, 12.5]);
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

  const trackPanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const trackPanMove = (event: React.PointerEvent<HTMLDivElement>) => {
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
    const MAX_H = 800;
    let raf = 0;
    let lastH = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const parent = el.parentElement;
        const parentH = parent?.clientHeight ?? 0;
        const candidate = parentH > 0 ? parentH : el.offsetHeight;
        const h = Math.min(Math.max(candidate, 0), MAX_H);
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
  const isNative = Capacitor.isNativePlatform();

  // ── Clustering with Supercluster ─────────────────────────────────────
  const [bounds, setBounds] = useState<{ ne: [number, number]; sw: [number, number] } | null>(null);

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
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100 dark:bg-[#1A1D24]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-primary" />
            <span className="text-sm font-medium text-muted-foreground">Caricamento mappa...</span>
          </div>
        </div>
      )}

      {mapHeight > 0 && (
        <div style={{ position: "relative", zIndex: 0 }}>
        <Map
          center={center}
          zoom={displayZoom}
          height={mapHeight}
          onBoundsChanged={({ center: c, zoom: z, bounds: b }) => { setCenter(c); updateZoom(z); if (b) setBounds({ ne: b.ne as [number, number], sw: b.sw as [number, number] }); }}
          provider={mapTileProvider}
          dprs={[1, 2]}
          attribution={false}
          metaWheelZoom={true}
          metaWheelZoomWarning=""
          animate={!isNative}
          onClick={() => setSelected(null)}
        >
          {userLocation && (
            <Overlay anchor={[userLocation.lat, userLocation.lng]} offset={[8, 8]}>
              <div style={{ position: "relative", width: 16, height: 16, zIndex: 2 }}>
              {accuracy != null && accuracy > 0 && (() => {
                const metersPerPixel = 156543.03392 * Math.max(0.08, Math.cos(userLocation.lat * Math.PI / 180)) / (2 ** displayZoom);
                const diameter = Math.min(640, Math.max(8, (accuracy * 2) / metersPerPixel));
                return <div aria-hidden="true" style={{
                  position: "absolute", width: diameter, height: diameter, borderRadius: "50%",
                  left: 8 - diameter / 2, top: 8 - diameter / 2,
                  background: "rgba(56, 126, 190, 0.14)", border: "1px solid rgba(42, 111, 179, 0.38)",
                  pointerEvents: "none",
                }} />;
              })()}
              <div aria-label="La tua posizione" style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "#397BB5", border: "3px solid white",
                boxShadow: "0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.2)",
                pointerEvents: "none",
              }} />
              </div>
            </Overlay>
          )}

          {clusters.map((c: any) => {
            const [lng, lat] = c.geometry.coordinates;
            if (c.properties.cluster) {
              const count = c.properties.point_count as number;
              const size = count < 10 ? 38 : count < 50 ? 46 : count < 200 ? 54 : 62;
              return (
                <Overlay key={`cluster-${c.id}`} anchor={[lat, lng]} offset={[size / 2, size / 2]} style={{ zIndex: 10 }}>
                  <button
                    type="button"
                    aria-label={`Ingrandisci mappa: ${count} luoghi`}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const expansion = clusterIndex.getClusterExpansionZoom(c.id as number);
                        updateZoom(Math.min(expansion + 0.001, 18));
                        setCenter([lat, lng]);
                      } catch { /* noop */ }
                    }}
                    style={{
                      width: size, height: size, borderRadius: "50%",
                      background: "linear-gradient(135deg,#F77104,#9B4E10)",
                      border: "3px solid white",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 800, fontSize: 13,
                      cursor: "pointer", userSelect: "none", padding: 0,
                    }}
                  >
                    {count}
                  </button>
                </Overlay>
              );
            }
            const { kind, data } = c.properties;
            if (kind === "pub") {
              const pub = data;
              const isSelected = selected?.type === "pub" && selected.id === pub.id;
              return (
                <Overlay key={`pub-${pub.id}`} anchor={[lat, lng]} offset={[18, 32]} style={{ zIndex: isSelected ? 1000 : 5 }}>
                  <div style={{ position: "relative" }}>
                    <MarkerPin
                      type="pub"
                      name={pub.name}
                      isSelected={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) { setSelected(null); return; }
                        setSelected({
                          type: "pub", id: pub.id,
                          name: pub.name,
                          sub: pub.city || "",
                          href: pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`,
                          logoUrl: pub.logoUrl,
                        });
                      }}
                    />
                  </div>
                </Overlay>
              );
            }
            const brewery = data;
            const isSelected = selected?.type === "brewery" && selected.id === brewery.id;
            const sub = [brewery.location, brewery.country].filter(Boolean).join(", ");
            return (
              <Overlay key={`brewery-${brewery.id}`} anchor={[lat, lng]} offset={[18, 32]} style={{ zIndex: isSelected ? 1000 : 5 }}>
                <div style={{ position: "relative" }}>
                  <MarkerPin
                    type="brewery"
                    name={brewery.name}
                    isSelected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) { setSelected(null); return; }
                      setSelected({
                        type: "brewery", id: brewery.id,
                        name: brewery.name, sub,
                        href: `/brewery/${brewery.id}`,
                        logoUrl: brewery.logoUrl,
                      });
                    }}
                  />
                </div>
              </Overlay>
            );
          })}
        </Map>
        </div>
      )}
      {selected && <MapPopup selected={selected} placement={popupPlacement} onClose={() => setSelected(null)} />}

      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Ingrandisci mappa"
            onClick={() => updateZoom(Math.min(displayZoom + 1, 18))}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-colors active:scale-95"
            style={{ background: "rgba(255,248,242,0.95)", border: "1px solid rgba(247,113,4,0.15)", color: "#5C3D1A" }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Riduci mappa"
            onClick={() => updateZoom(Math.max(displayZoom - 1, 2))}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-colors active:scale-95"
            style={{ background: "rgba(255,248,242,0.95)", border: "1px solid rgba(247,113,4,0.15)", color: "#5C3D1A" }}
          >
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="absolute bottom-5 right-2 z-10 text-[9px] opacity-50 select-none" style={{ color: "#5C3D1A" }}>
        ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>OpenStreetMap</a>
      </div>

      {showSummary && !isLoading && (pubCount + breweryCount > 0) && (
        <div className="absolute bottom-5 left-3 z-20">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm shadow-sm"
            style={{
              background: "rgba(255,248,242,0.92)",
              border: "1px solid rgba(247,113,4,0.15)",
              color: "#5C3D1A",
            }}
          >
            {showPubs && (
              <>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: PUB_COLOR }} />
                <span>{pubCount} pub</span>
              </>
            )}
            {showPubs && showBreweries && <span style={{ color: "#D4A882" }}>·</span>}
            {showBreweries && (
              <>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: BREWERY_COLOR }} />
                <span>{breweryCount} birrifici</span>
              </>
            )}
          </div>
        </div>
      )}
      {!isLoading && pubCount + breweryCount === 0 && (
        <div role="status" className="absolute left-1/2 top-1/2 z-20 w-[min(280px,calc(100%-36px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#d9dfd2] bg-[#fffdf7]/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm dark:border-[#485447] dark:bg-[#222b23]/95">
          <p className="text-sm font-semibold text-[#354536] dark:text-[#e7eee3]">Nessun risultato con questi filtri</p>
          <p className="mt-1 text-xs text-[#687565] dark:text-[#c0cbb9]">{userLocation ? `Prova ad ampliare il raggio oltre ${distanceKm} km o modifica le categorie.` : "Modifica le categorie o esplora un’altra area."}</p>
        </div>
      )}
    </div>
  );
}

function MarkerPin({
  type, name, isSelected, onClick,
}: {
  type: "pub" | "brewery";
  name: string;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const pinColor = type === "pub" ? "#E86B32" : "#568A42";

  return (
    <button
      type="button"
      aria-label={`${type === "pub" ? "Pub" : "Birrificio"}: ${name}${isSelected ? ", selezionato" : ""}`}
      onClick={onClick}
      style={{
        width: 36, height: 42, borderRadius: "50% 50% 50% 4px",
        background: pinColor,
        border: `2.5px solid ${isSelected ? "#273D32" : "white"}`,
        boxShadow: isSelected
          ? "0 0 0 3px rgba(39,61,50,0.3), 0 3px 9px rgba(0,0,0,0.25)"
          : "0 2px 8px rgba(0,0,0,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transform: `${isSelected ? "scale(1.12)" : "scale(1)"} rotate(-45deg)`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease", padding: 0,
        position: "relative", zIndex: isSelected ? 100 : 1,
      }}
    >
      <span aria-hidden="true" style={{
        width: 13, height: 13, borderRadius: "50%", background: "#FFF8EF",
        border: `2px solid ${pinColor}`, transform: "rotate(45deg)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.75)",
      }} />
    </button>
  );
}

function MapPopup({ selected, placement, onClose }: { selected: SelectedMapVenue; placement: "bottom" | "top-left"; onClose: () => void }) {
  const label = selected.type === "pub" ? "Pub" : "Birrificio";

  return (
    <div
      style={{
        position: "absolute",
        top: placement === "top-left" ? 12 : undefined,
        bottom: placement === "bottom" ? 56 : undefined,
        left: 12,
        right: 68,
        maxWidth: 340,
        borderRadius: 16,
        overflow: "visible",
        zIndex: 30,
      }}
      className="border border-border bg-card text-card-foreground shadow-md"
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
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
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
          className="mt-1 flex min-h-11 items-center justify-between rounded-lg px-1 text-xs font-semibold text-amber-700 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-amber-400"
        >
          Apri scheda <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
