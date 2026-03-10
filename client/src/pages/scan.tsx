import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Scan, Beer, Building2, ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LabelScanner from "@/components/LabelScanner";
import { Link } from "wouter";

interface SearchResult {
  beers: Array<{
    id: number;
    name: string;
    style?: string;
    abv?: string;
    imageUrl?: string;
    breweryName?: string;
  }>;
  breweries: Array<{
    id: number;
    name: string;
    country?: string;
    logoUrl?: string;
    city?: string;
  }>;
}

type ScanState = "camera" | "results" | "notfound";

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [detectedText, setDetectedText] = useState("");
  const [detectedSource, setDetectedSource] = useState<"ocr" | "barcode">("ocr");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`).then(r => r.json()),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const handleScanResult = useCallback((text: string, source: "ocr" | "barcode") => {
    setDetectedText(text);
    setDetectedSource(source);
    setSearchQuery(text);
    setScanState("results");
  }, []);

  const handleCloseScanner = () => {
    navigate("/");
  };

  const handleRescan = () => {
    setScanState("camera");
    setDetectedText("");
    setSearchQuery("");
  };

  const totalResults = (results?.beers?.length ?? 0) + (results?.breweries?.length ?? 0);
  const hasResults = totalResults > 0;

  if (scanState === "camera") {
    return (
      <LabelScanner
        onResult={handleScanResult}
        onClose={handleCloseScanner}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleRescan}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900 dark:text-white text-sm">Risultati Scansione</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {detectedSource === "barcode" ? "📊 Barcode" : "🔍 OCR"}: "{detectedText}"
            </p>
          </div>
          <button
            onClick={handleRescan}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Scan className="h-4 w-4" />
            Riscansiona
          </button>
        </div>

        {/* Search refinement */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Affina la ricerca..."
              className="w-full pl-9 pr-9 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4 pb-28 max-w-xl mx-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Cerco nel catalogo...</p>
          </div>
        )}

        {!isLoading && searchQuery.length >= 2 && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Beer className="h-16 w-16 text-gray-300 dark:text-gray-700" />
            <div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Nessuna birra trovata</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Prova a riscansionare avvicinandoti all'etichetta oppure cerca manualmente.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={handleRescan} className="gap-2">
                <Scan className="h-4 w-4" />
                Riscansiona
              </Button>
              <Button
                className="gap-2 bg-amber-500 hover:bg-amber-600"
                onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
              >
                <Search className="h-4 w-4" />
                Cerca manualmente
              </Button>
            </div>
          </div>
        )}

        {!isLoading && hasResults && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {totalResults} risultat{totalResults === 1 ? "o" : "i"} trovat{totalResults === 1 ? "o" : "i"}
            </p>

            {/* Beers */}
            {results?.beers && results.beers.length > 0 && (
              <section className="mb-6">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  <Beer className="h-4 w-4 text-amber-500" />
                  Birre ({results.beers.length})
                </h2>
                <div className="space-y-2">
                  {results.beers.map(beer => (
                    <Link key={beer.id} href={`/beers/${beer.id}`}>
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-98 transition-transform cursor-pointer hover:border-amber-200 dark:hover:border-amber-900">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {beer.imageUrl ? (
                            <img src={beer.imageUrl} alt={beer.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Beer className="h-6 w-6 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{beer.name}</p>
                          {beer.breweryName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{beer.breweryName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {beer.style && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">{beer.style}</Badge>
                            )}
                            {beer.abv && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{beer.abv}% ABV</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Breweries */}
            {results?.breweries && results.breweries.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Birrifici ({results.breweries.length})
                </h2>
                <div className="space-y-2">
                  {results.breweries.map(brewery => (
                    <Link key={brewery.id} href={`/breweries/${brewery.id}`}>
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-98 transition-transform cursor-pointer hover:border-blue-200 dark:hover:border-blue-900">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {brewery.logoUrl ? (
                            <img src={brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Building2 className="h-6 w-6 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{brewery.name}</p>
                          {(brewery.city || brewery.country) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {[brewery.city, brewery.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!isLoading && searchQuery.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Scan className="h-16 w-16 text-amber-400 opacity-60" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Inserisci almeno 2 caratteri per cercare
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
