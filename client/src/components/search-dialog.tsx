import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, MapPin, Building, Beer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setDebouncedSearch("");
    }
  }, [isOpen]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return null;
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const handleClose = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Ricerca</DialogTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Cerca pub, birrifici, birre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 text-base"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {debouncedSearch.length < 2 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Digita almeno 2 caratteri per iniziare la ricerca</p>
            </div>
          ) : isLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
              <p>Ricerca in corso...</p>
            </div>
          ) : searchResults ? (
            <div className="p-4 space-y-4">
              {/* Pub Results */}
              {searchResults.pubs?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Pub</h3>
                  <div className="space-y-2">
                    {searchResults.pubs.slice(0, 3).map((pub: any) => (
                      <div key={`pub-${pub.id}`} onClick={handleClose}>
                        <a href={`/pub/${pub.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                          <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{pub.name}</div>
                            <div className="text-xs text-gray-500 truncate">{pub.city} • {pub.address}</div>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brewery Results */}
              {searchResults.breweries?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Birrifici</h3>
                  <div className="space-y-2">
                    {searchResults.breweries.slice(0, 3).map((brewery: any) => (
                      <div key={`brewery-${brewery.id}`} onClick={handleClose}>
                        <a href={`/brewery/${brewery.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                          <Building className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{brewery.name}</div>
                            <div className="text-xs text-gray-500 truncate">{brewery.location} • {brewery.region}</div>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Beer Results */}
              {searchResults.beers?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Birre</h3>
                  <div className="space-y-2">
                    {searchResults.beers.slice(0, 3).map((beer: any) => (
                      <div key={`beer-${beer.id}`} onClick={handleClose}>
                        <a href={`/beer/${beer.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                          <Beer className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{beer.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {beer.style} • {beer.abv}%
                            </div>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {(!searchResults.pubs?.length && !searchResults.breweries?.length && !searchResults.beers?.length) && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <p>Nessun risultato trovato per "{debouncedSearch}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>Nessun risultato trovato</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}