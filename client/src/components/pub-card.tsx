import { MapPin, Beer, ChevronRight, Star } from "lucide-react";
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
    rating?: string | number | null;
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
        <div className="group flex min-h-[104px] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/35 active:bg-muted/50">
          <div className="h-[72px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-muted/70">
            <ImageWithFallback
              src={pub.coverImageUrl || pub.logoUrl}
              alt={`Immagine di ${pub.name}`}
              imageType="pub"
              containerClassName="h-full w-full"
              className="h-full w-full object-contain"
              iconSize="sm"
            />
          </div>
          {pub.coverImageUrl && pub.logoUrl && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card p-1">
              <ImageWithFallback src={pub.logoUrl} alt={`Logo ${pub.name}`} imageType="pub" containerClassName="h-full w-full" className="h-full w-full object-contain" iconSize="sm" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{pub.name}</p>
            <p className="mt-1 flex items-start gap-1 text-xs leading-snug text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{pub.address || pub.city || "Indirizzo non disponibile"}</span>
            </p>
            <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
              {open !== null && (
                <span className={`inline-flex items-center gap-1 font-semibold ${open ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-muted-foreground/60"}`} />
                  {open ? "Aperto" : "Chiuso"}
                </span>
              )}
              {beersOnTap > 0 && <span className="inline-flex items-center gap-1 text-muted-foreground"><Beer className="h-3 w-3" />{beersOnTap} alla spina</span>}
              {pub.rating != null && Number(pub.rating) > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Star className="h-3 w-3 fill-current text-primary" />{Number(pub.rating).toFixed(1)}</span>
              )}
              {distance != null && <span className="text-muted-foreground">{formatDist(distance)}</span>}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        </div>
      </Link>
      {!isLast && (
        <div className="mx-3 h-px bg-border/70" />
      )}
    </div>
  );
}
