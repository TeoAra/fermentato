import { useState, useRef } from "react";
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
  Info
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MenuCategoryManagerProps {
  pubId: number;
  categories: any[];
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

export default function MenuCategoryManager({ pubId, categories }: MenuCategoryManagerProps) {
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

  const effectiveProductIsVisible = (product: any) =>
    pendingToggles.has(product.id) ? !product.isVisible : product.isVisible;
  const effectiveCategoryIsVisible = (category: any) =>
    pendingCategoryToggles.has(category.id) ? !category.isVisible : category.isVisible;

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  
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
      setPendingCategoryToggles(prev => new Set([...prev, id]));
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      const prev = queryClient.getQueryData(["/api/pubs", pubId, "menu"]);
      queryClient.setQueryData(["/api/pubs", pubId, "menu"], (old: any) =>
        Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: !cat.isVisible } : cat) : old
      );
      return { prev };
    },
    onSuccess: (data: any, { id }) => {
      setPendingCategoryToggles(prev => { const next = new Set(prev); next.delete(id); return next; });
      if (data?.isVisible !== undefined) {
        queryClient.setQueryData(["/api/pubs", pubId, "menu"], (old: any) =>
          Array.isArray(old) ? old.map((cat: any) => cat.id === id ? { ...cat, isVisible: data.isVisible } : cat) : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
    },
    onError: (_e: any, { id }, ctx: any) => {
      setPendingCategoryToggles(prev => { const next = new Set(prev); next.delete(id); return next; });
      if (ctx?.prev) queryClient.setQueryData(["/api/pubs", pubId, "menu"], ctx.prev);
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu", "all-products"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu", "all-products"] });
      toast({ title: "🗑️ Prodotto eliminato" });
    },
    onError: () => {
      toast({ title: "❌ Errore", description: "Impossibile eliminare il prodotto", variant: "destructive" });
    }
  });

  const patchAllProductsCache = (itemIds: number[], newVisible: boolean) => {
    queryClient.setQueriesData<Record<number, any[]>>(
      { queryKey: ["/api/pubs", pubId, "menu", "all-products"] },
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
    queryClient.setQueryData(["/api/pubs", pubId, "menu"], (old: any) =>
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu", "all-products"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu", "all-products"] });
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="category-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome Categoria
          </Label>
          <Input 
            ref={isEdit ? editNameRef : nameRef}
            id="category-name"
            placeholder="Es. Antipasti, Primi Piatti, Dolci..."
            defaultValue={isEdit ? formData.name : ''}
            className="mt-1"
            data-testid={isEdit ? "input-edit-category-name" : "input-create-category-name"}
          />
        </div>
        
        <div>
          <Label htmlFor="category-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrizione (opzionale)
          </Label>
          <Textarea
            ref={isEdit ? editDescriptionRef : descriptionRef}
            id="category-description"
            placeholder="Breve descrizione della categoria..."
            defaultValue={isEdit ? formData.description : ''}
            rows={3}
            className="mt-1"
            data-testid={isEdit ? "textarea-edit-category-description" : "textarea-create-category-description"}
          />
        </div>

        <div>
          <Label htmlFor="category-infobox" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Info Box (opzionale)
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1">
            Nota informativa evidenziata nel PDF del menu (es. "Tutti i nostri piatti sono preparati con ingredienti freschi")
          </p>
          <Textarea
            ref={isEdit ? editInfoBoxRef : infoBoxRef}
            id="category-infobox"
            placeholder="Es. Tutti i nostri piatti sono preparati con ingredienti locali e di stagione..."
            defaultValue={isEdit ? formData.infoBox : ''}
            rows={2}
            className="mt-1"
          />
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <Label htmlFor="category-visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Visibile nel menu pubblico
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
          data-testid={isEdit ? "button-cancel-edit" : "button-cancel-create"}
        >
          Annulla
        </Button>
        <Button 
          onClick={isEdit ? handleEditSubmit : handleCreateSubmit}
          disabled={isEdit ? updateCategoryMutation.isPending : createCategoryMutation.isPending}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          data-testid={isEdit ? "button-save-edit" : "button-save-create"}
        >
          {(isEdit ? updateCategoryMutation.isPending : createCategoryMutation.isPending) ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? "Aggiorna Categoria" : "Crea Categoria"}
            </>
          )}
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <motion.div
              className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mr-3"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Utensils className="h-6 w-6 text-white" />
            </motion.div>
            Categorie Menu
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestisci le categorie del tuo menu ({categories.length} {categories.length === 1 ? 'categoria' : 'categorie'})
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  data-testid="button-add-category"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Categoria
                </Button>
              </motion.div>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mr-3">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                Crea Nuova Categoria
              </DialogTitle>
            </DialogHeader>
            <CategoryForm />
          </DialogContent>
        </Dialog>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button 
            onClick={() => setIsAddItemOpen(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Prodotto
          </Button>
        </motion.div>
      </div>
      </motion.div>

      {/* Categories Grid */}
      <AnimatePresence>
        {categories.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Utensils className="h-10 w-10 text-gray-400 dark:text-gray-400" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessuna categoria menu
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Inizia creando le categorie per organizzare il tuo menu. Potrai poi aggiungere i prodotti a ciascuna categoria.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Prima Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center text-xl">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mr-3">
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
            {categories.map((category: any, index: number) => {
              const IconComponent = getCategoryIcon(category.name);
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group"
                >
                  <Card className="h-full border-0 shadow-lg bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4 flex-1">
                          <motion.div 
                            className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <IconComponent className="h-6 w-6 text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
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
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={effectiveCategoryIsVisible(category) ? "default" : "secondary"}
                            className={`${effectiveCategoryIsVisible(category)
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {effectiveCategoryIsVisible(category) ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Visibile
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Nascosta
                              </>
                            )}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategory(category.id)}
                            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100"
                          >
                            {(category.items || []).filter((i: any) => !i.isInfoBox).length} prodotti
                            <motion.div
                              animate={{ rotate: expandedCategories.has(category.id) ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-2"
                            >
                              ▼
                            </motion.div>
                          </Button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => toggleVisibilityMutation.mutate({ 
                                id: category.id, 
                                isVisible: !category.isVisible 
                              })}
                              className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
                              data-testid={`button-toggle-visibility-${category.id}`}
                            >
                              {effectiveCategoryIsVisible(category) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditCategory(category)}
                              className="text-gray-600 hover:text-orange-600 hover:bg-stone-50 dark:hover:bg-stone-800"
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeleteCategory(category)}
                              className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
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
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                          >
                                            {effectiveProductIsVisible(product) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingProduct(product);
                                              setEditCategoryIds(product.categoryId ? [product.categoryId] : []);
                                              setIsEditProductOpen(true);
                                            }}
                                            className="text-gray-600 hover:text-orange-600 hover:bg-stone-50"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteProduct(product)}
                                            className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
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
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.description}</p>
                                        )}
                                        {product.price && (
                                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">€{product.price}</p>
                                        )}
                                        {(() => {
                                          const fa = formatAllergens(product.allergens);
                                          if (!fa.length) return null;
                                          return (
                                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Allergeni:</span>
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
                                      </div>
                                      <div className="flex items-center space-x-1 ml-4">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleProductVisibility(product)}
                                          className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                          data-testid={`button-toggle-product-visibility-${product.id}`}
                                        >
                                          {effectiveProductIsVisible(product) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingProduct(product);
                                            setEditCategoryIds(product.categoryId ? [product.categoryId] : []);
                                            setIsEditProductOpen(true);
                                          }}
                                          className="text-gray-600 hover:text-orange-600 hover:bg-stone-50"
                                          data-testid={`button-edit-product-${product.id}`}
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteProduct(product)}
                                          className="text-gray-600 hover:text-red-600 hover:bg-red-50"
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
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
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
                                  className="text-green-600 border-green-200 hover:bg-green-50"
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
                                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
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
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mr-3">
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
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Modifica Prodotto</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Category selector (same as create) */}
              <div>
                <Label className="text-sm font-medium">Categorie <span className="text-gray-400 font-normal">(seleziona una o più)</span></Label>
                <div className="mt-1.5 border rounded-md divide-y max-h-36 overflow-y-auto">
                  {categories.map((cat) => {
                    const checked = editCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${checked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setEditCategoryIds(prev =>
                              prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className="accent-green-600 w-4 h-4"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Nome Prodotto</Label>
                <Input
                  placeholder="Nome del piatto..."
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Prezzo (€)</Label>
                <Input
                  type="number"
                  step="0.10"
                  placeholder="12.50"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea
                  placeholder="Descrizione del piatto..."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct((prev: any) => ({ ...prev, description: e.target.value }))}
                  rows={3}
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
                      : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-700'
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
                      : 'border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-700'
                  }`}
                >
                  🌶️ Piccante
                </button>
              </div>
              <AllergenSelector
                selectedAllergens={editingProduct.allergens || []}
                onAllergensChange={(allergens) => setEditingProduct({ ...editingProduct, allergens })}
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
                    };
                    try {
                      // Update existing product (set to first selected category)
                      await apiRequest(`/api/pubs/${pubId}/menu-items/${editingProduct.id}`, { method: 'PATCH' }, {
                        ...data,
                        categoryId: editCategoryIds[0],
                      });
                      // Create copies for any additional categories
                      const extra = editCategoryIds.slice(1);
                      if (extra.length > 0) {
                        await Promise.all(
                          extra.map(catId =>
                            apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, { ...data, categoryId: catId })
                          )
                        );
                      }
                      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu", "full"] });
                      setIsEditProductOpen(false);
                      setEditingProduct(null);
                      setEditCategoryIds([]);
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
          setItemForm({ name: '', description: '', price: '', isVisible: true, allergens: [], isVegetarian: false, isSpicy: false });
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Aggiungi Prodotto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Multi-category selector */}
            <div>
              <Label className="text-sm font-medium">Categorie <span className="text-gray-400 font-normal">(seleziona una o più)</span></Label>
              <div className="mt-1.5 border rounded-md divide-y max-h-36 overflow-y-auto">
                {categories.map((cat) => {
                  const checked = selectedCategoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${checked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCategoryIds(prev =>
                            prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className="accent-green-600 w-4 h-4"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Nome Prodotto</Label>
              <Input
                placeholder="Nome del piatto..."
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Prezzo (€)</Label>
              <Input
                type="number"
                step="0.10"
                placeholder="12.50"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea
                placeholder="Descrizione del piatto..."
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                rows={3}
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
                    : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-700'
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
                    : 'border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-700'
                }`}
              >
                🌶️ Piccante
              </button>
            </div>
            <AllergenSelector
              selectedAllergens={itemForm.allergens}
              onAllergensChange={(allergens) => setItemForm({ ...itemForm, allergens })}
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
                    await Promise.all(
                      catIds.map(catId =>
                        apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, { ...snapshot, categoryId: catId })
                      )
                    );
                    queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "menu"] });
                    setIsAddItemOpen(false);
                    setSelectedCategoryIds([]);
                    setItemForm({ name: '', description: '', price: '', isVisible: true, allergens: [], isVegetarian: false, isSpicy: false });
                    toast({ title: catIds.length > 1 ? `✅ Prodotto aggiunto in ${catIds.length} categorie!` : "✅ Prodotto aggiunto!" });
                  } catch {
                    toast({ title: "❌ Errore", description: "Impossibile aggiungere il prodotto", variant: "destructive" });
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
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg mr-3">
                <Info className="h-5 w-5 text-white" />
              </div>
              Aggiungi Info Box
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                className="bg-amber-600 hover:bg-amber-700"
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