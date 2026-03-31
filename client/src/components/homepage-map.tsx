import { useEffect, useRef, useMemo } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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

function createMarkerEl(type: "pub" | "brewery", logoUrl?: string | null): HTMLElement {
  const color = type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = type === "pub" ? "#f5a623" : "#c46520";
  const emoji = type === "pub" ? "🍻" : "🍺";

  const wrapper = document.createElement("div");
  wrapper.className = "fermenta-marker";
  wrapper.style.cssText = "width:34px;height:34px;cursor:pointer;position:relative;";

  const inner = document.createElement("div");
  inner.style.cssText = [
    "width:34px;height:34px;border-radius:50%;",
    `background:linear-gradient(135deg,${color},${gradEnd});`,
    "border:2.5px solid white;",
    "box-shadow:0 2px 10px rgba(0,0,0,0.22);",
    "display:flex;align-items:center;justify-content:center;",
    "overflow:hidden;pointer-events:none;",
  ].join("");

  if (logoUrl) {
    const img = document.createElement("img");
    img.src = logoUrl;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    img.onerror = () => {
      inner.removeChild(img);
      const s = document.createElement("span");
      s.style.fontSize = "15px";
      s.textContent = emoji;
      inner.appendChild(s);
    };
    inner.appendChild(img);
  } else {
    const s = document.createElement("span");
    s.style.fontSize = "15px";
    s.textContent = emoji;
    inner.appendChild(s);
  }

  wrapper.appendChild(inner);
  return wrapper;
}

function createPopupHTML(
  type: "pub" | "brewery",
  name: string,
  sub: string,
  href: string,
  logoUrl?: string | null
): string {
  const color = type === "pub" ? PUB_COLOR : BREWERY_COLOR;
  const gradEnd = type === "pub" ? "#f5a623" : "#c46520";
  const label = type === "pub" ? "PUB" : "BIRRIFICIO";
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="" onerror="this.style.display='none'" style="width:38px;height:38px;border-radius:10px;object-fit:cover;flex-shrink:0;" />`
    : "";
  return `
    <div style="font-family:system-ui,sans-serif;padding:14px;min-width:175px;max-width:220px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        ${logo}
        <div style="min-width:0;flex:1;">
          <div style="font-weight:700;font-size:13px;color:#1a1107;line-height:1.3;margin-bottom:3px;">${name}</div>
          <div style="display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:0.06em;color:${color};background:${color}18;padding:1px 7px;border-radius:20px;">${label}</div>
        </div>
      </div>
      ${sub ? `<div style="font-size:11px;color:#9B7B5A;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📍 ${sub}</div>` : ""}
      <a href="${href}" style="display:block;text-align:center;padding:7px 12px;background:linear-gradient(135deg,${color},${gradEnd});color:white;border-radius:10px;text-decoration:none;font-size:12px;font-weight:700;">
        Scopri →
      </a>
    </div>
  `;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const didCenterRef = useRef(false);

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Stile inline con tile raster CARTO Voyager @2x — nessun fetch JSON esterno,
    // nessun glyph/sprite da caricare → rendering affidabile su tutti i browser mobile
    const RASTER_STYLE: StyleSpecification = {
      version: 8,
      sources: {
        "carto-voyager": {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: "© <a href='https://carto.com'>CARTO</a> © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors",
          maxzoom: 20,
        },
      },
      layers: [{ id: "carto-tiles", type: "raster", source: "carto-voyager", minzoom: 0, maxzoom: 22 }],
    };

    maplibregl.setMaxParallelImageRequests(16);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: userLocation ? [userLocation.lng, userLocation.lat] : [12.5, 42.0],
      zoom: userLocation ? 12 : 5.4,
      minZoom: 4,
      maxZoom: 19,
      scrollZoom: false,
      attributionControl: false,
      fadeDuration: 150,
      trackResize: true,
      renderWorldCopies: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || didCenterRef.current) return;
    didCenterRef.current = true;
    map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 12, duration: 900, essential: true });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const add = (lat: number, lng: number, el: HTMLElement, html: string) => {
      const popup = new maplibregl.Popup({
        offset: [0, -4],
        closeButton: false,
        maxWidth: "240px",
        className: "fermenta-popup",
      }).setHTML(html);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    };

    geoFilteredPubs.forEach(pub => {
      const el = createMarkerEl("pub", pub.logoUrl);
      const html = createPopupHTML(
        "pub",
        pub.name,
        pub.city || "",
        pub.slug ? `/pub/${pub.slug}` : `/pub/${pub.id}`,
        pub.logoUrl
      );
      add(parseFloat(pub.latitude!), parseFloat(pub.longitude!), el, html);
    });

    geoFilteredBreweries.forEach(brewery => {
      const el = createMarkerEl("brewery", brewery.logoUrl);
      const sub = [brewery.location, brewery.country].filter(Boolean).join(", ");
      const html = createPopupHTML("brewery", brewery.name, sub, `/brewery/${brewery.id}`, brewery.logoUrl);
      add(parseFloat(brewery.latitude!), parseFloat(brewery.longitude!), el, html);
    });
  }, [geoFilteredPubs, geoFilteredBreweries]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(280px, 50vh, 520px)" }}>
      {isLoading && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ background: "#edf0f2" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: "#F77104", borderTopColor: "transparent" }}
            />
            <span className="text-sm font-medium" style={{ color: "#9B7B5A" }}>Caricamento mappa...</span>
          </div>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0" />

      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-10"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--background) 100%)" }}
      />

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
        .fermenta-marker {
          will-change: transform;
          transition: transform 0.15s ease;
        }
        .fermenta-marker:hover {
          transform: scale(1.2);
          z-index: 999 !important;
        }
        .fermenta-marker:hover > div {
          box-shadow: 0 4px 18px rgba(247,113,4,0.45) !important;
        }
        .fermenta-popup .maplibregl-popup-content {
          border-radius: 14px !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
          border: 1px solid rgba(247,113,4,0.12) !important;
          overflow: hidden;
        }
        .fermenta-popup .maplibregl-popup-tip { display: none !important; }
        .maplibregl-ctrl-attrib {
          background: rgba(255,248,242,0.85) !important;
          border-radius: 8px !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-group {
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
        }
        .maplibregl-ctrl button {
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
}
