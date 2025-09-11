import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Utensils, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  FolderPlus,
  ChevronDown,
  ChevronRight
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
  imageUrl?: string;
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
    imageUrl: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Category mutations
  const addCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories`, "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Categoria aggiunta!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la categoria", variant: "destructive" });
    },
  });

  const toggleCategoryVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-categories/${id}`, { method: "PATCH" }, { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il prodotto", variant: "destructive" });
    },
  });

  const toggleItemVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, { method: "PATCH" }, { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  const toggleItemAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/menu-items/${id}`, { method: "PATCH" }, { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
    },
    onError: () => {
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
      imageUrl: "",
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
      imageUrl: item.imageUrl || "",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestione Menu Cibo</span>
          <div className="flex gap-2">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Modifica Categoria" : "Aggiungi Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Categoria</Label>
                    <Input
                      placeholder="Antipasti, Primi, Secondi..."
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrizione (opzionale)</Label>
                    <Textarea
                      placeholder="Descrizione della categoria..."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="cat-visible"
                      checked={categoryForm.isVisible}
                      onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isVisible: checked })}
                    />
                    <Label htmlFor="cat-visible">Visibile al pubblico</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddCategoryOpen(false);
                        setEditingCategory(null);
                        resetCategoryForm();
                      }}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleCategorySubmit}>
                      {editingCategory ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Prodotto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Modifica Prodotto" : "Aggiungi Prodotto"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!editingItem && (
                    <div>
                      <Label>Categoria</Label>
                      <select
                        className="w-full p-2 border rounded-md"
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
                  </div>

                  <div>
                    <Label>Descrizione</Label>
                    <Textarea
                      placeholder="Descrizione del piatto, ingredienti..."
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Allergeni</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {ALLERGENS_LIST.map((allergen) => (
                        <div key={allergen} className="flex items-center space-x-2">
                          <Checkbox
                            id={allergen}
                            checked={itemForm.allergens.includes(allergen)}
                            onCheckedChange={() => handleAllergenToggle(allergen)}
                          />
                          <Label htmlFor={allergen} className="text-sm capitalize">
                            {allergen}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>URL Immagine (opzionale)</Label>
                    <Input
                      placeholder="https://..."
                      value={itemForm.imageUrl}
                      onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="item-visible"
                        checked={itemForm.isVisible}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isVisible: checked })}
                      />
                      <Label htmlFor="item-visible">Visibile al pubblico</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="item-available"
                        checked={itemForm.isAvailable}
                        onCheckedChange={(checked) => setItemForm({ ...itemForm, isAvailable: checked })}
                      />
                      <Label htmlFor="item-available">Disponibile</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddItemOpen(false);
                        setEditingItem(null);
                        resetItemForm();
                      }}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleItemSubmit}>
                      {editingItem ? "Aggiorna" : "Aggiungi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Gestisci le categorie e i prodotti del menu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {menu.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nessuna categoria nel menu.</p>
            <p className="text-sm">Clicca "Categoria" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {menu.map((category) => (
              <div
                key={category.id}
                className={`border rounded-lg ${!category.isVisible ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCategoryExpanded(category.id)}
                      >
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {category.name}
                          {!category.isVisible && (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Nascosta
                            </Badge>
                          )}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
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
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          startEditCategory(category);
                          setIsAddCategoryOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Sei sicuro di voler eliminare questa categoria e tutti i suoi prodotti?')) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setIsAddItemOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {expandedCategories.has(category.id) && (
                  <div className="p-4">
                    {category.items.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nessun prodotto in questa categoria.</p>
                    ) : (
                      <div className="space-y-3">
                        {category.items.map((item) => (
                          <div
                            key={item.id}
                            className={`border rounded-lg p-3 ${
                              !item.isVisible || !item.isAvailable ? 'opacity-60 bg-gray-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  <span className="font-semibold text-green-600">€{item.price}</span>
                                  {!item.isVisible && (
                                    <Badge variant="secondary" className="text-xs">
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      Nascosto
                                    </Badge>
                                  )}
                                  {!item.isAvailable && (
                                    <Badge variant="destructive" className="text-xs">
                                      Non disponibile
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                )}
                                {item.allergens.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.allergens.map((allergen) => (
                                      <Badge key={allergen} variant="outline" className="text-xs">
                                        {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    toggleItemAvailabilityMutation.mutate({
                                      id: item.id,
                                      isAvailable: !item.isAvailable
                                    });
                                  }}
                                  title={item.isAvailable ? "Segna come non disponibile" : "Segna come disponibile"}
                                >
                                  <div className={`w-3 h-3 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}