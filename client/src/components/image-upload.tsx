import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface ImageUploadProps {
  label: string;
  description?: string;
  currentImageUrl?: string;
  onImageChange: (url: string | null) => void;
  folder: string;
  aspectRatio?: "square" | "landscape" | "portrait";
  maxSize?: number;
  recommendedDimensions?: string;
  acceptedFormats?: string[];
  showFileInfo?: boolean;
  disabled?: boolean;
  hideStateIcon?: boolean;
}

export function ImageUpload({
  label,
  description,
  currentImageUrl,
  onImageChange,
  folder,
  aspectRatio = "square",
  maxSize = 5,
  recommendedDimensions,
  acceptedFormats = ['JPG', 'PNG', 'WebP'],
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (uploadState === 'idle') {
      setPreview(currentImageUrl || null);
    }
  }, [currentImageUrl]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return prev; }
        return prev + Math.random() * 15;
      });
    }, 200);
    return progressInterval;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadState('uploading');
      setError(null);
      const progressInterval = simulateProgress();
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);
        const response = await fetch('/api/upload/image', { method: 'POST', body: formData, credentials: 'include' });
        clearInterval(progressInterval);
        setUploadProgress(100);
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const err = await response.json();
            throw new Error(err.message || 'Upload fallito');
          }
          throw new Error(response.status === 401 ? 'Sessione scaduta.' : `Upload fallito (${response.status})`);
        }
        const result = await response.json();
        return result.url;
      } catch (err) {
        clearInterval(progressInterval);
        throw err;
      }
    },
    onSuccess: (url: string) => {
      setUploadState('success');
      setPreview(url);
      onImageChange(url);
      setTimeout(() => { setUploadState('idle'); setUploadProgress(0); }, 1500);
      toast({ title: "Immagine caricata", duration: 2000 });
    },
    onError: (err: Error) => {
      setUploadState('error');
      setError(err.message);
      setUploadProgress(0);
      toast({ title: "Errore upload", description: err.message, variant: "destructive", duration: 4000 });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (disabled || uploadState === 'uploading') return;
    setError(null);
    if (file.size > maxSize * 1024 * 1024) {
      toast({ title: "File troppo grande", description: `Max ${maxSize}MB`, variant: "destructive" });
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({ title: "Formato non valido", description: `Usa: ${acceptedFormats.join(', ')}`, variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file);
  }, [disabled, uploadState, maxSize, acceptedFormats, uploadMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploadState === 'uploading') return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files[0]);
  }, [disabled, uploadState, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && uploadState !== 'uploading') setIsDragging(true);
  }, [disabled, uploadState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleRemoveImage = useCallback(() => {
    if (uploadState === 'uploading') return;
    setPreview(null);
    setError(null);
    setUploadState('idle');
    setUploadProgress(0);
    onImageChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadState, onImageChange]);

  const handleClickUpload = useCallback(() => {
    if (!disabled && uploadState !== 'uploading') fileInputRef.current?.click();
  }, [disabled, uploadState]);

  const thumbnailClasses = aspectRatio === 'landscape'
    ? 'w-32 h-20 flex-shrink-0'
    : 'w-16 h-16 flex-shrink-0';

  return (
    <div className="space-y-2">
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex items-center gap-4 p-3 rounded-xl border-2 transition-all duration-200
          ${isDragging ? 'border-orange-400 bg-stone-50 dark:bg-stone-900/30' : 'border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30'}
          ${uploadState === 'error' ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : ''}
          ${uploadState === 'uploading' ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Thumbnail / Placeholder */}
        <div
          className={`${thumbnailClasses} rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 relative border border-gray-200 dark:border-gray-700`}
          onClick={!preview ? handleClickUpload : undefined}
          style={{ cursor: !preview ? 'pointer' : 'default' }}
        >
          {preview ? (
            <>
              <img src={preview} alt="Anteprima" className="w-full h-full object-cover" />
              {uploadState === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {uploadState === 'success' && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              {uploadState === 'error' ? (
                <AlertCircle className="w-6 h-6 text-red-400" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
          )}
        </div>

        {/* Info + Actions (stacked vertically to avoid overflow on mobile) */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
            Max {maxSize}MB · {acceptedFormats.join(', ')}
            {recommendedDimensions && ` · ${recommendedDimensions}`}
          </p>
          {uploadState === 'error' && error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
          {/* Buttons below info text so they don't overflow on narrow screens */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClickUpload}
              disabled={disabled || uploadState === 'uploading'}
              className="h-7 px-2.5 text-xs"
              data-testid="button-change-image"
            >
              {uploadState === 'uploading' ? (
                <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />{Math.round(uploadProgress)}%</>
              ) : (
                <><Upload className="w-3 h-3 mr-1" />{preview ? 'Cambia' : 'Carica'}</>
              )}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled || uploadState === 'uploading'}
                className="h-7 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                data-testid="button-remove-image"
              >
                <X className="w-3 h-3 mr-1" />
                Rimuovi
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploadState === 'uploading' && (
        <div className="px-1">
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files; if (f && f.length > 0) handleFileSelect(f[0]); }}
        className="hidden"
        disabled={disabled}
        data-testid="input-file-hidden"
      />
    </div>
  );
}
