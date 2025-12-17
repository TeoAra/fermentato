import { useState, useEffect, useMemo } from "react";
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
import { PriceFormatManager } from "@/components/price-format-manager";
import { 
  Beer, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  DollarSign,
  Loader2
} from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface PriceItem {
  size: string;
  price: string;
  format?: string;
}

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
  prices?: PriceItem[];
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
  const [showPriceManager, setShowPriceManager] = useState(false);
  const [tempPrices, setTempPrices] = useState<PriceItem[]>([]);
  const [formData, setFormData] = useState({
    beerId: "",
    prices: [] as PriceItem[],
    tapNumber: "",
    description: "",
    isVisible: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Search beers for adding to tap
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.length < 2) return null;
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearchTerm)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data;
    },
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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

  // Update prices mutation
  const updatePricesMutation = useMutation({
    mutationFn: async ({ itemId, prices }: { itemId: number; prices: PriceItem[] }) => {
      return apiRequest(`/api/pubs/${pubId}/taplist/${itemId}/prices`, { method: "POST" }, { prices });
    },
    onSuccess: () => {
      toast({ title: "Prezzi aggiornati!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Non è stato possibile aggiornare i prezzi", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      beerId: "",
      prices: [],
      tapNumber: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const startEdit = (item: TapItem) => {
    setEditingItem(item);
    
    // Convert prices to the expected format
    let prices: PriceItem[] = [];
    if (item.prices && item.prices.length > 0) {
      prices = item.prices;
    } else if (item.priceSmall || item.priceMedium || item.priceLarge) {
      // Fallback for legacy format
      if (item.priceSmall) prices.push({ size: '20cl', price: item.priceSmall });
      if (item.priceMedium) prices.push({ size: '40cl', price: item.priceMedium });
      if (item.priceLarge) prices.push({ size: '50cl', price: item.priceLarge });
    }
    
    setFormData({
      beerId: item.beer.id.toString(),
      prices: prices,
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
      tapNumber: formData.tapNumber ? parseInt(formData.tapNumber) : null,
      description: formData.description || null,
      isVisible: formData.isVisible,
    };

    if (editingItem) {
      // For editing, update the main data first, then update prices on success
      updateTapMutation.mutate(submitData, {
        onSuccess: () => {
          if (formData.prices.length > 0) {
            updatePricesMutation.mutate({ itemId: editingItem.id, prices: formData.prices });
          }
        }
      });
    } else {
      // For new items, we need to add the item first, then update prices
      addTapMutation.mutate(submitData, {
        onSuccess: (newItem: any) => {
          if (formData.prices.length > 0) {
            updatePricesMutation.mutate({ itemId: newItem.id, prices: formData.prices });
          }
        }
      });
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

              <div className="space-y-6">
                {/* Ricerca Birra o Birra Selezionata */}
                {!editingItem && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Seleziona Birra</Label>
                    
                    {/* Mostra birra selezionata */}
                    {formData.beerId && searchResults?.beers?.find((b: any) => b.id.toString() === formData.beerId) ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        {(() => {
                          const selectedBeer = searchResults.beers.find((b: any) => b.id.toString() === formData.beerId);
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
                            data-testid="input-beer-search"
                          />
                        </div>
                        {searchResults?.beers && searchResults.beers.length > 0 && !formData.beerId && (
                          <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900">
                            {searchResults.beers.map((beer: any) => (
                              <div
                                key={beer.id}
                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => {
                                  setFormData({ ...formData, beerId: beer.id.toString() });
                                }}
                              >
                                <div className="font-medium text-gray-900 dark:text-white">{beer.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {beer.brewery?.name || 'Birrificio sconosciuto'} • {beer.style} • {beer.abv}% ABV
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
                {editingItem && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="font-semibold text-gray-900 dark:text-white">{editingItem.beer.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {editingItem.beer.brewery?.name || 'Birrificio sconosciuto'} • {editingItem.beer.style} • {editingItem.beer.abv}% ABV
                    </div>
                  </div>
                )}

                {/* Gestione Prezzi Inline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Prezzi e Formati</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          prices: [...formData.prices, { size: '30cl', price: '6.00' }]
                        });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Aggiungi formato
                    </Button>
                  </div>
                  
                  {formData.prices.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center text-gray-500">
                      <p className="mb-2">Nessun prezzo configurato</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            prices: [
                              { size: '20cl', price: '4.50' },
                              { size: '40cl', price: '7.50' }
                            ]
                          });
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Aggiungi prezzi predefiniti
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.prices.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <Input
                            type="text"
                            list="tap-size-options"
                            value={p.size}
                            onChange={(e) => {
                              const newPrices = [...formData.prices];
                              newPrices[idx] = { ...newPrices[idx], size: e.target.value };
                              setFormData({ ...formData, prices: newPrices });
                            }}
                            className="flex-1 h-9"
                            placeholder="20cl, 40cl, Pinta..."
                          />
                          <datalist id="tap-size-options">
                            <option value="20cl" />
                            <option value="30cl" />
                            <option value="40cl" />
                            <option value="50cl" />
                            <option value="60cl" />
                            <option value="Pinta" />
                            <option value="Taster" />
                          </datalist>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">€</span>
                            <Input
                              type="number"
                              step="0.10"
                              min="0"
                              value={p.price}
                              onChange={(e) => {
                                const newPrices = [...formData.prices];
                                newPrices[idx] = { ...newPrices[idx], price: e.target.value };
                                setFormData({ ...formData, prices: newPrices });
                              }}
                              className="w-20 h-9"
                              placeholder="0.00"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                prices: formData.prices.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dettagli Aggiuntivi */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Numero Spina</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="1, 2, 3..."
                      value={formData.tapNumber}
                      onChange={(e) => setFormData({ ...formData, tapNumber: e.target.value })}
                      data-testid="input-tap-number"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-6">
                    <Switch
                      id="visible"
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                      data-testid="switch-tap-visible"
                    />
                    <Label htmlFor="visible" className="text-sm font-medium">Visibile al pubblico</Label>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Note aggiuntive</Label>
                  <Textarea
                    placeholder="Note speciali, caratteristiche della spillatura..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="textarea-tap-description"
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
                    disabled={addTapMutation.isPending || updateTapMutation.isPending}
                  >
                    {editingItem ? "Salva" : "Aggiungi"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Price Manager Dialog */}
          {showPriceManager && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="max-w-4xl w-full mx-4">
                <PriceFormatManager
                  type="tap"
                  initialPrices={tempPrices}
                  onSave={(prices) => {
                    setFormData({ ...formData, prices });
                    setShowPriceManager(false);
                  }}
                  onCancel={() => setShowPriceManager(false)}
                  beerName={editingItem?.beer.name}
                />
              </div>
            </div>
          )}
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
                    {(!item.isVisible || item.tapNumber) && (
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
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      {item.beer.logoUrl && (
                        <img
                          src={item.beer.logoUrl}
                          alt={item.beer.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base text-gray-900">{item.beer.name}</h3>
                        <p className="text-gray-600 text-sm">{item.beer.brewery?.name || 'Birrificio sconosciuto'}</p>
                        <p className="text-xs text-gray-500">
                          {item.beer.style} • {item.beer.abv}% ABV
                        </p>
                      </div>
                    </div>

                    {/* Prezzi */}
                    {item.prices && item.prices.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.prices.map((price, idx) => (
                          <Badge key={idx} variant="outline" className="text-sm">
                            {price.size}: €{price.price}
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            startEdit(item);
                            setTempPrices(item.prices || []);
                            setShowPriceManager(true);
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Modifica
                        </Button>
                      </div>
                    ) : (item.priceSmall || item.priceMedium || item.priceLarge) ? (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Piccola</div>
                          <div className="font-semibold text-gray-900">
                            {item.priceSmall ? `€${item.priceSmall}` : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Media</div>
                          <div className="font-semibold text-gray-900">
                            {item.priceMedium ? `€${item.priceMedium}` : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Grande</div>
                          <div className="font-semibold text-gray-900">
                            {item.priceLarge ? `€${item.priceLarge}` : '-'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          startEdit(item);
                          setTempPrices([
                            { size: '20cl', price: '4.50' },
                            { size: '40cl', price: '7.50' }
                          ]);
                          setShowPriceManager(true);
                        }}
                        className="mb-4"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Configura prezzi
                      </Button>
                    )}

                    {item.description && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 italic">{item.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        toggleVisibilityMutation.mutate({
                          id: item.id,
                          isVisible: !item.isVisible
                        });
                      }}
                      className="h-8 w-8 p-0"
                    >
                      {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        startEdit(item);
                        setIsAddDialogOpen(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Sei sicuro di voler rimuovere questa birra dalla tap list?')) {
                          deleteTapMutation.mutate(item.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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