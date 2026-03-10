import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Scan, Upload, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanMode = "idle" | "scanning" | "preview" | "processing" | "done" | "error";

interface LabelScannerProps {
  onResult: (text: string, source: "ocr" | "barcode") => void;
  onClose: () => void;
}

// ─── Image preprocessing pipeline ────────────────────────────────────────────
// Converts a raw canvas frame into a high-contrast greyscale PNG ready for OCR.
// Steps: scale-up → greyscale → contrast stretch → unsharp mask
function preprocessForOcr(sourceCanvas: HTMLCanvasElement): string {
  const TARGET_WIDTH = 2048;
  const scale = Math.max(1, TARGET_WIDTH / sourceCanvas.width);
  const w = Math.round(sourceCanvas.width * scale);
  const h = Math.round(sourceCanvas.height * scale);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;

  // 1. Scale up with smoothing disabled for crisper text
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 2. Greyscale (luminosity method)
  const grey = new Uint8ClampedArray(w * h);
  for (let i = 0; i < grey.length; i++) {
    const p = i * 4;
    grey[i] = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
  }

  // 3. Contrast stretch (percentile-based, ignore top/bottom 1%)
  const sorted = Float32Array.from(grey).sort();
  const lo = sorted[Math.floor(sorted.length * 0.01)];
  const hi = sorted[Math.floor(sorted.length * 0.99)];
  const range = hi - lo || 1;
  const stretched = new Uint8ClampedArray(grey.length);
  for (let i = 0; i < grey.length; i++) {
    stretched[i] = Math.min(255, Math.max(0, Math.round(((grey[i] - lo) / range) * 255)));
  }

  // 4. Unsharp mask (amount=1.5, radius=1 approximated with Gaussian kernel)
  // Kernel: Gaussian 3×3 σ≈1  → [1,2,1; 2,4,2; 1,2,1]/16
  const blurred = new Uint8ClampedArray(stretched.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      blurred[i] = Math.round(
        (stretched[i - w - 1] + 2 * stretched[i - w] + stretched[i - w + 1] +
          2 * stretched[i - 1] + 4 * stretched[i] + 2 * stretched[i + 1] +
          stretched[i + w - 1] + 2 * stretched[i + w] + stretched[i + w + 1]) / 16
      );
    }
  }
  const AMOUNT = 1.8;
  const sharp = new Uint8ClampedArray(stretched.length);
  for (let i = 0; i < stretched.length; i++) {
    sharp[i] = Math.min(255, Math.max(0, Math.round(stretched[i] + AMOUNT * (stretched[i] - blurred[i]))));
  }

  // 5. Write back to canvas as RGBA greyscale
  for (let i = 0; i < sharp.length; i++) {
    const p = i * 4;
    d[p] = d[p + 1] = d[p + 2] = sharp[i];
    d[p + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return out.toDataURL("image/png");
}

// ─── OCR runner ───────────────────────────────────────────────────────────────
// Runs Tesseract with multiple PSM passes and picks the most confident result.
async function runOcr(
  imgData: string,
  onProgress: (pct: number) => void
): Promise<{ text: string; confidence: number }> {
  const Tesseract = await import("tesseract.js");

  // PSM 6 = uniform block of text (good for labels with clear blocks)
  // PSM 11 = sparse text, grabs everything (good for scattered text)
  const results: Array<{ text: string; confidence: number }> = [];

  for (const psm of [6, 11, 3] as const) {
    const worker = await Tesseract.createWorker("ita+eng", 1, {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: String(psm) as any,
      // Only keep printable chars + Italian accented letters
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
        "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ" +
        "0123456789 -.,'&()/°%",
    });

    const { data } = await worker.recognize(imgData);
    await worker.terminate();

    // Filter words by confidence ≥ 40 and length ≥ 2
    const words = (data.words || [])
      .filter((w: any) => w.confidence >= 40 && w.text.trim().length >= 2)
      .map((w: any) => w.text.trim());

    const avgConf =
      data.words?.length > 0
        ? data.words.reduce((s: number, w: any) => s + w.confidence, 0) / data.words.length
        : 0;

    if (words.length > 0) {
      results.push({ text: words.slice(0, 10).join(" "), confidence: avgConf });
    }
  }

  if (results.length === 0) return { text: "", confidence: 0 };
  // Pick the result with highest average confidence
  return results.reduce((best, cur) => (cur.confidence > best.confidence ? cur : best));
}

// ─── Clean OCR text for search ────────────────────────────────────────────────
function cleanOcrText(raw: string): string {
  return raw
    .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(w => w.length >= 2)
    .slice(0, 8)
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
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
  const [showPreprocessed, setShowPreprocessed] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [detectedWords, setDetectedWords] = useState<string>("");

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("scanning");
      setStatusMsg("Punta la fotocamera sull'etichetta o sul barcode");
    } catch (err: any) {
      if (err.name === "NotAllowedError") setPermissionDenied(true);
      setStatusMsg("Errore nell'avvio della fotocamera");
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
          setStatusMsg(`Barcode: ${code} — cerco nel database...`);
          setMode("processing");
          await lookupBarcode(code);
        }
      } catch {}
    }, 600);
  };

  const lookupBarcode = async (code: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || p.product_name_it || p.product_name_en || "";
        const brand = p.brands || "";
        const combined = [name, brand].filter(Boolean).join(" ").trim();
        if (combined) { onResult(combined, "barcode"); return; }
      }
    } catch {}
    setStatusMsg("Barcode non in catalogo — passo all'OCR dell'etichetta...");
    await captureAndOcr();
  };

  // Capture current video frame into the hidden canvas, run preprocessing + OCR
  const captureAndOcr = async (sourceDataUrl?: string) => {
    if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    setMode("processing");
    setOcrProgress(0);
    setOcrConfidence(null);
    setDetectedWords("");

    let rawImg: string;

    if (sourceDataUrl) {
      rawImg = sourceDataUrl;
    } else {
      if (!videoRef.current || !canvasRef.current) {
        setStatusMsg("Errore nella cattura"); setMode("error"); return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      rawImg = canvas.toDataURL("image/jpeg", 0.95);
    }

    setCapturedImage(rawImg);
    setStatusMsg("Pre-processing immagine...");

    // Build a temp canvas from the raw data URL for preprocessing
    let processedDataUrl = rawImg;
    try {
      const img = new Image();
      img.src = rawImg;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
      });
      const tmp = document.createElement("canvas");
      tmp.width = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext("2d")!.drawImage(img, 0, 0);
      processedDataUrl = preprocessForOcr(tmp);
      setPreprocessedImage(processedDataUrl);
    } catch {
      // If preprocessing fails, use raw image
    }

    setStatusMsg("Analisi OCR in corso (multi-pass)...");

    try {
      const { text, confidence } = await runOcr(processedDataUrl, (pct) => setOcrProgress(pct));
      setOcrConfidence(Math.round(confidence));

      const cleaned = cleanOcrText(text);
      setDetectedWords(cleaned);

      if (cleaned.length >= 2) {
        setMode("done");
        onResult(cleaned, "ocr");
      } else {
        setStatusMsg("Testo non rilevato — avvicinati all'etichetta e riprova");
        setMode("error");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setStatusMsg("Errore analisi OCR. Riprova.");
      setMode("error");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) captureAndOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setPreprocessedImage(null);
    setShowPreprocessed(false);
    setOcrProgress(0);
    setOcrConfidence(null);
    setDetectedWords("");
    setMode("scanning");
    setStatusMsg("Punta la fotocamera sull'etichetta o sul barcode");
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
  const displayImage = showPreprocessed && preprocessedImage ? preprocessedImage : capturedImage;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/70 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <Scan className="h-5 w-5 text-amber-400" />
          <span className="font-semibold text-sm">Scansiona Etichetta</span>
        </div>
        <div className="flex items-center gap-2">
          {preprocessedImage && (
            <button
              onClick={() => setShowPreprocessed(v => !v)}
              className={cn(
                "text-xs px-2 py-1 rounded-full transition-colors",
                showPreprocessed
                  ? "bg-amber-500 text-white"
                  : "text-white/60 border border-white/20 hover:text-white"
              )}
            >
              {showPreprocessed ? "Pre-proc" : "Originale"}
            </button>
          )}
          <button
            onClick={flipCamera}
            disabled={isProcessing}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Camera view */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {permissionDenied ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4 px-8 text-center">
            <Camera className="h-16 w-16 text-amber-400 opacity-60" />
            <p className="text-lg font-medium">Fotocamera non disponibile</p>
            <p className="text-sm text-white/60">
              Abilita l'accesso alla fotocamera nelle impostazioni del browser,
              oppure carica una foto dalla galleria.
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                displayImage ? "opacity-0" : "opacity-100"
              )}
              playsInline
              muted
            />

            {displayImage && (
              <img
                src={displayImage}
                alt="Catturato"
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder */}
            {isScanning && !displayImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Dark overlay with hole */}
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative z-10 w-72 h-52">
                  <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-amber-400 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-amber-400 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-amber-400 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-amber-400 rounded-br-2xl" />
                  {/* Scanning line */}
                  <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
                </div>
                <p className="absolute bottom-32 left-0 right-0 text-center text-white/60 text-xs px-8">
                  Inquadra tutta l'etichetta nel riquadro
                </p>
              </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-5 px-8">
                <div className="w-14 h-14 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs text-white/60 mb-1.5">
                    <span>OCR multi-pass</span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
                <p className="text-white/70 text-sm text-center">{statusMsg}</p>
              </div>
            )}

            {/* Confidence badge after done */}
            {mode === "done" && ocrConfidence !== null && (
              <div className="absolute top-4 left-4 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Confidenza: {ocrConfidence}%
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-black/80 px-4 py-2.5 text-center min-h-[40px]">
        {detectedWords ? (
          <p className="text-amber-400 text-sm font-medium truncate">
            Letto: "{detectedWords}"
          </p>
        ) : (
          <p className="text-white/80 text-sm">{statusMsg}</p>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black p-4 pb-8 safe-area-pb">
        <div className="flex items-center justify-center gap-6">
          {/* Upload */}
          <label className="cursor-pointer flex flex-col items-center gap-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <div className="w-14 h-14 rounded-2xl border border-white/25 flex items-center justify-center text-white/70 hover:border-white/50 hover:text-white transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-white/50 text-xs">Galleria</span>
          </label>

          {/* Main capture / retry button */}
          {mode === "error" ? (
            <button
              onClick={handleRetry}
              className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 transition-all duration-200 active:scale-95"
            >
              <RotateCcw className="h-8 w-8" />
            </button>
          ) : (
            <button
              onClick={() => isScanning && captureAndOcr()}
              disabled={isProcessing || !isScanning}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200 active:scale-95",
                isProcessing
                  ? "bg-gray-700 cursor-not-allowed opacity-60"
                  : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/40"
              )}
            >
              <Camera className="h-9 w-9" />
            </button>
          )}

          {/* Manual */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-2xl border border-white/25 flex items-center justify-center text-white/70 hover:border-white/50 hover:text-white transition-colors">
              <span className="text-xl">✏️</span>
            </div>
            <span className="text-white/50 text-xs">Manuale</span>
          </button>
        </div>

        <p className="text-white/30 text-xs text-center mt-3 leading-relaxed">
          Il barcode viene rilevato in automatico · premi il tasto per leggere il testo
        </p>
      </div>
    </div>
  );
}
