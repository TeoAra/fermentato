import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, MapPin, Building, Beer, Clock, TrendingUp, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setDebouncedSearch("");
      setSelectedIndex(-1);
    } else {
      // Focus input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Save search to recent searches
  const saveSearch = (term: string) => {
    if (!term.trim() || recentSearches.includes(term.trim())) return;
    
    const updated = [term.trim(), ...recentSearches.slice(0, 4)];
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults) return;
    
    const allResults = [
      ...(searchResults.pubs?.slice(0, 3) || []).map((item: any) => ({ ...item, type: 'pub' })),
      ...(searchResults.breweries?.slice(0, 3) || []).map((item: any) => ({ ...item, type: 'brewery' })),
      ...(searchResults.beers?.slice(0, 3) || []).map((item: any) => ({ ...item, type: 'beer' }))
    ];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => prev < allResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        saveSearch(searchTerm);
        handleClose();
        window.location.href = `/${selected.type}/${selected.id}`;
      }
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedIndex(-1);
    onClose();
  };

  const handleResultClick = (type: string, id: number) => {
    saveSearch(searchTerm);
    handleClose();
    window.location.href = `/${type}/${id}`;
  };

  const popularSuggestions = [
    "IPA", "Lager", "Stout", "Birra artigianale", "Pub Roma", "Birrificio"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-white/20 dark:border-gray-800/50">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="sr-only">Ricerca avanzata</DialogTitle>
          
          {/* Modern Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <Input
              ref={inputRef}
              placeholder="Cerca pub, birrifici, birre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-12 py-4 text-base bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all duration-200"
              data-testid="input-search"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Search indicator */}
            {isLoading && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto scrollbar-hide">
          {debouncedSearch.length < 2 ? (
            <div className="p-6 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Clock className="h-4 w-4" />
                    Ricerche recenti
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchTerm(search)}
                        className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 group"
                        data-testid={`recent-search-${index}`}
                      >
                        <Clock className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                          {search}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <TrendingUp className="h-4 w-4" />
                  Popolari
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSuggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-orange-100 hover:text-orange-800 dark:hover:bg-orange-900/20 dark:hover:text-orange-200 transition-all duration-200"
                      onClick={() => setSearchTerm(suggestion)}
                      data-testid={`suggestion-${index}`}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Welcome message */}
              <div className="text-center py-8">
                <div className="relative inline-block">
                  <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <Sparkles className="h-6 w-6 text-orange-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  Inizia a digitare per cercare tra migliaia di pub, birrifici e birre artigianali
                </p>
              </div>
            </div>
          ) : isLoading ? (
            /* Enhanced Loading State */
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Ricerca in corso per "<span className="font-medium text-gray-700 dark:text-gray-300">{debouncedSearch}</span>"
                </p>
              </div>
              
              {/* Skeleton Loading */}
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchResults ? (
            /* Enhanced Results Display */
            <div className="p-6 space-y-6">
              {/* Results count */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {(searchResults.pubs?.length || 0) + (searchResults.breweries?.length || 0) + (searchResults.beers?.length || 0)} risultati per 
                <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">"{debouncedSearch}"</span>
              </div>

              {/* Pub Results */}
              {searchResults.pubs?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Pub</h3>
                    <Badge variant="outline" className="text-xs">{searchResults.pubs.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.pubs.slice(0, 3).map((pub: any, index: number) => (
                      <div
                        key={`pub-${pub.id}`}
                        className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                          selectedIndex === index
                            ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'
                            : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleResultClick('pub', pub.id)}
                        data-testid={`result-pub-${pub.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                              <MapPin className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {pub.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {pub.city && pub.address ? `${pub.city} • ${pub.address}` : pub.city || pub.address || 'Indirizzo non disponibile'}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.pubs?.length > 0 && (searchResults.breweries?.length > 0 || searchResults.beers?.length > 0) && (
                <Separator className="bg-gray-200 dark:bg-gray-700" />
              )}

              {/* Brewery Results */}
              {searchResults.breweries?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Birrifici</h3>
                    <Badge variant="outline" className="text-xs">{searchResults.breweries.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.breweries.slice(0, 3).map((brewery: any, index: number) => {
                      const resultIndex = (searchResults.pubs?.length || 0) + index;
                      return (
                        <div
                          key={`brewery-${brewery.id}`}
                          className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                            selectedIndex === resultIndex
                              ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'
                              : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => handleResultClick('brewery', brewery.id)}
                          data-testid={`result-brewery-${brewery.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                                <Building className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {brewery.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {brewery.location && brewery.region ? `${brewery.location} • ${brewery.region}` : brewery.location || brewery.region || 'Posizione non disponibile'}
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchResults.breweries?.length > 0 && searchResults.beers?.length > 0 && (
                <Separator className="bg-gray-200 dark:bg-gray-700" />
              )}

              {/* Beer Results */}
              {searchResults.beers?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Beer className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Birre</h3>
                    <Badge variant="outline" className="text-xs">{searchResults.beers.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.beers.slice(0, 3).map((beer: any, index: number) => {
                      const resultIndex = (searchResults.pubs?.length || 0) + (searchResults.breweries?.length || 0) + index;
                      return (
                        <div
                          key={`beer-${beer.id}`}
                          className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                            selectedIndex === resultIndex
                              ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'
                              : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => handleResultClick('beer', beer.id)}
                          data-testid={`result-beer-${beer.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-sm">
                                <Beer className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {beer.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {beer.style && beer.abv ? `${beer.style} • ${beer.abv}%` : beer.style || `${beer.abv}%` || 'Dettagli non disponibili'}
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {(!searchResults.pubs?.length && !searchResults.breweries?.length && !searchResults.beers?.length) && (
                <div className="text-center py-12">
                  <div className="relative inline-block mb-4">
                    <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <X className="h-6 w-6 text-red-400 absolute -bottom-1 -right-1" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                    Nessun risultato trovato
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Prova con termini di ricerca diversi per "<span className="font-medium">{debouncedSearch}</span>"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">
                Inizia la tua ricerca...
              </p>
            </div>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">↑</kbd>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">↓</kbd>
                <span>naviga</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">↵</kbd>
                <span>seleziona</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">Esc</kbd>
              <span>chiudi</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}