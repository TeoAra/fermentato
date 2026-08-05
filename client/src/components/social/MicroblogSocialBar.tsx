/**
 * MicroblogSocialBar — like, comments, delete (own), report (others)
 * for microblog posts in the social feed.
 */
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  Heart, MessageCircle, MoreHorizontal, Flag, Trash2, Send, Loader2,
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
  const isMine = user && String((user as any).id) === String(comment.user_id);

  const deleteMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/comments/${comment.id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts", postId, "comments"] }),
    onError: () =>
      toast({ title: "Errore eliminazione", variant: "destructive" }),
  });

  return (
    <div className="flex gap-2 items-start">
      <UA user={comment} size={7} />
      <div className="flex-1 min-w-0">
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
          </span>
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="text-stone-400 hover:text-stone-600 p-0.5"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-xl shadow-lg py-1 min-w-[130px]">
                  {isMine ? (
                    <button
                      onMouseDown={() => {
                        setMenuOpen(false);
                        if (confirm("Eliminare il commento?")) deleteMut.mutate();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5 rounded-xl"
                    >
                      <Trash2 className="w-3 h-3" /> Elimina
                    </button>
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
}

export function MicroblogSocialBar({ postId, postUserId, liked, likesCount, commentsCount }: Props) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportPostOpen, setReportPostOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = user && String((user as any).id) === String(postUserId);

  const likeMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/like`, { method: liked ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest(`/api/microblog/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
      toast({ title: "Post eliminato" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const { data: comments = [], isFetching: loadingComments } = useQuery<any[]>({
    queryKey: ["/api/microblog/posts", postId, "comments"],
    queryFn: async () => {
      const r = await fetch(`/api/microblog/posts/${postId}/comments`);
      return r.ok ? r.json() : [];
    },
    enabled: commentsOpen,
    staleTime: 30_000,
  });

  const commentMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${postId}/comments`, { method: "POST" }, {
        content: commentText.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      setCommentText("");
    },
    onError: () => toast({ title: "Errore commento", variant: "destructive" }),
  });

  const toggleComments = () => {
    setCommentsOpen(o => !o);
    if (!commentsOpen) setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div>
      {/* social bar row */}
      <div className="flex items-center gap-4">
        {/* like */}
        <button
          onClick={() => isAuthenticated && likeMut.mutate()}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
            liked ? "text-red-500" : "text-stone-400 hover:text-red-500"
          }`}
        >
          <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
          {likesCount ?? 0}
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
                {isOwn ? (
                  <button
                    onMouseDown={() => {
                      setMenuOpen(false);
                      if (confirm("Eliminare questo post?")) deleteMut.mutate();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Elimina
                  </button>
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
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                    e.preventDefault(); commentMut.mutate();
                  }
                }}
                placeholder="Scrivi un commento…"
                rows={1}
                maxLength={500}
                className="flex-1 resize-none text-sm bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 outline-none placeholder:text-stone-400 leading-relaxed max-h-24"
              />
              <button
                onClick={() => commentText.trim() && commentMut.mutate()}
                disabled={!commentText.trim() || commentMut.isPending}
                className="p-2 rounded-full bg-primary text-white disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                {commentMut.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
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
