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
  Beer, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  X
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
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchTerm.length >= 2,
  });

  // Add beer to tap
  const addTapMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pubId}/taplist`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Successo",
        description: "Birra aggiunta alla tap list",
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

  // Update tap item
  const updateTapMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/taplist/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
      setEditingItem(null);
      toast({
        title: "Successo",
        description: "Tap aggiornata",
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

  // Delete tap item
  const deleteTapMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/taplist/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "taplist"] });
      toast({
        title: "Successo",
        description: "Birra rimossa dalla tap list",
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
      priceSmall: "",
      priceMedium: "",
      priceLarge: "",
      tapNumber: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beerId) return;

    if (editingItem) {
      updateTapMutation.mutate({
        id: editingItem.id,
        data: {
          ...formData,
          beerId: parseInt(formData.beerId),
          tapNumber: formData.tapNumber ? parseInt(formData.tapNumber) : null,
        },
      });
    } else {
      addTapMutation.mutate({
        ...formData,
        beerId: parseInt(formData.beerId),
        tapNumber: formData.tapNumber ? parseInt(formData.tapNumber) : null,
      });
    }
  };

  const toggleVisibility = (item: TapItem) => {
    updateTapMutation.mutate({
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
              <Beer className="w-5 h-5" />
              Tap List
            </CardTitle>
            <CardDescription>
              Gestisci le birre alla spina del tuo pub
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
                <DialogTitle>Aggiungi Birra alla Tap</DialogTitle>
                <DialogDescription>
                  Cerca e aggiungi una birra alla tua tap list
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

                {/* Prices */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="priceSmall">Piccola (0.2L)</Label>
                    <Input
                      id="priceSmall"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceSmall}
                      onChange={(e) => setFormData({ ...formData, priceSmall: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceMedium">Media (0.4L)</Label>
                    <Input
                      id="priceMedium"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceMedium}
                      onChange={(e) => setFormData({ ...formData, priceMedium: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceLarge">Grande (0.5L)</Label>
                    <Input
                      id="priceLarge"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceLarge}
                      onChange={(e) => setFormData({ ...formData, priceLarge: e.target.value })}
                    />
                  </div>
                </div>

                {/* Tap Number */}
                <div>
                  <Label htmlFor="tapNumber">Numero Spina</Label>
                  <Input
                    id="tapNumber"
                    type="number"
                    placeholder="1"
                    value={formData.tapNumber}
                    onChange={(e) => setFormData({ ...formData, tapNumber: e.target.value })}
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
                  <Button type="submit" className="flex-1" disabled={!formData.beerId}>
                    Aggiungi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
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
        {tapList.length === 0 ? (
          <div className="text-center py-8">
            <Beer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Nessuna birra in tap list. Aggiungi la prima birra!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tapList.map((item) => (
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
                    {item.tapNumber && (
                      <Badge variant="outline" className="mt-1">
                        Spina {item.tapNumber}
                      </Badge>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    {item.priceSmall && <p>Piccola: €{item.priceSmall}</p>}
                    {item.priceMedium && <p>Media: €{item.priceMedium}</p>}
                    {item.priceLarge && <p>Grande: €{item.priceLarge}</p>}
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
                          priceSmall: item.priceSmall || "",
                          priceMedium: item.priceMedium || "",
                          priceLarge: item.priceLarge || "",
                          tapNumber: item.tapNumber?.toString() || "",
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
                      onClick={() => deleteTapMutation.mutate(item.id)}
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