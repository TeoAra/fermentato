import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Heart, Trash2, Package, Search, Wine, Beer, AlertTriangle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Helmet } from "react-helmet-async";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

type SortKey = "recent" | "name" | "style";

export default function MyWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [checkinItem, setCheckinItem] = useState<any>(null);

  const {
    data: wishlist = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/user/wishlist"],
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("DELETE", `/api/user/wishlist/${beerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlist"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere la birra", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("POST", "/api/user/wishlist", { beerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlist"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile annullare la rimozione", variant: "destructive" });
    },
  });

  const addToCellarMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("POST", "/api/user/cellar", { beerId, quantity: 1 }),
    onSuccess: (_data, beerId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
      toast({
        title: "Aggiunta in cantina",
        description: "Vuoi rimuoverla dalla wishlist?",
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => removeMutation.mutate(beerId)}
          >
            Rimuovi
          </Button>
        ),
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere in cantina", variant: "destructive" });
    },
  });

  const handleRemove = (item: any) => {
    removeMutation.mutate(item.beer_id, {
      onSuccess: () => {
        toast({
          title: "Rimossa dalla wishlist",
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreMutation.mutate(item.beer_id)}
            >
              Annulla
            </Button>
          ),
        });
      },
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = wishlist;
    if (q) {
      list = list.filter((i: any) =>
        [i.beer_name, i.brewery_name, i.beer_style]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a: any, b: any) => (a.beer_name || "").localeCompare(b.beer_name || ""));
    } else if (sort === "style") {
      sorted.sort((a: any, b: any) => (a.beer_style || "").localeCompare(b.beer_style || ""));
    }
    // "recent" keeps server order (added_at DESC)
    return sorted;
  }, [wishlist, search, sort]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Heart className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per vedere la tua wishlist</p>
          <Link href="/auth"><Button className="bg-primary text-white">Accedi</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet><title>Wishlist | Fermenta.to</title></Helmet>

      <div className="bg-white dark:bg-[#1A1D24] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">Wishlist</h1>
        <p className="text-sm text-stone-500 mt-0.5">{wishlist.length} {wishlist.length === 1 ? "birra" : "birre"} da provare</p>
      </div>

      {/* Search + sort */}
      {!isLoading && !isError && wishlist.length > 0 && (
        <div className="px-4 pt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-36 rounded-xl shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Più recenti</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="style">Stile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-400" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Errore di caricamento</p>
          <p className="text-sm text-stone-400">Non è stato possibile caricare la wishlist</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>Riprova</Button>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Heart className="w-9 h-9 text-stone-300" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Wishlist vuota</p>
          <p className="text-sm text-stone-400 max-w-xs">Salva le birre che vuoi provare: le ritrovi qui, pronte per un check-in o per la tua cantina.</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Link href="/explore/beers">
              <Button className="bg-primary text-white rounded-xl w-full">Esplora birre</Button>
            </Link>
            <Link href="/scan">
              <Button variant="outline" className="rounded-xl w-full gap-1.5">
                <ScanLine className="w-4 h-4" /> Scansiona
              </Button>
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 px-6 text-center gap-2">
          <Search className="w-8 h-8 text-stone-300" />
          <p className="text-sm text-stone-400">Nessun risultato per "{search}"</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {filtered.map((item: any) => (
            <div
              key={item.beer_id}
              className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                {item.beer_image ? (
                  <img loading="lazy" src={item.beer_image} alt={item.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[#12151A]" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#12151A] flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-stone-300" />
                  </div>
                )}
                <Link href={`/beer/${item.beer_id}`} className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 dark:text-stone-50 truncate text-sm font-poppins">{item.beer_name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.brewery_name}</p>
                  {item.beer_style && (
                    <span className="inline-block text-xs bg-stone-100 dark:bg-[#12151A] text-stone-500 rounded-full px-2 py-0.5 mt-1">{item.beer_style}</span>
                  )}
                </Link>
                {item.beer_abv && (
                  <span className="text-xs font-bold text-primary shrink-0">{item.beer_abv}%</span>
                )}
              </div>

              {/* Bottom actions */}
              <div className="border-t border-stone-50 dark:border-[#12151A] flex divide-x divide-stone-50 dark:divide-[#12151A]">
                <button
                  className="flex-1 py-2.5 text-xs text-stone-500 flex items-center justify-center gap-1.5 active:bg-stone-50 dark:active:bg-[#12151A] disabled:opacity-50"
                  onClick={() => addToCellarMutation.mutate(item.beer_id)}
                  disabled={addToCellarMutation.isPending}
                >
                  <Wine className="w-3.5 h-3.5" />
                  In cantina
                </button>
                <button
                  className="flex-1 py-2.5 text-xs text-stone-500 flex items-center justify-center gap-1.5 active:bg-stone-50 dark:active:bg-[#12151A]"
                  onClick={() => setCheckinItem(item)}
                >
                  <Beer className="w-3.5 h-3.5" />
                  Check-in
                </button>
                <button
                  className="flex-1 py-2.5 text-xs text-red-400 flex items-center justify-center gap-1.5 active:bg-red-50 dark:active:bg-[#12151A] disabled:opacity-50"
                  onClick={() => handleRemove(item)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-in modal */}
      {checkinItem && (
        <Suspense fallback={null}>
          <CheckinModal
            open={!!checkinItem}
            onClose={() => setCheckinItem(null)}
            beer={{
              id: checkinItem.beer_id,
              name: checkinItem.beer_name,
              style: checkinItem.beer_style ?? null,
              breweryName: checkinItem.brewery_name ?? null,
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
