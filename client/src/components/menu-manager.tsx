import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  ChefHat,
  AlertTriangle
} from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens?: string[];
  isVisible: boolean;
  isAvailable: boolean;
  imageUrl?: string;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  isVisible: boolean;
  items: MenuItem[];
}

interface MenuManagerProps {
  pubId: number;
  menu: MenuCategory[];
}

const commonAllergens = [
  "Glutine", "Latticini", "Uova", "Pesce", "Crostacei", "Arachidi", 
  "Frutta a guscio", "Soia", "Sesamo", "Sedano", "Senape", "Solfiti",
  "Lupini", "Molluschi"
];

export function MenuManager({ pubId, menu }: MenuManagerProps) {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
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

  // Create category
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu/categories`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      toast({
        title: "Successo",
        description: "Categoria creata",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nella creazione della categoria",
        variant: "destructive",
      });
    },
  });

  // Create menu item
  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/menu/items`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setIsItemDialogOpen(false);
      resetItemForm();
      toast({
        title: "Successo",
        description: "Piatto aggiunto al menu",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiungere il piatto",
        variant: "destructive",
      });
    },
  });

  // Update category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/menu/categories/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setEditingCategory(null);
      toast({
        title: "Successo",
        description: "Categoria aggiornata",
      });
    },
  });

  // Update menu item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/menu/items/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      setEditingItem(null);
      toast({
        title: "Successo",
        description: "Piatto aggiornato",
      });
    },
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/menu/categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      toast({
        title: "Successo",
        description: "Categoria eliminata",
      });
    },
  });

  // Delete menu item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/menu/items/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "menu"] });
      toast({
        title: "Successo",
        description: "Piatto rimosso dal menu",
      });
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

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: categoryForm,
      });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price || !selectedCategoryId) return;

    const data = {
      ...itemForm,
      categoryId: selectedCategoryId,
    };

    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem.id,
        data,
      });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const toggleCategoryVisibility = (category: MenuCategory) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { isVisible: !category.isVisible },
    });
  };

  const toggleItemVisibility = (item: MenuItem) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { isVisible: !item.isVisible },
    });
  };

  const toggleItemAvailability = (item: MenuItem) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { isAvailable: !item.isAvailable },
    });
  };

  const handleAllergenToggle = (allergen: string) => {
    setItemForm({
      ...itemForm,
      allergens: itemForm.allergens.includes(allergen)
        ? itemForm.allergens.filter(a => a !== allergen)
        : [...itemForm.allergens, allergen]
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Menu Cibo
            </CardTitle>
            <CardDescription>
              Gestisci le categorie e i piatti del tuo menu
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Nuova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Modifica i dettagli della categoria" : "Crea una nuova categoria per il menu"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Nome Categoria *</Label>
                    <Input
                      id="categoryName"
                      placeholder="Es. Antipasti, Primi, Secondi..."
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryDescription">Descrizione</Label>
                    <Textarea
                      id="categoryDescription"
                      placeholder="Descrizione della categoria..."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="categoryVisible"
                      checked={categoryForm.isVisible}
                      onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isVisible: checked })}
                    />
                    <Label htmlFor="categoryVisible">Visibile ai clienti</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingCategory ? "Aggiorna" : "Crea"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCategoryDialogOpen(false);
                        setEditingCategory(null);
                        resetCategoryForm();
                      }}
                    >
                      Annulla
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {menu.length > 0 && (
              <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Piatto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Modifica Piatto" : "Aggiungi Piatto"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? "Modifica i dettagli del piatto" : "Aggiungi un nuovo piatto al menu"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    {!editingItem && (
                      <div>
                        <Label htmlFor="category">Categoria *</Label>
                        <select
                          id="category"
                          className="w-full p-2 border rounded-md"
                          value={selectedCategoryId || ""}
                          onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                          required
                        >
                          <option value="">Seleziona categoria</option>
                          {menu.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="itemName">Nome Piatto *</Label>
                      <Input
                        id="itemName"
                        placeholder="Es. Spaghetti alla Carbonara"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="itemDescription">Descrizione</Label>
                      <Textarea
                        id="itemDescription"
                        placeholder="Descrizione del piatto..."
                        value={itemForm.description}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="itemPrice">Prezzo *</Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="itemImage">URL Immagine</Label>
                      <Input
                        id="itemImage"
                        placeholder="https://example.com/image.jpg"
                        value={itemForm.imageUrl}
                        onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Allergeni
                      </Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {commonAllergens.map((allergen) => (
                          <label key={allergen} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={itemForm.allergens.includes(allergen)}
                              onChange={() => handleAllergenToggle(allergen)}
                              className="rounded"
                            />
                            <span>{allergen}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="itemVisible"
                          checked={itemForm.isVisible}
                          onCheckedChange={(checked) => setItemForm({ ...itemForm, isVisible: checked })}
                        />
                        <Label htmlFor="itemVisible">Visibile</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="itemAvailable"
                          checked={itemForm.isAvailable}
                          onCheckedChange={(checked) => setItemForm({ ...itemForm, isAvailable: checked })}
                        />
                        <Label htmlFor="itemAvailable">Disponibile</Label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingItem ? "Aggiorna" : "Aggiungi"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsItemDialogOpen(false);
                          setEditingItem(null);
                          resetItemForm();
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {menu.length === 0 ? (
          <div className="text-center py-8">
            <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Nessuna categoria nel menu. Crea la prima categoria!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {menu.map((category) => (
              <div key={category.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    {!category.isVisible && (
                      <Badge variant="secondary" className="text-xs">
                        Nascosta
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCategoryVisibility(category)}
                    >
                      {category.isVisible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({
                          name: category.name,
                          description: category.description || "",
                          isVisible: category.isVisible,
                        });
                        setIsCategoryDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {category.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {category.description}
                  </p>
                )}

                {category.items.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <ChefHat className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      Nessun piatto in questa categoria
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setIsItemDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Aggiungi primo piatto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.name}</h4>
                              <div className="flex gap-1">
                                {!item.isVisible && (
                                  <Badge variant="secondary" className="text-xs">
                                    Nascosto
                                  </Badge>
                                )}
                                {!item.isAvailable && (
                                  <Badge variant="destructive" className="text-xs">
                                    Non disponibile
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {item.description}
                              </p>
                            )}
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                <span className="text-xs text-gray-500">
                                  {item.allergens.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">€{item.price}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleItemVisibility(item)}
                            >
                              {item.isVisible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleItemAvailability(item)}
                            >
                              <ChefHat className={`w-4 h-4 ${item.isAvailable ? 'text-green-600' : 'text-red-600'}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItem(item);
                                setSelectedCategoryId(category.id);
                                setItemForm({
                                  name: item.name,
                                  description: item.description || "",
                                  price: item.price,
                                  allergens: item.allergens || [],
                                  isVisible: item.isVisible,
                                  isAvailable: item.isAvailable,
                                  imageUrl: item.imageUrl || "",
                                });
                                setIsItemDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItemMutation.mutate(item.id)}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}