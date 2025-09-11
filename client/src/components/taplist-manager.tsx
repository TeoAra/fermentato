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
  Beer, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search
} from "lucide-react";

interface TapItem {
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
  priceSmall?: string;
  priceMedium?: string;
  priceLarge?: string;
  tapNumber?: number;
  description?: string;
  isVisible: boolean;
}

interface TapListManagerProps {
  pubId: number;
  tapList: TapItem[];
}

export function TapListManager({ pubId, tapList }: TapListManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TapItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    beerId: "",
    priceSmall: "",
    priceMedium: "",
    priceLarge: "",
    tapNumber: "",
    description: "",
    isVisible: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search beers for adding to tap
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return null;
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  // Add tap item mutation
  const addTapMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/taplist`, { method: "POST" }, data);
    },
    onSuccess: () => {
      toast({ title: "Birra aggiunta alla tap list!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore di connessione", description: "Non è stato possibile aggiungere la birra. Riprova.", variant: "destructive" });
    },
  });

  // Update tap item mutation
  const updateTapMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/taplist/${editingItem?.id}`, { method: "PATCH" }, data);
    },
    onSuccess: () => {
      toast({ title: "Birra aggiornata!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
      setEditingItem(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Errore di connessione", description: "Non è stato possibile aggiornare la birra. Riprova.", variant: "destructive" });
    },
  });

  // Delete tap item mutation
  const deleteTapMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/pubs/${pubId}/taplist/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Birra rimossa dalla tap list!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
    },
    onError: () => {
      toast({ title: "Errore di connessione", description: "Non è stato possibile rimuovere la birra. Riprova.", variant: "destructive" });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      return apiRequest(`/api/pubs/${pubId}/taplist/${id}`, { method: "PATCH" }, { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
    },
    onError: () => {
      toast({ title: "Errore di connessione", description: "Non è stato possibile aggiornare la visibilità. Riprova.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      beerId: "",
      priceSmall: "",
      priceMedium: "",
      priceLarge: "",
      tapNumber: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const startEdit = (item: TapItem) => {
    setEditingItem(item);
    setFormData({
      beerId: item.beer.id.toString(),
      priceSmall: item.priceSmall || "",
      priceMedium: item.priceMedium || "",
      priceLarge: item.priceLarge || "",
      tapNumber: item.tapNumber?.toString() || "",
      description: item.description || "",
      isVisible: item.isVisible,
    });
  };

  const handleSubmit = () => {
    if (!formData.beerId) {
      toast({ title: "Seleziona una birra", description: "È necessario selezionare una birra per continuare", variant: "destructive" });
      return;
    }

    const submitData = {
      beerId: parseInt(formData.beerId),
      priceSmall: formData.priceSmall || null,
      priceMedium: formData.priceMedium || null,
      priceLarge: formData.priceLarge || null,
      tapNumber: formData.tapNumber ? parseInt(formData.tapNumber) : null,
      description: formData.description || null,
      isVisible: formData.isVisible,
    };

    if (editingItem) {
      updateTapMutation.mutate(submitData);
    } else {
      addTapMutation.mutate(submitData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestione Tap List</span>
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
                  {editingItem ? "Modifica Birra" : "Aggiungi Birra alla Tap List"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modifica i dettagli della birra" : "Cerca e seleziona una birra da aggiungere alla tap list"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Ricerca Birra */}
                {!editingItem && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cerca Birra <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Digita il nome della birra o del birrificio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-beer-search"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Cerca nel nostro database di birre italiane e internazionali</p>
                    {searchResults?.beers && searchResults.beers.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {searchResults.beers.map((beer: any) => (
                          <div
                            key={beer.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setFormData({ ...formData, beerId: beer.id.toString() });
                              setSearchTerm(`${beer.name} - ${beer.brewery?.name || 'Birrificio sconosciuto'}`);
                            }}
                          >
                            <div className="font-medium">{beer.name}</div>
                            <div className="text-sm text-gray-500">
                              {beer.brewery?.name || 'Birrificio sconosciuto'} • {beer.style} • {beer.abv}% ABV
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

                {/* Sistema Prezzi per Misure */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Prezzi per Misura <span className="text-gray-500 font-normal">(opzionale)</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-medium">Piccola (0.20L)</Label>
                      <Input
                        type="number"
                        step="0.10"
                        min="0"
                        placeholder="4.50"
                        value={formData.priceSmall}
                        onChange={(e) => setFormData({ ...formData, priceSmall: e.target.value })}
                        className="text-center"
                        data-testid="input-price-small"
                      />
                      <span className="text-xs text-gray-500 block text-center">€</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-medium">Media (0.40L)</Label>
                      <Input
                        type="number"
                        step="0.10"
                        min="0"
                        placeholder="7.50"
                        value={formData.priceMedium}
                        onChange={(e) => setFormData({ ...formData, priceMedium: e.target.value })}
                        className="text-center"
                        data-testid="input-price-medium"
                      />
                      <span className="text-xs text-gray-500 block text-center">€</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-medium">Grande (0.50L)</Label>
                      <Input
                        type="number"
                        step="0.10"
                        min="0"
                        placeholder="9.00"
                        value={formData.priceLarge}
                        onChange={(e) => setFormData({ ...formData, priceLarge: e.target.value })}
                        className="text-center"
                        data-testid="input-price-large"
                      />
                      <span className="text-xs text-gray-500 block text-center">€</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    Imposta i prezzi solo per le misure che offri. Puoi sempre modificarli in seguito.
                  </p>
                </div>

                {/* Numero Spina e Descrizione */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Numero Spina <span className="text-gray-500 font-normal">(opzionale)</span></Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="es. 1, 2, 3..."
                      value={formData.tapNumber}
                      onChange={(e) => setFormData({ ...formData, tapNumber: e.target.value })}
                      data-testid="input-tap-number"
                    />
                    <p className="text-xs text-gray-500 mt-1">Numero identificativo della spina (se utilizzato)</p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="visible"
                        checked={formData.isVisible}
                        onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                        data-testid="switch-tap-visible"
                      />
                      <Label htmlFor="visible" className="text-sm font-medium">Visibile al pubblico</Label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">I clienti potranno vedere questa birra nella tap list</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Descrizione <span className="text-gray-500 font-normal">(opzionale)</span></Label>
                  <Textarea
                    placeholder="Note speciali, caratteristiche della spillatura, abbinamenti consigliati..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="textarea-tap-description"
                  />
                  <p className="text-xs text-gray-500 mt-1">Aggiungi dettagli sulla birra alla spina che possano interessare i clienti</p>
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
                    disabled={addTapMutation.isPending || updateTapMutation.isPending}
                  >
                    {editingItem ? "Aggiorna" : "Aggiungi"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Gestisci le birre disponibili alla spina
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tapList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Beer className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nessuna birra alla spina.</p>
            <p className="text-sm">Clicca "Aggiungi Birra" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tapList.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${!item.isVisible ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.tapNumber && (
                        <Badge variant="outline" className="text-xs">
                          Spina {item.tapNumber}
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

                    <div className="flex flex-wrap gap-3 text-xs mb-3">
                      {item.priceSmall && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          €{item.priceSmall} - Piccola
                        </span>
                      )}
                      {item.priceMedium && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          €{item.priceMedium} - Media
                        </span>
                      )}
                      {item.priceLarge && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          €{item.priceLarge} - Grande
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <div className="bg-orange-50 border-l-4 border-orange-200 p-2 rounded">
                        <p className="text-sm text-gray-700 italic">
                          Note del pub: {item.description}
                        </p>
                      </div>
                    )}
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
                        if (confirm('Sei sicuro di voler rimuovere questa birra dalla tap list?')) {
                          deleteTapMutation.mutate(item.id);
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