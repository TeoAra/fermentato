import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PubQRCodeProps {
  pubId: number;
  pubName: string;
  compact?: boolean;
}

export function PubQRCode({ pubId, pubName, compact }: PubQRCodeProps) {
  const { toast } = useToast();
  const svgRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const pubUrl = `${window.location.origin}/pub/${pubId}`;

  const downloadQR = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 1024;
    const padding = 80;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2 + 60;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pubName, canvas.width / 2, size + padding + 45);

      const link = document.createElement("a");
      link.download = `qr-${pubName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "QR code scaricato!" });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: pubName, text: `Scopri ${pubName} su Fermenta.to`, url: pubUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(pubUrl);
      toast({ title: "Link copiato!", description: "Il link del pub è stato copiato" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" />
            QR
          </Button>
        ) : (
          <Button variant="outline" className="gap-2 w-full">
            <QrCode className="h-4 w-4" />
            Codice QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code - {pubName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div ref={svgRef} className="bg-white p-6 rounded-2xl shadow-inner">
            <QRCodeSVG
              value={pubUrl}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#1a1a1a"
              bgColor="#ffffff"
            />
          </div>
          <p className="text-sm text-gray-500 text-center">
            Scansiona per visitare la pagina del pub
          </p>
          <div className="flex gap-3 w-full">
            <Button onClick={downloadQR} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Scarica
            </Button>
            <Button variant="outline" onClick={shareQR} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Condividi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
