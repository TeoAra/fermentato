import { Loader } from "@googlemaps/js-api-loader";

let _loader: Loader | null = null;

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
