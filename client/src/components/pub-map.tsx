import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { addMapMarkerImages, applyMapTheme, MAP_STYLE_URL } from "@/lib/map-theme";

export interface MapPin {
  id: number;
  name: string;
  slug?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  type?: "pub" | "brewery";
}

interface PubMapProps {
  pins: MapPin[];
  height?: string;
  onError?: () => void;
  label?: string;
  userLocation?: { lat: number; lng: number } | null;
  radiusKm?: number;
  fullscreen?: boolean;
}

const ITALY_CENTER: [number, number] = [12.4964, 41.9028];
function makeCirclePolygon(lat: number, lng: number, radiusKm: number, steps = 64): GeoJSON.FeatureCollection {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.sin(angle);
    const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }] };
}

export function PubMap({ pins, height = "100%", onError, label, userLocation, radiusKm, fullscreen }: PubMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const callbacksRef = useRef({ onError });
  callbacksRef.current = { onError };

  const validPins = pins.filter(
    (p) => p.latitude && p.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    let failed = false;
    setMapError(false);
    setReady(false);
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: ITALY_CENTER,
        zoom: 5.5,
        attributionControl: false,
      });
    } catch {
      setMapError(true);
      callbacksRef.current.onError?.();
      return;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const geoCtrl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geoCtrl, "top-right");

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validPins.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(p.longitude!), parseFloat(p.latitude!)],
        },
        properties: {
          id: p.id,
          name: p.name,
          slug: p.slug ?? String(p.id),
          address: p.address ?? "",
          type: p.type ?? "pub",
        },
      })),
    };

    map.on("load", () => {
      applyMapTheme(map);
      addMapMarkerImages(map);
      map.addSource("pins", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#F59E0B", 10,
            "#E89916", 30,
            "#D47B08",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            15, 10,
            18, 30,
            21,
          ],
          "circle-opacity": 0.92,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFF7EA",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#493A20" },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "pins",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#FFF7EA",
          "circle-opacity": 0,
          "circle-radius": 22,
          "circle-stroke-width": 0,
          "circle-stroke-color": "#F59E0B",
        },
      });
      map.addLayer({
        id: "pin-kind-symbol",
        type: "symbol",
        source: "pins",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["match", ["get", "type"], "brewery", "fermenta-brewery", "fermenta-pub"],
          "icon-allow-overlap": true,
        },
        paint: {
          "text-color": "#B96D08",
          "text-halo-color": "#FFF7EA",
          "text-halo-width": 1,
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource("pins") as maplibregl.GeoJSONSource;
        Promise.resolve(src.getClusterExpansionZoom(clusterId))
          .then((zoom: any) => {
            map.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? 12,
            });
          })
          .catch(() => {});
      });

      map.on("click", ["unclustered", "pin-kind-symbol"], (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered", "pin-kind-symbol"] });
        if (!features.length) return;
        const { name, slug, address, type } = features[0].properties ?? {};
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const safeSlug = encodeURIComponent(String(slug ?? ""));
        const href = type === "brewery" ? `/brewery/${safeSlug}` : `/pub/${safeSlug}`;
        const label = type === "brewery" ? "Vai al birrificio" : "Vai al pub";

        const content = document.createElement("div");
        content.className = "fermenta-map-popup";
        const title = document.createElement("div");
        title.className = "fermenta-map-popup__title";
        title.textContent = String(name ?? "");
        content.appendChild(title);
        if (address) {
          const detail = document.createElement("div");
          detail.className = "fermenta-map-popup__detail";
          detail.textContent = String(address);
          content.appendChild(detail);
        }
        const link = document.createElement("a");
        link.className = "fermenta-map-popup__link";
        link.href = href;
        link.textContent = `${label} →`;
        content.appendChild(link);

        new maplibregl.Popup({ maxWidth: "240px", className: "fermenta-popup" })
          .setLngLat(coords)
          .setDOMContent(content)
          .addTo(map);
      });

      ["clusters", "unclustered"].forEach((layer) => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      });

      if (validPins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        validPins.forEach((p) => bounds.extend([parseFloat(p.longitude!), parseFloat(p.latitude!)]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
      }

      setReady(true);
    });

    mapRef.current = map;
    map.on("error", () => {
      if (mapRef.current !== map || failed) return;
      failed = true;
      setMapError(true);
      setReady(false);
      callbacksRef.current.onError?.();
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    if (containerRef.current.parentElement) resizeObserver.observe(containerRef.current.parentElement);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [retryToken]);

  // Draw / update user-location dot + radius circle whenever location or radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (userLocation) {
      const userPoint: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "Point", coordinates: [userLocation.lng, userLocation.lat] }, properties: {} }],
      };

      if (map.getSource("user-location")) {
        (map.getSource("user-location") as maplibregl.GeoJSONSource).setData(userPoint);
      } else {
        map.addSource("user-location", { type: "geojson", data: userPoint });
        map.addLayer({ id: "user-dot-halo", type: "circle", source: "user-location", paint: { "circle-radius": 12, "circle-color": "#F59E0B", "circle-opacity": 0.18 } });
        map.addLayer({ id: "user-dot", type: "circle", source: "user-location", paint: { "circle-radius": 6, "circle-color": "#F59E0B", "circle-stroke-width": 2.5, "circle-stroke-color": "#FFF7EA" } });
      }

      if (radiusKm && radiusKm > 0) {
        const circleData = makeCirclePolygon(userLocation.lat, userLocation.lng, radiusKm);
        if (map.getSource("radius-circle")) {
          (map.getSource("radius-circle") as maplibregl.GeoJSONSource).setData(circleData as any);
        } else {
          map.addSource("radius-circle", { type: "geojson", data: circleData as any });
          map.addLayer({ id: "radius-fill", type: "fill", source: "radius-circle", paint: { "fill-color": "#F59E0B", "fill-opacity": 0.08 } }, "clusters");
          map.addLayer({ id: "radius-border", type: "line", source: "radius-circle", paint: { "line-color": "#E89916", "line-width": 1.5, "line-dasharray": [4, 3], "line-opacity": 0.55 } }, "clusters");
        }
      } else if (map.getSource("radius-circle")) {
        (map.getSource("radius-circle") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [userLocation, radiusKm, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("pins") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: validPins.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(p.longitude!), parseFloat(p.latitude!)],
        },
        properties: {
          id: p.id,
          name: p.name,
          slug: p.slug ?? String(p.id),
          address: p.address ?? "",
          type: p.type ?? "pub",
        },
      })),
    });
  }, [pins, ready]);

  const pinsWithCoords = validPins.length;
  const pinsTotal = pins.length;

  if (mapError) {
    return (
      <div className={fullscreen ? "fermenta-map-shell relative w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6" : "fermenta-map-shell relative w-full rounded-2xl overflow-hidden border border-[#ead7b7] flex flex-col items-center justify-center gap-3 text-center px-6"} style={fullscreen ? undefined : { height }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <div>
          <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Mappa non disponibile</p>
          <p className="text-xs text-stone-500 mt-0.5">La mappa non è riuscita a caricare i dati cartografici.</p>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-600">
          {validPins.length} {label ?? (validPins.length === 1 ? "locale" : "locali")} disponibili
        </p>
        <button type="button" className="fermenta-map-retry" onClick={() => { setMapError(false); setRetryToken(v => v + 1); }}>Riprova</button>
      </div>
    );
  }

  return (
    <div data-no-pull="true" data-map-state={ready ? "ready" : "loading"} aria-busy={!ready} className={`fermenta-map-shell ${fullscreen ? "relative w-full h-full" : "relative w-full rounded-2xl overflow-hidden border border-[#ead7b7]"}`} style={fullscreen ? undefined : { height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Info badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fff7ea]/95 border border-[#ead7b7] shadow text-[#675239]">
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />
        {pinsWithCoords} {label ?? (pinsWithCoords === 1 ? "locale" : "locali")} su mappa
        {pinsWithCoords < pinsTotal && (
          <span className="text-muted-foreground font-normal">/ {pinsTotal} totali</span>
        )}
      </div>

    </div>
  );
}
