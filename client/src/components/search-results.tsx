import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapPin, Beer, Building2, Search, ArrowRight } from "lucide-react";

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
    queryKey: ["/api/search", query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(res => res.json()),
    enabled: query.length > 2,
  });

  if (!query || query.length < 3) return null;

  const container = "absolute top-full right-0 mt-2 z-50 w-[480px] max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-700 overflow-hidden";

  if (isLoading) {
    return (
      <div className={container}>
        <div className="p-6 flex items-center gap-3 text-gray-500 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Ricerca in corso...</span>
        </div>
      </div>
    );
  }

  const hasResults = results && (
    (results.pubs?.length > 0) ||
    (results.breweries?.length > 0) ||
    (results.beers?.length > 0)
  );

  if (!hasResults) {
    return (
      <div className={container}>
        <div className="p-6 text-center">
          <Search className="w-8 h-8 text-gray-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">Nessun risultato per</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">"{query}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className={container}>
      {/* Pub Results */}
      {results.pubs && results.pubs.length > 0 && (
        <section>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Pub & Locali</span>
          </div>
          <ul>
            {results.pubs.slice(0, 4).map((pub) => (
              <li key={`pub-${pub.id}`}>
                <Link href={`/pub/${pub.slug || pub.id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group" onClick={onClose}>
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(pub.logoUrl || pub.coverImageUrl || pub.imageUrl) ? (
                        <img src={pub.logoUrl || pub.coverImageUrl || pub.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <MapPin className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{pub.name}</p>
                      {pub.address && <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{pub.address}</p>}
                    </div>
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">Pub</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Brewery Results */}
      {results.breweries && results.breweries.length > 0 && (
        <section>
          {results.pubs?.length > 0 && <div className="border-t border-gray-100 dark:border-neutral-800 mx-4" />}
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Birrifici</span>
          </div>
          <ul>
            {results.breweries.slice(0, 4).map((brewery) => (
              <li key={`brewery-${brewery.id}`}>
                <Link href={`/brewery/${brewery.id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group" onClick={onClose}>
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      {(brewery.logoUrl || brewery.coverImageUrl) ? (
                        <img src={brewery.logoUrl || brewery.coverImageUrl} alt="" className="w-10 h-10 object-contain p-0.5" />
                      ) : (
                        <Building2 className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{brewery.name}</p>
                      {brewery.location && <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{brewery.location}</p>}
                    </div>
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Birrificio</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Beer Results */}
      {results.beers && results.beers.length > 0 && (
        <section>
          {(results.pubs?.length > 0 || results.breweries?.length > 0) && <div className="border-t border-gray-100 dark:border-neutral-800 mx-4" />}
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">Birre</span>
          </div>
          <ul>
            {results.beers.slice(0, 5).map((beer) => (
              <li key={`beer-${beer.id}`}>
                <Link href={`/beer/${beer.id}`}>
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer group" onClick={onClose}>
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                      {(beer.imageUrl || beer.logoUrl) ? (
                        <img src={beer.imageUrl || beer.logoUrl} alt="" className="w-10 h-10 object-contain p-0.5" />
                      ) : (
                        <Beer className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{beer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                        {beer.brewery?.name || beer.breweryName}
                        {(beer.style || beer.abv) && (
                          <span className="text-gray-400 dark:text-neutral-500">
                            {beer.brewery?.name || beer.breweryName ? " · " : ""}
                            {[beer.style, beer.abv ? `${beer.abv}%` : null].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">Birra</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer link to full search */}
      <div className="border-t border-gray-100 dark:border-neutral-800 px-4 py-2.5">
        <Link href={`/search?q=${encodeURIComponent(query)}`}>
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors cursor-pointer py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-neutral-800" onClick={onClose}>
            <Search className="w-4 h-4" />
            Cerca "{query}" — risultati completi
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
