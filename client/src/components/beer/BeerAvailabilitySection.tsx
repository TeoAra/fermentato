import { Link } from "wouter";
import { MapPin, ChevronDown, ChevronRight, Wine, Beer as BeerIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface BeerAvailabilitySectionProps {
  isLoading: boolean;
  totalLocations: number;
  tapLocations: any[];
  bottleLocations: any[];
  showAllPubs: boolean;
  onToggleShowAll: () => void;
}

/**
 * "Dove puoi berla" — lista pub con badge Spina/Bottiglia.
 * Mostra max 3 collassato, "Vedi tutti" per espandere.
 */
export default function BeerAvailabilitySection({
  isLoading,
  totalLocations,
  tapLocations,
  bottleLocations,
  showAllPubs,
  onToggleShowAll,
}: BeerAvailabilitySectionProps) {
  if (isLoading) {
    return (
      <div className="mt-5 rounded-2xl border border-stone-100 dark:border-border bg-card p-4">
        <div className="skeleton h-5 w-40 mb-3 rounded" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (totalLocations === 0) return null;

  const allLocs = [
    ...tapLocations.map((l: any) => ({
      pub: l.pub,
      price: l.tapItem?.price,
      type: "tap" as const,
    })),
    ...bottleLocations.map((l: any) => ({
      pub: l.pub,
      price: l.bottleItem?.price,
      type: "bottle" as const,
    })),
  ];
  const visible = showAllPubs ? allLocs : allLocs.slice(0, 3);

  return (
    <div className="mt-5 rounded-2xl border border-stone-100 dark:border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Dove puoi berla
        </p>
        {allLocs.length > 3 && (
          <button
            onClick={onToggleShowAll}
            className="text-xs font-bold text-primary inline-flex items-center gap-0.5 tap-scale"
          >
            {showAllPubs ? "Mostra meno" : `Vedi tutti i ${allLocs.length} locali`}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showAllPubs ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {visible.map((loc: any, i: number) => (
          <li key={`${loc.type}-${loc.pub.id}-${i}`}>
            <Link href={`/pub/${loc.pub.id}`}>
              <div className="flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-[#FAF7F1] dark:bg-[#23262E] text-[#6B6357] dark:text-[#B7BDC7] text-xs font-bold">
                    {loc.pub.name?.charAt(0)?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1">
                    {loc.pub.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                    <span className="truncate">
                      {loc.pub.city || loc.pub.address || ""}
                    </span>
                    {loc.type === "tap" ? (
                      <span className="inline-flex items-center gap-1 text-primary font-semibold flex-shrink-0">
                        · <Wine className="h-3 w-3" /> Spina
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-500 font-semibold flex-shrink-0">
                        · <BeerIcon className="h-3 w-3" /> Bottiglia
                      </span>
                    )}
                  </p>
                </div>
                {loc.price && (
                  <span className="text-sm font-extrabold text-foreground flex-shrink-0">
                    €{Number(loc.price).toFixed(2).replace(".", ",")}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {allLocs.length > 3 && !showAllPubs && (
        <button
          onClick={onToggleShowAll}
          className="w-full px-4 py-3 bg-orange-50/50 dark:bg-orange-950/10 border-t border-stone-100 dark:border-border flex items-center justify-between text-sm font-bold text-foreground tap-scale"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Vedi tutti i {allLocs.length} locali
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
