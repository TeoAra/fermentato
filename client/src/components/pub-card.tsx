import { MapPin, ChevronRight, Beer } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ImageWithFallback from "@/components/image-with-fallback";

function isOpenNow(openingHours: any) {
  if (!openingHours) return null;
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayHours = openingHours[currentDay];
  if (!todayHours || todayHours.isClosed) return false;
  if (todayHours.open && todayHours.close) {
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    if (closeTime < openTime) return currentTime >= openTime || currentTime <= closeTime;
    return currentTime >= openTime && currentTime <= closeTime;
  }
  return null;
}

interface PubCardProps {
  pub: {
    id: number;
    name: string;
    address?: string;
    city?: string;
    rating?: string | null;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    isActive?: boolean;
    openingHours?: any;
    slug?: string;
  };
  distance?: number | null;
  isLast?: boolean;
}

export default function PubCard({ pub, distance, isLast }: PubCardProps) {
  const { data: tapList } = useQuery({
    queryKey: ["/api/pubs", pub.id, "taplist"],
    staleTime: 60000,
  });

  const beersOnTap = Array.isArray(tapList) ? tapList.filter((item: any) => item.isActive).length : 0;
  const open = isOpenNow(pub.openingHours);

  const formatDist = (d: number) =>
    d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;

  return (
    <div>
      <Link href={`/pub/${pub.slug || pub.id}`}>
        <div className="flex items-center gap-3.5 px-4 py-3.5 active:bg-stone-50 dark:active:bg-stone-800/30 cursor-pointer transition-colors group">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
            <ImageWithFallback
              src={pub.logoUrl || pub.coverImageUrl}
              alt={pub.name}
              imageType="pub"
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              iconSize="sm"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-stone-900 dark:text-white leading-snug truncate group-hover:text-primary transition-colors">
              {pub.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-stone-400 dark:text-stone-500 truncate flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                {pub.city || pub.address}
              </span>
              {distance != null && (
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                  · {formatDist(distance)}
                </span>
              )}
              {beersOnTap > 0 && (
                <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-0.5 flex-shrink-0">
                  · <Beer className="w-2.5 h-2.5" /> {beersOnTap}
                </span>
              )}
            </div>
          </div>

          {/* Status + chevron */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {open !== null && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                open
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
              }`}>
                {open ? 'Aperto' : 'Chiuso'}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
          </div>
        </div>
      </Link>
      {!isLast && (
        <div className="h-px bg-stone-100 dark:bg-stone-800/60 ml-[3.875rem] mr-4" />
      )}
    </div>
  );
}
