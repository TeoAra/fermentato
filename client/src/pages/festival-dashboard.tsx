import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Beer, UtensilsCrossed, BarChart3, Settings, Plus, QrCode,
  CheckCircle2, XCircle, Loader2, Pencil, Trash2, ExternalLink,
  Trophy, Users, Droplets, CreditCard, AlertCircle, RefreshCw, Lock, Star,
} from "lucide-react";
import { useLocation } from "wouter";

interface Festival {
  id: number; slug: string; name: string; description: string | null;
  location: string | null; startDate: string | null; endDate: string | null;
  isActive: boolean; showFood: boolean; ownerId: string | null;
  paidAt: string | null; stripeSessionId: string | null; priceEur: number | null;
  logoUrl: string | null; coverImageUrl: string | null;
}

function festivalStatus(f: Festival): "unpaid" | "active" | "expired" {
  if (!f.paidAt && !f.isActive) return "unpaid";
  if (f.endDate && new Date(f.endDate) < new Date()) return "expired";
  return "active";
}

interface FestivalTap {
  id: number; tapNumber: number; beerId: number | null;
  customBeerName: string | null; customBreweryName: string | null;
  style: string | null; abv: string | null; notes: string | null; isAvailable: boolean;
}

interface FoodItem {
  id: number; name: string; description: string | null;
  price: string | null; category: string | null; isAvailable: boolean;
}

interface Stats {
  totalTaps: number; availableTaps: number; totalRatings: number;
  topTaps: { tapNumber: number; beerName: string; avg: number; count: number }[];
}

// ─── QR Code modal ──────────────────────────────────────────────────────────
function QRModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const url = `${window.location.origin}/festival/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>QR Code — {name}</DialogTitle>
        </DialogHeader>
        <img src={qrUrl} alt="QR Code festival" className="mx-auto rounded-xl" />
        <p className="text-xs text-gray-500 break-all">{url}</p>
        <div className="flex gap-2 justify-center mt-2">
          <Button size="sm" variant="outline" onClick={() => window.open(qrUrl, "_blank")}>
            Scarica QR
          </Button>
          <Button size="sm" onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-1" />Anteprima
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tap row ────────────────────────────────────────────────────────────────
function TapRow({ tap, festivalId, onToggle }: {
  tap: FestivalTap; festivalId: number; onToggle: (tap: FestivalTap) => void;
}) {
  const beerName = tap.customBeerName || `Spina ${tap.tapNumber}`;
  const brewName = tap.customBreweryName;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      tap.isAvailable ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-70"
    }`}>
      <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-xs font-bold ${
        tap.isAvailable ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-400"
      }`}>
        {tap.tapNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${!tap.isAvailable ? "line-through text-gray-400" : ""}`}>
          {beerName}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {brewName && <span className="text-xs text-amber-600">{brewName}</span>}
          {tap.style && <Badge variant="secondary" className="text-xs py-0">{tap.style}</Badge>}
          {tap.abv && <span className="text-xs text-gray-500">{tap.abv}% ABV</span>}
        </div>
      </div>
      <button
        onClick={() => onToggle(tap)}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
          tap.isAvailable
            ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        }`}
        title={tap.isAvailable ? "Segna come finita" : "Ripristina"}
      >
        {tap.isAvailable ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}

// ─── Tap edit dialog ─────────────────────────────────────────────────────────
function TapEditDialog({ festivalId, tapNumber, existing, onClose }: {
  festivalId: number; tapNumber: number; existing?: FestivalTap; onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [beerQuery, setBeerQuery] = useState("");
  const [showBeerDropdown, setShowBeerDropdown] = useState(false);
  const [form, setForm] = useState({
    customBeerName: existing?.customBeerName || "",
    customBreweryName: existing?.customBreweryName || "",
    style: existing?.style || "",
    abv: existing?.abv || "",
    notes: existing?.notes || "",
    isAvailable: existing?.isAvailable ?? true,
    beerId: existing?.beerId ?? null as number | null,
  });

  const { data: beerResults = [] } = useQuery<any[]>({
    queryKey: [`/api/festival-beers/search?q=${encodeURIComponent(beerQuery)}`],
    enabled: beerQuery.length >= 2,
  });

  const selectBeer = (beer: any) => {
    setForm(f => ({
      ...f,
      beerId: beer.id,
      customBeerName: beer.name,
      customBreweryName: beer.breweryName || "",
      style: beer.style || f.style,
      abv: beer.abv != null ? String(beer.abv) : f.abv,
    }));
    setBeerQuery(beer.name);
    setShowBeerDropdown(false);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(
      `/api/admin/festivals/${festivalId}/taps/${tapNumber}`,
      { method: "PUT" },
      form
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festivalId, "taps"] });
      toast({ title: `Spina ${tapNumber} salvata` });
      onClose();
    },
    onError: () => toast({ title: "Errore nel salvataggio", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Spina #{tapNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Beer search */}
          <div>
            <Label>Cerca birra nel database</Label>
            <div className="relative mt-1">
              <Input
                value={beerQuery}
                onChange={e => { setBeerQuery(e.target.value); setShowBeerDropdown(true); }}
                onFocus={() => setShowBeerDropdown(true)}
                placeholder="Cerca per nome o birrificio…"
              />
              {showBeerDropdown && beerResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {beerResults.map((b: any) => (
                    <button
                      key={b.id}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      onClick={() => selectBeer(b)}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.breweryName}{b.style ? ` · ${b.style}` : ""}{b.abv != null ? ` · ${b.abv}%` : ""}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <Label>Nome birra</Label>
            <Input className="mt-1" value={form.customBeerName} onChange={e => setForm(f => ({ ...f, customBeerName: e.target.value, beerId: null }))} placeholder="Es. Hazy IPA" />
          </div>
          <div>
            <Label>Birrificio</Label>
            <Input className="mt-1" value={form.customBreweryName} onChange={e => setForm(f => ({ ...f, customBreweryName: e.target.value }))} placeholder="Es. Birrificio Pinco" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stile</Label>
              <Input className="mt-1" value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} placeholder="Es. IPA" />
            </div>
            <div>
              <Label>ABV %</Label>
              <Input className="mt-1" value={form.abv} onChange={e => setForm(f => ({ ...f, abv: e.target.value }))} placeholder="Es. 6.2" />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea className="mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note aggiuntive..." rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isAvailable} onCheckedChange={v => setForm(f => ({ ...f, isAvailable: v }))} />
            <Label>{form.isAvailable ? "Disponibile" : "Non disponibile / Finita"}</Label>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create festival dialog ──────────────────────────────────────────────────
function FestivalForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
  isAdmin = false,
}: {
  initial: Partial<{
    name: string; slug: string; description: string; location: string;
    startDate: string; endDate: string; showFood: boolean;
    logoUrl: string; coverImageUrl: string; priceEur: number;
  }>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  submitLabel: string;
  isAdmin?: boolean;
}) {
  const [form, setForm] = useState({
    name: initial.name || "",
    slug: initial.slug || "",
    description: initial.description || "",
    location: initial.location || "",
    startDate: initial.startDate || "",
    endDate: initial.endDate || "",
    showFood: initial.showFood ?? true,
    logoUrl: initial.logoUrl || "",
    coverImageUrl: initial.coverImageUrl || "",
    priceEur: initial.priceEur ?? 50,
  });
  const [slugEdited, setSlugEdited] = useState(!!initial.slug);

  const suggestSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="space-y-4">
      {/* Logo */}
      <ImageUpload
        label="Logo festival"
        description="Icona quadrata (400×400px)"
        currentImageUrl={form.logoUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, logoUrl: url || "" }))}
        folder="festivals/logos"
        aspectRatio="square"
        recommendedDimensions="400×400px"
      />
      {/* Copertina */}
      <ImageUpload
        label="Immagine di copertina"
        description="Banner orizzontale (1200×400px)"
        currentImageUrl={form.coverImageUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, coverImageUrl: url || "" }))}
        folder="festivals/covers"
        aspectRatio="landscape"
        recommendedDimensions="1200×400px"
      />

      <Separator />

      {/* Nome */}
      <div>
        <Label>Nome *</Label>
        <Input
          className="mt-1"
          value={form.name}
          onChange={e => {
            const name = e.target.value;
            setForm(f => ({ ...f, name, slug: slugEdited ? f.slug : suggestSlug(name) }));
          }}
          placeholder="Es. Roma Beer Fest 2026"
        />
      </div>

      {/* Slug */}
      <div>
        <Label>URL pubblico (slug) *</Label>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">/festival/</span>
          <Input
            value={form.slug}
            onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value })); }}
            placeholder="roma-beer-fest-2026"
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">URL pubblico del taplist QR</p>
      </div>

      {/* Location con Google */}
      <div>
        <Label>Location</Label>
        <div className="mt-1">
          <AddressAutocomplete
            value={form.location}
            onAddressSelect={d => setForm(f => ({ ...f, location: d.formattedAddress }))}
            placeholder="Es. Parco della Musica, Roma"
            countryRestriction={null}
          />
        </div>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data inizio</Label>
          <Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>Data fine</Label>
          <Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Descrizione */}
      <div>
        <Label>Descrizione</Label>
        <Textarea className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Breve descrizione mostrata sul taplist pubblico" />
      </div>

      {/* Admin: prezzo + food */}
      <div className="flex items-center gap-3">
        <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
        <Label>Menu cibo visibile ai visitatori</Label>
      </div>
      {isAdmin && (
        <div>
          <Label>Prezzo attivazione (€)</Label>
          <Input
            className="mt-1"
            type="number" min="0" step="1"
            value={form.priceEur}
            onChange={e => setForm(f => ({ ...f, priceEur: parseInt(e.target.value) || 0 }))}
          />
        </div>
      )}

      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
        onClick={() => onSubmit(form)}
        disabled={isPending || !form.name || !form.slug}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

function CreateFestivalDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (f: Festival) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/festivals", { method: "POST" }, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival creato! Ora completa il pagamento per attivarlo." });
      onCreated(data);
      onClose();
    },
    onError: (err: any) => toast({ title: err?.message || "Errore", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crea nuovo festival</DialogTitle></DialogHeader>
        <FestivalForm
          initial={{}}
          onSubmit={data => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          submitLabel="Crea festival"
          isAdmin={true}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────
export default function FestivalDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [selectedFestId, setSelectedFestId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTap, setEditingTap] = useState<{ tapNumber: number; existing?: FestivalTap } | null>(null);
  const [bulkCount, setBulkCount] = useState("20");
  const [newFood, setNewFood] = useState({ name: "", description: "", price: "", category: "Cibo" });
  const [activeTab, setActiveTab] = useState("taps");

  // List of managed festivals
  const { data: festList = [], isLoading: listLoading } = useQuery<Festival[]>({
    queryKey: ["/api/admin/festivals"],
    queryFn: () => apiRequest("/api/admin/festivals"),
    enabled: isAuthenticated,
  });

  const selectedFest = festList.find(f => f.id === selectedFestId) ?? festList[0] ?? null;
  const festId = selectedFest?.id ?? null;

  // Taps for selected festival
  const { data: taps = [], isLoading: tapsLoading } = useQuery<FestivalTap[]>({
    queryKey: ["/api/admin/festivals", festId, "taps"],
    queryFn: async () => {
      const data = await fetch(`/api/festivals/${selectedFest!.slug}`, { credentials: "include" }).then(r => r.json());
      return data.taps || [];
    },
    enabled: !!selectedFest,
  });

  // Food for selected festival
  const { data: food = [] } = useQuery<FoodItem[]>({
    queryKey: ["/api/admin/festivals", festId, "food"],
    queryFn: () => apiRequest(`/api/admin/festivals/${festId}/food`),
    enabled: !!festId,
  });

  // Stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/festivals", festId, "stats"],
    queryFn: () => apiRequest(`/api/admin/festivals/${festId}/stats`),
    enabled: !!festId && activeTab === "stats",
    refetchInterval: 60000,
  });

  // Toggle tap availability
  const toggleMutation = useMutation({
    mutationFn: (tap: FestivalTap) => apiRequest(`/api/admin/festivals/${festId}/taps/${tap.id}/toggle`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "taps"] }),
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  // Bulk create taps
  const bulkMutation = useMutation({
    mutationFn: () => apiRequest(`/api/admin/festivals/${festId}/taps/bulk`, { method: "POST" }, { count: parseInt(bulkCount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "taps"] });
      toast({ title: `${bulkCount} spine create` });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  // Add food item
  const addFoodMutation = useMutation({
    mutationFn: () => apiRequest(`/api/admin/festivals/${festId}/food`, { method: "POST" }, newFood),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] });
      setNewFood({ name: "", description: "", price: "", category: "Cibo" });
      toast({ title: "Voce aggiunta" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  // Toggle food availability
  const toggleFoodMutation = useMutation({
    mutationFn: (item: FoodItem) => apiRequest(`/api/admin/festivals/food/${item.id}`, { method: "PATCH" }, { isAvailable: !item.isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] }),
  });

  // Delete food item
  const deleteFoodMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/festivals/food/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] }),
  });

  // Update festival info
  const updateFestMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/admin/festivals/${festId}`, { method: "PUT" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival aggiornato!" });
    },
    onError: (err: any) => toast({ title: err?.message || "Errore nel salvataggio", variant: "destructive" }),
  });

  // Stripe: checkout per festival
  const checkoutMutation = useMutation({
    mutationFn: ({ festivalId, isRenewal }: { festivalId: number; isRenewal?: boolean }) =>
      apiRequest("/api/stripe/festival-checkout", { method: "POST" }, { festivalId, isRenewal }),
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: () => toast({ title: "Errore nel pagamento", variant: "destructive" }),
  });

  // Admin: attivazione gratuita
  const adminActivateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/festivals/${id}/activate-free`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival attivato gratuitamente!" });
    },
    onError: () => toast({ title: "Errore nell'attivazione", variant: "destructive" }),
  });

  // Delete festival
  const deleteFestMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/festivals/${id}`, { method: "DELETE" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: data?.message || "Festival eliminato" });
      setSelectedFestId(null);
    },
    onError: (err: any) => toast({ title: err?.message || "Errore nell'eliminazione", variant: "destructive" }),
  });

  // Stripe: attivazione post-pagamento
  const activateMutation = useMutation({
    mutationFn: ({ sessionId, festivalId }: { sessionId: string; festivalId: number }) =>
      apiRequest("/api/stripe/activate-festival", { method: "POST" }, { sessionId, festivalId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival attivato!", description: "Il pagamento è andato a buon fine." });
      // Clean URL
      window.history.replaceState({}, "", "/festival-dashboard" + (festId ? `?festival_id=${festId}` : ""));
    },
    onError: () => toast({ title: "Errore nell'attivazione", variant: "destructive" }),
  });

  // Handle checkout_success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("checkout_success");
    const sessionId = params.get("session_id");
    const paramFestId = params.get("festival_id");
    if (success === "1" && sessionId && paramFestId) {
      activateMutation.mutate({ sessionId, festivalId: parseInt(paramFestId) });
      if (paramFestId) setSelectedFestId(parseInt(paramFestId));
    } else if (paramFestId) {
      setSelectedFestId(parseInt(paramFestId));
    }
  }, []);

  const status = selectedFest ? festivalStatus(selectedFest) : null;

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Beer className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Accedi per gestire i festival</p>
        <Button className="mt-3" onClick={() => navigate("/")}>Vai alla home</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Beer className="h-6 w-6" />Festival Dashboard
            </h1>
            <p className="text-amber-100 text-sm">Gestisci spine, cibo e valutazioni in tempo reale</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedFest && (
              <>
                <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => setShowQR(true)}>
                  <QrCode className="h-4 w-4 mr-1" />QR Code
                </Button>
                <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => window.open(`/festival/${selectedFest.slug}`, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" />Anteprima
                </Button>
              </>
            )}
            <Button size="sm" className="bg-white text-amber-700 hover:bg-amber-50"
              onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuovo festival
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Festival selector */}
        {listLoading ? (
          <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Caricamento...</div>
        ) : festList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <Beer className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-gray-600">Nessun festival ancora</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                  <a href="/crea-festival"><Plus className="h-4 w-4 mr-1" />Crea il tuo festival</a>
                </Button>
                {user?.userType === 'admin' && (
                  <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />Crea (admin)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Festival tabs selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap flex-1">
                {festList.map(f => {
                  const s = festivalStatus(f);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFestId(f.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                        (selectedFest?.id === f.id)
                          ? "bg-amber-500 text-white shadow"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50"
                      }`}
                    >
                      {f.name}
                      {s === "unpaid" && <Lock className="h-3 w-3 opacity-70" />}
                      {s === "expired" && <AlertCircle className="h-3 w-3 opacity-70" />}
                    </button>
                  );
                })}
              </div>
              {selectedFest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteFestMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />Elimina
                </Button>
              )}
            </div>

            {/* Delete confirmation dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare il festival?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per eliminare <strong>{selectedFest?.name}</strong>. Verranno eliminati definitivamente tutte le spine, il menu cibo e le valutazioni. Questa azione è irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => { if (selectedFest) deleteFestMutation.mutate(selectedFest.id); }}
                  >
                    Elimina definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {selectedFest && (
              <>
                {/* Payment banner for unpaid festivals */}
                {status === "unpaid" && (
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                    <CardContent className="py-6 text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40">
                        <CreditCard className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Attiva il festival con il pagamento</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Per rendere il taplist pubblico e raccogliere valutazioni è necessario il pagamento una tantum.
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-amber-600">€{selectedFest.priceEur ?? 99}</div>
                      <div className="text-xs text-gray-500">Pagamento unico · accesso per tutta la durata del festival</div>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button
                          size="lg"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => checkoutMutation.mutate({ festivalId: selectedFest.id })}
                          disabled={checkoutMutation.isPending}
                        >
                          {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                          Paga e attiva · €{selectedFest.priceEur ?? 50}
                        </Button>
                        {user?.userType === "admin" && (
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => adminActivateMutation.mutate(selectedFest.id)}
                            disabled={adminActivateMutation.isPending}
                          >
                            {adminActivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Attiva gratis (admin)
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">Puoi configurare spine e menu anche ora, ma il QR sarà pubblico solo dopo il pagamento.</p>
                    </CardContent>
                  </Card>
                )}

                {/* Expired banner */}
                {status === "expired" && (
                  <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
                    <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-red-400 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Festival terminato</h3>
                          <p className="text-sm text-gray-500">Il festival è scaduto il {selectedFest.endDate ? new Date(selectedFest.endDate).toLocaleDateString("it-IT") : "—"}. Rinnova per riattivarlo.</p>
                        </div>
                      </div>
                      <Button
                        className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
                        onClick={() => checkoutMutation.mutate({ festivalId: selectedFest.id, isRenewal: true })}
                        disabled={checkoutMutation.isPending}
                      >
                        {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Rinnova · €{selectedFest.priceEur ?? 99}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Spine totali", value: taps.length, icon: Beer },
                    { label: "Disponibili", value: taps.filter(t => t.isAvailable).length, icon: CheckCircle2 },
                    { label: "Voti ricevuti", icon: Star, value: stats?.totalRatings ?? "—" },
                  ].map(({ label, value, icon: Icon }) => (
                    <Card key={label}>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">{value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Main tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="taps" className="flex-1 gap-1"><Beer className="h-4 w-4" />Spine</TabsTrigger>
                    <TabsTrigger value="food" className="flex-1 gap-1"><UtensilsCrossed className="h-4 w-4" />Cibo</TabsTrigger>
                    <TabsTrigger value="stats" className="flex-1 gap-1"><BarChart3 className="h-4 w-4" />Classifiche</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1 gap-1"><Settings className="h-4 w-4" />Info</TabsTrigger>
                  </TabsList>

                  {/* TAPS tab */}
                  <TabsContent value="taps" className="space-y-4">
                    {status === "expired" ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center text-gray-500 space-y-2">
                          <Lock className="h-8 w-8 mx-auto text-gray-300" />
                          <p className="font-medium">Festival terminato</p>
                          <p className="text-sm">Le spine non sono più modificabili. Rinnova il festival per riattivarlo.</p>
                        </CardContent>
                      </Card>
                    ) : taps.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center space-y-3">
                          <Beer className="h-8 w-8 text-gray-300 mx-auto" />
                          <p className="text-gray-500">Nessuna spina configurata</p>
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number" value={bulkCount} min="1" max="200"
                              onChange={e => setBulkCount(e.target.value)}
                              className="w-20 text-center"
                            />
                            <Button onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending}>
                              {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                              Crea {bulkCount} spine
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {taps.filter(t => t.isAvailable).length} di {taps.length} disponibili
                          </p>
                          <Button size="sm" variant="outline" onClick={() => setEditingTap({ tapNumber: taps.length + 1 })}>
                            <Plus className="h-4 w-4 mr-1" />Aggiungi spina
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taps.map(tap => (
                            <div key={tap.id} className="relative group">
                              <TapRow tap={tap} festivalId={festId!} onToggle={t => toggleMutation.mutate(t)} />
                              <button
                                onClick={() => setEditingTap({ tapNumber: tap.tapNumber, existing: tap })}
                                className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-amber-600"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* FOOD tab */}
                  <TabsContent value="food" className="space-y-4">
                    {status === "expired" ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center text-gray-500 space-y-2">
                          <Lock className="h-8 w-8 mx-auto text-gray-300" />
                          <p className="font-medium">Festival terminato</p>
                          <p className="text-sm">Il menu non è più modificabile. Rinnova il festival per riattivarlo.</p>
                        </CardContent>
                      </Card>
                    ) : (
                    <>
                    {/* Add food form */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Aggiungi voce menu</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Nome *</Label>
                            <Input value={newFood.name} onChange={e => setNewFood(f => ({ ...f, name: e.target.value }))} placeholder="Es. Panino al pulled pork" />
                          </div>
                          <div>
                            <Label>Categoria</Label>
                            <Select value={newFood.category} onValueChange={v => setNewFood(f => ({ ...f, category: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cibo">Cibo</SelectItem>
                                <SelectItem value="Bevande">Bevande</SelectItem>
                                <SelectItem value="Dolci">Dolci</SelectItem>
                                <SelectItem value="Snack">Snack</SelectItem>
                                <SelectItem value="Panini">Panini</SelectItem>
                                <SelectItem value="Altro">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Descrizione</Label>
                            <Input value={newFood.description} onChange={e => setNewFood(f => ({ ...f, description: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Prezzo (€)</Label>
                            <Input type="number" step="0.50" value={newFood.price} onChange={e => setNewFood(f => ({ ...f, price: e.target.value }))} placeholder="8.00" />
                          </div>
                        </div>
                        <Button onClick={() => addFoodMutation.mutate()} disabled={!newFood.name || addFoodMutation.isPending} size="sm">
                          {addFoodMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                          Aggiungi
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Food list */}
                    <div className="space-y-2">
                      {food.length === 0 ? (
                        <p className="text-center text-gray-500 py-6">Nessuna voce nel menu</p>
                      ) : food.map(item => (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border ${item.isAvailable ? "border-gray-200 dark:border-gray-700" : "border-gray-100 opacity-60"}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${!item.isAvailable ? "line-through text-gray-400" : ""}`}>{item.name}</span>
                              {item.category && <Badge variant="secondary" className="text-xs py-0">{item.category}</Badge>}
                            </div>
                            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                          </div>
                          {item.price && <span className="font-bold text-amber-600 text-sm">€{parseFloat(item.price).toFixed(2)}</span>}
                          <button onClick={() => toggleFoodMutation.mutate(item)} className="p-1 rounded text-gray-400 hover:text-amber-600 transition-colors">
                            {item.isAvailable ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-400" />}
                          </button>
                          <button onClick={() => deleteFoodMutation.mutate(item.id)} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    </>
                    )}
                  </TabsContent>

                  {/* STATS tab */}
                  <TabsContent value="stats" className="space-y-4">
                    {!stats ? (
                      <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" /></div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <Card><CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.availableTaps}/{stats.totalTaps}</div>
                            <div className="text-xs text-gray-500">Spine disponibili</div>
                          </CardContent></Card>
                          <Card><CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.totalRatings}</div>
                            <div className="text-xs text-gray-500">Voti totali</div>
                          </CardContent></Card>
                          <Card><CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">
                              {stats.topTaps[0]?.avg.toFixed(1) ?? "—"}
                            </div>
                            <div className="text-xs text-gray-500">Miglior media</div>
                          </CardContent></Card>
                        </div>

                        <Card>
                          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-amber-500" />Top 10 birre più votate</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {stats.topTaps.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-4">Ancora nessun voto</p>
                            ) : stats.topTaps.map((t, i) => (
                              <div key={t.tapNumber} className="flex items-center gap-3">
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                                  i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-500"
                                }`}>{i + 1}</span>
                                <div className="flex-1">
                                  <span className="text-sm font-medium">{t.beerName}</span>
                                  <span className="text-xs text-gray-500 ml-1">(spina #{t.tapNumber})</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-amber-600">{t.avg.toFixed(1)}</div>
                                  <div className="text-xs text-gray-400">{t.count} vot{t.count === 1 ? "o" : "i"}</div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </TabsContent>

                  {/* SETTINGS tab */}
                  <TabsContent value="settings" className="space-y-4">
                    {/* Quick info + links */}
                    <Card>
                      <CardContent className="p-4 flex flex-wrap gap-2 items-center">
                        <Badge variant={selectedFest.isActive ? "default" : "secondary"}>
                          {status === "unpaid" ? "Non pagato" : status === "expired" ? "Scaduto" : "Attivo"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/festival/${selectedFest.slug}`, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-1" />Pagina pubblica
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowQR(true)}>
                          <QrCode className="h-4 w-4 mr-1" />QR Code
                        </Button>
                        <code className="text-xs text-gray-400 ml-auto">/festival/{selectedFest.slug}</code>
                      </CardContent>
                    </Card>

                    {/* Edit form */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Modifica festival</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FestivalForm
                          key={selectedFest.id}
                          initial={{
                            name: selectedFest.name,
                            slug: selectedFest.slug,
                            description: selectedFest.description || "",
                            location: selectedFest.location || "",
                            startDate: selectedFest.startDate || "",
                            endDate: selectedFest.endDate || "",
                            showFood: selectedFest.showFood,
                            logoUrl: selectedFest.logoUrl || "",
                            coverImageUrl: selectedFest.coverImageUrl || "",
                            priceEur: selectedFest.priceEur ?? 99,
                          }}
                          onSubmit={data => updateFestMutation.mutate(data)}
                          isPending={updateFestMutation.isPending}
                          submitLabel="Salva modifiche"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateDialog && (
        <CreateFestivalDialog onClose={() => setShowCreateDialog(false)} onCreated={f => setSelectedFestId(f.id)} />
      )}
      {showQR && selectedFest && (
        <QRModal slug={selectedFest.slug} name={selectedFest.name} onClose={() => setShowQR(false)} />
      )}
      {editingTap && festId && (
        <TapEditDialog
          festivalId={festId}
          tapNumber={editingTap.tapNumber}
          existing={editingTap.existing}
          onClose={() => setEditingTap(null)}
        />
      )}
    </div>
  );
}
