import { MapPin, Beer } from "lucide-react";
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
        <div className="flex items-center gap-4 px-4 py-4 active:bg-stone-50/80 dark:active:bg-stone-800/20 cursor-pointer group transition-colors">

          {/* Logo */}
          <div className="relative flex-shrink-0">
            <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden bg-muted ring-1 ring-border shadow-card-sm group-hover:shadow-card transition-shadow">
              <ImageWithFallback
                src={pub.logoUrl || pub.coverImageUrl}
                alt={pub.name}
                imageType="pub"
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                iconSize="sm"
              />
            </div>
            {/* Live dot */}
            {open === true && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 shadow-sm" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] leading-snug truncate text-foreground group-hover:text-primary transition-colors"
               style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {pub.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {(pub.city || pub.address) && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground truncate leading-none">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  {pub.city || pub.address}
                </span>
              )}
              {distance != null && (
                <span className="flex-shrink-0 text-xs font-bold leading-none text-primary">
                  · {formatDist(distance)}
                </span>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Open/Closed */}
            {open !== null && (
              <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-[3px] rounded-full leading-none ${
                open
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${open ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`} />
                {open ? 'Aperto' : 'Chiuso'}
              </span>
            )}
            {/* Beer count pill */}
            {beersOnTap > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-[3px] rounded-full leading-none bg-accent text-accent-foreground border border-primary/15">
                <Beer className="w-2.5 h-2.5" />
                {beersOnTap}
              </span>
            )}
          </div>
        </div>
      </Link>
      {!isLast && (
        <div className="h-px mx-4 bg-border" />
      )}
    </div>
  );
}
