import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

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
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <p className="text-gray-500 text-lg font-medium">Nessuna birra attualmente alla spina</p>
        <p className="text-gray-400 text-sm mt-1">Torna presto per vedere le novità!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">      
      {tapList.map((tap) => (
        <Card key={tap.id} className="overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-100">
          <div className="p-4">
            {/* Mobile-First Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              
              {/* Beer Image + Basic Info */}
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-shrink-0">
                  <img
                    src={tap.beer.imageUrl || tap.beer.brewery.logoUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                    alt={tap.beer.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shadow-sm"
                  />
                  {tap.tapNumber && (
                    <div className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {tap.tapNumber}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${tap.beer.id}`}>
                    <h4 className="font-semibold text-base sm:text-lg text-gray-900 hover:text-primary cursor-pointer transition-colors truncate">
                      {tap.beer.name}
                    </h4>
                  </Link>
                  <Link href={`/brewery/${tap.beer.brewery.id}`}>
                    <p className="text-sm text-gray-600 hover:text-primary cursor-pointer transition-colors truncate">
                      {tap.beer.brewery.name}
                    </p>
                  </Link>
                  
                  {/* Tags Row */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">{tap.beer.style}</Badge>
                    {tap.beer.abv && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">{tap.beer.abv}% ABV</Badge>
                    )}
                  </div>
                </div>
              </div>
            
              {/* Prices Section - Mobile Optimized */}
              <div className="flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 min-w-[120px]">
                  <div className="space-y-1">
                    {tap.prices && typeof tap.prices === 'object' && Object.keys(tap.prices).length > 0 ? (
                      Object.entries(tap.prices).map(([size, price]) => (
                        <div key={size} className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-medium">
                            {(() => {
                              const cleanSize = size.replace(/\([^)]*\)/, '').trim();
                              const numericFormat = cleanSize === 'Piccola' ? '0.2l' : 
                                                  cleanSize === 'Media' ? '0.4l' : 
                                                  cleanSize === 'Grande' || cleanSize === 'Boccale' ? '1l' : '';
                              return `${cleanSize}${numericFormat ? ` (${numericFormat})` : ''}`;
                            })()}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            €{(() => {
                              if (typeof price === 'object' && price !== null) {
                                // Se è un oggetto con proprietà price, usa quella
                                if ('price' in price) {
                                  return Number(price.price).toFixed(2);
                                }
                                // Altrimenti fallback a formato sicuro
                                return "N/A";
                              }
                              return Number(price).toFixed(2);
                            })()}
                          </span>
                        </div>
                      ))
                    ) : (
                      // Fallback to legacy prices
                      <>
                        {tap.priceSmall && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 font-medium">Piccola (0.2l)</span>
                            <span className="text-sm font-bold text-primary">€{tap.priceSmall}</span>
                          </div>
                        )}
                        {tap.priceMedium && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 font-medium">Media (0.4l)</span>
                            <span className="text-sm font-bold text-primary">€{tap.priceMedium}</span>
                          </div>
                        )}
                        {tap.priceLarge && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 font-medium">Boccale (1l)</span>
                            <span className="text-sm font-bold text-primary">€{tap.priceLarge}</span>
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
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 italic">{tap.description}</p>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
