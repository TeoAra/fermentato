import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/rich-text-editor";
import { useAuth } from "@/hooks/useAuth";
import { PubAutocomplete } from "./PubAutocomplete";
import {
  Plus, CheckCircle, Camera, X, Loader2, MapPin,
  ChevronRight, Beer, Pencil
} from "lucide-react";

const RATING_LABELS: Record<number, string> = {
  0.5: "Pessima",
  1.0: "Scarsa",
  1.5: "Mediocre",
  2.0: "Discreta",
  2.5: "Nella media",
  3.0: "Buona",
  3.5: "Molto buona",
  4.0: "Ottima",
  4.5: "Eccellente",
  5.0: "Perfetta!",
};

const RATING_STEPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

function RatingSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const getValueFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (RATING_STEPS.length - 1));
    return RATING_STEPS[idx];
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    onChange(getValueFromX(e.clientX));
  }, [getValueFromX, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(getValueFromX(e.clientX));
  }, [getValueFromX, onChange]);

  const activeIdx = RATING_STEPS.indexOf(value);
  const fillPct = ((activeIdx) / (RATING_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-primary tabular-nums leading-none">
            {value.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">/5</span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {RATING_LABELS[value]}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div className="absolute inset-x-0 h-2 bg-stone-100 dark:bg-[#1B2735] rounded-full" />
        <div
          className="absolute left-0 h-2 bg-primary rounded-full transition-all duration-100"
          style={{ width: `${fillPct}%` }}
        />
        {RATING_STEPS.map((step, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <div
              key={step}
              className="absolute flex items-center justify-center"
              style={{ left: `${(i / (RATING_STEPS.length - 1)) * 100}%`, transform: "translateX(-50%)" }}
            >
              <div
                className={`rounded-full border-2 transition-all duration-100 ${
                  isCurrent
                    ? "w-5 h-5 bg-primary border-primary shadow-lg shadow-primary/40"
                    : isActive
                    ? "w-3 h-3 bg-primary border-primary"
                    : "w-3 h-3 bg-white dark:bg-[#232F3D] border-stone-200 dark:border-stone-600"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between px-0.5">
        <span className="text-[10px] text-muted-foreground font-medium">0.5</span>
        <span className="text-[10px] text-muted-foreground font-medium">5.0</span>
      </div>
    </div>
  );
}

interface BeerTastingFormProps {
  beerId: number;
  beerName?: string;
  existingTasting?: any;
  initialRating?: number;
  autoOpen?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BeerTastingForm({
  beerId, beerName, existingTasting, initialRating, autoOpen, onSuccess, onCancel
}: BeerTastingFormProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isEditMode = !!existingTasting && !!onCancel;
  const [showForm, setShowForm] = useState(isEditMode || !!autoOpen);
  const [selectedPubId, setSelectedPubId] = useState<number | undefined>(existingTasting?.pubId ?? undefined);
  const [rating, setRating] = useState<number>(
    existingTasting?.rating ? parseFloat(existingTasting.rating) : (initialRating ?? 3.0)
  );
  const [notes, setNotes] = useState(existingTasting?.personalNotes ?? "");
  const [format, setFormat] = useState(existingTasting?.format ?? "");
  const [photoUrl, setPhotoUrl] = useState<string>(existingTasting?.photoUrl ?? "");
  const [photoPreview, setPhotoPreview] = useState<string>(existingTasting?.photoUrl ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { rating, personalNotes: notes, format, pubId: selectedPubId ?? null, photoUrl: photoUrl || null };
      if (isEditMode && existingTasting?.id) {
        return apiRequest(`/api/user/beer-tastings/${existingTasting.id}`, { method: "PATCH" }, payload);
      }
      return apiRequest("/api/user/beer-tastings", { method: "POST" }, { beerId, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/beers/${beerId}/user-tasting`] });
      setShowForm(false);
      onSuccess?.();
      toast({ title: isEditMode ? "Degustazione aggiornata!" : "Assaggio registrato!" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile salvare l'assaggio", variant: "destructive" }),
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/user/beer-tastings/upload-photo", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { photoUrl: url } = await res.json();
      setPhotoUrl(url);
    } catch {
      setPhotoPreview("");
      setPhotoUrl("");
      toast({ title: "Errore upload foto", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => setLocation("/login")}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-stone-200 dark:border-[#2F3D4D] bg-white dark:bg-card text-sm font-medium text-foreground hover:bg-stone-50 dark:hover:bg-[#1B2735] transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Beer className="w-4 h-4" />
          Accedi per registrare assaggi
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  if (existingTasting && !isEditMode && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm font-medium transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
      >
        <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4" />
          Assaggiata · {existingTasting.rating ? `${parseFloat(existingTasting.rating).toFixed(1)}/5` : "Nessun voto"}
        </span>
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500 font-semibold">
          <Pencil className="w-3 h-3" />
          Modifica
        </span>
      </button>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-stone-200 dark:border-[#2F3D4D] bg-white dark:bg-card text-sm font-medium hover:bg-stone-50 dark:hover:bg-[#1B2735] transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Plus className="w-4 h-4" />
          Hai bevuto questa birra?
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-[#2F3D4D] bg-white dark:bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-[#2F3D4D]">
        <div className="flex items-center gap-2">
          <Beer className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            {isEditMode ? "Modifica assaggio" : "Registra assaggio"}
          </span>
          {beerName && <span className="text-xs text-muted-foreground truncate max-w-[140px]">· {beerName}</span>}
        </div>
        <button
          onClick={() => { setShowForm(false); onCancel?.(); }}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 dark:bg-[#1B2735] text-muted-foreground hover:bg-stone-200 dark:hover:bg-[#232F3D] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Il tuo voto</p>
          <RatingSlider value={rating} onChange={setRating} />
        </div>

        <div className="h-px bg-stone-100 dark:bg-[#1B2735]" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <MapPin className="w-3 h-3 inline mr-1" />Dove l'hai bevuta?
          </p>
          <PubAutocomplete value={selectedPubId} onSelect={setSelectedPubId} placeholder="Cerca un pub o locale..." />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Come?</p>
          <div className="flex gap-2 flex-wrap">
            {["Alla spina", "Pompa", "Botte", "Bottiglia", "Lattina", "Growler"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(format === f ? "" : f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  format === f
                    ? "bg-primary text-white border-primary"
                    : "bg-stone-50 dark:bg-[#1B2735] text-muted-foreground border-stone-200 dark:border-[#2F3D4D] hover:border-stone-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Note personali</p>
          <RichTextEditor
            content={notes}
            onChange={setNotes}
            placeholder="Sapori, profumi, sensazioni... cosa ti ha colpito?"
            maxChars={2000}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Camera className="w-3 h-3 inline mr-1" />Foto (opzionale)
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Anteprima" className="w-full h-32 object-cover rounded-xl" />
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => { setPhotoPreview(""); setPhotoUrl(""); }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 rounded-xl border-2 border-dashed border-stone-200 dark:border-[#2F3D4D] flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span className="text-xs font-medium">Scatta o scegli una foto</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || uploadingPhoto}
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-sm shadow-primary/20"
          >
            {saveMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio…</>
              : isEditMode ? "Aggiorna" : "Salva assaggio"
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setShowForm(false); onCancel?.(); }}
            className="h-11 px-4 rounded-xl border-stone-200 dark:border-[#2F3D4D]"
          >
            Annulla
          </Button>
        </div>
      </div>
    </div>
  );
}
