import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, History, Beer, Building2, Search, Camera, Zap, Clock, Barcode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ScanLog {
  id: number;
  imageUrl: string | null;
  ocrText: string | null;
  ocrEngine: string | null;
  source: string | null;
  usedQuery: string | null;
  topCandidates: any;
  chosenBeerId: number | null;
  chosenBreweryId: number | null;
  wasCorrect: boolean | null;
  latencyMs: number | null;
  createdAt: string;
  beerName: string | null;
  beerStyle: string | null;
  beerLogoUrl: string | null;
  breweryName: string | null;
}

function engineLabel(engine: string | null): { label: string; color: string } {
  switch (engine) {
    case "gemini": return { label: "Gemini AI", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" };
    case "paddleocr": return { label: "PaddleOCR", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
    case "tesseract": return { label: "Tesseract", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    case "ocrspace": return { label: "OCR.space", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" };
    case "barcode": return { label: "Barcode", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" };
    default: return { label: engine || "OCR", color: "bg-gray-100 text-gray-600" };
  }
}

export default function ScanHistoryPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const { data: logs = [], isLoading: logsLoading } = useQuery<ScanLog[]>({
    queryKey: ["/api/scan-logs/mine"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Accedi per vedere lo storico</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/scan">
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Storico scansioni</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-6 pb-28">
        {logsLoading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">Nessuna scansione ancora</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Le tue scansioni appariranno qui dopo averle effettuate.
              </p>
            </div>
            <Link href="/scan">
              <button className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Vai allo scanner
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map(log => {
              const eng = engineLabel(log.ocrEngine);
              const hasResult = log.chosenBeerId || log.chosenBreweryId;

              return (
                <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="flex gap-3 p-3">
                    {/* Scanned image or placeholder */}
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                      {log.imageUrl ? (
                        <img src={log.imageUrl} alt="scan" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-7 w-7 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {hasResult ? (
                            log.chosenBeerId ? (
                              <Link href={`/beer/${log.chosenBeerId}`}>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate hover:text-amber-600 dark:hover:text-amber-400">
                                  {log.beerName || "Birra"}
                                </p>
                              </Link>
                            ) : (
                              <Link href={`/brewery/${log.chosenBreweryId}`}>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate hover:text-amber-600 dark:hover:text-amber-400">
                                  {log.breweryName || "Birrificio"}
                                </p>
                              </Link>
                            )
                          ) : (
                            <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm truncate italic">
                              {log.usedQuery ? `"${log.usedQuery}"` : "Nessun risultato scelto"}
                            </p>
                          )}
                          {log.beerStyle && (
                            <p className="text-xs text-gray-400 truncate">{log.beerStyle}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: it })}
                        </span>
                      </div>

                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${eng.color}`}>
                          {log.source === "barcode" ? <Barcode className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                          {eng.label}
                        </span>
                        {log.latencyMs && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {log.latencyMs < 1000 ? `${log.latencyMs}ms` : `${(log.latencyMs/1000).toFixed(1)}s`}
                          </span>
                        )}
                        {hasResult ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            {log.chosenBeerId ? <Beer className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                            {log.chosenBeerId ? "Birra" : "Birrificio"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                            <Search className="h-3 w-3" />
                            Nessuna scelta
                          </span>
                        )}
                      </div>

                      {/* OCR text */}
                      {log.ocrText && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                          OCR: "{log.ocrText.slice(0, 60)}{log.ocrText.length > 60 ? "…" : ""}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
