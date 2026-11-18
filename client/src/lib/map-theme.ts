import type maplibregl from "maplibre-gl";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const MAP_MARKER_SIZE = 22;
export const MAP_MARKER_COLORS = {
  pub: "#F59E0B",
  brewery: "#0F766E",
  event: "#7C3AED",
  origin: "#D97706",
} as const;

/** One solid, unadorned pin silhouette shared by every venue map. */
export const MAP_MARKER_PATH = "M12 22s8-7.16 8-13A8 8 0 1 0 4 9c0 5.84 8 13 8 13Z";

/** Apply Fermenta's warm paper palette while retaining provider-authored labels. */
export function applyMapTheme(map: maplibregl.Map): void {
  try {
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#fff7ea");
      }
      if (layer.type === "fill" && /park|landcover|wood|grass/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "fill-color", "#e9efdf");
      }
      if (layer.type === "fill" && /water/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "fill-color", "#e3edf0");
      }
    }
  } catch {
    // Provider style changes should never prevent map use.
  }
}

export function createMapMarkerElement(kind: "pub" | "brewery" | "event" | "origin"): HTMLElement {
  const root = document.createElement("div");
  root.className = `fermenta-map-marker fermenta-map-marker--${kind}`;
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = [
    `width:${MAP_MARKER_SIZE}px`,
    `height:${MAP_MARKER_SIZE}px`,
    "display:grid",
    "place-items:center",
    "box-sizing:border-box",
    "background:transparent",
    "color:inherit",
    kind === "origin" ? "border-radius:50%" : "filter:drop-shadow(0 1px 2px rgba(54,44,28,.26))",
  ].join(";");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const size = kind === "origin" ? 18 : MAP_MARKER_SIZE;
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  if (kind === "origin") {
    svg.setAttribute("fill", MAP_MARKER_COLORS.origin);
    svg.innerHTML = '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" fill="#fff7ea"/>';
    root.style.cssText += ";width:18px;height:18px;background:#fff7ea;border:2px solid #fff7ea;box-shadow:0 1px 5px rgba(86,63,27,.32)";
  } else {
    svg.setAttribute("fill", MAP_MARKER_COLORS[kind]);
    svg.innerHTML = `<path d="${MAP_MARKER_PATH}"/>`;
  }
  root.appendChild(svg);
  return root;
}

/** Rasterize the very same venue artwork for GPU-rendered clustered maps. */
export function addMapMarkerImages(map: maplibregl.Map): void {
  for (const kind of ["pub", "brewery", "event"] as const) {
    const id = `fermenta-${kind}`;
    if (map.hasImage(id)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.scale(64 / 24, 64 / 24);
    const path = new Path2D(MAP_MARKER_PATH);
    context.fillStyle = MAP_MARKER_COLORS[kind];
    context.shadowColor = "rgba(54,44,28,.26)";
    context.shadowBlur = 2;
    context.shadowOffsetY = 1;
    context.fill(path);
    const image = context.getImageData(0, 0, 64, 64);
    map.addImage(id, { width: 64, height: 64, data: image.data }, { pixelRatio: 64 / MAP_MARKER_SIZE });
  }
}
