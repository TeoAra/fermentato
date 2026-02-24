import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, BeerIcon, Building2, MapPin, ExternalLink, Upload, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface AdminContentManagerProps {
  type: 'beers' | 'breweries' | 'pubs';
}

export default function AdminContentManager({ type }: AdminContentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const searchTimerRef = useRef<any>(null);

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      let endpoint = '';
      if (type === 'beers') endpoint = '/api/admin/beers/search';
      else if (type === 'breweries') endpoint = '/api/admin/breweries/search';
      else if (type === 'pubs') endpoint = '/api/pubs';
      
      const params = new URLSearchParams({ q: query, limit: '50' });
      return await fetch(`${endpoint}?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      setSearchResults(Array.isArray(data) ? data : []);
      setIsSearching(false);
    },
    onError: () => {
      toast({ title: "Errore ricerca", description: "Impossibile cercare nel database", variant: "destructive" });
      setIsSearching(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = type === 'beers' ? `/api/admin/beers/${id}` : type === 'breweries' ? `/api/admin/breweries/${id}` : `/api/admin/pubs/${id}`;
      return await apiRequest(endpoint, { method: "DELETE" });
    },
    onSuccess: (data: any) => {
      toast({ title: "Eliminato", description: data?.message || "Elemento eliminato con successo" });
      setSearchResults(prev => prev.filter(item => item.id !== deleteTarget?.id));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/global"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare l'elemento", variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (itemData: any) => {
      let endpoint = '';
      if (type === 'beers') endpoint = '/api/admin/beers';
      else if (type === 'breweries') endpoint = '/api/admin/breweries';
      else if (type === 'pubs') endpoint = '/api/admin/pubs';
      return await apiRequest(endpoint, { method: "POST" }, itemData);
    },
    onSuccess: () => {
      toast({ title: "Creato", description: `${type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'} creato con successo` });
      setCreateDialogOpen(false);
      if (searchQuery) searchMutation.mutate(searchQuery);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare l'elemento", variant: "destructive" });
    },
  });

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (value.trim().length > 0) {
        setIsSearching(true);
        searchMutation.mutate(value);
      } else {
        setSearchResults([]);
      }
    }, 300);
  };

  const handleCreate = (formData: FormData) => {
    const data: any = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
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

  const BeerForm = ({ onSubmit }: { onSubmit: (data: FormData) => void }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Birra *</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <BrewerySearchField />
        <div>
          <Label htmlFor="style">Stile *</Label>
          <Input id="style" name="style" required className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="abv">ABV *</Label>
            <Input id="abv" name="abv" type="number" step="0.1" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ibu">IBU</Label>
            <Input id="ibu" name="ibu" type="number" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="color">Colore *</Label>
          <Input id="color" name="color" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="imageUrl">URL Immagine</Label>
          <Input id="imageUrl" name="imageUrl" type="url" className="mt-1" placeholder="URL immagine birra" />
        </div>
        <div>
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" name="description" className="mt-1" rows={3} />
        </div>
        <Button type="submit" className="w-full">Crea Birra</Button>
      </form>
    );
  };

  const BreweryForm = ({ onSubmit }: { onSubmit: (data: FormData) => void }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Birrificio *</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="location">Località *</Label>
          <Input id="location" name="location" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="region">Regione *</Label>
          <Input id="region" name="region" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" name="description" className="mt-1" rows={3} />
        </div>
        <Button type="submit" className="w-full">Crea Birrificio</Button>
      </form>
    );
  };

  const PubForm = ({ onSubmit }: { onSubmit: (data: FormData) => void }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Pub *</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="address">Indirizzo *</Label>
          <Input id="address" name="address" required className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Città *</Label>
            <Input id="city" name="city" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" type="tel" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" name="description" className="mt-1" rows={3} />
        </div>
        <Button type="submit" className="w-full">Crea Pub</Button>
      </form>
    );
  };

  const BrewerySearchField = ({ defaultBrewery }: { defaultBrewery?: any }) => {
    const [query, setQuery] = useState(defaultBrewery?.name || "");
    const [selectedBrewery, setSelectedBrewery] = useState(defaultBrewery);
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const searchBreweries = async (q: string) => {
      if (q.length < 2) { setResults([]); return; }
      try {
        const response = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching breweries:', error);
      }
    };

    return (
      <div className="relative">
        <Label htmlFor="brewerySearch">Birrificio *</Label>
        <Input
          id="brewerySearch"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); searchBreweries(e.target.value); }}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Cerca birrificio..."
          required
          className="mt-1"
        />
        <input type="hidden" name="breweryId" value={selectedBrewery?.id || ""} required />
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((brewery) => (
              <button
                key={brewery.id}
                type="button"
                onClick={() => { setSelectedBrewery(brewery); setQuery(brewery.name); setShowResults(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0 flex items-center gap-3"
              >
                {brewery.logoUrl && (
                  <img src={brewery.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                )}
                <div>
                  <div className="font-medium">{brewery.name}</div>
                  <div className="text-sm text-gray-500">{brewery.location}{brewery.country ? `, ${brewery.country}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getItemLink = (item: any) => {
    if (type === 'beers') return `/beer/${item.id}`;
    if (type === 'breweries') return `/brewery/${item.id}`;
    return `/pub/${item.id}`;
  };

  const typeLabel = type === 'beers' ? 'Birre' : type === 'breweries' ? 'Birrifici' : 'Pub';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'beers' ? <BeerIcon className="w-5 h-5" /> : type === 'breweries' ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
          Gestione {typeLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={`Cerca ${type === 'beers' ? 'birre (anche per birrificio)...' : type === 'breweries' ? 'birrifici...' : 'pub...'}`}
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          {isSearching && <Loader2 className="w-5 h-5 animate-spin text-gray-400 self-center" />}
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchResults.length} risultati
            </p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {searchResults.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {type === 'beers' && (
                    <div className="flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <BeerIcon className="w-6 h-6 text-amber-600" />
                        </div>
                      )}
                    </div>
                  )}
                  {type === 'breweries' && (
                    <div className="flex-shrink-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.name} className="w-12 h-12 rounded-full object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-amber-600" />
                        </div>
                      )}
                    </div>
                  )}
                  {type === 'pubs' && (
                    <div className="flex-shrink-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h4>
                    {type === 'beers' && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.brewery && (
                          <div className="flex items-center gap-1">
                            {item.brewery.logoUrl && (
                              <img src={item.brewery.logoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                            )}
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{item.brewery.name}</span>
                          </div>
                        )}
                        {item.style && <Badge variant="outline" className="text-xs">{item.style}</Badge>}
                        {item.abv != null && <Badge variant="secondary" className="text-xs">{item.abv}%</Badge>}
                        {item.isGlutenFree && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">GF</Badge>}
                        {item.isAlcoholFree && <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">0.0%</Badge>}
                      </div>
                    )}
                    {type === 'breweries' && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.location}{item.country ? `, ${item.country}` : ''}
                      </p>
                    )}
                    {type === 'pubs' && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.city ? `${item.city} - ` : ''}{item.address || ''}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={getItemLink(item)}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Apri
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Nessun risultato per "{searchQuery}"
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
                {type === 'beers' ? <BeerForm onSubmit={handleCreate} /> : type === 'breweries' ? <BreweryForm onSubmit={handleCreate} /> : <PubForm onSubmit={handleCreate} />}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Cerca {typeLabel.toLowerCase()}</p>
            <p className="text-sm mt-1">Inizia a digitare per trovare {type === 'beers' ? 'birre per nome o birrificio' : type === 'breweries' ? 'birrifici per nome' : 'pub per nome o città'}</p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di eliminare "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. {type === 'beers' ? 'La birra' : type === 'breweries' ? 'Il birrificio e tutte le sue birre' : 'Il pub'} verrà eliminato permanentemente dal database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
