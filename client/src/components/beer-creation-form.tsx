import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { WebImageSearchButton } from "@/components/web-image-search-button";
import { Loader2, Plus, ArrowLeft, X } from "lucide-react";

export interface CreatedBeer {
  id: number;
  name: string;
  style?: string;
  abv?: string;
  breweryName?: string;
  description?: string;
  imageUrl?: string;
}

interface BeerCreationFormProps {
  initialName?: string;
  onCreated: (beer: CreatedBeer) => void;
  onCancel: () => void;
}

const STYLES = ["IPA", "APA", "NEIPA", "Double IPA", "Lager", "Pilsner", "Helles", "Märzen", "Bock", "Weiss", "Hefeweizen", "Stout", "Porter", "Saison", "Belgian Ale", "Blanche", "Pale Ale", "Amber Ale", "Red Ale", "Blonde Ale", "Sour", "Gose", "Kölsch", "Brown Ale", "Fruit Beer", "Italian Pilsner"];

export function BeerCreationForm({ initialName = "", onCreated, onCancel }: BeerCreationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creatingBrewery, setCreatingBrewery] = useState(false);
  const [brewerySearch, setBrewerySearch] = useState("");
  const [newBeer, setNewBeer] = useState({ name: initialName, style: "", abv: "", ibu: "", description: "", breweryId: "", breweryName: "", imageUrl: "", isGlutenFree: false, isAlcoholFree: false, isCollaboration: false });
  const [collaborators, setCollaborators] = useState<{ id: number; name: string }[]>([]);
  const [collabQuery, setCollabQuery] = useState("");
  const [brewery, setBrewery] = useState({ name: "", location: "", region: "", description: "" });
  const [beerFile, setBeerFile] = useState<File | null>(null);
  const [breweryLogo, setBreweryLogo] = useState<File | null>(null);
  const [breweryCover, setBreweryCover] = useState<File | null>(null);

  useEffect(() => {
    setNewBeer((current) => current.name ? current : { ...current, name: initialName });
  }, [initialName]);

  const { data: breweries = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/breweries/search", brewerySearch],
    queryFn: async () => {
      const response = await fetch(`/api/owner/breweries/search?q=${encodeURIComponent(brewerySearch)}`, { credentials: "include" });
      return response.ok ? response.json() : [];
    },
    enabled: !creatingBrewery && brewerySearch.length >= 2,
  });
  const { data: collaborationResults = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries/search", collabQuery],
    queryFn: async () => {
      const response = await fetch(`/api/breweries/search?q=${encodeURIComponent(collabQuery)}&limit=10`, { credentials: "include" });
      return response.ok ? response.json() : [];
    },
    enabled: collabQuery.length >= 2,
  });

  const upload = async (file: File, folder: string) => {
    const body = new FormData();
    body.append("image", file);
    body.append("folder", folder);
    const response = await fetch("/api/upload/image", { method: "POST", credentials: "include", body });
    if (!response.ok) throw new Error("Upload immagine fallito");
    const data = await response.json();
    return data.url as string;
  };

  const createBrewery = useMutation({
    mutationFn: async () => {
      const [logoUrl, coverImageUrl] = await Promise.all([
        breweryLogo ? upload(breweryLogo, "brewery-logos") : Promise.resolve(undefined),
        breweryCover ? upload(breweryCover, "brewery-covers") : Promise.resolve(undefined),
      ]);
      return apiRequest("/api/owner/breweries", { method: "POST" }, { ...brewery, region: brewery.region || brewery.location, logoUrl, coverImageUrl });
    },
    onSuccess: (created: any) => {
      setNewBeer((current) => ({ ...current, breweryId: String(created.id), breweryName: created.name }));
      setCreatingBrewery(false);
      setBrewerySearch("");
      setBrewery({ name: "", location: "", region: "", description: "" });
      setBreweryLogo(null);
      setBreweryCover(null);
      toast({ title: "Birrificio creato!" });
    },
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });

  const createBeer = useMutation({
    mutationFn: async () => {
      const imageUrl = beerFile ? await upload(beerFile, "beer-images") : newBeer.imageUrl;
      return apiRequest("/api/owner/beers", { method: "POST" }, { ...newBeer, imageUrl, collaborationBreweryIds: newBeer.isCollaboration ? collaborators.map((item) => item.id) : [] });
    },
    onSuccess: (created: any) => {
      const result = { id: created.id, name: created.name, style: created.style || newBeer.style, abv: created.abv || newBeer.abv, breweryName: created.brewery?.name || newBeer.breweryName, description: created.description || newBeer.description, imageUrl: created.imageUrl || newBeer.imageUrl };
      toast({ title: "Birra creata!" });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      onCreated(result);
    },
    onError: (error: Error) => toast({ title: "Errore", description: error.message || "Non è stato possibile creare la birra", variant: "destructive" }),
  });

  if (creatingBrewery) {
    return (
      <div className="manager-creation-step border rounded-2xl p-4 pb-[calc(1rem+var(--frozen-sab))] bg-amber-50/50 dark:bg-amber-900/10 space-y-4">
        <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setCreatingBrewery(false)}><ArrowLeft className="h-4 w-4" /></Button><h4 className="font-semibold">Crea nuovo birrificio</h4></div>
        <Label>Nome birrificio *</Label>
        <Input value={brewery.name} onChange={(e) => setBrewery({ ...brewery, name: e.target.value })} />
        <Label>Località *</Label>
        <AddressAutocomplete value={brewery.location} onAddressSelect={(details) => setBrewery({ ...brewery, location: details.formattedAddress, region: details.region || details.city || "" })} />
        <Label>Descrizione</Label><Textarea value={brewery.description} onChange={(e) => setBrewery({ ...brewery, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><Input type="file" accept="image/*" onChange={(e) => setBreweryLogo(e.target.files?.[0] || null)} /><Input type="file" accept="image/*" onChange={(e) => setBreweryCover(e.target.files?.[0] || null)} /></div>
        <div className="sticky bottom-0 -mx-4 -mb-4 flex gap-2 border-t bg-amber-50/95 px-4 py-3 pb-[calc(.75rem+var(--frozen-sab))] backdrop-blur dark:bg-[#1A1D24]/95"><Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => setCreatingBrewery(false)}>Annulla</Button><Button type="button" className="min-h-11 flex-1" disabled={!brewery.name || !brewery.location || createBrewery.isPending} onClick={() => createBrewery.mutate()}>{createBrewery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea birrificio</Button></div>
      </div>
    );
  }

  return (
    <div className="manager-creation-step border rounded-2xl p-4 pb-[calc(1rem+var(--frozen-sab))] bg-amber-50/50 dark:bg-amber-900/10 space-y-4">
      <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" onClick={onCancel}><ArrowLeft className="h-4 w-4" /></Button><h4 className="font-semibold">Crea nuova birra</h4></div>
      <Label>Nome birra *</Label><Input value={newBeer.name} onChange={(e) => setNewBeer({ ...newBeer, name: e.target.value })} />
      <Label>Birrificio *</Label>
      {newBeer.breweryId ? <div className="flex items-center justify-between p-2 bg-green-50 border rounded-lg"><span>{newBeer.breweryName}</span><Button type="button" variant="ghost" size="sm" onClick={() => setNewBeer({ ...newBeer, breweryId: "", breweryName: "" })}><X className="h-4 w-4" /></Button></div> : <div className="relative"><Input value={brewerySearch} onChange={(e) => setBrewerySearch(e.target.value)} placeholder="Cerca birrificio..." />{breweries.length > 0 && <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg">{breweries.map((item: any) => <button type="button" className="block w-full text-left p-2 hover:bg-muted" key={item.id} onClick={() => { setNewBeer({ ...newBeer, breweryId: String(item.id), breweryName: item.name }); setBrewerySearch(""); }}>{item.name}</button>)}</div>}{brewerySearch.length >= 2 && <Button type="button" variant="link" onClick={() => { setCreatingBrewery(true); setBrewery({ ...brewery, name: brewerySearch }); }}>Crea nuovo birrificio</Button>}</div>}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label>Stile *</Label><Input list="beer-styles" value={newBeer.style} onChange={(e) => setNewBeer({ ...newBeer, style: e.target.value })} /><datalist id="beer-styles">{STYLES.map((style) => <option value={style} key={style} />)}</datalist></div><div><Label>ABV %</Label><Input type="number" step="0.1" value={newBeer.abv} onChange={(e) => setNewBeer({ ...newBeer, abv: e.target.value })} /></div></div>
       <details className="group rounded-xl border border-amber-200/70 bg-white/45 px-3 dark:border-white/10 dark:bg-white/[0.03]"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-foreground">Dettagli facoltativi</summary><div className="space-y-4 pb-3"><div><Label>IBU</Label><Input type="number" value={newBeer.ibu} onChange={(e) => setNewBeer({ ...newBeer, ibu: e.target.value })} /></div><div><Label>Descrizione</Label><Textarea value={newBeer.description} onChange={(e) => setNewBeer({ ...newBeer, description: e.target.value })} /></div><div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2"><Checkbox checked={newBeer.isGlutenFree} onCheckedChange={(checked) => setNewBeer({ ...newBeer, isGlutenFree: checked === true })} /><span className="text-sm">Senza glutine</span></label><label className="flex min-h-11 items-center gap-2"><Checkbox checked={newBeer.isAlcoholFree} onCheckedChange={(checked) => setNewBeer({ ...newBeer, isAlcoholFree: checked === true })} /><span className="text-sm">Analcolica</span></label></div></div></details>
       <label className="flex min-h-11 items-center gap-2"><Checkbox checked={newBeer.isCollaboration} onCheckedChange={(checked) => setNewBeer({ ...newBeer, isCollaboration: checked === true })} /><span className="text-sm font-medium">Birra in collaborazione</span></label>
      {newBeer.isCollaboration && <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2"><Label>Birrifici in collaborazione</Label><div className="flex flex-wrap gap-2">{collaborators.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">{item.name}<button type="button" onClick={() => setCollaborators(collaborators.filter((selected) => selected.id !== item.id))}>×</button></span>)}</div><div className="relative"><Input value={collabQuery} onChange={(e) => setCollabQuery(e.target.value)} placeholder="Cerca birrificio partner..." />{collaborationResults.filter((item: any) => !collaborators.some((selected) => selected.id === item.id)).length > 0 && <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg">{collaborationResults.filter((item: any) => !collaborators.some((selected) => selected.id === item.id)).map((item: any) => <button type="button" className="block w-full text-left p-2 hover:bg-muted" key={item.id} onClick={() => { setCollaborators([...collaborators, { id: item.id, name: item.name }]); setCollabQuery(""); }}>{item.name}</button>)}</div>}</div>{collaborators.length === 0 && <p className="text-xs text-purple-600">Seleziona almeno un birrificio collaboratore</p>}</div>}
      <div><div className="flex items-center justify-between"><Label>Immagine birra</Label>{newBeer.name.trim().length >= 2 && newBeer.breweryId && !beerFile && !newBeer.imageUrl && <WebImageSearchButton endpoint="/api/beer-images/search-by-name" responseKey="imageUrl" body={{ beerName: newBeer.name, breweryName: newBeer.breweryName, breweryId: newBeer.breweryId }} onFound={(url) => setNewBeer({ ...newBeer, imageUrl: url })} label="Cerca sul web" previewTitle={`Anteprima per "${newBeer.name}"`} />}</div>{newBeer.imageUrl && <div className="relative w-20 h-20 mt-1"><img loading="lazy" src={newBeer.imageUrl} alt="Anteprima" className="w-20 h-20 object-cover rounded-lg border" /><button type="button" className="absolute -right-2 -top-2 rounded-full bg-white border p-1" onClick={() => setNewBeer({ ...newBeer, imageUrl: "" })}>×</button></div>}<Input type="file" accept="image/*" onChange={(e) => { setBeerFile(e.target.files?.[0] || null); setNewBeer({ ...newBeer, imageUrl: "" }); }} /></div>
       <div className="sticky bottom-0 -mx-4 -mb-4 flex gap-2 border-t bg-amber-50/95 px-4 py-3 pb-[calc(.75rem+var(--frozen-sab))] backdrop-blur dark:bg-[#1A1D24]/95"><Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onCancel}>Annulla</Button><Button type="button" className="min-h-11 flex-1" disabled={!newBeer.name || !newBeer.breweryId || !newBeer.style || createBeer.isPending || (newBeer.isCollaboration && collaborators.length === 0)} onClick={() => createBeer.mutate()}>{createBeer.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Crea birra</Button></div>
    </div>
  );
}