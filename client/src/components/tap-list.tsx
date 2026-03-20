import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Wine, EyeOff } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";

interface PriceItem {
  size: string;
  price: string;
  format?: string;
}

interface TapListProps {
  tapList: Array<{
    id: number;
    beer: {
      id: number;
      name: string;
      style: string;
      abv: string | null;
      logoUrl: string | null;
      imageUrl?: string | null;
      isGlutenFree?: boolean;
      isAlcoholFree?: boolean;
      brewery: {
        id: number;
        name: string;
        logoUrl: string | null;
      };
    };
    prices?: PriceItem[];
    priceSmall: string | null;
    priceMedium: string | null;
    priceLarge: string | null;
    tapNumber: number | null;
    tapType?: string | null;
    description?: string | null;
    isVisible?: boolean | null;
  }>;
}

export default function TapList({ tapList }: TapListProps) {
  const sorted = useMemo(() => {
    if (!tapList) return [];
    return [...tapList].sort((a, b) => {
      const aIsSpina = !a.tapType || a.tapType === "spina";
      const bIsSpina = !b.tapType || b.tapType === "spina";
      if (aIsSpina && !bIsSpina) return -1;
      if (!aIsSpina && bIsSpina) return 1;
      return (a.tapNumber ?? 999) - (b.tapNumber ?? 999);
    });
  }, [tapList]);

  if (!sorted || sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 mx-auto mb-6 flex items-center justify-center">
          <Wine className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Nessuna birra alla spina
        </h4>
        <p className="text-gray-600 dark:text-gray-400">
          Controlla più tardi per vedere le novità in taplist!
        </p>
      </div>
    );
  }

  const spinaItems = sorted.filter(t => !t.tapType || t.tapType === "spina");
  const pompaItems = sorted.filter(t => t.tapType === "pompa");

  const renderCard = (tap: typeof sorted[0]) => (
    <Card key={tap.id} className={`overflow-hidden hover:shadow-lg transition-shadow border-l-4 ${tap.tapType === "pompa" ? "border-l-violet-500" : "border-l-amber-500"} bg-white dark:bg-gray-800 ${tap.isVisible === false ? 'opacity-60' : ''}`}>
      <div className="flex gap-3 p-4">
        <ImageWithFallback
          src={tap.beer.imageUrl || tap.beer.brewery.logoUrl}
          alt={tap.beer.name}
          imageType="beer"
          containerClassName="w-14 h-14 rounded-xl flex-shrink-0 self-center"
          className="w-14 h-14 rounded-xl object-cover"
          iconSize="md"
        />

        <div className="flex-1 min-w-0 flex gap-2 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/beer/${tap.beer.id}`}>
                <h3 className="font-bold text-base leading-snug line-clamp-1 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors text-gray-900 dark:text-white">
                  {tap.beer.name}
                </h3>
              </Link>
              {tap.isVisible === false && (
                <span className="inline-flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <EyeOff className="h-3 w-3" />
                  Nascosta
                </span>
              )}
            </div>

            <Link href={`/brewery/${tap.beer.brewery.id}`}>
              <p className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors truncate leading-snug mt-0.5">
                {tap.beer.brewery.name}
              </p>
            </Link>

            <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug mt-0.5">
              {tap.beer.style || 'Stile N/D'}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {tap.beer.isAlcoholFree ? '0.0% ABV' : `${tap.beer.abv || '0'}% ABV`}
              </span>
              {tap.beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
              {tap.beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
            </div>

            {tap.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1.5 line-clamp-2">
                {tap.description}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 text-right self-center">
            <div className="space-y-1.5">
              {tap.prices && tap.prices.length > 0 ? (
                tap.prices.map((priceItem, index) => (
                  <div key={index}>
                    <div className="text-xs text-gray-400 dark:text-gray-400">{priceItem.size}</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">€{parseFloat(priceItem.price).toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <>
                  {tap.priceSmall && parseFloat(tap.priceSmall) > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">Piccola</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">€{parseFloat(tap.priceSmall).toFixed(2)}</div>
                    </div>
                  )}
                  {tap.priceMedium && parseFloat(tap.priceMedium) > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">Media</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">€{parseFloat(tap.priceMedium).toFixed(2)}</div>
                    </div>
                  )}
                  {tap.priceLarge && parseFloat(tap.priceLarge) > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-400">Grande</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">€{parseFloat(tap.priceLarge).toFixed(2)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (pompaItems.length === 0) {
    return <div className="space-y-3">{spinaItems.map(renderCard)}</div>;
  }

  return (
    <div className="space-y-6">
      {spinaItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-amber-200 dark:bg-amber-900/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400 px-2">In Spina</span>
            <div className="h-px flex-1 bg-amber-200 dark:bg-amber-900/40" />
          </div>
          {spinaItems.map(renderCard)}
        </div>
      )}
      {pompaItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900/40" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-400 px-2">In Pompa</span>
            <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900/40" />
          </div>
          {pompaItems.map(renderCard)}
        </div>
      )}
    </div>
  );
}
