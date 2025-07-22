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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Wine, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Package
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
  priceBottle: string;
  bottleSize: string;
  quantity?: number;
  description?: string;
  isVisible: boolean;
}

interface BottleListManagerProps {
  pubId: number;
  bottleList: BottleItem[];
}

const bottleSizes = [
  { value: "0.33L", label: "0.33L" },
  { value: "0.5L", label: "0.5L" },
  { value: "0.75L", label: "0.75L" },
  { value: "1L", label: "1L" },
  { value: "1.5L", label: "1.5L (Magnum)" },
];

export function BottleListManager({ pubId, bottleList }: BottleListManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BottleItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    beerId: "",
    priceBottle: "",
    bottleSize: "0.33L",
    quantity: "",
    description: "",
    isVisible: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search beers for adding to bottles
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

  // Add beer to bottles
  const addBottleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/bottles`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Successo",
        description: "Birra aggiunta alla cantina",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiungere la birra",
        variant: "destructive",
      });
    },
  });

  // Update bottle item
  const updateBottleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/bottles/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
      setEditingItem(null);
      toast({
        title: "Successo",
        description: "Bottiglia aggiornata",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento",
        variant: "destructive",
      });
    },
  });

  // Delete bottle item
  const deleteBottleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/bottles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "bottles"] });
      toast({
        title: "Successo",
        description: "Birra rimossa dalla cantina",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nella rimozione",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      beerId: "",
      priceBottle: "",
      bottleSize: "0.33L",
      quantity: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beerId || !formData.priceBottle) return;

    const data = {
      ...formData,
      beerId: parseInt(formData.beerId),
      quantity: formData.quantity ? parseInt(formData.quantity) : null,
    };

    if (editingItem) {
      updateBottleMutation.mutate({
        id: editingItem.id,
        data,
      });
    } else {
      addBottleMutation.mutate(data);
    }
  };

  const toggleVisibility = (item: BottleItem) => {
    updateBottleMutation.mutate({
      id: item.id,
      data: { isVisible: !item.isVisible },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wine className="w-5 h-5" />
              Cantina Birre
            </CardTitle>
            <CardDescription>
              Gestisci le birre in bottiglia disponibili nel tuo pub
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Birra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifica Birra" : "Aggiungi Birra alla Cantina"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modifica i dettagli della birra" : "Cerca e aggiungi una birra alla tua cantina"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Beer Search */}
                <div>
                  <Label htmlFor="beer-search">Cerca Birra</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="beer-search"
                      placeholder="Cerca birra..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searchResults?.beers?.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                      {searchResults.beers.slice(0, 5).map((beer: any) => (
                        <button
                          key={beer.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, beerId: beer.id.toString() });
                            setSearchTerm(beer.name);
                          }}
                          className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0"
                        >
                          <div className="font-medium">{beer.name}</div>
                          <div className="text-sm text-gray-500">
                            {beer.brewery.name} • {beer.style} • {beer.abv}%
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price and Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="priceBottle">Prezzo Bottiglia *</Label>
                    <Input
                      id="priceBottle"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceBottle}
                      onChange={(e) => setFormData({ ...formData, priceBottle: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bottleSize">Dimensione</Label>
                    <Select value={formData.bottleSize} onValueChange={(value) => setFormData({ ...formData, bottleSize: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bottleSizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="quantity">Quantità Disponibile</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Es. 12"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Descrizione (opzionale)</Label>
                  <Textarea
                    id="description"
                    placeholder="Note aggiuntive sulla birra..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isVisible"
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                  />
                  <Label htmlFor="isVisible">Visibile ai clienti</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={!formData.beerId || !formData.priceBottle}>
                    {editingItem ? "Aggiorna" : "Aggiungi"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {bottleList.length === 0 ? (
          <div className="text-center py-8">
            <Wine className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Nessuna birra in cantina. Aggiungi la prima birra!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bottleList.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  {item.beer.logoUrl && (
                    <img
                      src={item.beer.logoUrl}
                      alt={item.beer.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.beer.name}</h3>
                      {!item.isVisible && (
                        <Badge variant="secondary" className="text-xs">
                          Nascosta
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {item.beer.brewery.name} • {item.beer.style} • {item.beer.abv}%
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {item.bottleSize}
                      </Badge>
                      {item.quantity && (
                        <Badge variant="outline" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">€{item.priceBottle}</p>
                    <p className="text-sm text-gray-500">{item.bottleSize}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleVisibility(item)}
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
                      onClick={() => {
                        setEditingItem(item);
                        setFormData({
                          beerId: item.beer.id.toString(),
                          priceBottle: item.priceBottle,
                          bottleSize: item.bottleSize,
                          quantity: item.quantity?.toString() || "",
                          description: item.description || "",
                          isVisible: item.isVisible,
                        });
                        setSearchTerm(item.beer.name);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBottleMutation.mutate(item.id)}
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