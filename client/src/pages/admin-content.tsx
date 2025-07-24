import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Edit3, 
  Save, 
  X, 
  Beer, 
  Building, 
  Search,
  Filter,
  Eye,
  Star,
  MapPin,
  Calendar,
  Image,
  ExternalLink,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Beer {
  id: number;
  name: string;
  brewery: string;
  breweryId: number;
  style: string;
  abv: number | null;
  ibu: number | null;
  description: string | null;
  imageUrl: string | null;
  bottleImageUrl: string | null;
  createdAt: string;
}

interface Brewery {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  founded: number | null;
  website: string | null;
  logoUrl: string | null;
  beerCount: number;
  createdAt: string;
}

export default function AdminContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"beers" | "breweries" | "pubs">("beers");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: beers, isLoading: beersLoading } = useQuery<Beer[]>({
    queryKey: ["/api/admin/beers", { search: searchTerm }],
    enabled: isAuthenticated && user?.userType === 'admin' && selectedType === 'beers',
  });

  const { data: breweries, isLoading: breweriesLoading } = useQuery<Brewery[]>({
    queryKey: ["/api/admin/breweries", { search: searchTerm }],
    enabled: isAuthenticated && user?.userType === 'admin' && selectedType === 'breweries',
  });

  const { data: pubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/admin/pubs", { search: searchTerm }],
    enabled: isAuthenticated && user?.userType === 'admin' && selectedType === 'pubs',
  });

  // Update mutations
  const updateBeerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/beers/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beers"] });
      setEditingItem(null);
      setEditData({});
      toast({
        title: "Birra aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const updateBreweryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/breweries/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breweries"] });
      setEditingItem(null);
      setEditData({});
      toast({
        title: "Birrificio aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item.id);
    setEditData(item);
  };

  const handleSave = () => {
    if (selectedType === 'beers') {
      updateBeerMutation.mutate({ id: editingItem!, data: editData });
    } else {
      updateBreweryMutation.mutate({ id: editingItem!, data: editData });
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditData({});
  };

  const filteredBeers = beers?.filter(beer => 
    beer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beer.brewery.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beer.style.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredBreweries = breweries?.filter(brewery => 
    brewery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brewery.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento gestione contenuti...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestione Contenuti</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Modifica e gestisci birre e birrifici del database</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {selectedType === 'beers' ? `${filteredBeers.length} birre` : `${filteredBreweries.length} birrifici`}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <Button 
              variant={selectedType === 'beers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('beers')}
              className="flex items-center gap-2"
            >
              <Beer className="w-4 h-4" />
              Birre
            </Button>
            <Button 
              variant={selectedType === 'breweries' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('breweries')}
              className="flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              Birrifici
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Cerca ${selectedType === 'beers' ? 'birre' : 'birrifici'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtri
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {selectedType === 'beers' && (
        <div className="grid gap-4">
          {beersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento birre...</p>
            </div>
          ) : (
            filteredBeers.map((beer) => (
              <Card key={beer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {editingItem === beer.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Edit3 className="w-5 h-5" />
                          Modifica Birra
                        </h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave} disabled={updateBeerMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            Salva
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="w-4 h-4 mr-2" />
                            Annulla
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nome Birra</label>
                          <Input
                            value={editData.name || ''}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            placeholder="Nome della birra"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Stile</label>
                          <Input
                            value={editData.style || ''}
                            onChange={(e) => setEditData({...editData, style: e.target.value})}
                            placeholder="Stile della birra"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">ABV (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.abv || ''}
                            onChange={(e) => setEditData({...editData, abv: parseFloat(e.target.value) || null})}
                            placeholder="5.0"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">IBU</label>
                          <Input
                            type="number"
                            value={editData.ibu || ''}
                            onChange={(e) => setEditData({...editData, ibu: parseInt(e.target.value) || null})}
                            placeholder="25"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Descrizione</label>
                          <Textarea
                            value={editData.description || ''}
                            onChange={(e) => setEditData({...editData, description: e.target.value})}
                            placeholder="Descrizione della birra..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {beer.imageUrl && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <img 
                              src={beer.imageUrl} 
                              alt={beer.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {beer.name}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {beer.brewery} • {beer.style}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(beer)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Modifica
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizza
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mb-3">
                            {beer.abv && (
                              <Badge variant="secondary">
                                ABV: {beer.abv}%
                              </Badge>
                            )}
                            {beer.ibu && (
                              <Badge variant="secondary">
                                IBU: {beer.ibu}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              ID: {beer.id}
                            </Badge>
                          </div>
                          
                          {beer.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {beer.description.length > 150 
                                ? `${beer.description.substring(0, 150)}...` 
                                : beer.description
                              }
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(beer.createdAt), { addSuffix: true, locale: it })}
                            </span>
                            {beer.imageUrl && (
                              <span className="flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                Immagine disponibile
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedType === 'breweries' && (
        <div className="grid gap-4">
          {breweriesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento birrifici...</p>
            </div>
          ) : (
            filteredBreweries.map((brewery) => (
              <Card key={brewery.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {editingItem === brewery.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Edit3 className="w-5 h-5" />
                          Modifica Birrificio
                        </h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave} disabled={updateBreweryMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            Salva
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="w-4 h-4 mr-2" />
                            Annulla
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Nome Birrificio</label>
                          <Input
                            value={editData.name || ''}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            placeholder="Nome del birrificio"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Ubicazione</label>
                          <Input
                            value={editData.location || ''}
                            onChange={(e) => setEditData({...editData, location: e.target.value})}
                            placeholder="Città, Paese"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Anno di Fondazione</label>
                          <Input
                            type="number"
                            value={editData.founded || ''}
                            onChange={(e) => setEditData({...editData, founded: parseInt(e.target.value) || null})}
                            placeholder="1995"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Sito Web</label>
                          <Input
                            value={editData.website || ''}
                            onChange={(e) => setEditData({...editData, website: e.target.value})}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Descrizione</label>
                          <Textarea
                            value={editData.description || ''}
                            onChange={(e) => setEditData({...editData, description: e.target.value})}
                            placeholder="Descrizione del birrificio..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {brewery.logoUrl && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <img 
                              src={brewery.logoUrl} 
                              alt={brewery.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {brewery.name}
                              </h3>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                {brewery.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {brewery.location}
                                  </span>
                                )}
                                {brewery.founded && (
                                  <span>• Fondato nel {brewery.founded}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(brewery)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Modifica
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizza
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mb-3">
                            <Badge variant="secondary">
                              {brewery.beerCount} birre
                            </Badge>
                            {brewery.website && (
                              <Badge variant="outline" className="cursor-pointer" onClick={() => window.open(brewery.website!, '_blank')}>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Sito Web
                              </Badge>
                            )}
                            <Badge variant="outline">
                              ID: {brewery.id}
                            </Badge>
                          </div>
                          
                          {brewery.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {brewery.description.length > 150 
                                ? `${brewery.description.substring(0, 150)}...` 
                                : brewery.description
                              }
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(brewery.createdAt), { addSuffix: true, locale: it })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Beer className="w-3 h-3" />
                              {brewery.beerCount} birre prodotte
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Empty State */}
      {((selectedType === 'beers' && filteredBeers.length === 0) || 
        (selectedType === 'breweries' && filteredBreweries.length === 0)) && 
        !beersLoading && !breweriesLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {selectedType === 'beers' ? <Beer className="w-8 h-8 text-gray-400" /> : <Building className="w-8 h-8 text-gray-400" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Nessun {selectedType === 'beers' ? 'birra' : 'birrificio'} trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Modifica i termini di ricerca o i filtri per trovare contenuti.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}