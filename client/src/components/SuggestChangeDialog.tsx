import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lightbulb, Send, X, Info } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";

// ── Types ──────────────────────────────────────────────────────────────────

interface BeerData {
  name?: string;
  style?: string;
  abv?: string;
  ibu?: number | null;
  description?: string | null;
  color?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  bottleImageUrl?: string | null;
  isGlutenFree?: boolean;
  isAlcoholFree?: boolean;
}

interface BreweryData {
  name?: string;
  location?: string;
  region?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "beer" | "brewery";
  itemId: number;
  currentData: BeerData | BreweryData;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getDiff(original: Record<string, any>, updated: Record<string, any>): Record<string, any> {
  const diff: Record<string, any> = {};
  for (const key of Object.keys(updated)) {
    const orig = original[key] ?? null;
    const upd = updated[key] ?? null;
    if (String(orig) !== String(upd)) {
      diff[key] = upd;
    }
  }
  return diff;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SuggestChangeDialog({ open, onOpenChange, type, itemId, currentData }: Props) {
  const { toast } = useToast();

  const isBeer = type === "beer";
  const beerCurrent = (isBeer ? currentData : {}) as BeerData;
  const breweryCurrent = (!isBeer ? currentData : {}) as BreweryData;

  const [beerForm, setBeerForm] = useState<BeerData>({
    name: beerCurrent.name || "",
    style: beerCurrent.style || "",
    abv: beerCurrent.abv || "",
    ibu: beerCurrent.ibu ?? null,
    description: beerCurrent.description || "",
    color: beerCurrent.color || "",
    logoUrl: beerCurrent.logoUrl || "",
    imageUrl: beerCurrent.imageUrl || "",
    bottleImageUrl: beerCurrent.bottleImageUrl || "",
    isGlutenFree: beerCurrent.isGlutenFree || false,
    isAlcoholFree: beerCurrent.isAlcoholFree || false,
  });

  const [breweryForm, setBreweryForm] = useState<BreweryData>({
    name: breweryCurrent.name || "",
    location: breweryCurrent.location || "",
    region: breweryCurrent.region || "",
    description: breweryCurrent.description || "",
    websiteUrl: breweryCurrent.websiteUrl || "",
    logoUrl: breweryCurrent.logoUrl || "",
    coverImageUrl: breweryCurrent.coverImageUrl || "",
  });

  const [message, setMessage] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = isBeer ? beerForm : breweryForm;
      const currentFlat = isBeer
        ? {
            name: beerCurrent.name || "",
            style: beerCurrent.style || "",
            abv: beerCurrent.abv || "",
            ibu: beerCurrent.ibu ?? null,
            description: beerCurrent.description || "",
            color: beerCurrent.color || "",
            logoUrl: beerCurrent.logoUrl || "",
            imageUrl: beerCurrent.imageUrl || "",
            bottleImageUrl: beerCurrent.bottleImageUrl || "",
            isGlutenFree: beerCurrent.isGlutenFree || false,
            isAlcoholFree: beerCurrent.isAlcoholFree || false,
          }
        : {
            name: breweryCurrent.name || "",
            location: breweryCurrent.location || "",
            region: breweryCurrent.region || "",
            description: breweryCurrent.description || "",
            websiteUrl: breweryCurrent.websiteUrl || "",
            logoUrl: breweryCurrent.logoUrl || "",
            coverImageUrl: breweryCurrent.coverImageUrl || "",
          };

      const diff = getDiff(currentFlat, formData as Record<string, any>);
      if (Object.keys(diff).length === 0) {
        throw new Error("Nessuna modifica rilevata");
      }

      return apiRequest("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({
          type,
          itemId,
          proposedChanges: diff,
          currentData: currentFlat,
          message: message.trim() || null,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Suggerimento inviato!",
        description: "Grazie. Il tuo suggerimento sarà revisionato dallo staff.",
      });
      onOpenChange(false);
      setMessage("");
    },
    onError: (err: any) => {
      const msg = err?.message || "Errore durante l'invio";
      toast({ title: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-5 w-5" />
            Suggerisci una modifica
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 text-sm text-muted-foreground dark:text-stone-400">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            Le tue modifiche saranno inviate per revisione. Verranno applicate solo se approvate dall'amministratore o dal proprietario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isBeer ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={beerForm.name} onChange={(e) => setBeerForm({ ...beerForm, name: e.target.value })} placeholder="Nome della birra" />
                </div>
                <div className="space-y-1.5">
                  <Label>Stile</Label>
                  <Input value={beerForm.style} onChange={(e) => setBeerForm({ ...beerForm, style: e.target.value })} placeholder="Es. IPA, Stout..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>ABV (%)</Label>
                  <Input value={beerForm.abv || ""} onChange={(e) => setBeerForm({ ...beerForm, abv: e.target.value })} placeholder="Es. 5.5" type="number" step="0.1" min="0" max="99" />
                </div>
                <div className="space-y-1.5">
                  <Label>IBU</Label>
                  <Input value={beerForm.ibu?.toString() || ""} onChange={(e) => setBeerForm({ ...beerForm, ibu: e.target.value ? parseInt(e.target.value) : null })} placeholder="Es. 45" type="number" min="0" max="999" />
                </div>
                <div className="space-y-1.5">
                  <Label>Colore</Label>
                  <Input value={beerForm.color || ""} onChange={(e) => setBeerForm({ ...beerForm, color: e.target.value })} placeholder="Es. Ambrata" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrizione</Label>
                <Textarea value={beerForm.description || ""} onChange={(e) => setBeerForm({ ...beerForm, description: e.target.value })} placeholder="Descrizione della birra..." rows={3} />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!beerForm.isGlutenFree}
                    onChange={(e) => setBeerForm({ ...beerForm, isGlutenFree: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Gluten Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!beerForm.isAlcoholFree}
                    onChange={(e) => setBeerForm({ ...beerForm, isAlcoholFree: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">0.0% Analcolica</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload
                  label="Immagine Birra"
                  description="Immagine principale"
                  currentImageUrl={beerForm.imageUrl || undefined}
                  onImageChange={(url) => setBeerForm({ ...beerForm, imageUrl: url || "" })}
                  folder="beer-images"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="400x400px"
                />
                <ImageUpload
                  label="Immagine Bottiglia"
                  description="Foto della bottiglia"
                  currentImageUrl={beerForm.bottleImageUrl || undefined}
                  onImageChange={(url) => setBeerForm({ ...beerForm, bottleImageUrl: url || "" })}
                  folder="beer-bottles"
                  aspectRatio="portrait"
                  maxSize={5}
                  recommendedDimensions="300x450px"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={breweryForm.name} onChange={(e) => setBreweryForm({ ...breweryForm, name: e.target.value })} placeholder="Nome del birrificio" />
                </div>
                <div className="space-y-1.5">
                  <Label>Località</Label>
                  <Input value={breweryForm.location || ""} onChange={(e) => setBreweryForm({ ...breweryForm, location: e.target.value })} placeholder="Città, Paese" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Regione</Label>
                  <Input value={breweryForm.region || ""} onChange={(e) => setBreweryForm({ ...breweryForm, region: e.target.value })} placeholder="Es. Lombardia" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sito web</Label>
                  <Input value={breweryForm.websiteUrl || ""} onChange={(e) => setBreweryForm({ ...breweryForm, websiteUrl: e.target.value })} placeholder="https://..." type="url" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrizione</Label>
                <Textarea value={breweryForm.description || ""} onChange={(e) => setBreweryForm({ ...breweryForm, description: e.target.value })} placeholder="Descrizione del birrificio..." rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload
                  label="Logo Birrificio"
                  description="Logo del birrificio"
                  currentImageUrl={breweryForm.logoUrl || undefined}
                  onImageChange={(url) => setBreweryForm({ ...breweryForm, logoUrl: url || "" })}
                  folder="brewery-logos"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="300x300px"
                />
                <ImageUpload
                  label="Immagine di Copertina"
                  description="Immagine principale"
                  currentImageUrl={breweryForm.coverImageUrl || undefined}
                  onImageChange={(url) => setBreweryForm({ ...breweryForm, coverImageUrl: url || "" })}
                  folder="brewery-covers"
                  aspectRatio="landscape"
                  maxSize={5}
                  recommendedDimensions="1200x600px"
                />
              </div>
            </>
          )}

          {/* Optional message */}
          <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
            <Label>Nota per i revisori (opzionale)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Spiega il motivo della modifica, dove hai trovato le informazioni aggiornate..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? "Invio..." : "Invia suggerimento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
