import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, BeerIcon, Building2, MapPin, ExternalLink, Loader2, Star } from "lucide-react";
import { Link } from "wouter";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";

interface AdminContentManagerProps {
  type: 'beers' | 'breweries' | 'pubs';
}

const SEARCH_ENDPOINTS: Record<string, string> = {
  beers: '/api/admin/beers/search',
  breweries: '/api/admin/breweries/search',
  pubs: '/api/admin/pubs/search',
};

export default function AdminContentManager({ type }: AdminContentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const searchTimerRef = useRef<any>(null);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '50' });
      const res = await fetch(`${SEARCH_ENDPOINTS[type]}?${params}`, { credentials: 'include' });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Errore ricerca", description: "Impossibile cercare nel database", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [type, toast]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(value), 300);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = `/api/admin/${type}/${id}`;
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
      return await apiRequest(`/api/admin/${type}`, { method: "POST" }, itemData);
    },
    onSuccess: () => {
      toast({ title: "Creato con successo", description: `${type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub'} aggiunto al database` });
      setCreateDialogOpen(false);
      if (searchQuery) runSearch(searchQuery);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare l'elemento", variant: "destructive" });
    },
  });

  const handleCreate = (formData: FormData) => {
    const data: any = {};
    for (const [key, value] of formData.entries()) {
      if (value !== '') data[key] = value;
    }
    if (type === 'beers') {
      if (data.abv) data.abv = parseFloat(data.abv);
      if (data.ibu) data.ibu = parseInt(data.ibu);
      else data.ibu = null;
      if (data.breweryId) data.breweryId = parseInt(data.breweryId);
    } else if (type === 'pubs') {
      if (data.latitude) data.latitude = parseFloat(data.latitude);
      if (data.longitude) data.longitude = parseFloat(data.longitude);
    }
    createMutation.mutate(data);
  };

  const BrewerySearchField = () => {
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const searchBreweries = async (q: string) => {
      if (q.length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch {}
    };

    return (
      <div className="relative">
        <Label htmlFor="brewerySearch">Birrificio *</Label>
        <Input
          id="brewerySearch"
          value={query}
          onChange={(e) => { setQuery(e.target.value); searchBreweries(e.target.value); }}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Cerca birrificio per nome..."
          required
          className="mt-1"
        />
        <input type="hidden" name="breweryId" value={selectedId ?? ""} required />
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-xl max-h-60 overflow-y-auto">
            {results.map((brewery) => (
              <button
                key={brewery.id}
                type="button"
                onClick={() => { setSelectedId(brewery.id); setQuery(brewery.name); setShowResults(false); }}
                className="w-full px-3 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-gray-700 border-b last:border-b-0 flex items-center gap-3 transition-colors"
              >
                {brewery.logoUrl ? (
                  <img src={brewery.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm">{brewery.name}</div>
                  <div className="text-xs text-gray-500">{brewery.location}{brewery.country ? `, ${brewery.country}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const BeerForm = () => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleCreate(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>Nome Birra *</Label><Input name="name" required className="mt-1" placeholder="Es. Golden Ale" /></div>
        <BrewerySearchField />
        <div><Label>Stile *</Label><Input name="style" required className="mt-1" placeholder="Es. IPA, Stout, Lager..." /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>ABV *</Label><Input name="abv" type="number" step="0.1" min="0" max="99" required className="mt-1" placeholder="Es. 5.5" /></div>
          <div><Label>IBU</Label><Input name="ibu" type="number" min="0" className="mt-1" placeholder="Es. 40" /></div>
        </div>
        <div><Label>Colore *</Label><Input name="color" required className="mt-1" placeholder="Es. dorata, ambrata, nera" /></div>
        <div><Label>URL Immagine</Label><Input name="imageUrl" type="url" className="mt-1" placeholder="https://..." /></div>
        <div><Label>Descrizione</Label><Textarea name="description" className="mt-1" rows={3} /></div>
        <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Birra</>}
        </Button>
      </form>
    );
  };

  const BreweryForm = () => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleCreate(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>Nome Birrificio *</Label><Input name="name" required className="mt-1" /></div>
        <div><Label>Località *</Label><Input name="location" required className="mt-1" placeholder="Es. Bologna, BO" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Regione</Label><Input name="region" className="mt-1" placeholder="Es. Emilia-Romagna" /></div>
          <div><Label>Paese</Label><Input name="country" className="mt-1" placeholder="Es. Italy" /></div>
        </div>
        <div><Label>URL Sito Web</Label><Input name="website" type="url" className="mt-1" placeholder="https://..." /></div>
        <div><Label>Descrizione</Label><Textarea name="description" className="mt-1" rows={3} /></div>
        <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Birrificio</>}
        </Button>
      </form>
    );
  };

  const PubForm = () => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleCreate(new FormData(e.currentTarget));
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>Nome Pub *</Label><Input name="name" required className="mt-1" /></div>
        <div><Label>Indirizzo *</Label><Input name="address" required className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Città *</Label><Input name="city" required className="mt-1" /></div>
          <div><Label>Telefono</Label><Input name="phone" type="tel" className="mt-1" /></div>
        </div>
        <div><Label>Descrizione</Label><Textarea name="description" className="mt-1" rows={3} /></div>
        <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Pub</>}
        </Button>
      </form>
    );
  };

  const getItemLink = (item: any) => {
    if (type === 'beers') return `/beer/${item.id}`;
    if (type === 'breweries') return `/brewery/${item.id}`;
    return `/pub/${item.id}`;
  };

  const typeLabel = type === 'beers' ? 'Birre' : type === 'breweries' ? 'Birrifici' : 'Pub';
  const singularLabel = type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub';
  const accentColor = type === 'pubs' ? 'blue' : 'amber';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {type === 'beers' ? <BeerIcon className="w-5 h-5 text-amber-500" /> : type === 'breweries' ? <Building2 className="w-5 h-5 text-amber-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
              Gestione {typeLabel}
              {searchResults.length > 0 && (
                <Badge variant="secondary" className="ml-2">{searchResults.length} trovati</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              className={`${accentColor === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Aggiungi {singularLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={
                type === 'beers' ? 'Cerca per nome birra o birrificio...' :
                type === 'breweries' ? 'Cerca per nome o paese...' :
                'Cerca per nome, città o indirizzo...'
              }
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-10 pr-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {searchResults.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group">
                  {type === 'beers' && (
                    <div className="flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border">
                          <BeerIcon className="w-6 h-6 text-amber-500" />
                        </div>
                      )}
                    </div>
                  )}
                  {type === 'breweries' && (
                    <div className="flex-shrink-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.name} className="w-12 h-12 rounded-full object-cover border shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border">
                          <Building2 className="w-6 h-6 text-amber-500" />
                        </div>
                      )}
                    </div>
                  )}
                  {type === 'pubs' && (
                    <div className="flex-shrink-0">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border">
                          <MapPin className="w-6 h-6 text-blue-500" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {item.name}
                      {item.id && <span className="ml-1.5 text-xs text-gray-400 font-normal">#{item.id}</span>}
                    </h4>
                    {type === 'beers' && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.brewery && (
                          <div className="flex items-center gap-1">
                            {item.brewery.logoUrl && (
                              <img src={item.brewery.logoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                            )}
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{item.brewery.name}</span>
                          </div>
                        )}
                        {item.style && <Badge variant="outline" className="text-xs py-0">{item.style}</Badge>}
                        {item.abv != null && (
                          <Badge variant="secondary" className="text-xs py-0 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                            {item.abv}% ABV
                          </Badge>
                        )}
                        {item.ibu != null && (
                          <Badge variant="secondary" className="text-xs py-0 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            {item.ibu} IBU
                          </Badge>
                        )}
                        {item.isGlutenFree && <GlutenFreeSmallBadge size={12} />}
                        {item.isAlcoholFree && <AlcoholFreeBadge size={11} />}
                      </div>
                    )}
                    {type === 'breweries' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {[item.location, item.country].filter(Boolean).join(' · ')}
                        </span>
                        {item.region && <Badge variant="outline" className="text-xs py-0">{item.region}</Badge>}
                      </div>
                    )}
                    {type === 'pubs' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {[item.city, item.address].filter(Boolean).join(' — ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    <Link href={getItemLink(item)}>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Apri
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-400"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Nessun risultato per "{searchQuery}"</p>
              <p className="text-sm text-gray-500 mt-1">Prova a cercare con termini diversi o aggiungi un nuovo elemento</p>
            </div>
          )}

          {!searchQuery && !isSearching && (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-14 h-14 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Cerca {typeLabel.toLowerCase()}</p>
              <p className="text-sm mt-1">
                {type === 'beers' ? 'Cerca per nome birra o nome birrificio' :
                 type === 'breweries' ? 'Cerca per nome, città o paese' :
                 'Cerca per nome, città o indirizzo'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Aggiungi {type === 'beers' ? 'Nuova Birra' : type === 'breweries' ? 'Nuovo Birrificio' : 'Nuovo Pub'}
            </DialogTitle>
          </DialogHeader>
          {type === 'beers' ? <BeerForm /> : type === 'breweries' ? <BreweryForm /> : <PubForm />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione <strong>non può essere annullata</strong>.{' '}
              {type === 'beers' ? 'La birra verrà rimossa dal catalogo e da tutte le tap list.' :
               type === 'breweries' ? 'Il birrificio e tutte le sue birre associate verranno eliminate permanentemente.' :
               'Il pub, il suo menu e tutta la sua configurazione verranno eliminati permanentemente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Elimina definitivamente</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
