import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { MAP_STYLE_URL, applyMapTheme, createMapMarkerElement } from "@/lib/map-theme";

interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  label: string;
  kind?: "pub" | "brewery";
  /** App zoom uses 256px tiles, MapLibre uses 512px tiles. */
  zoom?: number;
  route?: GeoJSON.LineString;
  origin?: { lat: number; lng: number };
}

/** Shared, non-interactive map for venue details and route previews. */
export default function LocationPreviewMap({
  latitude, longitude, label, kind = "pub", zoom = 15, route, origin,
}: LocationPreviewMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const routeJson = route ? JSON.stringify(route) : null;
  const originLat = origin?.lat;
  const originLng = origin?.lng;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setState("loading");
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: host, style: MAP_STYLE_URL,
        center: [longitude, latitude], zoom: zoom - 1,
        interactive: false, attributionControl: false,
      });
    } catch {
      setState("error");
      return;
    }
    let disposed = false;
    let loaded = false;
    const markers: maplibregl.Marker[] = [];
    const geometry = routeJson ? JSON.parse(routeJson) as GeoJSON.LineString : null;
    const fit = () => {
      if (!loaded || !geometry?.coordinates.length) return;
      const bounds = new maplibregl.LngLatBounds();
      geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      bounds.extend([longitude, latitude]);
      if (originLat != null && originLng != null) bounds.extend([originLng, originLat]);
      map.fitBounds(bounds, { padding: 36, maxZoom: 14, duration: 0 });
    };
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
    map.on("error", () => { if (!disposed) setState("error"); });
    map.on("load", () => {
      if (disposed) return;
      applyMapTheme(map);
      if (geometry) {
        map.addSource("preview-route", {
          type: "geojson", data: { type: "Feature", geometry, properties: {} },
        });
        map.addLayer({
          id: "preview-route", type: "line", source: "preview-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#F59E0B", "line-width": 4, "line-opacity": 0.9 },
        });
      }
      const venueMarker = createMapMarkerElement(kind);
      venueMarker.removeAttribute("aria-hidden");
      venueMarker.setAttribute("role", "img");
      venueMarker.setAttribute("aria-label", label);
      markers.push(new maplibregl.Marker({ element: venueMarker }).setLngLat([longitude, latitude]).addTo(map));
      if (originLat != null && originLng != null) {
        const originMarker = createMapMarkerElement("origin");
        originMarker.removeAttribute("aria-hidden");
        originMarker.setAttribute("role", "img");
        originMarker.setAttribute("aria-label", "Punto di partenza");
        markers.push(new maplibregl.Marker({ element: originMarker }).setLngLat([originLng, originLat]).addTo(map));
      }
      loaded = true;
      fit();
      setState(current => current === "error" ? current : "ready");
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      fit();
    });
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
      markers.forEach(marker => marker.remove());
      map.remove();
    };
  }, [latitude, longitude, label, kind, zoom, routeJson, originLat, originLng, retry]);

  return (
    <div className="fermenta-map relative h-full w-full bg-[#FFF7EA]" data-location-preview-state={state} data-no-pull="true">
      <div ref={hostRef} className="h-full w-full" aria-label={label} role="region" />
      {state === "error" && (
        <div role="alert" className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 rounded-xl border border-[#ead7b7] bg-[#FFF7EA] px-3 text-xs text-[#635640] shadow-sm">
          <span>Mappa non disponibile.</span>
          <button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 px-2 font-semibold">Riprova</button>
        </div>
      )}
    </div>
  );
}
