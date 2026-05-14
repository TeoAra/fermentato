import { useState, useEffect, useMemo, useRef } from "react";
import { useChromecast } from "@/hooks/useChromecast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/image-upload";
import { RichTextEditor } from "@/components/RichTextEditor";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Beer, UtensilsCrossed, BarChart3, Settings, Plus, QrCode,
  CheckCircle2, XCircle, Loader2, Pencil, Trash2, ExternalLink,
  Trophy, Users, Droplets, CreditCard, AlertCircle, RefreshCw, Lock, Star,
  X, Search, ChevronDown, Clock, Monitor, Copy, Heart, MessageSquare, Reply, Send, Tv,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLocation } from "wouter";
import { PageContainer } from "@/components/layout/page-container";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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

type ScheduleSlot = { label: string; date?: string; openFrom: string; openTo: string };

interface Festival {
  id: number; slug: string; name: string; description: string | null;
  location: string | null; startDate: string | null; endDate: string | null;
  isActive: boolean; showFood: boolean; ownerId: string | null;
  paidAt: string | null; stripeSessionId: string | null; priceEur: number | null;
  logoUrl: string | null; coverImageUrl: string | null;
  schedule: ScheduleSlot[] | null;
  useTokens: boolean | null; tokenName: string | null;
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
  tapType: string | null;
  beerName: string | null; beerStyle: string | null; beerAbv: string | null;
  beerImageUrl: string | null; breweryId: number | null; breweryName: string | null;
  breweryLogoUrl: string | null; prices: Record<string, number> | null;
}

interface FoodItem {
  id: number; name: string; description: string | null;
  price: string | null; category: string | null; isAvailable: boolean;
  allergens: string[] | null;
}

interface Stats {
  totalTaps: number; availableTaps: number; totalRatings: number;
  topTaps: { tapNumber: number; beerName: string; avg: number; count: number }[];
}

// ─── TV Mode button ─────────────────────────────────────────────────────────
function TVModeButton({ slug, festivalName }: { slug: string; festivalName?: string }) {
  const tvUrl = `${window.location.origin}/festival-tv/${slug}`;
  const { toast } = useToast();
  const { castState, deviceName, castToTV, stopCasting, isAvailable, isConnected } = useChromecast();
  const isIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  const airplayVideoRef = useRef<HTMLVideoElement | null>(null);
  const [airplayAvailable, setAirplayAvailable] = useState(false);

  useEffect(() => {
    if (!isIos) return;
    const video = document.createElement("video");
    video.setAttribute("x-webkit-airplay", "allow");
    video.setAttribute("playsinline", "");
    video.muted = true;
    video.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    airplayVideoRef.current = video;
    const onAvail = (e: Event) => setAirplayAvailable((e as any).availability === "available");
    video.addEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
    return () => {
      video.removeEventListener("webkitplaybacktargetavailabilitychanged", onAvail);
      if (document.body.contains(video)) document.body.removeChild(video);
      airplayVideoRef.current = null;
    };
  }, [isIos]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`border-white/30 text-white hover:bg-white/30 gap-1.5 ${
            isConnected
              ? "bg-green-500/30 border-green-300/50"
              : "bg-white/20"
          }`}
        >
          <Monitor className="h-4 w-4" />
          {isConnected ? `TV • ${deviceName}` : "TV Mode"}
          {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-amber-600" />
            Festival TV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Stato streaming corrente */}
          {isConnected && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300 flex-1">
                In streaming su <strong>{deviceName}</strong>
              </span>
              <button
                onClick={stopCasting}
                className="text-xs text-red-500 hover:text-red-700 font-medium underline"
              >
                Interrompi
              </button>
            </div>
          )}

          {castState === "no_devices" && !isIos && (
            <p className="text-xs text-muted-foreground text-center">
              Nessun Chromecast trovato — verifica la rete WiFi
            </p>
          )}

          {/* AirPlay: sempre visibile su iOS native */}
          {isIos && (
            <Button
              variant="outline"
              className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
              onClick={() => {
                const video = airplayVideoRef.current;
                if (video && (video as any).webkitShowPlaybackTargetPicker) {
                  (video as any).webkitShowPlaybackTargetPicker();
                } else {
                  window.open(tvUrl, "_blank");
                }
              }}
            >
              <Tv className="h-4 w-4" />
              {airplayAvailable ? "AirPlay su Apple TV" : "Apri festival su TV"}
            </Button>
          )}

          {/* URL TV */}
          <div className="flex items-center gap-2 bg-stone-50 dark:bg-[#15202B]/50 border rounded-xl p-3">
            <span className="text-xs text-muted-foreground break-all flex-1 font-mono">{tvUrl}</span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => { navigator.clipboard.writeText(tvUrl); toast({ title: "URL copiato!" }); }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Pulsante Trasmetti / Aggiorna */}
          {!isConnected ? (
            <Button
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-5 text-base disabled:opacity-60"
              disabled={castState === "connecting"}
              onClick={async () => {
                const ok = await castToTV(tvUrl, `Festival — ${festivalName || slug}`);
                if (ok) {
                  toast({ title: `Festival LIVE su ${deviceName || "TV"}!`, description: "Si aggiorna in tempo reale" });
                } else if (castState === "unavailable") {
                  window.open(tvUrl, "_blank");
                  toast({ title: "Pagina TV aperta", description: "Usa il menu Cast di Chrome (⋮ → Trasmetti)" });
                }
              }}
            >
              <Monitor className="h-4 w-4" />
              {castState === "connecting"
                ? "Connessione in corso…"
                : isAvailable
                ? "Trasmetti su Chromecast"
                : "Trasmetti su TV"}
            </Button>
          ) : (
            <Button
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-5 text-base"
              onClick={async () => {
                const ok = await castToTV(tvUrl, `Festival — ${festivalName || slug}`);
                if (ok) toast({ title: "Festival aggiornato sulla TV!" });
              }}
            >
              <Monitor className="h-4 w-4" />
              Aggiorna su {deviceName}
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.open(tvUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Apri in nuova scheda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── QR Code modal ──────────────────────────────────────────────────────────
function QRModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const appBase = import.meta.env.VITE_APP_URL || "https://fermenta.to";
  const url = `${appBase}/festival/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>QR Code — {name}</DialogTitle>
        </DialogHeader>
        <img src={qrUrl} alt="QR Code festival" className="mx-auto rounded-xl" />
        <p className="text-xs text-muted-foreground break-all">{url}</p>
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
function TapRow({ tap, festivalId, onToggle, onDelete, onEdit }: {
  tap: FestivalTap; festivalId: number;
  onToggle: (tap: FestivalTap) => void;
  onDelete: (tap: FestivalTap) => void;
  onEdit: (tap: FestivalTap) => void;
}) {
  const beerName = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
  const brewName = tap.breweryName || tap.customBreweryName;
  const style = tap.beerStyle || tap.style;
  const abv = tap.beerAbv || tap.abv;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      tap.isAvailable ? "bg-white dark:bg-[#1B2735] border-gray-200 dark:border-[#2F3D4D]" : "bg-stone-50 dark:bg-[#15202B] border-gray-100 dark:border-[#2F3D4D] opacity-70"
    }`}>
      <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-xs font-bold ${
        tap.isAvailable ? "bg-amber-100 text-amber-700" : "bg-stone-200 text-stone-400"
      }`}>
        {tap.tapNumber}
      </div>

      {/* Beer image or brewery logo */}
      {(tap.beerImageUrl || tap.breweryLogoUrl) && (
        <img src={tap.beerImageUrl || tap.breweryLogoUrl!} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-[#2F3D4D]" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-semibold truncate ${!tap.isAvailable ? "line-through text-stone-400" : ""}`}>
            {beerName}
          </p>
          {tap.tapType === "pompa" && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0 rounded-full shrink-0">pompa</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {brewName && <span className="text-xs text-amber-600 dark:text-amber-400 truncate max-w-[120px]">{brewName}</span>}
          {style && <Badge variant="secondary" className="text-xs py-0">{style}</Badge>}
          {abv && <span className="text-xs text-muted-foreground">{abv}%</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(tap)}
          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          title="Modifica spina"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onToggle(tap)}
          className={`p-1.5 rounded-lg transition-colors ${
            tap.isAvailable
              ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
          title={tap.isAvailable ? "Segna come finita" : "Ripristina"}
        >
          {tap.isAvailable ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onDelete(tap)}
          className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Elimina spina"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


// ─── Price row for multiple sizes ────────────────────────────────────────────
const PRESET_SIZES = ["20cl", "33cl", "40cl", "50cl", "Pompino", "Pinta", "Bottiglia"];

type PriceRow = { size: string; price: string };

function PriceRowsEditor({ rows, onChange }: { rows: PriceRow[]; onChange: (r: PriceRow[]) => void }) {
  const addRow = () => onChange([...rows, { size: "", price: "" }]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<PriceRow>) =>
    onChange(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Prezzi per misura</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 text-xs px-2" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" />Aggiungi
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-stone-400">Nessun prezzo impostato</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              className="h-8 text-sm"
              placeholder="Misura (es. 40cl)"
              value={row.size}
              onChange={e => updateRow(i, { size: e.target.value })}
              list={`sizes-${i}`}
            />
            <datalist id={`sizes-${i}`}>
              {PRESET_SIZES.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              className="h-8 text-sm w-20"
              type="number"
              step="0.50"
              min="0"
              placeholder="0.00"
              value={row.price}
              onChange={e => updateRow(i, { price: e.target.value })}
            />
          </div>
          <button type="button" onClick={() => removeRow(i)} className="text-stone-400 hover:text-red-500 p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Tap edit dialog ─────────────────────────────────────────────────────────
function TapEditDialog({ festivalId, tapNumber, existing, onClose }: {
  festivalId: number; tapNumber: number; existing?: FestivalTap; onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [selectedBeer, setSelectedBeer] = useState<{
    id: number; name: string; breweryName: string; style: string; abv: string; imageUrl: string;
  } | null>(existing?.beerId ? {
    id: existing.beerId,
    name: existing.beerName || existing.customBeerName || "",
    breweryName: existing.breweryName || existing.customBreweryName || "",
    style: existing.beerStyle || existing.style || "",
    abv: existing.beerAbv || existing.abv || "",
    imageUrl: existing.beerImageUrl || "",
  } : null);

  const [form, setForm] = useState({
    notes: existing?.notes || "",
    isAvailable: existing?.isAvailable ?? true,
    tapType: existing?.tapType || "spina",
  });

  const existingPrices: PriceRow[] = existing?.prices && typeof existing.prices === "object"
    ? Object.entries(existing.prices as Record<string, number>).map(([size, price]) => ({ size, price: String(price) }))
    : [];
  const [priceRows, setPriceRows] = useState<PriceRow[]>(existingPrices);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return null;
      const r = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" });
      if (!r.ok) throw new Error("Search failed");
      return r.json();
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(
      `/api/admin/festivals/${festivalId}/taps/${tapNumber}`,
      { method: "PUT" },
      {
        beerId: selectedBeer && selectedBeer.id > 0 ? selectedBeer.id : null,
        customBeerName: selectedBeer?.name || null,
        customBreweryName: selectedBeer?.breweryName || null,
        style: selectedBeer?.style || null,
        abv: selectedBeer?.abv || null,
        notes: form.notes || null,
        isAvailable: form.isAvailable,
        tapType: form.tapType,
        prices: priceRows,
      }
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spina #{tapNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Beer selected */}
          {selectedBeer ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedBeer.imageUrl ? (
                    <img src={selectedBeer.imageUrl} alt={selectedBeer.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-amber-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Beer className="h-6 w-6 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{selectedBeer.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedBeer.breweryName}{selectedBeer.style ? ` · ${selectedBeer.style}` : ""}{selectedBeer.abv ? ` · ${selectedBeer.abv}% ABV` : ""}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedBeer(null); setSearchTerm(""); }}>Cambia</Button>
              </div>
            </div>
          ) : (
            /* Beer search */
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cerca birra nel database</Label>
              <div className="relative">
                {isSearching
                  ? <Loader2 className="absolute left-3 top-3 h-4 w-4 text-stone-400 animate-spin" />
                  : <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />}
                <Input
                  className="pl-10"
                  placeholder="Cerca per nome o birrificio…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {debouncedSearch.length >= 2 && !isSearching && (
                <>
                  {searchResults?.beers && searchResults.beers.length > 0 && (
                    <div className="max-h-52 overflow-y-auto border rounded-xl bg-white dark:bg-[#15202B]">
                      {searchResults.beers.map((beer: any) => (
                        <div
                          key={beer.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            const bName = beer.brewery?.name || "";
                            setSelectedBeer({ id: beer.id, name: beer.name, breweryName: bName, style: beer.style || "", abv: beer.abv || "", imageUrl: beer.imageUrl || "" });
                            setSearchTerm("");
                          }}
                        >
                          {beer.imageUrl ? (
                            <img src={beer.imageUrl} alt={beer.name} className="w-9 h-9 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              <Beer className="h-4 w-4 text-amber-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{beer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{beer.brewery?.name || "Birrificio sconosciuto"}{beer.style ? ` · ${beer.style}` : ""}{beer.abv ? ` · ${beer.abv}% ABV` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults?.beers?.length === 0 && (
                    <div className="border border-dashed rounded-xl p-3 text-center space-y-1.5">
                      <p className="text-xs text-muted-foreground">Nessuna birra trovata per "{debouncedSearch}"</p>
                      <p className="text-xs text-stone-400">Se la birra non è ancora nel database, aggiungila prima dalla sezione birrificio.</p>
                    </div>
                  )}
                </>
              )}
              {debouncedSearch.length < 2 && (
                <p className="text-xs text-stone-400">Digita almeno 2 caratteri per cercare</p>
              )}
            </div>
          )}

          <Separator />

          {/* Note */}
          <div>
            <Label className="text-xs">Note</Label>
            <Textarea className="mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note aggiuntive visibili sul taplist…" rows={2} />
          </div>

          {/* Tipo erogazione */}
          <div>
            <Label className="text-xs mb-1 block">Tipo erogazione</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, tapType: "spina" }))}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${form.tapType === "spina" ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 text-muted-foreground hover:border-amber-300"}`}>
                🍺 In spina
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, tapType: "pompa" }))}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${form.tapType === "pompa" ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 text-muted-foreground hover:border-amber-300"}`}>
                🍵 In pompa
              </button>
            </div>
          </div>

          {/* Prices */}
          <PriceRowsEditor rows={priceRows} onChange={setPriceRows} />

          {/* Disponibilità */}
          <div className="flex items-center gap-3">
            <Switch checked={form.isAvailable} onCheckedChange={v => setForm(f => ({ ...f, isAvailable: v }))} />
            <Label className="text-sm">{form.isAvailable ? "Disponibile" : "Non disponibile / Finita"}</Label>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva spina"}
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
    schedule: ScheduleSlot[];
    useTokens: boolean; tokenName: string;
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
    useTokens: initial.useTokens ?? false,
    tokenName: initial.tokenName || "token",
  });
  const [slugEdited, setSlugEdited] = useState(!!initial.slug);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(initial.schedule ?? []);

  // Auto-fill schedule when startDate/endDate change
  useEffect(() => {
    if (!form.startDate || !form.endDate) return;
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(form.endDate + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;
    // Preserve existing hours by date
    const byDate: Record<string, { openFrom: string; openTo: string }> = {};
    for (const s of schedule) {
      if (s.date) byDate[s.date] = { openFrom: s.openFrom, openTo: s.openTo };
    }
    // Manual slots (no date) stay at the bottom
    const manual = schedule.filter(s => !s.date);
    const auto: ScheduleSlot[] = [];
    const d = new Date(start);
    let count = 0;
    while (d <= end && count < 14) {
      const dateStr = d.toISOString().split("T")[0];
      const raw = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "short" });
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      const prev = byDate[dateStr];
      auto.push({ label, date: dateStr, openFrom: prev?.openFrom ?? "16:00", openTo: prev?.openTo ?? "23:00" });
      d.setDate(d.getDate() + 1);
      count++;
    }
    setSchedule([...auto, ...manual]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.endDate]);

  const addSlot = () => setSchedule(s => [...s, { label: "", openFrom: "16:00", openTo: "23:00" }]);
  const removeSlot = (i: number) => setSchedule(s => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, patch: Partial<ScheduleSlot>) =>
    setSchedule(s => s.map((slot, idx) => idx === i ? { ...slot, ...patch } : slot));

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
          <span className="text-xs text-stone-400 whitespace-nowrap">/festival/</span>
          <Input
            value={form.slug}
            onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value })); }}
            placeholder="roma-beer-fest-2026"
          />
        </div>
        <p className="text-xs text-stone-400 mt-0.5">URL pubblico del taplist QR</p>
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
        <Label className="mb-2 block">Descrizione</Label>
        <RichTextEditor
          value={form.description}
          onChange={html => setForm(f => ({ ...f, description: html }))}
          placeholder="Descrivi il festival: programma, artisti, info pratiche…"
        />
      </div>

      {/* Orari */}
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Orari apertura</Label>
          <Button size="sm" variant="outline" className="h-7 text-xs" type="button" onClick={addSlot}>
            <Plus className="h-3 w-3 mr-1" />Aggiungi fascia
          </Button>
        </div>
        {schedule.length === 0 && (
          <p className="text-xs text-stone-400 italic py-2">Nessun orario aggiunto. Verranno mostrati sul taplist pubblico.</p>
        )}
        <div className="space-y-2">
          {schedule.map((slot, i) => {
            const isAuto = !!slot.date;
            return (
              <div key={i} className="flex items-center gap-2 bg-stone-50 dark:bg-[#1B2735] rounded-xl p-2">
                <div className="flex-1 min-w-0">
                  {isAuto ? (
                    <p className="text-sm font-medium text-muted-foreground dark:text-stone-300 truncate px-1">{slot.label}</p>
                  ) : (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Es. Ogni giorno, Weekend…"
                      value={slot.label}
                      onChange={e => updateSlot(i, { label: e.target.value })}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-10">Apertura</span>
                    <Input type="time" className="h-8 w-28 text-sm" value={slot.openFrom} onChange={e => updateSlot(i, { openFrom: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-10">Chiusura</span>
                    <Input type="time" className="h-8 w-28 text-sm" value={slot.openTo} onChange={e => updateSlot(i, { openTo: e.target.value })} />
                  </div>
                </div>
                <button type="button" onClick={() => removeSlot(i)} className="text-stone-400 hover:text-red-500 transition-colors p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
        <Label>Menu cibo visibile ai visitatori</Label>
      </div>

      <Separator />

      {/* Token pricing system */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.useTokens} onCheckedChange={v => setForm(f => ({ ...f, useTokens: v }))} />
          <div>
            <Label className="text-sm font-semibold">Sistema a token</Label>
            <p className="text-xs text-muted-foreground">I prezzi saranno espressi in token anziché in €</p>
          </div>
        </div>
        {form.useTokens && (
          <div>
            <Label className="text-xs">Nome del token (es. "gettone", "ticket", "birra-coin")</Label>
            <Input
              className="mt-1 h-9"
              value={form.tokenName}
              onChange={e => setForm(f => ({ ...f, tokenName: e.target.value }))}
              placeholder="token"
            />
            <p className="text-xs text-stone-400 mt-1">
              Verrà mostrato come: "2 {form.tokenName || 'token'}" invece di "€2.00"
            </p>
          </div>
        )}
      </div>

      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
        onClick={() => onSubmit({ ...form, schedule })}
        disabled={isPending || !form.name || !form.slug}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

// ─── Festival food manager ───────────────────────────────────────────────────
// ── Festival Comments Manager (owner moderation + replies) ───────────────────
type FestivalAllComment = {
  id: number; rating: number; comment: string | null;
  ownerReply: string | null; ownerReplyAt: string | null;
  createdAt: string;
  tapId: number; tapNumber: number | null; beerName: string | null;
  userNickname: string | null; userFirstName: string | null; userImage: string | null;
};

function FestivalCommentsManager({ festId }: { festId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unreplied" | "replied">("unreplied");
  const [replyOpenFor, setReplyOpenFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: comments = [], isLoading } = useQuery<FestivalAllComment[]>({
    queryKey: ["/api/festivals", festId, "comments-all"],
    queryFn: () => fetch(`/api/festivals/${festId}/comments-all`).then(r => r.json()),
  });

  const replyMutation = useMutation({
    mutationFn: (vars: { id: number; reply: string }) =>
      apiRequest(`/api/festival-ratings/${vars.id}/reply`, { method: "POST" }, { reply: vars.reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", festId, "comments-all"] });
      setReplyOpenFor(null);
      setReplyText("");
      toast({ title: "Risposta pubblicata" });
    },
    onError: () => toast({ title: "Errore invio risposta", variant: "destructive" }),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/festival-ratings/${id}/reply`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", festId, "comments-all"] });
      toast({ title: "Risposta rimossa" });
    },
  });

  const filtered = comments.filter(c =>
    filter === "all" ? true :
    filter === "unreplied" ? !c.ownerReply :
    !!c.ownerReply
  );

  const totalUnreplied = comments.filter(c => !c.ownerReply).length;

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground mr-auto">
            <span className="font-bold text-foreground">{comments.length}</span> commenti totali
            {totalUnreplied > 0 && <span className="ml-2 text-primary">· {totalUnreplied} in attesa di risposta</span>}
          </p>
          <div className="flex gap-1">
            {([
              { v: "unreplied", l: "Da rispondere" },
              { v: "replied",   l: "Risposti" },
              { v: "all",       l: "Tutti" },
            ] as const).map(opt => (
              <Button
                key={opt.v}
                size="sm"
                variant={filter === opt.v ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilter(opt.v)}
                data-testid={`filter-comments-${opt.v}`}
              >
                {opt.l}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto text-stone-300" />
            <p className="font-medium">Nessun commento</p>
            <p className="text-xs">
              {filter === "unreplied" ? "Hai risposto a tutti i commenti, complimenti!" :
               filter === "replied"   ? "Non hai ancora pubblicato risposte." :
                                        "Nessun cliente ha ancora lasciato un commento."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const initials = (c.userNickname || c.userFirstName || "?")[0]?.toUpperCase();
            const dateStr = c.createdAt ? format(new Date(c.createdAt), "d MMM yyyy 'alle' HH:mm", { locale: it }) : "";
            return (
              <Card key={c.id} data-testid={`comment-row-${c.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {c.userImage ? (
                      <img src={c.userImage} alt={c.userNickname || ""} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/15 text-primary text-sm flex items-center justify-center font-bold">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{c.userNickname || c.userFirstName || "Utente"}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Spina #{c.tapNumber}{c.beerName ? ` · ${c.beerName}` : ""}
                        </Badge>
                        <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-primary">
                          <Star className="h-3 w-3 fill-current" /> {c.rating}/10
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</p>
                      {c.comment && (
                        <p className="text-sm text-foreground/85 mt-2 whitespace-pre-line break-words">{c.comment}</p>
                      )}

                      {/* Reply block */}
                      {c.ownerReply ? (
                        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wide mb-1">
                            <Reply className="h-3 w-3" /> La tua risposta
                            {c.ownerReplyAt && (
                              <span className="text-muted-foreground font-normal normal-case">
                                · {format(new Date(c.ownerReplyAt), "d MMM yyyy", { locale: it })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/85 whitespace-pre-line break-words">{c.ownerReply}</p>
                          <button
                            onClick={() => deleteReplyMutation.mutate(c.id)}
                            className="text-[11px] text-destructive hover:underline mt-2"
                            data-testid={`btn-delete-reply-dash-${c.id}`}
                          >
                            <Trash2 className="h-3 w-3 inline mr-0.5" />Rimuovi risposta
                          </button>
                        </div>
                      ) : replyOpenFor === c.id ? (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value.slice(0, 500))}
                            rows={2}
                            placeholder="Rispondi al cliente…"
                            className="text-sm"
                            data-testid={`textarea-reply-dash-${c.id}`}
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setReplyOpenFor(null); setReplyText(""); }}>
                              Annulla
                            </Button>
                            <Button size="sm" className="h-7 gap-1"
                              disabled={!replyText.trim() || replyMutation.isPending}
                              onClick={() => replyMutation.mutate({ id: c.id, reply: replyText.trim() })}
                              data-testid={`btn-send-reply-dash-${c.id}`}
                            >
                              <Send className="h-3 w-3" /> Pubblica risposta
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1"
                          onClick={() => { setReplyOpenFor(c.id); setReplyText(""); }}
                          data-testid={`btn-open-reply-dash-${c.id}`}
                        >
                          <Reply className="h-3 w-3" /> Rispondi
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FestivalFoodManager({ festId }: { festId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: food = [] } = useQuery<FoodItem[]>({
    queryKey: ["/api/admin/festivals", festId, "food"],
    queryFn: () => apiRequest(`/api/admin/festivals/${festId}/food`),
    enabled: !!festId,
  });

  // Derive unique categories from items + any locally added ones
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const categories = useMemo(() => {
    const fromItems = food.map(i => i.category || "Altro");
    const all = Array.from(new Set([...fromItems, ...extraCategories])).filter(Boolean);
    return all.length > 0 ? all : [];
  }, [food, extraCategories]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Add item dialog state
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", isAvailable: true, allergens: [] as string[] });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const openAddItem = (category: string) => {
    setItemForm({ name: "", description: "", price: "", isAvailable: true, allergens: [] });
    setAddingToCategory(category);
    setEditingItem(null);
  };

  const openEditItem = (item: FoodItem) => {
    setItemForm({ name: item.name, description: item.description || "", price: item.price || "", isAvailable: item.isAvailable, allergens: item.allergens ?? [] });
    setEditingItem(item);
    setAddingToCategory(null);
  };

  const addFoodMutation = useMutation({
    mutationFn: (data: { name: string; description: string; price: string; category: string; isAvailable: boolean; allergens: string[] }) =>
      apiRequest(`/api/admin/festivals/${festId}/food`, { method: "POST" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] });
      setAddingToCategory(null);
      toast({ title: "Voce aggiunta" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const editFoodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/admin/festivals/food/${id}`, { method: "PATCH" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] });
      setEditingItem(null);
      toast({ title: "Voce aggiornata" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const toggleFoodMutation = useMutation({
    mutationFn: (item: FoodItem) => apiRequest(`/api/admin/festivals/food/${item.id}`, { method: "PATCH" }, { isAvailable: !item.isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] }),
  });

  const deleteFoodMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/festivals/food/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "food"] }),
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const ALLERGENS_LIST = [
    "glutine", "crostacei", "uova", "pesce", "arachidi", "soia",
    "latte", "frutta a guscio", "sedano", "senape", "sesamo",
    "solfiti", "lupini", "molluschi",
  ];
  const ALLERGEN_LABELS: Record<string, string> = {
    glutine: "Glutine", crostacei: "Crostacei", uova: "Uova", pesce: "Pesce",
    arachidi: "Arachidi", soia: "Soia", latte: "Latte",
    "frutta a guscio": "Frutta a guscio", sedano: "Sedano", senape: "Senape",
    sesamo: "Sesamo", solfiti: "Solfiti", lupini: "Lupini", molluschi: "Molluschi",
  };
  const toggleAllergen = (a: string) => {
    setItemForm(f => ({
      ...f,
      allergens: f.allergens.includes(a) ? f.allergens.filter(x => x !== a) : [...f.allergens, a],
    }));
  };

  const AllergenSelector = () => (
    <div>
      <Label className="text-xs">Allergeni</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {ALLERGENS_LIST.map(a => (
          <button
            key={a}
            type="button"
            onClick={() => toggleAllergen(a)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              itemForm.allergens.includes(a)
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white dark:bg-[#1B2735] text-muted-foreground dark:text-stone-400 border-gray-200 dark:border-gray-600 hover:border-orange-300"
            }`}
          >
            {ALLERGEN_LABELS[a]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add category */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground dark:text-stone-400">{categories.length} categorie · {food.length} voci</p>
        <Button size="sm" variant="outline" onClick={() => setShowNewCategory(true)}>
          <Plus className="h-4 w-4 mr-1" />Nuova categoria
        </Button>
      </div>

      {/* New category dialog */}
      {showNewCategory && (
        <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10">
          <CardContent className="p-3 space-y-2">
            <Label className="text-sm font-medium">Nome categoria</Label>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Es. Panini, Dolci, Bevande…"
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    setExtraCategories(prev => [...prev, newCategoryName.trim()]);
                    setExpandedCategories(prev => new Set([...Array.from(prev), newCategoryName.trim()]));
                    setNewCategoryName("");
                    setShowNewCategory(false);
                  }
                }}
              />
              <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  if (newCategoryName.trim()) {
                    setExtraCategories(prev => [...prev, newCategoryName.trim()]);
                    setExpandedCategories(prev => new Set([...Array.from(prev), newCategoryName.trim()]));
                    setNewCategoryName("");
                    setShowNewCategory(false);
                  }
                }}>
                Crea
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewCategory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {categories.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <UtensilsCrossed className="h-8 w-8 text-stone-300 mx-auto" />
            <p className="text-muted-foreground text-sm">Nessuna categoria ancora</p>
            <p className="text-xs text-stone-400">Crea una categoria per iniziare ad aggiungere voci al menu</p>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const items = food.filter(i => (i.category || "Altro") === cat);
        const isExpanded = expandedCategories.has(cat);
        return (
          <Card key={cat} className="overflow-hidden">
            <CardHeader className="p-0">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-[#1B2735] transition-colors text-left"
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{cat}</p>
                    <p className="text-xs text-muted-foreground">{items.length} voc{items.length === 1 ? "e" : "i"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={e => { e.stopPropagation(); openAddItem(cat); }}>
                    <Plus className="h-3 w-3 mr-1" />Aggiungi
                  </Button>
                  <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-0 border-t dark:border-[#2F3D4D]">
                {items.length === 0 ? (
                  <div className="px-4 py-5 text-center text-sm text-stone-400">
                    Nessuna voce in questa categoria.{" "}
                    <button className="text-amber-600 hover:underline" onClick={() => openAddItem(cat)}>Aggiungine una</button>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {items.map(item => (
                      <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${!item.isAvailable ? "opacity-60" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${!item.isAvailable ? "line-through text-stone-400" : ""}`}>{item.name}</p>
                            {!item.isAvailable && <span className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">Esaurito</span>}
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>}
                          {item.allergens && item.allergens.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.allergens.map(a => (
                                <span key={a} className="text-xs bg-stone-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-stone-300 dark:border-stone-600 px-1.5 py-0.5 rounded-full">
                                  {ALLERGEN_LABELS[a.toLowerCase()] ?? a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {item.price && <span className="font-bold text-amber-600 text-sm shrink-0 pt-0.5">€{parseFloat(item.price).toFixed(2)}</span>}
                        <button onClick={() => openEditItem(item)} className="p-1 rounded text-stone-400 hover:text-amber-600 transition-colors shrink-0 mt-0.5">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleFoodMutation.mutate(item)} className="p-1 rounded shrink-0 transition-colors mt-0.5"
                          title={item.isAvailable ? "Segna come non disponibile" : "Ripristina"}>
                          {item.isAvailable
                            ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                            : <XCircle className="h-5 w-5 text-red-400" />}
                        </button>
                        <button onClick={() => deleteFoodMutation.mutate(item.id)} className="p-1 rounded text-stone-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add item dialog */}
      {addingToCategory && (
        <Dialog open onOpenChange={() => setAddingToCategory(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Aggiungi voce — {addingToCategory}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Panino al pulled pork" className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Descrizione</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Ingredienti, note…" rows={2} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Prezzo (€)</Label>
                <Input type="number" step="0.50" min="0" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} placeholder="8.00" className="mt-1 h-9" />
              </div>
              <AllergenSelector />
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={itemForm.isAvailable} onCheckedChange={v => setItemForm(f => ({ ...f, isAvailable: v }))} />
                <Label className="text-sm">{itemForm.isAvailable ? "Disponibile" : "Non disponibile"}</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddingToCategory(null)}>Annulla</Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={!itemForm.name || addFoodMutation.isPending}
                onClick={() => addFoodMutation.mutate({ ...itemForm, category: addingToCategory })}>
                {addFoodMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Aggiungi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit item dialog */}
      {editingItem && (
        <Dialog open onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica voce</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Descrizione</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Prezzo (€)</Label>
                <Input type="number" step="0.50" min="0" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} className="mt-1 h-9" />
              </div>
              <AllergenSelector />
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={itemForm.isAvailable} onCheckedChange={v => setItemForm(f => ({ ...f, isAvailable: v }))} />
                <Label className="text-sm">{itemForm.isAvailable ? "Disponibile" : "Non disponibile"}</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>Annulla</Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={!itemForm.name || editFoodMutation.isPending}
                onClick={() => editFoodMutation.mutate({ id: editingItem.id, data: itemForm })}>
                {editFoodMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salva
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
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
  const [activeTab, setActiveTab] = useState("taps");

  // List of managed festivals
  const { data: festList = [], isLoading: listLoading } = useQuery<Festival[]>({
    queryKey: ["/api/admin/festivals"],
    queryFn: () => apiRequest("/api/admin/festivals"),
    enabled: isAuthenticated,
  });

  const selectedFest = festList.find(f => f.id === selectedFestId) ?? festList[0] ?? null;
  const festId = selectedFest?.id ?? null;

  // Taps for selected festival (uses admin endpoint to bypass isActive requirement)
  const { data: taps = [], isLoading: tapsLoading } = useQuery<FestivalTap[]>({
    queryKey: ["/api/admin/festivals", festId, "taps"],
    queryFn: () => apiRequest(`/api/admin/festivals/${festId}/taps`),
    enabled: !!festId,
  });

  // Stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/festivals", festId, "stats"],
    queryFn: () => apiRequest(`/api/admin/festivals/${festId}/stats`),
    enabled: !!festId && activeTab === "stats",
    refetchInterval: 60000,
  });

  const { data: likeCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/favorites", "festival", festId, "count"],
    queryFn: async () => {
      const r = await fetch(`/api/favorites/festival/${festId}/count`);
      if (!r.ok) return { count: 0 };
      return r.json();
    },
    enabled: !!festId,
    staleTime: 60_000,
  });
  const festivalLikeCount = likeCountData?.count ?? 0;

  // Toggle tap availability
  const toggleMutation = useMutation({
    mutationFn: (tap: FestivalTap) => apiRequest(`/api/admin/festivals/${festId}/taps/${tap.id}/toggle`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "taps"] }),
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  // Delete tap
  const deleteTapMutation = useMutation({
    mutationFn: (tap: FestivalTap) => apiRequest(`/api/admin/festivals/${festId}/taps/${tap.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals", festId, "taps"] });
      toast({ title: "Spina eliminata" });
    },
    onError: () => toast({ title: "Errore nell'eliminazione", variant: "destructive" }),
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
        <Beer className="h-10 w-10 text-stone-300 mx-auto mb-3" />
        <p className="text-muted-foreground">Accedi per gestire i festival</p>
        <Button className="mt-3" onClick={() => navigate("/")}>Vai alla home</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#15202B]">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4">
        <PageContainer variant="standard" className="flex items-center justify-between gap-4 flex-wrap">
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
                <TVModeButton slug={selectedFest.slug} festivalName={selectedFest.name} />
              </>
            )}
            <Button size="sm" className="bg-white text-amber-700 hover:bg-amber-50"
              onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuovo festival
            </Button>
          </div>
        </PageContainer>
      </div>

      <PageContainer variant="standard" className="py-6 space-y-6">
        {/* Festival selector */}
        {listLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Caricamento...</div>
        ) : festList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <Beer className="h-10 w-10 text-stone-300 mx-auto" />
              <p className="text-muted-foreground">Nessun festival ancora</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                  <a href="/festival"><Plus className="h-4 w-4 mr-1" />Crea il tuo festival</a>
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
                          : "bg-white dark:bg-[#1B2735] text-muted-foreground dark:text-stone-300 hover:bg-amber-50"
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
                        <h3 className="font-semibold text-foreground dark:text-gray-100">Attiva il festival con il pagamento</h3>
                        <p className="text-sm text-muted-foreground dark:text-stone-400 mt-1">
                          Per rendere il taplist pubblico e raccogliere valutazioni è necessario il pagamento una tantum.
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-amber-600">€{selectedFest.priceEur ?? 99}</div>
                      <div className="text-xs text-muted-foreground">Pagamento unico · accesso per tutta la durata del festival</div>
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
                      <p className="text-xs text-stone-400">Puoi configurare spine e menu anche ora, ma il QR sarà pubblico solo dopo il pagamento.</p>
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
                          <h3 className="font-semibold text-foreground dark:text-gray-100">Festival terminato</h3>
                          <p className="text-sm text-muted-foreground">Il festival è scaduto il {selectedFest.endDate ? new Date(selectedFest.endDate).toLocaleDateString("it-IT") : "—"}. Rinnova per riattivarlo.</p>
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Spine", value: taps.length, icon: Beer, color: "text-amber-600" },
                    { label: "Disponibili", value: taps.filter(t => t.isAvailable).length, icon: CheckCircle2, color: "text-green-600" },
                    { label: "Voti", value: stats?.totalRatings ?? 0, icon: Star, color: "text-yellow-500" },
                    { label: "Mi piace", value: festivalLikeCount, icon: Heart, color: "text-red-500" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label}>
                      <CardContent className="p-3 text-center">
                        <Icon className={`h-4 w-4 mx-auto mb-0.5 ${color}`} />
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
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
                    <TabsTrigger value="comments" className="flex-1 gap-1" data-testid="tab-comments"><MessageSquare className="h-4 w-4" />Commenti</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1 gap-1"><Settings className="h-4 w-4" />Info</TabsTrigger>
                  </TabsList>

                  {/* TAPS tab */}
                  <TabsContent value="taps" className="space-y-4">
                    {status === "expired" ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center text-muted-foreground space-y-2">
                          <Lock className="h-8 w-8 mx-auto text-stone-300" />
                          <p className="font-medium">Festival terminato</p>
                          <p className="text-sm">Le spine non sono più modificabili. Rinnova il festival per riattivarlo.</p>
                        </CardContent>
                      </Card>
                    ) : taps.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center space-y-3">
                          <Beer className="h-8 w-8 text-stone-300 mx-auto" />
                          <p className="text-muted-foreground">Nessuna spina configurata</p>
                          <Button onClick={() => setEditingTap({ tapNumber: 1 })}>
                            <Plus className="h-4 w-4 mr-1" />Aggiungi prima spina
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-sm text-muted-foreground dark:text-stone-400">
                            {taps.filter(t => t.isAvailable).length} di {taps.length} disponibili
                          </p>
                          <Button size="sm" variant="outline" onClick={() => setEditingTap({ tapNumber: taps.length + 1 })}>
                            <Plus className="h-4 w-4 mr-1" />Aggiungi spina
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taps.map(tap => (
                            <TapRow
                              key={tap.id}
                              tap={tap}
                              festivalId={festId!}
                              onToggle={t => toggleMutation.mutate(t)}
                              onDelete={t => deleteTapMutation.mutate(t)}
                              onEdit={t => setEditingTap({ tapNumber: t.tapNumber, existing: t })}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* FOOD tab */}
                  <TabsContent value="food" className="space-y-4">
                    {status === "expired" ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center text-muted-foreground space-y-2">
                          <Lock className="h-8 w-8 mx-auto text-stone-300" />
                          <p className="font-medium">Festival terminato</p>
                          <p className="text-sm">Il menu non è più modificabile. Rinnova il festival per riattivarlo.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <FestivalFoodManager festId={festId!} />
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
                            <div className="text-xs text-muted-foreground">Spine disponibili</div>
                          </CardContent></Card>
                          <Card><CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">{stats.totalRatings}</div>
                            <div className="text-xs text-muted-foreground">Voti totali</div>
                          </CardContent></Card>
                          <Card><CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-600">
                              {stats.topTaps[0]?.avg.toFixed(1) ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">Miglior media</div>
                          </CardContent></Card>
                        </div>

                        <Card>
                          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-amber-500" />Top 10 birre più votate</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {stats.topTaps.length === 0 ? (
                              <p className="text-muted-foreground text-sm text-center py-4">Ancora nessun voto</p>
                            ) : stats.topTaps.map((t, i) => (
                              <div key={t.tapNumber} className="flex items-center gap-3">
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                                  i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-stone-100 text-muted-foreground" : i === 2 ? "bg-stone-100 text-orange-600" : "bg-stone-50 text-muted-foreground"
                                }`}>{i + 1}</span>
                                <div className="flex-1">
                                  <span className="text-sm font-medium">{t.beerName}</span>
                                  <span className="text-xs text-muted-foreground ml-1">(spina #{t.tapNumber})</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-amber-600">{t.avg.toFixed(1)}</div>
                                  <div className="text-xs text-stone-400">{t.count} vot{t.count === 1 ? "o" : "i"}</div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </TabsContent>

                  {/* COMMENTS tab */}
                  <TabsContent value="comments" className="space-y-4">
                    <FestivalCommentsManager festId={selectedFest.id} />
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
                        <code className="text-xs text-stone-400 ml-auto">/festival/{selectedFest.slug}</code>
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
                            schedule: selectedFest.schedule ?? [],
                            useTokens: selectedFest.useTokens ?? false,
                            tokenName: selectedFest.tokenName || "token",
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
      </PageContainer>

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
