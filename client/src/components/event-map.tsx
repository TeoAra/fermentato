import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { addMapMarkerImages, applyMapTheme, MAP_STYLE_URL } from "@/lib/map-theme";

export interface EventMapPin {
  id: number;
  sourceType: "pub" | "brewery";
  title: string;
  venueName: string;
  venueSlug: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface EventMapProps {
  pins: EventMapPin[];
  height?: string;
  userLocation?: { lat: number; lng: number } | null;
  onError?: () => void;
}

const ITALY_CENTER: [number, number] = [12.4964, 41.9028];
export function EventMap({ pins, height = "100%", userLocation, onError }: EventMapProps) {
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
          sourceType: p.sourceType,
          title: p.title,
          venueName: p.venueName,
          venueSlug: p.venueSlug ?? String(p.id),
        },
      })),
    };

    map.on("load", () => {
      applyMapTheme(map);
      addMapMarkerImages(map);
      map.addSource("events", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      });

      // Cluster circles
      map.addLayer({
        id: "event-clusters",
        type: "circle",
        source: "events",
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
        id: "event-cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#493A20" },
      });

      // Individual event pins
      map.addLayer({
        id: "event-unclustered",
        type: "circle",
        source: "events",
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
        id: "event-symbol",
        type: "symbol",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "fermenta-event",
          "icon-allow-overlap": true,
        },
        paint: {
          "text-color": "#B96D08",
          "text-halo-color": "#FFF7EA",
          "text-halo-width": 1,
        },
      });

      // Cluster click → expand
      map.on("click", "event-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["event-clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource("events") as maplibregl.GeoJSONSource;
        Promise.resolve(src.getClusterExpansionZoom(clusterId))
          .then((zoom: any) => {
            map.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? 12,
            });
          })
          .catch(() => {});
      });

      // Individual pin click → popup with event link (DOM-constructed to avoid XSS)
      map.on("click", ["event-unclustered", "event-symbol"], (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["event-unclustered", "event-symbol"] });
        if (!features.length) return;
        const { id, sourceType, title, venueName } = features[0].properties ?? {};
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const href = `/eventi/${encodeURIComponent(sourceType)}/${encodeURIComponent(String(id))}`;
        const typeLabel = sourceType === "brewery" ? "Birrificio" : "Pub";

        const container = document.createElement("div");
        container.className = "fermenta-map-popup";

        const badge = document.createElement("div");
        badge.className = "fermenta-map-popup__badge";
        badge.textContent = typeLabel;

        const titleEl = document.createElement("div");
        titleEl.className = "fermenta-map-popup__title";
        titleEl.textContent = String(title ?? "");

        const venueEl = document.createElement("div");
        venueEl.className = "fermenta-map-popup__detail";
        venueEl.textContent = String(venueName ?? "");

        const link = document.createElement("a");
        link.href = href;
        link.className = "fermenta-map-popup__link";
        link.textContent = "Dettagli evento →";

        container.appendChild(badge);
        container.appendChild(titleEl);
        container.appendChild(venueEl);
        container.appendChild(link);

        new maplibregl.Popup({ maxWidth: "260px", className: "fermenta-popup" })
          .setLngLat(coords)
          .setDOMContent(container)
          .addTo(map);
      });

      ["event-clusters", "event-unclustered"].forEach((layer) => {
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

  // Update pins when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
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
          sourceType: p.sourceType,
          title: p.title,
          venueName: p.venueName,
          venueSlug: p.venueSlug ?? String(p.id),
        },
      })),
    });
    if (validPins.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      validPins.forEach((p) => bounds.extend([parseFloat(p.longitude!), parseFloat(p.latitude!)]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }
  }, [pins, ready]);

  // Draw user location dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userLocation) return;

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

    map.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 9, duration: 800 });
  }, [userLocation, ready]);

  if (mapError) {
    return (
      <div className="fermenta-map-shell relative w-full rounded-2xl overflow-hidden border border-[#ead7b7] flex flex-col items-center justify-center gap-3 text-center px-6" style={{ height }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Mappa non disponibile</p>
        <p className="text-xs text-stone-500">La mappa non è riuscita a caricare i dati cartografici.</p>
        <button type="button" className="fermenta-map-retry" onClick={() => { setMapError(false); setRetryToken(v => v + 1); }}>Riprova</button>
      </div>
    );
  }

  return (
    <div data-no-pull="true" data-map-state={ready ? "ready" : "loading"} aria-busy={!ready} className="fermenta-map-shell relative w-full rounded-2xl overflow-hidden border border-[#ead7b7]" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fff7ea]/95 border border-[#ead7b7] shadow text-[#675239]">
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />
        {validPins.length} {validPins.length === 1 ? "evento" : "eventi"} su mappa
      </div>
    </div>
  );
}
