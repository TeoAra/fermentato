import { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);

  // If no src provided or it's empty, show fallback immediately
  const shouldShowFallback = !src || imageError;

  if (shouldShowFallback) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 dark:bg-[#1B2735] ${containerClassName} ${iconClassName}`}>
        {getFallbackIcon(imageType, iconSize)}
      </div>
    );
  }

  // Ottimizza URL Cloudinary; per loghi piccoli (sm/md) niente srcset
  const optimized = cloudinaryUrl(src, width);
  const srcSet = noSrcSet ? "" : cloudinarySrcSet(src);

  return (
    <div className={containerClassName}>
      <img
        src={optimized}
        srcSet={srcSet || undefined}
        sizes={srcSet ? "(max-width: 640px) 50vw, 320px" : undefined}
        loading="lazy"
        decoding="async"
        alt={alt}
        className={className}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        style={{ display: imageError ? 'none' : 'block' }}
      />
      {isLoading && (
        <div className={`flex items-center justify-center bg-stone-100 dark:bg-[#1B2735] ${className}`}>
          <div className="animate-pulse">
            {getFallbackIcon(imageType, iconSize)}
          </div>
        </div>
      )}
    </div>
  );
}