/**
 * InlinePostComposer — Facebook-style expanding composer.
 * Used in social feed (desktop) and activity Sociale tab (mobile).
 */
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Send, AtSign, Loader2, X, Camera, PenSquare, Search,
  Beer as BeerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/* ── tiny inline avatar ── */
function Avatar({ user, size = 9 }: { user: any; size?: number }) {
  const name = user?.firstName ?? user?.first_name ?? user?.display_name ?? user?.nickname ?? "?";
  const img  = user?.profileImageUrl ?? user?.profile_image_url;
  const sz   = `w-${size} h-${size}`;
  return img ? (
    <img src={img} alt={name}
      className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-[#1A1D24]`} />
  ) : (
    <div className={`${sz} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-[#1A1D24]`}>
      <span className="text-primary font-black text-sm">{(name[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

/* ── mention picker ── */
function MentionPicker({ onSelect, onClose }: { onSelect: (u: any) => void; onClose: () => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        if (r.ok) setResults(await r.json());
      } finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);
  return (
    <div className="bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100 dark:border-[#23262E]">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Cerca utente…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-stone-400" />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-stone-400 shrink-0" />}
        <button onClick={onClose} className="p-0.5 rounded-full hover:bg-stone-100 dark:hover:bg-[#23262E]">
          <X className="w-4 h-4 text-stone-400" />
        </button>
      </div>
      {results.length > 0 ? (
        <ul className="max-h-44 overflow-y-auto divide-y divide-stone-50 dark:divide-[#23262E]">
          {results.map(u => {
            const display = u.nickname || [u.first_name, u.last_name].filter(Boolean).join(" ") || "utente";
            return (
              <li key={u.id}>
                <button onClick={() => onSelect(u)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 dark:hover:bg-[#23262E] text-left transition-colors">
                  {u.profile_image_url
                    ? <img src={u.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-bold">{display[0]?.toUpperCase()}</span>
                      </div>}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{display}</p>
                    {u.nickname && <p className="text-xs text-stone-400">@{u.nickname}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : query.trim().length >= 2 && !loading ? (
        <p className="px-4 py-3 text-sm text-stone-400 text-center">Nessun utente trovato</p>
      ) : (
        <p className="px-4 py-3 text-xs text-stone-400 text-center">Digita almeno 2 caratteri</p>
      )}
    </div>
  );
}

/* ── main component ── */
interface InlinePostComposerProps {
  user: any;
  /** extra query keys to invalidate on success (in addition to the feed ones) */
  extraInvalidate?: string[][];
}

export function InlinePostComposer({ user, extraInvalidate }: InlinePostComposerProps) {
  const [expanded, setExpanded]     = useState(false);
  const [text, setText]             = useState("");
  const [imageUrl, setImageUrl]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  /* auto-grow textarea */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [text]);

  /* focus when expanded */
  useEffect(() => {
    if (expanded) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [expanded]);

  const reset = () => {
    setText(""); setImageUrl(null); setMentionOpen(false); setExpanded(false);
  };

  const postMut = useMutation({
    mutationFn: () =>
      apiRequest("/api/microblog/posts", { method: "POST" }, {
        content: `<p>${text.trim().replace(/\n/g, "</p><p>")}</p>`,
        imageUrl,
        beerId: null, pubId: null, breweryId: null, eventId: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts"] });
      extraInvalidate?.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      toast({ title: "Post pubblicato! 🍺" });
      reset();
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

  const appendMention = (u: any) => {
    const nick = u.nickname || u.first_name || "utente";
    setText(prev => prev ? prev + " @" + nick : "@" + nick);
    setMentionOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const canSubmit = text.trim().length > 0 && !postMut.isPending && !uploading;
  const firstName = user?.firstName ?? user?.first_name ?? "appassionato";

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3 transition-all duration-200">

      {/* top row — always visible */}
      <div className="flex items-center gap-2.5">
        <Avatar user={user} size={9} />
        {!expanded ? (
          <button onClick={() => setExpanded(true)}
            className="flex-1 text-left text-sm text-stone-400 bg-stone-50 dark:bg-[#12151A] rounded-xl px-4 py-2.5 hover:bg-stone-100 dark:hover:bg-[#0B0D10] transition cursor-pointer select-none">
            Cosa stai bevendo, {firstName}?
          </button>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Cosa stai bevendo, ${firstName}? Usa @nome e #hashtag…`}
            rows={1}
            className="flex-1 resize-none overflow-hidden text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-4 py-2.5 outline-none placeholder:text-stone-400 text-stone-800 dark:text-stone-100 leading-relaxed min-h-[40px] max-h-60"
          />
        )}
      </div>

      {/* expanded panel */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {mentionOpen && (
            <MentionPicker onSelect={appendMention} onClose={() => setMentionOpen(false)} />
          )}
          {imageUrl && (
            <div className="relative">
              <img src={imageUrl} alt="" className="w-full rounded-xl object-cover max-h-64" />
              <button onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 bg-stone-900/70 text-white rounded-full p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-[11px] text-stone-400 px-1">
            <span className="text-amber-500 font-semibold">#hashtag</span> e{" "}
            <span className="text-blue-500 font-semibold">@menzioni</span> supportati
          </p>
          <div className="flex items-center gap-1 border-t border-stone-100 dark:border-white/[0.04] pt-2.5">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary hover:bg-primary/5 rounded-xl px-3 py-2 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Foto
            </button>
            <button onClick={() => setMentionOpen(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 transition-colors ${mentionOpen ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>
              <AtSign className="w-3.5 h-3.5" /> Menziona
            </button>
            <div className="flex-1" />
            <button onClick={reset}
              className="text-xs font-semibold text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.05] transition-colors">
              Annulla
            </button>
            <Button size="sm" onClick={() => postMut.mutate()} disabled={!canSubmit}
              className="rounded-full px-4 text-xs">
              {postMut.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><Send className="w-3 h-3 mr-1.5" />Pubblica</>}
            </Button>
          </div>
        </div>
      )}

      {/* collapsed shortcuts */}
      {!expanded && (
        <div className="flex items-center gap-1 border-t border-stone-100 dark:border-white/[0.04] pt-2.5 mt-2.5">
          <button onClick={() => setExpanded(true)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary hover:bg-primary/5 rounded-xl py-2 transition-colors">
            <PenSquare className="w-3.5 h-3.5" /> Post
          </button>
          <div className="w-px h-4 bg-stone-100 dark:bg-white/[0.06]" />
          <Link href="/scan" className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary hover:bg-primary/5 rounded-xl py-2 transition-colors">
              <Camera className="w-3.5 h-3.5" /> Scansiona
            </button>
          </Link>
          <div className="w-px h-4 bg-stone-100 dark:bg-white/[0.06]" />
          <Link href="/explore/beers" className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary hover:bg-primary/5 rounded-xl py-2 transition-colors">
              <BeerIcon className="w-3.5 h-3.5" /> Esplora
            </button>
          </Link>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />
    </div>
  );
}
