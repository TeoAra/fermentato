import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, city?: string, region?: string, postalCode?: string) => void;
  placeholder?: string;
  className?: string;
  searchType?: 'address' | 'cities' | 'regions' | 'all';
}

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Inserisci l'indirizzo...",
  className,
  searchType = 'address'
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        const loader = new Loader({
          apiKey: "AIzaSyB3sdiFJqXOEQv7YHFj4Z2RDvGeQKX5FRA",
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();

        // Configure autocomplete - 'all' type allows searching everything
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
          componentRestrictions: { country: 'IT' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name']
        };
        
        // Only add types restriction if not 'all'
        if (searchType !== 'all') {
          const typesMap: Record<string, string[]> = {
            'address': ['address'],
            'cities': ['(cities)'],
            'regions': ['(regions)']
          };
          autocompleteOptions.types = typesMap[searchType];
        }
        
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, autocompleteOptions);

        autocompleteRef.current = autocomplete;

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (!place.address_components) {
            return;
          }

          let city = '';
          let region = '';
          let postalCode = '';
          
          // Extract address components
          place.address_components.forEach((component) => {
            const types = component.types;
            
            if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_2') && !city) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              region = component.long_name;
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name;
            }
          });

          const address = place.formatted_address || value;
          onChange(address, city, region, postalCode);
        });

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Errore nel caricamento dell\'autocompletamento indirizzi');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
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
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}