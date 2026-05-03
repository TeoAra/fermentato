import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WebImageSearchButtonProps {
  /** REST endpoint to POST against (must return `{ [responseKey]: string | null }`) */
  endpoint: string;
  /** Key inside the JSON response that holds the URL (e.g. "imageUrl" or "logoUrl") */
  responseKey: string;
  /** Called with the URL when a confident match is found */
  onFound: (url: string) => void;
  /** Optional override for the default Italian label */
  label?: string;
  /** Optional override for the not-found toast description */
  notFoundMessage?: string;
  /** Compact = small inline button (default true) */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Inline button placed above an `<ImageUpload />` to fetch an automatic web
 * match (beer label or brewery logo). When the backend isn't confident enough,
 * we silently surface a toast and let the user upload manually — never auto-fill
 * a wrong image.
 */
export function WebImageSearchButton({
  endpoint,
  responseKey,
  onFound,
  label = "Cerca sul web",
  notFoundMessage = "Nessuna immagine sicura trovata. Caricala manualmente.",
  compact = true,
  disabled = false,
  className = "",
}: WebImageSearchButtonProps) {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const res: any = await apiRequest(endpoint, { method: "POST" }, {});
      const url: string | null = res?.[responseKey] ?? null;
      if (url) {
        onFound(url);
        toast({ title: "Immagine trovata" });
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

  return (
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
  );
}
