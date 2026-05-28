import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AllergenSelector } from "@/components/allergen-selector";
import { 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  Eye, 
  EyeOff, 
  Utensils,
  Coffee,
  Pizza,
  IceCream,
  Wine,
  Sandwich,
  ChefHat,
  Salad,
  X,
  Info,
  GripVertical
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";

interface MenuCategoryManagerProps {
  pubId: number;
  categories: any[];
  isLoading?: boolean;
}

// Helper function to get category icon based on name
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('antipasti') || name.includes('antipasto')) return Salad;
  if (name.includes('primi') || name.includes('pasta') || name.includes('risotto')) return Utensils;
  if (name.includes('secondi') || name.includes('carne') || name.includes('pesce')) return ChefHat;
  if (name.includes('pizza')) return Pizza;
  if (name.includes('dolci') || name.includes('dolce') || name.includes('dessert')) return IceCream;
  if (name.includes('bevande') || name.includes('bibite')) return Coffee;
  if (name.includes('vini') || name.includes('vino') || name.includes('cocktail')) return Wine;
  if (name.includes('panini') || name.includes('sandwich')) return Sandwich;
  return Utensils; // Default icon
};

// ── Beer Pairing Autocomplete ────────────────────────────────────────────────
interface LocalBeer {
  name: string;
  breweryName?: string;
  abv?: number | null;
  imageUrl?: string | null;
  style?: string | null;
  source: 'taplist' | 'cantina';
}

function BeerAvatar({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-stone-100 dark:border-white/10"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-[#FFF7EA] dark:bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0 border border-[#F59E0B]/20">
      <span className="text-base leading-none">🍺</span>
    </div>
  );
}

function BeerPairingInput({ pubId, value, onChange }: {
  pubId: number;
  value: string;
  onChange: (name: string) => void;
}) {
  // Parse initial value: "BeerName||BreweryName" → show just beer name in the input
  const parseBeerName = (raw: string) => raw.includes('||') ? raw.split('||')[0] : raw;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(parseBeerName(value));
  const [dbResults, setDbResults] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Taplist + bottles del pub (caricati una volta)
  const { data: tapItems = [] } = useQuery<any[]>({ queryKey: ['/api/pubs', String(pubId), 'taplist'] });
  const { data: bottleItems = [] } = useQuery<any[]>({ queryKey: ['/api/pubs', String(pubId), 'bottles'] });

  // Merge locale: taplist + cantina, deduplicati per nome — mantieni tutti i metadati
  const localBeers: LocalBeer[] = (() => {
    const seen = new Set<string>();
    const result: LocalBeer[] = [];
    for (const t of tapItems as any[]) {
      const n = t.beerName || t.name;
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        result.push({
          name: n,
          breweryName: t.breweryName || t.brewery_name || t.brewery?.name,
          abv: t.abv ?? t.beer_abv,
          imageUrl: t.imageUrl || t.image_url || t.beer?.imageUrl,
          style: t.style || t.beerStyle,
          source: 'taplist',
        });
      }
    }
    for (const b of bottleItems as any[]) {
      const n = b.beerName || b.name;
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        result.push({
          name: n,
          breweryName: b.breweryName || b.brewery_name || b.brewery?.name,
          abv: b.abv ?? b.beer_abv,
          imageUrl: b.imageUrl || b.image_url || b.beer?.imageUrl,
          style: b.style || b.beerStyle,
          source: 'cantina',
        });
      }
    }
    return result;
  })();

  const filteredLocal = query.length === 0
    ? localBeers
    : localBeers.filter(b => b.name.toLowerCase().includes(query.toLowerCase()) || (b.breweryName || '').toLowerCase().includes(query.toLowerCase()));

  const localNameSet = new Set(localBeers.map(b => b.name.toLowerCase()));

  // Ricerca DB con debounce (solo se query >= 2 char)
  const searchDb = useCallback((q: string) => {
    if (q.length < 2) { setDbResults([]); return; }
    fetch(`/api/beers/search?q=${encodeURIComponent(q)}&limit=8`)
      .then(r => r.ok ? r.json() : [])
      .then((results: any[]) => {
        setDbResults(results.filter((b: any) => !localNameSet.has((b.name || '').toLowerCase())));
      })
      .catch(() => setDbResults([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localBeers.map(b => b.name).join(',')]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDb(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchDb]);

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (name: string, brewery?: string) => {
    setQuery(name); // mostro solo il nome birra nell'input
    onChange(brewery ? `${name}||${brewery}` : name); // salvo "birra||birrificio" se disponibile
    setOpen(false);
  };

  const hasLocal = filteredLocal.length > 0;
  const hasDb = dbResults.length > 0;
  const showDropdown = open && (hasLocal || hasDb);

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <Label className="text-sm font-bold text-foreground">🍺 Abbinamento birra</Label>
      <Input
        placeholder="Cerca tra taplist, cantina o DB birre..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.includes('||')) setQuery(parseBeerName(query)); setOpen(true); }}
        className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
      />
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {hasLocal && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] bg-[#FFF7EA] dark:bg-[#F59E0B]/10 sticky top-0">
                Taplist & Cantina
              </div>
              {filteredLocal.slice(0, 6).map(beer => (
                <button
                  key={beer.name}
                  type="button"
                  onMouseDown={() => select(beer.name, beer.breweryName || undefined)}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F1] dark:hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
                >
                  <BeerAvatar imageUrl={beer.imageUrl} name={beer.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5] truncate">{beer.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {beer.style && <span className="text-[11px] text-[#6B6357] dark:text-[#B7BDC7] truncate">{beer.style}</span>}
                      {beer.abv != null && <span className="text-[11px] font-medium text-[#F59E0B]">{Number(beer.abv).toFixed(1)}%</span>}
                    </div>
                    {beer.breweryName && <p className="text-[11px] text-[#6B6357] dark:text-[#B7BDC7] truncate">{beer.breweryName}</p>}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#F59E0B] bg-[#FFF7EA] dark:bg-[#F59E0B]/15 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {beer.source === 'taplist' ? 'Tap' : 'Cantina'}
                  </span>
                </button>
              ))}
            </>
          )}
          {hasDb && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B6357] dark:text-[#B7BDC7] bg-[#FAF7F1] dark:bg-white/[0.02] border-t border-[#E8DED1] dark:border-white/[0.06] sticky top-0">
                Database birre
              </div>
              {dbResults.slice(0, 5).map((b: any) => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={() => select(b.name, b.breweryName || b.brewery?.name || undefined)}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF7F1] dark:hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
                >
                  <BeerAvatar imageUrl={b.imageUrl} name={b.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5] truncate">{b.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {b.style && <span className="text-[11px] text-[#6B6357] dark:text-[#B7BDC7] truncate">{b.style}</span>}
                      {b.abv != null && <span className="text-[11px] font-medium text-[#F59E0B]">{Number(b.abv).toFixed(1)}%</span>}
                    </div>
                    {(b.breweryName || b.brewery?.name) && (
                      <p className="text-[11px] text-[#6B6357] dark:text-[#B7BDC7] truncate">{b.breweryName || b.brewery?.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Opzionale — birra consigliata in abbinamento</p>
    </div>
  );
}

export default function MenuCategoryManager({ pubId, categories, isLoading }: MenuCategoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allergensList = [] } = useQuery<any[]>({
    queryKey: ['/api/allergens'],
  });

  const formatAllergens = (allergenIds: string[] | null) => {
    if (!allergenIds || allergenIds.length === 0 || !Array.isArray(allergensList)) return [];
    const map = allergensList.reduce((acc: any, a: any) => { acc[a.id.toString()] = a; return acc; }, {});
    return allergenIds.map(id => map[id]).filter(Boolean).map((a: any) => ({ emoji: a.emoji || '⚠️', label: a.name }));
  };

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddInfoBoxOpen, setIsAddInfoBoxOpen] = useState(false);
  const [infoBoxCategoryId, setInfoBoxCategoryId] = useState<number | null>(null);
  const [infoBoxText, setInfoBoxText] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingEditProduct, setIsSubmittingEditProduct] = useState(false);
  const [editCategoryIds, setEditCategoryIds] = useState<number[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [pendingToggles, setPendingToggles] = useState<Set<number>>(new Set());
  const [pendingCategoryToggles, setPendingCategoryToggles] = useState<Set<number>>(new Set());

  // ── Drag-and-drop category ordering ─────────────────────────────────────
  const [localCategories, setLocalCategories] = useState<any[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalCategories(
      [...categories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    );
  }, [categories]);

  const reorderMutation = useMutation({
    mutationFn: (order: { id: number; orderIndex: number }[]) =>
      apiRequest(`/api/pubs/${pubId}/menu-categories/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare l'ordine", variant: "destructive" });
      setLocalCategories(
        [...categories].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    // needed for Firefox
    e.dataTransfer.setData("text/plain", String(index));
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    setDragOverIndex(null);
    dragIndexRef.current = null;
    if (from === null || from === dropIndex) return;
    const newOrder = [...localCategories];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(dropIndex, 0, moved);
    setLocalCategories(newOrder);
    reorderMutation.mutate(newOrder.map((cat, idx) => ({ id: cat.id, orderIndex: idx })));
  };
  const handleDragEnd = () => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const effectiveProductIsVisible = (product: any) =>
    pendingToggles.has(product.id) ? !product.isVisible : product.isVisible;
  const effectiveCategoryIsVisible = (category: any) =>
    pendingCategoryToggles.has(category.id) ? !category.isVisible : category.isVisible;

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editSiblingItems, setEditSiblingItems] = useState<any[]>([]);
  
  // Refs for CREATE form
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const infoBoxRef = useRef<HTMLTextAreaElement>(null);
  const visibilityRef = useRef<boolean>(true);
  // Refs for EDIT form (separate to avoid any re-render/remount losing typed text)
  const editNameRef = useRef<HTMLInputElement>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const editInfoBoxRef = useRef<HTMLTextAreaElement>(null);
  const editVisibilityRef = useRef<boolean>(true);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    infoBox: '',
    isVisible: true
  });
  const [itemForm, setItemForm] = useState<any>({
    name: '',
    description: '',
    price: '',
    isVisible: true,
    allergens: [],
    isVegetarian: false,
    isSpicy: false,
    imageUrl: '',
    pairingBeerName: '',
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      infoBox: '',
      isVisible: true
    });
  };

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories`, { method: 'POST' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ 
        title: "✅ Categoria creata", 
        description: "Nuova categoria aggiunta al menu con successo" 
      });
    },
    onError: () => {
      toast({ 
        title: "❌ Errore", 
        description: "Impossibile creare la categoria", 
        variant: "destructive" 
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, { method: 'PATCH' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ 
        title: "✅ Categoria aggiornata", 
        description: "Le modifiche sono state salvate con successo" 
      });
    },
    onError: () => {
      toast({ 
        title: "❌ Errore", 
        description: "Impossibile aggiornare la categoria", 
        variant: "destructive" 
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      toast({ 
        title: "🗑️ Categoria eliminata", 
        description: "La categoria è stata rimossa dal menu" 
      });
    },
    onError: () => {
      toast({ 
        title: "❌ Errore", 
        description: "Impossibile eliminare la categoria", 
        variant: "destructive" 
      });
    }
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories/${id}/toggle-visibility`, { method: 'PATCH' });
    },
    onMutate: async ({ id }) => {
      setPendingCategoryToggles(prev => new Set([...Array.from(prev), id]));
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      const prev = queryClient.getQueryData(["/api/pubs", String(pubId), "menu"]);
      queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
        Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: !cat.isVisible } : cat) : old
      );
      return { prev };
    },
    onSuccess: (data: any, { id }) => {
      setPendingCategoryToggles(prev => { const next = new Set(prev); next.delete(id); return next; });
      if (data?.isVisible !== undefined) {
        queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
          Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: data.isVisible } : cat) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
    },
    onError: (_e: any, { id }, ctx: any) => {
      setPendingCategoryToggles(prev => { const next = new Set(prev); next.delete(id); return next; });
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], ctx.prev);
      toast({ title: "❌ Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  // Product mutations
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, { method: 'PATCH' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      setIsEditProductOpen(false);
      setEditingProduct(null);
      toast({ title: "✅ Prodotto aggiornato" });
    },
    onError: () => {
      toast({ title: "❌ Errore", description: "Impossibile aggiornare il prodotto", variant: "destructive" });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      toast({ title: "🗑️ Prodotto eliminato" });
    },
    onError: () => {
      toast({ title: "❌ Errore", description: "Impossibile eliminare il prodotto", variant: "destructive" });
    }
  });

  const patchAllProductsCache = (itemIds: number[], newVisible: boolean) => {
    queryClient.setQueriesData<Record<number, any[]>>(
      { queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] },
      (old) => {
        if (!old || typeof old !== 'object') return old;
        const updated: Record<number, any[]> = {};
        for (const catId of Object.keys(old)) {
          updated[catId as any] = (old[catId as any] || []).map((item: any) =>
            itemIds.includes(item.id) ? { ...item, isVisible: newVisible } : item
          );
        }
        return updated;
      }
    );
    queryClient.setQueryData(["/api/pubs", String(pubId), "menu"], (old: any) =>
      Array.isArray(old) ? old.map((cat: any) => ({
        ...cat,
        items: (cat.items || []).map((item: any) =>
          itemIds.includes(item.id) ? { ...item, isVisible: newVisible } : item
        ),
      })) : old
    );
  };

  const toggleProductVisibilityMutation = useMutation({
    mutationFn: async ({ id }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}/toggle-visibility`, { method: 'PATCH' });
    },
    onMutate: async ({ id, isVisible }) => {
      // isVisible is the desired NEW state passed from the click handler
      patchAllProductsCache([id], isVisible);
    },
    onSuccess: (data: any, { id }) => {
      if (data?.isVisible !== undefined) {
        patchAllProductsCache([id], data.isVisible);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
    },
    onError: (_e: any, { id, isVisible }) => {
      // Revert to original state (opposite of the desired new state)
      patchAllProductsCache([id], !isVisible);
      toast({ title: "❌ Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  // Item mutations
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      setIsAddItemOpen(false);
      setSelectedCategoryIds([]);
      setItemForm({ name: '', description: '', price: '', isVisible: true, allergens: [], isVegetarian: false, isSpicy: false });
      toast({ title: "✅ Prodotto aggiunto!" });
    },
    onError: () => {
      toast({ title: "❌ Errore", description: "Impossibile aggiungere il prodotto", variant: "destructive" });
    }
  });

  const addInfoBoxMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      setIsAddInfoBoxOpen(false);
      setInfoBoxCategoryId(null);
      setInfoBoxText('');
      toast({ title: "Info box aggiunta!" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la info box", variant: "destructive" });
    }
  });

  // Handle edit category
  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    // Store initial values in formData (used only as defaultValues for refs below)
    setFormData({
      name: category.name,
      description: category.description || '',
      infoBox: category.infoBox || '',
      isVisible: category.isVisible
    });
    // Initialise edit visibility ref with current value
    editVisibilityRef.current = category.isVisible ?? true;
    setIsEditDialogOpen(true);
  };

  // Handle form submission
  const handleCreateSubmit = () => {
    const name = nameRef.current?.value || '';
    const description = descriptionRef.current?.value || '';
    const infoBox = infoBoxRef.current?.value || '';
    
    if (!name.trim()) {
      toast({ 
        title: "⚠️ Campo richiesto", 
        description: "Il nome della categoria è obbligatorio", 
        variant: "destructive" 
      });
      return;
    }
    
    createCategoryMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      infoBox: infoBox.trim() || null,
      isVisible: visibilityRef.current
    });
  };

  const handleEditSubmit = () => {
    // Read all values directly from refs — avoids stale formData state
    const name = editNameRef.current?.value?.trim() || '';
    const description = editDescriptionRef.current?.value?.trim() || '';
    const infoBox = editInfoBoxRef.current?.value?.trim() || '';
    const isVisible = editVisibilityRef.current;

    if (!name) {
      toast({ 
        title: "⚠️ Campo richiesto", 
        description: "Il nome della categoria è obbligatorio", 
        variant: "destructive" 
      });
      return;
    }
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: { name, description, infoBox: infoBox || null, isVisible },
    });
  };

  // Find all items with the same name across all categories (siblings = duplicates created for multi-category)
  const findAllByName = (name: string, excludeId?: number): any[] => {
    const results: any[] = [];
    for (const cat of categories) {
      if (cat.items) {
        for (const item of cat.items) {
          if (item.name === name && item.id !== excludeId) {
            results.push(item);
          }
        }
      }
    }
    return results;
  };

  // Count how many categories a product with this name appears in
  const countCategories = (name: string): number => {
    let count = 0;
    for (const cat of categories) {
      if (cat.items?.some((item: any) => item.name === name)) count++;
    }
    return count;
  };

  // Batch visibility toggle: applies to all items with the same name
  const handleToggleProductVisibility = async (product: any) => {
    const siblings = findAllByName(product.name, product.id);
    const allIds = [product.id, ...siblings.map((s: any) => s.id)];
    const newVisible = !product.isVisible;

    patchAllProductsCache(allIds, newVisible);

    try {
      const results = await Promise.all(
        allIds.map(id =>
          apiRequest(`/api/pubs/${pubId}/menu-items/${id}/toggle-visibility`, { method: 'PATCH' })
        )
      );
      // Confirm with actual server values per-item
      results.forEach((r: any) => {
        if (r?.id !== undefined && r?.isVisible !== undefined) {
          patchAllProductsCache([r.id], r.isVisible);
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      if (siblings.length > 0) {
        toast({ title: "✅ Visibilità aggiornata", description: `Applicato a ${allIds.length} categorie` });
      }
    } catch {
      patchAllProductsCache(allIds, !newVisible);
      toast({ title: "❌ Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    }
  };

  // Handle delete with confirmation
  const handleDeleteCategory = (category: any) => {
    if (confirm(`Sei sicuro di voler eliminare la categoria "${category.name}"? Questa azione non può essere annullata.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    const siblings = findAllByName(product.name, product.id);
    const total = siblings.length + 1;
    const label = total > 1
      ? `"${product.name}" da ${total} categorie`
      : `"${product.name}"`;
    if (!confirm(`Sei sicuro di voler eliminare ${label}?`)) return;
    try {
      const allIds = [product.id, ...siblings.map((s: any) => s.id)];
      await Promise.all(
        allIds.map(id =>
          apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, { method: 'DELETE' })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
      toast({
        title: "🗑️ Prodotto eliminato",
        description: total > 1 ? `Rimosso da ${total} categorie` : undefined,
      });
    } catch {
      toast({ title: "❌ Errore", description: "Impossibile eliminare il prodotto", variant: "destructive" });
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Category Form Component
  const CategoryForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2 text-left">
          <Label htmlFor="category-name" className="text-sm font-bold text-foreground">
            Nome Categoria
          </Label>
          <Input
            ref={isEdit ? editNameRef : nameRef}
            id="category-name"
            placeholder="Es. Antipasti, Primi Piatti, Dolci..."
            defaultValue={isEdit ? formData.name : ''}
            className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
            data-testid={isEdit ? "input-edit-category-name" : "input-create-category-name"}
          />
        </div>
        
        <div className="space-y-2 text-left">
          <Label htmlFor="category-description" className="text-sm font-bold text-foreground">
            Descrizione (opzionale)
          </Label>
          <Textarea
            ref={isEdit ? editDescriptionRef : descriptionRef}
            id="category-description"
            placeholder="Breve descrizione della categoria..."
            defaultValue={isEdit ? formData.description : ''}
            rows={3}
            className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
            data-testid={isEdit ? "textarea-edit-category-description" : "textarea-create-category-description"}
          />
        </div>

        <div className="space-y-2 text-left">
          <Label htmlFor="category-infobox" className="text-sm font-bold text-foreground">
            Info Box (opzionale)
          </Label>
          <p className="text-xs text-muted-foreground">
            Nota evidenziata nel PDF del menu (es. "Piatti preparati con ingredienti freschi")
          </p>
          <Textarea
            ref={isEdit ? editInfoBoxRef : infoBoxRef}
            id="category-infobox"
            placeholder="Es. Tutti i nostri piatti sono preparati con ingredienti locali e di stagione..."
            defaultValue={isEdit ? formData.infoBox : ''}
            rows={2}
            className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
          />
        </div>
        
        <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#0B0D10]/20 rounded-xl border border-stone-200 dark:border-[#23262E]/30">
          <div className="text-left">
            <Label htmlFor="category-visible" className="text-sm font-bold text-foreground">
              Visibile nel menu pubblico
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              I clienti potranno vedere questa categoria
            </p>
          </div>
          <Switch
            id="category-visible"
            defaultChecked={isEdit ? formData.isVisible : true}
            onCheckedChange={(checked) => {
              if (isEdit) { editVisibilityRef.current = checked; }
              else { visibilityRef.current = checked; }
            }}
            data-testid={isEdit ? "switch-edit-category-visible" : "switch-create-category-visible"}
          />
        </div>
      </div>
      
      <div className="flex gap-3 pt-4 border-t border-stone-100">
        <Button
          onClick={isEdit ? handleEditSubmit : handleCreateSubmit}
          disabled={isEdit ? updateCategoryMutation.isPending : createCategoryMutation.isPending}
          className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-11 font-bold"
          data-testid={isEdit ? "button-save-edit" : "button-save-create"}
        >
          {(isEdit ? updateCategoryMutation.isPending : createCategoryMutation.isPending) ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Salvando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />{isEdit ? "Aggiorna Categoria" : "Crea Categoria"}</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setIsEditDialogOpen(false);
              setEditingCategory(null);
            } else {
              setIsCreateDialogOpen(false);
            }
            resetForm();
          }}
          className="border-stone-200 hover:bg-stone-50 rounded-xl h-11 px-6"
          data-testid={isEdit ? "button-cancel-edit" : "button-cancel-create"}
        >
          Annulla
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <div className="p-2 bg-primary rounded-xl mr-3">
              <Utensils className="h-5 w-5 text-white" />
            </div>
            Categorie Menu
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestisci le categorie del tuo menu ({categories.length} {categories.length === 1 ? 'categoria' : 'categorie'})
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl"
                  data-testid="button-add-category"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Categoria
                </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <div className="p-2 bg-primary rounded-lg mr-3">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                Crea Nuova Categoria
              </DialogTitle>
            </DialogHeader>
            <CategoryForm />
          </DialogContent>
        </Dialog>
          <Button
            onClick={() => setIsAddItemOpen(true)}
            variant="outline"
            className="border-stone-200 hover:bg-stone-50 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Prodotto
          </Button>
      </div>
      </motion.div>

      {/* Categories Grid */}
      <AnimatePresence>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card space-y-3">
                <div className="h-5 w-28 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                <div className="h-3 w-20 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-stone-50 dark:bg-[#0B0D10]/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Utensils className="h-10 w-10 text-primary opacity-20" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nessuna categoria menu
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Inizia creando le categorie per organizzare il tuo menu. Potrai poi aggiungere i prodotti a ciascuna categoria.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Prima Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center text-xl">
                    <div className="p-2 bg-primary rounded-lg mr-3">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    Crea Prima Categoria
                  </DialogTitle>
                </DialogHeader>
                <CategoryForm />
              </DialogContent>
            </Dialog>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {localCategories.map((category: any, index: number) => {
              const IconComponent = getCategoryIcon(category.name);
              const isDragOver = dragOverIndex === index;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <Card className={`h-full bg-white dark:bg-card border shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 rounded-2xl ${
                    isDragOver
                      ? "border-primary/60 shadow-md ring-2 ring-primary/20 scale-[1.01]"
                      : "border-stone-100 dark:border-border"
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4 flex-1">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/[0.04] transition-colors flex-shrink-0"
                            title="Trascina per riordinare"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-foreground mb-1 truncate">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {category.description}
                              </p>
                            )}
                            {category.infoBox && (
                              <div className="mt-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-800 dark:text-amber-200 line-clamp-1">
                                {category.infoBox}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-xs ${effectiveCategoryIsVisible(category)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border-stone-200'
                            }`}
                          >
                            {effectiveCategoryIsVisible(category) ? (
                              <><Eye className="h-3 w-3 mr-1" />Visibile</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" />Nascosta</>
                            )}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategory(category.id)}
                            className="border-stone-200 text-foreground hover:bg-stone-50 text-xs rounded-lg h-7 px-2"
                          >
                            {(category.items || []).filter((i: any) => !i.isInfoBox).length} prodotti
                            <motion.span
                              animate={{ rotate: expandedCategories.has(category.id) ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-1 inline-block"
                            >
                              ▼
                            </motion.span>
                          </Button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleVisibilityMutation.mutate({
                              id: category.id,
                              isVisible: !category.isVisible
                            })}
                            className="text-muted-foreground hover:text-foreground hover:bg-stone-50"
                            data-testid={`button-toggle-visibility-${category.id}`}
                          >
                            {effectiveCategoryIsVisible(category) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCategory(category)}
                            className="text-muted-foreground hover:text-primary hover:bg-stone-50"
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Products List (Expandable) */}
                      <AnimatePresence>
                        {expandedCategories.has(category.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-border">
                              {category.items && category.items.length > 0 ? (
                                <div className="space-y-2">
                                  {category.items.map((product: any) => (
                                    product.isInfoBox ? (
                                      <div
                                        key={product.id}
                                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg"
                                      >
                                        <div className="flex-1 flex items-start gap-2">
                                          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Info Box</Badge>
                                              {!effectiveProductIsVisible(product) && (
                                                <Badge variant="secondary" className="text-xs">
                                                  <EyeOff className="h-3 w-3 mr-1" />
                                                  Nascosto
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-amber-900 dark:text-amber-100 mt-1 italic">{product.description || product.name}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-4">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleProductVisibilityMutation.mutate({ id: product.id, isVisible: !product.isVisible })}
                                            className="text-muted-foreground hover:text-foreground hover:bg-stone-50"
                                          >
                                            {effectiveProductIsVisible(product) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              const siblings = findAllByName(product.name, product.id);
                                              const allCatIds = Array.from(new Set([
                                                ...(product.categoryId ? [product.categoryId] : []),
                                                ...siblings.map((s: any) => s.categoryId).filter(Boolean)
                                              ]));
                                              setEditingProduct(product);
                                              setEditSiblingItems(siblings);
                                              setEditCategoryIds(allCatIds);
                                              setIsEditProductOpen(true);
                                            }}
                                            className="text-muted-foreground hover:text-primary hover:bg-stone-50"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteProduct(product)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-3 bg-stone-50/50 dark:bg-[#0B0D10]/20 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-900/40 transition-colors"
                                    >
                                      <div className="flex gap-2.5 flex-1 min-w-0">
                                        {product.imageUrl && (
                                          <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-white/10"
                                          />
                                        )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-medium text-foreground">{product.name}</h4>
                                          {product.isVegetarian && (
                                            <span title="Vegetariano" className="text-sm">🌿</span>
                                          )}
                                          {product.isSpicy && (
                                            <span title="Piccante" className="text-sm">🌶️</span>
                                          )}
                                          {!effectiveProductIsVisible(product) && (
                                            <Badge variant="secondary" className="text-xs">
                                              <EyeOff className="h-3 w-3 mr-1" />
                                              Nascosto
                                            </Badge>
                                          )}
                                          {countCategories(product.name) > 1 && (
                                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">
                                              in {countCategories(product.name)} cat.
                                            </Badge>
                                          )}
                                        </div>
                                        {product.description && (
                                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                                        )}
                                        {product.price && (
                                          <p className="text-sm font-semibold text-primary mt-1">€{product.price}</p>
                                        )}
                                        {(() => {
                                          const fa = formatAllergens(product.allergens);
                                          if (!fa.length) return null;
                                          return (
                                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Allergeni:</span>
                                              {fa.map(({ emoji, label }: { emoji: string; label: string }, i: number) => (
                                                <span
                                                  key={i}
                                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 rounded text-[10px] font-medium border border-amber-200 dark:border-amber-800"
                                                >
                                                  {emoji} {label}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                        {product.pairingBeerName && (() => {
                                          const parts = String(product.pairingBeerName).split('||');
                                          const beerName = parts[0]?.trim();
                                          const brewery = parts[1]?.trim();
                                          return (
                                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 border border-[#F59E0B]/20">
                                              <span className="text-[10px] text-[#C77800] dark:text-[#FFB74D] font-medium">
                                                🍺 In abbinamento <strong>{beerName}</strong>
                                                {brewery && <> di <strong>{brewery}</strong></>}
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      </div>
                                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleProductVisibility(product)}
                                          className="text-muted-foreground hover:text-foreground hover:bg-stone-50"
                                          data-testid={`button-toggle-product-visibility-${product.id}`}
                                        >
                                          {effectiveProductIsVisible(product) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const siblings = findAllByName(product.name, product.id);
                                            const allCatIds = Array.from(new Set([
                                              ...(product.categoryId ? [product.categoryId] : []),
                                              ...siblings.map((s: any) => s.categoryId).filter(Boolean)
                                            ]));
                                            setEditingProduct(product);
                                            setEditSiblingItems(siblings);
                                            setEditCategoryIds(allCatIds);
                                            setIsEditProductOpen(true);
                                          }}
                                          className="text-muted-foreground hover:text-primary hover:bg-stone-50"
                                          data-testid={`button-edit-product-${product.id}`}
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteProduct(product)}
                                          className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                                          data-testid={`button-delete-product-${product.id}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    )
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-4 text-sm">
                                  Nessun prodotto in questa categoria
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCategoryIds([category.id]);
                                    setIsAddItemOpen(true);
                                  }}
                                  className="border-stone-200 hover:bg-stone-50 text-foreground rounded-lg"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Prodotto
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setInfoBoxCategoryId(category.id);
                                    setIsAddInfoBoxOpen(true);
                                  }}
                                  className="border-stone-200 hover:bg-stone-50 text-muted-foreground rounded-lg"
                                >
                                  <Info className="h-3.5 w-3.5 mr-1" />
                                  Info Box
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingCategory(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="p-2 bg-primary rounded-lg mr-3">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              Modifica Categoria
            </DialogTitle>
          </DialogHeader>
          <CategoryForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={(open) => {
        setIsEditProductOpen(open);
        if (!open) {
          setEditingProduct(null);
          setEditCategoryIds([]);
          setEditSiblingItems([]);
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Modifica Prodotto</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Category selector (same as create) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-foreground">Categorie <span className="text-muted-foreground font-normal text-xs">(seleziona una o più)</span></Label>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-36 overflow-y-auto">
                  {categories.map((cat) => {
                    const checked = editCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setEditCategoryIds(prev =>
                              prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className="accent-primary w-4 h-4"
                        />
                        <span className="text-sm text-foreground">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-foreground">Nome Prodotto</Label>
                <Input
                  placeholder="Nome del piatto..."
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-foreground">Prezzo (€)</Label>
                <Input
                  type="number"
                  step="0.10"
                  placeholder="12.50"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, price: e.target.value }))}
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-foreground">Descrizione</Label>
                <Textarea
                  placeholder="Descrizione del piatto..."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
                />
              </div>
              {/* Vegetarian / Spicy toggles */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, isVegetarian: !editingProduct.isVegetarian })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    editingProduct.isVegetarian
                      ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'border-stone-200 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  🌿 Vegetariano
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, isSpicy: !editingProduct.isSpicy })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    editingProduct.isSpicy
                      ? 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      : 'border-stone-200 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  🌶️ Piccante
                </button>
              </div>
              <AllergenSelector
                selectedAllergens={editingProduct.allergens || []}
                onAllergensChange={(allergens) => setEditingProduct({ ...editingProduct, allergens })}
              />
              <ImageUpload
                label="Foto del prodotto"
                description="Opzionale — JPG, PNG o WebP"
                currentImageUrl={editingProduct.imageUrl || undefined}
                onImageChange={(url) => setEditingProduct((prev: any) => ({ ...prev, imageUrl: url ?? '' }))}
                folder="menu-items"
                aspectRatio="square"
                recommendedDimensions="400×400px"
              />
              <BeerPairingInput
                pubId={pubId}
                value={editingProduct.pairingBeerName || ''}
                onChange={(name) => setEditingProduct((prev: any) => ({ ...prev, pairingBeerName: name }))}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Annulla</Button>
                <Button
                  disabled={isSubmittingEditProduct}
                  onClick={async () => {
                    if (editCategoryIds.length === 0) {
                      toast({ title: "Seleziona almeno una categoria", variant: "destructive" });
                      return;
                    }
                    setIsSubmittingEditProduct(true);
                    const data = {
                      name: editingProduct.name,
                      price: editingProduct.price,
                      description: editingProduct.description,
                      allergens: editingProduct.allergens,
                      isVegetarian: editingProduct.isVegetarian ?? false,
                      isSpicy: editingProduct.isSpicy ?? false,
                      imageUrl: editingProduct.imageUrl || null,
                      pairingBeerName: editingProduct.pairingBeerName || null,
                    };
                    try {
                      const allItems = [editingProduct, ...editSiblingItems];
                      const existingEntries: Array<[number, number]> = [];
                      for (let i = 0; i < allItems.length; i++) {
                        const item = allItems[i];
                        if (item.categoryId) existingEntries.push([item.categoryId, item.id]);
                      }
                      const newCatIds = new Set(editCategoryIds);
                      const ops: Promise<any>[] = [];
                      for (let i = 0; i < existingEntries.length; i++) {
                        const [catId, itemId] = existingEntries[i];
                        if (newCatIds.has(catId)) {
                          ops.push(apiRequest(`/api/pubs/${pubId}/menu-items/${itemId}`, { method: 'PATCH' }, { ...data, categoryId: catId }));
                          newCatIds.delete(catId);
                        } else {
                          ops.push(apiRequest(`/api/pubs/${pubId}/menu-items/${itemId}`, { method: 'DELETE' }));
                        }
                      }
                      const remainingCatIds = Array.from(newCatIds);
                      for (let i = 0; i < remainingCatIds.length; i++) {
                        ops.push(apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, { ...data, categoryId: remainingCatIds[i] }));
                      }
                      await Promise.all(ops);
                      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "all-products"] });
                      setIsEditProductOpen(false);
                      setEditingProduct(null);
                      setEditCategoryIds([]);
                      setEditSiblingItems([]);
                      toast({ title: "✅ Prodotto aggiornato!" });
                    } catch {
                      toast({ title: "❌ Errore", description: "Impossibile salvare il prodotto", variant: "destructive" });
                    } finally {
                      setIsSubmittingEditProduct(false);
                    }
                  }}
                >
                  {isSubmittingEditProduct ? 'Salvataggio...' : 'Salva'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={(open) => {
        setIsAddItemOpen(open);
        if (!open) {
          setSelectedCategoryIds([]);
          setItemForm({ name: '', description: '', price: '', isVisible: true, allergens: [], isVegetarian: false, isSpicy: false, imageUrl: '', pairingBeerName: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Aggiungi Prodotto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Multi-category selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-foreground">Categorie <span className="text-muted-foreground font-normal text-xs">(seleziona una o più)</span></Label>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-36 overflow-y-auto">
                {categories.map((cat) => {
                  const checked = selectedCategoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCategoryIds(prev =>
                            prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm text-foreground">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-foreground">Nome Prodotto</Label>
              <Input
                placeholder="Nome del piatto..."
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-foreground">Prezzo (€)</Label>
              <Input
                type="number"
                step="0.10"
                placeholder="12.50"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-foreground">Descrizione</Label>
              <Textarea
                placeholder="Descrizione del piatto..."
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                rows={3}
                className="border-stone-200 rounded-xl focus-visible:ring-primary/20"
              />
            </div>
            {/* Vegetarian / Spicy toggles */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setItemForm({ ...itemForm, isVegetarian: !itemForm.isVegetarian })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  itemForm.isVegetarian
                    ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'border-stone-200 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                🌿 Vegetariano
              </button>
              <button
                type="button"
                onClick={() => setItemForm({ ...itemForm, isSpicy: !itemForm.isSpicy })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  itemForm.isSpicy
                    ? 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                    : 'border-stone-200 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                🌶️ Piccante
              </button>
            </div>
            <AllergenSelector
              selectedAllergens={itemForm.allergens}
              onAllergensChange={(allergens) => setItemForm({ ...itemForm, allergens })}
            />
            <ImageUpload
              label="Foto del prodotto"
              description="Opzionale — JPG, PNG o WebP"
              currentImageUrl={itemForm.imageUrl || undefined}
              onImageChange={(url) => setItemForm({ ...itemForm, imageUrl: url ?? '' })}
              folder="menu-items"
              aspectRatio="square"
              recommendedDimensions="400×400px"
            />
            <BeerPairingInput
              pubId={pubId}
              value={itemForm.pairingBeerName}
              onChange={(name) => setItemForm({ ...itemForm, pairingBeerName: name })}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Annulla</Button>
              <Button
                disabled={isSubmittingProduct}
                onClick={async () => {
                  if (selectedCategoryIds.length === 0) {
                    toast({ title: "Seleziona almeno una categoria", variant: "destructive" });
                    return;
                  }
                  if (!itemForm.name.trim()) {
                    toast({ title: "Inserisci il nome del prodotto", variant: "destructive" });
                    return;
                  }
                  setIsSubmittingProduct(true);
                  const snapshot = { ...itemForm };
                  const catIds = [...selectedCategoryIds];
                  try {
                    // Normalizza il prezzo: rimuovi virgole/spazi, converti virgola decimale in punto.
                    const priceStr = String(snapshot.price ?? '').trim().replace(/\s+/g, '').replace(',', '.');
                    const payloadBase = { ...snapshot, price: priceStr };
                    await Promise.all(
                      catIds.map(catId =>
                        apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, { ...payloadBase, categoryId: catId })
                      )
                    );
                    queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
                    setIsAddItemOpen(false);
                    setSelectedCategoryIds([]);
                    setItemForm({ name: '', description: '', price: '', isVisible: true, allergens: [], isVegetarian: false, isSpicy: false, imageUrl: '', pairingBeerName: '' });
                    toast({ title: catIds.length > 1 ? `✅ Prodotto aggiunto in ${catIds.length} categorie!` : "✅ Prodotto aggiunto!" });
                  } catch (err: any) {
                    // Mostra il messaggio reale del server invece di un errore generico.
                    const serverMsg = err?.message || err?.errors?.[0]?.message || 'Errore sconosciuto';
                    const fieldDetail = Array.isArray(err?.errors)
                      ? err.errors.map((e: any) => `${e.path?.join?.('.') || ''}: ${e.message}`).join(' · ')
                      : '';
                    console.error('[menu-items] add failed:', err);
                    toast({
                      title: "❌ Impossibile aggiungere",
                      description: fieldDetail || serverMsg,
                      variant: "destructive"
                    });
                  } finally {
                    setIsSubmittingProduct(false);
                  }
                }}
              >
                {isSubmittingProduct ? 'Aggiunta...' : 'Aggiungi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Info Box Dialog */}
      <Dialog open={isAddInfoBoxOpen} onOpenChange={(open) => {
        setIsAddInfoBoxOpen(open);
        if (!open) {
          setInfoBoxCategoryId(null);
          setInfoBoxText('');
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="p-2 bg-primary rounded-lg mr-3">
                <Info className="h-5 w-5 text-white" />
              </div>
              Aggiungi Info Box
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L'info box apparirà come nota evidenziata nella categoria del menu e nel PDF scaricabile.
            </p>
            <div>
              <Label>Testo Info Box</Label>
              <Textarea
                placeholder="Es. Tutti i nostri piatti sono preparati con ingredienti freschi e locali..."
                value={infoBoxText}
                onChange={(e) => setInfoBoxText(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddInfoBoxOpen(false)}>Annulla</Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white rounded-xl"
                disabled={!infoBoxText.trim() || addInfoBoxMutation.isPending}
                onClick={() => {
                  if (!infoBoxCategoryId || !infoBoxText.trim()) return;
                  addInfoBoxMutation.mutate({
                    categoryId: infoBoxCategoryId,
                    name: 'Info',
                    description: infoBoxText.trim(),
                    price: '0',
                    isInfoBox: true,
                    isVisible: true
                  });
                }}
              >
                {addInfoBoxMutation.isPending ? 'Salvando...' : 'Aggiungi Info Box'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}