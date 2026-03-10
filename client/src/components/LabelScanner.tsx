import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Scan, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanMode = "idle" | "scanning" | "processing" | "done" | "error";

interface LabelScannerProps {
  onResult: (text: string, source: "ocr" | "barcode") => void;
  onClose: () => void;
}

// ─── Resize + compress frame to JPEG < 900 KB ────────────────────────────────
function prepareImageForApi(src: HTMLCanvasElement | HTMLImageElement, maxW = 1400): string {
  const isCanvas = src instanceof HTMLCanvasElement;
  const sw = isCanvas ? (src as HTMLCanvasElement).width : (src as HTMLImageElement).naturalWidth;
  const sh = isCanvas ? (src as HTMLCanvasElement).height : (src as HTMLImageElement).naturalHeight;
  const scale = Math.min(1, maxW / sw);
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src as any, 0, 0, w, h);

  // Slight contrast boost in greyscale helps OCR.space Engine 2
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Stretch contrast: clamp to [30, 225] → [0, 255]
    const v = Math.min(255, Math.max(0, ((gray - 30) / 195) * 255));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  return c.toDataURL("image/jpeg", 0.85);
}

// ─── Call backend OCR proxy (OCR.space Engine 2) ────────────────────────────
async function callOcrApi(dataUrl: string): Promise<string> {
  const res = await fetch("/api/scan/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error("OCR API error " + res.status);
  const data = await res.json();
  return (data.text as string) || "";
}

// ─── Clean raw OCR text for search ──────────────────────────────────────────
function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r?\n/g, " ")
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(w => w.length >= 2)
    .slice(0, 10)
    .join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LabelScanner({ onResult, onClose }: LabelScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const barcodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<ScanMode>("idle");
  const [statusMsg, setStatusMsg] = useState("Punta la fotocamera sull'etichetta");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [detectedText, setDetectedText] = useState("");

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("scanning");
      setStatusMsg("Punta la fotocamera sull'etichetta · il barcode viene rilevato in automatico");
    } catch (err: any) {
      if (err.name === "NotAllowedError") setPermissionDenied(true);
      setStatusMsg("Errore accesso fotocamera");
      setMode("error");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    };
  }, []);

  // ── Barcode detector (native BarcodeDetector API — Chrome/Android) ─────────
  useEffect(() => {
    if (typeof (window as any).BarcodeDetector !== "undefined") {
      barcodeDetectorRef.current = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });
      startBarcodeLoop();
    }
  }, []);

  const startBarcodeLoop = () => {
    if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    barcodeIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !barcodeDetectorRef.current || mode === "processing") return;
      try {
        const codes = await barcodeDetectorRef.current.detect(videoRef.current);
        if (codes.length > 0) {
          clearInterval(barcodeIntervalRef.current!);
          const code = codes[0].rawValue;
          setStatusMsg(`Barcode ${code} — cerco in Open Food Facts...`);
          setMode("processing");
          await lookupBarcode(code);
        }
      } catch {}
    }, 600);
  };

  const lookupBarcode = async (code: string) => {
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await r.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = [p.product_name, p.brands].filter(Boolean).join(" ").trim();
        if (name) { onResult(name, "barcode"); return; }
      }
    } catch {}
    // Barcode not in Open Food Facts — fall through to OCR
    setStatusMsg("Barcode non trovato — analizzo l'etichetta con OCR...");
    await runOcrFlow();
  };

  // ── OCR flow ───────────────────────────────────────────────────────────────
  const runOcrFlow = async (sourceDataUrl?: string) => {
    if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    setMode("processing");
    setDetectedText("");

    // Capture frame if no image supplied
    let rawDataUrl: string;
    if (sourceDataUrl) {
      rawDataUrl = sourceDataUrl;
      setCapturedImage(rawDataUrl);
    } else {
      if (!videoRef.current || !canvasRef.current) {
        setStatusMsg("Errore cattura immagine"); setMode("error"); return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(rawDataUrl);
    }

    setStatusMsg("Invio immagine a OCR.space...");

    try {
      // Preprocess: resize + contrast boost, then send to OCR.space
      let processedUrl = rawDataUrl;
      try {
        const img = new Image();
        img.src = rawDataUrl;
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
        processedUrl = prepareImageForApi(img);
      } catch { /* use raw if preprocessing fails */ }

      const rawText = await callOcrApi(processedUrl);
      const cleaned = cleanOcrText(rawText);
      setDetectedText(cleaned);

      if (cleaned.length >= 2) {
        setMode("done");
        onResult(cleaned, "ocr");
      } else {
        setStatusMsg("Nessun testo rilevato — avvicinati all'etichetta e riprova");
        setMode("error");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setStatusMsg("Errore di connessione — riprova");
      setMode("error");
    }
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      if (url) runOcrFlow(url);
    };
    reader.readAsDataURL(file);
  };

  // ── Retry ──────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setCapturedImage(null);
    setDetectedText("");
    setMode("scanning");
    setStatusMsg("Punta la fotocamera sull'etichetta · il barcode viene rilevato in automatico");
    startBarcodeLoop();
  };

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
    startBarcodeLoop();
  };

  const isProcessing = mode === "processing";
  const isScanning = mode === "scanning" || mode === "idle";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <Scan className="h-5 w-5 text-amber-400" />
          <span className="font-semibold text-sm">Scansiona Etichetta</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full ml-1">
            OCR.space
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={flipCamera}
            disabled={isProcessing}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Camera / captured view */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {permissionDenied ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4 px-8 text-center">
            <Camera className="h-16 w-16 text-amber-400 opacity-60" />
            <p className="text-lg font-semibold">Fotocamera non disponibile</p>
            <p className="text-sm text-white/60">
              Abilita il permesso fotocamera nelle impostazioni del browser
              oppure carica una foto dalla galleria.
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                capturedImage ? "opacity-0" : "opacity-100"
              )}
              playsInline
              muted
            />
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Catturato"
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder — shown only while live */}
            {isScanning && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/25" />
                <div className="relative z-10 w-72 h-52">
                  <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  {/* Corner marks */}
                  <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-amber-400 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-amber-400 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-amber-400 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-amber-400 rounded-br-2xl" />
                  {/* Scan line */}
                  <div className="absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent animate-pulse" />
                </div>
                <p className="absolute bottom-36 left-0 right-0 text-center text-white/50 text-xs px-8">
                  Inquadra l'etichetta nel riquadro · il barcode viene rilevato automaticamente
                </p>
              </div>
            )}

            {/* Processing spinner */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-5">
                <div className="w-14 h-14 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                <p className="text-white/80 text-sm text-center px-8">{statusMsg}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status / result bar */}
      <div className="bg-black/80 px-4 py-2.5 min-h-[42px] text-center">
        {detectedText ? (
          <p className="text-amber-400 text-sm font-medium truncate">
            Letto: "{detectedText}"
          </p>
        ) : (
          <p className="text-white/70 text-sm">{statusMsg}</p>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black px-4 pt-4 pb-10 safe-area-pb">
        <div className="flex items-center justify-center gap-6">
          {/* Upload from gallery */}
          <label className="flex flex-col items-center gap-1.5 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <div className="w-14 h-14 rounded-2xl border border-white/20 flex items-center justify-center text-white/60 hover:border-white/40 hover:text-white transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-white/40 text-xs">Galleria</span>
          </label>

          {/* Capture / retry button */}
          {mode === "error" ? (
            <button
              onClick={handleRetry}
              className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 transition-all active:scale-95"
            >
              <RotateCcw className="h-8 w-8" />
            </button>
          ) : (
            <button
              onClick={() => { if (isScanning) runOcrFlow(); }}
              disabled={isProcessing || !isScanning}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95",
                isProcessing
                  ? "bg-gray-700 cursor-not-allowed opacity-50"
                  : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/40"
              )}
            >
              <Camera className="h-9 w-9" />
            </button>
          )}

          {/* Manual search */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-14 h-14 rounded-2xl border border-white/20 flex items-center justify-center text-white/60 hover:border-white/40 hover:text-white transition-colors">
              <span className="text-xl">✏️</span>
            </div>
            <span className="text-white/40 text-xs">Manuale</span>
          </button>
        </div>
      </div>
    </div>
  );
}
