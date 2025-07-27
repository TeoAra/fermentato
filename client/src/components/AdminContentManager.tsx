import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, BeerIcon, Building2 } from "lucide-react";

interface AdminContentManagerProps {
  type: 'beers' | 'breweries';
}

export default function AdminContentManager({ type }: AdminContentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search mutation for global search
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const endpoint = type === 'beers' ? '/api/admin/beers/search' : '/api/admin/breweries/search';
      const params = new URLSearchParams({ q: query, limit: '100' });
      return await fetch(`${endpoint}?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
    },
    onError: () => {
      toast({
        title: "Errore ricerca",
        description: "Impossibile cercare nel database",
        variant: "destructive",
      });
      setIsSearching(false);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const endpoint = type === 'beers' ? '/api/admin/beers' : '/api/admin/breweries';
      return await apiRequest(endpoint, "POST", itemData);
    },
    onSuccess: () => {
      toast({
        title: "Elemento creato",
        description: `${type === 'beers' ? 'Birra' : 'Birrificio'} creato con successo`,
      });
      setCreateDialogOpen(false);
      if (searchQuery) {
        searchMutation.mutate(searchQuery);
      }
    },
    onError: () => {
      toast({
        title: "Errore creazione",
        description: "Impossibile creare l'elemento",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const endpoint = type === 'beers' ? `/api/beers/${id}` : `/api/breweries/${id}`;
      return await apiRequest(endpoint, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Elemento aggiornato",
        description: `${type === 'beers' ? 'Birra' : 'Birrificio'} aggiornato con successo`,
      });
      setEditingItem(null);
      if (searchQuery) {
        searchMutation.mutate(searchQuery);
      }
    },
    onError: () => {
      toast({
        title: "Errore aggiornamento",
        description: "Impossibile aggiornare l'elemento",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchMutation.mutate(searchQuery);
  };

  const handleCreate = (formData: FormData) => {
    const data: any = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Convert numeric fields
    if (type === 'beers') {
      data.abv = parseFloat(data.abv);
      data.ibu = data.ibu ? parseInt(data.ibu) : null;
      data.breweryId = parseInt(data.breweryId);
    }
    
    createMutation.mutate(data);
  };

  const handleUpdate = (formData: FormData) => {
    const data: any = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    // Convert numeric fields
    if (type === 'beers') {
      data.abv = parseFloat(data.abv);
      data.ibu = data.ibu ? parseInt(data.ibu) : null;
      data.breweryId = parseInt(data.breweryId);
    }
    
    updateMutation.mutate({ id: editingItem.id, data });
  };

  const BeerForm = ({ item, onSubmit }: { item?: any; onSubmit: (data: FormData) => void }) => {
    const { data: breweries = [] } = useQuery({
      queryKey: ["/api/breweries"],
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Birra *</Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={item?.name} 
            required 
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="breweryId">Birrificio *</Label>
          <Select name="breweryId" defaultValue={item?.breweryId?.toString()}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleziona birrificio..." />
            </SelectTrigger>
            <SelectContent>
              {breweries.map((brewery: any) => (
                <SelectItem key={brewery.id} value={brewery.id.toString()}>
                  {brewery.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="style">Stile *</Label>
          <Input 
            id="style" 
            name="style" 
            defaultValue={item?.style} 
            required 
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="abv">ABV *</Label>
            <Input 
              id="abv" 
              name="abv" 
              type="number" 
              step="0.1" 
              defaultValue={item?.abv} 
              required 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ibu">IBU</Label>
            <Input 
              id="ibu" 
              name="ibu" 
              type="number" 
              defaultValue={item?.ibu} 
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="color">Colore *</Label>
          <Input 
            id="color" 
            name="color" 
            defaultValue={item?.color} 
            required 
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">URL Immagine *</Label>
          <Input 
            id="imageUrl" 
            name="imageUrl" 
            type="url" 
            defaultValue={item?.imageUrl} 
            required 
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description">Descrizione *</Label>
          <Textarea 
            id="description" 
            name="description" 
            defaultValue={item?.description} 
            required 
            className="mt-1"
            rows={4}
          />
        </div>

        <Button type="submit" className="w-full">
          {item ? 'Aggiorna Birra' : 'Crea Birra'}
        </Button>
      </form>
    );
  };

  const BreweryForm = ({ item, onSubmit }: { item?: any; onSubmit: (data: FormData) => void }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Birrificio *</Label>
        <Input 
          id="name" 
          name="name" 
          defaultValue={item?.name} 
          required 
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="location">Nazione *</Label>
        <Input 
          id="location" 
          name="location" 
          defaultValue={item?.location} 
          required 
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrizione *</Label>
        <Textarea 
          id="description" 
          name="description" 
          defaultValue={item?.description} 
          required 
          className="mt-1"
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full">
        {item ? 'Aggiorna Birrificio' : 'Crea Birrificio'}
      </Button>
      </form>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'beers' ? <BeerIcon className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          Gestione {type === 'beers' ? 'Birre' : 'Birrifici'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Section */}
        <div className="flex gap-2">
          <Input
            placeholder={`Cerca ${type === 'beers' ? 'birre' : 'birrifici'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        {searchResults.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Trovati {searchResults.length} risultati
            </p>
            {searchResults.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  {type === 'beers' && (
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{item.style}</Badge>
                      <Badge variant="outline">{item.abv}% ABV</Badge>
                      {item.brewery && (
                        <Badge variant="secondary">{item.brewery.name}</Badge>
                      )}
                    </div>
                  )}
                  {type === 'breweries' && (
                    <p className="text-sm text-gray-600">{item.location}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem(item)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Nessun risultato trovato per "{searchQuery}"
            </p>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea {type === 'beers' ? 'Birra' : 'Birrificio'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Crea {type === 'beers' ? 'Nuova Birra' : 'Nuovo Birrificio'}
                  </DialogTitle>
                </DialogHeader>
                {type === 'beers' ? (
                  <BeerForm onSubmit={handleCreate} />
                ) : (
                  <BreweryForm onSubmit={handleCreate} />
                )}
              </DialogContent>
            </Dialog>
          </div>
        ) : null}

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Modifica {type === 'beers' ? 'Birra' : 'Birrificio'}
              </DialogTitle>
            </DialogHeader>
            {editingItem && (
              type === 'beers' ? (
                <BeerForm item={editingItem} onSubmit={handleUpdate} />
              ) : (
                <BreweryForm item={editingItem} onSubmit={handleUpdate} />
              )
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}