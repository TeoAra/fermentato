import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function makeIcon(type: "pub" | "brewery", logoUrl?: string | null): L.DivIcon {
  const color = type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = type === "pub" ? "#f5a623" : "#c46520";
  const emoji = type === "pub" ? "🍻" : "🍺";
  const imgTag = logoUrl
    ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.parentElement.innerText='${emoji}'" />`
    : emoji;

  return L.divIcon({
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:linear-gradient(135deg,${color},${gradEnd});
      border:2.5px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;overflow:hidden;cursor:pointer;
      transition:transform 0.15s ease;
    ">${imgTag}</div>`,
    className: "fermenta-leaflet-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#3B82F6;border:3px solid white;
      box-shadow:0 0 0 3px rgba(59,130,246,0.35),0 2px 8px rgba(0,0,0,0.2);
    "></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FlyToUser({ userLocation }: { userLocation: { lat: number; lng: number } | null | undefined }) {
  const map = useMap();
  const didFly = useRef(false);

  useEffect(() => {
    if (!userLocation || didFly.current) return;
    didFly.current = true;
    map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1 });
  }, [userLocation, map]);

  return null;
}

/** Mappa raggio (km) → livello di zoom ottimale per mostrare il cerchio */
function radiusToZoom(km: number): number {
  if (km <= 5)  return 13;
  if (km <= 10) return 12;
  if (km <= 15) return 11;
  if (km <= 20) return 11;
  if (km <= 30) return 10;
  if (km <= 50) return 9;
  return 8;
}

function RadiusZoomController({
  userLocation,
  distanceKm,
}: {
  userLocation: { lat: number; lng: number } | null | undefined;
  distanceKm: number | undefined;
}) {
  const map = useMap();
  const prevKm = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!userLocation || !distanceKm) return;
    if (prevKm.current === distanceKm) return; // nessun cambiamento
    prevKm.current = distanceKm;
    map.flyTo([userLocation.lat, userLocation.lng], radiusToZoom(distanceKm), { duration: 0.8 });
  }, [distanceKm, userLocation, map]);

  return null;
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
  isLoading?: boolean;
  onLocate?: (loc: { lat: number; lng: number }) => void;
  showPubs?: boolean;
  showBreweries?: boolean;
  distanceKm?: number;
}

export default function HomepageMap({
  pubs,
  breweries,
  userLocation,
  isLoading,
  showPubs = true,
  showBreweries = true,
  distanceKm,
}: HomepageMapProps) {
  const geoFilteredPubs = useMemo(() => {
    if (!showPubs) return [];
    const valid = pubs.filter(p =>
      p.latitude && p.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
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
      !isNaN(parseFloat(b.latitude!)) &&
      !isNaN(parseFloat(b.longitude!))
    );
    if (!userLocation || !distanceKm) return valid;
    return valid.filter(b =>
      haversineDist(userLocation.lat, userLocation.lng, parseFloat(b.latitude!), parseFloat(b.longitude!)) <= distanceKm
    );
  }, [breweries, showBreweries, userLocation, distanceKm]);

  const pubCount = geoFilteredPubs.length;
  const breweryCount = geoFilteredBreweries.length;

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [42.0, 12.5];
  const zoom = userLocation ? 13 : 5.4;

  const userIcon = useMemo(() => makeUserIcon(), []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(280px, 50vh, 520px)" }}>
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-100 dark:bg-stone-800">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-primary" />
            <span className="text-sm font-medium text-muted-foreground">Caricamento mappa...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={true}
        scrollWheelZoom={false}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          subdomains="abcd"
          maxZoom={20}
          tileSize={256}
        />

        <FlyToUser userLocation={userLocation} />
        <RadiusZoomController userLocation={userLocation} distanceKm={distanceKm} />

        {userLocation && distanceKm && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={distanceKm * 1000}
            pathOptions={{
              color: "#F77104",
              weight: 1.5,
              opacity: 0.5,
              fillColor: "#F77104",
              fillOpacity: 0.06,
            }}
          />
        )}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
        )}

        {geoFilteredPubs.map(pub => {
          const lat = parseFloat(pub.latitude!);
          const lng = parseFloat(pub.longitude!);
          return (
            <Marker key={`pub-${pub.id}`} position={[lat, lng]} icon={makeIcon("pub", pub.logoUrl)}>
              <Popup className="fermenta-popup" closeButton={false}>
                <PopupContent
                  type="pub"
                  name={pub.name}
                  sub={pub.city || ""}
                  href={pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`}
                  logoUrl={pub.logoUrl}
                />
              </Popup>
            </Marker>
          );
        })}

        {geoFilteredBreweries.map(brewery => {
          const lat = parseFloat(brewery.latitude!);
          const lng = parseFloat(brewery.longitude!);
          const sub = [brewery.location, brewery.country].filter(Boolean).join(", ");
          return (
            <Marker key={`brewery-${brewery.id}`} position={[lat, lng]} icon={makeIcon("brewery", brewery.logoUrl)}>
              <Popup className="fermenta-popup" closeButton={false}>
                <PopupContent
                  type="brewery"
                  name={brewery.name}
                  sub={sub}
                  href={`/brewery/${brewery.id}`}
                  logoUrl={brewery.logoUrl}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--background) 100%)" }}
      />

      {/* Count badge */}
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

      <style>{`
        .fermenta-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
        .fermenta-leaflet-marker div:hover {
          transform: scale(1.2);
          z-index: 999 !important;
        }
        .fermenta-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
          border: 1px solid rgba(247,113,4,0.12) !important;
          overflow: hidden;
        }
        .fermenta-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .fermenta-popup .leaflet-popup-tip-container { display: none !important; }
        .leaflet-control-attribution {
          background: rgba(255,248,242,0.85) !important;
          border-radius: 8px !important;
          font-size: 10px !important;
        }
        .leaflet-control-zoom {
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
          border: none !important;
        }
        .leaflet-control-zoom a {
          border-radius: 0 !important;
          border-color: rgba(0,0,0,0.08) !important;
          color: #5C3D1A !important;
          font-weight: 700;
        }
        .leaflet-control-zoom a:hover {
          background: #fff8f2 !important;
        }
      `}</style>
    </div>
  );
}

function PopupContent({
  type, name, sub, href, logoUrl,
}: {
  type: "pub" | "brewery";
  name: string;
  sub: string;
  href: string;
  logoUrl?: string | null;
}) {
  const color = type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = type === "pub" ? "#f5a623" : "#c46520";
  const label = type === "pub" ? "PUB" : "BIRRIFICIO";

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "14px", minWidth: "175px", maxWidth: "220px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            style={{ width: "38px", height: "38px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#1a1107", lineHeight: 1.3, marginBottom: "3px" }}>{name}</div>
          <div style={{
            display: "inline-block", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.06em",
            color, background: `${color}18`, padding: "1px 7px", borderRadius: "20px",
          }}>{label}</div>
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: "11px", color: "#9B7B5A", marginBottom: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          📍 {sub}
        </div>
      )}
      <a
        href={href}
        style={{
          display: "block", textAlign: "center", padding: "7px 12px",
          background: `linear-gradient(135deg,${color},${gradEnd})`,
          color: "white", borderRadius: "10px", textDecoration: "none",
          fontSize: "12px", fontWeight: 700,
        }}
      >
        Scopri →
      </a>
    </div>
  );
}
