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
import { Search, Plus, Edit, Trash2, BeerIcon, Building2, MapPin, Upload } from "lucide-react";

interface AdminContentManagerProps {
  type: 'beers' | 'breweries' | 'pubs';
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
      let endpoint = '';
      if (type === 'beers') endpoint = '/api/admin/beers/search';
      else if (type === 'breweries') endpoint = '/api/admin/breweries/search';
      else if (type === 'pubs') endpoint = '/api/pubs';
      
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
      let endpoint = '';
      if (type === 'beers') endpoint = '/api/admin/beers';
      else if (type === 'breweries') endpoint = '/api/admin/breweries';
      else if (type === 'pubs') endpoint = '/api/admin/pubs';
      return await apiRequest(endpoint, "POST", itemData);
    },
    onSuccess: () => {
      toast({
        title: "Elemento creato",
        description: `${type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'} creato con successo`,
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
      let endpoint = '';
      if (type === 'beers') endpoint = `/api/admin/beers/${id}`;
      else if (type === 'breweries') endpoint = `/api/admin/breweries/${id}`;
      else if (type === 'pubs') endpoint = `/api/pubs/${id}`;
      return await apiRequest(endpoint, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Elemento aggiornato",
        description: `${type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'} aggiornato con successo`,
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
    } else if (type === 'pubs') {
      data.latitude = data.latitude ? parseFloat(data.latitude) : null;
      data.longitude = data.longitude ? parseFloat(data.longitude) : null;
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
    } else if (type === 'pubs') {
      data.latitude = data.latitude ? parseFloat(data.latitude) : null;
      data.longitude = data.longitude ? parseFloat(data.longitude) : null;
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

        <BrewerySearchField defaultBrewery={item?.brewery} />

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
          <Label htmlFor="imageUrl">Immagine Birra *</Label>
          <div className="flex gap-2 mt-1">
            <Input 
              id="imageUrl" 
              name="imageUrl" 
              type="url" 
              defaultValue={item?.imageUrl} 
              required 
              placeholder="URL immagine birra"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
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

  const PubForm = ({ item, onSubmit }: { item?: any; onSubmit: (data: FormData) => void }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Pub *</Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={item?.name} 
            required 
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="address">Indirizzo *</Label>
          <Input 
            id="address" 
            name="address" 
            defaultValue={item?.address} 
            required 
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Città *</Label>
            <Input 
              id="city" 
              name="city" 
              defaultValue={item?.city} 
              required 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefono *</Label>
            <Input 
              id="phone" 
              name="phone" 
              type="tel" 
              defaultValue={item?.phone} 
              required 
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            defaultValue={item?.email} 
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitudine</Label>
            <Input 
              id="latitude" 
              name="latitude" 
              type="number" 
              step="0.000001" 
              defaultValue={item?.latitude} 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitudine</Label>
            <Input 
              id="longitude" 
              name="longitude" 
              type="number" 
              step="0.000001" 
              defaultValue={item?.longitude} 
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="logoUrl">URL Logo</Label>
          <Input 
            id="logoUrl" 
            name="logoUrl" 
            type="url" 
            defaultValue={item?.logoUrl} 
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="coverImageUrl">URL Immagine di Copertina</Label>
          <Input 
            id="coverImageUrl" 
            name="coverImageUrl" 
            type="url" 
            defaultValue={item?.coverImageUrl} 
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full">
          {item ? 'Aggiorna Pub' : 'Crea Pub'}
        </Button>
      </form>
    );
  };

  // Component for brewery search with autocomplete
  const BrewerySearchField = ({ defaultBrewery }: { defaultBrewery?: any }) => {
    const [searchQuery, setSearchQuery] = useState(defaultBrewery?.name || "");
    const [selectedBrewery, setSelectedBrewery] = useState(defaultBrewery);
    const [breweryResults, setBreweryResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const searchBreweries = async (query: string) => {
      if (query.length < 2) {
        setBreweryResults([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(query)}&limit=10`, {
          credentials: 'include'
        });
        const results = await response.json();
        setBreweryResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching breweries:', error);
      }
    };

    const selectBrewery = (brewery: any) => {
      setSelectedBrewery(brewery);
      setSearchQuery(brewery.name);
      setShowResults(false);
      setBreweryResults([]);
    };

    return (
      <div className="relative">
        <Label htmlFor="brewerySearch">Birrificio *</Label>
        <Input
          id="brewerySearch"
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            searchBreweries(e.target.value);
          }}
          onFocus={() => {
            if (breweryResults.length > 0) setShowResults(true);
          }}
          onBlur={() => {
            // Delay to allow clicking on results
            setTimeout(() => setShowResults(false), 200);
          }}
          placeholder="Cerca birrificio..."
          required
          className="mt-1"
        />
        <input
          type="hidden"
          name="breweryId"
          value={selectedBrewery?.id || ""}
          required
        />
        
        {showResults && breweryResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {breweryResults.map((brewery) => (
              <button
                key={brewery.id}
                type="button"
                onClick={() => selectBrewery(brewery)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0"
              >
                <div className="font-medium">{brewery.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{brewery.location}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'beers' ? <BeerIcon className="w-5 h-5" /> : type === 'breweries' ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
          Gestione {type === 'beers' ? 'Birre' : type === 'breweries' ? 'Birrifici' : 'Pub'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Section - Real-time search */}
        <div className="flex gap-2">
          <Input
            placeholder={`Cerca ${type === 'beers' ? 'birre' : type === 'breweries' ? 'birrifici' : 'pub'}...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Auto-search after 300ms delay
              setTimeout(() => {
                if (e.target.value.trim().length > 0) {
                  setIsSearching(true);
                  searchMutation.mutate(e.target.value);
                } else {
                  setSearchResults([]);
                }
              }, 300);
            }}
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
                  {type === 'pubs' && (
                    <p className="text-sm text-gray-600">{item.address}</p>
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
                  Crea {type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Crea {type === 'beers' ? 'Nuova Birra' : type === 'breweries' ? 'Nuovo Birrificio' : 'Nuovo Pub'}
                  </DialogTitle>
                </DialogHeader>
                {type === 'beers' ? (
                  <BeerForm onSubmit={handleCreate} />
                ) : type === 'breweries' ? (
                  <BreweryForm onSubmit={handleCreate} />
                ) : (
                  <PubForm onSubmit={handleCreate} />
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
                Modifica {type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'}
              </DialogTitle>
            </DialogHeader>
            {editingItem && (
              type === 'beers' ? (
                <BeerForm item={editingItem} onSubmit={handleUpdate} />
              ) : type === 'breweries' ? (
                <BreweryForm item={editingItem} onSubmit={handleUpdate} />
              ) : (
                <PubForm item={editingItem} onSubmit={handleUpdate} />
              )
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}