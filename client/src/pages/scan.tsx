import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Scan, Beer, Building2, ArrowLeft, Search, X, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LabelScanner from "@/components/LabelScanner";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface BeerResult {
  id: number;
  name: string;
  style?: string;
  abv?: string;
  imageUrl?: string;
  breweryName?: string;
}

interface BreweryResult {
  id: number;
  name: string;
  country?: string;
  logoUrl?: string;
  city?: string;
}

interface SearchResult {
  beers: BeerResult[];
  breweries: BreweryResult[];
}

type ScanState = "camera" | "searching" | "results" | "notfound";

// Build a ranked list of queries from OCR text:
// 1. Full text
// 2. First 3 significant words
// 3. First 2 words
// 4. First word only (if length ≥ 4)
function buildQueryList(text: string): string[] {
  const words = text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !/^\d+$/.test(w)); // exclude pure numbers

  const queries: string[] = [];
  const add = (q: string) => { if (q.length >= 2 && !queries.includes(q)) queries.push(q); };

  add(words.join(" ")); // full
  if (words.length > 3) add(words.slice(0, 3).join(" "));
  if (words.length > 2) add(words.slice(0, 2).join(" "));
  if (words[0] && words[0].length >= 3) add(words[0]);

  return queries;
}

async function searchWithFallback(text: string): Promise<{
  beers: BeerResult[];
  breweries: BreweryResult[];
  usedQuery: string;
}> {
  const queries = buildQueryList(text);

  for (const q of queries) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`);
    if (!res.ok) continue;
    const data: SearchResult = await res.json();
    const total = (data.beers?.length ?? 0) + (data.breweries?.length ?? 0);
    if (total > 0) {
      return { beers: data.beers ?? [], breweries: data.breweries ?? [], usedQuery: q };
    }
  }
  return { beers: [], breweries: [], usedQuery: queries[0] ?? text };
}

export default function ScanPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [detectedText, setDetectedText] = useState("");
  const [detectedSource, setDetectedSource] = useState<"ocr" | "barcode">("ocr");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualQuery, setManualQuery] = useState("");

  const [beers, setBeers] = useState<BeerResult[]>([]);
  const [breweries, setBreweries] = useState<BreweryResult[]>([]);
  const [usedQuery, setUsedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;
    setIsSearching(true);
    setScanState("searching");
    try {
      const { beers: b, breweries: br, usedQuery: uq } = await searchWithFallback(query.trim());
      setBeers(b);
      setBreweries(br);
      setUsedQuery(uq);
      setScanState(b.length + br.length > 0 ? "results" : "notfound");
    } catch {
      setScanState("notfound");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleScanResult = useCallback((text: string, source: "ocr" | "barcode") => {
    setDetectedText(text);
    setDetectedSource(source);
    setSearchQuery(text);
    setManualQuery(text);
    runSearch(text);
  }, [runSearch]);

  // Re-run search when manual query changes (debounced)
  useEffect(() => {
    if (manualQuery === searchQuery) return;
    const t = setTimeout(() => runSearch(manualQuery), 600);
    return () => clearTimeout(t);
  }, [manualQuery]);

  const handleRescan = () => {
    setScanState("camera");
    setDetectedText("");
    setSearchQuery("");
    setManualQuery("");
    setBeers([]);
    setBreweries([]);
  };

  const handleCloseScanner = () => navigate("/");

  const totalResults = beers.length + breweries.length;

  // Auth gate — show spinner while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not logged in → invite to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Accesso riservato
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Lo scanner etichette è disponibile solo per gli utenti registrati. Crea un account gratuito per iniziare.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a href="/api/login">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 gap-2">
              <LogIn className="h-4 w-4" />
              Accedi o registrati
            </Button>
          </a>
          <Link href="/">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna alla home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Logged in but onboarding not complete → invite to finish setup
  if ((user as any)?.needsOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Completa la registrazione
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Devi completare la configurazione del tuo account per accedere allo scanner etichette.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/onboarding">
            <Button className="w-full bg-amber-500 hover:bg-amber-600">
              Completa la registrazione
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna alla home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (scanState === "camera") {
    return <LabelScanner onResult={handleScanResult} onClose={handleCloseScanner} />;
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
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 dark:text-white text-sm">Risultati Scansione</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {detectedSource === "barcode" ? "📊 Barcode" : "🔍 OCR"}: "{detectedText}"
            </p>
          </div>
          <button
            onClick={handleRescan}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors shrink-0"
          >
            <Scan className="h-4 w-4" />
            Riscan
          </button>
        </div>

        {/* Manual refinement bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={manualQuery}
              onChange={e => setManualQuery(e.target.value)}
              placeholder="Affina la ricerca..."
              className="w-full pl-9 pr-9 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {manualQuery && (
              <button
                onClick={() => setManualQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {usedQuery && usedQuery !== manualQuery && scanState === "results" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 pl-1">
              Trovato cercando: "{usedQuery}"
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 pb-28 max-w-xl mx-auto">

        {/* Searching spinner */}
        {(scanState === "searching" || isSearching) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Cerco nel catalogo...</p>
          </div>
        )}

        {/* No results */}
        {scanState === "notfound" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Beer className="h-16 w-16 text-gray-300 dark:text-gray-700" />
            <div>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Nessuna birra trovata</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Prova a riscansionare avvicinandoti oppure modifica il testo qui sopra.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={handleRescan} className="gap-2">
                <Scan className="h-4 w-4" />
                Riscansiona
              </Button>
              <Button
                className="gap-2 bg-amber-500 hover:bg-amber-600"
                onClick={() => navigate(`/search?q=${encodeURIComponent(manualQuery)}`)}
              >
                <Search className="h-4 w-4" />
                Cerca avanzata
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {scanState === "results" && !isSearching && totalResults > 0 && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {totalResults} risultat{totalResults === 1 ? "o" : "i"} trovat{totalResults === 1 ? "o" : "i"}
            </p>

            {/* Beers */}
            {beers.length > 0 && (
              <section className="mb-6">
                <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  <Beer className="h-3.5 w-3.5 text-amber-500" />
                  Birre ({beers.length})
                </h2>
                <div className="space-y-2">
                  {beers.map(beer => (
                    <Link key={beer.id} href={`/beer/${beer.id}`}>
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform cursor-pointer hover:border-amber-200 dark:hover:border-amber-900">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden shrink-0">
                          {beer.imageUrl ? (
                            <img src={beer.imageUrl} alt={beer.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Beer className="h-6 w-6 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{beer.name}</p>
                          {beer.breweryName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{beer.breweryName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            {breweries.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  Birrifici ({breweries.length})
                </h2>
                <div className="space-y-2">
                  {breweries.map(brewery => (
                    <Link key={brewery.id} href={`/brewery/${brewery.id}`}>
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform cursor-pointer hover:border-blue-200 dark:hover:border-blue-900">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center overflow-hidden shrink-0">
                          {brewery.logoUrl ? (
                            <img src={brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Building2 className="h-6 w-6 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{brewery.name}</p>
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
      </div>
    </div>
  );
}
