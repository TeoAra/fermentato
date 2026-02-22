/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MapPin, Loader2 } from "lucide-react";

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
}

const PUB_COLOR = "#3B82F6";
const BREWERY_COLOR = "#F59E0B";

function createMarkerSvg(color: string, logoUrl?: string | null): string {
  const markerSize = 40;
  const pinPath = `M20,2 C11.16,2 4,9.16 4,18 C4,29 20,40 20,40 C20,40 36,29 36,18 C36,9.16 28.84,2 20,2 Z`;

  if (logoUrl) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${markerSize}" height="${markerSize + 5}" viewBox="0 0 40 45">
        <defs>
          <clipPath id="circle-clip">
            <circle cx="20" cy="17" r="10"/>
          </clipPath>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>
        <path d="${pinPath}" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>
        <circle cx="20" cy="17" r="11" fill="white"/>
        <image href="${logoUrl}" x="10" y="7" width="20" height="20" clip-path="url(#circle-clip)" preserveAspectRatio="xMidYMid slice"/>
      </svg>
    `;
  }

  const icon = color === PUB_COLOR
    ? `<rect x="14" y="12" width="12" height="10" rx="1" fill="white" opacity="0.9"/><rect x="15" y="13" width="10" height="8" rx="0.5" fill="${color}" opacity="0.3"/><line x1="17" y1="15" x2="17" y2="19" stroke="white" stroke-width="1.5"/><line x1="20" y1="14" x2="20" y2="20" stroke="white" stroke-width="1.5"/><line x1="23" y1="15" x2="23" y2="19" stroke="white" stroke-width="1.5"/>`
    : `<circle cx="20" cy="17" r="7" fill="white" opacity="0.9"/><text x="20" y="21" text-anchor="middle" font-size="12" fill="${color}">🍺</text>`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${markerSize}" height="${markerSize + 5}" viewBox="0 0 40 45">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="${pinPath}" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>
      ${icon}
    </svg>
  `;
}

export default function HomepageMap({ pubs, breweries, userLocation, isLoading }: HomepageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError(true);
      return;
    }

    try {
      const loader = new Loader({
        apiKey,
        version: "weekly",
        libraries: ["marker"],
      });

      const { Map } = await loader.importLibrary("maps");
      await loader.importLibrary("marker");

      const center = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 42.5, lng: 12.5 };

      const map = new Map(mapRef.current, {
        center,
        zoom: userLocation ? 10 : 6,
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
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current!;
    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    const geoFilteredPubs = pubs.filter(
      (p) => p.latitude && p.longitude && !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))
    );
    const geoFilteredBreweries = breweries.filter(
      (b) => b.latitude && b.longitude && !isNaN(parseFloat(b.latitude!)) && !isNaN(parseFloat(b.longitude!))
    );

    geoFilteredPubs.forEach((pub) => {
      const lat = parseFloat(pub.latitude!);
      const lng = parseFloat(pub.longitude!);
      const position = { lat, lng };

      const svgString = createMarkerSvg(PUB_COLOR, pub.logoUrl);
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: pub.name,
        content: svgElement,
      });

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

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidMarkers = true;
    });

    geoFilteredBreweries.forEach((brewery) => {
      const lat = parseFloat(brewery.latitude!);
      const lng = parseFloat(brewery.longitude!);
      const position = { lat, lng };

      const svgString = createMarkerSvg(BREWERY_COLOR, brewery.logoUrl);
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: brewery.name,
        content: svgElement,
      });

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

      markersRef.current.push(marker);
      bounds.extend(position);
      hasValidMarkers = true;
    });

    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
    }

    if (hasValidMarkers && !userLocation) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [pubs, breweries, mapLoaded, userLocation]);

  if (mapError) return null;

  return (
    <section className="mb-16 lg:mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mr-3">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          Mappa
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: PUB_COLOR }} />
            <span className="text-gray-600 dark:text-gray-400">Pub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: BREWERY_COLOR }} />
            <span className="text-gray-600 dark:text-gray-400">Birrifici</span>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
        {(isLoading || !mapLoaded) && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Caricamento mappa...</span>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-[400px] md:h-[500px]" />
      </div>
    </section>
  );
}
