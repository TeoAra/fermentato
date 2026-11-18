import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { applyMapTheme, MAP_STYLE_URL } from "@/lib/map-theme";

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

export default function HomeVectorMap({
  center, zoom, onBoundsChanged, onMapClick, onError, retryToken, children,
}: HomeVectorMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const callbacksRef = useRef({ onBoundsChanged, onMapClick, onError });
  const cameraRef = useRef({ center, zoom });
  const [view, setView] = useState({ width: 0, height: 0, mounted: false, revision: 0 });
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const failedRef = useRef(false);

  callbacksRef.current = { onBoundsChanged, onMapClick, onError };
  cameraRef.current = { center, zoom };

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
        style: MAP_STYLE_URL,
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
    let loaded = false;
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");

    const reportView = () => {
      if (!loaded || mapRef.current !== map || map.getContainer().clientWidth === 0) return;
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
      applyMapTheme(map);
      // Do not let initialization/resize overwrite a GPS camera update that
      // arrived while the style was loading (especially on fullscreen mount).
      const latest = cameraRef.current;
      map.jumpTo({ center: [latest.center[1], latest.center[0]], zoom: latest.zoom - 1 });
      loaded = true;
      setView(v => ({ ...v, mounted: true }));
      if (!failedRef.current) setMapState("ready");
      reportView();
      repaintOverlay();
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
    </div>
  );
}
