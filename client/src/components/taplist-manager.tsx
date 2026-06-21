import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor, { RichTextDisplay } from "@/components/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { PriceFormatManager } from "@/components/price-format-manager";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { WebImageSearchButton } from "@/components/web-image-search-button";
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
  Save,
  Building,
  X,
  GripVertical,
} from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function CollabBrewerySelector({ selected, onChange }: { selected: { id: number; name: string }[]; onChange: (breweries: { id: number; name: string }[]) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/breweries/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setResults(Array.isArray(data) ? data.filter((b: any) => !selected.some((s: any) => s.id === b.id)) : []);
        setShowResults(true);
      } catch { setResults([]); }
    }, 250);
  }, [selected]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-foreground">Birrifici in Collaborazione</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((b: any) => (
            <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              <Building className="w-3 h-3" />
              {b.name}
              <button type="button" onClick={() => onChange(selected.filter(s => s.id !== b.id))} className="ml-0.5 text-purple-500 hover:text-purple-800">×</button>
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
          className="border-stone-200 rounded-xl h-11"
          autoComplete="off"
        />
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1A1D24] border border-stone-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {results.map((b: any) => (
              <button key={b.id} type="button" onMouseDown={e => { e.preventDefault(); onChange([...selected, { id: b.id, name: b.name }]); setQuery(""); setResults([]); setShowResults(false); }}
                className="w-full px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b last:border-b-0 flex items-center gap-2 text-sm">
                {b.logoUrl ? <img loading="lazy" src={b.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" /> : <Building className="w-4 h-4 text-purple-400" />}
                <span>{b.name}</span>
                <span className="text-xs text-stone-400 ml-auto">{b.location}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const beerFullEditSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  style: z.string().min(1, "Lo stile è obbligatorio"),
  abv: z.coerce.number().min(0).max(100).optional().nullable(),
  ibu: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isGlutenFree: z.boolean().default(false),
  isAlcoholFree: z.boolean().default(false),
  isCollaboration: z.boolean().default(false),
});
type BeerFullEditValues = z.infer<typeof beerFullEditSchema>;

function BeerFullEditDialog({ beer, open, onOpenChange, onSaved }: {
  beer: { id: number; name: string; style?: string; abv?: string | number | null; ibu?: string | number | null; description?: string | null; color?: string | null; imageUrl?: string | null; isGlutenFree?: boolean; isAlcoholFree?: boolean; isCollaboration?: boolean; collaborationBreweries?: { id: number; name: string }[] };
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collabBreweries, setCollabBreweries] = useState<{ id: number; name: string }[]>([]);

  const form = useForm<BeerFullEditValues>({
    resolver: zodResolver(beerFullEditSchema) as any,
    defaultValues: {
      name: "", style: "", abv: null, ibu: null, description: "", color: "", imageUrl: "",
      isGlutenFree: false, isAlcoholFree: false, isCollaboration: false,
    },
  });

  useEffect(() => {
    if (open && beer) {
      setCollabBreweries(beer.collaborationBreweries ?? []);
      form.reset({
        name: beer.name,
        style: beer.style ?? "",
        abv: beer.abv ? parseFloat(String(beer.abv)) : null,
        ibu: beer.ibu ? parseInt(String(beer.ibu)) : null,
        description: beer.description ?? "",
        color: beer.color ?? "",
        imageUrl: beer.imageUrl ?? "",
        isGlutenFree: beer.isGlutenFree ?? false,
        isAlcoholFree: beer.isAlcoholFree ?? false,
        isCollaboration: beer.isCollaboration ?? false,
      });
    }
  }, [open, beer.id]);

  const updateMutation = useMutation({
    mutationFn: (values: BeerFullEditValues) =>
      apiRequest(`/api/owner/beers/${beer.id}`, { method: "PATCH" }, {
        ...values,
        collaborationBreweryIds: values.isCollaboration ? collabBreweries.map(b => b.id) : [],
      }),
    onSuccess: () => {
      toast({ title: "Successo", description: "Scheda birra aggiornata" });
      queryClient.invalidateQueries({ queryKey: ["/api/beers", String(beer.id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/beers"] });
      onOpenChange(false);
      onSaved?.();
    },
    onError: (err: any) => {
      const msg = err?.message || "Impossibile aggiornare la birra";
      toast({ title: "Errore", description: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-x-hidden overflow-y-auto rounded-3xl border-stone-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary rounded-xl">
              <Beer className="h-5 w-5 text-white" />
            </div>
            Modifica Scheda Birra
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-5 pt-2 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Nome Birra *</FormLabel>
                  <FormControl><Input placeholder="Es. Luppolina" {...field} className="border-stone-200 rounded-xl h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="style" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Stile *</FormLabel>
                  <FormControl><Input placeholder="Es. American IPA" {...field} className="border-stone-200 rounded-xl h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="abv" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">ABV %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="5.2" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} className="border-stone-200 rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ibu" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">IBU</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="45" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} className="border-stone-200 rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Colore</FormLabel>
                <FormControl><Input placeholder="Es. Giallo Paglierino, Mogano..." {...field} value={field.value ?? ""} className="border-stone-200 rounded-xl h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Descrizione Organolettica</FormLabel>
                <FormControl>
                  <RichTextEditor
                    content={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Note di degustazione, malti e luppoli utilizzati..."
                    maxChars={2000}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-foreground">Immagine Prodotto</label>
                <WebImageSearchButton
                  endpoint={`/api/beers/${beer.id}/find-image-preview`}
                  responseKey="imageUrl"
                  onFound={(url) => form.setValue("imageUrl", url)}
                />
              </div>
              <ImageUpload
                label="Immagine Birra"
                description="Foto della bottiglia o del bicchiere"
                currentImageUrl={form.watch("imageUrl") || undefined}
                onImageChange={(url) => form.setValue("imageUrl", url || "")}
                folder="beer-images"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="400x400px"
              />
            </div>

            <div className="space-y-3 p-4 bg-stone-50 dark:bg-white/[0.03] rounded-xl border border-stone-100 dark:border-white/[0.06]">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Caratteristiche Speciali</p>
              <FormField control={form.control} name="isGlutenFree" render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} className="rounded-md" />
                  <span className="text-sm font-medium">Senza Glutine</span>
                </label>
              )} />
              <FormField control={form.control} name="isAlcoholFree" render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} className="rounded-md" />
                  <span className="text-sm font-medium">Analcolica (0,0%)</span>
                </label>
              )} />
              <FormField control={form.control} name="isCollaboration" render={({ field }) => (
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} className="rounded-md" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Birra in Collaborazione</span>
                </label>
              )} />
              {form.watch("isCollaboration") && (
                <div className="pt-1">
                  <CollabBrewerySelector selected={collabBreweries} onChange={setCollabBreweries} />
                  {collabBreweries.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Aggiungi almeno un birrificio partner</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-stone-100 dark:border-white/[0.06]">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-12 shadow-md"
                disabled={updateMutation.isPending || (form.watch("isCollaboration") && collabBreweries.length === 0)}
              >
                {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Salva modifiche
              </Button>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="px-6 border-stone-200 rounded-xl h-12">
                Annulla
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface BeerProfilePanelProps {
  beer: { id?: number; name: string; style?: string; abv?: string; ibu?: string; breweryName?: string; description?: string; imageUrl?: string };
  beerFull?: any;
  descEdit: string;
  onDescChange: (v: string) => void;
  onSaveDesc?: () => void;
  isSavingDesc?: boolean;
  onChangeBeer?: () => void;
  onRipristina?: () => void;
  onEditFull?: () => void;
  isNew?: boolean;
}

function BeerProfilePanel({ beer, beerFull, descEdit, onDescChange, onSaveDesc, isSavingDesc, onChangeBeer, onRipristina, onEditFull, isNew }: BeerProfilePanelProps) {
  const isVerifiedBrewery = beerFull?.brewery?.isVerified === true;
  const breweryName = beer.breweryName || beerFull?.brewery?.name || "Birrificio sconosciuto";
  const [isDescEditing, setIsDescEditing] = useState(!descEdit);

  useEffect(() => {
    setIsDescEditing(!descEdit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beer.id]);

  return (
    <div className="border border-stone-200 dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white dark:bg-[#0B0D10]/20">
      <div className="flex items-start gap-3 p-3">
        {beer.imageUrl
          ? <img loading="lazy" src={beer.imageUrl} alt={beer.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-stone-100 dark:border-white/10" />
          : <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Beer className="w-7 h-7 text-primary/60" />
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground leading-tight truncate">{beer.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{breweryName}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onRipristina && (
                <Button type="button" variant="ghost" size="sm" className="rounded-xl text-xs text-muted-foreground h-7 px-2" onClick={onRipristina}>
                  Ripristina
                </Button>
              )}
              {onEditFull && beer.id && (
                <Button type="button" variant="ghost" size="sm" className="rounded-xl text-xs text-primary h-7 px-2 gap-1" onClick={onEditFull}>
                  <Edit className="h-3 w-3" />
                  Scheda
                </Button>
              )}
              {onChangeBeer && (
                <Button type="button" variant="outline" size="sm" className="rounded-xl border-stone-200 text-xs h-7 px-2" onClick={onChangeBeer}>
                  Cambia
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {beer.style && (
              <span className="text-[11px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/40 font-medium">
                {beer.style}
              </span>
            )}
            {beer.abv && (
              <span className="text-[11px] px-1.5 py-0.5 bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-400 rounded-full font-medium">
                {beer.abv}% ABV
              </span>
            )}
            {beer.ibu && (
              <span className="text-[11px] px-1.5 py-0.5 bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-400 rounded-full font-medium">
                {beer.ibu} IBU
              </span>
            )}
            {isNew && (
              <span className="text-[11px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/40 font-medium">
                Nuova selezione
              </span>
            )}
            {isVerifiedBrewery && (
              <span className="text-[11px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800/40 font-medium">
                ✓ Verificato
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Descrizione birra */}
      <div className="border-t border-stone-100 dark:border-white/[0.04] px-3 pb-3 pt-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrizione birra</p>
          {isVerifiedBrewery && (
            <span className="text-[11px] text-muted-foreground/60 italic">Gestita dal birrificio</span>
          )}
          {!isVerifiedBrewery && !isDescEditing && descEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => setIsDescEditing(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Modifica
            </Button>
          )}
        </div>

        {isVerifiedBrewery ? (
          <p className="text-sm text-foreground/75 leading-relaxed min-h-[36px]">
            {descEdit || <span className="italic text-muted-foreground">Nessuna descrizione disponibile</span>}
          </p>
        ) : !isDescEditing && descEdit ? (
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{descEdit}</p>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={descEdit}
              onChange={(e) => onDescChange(e.target.value)}
              placeholder="Descrivi questa birra: aromi, carattere, abbinamenti gastronomici..."
              className="resize-none text-sm min-h-[72px] border-stone-200 rounded-xl"
              maxLength={2000}
              autoFocus={isDescEditing && !!descEdit}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground/60 flex-1">Salvata sulla scheda pubblica della birra.</p>
              <div className="flex gap-1.5 flex-shrink-0">
                {isDescEditing && descEdit !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-xl text-muted-foreground"
                    onClick={() => setIsDescEditing(false)}
                  >
                    Annulla
                  </Button>
                )}
                {onSaveDesc && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-3 text-xs rounded-xl"
                    onClick={() => { onSaveDesc(); setIsDescEditing(false); }}
                    disabled={isSavingDesc || !descEdit.trim()}
                  >
                    {isSavingDesc ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Salva descrizione
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
  tapType?: string;
  description?: string;
  isVisible: boolean;
}

interface TapListManagerProps {
  pubId: number;
  tapList: TapItem[];
  bottleList?: any[];
  isLoading?: boolean;
}

export function TapListManager({ pubId, tapList, bottleList = [], isLoading }: TapListManagerProps) {
  // ── Drag-and-drop ordering ────────────────────────────────────────────────
  const [localTapList, setLocalTapList] = useState<TapItem[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragFromIdx = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setLocalTapList([...tapList].sort((a, b) => (a.tapNumber ?? 999) - (b.tapNumber ?? 999)));
  }, [tapList]);

  const reorderMutation = useMutation({
    mutationFn: (order: { id: number; tapNumber: number }[]) =>
      apiRequest(`/api/pubs/${pubId}/taplist/reorder`, { method: "POST" }, { order }),
    onError: () => {
      toast({ title: "Errore ordinamento", variant: "destructive" });
      setLocalTapList([...tapList].sort((a, b) => (a.tapNumber ?? 999) - (b.tapNumber ?? 999)));
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragFromIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const from = dragFromIdx.current;
    setDragOverIdx(null);
    dragFromIdx.current = null;
    if (from === null || from === dropIdx) return;
    const next = [...localTapList];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    setLocalTapList(next);
    reorderMutation.mutate(next.map((item, i) => ({ id: item.id, tapNumber: i + 1 })));
  };
  const handleDragEnd = () => { setDragOverIdx(null); dragFromIdx.current = null; };
  // ─────────────────────────────────────────────────────────────────────────

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TapItem | null>(null);
  const [isChangingBeer, setIsChangingBeer] = useState(false);
  const [selectedNewBeer, setSelectedNewBeer] = useState<{ id: number; name: string; style: string; abv: string; breweryName: string } | null>(null);
  const [fullEditOpen, setFullEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPriceManager, setShowPriceManager] = useState(false);
  const [tempPrices, setTempPrices] = useState<PriceItem[]>([]);
  const [formData, setFormData] = useState({
    beerId: "",
    prices: [] as PriceItem[],
    tapNumber: "",
    tapType: "spina" as "spina" | "pompa" | "botte",
    description: "",
    isVisible: true,
  });

  const [selectedBeerDetails, setSelectedBeerDetails] = useState<{ id: number; name: string; style: string; abv: string; breweryName: string; description?: string; imageUrl?: string; ibu?: string } | null>(null);
  const [removingItem, setRemovingItem] = useState<TapItem | null>(null);
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
    isGlutenFree: false,
    isAlcoholFree: false,
    isCollaboration: false,
  });
  const [newBeerCollabBreweries, setNewBeerCollabBreweries] = useState<{ id: number; name: string }[]>([]);
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

  const [beerDescEdit, setBeerDescEdit] = useState<string>("");
  const [beerDescEdited, setBeerDescEdited] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
      setEditingItem(null);
      setIsChangingBeer(false);
      setSelectedNewBeer(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
    },
    onError: () => {
      toast({ title: "Errore di connessione", description: "Non è stato possibile aggiornare la visibilità. Riprova.", variant: "destructive" });
    },
  });

  // Cross-list helpers: sync with bottle list when same beer exists there
  const findBottleItem = (beerId: number) =>
    bottleList.find((b: any) => b.beer?.id === beerId || b.beerId === beerId);

  // Query prossime birre in coda per questo pub
  const { data: nextTapProposals = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", String(pubId), "next-tap"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/next-tap`),
    enabled: !!pubId,
    staleTime: 30000,
  });

  // Full beer details (for brewery verified status and description)
  const { data: selectedBeerFull } = useQuery<any>({
    queryKey: ["/api/beers", formData.beerId],
    queryFn: () => apiRequest(`/api/beers/${formData.beerId}`),
    enabled: !!formData.beerId,
    staleTime: 60000,
  });

  // Sync beerDescEdit when beer changes
  useEffect(() => {
    if (!formData.beerId) return;
    const desc = selectedBeerFull?.description ?? selectedBeerDetails?.description ?? "";
    setBeerDescEdit(desc);
    setBeerDescEdited(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.beerId, selectedBeerFull?.id]);

  const updateBeerDescMutation = useMutation({
    mutationFn: ({ beerId, description }: { beerId: number; description: string }) =>
      apiRequest(`/api/owner/beers/${beerId}/description`, { method: "PATCH" }, { description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beers", formData.beerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
    },
  });

  const confirmDeleteTapItem = async (item: TapItem, addNextBeerId?: number) => {
    const bottleItem = findBottleItem(item.beer.id);
    try {
      await apiRequest(`/api/pubs/${pubId}/taplist/${item.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
      // If a "next beer" was chosen from proposals, add it to taplist on the same tap position
      if (addNextBeerId) {
        const proposal = (nextTapProposals as any[]).find((p: any) => p.beer_id === addNextBeerId || p.id === addNextBeerId);
        const tapData: any = { beerId: addNextBeerId, tapNumber: item.tapNumber, tapType: item.tapType, isVisible: true };
        await apiRequest(`/api/pubs/${pubId}/taplist`, { method: "POST" }, tapData);
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
        // Remove from proposals if it was a proposal
        if (proposal) {
          apiRequest(`/api/next-tap/${proposal.id}`, { method: "DELETE" }).catch(() => {});
          queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "next-tap"] });
        }
        toast({ title: "Birra cambiata!", description: "La nuova birra è ora in spina." });
      } else {
        if (bottleItem) {
          await apiRequest(`/api/pubs/${pubId}/bottles/${bottleItem.id}`, { method: "DELETE" });
          queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
          toast({ title: "Birra rimossa", description: "Rimossa anche dalla cantina" });
        } else {
          toast({ title: "Birra rimossa dalla tap list!" });
        }
      }
    } catch {
      toast({ title: "Errore", description: "Impossibile rimuovere la birra. Riprova.", variant: "destructive" });
    }
    setRemovingItem(null);
  };

  const handleDeleteTapItem = (item: TapItem) => {
    setRemovingItem(item);
  };

  const handleToggleTapVisibility = async (item: TapItem) => {
    const newVisible = !item.isVisible;
    const bottleItem = findBottleItem(item.beer.id);

    const applyTap = (v: boolean) =>
      queryClient.setQueryData(["/api/pubs", String(pubId), "taplist"], (old: any) =>
        Array.isArray(old) ? old.map((t: any) => t.id === item.id ? { ...t, isVisible: v } : t) : old
      );
    const applyBottle = (id: number, v: boolean) =>
      queryClient.setQueryData(["/api/pubs", String(pubId), "bottles"], (old: any) =>
        Array.isArray(old) ? old.map((b: any) => b.id === id ? { ...b, isVisible: v } : b) : old
      );

    applyTap(newVisible);
    if (bottleItem) applyBottle(bottleItem.id, newVisible);

    try {
      const updatedTap = await apiRequest(`/api/pubs/${pubId}/taplist/${item.id}`, { method: "PATCH" }, { isVisible: newVisible });
      if (updatedTap?.isVisible !== undefined) applyTap(updatedTap.isVisible);
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });

      if (bottleItem) {
        const updatedBottle = await apiRequest(`/api/pubs/${pubId}/bottles/${bottleItem.id}`, { method: "PATCH" }, { isVisible: newVisible });
        if (updatedBottle?.isVisible !== undefined) applyBottle(bottleItem.id, updatedBottle.isVisible);
        queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "bottles"] });
        toast({ title: newVisible ? "Birra visibile" : "Birra nascosta", description: "Applicato anche alla cantina" });
      } else {
        toast({ title: newVisible ? "Birra visibile" : "Birra nascosta" });
      }
    } catch {
      applyTap(item.isVisible);
      if (bottleItem) applyBottle(bottleItem.id, item.isVisible);
      toast({ title: "Errore", description: "Impossibile aggiornare la visibilità", variant: "destructive" });
    }
  };

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

  const uploadFileToCloudinary = async (file: File, folder: string): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Upload fallito" }));
      throw new Error(err.message || "Upload immagine fallito");
    }
    const data = await res.json();
    if (!data.url) throw new Error("URL immagine non ricevuto dal server");
    return data.url;
  };

  const createBreweryMutation = useMutation({
    mutationFn: async (data: { name: string; location: string; region: string; description: string }) => {
      setUploadingBreweryImages(true);
      try {
        let logoUrl: string | undefined = undefined;
        let coverImageUrl: string | undefined = undefined;
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
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message || "Non è stato possibile creare il birrificio", variant: "destructive" });
    },
  });

  const createBeerMutation = useMutation({
    mutationFn: async (data: { name: string; breweryId: string; style: string; abv?: string; ibu?: string; description?: string; imageUrl?: string; isGlutenFree?: boolean; isAlcoholFree?: boolean; isCollaboration?: boolean }) => {
      let imageUrl = data.imageUrl;
      if (beerImageFile) {
        imageUrl = await uploadBeerImage();
      }
      const collaborationBreweryIds = data.isCollaboration ? newBeerCollabBreweries.map(b => b.id) : [];
      return apiRequest("/api/owner/beers", { method: "POST" }, { ...data, imageUrl, collaborationBreweryIds });
    },
    onSuccess: (beer: any) => {
      toast({ title: "Birra creata!" });
      const beerDetails = {
        id: beer.id,
        name: beer.name,
        style: beer.style || '',
        abv: beer.abv || '',
        breweryName: beer.brewery?.name || newBeerData.breweryName || 'Birrificio',
      };
      setFormData(prev => ({ ...prev, beerId: beer.id.toString() }));
      setSelectedBeerDetails(beerDetails);
      setCreatingBeer(false);
      setBeerImageFile(null);
      setBeerImagePreview("");
      setStyleSearchTerm("");
      setStyleDropdownOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      if (editingItem && isChangingBeer) {
        setSelectedNewBeer(beerDetails);
        setIsChangingBeer(false);
        setSearchTerm('');
      }
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message || "Non è stato possibile creare la birra", variant: "destructive" });
    },
  });

  // Update prices mutation
  const updatePricesMutation = useMutation({
    mutationFn: async ({ itemId, prices }: { itemId: number; prices: PriceItem[] }) => {
      return apiRequest(`/api/pubs/${pubId}/taplist/${itemId}/prices`, { method: "POST" }, { prices });
    },
    onSuccess: () => {
      toast({ title: "Prezzi aggiornati!" });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "taplist"] });
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

  const uploadBeerImage = async (): Promise<string> => {
    if (!beerImageFile) throw new Error("Nessun file selezionato");
    setUploadingBeerImage(true);
    try {
      const formData = new FormData();
      formData.append("image", beerImageFile);
      formData.append("folder", "beer-images");
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload fallito" }));
        throw new Error(err.message || "Upload fallito");
      }
      const data = await res.json();
      if (!data.url) throw new Error("URL immagine non ricevuto dal server");
      return data.url;
    } finally {
      setUploadingBeerImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      beerId: "",
      prices: [],
      tapNumber: "",
      tapType: "spina",
      description: "",
      isVisible: true,
    });
    setSearchTerm("");
    setSelectedBeerDetails(null);
    setCreatingBeer(false);
    setCreatingBrewery(false);
    setBrewerySearchTerm("");
    setNewBeerData({ name: "", style: "", abv: "", ibu: "", description: "", breweryId: "", breweryName: "", imageUrl: "", isGlutenFree: false, isAlcoholFree: false, isCollaboration: false });
    setNewBeerCollabBreweries([]);
    setNewBreweryData({ name: "", location: "", region: "", description: "", logoUrl: "", coverImageUrl: "" });
    setBreweryLogoFile(null);
    setBreweryLogoPreview("");
    setBreweryCoverFile(null);
    setBreweryCoverPreview("");
    setStyleSearchTerm("");
    setStyleDropdownOpen(false);
    setBeerImageFile(null);
    setBeerImagePreview("");
    setBeerDescEdit("");
    setBeerDescEdited(false);
  };

  const startEdit = (item: TapItem) => {
    setEditingItem(item);
    setIsChangingBeer(false);
    setSelectedNewBeer(null);
    setSearchTerm('');
    
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
      tapType: (item.tapType === "pompa" ? "pompa" : item.tapType === "botte" ? "botte" : "spina") as "spina" | "pompa" | "botte",
      description: item.description || "",
      isVisible: item.isVisible,
    });
  };

  const handleSubmit = () => {
    if (!formData.beerId) {
      toast({ title: "Seleziona una birra", description: "È necessario selezionare una birra per continuare", variant: "destructive" });
      return;
    }

    // Save beer description if edited (only for non-verified breweries)
    if (beerDescEdited && formData.beerId && !selectedBeerFull?.brewery?.isVerified) {
      updateBeerDescMutation.mutate({ beerId: parseInt(formData.beerId), description: beerDescEdit });
    }

    const submitData = {
      beerId: parseInt(formData.beerId),
      tapNumber: formData.tapNumber ? parseInt(formData.tapNumber) : null,
      tapType: formData.tapType,
      description: formData.description || null,
      isVisible: formData.isVisible,
    };

    if (editingItem) {
      updateTapMutation.mutate(submitData, {
        onSuccess: () => {
          if (formData.prices.length > 0) {
            updatePricesMutation.mutate({ itemId: editingItem.id, prices: formData.prices });
          }
        }
      });
    } else {
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
    <>
    {/* Dialog: Conferma rimozione birra dalla spina con coda prossime birre */}
    <Dialog open={!!removingItem} onOpenChange={(o) => { if (!o) setRemovingItem(null); }}>
      <DialogContent className="max-w-lg rounded-3xl border-stone-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">🔄 Cambia fusto</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Stai rimuovendo <strong>{removingItem?.beer?.name}</strong>
            {removingItem?.tapNumber ? ` dalla Spina ${removingItem.tapNumber}` : " dalla taplist"}.
            {nextTapProposals.length > 0 && " Vuoi mettere in spina una delle prossime birre?"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* Prossime birre in coda */}
          {(nextTapProposals as any[]).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prossime birre in coda</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(nextTapProposals as any[]).map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-white/[0.06] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-200 dark:hover:border-amber-800/40 transition-colors text-left group"
                    onClick={() => removingItem && confirmDeleteTapItem(removingItem, p.beer_id || p.beerId)}
                  >
                    {p.beer_image ? (
                      <img loading="lazy" src={p.beer_image} alt={p.beer_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                        <Beer className="w-5 h-5 text-amber-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{p.beer_name || p.name}</div>
                      {p.brewery_name && <div className="text-xs text-muted-foreground">{p.brewery_name}</div>}
                      {p.vote_count > 0 && <div className="text-xs text-amber-600 dark:text-amber-400">⬆ {p.vote_count} vot{p.vote_count === 1 ? 'o' : 'i'}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Azioni */}
          <div className="flex flex-col gap-2 pt-2 border-t border-stone-100 dark:border-white/[0.04]">
            <Button
              variant="outline"
              className="w-full justify-start border-stone-200 rounded-xl gap-2"
              onClick={() => {
                if (removingItem) {
                  // Close dialog, open add dialog on same tap to add new beer
                  setRemovingItem(null);
                  confirmDeleteTapItem(removingItem);
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              Rimuovi senza sostituire
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => setRemovingItem(null)}
            >
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Card className="border-stone-200 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-white dark:bg-[#0B0D10]/20 border-b border-stone-100">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold text-foreground flex items-center gap-2">
            <Beer className="w-5 h-5 text-primary" />
            Gestione Tap List
          </span>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setIsChangingBeer(false);
              setSelectedNewBeer(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Aggiungi Birra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-x-hidden overflow-y-auto rounded-3xl border-stone-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {editingItem ? "Modifica Birra" : "Aggiungi Birra alla Tap List"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingItem ? "Modifica i dettagli della birra" : "Cerca e seleziona una birra da aggiungere alla tap list"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4 w-full overflow-x-hidden">
                {/* Ricerca Birra o Birra Selezionata */}
                {!editingItem && (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      Seleziona Birra
                    </Label>
                    
                    {/* Mostra birra selezionata */}
                    {formData.beerId && (selectedBeerDetails || searchResults?.beers?.find((b: any) => b.id.toString() === formData.beerId)) ? (
                      <BeerProfilePanel
                        beer={selectedBeerDetails || searchResults?.beers?.find((b: any) => b.id.toString() === formData.beerId) || { name: "" }}
                        beerFull={selectedBeerFull}
                        descEdit={beerDescEdit}
                        onDescChange={(v) => { setBeerDescEdit(v); setBeerDescEdited(true); }}
                        onSaveDesc={() => {
                          if (formData.beerId && !selectedBeerFull?.brewery?.isVerified) {
                            updateBeerDescMutation.mutate({ beerId: parseInt(formData.beerId), description: beerDescEdit });
                          }
                        }}
                        isSavingDesc={updateBeerDescMutation.isPending}
                        onEditFull={selectedBeerFull?.id ? () => setFullEditOpen(true) : undefined}
                        onChangeBeer={() => {
                          setFormData({ ...formData, beerId: "" });
                          setSelectedBeerDetails(null);
                          setSearchTerm("");
                          setBeerDescEdit("");
                          setBeerDescEdited(false);
                        }}
                      />
                    ) : (
                      <>
                        <div className="relative">
                          {isSearching ? (
                            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          )}
                          <Input
                            placeholder="Cerca per nome o birrificio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 border-stone-200 rounded-xl focus-visible:ring-primary/20"
                            data-testid="input-beer-search"
                          />
                        </div>
                        {/* Magazzino fusti quick-pick */}
                        {!creatingBeer && (nextTapProposals as any[]).length > 0 && (
                          <div className="space-y-2 mt-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dal magazzino fusti</p>
                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                              {(nextTapProposals as any[]).map((p: any) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 w-[84px] rounded-xl border border-stone-200 dark:border-white/[0.06] hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                                  onClick={() => {
                                    setFormData({ ...formData, beerId: String(p.beer_id) });
                                    setSelectedBeerDetails({
                                      id: p.beer_id,
                                      name: p.beer_name || p.name,
                                      style: p.style || "",
                                      abv: p.abv || "",
                                      ibu: "",
                                      breweryName: p.brewery_name || "",
                                      description: p.description || "",
                                      imageUrl: p.beer_image || "",
                                    });
                                  }}
                                >
                                  {p.beer_image
                                    ? <img loading="lazy" src={p.beer_image} alt={p.beer_name} className="w-12 h-12 rounded-lg object-cover border border-stone-100 dark:border-white/10" />
                                    : <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center"><Beer className="w-6 h-6 text-amber-600" /></div>
                                  }
                                  <span className="text-[11px] font-medium text-foreground text-center line-clamp-2 leading-tight w-full">{p.beer_name || p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {debouncedSearchTerm.length >= 2 && !isSearching && !formData.beerId && !creatingBeer && (
                          <>
                            {searchResults?.beers && searchResults.beers.length > 0 && (
                              <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-2xl bg-white dark:bg-[#0B0D10]/20 shadow-sm mt-2 divide-y divide-orange-50">
                                {searchResults.beers.map((beer: any) => (
                                  <div
                                    key={beer.id}
                                    className="p-4 hover:bg-stone-50/50 dark:hover:bg-[#1A1D24]/30 cursor-pointer transition-colors flex items-start gap-3"
                                    onClick={() => {
                                      setFormData({ ...formData, beerId: beer.id.toString() });
                                      setSelectedBeerDetails({
                                        id: beer.id,
                                        name: beer.name,
                                        style: beer.style || '',
                                        abv: beer.abv || '',
                                        ibu: beer.ibu || '',
                                        breweryName: beer.brewery?.name || beer.breweryName || 'Birrificio sconosciuto',
                                        description: beer.description || '',
                                        imageUrl: beer.imageUrl || '',
                                      });
                                    }}
                                  >
                                    {beer.imageUrl ? (
                                      <img loading="lazy" src={beer.imageUrl} alt={beer.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-100 dark:border-white/10 mt-0.5" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Beer className="w-5 h-5 text-primary" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-foreground truncate">{beer.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {beer.brewery?.name || 'Birrificio sconosciuto'} • {beer.style}{beer.abv ? ` • ${beer.abv}% ABV` : ''}
                                      </div>
                                      {beer.description && (
                                        <div className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{beer.description}</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
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

                  </div>
                )}

                {/* Form creazione birra - condiviso tra aggiunta e modifica */}
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
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                            <Input
                              value={brewerySearchTerm}
                              onChange={(e) => setBrewerySearchTerm(e.target.value)}
                              placeholder="Cerca birrificio..."
                              className="h-9 pl-8 text-sm"
                            />
                          </div>
                          {Array.isArray(breweryResults) && breweryResults.length > 0 && (
                            <div className="max-h-32 overflow-y-auto border border-stone-200 rounded-xl bg-white dark:bg-card">
                              {breweryResults.map((b: any) => (
                                <div
                                  key={b.id}
                                  className="p-2 hover:bg-stone-50 dark:hover:bg-stone-900/20 cursor-pointer border-b border-stone-100 last:border-b-0 text-sm"
                                  onClick={() => {
                                    setNewBeerData({ ...newBeerData, breweryId: b.id.toString(), breweryName: b.name });
                                    setBrewerySearchTerm("");
                                  }}
                                >
                                  <span className="font-medium">{b.name}</span>
                                  <span className="text-muted-foreground ml-1">• {b.location}</span>
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
                          <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border border-stone-200 rounded-xl bg-white dark:bg-card shadow-lg">
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
                      <RichTextEditor
                        content={newBeerData.description}
                        onChange={(html) => setNewBeerData({ ...newBeerData, description: html })}
                        placeholder="Note sulla birra, aromi, sapore..."
                        maxChars={2000}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newBeerData.isGlutenFree}
                          onChange={(e) => setNewBeerData({ ...newBeerData, isGlutenFree: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5.5 7.5h5v1.5h-5z"/></svg>
                          Gluten Free
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newBeerData.isAlcoholFree}
                          onChange={(e) => setNewBeerData({ ...newBeerData, isAlcoholFree: e.target.checked })}
                          className="w-4 h-4 rounded border-stone-300 text-primary focus:ring-primary/30"
                        />
                        <span className="text-xs font-medium text-primary">0.0% Analcolica</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newBeerData.isCollaboration}
                          onChange={(e) => {
                            setNewBeerData({ ...newBeerData, isCollaboration: e.target.checked });
                            if (!e.target.checked) setNewBeerCollabBreweries([]);
                          }}
                          className="w-4 h-4 rounded border-stone-300 text-purple-600 focus:ring-purple-400/30"
                        />
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Birra in Collaborazione</span>
                      </label>
                    </div>

                    {newBeerData.isCollaboration && (
                      <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3">
                        <Label className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-2 block">Birrifici in Collaborazione</Label>
                        <CollabBrewerySelector selected={newBeerCollabBreweries} onChange={setNewBeerCollabBreweries} />
                        {newBeerCollabBreweries.length === 0 && (
                          <p className="text-xs text-purple-600/70 mt-1.5">Seleziona almeno un birrificio collaboratore</p>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Label className="text-xs">Immagine birra</Label>
                        {newBeerData.name.trim().length >= 2 && newBeerData.breweryId && !beerImagePreview && (
                          <WebImageSearchButton
                            endpoint="/api/beer-images/search-by-name"
                            responseKey="imageUrl"
                            body={{
                              beerName: newBeerData.name,
                              breweryName: newBeerData.breweryName,
                              breweryId: newBeerData.breweryId,
                            }}
                            onFound={(url) => {
                              setBeerImageFile(null);
                              setBeerImagePreview(url);
                              setNewBeerData(prev => ({ ...prev, imageUrl: url }));
                            }}
                            label="Cerca sul web"
                            previewTitle={`Anteprima per "${newBeerData.name}"`}
                          />
                        )}
                      </div>
                      {beerImagePreview ? (
                        <div className="relative w-20 h-20 mt-1">
                          <img loading="lazy" src={beerImagePreview} alt="Anteprima" className="w-20 h-20 object-cover rounded-lg border" />
                          <button
                            type="button"
                            onClick={() => {
                              setBeerImageFile(null);
                              setBeerImagePreview("");
                              setNewBeerData(prev => ({ ...prev, imageUrl: "" }));
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors">
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Carica immagine</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleBeerImageChange} />
                        </label>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Tip: prima inserisci nome e birrificio, poi prova "Cerca sul web" oppure carica un'immagine manualmente.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setCreatingBeer(false)}>
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        disabled={!newBeerData.name || !newBeerData.breweryId || !newBeerData.style || createBeerMutation.isPending || uploadingBeerImage || (newBeerData.isCollaboration && newBeerCollabBreweries.length === 0)}
                        onClick={() => createBeerMutation.mutate(newBeerData)}
                      >
                        {(createBeerMutation.isPending || uploadingBeerImage) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        {uploadingBeerImage ? "Caricamento immagine..." : "Crea birra"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Form creazione birrificio - condiviso tra aggiunta e modifica */}
                {creatingBrewery && (
                  <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 dark:bg-[#0B0D10]/10 space-y-3">
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
                            location: details.formattedAddress || details.city,
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
                      <RichTextEditor
                        content={newBreweryData.description}
                        onChange={(html) => setNewBreweryData({ ...newBreweryData, description: html })}
                        placeholder="Breve descrizione del birrificio..."
                        maxChars={2000}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Logo</Label>
                        {breweryLogoPreview ? (
                          <div className="relative w-16 h-16 mt-1">
                            <img loading="lazy" src={breweryLogoPreview} alt="Logo" className="w-16 h-16 object-cover rounded-lg border" />
                            <button
                              type="button"
                              onClick={() => { setBreweryLogoFile(null); setBreweryLogoPreview(""); }}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors">
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Carica logo</span>
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
                            <img loading="lazy" src={breweryCoverPreview} alt="Cover" className="w-full h-16 object-cover rounded-lg border" />
                            <button
                              type="button"
                              onClick={() => { setBreweryCoverFile(null); setBreweryCoverPreview(""); }}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/20 transition-colors">
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Carica copertina</span>
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

                {/* Birra Selezionata (per editing) */}
                {editingItem && !isChangingBeer && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Birra in spina</Label>
                    {selectedNewBeer ? (
                      <BeerProfilePanel
                        beer={{ ...selectedNewBeer, imageUrl: selectedBeerFull?.imageUrl || "" }}
                        beerFull={selectedBeerFull}
                        descEdit={beerDescEdit}
                        onDescChange={(v) => { setBeerDescEdit(v); setBeerDescEdited(true); }}
                        onSaveDesc={() => {
                          if (formData.beerId && !selectedBeerFull?.brewery?.isVerified) {
                            updateBeerDescMutation.mutate({ beerId: parseInt(formData.beerId), description: beerDescEdit });
                          }
                        }}
                        isSavingDesc={updateBeerDescMutation.isPending}
                        onEditFull={selectedBeerFull?.id ? () => setFullEditOpen(true) : undefined}
                        onChangeBeer={() => { setIsChangingBeer(true); setSearchTerm(""); }}
                        onRipristina={() => {
                          setSelectedNewBeer(null);
                          setFormData({ ...formData, beerId: editingItem.beer.id.toString() });
                        }}
                        isNew
                      />
                    ) : (
                      <BeerProfilePanel
                        beer={{
                          id: editingItem.beer.id,
                          name: editingItem.beer.name,
                          style: editingItem.beer.style,
                          abv: editingItem.beer.abv,
                          breweryName: editingItem.beer.brewery?.name,
                          imageUrl: selectedBeerFull?.imageUrl || "",
                        }}
                        beerFull={selectedBeerFull}
                        descEdit={beerDescEdit}
                        onDescChange={(v) => { setBeerDescEdit(v); setBeerDescEdited(true); }}
                        onSaveDesc={() => {
                          if (formData.beerId && !selectedBeerFull?.brewery?.isVerified) {
                            updateBeerDescMutation.mutate({ beerId: parseInt(formData.beerId), description: beerDescEdit });
                          }
                        }}
                        isSavingDesc={updateBeerDescMutation.isPending}
                        onEditFull={selectedBeerFull?.id ? () => setFullEditOpen(true) : editingItem?.beer?.id ? () => setFullEditOpen(true) : undefined}
                        onChangeBeer={() => { setIsChangingBeer(true); setSearchTerm(""); }}
                      />
                    )}
                  </div>
                )}

                {/* Ricerca birra per cambio in editing */}
                {editingItem && isChangingBeer && !creatingBeer && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Cerca nuova birra</Label>
                    <div className="relative">
                      {isSearching ? (
                        <Loader2 className="absolute left-3 top-3 h-4 w-4 text-stone-400 animate-spin" />
                      ) : (
                        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      )}
                      <Input
                        placeholder="Cerca per nome o birrificio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {/* Magazzino fusti quick-pick in cambio */}
                    {(nextTapProposals as any[]).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dal magazzino fusti</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                          {(nextTapProposals as any[]).map((p: any) => (
                            <button
                              key={p.id}
                              type="button"
                              className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5 w-[84px] rounded-xl border border-stone-200 dark:border-white/[0.06] hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                              onClick={() => {
                                if (editingItem && p.beer_id !== editingItem.beer.id) {
                                  setSelectedNewBeer({
                                    id: p.beer_id,
                                    name: p.beer_name || p.name,
                                    style: p.style || "",
                                    abv: p.abv || "",
                                    breweryName: p.brewery_name || "",
                                  });
                                  setFormData({ ...formData, beerId: String(p.beer_id) });
                                }
                                setIsChangingBeer(false);
                                setSearchTerm("");
                              }}
                            >
                              {p.beer_image
                                ? <img loading="lazy" src={p.beer_image} alt={p.beer_name} className="w-12 h-12 rounded-lg object-cover border border-stone-100 dark:border-white/10" />
                                : <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center"><Beer className="w-6 h-6 text-amber-600" /></div>
                              }
                              <span className="text-[11px] font-medium text-foreground text-center line-clamp-2 leading-tight w-full">{p.beer_name || p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsChangingBeer(false);
                        setSearchTerm('');
                      }}
                    >
                      Annulla cambio
                    </Button>
                    {debouncedSearchTerm.length >= 2 && !isSearching && (
                      <>
                        {searchResults?.beers && searchResults.beers.length > 0 && (
                          <div className="max-h-56 overflow-y-auto border border-stone-200 rounded-2xl bg-white dark:bg-[#0B0D10]/20 shadow-sm divide-y divide-stone-100 dark:divide-white/[0.04]">
                            {searchResults.beers.map((beer: any) => (
                              <div
                                key={beer.id}
                                className={`flex items-start gap-3 p-3.5 hover:bg-stone-50/80 dark:hover:bg-[#1A1D24]/30 cursor-pointer transition-colors ${beer.id === editingItem.beer.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                                onClick={() => {
                                  if (beer.id === editingItem.beer.id) {
                                    setSelectedNewBeer(null);
                                    setFormData({ ...formData, beerId: editingItem.beer.id.toString() });
                                  } else {
                                    setSelectedNewBeer({
                                      id: beer.id,
                                      name: beer.name,
                                      style: beer.style,
                                      abv: beer.abv,
                                      breweryName: beer.brewery?.name || 'Birrificio sconosciuto',
                                    });
                                    setFormData({ ...formData, beerId: beer.id.toString() });
                                  }
                                  setIsChangingBeer(false);
                                  setSearchTerm('');
                                }}
                              >
                                {beer.imageUrl
                                  ? <img loading="lazy" src={beer.imageUrl} alt={beer.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-stone-100 dark:border-white/10 mt-0.5" />
                                  : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Beer className="w-5 h-5 text-primary" /></div>
                                }
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground text-sm">
                                    {beer.name}
                                    {beer.id === editingItem.beer.id && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">(attuale)</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {beer.brewery?.name || 'Birrificio sconosciuto'}{beer.style ? ` • ${beer.style}` : ''}{beer.abv ? ` • ${beer.abv}% ABV` : ''}
                                  </div>
                                  {beer.description && (
                                    <div className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{beer.description}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="p-3 border border-dashed rounded-lg text-center text-muted-foreground">
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
                    <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
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
                        <div key={idx} className="flex items-center gap-2 p-2 border border-stone-200 rounded-xl bg-stone-50/50 dark:bg-[#0B0D10]/20">
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
                            <span className="text-sm text-muted-foreground">€</span>
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

                {/* Tipo di erogazione */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo di erogazione</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tapType: "spina" })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        formData.tapType === "spina"
                          ? "bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300"
                          : "border-stone-200 dark:border-border text-muted-foreground hover:border-amber-400 dark:hover:border-amber-700"
                      }`}
                    >
                      🍺 Spina
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tapType: "pompa" })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        formData.tapType === "pompa"
                          ? "bg-stone-50 border-primary/60 text-primary dark:bg-[#0B0D10]/20 dark:border-primary/40"
                          : "border-stone-200 dark:border-border text-muted-foreground hover:border-primary/40 dark:hover:border-primary/30"
                      }`}
                    >
                      🔧 Pompa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tapType: "botte" })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        formData.tapType === "botte"
                          ? "bg-amber-50 border-amber-700 text-amber-900 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300"
                          : "border-stone-200 dark:border-border text-muted-foreground hover:border-amber-600 dark:hover:border-amber-700"
                      }`}
                    >
                      🛢️ Botte
                    </button>
                  </div>
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
                  <Label className="text-sm font-medium">Note interne</Label>
                  <p className="text-xs text-muted-foreground mb-2">Visibili solo ai gestori, non ai clienti. Usa per note logistiche, scadenze fusto, temperatura consigliata, ecc.</p>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Es: fusto in scadenza il 15/03, servire a 6°C, guarnizione da sostituire..."
                    maxChars={2000}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingItem(null);
                      setIsChangingBeer(false);
                      setSelectedNewBeer(null);
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
          
          {/* Full Beer Edit Dialog */}
          {fullEditOpen && (selectedBeerFull?.id || editingItem?.beer?.id) && (
            <BeerFullEditDialog
              beer={selectedBeerFull ?? {
                id: editingItem!.beer.id,
                name: editingItem!.beer.name,
                style: editingItem!.beer.style,
                abv: editingItem!.beer.abv,
                imageUrl: "",
              }}
              open={fullEditOpen}
              onOpenChange={setFullEditOpen}
              onSaved={() => {
                if (formData.beerId) {
                  queryClient.invalidateQueries({ queryKey: ["/api/beers", formData.beerId] });
                }
              }}
            />
          )}

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
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-stone-100 dark:border-border bg-white dark:bg-card">
                <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-[#1A1D24] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
                </div>
                <div className="h-8 w-16 bg-stone-100 dark:bg-[#1A1D24] animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : localTapList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Beer className="w-12 h-12 mx-auto mb-4 text-stone-300" />
            <p>Nessuna birra alla spina.</p>
            <p className="text-sm">Clicca "Aggiungi Birra" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localTapList.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIdx(null)}
                className={`border rounded-2xl p-4 transition-colors ${
                  dragOverIdx === idx
                    ? 'border-primary border-dashed bg-primary/5'
                    : !item.isVisible
                    ? 'border-stone-100 dark:border-border opacity-60 bg-stone-50/30 dark:bg-[#0B0D10]/10'
                    : 'border-stone-100 dark:border-border bg-white dark:bg-card'
                }`}
              >
                {/* Row 1: drag handle + full name + action buttons */}
                <div className="flex items-start gap-2">
                  <div className="cursor-grab text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-1">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <h3 className="flex-1 font-bold text-base text-foreground leading-snug">{item.beer.name}</h3>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTapVisibility(item)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 rounded-lg"
                    >
                      {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { startEdit(item); setIsAddDialogOpen(true); }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-stone-50 dark:hover:bg-stone-900/20 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTapItem(item)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Row 2: badges (spina, tipo, visibilità, cantina) */}
                <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                  {item.tapNumber && (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                      Spina {item.tapNumber}
                    </Badge>
                  )}
                  {item.tapType === "pompa" && (
                    <Badge variant="outline" className="text-xs border-stone-300 text-primary dark:border-[#23262E]">
                      In Pompa
                    </Badge>
                  )}
                  {item.tapType === "botte" && (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400">
                      🛢️ Botte
                    </Badge>
                  )}
                  {!item.isVisible && (
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Nascosta
                    </Badge>
                  )}
                  {findBottleItem(item.beer.id) && (
                    <Badge variant="outline" className="text-xs border-stone-300 text-primary dark:border-[#23262E]">
                      anche in cantina
                    </Badge>
                  )}
                </div>

                {/* Row 3: immagine + birrificio/stile/ABV */}
                <div className="flex items-center gap-3 mt-2.5 pl-6">
                  <ImageWithFallback
                    src={(item.beer as any).imageUrl || item.beer.logoUrl}
                    alt={item.beer.name}
                    imageType="beer"
                    containerClassName="w-11 h-11 rounded-lg flex-shrink-0"
                    className="w-11 h-11 rounded-lg object-cover"
                    iconSize="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground/80 leading-tight">{item.beer.brewery?.name || 'Birrificio sconosciuto'}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {item.beer.style && <span className="text-xs text-muted-foreground">{item.beer.style}</span>}
                      {item.beer.abv && <span className="text-xs text-muted-foreground">• {item.beer.abv}% ABV</span>}
                      {(item.beer as any).isGlutenFree && <GlutenFreeSmallBadge size={11} />}
                      {(item.beer as any).isAlcoholFree && <AlcoholFreeBadge size={10} />}
                    </div>
                  </div>
                </div>

                {/* Row 4: prezzi */}
                {(item.prices && item.prices.length > 0) ? (
                  <div className="flex flex-wrap gap-2 mt-2.5 pl-6">
                    {item.prices.map((price, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-medium bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        {price.size}: €{price.price}
                      </Badge>
                    ))}
                  </div>
                ) : (item.priceSmall || item.priceMedium || item.priceLarge) ? (
                  <div className="flex flex-wrap gap-2 mt-2.5 pl-6">
                    {item.priceSmall && (
                      <Badge variant="outline" className="text-xs font-medium bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        Piccola: €{item.priceSmall}
                      </Badge>
                    )}
                    {item.priceMedium && (
                      <Badge variant="outline" className="text-xs font-medium bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        Media: €{item.priceMedium}
                      </Badge>
                    )}
                    {item.priceLarge && (
                      <Badge variant="outline" className="text-xs font-medium bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        Grande: €{item.priceLarge}
                      </Badge>
                    )}
                  </div>
                ) : null}

                {/* Row 5: descrizione */}
                {item.description && (
                  <div className="mt-2 pl-6">
                    <RichTextDisplay html={item.description} className="text-sm italic text-muted-foreground dark:text-stone-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}