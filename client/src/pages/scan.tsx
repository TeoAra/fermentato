import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Scan, Beer, Building2, ArrowLeft, Search, X, Lock, LogIn, PlusCircle, History, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LabelScanner from "@/components/LabelScanner";
import AdditionRequestModal from "@/components/AdditionRequestModal";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ImageSearchResult {
  id: number;
  name: string;
  style?: string;
  abv?: string;
  logoUrl?: string;
  imageUrl?: string;
  breweryId?: number;
  breweryName?: string;
  breweryLogoUrl?: string;
  similarity: number;
}

interface BeerResult {
  id: number;
  name: string;
  style?: string;
  abv?: string;
  imageUrl?: string;
  breweryName?: string;
  memoryMatch?: boolean;
  memorySimilarity?: number;
  memoryConfirmCount?: number;
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

// Italian/English stop words to exclude from scan search
const STOP_WORDS = new Set([
  "birra","beer","bianca","rossa","scura","chiara","artigianale","craft","italiana","italiana",
  "birrificio","brewery","brewing","birreria","brasserie","brasseria",
  "il","lo","la","le","gli","di","da","del","della","dei","degli","dello",
  "un","una","delle","con","per","nel","nella","al","alla","ai","agli",
  "in","su","se","ma","ed","et","and","the","of","by","from","ale","lager",
  "ipa","apa","aba","aab","vol","abv","alc","cl","ml","lt","kg","bott",
  "bottiglia","lattina","fusto","spina","fresca","fredda","new","old",
  "original","classic","special","premium","gold","silver","red","white","black","blue",
  "rosso","verde","blu","giallo","nero","bianco","dorata","dorato",
]);

// Build a ranked list of queries from OCR text — multi-strategy fallback:
// 1. All significant words joined
// 2. Top 3 longest words (most distinctive)
// 3. First 3 significant words
// 4. Top 2 longest words
// 5. First 2 words
// 6. Every individual word >= 5 chars
// 7. Every individual word >= 4 chars
function buildQueryList(text: string): string[] {
  const rawWords = text
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length >= 3 && !/^\d+(\.\d+)?$/.test(w)); // exclude pure numbers/decimals

  // Remove stop words for "smart" queries
  const meaningful = rawWords.filter(w => !STOP_WORDS.has(w));
  // Sort by length descending (longer = more distinctive)
  const byLength = [...meaningful].sort((a, b) => b.length - a.length);

  const queries: string[] = [];
  const add = (q: string) => {
    const c = q.trim();
    if (c.length >= 3 && !queries.includes(c)) queries.push(c);
  };

  // Strategy 1: all meaningful words
  if (meaningful.length > 0) add(meaningful.join(" "));
  // Strategy 2: top 3 longest distinctive words
  if (byLength.length >= 3) add(byLength.slice(0, 3).join(" "));
  // Strategy 3: first 3 meaningful words (order-sensitive)
  if (meaningful.length >= 3) add(meaningful.slice(0, 3).join(" "));
  // Strategy 4: top 2 longest
  if (byLength.length >= 2) add(byLength.slice(0, 2).join(" "));
  // Strategy 5: first 2 meaningful words
  if (meaningful.length >= 2) add(meaningful.slice(0, 2).join(" "));
  // Strategy 6: each distinctive word >= 5 chars individually
  byLength.filter(w => w.length >= 5).forEach(w => add(w));
  // Strategy 7: each word >= 4 chars
  byLength.filter(w => w.length >= 4).forEach(w => add(w));
  // Strategy 8: fallback with raw words if meaningful list empty
  if (queries.length === 0) {
    rawWords.forEach(w => add(w));
  }

  return queries;
}

async function searchWithFallback(text: string): Promise<{
  beers: BeerResult[];
  breweries: BreweryResult[];
  usedQuery: string;
  memoryMatch?: boolean;
}> {
  // ── Strategy 1: dedicated OR-based scan search endpoint ──────────────────
  // Sends the full OCR text, server extracts words and uses LIKE ANY (OR logic)
  // so ANY meaningful word matching is enough to surface a result.
  // The server also checks scan memory (pg_trgm) for confirmed past matches.
  try {
    const res = await fetch("/api/scan/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const beers: BeerResult[] = (data.beers ?? []).map((b: any) => ({
        id: b.id, name: b.name, style: b.style, abv: b.abv,
        imageUrl: b.imageUrl, breweryName: b.breweryName,
        memoryMatch: b.memoryMatch ?? false,
        memorySimilarity: b.memorySimilarity,
        memoryConfirmCount: b.memoryConfirmCount,
      }));
      const breweries: BreweryResult[] = data.breweries ?? [];
      if (beers.length + breweries.length > 0) {
        return { beers, breweries, usedQuery: text, memoryMatch: data.memoryMatch ?? false };
      }
    }
  } catch { /* fall through to legacy */ }

  // ── Strategy 2: legacy AND-based fallback with progressively shorter queries ─
  const queries = buildQueryList(text);
  for (const q of queries) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`);
      if (!res.ok) continue;
      const data: SearchResult = await res.json();
      const total = (data.beers?.length ?? 0) + (data.breweries?.length ?? 0);
      if (total > 0) {
        const beers = (data.beers ?? []).map((b: any) => ({
          ...b,
          breweryName: b.breweryName || b.brewery?.name || null,
        }));
        return { beers, breweries: data.breweries ?? [], usedQuery: q };
      }
    } catch { continue; }
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
  const [additionModalOpen, setAdditionModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [imageSimilarResults, setImageSimilarResults] = useState<ImageSearchResult[]>([]);
  const [isImageSearching, setIsImageSearching] = useState(false);

  // Scan log tracking
  const currentImageRef = useRef<string | undefined>(undefined);
  const currentEngineRef = useRef<string | undefined>(undefined);
  const currentOcrTextRef = useRef<string>("");
  const currentLogIdRef = useRef<number | null>(null);

  // Barcode data from Open Food Facts (set when barcode detected)
  const pendingEanRef = useRef<string | null>(null);
  const pendingOffImageUrlRef = useRef<string | null>(null);

  const createScanLog = useCallback(async (
    ocrText: string,
    source: string,
    usedQ: string,
    candidates: Array<{id: number; name: string; type: string}>,
    latency: number,
  ) => {
    try {
      const res = await fetch("/api/scan-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ocrText,
          ocrEngine: currentEngineRef.current,
          source,
          usedQuery: usedQ,
          topCandidates: candidates,
          latencyMs: latency,
          imageDataUrl: currentImageRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        currentLogIdRef.current = data.id;
      }
    } catch { /* fire-and-forget, ignore errors */ }
  }, []);

  const [confirmedBeerIds, setConfirmedBeerIds] = useState<Set<number>>(new Set());

  // Fallback search panel (shown when beer not found in scan results)
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [fallbackQuery, setFallbackQuery] = useState("");
  const [fallbackResults, setFallbackResults] = useState<BeerResult[]>([]);
  const [isFallbackSearching, setIsFallbackSearching] = useState(false);
  const [manualConfirmedBeer, setManualConfirmedBeer] = useState<BeerResult | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFallbackQueryChange = useCallback((q: string) => {
    setFallbackQuery(q);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (q.trim().length < 2) { setFallbackResults([]); return; }
    fallbackTimerRef.current = setTimeout(async () => {
      setIsFallbackSearching(true);
      try {
        const res = await fetch(`/api/beers/search?q=${encodeURIComponent(q.trim())}&limit=20`);
        if (res.ok) setFallbackResults(await res.json());
      } catch { /* ignore */ }
      setIsFallbackSearching(false);
    }, 300);
  }, []);

  const saveFeedback = useCallback(async (chosenBeerId?: number, chosenBreweryId?: number, wasCorrect?: boolean) => {
    const logId = currentLogIdRef.current;
    if (!logId) return;
    try {
      await fetch(`/api/scan-logs/${logId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chosenBeerId, chosenBreweryId, wasCorrect }),
      });
    } catch { /* ignore */ }
  }, []);

  const enrichBarcodeData = useCallback(async (beerId: number) => {
    const ean = pendingEanRef.current;
    const offImageUrl = pendingOffImageUrlRef.current;
    if (!ean && !offImageUrl) return;
    try {
      await fetch(`/api/beers/${beerId}/enrich-barcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ barcode: ean, offImageUrl }),
      });
    } catch { /* fire-and-forget */ }
  }, []);

  const confirmManualBeer = useCallback(async (beer: BeerResult) => {
    setManualConfirmedBeer(beer);
    setShowManualSearch(false);
    setFallbackQuery("");
    setFallbackResults([]);
    await saveFeedback(beer.id, undefined, true);
  }, [saveFeedback]);

  const runSearch = useCallback(async (query: string, source?: string) => {
    if (query.trim().length < 2) return;
    // Reset fallback search on new scan
    setShowManualSearch(false);
    setManualConfirmedBeer(null);
    setFallbackQuery("");
    setFallbackResults([]);
    setConfirmedBeerIds(new Set());
    setIsSearching(true);
    setScanState("searching");
    const t0 = Date.now();
    try {
      const { beers: b, breweries: br, usedQuery: uq, memoryMatch } = await searchWithFallback(query.trim());
      const latency = Date.now() - t0;

      // Fire-and-forget scan log
      const candidates = [
        ...b.slice(0, 5).map(x => ({ id: x.id, name: x.name, type: "beer" })),
        ...br.slice(0, 3).map(x => ({ id: x.id, name: x.name, type: "brewery" })),
      ];
      createScanLog(currentOcrTextRef.current, source || detectedSource, uq, candidates, latency);

      // ── Auto-redirect: single unambiguous result ─────────────────────────
      // If there's exactly 1 beer (no breweries), jump directly to its page.
      // Memory matches (confirmed past scans) also trigger immediate redirect.
      const isHighConfidence = (b.length === 1 && br.length === 0) || (memoryMatch === true && b.length >= 1);
      if (isHighConfidence) {
        const beer = b[0];
        // Save context to sessionStorage so beer-detail can show "Non è questa?" banner
        sessionStorage.setItem("scan_redirect", JSON.stringify({
          beerId: beer.id,
          beerName: beer.name,
          breweryName: beer.breweryName || "",
          query: query.trim(),
          ocrText: currentOcrTextRef.current,
          memoryMatch: beer.memoryMatch ?? false,
          memorySimilarity: beer.memorySimilarity,
        }));
        // Save feedback asynchronously (logId set after createScanLog resolves)
        setTimeout(() => {
          if (currentLogIdRef.current) {
            saveFeedback(beer.id);
          }
        }, 1500);
        navigate(`/beer/${beer.id}?from=scan`);
        return;
      }

      setBeers(b);
      setBreweries(br);
      setUsedQuery(uq);
      const found = b.length + br.length > 0;
      setScanState(found ? "results" : "notfound");
    } catch {
      setScanState("notfound");
    } finally {
      setIsSearching(false);
    }
  }, [detectedSource, createScanLog, navigate, saveFeedback]);

  const runImageSearch = useCallback(async (imageDataUrl: string) => {
    setIsImageSearching(true);
    try {
      const res = await fetch("/api/scan/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: imageDataUrl, limit: 5 }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.available && data.results?.length > 0) {
        const filtered = (data.results as ImageSearchResult[]).filter(r => r.similarity >= 0.60);
        setImageSimilarResults(filtered);

        // ── Auto-redirect on high-confidence CLIP match ──────────────────────
        // If the top result is clearly dominant (>82%) and the text search
        // hasn't already redirected us, navigate directly to that beer.
        const top = filtered[0];
        const second = filtered[1];
        const isHighConf = top && top.similarity >= 0.82 && (!second || top.similarity - second.similarity >= 0.07);
        if (isHighConf) {
          // Save feedback in background
          setTimeout(() => {
            if (currentLogIdRef.current) saveFeedback(top.id, undefined, true);
          }, 800);
          navigate(`/beer/${top.id}?from=scan`);
        }
      }
    } catch { /* service not available, ignore silently */ }
    finally { setIsImageSearching(false); }
  }, [navigate, saveFeedback]);

  // ── Retry from "Non è questa?" banner ─────────────────────────────────────
  // If the user rejected a scan redirect and came back, restore the previous search
  // and immediately open the manual search panel so they can type the correct name.
  useEffect(() => {
    const raw = sessionStorage.getItem("scan_retry");
    if (!raw) return;
    sessionStorage.removeItem("scan_retry");
    try {
      const { query, ocrText } = JSON.parse(raw);
      if (query) {
        const q = query as string;
        const ocr = (ocrText || q) as string;
        currentOcrTextRef.current = ocr;
        setDetectedText(ocr);
        setSearchQuery(q);
        setManualQuery(q);
        // Auto-open the manual search panel so the user can immediately
        // type the correct beer name without extra taps.
        setShowManualSearch(true);
        setFallbackQuery(q);
        // Kick off fallback search with the same query
        handleFallbackQueryChange(q);
        runSearch(q, "retry");
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBarcodeFound = useCallback((ean: string, offImageUrl: string | null) => {
    pendingEanRef.current = ean;
    pendingOffImageUrlRef.current = offImageUrl;
  }, []);

  const handleScanResult = useCallback((text: string, source: "ocr" | "barcode", imageDataUrl?: string, engine?: string) => {
    currentImageRef.current = imageDataUrl;
    currentEngineRef.current = engine;
    currentOcrTextRef.current = text;
    currentLogIdRef.current = null;
    if (source !== "barcode") {
      pendingEanRef.current = null;
      pendingOffImageUrlRef.current = null;
    }
    setDetectedText(text);
    setDetectedSource(source);
    setSearchQuery(text);
    setManualQuery(text);
    setImageSimilarResults([]);
    runSearch(text, source);
    if (imageDataUrl) runImageSearch(imageDataUrl);
  }, [runSearch, runImageSearch]);

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
    setImageSimilarResults([]);
  };

  const handleCloseScanner = () => navigate("/");

  const totalResults = beers.length + breweries.length;

  // Auth gate — show spinner while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not logged in → invite to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
            Accesso riservato
          </h2>
          <p className="text-muted-foreground dark:text-stone-400 max-w-sm">
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
      <div className="min-h-screen bg-stone-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
            Completa la registrazione
          </h2>
          <p className="text-muted-foreground dark:text-stone-400 max-w-sm">
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
    return <LabelScanner onResult={handleScanResult} onClose={handleCloseScanner} onBarcodeFound={handleBarcodeFound} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-b border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleRescan}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-[#1B2735] transition-colors text-muted-foreground dark:text-stone-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-foreground dark:text-white text-sm">Risultati Scansione</h1>
              <span className="bg-primary/10 text-primary text-[9px] font-black px-1.5 py-[2px] rounded-full leading-none tracking-wide uppercase border border-primary/20">Beta</span>
            </div>
            <p className="text-xs text-muted-foreground dark:text-stone-400 truncate">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={manualQuery}
              onChange={e => setManualQuery(e.target.value)}
              placeholder="Affina la ricerca..."
              className="w-full pl-9 pr-9 py-2.5 bg-stone-100 dark:bg-[#1B2735] rounded-xl text-sm text-foreground dark:text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {manualQuery && (
              <button
                onClick={() => setManualQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-muted-foreground"
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
            <p className="text-muted-foreground dark:text-stone-400 text-sm">Cerco nel catalogo...</p>
          </div>
        )}

        {/* No results */}
        {scanState === "notfound" && !isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Beer className="h-16 w-16 text-stone-300 dark:text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground dark:text-stone-300">Nessuna birra trovata</p>
              <p className="text-sm text-muted-foreground dark:text-stone-400 mt-1">
                Prova a riscansionare avvicinandoti oppure modifica il testo qui sopra.
              </p>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              <Button variant="outline" onClick={handleRescan} className="gap-2">
                <Scan className="h-4 w-4" />
                Riscansiona
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/search?q=${encodeURIComponent(manualQuery)}`)}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Cerca avanzata
              </Button>
            </div>
            <div className="w-full max-w-xs mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Non è nel database?</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                Puoi suggerire l'aggiunta di questa birra o birrificio. Verrà esaminata e approvata a breve.
              </p>
              <Button
                size="sm"
                onClick={() => setAdditionModalOpen(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Suggerisci aggiunta
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {scanState === "results" && !isSearching && totalResults > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground dark:text-stone-400">
                {totalResults} risultat{totalResults === 1 ? "o" : "i"} trovat{totalResults === 1 ? "o" : "i"}
              </p>
              <Link href="/scan/history" className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline">
                <History className="h-3.5 w-3.5" />
                Storico
              </Link>
            </div>

            {/* Beers */}
            {beers.length > 0 && (
              <section className="mb-6">
                <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground dark:text-stone-400 uppercase tracking-wider mb-2">
                  <Beer className="h-3.5 w-3.5 text-amber-500" />
                  Birre ({beers.length})
                </h2>
                {/* Scan hint — shown only when in scan context */}
                {scanState === "results" && currentLogIdRef.current && (
                  <p className="text-[11px] text-muted-foreground dark:text-stone-500 mb-3 pl-0.5">
                    Tocca <CheckCircle2 className="inline h-3 w-3 text-green-500 mx-0.5" /> per confermare la tua birra e addestrare il sistema
                  </p>
                )}
                <div className="space-y-2">
                  {beers.map(beer => {
                    const isConfirmed = confirmedBeerIds.has(beer.id);
                    return (
                      <div
                        key={beer.id}
                        onClick={() => {
                          saveFeedback(beer.id, undefined);
                          enrichBarcodeData(beer.id);
                          sessionStorage.setItem("scan_redirect", JSON.stringify({
                            beerId: beer.id,
                            beerName: beer.name,
                            breweryName: beer.breweryName || "",
                            query: searchQuery,
                            ocrText: currentOcrTextRef.current,
                            memoryMatch: beer.memoryMatch ?? false,
                          }));
                          navigate(`/beer/${beer.id}?from=scan`);
                        }}
                        className={`flex items-center gap-3 bg-white dark:bg-[#15202B] rounded-2xl p-3 shadow-sm border active:scale-[0.98] transition-all cursor-pointer ${
                          isConfirmed
                            ? "border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700"
                            : "border-gray-100 dark:border-[#2F3D4D] hover:border-amber-200 dark:hover:border-amber-900"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden shrink-0">
                          {beer.imageUrl ? (
                            <img src={beer.imageUrl} alt={beer.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Beer className="h-6 w-6 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-foreground dark:text-white truncate text-sm">{beer.name}</p>
                            {beer.memoryMatch && (
                              <span className="shrink-0 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 leading-none">
                                Ricordato
                              </span>
                            )}
                          </div>
                          {beer.breweryName && (
                            <p className="text-xs text-muted-foreground dark:text-stone-400 truncate">{beer.breweryName}</p>
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
                        {/* Confirm button — confirms this is the scanned beer */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isConfirmed) return;
                            setConfirmedBeerIds(prev => new Set([...prev, beer.id]));
                            saveFeedback(beer.id, undefined, true);
                          }}
                          className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                            isConfirmed
                              ? "bg-green-500 text-white shadow-sm"
                              : "border-2 border-gray-200 dark:border-[#2F3D4D] text-gray-300 dark:text-gray-600 hover:border-green-400 hover:text-green-400 dark:hover:border-green-500 dark:hover:text-green-500"
                          }`}
                          aria-label={isConfirmed ? "Confermata" : "Conferma questa birra"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Breweries */}
            {breweries.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground dark:text-stone-400 uppercase tracking-wider mb-3">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                  Birrifici ({breweries.length})
                </h2>
                <div className="space-y-2">
                  {breweries.map(brewery => (
                    <div
                      key={brewery.id}
                      onClick={() => { saveFeedback(undefined, brewery.id); navigate(`/brewery/${brewery.id}`); }}
                      className="flex items-center gap-3 bg-white dark:bg-[#15202B] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-[#2F3D4D] active:scale-[0.98] transition-transform cursor-pointer hover:border-blue-200 dark:hover:border-blue-900"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center overflow-hidden shrink-0">
                        {brewery.logoUrl ? (
                          <img src={brewery.logoUrl} alt={brewery.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Building2 className="h-6 w-6 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground dark:text-white truncate text-sm">{brewery.name}</p>
                        {(brewery.city || brewery.country) && (
                          <p className="text-xs text-muted-foreground dark:text-stone-400">
                            {[brewery.city, brewery.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </>
        )}

        {/* ── Non la trovo: manual search fallback ──────────────────────── */}
        {(scanState === "results" || scanState === "notfound") && !isSearching && (
          <div className="mb-4">
            {/* Success: beer confirmed via manual search */}
            {manualConfirmedBeer ? (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-2xl p-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#15202B] flex items-center justify-center overflow-hidden shrink-0 border border-green-200 dark:border-green-800">
                  {manualConfirmedBeer.imageUrl
                    ? <img src={manualConfirmedBeer.imageUrl} alt={manualConfirmedBeer.name} className="w-full h-full object-cover rounded-xl" />
                    : <Beer className="h-5 w-5 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-0.5">✓ Abbinamento salvato!</p>
                  <p className="text-sm font-semibold text-foreground dark:text-white truncate">{manualConfirmedBeer.name}</p>
                  {manualConfirmedBeer.breweryName && (
                    <p className="text-xs text-muted-foreground dark:text-stone-400 truncate">{manualConfirmedBeer.breweryName}</p>
                  )}
                </div>
                <button
                  onClick={() => setManualConfirmedBeer(null)}
                  className="shrink-0 text-green-400 hover:text-green-600"
                  aria-label="Chiudi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : showManualSearch ? (
              /* Search panel */
              <div className="rounded-2xl p-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-foreground dark:text-white flex-1">Cerca la birra giusta</p>
                  <button onClick={() => { setShowManualSearch(false); setManualQuery(""); setManualResults([]); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    value={fallbackQuery}
                    onChange={e => handleFallbackQueryChange(e.target.value)}
                    placeholder="Nome birra o birrificio..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-stone-50 dark:bg-[#1B2735] border border-gray-200 dark:border-[#2F3D4D] rounded-xl outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
                  />
                  {isFallbackSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {fallbackResults.length > 0 && (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {fallbackResults.map(beer => (
                      <div key={beer.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-[#1B2735] cursor-pointer group">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden shrink-0">
                          {beer.imageUrl
                            ? <img src={beer.imageUrl} alt={beer.name} className="w-full h-full object-cover rounded-lg" />
                            : <Beer className="h-4 w-4 text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground dark:text-white truncate leading-tight">{beer.name}</p>
                          <p className="text-xs text-muted-foreground dark:text-stone-400 truncate">{beer.breweryName || beer.style || ""}</p>
                        </div>
                        <button
                          onClick={() => confirmManualBeer(beer)}
                          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg px-2 py-1 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          È questa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fallbackQuery.trim().length >= 2 && !isFallbackSearching && fallbackResults.length === 0 && (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-xs text-muted-foreground dark:text-stone-500">
                      Nessuna birra trovata per &ldquo;{fallbackQuery}&rdquo;
                    </p>
                    <button
                      onClick={() => { setShowManualSearch(false); setAdditionModalOpen(true); }}
                      className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Crea &ldquo;{fallbackQuery}&rdquo;
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Toggle button */
              <button
                onClick={() => setShowManualSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-muted-foreground dark:text-stone-400 border border-dashed border-gray-200 dark:border-[#2F3D4D] rounded-2xl hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                {scanState === "results" ? "Nessuna di queste? Cerca o crea" : "Cerca manualmente o crea"}
              </button>
            )}
          </div>
        )}

        {/* Visual Similarity Results — shown regardless of OCR result */}
        {(scanState === "results" || scanState === "notfound") && (imageSimilarResults.length > 0 || isImageSearching) && (
          <section className="mt-4 px-4">
            <h2 className="flex items-center gap-2 text-xs font-bold text-muted-foreground dark:text-stone-400 uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              Per somiglianza visiva
              {isImageSearching && <span className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />}
            </h2>
            <div className="space-y-2">
              {imageSimilarResults.map(beer => (
                <div
                  key={`img-${beer.id}`}
                  onClick={() => { saveFeedback(beer.id, undefined); enrichBarcodeData(beer.id); navigate(`/beer/${beer.id}`); }}
                  className="flex items-center gap-3 bg-white dark:bg-[#15202B] rounded-2xl p-3 shadow-sm border border-purple-100 dark:border-purple-900/40 active:scale-[0.98] transition-transform cursor-pointer hover:border-purple-300 dark:hover:border-purple-700"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center overflow-hidden shrink-0">
                    {(beer.logoUrl || beer.imageUrl) ? (
                      <img src={beer.logoUrl || beer.imageUrl} alt={beer.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Beer className="h-6 w-6 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground dark:text-white truncate text-sm">{beer.name}</p>
                    {beer.breweryName && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 truncate">{beer.breweryName}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {beer.style && <Badge variant="outline" className="text-xs py-0 px-1.5">{beer.style}</Badge>}
                      {beer.abv && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{beer.abv}% ABV</span>}
                      <span className="text-xs text-purple-500 dark:text-purple-400 font-medium">
                        {Math.round(beer.similarity * 100)}% simile
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AdditionRequestModal
        open={additionModalOpen}
        onClose={() => setAdditionModalOpen(false)}
        initialBeerName={fallbackQuery || manualQuery}
        defaultTab="beer"
      />
    </div>
  );
}
