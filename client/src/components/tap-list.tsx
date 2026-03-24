import { useMemo } from "react";
import { Link } from "wouter";
import { Wine, EyeOff } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";

function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() || '';
  if (s.includes('stout') || s.includes('porter')) return { bg: 'rgba(92,61,30,0.14)', text: '#7B4A1E' };
  if (s.includes('sour') || s.includes('gose') || s.includes('lambic') || s.includes('berliner')) return { bg: 'rgba(212,168,56,0.15)', text: '#A8840A' };
  if (s.includes('saison') || s.includes('farmhouse') || s.includes('bière de garde')) return { bg: 'rgba(100,160,70,0.15)', text: '#4E8A28' };
  if (s.includes('wit') || s.includes('weiss') || s.includes('weizen') || s.includes('wheat') || s.includes('farro')) return { bg: 'rgba(212,168,67,0.15)', text: '#9A7820' };
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pils') || s.includes('märzen') || s.includes('marzen') || s.includes('bock')) return { bg: 'rgba(207,168,101,0.15)', text: '#8A6A10' };
  if (s.includes('red') || s.includes('amber') || s.includes('rossa') || s.includes('ambrata')) return { bg: 'rgba(185,60,30,0.14)', text: '#B04020' };
  if (s.includes('barley wine') || s.includes('barleywine') || s.includes('imperial') || s.includes('wee heavy')) return { bg: 'rgba(130,30,80,0.13)', text: '#8A1E55' };
  if (s.includes('apa') || s.includes('pale ale') || s.includes('session')) return { bg: 'rgba(232,140,30,0.14)', text: '#C07010' };
  return { bg: 'rgba(247,113,4,0.13)', text: '#F77104' };
}

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
    <div key={tap.id} className={`bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] shadow-[0_4px_20px_rgba(247,113,4,0.06)] hover:shadow-[0_6px_24px_rgba(247,113,4,0.12)] hover:border-orange-200 dark:hover:border-orange-800/40 transition-all duration-300 ${tap.isVisible === false ? 'opacity-60' : ''}`}>
      <div className="flex gap-3 p-4">
        <Link href={`/beer/${tap.beer.id}`} className="flex-shrink-0 self-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-900/20 flex items-center justify-center border border-orange-100 dark:border-orange-900/30">
            <ImageWithFallback
              src={tap.beer.imageUrl || tap.beer.brewery.logoUrl}
              alt={tap.beer.name}
              imageType="beer"
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              iconSize="md"
            />
          </div>
        </Link>

        <div className="flex-1 min-w-0 flex gap-2 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/beer/${tap.beer.id}`}>
                <h3 className="font-bold text-base leading-snug line-clamp-1 hover:text-primary dark:hover:text-orange-400 cursor-pointer transition-colors text-foreground">
                  {tap.beer.name}
                </h3>
              </Link>
              {tap.isVisible === false && (
                <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-muted-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <EyeOff className="h-3 w-3" />
                  Nascosta
                </span>
              )}
            </div>

            <Link href={`/brewery/${tap.beer.brewery.id}`}>
              <p className="text-xs font-semibold text-primary dark:text-orange-400 hover:opacity-80 cursor-pointer transition-opacity truncate leading-snug mt-0.5">
                {tap.beer.brewery.name}
              </p>
            </Link>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {tap.beer.style && (() => {
                const sc = getBeerStyleColor(tap.beer.style);
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>
                    {tap.beer.style}
                  </span>
                );
              })()}
              <span className="text-[10px] font-medium text-muted-foreground">
                {tap.beer.isAlcoholFree ? '0.0% ABV' : `${tap.beer.abv || '0'}% ABV`}
              </span>
              {tap.beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
              {tap.beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
            </div>

            {tap.description && (
              <p className="text-xs text-muted-foreground italic mt-1.5 line-clamp-2">
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
    </div>
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
