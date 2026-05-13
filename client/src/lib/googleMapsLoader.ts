import { Loader, setOptions, importLibrary } from "@googlemaps/js-api-loader";

let _loader: Loader | null = null;
let _optionsSet = false;

function ensureOptions() {
  if (_optionsSet) return;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  setOptions({ key: apiKey, v: "weekly" });
  _optionsSet = true;
}

export function getGoogleMapsLoader(): Loader {
  if (!_loader) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    _loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });
  }
  return _loader;
}

export async function loadGoogleMapsLibrary<T extends "places" | "marker" | "core" | "maps" | "geocoding">(
  name: T
): Promise<unknown> {
  ensureOptions();
  return importLibrary(name);
}
