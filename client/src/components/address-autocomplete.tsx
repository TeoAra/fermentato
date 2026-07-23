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

interface NominatimResult {
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
    country_code?: string;
  };
  lat: string;
  lon: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Inserisci l'indirizzo...",
  className,
  searchType = 'address',
  countryRestriction = 'IT',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchNominatim = useCallback(async (query: string) => {
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
      if (searchType === 'cities') params.set("featuretype", "city");
      if (searchType === 'regions') params.set("featuretype", "state");

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
  }, [countryRestriction, searchType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(v), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const city = result.address.city ?? result.address.town ?? result.address.village ?? result.address.municipality ?? "";
    const region = result.address.state ?? "";
    const postalCode = result.address.postcode ?? "";
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name.split(",").slice(0, 3).join(",").trim();
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
