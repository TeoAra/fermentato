import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { Beer, Building2, MapPin, Search, ArrowLeft, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import ImageWithFallback from "@/components/image-with-fallback";
import Footer from "@/components/footer";

interface SearchResult {
  pubs: any[];
  breweries: any[];
  beers: any[];
}

export default function SearchPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialQ = params.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);

  useEffect(() => {
    setInputValue(initialQ);
    setQuery(initialQ);
  }, [initialQ]);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    enabled: query.length > 1,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputValue);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(inputValue)}`);
  };

  const totalResults = (results?.beers?.length || 0) + (results?.breweries?.length || 0) + (results?.pubs?.length || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back + Search bar */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2 flex-shrink-0">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Home
            </Link>
          </Button>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Cerca birre, birrifici, stili, pub..."
                className="pl-10"
                autoFocus
              />
            </div>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">
              Cerca
            </Button>
          </form>
        </div>

        {/* Results summary */}
        {query.length > 1 && !isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {totalResults > 0
              ? `${totalResults} risultat${totalResults === 1 ? 'o' : 'i'} per "${query}"`
              : `Nessun risultato per "${query}"`}
          </p>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && results && (
          <div className="space-y-6">
            {/* Beer Results */}
            {results.beers && results.beers.length > 0 && (
              <section>
                <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Beer className="h-5 w-5 text-amber-500" />
                  Birre ({results.beers.length})
                </h2>
                <div className="space-y-2">
                  {results.beers.map((beer: any) => (
                    <Link key={beer.id} href={`/beer/${beer.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                        <ImageWithFallback
                          src={beer.imageUrl}
                          alt={beer.name}
                          imageType="beer"
                          containerClassName="w-12 h-12 flex-shrink-0 rounded-lg"
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{beer.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {(beer.brewery?.name || beer.breweryName) && (
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                {beer.brewery?.name || beer.breweryName}
                              </span>
                            )}
                            {beer.style && (
                              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5">{beer.style}</Badge>
                            )}
                            {beer.abv != null && (
                              <span className="text-xs text-gray-500">{beer.abv}%</span>
                            )}
                            {beer.isGlutenFree && <GlutenFreeSmallBadge size={11} />}
                            {beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">Birra</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Brewery Results */}
            {results.breweries && results.breweries.length > 0 && (
              <section>
                <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  Birrifici ({results.breweries.length})
                </h2>
                <div className="space-y-2">
                  {results.breweries.map((brewery: any) => (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                        <ImageWithFallback
                          src={brewery.logoUrl}
                          alt={brewery.name}
                          imageType="brewery"
                          containerClassName="w-12 h-12 flex-shrink-0 rounded-full"
                          className="w-12 h-12 object-cover rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{brewery.name}</div>
                          <div className="text-xs text-gray-500 truncate">{brewery.location}{brewery.country ? `, ${brewery.country}` : ''}</div>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">Birrificio</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Pub Results */}
            {results.pubs && results.pubs.length > 0 && (
              <section>
                <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Pub ({results.pubs.length})
                </h2>
                <div className="space-y-2">
                  {results.pubs.map((pub: any) => (
                    <Link key={pub.id} href={`/pub/${pub.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{pub.name}</div>
                          <div className="text-xs text-gray-500 truncate">{pub.city} — {pub.address}</div>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0 text-xs bg-blue-100 text-blue-700">Pub</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {totalResults === 0 && query.length > 1 && (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Nessun risultato per "{query}"</p>
                  <p className="text-sm text-gray-500 mt-1">Prova con un termine diverso</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial state */}
        {query.length <= 1 && (
          <div className="text-center py-16 text-gray-400">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">Cerca birre, stili, birrifici o pub</p>
            <p className="text-sm mt-1">Digita almeno 2 caratteri per iniziare</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
