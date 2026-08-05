/**
 * InlinePostComposer — Facebook/Instagram-style expanding composer.
 * - @mention picker triggers automatically when you type "@"
 * - #hashtag and @mention chips shown inline (Instagram/TikTok style)
 * - No separate "Menziona" button
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Send, Loader2, X, Camera, PenSquare,
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

/* ── mention picker (query controlled by parent) ── */
function MentionPicker({
  query,
  onSelect,
  onClose,
}: {
  query: string;
  onSelect: (u: any) => void;
  onClose: () => void;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/mentions/search?q=${encodeURIComponent(query.trim())}`);
        if (r.ok) setResults(await r.json());
        else setResults([]);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (!loading && results.length === 0) return null;

  const kindIcon = (kind: string) =>
    kind === "pub" ? "📍" : kind === "brewery" ? "🏭" : "👤";
  const kindLabel = (kind: string) =>
    kind === "pub" ? "Pub" : kind === "brewery" ? "Birrificio" : null;

  return (
    <div className="bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-2xl shadow-xl overflow-hidden">
      {loading && results.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-stone-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Cercando…
        </div>
      ) : (
        <ul className="max-h-44 overflow-y-auto divide-y divide-stone-50 dark:divide-[#23262E]">
          {results.map((r, i) => {
            const display = r.name || r.handle || "?";
            return (
              <li key={`${r.kind}-${r.id}-${i}`}>
                <button
                  onMouseDown={e => { e.preventDefault(); onSelect(r); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 dark:hover:bg-[#23262E] text-left transition-colors">
                  {r.image
                    ? <img src={r.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-base leading-none">
                        {kindIcon(r.kind)}
                      </div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{display}</p>
                    <p className="text-xs text-stone-400">
                      {r.handle ? `@${r.handle}` : `@${r.slug}`}
                      {kindLabel(r.kind) && (
                        <span className="ml-1.5 text-[10px] bg-stone-100 dark:bg-[#23262E] rounded px-1 py-0.5 font-medium">
                          {kindLabel(r.kind)}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── tag chips (hashtags + mentions counted) ── */
function TagChips({ text }: { text: string }) {
  const hashCounts: Record<string, number> = {};
  const mentionCounts: Record<string, number> = {};

  for (const m of text.matchAll(/#([\w\u00C0-\u024F]+)/g))
    hashCounts[m[1]] = (hashCounts[m[1]] ?? 0) + 1;
  for (const m of text.matchAll(/@([\w\u00C0-\u024F]+)/g))
    mentionCounts[m[1]] = (mentionCounts[m[1]] ?? 0) + 1;

  const hashes  = Object.entries(hashCounts);
  const mentions = Object.entries(mentionCounts);

  if (hashes.length === 0 && mentions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {hashes.map(([tag, count]) => (
        <span key={`h-${tag}`}
          className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-semibold">
          #{tag}
          {count > 1 && (
            <span className="bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{count}</span>
          )}
        </span>
      ))}
      {mentions.map(([name, count]) => (
        <span key={`m-${name}`}
          className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-semibold">
          @{name}
          {count > 1 && (
            <span className="bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{count}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ── main component ── */
interface InlinePostComposerProps {
  user: any;
  extraInvalidate?: string[][];
}

export function InlinePostComposer({ user, extraInvalidate }: InlinePostComposerProps) {
  const [expanded, setExpanded]   = useState(false);
  const [text, setText]           = useState("");
  const [imageUrl, setImageUrl]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /* mention state */
  const [mentionOpen, setMentionOpen]     = useState(false);
  const [mentionQuery, setMentionQuery]   = useState("");
  const [mentionStart, setMentionStart]   = useState(0); // index of "@" in text

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
    setText(""); setImageUrl(null);
    setMentionOpen(false); setMentionQuery(""); setExpanded(false);
  };

  /* detect @mention context on every keystroke */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match  = before.match(/@([\w\u00C0-\u024F]*)$/);

    if (match) {
      setMentionStart(cursor - match[0].length);
      setMentionQuery(match[1]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  }, []);

  /* pick a user/pub/brewery from the mention dropdown */
  const completeMention = useCallback((r: any) => {
    // users: use nickname; pubs/breweries: use slug (the @-handle)
    const handle = r.kind === "user"
      ? (r.handle || r.nickname || r.first_name || "utente")
      : (r.handle || r.slug || r.name?.toLowerCase().replace(/\s+/g, "-") || "entità");
    const before  = text.slice(0, mentionStart);
    const after   = text.slice(mentionStart + 1 + mentionQuery.length);
    const newText = before + "@" + handle + " " + after.replace(/^\s*/, "");
    setText(newText);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = (before + "@" + handle + " ").length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [text, mentionStart, mentionQuery]);

  /* close mention picker on Escape */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && mentionOpen) {
      setMentionOpen(false);
      e.stopPropagation();
    }
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

  const canSubmit = text.trim().length > 0 && !postMut.isPending && !uploading;
  const firstName = user?.firstName ?? user?.first_name ?? "appassionato";

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3 transition-all duration-200">

      {/* top row — always visible */}
      <div className="flex items-start gap-2.5">
        <Avatar user={user} size={9} />
        {!expanded ? (
          <button onClick={() => setExpanded(true)}
            className="flex-1 text-left text-sm text-stone-400 bg-stone-50 dark:bg-[#12151A] rounded-xl px-4 py-2.5 hover:bg-stone-100 dark:hover:bg-[#0B0D10] transition cursor-pointer select-none">
            Cosa stai bevendo, {firstName}?
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={`Cosa stai bevendo, ${firstName}? Digita @ per menzionare, # per hashtag…`}
              rows={1}
              className="w-full resize-none overflow-hidden text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-4 py-2.5 outline-none placeholder:text-stone-400 text-stone-800 dark:text-stone-100 leading-relaxed min-h-[40px] max-h-60"
            />
          </div>
        )}
      </div>

      {/* expanded panel */}
      {expanded && (
        <div className="mt-2 space-y-2.5">

          {/* inline mention picker — appears right below textarea */}
          {mentionOpen && (
            <MentionPicker
              query={mentionQuery}
              onSelect={completeMention}
              onClose={() => setMentionOpen(false)}
            />
          )}

          {/* tag chips preview */}
          <TagChips text={text} />

          {/* image preview */}
          {imageUrl && (
            <div className="relative">
              <img src={imageUrl} alt="" className="w-full rounded-xl object-cover max-h-64" />
              <button onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 bg-stone-900/70 text-white rounded-full p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* action row — NO "Menziona" button */}
          <div className="flex items-center gap-1 border-t border-stone-100 dark:border-white/[0.04] pt-2.5">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-primary hover:bg-primary/5 rounded-xl px-3 py-2 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Foto
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
