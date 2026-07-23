import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, city?: string, region?: string, postalCode?: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  searchType?: 'address' | 'cities' | 'regions' | 'all';
  countryRestriction?: string | null;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
    country?: string;
    country_code?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Inserisci il nome del locale o l'indirizzo…",
  className,
  searchType = 'address',
  countryRestriction = 'IT',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      // Photon (komoot) — OpenStreetMap POI + address search, free, no key
      const params = new URLSearchParams({
        q: query,
        limit: "7",
        lang: "it",
      });
      // Italy bounding box bias (not hard filter, still works for other countries)
      if (countryRestriction?.toUpperCase() === 'IT') {
        params.set("lat", "42.5");
        params.set("lon", "12.5");
        params.set("location_bias_scale", "0.5");
      }
      if (searchType === 'cities' || searchType === 'regions') {
        params.set("osm_tag", "place:city");
      }

      const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
        headers: { "User-Agent": "Fermentato/1.0 (fermenta.to)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return;
      const data: { features: PhotonFeature[] } = await res.json();
      const features = (data.features ?? []).filter(f => {
        if (!countryRestriction) return true;
        const cc = f.properties.country_code?.toUpperCase();
        return !cc || cc === countryRestriction.toUpperCase();
      });
      setSuggestions(features);
      setIsOpen(features.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryRestriction, searchType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const formatLabel = (f: PhotonFeature): string => {
    const p = f.properties;
    const parts = [
      p.name,
      p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street,
      p.city ?? p.town ?? p.village,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handleSelect = (f: PhotonFeature) => {
    const p = f.properties;
    const city = p.city ?? p.town ?? p.village ?? "";
    const region = p.state ?? "";
    const postalCode = p.postcode ?? "";
    const [lng, lat] = f.geometry.coordinates;
    const label = formatLabel(f);
    onChange(label, city, region, postalCode, lat, lng);
    setIsOpen(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={isLoading ? "Cerco…" : placeholder}
          className={`pl-10 ${className}`}
          autoComplete="off"
        />
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-stone-200 dark:border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((f, i) => {
            const p = f.properties;
            const name = p.name ?? "";
            const sub = [p.city ?? p.town ?? p.village, p.state].filter(Boolean).join(", ");
            const main = name || formatLabel(f);
            return (
              <li
                key={i}
                className="px-3 py-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/40 text-sm border-b border-stone-100 dark:border-border last:border-0"
                onMouseDown={() => handleSelect(f)}
              >
                <div className="font-medium text-foreground truncate">{main}</div>
                {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
