import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Beer, Plus, Trash2, Search, Loader2, Package, PackageOpen } from "lucide-react";

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

export default function KegWarehouse({ pubId }: KegWarehouseProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    mutationFn: (data: { beerId: number }) =>
      apiRequest(`/api/pubs/${pubId}/next-tap`, { method: "POST" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
      setShowAdd(false);
      setSearchTerm("");
      toast({ title: "Fusto aggiunto al magazzino" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/next-tap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
      toast({ title: "Fusto rimosso dal magazzino" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-violet-500" />
          Magazzino fusti
          {(kegs as any[]).length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {(kegs as any[]).length}
            </Badge>
          )}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-stone-200 rounded-xl text-xs"
          onClick={() => { setShowAdd(!showAdd); setSearchTerm(""); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Aggiungi fusto
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
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
                  onClick={() => addMutation.mutate({ beerId: beer.id })}
                  disabled={addMutation.isPending}
                >
                  {beer.imageUrl
                    ? <img src={beer.imageUrl} alt={beer.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-stone-100" />
                    : <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Beer className="w-4 h-4 text-primary" /></div>
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
          <Button size="sm" variant="ghost" className="w-full rounded-xl" onClick={() => { setShowAdd(false); setSearchTerm(""); }}>
            Annulla
          </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(kegs as any[]).map((keg: any) => (
            <Card key={keg.id} className="p-3 border-stone-200 dark:border-white/[0.06] flex items-center gap-3">
              {keg.beer_image
                ? <img src={keg.beer_image} alt={keg.beer_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-100" />
                : <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
                    <Beer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{keg.beer_name || keg.name}</div>
                {keg.brewery_name && <div className="text-xs text-muted-foreground truncate">{keg.brewery_name}</div>}
              </div>
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 flex-shrink-0"
                onClick={() => removeMutation.mutate(keg.id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
