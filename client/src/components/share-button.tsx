import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  size?: "sm" | "default" | "icon" | "lg";
  variant?: "outline" | "ghost" | "default" | "secondary";
  className?: string;
  label?: string;
}

export function ShareButton({
  title, text, url, size = "sm", variant = "outline", className, label,
}: ShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url: shareUrl });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copiato!", description: "Condividi il link come preferisci." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copia questo link", description: shareUrl });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className} title="Condividi">
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {label && <span className="ml-1.5">{copied ? "Copiato!" : label}</span>}
    </Button>
  );
}
