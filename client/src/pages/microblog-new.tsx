import { useState, useRef, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Camera, X, Loader2, Send, ArrowLeft, Beer, MapPin, Building2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/rich-text-editor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type PrefillTag = {
  beerId?: number; beerName?: string;
  pubId?: number; pubName?: string;
  breweryId?: number; breweryName?: string;
  eventId?: number; eventSourceType?: "pub" | "brewery"; eventName?: string;
};

export default function MicroblogNew() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse prefill from query string
  const prefill: PrefillTag = useMemo(() => {
    const sp = new URLSearchParams(search);
    const intOrUndef = (k: string) => {
      const v = sp.get(k);
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const evType = sp.get("eventSourceType");
    return {
      beerId: intOrUndef("beerId"),
      beerName: sp.get("beerName") || undefined,
      pubId: intOrUndef("pubId"),
      pubName: sp.get("pubName") || undefined,
      breweryId: intOrUndef("breweryId"),
      breweryName: sp.get("breweryName") || undefined,
      eventId: intOrUndef("eventId"),
      eventSourceType: evType === "pub" || evType === "brewery" ? evType : undefined,
      eventName: sp.get("eventName") || undefined,
    };
  }, [search]);

  // Generate initial content suggestion if there's a tag (just leave content empty,
  // but render a removable tag chip above the textarea so the user knows it's attached)
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState<PrefillTag>(prefill);
  const fileRef = useRef<HTMLInputElement>(null);

  const createPost = useMutation({
    mutationFn: () =>
      apiRequest("/api/microblog/posts", { method: "POST" }, {
        content: content.trim(),
        imageUrl,
        beerId: tag.beerId ?? null,
        pubId: tag.pubId ?? null,
        breweryId: tag.breweryId ?? null,
        eventId: tag.eventId ?? null,
        eventSourceType: tag.eventSourceType ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts"] });
      toast({ title: "Post pubblicato!" });
      // Bounce back to the entity page if we came from one, otherwise to /feed
      if (tag.pubId) navigate(`/pub/${tag.pubId}`);
      else if (tag.breweryId) navigate(`/brewery/${tag.breweryId}`);
      else if (tag.beerId) navigate(`/beer/${tag.beerId}`);
      else if (tag.eventId && tag.eventSourceType) navigate(`/eventi/${tag.eventSourceType}/${tag.eventId}`);
      else navigate("/feed");
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-stone-500 gap-3">
        <p>Accedi per scrivere un post.</p>
        <Link href="/auth"><Button>Accedi</Button></Link>
      </div>
    );
  }

  const canSubmit = content.trim().length > 0 && !createPost.isPending;
  const hasTag = !!(tag.pubId || tag.breweryId || tag.beerId || tag.eventId);

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet><title>Nuovo post | Fermenta.to</title></Helmet>

      <header className="sticky top-0 z-10 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border-b border-stone-100 dark:border-[#23262E] px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/feed")} className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#1A1D24]" data-testid="btn-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1 font-poppins">Nuovo post</h1>
        <Button onClick={() => createPost.mutate()} disabled={!canSubmit}
          size="sm" className="rounded-full px-4" data-testid="btn-publish-post">
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Pubblica</>}
        </Button>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {hasTag && (
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Tag allegato</p>
            <div className="flex flex-wrap gap-1.5" data-testid="prefill-tags">
              {tag.beerId && tag.beerName && (
                <button onClick={() => setTag(t => ({ ...t, beerId: undefined, beerName: undefined }))}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold hover:bg-primary/20 transition" data-testid="tag-chip-beer">
                  <Beer className="w-3 h-3" /> {tag.beerName} <X className="w-3 h-3 opacity-70" />
                </button>
              )}
              {tag.pubId && tag.pubName && (
                <button onClick={() => setTag(t => ({ ...t, pubId: undefined, pubName: undefined }))}
                  className="inline-flex items-center gap-1 text-xs bg-stone-100 dark:bg-[#1A1D24] text-stone-700 dark:text-stone-200 px-2.5 py-1 rounded-full font-medium hover:bg-stone-200 dark:hover:bg-[#12151A] transition" data-testid="tag-chip-pub">
                  <MapPin className="w-3 h-3" /> {tag.pubName} <X className="w-3 h-3 opacity-70" />
                </button>
              )}
              {tag.breweryId && tag.breweryName && (
                <button onClick={() => setTag(t => ({ ...t, breweryId: undefined, breweryName: undefined }))}
                  className="inline-flex items-center gap-1 text-xs bg-stone-100 dark:bg-[#1A1D24] text-stone-700 dark:text-stone-200 px-2.5 py-1 rounded-full font-medium hover:bg-stone-200 dark:hover:bg-[#12151A] transition" data-testid="tag-chip-brewery">
                  <Building2 className="w-3 h-3" /> {tag.breweryName} <X className="w-3 h-3 opacity-70" />
                </button>
              )}
              {tag.eventId && tag.eventName && (
                <button onClick={() => setTag(t => ({ ...t, eventId: undefined, eventSourceType: undefined, eventName: undefined }))}
                  className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition" data-testid="tag-chip-event">
                  <CalendarDays className="w-3 h-3" /> {tag.eventName} <X className="w-3 h-3 opacity-70" />
                </button>
              )}
            </div>
          </div>
        )}

        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder={
            tag.beerName ? `Cosa pensi di ${tag.beerName}? Usa #hashtag per categorie.` :
            tag.pubName ? `Racconta la tua esperienza a ${tag.pubName}…` :
            tag.breweryName ? `Cosa pensi di ${tag.breweryName}?` :
            tag.eventName ? `Sei a ${tag.eventName}? Racconta com'è!` :
            "Cosa stai bevendo? Vai a capo, usa emoji 🍺🇮🇹, #hashtag per categorie."
          }
          maxChars={1000}
        />
        <div className="text-xs text-stone-400">
          Emoji, a capo e <span className="text-primary font-semibold">#hashtag</span> benvenuti
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
