import { useEffect, useState, useCallback } from "react";
import { X, ZoomIn } from "lucide-react";

interface LightboxState {
  src: string;
  alt: string;
}

/**
 * Lightbox globale via event delegation.
 * Qualsiasi <img class="lightbox-img ..."> apre il lightbox al click.
 * Funziona anche su markup HTML statico (popup mappa, ecc.).
 */
export default function Lightbox() {
  const [state, setState] = useState<LightboxState | null>(null);

  const close = useCallback(() => setState(null), []);
  const open = useCallback((src: string, alt = "") => setState({ src, alt }), []);

  useEffect(() => {
    // Expose global opener for hero buttons
    (window as any).__lightboxOpen = open;
    return () => { delete (window as any).__lightboxOpen; };
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const img = target.closest("img.lightbox-img") as HTMLImageElement | null;
      if (!img) return;
      // Impedisce la navigazione se l'img è dentro un <a> o <Link>
      e.stopPropagation();
      e.preventDefault();
      setState({ src: img.src, alt: img.alt || "" });
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    // Fase capture → intercetta prima dei listener React (es. Link, card click)
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [close]);

  if (!state) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(10,6,2,0.88)", backdropFilter: "blur(10px)" }}
      onClick={close}
    >
      {/* Close button */}
      <button
        onClick={close}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        aria-label="Chiudi"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image container — click su immagine non chiude */}
      <div
        className="relative flex flex-col items-center gap-3 max-w-[90vw] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        style={{ animation: "lbIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <img
          src={state.src}
          alt={state.alt}
          className="max-w-full rounded-2xl shadow-2xl object-contain"
          style={{ maxHeight: "82vh" }}
        />
        {state.alt && (
          <p
            className="text-sm font-medium text-center px-4 max-w-xs"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {state.alt}
          </p>
        )}
      </div>

      <style>{`
        @keyframes lbIn {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * CSS classes da aggiungere alle <img> che devono aprire il lightbox:
 *   className="lightbox-img cursor-zoom-in"
 *
 * Per HTML statico (popup mappa):
 *   <img class="lightbox-img" style="cursor:zoom-in;" src="..." />
 */
export const LIGHTBOX_CLASS = "lightbox-img cursor-zoom-in";
