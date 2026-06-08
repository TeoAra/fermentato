import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Beer, MapPin, CheckCircle2, Search, X, ChevronRight, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─── Rating labels (same scale as BeerTastingForm) ─────────────────────────
const RATING_LABELS: Record<number, string> = {
  0.5: "Pessima", 1.0: "Scarsa", 1.5: "Mediocre", 2.0: "Discreta",
  2.5: "Nella media", 3.0: "Buona", 3.5: "Molto buona",
  4.0: "Ottima", 4.5: "Eccellente", 5.0: "Perfetta!",
};
const RATING_STEPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

function RatingSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const getValueFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return RATING_STEPS[Math.round(pct * (RATING_STEPS.length - 1))];
  }, [value]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(getValueFromX(e.clientX));
  }, [getValueFromX, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    onChange(getValueFromX(e.clientX));
  }, [getValueFromX, onChange]);

  const activeIdx = RATING_STEPS.indexOf(value);
  const fillPct = (activeIdx / (RATING_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-primary tabular-nums leading-none">{value.toFixed(1)}</span>
          <span className="text-xs font-semibold text-stone-400">/5</span>
        </div>
        <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{RATING_LABELS[value]}</span>
      </div>

      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div className="absolute inset-x-0 h-2 bg-stone-100 dark:bg-[#1A1D24] rounded-full" />
        <div className="absolute left-0 h-2 bg-primary rounded-full transition-all duration-100" style={{ width: `${fillPct}%` }} />
        {RATING_STEPS.map((step, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <div key={step} className="absolute flex items-center justify-center"
              style={{ left: `${(i / (RATING_STEPS.length - 1)) * 100}%`, transform: "translateX(-50%)" }}>
              <div className={`rounded-full border-2 transition-all duration-100 ${
                isCurrent ? "w-5 h-5 bg-primary border-primary shadow-lg shadow-primary/40"
                  : isActive ? "w-3 h-3 bg-primary border-primary"
                  : "w-3 h-3 bg-white dark:bg-[#12151A] border-stone-200 dark:border-stone-600"
              }`} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-0.5">
        <span className="text-[10px] text-stone-400 font-medium">0.5</span>
        <span className="text-[10px] text-stone-400 font-medium">5.0</span>
      </div>
    </div>
  );
}

// ─── Format options ──────────────────────────────────────────────────────────
const FORMAT_OPTIONS = [
  { label: "Alla spina", icon: "🍺", tapTypes: ["spina"] },
  { label: "Pompa",      icon: "🔧", tapTypes: ["pompa"] },
  { label: "Botte",      icon: "🛢️",  tapTypes: ["botte"] },
  { label: "Bottiglia",  icon: "🍾", tapTypes: [] },
  { label: "Lattina",    icon: "🥫", tapTypes: [] },
  { label: "Growler",    icon: "🫙", tapTypes: [] },
];

function tapTypeToFormat(tapType?: string | null): string {
  if (!tapType) return "";
  const match = FORMAT_OPTIONS.find(f => f.tapTypes.includes(tapType));
  return match?.label ?? "";
}

// ─── Pub search ──────────────────────────────────────────────────────────────
interface PubResult { id: number; name: string; city?: string | null; address?: string | null; }

// ─── Props ───────────────────────────────────────────────────────────────────
interface CheckinModalProps {
  open: boolean;
  onClose: () => void;
  beer: { id: number; name: string; style?: string | null; breweryName?: string | null; };
  pub?: { id: number; name: string; city?: string | null; } | null;
  tapType?: string | null;
}

export default function CheckinModal({ open, onClose, beer, pub: initialPub, tapType }: CheckinModalProps) {
  const { user } = useAuth();
  const [rating, setRating]     = useState<number>(3.0);
  const [note, setNote]         = useState("");
  const [format, setFormat]     = useState(() => tapTypeToFormat(tapType));
  const [done, setDone]         = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pub search state
  const [selectedPub, setSelectedPub]     = useState<PubResult | null>(initialPub ?? null);
  const [pubSearchOpen, setPubSearchOpen] = useState(false);
  const [pubQuery, setPubQuery]           = useState("");
  const [pubResults, setPubResults]       = useState<PubResult[]>([]);
  const [pubSearching, setPubSearching]   = useState(false);
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef                    = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setRating(3.0);
      setNote("");
      setFormat(tapTypeToFormat(tapType));
      setSelectedPub(initialPub ?? null);
      setPubSearchOpen(false);
      setPubQuery("");
      setPubResults([]);
      setDone(false);
      setPhotoUrl(null);
      setUploading(false);
    }
  }, [open, initialPub, tapType]);

  // Focus search on open
  useEffect(() => {
    if (pubSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [pubSearchOpen]);

  // Debounced pub search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!pubQuery.trim()) { setPubResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setPubSearching(true);
      try {
        const res = await fetch(`/api/pubs/search?q=${encodeURIComponent(pubQuery)}`);
        if (res.ok) setPubResults(await res.json());
      } finally { setPubSearching(false); }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pubQuery]);

  const handlePhotoSelect = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto troppo grande", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await apiRequest("/api/checkin/upload-photo", { method: "POST" }, fd);
      setPhotoUrl(res.url);
    } catch (e: any) {
      toast({ title: "Upload fallito", description: e.message ?? "Riprova", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const checkinMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/user/beer-tastings", {
        method: "POST",
        body: JSON.stringify({
          beerId: beer.id,
          rating,
          personalNotes: note.trim() || null,
          pubId: selectedPub?.id ?? null,
          format: format || null,
          photoUrl: photoUrl ?? null,
        }),
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      setTimeout(() => { setDone(false); onClose(); }, 1600);
    },
    onError: () => {
      toast({ title: "Errore check-in", description: "Riprova tra poco", variant: "destructive" });
    },
  });

  const handleClose = () => {
    if (checkinMutation.isPending) return;
    setDone(false); onClose();
  };

  const selectPub = (p: PubResult) => {
    setSelectedPub(p);
    setPubSearchOpen(false);
    setPubQuery("");
    setPubResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10 px-5 pt-5 max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-poppins text-lg flex items-center gap-2">
            <Beer className="w-5 h-5 text-primary flex-shrink-0" />
            Sto bevendo questa
          </SheetTitle>
        </SheetHeader>

        {user?.email && !user?.isEmailVerified ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <Beer className="w-6 h-6 text-amber-500" />
            </div>
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-base">Verifica la tua email</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">I check-in sono disponibili dopo la conferma dell'email</p>
            <button onClick={onClose} className="mt-2 text-xs text-muted-foreground underline underline-offset-2">Chiudi</button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="w-14 h-14 text-primary" />
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-base">Check-in registrato!</p>
            <p className="text-sm text-stone-400">I tuoi follower lo vedranno nel feed</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Beer info */}
            <div className="bg-stone-50 dark:bg-[#1A1D24]/50 rounded-2xl px-4 py-3">
              <p className="font-semibold text-stone-900 dark:text-stone-50 text-base leading-snug">{beer.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {[beer.breweryName, beer.style].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Rating slider */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
                Il tuo voto
              </p>
              <RatingSlider value={rating} onChange={setRating} />
            </div>

            {/* Format */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Come stai bevendo?
              </p>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFormat(format === f.label ? "" : f.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      format === f.label
                        ? "bg-primary text-white border-primary"
                        : "bg-stone-50 dark:bg-[#1A1D24] text-stone-500 dark:text-stone-400 border-stone-200 dark:border-[#23262E] hover:border-stone-300"
                    }`}
                  >
                    <span>{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pub */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Dove stai bevendo?
              </p>

              {selectedPub && !pubSearchOpen && (
                <div className="flex items-center gap-2 bg-primary/8 dark:bg-primary/15 border border-primary/20 rounded-xl px-3 py-2.5">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{selectedPub.name}</p>
                    {selectedPub.city && <p className="text-xs text-stone-400 truncate">{selectedPub.city}</p>}
                  </div>
                  <button onClick={() => setSelectedPub(null)}
                    className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-[#12151A]/60 transition-colors">
                    <X className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                </div>
              )}

              {!selectedPub && !pubSearchOpen && (
                <button onClick={() => setPubSearchOpen(true)}
                  className="w-full flex items-center gap-3 rounded-xl border border-stone-200 dark:border-[#23262E] px-3 py-2.5 text-sm text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 transition-colors">
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Cerca un locale…</span>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              )}

              {selectedPub && !pubSearchOpen && (
                <button onClick={() => setPubSearchOpen(true)}
                  className="mt-1.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                  Cambia locale
                </button>
              )}

              {pubSearchOpen && (
                <div className="rounded-2xl border border-stone-200 dark:border-[#23262E] overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100 dark:border-[#23262E]">
                    <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <Input ref={searchInputRef} value={pubQuery} onChange={(e) => setPubQuery(e.target.value)}
                      placeholder="Nome del locale, città…"
                      className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none" />
                    <button onClick={() => { setPubSearchOpen(false); setPubQuery(""); setPubResults([]); }}>
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {pubSearching && <p className="px-4 py-3 text-xs text-stone-400">Ricerca…</p>}
                    {!pubSearching && pubQuery && pubResults.length === 0 && (
                      <p className="px-4 py-3 text-xs text-stone-400">Nessun locale trovato</p>
                    )}
                    {pubResults.map((p) => (
                      <button key={p.id} onClick={() => selectPub(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-[#1A1D24] transition-colors text-left">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{p.name}</p>
                          {(p.city || p.address) && (
                            <p className="text-xs text-stone-400 truncate">{[p.city, p.address].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                      </button>
                    ))}
                    {!pubQuery && <p className="px-4 py-3 text-xs text-stone-400">Digita per cercare un locale…</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Photo */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Foto (opzionale)
              </p>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); e.target.value = ""; }} />
              {photoUrl ? (
                <div className="relative inline-block">
                  <img src={photoUrl} alt="anteprima" className="rounded-xl w-28 h-28 object-cover" />
                  <button type="button" onClick={() => setPhotoUrl(null)}
                    className="absolute -top-1.5 -right-1.5 bg-stone-900/80 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-600 px-4 py-2.5 text-sm text-stone-500 dark:text-stone-400 hover:border-primary hover:text-primary transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploading ? "Caricamento…" : "Aggiungi foto"}
                </button>
              )}
            </div>

            {/* Note */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Note (opzionale)
              </p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
                placeholder="Cosa ne pensi?" rows={2} className="resize-none rounded-xl text-sm" />
              <p className="text-right text-xs text-stone-300 mt-1">{note.length}/140</p>
            </div>

            {/* CTA */}
            <Button className="w-full rounded-2xl h-12 text-base font-semibold"
              onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending}>
              {checkinMutation.isPending ? "Registro…" : "🍺 Check-in!"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
