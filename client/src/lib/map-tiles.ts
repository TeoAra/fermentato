// Tile provider unificato per tutte le mappe embedded in app.
// CARTO Positron / Dark Matter — chiaro, leggero, coerente con
// l'estetica del progetto. Usato da homepage-map, pub OverviewSection,
// route-card e qualsiasi altra mini-mappa.
export const cartoPositronProvider = (
  x: number,
  y: number,
  z: number,
  dpr?: number,
) => {
  const s = "abcd"[Math.abs(x + y) % 4];
  const retina = dpr && dpr >= 2 ? "@2x" : "";
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const style = dark ? "dark_all" : "light_all";
  return `https://${s}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}${retina}.png`;
};
