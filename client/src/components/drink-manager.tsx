import { useState, useRef, useEffect } from "react";
import { useTouchReorder, useTouchReorderInGroup } from "@/hooks/useTouchReorder";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { AllergenSelector } from "@/components/allergen-selector";
import {
  Plus, Edit3, Trash2, Eye, EyeOff, GlassWater, Loader2,
  GripVertical, ChevronDown, ChevronRight, Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const catEmoji = (type: string) => (type === "vino" ? "🍷" : "🏷️");

const EMPTY_CAT_FORM = { name: "", type: "custom" as string, description: "", infoBox: "", isVisible: true };

const EMPTY_ITEM_FORM = {
  name: "", description: "", price: "", priceByGlass: "", priceByBottle: "",
  imageUrl: "", isVisible: true, allergens: [] as string[],
  vintage: "", produttore: "", alcoholDegree: "", volumeCl: "",
};

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────
interface DrinkManagerProps { pubId: number }

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export function DrinkManager({ pubId }: DrinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const QK = ["/api/pubs", String(pubId), "drink-categories"];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK });

  // ── Data ─────────────────────────────────────────────
  const { data, isLoading } = useQuery<any[]>({
    queryKey: QK,
    queryFn: () => apiRequest(`/api/pubs/${pubId}/drink-categories/all`),
    staleTime: 0,
  });
  // Coerce to array once; guards against error/undefined bodies.
  const categories = Array.isArray(data) ? data : [];

  // ── Local ordered state for drag-and-drop ────────────
  const [localCats, setLocalCats] = useState<any[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragFromIdx = useRef<number | null>(null);
  // Depend on the raw query `data` (stable `undefined` while loading/error), NOT on the
  // defaulted `categories`: a fresh `[]` identity every render made this effect re-run on
  // every render whenever the query returned no array → setState loop → React #185.
  useEffect(() => {
    if (!Array.isArray(data)) return;
    setLocalCats([...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
  }, [data]);

  const reorderMutation = useMutation({
    mutationFn: (order: { id: number; orderIndex: number }[]) =>
      apiRequest(`/api/pubs/${pubId}/drink-categories/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore ordinamento", variant: "destructive" });
      setLocalCats([...categories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
      invalidate();
    },
    onSuccess: () => invalidate(),
  });

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragFromIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const from = dragFromIdx.current;
    setDragOverIdx(null);
    dragFromIdx.current = null;
    if (from === null || from === dropIdx) return;
    const next = [...localCats];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    setLocalCats(next);
    reorderMutation.mutate(next.map((c, i) => ({ id: c.id, orderIndex: i })));
  };
  const handleDragEnd = () => { setDragOverIdx(null); dragFromIdx.current = null; };

  // ── Touch drag for categories (iOS / Capacitor) ───────────────────────────
  const { startTouchDrag } = useTouchReorder({
    onReorder: (from, to) => {
      const next = [...localCats];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setLocalCats(next);
      reorderMutation.mutate(next.map((c, i) => ({ id: c.id, orderIndex: i })));
    },
    setDragOver: setDragOverIdx,
  });

  // ── Per-item drag-and-drop ────────────────────────────
  const itemDragFrom = useRef<{ catIdx: number; itemIdx: number } | null>(null);
  const [itemDragOver, setItemDragOver] = useState<{ catIdx: number; itemIdx: number } | null>(null);

  const reorderItemsMutation = useMutation({
    mutationFn: ({ catId, order }: { catId: number; order: { id: number; orderIndex: number }[] }) =>
      apiRequest(`/api/pubs/${pubId}/drink-categories/${catId}/items/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore ordinamento prodotti", variant: "destructive" });
      if (Array.isArray(data)) setLocalCats([...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)));
      invalidate();
    },
    onSuccess: () => invalidate(),
  });

  const handleItemDragStart = (e: React.DragEvent, catIdx: number, itemIdx: number) => {
    e.stopPropagation();
    itemDragFrom.current = { catIdx, itemIdx };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `item-${catIdx}-${itemIdx}`);
  };
  const handleItemDragOver = (e: React.DragEvent, catIdx: number, itemIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setItemDragOver({ catIdx, itemIdx });
  };
  const handleItemDrop = (e: React.DragEvent, catIdx: number, dropItemIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const from = itemDragFrom.current;
    setItemDragOver(null);
    itemDragFrom.current = null;
    if (!from || from.catIdx !== catIdx || from.itemIdx === dropItemIdx) return;
    const nextCats = [...localCats];
    const items = [...(nextCats[catIdx].items || [])];
    const [moved] = items.splice(from.itemIdx, 1);
    items.splice(dropItemIdx, 0, moved);
    nextCats[catIdx] = { ...nextCats[catIdx], items };
    setLocalCats(nextCats);
    reorderItemsMutation.mutate({
      catId: nextCats[catIdx].id,
      order: items.map((item: any, i: number) => ({ id: item.id, orderIndex: i })),
    });
  };
  const handleItemDragEnd = () => { setItemDragOver(null); itemDragFrom.current = null; };

  // ── Touch drag for items (iOS / Capacitor) ────────────────────────────────
  const { startTouchDragInGroup } = useTouchReorderInGroup({
    onReorder: (groupStr, fromIdx, toIdx) => {
      const catIdx = parseInt(groupStr, 10);
      const nextCats = [...localCats];
      const items = [...(nextCats[catIdx].items || [])];
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      nextCats[catIdx] = { ...nextCats[catIdx], items };
      setLocalCats(nextCats);
      reorderItemsMutation.mutate({
        catId: nextCats[catIdx].id,
        order: items.map((item: any, i: number) => ({ id: item.id, orderIndex: i })),
      });
    },
    setDragOver: (state) =>
      setItemDragOver(state ? { catIdx: parseInt(state.group, 10), itemIdx: state.idx } : null),
  });

  // ── Expand / collapse ────────────────────────────────
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Category create dialog ────────────────────────────
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT_FORM);
  const catNameRef = useRef<HTMLInputElement>(null);
  const catDescRef = useRef<HTMLTextAreaElement>(null);
  const catInfoRef = useRef<HTMLTextAreaElement>(null);
  const catVisRef = useRef<boolean>(true);

  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm(EMPTY_CAT_FORM);
    catVisRef.current = true;
    setCatDialogOpen(true);
  };
  const openEditCat = (cat: any) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, type: cat.type ?? "custom", description: cat.description ?? "", infoBox: cat.infoBox ?? "", isVisible: cat.isVisible ?? true });
    catVisRef.current = cat.isVisible ?? true;
    setCatDialogOpen(true);
  };

  const createCatMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/pubs/${pubId}/drink-categories`, { method: "POST" }, data),
    onSuccess: () => { toast({ title: "✅ Sezione creata" }); invalidate(); setCatDialogOpen(false); },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });
  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/pubs/${pubId}/drink-categories/${id}`, { method: "PATCH" }, data),
    onSuccess: () => { toast({ title: "✅ Sezione aggiornata" }); invalidate(); setCatDialogOpen(false); },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });
  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/drink-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "🗑️ Sezione eliminata" }); invalidate(); },
    onError: () => toast({ title: "Errore eliminazione", variant: "destructive" }),
  });
  const toggleCatMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/drink-categories/${id}/toggle-visibility`, { method: "PATCH" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QK });
      queryClient.setQueryData(QK, (old: any[]) =>
        Array.isArray(old) ? old.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c) : old
      );
    },
    onSettled: () => invalidate(),
  });

  const handleCatSubmit = () => {
    const name = catNameRef.current?.value?.trim() || "";
    if (!name) { toast({ title: "Nome sezione obbligatorio", variant: "destructive" }); return; }
    const data = {
      name,
      type: catForm.type,
      description: catDescRef.current?.value?.trim() || null,
      infoBox: catInfoRef.current?.value?.trim() || null,
      isVisible: catVisRef.current,
    };
    if (editingCat) updateCatMutation.mutate({ id: editingCat.id, data });
    else createCatMutation.mutate(data);
  };

  // ── Item dialog ──────────────────────────────────────
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemCatId, setItemCatId] = useState<number | null>(null);
  const [itemCatType, setItemCatType] = useState<string>("custom");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  const openAddItem = (cat: any) => {
    setEditingItem(null);
    setItemCatId(cat.id);
    setItemCatType(cat.type ?? "custom");
    setItemForm(EMPTY_ITEM_FORM);
    setItemDialogOpen(true);
  };
  const openEditItem = (cat: any, item: any) => {
    setEditingItem(item);
    setItemCatId(cat.id);
    setItemCatType(cat.type ?? "custom");
    setItemForm({
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.price ?? "",
      priceByGlass: item.priceByGlass ?? "",
      priceByBottle: item.priceByBottle ?? "",
      imageUrl: item.imageUrl ?? "",
      isVisible: item.isVisible ?? true,
      allergens: item.allergens ?? [],
      vintage: item.vintage ? String(item.vintage) : "",
      produttore: item.distillery ?? "",
      alcoholDegree: item.alcoholDegree ?? "",
      volumeCl: item.volumeCl ? String(item.volumeCl) : "",
    });
    setItemDialogOpen(true);
  };

  const isWine = itemCatType === "vino";

  const buildItemPayload = () => ({
    pubId,
    category: String(itemCatId),
    name: itemForm.name,
    description: itemForm.description || null,
    price: !isWine && itemForm.price ? parseFloat(itemForm.price) : null,
    priceByGlass: isWine && itemForm.priceByGlass ? parseFloat(itemForm.priceByGlass) : null,
    priceByBottle: isWine && itemForm.priceByBottle ? parseFloat(itemForm.priceByBottle) : null,
    imageUrl: itemForm.imageUrl || null,
    isVisible: itemForm.isVisible,
    isAvailable: true,
    allergens: itemForm.allergens,
    vintage: isWine && itemForm.vintage ? parseInt(itemForm.vintage) : null,
    region: null,
    grapeVariety: null,
    distillery: itemForm.produttore || null,
    alcoholDegree: itemForm.alcoholDegree ? parseFloat(itemForm.alcoholDegree) : null,
    volumeCl: itemForm.volumeCl ? parseInt(itemForm.volumeCl) : null,
  });

  const saveItemMutation = useMutation({
    mutationFn: (payload: any) =>
      editingItem
        ? apiRequest(`/api/pubs/${pubId}/drinks/${editingItem.id}`, { method: "PATCH" }, payload)
        : apiRequest(`/api/pubs/${pubId}/drinks`, { method: "POST" }, payload),
    onSuccess: () => {
      toast({ title: editingItem ? "✅ Prodotto aggiornato" : "✅ Prodotto aggiunto" });
      invalidate();
      setItemDialogOpen(false);
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/drinks/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "🗑️ Eliminato" }); invalidate(); },
    onError: () => toast({ title: "Errore eliminazione", variant: "destructive" }),
  });

  const toggleItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/drink-items/${id}/toggle-visibility`, { method: "PATCH" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QK });
      queryClient.setQueryData(QK, (old: any[]) =>
        Array.isArray(old)
          ? old.map(c => ({ ...c, items: (c.items || []).map((i: any) => i.id === id ? { ...i, isVisible: !i.isVisible } : i) }))
          : old
      );
    },
    onSettled: () => invalidate(),
  });

  const handleItemSubmit = () => {
    if (!itemForm.name.trim()) { toast({ title: "Nome obbligatorio", variant: "destructive" }); return; }
    saveItemMutation.mutate(buildItemPayload());
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bevande</h2>
          <p className="text-sm text-muted-foreground">Sezioni e prodotti — trascina per riordinare</p>
        </div>
        <Button onClick={openCreateCat} className="min-h-11 gap-1.5">
          <Plus className="w-4 h-4" /> Nuova sezione
        </Button>
      </div>

      {/* Empty state */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : localCats.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mx-auto flex items-center justify-center">
            <GlassWater className="w-8 h-8 text-white" />
          </div>
          <p className="font-semibold">Nessuna sezione</p>
          <p className="text-sm text-muted-foreground">Crea una sezione per iniziare (es. Vini, Cocktails, Spirits)</p>
          <Button onClick={openCreateCat} className="gap-1.5 mt-2">
            <Plus className="w-4 h-4" /> Crea prima sezione
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {localCats.map((cat, idx) => {
            const isExpanded = expanded.has(cat.id);
            const isDragOver = dragOverIdx === idx;
            return (
              <div
                key={cat.id}
                draggable
                data-touch-sort-idx={idx}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIdx(null)}
                className={`rounded-2xl border transition-all ${
                  isDragOver
                    ? "border-primary border-dashed bg-primary/5"
                    : cat.isVisible
                    ? "border-stone-200 dark:border-border bg-card"
                    : "border-dashed border-stone-200 dark:border-border bg-card opacity-60"
                }`}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 p-3">
                  <div
                    className="cursor-grab text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    style={{ touchAction: 'none' }}
                    onTouchStart={e => startTouchDrag(e, idx)}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span className="text-base leading-none flex-shrink-0">{catEmoji(cat.type)}</span>
                    <span className="font-semibold text-sm text-foreground truncate">{cat.name}</span>
                    {cat.description && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">{cat.description}</span>
                    )}
                    <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
                      {(cat.items || []).length}
                    </Badge>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => toggleCatMutation.mutate(cat.id)}
                      className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                      title={cat.isVisible ? "Nascondi sezione" : "Mostra sezione"}
                      aria-label={cat.isVisible ? `Nascondi ${cat.name}` : `Mostra ${cat.name}`}
                    >
                      {cat.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditCat(cat)}
                      className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                      aria-label={`Modifica ${cat.name}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Eliminare la sezione "${cat.name}" e tutti i suoi prodotti?`)) return;
                        deleteCatMutation.mutate(cat.id);
                      }}
                      className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-red-500"
                      aria-label={`Elimina ${cat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* InfoBox */}
                {isExpanded && cat.infoBox && (
                  <div className="mx-3 mb-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl px-3 py-2">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{cat.infoBox}</span>
                  </div>
                )}

                {/* Items list */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {(cat.items || []).length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4">
                        Nessun prodotto — aggiungi il primo
                      </p>
                    ) : (
                      (cat.items || []).map((item: any, itemIdx: number) => {
                        const isItemDragOver =
                          itemDragOver?.catIdx === idx && itemDragOver?.itemIdx === itemIdx;
                        return (
                        <Card
                          key={item.id}
                          draggable
                          data-touch-sort-idx={itemIdx}
                          data-touch-sort-group={String(idx)}
                          onDragStart={e => handleItemDragStart(e, idx, itemIdx)}
                          onDragOver={e => handleItemDragOver(e, idx, itemIdx)}
                          onDrop={e => handleItemDrop(e, idx, itemIdx)}
                          onDragEnd={handleItemDragEnd}
                          onDragLeave={() => setItemDragOver(null)}
                          className={`border transition-all ${
                            isItemDragOver
                              ? "border-primary border-dashed bg-primary/5"
                              : item.isVisible
                              ? "border-stone-100 dark:border-border"
                              : "opacity-50 border-dashed border-stone-200 dark:border-border"
                          }`}
                        >
                          <CardContent className="p-3 flex items-center gap-2">
                            <div
                              className="cursor-grab text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                              style={{ touchAction: 'none' }}
                              onTouchStart={e => startTouchDragInGroup(e, String(idx), itemIdx)}
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#1A1D24] flex items-center justify-center flex-shrink-0 text-base">
                                {catEmoji(cat.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground leading-snug">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.vintage && <span className="text-xs text-muted-foreground">{item.vintage}</span>}
                                {item.distillery && <span className="text-xs text-muted-foreground">{item.distillery}</span>}
                                {item.priceByGlass && <span className="text-xs font-medium text-primary">Calice €{parseFloat(item.priceByGlass).toFixed(2)}</span>}
                                {item.priceByBottle && <span className="text-xs font-medium">Bottiglia €{parseFloat(item.priceByBottle).toFixed(2)}</span>}
                                {item.price && !item.priceByGlass && !item.priceByBottle && (
                                  <span className="text-xs font-medium text-primary">€{parseFloat(item.price).toFixed(2)}</span>
                                )}
                                {item.alcoholDegree && <span className="text-xs text-muted-foreground">{item.alcoholDegree}%</span>}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => toggleItemMutation.mutate(item.id)}
                                className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                                aria-label={item.isVisible ? `Nascondi ${item.name}` : `Mostra ${item.name}`}
                              >
                                {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => openEditItem(cat, item)}
                                className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                                aria-label={`Modifica ${item.name}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!confirm(`Eliminare "${item.name}"?`)) return;
                                  deleteItemMutation.mutate(item.id);
                                }}
                                className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-red-500"
                                aria-label={`Elimina ${item.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })
                    )}
                    <Button
                      size="sm" variant="outline"
                      className="w-full gap-1.5 border-dashed mt-1"
                      onClick={() => openAddItem(cat)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Aggiungi prodotto
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Category create/edit dialog ── */}
      <Dialog open={catDialogOpen} onOpenChange={o => { if (!o) setCatDialogOpen(false); }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Modifica sezione" : "Nuova sezione"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Tipo */}
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Tipo</Label>
              <div className="flex gap-2">
                {[
                  { value: "vino", label: "Vini", emoji: "🍷" },
                  { value: "custom", label: "Personalizzata", emoji: "🏷️" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCatForm(f => ({ ...f, type: opt.value }))}
                    className={`flex flex-1 items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      catForm.type === opt.value
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-card border-stone-200 dark:border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{opt.emoji}</span><span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label htmlFor="cat-name" className="text-sm font-bold">Nome sezione *</Label>
              <Input
                ref={catNameRef}
                id="cat-name"
                defaultValue={catForm.name}
                placeholder="es. Vini, Cocktails, Birre Artigianali…"
                className="mt-1"
              />
            </div>

            {/* Descrizione */}
            <div>
              <Label htmlFor="cat-desc" className="text-sm font-bold">Descrizione (opzionale)</Label>
              <Textarea
                ref={catDescRef}
                id="cat-desc"
                defaultValue={catForm.description}
                placeholder="Breve descrizione della sezione…"
                rows={2}
                className="mt-1"
              />
            </div>

            {/* InfoBox */}
            <div>
              <Label htmlFor="cat-info" className="text-sm font-bold">Info box (opzionale)</Label>
              <p className="text-xs text-muted-foreground mb-1">Nota evidenziata nel menu pubblico</p>
              <Textarea
                ref={catInfoRef}
                id="cat-info"
                defaultValue={catForm.infoBox}
                placeholder="es. Tutti i vini sono italiani a km 0…"
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Visibilità */}
            <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#0B0D10]/20 rounded-xl border border-stone-200 dark:border-border/30">
              <div>
                <Label className="text-sm font-bold">Visibile nel menu pubblico</Label>
                <p className="text-xs text-muted-foreground">I clienti vedono questa sezione</p>
              </div>
              <Switch
                defaultChecked={catForm.isVisible}
                onCheckedChange={v => { catVisRef.current = v; }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={handleCatSubmit}
                disabled={createCatMutation.isPending || updateCatMutation.isPending}
              >
                {(createCatMutation.isPending || updateCatMutation.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : editingCat ? "Salva" : "Crea sezione"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Item add/edit dialog ── */}
      <Dialog open={itemDialogOpen} onOpenChange={o => { if (!o) setItemDialogOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Modifica prodotto" : "Aggiungi prodotto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Nome */}
            <div>
              <Label className="text-sm font-bold">Nome *</Label>
              <Input
                value={itemForm.name}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                placeholder={isWine ? "es. Barolo Riserva" : "Nome prodotto"}
                className="mt-1"
              />
            </div>

            {/* Prezzi */}
            <div className="grid grid-cols-2 gap-3">
              {isWine ? (
                <>
                  <div>
                    <Label className="text-sm font-medium">Calice (€)</Label>
                    <Input type="number" step="0.10" min="0"
                      value={itemForm.priceByGlass}
                      onChange={e => setItemForm(f => ({ ...f, priceByGlass: e.target.value }))}
                      placeholder="0.00" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bottiglia (€)</Label>
                    <Input type="number" step="0.50" min="0"
                      value={itemForm.priceByBottle}
                      onChange={e => setItemForm(f => ({ ...f, priceByBottle: e.target.value }))}
                      placeholder="0.00" className="mt-1" />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Prezzo (€)</Label>
                  <Input type="number" step="0.10" min="0"
                    value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00" className="mt-1" />
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Gradazione (%)</Label>
                <Input type="number" step="0.1" min="0" max="100"
                  value={itemForm.alcoholDegree}
                  onChange={e => setItemForm(f => ({ ...f, alcoholDegree: e.target.value }))}
                  placeholder="es. 13.5" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Volume (cl)</Label>
                <Input type="number" min="0"
                  value={itemForm.volumeCl}
                  onChange={e => setItemForm(f => ({ ...f, volumeCl: e.target.value }))}
                  placeholder="es. 75" className="mt-1" />
              </div>
            </div>

            {/* Annata + Produttore (vini) */}
            {isWine && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Annata</Label>
                  <Input type="number" min="1900" max={new Date().getFullYear()}
                    value={itemForm.vintage}
                    onChange={e => setItemForm(f => ({ ...f, vintage: e.target.value }))}
                    placeholder="es. 2021" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Produttore</Label>
                  <Input value={itemForm.produttore}
                    onChange={e => setItemForm(f => ({ ...f, produttore: e.target.value }))}
                    placeholder="es. Gaja" className="mt-1" />
                </div>
              </div>
            )}

            {/* Produttore/Brand per non-vini */}
            {!isWine && (
              <div>
                <Label className="text-sm font-medium">Produttore / Brand</Label>
                <Input value={itemForm.produttore}
                  onChange={e => setItemForm(f => ({ ...f, produttore: e.target.value }))}
                  placeholder="es. Campari, Hendrick's" className="mt-1" />
              </div>
            )}

            {/* Descrizione */}
            <div>
              <Label className="text-sm font-medium">Descrizione</Label>
              <Input value={itemForm.description}
                onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Note di degustazione, abbinamenti…" className="mt-1" />
            </div>

            <ImageUpload
              label="Immagine"
              currentImageUrl={itemForm.imageUrl || undefined}
              onImageChange={url => setItemForm(f => ({ ...f, imageUrl: url || "" }))}
              folder="drinks"
            />

            <AllergenSelector
              selectedAllergens={itemForm.allergens}
              onAllergensChange={a => setItemForm(f => ({ ...f, allergens: a }))}
            />

            <div className="flex items-center gap-3">
              <Switch
                checked={itemForm.isVisible}
                onCheckedChange={v => setItemForm(f => ({ ...f, isVisible: v }))}
              />
              <Label className="text-sm font-medium">Visibile al pubblico</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleItemSubmit} disabled={saveItemMutation.isPending}>
                {saveItemMutation.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {editingItem ? "Salva modifiche" : "Aggiungi prodotto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
