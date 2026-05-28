import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Droplets, RefreshCw, Clock, ChevronDown, ChevronUp, Beer, Flame, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface PubAnalyticsTabProps {
  pubId: number;
  tapList: any[];
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ore`;
  const days = Math.round(hours / 24);
  return `${days} giorni`;
}

function durationColor(minutes: number | null): string {
  if (!minutes) return "bg-stone-200 dark:bg-stone-700";
  const days = minutes / 60 / 24;
  if (days >= 7) return "bg-emerald-500";
  if (days >= 3) return "bg-amber-500";
  return "bg-red-500";
}

function durationBadge(minutes: number | null) {
  if (!minutes) return null;
  const days = minutes / 60 / 24;
  if (days >= 7) return { label: `${Math.round(days)}g`, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" };
  if (days >= 3) return { label: `${Math.round(days)}g`, color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" };
  return { label: `${Math.round(days)}g`, color: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" };
}


export default function PubAnalyticsTab({ pubId, tapList }: PubAnalyticsTabProps) {
  const [showAllLogs, setShowAllLogs] = useState(false);

  const { data: changeLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs", pubId, "tap-change-logs"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/tap-change-logs?limit=200`),
    enabled: !!pubId,
  });

  const { data: cleanings = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", pubId, "tap-cleanings"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/tap-cleanings`),
    enabled: !!pubId,
  });

  // === Computed stats ===
  const validLogs = changeLogs.filter((l: any) => l.duration_minutes != null);
  const avgDurationMinutes = validLogs.length > 0
    ? Math.round(validLogs.reduce((s: number, l: any) => s + l.duration_minutes, 0) / validLogs.length)
    : null;
  const maxDurationMinutes = validLogs.length > 0 ? Math.max(...validLogs.map((l: any) => l.duration_minutes)) : 1;

  const tapRotations: Record<string, { count: number; tap: string; avgMinutes: number }> = {};
  for (const log of changeLogs) {
    const key = log.tap_number != null ? `Spina ${log.tap_number}` : log.tap_type ?? "—";
    if (!tapRotations[key]) tapRotations[key] = { count: 0, tap: key, avgMinutes: 0 };
    tapRotations[key].count++;
    if (log.duration_minutes) tapRotations[key].avgMinutes += log.duration_minutes;
  }
  const tapRanking = Object.values(tapRotations)
    .map((t) => ({ ...t, avgMinutes: t.count > 0 ? Math.round(t.avgMinutes / t.count) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const displayedLogs = showAllLogs ? changeLogs : changeLogs.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics Taplist</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Storico cambi fusto, durata delle birre e lavaggi linee</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cambi totali</p>
              <p className="text-2xl font-bold text-foreground mt-1">{changeLogs.length}</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Durata media</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatDuration(avgDurationMinutes)}</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Lavaggi totali</p>
              <p className="text-2xl font-bold text-foreground mt-1">{cleanings.length}</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-stone-200 dark:border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Spine attive</p>
              <p className="text-2xl font-bold text-foreground mt-1">{tapList.length}</p>
            </div>
            <div className="p-2 bg-stone-100 dark:bg-stone-900/30 rounded-xl">
              <Beer className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keg Change History */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Storico cambi fusto
            </h3>
            {changeLogs.length === 0 && !logsLoading && (
              <span className="text-xs text-muted-foreground">I cambi vengono registrati automaticamente</span>
            )}
          </div>

          <Card className="border-stone-200 dark:border-white/[0.06] overflow-hidden">
            {logsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
            ) : changeLogs.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nessun cambio registrato ancora.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">I fusti vengono tracciati automaticamente ogni volta che rimuovi o sostituisci una birra dalla taplist.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                {displayedLogs.map((log: any) => {
                  const badge = durationBadge(log.duration_minutes);
                  const barWidth = maxDurationMinutes > 0 && log.duration_minutes
                    ? Math.max(4, Math.round((log.duration_minutes / maxDurationMinutes) * 100))
                    : 0;
                  return (
                    <div key={log.id} className="px-4 py-3 hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                            <Beer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {log.tap_number && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spina {log.tap_number}</span>
                              )}
                              {log.tap_type && !log.tap_number && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{log.tap_type}</span>
                              )}
                            </div>
                            <div className="text-sm font-medium text-foreground mt-0.5">
                              {log.old_beer_name ? (
                                <>
                                  <span className="text-muted-foreground line-through text-xs mr-1">{log.old_beer_name}</span>
                                  {log.new_beer_name && <><span className="text-muted-foreground mx-1">→</span><span>{log.new_beer_name}</span></>}
                                  {!log.new_beer_name && <span className="text-muted-foreground italic text-xs">rimossa</span>}
                                </>
                              ) : log.new_beer_name ? (
                                <span>{log.new_beer_name}</span>
                              ) : <span className="text-muted-foreground text-xs italic">cambio non specificato</span>}
                            </div>
                            {/* Duration bar */}
                            {barWidth > 0 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden max-w-[120px]">
                                  <div
                                    className={`h-full rounded-full ${durationColor(log.duration_minutes)}`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                              {badge.label}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.changed_at), "dd/MM/yy HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {changeLogs.length > 8 && (
                  <button
                    className="w-full py-2.5 text-xs text-primary hover:bg-stone-50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-1.5 font-medium"
                    onClick={() => setShowAllLogs(!showAllLogs)}
                  >
                    {showAllLogs ? <><ChevronUp className="h-3.5 w-3.5" />Mostra meno</> : <><ChevronDown className="h-3.5 w-3.5" />Mostra tutti ({changeLogs.length})</>}
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Ranking sidebar */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Spine più attive
          </h3>
          <Card className="border-stone-200 dark:border-white/[0.06] p-4">
            {tapRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun dato disponibile</p>
            ) : (
              <div className="space-y-3">
                {tapRanking.map((item, idx) => (
                  <div key={item.tap} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.tap}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(item.count / (tapRanking[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.count} cambi</span>
                      </div>
                    </div>
                    {item.avgMinutes > 0 && (
                      <span className="text-[10px] text-muted-foreground">{formatDuration(item.avgMinutes)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

    </div>
  );
}
