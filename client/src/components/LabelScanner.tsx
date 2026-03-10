import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Scan, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScanMode = "idle" | "scanning" | "capturing" | "processing" | "done" | "error";

interface LabelScannerProps {
  onResult: (text: string, source: "ocr" | "barcode") => void;
  onClose: () => void;
}

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
  const [ocrProgress, setOcrProgress] = useState(0);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
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
      if (err.name === "NotAllowedError") {
        setPermissionDenied(true);
        setStatusMsg("Accesso alla fotocamera negato");
      } else {
        setStatusMsg("Errore nell'avvio della fotocamera");
      }
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
        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          clearInterval(barcodeIntervalRef.current!);
          const code = barcodes[0].rawValue;
          setStatusMsg(`Barcode rilevato: ${code} — cerco...`);
          setMode("processing");
          await lookupBarcode(code);
        }
      } catch {}
    }, 800);
  };

  const lookupBarcode = async (code: string) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const productName = p.product_name || p.product_name_it || p.product_name_en || "";
        const brand = p.brands || "";
        const combined = [productName, brand].filter(Boolean).join(" ");
        if (combined.trim()) {
          onResult(combined.trim(), "barcode");
          return;
        }
      }
    } catch {}
    setStatusMsg("Barcode non trovato nel database — provo con OCR...");
    await captureAndOcr();
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const captureAndOcr = async () => {
    if (barcodeIntervalRef.current) clearInterval(barcodeIntervalRef.current);
    setMode("processing");

    const imgData = captureFrame();
    if (!imgData) {
      setStatusMsg("Errore nella cattura dell'immagine");
      setMode("error");
      return;
    }
    setCapturedImage(imgData);
    setStatusMsg("Analisi dell'etichetta in corso...");

    try {
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("ita+eng", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round((m.progress || 0) * 100));
          }
        },
      });
      const { data } = await worker.recognize(imgData);
      await worker.terminate();

      const rawText = data.text || "";
      const cleaned = cleanOcrText(rawText);

      if (cleaned.length >= 3) {
        setMode("done");
        onResult(cleaned, "ocr");
      } else {
        setStatusMsg("Testo non leggibile — riprova avvicinandoti all'etichetta");
        setMode("error");
      }
    } catch (err) {
      console.error("Tesseract error:", err);
      setStatusMsg("Errore durante l'analisi. Riprova.");
      setMode("error");
    }
  };

  const cleanOcrText = (raw: string): string => {
    return raw
      .replace(/[^a-zA-ZÀ-ÿ0-9\s\-'\.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(w => w.length >= 2)
      .slice(0, 8)
      .join(" ");
  };

  const handleCapture = () => {
    if (mode === "scanning" || mode === "idle") {
      captureAndOcr();
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setOcrProgress(0);
    setMode("scanning");
    setStatusMsg("Punta la fotocamera sull'etichetta o sul barcode");
    startBarcodeLoop();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imgData = ev.target?.result as string;
      if (!imgData) return;
      setCapturedImage(imgData);
      setMode("processing");
      setStatusMsg("Analisi immagine caricata...");

      try {
        const Tesseract = await import("tesseract.js");
        const worker = await Tesseract.createWorker("ita+eng", 1, {
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round((m.progress || 0) * 100));
            }
          },
        });
        const { data } = await worker.recognize(imgData);
        await worker.terminate();
        const cleaned = cleanOcrText(data.text || "");
        if (cleaned.length >= 3) {
          setMode("done");
          onResult(cleaned, "ocr");
        } else {
          setStatusMsg("Testo non leggibile — prova con un'immagine più nitida");
          setMode("error");
        }
      } catch {
        setStatusMsg("Errore durante l'analisi.");
        setMode("error");
      }
    };
    reader.readAsDataURL(file);
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
      <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <Scan className="h-5 w-5 text-amber-400" />
          <span className="font-semibold text-sm">Scansiona Etichetta</span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Camera / Captured image view */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {permissionDenied ? (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4 px-8 text-center">
            <Camera className="h-16 w-16 text-amber-400 opacity-60" />
            <p className="text-lg font-medium">Fotocamera non disponibile</p>
            <p className="text-sm text-white/70">Abilita l'accesso alla fotocamera nelle impostazioni del browser.</p>
            <p className="text-sm text-white/50 mt-2">Puoi comunque caricare una foto dall'album.</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                capturedImage ? "opacity-0" : "opacity-100"
              )}
              playsInline
              muted
            />
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Catturato"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder overlay - only during scanning */}
            {isScanning && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-72 h-48">
                  <div className="absolute inset-0 rounded-xl border-2 border-amber-400/60" />
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-amber-400/40 animate-pulse" />
                </div>
              </div>
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                {ocrProgress > 0 && (
                  <div className="w-48 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-white text-sm font-medium">
                  {ocrProgress > 0 ? `Analisi ${ocrProgress}%` : "Elaborazione..."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-black/80 px-4 py-3 text-center">
        <p className="text-white/90 text-sm">{statusMsg}</p>
      </div>

      {/* Bottom controls */}
      <div className="bg-black p-4 pb-8 safe-area-pb">
        <div className="flex items-center justify-between gap-3">
          {/* Upload from gallery */}
          <label className="flex-1 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <div className="flex flex-col items-center gap-1 py-3 px-4 rounded-2xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-colors">
              <Upload className="h-5 w-5" />
              <span className="text-xs">Galleria</span>
            </div>
          </label>

          {/* Main capture button */}
          {mode === "error" ? (
            <button
              onClick={handleRetry}
              className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white shadow-2xl shadow-amber-500/30 transition-all duration-200 active:scale-95"
            >
              <RotateCcw className="h-8 w-8" />
            </button>
          ) : (
            <button
              onClick={handleCapture}
              disabled={isProcessing || !isScanning}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200 active:scale-95",
                isProcessing
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30"
              )}
            >
              <Camera className="h-9 w-9" />
            </button>
          )}

          {/* Manual search fallback */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 flex flex-col items-center gap-1 py-3 px-4 rounded-2xl border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-colors"
          >
            <span className="text-lg">✏️</span>
            <span className="text-xs">Manuale</span>
          </button>
        </div>

        <p className="text-white/40 text-xs text-center mt-3">
          Il barcode viene rilevato automaticamente — oppure premi il pulsante per leggere l'etichetta
        </p>
      </div>
    </div>
  );
}
