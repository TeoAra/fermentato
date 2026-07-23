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

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

export function AddressAutocomplete({
  value = "",
  onAddressSelect,
  placeholder = "Cerca indirizzo...",
  disabled = false,
  className = "",
  countryRestriction = null,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onAddressSelect);
  useEffect(() => { onSelectRef.current = onAddressSelect; });

  useEffect(() => { setInputValue(value); }, [value]);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "6",
        "accept-language": "it",
      });
      if (countryRestriction) params.set("countrycodes", countryRestriction.toLowerCase());

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "User-Agent": "Fermentato/1.0 (fermenta.to)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return;
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryRestriction]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const city = result.address.city ?? result.address.town ?? result.address.village ?? result.address.municipality ?? "";
    const region = result.address.state ?? "";
    const country = result.address.country ?? "";
    const postalCode = result.address.postcode ?? "";
    const route = result.address.road ?? "";
    const streetNumber = result.address.house_number ?? "";
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const formattedAddress = result.display_name;

    setInputValue(formattedAddress.split(",").slice(0, 3).join(",").trim());
    setIsOpen(false);
    setSuggestions([]);

    onSelectRef.current({
      formattedAddress,
      city,
      region,
      country,
      placeId: String(result.place_id),
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
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-stone-200 dark:border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => {
            const city = s.address.city ?? s.address.town ?? s.address.village ?? "";
            const region = s.address.state ?? "";
            const parts = s.display_name.split(",");
            const main = parts[0].trim();
            const sub = [city, region].filter(Boolean).join(", ");
            return (
              <li
                key={i}
                className="px-3 py-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/40 text-sm border-b border-stone-100 dark:border-border last:border-0"
                onMouseDown={() => handleSelect(s)}
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
