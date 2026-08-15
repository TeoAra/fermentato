/**
 * MicroblogSocialBar — like, comments, delete (own), report (others)
 * for microblog posts in the social feed.
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  Heart, MessageCircle, MoreHorizontal, Flag, Trash2, Send, Loader2, Pencil, Check, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

/* ── tiny avatar ── */
function UA({ user, size = 7 }: { user: any; size?: number }) {
  const name = user?.display_name ?? user?.username ?? user?.nickname ?? "?";
  const sz = `w-${size} h-${size}`;
  return user?.profile_image_url ? (
    <img src={user.profile_image_url} alt={name}
      className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary text-xs font-bold">{(name[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

/* ── comment row ── */
function CommentRow({
  comment, postId, onReport,
}: { comment: any; postId: number; onReport: (id: number) => void }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isMine = user && String((user as any).id) === String(comment.user_id);
  const commentsKey = ["/api/microblog/posts", postId, "comments"];

  const likeMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/comments/${comment.id}/like`, { method: comment.liked ? "DELETE" : "POST" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const prev = queryClient.getQueryData<any[]>(commentsKey);
      queryClient.setQueryData<any[]>(commentsKey, (old) =>
        (old ?? []).map(c =>
          c.id === comment.id
            ? { ...c, liked: !c.liked, likes_count: (c.likes_count ?? 0) + (c.liked ? -1 : 1) }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e: any, _v: any, ctx: any) =>
      ctx?.prev && queryClient.setQueryData(commentsKey, ctx.prev),
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/comments/${comment.id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: commentsKey }),
    onError: () =>
      toast({ title: "Errore eliminazione", variant: "destructive" }),
  });

  const editMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/comments/${comment.id}`, { method: "PATCH" }, { content: editText.trim() }),
    onSuccess: (data: any) => {
      queryClient.setQueryData<any[]>(commentsKey, (old) =>
        (old ?? []).map(c => c.id === comment.id ? { ...c, content: data.content, updated_at: data.updated_at } : c),
      );
      setEditing(false);
    },
    onError: () => toast({ title: "Errore modifica", variant: "destructive" }),
  });

  return (
    <div className="flex gap-2 items-start">
      <UA user={comment} size={7} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1.5">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              maxLength={500}
              rows={2}
              autoFocus
              className="w-full resize-none text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 outline-none placeholder:text-stone-400 leading-snug"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => editText.trim() && editMut.mutate()}
                disabled={!editText.trim() || editMut.isPending}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Check className="w-3 h-3" /> Salva
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(comment.content); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-3 h-3" /> Annulla
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-stone-100 dark:bg-[#12151A] rounded-2xl px-3 py-2">
              <Link href={`/user/${comment.username}`}>
                <p className="text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:text-primary">
                  {comment.display_name ?? comment.username}
                </p>
              </Link>
              <p className="text-sm text-stone-700 dark:text-stone-200 break-words whitespace-pre-wrap leading-snug">
                {comment.content}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1 px-2">
              <span className="text-[10px] text-stone-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: it })}
                {comment.updated_at && new Date(comment.updated_at) > new Date(comment.created_at) && (
                  <span className="italic text-stone-400/70"> · modificato</span>
                )}
              </span>
              <button
                onClick={() => isAuthenticated && likeMut.mutate(undefined)}
                disabled={!isAuthenticated}
                className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                  comment.liked ? "text-red-500" : "text-stone-400 hover:text-red-500"
                }`}
              >
                <Heart className="w-3 h-3" fill={comment.liked ? "currentColor" : "none"} />
                {comment.likes_count > 0 ? comment.likes_count : "Mi piace"}
              </button>
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    onBlur={() => setTimeout(() => setMenuOpen(false), 200)}
                    className="text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                  {menuOpen && (
                    <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-xl shadow-lg py-1 min-w-[130px]">
                      {isMine ? (
                        <>
                          <button
                            onMouseDown={() => { setMenuOpen(false); setEditing(true); setEditText(comment.content); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5 rounded-xl"
                          >
                            <Pencil className="w-3 h-3" /> Modifica
                          </button>
                          <button
                            onMouseDown={() => {
                              setMenuOpen(false);
                              if (confirm("Eliminare il commento?")) deleteMut.mutate();
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5 rounded-xl"
                          >
                            <Trash2 className="w-3 h-3" /> Elimina
                          </button>
                        </>
                      ) : (
                        <button
                          onMouseDown={() => { setMenuOpen(false); onReport(comment.id); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5 rounded-xl"
                        >
                          <Flag className="w-3 h-3" /> Segnala
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── report post dialog ── */
function ReportPostDialog({
  postId, open, onClose,
}: { postId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("inappropriato");
  const [description, setDescription] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      apiRequest("/api/reports", { method: "POST" }, {
        targetType: "microblog_post", targetId: postId, reason, description: description || undefined,
      }),
    onSuccess: (data: any) => {
      toast({
        title: data?.duplicate ? "Già segnalato" : "Segnalazione inviata",
        description: data?.duplicate
          ? "Avevi già segnalato questo post"
          : "Grazie, i moderatori lo valuteranno",
      });
      setReason("inappropriato"); setDescription(""); onClose();
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>Segnala post</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inappropriato">Contenuto inappropriato</SelectItem>
              <SelectItem value="spam">Spam o pubblicità</SelectItem>
              <SelectItem value="offensivo">Linguaggio offensivo</SelectItem>
              <SelectItem value="falso">Informazione falsa</SelectItem>
              <SelectItem value="altro">Altro</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500} rows={3}
            placeholder="Dettaglio (opzionale)…"
          />
          <div className="flex gap-2 pt-1">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-1">
              {mut.isPending ? "Invio…" : "Invia segnalazione"}
            </Button>
            <Button variant="outline" onClick={onClose}>Annulla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── report comment dialog ── */
function ReportCommentDialog({
  commentId, onClose,
}: { commentId: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("inappropriato");
  const [description, setDescription] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      apiRequest("/api/reports", { method: "POST" }, {
        targetType: "microblog_comment", targetId: commentId, reason, description: description || undefined,
      }),
    onSuccess: (data: any) => {
      toast({
        title: data?.duplicate ? "Già segnalato" : "Segnalazione inviata",
        description: data?.duplicate ? "Avevi già segnalato questo commento" : "Grazie, i moderatori lo valuteranno",
      });
      setReason("inappropriato"); setDescription(""); onClose();
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  return (
    <Dialog open={commentId != null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader><DialogTitle>Segnala commento</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inappropriato">Contenuto inappropriato</SelectItem>
              <SelectItem value="spam">Spam o pubblicità</SelectItem>
              <SelectItem value="offensivo">Linguaggio offensivo</SelectItem>
              <SelectItem value="falso">Informazione falsa</SelectItem>
              <SelectItem value="altro">Altro</SelectItem>
            </SelectContent>
          </Select>
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            maxLength={500} rows={3} placeholder="Dettaglio (opzionale)…" />
          <div className="flex gap-2 pt-1">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-1">
              {mut.isPending ? "Invio…" : "Invia segnalazione"}
            </Button>
            <Button variant="outline" onClick={onClose}>Annulla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── main bar ── */
interface Props {
  postId: number;
  postUserId: string;
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  content: string; // raw HTML content for editing
  authorType?: string | null;
  authorEntityId?: number | null;
}

export function MicroblogSocialBar({ postId, postUserId, liked, likesCount, commentsCount, content, authorType, authorEntityId }: Props) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportPostOpen, setReportPostOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  // Optimistic like override: null = use props, otherwise local state
  const [likeOverride, setLikeOverride] = useState<{ liked: boolean; count: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const effectiveLiked = likeOverride ? likeOverride.liked : liked;
  const effectiveLikes = likeOverride ? likeOverride.count : (likesCount ?? 0);

  const isOwn = user && String((user as any).id) === String(postUserId);

  // Entity-post ownership: pub/brewery owner can edit/delete posts made on behalf of their venue.
  // managedPubId is resolved server-side (pubs.owner_id) and returned by /api/auth/user.
  // breweryId is stored directly on the user row (users.brewery_id).
  const isEntityOwn = !isOwn && !!user && !!authorType && authorType !== "user" && !!authorEntityId && (
    (authorType === "pub" && Number((user as any).managedPubId) === authorEntityId) ||
    (authorType === "brewery" && Number((user as any).breweryId) === authorEntityId)
  );

  // Admins can manage any post (matches server-side role check in routes-social.ts)
  const isAdminUser = !!user && (
    (user as any).userType === 'admin' ||
    (user as any).activeRole === 'admin' ||
    ((user as any).roles ?? []).includes('admin')
  );

  const canManage = isOwn || isEntityOwn || isAdminUser;

  const startEdit = () => {
    // strip HTML to plain text for editing
    const plain = content
      .replace(/<\/p>\s*<p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    setEditText(plain);
    setEditing(true);
    setMenuOpen(false);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const likeMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/like`, { method: effectiveLiked ? "DELETE" : "POST" }),
    onMutate: () => {
      const prev = { liked: effectiveLiked, count: effectiveLikes };
      // optimistic toggle
      setLikeOverride({ liked: !prev.liked, count: prev.count + (prev.liked ? -1 : 1) });
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) setLikeOverride(ctx.prev);
      toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts"] });
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
    queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts"] });
    // Invalidate entity-post cards shown on pub/brewery profile overview sections
    if (authorType && authorEntityId) {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/entity-posts", authorType, authorEntityId] });
    }
  };

  const editMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}`, { method: "PATCH" }, { content: editText.trim() }),
    onSuccess: () => {
      invalidateAll();
      setEditing(false);
      toast({ title: "Post aggiornato ✓" });
    },
    onError: () => toast({ title: "Errore modifica", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest(`/api/microblog/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Post eliminato" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const commentsKey = ["/api/microblog/posts", postId, "comments"];

  const { data: comments = [], isFetching: loadingComments } = useQuery<any[]>({
    queryKey: commentsKey,
    queryFn: async () => {
      const r = await fetch(`/api/microblog/posts/${postId}/comments`, { credentials: "include" });
      return r.ok ? r.json() : [];
    },
    enabled: commentsOpen,
    staleTime: 30_000,
  });

  // @-mention suggestions reuse the follow list (same UX as CheckinSocialBar)
  const { data: following = [] } = useQuery<any[]>({
    queryKey: ["/api/user/following"],
    enabled: isAuthenticated && commentsOpen,
    staleTime: 5 * 60_000,
  });

  const mentionSuggestions = mentionQuery !== null
    ? following.filter((f: any) =>
        f.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        f.display_name?.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleCommentChange = (value: string) => {
    const trimmed = value.length > 500 ? value.slice(0, 500) : value;
    setCommentText(trimmed);
    const cursor = inputRef.current?.selectionStart ?? trimmed.length;
    const textBefore = trimmed.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (username: string) => {
    const cursor = inputRef.current?.selectionStart ?? commentText.length;
    const before = commentText.slice(0, cursor).replace(/@\w*$/, `@${username} `);
    const after = commentText.slice(cursor);
    setCommentText(before + after);
    setMentionQuery(null);
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = before.length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const commentMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/comments`, { method: "POST" }, {
        content: commentText.trim(),
      }),
    onMutate: async () => {
      const text = commentText.trim();
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const prev = queryClient.getQueryData<any[]>(commentsKey);
      const optimistic = {
        id: -Date.now(),
        content: text,
        created_at: new Date().toISOString(),
        updated_at: null,
        user_id: (user as any)?.id,
        username: (user as any)?.nickname ?? (user as any)?.username,
        display_name: (user as any)?.display_name ?? (user as any)?.nickname,
        profile_image_url: (user as any)?.profile_image_url ?? (user as any)?.profileImageUrl,
        likes_count: 0,
        liked: false,
        _optimistic: true,
      };
      queryClient.setQueryData<any[]>(commentsKey, (old) => [...(old ?? []), optimistic]);
      setCommentText("");
      setMentionQuery(null);
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(commentsKey, ctx.prev);
      toast({ title: "Errore commento", variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
    },
  });

  const toggleComments = () => {
    setCommentsOpen(o => !o);
    if (!commentsOpen) setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div>
      {/* ── edit mode ── */}
      {editing && (
        <div className="space-y-2">
          <textarea
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full resize-none text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 outline-none placeholder:text-stone-400 leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={() => editText.trim() && editMut.mutate()}
              disabled={!editText.trim() || editMut.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-40 px-3 py-1.5 rounded-full transition-colors"
            >
              {editMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Salva
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-3 h-3" /> Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── normal mode ── */}
      {!editing && (
      <div className="flex items-center gap-4">
        {/* like */}
        <button
          onClick={() => isAuthenticated && likeMut.mutate()}
          disabled={!isAuthenticated}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
            effectiveLiked ? "text-red-500" : "text-stone-400 hover:text-red-500"
          }`}
        >
          <Heart className="w-4 h-4" fill={effectiveLiked ? "currentColor" : "none"} />
          {effectiveLikes}
        </button>

        {/* comments toggle */}
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
            commentsOpen ? "text-primary" : "text-stone-400 hover:text-primary"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {commentsCount ?? 0}
        </button>

        <div className="flex-1" />

        {/* ⋯ menu */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-30 bg-white dark:bg-[#1A1D24] border border-stone-100 dark:border-white/[0.08] rounded-xl shadow-lg min-w-[140px] py-1">
                {canManage ? (
                  <>
                    <button
                      onMouseDown={startEdit}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.05] rounded-xl font-semibold transition-colors flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Modifica
                    </button>
                    <button
                      onMouseDown={() => {
                        setMenuOpen(false);
                        if (confirm("Eliminare questo post?")) deleteMut.mutate();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-semibold transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Elimina
                    </button>
                  </>
                ) : (
                  <button
                    onMouseDown={() => { setMenuOpen(false); setReportPostOpen(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" /> Segnala
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* comment section */}
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.04] space-y-3">
          {loadingComments ? (
            <p className="text-xs text-stone-400 text-center py-2">Caricamento…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-1">Nessun commento ancora</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  postId={postId}
                  onReport={id => setReportCommentId(id)}
                />
              ))}
            </div>
          )}

          {isAuthenticated && (
            <div className="space-y-1.5">
              {/* @-mention suggestions */}
              {mentionQuery !== null && mentionSuggestions.length > 0 && (
                <div className="bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-2xl shadow-lg overflow-hidden">
                  {mentionSuggestions.map((f: any) => (
                    <button
                      key={f.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); insertMention(f.username); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      {f.profile_image_url
                        ? <img src={f.profile_image_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{(f.username ?? '?')[0].toUpperCase()}</div>
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight truncate">@{f.username}</p>
                        {f.display_name && f.display_name !== f.username && (
                          <p className="text-[11px] text-stone-400 leading-tight truncate">{f.display_name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={commentText}
                  onChange={e => handleCommentChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape") { setMentionQuery(null); return; }
                    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null && commentText.trim()) {
                      e.preventDefault(); commentMut.mutate();
                    }
                  }}
                  placeholder="Scrivi un commento… (@ per taggare)"
                  rows={1}
                  maxLength={500}
                  className="flex-1 resize-none text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 outline-none placeholder:text-stone-400 leading-relaxed max-h-24"
                />
                <button
                  onClick={() => commentText.trim() && mentionQuery === null && commentMut.mutate()}
                  disabled={!commentText.trim() || commentMut.isPending}
                  className="p-2 rounded-full bg-primary text-white disabled:opacity-40 transition-opacity flex-shrink-0"
                >
                  {commentMut.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-xs text-stone-400 text-center py-1">
              <Link href="/auth" className="text-primary font-semibold hover:underline">Accedi</Link> per commentare
            </p>
          )}
        </div>
      )}

      {/* dialogs */}
      <ReportPostDialog
        postId={postId}
        open={reportPostOpen}
        onClose={() => setReportPostOpen(false)}
      />
      <ReportCommentDialog
        commentId={reportCommentId}
        onClose={() => setReportCommentId(null)}
      />
    </div>
  );
}
