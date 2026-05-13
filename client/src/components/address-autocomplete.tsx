import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibrary } from "@/lib/googleMapsLoader";
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

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Inserisci l'indirizzo...",
  className,
  searchType = 'address',
  countryRestriction = 'IT',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        await loadGoogleMapsLibrary("places");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google;
        if (!g?.maps?.places?.Autocomplete) {
          setError("Google Places non disponibile");
          setIsLoading(false);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const autocompleteOptions: any = {
          ...(countryRestriction ? { componentRestrictions: { country: countryRestriction } } : {}),
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        };

        if (searchType !== 'all') {
          const typesMap: Record<string, string[]> = {
            address: ['address'],
            cities: ['(cities)'],
            regions: ['(regions)'],
          };
          autocompleteOptions.types = typesMap[searchType];
        }

        const autocomplete = new g.maps.places.Autocomplete(inputRef.current, autocompleteOptions);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.address_components && !place.name) return;

          let city = '';
          let region = '';
          let postalCode = '';

          if (place.address_components) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            place.address_components.forEach((component: any) => {
              const types: string[] = component.types;
              if (types.includes('locality')) city = component.long_name;
              else if (types.includes('administrative_area_level_1')) region = component.long_name;
              else if (types.includes('postal_code')) postalCode = component.long_name;
            });
          }

          const placeName: string = place.name || '';
          const formattedAddress: string = place.formatted_address || value;

          let finalAddress = formattedAddress;
          if (placeName && searchType === 'all' && city) finalAddress = `${placeName}, ${city}`;
          else if (placeName && searchType === 'all') finalAddress = placeName;

          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          onChange(finalAddress, city, region, postalCode, lat, lng);
        });
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError("Errore nel caricamento dell'autocompletamento indirizzi");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (autocompleteRef.current && g?.maps?.event) {
        g.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={isLoading ? "Caricamento..." : placeholder}
          className={`pl-10 ${className}`}
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
