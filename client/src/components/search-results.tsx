import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Beer, Building } from "lucide-react";

interface SearchResult {
  pubs: any[];
  breweries: any[];
  beers: any[];
}

interface SearchResultsProps {
  query: string;
  onClose: () => void;
}

export default function SearchResults({ query, onClose }: SearchResultsProps) {
  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 2,
  });

  if (!query || query.length < 3) return null;

  if (isLoading) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Cercando...</div>
        </CardContent>
      </Card>
    );
  }

  const hasResults = results && (
    results.pubs.length > 0 || 
    results.breweries.length > 0 || 
    results.beers.length > 0
  );

  if (!hasResults) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-50">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Nessun risultato per "{query}"</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
      <CardContent className="p-4 space-y-4">
        {/* Pub Results */}
        {results.pubs.slice(0, 5).map((pub) => (
          <Link key={`pub-${pub.id}`} href={`/pub/${pub.id}`}>
            <div
              className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              onClick={onClose}
            >
              <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{pub.name}</div>
                <div className="text-xs text-gray-500 truncate">{pub.address}</div>
              </div>
              <Badge variant="secondary" className="text-xs">Pub</Badge>
            </div>
          </Link>
        ))}

        {/* Brewery Results */}
        {results.breweries.slice(0, 3).map((brewery) => (
          <Link key={`brewery-${brewery.id}`} href={`/brewery/${brewery.id}`}>
            <div
              className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
              onClick={onClose}
            >
              <Building className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{brewery.name}</div>
                <div className="text-xs text-gray-500 truncate">{brewery.location}</div>
              </div>
              <Badge variant="outline" className="text-xs">Birrificio</Badge>
            </div>
          </Link>
        ))}

        {/* Beer Results */}
        {results.beers.slice(0, 3).map((beer) => (
          <div
            key={`beer-${beer.id}`}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
          >
            <Beer className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{beer.name}</div>
              <div className="text-xs text-gray-500 truncate">
                {beer.brewery?.name} • {beer.style} • {beer.abv}%
              </div>
            </div>
            <Badge variant="outline" className="text-xs">Birra</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}