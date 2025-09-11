import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Wine, Sparkles, Crown, Target } from "lucide-react";

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
        <div key={tap.id} className="glass-card rounded-2xl p-6 hover:scale-102 transition-all duration-300 group border border-white/20 backdrop-blur-sm bg-white/60 dark:bg-gray-900/60 shadow-lg hover:shadow-xl">
          <div className="">
            {/* Modern Layout */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              
              {/* Beer Image + Basic Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="relative flex-shrink-0">
                  <img
                    src={tap.beer.imageUrl || tap.beer.brewery.logoUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                    alt={tap.beer.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300 ring-2 ring-white/50 dark:ring-gray-700/50"
                  />
                  {tap.tapNumber && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                      {tap.tapNumber}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${tap.beer.id}`}>
                    <h4 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-2 break-words hover:text-transparent hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-600 hover:bg-clip-text cursor-pointer transition-all duration-300 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-600 group-hover:bg-clip-text">
                      {tap.beer.name}
                    </h4>
                  </Link>
                  <Link href={`/brewery/${tap.beer.brewery.id}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words hover:text-primary cursor-pointer transition-colors font-medium">
                      {tap.beer.brewery.name}
                    </p>
                  </Link>
                  
                  {/* Modern Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 text-blue-800 dark:text-blue-200 px-3 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {tap.beer.style}
                    </Badge>
                    {tap.beer.abv && (
                      <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 text-orange-800 dark:text-orange-200 px-3 py-1">
                        <Target className="h-3 w-3 mr-1" />
                        {tap.beer.abv}% ABV
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            
              {/* Prices Section - Modern Design */}
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-br from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/80 rounded-xl p-4 min-w-[140px] backdrop-blur-sm border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <Wine className="h-3 w-3 mr-1" />
                    Prezzi
                  </h5>
                  <div className="space-y-2">
                    {tap.prices && typeof tap.prices === 'object' && (Array.isArray(tap.prices) ? tap.prices.length > 0 : Object.keys(tap.prices).length > 0) ? (
                      Array.isArray(tap.prices) ? (
                        // Gestisce array format: [{size: "Piccola (20cl)", price: "6"}]
                        tap.prices.filter((item: any) => item.price && Number(item.price) > 0).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center bg-white/60 dark:bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                              {item.size || 'N/A'}
                            </span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                              €{Number(item.price).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        // Gestisce object format: {"Piccola (20cl)": "6"}
                        Object.entries(tap.prices).filter(([size, price]) => {
                          if (typeof price === 'object' && price !== null) {
                            return 'price' in price && Number((price as any).price) > 0;
                          }
                          return Number(price) > 0;
                        }).map(([size, price]) => (
                          <div key={size} className="flex justify-between items-center bg-white/60 dark:bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                              {(() => {
                                const cleanSize = size.replace(/\([^)]*\)/, '').trim();
                                const numericFormat = cleanSize === 'Piccola' ? '0.2l' : 
                                                    cleanSize === 'Media' ? '0.4l' : 
                                                    cleanSize === 'Grande' || cleanSize === 'Boccale' ? '1l' : '';
                                return `${cleanSize}${numericFormat ? ` (${numericFormat})` : ''}`;
                              })()}
                            </span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                              €{(() => {
                                if (typeof price === 'object' && price !== null) {
                                  if ('price' in price) {
                                    return Number((price as any).price).toFixed(2);
                                  }
                                  return "N/A";
                                }
                                return Number(price).toFixed(2);
                              })()}
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      // Fallback to legacy prices
                      <>
                        {tap.priceSmall && Number(tap.priceSmall) > 0 && (
                          <div className="flex justify-between items-center bg-white/60 dark:bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Piccola (0.2l)</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">€{tap.priceSmall}</span>
                          </div>
                        )}
                        {tap.priceMedium && Number(tap.priceMedium) > 0 && (
                          <div className="flex justify-between items-center bg-white/60 dark:bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Media (0.4l)</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">€{tap.priceMedium}</span>
                          </div>
                        )}
                        {tap.priceLarge && Number(tap.priceLarge) > 0 && (
                          <div className="flex justify-between items-center bg-white/60 dark:bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-900/80 transition-colors">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Boccale (1l)</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">€{tap.priceLarge}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Description if available */}
            {tap.description && (
              <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{tap.description}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
