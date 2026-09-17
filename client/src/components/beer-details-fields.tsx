import { useCallback, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/rich-text-editor";
import { ImageUpload } from "@/components/image-upload";
import { WebImageSearchButton } from "@/components/web-image-search-button";
import { Building, Loader2, X } from "lucide-react";

export interface BeerDetailsValues {
  name: string;
  style: string;
  abv: string | number | null;
  ibu: string | number | null;
  color: string;
  description: string;
  imageUrl: string;
  isGlutenFree: boolean;
  isAlcoholFree: boolean;
  isCollaboration: boolean;
}

export interface Collaborator {
  id: number;
  name: string;
}

interface BeerDetailsFieldsProps {
  values: BeerDetailsValues;
  onChange: (field: keyof BeerDetailsValues, value: any) => void;
  collaborators: Collaborator[];
  onCollaboratorsChange: (value: Collaborator[]) => void;
  imageSearchEndpoint?: string;
  imageSearchBody?: Record<string, unknown>;
}

const STYLES = ["IPA", "APA", "NEIPA", "Double IPA", "Lager", "Pilsner", "Helles", "Märzen", "Bock", "Weiss", "Hefeweizen", "Stout", "Porter", "Saison", "Belgian Ale", "Blanche", "Pale Ale", "Amber Ale", "Red Ale", "Blonde Ale", "Sour", "Gose", "Kölsch", "Brown Ale", "Fruit Beer", "Italian Pilsner"];

function CollaboratorSelector({ selected, onChange }: { selected: Collaborator[]; onChange: (value: Collaborator[]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (value.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/breweries/search?q=${encodeURIComponent(value)}&limit=10`, { credentials: "include" });
        const data = response.ok ? await response.json() : [];
        setResults(Array.isArray(data) ? data.filter((item: any) => !selected.some((entry) => entry.id === item.id)) : []);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [selected]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold">Birrifici in collaborazione</Label>
      {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.map((item) => (
        <span key={item.id} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-purple-100 px-3 text-xs text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          <Building className="h-3 w-3" />{item.name}
          <button type="button" className="min-h-11 min-w-11 rounded-full p-2" aria-label={`Rimuovi ${item.name}`} onClick={() => onChange(selected.filter((entry) => entry.id !== item.id))}><X className="h-4 w-4" /></button>
        </span>
      ))}</div>}
      <div className="relative">
        {loading && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />}
        <Input className="h-11 rounded-xl" value={query} onChange={(event) => { setQuery(event.target.value); search(event.target.value); }} placeholder="Cerca birrificio partner..." autoComplete="off" />
        {results.length > 0 && <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-border dark:bg-card">
          {results.map((item) => <button type="button" key={item.id} className="block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onChange([...selected, { id: item.id, name: item.name }]); setQuery(""); setResults([]); }}>{item.name}</button>)}
        </div>}
      </div>
    </div>
  );
}

export function BeerDetailsFields({ values, onChange, collaborators, onCollaboratorsChange, imageSearchEndpoint, imageSearchBody }: BeerDetailsFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label className="font-bold">Nome Birra *</Label><Input className="h-11 rounded-xl" value={values.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Es. Luppolina" /></div>
        <div className="space-y-2"><Label className="font-bold">Stile *</Label><Input className="h-11 rounded-xl" list="shared-beer-styles" value={values.style} onChange={(e) => onChange("style", e.target.value)} placeholder="Es. American IPA" /><datalist id="shared-beer-styles">{STYLES.map((style) => <option value={style} key={style} />)}</datalist></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="font-bold">ABV %</Label><Input className="h-11 rounded-xl" type="number" step="0.1" value={values.abv ?? ""} onChange={(e) => onChange("abv", e.target.value === "" ? null : Number(e.target.value))} placeholder="5.2" /></div>
        <div className="space-y-2"><Label className="font-bold">IBU</Label><Input className="h-11 rounded-xl" type="number" value={values.ibu ?? ""} onChange={(e) => onChange("ibu", e.target.value === "" ? null : Number(e.target.value))} placeholder="45" /></div>
      </div>
      <div className="space-y-2"><Label className="font-bold">Colore</Label><Input className="h-11 rounded-xl" value={values.color} onChange={(e) => onChange("color", e.target.value)} placeholder="Es. Giallo Paglierino, Mogano..." /></div>
      <div className="space-y-2"><Label className="font-bold">Descrizione Organolettica</Label><RichTextEditor content={values.description} onChange={(value) => onChange("description", value)} placeholder="Note di degustazione, malti e luppoli utilizzati..." maxChars={2000} /></div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2"><Label className="font-bold">Immagine Birra</Label>{imageSearchEndpoint && <WebImageSearchButton endpoint={imageSearchEndpoint} responseKey="imageUrl" body={imageSearchBody} onFound={(url) => onChange("imageUrl", url)} />}</div>
        <ImageUpload label="Immagine Birra" description="Foto della bottiglia o del bicchiere" currentImageUrl={values.imageUrl || undefined} onImageChange={(url) => onChange("imageUrl", url || "")} folder="beer-images" aspectRatio="square" maxSize={5} recommendedDimensions="400x400px" />
      </div>
      <div className="space-y-3 rounded-xl border border-stone-100 bg-stone-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caratteristiche Speciali</p>
        <label className="flex min-h-11 items-center gap-3"><Checkbox checked={values.isGlutenFree} onCheckedChange={(value) => onChange("isGlutenFree", value === true)} /><span className="text-sm font-medium">Senza Glutine</span></label>
        <label className="flex min-h-11 items-center gap-3"><Checkbox checked={values.isAlcoholFree} onCheckedChange={(value) => onChange("isAlcoholFree", value === true)} /><span className="text-sm font-medium">Analcolica (0,0%)</span></label>
        <label className="flex min-h-11 items-center gap-3"><Checkbox checked={values.isCollaboration} onCheckedChange={(value) => onChange("isCollaboration", value === true)} /><span className="text-sm font-medium text-purple-700 dark:text-purple-400">Birra in Collaborazione</span></label>
        {values.isCollaboration && <div className="pt-1"><CollaboratorSelector selected={collaborators} onChange={onCollaboratorsChange} />{collaborators.length === 0 && <p className="mt-1 text-xs text-red-500">Aggiungi almeno un birrificio partner</p>}</div>}
      </div>
    </div>
  );
}