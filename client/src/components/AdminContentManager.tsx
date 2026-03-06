import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Trash2, BeerIcon, Building2, MapPin, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { ImageUpload } from "@/components/image-upload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface AdminContentManagerProps {
  type: 'beers' | 'breweries' | 'pubs';
}

const SEARCH_ENDPOINTS: Record<string, string> = {
  beers: '/api/admin/beers/search',
  breweries: '/api/admin/breweries/search',
  pubs: '/api/admin/pubs/search',
};

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
  "Kölsch", "Altbier", "Rauchbier", "Schwarzbier",
  "Scottish Ale", "Scotch Ale", "Brown Ale", "English Brown Ale",
  "Wheat Beer", "American Wheat", "Fruit Beer", "Spiced Beer", "Honey Beer",
  "Smoked Beer", "Pumpkin Ale", "Italian Grape Ale", "Italian Pilsner",
];

const BEER_COLORS = [
  "dorata", "ambrata", "rame", "marrone", "nera", "bianca", "rubino",
  "paglierina", "oro", "bronzo", "nocciola", "ebano",
];

function BrewerySearchField({ onSelect }: { onSelect: (id: number, name: string) => void }) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
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
        value={selectedName || query}
        onChange={(e) => { setSelectedName(""); setQuery(e.target.value); searchBreweries(e.target.value); }}
        onFocus={() => { if (results.length > 0) setShowResults(true); }}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder="Cerca birrificio per nome..."
        required
        className="mt-1"
      />
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-xl max-h-60 overflow-y-auto">
          {results.map((brewery) => (
            <button
              key={brewery.id}
              type="button"
              onClick={() => { onSelect(brewery.id, brewery.name); setSelectedName(brewery.name); setQuery(""); setShowResults(false); setResults([]); }}
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
}

function BeerForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState("");
  const [breweryId, setBreweryId] = useState<number | null>(null);
  const [style, setStyle] = useState("");
  const [styleSearch, setStyleSearch] = useState("");
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [abv, setAbv] = useState("");
  const [ibu, setIbu] = useState("");
  const [color, setColor] = useState("");
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isAlcoholFree, setIsAlcoholFree] = useState(false);
  const [isBottled, setIsBottled] = useState(false);

  const filteredStyles = useMemo(() => {
    const q = styleSearch.toLowerCase();
    return q ? BEER_STYLES.filter(s => s.toLowerCase().includes(q)) : BEER_STYLES;
  }, [styleSearch]);

  const filteredColors = useMemo(() => {
    return color ? BEER_COLORS.filter(c => c.toLowerCase().includes(color.toLowerCase())) : BEER_COLORS;
  }, [color]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breweryId) { alert("Seleziona un birrificio"); return; }
    const data: any = {
      name,
      breweryId,
      style,
      abv: abv ? parseFloat(abv) : null,
      ibu: ibu ? parseInt(ibu) : null,
      color: color || null,
      description: description || null,
      imageUrl: imageUrl || null,
      logoUrl: logoUrl || null,
      isGlutenFree,
      isAlcoholFree,
      isBottled,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ImageUpload
            label="Immagine Birra"
            description="Foto della birra o etichetta · consigliato 800×600 px"
            currentImageUrl={imageUrl || undefined}
            onImageChange={setImageUrl}
            folder="beers"
            aspectRatio="landscape"
            maxSize={5}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Nome Birra *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="mt-1" placeholder="Es. Golden Ale Artigianale" />
        </div>

        <div className="md:col-span-2">
          <BrewerySearchField onSelect={(id) => setBreweryId(id)} />
        </div>

        <div className="md:col-span-2 relative">
          <Label>Stile *</Label>
          <Input
            value={styleDropdownOpen ? styleSearch : style}
            onChange={e => { setStyleSearch(e.target.value); setStyle(e.target.value); setStyleDropdownOpen(true); }}
            onFocus={() => { setStyleSearch(style); setStyleDropdownOpen(true); }}
            onBlur={() => setTimeout(() => setStyleDropdownOpen(false), 200)}
            required
            className="mt-1"
            placeholder="Cerca o digita stile..."
            autoComplete="off"
          />
          {styleDropdownOpen && filteredStyles.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border rounded-md bg-white dark:bg-gray-800 shadow-lg">
              {filteredStyles.slice(0, 12).map(s => (
                <div key={s} onMouseDown={e => { e.preventDefault(); setStyle(s); setStyleSearch(""); setStyleDropdownOpen(false); }}
                  className="px-3 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer">{s}</div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>ABV % *</Label>
          <Input value={abv} onChange={e => setAbv(e.target.value)} type="number" step="0.1" min="0" max="99" required className="mt-1" placeholder="Es. 5.5" />
        </div>
        <div>
          <Label>IBU</Label>
          <Input value={ibu} onChange={e => setIbu(e.target.value)} type="number" min="0" className="mt-1" placeholder="Es. 40" />
        </div>

        <div className="relative">
          <Label>Colore</Label>
          <Input
            value={color}
            onChange={e => { setColor(e.target.value); setColorDropdownOpen(true); }}
            onFocus={() => setColorDropdownOpen(true)}
            onBlur={() => setTimeout(() => setColorDropdownOpen(false), 200)}
            className="mt-1"
            placeholder="Es. dorata, ambrata..."
            autoComplete="off"
          />
          {colorDropdownOpen && filteredColors.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-36 overflow-y-auto border rounded-md bg-white dark:bg-gray-800 shadow-lg">
              {filteredColors.map(c => (
                <div key={c} onMouseDown={e => { e.preventDefault(); setColor(c); setColorDropdownOpen(false); }}
                  className="px-3 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer capitalize">{c}</div>
              ))}
            </div>
          )}
        </div>

        <div>
          <ImageUpload
            label="Logo / Etichetta"
            description="Logo piccolo o etichetta"
            currentImageUrl={logoUrl || undefined}
            onImageChange={setLogoUrl}
            folder="beers"
            aspectRatio="square"
            maxSize={2}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Descrizione</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Descrivi aromi, gusto, storia della birra..." />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isGlutenFree} onCheckedChange={v => setIsGlutenFree(!!v)} />
            <span className="text-sm font-medium">Senza glutine</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isAlcoholFree} onCheckedChange={v => setIsAlcoholFree(!!v)} />
            <span className="text-sm font-medium">Analcolica</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isBottled} onCheckedChange={v => setIsBottled(!!v)} />
            <span className="text-sm font-medium">Disponibile in bottiglia</span>
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={isPending}>
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Birra</>}
      </Button>
    </form>
  );
}

function BreweryForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("Italia");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      location,
      region,
      country,
      websiteUrl: websiteUrl || null,
      phone: phone || null,
      vatNumber: vatNumber || null,
      description: description || null,
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ImageUpload
            label="Logo Birrificio"
            description="Logo quadrato · 400×400 px consigliato"
            currentImageUrl={logoUrl || undefined}
            onImageChange={setLogoUrl}
            folder="brewery-logos"
            aspectRatio="square"
            maxSize={3}
          />
        </div>
        <div>
          <ImageUpload
            label="Immagine di Copertina"
            description="Banner orizzontale · 1200×400 px"
            currentImageUrl={coverImageUrl || undefined}
            onImageChange={setCoverImageUrl}
            folder="brewery-covers"
            aspectRatio="landscape"
            maxSize={8}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Nome Birrificio *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="mt-1" placeholder="Es. Birrificio Artigianale Roma" />
        </div>

        <div className="md:col-span-2">
          <Label>Località *</Label>
          <AddressAutocomplete
            value={location}
            onAddressSelect={(details) => {
              setLocation(details.formattedAddress || details.city || "");
              if (details.region) setRegion(details.region);
              if (details.country) setCountry(details.country);
            }}
            placeholder="Cerca città o indirizzo..."
            countryRestriction={null}
          />
          <p className="text-xs text-gray-400 mt-1">Seleziona dall'elenco o compila manualmente Regione e Paese qui sotto</p>
        </div>

        <div>
          <Label>Regione</Label>
          <Input value={region} onChange={e => setRegion(e.target.value)} className="mt-1" placeholder="Es. Lazio" />
        </div>
        <div>
          <Label>Paese</Label>
          <Input value={country} onChange={e => setCountry(e.target.value)} className="mt-1" placeholder="Es. Italia" />
        </div>

        <div>
          <Label>Sito Web</Label>
          <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" className="mt-1" placeholder="https://birrificio.it" />
        </div>
        <div>
          <Label>Telefono</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" placeholder="+39 06 1234567" />
        </div>

        <div className="md:col-span-2">
          <Label>Partita IVA</Label>
          <Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="mt-1" placeholder="IT12345678901" />
        </div>

        <div className="md:col-span-2">
          <Label>Descrizione</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Storia, filosofia e caratteristiche del birrificio..." />
        </div>
      </div>

      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={isPending}>
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Birrificio</>}
      </Button>
    </form>
  );
}

function PubForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      address,
      city,
      region,
      postalCode: postalCode || null,
      phone: phone || null,
      email: email || null,
      websiteUrl: websiteUrl || null,
      description: description || null,
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      tiktokUrl: tiktokUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ImageUpload
            label="Logo / Avatar"
            description="Logo quadrato · 400×400 px"
            currentImageUrl={logoUrl || undefined}
            onImageChange={setLogoUrl}
            folder="pub-logos"
            aspectRatio="square"
            maxSize={3}
          />
        </div>
        <div>
          <ImageUpload
            label="Immagine di Copertina"
            description="Banner orizzontale · 1200×630 px"
            currentImageUrl={coverImageUrl || undefined}
            onImageChange={setCoverImageUrl}
            folder="pub-covers"
            aspectRatio="landscape"
            maxSize={8}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Nome Pub *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="mt-1" placeholder="Es. The Craft Beer Palace" />
        </div>

        <div className="md:col-span-2">
          <Label>Indirizzo *</Label>
          <AddressAutocomplete
            value={address}
            onAddressSelect={(details) => {
              setAddress(details.formattedAddress || "");
              if (details.city) setCity(details.city);
              if (details.region) setRegion(details.region);
              if (details.postalCode) setPostalCode(details.postalCode);
            }}
            placeholder="Cerca indirizzo..."
            countryRestriction={null}
          />
          <p className="text-xs text-gray-400 mt-1">Seleziona dall'elenco — Città, Regione e CAP si compilano automaticamente</p>
        </div>

        <div>
          <Label>Città *</Label>
          <Input value={city} onChange={e => setCity(e.target.value)} required className="mt-1" placeholder="Es. Roma" />
        </div>
        <div>
          <Label>Regione</Label>
          <Input value={region} onChange={e => setRegion(e.target.value)} className="mt-1" placeholder="Es. Lazio" />
        </div>

        <div>
          <Label>CAP</Label>
          <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="mt-1" placeholder="00100" />
        </div>
        <div>
          <Label>Telefono</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" placeholder="+39 06 1234567" />
        </div>

        <div>
          <Label>Email</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1" placeholder="info@pub.it" />
        </div>
        <div>
          <Label>Sito Web</Label>
          <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" className="mt-1" placeholder="https://pub.it" />
        </div>

        <div className="md:col-span-2">
          <Label>Descrizione</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Descrivi l'atmosfera, specialità, storia del locale..." />
        </div>

        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Social Media (opzionali)</p>
          <div className="grid grid-cols-1 gap-2">
            <Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="Instagram: https://instagram.com/ilpub" className="text-sm" />
            <Input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder="Facebook: https://facebook.com/ilpub" className="text-sm" />
            <Input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)} placeholder="TikTok: https://tiktok.com/@ilpub" className="text-sm" />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isPending}>
        {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creazione...</> : <><Plus className="w-4 h-4 mr-2" />Crea Pub</>}
      </Button>
    </form>
  );
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
      return await apiRequest(`/api/admin/${type}/${id}`, { method: "DELETE" });
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {type === 'beers' ? 'Aggiungi Nuova Birra' : type === 'breweries' ? 'Aggiungi Nuovo Birrificio' : 'Aggiungi Nuovo Pub'}
            </DialogTitle>
          </DialogHeader>
          {type === 'beers' && (
            <BeerForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />
          )}
          {type === 'breweries' && (
            <BreweryForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />
          )}
          {type === 'pubs' && (
            <PubForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />
          )}
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
