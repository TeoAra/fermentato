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
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { 
  Beer, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  DollarSign,
  Loader2,
  ArrowLeft,
  Factory,
  ChevronRight,
  ImagePlus,
  X
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

  const [creatingBeer, setCreatingBeer] = useState(false);
  const [creatingBrewery, setCreatingBrewery] = useState(false);
  const [brewerySearchTerm, setBrewerySearchTerm] = useState("");
  const debouncedBrewerySearch = useDebounce(brewerySearchTerm, 300);
  const [styleSearchTerm, setStyleSearchTerm] = useState("");
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [beerImageFile, setBeerImageFile] = useState<File | null>(null);
  const [beerImagePreview, setBeerImagePreview] = useState<string>("");
  const [uploadingBeerImage, setUploadingBeerImage] = useState(false);
  const [newBeerData, setNewBeerData] = useState({
    name: "",
    style: "",
    abv: "",
    ibu: "",
    description: "",
    breweryId: "",
    breweryName: "",
    imageUrl: "",
  });
  const [newBreweryData, setNewBreweryData] = useState({
    name: "",
    location: "",
    region: "",
    description: "",
    logoUrl: "",
    coverImageUrl: "",
  });
  const [breweryLogoFile, setBreweryLogoFile] = useState<File | null>(null);
  const [breweryLogoPreview, setBreweryLogoPreview] = useState("");
  const [breweryCoverFile, setBreweryCoverFile] = useState<File | null>(null);
  const [breweryCoverPreview, setBreweryCoverPreview] = useState("");
  const [uploadingBreweryImages, setUploadingBreweryImages] = useState(false);

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

  const { data: breweryResults } = useQuery({
    queryKey: ["/api/owner/breweries/search", debouncedBrewerySearch],
    queryFn: async () => {
      if (debouncedBrewerySearch.length < 2) return [];
      const res = await fetch(`/api/owner/breweries/search?q=${encodeURIComponent(debouncedBrewerySearch)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: creatingBeer && debouncedBrewerySearch.length >= 2,
  });

  const uploadFileToCloudinary = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch {
      return null;
    }
  };

  const createBreweryMutation = useMutation({
    mutationFn: async (data: { name: string; location: string; region: string; description: string }) => {
      setUploadingBreweryImages(true);
      try {
        let logoUrl: string | null = null;
        let coverImageUrl: string | null = null;
        if (breweryLogoFile) logoUrl = await uploadFileToCloudinary(breweryLogoFile, "brewery-logos");
        if (breweryCoverFile) coverImageUrl = await uploadFileToCloudinary(breweryCoverFile, "brewery-covers");
        const region = data.region || data.location;
        return apiRequest("/api/owner/breweries", { method: "POST" }, { ...data, region, logoUrl, coverImageUrl });
      } finally {
        setUploadingBreweryImages(false);
      }
    },
    onSuccess: (brewery: any) => {
      toast({ title: "Birrificio creato!" });
      setNewBeerData(prev => ({ ...prev, breweryId: brewery.id.toString(), breweryName: brewery.name }));
      setCreatingBrewery(false);
      setBrewerySearchTerm("");
      setNewBreweryData({ name: "", location: "", region: "", description: "", logoUrl: "", coverImageUrl: "" });
      setBreweryLogoFile(null);
      setBreweryLogoPreview("");
      setBreweryCoverFile(null);
      setBreweryCoverPreview("");
    },
    onError: () => {
      toast({ title: "Errore", description: "Non è stato possibile creare il birrificio", variant: "destructive" });
    },
  });

  const createBeerMutation = useMutation({
    mutationFn: async (data: { name: string; breweryId: string; style: string; abv?: string; ibu?: string; description?: string; imageUrl?: string }) => {
      let imageUrl = data.imageUrl;
      if (beerImageFile) {
        const uploaded = await uploadBeerImage();
        if (uploaded) imageUrl = uploaded;
      }
      return apiRequest("/api/owner/beers", { method: "POST" }, { ...data, imageUrl });
    },
    onSuccess: (beer: any) => {
      toast({ title: "Birra creata!" });
      setFormData(prev => ({ ...prev, beerId: beer.id.toString() }));
      setCreatingBeer(false);
      setBeerImageFile(null);
      setBeerImagePreview("");
      setStyleSearchTerm("");
      setStyleDropdownOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Non è stato possibile creare la birra", variant: "destructive" });
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

  const BEER_STYLES = [
    "IPA", "APA", "NEIPA", "Double IPA", "Triple IPA", "Session IPA", "West Coast IPA",
    "Lager", "Pilsner", "Helles", "Märzen", "Bock", "Doppelbock", "Dunkel",
    "Weiss", "Hefeweizen", "Weizenbock", "Kristallweizen",
    "Stout", "Imperial Stout", "Milk Stout", "Oatmeal Stout", "Dry Stout",
    "Porter", "Baltic Porter", "Robust Porter",
    "Saison", "Farmhouse Ale", "Grisette",
    "Belgian Ale", "Blanche", "Witbier", "Dubbel", "Tripel", "Quadrupel", "Belgian Strong",
    "Pale Ale", "Amber Ale", "Red Ale", "Golden Ale", "Blonde Ale", "Cream Ale",
    "Bitter", "ESB", "Mild",
    "Barley Wine", "English Barley Wine",
    "Sour", "Gose", "Berliner Weisse", "Lambic", "Gueuze", "Flanders Red", "Kriek",
    "Kölsch", "Altbier",
    "Rauchbier", "Schwarzbier",
    "Scottish Ale", "Scotch Ale",
    "Brown Ale", "English Brown Ale",
    "Wheat Beer", "American Wheat",
    "Fruit Beer", "Spiced Beer", "Honey Beer",
    "Smoked Beer", "Pumpkin Ale",
    "Italian Grape Ale", "Italian Pilsner",
  ];

  const filteredStyles = useMemo(() => {
    if (!styleSearchTerm) return BEER_STYLES;
    return BEER_STYLES.filter(s => s.toLowerCase().includes(styleSearchTerm.toLowerCase()));
  }, [styleSearchTerm]);

  const handleBeerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeerImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setBeerImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadBeerImage = async (): Promise<string | null> => {
    if (!beerImageFile) return null;
    setUploadingBeerImage(true);
    try {
      const formData = new FormData();
      formData.append("image", beerImageFile);
      formData.append("folder", "beer-images");
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch {
      toast({ title: "Errore upload immagine", variant: "destructive" });
      return null;
    } finally {
      setUploadingBeerImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      beerId: "",
      prices: [],
      tapNumber: "",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
    setCreatingBeer(false);
    setCreatingBrewery(false);
    setBrewerySearchTerm("");
    setNewBeerData({ name: "", style: "", abv: "", ibu: "", description: "", breweryId: "", breweryName: "", imageUrl: "" });
    setNewBreweryData({ name: "", location: "", region: "", description: "", logoUrl: "", coverImageUrl: "" });
    setBreweryLogoFile(null);
    setBreweryLogoPreview("");
    setBreweryCoverFile(null);
    setBreweryCoverPreview("");
    setStyleSearchTerm("");
    setStyleDropdownOpen(false);
    setBeerImageFile(null);
    setBeerImagePreview("");
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
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                        {debouncedSearchTerm.length >= 2 && !isSearching && !formData.beerId && !creatingBeer && (
                          <>
                            {searchResults?.beers && searchResults.beers.length > 0 && (
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
                            <div className="p-3 border border-dashed rounded-lg text-center text-gray-500">
                              {searchResults?.beers?.length === 0 && (
                                <p className="mb-2 text-sm">Nessuna birra trovata per "{debouncedSearchTerm}"</p>
                              )}
                              {searchResults?.beers && searchResults.beers.length > 0 && (
                                <p className="mb-2 text-sm">Non trovi quella che cerchi?</p>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCreatingBeer(true);
                                  setNewBeerData(prev => ({ ...prev, name: debouncedSearchTerm }));
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Crea nuova birra
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {creatingBeer && !creatingBrewery && (
                      <div className="border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCreatingBeer(false)}>
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <h4 className="font-semibold text-sm">Crea nuova birra</h4>
                        </div>

                        <div>
                          <Label className="text-xs">Nome birra *</Label>
                          <Input
                            value={newBeerData.name}
                            onChange={(e) => setNewBeerData({ ...newBeerData, name: e.target.value })}
                            placeholder="Es: IPA del Birrificio"
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Birrificio *</Label>
                          {newBeerData.breweryId ? (
                            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Factory className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{newBeerData.breweryName}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setNewBeerData({ ...newBeerData, breweryId: "", breweryName: "" })}>
                                Cambia
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                  value={brewerySearchTerm}
                                  onChange={(e) => setBrewerySearchTerm(e.target.value)}
                                  placeholder="Cerca birrificio..."
                                  className="h-9 pl-8 text-sm"
                                />
                              </div>
                              {Array.isArray(breweryResults) && breweryResults.length > 0 && (
                                <div className="max-h-32 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900">
                                  {breweryResults.map((b: any) => (
                                    <div
                                      key={b.id}
                                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0 text-sm"
                                      onClick={() => {
                                        setNewBeerData({ ...newBeerData, breweryId: b.id.toString(), breweryName: b.name });
                                        setBrewerySearchTerm("");
                                      }}
                                    >
                                      <span className="font-medium">{b.name}</span>
                                      <span className="text-gray-500 ml-1">• {b.location}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {debouncedBrewerySearch.length >= 2 && Array.isArray(breweryResults) && breweryResults.length === 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => {
                                    setCreatingBrewery(true);
                                    setNewBreweryData(prev => ({ ...prev, name: brewerySearchTerm }));
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Crea "{brewerySearchTerm}"
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Label className="text-xs">Stile *</Label>
                            <Input
                              value={styleDropdownOpen ? styleSearchTerm : newBeerData.style}
                              onChange={(e) => {
                                setStyleSearchTerm(e.target.value);
                                setNewBeerData({ ...newBeerData, style: e.target.value });
                                setStyleDropdownOpen(true);
                              }}
                              onFocus={() => {
                                setStyleSearchTerm(newBeerData.style);
                                setStyleDropdownOpen(true);
                              }}
                              onBlur={() => setTimeout(() => setStyleDropdownOpen(false), 200)}
                              placeholder="Cerca stile..."
                              className="h-9"
                              autoComplete="off"
                            />
                            {styleDropdownOpen && filteredStyles.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border rounded-lg bg-white dark:bg-gray-900 shadow-lg">
                                {filteredStyles.slice(0, 15).map((style) => (
                                  <div
                                    key={style}
                                    className="px-3 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setNewBeerData({ ...newBeerData, style });
                                      setStyleSearchTerm(style);
                                      setStyleDropdownOpen(false);
                                    }}
                                  >
                                    {style}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">ABV %</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="30"
                              value={newBeerData.abv}
                              onChange={(e) => setNewBeerData({ ...newBeerData, abv: e.target.value })}
                              placeholder="5.5"
                              className="h-9"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Descrizione</Label>
                          <Textarea
                            value={newBeerData.description}
                            onChange={(e) => setNewBeerData({ ...newBeerData, description: e.target.value })}
                            placeholder="Note sulla birra, aromi, sapore..."
                            className="min-h-[60px] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Immagine birra</Label>
                          {beerImagePreview ? (
                            <div className="relative w-20 h-20 mt-1">
                              <img src={beerImagePreview} alt="Anteprima" className="w-20 h-20 object-cover rounded-lg border" />
                              <button
                                type="button"
                                onClick={() => { setBeerImageFile(null); setBeerImagePreview(""); }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <ImagePlus className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500">Carica immagine</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleBeerImageChange} />
                            </label>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => setCreatingBeer(false)}>
                            Annulla
                          </Button>
                          <Button
                            size="sm"
                            disabled={!newBeerData.name || !newBeerData.breweryId || !newBeerData.style || createBeerMutation.isPending || uploadingBeerImage}
                            onClick={() => createBeerMutation.mutate(newBeerData)}
                          >
                            {(createBeerMutation.isPending || uploadingBeerImage) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                            {uploadingBeerImage ? "Caricamento immagine..." : "Crea birra"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {creatingBrewery && (
                      <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCreatingBrewery(false)}>
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <h4 className="font-semibold text-sm">Crea nuovo birrificio</h4>
                        </div>

                        <div>
                          <Label className="text-xs">Nome birrificio *</Label>
                          <Input
                            value={newBreweryData.name}
                            onChange={(e) => setNewBreweryData({ ...newBreweryData, name: e.target.value })}
                            placeholder="Es: Birrificio Artigianale XYZ"
                            className="h-9"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Località *</Label>
                          <AddressAutocomplete
                            value={newBreweryData.location}
                            onAddressSelect={(details) => {
                              setNewBreweryData({
                                ...newBreweryData,
                                location: details.city || details.formattedAddress,
                                region: details.region,
                              });
                            }}
                            placeholder="Cerca località..."
                            className="[&_input]:h-9 [&_input]:text-sm"
                            countryRestriction={null}
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Descrizione</Label>
                          <Textarea
                            value={newBreweryData.description}
                            onChange={(e) => setNewBreweryData({ ...newBreweryData, description: e.target.value })}
                            placeholder="Breve descrizione del birrificio..."
                            className="min-h-[50px] text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Logo</Label>
                            {breweryLogoPreview ? (
                              <div className="relative w-16 h-16 mt-1">
                                <img src={breweryLogoPreview} alt="Logo" className="w-16 h-16 object-cover rounded-lg border" />
                                <button
                                  type="button"
                                  onClick={() => { setBreweryLogoFile(null); setBreweryLogoPreview(""); }}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <ImagePlus className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">Carica logo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setBreweryLogoFile(f);
                                    const r = new FileReader();
                                    r.onload = (ev) => setBreweryLogoPreview(ev.target?.result as string);
                                    r.readAsDataURL(f);
                                  }
                                }} />
                              </label>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Copertina</Label>
                            {breweryCoverPreview ? (
                              <div className="relative w-full h-16 mt-1">
                                <img src={breweryCoverPreview} alt="Cover" className="w-full h-16 object-cover rounded-lg border" />
                                <button
                                  type="button"
                                  onClick={() => { setBreweryCoverFile(null); setBreweryCoverPreview(""); }}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <ImagePlus className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">Carica copertina</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setBreweryCoverFile(f);
                                    const r = new FileReader();
                                    r.onload = (ev) => setBreweryCoverPreview(ev.target?.result as string);
                                    r.readAsDataURL(f);
                                  }
                                }} />
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button variant="outline" size="sm" onClick={() => setCreatingBrewery(false)}>
                            Annulla
                          </Button>
                          <Button
                            size="sm"
                            disabled={!newBreweryData.name || !newBreweryData.location || createBreweryMutation.isPending || uploadingBreweryImages}
                            onClick={() => createBreweryMutation.mutate(newBreweryData)}
                          >
                            {(createBreweryMutation.isPending || uploadingBreweryImages) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Factory className="h-4 w-4 mr-1" />}
                            {uploadingBreweryImages ? "Caricamento..." : "Crea birrificio"}
                          </Button>
                        </div>
                      </div>
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