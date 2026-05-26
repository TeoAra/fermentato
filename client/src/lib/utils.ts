import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function getMapNavigationUrl(name: string, address: string): string {
  // Usiamo sempre l'URL universale https://www.google.com/maps/dir/?...
  // Funziona ovunque: su iOS apre Apple Maps via universal link (o il
  // browser se Apple Maps è stato rimosso), su Android apre Google Maps
  // o il browser, sul web apre direttamente Google Maps. Evita la
  // dialog "Nessuna app di navigazione installata" causata dallo
  // schema custom `maps://` non gestito.
  const query = encodeURIComponent(`${name}, ${address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}
