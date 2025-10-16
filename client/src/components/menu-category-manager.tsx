import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  X
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Use refs for form inputs to avoid re-renders
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const visibilityRef = useRef<boolean>(true);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    isVisible: true
  });
  const [itemForm, setItemForm] = useState<any>({
    name: '',
    description: '',
    price: '',
    isVisible: true
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isVisible: true
    });
  };

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories`, { method: 'POST' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories/${id}`, { method: 'PATCH' }, { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
      toast({ 
        title: "❌ Errore", 
        description: "Impossibile aggiornare la visibilità", 
        variant: "destructive" 
      });
    }
  });

  // Item mutations
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items`, { method: 'POST' }, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setIsAddItemOpen(false);
      setSelectedCategoryId(null);
      setItemForm({ name: '', description: '', price: '', isVisible: true });
      toast({ title: "✅ Prodotto aggiunto!" });
    },
    onError: () => {
      toast({ title: "❌ Errore", description: "Impossibile aggiungere il prodotto", variant: "destructive" });
    }
  });

  // Handle edit category
  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      isVisible: category.isVisible
    });
    setIsEditDialogOpen(true);
  };

  // Handle form submission
  const handleCreateSubmit = () => {
    const name = nameRef.current?.value || '';
    const description = descriptionRef.current?.value || '';
    
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
      isVisible: visibilityRef.current
    });
  };

  const handleEditSubmit = () => {
    if (!formData.name.trim()) {
      toast({ 
        title: "⚠️ Campo richiesto", 
        description: "Il nome della categoria è obbligatorio", 
        variant: "destructive" 
      });
      return;
    }
    updateCategoryMutation.mutate({ id: editingCategory.id, data: formData });
  };

  // Handle delete with confirmation
  const handleDeleteCategory = (category: any) => {
    if (confirm(`Sei sicuro di voler eliminare la categoria "${category.name}"? Questa azione non può essere annullata.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
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
            ref={isEdit ? undefined : nameRef}
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
            ref={isEdit ? undefined : descriptionRef}
            id="category-description"
            placeholder="Breve descrizione della categoria..."
            defaultValue={isEdit ? formData.description : ''}
            rows={3}
            className="mt-1"
            data-testid={isEdit ? "textarea-edit-category-description" : "textarea-create-category-description"}
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
            onCheckedChange={(checked) => { visibilityRef.current = checked; }}
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
              <Utensils className="h-10 w-10 text-gray-400 dark:text-gray-500" />
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
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={category.isVisible ? "default" : "secondary"}
                            className={`${category.isVisible 
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {category.isVisible ? (
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
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                            {category.items?.length || 0} prodotti
                          </Badge>
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
                              {category.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditCategory(category)}
                              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900"
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

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={(open) => {
        setIsAddItemOpen(open);
        if (!open) {
          setSelectedCategoryId(null);
          setItemForm({ name: '', description: '', price: '', isVisible: true });
        }
      }}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Aggiungi Prodotto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
              >
                <option value="">Seleziona categoria...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Annulla</Button>
              <Button onClick={() => {
                if (!selectedCategoryId) {
                  toast({ title: "Seleziona una categoria", variant: "destructive" });
                  return;
                }
                addItemMutation.mutate({ ...itemForm, categoryId: selectedCategoryId });
              }}>Aggiungi</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}