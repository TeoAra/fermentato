import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Minus, Plus, Trash2, Wine, ChevronRight, Package } from "lucide-react";
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
import { Helmet } from "react-helmet-async";

export default function MyCellar() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<any>(null);

  const { data: cellar = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/cellar"],
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("DELETE", `/api/user/cellar/${beerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
      toast({ title: "Rimossa dalla cantina" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/user/cellar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/cellar"] });
      setEditItem(null);
      toast({ title: "Cantina aggiornata" });
    },
  });

  const totalBottles = cellar.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] flex items-center justify-center p-6">
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

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] pb-24">
      <Helmet><title>La mia cantina | Fermenta.to</title></Helmet>

      {/* Header */}
      <div className="bg-white dark:bg-[hsl(220,5%,18%)] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">La mia cantina</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {totalBottles} {totalBottles === 1 ? "bottiglia" : "bottiglie"} · {cellar.length} {cellar.length === 1 ? "etichetta" : "etichette"}
        </p>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : cellar.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[hsl(220,5%,18%)] flex items-center justify-center shadow-sm">
            <Wine className="w-9 h-9 text-stone-300" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Cantina vuota</p>
          <p className="text-sm text-stone-400">Aggiungi bottiglie dalla pagina della birra</p>
          <Link href="/explore/beers">
            <Button variant="outline" className="mt-2">Esplora birre</Button>
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {cellar.map((item: any) => (
            <div
              key={item.beer_id}
              className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3">
                {item.beer_image ? (
                  <img src={item.beer_image} alt={item.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[hsl(220,5%,22%)]" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[hsl(220,5%,22%)] flex items-center justify-center">
                    <Package className="w-6 h-6 text-stone-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${item.beer_id}`}>
                    <p className="font-semibold text-stone-900 dark:text-stone-50 truncate text-sm font-poppins leading-tight">{item.beer_name}</p>
                  </Link>
                  <p className="text-xs text-stone-400 mt-0.5">{item.brewery_name}</p>
                  {item.vintage && <p className="text-xs text-primary font-medium mt-0.5">Annata {item.vintage}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 bg-stone-50 dark:bg-[hsl(220,5%,22%)] rounded-xl px-2 py-1">
                    <button
                      className="w-6 h-6 flex items-center justify-center text-stone-500 active:scale-90 transition-transform"
                      onClick={() => {
                        const newQty = Math.max(0, (item.quantity ?? 1) - 1);
                        if (newQty === 0) removeMutation.mutate(item.beer_id);
                        else updateMutation.mutate({ beerId: item.beer_id, quantity: newQty, notes: item.notes, vintage: item.vintage });
                      }}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-100 min-w-[20px] text-center">{item.quantity ?? 1}</span>
                    <button
                      className="w-6 h-6 flex items-center justify-center text-stone-500 active:scale-90 transition-transform"
                      onClick={() => updateMutation.mutate({ beerId: item.beer_id, quantity: (item.quantity ?? 1) + 1, notes: item.notes, vintage: item.vintage })}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="border-t border-stone-50 dark:border-[hsl(220,5%,22%)] flex divide-x divide-stone-50 dark:divide-[hsl(220,5%,22%)]">
                <button
                  className="flex-1 py-2.5 text-xs text-stone-500 flex items-center justify-center gap-1.5 active:bg-stone-50 dark:active:bg-[hsl(220,5%,22%)]"
                  onClick={() => setEditItem(item)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Modifica
                </button>
                <button
                  className="flex-1 py-2.5 text-xs text-red-400 flex items-center justify-center gap-1.5 active:bg-red-50 dark:active:bg-[hsl(220,5%,22%)]"
                  onClick={() => removeMutation.mutate(item.beer_id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="rounded-2xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-poppins">{editItem?.beer_name}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Annata</label>
                <Input
                  placeholder="es. 2023"
                  defaultValue={editItem.vintage ?? ""}
                  className="rounded-xl"
                  id="vintage-input"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Prezzo pagato (€)</label>
                <Input
                  type="number"
                  placeholder="es. 4.50"
                  defaultValue={editItem.purchase_price ?? ""}
                  className="rounded-xl"
                  id="price-input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Note</label>
                <Textarea
                  placeholder="Note personali..."
                  defaultValue={editItem.notes ?? ""}
                  className="rounded-xl resize-none"
                  id="notes-input"
                  rows={3}
                />
              </div>
              <Button
                className="w-full rounded-xl bg-primary text-white"
                onClick={() => {
                  const vintage = (document.getElementById("vintage-input") as HTMLInputElement)?.value || null;
                  const price = (document.getElementById("price-input") as HTMLInputElement)?.value || null;
                  const notes = (document.getElementById("notes-input") as HTMLTextAreaElement)?.value || null;
                  updateMutation.mutate({ beerId: editItem.beer_id, quantity: editItem.quantity, notes, vintage, purchasePrice: price });
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
