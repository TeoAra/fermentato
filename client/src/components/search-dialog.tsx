import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, MapPin, Building, Beer, Clock, TrendingUp, ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp, PlusCircle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import AdditionRequestModal from "@/components/AdditionRequestModal";
import ImageWithFallback from "@/components/image-with-fallback";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [filterGlutenFree, setFilterGlutenFree] = useState(false);
  const [filterAlcoholFree, setFilterAlcoholFree] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [additionModalOpen, setAdditionModalOpen] = useState(false);

  const INITIAL_SHOW = 5;
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      setExpandedSections({});
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
    queryKey: ["/api/search", debouncedSearch, filterGlutenFree, filterAlcoholFree],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return null;
      const params = new URLSearchParams({ q: debouncedSearch });
      if (filterGlutenFree) params.set('glutenFree', 'true');
      if (filterAlcoholFree) params.set('alcoholFree', 'true');
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults) return;
    
    const pubsShown = expandedSections.pubs ? searchResults.pubs?.length || 0 : Math.min(searchResults.pubs?.length || 0, INITIAL_SHOW);
    const breweriesShown = expandedSections.breweries ? searchResults.breweries?.length || 0 : Math.min(searchResults.breweries?.length || 0, INITIAL_SHOW);
    const beersShown = expandedSections.beers ? searchResults.beers?.length || 0 : Math.min(searchResults.beers?.length || 0, INITIAL_SHOW);
    const allResults = [
      ...(searchResults.pubs?.slice(0, pubsShown) || []).map((item: any) => ({ ...item, type: 'pub' })),
      ...(searchResults.breweries?.slice(0, breweriesShown) || []).map((item: any) => ({ ...item, type: 'brewery' })),
      ...(searchResults.beers?.slice(0, beersShown) || []).map((item: any) => ({ ...item, type: 'beer' }))
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
        navigate(`/${selected.type}/${selected.id}`);
      }
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedIndex(-1);
    onClose();
  };

  const [, navigate] = useLocation();

  const handleResultClick = (type: string, id: number) => {
    saveSearch(searchTerm);
    handleClose();
    navigate(`/${type}/${id}`);
  };

  const popularSuggestions = [
    "IPA", "Lager", "Stout", "Birra artigianale", "Pub Roma", "Birrificio"
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 flex flex-col bg-white dark:bg-[hsl(25,14%,9%)] backdrop-blur-xl border-stone-200 dark:border-[hsl(25,12%,18%)]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="sr-only">Ricerca avanzata</DialogTitle>
          
          {/* Modern Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-5 w-5 text-stone-400 dark:text-stone-400" />
            </div>
            <Input
              ref={inputRef}
              placeholder="Cerca pub, birrifici, birre, utenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-12 py-4 text-base bg-stone-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all duration-200"
              data-testid="input-search"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-muted-foreground dark:hover:text-stone-300 transition-colors"
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

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setFilterGlutenFree(!filterGlutenFree)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
                filterGlutenFree
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-400 dark:border-green-600 shadow-sm'
                  : 'bg-stone-50 dark:bg-gray-800 text-muted-foreground dark:text-stone-400 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
              }`}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5.5 7.5h5v1.5h-5z"/></svg>
              Gluten Free
            </button>
            <button
              onClick={() => setFilterAlcoholFree(!filterAlcoholFree)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
                filterAlcoholFree
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-600 shadow-sm'
                  : 'bg-stone-50 dark:bg-gray-800 text-muted-foreground dark:text-stone-400 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              0.0% Analcolica
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {debouncedSearch.length < 2 ? (
            <div className="p-6 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-stone-300">
                    <Clock className="h-4 w-4" />
                    Ricerche recenti
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchTerm(search)}
                        className="flex items-center gap-3 w-full p-3 text-left hover:bg-stone-50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 group"
                        data-testid={`recent-search-${index}`}
                      >
                        <Clock className="h-4 w-4 text-stone-400 group-hover:text-orange-500 transition-colors" />
                        <span className="flex-1 text-sm text-muted-foreground dark:text-stone-300 group-hover:text-foreground dark:group-hover:text-white">
                          {search}
                        </span>
                        <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-stone-300">
                  <TrendingUp className="h-4 w-4" />
                  Popolari
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSuggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-stone-100 hover:text-orange-800 dark:hover:bg-stone-800/35 dark:hover:text-orange-200 transition-all duration-200"
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
                  <Search className="h-16 w-16 text-stone-300 dark:text-stone-400 mx-auto mb-4" />
                  <Sparkles className="h-6 w-6 text-orange-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-muted-foreground dark:text-stone-400 text-sm leading-relaxed">
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
                <p className="text-muted-foreground dark:text-stone-400 text-sm">
                  Ricerca in corso per "<span className="font-medium text-muted-foreground dark:text-stone-300">{debouncedSearch}</span>"
                </p>
              </div>
              
              {/* Skeleton Loading */}
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                    <div className="h-10 w-10 bg-stone-200 dark:bg-gray-700 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-stone-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-stone-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchResults ? (
            /* Enhanced Results Display */
            <div className="p-6 space-y-6">
              {/* Results count */}
              <div className="text-sm text-muted-foreground dark:text-stone-400">
                {(searchResults.pubs?.length || 0) + (searchResults.breweries?.length || 0) + (searchResults.beers?.length || 0) + (searchResults.users?.length || 0)} risultati per 
                <span className="font-medium text-muted-foreground dark:text-stone-300 ml-1">"{debouncedSearch}"</span>
              </div>

              {/* Pub Results */}
              {searchResults.pubs?.length > 0 && (() => {
                const isExpanded = expandedSections.pubs;
                const visiblePubs = isExpanded ? searchResults.pubs : searchResults.pubs.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.pubs.length > INITIAL_SHOW;
                let baseIndex = 0;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-600" />
                      <h3 className="font-semibold text-foreground dark:text-white">Pub</h3>
                      <Badge variant="outline" className="text-xs">{searchResults.pubs.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {visiblePubs.map((pub: any, index: number) => (
                        <div
                          key={`pub-${pub.id}`}
                          className={`group cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                            selectedIndex === baseIndex + index
                              ? 'bg-stone-50 dark:bg-orange-900/10 border-stone-300 dark:border-stone-600'
                              : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => handleResultClick('pub', pub.id)}
                        >
                          <div className="flex items-center gap-3">
                            <ImageWithFallback
                              src={pub.logoUrl}
                              alt={pub.name}
                              imageType="pub"
                              containerClassName="h-10 w-10 flex-shrink-0 rounded-lg"
                              className="h-10 w-10 object-cover rounded-lg"
                              iconSize="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {pub.name}
                              </div>
                              <div className="text-xs text-muted-foreground dark:text-stone-400 truncate">
                                {pub.city && pub.address ? `${pub.city} • ${pub.address}` : pub.city || pub.address || 'Indirizzo non disponibile'}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => toggleSection('pubs')}
                        className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30"
                      >
                        {isExpanded ? (
                          <>Mostra meno <ChevronUp className="h-4 w-4" /></>
                        ) : (
                          <>Mostra tutti ({searchResults.pubs.length}) <ChevronDown className="h-4 w-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {searchResults.pubs?.length > 0 && (searchResults.breweries?.length > 0 || searchResults.beers?.length > 0) && (
                <Separator className="bg-stone-200 dark:bg-gray-700" />
              )}

              {/* Brewery Results */}
              {searchResults.breweries?.length > 0 && (() => {
                const isExpanded = expandedSections.breweries;
                const visibleBreweries = isExpanded ? searchResults.breweries : searchResults.breweries.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.breweries.length > INITIAL_SHOW;
                const baseIndex = Math.min(searchResults.pubs?.length || 0, expandedSections.pubs ? searchResults.pubs?.length || 0 : INITIAL_SHOW);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-orange-600" />
                      <h3 className="font-semibold text-foreground dark:text-white">Birrifici</h3>
                      <Badge variant="outline" className="text-xs">{searchResults.breweries.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {visibleBreweries.map((brewery: any, index: number) => (
                        <div
                          key={`brewery-${brewery.id}`}
                          className={`group cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                            selectedIndex === baseIndex + index
                              ? 'bg-stone-50 dark:bg-orange-900/10 border-stone-300 dark:border-stone-600'
                              : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => handleResultClick('brewery', brewery.id)}
                        >
                          <div className="flex items-center gap-3">
                            <ImageWithFallback
                              src={brewery.logoUrl}
                              alt={brewery.name}
                              imageType="brewery"
                              containerClassName="h-10 w-10 flex-shrink-0 rounded-full"
                              className="h-10 w-10 object-cover rounded-full"
                              iconSize="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {brewery.name}
                              </div>
                              <div className="text-xs text-muted-foreground dark:text-stone-400 truncate">
                                {brewery.location && brewery.region ? `${brewery.location} • ${brewery.region}` : brewery.location || brewery.region || 'Posizione non disponibile'}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => toggleSection('breweries')}
                        className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30"
                      >
                        {isExpanded ? (
                          <>Mostra meno <ChevronUp className="h-4 w-4" /></>
                        ) : (
                          <>Mostra tutti ({searchResults.breweries.length}) <ChevronDown className="h-4 w-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {searchResults.breweries?.length > 0 && searchResults.beers?.length > 0 && (
                <Separator className="bg-stone-200 dark:bg-gray-700" />
              )}

              {/* Beer Results */}
              {searchResults.beers?.length > 0 && (() => {
                const isExpanded = expandedSections.beers;
                const visibleBeers = isExpanded ? searchResults.beers : searchResults.beers.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.beers.length > INITIAL_SHOW;
                const pubsShownCount = Math.min(searchResults.pubs?.length || 0, expandedSections.pubs ? searchResults.pubs?.length || 0 : INITIAL_SHOW);
                const breweriesShownCount = Math.min(searchResults.breweries?.length || 0, expandedSections.breweries ? searchResults.breweries?.length || 0 : INITIAL_SHOW);
                const baseIndex = pubsShownCount + breweriesShownCount;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Beer className="h-4 w-4 text-orange-600" />
                      <h3 className="font-semibold text-foreground dark:text-white">Birre</h3>
                      <Badge variant="outline" className="text-xs">{searchResults.beers.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {visibleBeers.map((beer: any, index: number) => (
                        <div
                          key={`beer-${beer.id}`}
                          className={`group cursor-pointer p-3 rounded-xl border transition-all duration-200 ${
                            selectedIndex === baseIndex + index
                              ? 'bg-stone-50 dark:bg-orange-900/10 border-stone-300 dark:border-stone-600'
                              : 'bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={() => handleResultClick('beer', beer.id)}
                        >
                          <div className="flex items-center gap-3">
                            <ImageWithFallback
                              src={beer.imageUrl || beer.brewery?.logoUrl}
                              alt={beer.name}
                              imageType="beer"
                              containerClassName="h-10 w-10 flex-shrink-0 rounded-lg"
                              className="h-10 w-10 object-cover rounded-lg"
                              iconSize="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {beer.name}
                              </div>
                              {(beer.brewery?.name || beer.breweryName) && (
                                <div className="text-xs text-muted-foreground dark:text-stone-300 truncate">{beer.brewery?.name || beer.breweryName}</div>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground dark:text-stone-400">
                                  {beer.style && beer.abv ? `${beer.style} • ${beer.abv}%` : beer.style || `${beer.abv}%` || 'Dettagli non disponibili'}
                                </span>
                                {beer.isGlutenFree && (
                                  <GlutenFreeSmallBadge size={11} />
                                )}
                                {beer.isAlcoholFree && (
                                  <AlcoholFreeBadge size={10} />
                                )}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => toggleSection('beers')}
                        className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30"
                      >
                        {isExpanded ? (
                          <>Mostra meno <ChevronUp className="h-4 w-4" /></>
                        ) : (
                          <>Mostra tutti ({searchResults.beers.length}) <ChevronDown className="h-4 w-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* User Results */}
              {searchResults.users?.length > 0 && (() => {
                const isExpanded = expandedSections.users;
                const visibleUsers = isExpanded ? searchResults.users : searchResults.users.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.users.length > INITIAL_SHOW;
                return (
                  <>
                    {(searchResults.pubs?.length > 0 || searchResults.breweries?.length > 0 || searchResults.beers?.length > 0) && (
                      <Separator className="bg-stone-200 dark:bg-gray-700" />
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <h3 className="font-semibold text-foreground dark:text-white">Utenti</h3>
                        <Badge variant="outline" className="text-xs">{searchResults.users.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {visibleUsers.map((u: any) => (
                          <div
                            key={`user-${u.id}`}
                            className="group cursor-pointer p-3 rounded-xl border bg-white/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                            onClick={() => {
                              saveSearch(searchTerm);
                              handleClose();
                              navigate(`/user/${u.nickname ?? u.id}`);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {u.profile_image_url ? (
                                <img
                                  src={u.profile_image_url}
                                  alt={u.nickname ?? `${u.first_name} ${u.last_name}`}
                                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary text-sm font-bold">
                                    {(u.nickname ?? u.first_name ?? "?")[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.nickname}
                                </div>
                                {u.nickname && (
                                  <div className="text-xs text-muted-foreground dark:text-stone-400">@{u.nickname}</div>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={() => toggleSection('users')}
                          className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/30"
                        >
                          {isExpanded ? (
                            <>Mostra meno <ChevronUp className="h-4 w-4" /></>
                          ) : (
                            <>Mostra tutti ({searchResults.users.length}) <ChevronDown className="h-4 w-4" /></>
                          )}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* No Results */}
              {(!searchResults.pubs?.length && !searchResults.breweries?.length && !searchResults.beers?.length && !searchResults.users?.length) && (
                <div className="text-center py-10">
                  <div className="relative inline-block mb-4">
                    <Search className="h-16 w-16 text-stone-300 dark:text-stone-400 mx-auto" />
                    <X className="h-6 w-6 text-red-400 absolute -bottom-1 -right-1" />
                  </div>
                  <p className="text-muted-foreground dark:text-stone-400 text-lg font-medium mb-2">
                    Nessun risultato trovato
                  </p>
                  <p className="text-stone-400 dark:text-stone-400 text-sm mb-5">
                    Prova con termini di ricerca diversi per "<span className="font-medium">{debouncedSearch}</span>"
                  </p>
                  <button
                    onClick={() => { onClose(); setTimeout(() => setAdditionModalOpen(true), 150); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Non la trovi? Suggeriscila
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto mb-3 text-stone-300 dark:text-stone-400" />
              <p className="text-muted-foreground dark:text-stone-400">
                Inizia la tua ricerca...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-border bg-stone-50/40 dark:bg-[hsl(25,14%,8%)]">
          {/* Keyboard shortcuts — desktop only */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-b border-stone-100 dark:border-[hsl(25,12%,14%)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-[hsl(25,12%,14%)] border border-stone-200 dark:border-border rounded shadow-sm">↑</kbd>
                <kbd className="px-2 py-1 bg-white dark:bg-[hsl(25,12%,14%)] border border-stone-200 dark:border-border rounded shadow-sm">↓</kbd>
                <span>naviga</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-[hsl(25,12%,14%)] border border-stone-200 dark:border-border rounded shadow-sm">↵</kbd>
                <span>seleziona</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white dark:bg-[hsl(25,12%,14%)] border border-stone-200 dark:border-border rounded shadow-sm">Esc</kbd>
              <span>chiudi</span>
            </div>
          </div>

          {/* Ricerca Avanzata + Suggerisci — always visible */}
          <div className="px-4 py-3 flex flex-col gap-2">
            <a
              href={debouncedSearch ? `/search?q=${encodeURIComponent(debouncedSearch)}` : "/search"}
              onClick={handleClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white transition-all duration-200 text-sm font-semibold shadow-sm"
            >
              <Search className="h-4 w-4" />
              Ricerca Avanzata
              <ArrowRight className="h-4 w-4" />
            </a>
            {debouncedSearch.length >= 2 && (
              <button
                onClick={() => { onClose(); setTimeout(() => setAdditionModalOpen(true), 150); }}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl border border-stone-200 dark:border-[hsl(25,12%,18%)] text-muted-foreground hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors text-sm"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                Non la trovi? Suggerisci un'aggiunta
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AdditionRequestModal
      open={additionModalOpen}
      onClose={() => setAdditionModalOpen(false)}
      initialBeerName={debouncedSearch}
      defaultTab="beer"
    />
    </>
  );
}