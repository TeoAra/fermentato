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
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Trash2, BeerIcon, Building2, MapPin, ExternalLink, Loader2, CheckSquare, Square, Edit2, RefreshCw, X, GitMerge, Wand2, Replace, Tag, Palette, Globe, LayoutGrid, AlignLeft, ChevronRight } from "lucide-react";
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
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchBreweries = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      try {
        const res = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include', signal: abortRef.current.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setResults([]);
      }
    }, 250);
  }, []);

  return (
    <div className="relative">
      <Label htmlFor="brewerySearch">Birrificio *</Label>
      <Input
        id="brewerySearch"
        value={selectedName || query}
        onChange={(e) => { setSelectedName(""); setQuery(e.target.value); searchBreweries(e.target.value); }}
        onFocus={() => { if (results.length > 0 && !selectedName) setShowResults(true); }}
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

function CollabBrewerySelector({ selected, onChange, excludeBreweryId }: { selected: { id: number; name: string }[]; onChange: (breweries: { id: number; name: string }[]) => void; excludeBreweryId?: number | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setResults(Array.isArray(data) ? data.filter((b: any) => b.id !== excludeBreweryId && !selected.some(s => s.id === b.id)) : []);
        setShowResults(true);
      } catch { setResults([]); }
    }, 250);
  }, [excludeBreweryId, selected]);

  const add = (b: { id: number; name: string }) => {
    onChange([...selected, { id: b.id, name: b.name }]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const remove = (id: number) => onChange(selected.filter(s => s.id !== id));

  return (
    <div className="space-y-2">
      <Label>Birrifici in Collaborazione</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(b => (
            <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              <Building2 className="w-3 h-3" />
              {b.name}
              <button type="button" onClick={() => remove(b.id)} className="ml-0.5 text-purple-500 hover:text-purple-800 dark:hover:text-purple-100">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Cerca birrificio partner..."
          className="mt-1"
          autoComplete="off"
        />
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-xl max-h-48 overflow-y-auto">
            {results.map((b) => (
              <button key={b.id} type="button" onMouseDown={e => { e.preventDefault(); add(b); }}
                className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b last:border-b-0 flex items-center gap-2 text-sm">
                {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" /> : <Building2 className="w-4 h-4 text-purple-400" />}
                <span>{b.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{b.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">La birra apparirà automaticamente anche nelle pagine dei birrifici partner.</p>
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
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isAlcoholFree, setIsAlcoholFree] = useState(false);
  const [isCollaboration, setIsCollaboration] = useState(false);
  const [collabBreweries, setCollabBreweries] = useState<{ id: number; name: string }[]>([]);

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
    if (isCollaboration && collabBreweries.length === 0) { alert("Aggiungi almeno un birrificio partner per la collaborazione"); return; }
    onSubmit({
      name, breweryId, style,
      abv: abv ? parseFloat(abv) : null,
      ibu: ibu ? parseInt(ibu) : null,
      color: color || null,
      description: description || null,
      imageUrl: imageUrl || null,
      isGlutenFree, isAlcoholFree,
      isCollaboration,
      collaborationBreweryIds: isCollaboration ? collabBreweries.map(b => b.id) : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ImageUpload label="Immagine Birra" description="Foto della birra · consigliato 800×600 px" currentImageUrl={imageUrl || undefined} onImageChange={setImageUrl} folder="beers" aspectRatio="landscape" maxSize={5} />
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
          <Input value={styleDropdownOpen ? styleSearch : style} onChange={e => { setStyleSearch(e.target.value); setStyle(e.target.value); setStyleDropdownOpen(true); }} onFocus={() => { setStyleSearch(style); setStyleDropdownOpen(true); }} onBlur={() => setTimeout(() => setStyleDropdownOpen(false), 200)} required className="mt-1" placeholder="Cerca o digita stile..." autoComplete="off" />
          {styleDropdownOpen && filteredStyles.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border rounded-md bg-white dark:bg-gray-800 shadow-lg">
              {filteredStyles.slice(0, 12).map(s => (
                <div key={s} onMouseDown={e => { e.preventDefault(); setStyle(s); setStyleSearch(""); setStyleDropdownOpen(false); }} className="px-3 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer">{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={isGlutenFree} onCheckedChange={v => setIsGlutenFree(!!v)} /><span className="text-sm font-medium">Senza glutine</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={isAlcoholFree} onCheckedChange={v => setIsAlcoholFree(!!v)} /><span className="text-sm font-medium">Analcolica</span></label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={isCollaboration} onCheckedChange={v => { setIsCollaboration(!!v); if (!v) setCollabBreweries([]); }} />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Birra in Collaborazione</span>
          </label>
        </div>
        {isCollaboration && (
          <div className="md:col-span-2">
            <CollabBrewerySelector selected={collabBreweries} onChange={setCollabBreweries} excludeBreweryId={breweryId} />
          </div>
        )}
        <div>
          <Label>ABV % *</Label>
          <Input value={abv} onChange={e => setAbv(e.target.value)} type="number" step="0.1" min="0" max="99" required className="mt-1" placeholder="Es. 5.5" />
        </div>
        <div>
          <Label>IBU</Label>
          <Input value={ibu} onChange={e => setIbu(e.target.value)} type="number" min="0" className="mt-1" placeholder="Es. 40" />
        </div>
        <div className="md:col-span-2 relative">
          <Label>Colore</Label>
          <Input value={color} onChange={e => { setColor(e.target.value); setColorDropdownOpen(true); }} onFocus={() => setColorDropdownOpen(true)} onBlur={() => setTimeout(() => setColorDropdownOpen(false), 200)} className="mt-1" placeholder="Es. dorata, ambrata..." autoComplete="off" />
          {colorDropdownOpen && filteredColors.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-36 overflow-y-auto border rounded-md bg-white dark:bg-gray-800 shadow-lg">
              {filteredColors.map(c => (
                <div key={c} onMouseDown={e => { e.preventDefault(); setColor(c); setColorDropdownOpen(false); }} className="px-3 py-1.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer capitalize">{c}</div>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <Label>Descrizione</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Descrivi aromi, gusto, storia della birra..." />
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
    onSubmit({ name, location, region, country, websiteUrl: websiteUrl || null, phone: phone || null, vatNumber: vatNumber || null, description: description || null, logoUrl: logoUrl || null, coverImageUrl: coverImageUrl || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><ImageUpload label="Logo Birrificio" description="Logo quadrato · 400×400 px" currentImageUrl={logoUrl || undefined} onImageChange={setLogoUrl} folder="brewery-logos" aspectRatio="square" maxSize={3} /></div>
        <div><ImageUpload label="Immagine di Copertina" description="Banner · 1200×400 px" currentImageUrl={coverImageUrl || undefined} onImageChange={setCoverImageUrl} folder="brewery-covers" aspectRatio="landscape" maxSize={8} /></div>
        <div className="md:col-span-2"><Label>Nome Birrificio *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="mt-1" placeholder="Es. Birrificio Artigianale Roma" /></div>
        <div className="md:col-span-2">
          <Label>Località *</Label>
          <AddressAutocomplete value={location} onAddressSelect={(d) => { setLocation(d.formattedAddress || d.city || ""); if (d.region) setRegion(d.region); if (d.country) setCountry(d.country); }} placeholder="Cerca città o indirizzo..." countryRestriction={null} />
          <p className="text-xs text-gray-400 mt-1">Seleziona dall'elenco o compila manualmente Regione e Paese</p>
        </div>
        <div><Label>Regione</Label><Input value={region} onChange={e => setRegion(e.target.value)} className="mt-1" placeholder="Es. Lazio" /></div>
        <div><Label>Paese</Label><Input value={country} onChange={e => setCountry(e.target.value)} className="mt-1" placeholder="Es. Italia" /></div>
        <div><Label>Sito Web</Label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" className="mt-1" placeholder="https://birrificio.it" /></div>
        <div><Label>Telefono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" placeholder="+39 06 1234567" /></div>
        <div className="md:col-span-2"><Label>Partita IVA</Label><Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="mt-1" placeholder="IT12345678901" /></div>
        <div className="md:col-span-2"><Label>Descrizione</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Storia, filosofia e caratteristiche del birrificio..." /></div>
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
  const [vatNumber, setVatNumber] = useState("");
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
    onSubmit({ name, address, city, region, postalCode: postalCode || null, vatNumber: vatNumber || null, phone: phone || null, email: email || null, websiteUrl: websiteUrl || null, description: description || null, logoUrl: logoUrl || null, coverImageUrl: coverImageUrl || null, facebookUrl: facebookUrl || null, instagramUrl: instagramUrl || null, tiktokUrl: tiktokUrl || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><ImageUpload label="Logo / Avatar" description="Logo quadrato · 400×400 px" currentImageUrl={logoUrl || undefined} onImageChange={setLogoUrl} folder="pub-logos" aspectRatio="square" maxSize={3} /></div>
        <div><ImageUpload label="Immagine di Copertina" description="Banner · 1200×630 px" currentImageUrl={coverImageUrl || undefined} onImageChange={setCoverImageUrl} folder="pub-covers" aspectRatio="landscape" maxSize={8} /></div>
        <div className="md:col-span-2"><Label>Nome Pub *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="mt-1" placeholder="Es. The Craft Beer Palace" /></div>
        <div className="md:col-span-2">
          <Label>Indirizzo *</Label>
          <AddressAutocomplete value={address} onAddressSelect={(d) => { setAddress(d.formattedAddress || ""); if (d.city) setCity(d.city); if (d.region) setRegion(d.region); if (d.postalCode) setPostalCode(d.postalCode); }} placeholder="Cerca indirizzo..." countryRestriction={null} />
          <p className="text-xs text-gray-400 mt-1">Città, Regione e CAP si compilano automaticamente</p>
        </div>
        <div><Label>Città *</Label><Input value={city} onChange={e => setCity(e.target.value)} required className="mt-1" placeholder="Es. Roma" /></div>
        <div><Label>Regione</Label><Input value={region} onChange={e => setRegion(e.target.value)} className="mt-1" placeholder="Es. Lazio" /></div>
        <div><Label>CAP</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="mt-1" placeholder="00100" /></div>
        <div><Label>P.IVA</Label><Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="mt-1" placeholder="IT12345678901" /></div>
        <div><Label>Telefono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" placeholder="+39 06 1234567" /></div>
        <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1" placeholder="info@pub.it" /></div>
        <div><Label>Sito Web</Label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} type="url" className="mt-1" placeholder="https://pub.it" /></div>
        <div className="md:col-span-2"><Label>Descrizione</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} placeholder="Descrivi atmosfera, specialità, storia del locale..." /></div>
        <div className="md:col-span-2">
          <p className="text-sm font-semibold mb-2">Social Media</p>
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

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [massFields, setMassFields] = useState<Record<string, string>>({});
  const [massDeleteOpen, setMassDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [keepId, setKeepId] = useState<number | null>(null);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(searchResults.map(r => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`${SEARCH_ENDPOINTS[type]}?q=${encodeURIComponent(query)}&limit=50`, { credentials: 'include' });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Errore ricerca", variant: "destructive" });
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
    mutationFn: async (id: number) => apiRequest(`/api/admin/${type}/${id}`, { method: "DELETE" }),
    onSuccess: (data: any) => {
      toast({ title: "Eliminato", description: data?.message || "Elemento eliminato" });
      setSearchResults(prev => prev.filter(item => item.id !== deleteTarget?.id));
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      if (type === "pubs") {
        queryClient.invalidateQueries({ queryKey: ["/api/pubs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pubs/nearby"] });
      }
      if (type === "breweries") {
        queryClient.invalidateQueries({ queryKey: ["/api/breweries"] });
      }
    },
    onError: (err: any) => { toast({ title: "Errore", description: err?.message || "Impossibile eliminare", variant: "destructive" }); setDeleteTarget(null); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest(`/api/admin/${type}`, { method: "POST" }, data),
    onSuccess: () => {
      toast({ title: "Creato con successo" });
      setCreateDialogOpen(false);
      if (searchQuery) runSearch(searchQuery);
    },
    onError: () => toast({ title: "Errore creazione", variant: "destructive" }),
  });

  const massEditMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: number[]; updates: Record<string, any> }) =>
      apiRequest(`/api/admin/${type}/mass-update`, { method: "PATCH" }, { ids, updates }),
    onSuccess: (data: any) => {
      toast({ title: "Aggiornati", description: `${data?.updated ?? selectedIds.size} record aggiornati` });
      setMassFields({});
      clearSelection();
      if (searchQuery) runSearch(searchQuery);
    },
    onError: () => toast({ title: "Errore", description: "Impossibile aggiornare i record", variant: "destructive" }),
  });

  const massDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest(`/api/admin/${type}/${id}`, { method: "DELETE" })));
      return ids;
    },
    onSuccess: (ids: number[]) => {
      toast({ title: "Eliminati", description: `${ids.length} record eliminati` });
      setMassDeleteOpen(false);
      setSearchResults(prev => prev.filter(r => !ids.includes(r.id)));
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      if (type === "pubs") {
        queryClient.invalidateQueries({ queryKey: ["/api/pubs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pubs/nearby"] });
      }
      if (type === "breweries") {
        queryClient.invalidateQueries({ queryKey: ["/api/breweries"] });
      }
    },
    onError: () => toast({ title: "Errore eliminazione", variant: "destructive" }),
  });

  const syncBeerNamesMutation = useMutation({
    mutationFn: async (breweryId: number) => apiRequest(`/api/admin/breweries/${breweryId}/sync-beer-names`, { method: "POST" }),
    onSuccess: (data: any) => toast({ title: "Nomi sincronizzati", description: `${data?.updated ?? 0} birre aggiornate` }),
    onError: () => toast({ title: "Errore sync", variant: "destructive" }),
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, mergeId }: { keepId: number; mergeId: number }) =>
      apiRequest('/api/admin/breweries/merge', { method: "POST" }, { keepId, mergeId }),
    onSuccess: (data: any) => {
      toast({ title: "Merge completato", description: `"${data?.keepName}" ora ha ${data?.beersMoved} birre` });
      setMergeOpen(false); setKeepId(null); clearSelection();
      if (searchQuery) runSearch(searchQuery);
    },
    onError: () => toast({ title: "Errore merge", variant: "destructive" }),
  });

  const applyMassEdit = () => {
    if (selectedIds.size === 0) { toast({ title: "Nessun elemento selezionato", description: "Seleziona almeno un elemento dalla lista", variant: "destructive" }); return; }
    const { nameFindText, nameFindReplaceWith, nameStripPrefix, ...rest } = massFields;
    const updates: Record<string, any> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "" && v !== undefined));
    if (nameStripPrefix?.trim()) updates.nameStripPrefix = nameStripPrefix;
    if (nameFindText?.trim()) updates.nameFindReplace = { find: nameFindText, replace: nameFindReplaceWith ?? "" };
    if (Object.keys(updates).length === 0) { toast({ title: "Nessun campo da aggiornare", description: "Compila almeno un campo prima di applicare", variant: "destructive" }); return; }
    massEditMutation.mutate({ ids: [...selectedIds], updates });
  };

  const hasMassFields = Object.values(massFields).some(v => v !== "" && v !== undefined);

  const getItemLink = (item: any) => {
    if (type === 'beers') return `/beer/${item.id}`;
    if (type === 'breweries') return `/brewery/${item.id}`;
    return `/pub/${item.id}`;
  };

  const typeLabel = type === 'beers' ? 'Birre' : type === 'breweries' ? 'Birrifici' : 'Pub';
  const singularLabel = type === 'beers' ? 'Birra' : type === 'breweries' ? 'Birrificio' : 'Pub';
  const accentColor = type === 'pubs' ? 'blue' : 'amber';
  const selCount = selectedIds.size;

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── LEFT: List ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {type === 'beers' ? <BeerIcon className="w-5 h-5 text-amber-500" /> : type === 'breweries' ? <Building2 className="w-5 h-5 text-amber-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
                Gestione {typeLabel}
                {searchResults.length > 0 && <Badge variant="secondary">{searchResults.length} trovati</Badge>}
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
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={type === 'beers' ? 'Cerca per nome birra o birrificio...' : type === 'breweries' ? 'Cerca per nome o paese...' : 'Cerca per nome, città o indirizzo...'}
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-10 pr-10"
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>

            {/* Select all bar */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-3 px-1 py-1 text-sm text-gray-500">
                <button type="button" onClick={selectedIds.size === searchResults.length ? clearSelection : selectAll} className="flex items-center gap-1.5 hover:text-amber-600 transition-colors font-medium">
                  {selectedIds.size === searchResults.length && searchResults.length > 0
                    ? <CheckSquare className="w-4 h-4 text-amber-500" />
                    : <Square className="w-4 h-4" />}
                  {selCount > 0 ? `${selCount} selezionati` : "Seleziona tutti"}
                </button>
                {selCount > 0 && (
                  <button type="button" onClick={clearSelection} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" /> Deseleziona
                  </button>
                )}
              </div>
            )}

            {/* Results list */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 p-2.5 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${selectedIds.has(item.id) ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => toggleSelect(item.id)}>
                      <Checkbox checked={selectedIds.has(item.id)} className="w-4 h-4" />
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => toggleSelect(item.id)}>
                      {(item.imageUrl || item.logoUrl) ? (
                        <img src={item.imageUrl || item.logoUrl} alt={item.name} className={`w-10 h-10 object-cover border shadow-sm ${type === 'breweries' ? 'rounded-full' : 'rounded-lg'}`} />
                      ) : (
                        <div className={`w-10 h-10 ${type === 'breweries' ? 'rounded-full' : 'rounded-lg'} ${type === 'pubs' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-amber-100 dark:bg-amber-900/40'} flex items-center justify-center border`}>
                          {type === 'beers' ? <BeerIcon className="w-5 h-5 text-amber-500" /> : type === 'breweries' ? <Building2 className="w-5 h-5 text-amber-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleSelect(item.id)}>
                      <div className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                        {item.name}
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">#{item.id}</span>
                      </div>
                      {type === 'beers' && (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {item.brewery && (
                            <div className="flex items-center gap-1">
                              {item.brewery.logoUrl && <img src={item.brewery.logoUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{item.brewery.name}</span>
                            </div>
                          )}
                          {item.style && <Badge variant="outline" className="text-xs py-0 h-4">{item.style}</Badge>}
                          {item.abv != null && <Badge variant="secondary" className="text-xs py-0 h-4 bg-stone-100 dark:bg-orange-900/40 text-orange-700">{item.abv}%</Badge>}
                          {item.isGlutenFree && <GlutenFreeSmallBadge size={12} />}
                          {item.isAlcoholFree && <AlcoholFreeBadge size={11} />}
                        </div>
                      )}
                      {type === 'breweries' && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{[item.location, item.country].filter(Boolean).join(' · ')}</span>
                          {item.region && <Badge variant="outline" className="text-xs py-0 h-4">{item.region}</Badge>}
                        </div>
                      )}
                      {type === 'pubs' && (
                        <span className="text-xs text-gray-500 truncate block mt-0.5">{[item.city, item.address].filter(Boolean).join(' — ')}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {type === 'breweries' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Sincronizza nomi birre" onClick={() => syncBeerNamesMutation.mutate(item.id)} disabled={syncBeerNamesMutation.isPending}>
                          <RefreshCw className={`w-3.5 h-3.5 ${syncBeerNamesMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Link href={getItemLink(item)}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-800" title="Apri pagina">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" title="Elimina" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-500">Nessun risultato per "{searchQuery}"</p>
                <p className="text-sm mt-1">Prova con termini diversi o aggiungi un nuovo elemento</p>
              </div>
            )}

            {!searchQuery && !isSearching && (
              <div className="text-center py-12 text-gray-400">
                <Search className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="text-base font-medium text-gray-500">Cerca {typeLabel.toLowerCase()}</p>
                <p className="text-sm mt-1">
                  {type === 'beers' ? 'Per nome birra o birrificio' : type === 'breweries' ? 'Per nome, città o paese' : 'Per nome, città o indirizzo'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── RIGHT: Action Panel ── */}
        <div className="space-y-4">

          {/* Selection summary */}
          <Card className={`${selCount > 0 ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-dashed border-gray-200 dark:border-gray-700'} transition-colors`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CheckSquare className={`w-4 h-4 ${selCount > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
                  <span className={`text-sm font-semibold ${selCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400'}`}>
                    {selCount > 0 ? `${selCount} ${type === 'beers' ? 'birre' : type === 'breweries' ? 'birrifici' : 'pub'} selezionati` : 'Nessuna selezione'}
                  </span>
                </div>
                {selCount > 0 && (
                  <button type="button" onClick={clearSelection} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {selCount === 0 && <p className="text-xs text-gray-400">Spunta gli elementi nella lista per abilitare le azioni di massa.</p>}
            </CardContent>
          </Card>

          {/* Mass Edit Panel */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Wand2 className="w-4 h-4 text-amber-500" />
                Modifica massiva
                {selCount > 0 && <Badge className="bg-amber-500 text-white text-xs">{selCount}</Badge>}
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Compila i campi da aggiornare, lascia vuoti gli altri.</p>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* BEERS fields */}
              {type === 'beers' && (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <AlignLeft className="w-3.5 h-3.5" /> Rimuovi prefisso dal nome
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. «Birra del Borgo»" value={massFields.nameStripPrefix ?? ""} onChange={e => setMassFields(f => ({ ...f, nameStripPrefix: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-0.5">Rimuove il testo dall'inizio del nome (non case-sensitive)</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Replace className="w-3.5 h-3.5" /> Trova e sostituisci nel nome
                    </Label>
                    <div className="flex gap-2">
                      <Input className="h-8 text-sm flex-1" placeholder="Testo da trovare" value={massFields.nameFindText ?? ""} onChange={e => setMassFields(f => ({ ...f, nameFindText: e.target.value }))} />
                      <Input className="h-8 text-sm flex-1" placeholder="Sostituisci con" value={massFields.nameFindReplaceWith ?? ""} onChange={e => setMassFields(f => ({ ...f, nameFindReplaceWith: e.target.value }))} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Case-sensitive · vuoto = elimina il testo trovato</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Tag className="w-3.5 h-3.5" /> Stile
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. IPA, Lager, Stout..." value={massFields.style ?? ""} onChange={e => setMassFields(f => ({ ...f, style: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Palette className="w-3.5 h-3.5" /> Colore
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. dorata, ambrata, nera..." value={massFields.color ?? ""} onChange={e => setMassFields(f => ({ ...f, color: e.target.value }))} />
                  </div>
                </>
              )}

              {/* BREWERIES fields */}
              {type === 'breweries' && (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Globe className="w-3.5 h-3.5" /> Paese
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Italia, Germany..." value={massFields.country ?? ""} onChange={e => setMassFields(f => ({ ...f, country: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" /> Regione
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Lazio, Bavaria..." value={massFields.region ?? ""} onChange={e => setMassFields(f => ({ ...f, region: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Città
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Roma, Berlin..." value={massFields.location ?? ""} onChange={e => setMassFields(f => ({ ...f, location: e.target.value }))} />
                  </div>
                </>
              )}

              {/* PUBS fields */}
              {type === 'pubs' && (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Città
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Roma, Milano..." value={massFields.city ?? ""} onChange={e => setMassFields(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" /> Regione
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Lazio, Lombardia..." value={massFields.region ?? ""} onChange={e => setMassFields(f => ({ ...f, region: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Globe className="w-3.5 h-3.5" /> Paese
                    </Label>
                    <Input className="h-8 text-sm" placeholder="Es. Italia" value={massFields.country ?? ""} onChange={e => setMassFields(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </>
              )}

              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 mt-1"
                disabled={massEditMutation.isPending || (!hasMassFields)}
                onClick={applyMassEdit}
              >
                {massEditMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aggiornando...</>
                  : <><Wand2 className="w-4 h-4 mr-2" />Applica a {selCount > 0 ? `${selCount} record` : 'selezione'}</>}
              </Button>
            </CardContent>
          </Card>

          {/* Danger zone: mass delete */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4" />
                Elimina selezionati
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xs text-gray-500 mb-3">Elimina definitivamente tutti gli elementi selezionati. Non è reversibile.</p>
              <Button
                variant="destructive"
                className="w-full"
                disabled={selCount === 0 || massDeleteMutation.isPending}
                onClick={() => setMassDeleteOpen(true)}
              >
                {massDeleteMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
                  : <><Trash2 className="w-4 h-4 mr-2" />Elimina {selCount > 0 ? `${selCount} elementi` : 'selezionati'}</>}
              </Button>
            </CardContent>
          </Card>

          {/* Breweries-only tools */}
          {type === 'breweries' && (
            <Card className="border-purple-200 dark:border-purple-900">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <GitMerge className="w-4 h-4" />
                  Strumenti Birrifici
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={selCount !== 2 || mergeMutation.isPending}
                  onClick={() => { const [first] = Array.from(selectedIds); setKeepId(first); setMergeOpen(true); }}
                >
                  <GitMerge className="w-4 h-4 mr-2" />
                  {selCount === 2 ? 'Merge 2 birrifici selezionati' : 'Seleziona esattamente 2 per merge'}
                </Button>
                <p className="text-xs text-gray-400 px-0.5">Unisce tutte le birre e dati in un unico birrificio.</p>
                <Separator className="my-1" />
                <Link href="/admin/duplicates">
                  <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20">
                    <Search className="w-4 h-4 mr-2" />
                    Trova birrifici duplicati
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {type === 'beers' ? 'Aggiungi Nuova Birra' : type === 'breweries' ? 'Aggiungi Nuovo Birrificio' : 'Aggiungi Nuovo Pub'}
            </DialogTitle>
          </DialogHeader>
          {type === 'beers' && <BeerForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />}
          {type === 'breweries' && <BreweryForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />}
          {type === 'pubs' && <PubForm onSubmit={data => createMutation.mutate(data)} isPending={createMutation.isPending} />}
        </DialogContent>
      </Dialog>

      {/* ── Delete single ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione <strong>non può essere annullata</strong>.{' '}
              {type === 'beers' ? 'La birra verrà rimossa dal catalogo e da tutte le tap list.' : type === 'breweries' ? 'Il birrificio e tutte le sue birre verranno eliminate permanentemente.' : 'Il pub e tutta la sua configurazione verranno eliminati permanentemente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : <><Trash2 className="w-4 h-4 mr-2" />Elimina definitivamente</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Mass delete confirm ── */}
      <AlertDialog open={massDeleteOpen} onOpenChange={setMassDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina {selCount} {type === 'beers' ? 'birre' : type === 'breweries' ? 'birrifici' : 'pub'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa operazione <strong>non può essere annullata</strong>. Tutti gli {selCount} elementi selezionati verranno eliminati definitivamente, inclusi tutti i dati associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => massDeleteMutation.mutate([...selectedIds])} disabled={massDeleteMutation.isPending}>
              {massDeleteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : <><Trash2 className="w-4 h-4 mr-2" />Elimina {selCount} elementi</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Merge Dialog ── */}
      {type === 'breweries' && mergeOpen && (
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-purple-500" />
                Merge birrifici duplicati
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 mb-4">Scegli quale birrificio <strong>mantenere</strong>. Tutte le birre, eventi e dati dell'altro verranno migrati su quello mantenuto, poi il duplicato sarà eliminato.</p>
            <div className="grid grid-cols-2 gap-3">
              {Array.from(selectedIds).map((id) => {
                const item = searchResults.find(r => r.id === id);
                if (!item) return null;
                const isKeep = keepId === id;
                return (
                  <div key={id} onClick={() => setKeepId(id)} className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${isKeep ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/10 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {item.logoUrl ? <img src={item.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-amber-500" /></div>}
                      <div className="font-semibold text-sm">{item.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {item.country && <div>🌍 {item.country}</div>}
                      {item.region && <div>📍 {item.region}</div>}
                    </div>
                    <div className={`text-xs font-semibold mt-2 ${isKeep ? 'text-green-600' : 'text-red-500'}`}>
                      {isKeep ? '✓ Mantieni questo' : '✗ Elimina questo'}
                    </div>
                  </div>
                );
              })}
            </div>
            {keepId && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 text-sm text-amber-800 dark:text-amber-300">
                ⚠️ Attenzione: "{searchResults.find(r => r.id !== keepId && selectedIds.has(r.id))?.name}" (ID {Array.from(selectedIds).find(id => id !== keepId)}) sarà <strong>eliminato definitivamente</strong>. Le sue birre saranno spostate su "{searchResults.find(r => r.id === keepId)?.name}".
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMergeOpen(false); setKeepId(null); }}>Annulla</Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={!keepId || mergeMutation.isPending} onClick={() => { if (!keepId) return; const mergeId = Array.from(selectedIds).find(id => id !== keepId)!; mergeMutation.mutate({ keepId, mergeId }); }}>
                {mergeMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Merging...</> : <><GitMerge className="w-4 h-4 mr-2" />Conferma merge</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
