import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Minus, Plus, Trash2, Wine, ChevronRight, Package, Beer, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Helmet } from "react-helmet-async";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

type SortKey = "recent" | "name" | "brewery" | "vintage" | "price" | "quantity";

interface EditForm {
  vintage: string;
  purchasePrice: string;
  notes: string;
}

export default function MyCellar() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<any>(null);
  const [checkinItem, setCheckinItem] = useState<any>(null);
  const [confirmRemove, setConfirmRemove] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [groupByStyle, setGroupByStyle] = useState(false);

  const editForm = useForm<EditForm>({
    defaultValues: { vintage: "", purchasePrice: "", notes: "" },
  });

  useEffect(() => {
    if (editItem) {
      editForm.reset({
        vintage: editItem.vintage ?? "",
        purchasePrice: editItem.purchase_price != null ? String(editItem.purchase_price) : "",
        notes: editItem.notes ?? "",
      });
    }
  }, [editItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: cellar = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/user/cellar"],
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("DELETE", `/api/user/cellar/${beerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere la bottiglia", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (item: any) => apiRequest("POST", "/api/user/cellar", {
      beerId: item.beer_id,
      quantity: item.quantity ?? 1,
      notes: item.notes,
      vintage: item.vintage,
      purchasePrice: item.purchase_price,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile annullare la rimozione", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/cellar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
      setEditItem(null);
      toast({ title: "Cantina aggiornata" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la cantina", variant: "destructive" });
    },
  });

  const handleRemove = (item: any) => {
    removeMutation.mutate(item.beer_id, {
      onSuccess: () => {
        toast({
          title: "Rimossa dalla cantina",
          action: (
            <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate(item)}>
              Annulla
            </Button>
          ),
        });
      },
    });
    setConfirmRemove(null);
  };

  // ─── Summary stats ──────────────────────────────────────────────────────────
  const totalBottles = cellar.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0);

  const totalValue = useMemo(() => {
    return cellar.reduce((s: number, i: any) => {
      const price = i.purchase_price != null ? Number(i.purchase_price) : 0;
      if (!price || Number.isNaN(price)) return s;
      return s + price * (i.quantity ?? 1);
    }, 0);
  }, [cellar]);

  const topStyles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of cellar) {
      const style = i.beer_style;
      if (!style) continue;
      counts.set(style, (counts.get(style) ?? 0) + (i.quantity ?? 1));
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [cellar]);

  // ─── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = cellar;
    if (q) {
      list = list.filter((i: any) =>
        [i.beer_name, i.brewery_name, i.beer_style, i.vintage]
          .filter(Boolean)
          .some((v: any) => String(v).toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "name":
        sorted.sort((a: any, b: any) => (a.beer_name || "").localeCompare(b.beer_name || ""));
        break;
      case "brewery":
        sorted.sort((a: any, b: any) => (a.brewery_name || "").localeCompare(b.brewery_name || ""));
        break;
      case "vintage":
        sorted.sort((a: any, b: any) => (b.vintage || "").localeCompare(a.vintage || ""));
        break;
      case "price":
        sorted.sort((a: any, b: any) => (Number(b.purchase_price) || 0) - (Number(a.purchase_price) || 0));
        break;
      case "quantity":
        sorted.sort((a: any, b: any) => (b.quantity ?? 1) - (a.quantity ?? 1));
        break;
      default:
        break; // "recent" keeps server order
    }
    return sorted;
  }, [cellar, search, sort]);

  const grouped = useMemo(() => {
    if (!groupByStyle) return null;
    const groups = new Map<string, any[]>();
    for (const i of filtered) {
      const key = i.beer_style || "Altro";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByStyle]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Wine className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per gestire la tua cantina</p>
          <Link href="/auth">
            <Button className="bg-primary text-white">Accedi</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderItem = (item: any) => (
    <div
      key={item.beer_id}
      className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        {item.beer_image ? (
          <img loading="lazy" src={item.beer_image} alt={item.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[#12151A]" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#12151A] flex items-center justify-center">
            <Package className="w-6 h-6 text-stone-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link href={`/beer/${item.beer_id}`}>
            <p className="font-semibold text-stone-900 dark:text-stone-50 truncate text-sm font-poppins leading-tight">{item.beer_name}</p>
          </Link>
          <p className="text-xs text-stone-400 mt-0.5">{item.brewery_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.vintage && <span className="text-xs text-primary font-medium">Annata {item.vintage}</span>}
            {item.purchase_price != null && (
              <span className="text-xs text-stone-400">€{Number(item.purchase_price).toFixed(2)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-stone-50 dark:bg-[#12151A] rounded-xl px-2 py-1">
            <button
              className="w-6 h-6 flex items-center justify-center text-stone-500 active:scale-90 transition-transform"
              onClick={() => {
                const newQty = Math.max(0, (item.quantity ?? 1) - 1);
                if (newQty === 0) setConfirmRemove(item);
                else updateMutation.mutate({ beerId: item.beer_id, quantity: newQty, notes: item.notes, vintage: item.vintage, purchasePrice: item.purchase_price });
              }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold text-stone-800 dark:text-stone-100 min-w-[20px] text-center">{item.quantity ?? 1}</span>
            <button
              className="w-6 h-6 flex items-center justify-center text-stone-500 active:scale-90 transition-transform"
              onClick={() => updateMutation.mutate({ beerId: item.beer_id, quantity: (item.quantity ?? 1) + 1, notes: item.notes, vintage: item.vintage, purchasePrice: item.purchase_price })}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-stone-50 dark:border-[#12151A] flex divide-x divide-stone-50 dark:divide-[#12151A]">
        <button
          className="flex-1 py-2.5 text-xs text-stone-500 flex items-center justify-center gap-1.5 active:bg-stone-50 dark:active:bg-[#12151A]"
          onClick={() => setCheckinItem(item)}
        >
          <Beer className="w-3.5 h-3.5" />
          Check-in
        </button>
        <button
          className="flex-1 py-2.5 text-xs text-stone-500 flex items-center justify-center gap-1.5 active:bg-stone-50 dark:active:bg-[#12151A]"
          onClick={() => setEditItem(item)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Modifica
        </button>
        <button
          className="flex-1 py-2.5 text-xs text-red-400 flex items-center justify-center gap-1.5 active:bg-red-50 dark:active:bg-[#12151A]"
          onClick={() => setConfirmRemove(item)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Rimuovi
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet><title>La mia cantina | Fermenta.to</title></Helmet>

      {/* Header */}
      <div className="bg-white dark:bg-[#1A1D24] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">La mia cantina</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {totalBottles} {totalBottles === 1 ? "bottiglia" : "bottiglie"} · {cellar.length} {cellar.length === 1 ? "etichetta" : "etichette"}
          {totalValue > 0 && <> · valore €{totalValue.toFixed(2)}</>}
        </p>
        {topStyles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {topStyles.map(([style, count]) => (
              <span key={style} className="text-xs bg-stone-100 dark:bg-[#12151A] text-stone-600 dark:text-stone-300 rounded-full px-2.5 py-1">
                {style} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search + sort + group */}
      {!isLoading && !isError && cellar.length > 0 && (
        <div className="px-4 pt-4 space-y-2">
          <div className="flex gap-2">
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
                <SelectItem value="brewery">Birrificio</SelectItem>
                <SelectItem value="vintage">Annata</SelectItem>
                <SelectItem value="price">Prezzo</SelectItem>
                <SelectItem value="quantity">Quantità</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => setGroupByStyle((v) => !v)}
            className={`text-xs rounded-full px-3 py-1.5 transition-colors ${groupByStyle === true ? "bg-primary text-white" : "bg-stone-100 dark:bg-[#12151A] text-stone-500"}`}
          >
            Raggruppa per stile
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-400" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Errore di caricamento</p>
          <p className="text-sm text-stone-400">Non è stato possibile caricare la cantina</p>
          <Button variant="outline" className="mt-2" onClick={() => refetch()}>Riprova</Button>
        </div>
      ) : cellar.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Wine className="w-9 h-9 text-stone-300" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Cantina vuota</p>
          <p className="text-sm text-stone-400">Aggiungi bottiglie dalla pagina della birra</p>
          <Link href="/explore/beers">
            <Button variant="outline" className="mt-2">Esplora birre</Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 px-6 text-center gap-2">
          <Search className="w-8 h-8 text-stone-300" />
          <p className="text-sm text-stone-400">Nessun risultato per "{search}"</p>
        </div>
      ) : grouped ? (
        <div className="p-4 space-y-5">
          {grouped.map(([style, items]) => (
            <div key={style} className="space-y-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-1">{style}</p>
              {items.map(renderItem)}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filtered.map(renderItem)}
        </div>
      )}

      {/* Edit dialog (controlled via react-hook-form) */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="rounded-2xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-poppins">{editItem?.beer_name}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form
              className="space-y-4"
              onSubmit={editForm.handleSubmit((values) => {
                updateMutation.mutate({
                  beerId: editItem.beer_id,
                  quantity: editItem.quantity ?? 1,
                  notes: values.notes.trim() || null,
                  vintage: values.vintage.trim() || null,
                  purchasePrice: values.purchasePrice.trim() || null,
                });
              })}
            >
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Annata</label>
                <Input
                  placeholder="es. 2023"
                  className="rounded-xl"
                  maxLength={4}
                  {...editForm.register("vintage")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Prezzo pagato (€)</label>
                <Input
                  type="number"
                  placeholder="es. 4.50"
                  className="rounded-xl"
                  step="0.01"
                  {...editForm.register("purchasePrice")}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Note</label>
                <Textarea
                  placeholder="Note personali..."
                  className="rounded-xl resize-none"
                  rows={3}
                  {...editForm.register("notes")}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl bg-primary text-white"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent className="rounded-2xl mx-4 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere dalla cantina?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.beer_name} verrà rimossa completamente dalla tua cantina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            tapType="bottiglia"
          />
        </Suspense>
      )}
    </div>
  );
}
