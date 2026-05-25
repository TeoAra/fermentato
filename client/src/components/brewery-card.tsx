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
        <div className="flex items-center gap-4 px-4 py-4 active:bg-stone-50/80 dark:active:bg-stone-800/20 cursor-pointer group transition-colors">

          {/* Logo */}
          <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden flex-shrink-0 bg-amber-50 dark:bg-[#1A1D24] ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm group-hover:shadow-md transition-shadow">
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
            <p className="font-bold text-[15px] leading-snug truncate text-stone-900 dark:text-stone-50 group-hover:text-primary transition-colors"
               style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {brewery.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {subtitle && (
                <span className="flex items-center gap-0.5 text-[11px] text-stone-400 dark:text-stone-500 truncate leading-none">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  {subtitle}
                </span>
              )}
              {distance != null && (
                <span className="flex-shrink-0 text-[11px] font-bold leading-none" style={{ color: "#0ea5e9" }}>
                  · {formatDist(distance)}
                </span>
              )}
            </div>
          </div>

          {/* Right: beer count or chevron */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {beerCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-[3px] rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30 leading-none">
                <Beer className="w-2.5 h-2.5" />
                {beerCount}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
          </div>
        </div>
      </Link>
      {!isLast && (
        <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, hsl(36,14%,90%) 15%, hsl(36,14%,90%) 85%, transparent)" }} />
      )}
    </div>
  );
}
