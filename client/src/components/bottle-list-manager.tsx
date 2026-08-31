import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor, { RichTextDisplay } from "@/components/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { 
  Wine, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Loader2,
  GripVertical,
} from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { BeerFullEditDialog } from "./taplist-manager";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface BottleItem {
  id: number;
  beer?: {
    id?: number;
    name?: string;
    style?: string;
    abv?: string;
    logoUrl?: string;
    brewery?: {
      id?: number;
      name?: string;
    };
  } | null;
  price?: string;
  quantity?: number;
  size?: string;
  vintage?: string;
  description?: string;
  isVisible?: boolean;
  orderIndex?: number;
}

interface BottleListManagerProps {
  pubId: number;
  bottleList: BottleItem[];
  tapList?: any[];
  isLoading?: boolean;
}

export function BottleListManager({ pubId, bottleList, tapList = [], isLoading }: BottleListManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BottleItem | null>(null);
  const [fullEditOpen, setFullEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    beerId: "",
    price: "",
    quantity: "",
    size: "33cl",
    format: "bottiglia",
    vintage: "",
    description: "",
    isVisible: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Local ordered state for drag-and-drop ──────────────────────────────────
  const [localBottles, setLocalBottles] = useState<any[]>(() =>
    [...(bottleList || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  );
  const bottleDragFrom = useRef<number | null>(null);
  const [bottleDragOver, setBottleDragOver] = useState<number | null>(null);

  useEffect(() => {
    setLocalBottles([...bottleList].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
  }, [bottleList]);

  const reorderBottlesMutation = useMutation({
    mutationFn: (order: { id: number; orderIndex: number }[]) =>
      apiRequest(`/api/pubs/${pubId}/bottles/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore ordinamento", variant: "destructive" });
      setLocalBottles([...bottleList].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] }),
  });

  const handleBottleDragStart = (e: React.DragEvent, idx: number) => {
    bottleDragFrom.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleBottleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setBottleDragOver(idx);
  };
  const handleBottleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const from = bottleDragFrom.current;
    setBottleDragOver(null);
    bottleDragFrom.current = null;
    if (from === null || from === dropIdx) return;
    const next = [...localBottles];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    setLocalBottles(next);
    reorderBottlesMutation.mutate(next.map((b, i) => ({ id: b.id, orderIndex: i })));
  };
  const handleBottleDragEnd = () => { setBottleDragOver(null); bottleDragFrom.current = null; };
  // ───────────────────────────────────────────────────────────────────────────

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Search beers for adding to bottle list
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.length < 2) return null;
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Full beer details for the "Modifica scheda" dialog (editing an existing bottle).
  // Loaded before opening BeerFullEditDialog so we never PATCH partial data over the real beer.
  const editingBeerId = editingItem?.beer?.id;
  const { data: selectedBeerFull } = useQuery<any>({
    queryKey: ["/api/beers", String(editingBeerId)],
    queryFn: () => apiRequest(`/api/beers/${editingBeerId}`),
    enabled: !!editingBeerId && isAddDialogOpen,
    staleTime: 60000,
  });

  // Add bottle item mutation
  const addBottleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/bottles`, { method: "POST" }, data);
    },
    onSuccess: () => {
      toast({ title: "Birra aggiunta alla cantina!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la birra", variant: "destructive" });
    },
  });

  // Update bottle item mutation
  const updateBottleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/bottles/${editingItem?.id}`, { method: "PATCH" }, data);
    },
    onSuccess: () => {
      toast({ title: "Birra aggiornata!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
      setIsAddDialogOpen(false);
      setEditingItem(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la birra", variant: "destructive" });
    },
  });

  // Delete bottle item mutation
  const deleteBottleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/bottles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Birra rimossa dalla cantina!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere la birra", variant: "destructive" });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/bottles/${id}`, { method: "PATCH" }, { isVisible });
    },
    onMutate: async ({ id, isVisible }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
      const prev = queryClient.getQueryData(["/api/pubs", String(pubId), "bottles"]);
      queryClient.setQueryData(["/api/pubs", String(pubId), "bottles"], (old: any) =>
        Array.isArray(old) ? old.map((b: any) => b.id === id ? { ...b, isVisible } : b) : old
      );
      return { prev };
    },
    onSuccess: (data, { id }) => {
      if (data?.isVisible !== undefined) {
        queryClient.setQueryData(["/api/pubs", String(pubId), "bottles"], (old: any) =>
          Array.isArray(old) ? old.map((b: any) => b.id === id ? { ...b, isVisible: data.isVisible } : b) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", String(pubId), "bottles"], ctx.prev);
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      beerId: "",
      price: "",
      quantity: "",
      size: "33cl",
      format: "bottiglia",
      vintage: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const findTapItem = (beerId: number | null | undefined) => {
    if (!beerId) return null;
    return tapList.find((tapItem: any) => tapItem.beer?.id === beerId);
  };

  const handleDeleteBottleItem = async (item: BottleItem) => {
    if (!confirm('Sei sicuro di voler rimuovere questa birra dalla cantina?')) return;
    await apiRequest(`/api/pubs/${pubId}/bottles/${item.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
    toast({ title: "Birra rimossa dalla cantina" });
  };

  const handleToggleBottleVisibility = async (item: BottleItem) => {
    const newVisible = !item.isVisible;

    const applyBottle = (v: boolean) =>
      queryClient.setQueryData(["/api/pubs", String(pubId), "bottles"], (old: any) =>
        Array.isArray(old) ? old.map((b: any) => b.id === item.id ? { ...b, isVisible: v } : b) : old
      );

    applyBottle(newVisible);

    try {
      const updatedBottle = await apiRequest(`/api/pubs/${pubId}/bottles/${item.id}`, { method: "PATCH" }, { isVisible: newVisible });
      if (updatedBottle?.isVisible !== undefined) applyBottle(updatedBottle.isVisible);
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
      toast({ title: newVisible ? "Birra visibile in cantina" : "Birra nascosta dalla cantina" });
    } catch {
      applyBottle(item.isVisible ?? true);
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    }
  };

  const startEdit = (item: BottleItem) => {
    setEditingItem(item);
    setFormData({
      beerId: item.beer?.id?.toString() || "",
      price: item.price || "",
      quantity: item.quantity?.toString() || "",
      size: item.size || "33cl",
      format: (item as any).format || "bottiglia",
      vintage: item.vintage || "",
      description: item.description || "",
      isVisible: item.isVisible ?? true,
    });
  };

  const handleSubmit = () => {
    if (!formData.beerId) {
      toast({ title: "Seleziona una birra", description: "È necessario selezionare una birra per continuare", variant: "destructive" });
      return;
    }

    if (!formData.price) {
      toast({ title: "Prezzo mancante", description: "Inserisci il prezzo della birra", variant: "destructive" });
      return;
    }

    // Validate price
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Prezzo non valido", description: "Il prezzo deve essere un numero maggiore di zero", variant: "destructive" });
      return;
    }

    // Additional validation for numeric values
    const beerIdNum = parseInt(formData.beerId);
    
    if (isNaN(beerIdNum) || beerIdNum <= 0) {
      toast({ title: "Errore di sistema", description: "Si è verificato un problema. Riprova a selezionare la birra", variant: "destructive" });
      return;
    }
    
    // Quantity is optional - default to 0 if empty or invalid
    let quantityNum = 0;
    if (formData.quantity && formData.quantity.trim() !== "") {
      quantityNum = parseInt(formData.quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        toast({ title: "Quantità non valida", description: "Inserisci un numero valido per la quantità (o lascia vuoto)", variant: "destructive" });
        return;
      }
    }

    const submitData = {
      beerId: beerIdNum,
      price: formData.price,
      quantity: quantityNum,
      size: formData.size || null,
      format: formData.format || "bottiglia",
      vintage: formData.vintage || null,
      description: formData.description || null,
      isVisible: formData.isVisible,
    };

    if (editingItem) {
      updateBottleMutation.mutate(submitData);
    } else {
      addBottleMutation.mutate(submitData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestione Cantina Birre</span>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setFullEditOpen(false);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-11 gap-1.5 text-sm font-medium">
                <Plus className="w-3.5 h-3.5" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifica Birra" : "Aggiungi Birra alla Cantina"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modifica i dettagli della birra" : "Cerca e seleziona una birra da aggiungere alla cantina"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ricerca Birra o Birra Selezionata */}
                {!editingItem && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Seleziona Birra</Label>
                    
                    {/* Mostra birra selezionata */}
                    {formData.beerId && searchResults?.beers?.find((b: any) => b?.id?.toString() === formData.beerId) ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        {(() => {
                          const selectedBeer = searchResults.beers.find((b: any) => b?.id?.toString() === formData.beerId);
                          return (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900">{selectedBeer?.name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {selectedBeer?.brewery?.name || 'Birrificio sconosciuto'} • {selectedBeer?.style} • {selectedBeer?.abv}% ABV
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFormData({ ...formData, beerId: '' });
                                  setSearchTerm('');
                                }}
                              >
                                Cambia
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          {isSearching ? (
                            <Loader2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
                          ) : (
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          )}
                          <Input
                            placeholder="Cerca per nome o birrificio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {searchResults?.beers && searchResults.beers.length > 0 && !formData.beerId && (
                          <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-[#0B0D10]">
                            {searchResults.beers.map((beer: any, idx: number) => (
                              <div
                                key={beer?.id ?? `result-${idx}`}
                                className="p-3 hover:bg-gray-50 dark:hover:bg-[#1A1D24] cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => {
                                  setFormData({ ...formData, beerId: beer?.id?.toString() || "" });
                                }}
                              >
                                <div className="font-medium text-gray-900 dark:text-white">{beer?.name || "Birra sconosciuta"}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {beer?.brewery?.name || "Birrificio sconosciuto"} • {beer?.style || "Stile sconosciuto"} • {beer?.abv || "0"}% ABV
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {debouncedSearchTerm.length >= 2 && searchResults?.beers?.length === 0 && !isSearching && (
                          <div className="p-4 border border-dashed rounded-lg text-center text-gray-500">
                            <p className="mb-2">Nessuna birra trovata per "{debouncedSearchTerm}"</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open('/admin/dashboard?tab=beers&action=create', '_blank');
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Crea nuova birra
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Birra Selezionata (per editing) */}
                {editingItem && (() => {
                  const displayBeer = selectedBeerFull ?? editingItem.beer;
                  return (
                  <div className="p-4 bg-gray-50 dark:bg-[#1A1D24] rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white">{displayBeer?.name || "Birra sconosciuta"}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {displayBeer?.brewery?.name || "Birrificio sconosciuto"} • {displayBeer?.style || "Stile sconosciuto"} • {displayBeer?.abv || "0"}% ABV
                        </div>
                      </div>
                      {editingItem.beer?.id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0 gap-1.5"
                          disabled={!selectedBeerFull?.id}
                          onClick={() => setFullEditOpen(true)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Modifica scheda
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })()}

                {/* Prezzo e Formato Inline */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Prezzo (€) *</Label>
                    <Input
                      type="number"
                      step="0.10"
                      min="0"
                      placeholder="5.50"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      data-testid="input-price"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Formato *</Label>
                    <Input
                      type="text"
                      placeholder="es. 33cl, 50cl, 75cl..."
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      data-testid="input-size"
                      list="bottle-sizes"
                    />
                    <datalist id="bottle-sizes">
                      <option value="25cl" />
                      <option value="33cl" />
                      <option value="35cl" />
                      <option value="50cl" />
                      <option value="66cl" />
                      <option value="75cl" />
                      <option value="1L" />
                      <option value="1.5L" />
                    </datalist>
                  </div>
                </div>

                {/* Tipo contenitore: bottiglia / lattina */}
                <div>
                  <Label className="text-sm font-medium mb-1 block">Tipo contenitore</Label>
                  <div className="flex gap-2">
                    {(["bottiglia", "lattina"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormData({ ...formData, format: f })}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                          formData.format === f
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-card border-stone-200 dark:border-border text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span>{f === "bottiglia" ? "🍺" : "🥫"}</span>
                        <span className="capitalize">{f}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Quantità</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Disponibili"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      data-testid="input-quantity"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Annata</Label>
                    <Input
                      placeholder="2023"
                      value={formData.vintage}
                      onChange={(e) => setFormData({ ...formData, vintage: e.target.value })}
                      data-testid="input-vintage"
                    />
                  </div>
                </div>

                {/* Visibilità e Descrizione */}
                <div className="flex items-center space-x-3">
                  <Switch
                    id="visible"
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                    data-testid="switch-visible"
                  />
                  <Label htmlFor="visible" className="text-sm font-medium">Visibile al pubblico</Label>
                </div>

                <div>
                  <Label className="text-sm font-medium">Note aggiuntive</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Caratteristiche speciali, note di degustazione..."
                    maxChars={2000}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={addBottleMutation.isPending || updateBottleMutation.isPending}
                    className="min-h-11"
                  >
                    {(addBottleMutation.isPending || updateBottleMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingItem ? "Salva modifiche" : "Aggiungi alla cantina"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modifica Scheda Birra — riusa lo stesso dialog della taplist */}
          {fullEditOpen && selectedBeerFull?.id && (
            <BeerFullEditDialog
              beer={selectedBeerFull}
              open={fullEditOpen}
              onOpenChange={setFullEditOpen}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
                if (editingBeerId) queryClient.invalidateQueries({ queryKey: ["/api/beers", String(editingBeerId)] });
              }}
            />
          )}
        </CardTitle>
        <CardDescription>
          Gestisci le birre in bottiglia della cantina
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card">
                <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                </div>
                <div className="h-8 w-16 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : bottleList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wine className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nessuna birra in cantina.</p>
            <p className="text-sm">Clicca "Aggiungi Birra" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localBottles.map((item, itemIdx) => {
              if (!item || !item.id) return null;
              
              const safeItem = {
                ...item,
                beer: item.beer || {},
                isVisible: item.isVisible ?? true,
                price: item.price || "0.00",
                quantity: item.quantity || 0
              };
              
              const safeBeer = {
                name: safeItem.beer?.name || "Birra sconosciuta",
                logoUrl: (safeItem.beer as any)?.imageUrl || safeItem.beer?.logoUrl,
                style: safeItem.beer?.style || "Stile sconosciuto",
                abv: safeItem.beer?.abv || "0",
                brewery: {
                  name: safeItem.beer?.brewery?.name || "Birrificio sconosciuto"
                }
              };
              
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleBottleDragStart(e, itemIdx)}
                  onDragOver={(e) => handleBottleDragOver(e, itemIdx)}
                  onDrop={(e) => handleBottleDrop(e, itemIdx)}
                  onDragEnd={handleBottleDragEnd}
                  onDragLeave={() => setBottleDragOver(null)}
                  className={`border rounded-lg p-4 transition-colors cursor-grab active:cursor-grabbing ${
                    bottleDragOver === itemIdx ? 'border-primary ring-2 ring-primary/20' : ''
                  } ${!safeItem.isVisible ? 'opacity-60 bg-gray-50 dark:bg-[#1A1D24]/50' : 'bg-white dark:bg-[#0B0D10]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab" />
                      <ImageWithFallback
                        src={safeBeer.logoUrl}
                        alt={safeBeer.name}
                        imageType="beer"
                        containerClassName="w-12 h-12 rounded-lg flex-shrink-0"
                        className="w-12 h-12 rounded-lg object-cover"
                        iconSize="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base text-gray-900 dark:text-white break-words">{safeBeer.name}</h3>
                          {safeItem.vintage && (
                            <Badge variant="outline" className="text-xs flex-shrink-0 border-purple-300 text-purple-700 dark:text-purple-400">
                              {safeItem.vintage}
                            </Badge>
                          )}
                          {!safeItem.isVisible && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Nascosta
                            </Badge>
                          )}
                          {findTapItem(item.beer?.id) && (
                            <Badge variant="outline" className="text-xs flex-shrink-0 border-amber-300 text-amber-700 dark:text-amber-400">
                              anche alla spina
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{safeBeer.brewery.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {safeBeer.style} • {safeBeer.abv}% ABV • {safeItem.size || "33cl"}
                          </span>
                          {(item.beer as any)?.isGlutenFree && (
                            <GlutenFreeSmallBadge size={11} />
                          )}
                          {(item.beer as any)?.isAlcoholFree && (
                            <AlcoholFreeBadge size={10} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleBottleVisibility(item)}
                        className="h-11 w-11 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={safeItem.isVisible ? `Nascondi ${safeBeer.name} dalla cantina` : `Mostra ${safeBeer.name} in cantina`}
                      >
                        {safeItem.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          startEdit(item);
                          setIsAddDialogOpen(true);
                        }}
                        className="h-11 w-11 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={`Modifica ${safeBeer.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBottleItem(item)}
                        className="h-11 w-11 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        aria-label={`Rimuovi ${safeBeer.name} dalla cantina`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 ml-[60px]">
                    <Badge variant="outline" className="text-xs font-medium bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300">
                      €{safeItem.price} • {safeItem.size || "33cl"}
                    </Badge>
                    {safeItem.quantity > 0 && (
                      <Badge variant="outline" className="text-xs font-medium bg-gray-50 dark:bg-[#1A1D24] border-gray-200 dark:border-[#23262E] text-gray-600 dark:text-gray-400">
                        {safeItem.quantity} disponibili
                      </Badge>
                    )}
                  </div>

                  {safeItem.description && (
                    <div className="mt-3 ml-[60px]">
                      <RichTextDisplay html={safeItem.description} className="text-sm italic text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}