import { useState, useEffect, useRef } from "react";
import { useTouchReorderInGroup } from "@/hooks/useTouchReorder";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { 
  Utensils, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Beer,
  GripVertical,
} from "lucide-react";

const ALLERGENS_LIST = [
  "glutine",
  "lattosio", 
  "uova",
  "pesce",
  "crostacei",
  "molluschi",
  "frutta a guscio",
  "arachidi",
  "soia",
  "sesamo",
  "sedano",
  "senape",
  "lupini",
  "anidride solforosa"
];

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens: string[];
  isVisible: boolean;
  isAvailable: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  imageUrl?: string;
  pairingBeerName?: string;
  orderIndex: number;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  isVisible: boolean;
  orderIndex: number;
  items: MenuItem[];
}

interface MenuManagerProps {
  pubId: number;
  menu: MenuCategory[];
}

export function MenuManager({ pubId, menu }: MenuManagerProps) {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    isVisible: true,
  });

  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    allergens: [] as string[],
    isVisible: true,
    isAvailable: true,
    isVegetarian: false,
    isSpicy: false,
    imageUrl: "",
    pairingBeerName: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Local ordered state for item drag-and-drop ─────────────────────────────
  const [localMenu, setLocalMenu] = useState<MenuCategory[]>(() =>
    (menu || []).map(cat => ({
      ...cat,
      items: [...(cat.items || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    }))
  );
  const itemDragFrom = useRef<{ catId: number; idx: number } | null>(null);
  const [itemDragOver, setItemDragOver] = useState<{ catId: number; idx: number } | null>(null);

  useEffect(() => {
    setLocalMenu(menu.map(cat => ({
      ...cat,
      items: [...cat.items].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    })));
  }, [menu]);

  const reorderMenuItemsMutation = useMutation({
    mutationFn: ({ catId, order }: { catId: number; order: { id: number; orderIndex: number }[] }) =>
      apiRequest(`/api/pubs/${pubId}/menu-categories/${catId}/items/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore ordinamento", variant: "destructive" });
      setLocalMenu(menu.map(cat => ({ ...cat, items: [...cat.items].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)) })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
    },
  });

  const handleItemDragStart = (e: React.DragEvent, catId: number, idx: number) => {
    itemDragFrom.current = { catId, idx };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleItemDragOver = (e: React.DragEvent, catId: number, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setItemDragOver({ catId, idx });
  };
  const handleItemDrop = (e: React.DragEvent, dropCatId: number, dropIdx: number) => {
    e.preventDefault();
    const from = itemDragFrom.current;
    setItemDragOver(null);
    itemDragFrom.current = null;
    if (!from || from.catId !== dropCatId || from.idx === dropIdx) return;
    setLocalMenu(prev => prev.map(cat => {
      if (cat.id !== dropCatId) return cat;
      const items = [...cat.items];
      const [moved] = items.splice(from.idx, 1);
      items.splice(dropIdx, 0, moved);
      reorderMenuItemsMutation.mutate({ catId: dropCatId, order: items.map((it, i) => ({ id: it.id, orderIndex: i })) });
      return { ...cat, items };
    }));
  };
  const handleItemDragEnd = () => { setItemDragOver(null); itemDragFrom.current = null; };

  // ── Touch drag for items (iOS / Capacitor) ────────────────────────────────
  const { startTouchDragInGroup } = useTouchReorderInGroup({
    onReorder: (groupStr, fromIdx, toIdx) => {
      const catId = parseInt(groupStr, 10);
      setLocalMenu(prev => prev.map(cat => {
        if (cat.id !== catId) return cat;
        const items = [...cat.items];
        const [moved] = items.splice(fromIdx, 1);
        items.splice(toIdx, 0, moved);
        reorderMenuItemsMutation.mutate({ catId, order: items.map((it, i) => ({ id: it.id, orderIndex: i })) });
        return { ...cat, items };
      }));
    },
    setDragOver: (state) =>
      setItemDragOver(state ? { catId: parseInt(state.group, 10), idx: state.idx } : null),
  });
  // ───────────────────────────────────────────────────────────────────────────

  // Category mutations
  const addCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories`, "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Categoria aggiunta!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setIsAddCategoryOpen(false);
      resetCategoryForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la categoria", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories/${editingCategory?.id}`, { method: "PATCH" }, data);
    },
    onSuccess: () => {
      toast({ title: "Categoria aggiornata!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setEditingCategory(null);
      resetCategoryForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la categoria", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Categoria eliminata!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la categoria", variant: "destructive" });
    },
  });

  const toggleCategoryVisibilityMutation = useMutation({
    mutationFn: async ({ id }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories/${id}/toggle-visibility`, { method: "PATCH" });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      const prev = queryClient.getQueryData(["/api/pubs", String(pubId), "menu"]);
      queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
        Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: !cat.isVisible } : cat) : old
      );
      return { prev };
    },
    onSuccess: (data: any, { id }) => {
      if (data?.isVisible !== undefined) {
        queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
          Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: data.isVisible } : cat) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
    },
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], ctx.prev);
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  // Item mutations
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items`, "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Prodotto aggiunto!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setIsAddItemOpen(false);
      resetItemForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere il prodotto", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${editingItem?.id}`, { method: "PATCH" }, data);
    },
    onSuccess: () => {
      toast({ title: "Prodotto aggiornato!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setEditingItem(null);
      resetItemForm();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare il prodotto", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Prodotto eliminato!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il prodotto", variant: "destructive" });
    },
  });

  const toggleItemVisibilityMutation = useMutation({
    mutationFn: async ({ id }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}/toggle-visibility`, { method: "PATCH" });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      const prev = queryClient.getQueryData(["/api/pubs", String(pubId), "menu"]);
      queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
        Array.isArray(old) ? old.map((cat: any) => ({
          ...cat,
          items: (cat.items || []).map((item: any) => item.id === id ? { ...item, isVisible: !item.isVisible } : item)
        })) : old
      );
      return { prev };
    },
    onSuccess: (data: any, { id }) => {
      if (data?.isVisible !== undefined) {
        queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
          Array.isArray(old) ? old.map((cat: any) => ({
            ...cat,
            items: (cat.items || []).map((item: any) => item.id === id ? { ...item, isVisible: data.isVisible } : item)
          })) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
    },
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], ctx.prev);
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  const toggleItemAvailabilityMutation = useMutation({
    mutationFn: async ({ id }: { id: number; isAvailable: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}/toggle-availability`, { method: "PATCH" });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      const prev = queryClient.getQueryData(["/api/pubs", String(pubId), "menu"]);
      queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
        Array.isArray(old) ? old.map((cat: any) => ({
          ...cat,
          items: (cat.items || []).map((item: any) => item.id === id ? { ...item, isAvailable: !item.isAvailable } : item)
        })) : old
      );
      return { prev };
    },
    onSuccess: (data: any, { id }) => {
      if (data?.isAvailable !== undefined) {
        queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
          Array.isArray(old) ? old.map((cat: any) => ({
            ...cat,
            items: (cat.items || []).map((item: any) => item.id === id ? { ...item, isAvailable: data.isAvailable } : item)
          })) : old
        );
      }
    },
    onError: (_e: any, _v: any, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], ctx.prev);
      toast({ title: "Errore", description: "Impossibile aggiornare la disponibilità", variant: "destructive" });
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      isVisible: true,
    });
  };

  const resetItemForm = () => {
    setItemForm({
      name: "",
      description: "",
      price: "",
      allergens: [],
      isVisible: true,
      isAvailable: true,
      isVegetarian: false,
      isSpicy: false,
      imageUrl: "",
      pairingBeerName: "",
    });
  };

  const startEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      isVisible: category.isVisible,
    });
  };

  const startEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      allergens: item.allergens || [],
      isVisible: item.isVisible,
      isAvailable: item.isAvailable,
      isVegetarian: item.isVegetarian ?? false,
      isSpicy: item.isSpicy ?? false,
      imageUrl: item.imageUrl || "",
      pairingBeerName: item.pairingBeerName || "",
    });
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.name) {
      toast({ title: "Errore", description: "Il nome della categoria è obbligatorio", variant: "destructive" });
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate(categoryForm);
    } else {
      addCategoryMutation.mutate(categoryForm);
    }
  };

  const handleItemSubmit = () => {
    if (!itemForm.name || !itemForm.price) {
      toast({ title: "Errore", description: "Nome e prezzo sono obbligatori", variant: "destructive" });
      return;
    }

    if (!selectedCategoryId && !editingItem) {
      toast({ title: "Errore", description: "Seleziona una categoria", variant: "destructive" });
      return;
    }

    const submitData = {
      ...itemForm,
      categoryId: editingItem ? undefined : selectedCategoryId,
    };

    if (editingItem) {
      updateItemMutation.mutate(submitData);
    } else {
      addItemMutation.mutate(submitData);
    }
  };

  const toggleCategoryExpanded = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAllergenToggle = (allergen: string) => {
    const newAllergens = itemForm.allergens.includes(allergen)
      ? itemForm.allergens.filter(a => a !== allergen)
      : [...itemForm.allergens, allergen];
    
    setItemForm({ ...itemForm, allergens: newAllergens });
  };

  return (
    <Card className="bg-background border-stone-100 dark:border-border shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-stone-100 dark:border-border">
        <CardTitle className="flex items-center justify-between font-bold text-foreground">
          <div className="flex items-center gap-2">
            <Utensils className="text-primary w-5 h-5" />
            <span>Gestione Menu Cibo</span>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-stone-200 text-primary hover:bg-stone-50 rounded-xl font-semibold">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-stone-100 dark:border-border">
                <DialogHeader>
                  <DialogTitle className="font-bold text-foreground">
                    {editingCategory ? "Modifica Categoria" : "Aggiungi Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-foreground">Nome Categoria</Label>
                    <Input
                      placeholder="Antipasti, Primi, Secondi..."
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-foreground">Descrizione (opzionale)</Label>
                    <Textarea
                      placeholder="Descrizione della categoria..."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      rows={2}
                      className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cat-visible"
                      checked={categoryForm.isVisible}
                      onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isVisible: checked })}
                    />
                    <Label htmlFor="cat-visible" className="text-muted-foreground">Visibile al pubblico</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      className="border-stone-200 text-muted-foreground hover:bg-stone-50 rounded-xl"
                      onClick={() => {
                        setIsAddCategoryOpen(false);
                        setEditingCategory(null);
                        resetCategoryForm();
                      }}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleCategorySubmit} className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold">
                      {editingCategory ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Prodotto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border-stone-100 dark:border-border">
                <DialogHeader>
                  <DialogTitle className="font-bold text-foreground">
                    {editingItem ? "Modifica Prodotto" : "Aggiungi Prodotto"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!editingItem && (
                    <div>
                      <Label className="font-semibold text-foreground">Categoria</Label>
                      <select
                        className="w-full p-2 border border-stone-200 rounded-xl focus-visible:ring-primary/20 bg-background"
                        value={selectedCategoryId || ""}
                        onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
                      >
                        <option value="">Seleziona categoria...</option>
                        {menu.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-foreground">Nome Prodotto</Label>
                      <Input
                        placeholder="Nome del piatto..."
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-foreground">Prezzo (€)</Label>
                      <Input
                        type="number"
                        step="0.10"
                        placeholder="12.50"
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                        className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-foreground">Descrizione</Label>
                    <Textarea
                      placeholder="Descrizione del piatto, ingredienti..."
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      rows={3}
                      className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-foreground">Allergeni</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {ALLERGENS_LIST.map((allergen) => (
                        <div key={allergen} className="flex items-center space-x-2">
                          <Checkbox
                            id={allergen}
                            checked={itemForm.allergens.includes(allergen)}
                            onCheckedChange={() => handleAllergenToggle(allergen)}
                          />
                          <Label htmlFor={allergen} className="text-sm capitalize text-muted-foreground">
                            {allergen}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-foreground mb-2 block">Foto piatto (opzionale)</Label>
                    <ImageUpload
                      label="Foto piatto"
                      description="Immagine del piatto (JPG, PNG, WebP — max 5 MB)"
                      currentImageUrl={itemForm.imageUrl || undefined}
                      onImageChange={(url) => setItemForm({ ...itemForm, imageUrl: url || "" })}
                      folder="menu-items"
                      aspectRatio="square"
                      recommendedDimensions="600×600 px"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Beer className="w-3.5 h-3.5 text-primary" />
                      Birra in abbinamento (opzionale)
                    </Label>
                    <Input
                      placeholder="Es. Hop Fiction IPA, Duvel, Brooklyn Lager..."
                      value={itemForm.pairingBeerName}
                      onChange={(e) => setItemForm({ ...itemForm, pairingBeerName: e.target.value })}
                      className="border-stone-200 rounded-xl focus-visible:ring-primary/20 mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Verrà mostrata come "In abbinamento" nella pagina pubblica del pub.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 rounded-xl border border-emerald-100 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2">
                      <Checkbox
                        id="item-vegetarian"
                        checked={itemForm.isVegetarian}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isVegetarian: !!checked })}
                        className="border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label htmlFor="item-vegetarian" className="flex items-center gap-1.5 cursor-pointer text-emerald-800 dark:text-emerald-300 font-semibold">
                        <span>🌿</span> Vegetariano
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-xl border border-red-100 bg-red-50/30 dark:bg-red-950/20 px-3 py-2">
                      <Checkbox
                        id="item-spicy"
                        checked={itemForm.isSpicy}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isSpicy: !!checked })}
                        className="border-red-500 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      />
                      <Label htmlFor="item-spicy" className="flex items-center gap-1.5 cursor-pointer text-red-800 dark:text-red-300 font-semibold">
                        <span>🌶️</span> Piccante
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="item-visible"
                        checked={itemForm.isVisible}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isVisible: checked })}
                      />
                      <Label htmlFor="item-visible" className="text-muted-foreground">Visibile al pubblico</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="item-available"
                        checked={itemForm.isAvailable}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isAvailable: checked })}
                      />
                      <Label htmlFor="item-available" className="text-muted-foreground">Disponibile</Label>
                    </div>
                  </div>

                  <DialogFooter sticky className="sm:space-x-2">
                    <Button
                      variant="outline"
                      className="border-stone-200 text-muted-foreground hover:bg-stone-50 rounded-xl"
                      onClick={() => {
                        setIsAddItemOpen(false);
                        setEditingItem(null);
                        resetItemForm();
                      }}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleItemSubmit} className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold">
                      {editingItem ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Gestisci le categorie e i prodotti del menu
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {menu.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-stone-300 rounded-2xl text-muted-foreground">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-primary opacity-20" />
            <p className="font-semibold text-foreground">Nessuna categoria nel menu.</p>
            <p className="text-sm">Clicca "Categoria" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {localMenu.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategoryExpanded(category.id)}
                  className={`px-4 py-1.5 rounded-full transition-colors text-sm ${
                    expandedCategories.has(category.id)
                      ? "bg-primary text-white font-semibold shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:text-primary hover:bg-stone-50/60"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {localMenu.map((category) => (
              <div
                key={category.id}
                className={`transition-all ${!category.isVisible ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                <div className="flex items-center justify-between group mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleCategoryExpanded(category.id)}
                    >
                      <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                        {category.name}
                        {!category.isVisible && (
                          <Badge variant="secondary" className="text-[10px] bg-stone-50 text-primary border-none">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Nascosta
                          </Badge>
                        )}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-stone-50"
                      onClick={() => {
                        toggleCategoryVisibilityMutation.mutate({
                          id: category.id,
                          isVisible: !category.isVisible
                        });
                      }}
                    >
                      {category.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-stone-50"
                      onClick={() => {
                        startEditCategory(category);
                        setIsAddCategoryOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare questa categoria e tutti i suoi prodotti?')) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-stone-50"
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setIsAddItemOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {expandedCategories.has(category.id) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.items.length === 0 ? (
                      <div 
                        className="col-span-full py-10 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:bg-stone-50/30 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setIsAddItemOpen(true);
                        }}
                      >
                        <Plus className="text-primary w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm font-medium">Aggiungi il primo prodotto</p>
                      </div>
                    ) : (
                      category.items.map((item, itemIdx) => (
                        <div
                          key={item.id}
                          draggable
                          data-touch-sort-idx={itemIdx}
                          data-touch-sort-group={String(category.id)}
                          onDragStart={(e) => handleItemDragStart(e, category.id, itemIdx)}
                          onDragOver={(e) => handleItemDragOver(e, category.id, itemIdx)}
                          onDrop={(e) => handleItemDrop(e, category.id, itemIdx)}
                          onDragEnd={handleItemDragEnd}
                          onDragLeave={() => setItemDragOver(null)}
                          className={`bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm p-4 relative group transition-all hover:shadow-md ${
                            itemDragOver?.catId === category.id && itemDragOver?.idx === itemIdx ? 'border-primary ring-2 ring-primary/20' : ''
                          } ${!item.isVisible ? 'opacity-60 grayscale-[0.3]' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div
                              className="cursor-grab flex-shrink-0 mt-1"
                              style={{ touchAction: 'none' }}
                              onTouchStart={(e) => startTouchDragInGroup(e, String(category.id), itemIdx)}
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                            {item.imageUrl && (
                              <img loading="lazy" 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-foreground text-lg leading-tight break-words">{item.name}</h4>
                                <span className="font-black text-primary text-lg shrink-0">€{item.price}</span>
                              </div>
                              
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                              )}

                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {item.isVegetarian && (
                                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-none text-[10px]">🌿 Veg</Badge>
                                )}
                                {item.isSpicy && (
                                  <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-none text-[10px]">🌶️ Piccante</Badge>
                                )}
                                {!item.isVisible && (
                                  <Badge variant="secondary" className="bg-stone-50 text-primary border-none text-[10px]">Nascosto</Badge>
                                )}
                                {!item.isAvailable && (
                                  <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-none text-[10px]">Esaurito</Badge>
                                )}
                              </div>
                              {item.pairingBeerName && (
                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400 max-w-full">
                                  <Beer className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">In abbinamento {item.pairingBeerName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-md ${item.isAvailable ? 'text-emerald-600' : 'text-muted-foreground'}`}
                              onClick={() => {
                                toggleItemAvailabilityMutation.mutate({
                                  id: item.id,
                                  isAvailable: !item.isAvailable
                                });
                              }}
                              title={item.isAvailable ? "Segna come non disponibile" : "Segna come disponibile"}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full ${item.isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:bg-stone-50 rounded-md"
                              onClick={() => {
                                toggleItemVisibilityMutation.mutate({
                                  id: item.id,
                                  isVisible: !item.isVisible
                                });
                              }}
                            >
                              {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:bg-stone-50 rounded-md"
                              onClick={() => {
                                startEditItem(item);
                                setIsAddItemOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-md"
                              onClick={() => {
                                if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
                                  deleteItemMutation.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div className="h-4" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}