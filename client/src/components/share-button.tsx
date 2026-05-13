import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);

  const shareUrl = url || window.location.href;
  const shareText = text || title;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copiato!", description: "Incolla il link dove vuoi condividerlo." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copia questo link", description: shareUrl });
    }
    setOpen(false);
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank");
    setOpen(false);
  };

  const shareOnTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
    setOpen(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch {
      // User cancelled or error — silently ignore
    }
  };

  if (canNativeShare) {
    return (
      <Button variant={variant} size={size} className={className} title="Condividi" onClick={handleNativeShare}>
        <Share2 className="h-4 w-4" />
        {label && <span className="ml-1.5">{label}</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={className} title="Condividi">
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {label && <span className="ml-1.5">{copied ? "Copiato!" : label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 space-y-1" align="center">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-[#232F3D] text-sm transition-colors"
          onClick={copyToClipboard}
        >
          <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>Copia link</span>
        </button>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-sm transition-colors"
          onClick={shareOnWhatsApp}
        >
          <MessageCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span>WhatsApp</span>
        </button>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm transition-colors"
          onClick={shareOnTelegram}
        >
          <Send className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span>Telegram</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
