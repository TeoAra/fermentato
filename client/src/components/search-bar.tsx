import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface SearchResults {
  pubs: any[];
  breweries: any[];
  beers: any[];
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsSearching(true);
      // Handle search results display
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Cerca birre, birrifici o pub..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
      </div>

      {/* Search Results Dropdown */}
      {query.length > 2 && searchResults && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto z-50">
          {searchResults.pubs?.length > 0 && (
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Pub</h4>
              {searchResults.pubs.slice(0, 3).map((pub: any) => (
                <div key={pub.id} className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="font-medium">{pub.name}</div>
                  <div className="text-sm text-gray-600">{pub.address}, {pub.city}</div>
                </div>
              ))}
            </div>
          )}

          {searchResults.breweries?.length > 0 && (
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Birrifici</h4>
              {searchResults.breweries.slice(0, 3).map((brewery: any) => (
                <div key={brewery.id} className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="font-medium">{brewery.name}</div>
                  <div className="text-sm text-gray-600">{brewery.location}, {brewery.region}</div>
                </div>
              ))}
            </div>
          )}

          {searchResults.beers?.length > 0 && (
            <div className="p-3">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Birre</h4>
              {searchResults.beers.slice(0, 3).map((beer: any) => (
                <div key={beer.id} className="py-2 px-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="font-medium">{beer.name}</div>
                  <div className="text-sm text-gray-600">{beer.style} - {beer.abv}% ABV</div>
                </div>
              ))}
            </div>
          )}

          {(!searchResults.pubs?.length && !searchResults.breweries?.length && !searchResults.beers?.length) && (
            <div className="p-4 text-center text-gray-500">
              Nessun risultato trovato per "{query}"
            </div>
          )}
        </div>
      )}
    </form>
  );
}
