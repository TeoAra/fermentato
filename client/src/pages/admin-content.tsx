import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Plus,
  Upload,
  Search,
  Filter,
  Eye,
  Star,
  MapPin,
  Calendar,
  Image,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Beer,
  Building,
  Store
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function AdminContent() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"beers" | "breweries" | "pubs">("beers");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data queries
  const { data: beers = [], isLoading: beersLoading } = useQuery({
    queryKey: ["/api/admin/beers"],
    enabled: selectedType === 'beers',
  });

  const { data: breweries = [], isLoading: breweriesLoading } = useQuery({
    queryKey: ["/api/admin/breweries"],
    enabled: selectedType === 'breweries',
  });

  const { data: pubs = [], isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/admin/pubs"],
    enabled: selectedType === 'pubs',
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Immagine caricata",
        description: "L'immagine è stata caricata con successo",
      });
      return data.url;
    },
    onError: () => {
      toast({
        title: "Errore upload",
        description: "Errore durante il caricamento dell'immagine",
        variant: "destructive",
      });
    },
  });

  // Update mutations
  const updateBeerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/beers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
  });

  const updateBreweryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/breweries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
  });

  const updatePubMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/pubs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pubs"] });
      setEditingItem(null);
      setEditData({});
      toast({
        title: "Pub aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
    },
  });

  // Delete mutations
  const deleteBeerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/beers/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beers"] });
      toast({
        title: "Birra eliminata",
        description: "La birra è stata rimossa dal database",
      });
    },
  });

  const deleteBreweryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/breweries/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breweries"] });
      toast({
        title: "Birrificio eliminato",
        description: "Il birrificio è stato rimosso dal database",
      });
    },
  });

  const deletePubMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/pubs/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pubs"] });
      toast({
        title: "Pub eliminato",
        description: "Il pub è stato rimosso dal database",
      });
    },
  });

  // Filter data based on search
  const filterData = (data: any[], searchTerm: string) => {
    if (!searchTerm.trim()) return data;
    
    return data?.filter((item: any) => {
      const searchLower = searchTerm.toLowerCase();
      if (selectedType === 'beers') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.brewery?.toLowerCase().includes(searchLower) ||
          item.style?.toLowerCase().includes(searchLower)
        );
      } else if (selectedType === 'breweries') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.location?.toLowerCase().includes(searchLower) ||
          item.region?.toLowerCase().includes(searchLower)
        );
      } else if (selectedType === 'pubs') {
        return (
          item.pubs?.name?.toLowerCase().includes(searchLower) ||
          item.pubs?.address?.toLowerCase().includes(searchLower) ||
          item.pubs?.city?.toLowerCase().includes(searchLower)
        );
      }
      return false;
    }) || [];
  };

  const handleEdit = (item: any) => {
    setEditingItem(item.id);
    setEditData(selectedType === 'pubs' ? item.pubs : item);
  };

  const handleSave = () => {
    if (selectedType === 'beers') {
      updateBeerMutation.mutate({ id: editingItem!, data: editData });
    } else if (selectedType === 'breweries') {
      updateBreweryMutation.mutate({ id: editingItem!, data: editData });
    } else if (selectedType === 'pubs') {
      updatePubMutation.mutate({ id: editingItem!, data: editData });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(`Sei sicuro di voler eliminare questo ${selectedType.slice(0, -1)}?`)) {
      if (selectedType === 'beers') {
        deleteBeerMutation.mutate(id);
      } else if (selectedType === 'breweries') {
        deleteBreweryMutation.mutate(id);
      } else if (selectedType === 'pubs') {
        deletePubMutation.mutate(id);
      }
    }
  };

  const handleImageUpload = async (field: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      fileInputRef.current.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const result = await uploadImageMutation.mutateAsync(file);
            setEditData(prev => ({ ...prev, [field]: result.url }));
          } catch (error) {
            console.error('Upload error:', error);
          }
        }
      };
    }
  };

  const getCurrentData = () => {
    switch (selectedType) {
      case 'beers':
        return beers;
      case 'breweries':
        return breweries;
      case 'pubs':
        return pubs;
      default:
        return [];
    }
  };

  const isLoading = beersLoading || breweriesLoading || pubsLoading;
  const filteredData = filterData(getCurrentData(), searchTerm);

  if (!isAuthenticated || (user as any)?.userType !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="text-xl font-bold mb-2">Accesso Negato</h1>
            <p className="text-gray-600 mb-4">Solo gli amministratori possono accedere a questa sezione.</p>
            <Link href="/">
              <Button>Torna alla Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Gestione Contenuti</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={selectedType} onValueChange={(value: any) => setSelectedType(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="beers" className="flex items-center">
                  <Beer className="w-4 h-4 mr-2" />
                  Birre ({Array.isArray(beers) ? beers.length : 0})
                </TabsTrigger>
                <TabsTrigger value="breweries" className="flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  Birrifici ({Array.isArray(breweries) ? breweries.length : 0})
                </TabsTrigger>
                <TabsTrigger value="pubs" className="flex items-center">
                  <Store className="w-4 h-4 mr-2" />
                  Pub ({Array.isArray(pubs) ? pubs.length : 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder={`Cerca ${selectedType === 'beers' ? 'birre' : selectedType === 'breweries' ? 'birrifici' : 'pub'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedType === 'beers' ? 'Gestione Birre' : 
                 selectedType === 'breweries' ? 'Gestione Birrifici' : 'Gestione Pub'}
              </span>
              <Badge variant="secondary">
                {filteredData.length} risultati
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.map((item: any) => {
                  const isEditing = editingItem === item.id;
                  const displayItem = selectedType === 'pubs' ? item.pubs : item;
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      {isEditing ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Modifica {selectedType.slice(0, -1)}</h3>
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={handleSave} disabled={updateBeerMutation.isPending || updateBreweryMutation.isPending || updatePubMutation.isPending}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {setEditingItem(null); setEditData({})}}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Nome</label>
                              <Input
                                value={editData.name || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>

                            {selectedType === 'beers' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Stile</label>
                                  <Input
                                    value={editData.style || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, style: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">ABV (%)</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={editData.abv || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, abv: parseFloat(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">IBU</label>
                                  <Input
                                    type="number"
                                    value={editData.ibu || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, ibu: parseInt(e.target.value) }))}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Immagine Principale</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editData.imageUrl || ''}
                                      onChange={(e) => setEditData(prev => ({ ...prev, imageUrl: e.target.value }))}
                                      placeholder="URL immagine"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => handleImageUpload('imageUrl')}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Immagine Bottiglia</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editData.bottleImageUrl || ''}
                                      onChange={(e) => setEditData(prev => ({ ...prev, bottleImageUrl: e.target.value }))}
                                      placeholder="URL immagine bottiglia"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => handleImageUpload('bottleImageUrl')}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}

                            {selectedType === 'breweries' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Località</label>
                                  <Input
                                    value={editData.location || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Regione</label>
                                  <Input
                                    value={editData.region || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, region: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Anno Fondazione</label>
                                  <Input
                                    type="number"
                                    value={editData.founded || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, founded: parseInt(e.target.value) }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Sito Web</label>
                                  <Input
                                    value={editData.websiteUrl || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Logo</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editData.logoUrl || ''}
                                      onChange={(e) => setEditData(prev => ({ ...prev, logoUrl: e.target.value }))}
                                      placeholder="URL logo"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => handleImageUpload('logoUrl')}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}

                            {selectedType === 'pubs' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Indirizzo</label>
                                  <Input
                                    value={editData.address || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Città</label>
                                  <Input
                                    value={editData.city || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Telefono</label>
                                  <Input
                                    value={editData.phone || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Sito Web</label>
                                  <Input
                                    value={editData.websiteUrl || ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Logo</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editData.logoUrl || ''}
                                      onChange={(e) => setEditData(prev => ({ ...prev, logoUrl: e.target.value }))}
                                      placeholder="URL logo"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => handleImageUpload('logoUrl')}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Immagine Copertina</label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editData.coverImageUrl || ''}
                                      onChange={(e) => setEditData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                                      placeholder="URL immagine copertina"
                                    />
                                    <Button size="sm" variant="outline" onClick={() => handleImageUpload('coverImageUrl')}>
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium mb-1">Descrizione</label>
                              <Textarea
                                value={editData.description || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {(displayItem.imageUrl || displayItem.logoUrl || displayItem.bottleImageUrl) && (
                              <img
                                src={displayItem.imageUrl || displayItem.logoUrl || displayItem.bottleImageUrl}
                                alt={displayItem.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold text-lg">{displayItem.name}</h3>
                              {selectedType === 'beers' && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <span>{displayItem.brewery}</span>
                                  <span>•</span>
                                  <span>{displayItem.style}</span>
                                  {displayItem.abv && (
                                    <>
                                      <span>•</span>
                                      <span>{displayItem.abv}% ABV</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {selectedType === 'breweries' && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  {displayItem.location && <span>{displayItem.location}</span>}
                                  {displayItem.region && (
                                    <>
                                      <span>•</span>
                                      <span>{displayItem.region}</span>
                                    </>
                                  )}
                                  {displayItem.founded && (
                                    <>
                                      <span>•</span>
                                      <span>Fondato nel {displayItem.founded}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {selectedType === 'pubs' && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span>{displayItem.address}</span>
                                  {displayItem.city && (
                                    <>
                                      <span>•</span>
                                      <span>{displayItem.city}</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {selectedType === 'pubs' && (
                              <Link href={`/pub/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {selectedType === 'beers' && (
                              <Link href={`/beer/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {selectedType === 'breweries' && (
                              <Link href={`/brewery/${item.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredData.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">
                      {searchTerm ? 'Nessun risultato trovato' : `Nessun ${selectedType.slice(0, -1)} disponibile`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
        />
      </main>
    </div>
  );
}