import { MapPin, Beer, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import ImageWithFallback from "@/components/image-with-fallback";

interface BreweryCardProps {
  brewery: {
    id: number;
    name: string | any;
    location?: string | any;
    region?: string | any;
    rating?: string | number | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    country?: string | null;
    slug?: string | null;
  };
  beerCount?: number;
  distance?: number | null;
  isLast?: boolean;
}

export default function BreweryCard({ brewery, beerCount = 0, distance, isLast }: BreweryCardProps) {
  const formatDist = (d: number) =>
    d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;

  const subtitle = [
    brewery.location || brewery.region,
    brewery.country && brewery.country !== 'Italy' && brewery.country !== 'Italia' ? brewery.country : null,
  ].filter(Boolean).join(', ');

  return (
    <div>
      <Link href={`/brewery/${brewery.slug || brewery.id}`}>
        <div className="flex items-center gap-3.5 px-4 py-3.5 active:bg-stone-50 dark:active:bg-stone-800/30 cursor-pointer transition-colors group">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
            <ImageWithFallback
              src={brewery.logoUrl || brewery.coverImageUrl}
              alt={String(brewery.name)}
              imageType="brewery"
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              iconSize="sm"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-stone-900 dark:text-white leading-snug truncate group-hover:text-primary transition-colors">
              {brewery.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {subtitle && (
                <span className="text-xs text-stone-400 dark:text-stone-500 truncate flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  {subtitle}
                </span>
              )}
              {distance != null && (
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                  · {formatDist(distance)}
                </span>
              )}
              {beerCount > 0 && (
                <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-0.5 flex-shrink-0">
                  · <Beer className="w-2.5 h-2.5" /> {beerCount}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 flex-shrink-0" />
        </div>
      </Link>
      {!isLast && (
        <div className="h-px bg-stone-100 dark:bg-stone-800/60 ml-[3.875rem] mr-4" />
      )}
    </div>
  );
}
