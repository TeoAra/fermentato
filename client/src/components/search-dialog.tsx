import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, MapPin, Building, Beer, Clock, ArrowRight, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import ImageWithFallback from "@/components/image-with-fallback";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_RECENT = 3;
const INITIAL_SHOW = 5;

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [filterGlutenFree, setFilterGlutenFree] = useState(false);
  const [filterAlcoholFree, setFilterAlcoholFree] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const toggleSection = (section: string) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, MAX_RECENT));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setSelectedIndex(-1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setSearchTerm("");
      setDebouncedSearch("");
      setSelectedIndex(-1);
      setExpandedSections({});
    }
  }, [isOpen]);

  const saveSearch = (term: string) => {
    if (!term.trim()) return;
    const deduped = [term.trim(), ...recentSearches.filter(s => s !== term.trim())].slice(0, MAX_RECENT);
    setRecentSearches(deduped);
    localStorage.setItem("recentSearches", JSON.stringify(deduped));
  };

  const removeSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedSearch, filterGlutenFree, filterAlcoholFree],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return null;
      const params = new URLSearchParams({ q: debouncedSearch });
      if (filterGlutenFree) params.set("glutenFree", "true");
      if (filterAlcoholFree) params.set("alcoholFree", "true");
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const handleClose = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedIndex(-1);
    onClose();
  };

  const handleResultClick = (type: string, id: number) => {
    saveSearch(searchTerm);
    handleClose();
    navigate(`/${type}/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults) return;
    const pubsShown = expandedSections.pubs ? searchResults.pubs?.length || 0 : Math.min(searchResults.pubs?.length || 0, INITIAL_SHOW);
    const breweriesShown = expandedSections.breweries ? searchResults.breweries?.length || 0 : Math.min(searchResults.breweries?.length || 0, INITIAL_SHOW);
    const beersShown = expandedSections.beers ? searchResults.beers?.length || 0 : Math.min(searchResults.beers?.length || 0, INITIAL_SHOW);
    const all = [
      ...(searchResults.pubs?.slice(0, pubsShown) || []).map((i: any) => ({ ...i, type: "pub" })),
      ...(searchResults.breweries?.slice(0, breweriesShown) || []).map((i: any) => ({ ...i, type: "brewery" })),
      ...(searchResults.beers?.slice(0, beersShown) || []).map((i: any) => ({ ...i, type: "beer" })),
    ];
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, all.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && selectedIndex >= 0) {
      const sel = all[selectedIndex];
      if (sel) { saveSearch(searchTerm); handleClose(); navigate(`/${sel.type}/${sel.id}`); }
    } else if (e.key === "Escape") { handleClose(); }
  };

  if (!isOpen) return null;

  const totalResults = (searchResults?.pubs?.length || 0) + (searchResults?.breweries?.length || 0) + (searchResults?.beers?.length || 0) + (searchResults?.users?.length || 0);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel — floating card with lateral margins, rounded on all sides */}
      <div
        className="relative z-10 w-full max-w-lg mx-3 mt-2 rounded-2xl shadow-2xl flex flex-col bg-white dark:bg-[#0B0D10] overflow-hidden"
        style={{ maxHeight: 'calc(min(88dvh, 680px) - env(safe-area-inset-top))' }}
      >
        {/* ── Search bar ── */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-stone-100 dark:border-white/[0.06]">
          {/* Pill input */}
          <div className="flex-1 flex items-center gap-2 bg-stone-100 dark:bg-[#1A1D24] rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 text-stone-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Cerca pub, birrifici, birre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-[15px] text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none min-w-0"
              data-testid="input-search"
            />
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />}
            {!isLoading && searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="h-4.5 w-4.5 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Circular close button */}
          <button
            onClick={handleClose}
            className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-stone-100 dark:bg-[#1A1D24] text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#12151A] active:scale-95 transition-all"
            aria-label="Chiudi ricerca"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 dark:border-white/[0.06]">
          <button
            onClick={() => setFilterGlutenFree(!filterGlutenFree)}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${
              filterGlutenFree
                ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-400 dark:border-green-600"
                : "border-stone-200 dark:border-[#23262E] text-stone-500 dark:text-stone-400 hover:border-green-300"
            }`}
          >
            Gluten Free
          </button>
          <button
            onClick={() => setFilterAlcoholFree(!filterAlcoholFree)}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${
              filterAlcoholFree
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-400 dark:border-blue-600"
                : "border-stone-200 dark:border-[#23262E] text-stone-500 dark:text-stone-400 hover:border-blue-300"
            }`}
          >
            Analcolica
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>

          {/* Empty state — just recent searches */}
          {debouncedSearch.length < 2 && (
            <div className="px-4 py-3">
              {recentSearches.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1.5">Recenti</p>
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchTerm(s)}
                      className="flex items-center gap-3 w-full py-2.5 text-left group"
                    >
                      <Clock className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                      <span className="flex-1 text-sm text-stone-700 dark:text-stone-300">{s}</span>
                      <span
                        role="button"
                        onClick={e => removeSearch(s, e as any)}
                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-opacity p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Inizia a digitare per cercare</p>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {debouncedSearch.length >= 2 && isLoading && (
            <div className="px-4 py-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 bg-stone-200 dark:bg-[#12151A] rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-stone-200 dark:bg-[#12151A] rounded w-3/4" />
                    <div className="h-3 bg-stone-100 dark:bg-[#1A1D24] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && searchResults && (
            <div className="pb-4">
              <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {totalResults} risultati
              </p>

              {/* Pub */}
              {searchResults.pubs?.length > 0 && (() => {
                const expanded = expandedSections.pubs;
                const visible = expanded ? searchResults.pubs : searchResults.pubs.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.pubs.length > INITIAL_SHOW;
                const base = 0;
                return (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Pub</span>
                    </div>
                    {visible.map((pub: any, i: number) => (
                      <button
                        key={`pub-${pub.id}`}
                        onClick={() => handleResultClick("pub", pub.id)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === base + i ? "bg-stone-50 dark:bg-white/5" : "hover:bg-stone-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <ImageWithFallback src={pub.logoUrl} alt={pub.name} imageType="pub"
                          containerClassName="h-9 w-9 flex-shrink-0 rounded-lg"
                          className="h-9 w-9 object-cover rounded-lg" iconSize="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-900 dark:text-white truncate">{pub.name}</div>
                          <div className="text-xs text-stone-400 truncate">
                            {pub.city && pub.address ? `${pub.city} · ${pub.address}` : pub.city || pub.address || ""}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                      </button>
                    ))}
                    {hasMore && (
                      <button onClick={() => toggleSection("pubs")}
                        className="flex items-center gap-1 px-4 py-2 text-xs text-primary font-medium">
                        {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Meno</> : <><ChevronDown className="h-3.5 w-3.5" /> Altri {searchResults.pubs.length - INITIAL_SHOW}</>}
                      </button>
                    )}
                    {(searchResults.breweries?.length > 0 || searchResults.beers?.length > 0) && (
                      <Separator className="mx-4 my-1 bg-stone-100 dark:bg-white/[0.06]" />
                    )}
                  </div>
                );
              })()}

              {/* Birrifici */}
              {searchResults.breweries?.length > 0 && (() => {
                const expanded = expandedSections.breweries;
                const visible = expanded ? searchResults.breweries : searchResults.breweries.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.breweries.length > INITIAL_SHOW;
                const base = Math.min(searchResults.pubs?.length || 0, expandedSections.pubs ? searchResults.pubs?.length || 0 : INITIAL_SHOW);
                return (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                      <Building className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Birrifici</span>
                    </div>
                    {visible.map((b: any, i: number) => (
                      <button
                        key={`brewery-${b.id}`}
                        onClick={() => handleResultClick("brewery", b.id)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === base + i ? "bg-stone-50 dark:bg-white/5" : "hover:bg-stone-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <ImageWithFallback src={b.logoUrl} alt={b.name} imageType="brewery"
                          containerClassName="h-9 w-9 flex-shrink-0 rounded-full"
                          className="h-9 w-9 object-cover rounded-full" iconSize="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-900 dark:text-white truncate">{b.name}</div>
                          <div className="text-xs text-stone-400 truncate">
                            {b.location && b.region ? `${b.location} · ${b.region}` : b.location || b.region || ""}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                      </button>
                    ))}
                    {hasMore && (
                      <button onClick={() => toggleSection("breweries")}
                        className="flex items-center gap-1 px-4 py-2 text-xs text-primary font-medium">
                        {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Meno</> : <><ChevronDown className="h-3.5 w-3.5" /> Altri {searchResults.breweries.length - INITIAL_SHOW}</>}
                      </button>
                    )}
                    {searchResults.beers?.length > 0 && (
                      <Separator className="mx-4 my-1 bg-stone-100 dark:bg-white/[0.06]" />
                    )}
                  </div>
                );
              })()}

              {/* Birre */}
              {searchResults.beers?.length > 0 && (() => {
                const expanded = expandedSections.beers;
                const visible = expanded ? searchResults.beers : searchResults.beers.slice(0, INITIAL_SHOW);
                const hasMore = searchResults.beers.length > INITIAL_SHOW;
                const pubsBase = Math.min(searchResults.pubs?.length || 0, expandedSections.pubs ? searchResults.pubs?.length || 0 : INITIAL_SHOW);
                const brewBase = Math.min(searchResults.breweries?.length || 0, expandedSections.breweries ? searchResults.breweries?.length || 0 : INITIAL_SHOW);
                const base = pubsBase + brewBase;
                return (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                      <Beer className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Birre</span>
                    </div>
                    {visible.map((beer: any, i: number) => (
                      <button
                        key={`beer-${beer.id}`}
                        onClick={() => handleResultClick("beer", beer.id)}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === base + i ? "bg-stone-50 dark:bg-white/5" : "hover:bg-stone-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <ImageWithFallback
                          src={beer.imageUrl || beer.brewery?.logoUrl} alt={beer.name} imageType="beer"
                          containerClassName="h-9 w-9 flex-shrink-0 rounded-lg"
                          className="h-9 w-9 object-cover rounded-lg" iconSize="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium text-stone-900 dark:text-white truncate">{beer.name}</span>
                            {beer.isGlutenFree && <GlutenFreeSmallBadge />}
                            {beer.isAlcoholFree && <AlcoholFreeBadge />}
                          </div>
                          <div className="text-xs text-stone-400 truncate">
                            {[beer.style, beer.brewery?.name].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                      </button>
                    ))}
                    {hasMore && (
                      <button onClick={() => toggleSection("beers")}
                        className="flex items-center gap-1 px-4 py-2 text-xs text-primary font-medium">
                        {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Meno</> : <><ChevronDown className="h-3.5 w-3.5" /> Altri {searchResults.beers.length - INITIAL_SHOW}</>}
                      </button>
                    )}
                    {searchResults.users?.length > 0 && (
                      <Separator className="mx-4 my-1 bg-stone-100 dark:bg-white/[0.06]" />
                    )}
                  </div>
                );
              })()}

              {/* Utenti */}
              {searchResults.users?.length > 0 && (() => {
                const base = Math.min(searchResults.pubs?.length || 0, INITIAL_SHOW) + Math.min(searchResults.breweries?.length || 0, INITIAL_SHOW) + Math.min(searchResults.beers?.length || 0, INITIAL_SHOW);
                return (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Utenti</span>
                    </div>
                    {searchResults.users.map((u: any, i: number) => (
                      <button
                        key={`user-${u.id}`}
                        onClick={() => { handleClose(); navigate(`/user/${u.nickname}`); }}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === base + i ? "bg-stone-50 dark:bg-white/5" : "hover:bg-stone-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="h-9 w-9 rounded-full bg-stone-200 dark:bg-[#12151A] flex-shrink-0 overflow-hidden">
                          {u.profileImageUrl
                            ? <img src={u.profileImageUrl} alt={u.nickname} className="h-9 w-9 object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-stone-500">
                                {u.nickname?.[0]?.toUpperCase()}
                              </div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-900 dark:text-white truncate">@{u.nickname}</div>
                          {u.firstName && <div className="text-xs text-stone-400 truncate">{u.firstName} {u.lastName}</div>}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* No results */}
              {totalResults === 0 && (
                <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-10">
                  Nessun risultato per "{debouncedSearch}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
