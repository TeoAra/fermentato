import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Wine } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";

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
    prices?: Record<string, number>;
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
        <div key={tap.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
          <div className="flex items-start justify-between space-x-4">
            {/* Left side: Beer details */}
            <div className="flex-1 min-w-0">
              {/* Tap number badge */}
              {tap.tapNumber && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                    Spina {tap.tapNumber}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-3">
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
                    <h3 className="font-semibold text-base break-words hover:text-primary cursor-pointer transition-colors">
                      {tap.beer.name}
                    </h3>
                  </Link>
                  <Link href={`/brewery/${tap.beer.brewery.id}`}>
                    <p className="text-gray-600 text-sm break-words hover:text-primary cursor-pointer transition-colors">
                      {tap.beer.brewery.name}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-500">
                    {tap.beer.style} • {tap.beer.abv}% ABV
                  </p>
                </div>
              </div>

              {/* Description if available */}
              {tap.description && (
                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{tap.description}</p>
                </div>
              )}
            </div>

            {/* Right side: Prices */}
            <div className="flex-shrink-0 text-right space-y-2 min-w-[100px]">
              <div className="space-y-2">
                {tap.priceSmall && parseFloat(tap.priceSmall) > 0 && (
                  <div className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-3 py-2 rounded-lg text-right">
                    <div className="text-xs font-medium">Piccola</div>
                    <div className="font-bold text-sm">€{parseFloat(tap.priceSmall).toFixed(2)}</div>
                  </div>
                )}
                {tap.priceMedium && parseFloat(tap.priceMedium) > 0 && (
                  <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-2 rounded-lg text-right">
                    <div className="text-xs font-medium">Media</div>
                    <div className="font-bold text-sm">€{parseFloat(tap.priceMedium).toFixed(2)}</div>
                  </div>
                )}
                {tap.priceLarge && parseFloat(tap.priceLarge) > 0 && (
                  <div className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 px-3 py-2 rounded-lg text-right">
                    <div className="text-xs font-medium">Grande</div>
                    <div className="font-bold text-sm">€{parseFloat(tap.priceLarge).toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
