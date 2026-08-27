import { useEffect, useState } from "react";
import { 
  Wine, 
  Building2, 
  Factory, 
  User, 
  Utensils, 
  Store,
  UserCircle
} from "lucide-react";
import { cloudinaryUrl, cloudinarySrcSet } from "@/lib/cloudinary";

export type ImageType = "beer" | "pub" | "brewery" | "user" | "food" | "bottle";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageType: ImageType;
  containerClassName?: string;
  iconSize?: "sm" | "md" | "lg" | "xl";
  iconClassName?: string;
  /** Larghezza target in px per la trasformazione Cloudinary (default 320). */
  width?: number;
  /** Disabilita srcset (utile per loghi piccoli sempre uguali). */
  noSrcSet?: boolean;
}

const getFallbackIcon = (type: ImageType, iconSize: string) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  };

  const iconProps = {
    className: `${sizeClasses[iconSize as keyof typeof sizeClasses]} text-stone-400`
  };

  switch (type) {
    case "beer":
      return <Wine {...iconProps} />;
    case "bottle":
      return <Wine {...iconProps} />;
    case "pub":
      return <Store {...iconProps} />;
    case "brewery":
      return <Factory {...iconProps} />;
    case "user":
      return <UserCircle {...iconProps} />;
    case "food":
      return <Utensils {...iconProps} />;
    default:
      return <Wine {...iconProps} />;
  }
};

export default function ImageWithFallback({
  src,
  alt,
  className = "",
  imageType,
  containerClassName = "",
  iconSize = "lg",
  iconClassName = "",
  width = 320,
  noSrcSet = false,
}: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(src));

  // A component instance can be reused for a different record. Resetting here
  // prevents a previous broken image from hiding the replacement source.
  useEffect(() => {
    setImageError(false);
    setIsLoading(Boolean(src));
  }, [src]);

  // If no src provided or it's empty, show fallback immediately
  const shouldShowFallback = !src || imageError;

  // Ottimizza URL Cloudinary; per loghi piccoli (sm/md) niente srcset
  const optimized = src ? cloudinaryUrl(src, width) : "";
  const srcSet = src && !noSrcSet ? cloudinarySrcSet(src) : "";

  return (
    <div className={`relative overflow-hidden ${containerClassName} ${className}`}>
      {!shouldShowFallback && (
        <img
          src={optimized}
          srcSet={srcSet || undefined}
          sizes={srcSet ? "(max-width: 640px) 50vw, 320px" : undefined}
          loading="lazy"
          decoding="async"
          alt={alt}
          className={`absolute inset-0 h-full w-full ${className}`}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
        />
      )}
      {(shouldShowFallback || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-[#1A1D24]" aria-hidden={isLoading ? true : undefined}>
          <div className="animate-pulse">
            <span className={iconClassName}>{getFallbackIcon(imageType, iconSize)}</span>
          </div>
        </div>
      )}
    </div>
  );
}