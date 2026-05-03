import { useState, useEffect, useRef, useMemo } from "react";
import { Map, Overlay } from "pigeon-maps";
import { Capacitor } from "@capacitor/core";
import { X, Plus, Minus } from "lucide-react";
import Supercluster from "supercluster";

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

// CARTO Positron – pulito e minimalista come Google Maps
const cartoVoyager = (x: number, y: number, z: number, dpr?: number) => {
  const s = "abcd"[Math.abs(x + y) % 4];
  const retina = dpr && dpr >= 2 ? "@2x" : "";
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const style = dark ? "dark_all" : "light_all";
  return `https://${s}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}${retina}.png`;
};

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
  isLoading?: boolean;
  onLocate?: (loc: { lat: number; lng: number }) => void;
  showPubs?: boolean;
  showBreweries?: boolean;
  distanceKm?: number;
  showControls?: boolean;
  externalZoom?: number;
  onZoomChange?: (z: number) => void;
  fixedHeight?: number;
}

interface Selected {
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
  isLoading,
  showPubs = true,
  showBreweries = true,
  distanceKm,
  showControls = true,
  externalZoom,
  onZoomChange,
  fixedHeight,
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
  const [selected, setSelected] = useState<Selected | null>(null);
  const hasFlewRef = useRef(false);
  const prevDistRef = useRef<number | undefined>();

  useEffect(() => {
    if (fixedHeight) {
      setMapHeight(fixedHeight);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      if (h > 0) setMapHeight(h);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedHeight]);

  useEffect(() => {
    if (!userLocation || hasFlewRef.current) return;
    hasFlewRef.current = true;
    setCenter([userLocation.lat, userLocation.lng]);
    updateZoom(radiusToZoom(distanceKm ?? 10));
  }, [userLocation, distanceKm]);

  useEffect(() => {
    if (!userLocation || !distanceKm) return;
    if (prevDistRef.current === distanceKm) return;
    prevDistRef.current = distanceKm;
    setCenter([userLocation.lat, userLocation.lng]);
    updateZoom(radiusToZoom(distanceKm));
  }, [distanceKm, userLocation]);

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
      className="relative w-full overflow-hidden"
      style={{ touchAction: "pan-y", height: fixedHeight ? `${fixedHeight}px` : '100%', maxHeight: fixedHeight ? `${fixedHeight}px` : undefined }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100 dark:bg-stone-800">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-primary" />
            <span className="text-sm font-medium text-muted-foreground">Caricamento mappa...</span>
          </div>
        </div>
      )}

      {mapHeight > 0 && (
        <Map
          center={center}
          zoom={displayZoom}
          height={mapHeight}
          onBoundsChanged={({ center: c, zoom: z, bounds: b }) => { setCenter(c); updateZoom(z); if (b) setBounds({ ne: b.ne as [number, number], sw: b.sw as [number, number] }); }}
          provider={cartoVoyager}
          dprs={[1, 2]}
          attribution={false}
          metaWheelZoom={true}
          metaWheelZoomWarning=""
          animate={!isNative}
          onClick={() => setSelected(null)}
        >
          {userLocation && (
            <Overlay anchor={[userLocation.lat, userLocation.lng]} offset={[8, 8]}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "#3B82F6", border: "3px solid white",
                boxShadow: "0 0 0 3px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.2)",
                pointerEvents: "none",
              }} />
            </Overlay>
          )}

          {clusters.map((c: any) => {
            const [lng, lat] = c.geometry.coordinates;
            if (c.properties.cluster) {
              const count = c.properties.point_count as number;
              const size = count < 10 ? 38 : count < 50 ? 46 : count < 200 ? 54 : 62;
              return (
                <Overlay key={`cluster-${c.id}`} anchor={[lat, lng]} offset={[size / 2, size / 2]}>
                  <div
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
                      cursor: "pointer", userSelect: "none",
                    }}
                  >
                    {count}
                  </div>
                </Overlay>
              );
            }
            const { kind, data } = c.properties;
            if (kind === "pub") {
              const pub = data;
              const isSelected = selected?.type === "pub" && selected.id === pub.id;
              return (
                <Overlay key={`pub-${pub.id}`} anchor={[lat, lng]} offset={[18, 18]}>
                  <div style={{ position: "relative" }}>
                    <MarkerPin
                      type="pub"
                      logoUrl={pub.logoUrl}
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
                    {isSelected && (
                      <MapPopup selected={selected!} onClose={() => setSelected(null)} />
                    )}
                  </div>
                </Overlay>
              );
            }
            const brewery = data;
            const isSelected = selected?.type === "brewery" && selected.id === brewery.id;
            const sub = [brewery.location, brewery.country].filter(Boolean).join(", ");
            return (
              <Overlay key={`brewery-${brewery.id}`} anchor={[lat, lng]} offset={[18, 18]}>
                <div style={{ position: "relative" }}>
                  <MarkerPin
                    type="brewery"
                    logoUrl={brewery.logoUrl}
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
                  {isSelected && (
                    <MapPopup selected={selected!} onClose={() => setSelected(null)} />
                  )}
                </div>
              </Overlay>
            );
          })}
        </Map>
      )}

      {showControls && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => updateZoom(Math.min(displayZoom + 1, 18))}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-colors active:scale-95"
            style={{ background: "rgba(255,248,242,0.95)", border: "1px solid rgba(247,113,4,0.15)", color: "#5C3D1A" }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => updateZoom(Math.max(displayZoom - 1, 2))}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-colors active:scale-95"
            style={{ background: "rgba(255,248,242,0.95)", border: "1px solid rgba(247,113,4,0.15)", color: "#5C3D1A" }}
          >
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="absolute bottom-5 right-2 z-10 text-[9px] opacity-50 select-none" style={{ color: "#5C3D1A" }}>
        © <a href="https://carto.com" target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>CARTO</a>
        {" "}©{" "}
        <a href="https://openstreetmap.org" target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>OSM</a>
      </div>

      {!isLoading && (pubCount + breweryCount > 0) && (
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
    </div>
  );
}

function MarkerPin({
  type, logoUrl, isSelected, onClick,
}: {
  type: "pub" | "brewery";
  logoUrl?: string | null;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const color = type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = type === "pub" ? "#f5a623" : "#c46520";
  const emoji = type === "pub" ? "🍻" : "🍺";

  return (
    <div
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        background: `linear-gradient(135deg,${color},${gradEnd})`,
        border: `2.5px solid ${isSelected ? "#F77104" : "white"}`,
        boxShadow: isSelected
          ? "0 0 0 3px rgba(247,113,4,0.4), 0 2px 10px rgba(0,0,0,0.25)"
          : "0 2px 10px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, overflow: "hidden", cursor: "pointer",
        transform: isSelected ? "scale(1.2)" : "scale(1)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        position: "relative", zIndex: isSelected ? 100 : 1,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          onError={e => {
            const t = e.target as HTMLImageElement;
            t.style.display = "none";
            if (t.parentElement) t.parentElement.textContent = emoji;
          }}
        />
      ) : emoji}
    </div>
  );
}

function MapPopup({ selected, onClose }: { selected: Selected; onClose: () => void }) {
  const color = selected.type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = selected.type === "pub" ? "#f5a623" : "#c46520";
  const label = selected.type === "pub" ? "PUB" : "BIRRIFICIO";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: 180,
        maxWidth: 230,
        background: "white",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        border: "1px solid rgba(247,113,4,0.12)",
        overflow: "visible",
        zIndex: 200,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ padding: "12px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          {selected.logoUrl && (
            <img
              src={selected.logoUrl}
              alt=""
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1107", lineHeight: 1.25, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selected.name}
            </div>
            <div style={{ display: "inline-block", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.06em", color, background: `${color}18`, padding: "1px 7px", borderRadius: 20 }}>
              {label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
          >
            <X size={11} style={{ color: "#9B7B5A" }} />
          </button>
        </div>
        {selected.sub && (
          <div style={{ fontSize: 11, color: "#9B7B5A", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            📍 {selected.sub}
          </div>
        )}
        <a
          href={selected.href}
          style={{
            display: "block", textAlign: "center", padding: "7px 12px",
            background: `linear-gradient(135deg,${color},${gradEnd})`,
            color: "white", borderRadius: 10, textDecoration: "none",
            fontSize: 12, fontWeight: 700,
          }}
        >
          Scopri →
        </a>
      </div>
    </div>
  );
}
