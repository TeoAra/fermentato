import { useEffect, useRef, useState } from "react";
import { getGoogleMapsLoader } from "@/lib/googleMapsLoader";
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

export function AddressAutocomplete({
  value = "",
  onAddressSelect,
  placeholder = "Cerca indirizzo...",
  disabled = false,
  className = "",
  countryRestriction = null,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null);
  // Keep callback in a ref so it's always current without being a dep
  const onAddressSelectRef = useRef(onAddressSelect);
  useEffect(() => { onAddressSelectRef.current = onAddressSelect; });

  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Chiave API Google Maps non configurata");
      setIsLoading(false);
      return;
    }

    const loader = getGoogleMapsLoader();

    loader
      .importLibrary("places")
      .then(() => {
        if (!inputRef.current) return;

        // @ts-expect-error - google is loaded dynamically by Loader
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ["establishment", "geocode"],
            ...(countryRestriction ? { componentRestrictions: { country: countryRestriction } } : {}),
            fields: ["formatted_address", "address_components", "place_id", "name", "geometry"],
          }
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place || !place.address_components) return;

          let city = "";
          let region = "";
          let country = "";
          let postalCode = "";
          let streetNumber = "";
          let route = "";

          for (const component of place.address_components) {
            if (component.types.includes("locality")) {
              city = component.long_name;
            }
            if (component.types.includes("administrative_area_level_1")) {
              region = component.long_name;
            }
            if (!city && component.types.includes("administrative_area_level_3")) {
              city = component.long_name;
            }
            if (!city && component.types.includes("administrative_area_level_2")) {
              city = component.long_name;
            }
            if (component.types.includes("country")) {
              country = component.long_name;
            }
            if (component.types.includes("postal_code")) {
              postalCode = component.long_name;
            }
            if (component.types.includes("street_number")) {
              streetNumber = component.long_name;
            }
            if (component.types.includes("route")) {
              route = component.long_name;
            }
          }

          const formattedAddress = place.formatted_address || "";
          setInputValue(formattedAddress);

          const lat = place.geometry?.location?.lat?.();
          const lng = place.geometry?.location?.lng?.();

          onAddressSelectRef.current({
            formattedAddress,
            city: city || "",
            region: region || "",
            country: country || "",
            placeId: place.place_id || "",
            lat: typeof lat === "number" ? lat : undefined,
            lng: typeof lng === "number" ? lng : undefined,
            postalCode,
            streetNumber,
            route,
          });
        });

        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Errore caricamento Google Places:", err);
        setError("Errore caricamento autocompletamento");
        setIsLoading(false);
      });

    return () => {
      if (autocompleteRef.current && typeof window !== 'undefined' && (window as any).google) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [countryRestriction]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -tranneutral-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-10 pr-10"
          data-testid="input-address-autocomplete"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -tranneutral-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
