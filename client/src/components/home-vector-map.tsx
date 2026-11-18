import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type HomeMapBounds = { ne: [number, number]; sw: [number, number] };
export type HomeMapProject = (lat: number, lng: number) => { x: number; y: number };

interface HomeVectorMapProps {
  center: [number, number];
  zoom: number;
  onBoundsChanged: (view: { center: [number, number]; zoom: number; bounds: HomeMapBounds }) => void;
  onMapClick: () => void;
  onError: () => void;
  retryToken: number;
  children: (view: { project: HomeMapProject; width: number; height: number; mounted: boolean }) => ReactNode;
}

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export default function HomeVectorMap({
  center, zoom, onBoundsChanged, onMapClick, onError, retryToken, children,
}: HomeVectorMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const callbacksRef = useRef({ onBoundsChanged, onMapClick, onError });
  const [view, setView] = useState({ width: 0, height: 0, mounted: false, revision: 0 });
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const failedRef = useRef(false);

  callbacksRef.current = { onBoundsChanged, onMapClick, onError };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setMapState("loading");
    setView(v => ({ ...v, mounted: false }));
    let map: maplibregl.Map;
    failedRef.current = false;
    try {
      map = new maplibregl.Map({
        container: host,
        style: MAP_STYLE,
        center: [center[1], center[0]],
        // Preserve the app's 256px zoom scale; MapLibre uses 512px tiles.
        zoom: zoom - 1,
        attributionControl: false,
        maxZoom: 17,
        minZoom: 1,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: false,
      });
    } catch {
      failedRef.current = true;
      setMapState("error");
      callbacksRef.current.onError();
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");

    const reportView = () => {
      if (mapRef.current !== map || map.getContainer().clientWidth === 0) return;
      const bounds = map.getBounds();
      const mapCenter = map.getCenter();
      callbacksRef.current.onBoundsChanged({
        center: [mapCenter.lat, mapCenter.lng],
        zoom: map.getZoom() + 1,
        bounds: {
          ne: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
          sw: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
        },
      });
    };
    let frame = 0;
    const repaintOverlay = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = host.getBoundingClientRect();
        setView(v => ({ ...v, width: rect.width, height: rect.height, revision: v.revision + 1 }));
      });
    };
    map.on("load", () => {
      setView(v => ({ ...v, mounted: true }));
      if (!failedRef.current) setMapState("ready");
      reportView();
      repaintOverlay();
      // Keep the quiet Positron base, while giving land and water a warmer
      // paper tint. Labels and road hierarchy remain authored by the provider.
      try {
        for (const layer of map.getStyle().layers ?? []) {
          if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#fff7ea");
          if (layer.type === "fill" && /park|landcover|wood|grass/i.test(layer.id)) {
            map.setPaintProperty(layer.id, "fill-color", "#e9efdf");
          }
          if (layer.type === "fill" && /water/i.test(layer.id)) {
            map.setPaintProperty(layer.id, "fill-color", "#e3edf0");
          }
        }
      } catch { /* Provider style changes should never prevent map use. */ }
    });
    map.on("move", repaintOverlay);
    map.on("moveend", reportView);
    map.on("zoomend", reportView);
    map.on("click", () => callbacksRef.current.onMapClick());
    map.on("error", () => {
      if (mapRef.current !== map || failedRef.current) return;
      failedRef.current = true;
      setMapState("error");
      callbacksRef.current.onError();
      // Keep projecting overlays from the live camera even if tile loading
      // fails, so the retry affordance does not erase useful venue controls.
      setView(v => ({ ...v, mounted: true }));
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      repaintOverlay();
      reportView();
    });
    observer.observe(host);
    repaintOverlay();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
    // retryToken intentionally recreates only on explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    const moved = Math.abs(current.lat - center[0]) > 0.00001 || Math.abs(current.lng - center[1]) > 0.00001;
    const zoomed = Math.abs(map.getZoom() + 1 - zoom) > 0.001;
    if (moved || zoomed) {
      map.jumpTo({
        ...(moved ? { center: [center[1], center[0]] as [number, number] } : {}),
        ...(zoomed ? { zoom: zoom - 1 } : {}),
      });
    }
  }, [center, zoom]);

  const project: HomeMapProject = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return { x: 0, y: 0 };
    const point = map.project([lng, lat]);
    return { x: point.x, y: point.y };
  };

  return (
    <div className="home-vector-map" data-vector-map-state={mapState}>
      <div ref={hostRef} className="home-vector-map__canvas" role="application" aria-label="Mappa dei pub e birrifici" />
      <div className="home-vector-map__overlay" aria-hidden="false">
        {children({ project, width: view.width, height: view.height, mounted: view.mounted })}
      </div>
      <style>{`
        .home-vector-map,.home-vector-map__canvas,.home-vector-map__overlay{position:absolute;inset:0}
        .home-vector-map__canvas{background:#f3f0e8}
        .home-vector-map__overlay{pointer-events:none;overflow:hidden}
        .home-vector-map__overlay>*{pointer-events:auto}
        .maplibregl-ctrl-attrib{font:10px/1.3 ui-sans-serif,system-ui,sans-serif!important;color:#625d52!important;background:rgba(255,247,234,.94)!important;border-radius:8px 0 0 0!important;box-shadow:none!important}
        .maplibregl-ctrl-attrib a{color:#625d52!important}
        .maplibregl-ctrl-bottom-right{right:0;bottom:0}
        @media (max-width:480px){.maplibregl-ctrl-attrib{font-size:9px!important}}
      `}</style>
    </div>
  );
}
