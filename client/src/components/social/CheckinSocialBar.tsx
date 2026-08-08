import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Heart, MessageCircle, Send, MoreHorizontal, Flag, Pencil, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function UserAvatar({ user, size = 8 }: { user: any; size?: number }) {
  const name = user.display_name ?? user.nickname ?? "?";
  const sz = `w-${size} h-${size}`;
  return user.profile_image_url ? (
    <img src={user.profile_image_url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary text-xs font-bold">{name[0].toUpperCase()}</span>
    </div>
  );
}

function ReportCommentDialog({ commentId, onClose }: { commentId: number | null; onClose: () => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("inappropriato");
  const [description, setDescription] = useState("");
  const mut = useMutation({
    mutationFn: () => apiRequest("/api/reports", { method: "POST" }, {
      targetType: "checkin_comment", targetId: commentId, reason, description: description || undefined,
    }),
    onSuccess: (data: any) => {
      toast({
        title: data?.duplicate ? "Già segnalato" : "Segnalazione inviata",
        description: data?.duplicate ? "Avevi già segnalato questo commento" : "Grazie, i moderatori la valuteranno",
      });
      setReason("inappropriato"); setDescription(""); onClose();
    },
    onError: (e: any) => toast({ title: "Errore", description: e?.message ?? "Riprova", variant: "destructive" }),
  });
  return (
    <Dialog open={commentId != null} onOpenChange={(o) => !o && onClose()}>
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
          <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Dettaglio (opzionale)…" />
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

function CheckinCommentRow({ comment, tastingId, onReport }: { comment: any; tastingId: number; onReport: (id: number) => void }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const isMine = (user as any)?.id === comment.user_id;

  const likeMut = useMutation({
    mutationFn: () => apiRequest(`/api/checkin-comments/${comment.id}/like`, { method: comment.liked ? "DELETE" : "POST" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/checkin", tastingId, "comments"] });
      const prev = queryClient.getQueryData<any[]>(["/api/checkin", tastingId, "comments"]);
      queryClient.setQueryData<any[]>(["/api/checkin", tastingId, "comments"], (old) =>
        (old ?? []).map(c => c.id === comment.id ? { ...c, liked: !c.liked, likes_count: (c.likes_count ?? 0) + (c.liked ? -1 : 1) } : c),
      );
      return { prev };
    },
    onError: (_e: any, _v: any, ctx: any) => ctx?.prev && queryClient.setQueryData(["/api/checkin", tastingId, "comments"], ctx.prev),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest(`/api/checkin/comments/${comment.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkin", tastingId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin", tastingId, "likes"] });
    },
    onError: () => toast({ title: "Errore", description: "Non è stato possibile eliminare il commento", variant: "destructive" }),
  });

  const editMut = useMutation({
    mutationFn: () => apiRequest(`/api/checkin/comments/${comment.id}`, { method: "PATCH" }, { content: editText }),
    onSuccess: (data: any) => {
      queryClient.setQueryData<any[]>(["/api/checkin", tastingId, "comments"], (old) =>
        (old ?? []).map(c => c.id === comment.id ? { ...c, content: data.content } : c),
      );
      setEditing(false);
    },
    onError: () => toast({ title: "Errore", description: "Non è stato possibile modificare il commento", variant: "destructive" }),
  });

  return (
    <div className="flex gap-2.5 items-start">
      <UserAvatar user={comment} size={7} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-1.5">
            <Textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl text-sm py-2 resize-none"
              autoFocus
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
            <div className="bg-stone-100 dark:bg-[#1A1D24] rounded-2xl px-3 py-2">
              <Link href={`/user/${comment.username}`}>
                <p className="text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:text-primary">{comment.display_name ?? comment.username}</p>
              </Link>
              <p className="text-sm text-stone-700 dark:text-stone-200 break-words whitespace-pre-wrap leading-snug">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 px-2">
              <span className="text-[10px] text-stone-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: it })}
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
                    <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-lg shadow-lg py-1 min-w-[130px]">
                      {isMine ? (
                        <>
                          <button
                            onMouseDown={() => { setMenuOpen(false); setEditing(true); setEditText(comment.content); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5"
                          >
                            <Pencil className="w-3 h-3" /> Modifica
                          </button>
                          <button
                            onMouseDown={() => { setMenuOpen(false); if (confirm("Eliminare il commento?")) deleteMut.mutate(); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" /> Elimina
                          </button>
                        </>
                      ) : (
                        <button
                          onMouseDown={() => { setMenuOpen(false); onReport(comment.id); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-stone-50 dark:hover:bg-[#12151A] flex items-center gap-1.5"
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

export default function CheckinSocialBar({ tastingId, compact = false }: { tastingId: number; compact?: boolean }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const chars = Array.from(value);
    const trimmed = chars.length > 500 ? chars.slice(0, 500).join("") : value;
    setNewComment(trimmed);
    const cursor = textareaRef.current?.selectionStart ?? trimmed.length;
    const textBefore = trimmed.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (username: string) => {
    const cursor = textareaRef.current?.selectionStart ?? newComment.length;
    const before = newComment.slice(0, cursor).replace(/@\w*$/, `@${username} `);
    const after = newComment.slice(cursor);
    setNewComment(before + after);
    setMentionQuery(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = before.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const { data: likes } = useQuery<{ count: number; liked: boolean; commentsCount: number }>({
    queryKey: ["/api/checkin", tastingId, "likes"],
    queryFn: () => fetch(`/api/checkin/${tastingId}/likes`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<any[]>({
    queryKey: ["/api/checkin", tastingId, "comments"],
    queryFn: () => fetch(`/api/checkin/${tastingId}/comments`, { credentials: "include" }).then(r => r.json()),
    enabled: commentsOpen,
  });

  const likeMut = useMutation({
    mutationFn: () => apiRequest(`/api/checkin/${tastingId}/like`, { method: likes?.liked ? "DELETE" : "POST" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/checkin", tastingId, "likes"] });
      const prev = queryClient.getQueryData<any>(["/api/checkin", tastingId, "likes"]);
      queryClient.setQueryData(["/api/checkin", tastingId, "likes"], {
        ...prev,
        count: (prev?.count ?? 0) + (prev?.liked ? -1 : 1),
        liked: !prev?.liked,
      });
      return { prev };
    },
    onError: (_e: any, _v: any, ctx: any) => ctx?.prev && queryClient.setQueryData(["/api/checkin", tastingId, "likes"], ctx.prev),
  });

  const commentMut = useMutation({
    mutationFn: () => apiRequest(`/api/checkin/${tastingId}/comments`, { method: "POST" }, { content: newComment }),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/checkin", tastingId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin", tastingId, "likes"] });
    },
  });

  const likeCount = likes?.count ?? 0;
  const commentCount = likes?.commentsCount ?? 0;

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) setTimeout(() => textareaRef.current?.focus(), 150);
  };

  return (
    <>
      <ReportCommentDialog commentId={reportCommentId} onClose={() => setReportCommentId(null)} />

      {/* ── Action bar ── */}
      <div className={`flex items-center gap-4 ${compact ? "" : "pt-2"}`}>
        <button
          onClick={() => isAuthenticated && likeMut.mutate(undefined)}
          disabled={!isAuthenticated}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
            likes?.liked ? "text-red-500" : "text-stone-400 hover:text-red-500"
          }`}
        >
          <Heart className="w-4 h-4" fill={likes?.liked ? "currentColor" : "none"} />
          {likeCount}
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors active:scale-90 ${
            commentsOpen ? "text-primary" : "text-stone-400 hover:text-primary"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount}
        </button>
      </div>

      {/* ── Inline comment section ── */}
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.04] space-y-3">
          {commentsLoading ? (
            <p className="text-xs text-stone-400 text-center py-2">Caricamento…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-1">Nessun commento ancora</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <CheckinCommentRow key={c.id} comment={c} tastingId={tastingId} onReport={id => setReportCommentId(id)} />
              ))}
            </div>
          )}

          {isAuthenticated && (
            <div className="space-y-1.5">
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
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={e => handleCommentChange(e.target.value)}
                    placeholder="Scrivi un commento… (@ per taggare)"
                    rows={1}
                    className="rounded-2xl text-sm min-h-[2.5rem] py-2.5 pr-10 resize-none whitespace-pre-wrap"
                    onKeyDown={e => {
                      if (e.key === "Escape") { setMentionQuery(null); return; }
                      if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
                        e.preventDefault();
                        if (newComment.trim()) commentMut.mutate();
                      }
                    }}
                  />
                  <button
                    onClick={() => newComment.trim() && mentionQuery === null && commentMut.mutate()}
                    disabled={!newComment.trim() || commentMut.isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary disabled:text-stone-300 p-1.5 hover:bg-primary/10 rounded-full transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
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
    </>
  );
}
