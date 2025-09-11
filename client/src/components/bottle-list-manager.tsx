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
  Wine, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search
} from "lucide-react";

interface BottleItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  price: string;
  quantity: number;
  size?: string;
  vintage?: string;
  description?: string;
  isVisible: boolean;
}

interface BottleListManagerProps {
  pubId: number;
  bottleList: BottleItem[];
}

export function BottleListManager({ pubId, bottleList }: BottleListManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BottleItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    beerId: "",
    price: "",
    quantity: "",
    size: "33cl",
    vintage: "",
    description: "",
    isVisible: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search beers for adding to bottle list
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return null;
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchTerm.length >= 2,
  });

  // Add bottle item mutation
  const addBottleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/bottles`, { method: "POST" }, data);
    },
    onSuccess: () => {
      toast({ title: "Birra aggiunta alla cantina!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere la birra", variant: "destructive" });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/bottles/${id}`, "PATCH", { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      beerId: "",
      price: "",
      quantity: "",
      size: "33cl",
      vintage: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const startEdit = (item: BottleItem) => {
    setEditingItem(item);
    setFormData({
      beerId: item.beer.id.toString(),
      price: item.price || "",
      quantity: item.quantity?.toString() || "",
      size: item.size || "33cl",
      vintage: item.vintage || "",
      description: item.description || "",
      isVisible: item.isVisible,
    });
  };

  const handleSubmit = () => {
    if (!formData.beerId) {
      toast({ title: "Errore", description: "Seleziona una birra", variant: "destructive" });
      return;
    }

    if (!formData.price || !formData.quantity) {
      toast({ title: "Errore", description: "Inserisci prezzo e quantità", variant: "destructive" });
      return;
    }

    const submitData = {
      beerId: parseInt(formData.beerId),
      price: formData.price,
      quantity: parseInt(formData.quantity),
      size: formData.size || null,
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Birra
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

              <div className="space-y-4">
                {/* Ricerca Birra */}
                {!editingItem && (
                  <div className="space-y-2">
                    <Label>Cerca Birra</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Cerca birra per nome o birrificio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchResults?.beers && searchResults.beers.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {searchResults.beers.map((beer: any) => (
                          <div
                            key={beer.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, beerId: beer.id.toString() });
                              setSearchTerm(`${beer.name} - ${beer.brewery.name}`);
                            }}
                          >
                            <div className="font-medium">{beer.name}</div>
                            <div className="text-sm text-gray-500">
                              {beer.brewery.name} • {beer.style} • {beer.abv}% ABV
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Birra Selezionata (per editing) */}
                {editingItem && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="font-medium">{editingItem.beer.name}</div>
                    <div className="text-sm text-gray-500">
                      {editingItem.beer.brewery.name} • {editingItem.beer.style} • {editingItem.beer.abv}% ABV
                    </div>
                  </div>
                )}

                {/* Prezzo e Quantità */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Prezzo (€)</Label>
                    <Input
                      type="number"
                      step="0.10"
                      placeholder="5.50"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Quantità</Label>
                    <Input
                      type="number"
                      placeholder="24"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Formato</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    >
                      <option value="33cl">33cl</option>
                      <option value="50cl">50cl</option>
                      <option value="66cl">66cl</option>
                      <option value="75cl">75cl</option>
                    </select>
                  </div>
                </div>

                {/* Annata e Visibilità */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Annata (opzionale)</Label>
                    <Input
                      placeholder="2023"
                      value={formData.vintage}
                      onChange={(e) => setFormData({ ...formData, vintage: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visible"
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                    />
                    <Label htmlFor="visible">Visibile al pubblico</Label>
                  </div>
                </div>

                <div>
                  <Label>Descrizione (opzionale)</Label>
                  <Textarea
                    placeholder="Note sulla birra, caratteristiche particolari..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
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
                  >
                    {editingItem ? "Aggiorna" : "Aggiungi"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Gestisci le birre in bottiglia della cantina
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bottleList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wine className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nessuna birra in cantina.</p>
            <p className="text-sm">Clicca "Aggiungi Birra" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bottleList.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${!item.isVisible ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.size || "33cl"}
                      </Badge>
                      {item.vintage && (
                        <Badge variant="outline" className="text-xs">
                          {item.vintage}
                        </Badge>
                      )}
                      {!item.isVisible && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Nascosta
                        </Badge>
                      )}
                    </div>
                    
                    <div 
                      className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -m-2"
                      onClick={() => {
                        startEdit(item);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      {item.beer.logoUrl && (
                        <img
                          src={item.beer.logoUrl}
                          alt={item.beer.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{item.beer.name}</h3>
                        <p className="text-gray-600 text-sm">{item.beer.brewery.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.beer.style} • {item.beer.abv}% ABV
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        Tocca per prezzi
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        €{item.price}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        Qty: {item.quantity}
                      </span>
                      {item.size && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {item.size}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toggleVisibilityMutation.mutate({
                          id: item.id,
                          isVisible: !item.isVisible
                        });
                      }}
                    >
                      {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startEdit(item);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Sei sicuro di voler rimuovere questa birra dalla cantina?')) {
                          deleteBottleMutation.mutate(item.id);
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
      </CardContent>
    </Card>
  );
}