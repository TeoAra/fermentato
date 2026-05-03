import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Camera, X, Loader2, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function MicroblogNew() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createPost = useMutation({
    mutationFn: () =>
      apiRequest("/api/microblog/posts", { method: "POST" }, { content: content.trim(), imageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
      toast({ title: "Post pubblicato!" });
      navigate("/feed");
    },
    onError: () => toast({ title: "Errore", description: "Riprova", variant: "destructive" }),
  });

  const onPickImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Immagine troppo grande", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await apiRequest("/api/microblog/upload-image", { method: "POST" }, fd);
      setImageUrl(r.url);
    } catch (e: any) {
      toast({ title: "Upload fallito", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-stone-500">
        Accedi per scrivere un post.
      </div>
    );
  }

  const canSubmit = content.trim().length > 0 && !createPost.isPending;
  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] pb-24">
      <Helmet><title>Nuovo post | Fermenta.to</title></Helmet>

      <header className="sticky top-0 z-10 bg-white/95 dark:bg-[hsl(220,5%,18%)]/95 backdrop-blur-xl border-b border-stone-100 dark:border-stone-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/feed")} className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1 font-poppins">Nuovo post</h1>
        <Button onClick={() => createPost.mutate()} disabled={!canSubmit}
          size="sm" className="rounded-full px-4">
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Pubblica</>}
        </Button>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 1000))}
          placeholder="Cosa stai bevendo? Cosa pensi del mondo birrario oggi?"
          rows={6}
          className="rounded-2xl border-stone-200 dark:border-stone-700 text-base resize-none bg-white dark:bg-[hsl(220,5%,18%)]"
          autoFocus
        />
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{content.length}/1000</span>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />

        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="" className="w-full rounded-2xl object-cover max-h-80" />
            <button onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 bg-stone-900/70 text-white rounded-full p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-600 px-4 py-3 text-sm text-stone-500 dark:text-stone-400 hover:border-primary hover:text-primary transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? "Caricamento…" : "Aggiungi un'immagine"}
          </button>
        )}
      </div>
    </div>
  );
}
