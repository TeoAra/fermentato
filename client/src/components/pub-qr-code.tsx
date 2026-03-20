import { useState, useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);

  const appBase = import.meta.env.VITE_APP_URL || "https://fermenta.to";
  const pubUrl = `${appBase}/pub/${pubId}`;

  const downloadQR = () => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;

    const padding = 60;
    const labelHeight = 50;
    const size = 1024;

    const out = document.createElement("canvas");
    out.width = size + padding * 2;
    out.height = size + padding * 2 + labelHeight;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, padding, padding, size, size);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pubName, out.width / 2, size + padding + 38);

    const link = document.createElement("a");
    link.download = `qr-${pubName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
    toast({ title: "QR code scaricato!" });
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
          <div className="bg-white p-6 rounded-2xl shadow-inner">
            <QRCodeSVG
              value={pubUrl}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#1a1a1a"
              bgColor="#ffffff"
            />
          </div>
          <div className="hidden">
            <QRCodeCanvas
              ref={canvasRef}
              value={pubUrl}
              size={1024}
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
