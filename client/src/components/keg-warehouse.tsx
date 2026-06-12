import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Beer, Plus, Minus, Trash2, Search, Loader2, Package, PackageOpen, X } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface KegWarehouseProps {
  pubId: number;
}

interface PendingBeer {
  id: number;
  name: string;
  style?: string;
  abv?: string;
  imageUrl?: string;
  breweryName?: string;
}

export default function KegWarehouse({ pubId }: KegWarehouseProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingBeer, setPendingBeer] = useState<PendingBeer | null>(null);
  const [pendingCount, setPendingCount] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: kegs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs", String(pubId), "next-tap"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/next-tap`),
    enabled: !!pubId,
    staleTime: 20000,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<any>({
    queryKey: ["/api/search", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return null;
      const r = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" });
      return r.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: (data: { beerId: number; kegCount: number }) =>
      apiRequest(`/api/pubs/${pubId}/next-tap`, { method: "POST" }, { beerId: data.beerId, kegCount: data.kegCount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
      setShowAdd(false);
      setSearchTerm("");
      setPendingBeer(null);
      setPendingCount(1);
      toast({ title: "Fusto aggiunto al magazzino" });
    },
  });

  const updateCountMutation = useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) =>
      apiRequest(`/api/next-tap/${id}/count`, { method: "PATCH" }, { delta }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
      if (data?.removed) toast({ title: "Fusto esaurito, rimosso dal magazzino" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/next-tap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
      toast({ title: "Fusto rimosso dal magazzino" });
    },
  });

  const totalKegs = (kegs as any[]).reduce((sum, k) => sum + (k.keg_count ?? 1), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-violet-500" />
          Magazzino fusti
          {totalKegs > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {totalKegs} fusto{totalKegs !== 1 ? "i" : ""}
            </Badge>
          )}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-stone-200 rounded-xl text-xs"
          onClick={() => { setShowAdd(!showAdd); setSearchTerm(""); setPendingBeer(null); setPendingCount(1); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi fusto
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-4">
          {!pendingBeer ? (
            <>
              <p className="text-sm font-medium text-foreground">Cerca la birra da aggiungere al magazzino</p>
              <div className="relative">
                {isSearching
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  autoFocus
                  placeholder="Cerca per nome o birrificio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-stone-200 rounded-xl"
                />
              </div>
              {debouncedSearch.length >= 2 && !isSearching && (searchResults?.beers?.length ?? 0) > 0 && (
                <div className="max-h-52 overflow-y-auto border border-stone-200 rounded-xl bg-white dark:bg-[#0B0D10]/20 divide-y divide-stone-100 dark:divide-white/[0.04] shadow-sm">
                  {searchResults.beers.map((beer: any) => (
                    <button
                      key={beer.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors text-left"
                      onClick={() => {
                        setPendingBeer({
                          id: beer.id,
                          name: beer.name,
                          style: beer.style || "",
                          abv: beer.abv || "",
                          imageUrl: beer.imageUrl || "",
                          breweryName: beer.brewery?.name || "",
                        });
                        setSearchTerm("");
                        setPendingCount(1);
                      }}
                    >
                      {beer.imageUrl
                        ? <img loading="lazy" src={beer.imageUrl} alt={beer.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-100" />
                        : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Beer className="w-5 h-5 text-primary" /></div>
                      }
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-foreground truncate">{beer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {beer.brewery?.name || "Birrificio sconosciuto"}{beer.style ? ` • ${beer.style}` : ""}{beer.abv ? ` • ${beer.abv}% ABV` : ""}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {debouncedSearch.length >= 2 && !isSearching && (searchResults?.beers?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nessuna birra trovata per "{debouncedSearch}"</p>
              )}
            </>
          ) : (
            /* Step 2: beer selected — set quantity */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-[#0B0D10]/30 rounded-xl border border-stone-200 dark:border-white/[0.06]">
                {pendingBeer.imageUrl
                  ? <img loading="lazy" src={pendingBeer.imageUrl} alt={pendingBeer.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-stone-100" />
                  : <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
                      <Beer className="w-7 h-7 text-violet-500" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{pendingBeer.name}</div>
                  {pendingBeer.breweryName && <div className="text-xs text-muted-foreground">{pendingBeer.breweryName}</div>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pendingBeer.style && (
                      <span className="text-[11px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/60 font-medium">{pendingBeer.style}</span>
                    )}
                    {pendingBeer.abv && (
                      <span className="text-[11px] px-1.5 py-0.5 bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-400 rounded-full font-medium">{pendingBeer.abv}% ABV</span>
                    )}
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-red-500 transition-colors mt-0.5 flex-shrink-0"
                  onClick={() => setPendingBeer(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Quanti fusti hai in magazzino?</p>
                <div className="flex items-center gap-3">
                  <button
                    className="w-9 h-9 rounded-xl border border-stone-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-40"
                    onClick={() => setPendingCount(c => Math.max(1, c - 1))}
                    disabled={pendingCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-foreground tabular-nums">{pendingCount}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">fusto{pendingCount !== 1 ? "i" : ""}</span>
                  </div>
                  <button
                    className="w-9 h-9 rounded-xl border border-stone-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors"
                    onClick={() => setPendingCount(c => Math.min(20, c + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm" variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => { setPendingBeer(null); setPendingCount(1); }}
                >
                  Indietro
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => addMutation.mutate({ beerId: pendingBeer.id, kegCount: pendingCount })}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Package className="h-4 w-4 mr-1" />}
                  Aggiungi al magazzino
                </Button>
              </div>
            </div>
          )}

          {!pendingBeer && (
            <Button size="sm" variant="ghost" className="w-full rounded-xl" onClick={() => { setShowAdd(false); setSearchTerm(""); }}>
              Annulla
            </Button>
          )}
        </Card>
      )}

      {/* Keg list */}
      {isLoading ? (
        <div className="py-6 text-center text-muted-foreground text-sm">Caricamento...</div>
      ) : (kegs as any[]).length === 0 ? (
        <Card className="p-6 border-stone-200 dark:border-white/[0.06] text-center border-dashed">
          <PackageOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Magazzino vuoto</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Aggiungi i fusti che hai in cantina per selezionarli rapidamente al cambio spina</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(kegs as any[]).map((keg: any) => {
            const count = keg.keg_count ?? 1;
            return (
              <Card key={keg.id} className="border-stone-200 dark:border-white/[0.06] overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  {keg.beer_image
                    ? <img loading="lazy" src={keg.beer_image} alt={keg.beer_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-white/10" />
                    : <div className="w-16 h-16 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
                        <Beer className="w-7 h-7 text-violet-500" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{keg.beer_name || keg.name}</div>
                        {keg.brewery_name && (
                          <div className="text-xs text-muted-foreground truncate">{keg.brewery_name}</div>
                        )}
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-red-500 flex-shrink-0 -mt-0.5"
                        onClick={() => removeMutation.mutate(keg.id)}
                        disabled={removeMutation.isPending}
                        title="Rimuovi dal magazzino"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {keg.beer_style && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/60 font-medium">
                          {keg.beer_style}
                        </span>
                      )}
                      {keg.beer_abv && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-400 rounded-full font-medium">
                          {keg.beer_abv}% ABV
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity stepper */}
                <div className="border-t border-stone-100 dark:border-white/[0.04] px-3 py-2 flex items-center justify-between bg-stone-50/50 dark:bg-white/[0.02]">
                  <span className="text-xs text-muted-foreground font-medium">Disponibilità:</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-7 h-7 rounded-lg border border-stone-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40 text-muted-foreground"
                      onClick={() => updateCountMutation.mutate({ id: keg.id, delta: -1 })}
                      disabled={updateCountMutation.isPending}
                      title={count <= 1 ? "Rimuoverà il fusto" : "Scala un fusto"}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-base font-bold text-foreground tabular-nums w-6 text-center">{count}</span>
                    <button
                      className="w-7 h-7 rounded-lg border border-stone-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40 text-muted-foreground"
                      onClick={() => updateCountMutation.mutate({ id: keg.id, delta: +1 })}
                      disabled={updateCountMutation.isPending || count >= 20}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-xs text-muted-foreground">fusto{count !== 1 ? "i" : ""}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
