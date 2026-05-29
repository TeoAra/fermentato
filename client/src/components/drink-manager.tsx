import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { AllergenSelector } from "@/components/allergen-selector";
import {
  Plus, Edit3, Trash2, Eye, EyeOff, GlassWater, Loader2
} from "lucide-react";

const CATEGORIES = [
  { value: "vino",     label: "Vini",             emoji: "🍷", hasWineFields: true },
  { value: "spirits",  label: "Super Alcolici",    emoji: "🥃", hasSpiritFields: true },
  { value: "cocktail", label: "Cocktails & Drinks",emoji: "🍹" },
  { value: "bibita",   label: "Bevande & Bibite",  emoji: "🥤" },
  { value: "altro",    label: "Altro",             emoji: "🍾" },
] as const;
type Category = typeof CATEGORIES[number]["value"];

const catMeta = (v: string) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[4];

function priceLabel(cat: string) {
  if (cat === "vino" || cat === "spirits") return ["Calice (€)", "Bottiglia (€)"];
  return ["Prezzo (€)", null];
}

const EMPTY_FORM = {
  category: "vino" as Category,
  name: "",
  description: "",
  price: "",
  priceByGlass: "",
  priceByBottle: "",
  imageUrl: "",
  isVisible: true,
  isAvailable: true,
  allergens: [] as string[],
  vintage: "",
  region: "",
  grapeVariety: "",
  distillery: "",
  alcoholDegree: "",
  volumeCl: "",
};

interface DrinkManagerProps {
  pubId: number;
}

export function DrinkManager({ pubId }: DrinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pubs", String(pubId), "drinks"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/drinks/all`),
    staleTime: 0,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "drinks"] });

  const buildPayload = () => ({
    pubId,
    category: form.category,
    name: form.name,
    description: form.description || null,
    price: form.price ? parseFloat(form.price) : null,
    priceByGlass: form.priceByGlass ? parseFloat(form.priceByGlass) : null,
    priceByBottle: form.priceByBottle ? parseFloat(form.priceByBottle) : null,
    imageUrl: form.imageUrl || null,
    isVisible: form.isVisible,
    isAvailable: form.isAvailable,
    allergens: form.allergens,
    vintage: form.vintage ? parseInt(form.vintage) : null,
    region: form.region || null,
    grapeVariety: form.grapeVariety || null,
    distillery: form.distillery || null,
    alcoholDegree: form.alcoholDegree ? parseFloat(form.alcoholDegree) : null,
    volumeCl: form.volumeCl ? parseInt(form.volumeCl) : null,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editingId
        ? apiRequest(`/api/pubs/${pubId}/drinks/${editingId}`, { method: "PATCH" }, payload)
        : apiRequest(`/api/pubs/${pubId}/drinks`, { method: "POST" }, payload),
    onSuccess: () => {
      toast({ title: editingId ? "Aggiornato!" : "Aggiunto!" });
      invalidate();
      closeDialog();
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      apiRequest(`/api/pubs/${pubId}/drinks/${id}`, { method: "PATCH" }, { isVisible }),
    onMutate: async ({ id, isVisible }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/pubs", String(pubId), "drinks"] });
      queryClient.setQueryData(["/api/pubs", String(pubId), "drinks"], (old: any[]) =>
        Array.isArray(old) ? old.map(i => i.id === id ? { ...i, isVisible } : i) : old
      );
    },
    onSettled: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/drinks/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Eliminato" }); invalidate(); },
    onError: () => toast({ title: "Errore nell'eliminazione", variant: "destructive" }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      category: item.category ?? "altro",
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.price ?? "",
      priceByGlass: item.priceByGlass ?? "",
      priceByBottle: item.priceByBottle ?? "",
      imageUrl: item.imageUrl ?? "",
      isVisible: item.isVisible ?? true,
      isAvailable: item.isAvailable ?? true,
      allergens: item.allergens ?? [],
      vintage: item.vintage ? String(item.vintage) : "",
      region: item.region ?? "",
      grapeVariety: item.grapeVariety ?? "",
      distillery: item.distillery ?? "",
      alcoholDegree: item.alcoholDegree ?? "",
      volumeCl: item.volumeCl ? String(item.volumeCl) : "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Eliminare questa voce?")) return;
    deleteMutation.mutate(id);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Nome obbligatorio", variant: "destructive" }); return;
    }
    saveMutation.mutate(buildPayload());
  };

  const catObj = catMeta(form.category);
  const [label1, label2] = priceLabel(form.category);

  // Group items by category for display
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.value),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bevande</h2>
          <p className="text-sm text-muted-foreground">Vini, spirits, cocktails e bibite</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Aggiungi
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mx-auto flex items-center justify-center">
            <GlassWater className="w-8 h-8 text-white" />
          </div>
          <p className="font-semibold text-foreground">Nessuna bevanda</p>
          <p className="text-sm text-muted-foreground">Aggiungi vini, spirits, cocktails o bibite</p>
          <Button onClick={openAdd} className="gap-1.5 mt-2">
            <Plus className="w-4 h-4" /> Aggiungi prima voce
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{group.emoji}</span>
                <h3 className="font-semibold text-sm text-foreground">{group.label}</h3>
                <Badge variant="secondary" className="text-xs">{group.items.length}</Badge>
              </div>
              <div className="space-y-2">
                {group.items.map((item: any) => (
                  <Card key={item.id} className={`border transition-all ${item.isVisible ? "border-stone-100 dark:border-border" : "opacity-50 border-dashed border-stone-200 dark:border-border"}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#1A1D24] flex items-center justify-center flex-shrink-0 text-lg">
                          {catMeta(item.category).emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.vintage && <span className="text-xs text-muted-foreground">{item.vintage}</span>}
                          {item.region && <span className="text-xs text-muted-foreground">{item.region}</span>}
                          {item.grapeVariety && <span className="text-xs text-muted-foreground italic">{item.grapeVariety}</span>}
                          {item.distillery && <span className="text-xs text-muted-foreground">{item.distillery}</span>}
                          {item.priceByGlass && <span className="text-xs font-medium text-primary">🥂 €{parseFloat(item.priceByGlass).toFixed(2)}</span>}
                          {item.priceByBottle && <span className="text-xs font-medium text-foreground">🍾 €{parseFloat(item.priceByBottle).toFixed(2)}</span>}
                          {item.price && !item.priceByGlass && !item.priceByBottle && <span className="text-xs font-medium text-primary">€{parseFloat(item.price).toFixed(2)}</span>}
                          {item.alcoholDegree && <span className="text-xs text-muted-foreground">{item.alcoholDegree}%</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleMutation.mutate({ id: item.id, isVisible: !item.isVisible })}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                          title={item.isVisible ? "Nascondi" : "Mostra"}
                        >
                          {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors text-muted-foreground"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica voce" : "Aggiungi bevanda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Categoria */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Categoria</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                      form.category === cat.value
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-card border-stone-200 dark:border-border text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="leading-tight text-center">{cat.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div>
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={catObj.value === "vino" ? "es. Barolo Riserva" : catObj.value === "cocktail" ? "es. Negroni" : "Nome"}
              />
            </div>

            {/* Prezzi */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">{label1}</Label>
                <Input
                  type="number" step="0.10" min="0"
                  value={form.priceByGlass || form.price}
                  onChange={e => {
                    if (label2) setForm(f => ({ ...f, priceByGlass: e.target.value }));
                    else setForm(f => ({ ...f, price: e.target.value }));
                  }}
                  placeholder="0.00"
                />
              </div>
              {label2 && (
                <div>
                  <Label className="text-sm font-medium">{label2}</Label>
                  <Input
                    type="number" step="0.50" min="0"
                    value={form.priceByBottle}
                    onChange={e => setForm(f => ({ ...f, priceByBottle: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Gradazione (%)</Label>
                <Input
                  type="number" step="0.1" min="0" max="100"
                  value={form.alcoholDegree}
                  onChange={e => setForm(f => ({ ...f, alcoholDegree: e.target.value }))}
                  placeholder="es. 13.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Volume (cl)</Label>
                <Input
                  type="number" min="0"
                  value={form.volumeCl}
                  onChange={e => setForm(f => ({ ...f, volumeCl: e.target.value }))}
                  placeholder="es. 75"
                />
              </div>
            </div>

            {/* Campi vino */}
            {(catObj as any).hasWineFields && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Annata</Label>
                  <Input
                    type="number" min="1900" max={new Date().getFullYear()}
                    value={form.vintage}
                    onChange={e => setForm(f => ({ ...f, vintage: e.target.value }))}
                    placeholder="2021"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Regione</Label>
                  <Input
                    value={form.region}
                    onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    placeholder="es. Piemonte"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Vitigno</Label>
                  <Input
                    value={form.grapeVariety}
                    onChange={e => setForm(f => ({ ...f, grapeVariety: e.target.value }))}
                    placeholder="es. Nebbiolo, Sangiovese"
                  />
                </div>
              </div>
            )}

            {/* Campi spirits */}
            {(catObj as any).hasSpiritFields && (
              <div>
                <Label className="text-sm font-medium">Distilleria</Label>
                <Input
                  value={form.distillery}
                  onChange={e => setForm(f => ({ ...f, distillery: e.target.value }))}
                  placeholder="es. Glenfarclas"
                />
              </div>
            )}

            {/* Descrizione */}
            <div>
              <Label className="text-sm font-medium">Descrizione</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Note di degustazione, abbinamenti..."
              />
            </div>

            {/* Immagine */}
            <ImageUpload
              label="Immagine"
              currentImageUrl={form.imageUrl || undefined}
              onImageChange={url => setForm(f => ({ ...f, imageUrl: url || "" }))}
              folder="drinks"
            />

            {/* Allergeni */}
            <AllergenSelector
              selectedAllergens={form.allergens}
              onAllergensChange={a => setForm(f => ({ ...f, allergens: a }))}
            />

            {/* Visibilità */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isVisible}
                onCheckedChange={v => setForm(f => ({ ...f, isVisible: v }))}
              />
              <Label className="text-sm font-medium">Visibile al pubblico</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={closeDialog}>Annulla</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Salva" : "Aggiungi")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
