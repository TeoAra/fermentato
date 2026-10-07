import { Check, LoaderCircle, RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullProgress: number;
  refreshError?: string | null;
}

export default function PullToRefreshIndicator({ isPulling, isRefreshing, pullProgress, refreshError }: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing && !refreshError) return null;
  const ready = pullProgress >= 1;
  const label = refreshError ? "Aggiornamento non riuscito" : isRefreshing ? "Aggiornamento in corso" : ready ? "Rilascia per aggiornare" : "Trascina per aggiornare";
  return (
    <div className="flex min-h-12 items-center justify-center px-4 py-2" role="status" aria-live="polite" aria-atomic="true">
      <div className={`flex items-center gap-2 rounded-full border border-[#d8e0d2] bg-[#f7f8f1] px-4 py-2 text-xs font-semibold text-[#425343] shadow-sm dark:border-[#38463a] dark:bg-[#202a23] dark:text-[#d9e3d5] ${refreshError ? "text-[#a34835] dark:text-[#ffb6a5]" : ""}`}>
        {isRefreshing ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : refreshError ? <RefreshCw className="h-4 w-4" /> : ready ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 transition-transform motion-reduce:transition-none" style={{ transform: `rotate(${Math.min(pullProgress, 1) * 150}deg)` }} />}
        <span>{refreshError || label}</span>
      </div>
    </div>
  );
}
