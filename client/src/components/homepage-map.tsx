/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getGoogleMapsLoader } from "@/lib/googleMapsLoader";
import { MapPin, Loader2, LocateFixed } from "lucide-react";

interface MapPub {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
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
  onLocate?: (location: { lat: number; lng: number }) => void;
}

const PUB_COLOR = "#3B82F6";
const BREWERY_COLOR = "#F59E0B";

function createMarkerElement(color: string, logoUrl?: string | null): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = "44px";
  container.style.height = "52px";
  container.style.cursor = "pointer";

  const pin = document.createElement("div");
  pin.style.cssText = `
    width: 44px; height: 44px; background: ${color}; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg); border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); position: absolute; top: 0; left: 0;
  `;
  container.appendChild(pin);

  const inner = document.createElement("div");
  inner.style.cssText = `
    width: 32px; height: 32px; border-radius: 50%; background: white;
    position: absolute; top: 3px; left: 6px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  `;

  if (logoUrl) {
    const img = document.createElement("img");
    img.src = logoUrl;
    img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
    img.onerror = () => {
      img.remove();
      inner.textContent = color === PUB_COLOR ? "🍻" : "🍺";
      inner.style.fontSize = "16px";
    };
    inner.appendChild(img);
  } else {
    inner.textContent = color === PUB_COLOR ? "🍻" : "🍺";
    inner.style.fontSize = "16px";
  }

  container.appendChild(inner);

  const tip = document.createElement("div");
  tip.style.cssText = `
    width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
    border-top: 8px solid ${color}; position: absolute; bottom: 0; left: 16px;
  `;
  container.appendChild(tip);

  return container;
}

export default function HomepageMap({ pubs, breweries, userLocation, isLoading, onLocate }: HomepageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const initStartedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const initMap = useCallback(async () => {
    if (!mapRef.current || initStartedRef.current) return;
    initStartedRef.current = true;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    try {
      const loader = getGoogleMapsLoader();

      const { Map } = await loader.importLibrary("maps");
      await loader.importLibrary("marker");

      const center = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 42.5, lng: 12.5 };

      const map = new Map(mapRef.current, {
        center,
        zoom: userLocation ? 12 : 6,
        mapId: "fermenta-homepage-map",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      setMapLoaded(true);
    } catch (err) {
      console.error("Failed to load Google Maps:", err);
      setMapError(true);
    }
  }, [userLocation]);

  useEffect(() => {
    if (isVisible) {
      initMap();
    }
  }, [isVisible, initMap]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setIsLocating(false);
        onLocate?.(loc);

        const map = mapInstanceRef.current;
        if (map) {
          map.panTo(loc);
          map.setZoom(12);
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocate]);

  const hasAutocenteredRef = useRef(false);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !userLocation) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
    }
    const el = document.createElement("div");
    el.style.cssText = `
      width: 20px; height: 20px; background: #4285F4; border: 3px solid white;
      border-radius: 50%; box-shadow: 0 0 0 6px rgba(66,133,244,0.25), 0 2px 4px rgba(0,0,0,0.3);
    `;
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstanceRef.current,
      position: { lat: userLocation.lat, lng: userLocation.lng },
      title: "La tua posizione",
      content: el,
      zIndex: 9999,
    });
    userMarkerRef.current = marker;

    if (!hasAutocenteredRef.current) {
      hasAutocenteredRef.current = true;
      mapInstanceRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      mapInstanceRef.current.setZoom(12);
    }
  }, [userLocation, mapLoaded]);

  const geoFilteredPubs = useMemo(() =>
    pubs.filter(p => p.latitude && p.longitude && !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))),
    [pubs]
  );
  const geoFilteredBreweries = useMemo(() =>
    breweries.filter(b => b.latitude && b.longitude && !isNaN(parseFloat(b.latitude!)) && !isNaN(parseFloat(b.longitude!))),
    [breweries]
  );

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current!;
    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    type MarkerItem = { type: 'pub'; data: MapPub } | { type: 'brewery'; data: MapBrewery };
    const allItems: MarkerItem[] = [
      ...geoFilteredPubs.map(p => ({ type: 'pub' as const, data: p })),
      ...geoFilteredBreweries.map(b => ({ type: 'brewery' as const, data: b })),
    ];

    allItems.forEach(item => {
      const lat = parseFloat(item.data.latitude!);
      const lng = parseFloat(item.data.longitude!);
      bounds.extend({ lat, lng });
      hasValidMarkers = true;
    });

    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
    }
    if (hasValidMarkers && !userLocation) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }

    const BATCH_SIZE = 20;
    let idx = 0;

    function addBatch() {
      const end = Math.min(idx + BATCH_SIZE, allItems.length);
      for (; idx < end; idx++) {
        const item = allItems[idx];
        const lat = parseFloat(item.data.latitude!);
        const lng = parseFloat(item.data.longitude!);
        const position = { lat, lng };
        const color = item.type === 'pub' ? PUB_COLOR : BREWERY_COLOR;

        const markerEl = createMarkerElement(color, item.data.logoUrl);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: item.data.name,
          content: markerEl,
        });

        if (item.type === 'pub') {
          const pub = item.data as MapPub;
          marker.addListener("click", () => {
            const logoHtml = pub.logoUrl
              ? `<img src="${pub.logoUrl}" alt="${pub.name}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;margin-right:8px;flex-shrink:0;" />`
              : `<div style="width:40px;height:40px;border-radius:8px;background:#3B82F6;display:flex;align-items:center;justify-content:center;margin-right:8px;flex-shrink:0;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`;
            infoWindow.setContent(`
              <div style="font-family:system-ui,sans-serif;max-width:220px;">
                <div style="display:flex;align-items:center;margin-bottom:6px;">
                  ${logoHtml}
                  <div>
                    <div style="font-weight:600;font-size:14px;color:#1F2937;">${pub.name}</div>
                    <div style="font-size:11px;color:#3B82F6;font-weight:500;">PUB</div>
                  </div>
                </div>
                ${pub.city ? `<div style="font-size:12px;color:#6B7280;margin-bottom:8px;">📍 ${pub.city}</div>` : ""}
                <a href="/pub/${pub.id}" style="display:inline-block;padding:4px 12px;background:#3B82F6;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;">Vai al pub →</a>
              </div>
            `);
            infoWindow.open(map, marker);
          });
        } else {
          const brewery = item.data as MapBrewery;
          marker.addListener("click", () => {
            const logoHtml = brewery.logoUrl
              ? `<img src="${brewery.logoUrl}" alt="${brewery.name}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;margin-right:8px;flex-shrink:0;" />`
              : `<div style="width:40px;height:40px;border-radius:8px;background:#F59E0B;display:flex;align-items:center;justify-content:center;margin-right:8px;flex-shrink:0;">🍺</div>`;
            infoWindow.setContent(`
              <div style="font-family:system-ui,sans-serif;max-width:220px;">
                <div style="display:flex;align-items:center;margin-bottom:6px;">
                  ${logoHtml}
                  <div>
                    <div style="font-weight:600;font-size:14px;color:#1F2937;">${brewery.name}</div>
                    <div style="font-size:11px;color:#F59E0B;font-weight:500;">BIRRIFICIO</div>
                  </div>
                </div>
                ${brewery.location ? `<div style="font-size:12px;color:#6B7280;margin-bottom:8px;">📍 ${brewery.location}${brewery.country ? `, ${brewery.country}` : ""}</div>` : ""}
                <a href="/brewery/${brewery.id}" style="display:inline-block;padding:4px 12px;background:#F59E0B;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;">Vai al birrificio →</a>
              </div>
            `);
            infoWindow.open(map, marker);
          });
        }

        markersRef.current.push(marker);
      }

      if (idx < allItems.length) {
        requestAnimationFrame(addBatch);
      }
    }

    if (allItems.length > 0) {
      requestAnimationFrame(addBatch);
    }
  }, [geoFilteredPubs, geoFilteredBreweries, mapLoaded, userLocation]);

  if (mapError) return null;

  const pubCount = pubs.filter(p => p.latitude && p.longitude).length;
  const breweryCount = breweries.filter(b => b.latitude && b.longitude).length;

  return (
    <section ref={sectionRef} className="mb-16 lg:mb-20">
      <div className="glass-card border-0 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Esplora sulla Mappa</h2>
              <p className="text-xs text-amber-100">
                {pubCount + breweryCount > 0 ? `${pubCount} pub e ${breweryCount} birrifici geolocalizzati` : "Caricamento..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50" style={{ background: PUB_COLOR }} />
              <span className="text-white text-xs font-medium">Pub</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50" style={{ background: BREWERY_COLOR }} />
              <span className="text-white text-xs font-medium">Birrifici</span>
            </div>
          </div>
        </div>

        <div className="relative">
          {(isLoading || !mapLoaded) && !mapError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Caricamento mappa...</span>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-[400px] md:h-[500px]" />

          {mapLoaded && (
            <button
              onClick={handleGeolocate}
              disabled={isLocating}
              className="absolute top-4 left-4 z-20 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 group disabled:opacity-70"
              title="Trova la mia posizione"
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              ) : (
                <LocateFixed className={`w-5 h-5 transition-colors ${userLocation ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500'}`} />
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
