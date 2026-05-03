// Helper per ottimizzare URL Cloudinary inserendo trasformazioni f_auto/q_auto/w_<size>.
// Funziona solo se l'URL è già un upload Cloudinary; altrimenti restituisce l'URL invariato.
//
// Esempi:
//   cloudinaryUrl("https://res.cloudinary.com/abc/image/upload/v123/foo.jpg", 320)
//     → "https://res.cloudinary.com/abc/image/upload/f_auto,q_auto,w_320/v123/foo.jpg"
//   cloudinaryUrl("https://other.com/img.png", 320)  → invariato

const CLOUDINARY_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i;

export function cloudinaryUrl(src: string | null | undefined, width?: number): string {
  if (!src) return "";
  if (!CLOUDINARY_RE.test(src)) return src;

  // Se contiene già f_auto o q_auto, non rimpiazzare
  if (/\/(f_auto|q_auto|w_\d+)/i.test(src)) return src;

  const transforms: string[] = ["f_auto", "q_auto"];
  if (width && Number.isFinite(width)) transforms.push(`w_${Math.round(width)}`);

  return src.replace(/\/upload\//i, `/upload/${transforms.join(",")}/`);
}

// Genera srcset per immagini responsive Cloudinary.
// Ritorna stringa pronta per attributo srcset.
export function cloudinarySrcSet(src: string | null | undefined, widths: number[] = [160, 320, 640, 960]): string {
  if (!src || !CLOUDINARY_RE.test(src)) return "";
  return widths.map(w => `${cloudinaryUrl(src, w)} ${w}w`).join(", ");
}
