import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Wine } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";

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
    description?: string | null;
  }>;
}

export default function TapList({ tapList }: TapListProps) {
  if (!tapList || tapList.length === 0) {
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

  return (
    <div className="space-y-4">      
      {tapList.map((tap) => (
        <Card key={tap.id} className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 bg-white dark:bg-gray-800">
          <div className="flex items-start justify-between space-x-4">
            {/* Left side: Beer details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <ImageWithFallback
                  src={tap.beer.imageUrl || tap.beer.brewery.logoUrl}
                  alt={tap.beer.name}
                  imageType="beer"
                  containerClassName="w-12 h-12 rounded-lg flex-shrink-0"
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  iconSize="md"
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${tap.beer.id}`}>
                    <h3 className="font-semibold text-lg break-words hover:text-primary cursor-pointer transition-colors text-gray-900 dark:text-white">
                      {tap.beer.name}
                    </h3>
                  </Link>
                  <Link href={`/brewery/${tap.beer.brewery.id}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors">
                      {tap.beer.brewery.name}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {tap.beer.style} • {tap.beer.abv}% ABV
                  </p>
                </div>
              </div>

              {/* Description if available */}
              {tap.description && (
                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{tap.description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Prices */}
            <div className="flex-shrink-0 min-w-[120px]">
              <div className="space-y-2">
                {tap.prices && tap.prices.length > 0 ? (
                  tap.prices.map((priceItem, index) => (
                    <div key={index} className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{priceItem.size}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">€{parseFloat(priceItem.price).toFixed(2)}</div>
                    </div>
                  ))
                ) : (
                  <>
                    {tap.priceSmall && parseFloat(tap.priceSmall) > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Piccola</div>
                        <div className="font-semibold text-gray-900 dark:text-white">€{parseFloat(tap.priceSmall).toFixed(2)}</div>
                      </div>
                    )}
                    {tap.priceMedium && parseFloat(tap.priceMedium) > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Media</div>
                        <div className="font-semibold text-gray-900 dark:text-white">€{parseFloat(tap.priceMedium).toFixed(2)}</div>
                      </div>
                    )}
                    {tap.priceLarge && parseFloat(tap.priceLarge) > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Grande</div>
                        <div className="font-semibold text-gray-900 dark:text-white">€{parseFloat(tap.priceLarge).toFixed(2)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
