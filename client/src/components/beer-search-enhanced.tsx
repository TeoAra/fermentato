import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, ArrowUp, X } from "lucide-react";

interface BeerSearchEnhancedProps {
  onAddBeer: (beer: any) => void;
  onReplaceBeer?: (beer: any) => void;
  replacingBeerId?: number | null;
  onCancel: () => void;
  title?: string;
  buttonText?: string;
}

export default function BeerSearchEnhanced({
  onAddBeer,
  onReplaceBeer,
  replacingBeerId,
  onCancel,
  title = "Cerca Birre",
  buttonText = "Aggiungi"
}: BeerSearchEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allBeers = [], isLoading: beersLoading } = useQuery({
    queryKey: ["/api/beers"],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Enhanced search filter
  const filteredBeers = (Array.isArray(allBeers) ? allBeers : []).filter((beer: any) => {
    if (!searchQuery.trim()) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      beer.name?.toLowerCase().includes(query) ||
      (typeof beer.brewery === 'string' 
        ? beer.brewery.toLowerCase().includes(query)
        : beer.brewery?.name?.toLowerCase().includes(query)
      ) ||
      beer.style?.toLowerCase().includes(query)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Search className="mr-2" />
            {title}
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca per nome birra, birrificio o stile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {beersLoading ? (
              <div className="text-center py-4">Caricamento database birre...</div>
            ) : searchQuery.trim() && filteredBeers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                Nessuna birra trovata per "{searchQuery}"
              </div>
            ) : (
              filteredBeers.slice(0, 20).map((beer: any) => (
                <div key={beer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {beer.imageUrl && (
                        <img 
                          src={beer.imageUrl} 
                          alt={beer.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{beer.name}</p>
                        <div className="flex items-center text-xs text-gray-600 gap-1">
                          {beer.brewery?.id || beer.breweryId ? (
                            <Link href={`/brewery/${beer.brewery?.id || beer.breweryId}`}>
                              <span className="hover:text-primary hover:underline cursor-pointer">
                                {typeof beer.brewery === 'string' ? beer.brewery : beer.brewery?.name || 'Birrificio'}
                              </span>
                            </Link>
                          ) : (
                            <span>{typeof beer.brewery === 'string' ? beer.brewery : beer.brewery?.name || 'Birrificio'}</span>
                          )}
                          <span>•</span>
                          <span>{beer.style}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {beer.abv && (
                            <Badge variant="outline" className="text-xs">
                              {beer.abv}% ABV
                            </Badge>
                          )}
                          {beer.ibu && (
                            <Badge variant="outline" className="text-xs">
                              {beer.ibu} IBU
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {replacingBeerId && onReplaceBeer && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onReplaceBeer(beer)}
                      >
                        <ArrowUp className="w-4 h-4 mr-1" />
                        Sostituisci
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      onClick={() => onAddBeer(beer)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {buttonText}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {searchQuery.trim() && (
            <div className="text-xs text-gray-500 text-center">
              Trovate {filteredBeers.length} birre nel database di {Array.isArray(allBeers) ? allBeers.length : 0} birre totali
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}