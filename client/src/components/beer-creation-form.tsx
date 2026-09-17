import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { BeerDetailsFields, type BeerDetailsValues, type Collaborator } from "@/components/beer-details-fields";
import { Loader2, ArrowLeft } from "lucide-react";

export interface CreatedBeer { id: number; name: string; style?: string; abv?: string; breweryName?: string; description?: string; imageUrl?: string; }
interface BeerCreationFormProps { initialName?: string; onCreated: (beer: CreatedBeer) => void; onCancel: () => void; }

export function BeerCreationForm({ initialName = "", onCreated, onCancel }: BeerCreationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creatingBrewery, setCreatingBrewery] = useState(false);
  const [brewerySearch, setBrewerySearch] = useState("");
  const [newBeer, setNewBeer] = useState<BeerDetailsValues & { breweryId: string; breweryName: string }>({
    name: initialName, style: "", abv: "", ibu: "", color: "", description: "", imageUrl: "",
    isGlutenFree: false, isAlcoholFree: false, isCollaboration: false, breweryId: "", breweryName: "",
  });
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [brewery, setBrewery] = useState({ name: "", location: "", region: "", description: "" });
  const [beerFile, setBeerFile] = useState<File | null>(null);
  const [breweryLogo, setBreweryLogo] = useState<File | null>(null);
  const [breweryCover, setBreweryCover] = useState<File | null>(null);

  useEffect(() => { setNewBeer((current) => current.name ? current : { ...current, name: initialName }); }, [initialName]);
  const { data: breweries = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/breweries/search", brewerySearch],
    queryFn: async () => { const response = await fetch(`/api/owner/breweries/search?q=${encodeURIComponent(brewerySearch)}`, { credentials: "include" }); return response.ok ? response.json() : []; },
    enabled: !creatingBrewery && brewerySearch.length >= 2,
  });
  const upload = async (file: File, folder: string) => {
    const body = new FormData(); body.append("image", file); body.append("folder", folder);
    const response = await fetch("/api/upload/image", { method: "POST", credentials: "include", body });
    if (!response.ok) throw new Error("Upload immagine fallito");
    return (await response.json()).url as string;
  };
  const createBrewery = useMutation({
    mutationFn: async () => {
      const [logoUrl, coverImageUrl] = await Promise.all([breweryLogo ? upload(breweryLogo, "brewery-logos") : Promise.resolve(undefined), breweryCover ? upload(breweryCover, "brewery-covers") : Promise.resolve(undefined)]);
      return apiRequest("/api/owner/breweries", { method: "POST" }, { ...brewery, region: brewery.region || brewery.location, logoUrl, coverImageUrl });
    },
    onSuccess: (created: any) => { setNewBeer((current) => ({ ...current, breweryId: String(created.id), breweryName: created.name })); setCreatingBrewery(false); setBrewerySearch(""); setBrewery({ name: "", location: "", region: "", description: "" }); setBreweryLogo(null); setBreweryCover(null); toast({ title: "Birrificio creato!" }); },
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });
  const createBeer = useMutation({
    mutationFn: async () => {
      const imageUrl = beerFile ? await upload(beerFile, "beer-images") : newBeer.imageUrl;
      return apiRequest("/api/owner/beers", { method: "POST" }, { ...newBeer, imageUrl, collaborationBreweryIds: newBeer.isCollaboration ? collaborators.map((item) => item.id) : [] });
    },
    onSuccess: (created: any) => {
      onCreated({ id: created.id, name: created.name, style: created.style || newBeer.style, abv: created.abv || String(newBeer.abv || ""), breweryName: created.brewery?.name || newBeer.breweryName, description: created.description || newBeer.description, imageUrl: created.imageUrl || newBeer.imageUrl });
      toast({ title: "Birra creata!" }); queryClient.invalidateQueries({ queryKey: ["/api/search"] });
    },
    onError: (error: Error) => toast({ title: "Errore", description: error.message || "Non è stato possibile creare la birra", variant: "destructive" }),
  });
  const actionRow = (label: string, onPrimary: () => void, disabled: boolean, cancel: () => void, pending = false) => (
    <div className="grid grid-cols-1 gap-3 border-t border-stone-100 pt-4 pb-[var(--frozen-sab)] min-[380px]:grid-cols-2">
      <Button type="button" variant="outline" className="order-1 h-12 w-full min-h-11 rounded-xl" onClick={cancel}>Annulla</Button>
      <Button type="button" className="order-2 h-12 w-full min-h-11 rounded-xl" disabled={disabled} onClick={onPrimary}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{label}</Button>
    </div>
  );
  if (creatingBrewery) return (
    <div className="manager-creation-step space-y-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card sm:p-5">
      <div className="flex items-center gap-3"><Button type="button" variant="ghost" className="h-11 w-11 rounded-xl p-0" aria-label="Torna alla creazione birra" onClick={() => setCreatingBrewery(false)}><ArrowLeft className="h-5 w-5" /></Button><h4 className="text-lg font-bold">Crea nuovo birrificio</h4></div>
      <div className="space-y-2"><Label>Nome birrificio *</Label><Input className="h-11 rounded-xl" value={brewery.name} onChange={(e) => setBrewery({ ...brewery, name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Località *</Label><AddressAutocomplete value={brewery.location} onAddressSelect={(details) => setBrewery({ ...brewery, location: details.formattedAddress, region: details.region || details.city || "" })} /></div>
      <div className="space-y-2"><Label>Descrizione</Label><Textarea className="min-h-24 rounded-xl" value={brewery.description} onChange={(e) => setBrewery({ ...brewery, description: e.target.value })} /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Logo</Label><Input className="h-11 rounded-xl" type="file" accept="image/*" onChange={(e) => setBreweryLogo(e.target.files?.[0] || null)} /></div><div className="space-y-2"><Label>Immagine copertina</Label><Input className="h-11 rounded-xl" type="file" accept="image/*" onChange={(e) => setBreweryCover(e.target.files?.[0] || null)} /></div></div>
      {actionRow("Crea birrificio", () => createBrewery.mutate(), !brewery.name || !brewery.location || createBrewery.isPending, () => setCreatingBrewery(false), createBrewery.isPending)}
    </div>
  );
  const update = (field: keyof BeerDetailsValues, value: any) => setNewBeer((current) => ({ ...current, [field]: value }));
  return (
    <div className="manager-creation-step space-y-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card sm:p-5">
      <div className="flex items-center gap-3"><Button type="button" variant="ghost" className="h-11 w-11 rounded-xl p-0" aria-label="Torna alla selezione birra" onClick={onCancel}><ArrowLeft className="h-5 w-5" /></Button><h4 className="text-lg font-bold">Crea nuova birra</h4></div>
      <div className="space-y-2"><Label>Birrificio *</Label>{newBeer.breweryId ? <div className="flex min-h-11 items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm"><span>{newBeer.breweryName}</span><Button type="button" variant="ghost" className="h-11 w-11 rounded-xl p-2" aria-label="Cambia birrificio" onClick={() => setNewBeer({ ...newBeer, breweryId: "", breweryName: "" })}>×</Button></div> : <div className="relative"><Input className="h-11 rounded-xl" value={brewerySearch} onChange={(e) => setBrewerySearch(e.target.value)} placeholder="Cerca birrificio..." />{breweries.length > 0 && <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">{breweries.map((item: any) => <button type="button" className="block min-h-11 w-full px-3 text-left text-sm hover:bg-muted" key={item.id} onClick={() => { setNewBeer({ ...newBeer, breweryId: String(item.id), breweryName: item.name }); setBrewerySearch(""); }}>{item.name}</button>)}</div>}{brewerySearch.length >= 2 && <Button type="button" variant="link" className="min-h-11 px-0" onClick={() => { setCreatingBrewery(true); setBrewery({ ...brewery, name: brewerySearch }); }}>Crea nuovo birrificio</Button>}</div>}</div>
      <BeerDetailsFields values={newBeer} onChange={update} collaborators={collaborators} onCollaboratorsChange={setCollaborators} imageSearchEndpoint="/api/beer-images/search-by-name" imageSearchBody={{ beerName: newBeer.name, breweryName: newBeer.breweryName, breweryId: newBeer.breweryId }} />
      {actionRow("Crea birra", () => createBeer.mutate(), !newBeer.name || !newBeer.breweryId || !newBeer.style || createBeer.isPending || (newBeer.isCollaboration && collaborators.length === 0), onCancel, createBeer.isPending)}
    </div>
  );
}