import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export function EventMap({ pins, height = "100%", userLocation, onError }: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const validPins = pins.filter(
    (p) => p.latitude && p.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: ITALY_CENTER,
        zoom: 5.5,
        attributionControl: false,
      });
    } catch {
      setMapError(true);
      onError?.();
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
            "#9333ea", 10,
            "#7c3aed", 30,
            "#6d28d9",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            22, 10,
            30, 30,
            38,
          ],
          "circle-opacity": 0.92,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: "event-cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 13,
        },
        paint: { "text-color": "#fff" },
      });

      // Individual event pins
      map.addLayer({
        id: "event-unclustered",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#9333ea",
          "circle-radius": 10,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#fff",
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
      map.on("click", "event-unclustered", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["event-unclustered"] });
        if (!features.length) return;
        const { id, sourceType, title, venueName } = features[0].properties ?? {};
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const href = `/eventi/${encodeURIComponent(sourceType)}/${encodeURIComponent(String(id))}`;
        const typeLabel = sourceType === "brewery" ? "Birrificio" : "Pub";

        const container = document.createElement("div");
        container.style.cssText = "font-family:system-ui,sans-serif;padding:2px 0 4px";

        const badge = document.createElement("div");
        badge.style.cssText = "font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9333ea;font-weight:700;margin-bottom:4px";
        badge.textContent = typeLabel;

        const titleEl = document.createElement("div");
        titleEl.style.cssText = "font-weight:800;font-size:14px;margin-bottom:4px;color:#1a1a1a;line-height:1.3";
        titleEl.textContent = String(title ?? "");

        const venueEl = document.createElement("div");
        venueEl.style.cssText = "font-size:12px;color:#777;margin-bottom:8px";
        venueEl.textContent = String(venueName ?? "");

        const link = document.createElement("a");
        link.href = href;
        link.style.cssText = "display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#9333ea,#7c3aed);color:#fff;font-weight:700;font-size:12px;padding:7px 14px;border-radius:12px;text-decoration:none";
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
    return () => { map.remove(); mapRef.current = null; };
  }, []);

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
      map.addLayer({ id: "user-dot-halo", type: "circle", source: "user-location", paint: { "circle-radius": 12, "circle-color": "#3b82f6", "circle-opacity": 0.18 } });
      map.addLayer({ id: "user-dot", type: "circle", source: "user-location", paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });
    }

    map.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 9, duration: 800 });
  }, [userLocation, ready]);

  if (mapError) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-stone-100 dark:border-border bg-stone-50 dark:bg-[#0B0D10]/30 flex flex-col items-center justify-center gap-3 text-center px-6" style={{ height }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 dark:text-stone-600">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Mappa non disponibile</p>
      </div>
    );
  }

  return (
    <div data-no-pull="true" className="relative w-full rounded-2xl overflow-hidden border border-stone-100 dark:border-border" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow text-foreground">
        <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
        {validPins.length} {validPins.length === 1 ? "evento" : "eventi"} su mappa
      </div>
    </div>
  );
}
