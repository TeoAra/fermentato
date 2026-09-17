import { useState, useEffect, useMemo, useRef } from "react";
import { useTouchReorder } from "@/hooks/useTouchReorder";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { PriceFormatManager } from "@/components/price-format-manager";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ImageWithFallback from "@/components/image-with-fallback";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
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
  X,
  GripVertical,
  Wrench,
  PackageOpen,
} from "lucide-react";
import { BeerCreationForm } from "@/components/beer-creation-form";
import { BeerDetailsFields } from "@/components/beer-details-fields";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
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

export function BeerFullEditDialog({ beer, open, onOpenChange, onSaved }: {
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
      <DialogContent className="manager-dialog max-w-lg w-full overflow-x-hidden overflow-y-auto rounded-3xl border-stone-200 shadow-2xl">
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
            <BeerDetailsFields
              values={{
                name: form.watch("name"),
                style: form.watch("style"),
                abv: form.watch("abv") ?? null,
                ibu: form.watch("ibu") ?? null,
                color: form.watch("color") ?? "",
                description: form.watch("description") ?? "",
                imageUrl: form.watch("imageUrl") ?? "",
                isGlutenFree: form.watch("isGlutenFree"),
                isAlcoholFree: form.watch("isAlcoholFree"),
                isCollaboration: form.watch("isCollaboration"),
              }}
              onChange={(field, value) => form.setValue(field as any, value, { shouldValidate: true, shouldDirty: true })}
              collaborators={collabBreweries}
              onCollaboratorsChange={setCollabBreweries}
              imageSearchEndpoint={`/api/beers/${beer.id}/find-image-preview`}
            />

            <DialogFooter className="grid grid-cols-1 gap-3 border-t border-stone-100 pt-4 pb-[var(--frozen-sab)] min-[380px]:grid-cols-2 sm:space-x-0">
              <Button
                type="submit"
                className="order-2 h-12 min-h-11 rounded-xl bg-primary font-bold text-white shadow-md hover:bg-primary/90"
                disabled={updateMutation.isPending || (form.watch("isCollaboration") && collabBreweries.length === 0)}
              >
                {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Salva modifiche
              </Button>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="order-1 h-12 min-h-11 rounded-xl border-stone-200">
                Annulla
              </Button>
            </DialogFooter>
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

  // ── Touch drag (iOS / Capacitor) ──────────────────────────────────────────
  const { startTouchDrag } = useTouchReorder({
    onReorder: (from, to) => {
      const next = [...localTapList];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setLocalTapList(next);
      reorderMutation.mutate(next.map((item, i) => ({ id: item.id, tapNumber: i + 1 })));
    },
    setDragOver: setDragOverIdx,
  });
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
  const [initialBeerName, setInitialBeerName] = useState("");

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
          <DialogTitle className="text-lg font-bold">Cambia fusto</DialogTitle>
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
              <Button size="sm" className="min-h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Aggiungi Birra
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="taplist-beer-dialog" className={`manager-dialog max-w-lg w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto rounded-3xl border-stone-200 ${creatingBeer ? "manager-dialog-creating" : ""}`}>
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
                {!editingItem && !creatingBeer && (
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
                                  setInitialBeerName(debouncedSearchTerm);
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
                {creatingBeer && (
                  <div data-testid="beer-creation-step">
                  <BeerCreationForm
                    initialName={initialBeerName || debouncedSearchTerm}
                    onCancel={() => setCreatingBeer(false)}
                    onCreated={(beer) => {
                      const beerDetails = {
                        id: beer.id,
                        name: beer.name,
                        style: beer.style || "",
                        abv: beer.abv || "",
                        breweryName: beer.breweryName || "Birrificio sconosciuto",
                        description: beer.description || "",
                        imageUrl: beer.imageUrl || "",
                      };
                      setFormData((current) => ({ ...current, beerId: String(beer.id) }));
                      setSelectedBeerDetails(beerDetails);
                      setSelectedNewBeer(beerDetails);
                      setCreatingBeer(false);
                      setSearchTerm("");
                      if (editingItem && isChangingBeer) setIsChangingBeer(false);
                    }}
                  />
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
                              setInitialBeerName(debouncedSearchTerm);
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
                <div data-testid="taplist-details-step" className={creatingBeer ? "hidden" : "space-y-3"}>
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
                <div className={creatingBeer ? "hidden" : ""}>
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
                       <Beer className="h-4 w-4" /> Spina
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
                       <Wrench className="h-4 w-4" /> Pompa
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
                       <PackageOpen className="h-4 w-4" /> Botte
                    </button>
                  </div>
                </div>

                {/* Dettagli Aggiuntivi */}
                <div className={creatingBeer ? "hidden" : "grid grid-cols-2 gap-4"}>
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

                <div className={creatingBeer ? "hidden" : ""}>
                  <Label className="text-sm font-medium">Note interne</Label>
                  <p className="text-xs text-muted-foreground mb-2">Visibili solo ai gestori, non ai clienti. Usa per note logistiche, scadenze fusto, temperatura consigliata, ecc.</p>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Es: fusto in scadenza il 15/03, servire a 6°C, guarnizione da sostituire..."
                    maxChars={2000}
                  />
                </div>

                <DialogFooter className={`manager-dialog-footer sm:space-x-3 ${creatingBeer ? "hidden" : ""}`}>
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
                    className="min-h-11"
                  >
                    {(addTapMutation.isPending || updateTapMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingItem ? "Salva modifiche" : "Aggiungi alla taplist"}
                  </Button>
                </DialogFooter>
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
                data-touch-sort-idx={idx}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIdx(null)}
                className={`border rounded-2xl p-3 sm:p-4 transition-colors ${
                  dragOverIdx === idx
                    ? 'border-primary border-dashed bg-primary/5'
                    : !item.isVisible
                    ? 'border-stone-100 dark:border-border opacity-60 bg-stone-50/30 dark:bg-[#0B0D10]/10'
                    : 'border-stone-100 dark:border-border bg-white dark:bg-card'
                }`}
              >
                {/* One identity row keeps the card short without narrowing the beer copy. */}
                <div className="flex items-start gap-2">
                  <div
                    draggable
                    aria-label={`Riordina ${item.beer.name}`}
                    className="min-h-11 min-w-11 cursor-grab text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-white/[0.06]"
                    style={{ touchAction: 'none' }}
                    onDragStart={e => handleDragStart(e, idx)}
                    onTouchStart={e => startTouchDrag(e, idx)}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <ImageWithFallback
                    src={(item.beer as any).imageUrl || item.beer.logoUrl}
                    alt={item.beer.name}
                    imageType="beer"
                    containerClassName="w-11 h-11 rounded-lg flex-shrink-0"
                    className="w-11 h-11 rounded-lg object-cover"
                    iconSize="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[17px] text-foreground leading-tight break-words">{item.beer.name}</h3>
                    <p className="mt-0.5 text-sm font-medium text-muted-foreground break-words">{item.beer.brewery?.name || 'Birrificio sconosciuto'}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {item.beer.style && <span className="text-xs text-muted-foreground break-words">{item.beer.style}</span>}
                      {item.beer.abv && <span className="text-xs text-muted-foreground">• {item.beer.abv}% ABV</span>}
                      {(item.beer as any).isGlutenFree && <GlutenFreeSmallBadge size={11} />}
                      {(item.beer as any).isAlcoholFree && <AlcoholFreeBadge size={10} />}
                    </div>
                  </div>
                </div>

                {/* Row 2: badges (spina, tipo, visibilità, cantina) */}
                <div className="flex flex-wrap gap-1.5 mt-1.5 ml-14">
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
                      Botte
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

                {/* Prices stay in the same compact content flow. */}
                {(item.prices && item.prices.length > 0) ? (
                  <div className="flex flex-wrap gap-2 mt-1.5 ml-14">
                    {item.prices.map((price, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-medium bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        {price.size}: €{price.price}
                      </Badge>
                    ))}
                  </div>
                ) : (item.priceSmall || item.priceMedium || item.priceLarge) ? (
                  <div className="flex flex-wrap gap-2 mt-1.5 ml-14">
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

                {item.description && (
                  <div className="mt-2">
                    <RichTextDisplay html={item.description} className="text-sm italic text-muted-foreground dark:text-stone-400" />
                  </div>
                )}

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-stone-100 pt-2 dark:border-white/[0.06]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleTapVisibility(item)}
                    aria-label={item.isVisible ? `Nascondi ${item.beer.name} dalla tap list` : `Mostra ${item.beer.name} nella tap list`}
                    className="h-11 w-11 min-w-11 p-0 text-muted-foreground hover:text-primary rounded-lg"
                  >
                    {item.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { startEdit(item); setIsAddDialogOpen(true); }}
                    aria-label={`Modifica ${item.beer.name}`}
                    className="h-11 w-11 min-w-11 p-0 text-muted-foreground hover:text-primary rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTapItem(item)}
                    aria-label={`Rimuovi ${item.beer.name} dalla tap list`}
                    className="h-11 w-11 min-w-11 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}