import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WebImageSearchButtonProps {
  /** REST endpoint to POST against (must return `{ [responseKey]: string | null }`) */
  endpoint: string;
  /** Key inside the JSON response that holds the URL (e.g. "imageUrl" or "logoUrl") */
  responseKey: string;
  /** Called with the URL when the user confirms a found match */
  onFound: (url: string) => void;
  /** Optional body to send with the POST (used by search-by-name endpoint) */
  body?: Record<string, any>;
  /** Optional override for the default Italian label */
  label?: string;
  /** Optional override for the not-found toast description */
  notFoundMessage?: string;
  /** Compact = small inline button (default true) */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  /** Label shown in the confirmation dialog title */
  previewTitle?: string;
}

/**
 * Inline button placed above an `<ImageUpload />` to fetch an automatic web
 * match (beer label or brewery logo). When the backend isn't confident enough,
 * we silently surface a toast and let the user upload manually — never auto-fill
 * a wrong image. When a match is found, a confirmation dialog is shown with the
 * preview so the user can accept or reject it before applying.
 */
export function WebImageSearchButton({
  endpoint,
  responseKey,
  onFound,
  body,
  label = "Cerca sul web",
  notFoundMessage = "Nessuna immagine sicura trovata. Caricala manualmente.",
  compact = true,
  disabled = false,
  className = "",
  previewTitle = "Anteprima immagine trovata",
}: WebImageSearchButtonProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClick = async () => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const res: any = await apiRequest(endpoint, { method: "POST" }, body ?? {});
      const url: string | null = res?.[responseKey] ?? null;
      if (url) {
        setPreviewUrl(url);
      } else {
        toast({
          title: "Nessun risultato sicuro",
          description: notFoundMessage,
        });
      }
    } catch (e: any) {
      toast({
        title: "Ricerca fallita",
        description: e?.message ?? "Riprova o carica manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onFound(previewUrl);
      toast({ title: "Immagine applicata" });
    }
    setPreviewUrl(null);
  };

  const handleReject = () => {
    setPreviewUrl(null);
    toast({
      title: "Immagine scartata",
      description: "Carica un'immagine manualmente o riprova la ricerca.",
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={handleClick}
        disabled={disabled || isSearching}
        className={`${compact ? "h-8 px-3 text-xs" : ""} ${className}`}
        data-testid="button-web-image-search"
      >
        {isSearching ? (
          <>
            <Loader2 className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} mr-1.5 animate-spin`} />
            Cerco…
          </>
        ) : (
          <>
            <Sparkles className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} mr-1.5`} />
            {label}
          </>
        )}
      </Button>

      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) handleReject(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              Controlla l'immagine trovata. Verrà applicata solo se confermi.
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center bg-stone-50 dark:bg-stone-900/40 rounded-xl p-4">
              <img
                src={previewUrl}
                alt="Anteprima"
                className="max-h-64 w-auto object-contain rounded-lg"
                data-testid="img-web-search-preview"
              />
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReject}
              className="flex-1"
              data-testid="button-reject-web-image"
            >
              <X className="w-4 h-4 mr-1.5" />
              Scarta
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
              data-testid="button-confirm-web-image"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Usa questa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
