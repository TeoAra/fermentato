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
  const query = encodeURIComponent(`${name}, ${address}`);
  if (isIOS()) {
    return `maps://maps.apple.com/?q=${query}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}
