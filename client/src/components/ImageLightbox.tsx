import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "", onClose }: ImageLightboxProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image */}
        <motion.img
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          src={src}
          alt={alt}
          onClick={e => e.stopPropagation()}
          className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl select-none"
          draggable={false}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Wraps any image with a tap-to-zoom behaviour.
 * Usage: <ZoomableImage src={url} className="..." alt="..." />
 */
interface ZoomableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  lightboxSrc?: string; // full-res URL, falls back to src
}

import { useState } from "react";

export function ZoomableImage({ src, alt = "", lightboxSrc, className, ...props }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative group cursor-zoom-in" onClick={() => setOpen(true)}>
        <img src={src} alt={alt} className={className} {...props} />
        <span className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
          <ZoomIn className="w-3.5 h-3.5" />
        </span>
      </div>
      {open && (
        <ImageLightbox src={lightboxSrc ?? src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
