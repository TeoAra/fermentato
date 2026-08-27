// Tile provider unificato per tutte le mappe embedded nell'app.
// OpenStreetMap non richiede API key e non mostra watermark commerciali.
export const osmTileProvider = (
  x: number,
  y: number,
  z: number,
) => {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
};
