import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
}

const ITALY_CENTER: [number, number] = [12.4964, 41.9028];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function PubMap({ pins, height = "100%" }: PubMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const geoCtrlRef = useRef<maplibregl.GeolocateControl | null>(null);

  const validPins = pins.filter(
    (p) => p.latitude && p.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: ITALY_CENTER,
      zoom: 5.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const geoCtrl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showAccuracyCircle: false,
    });
    map.addControl(geoCtrl, "top-right");
    geoCtrlRef.current = geoCtrl;

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
            "#F77104", 10,
            "#e8650a", 30,
            "#c94f00",
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
        id: "cluster-count",
        type: "symbol",
        source: "pins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 13,
        },
        paint: { "text-color": "#fff" },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "pins",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#F77104",
          "circle-radius": 9,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#fff",
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource("pins") as maplibregl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom ?? 12,
            });
          }
        );
      });

      map.on("click", "unclustered", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered"] });
        if (!features.length) return;
        const { name, slug, address, type } = features[0].properties ?? {};
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        const href = type === "brewery" ? `/brewery/${slug}` : `/pub/${slug}`;
        const label = type === "brewery" ? "Vai al birrificio" : "Vai al pub";

        new maplibregl.Popup({ maxWidth: "240px", className: "fermenta-popup" })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;padding:2px 0 4px">
              <div style="font-weight:800;font-size:14px;margin-bottom:${address ? "4px" : "8px"};color:#1a1a1a">${name}</div>
              ${address ? `<div style="font-size:12px;color:#777;margin-bottom:8px;line-height:1.4">${address}</div>` : ""}
              <a href="${href}" style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#F77104,#f5a623);color:#fff;font-weight:700;font-size:12px;padding:7px 14px;border-radius:12px;text-decoration:none">
                ${label} →
              </a>
            </div>
          `)
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
    return () => { map.remove(); mapRef.current = null; };
  }, []);

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

  const handleLocate = () => {
    setLocating(true);
    geoCtrlRef.current?.trigger();
    setTimeout(() => setLocating(false), 3000);
  };

  const pinsWithCoords = validPins.length;
  const pinsTotal = pins.length;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-orange-50 dark:border-[hsl(25,12%,16%)]" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Info badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-black/70 backdrop-blur-sm shadow text-foreground">
        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        {pinsWithCoords} {pinsWithCoords === 1 ? "locale" : "locali"} su mappa
        {pinsWithCoords < pinsTotal && (
          <span className="text-muted-foreground font-normal">/ {pinsTotal} totali</span>
        )}
      </div>

      {/* Geolocation button */}
      <button
        onClick={handleLocate}
        disabled={locating}
        className="absolute bottom-10 right-3 z-10 w-9 h-9 rounded-xl bg-white dark:bg-[hsl(25,14%,12%)] shadow-md flex items-center justify-center text-primary hover:bg-orange-50 transition-colors border border-orange-50"
        title="Vicino a me"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
      </button>
    </div>
  );
}
