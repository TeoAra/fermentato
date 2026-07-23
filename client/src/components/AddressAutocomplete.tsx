import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressDetails {
  formattedAddress: string;
  city: string;
  region: string;
  country: string;
  placeId: string;
  lat?: number;
  lng?: number;
  postalCode?: string;
  streetNumber?: string;
  route?: string;
}

interface AddressAutocompleteProps {
  value?: string;
  onAddressSelect: (details: AddressDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  countryRestriction?: string | null;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
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

export function AddressAutocomplete({
  value = "",
  onAddressSelect,
  placeholder = "Cerca il nome del locale o l'indirizzo…",
  disabled = false,
  className = "",
  countryRestriction = null,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onAddressSelect);
  useEffect(() => { onSelectRef.current = onAddressSelect; });

  useEffect(() => { setInputValue(value); }, [value]);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      // Photon (komoot) — OpenStreetMap POI + address search, free, no key needed
      const params = new URLSearchParams({
        q: query,
        limit: "7",
        lang: "it",
      });
      if (countryRestriction?.toUpperCase() === 'IT') {
        params.set("lat", "42.5");
        params.set("lon", "12.5");
        params.set("location_bias_scale", "0.5");
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
  }, [countryRestriction]);

  const formatLabel = (f: PhotonFeature): string => {
    const p = f.properties;
    const parts = [
      p.name,
      p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street,
      p.city ?? p.town ?? p.village,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const handleSelect = (f: PhotonFeature) => {
    const p = f.properties;
    const city = p.city ?? p.town ?? p.village ?? "";
    const region = p.state ?? "";
    const country = p.country ?? "";
    const postalCode = p.postcode ?? "";
    const route = p.street ?? "";
    const streetNumber = p.housenumber ?? "";
    const [lng, lat] = f.geometry.coordinates;
    const formattedAddress = formatLabel(f);

    setInputValue(formattedAddress);
    setIsOpen(false);
    setSuggestions([]);

    onSelectRef.current({
      formattedAddress,
      city,
      region,
      country,
      placeId: String(f.properties.osm_id ?? ""),
      lat: isNaN(lat) ? undefined : lat,
      lng: isNaN(lng) ? undefined : lng,
      postalCode,
      streetNumber,
      route,
    });
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
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
          autoComplete="off"
          data-testid="input-address-autocomplete"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
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
