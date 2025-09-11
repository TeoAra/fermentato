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

export type ImageType = "beer" | "pub" | "brewery" | "user" | "food" | "bottle";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageType: ImageType;
  containerClassName?: string;
  iconSize?: "sm" | "md" | "lg" | "xl";
  iconClassName?: string;
}

const getFallbackIcon = (type: ImageType, iconSize: string) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-6 h-6",
    xl: "w-8 h-8"
  };

  const iconProps = {
    className: `${sizeClasses[iconSize as keyof typeof sizeClasses]} text-gray-400`
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
  iconClassName = ""
}: ImageWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If no src provided or it's empty, show fallback immediately
  const shouldShowFallback = !src || imageError;

  if (shouldShowFallback) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${containerClassName} ${iconClassName}`}>
        {getFallbackIcon(imageType, iconSize)}
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
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
        <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
          <div className="animate-pulse">
            {getFallbackIcon(imageType, iconSize)}
          </div>
        </div>
      )}
    </div>
  );
}