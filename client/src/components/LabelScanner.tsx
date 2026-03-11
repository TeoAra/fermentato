import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Scan, Upload, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanMode = "idle" | "scanning" | "processing" | "done" | "error";

interface LabelScannerProps {
  onResult: (text: string, source: "ocr" | "barcode", imageDataUrl?: string, engine?: string) => void;
  onClose: () => void;
}

// Prepare image for OCR: keep COLOR (PaddleOCR v3 works better with color),
// resize to max 1800px, apply gentle sharpening to help character edges.
function prepareImageForApi(src: HTMLCanvasElement | HTMLImageElement, maxW = 1800): string {
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

  // Gentle unsharp mask: sharpen edges without converting to greyscale
  // Keep full color for PaddleOCR v3 which is trained on color images
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const orig = new Uint8ClampedArray(d);

  // Simple 3x3 unsharp mask (amount=0.5)
  const amount = 0.5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c2 = 0; c2 < 3; c2++) {
        const blur = (
          orig[((y - 1) * w + (x - 1)) * 4 + c2] + orig[((y - 1) * w + x) * 4 + c2] + orig[((y - 1) * w + (x + 1)) * 4 + c2] +
          orig[(y * w + (x - 1)) * 4 + c2]         + orig[(y * w + x) * 4 + c2]         + orig[(y * w + (x + 1)) * 4 + c2] +
          orig[((y + 1) * w + (x - 1)) * 4 + c2] + orig[((y + 1) * w + x) * 4 + c2] + orig[((y + 1) * w + (x + 1)) * 4 + c2]
        ) / 9;
        d[i + c2] = Math.min(255, Math.max(0, orig[i + c2] + amount * (orig[i + c2] - blur)));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // JPEG 93% — good quality with reasonable size
  return c.toDataURL("image/jpeg", 0.93);
}

// Crop the captured video frame to the viewfinder area
function cropToViewfinder(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  boxPct: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const dw = video.clientWidth || window.innerWidth;
  const dh = video.clientHeight || window.innerHeight;

  // object-fit: cover — scale to fill, then center-crop
  const scaleX = vw / dw;
  const scaleY = vh / dh;
  const coverScale = Math.max(scaleX, scaleY);

  // Offset of the video inside display (cover may overflow)
  const offsetX = (vw / coverScale - dw) / 2;
  const offsetY = (vh / coverScale - dh) / 2;

  // Viewfinder box in display coords
  const bx = boxPct.x * dw;
  const by = boxPct.y * dh;
  const bw = boxPct.w * dw;
  const bh = boxPct.h * dh;

  // Convert to video coords
  const cx = Math.round((bx + offsetX) * coverScale);
  const cy = Math.round((by + offsetY) * coverScale);
  const cw = Math.round(bw * coverScale);
  const ch = Math.round(bh * coverScale);

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}

async function callOcrApi(dataUrl: string): Promise<{ text: string; engine: string }> {
  const res = await fetch("/api/scan/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error("OCR API error " + res.status);
  const data = await res.json();
  return { text: (data.text as string) || "", engine: (data.engine as string) || "unknown" };
}

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

const OCR_STEPS = [
  { label: "AI Vision", icon: "🤖", color: "text-purple-400" },
  { label: "OCR locale", icon: "📖", color: "text-blue-400" },
  { label: "Cloud OCR", icon: "☁️", color: "text-cyan-400" },
];

// Viewfinder box as % of the camera display area (used for both rendering and crop)
const VF = { x: 0.05, y: 0.10, w: 0.90, h: 0.70 };

export default function LabelScanner({ onResult, onClose }: LabelScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const barcodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<ScanMode>("idle");
  const [statusMsg, setStatusMsg] = useState("Inquadra l'etichetta nel riquadro");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [detectedText, setDetectedText] = useState("");
  const [ocrStep, setOcrStep] = useState(0);
  const [scanLinePos, setScanLinePos] = useState(0);
  const [scanLineDir, setScanLineDir] = useState(1);

  useEffect(() => {
    if (mode !== "scanning") return;
    const interval = setInterval(() => {
      setScanLinePos(prev => {
        if (prev >= 100) { setScanLineDir(-1); return 98; }
        if (prev <= 0) { setScanLineDir(1); return 2; }
        return prev + scanLineDir * 1.5;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [mode, scanLineDir]);

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
      setStatusMsg("Inquadra l'etichetta nel riquadro");
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
          setMode("processing");
          setStatusMsg(`Barcode ${code} — ricerca in corso...`);
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
        if (name) { onResult(name, "barcode", undefined, "barcode"); return; }
      }
    } catch {}
    setStatusMsg("Barcode non trovato — analizzo l'etichetta...");
    await runOcrFlow();
  };

  const runOcrFlow = async (sourceDataUrl?: string) => {
    if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    setMode("processing");
    setDetectedText("");
    setOcrStep(0);

    let fullDataUrl: string;
    let croppedCanvas: HTMLCanvasElement | null = null;

    if (sourceDataUrl) {
      fullDataUrl = sourceDataUrl;
      setCapturedImage(fullDataUrl);
    } else {
      if (!videoRef.current || !canvasRef.current) {
        setStatusMsg("Errore cattura immagine"); setMode("error"); return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      fullDataUrl = canvas.toDataURL("image/jpeg", 0.97);
      setCapturedImage(fullDataUrl);

      // Crop to viewfinder area — OCR gets a clean, focused region
      try {
        croppedCanvas = cropToViewfinder(canvas, video, VF);
      } catch { /* fallback to full frame */ }
    }

    setStatusMsg("Analisi AI in corso...");

    const stepInterval = setInterval(() => {
      setOcrStep(prev => (prev + 1) % OCR_STEPS.length);
    }, 1800);

    try {
      // Use cropped viewfinder image (less background noise = better OCR)
      const ocrSource = croppedCanvas
        ? croppedCanvas.toDataURL("image/jpeg", 0.97)
        : fullDataUrl;

      const img = new Image();
      img.src = ocrSource;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
      const processed = prepareImageForApi(img);
      const { text: rawText, engine: ocrEngine } = await callOcrApi(processed);
      const cleaned = cleanOcrText(rawText);

      setDetectedText(cleaned);
      clearInterval(stepInterval);

      if (cleaned.length >= 2) {
        setMode("done");
        onResult(cleaned, "ocr", fullDataUrl, ocrEngine);
      } else {
        setStatusMsg("Nessun testo rilevato — avvicinati e riprova");
        setMode("error");
      }
    } catch (err) {
      clearInterval(stepInterval);
      setStatusMsg("Errore di connessione — riprova");
      setMode("error");
    }
  };

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

  const handleRetry = () => {
    setCapturedImage(null);
    setDetectedText("");
    setMode("scanning");
    setStatusMsg("Inquadra l'etichetta nel riquadro");
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe-top pt-3 pb-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Scan className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Scanner</p>
            <p className="text-white/40 text-[10px] mt-0.5">Etichetta · Barcode</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={flipCamera}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ── Camera area ─────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {permissionDenied ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Camera className="h-9 w-9 text-amber-400 opacity-70" />
            </div>
            <p className="text-lg font-semibold">Fotocamera non disponibile</p>
            <p className="text-sm text-white/50 max-w-xs">
              Abilita il permesso fotocamera nelle impostazioni del browser, oppure carica una foto dalla galleria.
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

            {/* ── Viewfinder overlay ─── */}
            {isScanning && !capturedImage && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Semi-transparent mask outside the scan box */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom,
                      rgba(0,0,0,0.5) ${VF.y * 100}%,
                      transparent ${VF.y * 100}%,
                      transparent ${(VF.y + VF.h) * 100}%,
                      rgba(0,0,0,0.5) ${(VF.y + VF.h) * 100}%
                    )`,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(0,0,0,0.5) ${VF.x * 100}%,
                      transparent ${VF.x * 100}%,
                      transparent ${(VF.x + VF.w) * 100}%,
                      rgba(0,0,0,0.5) ${(VF.x + VF.w) * 100}%
                    )`,
                  }}
                />

                {/* Scanning box positioned via VF percentages */}
                <div
                  className="absolute"
                  style={{
                    left: `${VF.x * 100}%`,
                    top: `${VF.y * 100}%`,
                    width: `${VF.w * 100}%`,
                    height: `${VF.h * 100}%`,
                  }}
                >
                  {/* Corner marks — amber glow */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={cn("absolute w-9 h-9 border-amber-400", cls)}
                      style={{ filter: "drop-shadow(0 0 7px rgba(251,191,36,0.9))" }}
                    />
                  ))}

                  {/* Animated laser scan line */}
                  <div
                    className="absolute left-3 right-3 h-px pointer-events-none"
                    style={{
                      top: `${scanLinePos}%`,
                      background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.9) 20%, rgba(251,191,36,1) 50%, rgba(251,191,36,0.9) 80%, transparent)",
                      boxShadow: "0 0 10px 3px rgba(251,191,36,0.45)",
                      transition: "top 16ms linear",
                    }}
                  />
                </div>

                {/* Hint text */}
                <p className="absolute bottom-28 left-0 right-0 text-center text-white/40 text-xs px-8 tracking-wide">
                  Barcode rilevato automaticamente · tocca per scattare
                </p>
              </div>
            )}

            {/* ── Processing overlay ─── */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                {/* Pulsing rings */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-amber-400/30 animate-ping" style={{ animationDelay: "0.2s" }} />
                  <div className="w-14 h-14 rounded-full border-3 border-t-amber-400 border-amber-400/20 animate-spin" style={{ borderWidth: 3 }} />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-white font-semibold text-base">{statusMsg}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {OCR_STEPS.map((step, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-500",
                          i === ocrStep
                            ? "bg-white/15 text-white scale-105"
                            : "text-white/30"
                        )}
                      >
                        <span>{step.icon}</span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Status strip ────────────────────────────────────────── */}
      <div className="bg-black/90 px-5 py-2.5 min-h-[40px] flex items-center justify-center">
        {detectedText ? (
          <div className="flex items-center gap-2 max-w-full">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-amber-400 text-sm font-medium truncate">"{detectedText}"</p>
          </div>
        ) : (
          <p className="text-white/50 text-sm text-center">{statusMsg}</p>
        )}
      </div>

      {/* ── Bottom controls ─────────────────────────────────────── */}
      <div className="bg-black px-6 pt-5 pb-10 safe-area-pb">
        <div className="flex items-center justify-between max-w-xs mx-auto">

          {/* Gallery */}
          <label className={cn("flex flex-col items-center gap-2 cursor-pointer", isProcessing && "opacity-40 pointer-events-none")}>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
            <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center hover:bg-white/12 hover:border-white/25 transition-all active:scale-95">
              <Upload className="h-6 w-6 text-white/60" />
            </div>
            <span className="text-white/40 text-[11px] font-medium">Galleria</span>
          </label>

          {/* Capture / Retry */}
          <div className="flex flex-col items-center gap-2">
            {mode === "error" ? (
              <button
                onClick={handleRetry}
                className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white shadow-xl shadow-amber-500/30 transition-all active:scale-95"
              >
                <RotateCcw className="h-8 w-8" />
              </button>
            ) : (
              <button
                onClick={() => { if (isScanning) runOcrFlow(); }}
                disabled={isProcessing || !isScanning}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95",
                  isProcessing
                    ? "bg-gray-800 cursor-not-allowed opacity-50"
                    : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30"
                )}
                style={!isProcessing ? { boxShadow: "0 0 0 4px rgba(251,191,36,0.15), 0 8px 32px rgba(251,191,36,0.3)" } : {}}
              >
                <Camera className="h-9 w-9" />
              </button>
            )}
            <span className="text-white/40 text-[11px] font-medium">
              {mode === "error" ? "Riprova" : "Scansiona"}
            </span>
          </div>

          {/* Manual search */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={cn("flex flex-col items-center gap-2", isProcessing && "opacity-40")}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center hover:bg-white/12 hover:border-white/25 transition-all active:scale-95">
              <Search className="h-6 w-6 text-white/60" />
            </div>
            <span className="text-white/40 text-[11px] font-medium">Cerca</span>
          </button>
        </div>
      </div>
    </div>
  );
}
