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
      brewery: {
        id: number;
        name: string;
        logoUrl: string | null;
      };
    };
    priceSmall: string | null;
    priceMedium: string | null;
    priceLarge: string | null;
    tapNumber: number | null;
  }>;
}

export default function TapList({ tapList }: TapListProps) {
  if (!tapList || tapList.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nessuna birra attualmente alla spina</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-secondary mb-4">Birre alla Spina</h3>
      
      {tapList.map((tap) => (
        <Card key={tap.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={tap.beer.brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"}
                alt={`Logo ${tap.beer.brewery.name}`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <Link href={`/beer/${tap.beer.id}`}>
                  <h4 className="font-semibold text-lg text-secondary hover:text-primary cursor-pointer transition-colors">
                    {tap.beer.name}
                  </h4>
                </Link>
                <Link href={`/brewery/${tap.beer.brewery.id}`}>
                  <p className="text-gray-600 hover:text-primary cursor-pointer transition-colors">
                    {tap.beer.brewery.name}
                  </p>
                </Link>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{tap.beer.style}</Badge>
                  {tap.beer.abv && (
                    <Badge variant="outline">{tap.beer.abv}% ABV</Badge>
                  )}
                  {tap.tapNumber && (
                    <Badge variant="secondary">Spina {tap.tapNumber}</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="space-y-1">
                {tap.priceSmall && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">0.2L</span>
                    <span className="font-semibold text-primary">€{tap.priceSmall}</span>
                  </div>
                )}
                {tap.priceMedium && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">0.4L</span>
                    <span className="font-semibold text-primary">€{tap.priceMedium}</span>
                  </div>
                )}
                {tap.priceLarge && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">0.5L</span>
                    <span className="font-semibold text-primary">€{tap.priceLarge}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
