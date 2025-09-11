import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Camera, RefreshCw, AlertCircle, CheckCircle2, FileImage, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface ImageUploadProps {
  label: string;
  description?: string;
  currentImageUrl?: string;
  onImageChange: (url: string | null) => void;
  folder: string; // cloudinary folder (e.g., "pub-logos", "pub-covers")
  aspectRatio?: "square" | "landscape" | "portrait";
  maxSize?: number; // in MB
  recommendedDimensions?: string;
  acceptedFormats?: string[];
  showFileInfo?: boolean;
  disabled?: boolean;
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
  showFileInfo = true,
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Utility functions
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
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return progressInterval;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadState('uploading');
      setError(null);
      
      // Simulate progress since we can't get real progress from fetch
      const progressInterval = simulateProgress();

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload fallito');
        }

        const result = await response.json();
        return result.url;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (url: string) => {
      setUploadState('success');
      setPreview(url);
      onImageChange(url);
      
      // Show success state briefly then return to idle
      setTimeout(() => {
        setUploadState('idle');
        setUploadProgress(0);
      }, 2000);

      toast({
        title: "✅ Successo!",
        description: "Immagine caricata correttamente",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      setUploadState('error');
      setError(error.message);
      setUploadProgress(0);
      
      toast({
        title: "❌ Errore Upload",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (disabled || uploadState === 'uploading') return;

    // Reset previous error
    setError(null);
    
    // Set file info
    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type.split('/')[1].toUpperCase()
    });

    // Enhanced validation with specific error messages
    if (file.size > maxSize * 1024 * 1024) {
      const errorMsg = `Il file è troppo grande (${formatFileSize(file.size)}). Dimensione massima: ${maxSize}MB`;
      setError(errorMsg);
      setUploadState('error');
      toast({
        title: "⚠️ File troppo grande",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Validate file type with detailed feedback
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      const errorMsg = `Formato non supportato (${file.type.split('/')[1].toUpperCase()}). Usa: ${acceptedFormats.join(', ')}`;
      setError(errorMsg);
      setUploadState('error');
      toast({
        title: "⚠️ Formato non valido",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Additional validation for very small files
    if (file.size < 1024) {
      const errorMsg = "Il file sembra essere corrotto o troppo piccolo";
      setError(errorMsg);
      setUploadState('error');
      toast({
        title: "⚠️ File non valido",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    uploadMutation.mutate(file);
  }, [disabled, uploadState, maxSize, acceptedFormats, uploadMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || uploadState === 'uploading') return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    } else if (files.length > 1) {
      toast({
        title: "⚠️ Troppi file",
        description: "Puoi caricare solo un'immagine alla volta",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [disabled, uploadState, handleFileSelect, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && uploadState !== 'uploading') {
      setIsDragging(true);
    }
  }, [disabled, uploadState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging false if we're leaving the drop zone container
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback(() => {
    if (uploadState === 'uploading') return;
    
    setPreview(null);
    setFileInfo(null);
    setError(null);
    setUploadState('idle');
    setUploadProgress(0);
    onImageChange(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    toast({
      title: "🗑️ Immagine rimossa",
      description: "L'immagine è stata rimossa correttamente",
      duration: 2000,
    });
  }, [uploadState, onImageChange, toast]);

  const handleRetry = useCallback(() => {
    if (fileInfo && fileInputRef.current?.files?.[0]) {
      handleFileSelect(fileInputRef.current.files[0]);
    }
  }, [fileInfo, handleFileSelect]);

  const handleClickUpload = useCallback(() => {
    if (!disabled && uploadState !== 'uploading') {
      fileInputRef.current?.click();
    }
  }, [disabled, uploadState]);

  const aspectRatioClasses = {
    square: "aspect-square",
    landscape: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  const getStateIcon = () => {
    switch (uploadState) {
      case 'uploading':
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Camera className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStateColor = () => {
    switch (uploadState) {
      case 'uploading':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return isDragging 
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </Label>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {getStateIcon()}
      </div>

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className={`relative overflow-hidden rounded-xl border-2 ${aspectRatioClasses[aspectRatio]} max-w-sm shadow-lg`}>
              <img
                src={preview}
                alt="Preview immagine caricata"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
              
              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full w-8 h-8 p-0 bg-white/90 hover:bg-white shadow-lg"
                  onClick={handleClickUpload}
                  disabled={uploadState === 'uploading'}
                  data-testid="button-change-image"
                >
                  <Upload className="w-3 h-3" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full w-8 h-8 p-0 shadow-lg"
                  onClick={handleRemoveImage}
                  disabled={uploadState === 'uploading'}
                  data-testid="button-remove-image"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Upload progress overlay */}
              {uploadState === 'uploading' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <div className="text-sm font-medium">Caricamento...</div>
                    <div className="text-xs opacity-75">{Math.round(uploadProgress)}%</div>
                  </div>
                </div>
              )}
            </div>

            {/* File info */}
            {showFileInfo && fileInfo && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FileImage className="w-3 h-3" />
                <span>{fileInfo.name}</span>
                <span>•</span>
                <span>{fileInfo.size}</span>
                <span>•</span>
                <span>{fileInfo.type}</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={dropZoneRef}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
                ${aspectRatioClasses[aspectRatio]} max-w-sm
                ${getStateColor()}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isDragging ? 'scale-105' : 'hover:scale-102'}
                flex flex-col items-center justify-center relative overflow-hidden
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClickUpload}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Carica ${label.toLowerCase()}`}
              aria-describedby="upload-description"
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault();
                  handleClickUpload();
                }
              }}
              data-testid="dropzone-upload"
            >
              {/* Background pattern for drag effect */}
              {isDragging && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 opacity-50" />
              )}

              <div className="relative z-10">
                {uploadState === 'error' ? (
                  <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                ) : (
                  <motion.div
                    animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Upload className="w-16 h-16 text-gray-400 mb-4" />
                  </motion.div>
                )}
                
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {uploadState === 'error' ? 'Errore nel caricamento' : 
                   isDragging ? 'Rilascia qui' : 'Carica immagine'}
                </h3>
                
                <p id="upload-description" className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {uploadState === 'error' ? error :
                   isDragging ? 'Rilascia l\'immagine per caricarla' : 
                   'Trascina un\'immagine qui o clicca per selezionare'}
                </p>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Max {maxSize}MB • {acceptedFormats.join(', ')}</div>
                  {recommendedDimensions && (
                    <div>Consigliato: {recommendedDimensions}</div>
                  )}
                </div>

                {/* Error retry button */}
                {uploadState === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry();
                    }}
                    data-testid="button-retry-upload"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Riprova
                  </Button>
                )}
              </div>
            </div>

            {/* Upload progress bar */}
            {uploadState === 'uploading' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Caricamento in corso...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress 
                  value={uploadProgress} 
                  className="h-2"
                  data-testid="progress-upload"
                />
                {fileInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                    <FileImage className="w-3 h-3" />
                    <span>{fileInfo.name} ({fileInfo.size})</span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
        data-testid="input-file-hidden"
      />
    </div>
  );
}