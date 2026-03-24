import { useEffect, useRef, useState, useMemo } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PUB_COLOR = "#3B82F6";
const BREWERY_COLOR = "#F59E0B";

function createDivIcon(color: string, logoUrl?: string | null): L.DivIcon {
  const emoji = color === PUB_COLOR ? "🍻" : "🍺";
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='block';" /><span style="display:none;font-size:14px;">${emoji}</span>`
    : `<span style="font-size:14px;">${emoji}</span>`;
  const html = `
    <div style="
      width:40px;height:48px;position:relative;cursor:pointer;
    ">
      <div style="
        width:40px;height:40px;background:${color};border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);border:3px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);position:absolute;top:0;left:0;
      "></div>
      <div style="
        width:28px;height:28px;border-radius:50%;background:white;
        position:absolute;top:3px;left:6px;overflow:hidden;
        display:flex;align-items:center;justify-content:center;
      ">${logoHtml}</div>
      <div style="
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:7px solid ${color};position:absolute;bottom:0;left:15px;
      "></div>
    </div>
  `;
  return L.divIcon({ html, iconSize: [40, 48], iconAnchor: [20, 48], popupAnchor: [0, -52], className: "" });
}


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


function MapController({ userLocation, hasData }: { userLocation?: { lat: number; lng: number } | null; hasData: boolean }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (userLocation && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (!userLocation && !hasCenteredRef.current && hasData) {
      // Fit to Italy if no user location
      map.setView([42.5, 12.5], 6);
    }
  }, [hasData, userLocation, map]);

  return null;
}

export default function HomepageMap({ pubs, breweries, userLocation, isLoading }: HomepageMapProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  const geoFilteredPubs = useMemo(() =>
    pubs.filter(p => p.latitude && p.longitude && !isNaN(parseFloat(p.latitude)) && !isNaN(parseFloat(p.longitude))),
    [pubs]
  );
  const geoFilteredBreweries = useMemo(() =>
    breweries.filter(b => b.latitude && b.longitude && !isNaN(parseFloat(b.latitude!)) && !isNaN(parseFloat(b.longitude!))),
    [breweries]
  );

  const pubCount = geoFilteredPubs.length;
  const breweryCount = geoFilteredBreweries.length;
  const hasData = pubCount + breweryCount > 0;

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [42.5, 12.5];
  const zoom = userLocation ? 12 : 6;

  return (
    <section ref={sectionRef} className="mb-16 lg:mb-20">
      <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Esplora sulla Mappa</h2>
              <p className="text-xs text-amber-100">
                {isLoading ? "Caricamento..." : `${pubCount} pub e ${breweryCount} birrifici geolocalizzati`}
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
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Caricamento mappa...</span>
              </div>
            </div>
          )}

          {!isVisible && (
            <div className="w-full h-[400px] md:h-[500px] bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 opacity-60" />
            </div>
          )}

          {isVisible && (
            <div className="w-full h-[400px] md:h-[500px]" style={{ background: "#e8e4dc" }}>
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ width: "100%", height: "100%", background: "#e8e4dc" }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapController userLocation={userLocation} hasData={hasData} />

              {geoFilteredPubs.map((pub) => (
                <Marker
                  key={`pub-${pub.id}`}
                  position={[parseFloat(pub.latitude!), parseFloat(pub.longitude!)]}
                  icon={createDivIcon(PUB_COLOR, pub.logoUrl)}
                >
                  <Popup>
                    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        {pub.logoUrl && (
                          <img src={pub.logoUrl} alt={pub.name} style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#1F2937" }}>{pub.name}</div>
                          <div style={{ fontSize: "11px", color: PUB_COLOR, fontWeight: 500 }}>PUB</div>
                        </div>
                      </div>
                      {pub.city && <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>📍 {pub.city}</div>}
                      <a href={`/pub/${pub.slug || pub.id}`} style={{ display: "inline-block", padding: "4px 12px", background: PUB_COLOR, color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>
                        Vai al pub →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {geoFilteredBreweries.map((brewery) => (
                <Marker
                  key={`brewery-${brewery.id}`}
                  position={[parseFloat(brewery.latitude!), parseFloat(brewery.longitude!)]}
                  icon={createDivIcon(BREWERY_COLOR, brewery.logoUrl)}
                >
                  <Popup>
                    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        {brewery.logoUrl && (
                          <img src={brewery.logoUrl} alt={brewery.name} style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#1F2937" }}>{brewery.name}</div>
                          <div style={{ fontSize: "11px", color: BREWERY_COLOR, fontWeight: 500 }}>BIRRIFICIO</div>
                        </div>
                      </div>
                      {brewery.location && <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>📍 {brewery.location}{brewery.country ? `, ${brewery.country}` : ""}</div>}
                      <a href={`/brewery/${brewery.id}`} style={{ display: "inline-block", padding: "4px 12px", background: BREWERY_COLOR, color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: 500 }}>
                        Vai al birrificio →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}

            </MapContainer>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
