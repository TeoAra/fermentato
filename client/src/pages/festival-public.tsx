import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnyModalOpen, DockPortal, useHideGlobalBottomNav } from "@/components/bottom-navigation";
import {
  Droplets, Search, Star, UtensilsCrossed, Beer, ChevronDown, ChevronUp,
  MapPin, CheckCircle2, XCircle, Loader2, Clock, Calendar, Trophy, Info,
  Pencil, ExternalLink, MessageSquare, Reply, Send, ArrowLeft,
  Home as HomeIcon, Share2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FestivalLikeButton } from "@/components/festival-like-button";
import { ShareButton } from "@/components/share-button";
import { Helmet } from "react-helmet-async";

const ALLERGEN_LABELS: Record<string, string> = {
  glutine: "Glutine", crostacei: "Crostacei", uova: "Uova", pesce: "Pesce",
  arachidi: "Arachidi", soia: "Soia", latte: "Latte",
  "frutta a guscio": "Frutta a guscio", sedano: "Sedano", senape: "Senape",
  sesamo: "Sesamo", solfiti: "Solfiti", lupini: "Lupini", molluschi: "Molluschi",
};

type ScheduleSlot = { label: string; date?: string; openFrom: string; openTo: string };

interface FestivalData {
  festival: {
    id: number; name: string; description: string | null; location: string | null;
    startDate: string | null; endDate: string | null; logoUrl: string | null;
    coverImageUrl: string | null; showFood: boolean; isActive: boolean;
    schedule: ScheduleSlot[] | null;
    managerId: string | null;
    useTokens: boolean | null; tokenName: string | null;
  };
  taps: Array<{
    id: number; tapNumber: number; beerId: number | null;
    customBeerName: string | null; customBreweryName: string | null;
    style: string | null; abv: string | null; notes: string | null;
    isAvailable: boolean; tapType: string | null;
    beerName: string | null; beerStyle: string | null;
    beerAbv: string | null; beerImageUrl: string | null;
    beerDescription: string | null;
    breweryId: number | null; breweryName: string | null; breweryLogoUrl: string | null;
    avgRating: number | null; ratingCount: number; userRating: number | null;
    prices: Record<string, number> | null;
  }>;
  food: Array<{
    id: number; name: string; description: string | null; price: string | null;
    category: string | null; isAvailable: boolean; allergens: string[] | null;
  }>;
  rankings: Array<{
    tapNumber: number; beerName: string; beerImageUrl: string | null;
    breweryName: string | null; avg: number; count: number;
  }>;
}

// ── Slider Rating ────────────────────────────────────────────────────────────
function SliderRating({ tapId, slug, current, avg, count }: {
  tapId: number; slug: string; current: number | null; avg: number | null; count: number;
}) {
  const [localValue, setLocalValue] = useState<number>(current ?? 5);
  const [isDragging, setIsDragging] = useState(false);
  const [comment, setComment] = useState<string>("");
  const [showCommentBox, setShowCommentBox] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasVoted = current !== null;

  const rateMutation = useMutation({
    mutationFn: (vars: { rating: number; comment?: string }) =>
      apiRequest(`/api/festivals/${slug}/taps/${tapId}/rate`, { method: "POST" }, vars),
    onSuccess: (data: any) => {
      setLocalValue(data.userRating);
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug, "taps", String(tapId), "comments"] });
      if (showCommentBox && comment.trim()) {
        toast({ title: "Voto e commento salvati" });
      }
      setShowCommentBox(false);
      setComment("");
    },
    onError: () => toast({ title: "Errore nel voto", variant: "destructive" }),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(parseInt(e.target.value));
    setIsDragging(true);
  };

  const handleRelease = () => {
    setIsDragging(false);
    rateMutation.mutate({ rating: localValue });
  };

  const handleSubmitWithComment = () => {
    rateMutation.mutate({ rating: localValue, comment: comment.trim() || undefined });
  };

  const displayVal = isDragging ? localValue : (current ?? localValue);
  const pct = ((displayVal - 1) / 9) * 100;

  if (hasVoted) {
    return (
      <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Hai votato: {current}/10
        </span>
        {avg !== null && count > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            Media: <span className="font-bold text-primary dark:text-orange-400">{avg.toFixed(1)}</span>
            <span className="opacity-60 ml-1">({count} vot{count === 1 ? "o" : "i"})</span>
          </span>
        )}
      </div>
    );
  }

  // Not yet voted: slider + optional comment
  const commentBlock = showCommentBox ? (
    <div className="mt-2 space-y-2">
      <Textarea
        value={comment}
        onChange={e => setComment(e.target.value.slice(0, 500))}
        rows={2}
        placeholder="Aggiungi un commento (opzionale, max 500)…"
        className="text-xs"
        data-testid="textarea-festival-comment"
      />
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowCommentBox(false); setComment(""); }}>
          Annulla
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1" disabled={rateMutation.isPending} onClick={handleSubmitWithComment} data-testid="btn-festival-submit-comment">
          <Send className="h-3 w-3" /> Invia voto + commento
        </Button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setShowCommentBox(true)}
      className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
      data-testid="btn-festival-add-comment"
    >
      <MessageSquare className="h-3 w-3" /> Aggiungi un commento
    </button>
  );

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground">Il tuo voto:</span>
        <span className={`text-lg font-bold ${
          displayVal >= 8 ? "text-emerald-600" : displayVal >= 5 ? "text-primary" : "text-destructive"
        }`}>{displayVal}/10</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={displayVal}
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          disabled={rateMutation.isPending}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right, hsl(24,93%,49%) ${pct}%, #e5e7eb ${pct}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 px-0.5">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>
      {rateMutation.isPending && (
        <div className="flex items-center gap-1.5 mt-1">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Salvataggio…</span>
        </div>
      )}
      {(avg !== null && count > 0) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="font-bold text-primary dark:text-orange-400">{avg.toFixed(1)}</span>
          <span className="opacity-60">({count} vot{count === 1 ? "o" : "i"})</span>
        </div>
      )}
      {commentBlock}
    </div>
  );
}

// ── Tap Comments ────────────────────────────────────────────────────────────
type TapComment = {
  id: number; rating: number; comment: string | null;
  ownerReply: string | null; ownerReplyAt: string | null;
  createdAt: string;
  userNickname: string | null; userFirstName: string | null; userImage: string | null;
};

function TapComments({ tapId, slug, isManager }: { tapId: number; slug: string; isManager: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [replyOpenFor, setReplyOpenFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>("");

  const { data: comments = [], isLoading } = useQuery<TapComment[]>({
    queryKey: ["/api/festivals", slug, "taps", String(tapId), "comments"],
    queryFn: () => fetch(`/api/festivals/${slug}/taps/${tapId}/comments`).then(r => r.json()),
  });

  const replyMutation = useMutation({
    mutationFn: (vars: { id: number; reply: string }) =>
      apiRequest(`/api/festival-ratings/${vars.id}/reply`, { method: "POST" }, { reply: vars.reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug, "taps", String(tapId), "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug] });
      setReplyOpenFor(null);
      setReplyText("");
      toast({ title: "Risposta pubblicata" });
    },
    onError: () => toast({ title: "Errore invio risposta", variant: "destructive" }),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/festival-ratings/${id}/reply`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals", slug, "taps", String(tapId), "comments"] });
      toast({ title: "Risposta rimossa" });
    },
  });

  if (isLoading) return null;
  if (comments.length === 0) return null;

  return (
    <div className="mt-4 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
        <MessageSquare className="h-3 w-3" />
        Commenti ({comments.length})
      </div>
      {comments.map(c => {
        const initials = (c.userNickname || c.userFirstName || "?")[0]?.toUpperCase();
        const dateStr = c.createdAt ? format(new Date(c.createdAt), "d MMM yyyy", { locale: it }) : "";
        return (
          <div key={c.id} className="rounded-xl bg-stone-50 dark:bg-[#0B0D10]/30 border border-stone-100 dark:border-[#23262E] p-3">
            <div className="flex items-start gap-2">
              {c.userImage ? (
                <img loading="lazy" src={c.userImage} alt={c.userNickname || ""} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-[11px] flex items-center justify-center font-bold">{initials}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    {c.userNickname || c.userFirstName || "Utente"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                    <Star className="h-2.5 w-2.5 fill-current" /> {c.rating}/10
                  </span>
                </div>
                {c.comment && (
                  <p className="text-xs text-foreground/85 dark:text-stone-300 mt-1 whitespace-pre-line break-words">
                    {c.comment}
                  </p>
                )}
              </div>
            </div>

            {/* Owner reply */}
            {c.ownerReply ? (
              <div className="mt-2 ml-8 rounded-lg bg-primary/10 border border-primary/20 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wide mb-1">
                  <Reply className="h-3 w-3" />
                  Risposta del festival
                  {c.ownerReplyAt && (
                    <span className="text-muted-foreground font-normal normal-case">
                      · {format(new Date(c.ownerReplyAt), "d MMM yyyy", { locale: it })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/85 dark:text-stone-200 whitespace-pre-line break-words">{c.ownerReply}</p>
                {isManager && (
                  <button
                    onClick={() => deleteReplyMutation.mutate(c.id)}
                    className="text-[10px] text-destructive hover:underline mt-1.5"
                    data-testid={`btn-delete-reply-${c.id}`}
                  >
                    Rimuovi risposta
                  </button>
                )}
              </div>
            ) : isManager ? (
              <div className="mt-2 ml-8">
                {replyOpenFor === c.id ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value.slice(0, 500))}
                      rows={2}
                      placeholder="Rispondi a questo commento…"
                      className="text-xs"
                      data-testid={`textarea-reply-${c.id}`}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setReplyOpenFor(null); setReplyText(""); }}>
                        Annulla
                      </Button>
                      <Button size="sm" className="h-6 text-xs gap-1"
                        disabled={!replyText.trim() || replyMutation.isPending}
                        onClick={() => replyMutation.mutate({ id: c.id, reply: replyText.trim() })}
                        data-testid={`btn-send-reply-${c.id}`}
                      >
                        <Send className="h-3 w-3" /> Invia
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyOpenFor(c.id); setReplyText(""); }}
                    className="inline-flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                    data-testid={`btn-open-reply-${c.id}`}
                  >
                    <Reply className="h-3 w-3" /> Rispondi
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// Format price in token or euro
function formatPrice(price: number, useTokens: boolean, tokenName: string): string {
  if (useTokens) {
    const rounded = Number.isInteger(price) ? price : price.toFixed(1);
    return `${rounded} ${tokenName}`;
  }
  return `€${price.toFixed(2)}`;
}

// ── Tap Card ─────────────────────────────────────────────────────────────────
function TapCard({ tap, slug, isAuth, isManager, useTokens, tokenName }: {
  tap: FestivalData["taps"][0]; slug: string; isAuth: boolean; isManager: boolean;
  useTokens: boolean; tokenName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const beerName = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
  const breweryName = tap.breweryName || tap.customBreweryName;
  const style = tap.beerStyle || tap.style;
  const abv = tap.beerAbv || tap.abv;
  const imageUrl = tap.beerImageUrl;
  const isPompa = tap.tapType === "pompa";
  const hasPrices = tap.prices && Object.keys(tap.prices).length > 0;
  const hasDescription = !!tap.beerDescription;
  const descriptionMissing = tap.beerId && !hasDescription && isManager;

  return (
    <div className={`bg-white dark:bg-[#1A1D24] rounded-2xl border transition-all ${
      tap.isAvailable
        ? "border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
        : "border-[#E8DED1]/50 dark:border-white/[0.03] opacity-60"
    }`}>
      {/* Collapsed row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          {/* Tap number badge */}
          <div className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center font-bold text-sm ${
            tap.isAvailable
              ? "bg-[#FFF7EA] dark:bg-primary/10 text-primary"
              : "bg-[#F0EAE0] dark:bg-white/[0.04] text-muted-foreground"
          }`}>
            {tap.tapNumber}
          </div>

          {/* Beer image */}
          {imageUrl ? (
            <img loading="lazy" src={imageUrl} alt={beerName} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-[#0B0D10]/20 flex items-center justify-center flex-shrink-0">
              <Beer className="h-6 w-6 text-primary" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {tap.beerId ? (
                <Link href={`/beer/${tap.beerId}`} onClick={e => e.stopPropagation()}>
                  <span className={`font-bold text-sm hover:underline cursor-pointer ${
                    tap.isAvailable ? "text-foreground" : "text-stone-400 line-through"
                  }`}>{beerName}</span>
                </Link>
              ) : (
                <span className={`font-bold text-sm ${
                  tap.isAvailable ? "text-foreground" : "text-stone-400 line-through"
                }`}>{beerName}</span>
              )}
              {!tap.isAvailable && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive/20 py-0">Finita</Badge>
              )}
              {isPompa && (
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0 rounded-full">
                  In pompa
                </span>
              )}
            </div>

            {breweryName && (
              <div className="flex items-center gap-1 mt-0.5">
                {tap.breweryId ? (
                  <Link href={`/brewery/${tap.breweryId}`} onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-primary dark:text-orange-400 font-medium hover:underline cursor-pointer">{breweryName}</span>
                  </Link>
                ) : (
                  <span className="text-xs text-primary dark:text-orange-400 font-medium">{breweryName}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {style && <Badge variant="secondary" className="text-xs py-0 bg-stone-50 text-primary hover:bg-stone-100">{style}</Badge>}
              {abv && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Droplets className="h-3 w-3" />{abv}% ABV
                </span>
              )}
              {tap.avgRating !== null && tap.ratingCount > 0 && (
                <span className="text-xs text-primary dark:text-orange-400 flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-current" />{tap.avgRating?.toFixed(1)}
                  <span className="text-muted-foreground">({tap.ratingCount})</span>
                </span>
              )}
              {hasPrices && (
                <span className="text-xs bg-stone-50 dark:bg-[#0B0D10]/20 text-primary font-bold rounded-full px-2 py-0.5">
                  {Object.entries(tap.prices!).map(([size, price]) => `${size} ${formatPrice(price, useTokens, tokenName)}`).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          {tap.isAvailable && (
            <div className="flex-shrink-0 text-primary">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          )}
        </div>

        {!expanded && tap.notes && (
          <p className="text-xs text-muted-foreground mt-1.5 ml-15 line-clamp-1">{tap.notes}</p>
        )}
      </button>

      {/* Expanded content */}
      {expanded && tap.isAvailable && (
        <div className="px-4 pb-4 border-t border-stone-200 dark:border-border pt-3">
          {/* Notes */}
          {tap.notes && (
            <p className="text-xs text-muted-foreground mb-3">{tap.notes}</p>
          )}

          {/* Beer description */}
          {hasDescription && (
            <div className="mb-3 bg-stone-50 dark:bg-[#0B0D10]/20 rounded-xl p-3 border border-primary/10">
              <p className="text-xs font-bold text-primary dark:text-orange-400 mb-1 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />Descrizione
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">{tap.beerDescription}</p>
            </div>
          )}

          {/* Manager edit link when description is missing */}
          {descriptionMissing && (
            <div className="mb-3 border border-dashed border-primary/30 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-2">Descrizione birra mancante</p>
              <Link href={`/beer/${tap.beerId}`}>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-primary/20 text-primary">
                  <Pencil className="h-3 w-3" />Modifica birra
                </Button>
              </Link>
            </div>
          )}


          {/* Rating */}
          {isAuth ? (
            <SliderRating tapId={tap.id} slug={slug} current={tap.userRating} avg={tap.avgRating} count={tap.ratingCount} />
          ) : (
            <div className="flex items-center gap-2 p-3 bg-stone-50 dark:bg-[#0B0D10]/20 rounded-xl">
              {tap.avgRating !== null && tap.ratingCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-primary dark:text-orange-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="font-bold">{tap.avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({tap.ratingCount} vot{tap.ratingCount === 1 ? "o" : "i"})</span>
                </div>
              )}
              <Link href="/login" className="ml-auto text-xs text-primary font-bold hover:underline">
                Accedi per votare →
              </Link>
            </div>
          )}

          {/* Comments + owner replies */}
          <TapComments tapId={tap.id} slug={slug} isManager={isManager} />
        </div>
      )}
    </div>
  );
}

// ── Food Category Block ───────────────────────────────────────────────────────
function FoodCategoryBlock({ category, items }: { category: string; items: FestivalData["food"] }) {
  const [expanded, setExpanded] = useState(false);
  const available = items.filter(i => i.isAvailable).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] bg-white dark:bg-[#1A1D24] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50/50 dark:hover:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">{category}</span>
          <span className="text-xs text-primary bg-stone-50 dark:bg-[#0B0D10]/20 px-1.5 py-0.5 rounded-full font-semibold">
            {available}/{items.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
      </button>

      {expanded && (
        <div className="divide-y divide-orange-50 dark:divide-border">
          {items.map(item => (
            <div key={item.id} className={`px-4 py-3 ${!item.isAvailable ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-sm ${!item.isAvailable ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.name}
                    </span>
                    {!item.isAvailable && (
                      <Badge variant="outline" className="text-xs text-destructive border-destructive/20 py-0">Esaurito</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.allergens.map(a => (
                        <span key={a} className="text-xs bg-stone-50 dark:bg-[#0B0D10]/20 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
                          {ALLERGEN_LABELS[a.toLowerCase()] ?? a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {item.price && (
                  <span className="font-bold text-primary text-sm whitespace-nowrap bg-stone-50 dark:bg-[#0B0D10]/20 px-2 py-0.5 rounded-full">€{parseFloat(item.price).toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rankings Tab ─────────────────────────────────────────────────────────────
function RankingsTab({ rankings }: { rankings: FestivalData["rankings"] }) {
  if (rankings.length === 0) return (
    <div className="text-center py-10 text-muted-foreground">
      <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
      <p>Ancora nessun voto</p>
      <p className="text-xs mt-1">Espandi le birre per votarle!</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {rankings.map((t, i) => (
        <div key={t.tapNumber} className="flex items-center gap-3 bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${
            i === 0 ? "bg-primary text-white" :
            i === 1 ? "bg-stone-200 text-muted-foreground" :
            i === 2 ? "bg-stone-100 text-orange-600" :
            "bg-stone-50 dark:bg-[#0B0D10]/20 text-primary"
          }`}>
            {i + 1}
          </div>
          {t.beerImageUrl ? (
            <img loading="lazy" src={t.beerImageUrl} alt={t.beerName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-[#0B0D10]/20 flex items-center justify-center flex-shrink-0">
              <Beer className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{t.beerName}</p>
            {t.breweryName && (
              <p className="text-xs text-primary dark:text-orange-400 truncate font-medium">{t.breweryName}</p>
            )}
            <p className="text-xs text-muted-foreground">Spina #{t.tapNumber} · {t.count} vot{t.count === 1 ? "o" : "i"}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-primary">{t.avg.toFixed(1)}</div>
            <div className="flex items-center gap-0.5 justify-end">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(t.avg / 2) ? "fill-primary text-primary" : "text-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FestivalPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  // Parte da "overview" su tutti i dispositivi; su desktop la tab taps è
  // sempre visibile nel layout a due colonne, quindi non serve switch.
  const [activeTab, setActiveTab] = useState<string>("overview");
  const isFestivalModalOpen = useAnyModalOpen();
  // Nasconde la global BottomNavigation: questa pagina ha il proprio dock
  useHideGlobalBottomNav();

  const handleFestivalShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
  };

  const { data, isLoading, isError, error } = useQuery<FestivalData, { status: number; message: string }>({
    queryKey: ["/api/festivals", slug],
    queryFn: async () => {
      const r = await fetch(`/api/festivals/${slug}`, { credentials: "include" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const err: any = new Error(body.message || "Errore");
        err.status = r.status;
        throw err;
      }
      return r.json();
    },
    refetchInterval: 30000,
    retry: false,
  });

  const filteredTaps = useMemo(() => {
    if (!data?.taps) return [];
    return data.taps.filter(t => {
      if (!showUnavailable && !t.isAvailable) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const name = (t.beerName || t.customBeerName || "").toLowerCase();
      const brew = (t.breweryName || t.customBreweryName || "").toLowerCase();
      const style = (t.beerStyle || t.style || "").toLowerCase();
      const num = String(t.tapNumber);
      return name.includes(q) || brew.includes(q) || style.includes(q) || num.includes(q);
    });
  }, [data?.taps, search, showUnavailable]);

  const foodByCategory = useMemo(() => {
    if (!data?.food) return {};
    const acc: Record<string, typeof data.food> = {};
    data.food.forEach(item => {
      const cat = item.category || "Altro";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
    });
    return acc;
  }, [data?.food]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Caricamento festival...</p>
      </div>
    </div>
  );

  const isNotActive = isError && (error as any)?.status === 403;

  if (isError || !data?.festival) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3 max-w-xs px-4">
        <Beer className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        {isNotActive ? (
          <>
            <h2 className="text-xl font-bold text-foreground">Festival non ancora attivo</h2>
            <p className="text-muted-foreground">Il taplist digitale di questo festival non è ancora disponibile. Riprova a breve!</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground">Festival non trovato</h2>
            <p className="text-muted-foreground">Controlla il QR code e riprova.</p>
          </>
        )}
      </div>
    </div>
  );

  const { festival, taps, rankings = [] } = data;
  const availableCount = taps.filter(t => t.isAvailable).length;
  const useTokens = !!(festival.useTokens);
  const tokenName = festival.tokenName || "token";

  const isManager = !!(user && festival.managerId && (user as any).id === festival.managerId) ||
    !!(user && ((user as any).roles?.includes("admin") || (user as any).activeRole === "admin"));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });

  const seoFestivalUrl = `https://fermenta.to/festival/${slug}`;
  const seoFestivalTitle = `${festival.name} — Festival Birra Artigianale | Fermenta.to`;
  const seoFestivalDesc = festival.description
    ? festival.description.slice(0, 155)
    : `Scopri le birre e i birrifici al festival ${festival.name}${festival.location ? ` a ${festival.location}` : ""}. Taplist, voti e programma su Fermenta.to.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seoFestivalTitle}</title>
        <meta name="description" content={seoFestivalDesc} />
        <meta property="og:title" content={seoFestivalTitle} />
        <meta property="og:description" content={seoFestivalDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoFestivalUrl} />
        <meta property="og:site_name" content="Fermenta.to" />
        {(festival.coverImageUrl || festival.logoUrl) && <meta property="og:image" content={(festival.coverImageUrl || festival.logoUrl)!} />}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={seoFestivalUrl} />
        <script type="application/ld+json">{JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fermenta.to/" },
              { "@type": "ListItem", "position": 2, "name": "Festival", "item": "https://fermenta.to/explore/pubs" },
              { "@type": "ListItem", "position": 3, "name": festival.name, "item": seoFestivalUrl },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "@id": seoFestivalUrl,
            "name": festival.name,
            "description": seoFestivalDesc,
            "url": seoFestivalUrl,
            "eventStatus": "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            ...(festival.startDate ? { "startDate": festival.startDate } : {}),
            ...(festival.endDate ? { "endDate": festival.endDate } : {}),
            ...(festival.location ? {
              "location": {
                "@type": "Place",
                "name": festival.location,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": festival.location,
                  "addressCountry": "IT",
                },
              }
            } : {}),
            ...(festival.logoUrl || festival.coverImageUrl ? { "image": festival.coverImageUrl || festival.logoUrl } : {}),
            "organizer": { "@id": "https://fermenta.to/#organization" },
            ...(taps.length > 0 ? {
              "about": taps.slice(0, 5).filter(t => t.beerName).map(t => ({
                "@type": "Product",
                "name": t.beerName,
                ...(t.breweryName ? { "brand": { "@type": "Brand", "name": t.breweryName } } : {}),
                ...(t.beerStyle ? { "category": t.beerStyle } : {}),
                ...(t.beerAbv ? { "additionalProperty": [{ "@type": "PropertyValue", "name": "ABV", "value": `${t.beerAbv}%` }] } : {}),
              }))
            } : {}),
          }
        ])}</script>
      </Helmet>
      {/* Hero section — cover image (when set) or brand gradient fallback */}
      <div className={`relative overflow-hidden ${festival.coverImageUrl ? '' : 'bg-gradient-to-br from-primary via-amber-500 to-orange-600 dark:from-amber-900 dark:via-orange-900 dark:to-orange-950'} pt-12 pb-20 px-4 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
        {/* Cover image background */}
        {festival.coverImageUrl && (
          <>
            <img
              src={festival.coverImageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/40 to-black/60 pointer-events-none" />
          </>
        )}
        {/* Back button — frosted glass, matches app style */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-3 left-4 lg:hidden w-10 h-10 rounded-full bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-sm flex items-center justify-center text-[#151515] dark:text-[#F5F5F5] shadow-[0_4px_20px_rgba(0,0,0,0.12)] active:scale-95 transition-transform z-20"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-start gap-5">
            {festival.logoUrl && (
              <img
                src={festival.logoUrl}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover shadow-2xl flex-shrink-0 border-2 border-white/20"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-sm">{festival.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {festival.location && (
                  <button
                    type="button"
                    onClick={() => {
                      const loc = encodeURIComponent(festival.location);
                      const cap = (window as any).Capacitor;
                      if (cap?.isNativePlatform?.()) {
                        const isIos = cap.getPlatform() === 'ios';
                        window.open(
                          isIos
                            ? `maps://maps.apple.com/?q=${loc}`
                            : `geo:0,0?q=${loc}`,
                          '_system'
                        );
                      } else {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${loc}`, '_blank');
                      }
                    }}
                    className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white/90 font-semibold text-xs flex items-center gap-1.5 hover:bg-white/30 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[150px]">{festival.location}</span>
                  </button>
                )}
                {(festival.startDate || festival.endDate) && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white/90 font-semibold text-xs flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {festival.startDate && formatDate(festival.startDate)}
                      {festival.startDate && festival.endDate && festival.startDate !== festival.endDate && " — "}
                      {festival.endDate && festival.startDate !== festival.endDate && formatDate(festival.endDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content with rounded corners overlap */}
      <div
        className={`max-w-2xl lg:max-w-4xl mx-auto bg-[#FAF7F1] dark:bg-[#0B0D10] rounded-t-3xl relative z-10 px-4 min-h-[calc(100dvh-200px)] ${activeTab !== 'overview' ? 'mt-0 pt-0 lg:-mt-8 lg:pt-6' : '-mt-8 pt-6'}`}
        style={{
          paddingBottom: 'calc(96px + var(--frozen-sab))',
          paddingTop: activeTab !== 'overview' ? '64px' : undefined,
        }}
      >
        {/* Info content (overview-only su mobile, sempre visibile su desktop) */}
        <div className={`space-y-4 ${activeTab !== 'overview' ? 'hidden lg:block' : ''}`}>
          {/* Schedule */}
          {festival.schedule && festival.schedule.length > 0 && (
            <div className="bg-[#FFF7EA] dark:bg-primary/10 rounded-2xl border border-primary/15 dark:border-primary/20 px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-primary dark:text-orange-400 text-sm font-bold uppercase tracking-wider mb-3">
                <Clock className="h-4 w-4" />Orari del festival
              </div>
              <div className="grid gap-2">
                {festival.schedule.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-primary/5 last:border-0">
                    <span className="text-foreground/80 font-medium">
                      {slot.date
                        ? new Date(slot.date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
                        : slot.label}
                    </span>
                    <span className="text-primary font-bold">{slot.openFrom} – {slot.openTo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Like + Share + Login */}
          <div className="flex flex-wrap items-center gap-3">
            <FestivalLikeButton festivalId={festival.id} className="flex-1 min-w-[140px]" />
            <ShareButton
              title={festival.name}
              text={`Scopri le birre al festival ${festival.name}!`}
              url={window.location.href}
              label="Condividi"
              className="flex-1 min-w-[140px]"
            />
            {!isAuthenticated && (
              <Link href="/login" className="w-full sm:flex-1">
                <Button variant="outline" className="w-full text-xs font-bold text-primary border-primary/20 hover:bg-[#FFF7EA] rounded-xl py-5">
                  Accedi per votare →
                </Button>
              </Link>
            )}
          </div>

          {/* Informazioni – expandable card */}
          {festival.description && (
            <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-border shadow-sm bg-white dark:bg-card">
              <button
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50/50 dark:hover:bg-white/5 transition-colors"
                onClick={() => setDescExpanded(v => !v)}
              >
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Informazioni sul festival
                </span>
                {descExpanded
                  ? <ChevronUp className="h-4 w-4 text-primary" />
                  : <ChevronDown className="h-4 w-4 text-primary" />}
              </button>
              {descExpanded && (
                <div className="px-5 py-4 border-t border-stone-100 dark:border-border">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground/80
                      prose-headings:text-foreground prose-headings:font-bold
                      prose-a:text-primary prose-a:font-semibold
                      prose-strong:text-foreground prose-strong:font-bold
                      prose-blockquote:border-primary prose-blockquote:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: festival.description }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content tabs */}
        <div className={activeTab !== 'overview' ? 'mt-0 lg:mt-8' : 'mt-8'}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="hidden lg:flex w-full mb-6 bg-[#F0EAE0] dark:bg-white/[0.04] p-1 rounded-2xl h-12 border border-[#E8DED1] dark:border-white/[0.06]">
              <TabsTrigger value="taps" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm font-bold h-10 text-[#6B6357] dark:text-[#B7BDC7] data-[state=active]:text-white">
                <Beer className="h-4 w-4" />
                Birre ({availableCount}/{taps.length})
              </TabsTrigger>
              {festival.showFood && data.food.length > 0 && (
                <TabsTrigger value="food" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm font-bold h-10 text-[#6B6357] dark:text-[#B7BDC7]">
                  <UtensilsCrossed className="h-4 w-4" />
                  Menu
                </TabsTrigger>
              )}
              <TabsTrigger value="rankings" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm font-bold h-10 text-[#6B6357] dark:text-[#B7BDC7]">
                <Trophy className="h-4 w-4" />
                Classifica
              </TabsTrigger>
            </TabsList>

            {/* Overview tab: SOLO mobile. Card glass con riepilogo delle sezioni. */}
            <TabsContent value="overview" className="lg:hidden space-y-4 mt-0 focus-visible:outline-none">
              {/* Top birre */}
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Beer className="h-4 w-4 text-primary" /> Taplist
                    <span className="text-xs font-medium text-muted-foreground">({availableCount}/{taps.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('taps')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Vedi tutte →
                  </button>
                </div>
                {taps.filter(t => t.isAvailable).slice(0, 3).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessuna birra disponibile al momento.</p>
                ) : (
                  <div className="space-y-2.5">
                    {taps.filter(t => t.isAvailable).slice(0, 3).map(t => {
                      const beerName = t.beerName || t.customBeerName || `Spina ${t.tapNumber}`;
                      const breweryName = t.breweryName || t.customBreweryName;
                      return (
                        <div key={t.id} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {t.tapNumber}
                          </div>
                          {t.beerImageUrl ? (
                            <img loading="lazy" src={t.beerImageUrl} alt={beerName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                              <Beer className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-foreground truncate">{beerName}</div>
                            {breweryName && (
                              <div className="text-xs text-primary dark:text-orange-400 truncate">{breweryName}</div>
                            )}
                          </div>
                          {t.avgRating !== null && t.ratingCount > 0 && (
                            <div className="text-xs font-bold text-primary flex items-center gap-0.5 flex-shrink-0">
                              <Star className="h-3 w-3 fill-current" /> {t.avgRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Food preview */}
              {festival.showFood && data.food.length > 0 && (
                <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-primary" /> Food
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('food')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Vedi menu →
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.food.length} {data.food.length === 1 ? 'portata disponibile' : 'portate disponibili'}.
                  </p>
                </div>
              )}

              {/* Classifica preview */}
              <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Classifica
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rankings')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Vedi tutta →
                  </button>
                </div>
                {rankings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ancora nessun voto. Vota le birre per popolare la classifica!</p>
                ) : (
                  <div className="space-y-2">
                    {rankings.slice(0, 3).map((r, i) => (
                      <div key={r.tapNumber} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-primary text-white' :
                          i === 1 ? 'bg-stone-200 dark:bg-white/10 text-foreground' :
                          'bg-stone-100 dark:bg-white/[0.06] text-foreground'
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">{r.beerName}</div>
                          {r.breweryName && (
                            <div className="text-xs text-primary dark:text-orange-400 truncate">{r.breweryName}</div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-primary flex-shrink-0">{r.avg.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>


            <TabsContent value="taps" className="space-y-4">
              {/* Search + filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, birrificio, stile…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 bg-white dark:bg-transparent border-stone-200 dark:border-border rounded-xl h-11 focus:ring-primary focus:border-primary"
                  />
                </div>
                <Button
                  variant={showUnavailable ? "outline" : "default"}
                  size="default"
                  onClick={() => setShowUnavailable(v => !v)}
                  className={`gap-2 whitespace-nowrap font-bold rounded-xl h-11 px-4 ${
                    !showUnavailable ? "bg-primary text-white" : "border-stone-200 text-primary hover:bg-stone-50"
                  }`}
                >
                  {showUnavailable ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {showUnavailable ? "Nascondi finite" : "Mostra tutte"}
                </Button>
              </div>

              {filteredTaps.length === 0 ? (
                <div className="text-center py-16 bg-stone-50/20 dark:bg-white/5 rounded-3xl border border-dashed border-stone-300 dark:border-border">
                  <Beer className="h-10 w-10 mx-auto mb-3 opacity-20 text-primary" />
                  <p className="font-bold text-foreground">Nessuna birra trovata</p>
                  <p className="text-sm text-muted-foreground mt-1">Prova a cambiare i termini di ricerca</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTaps.map(tap => (
                    <TapCard key={tap.id} tap={tap} slug={slug!} isAuth={isAuthenticated} isManager={isManager} useTokens={useTokens} tokenName={tokenName} />
                  ))}
                </div>
              )}
            </TabsContent>

            {festival.showFood && (
              <TabsContent value="food" className="space-y-4">
                {Object.keys(foodByCategory).length === 0 ? (
                  <div className="text-center py-16 bg-stone-50/20 dark:bg-white/5 rounded-3xl border border-dashed border-stone-300">
                    <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-20 text-primary" />
                    <p className="font-bold text-foreground">Nessuna voce nel menu</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {Object.entries(foodByCategory).map(([category, items]) => (
                      <FoodCategoryBlock key={category} category={category} items={items} />
                    ))}
                  </div>
                )}
                <div className="bg-stone-50/50 dark:bg-[#0B0D10]/10 p-4 rounded-2xl text-center">
                  <p className="text-xs text-muted-foreground">
                    I prezzi includono IVA · Informare il personale di eventuali allergie
                  </p>
                </div>
              </TabsContent>
            )}

            <TabsContent value="rankings" className="space-y-4">
              <RankingsTab rankings={rankings} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center py-12 text-xs text-muted-foreground border-t border-stone-100 dark:border-border mt-12">
          <a href="/" className="font-bold text-primary hover:underline transition-colors">Fermenta.to</a>
          <span className="mx-2">·</span>
          Aggiornato ogni 30 secondi
        </div>
      </div>

      {/* ── STICKY MINI TOP BAR (mobile, non-overview) ── */}
      {activeTab !== 'overview' && !isFestivalModalOpen && (
        <DockPortal>
        <div
          className="ios-fixed-chrome lg:hidden fixed inset-x-0 z-[49]"
          style={{ top: 'var(--mobile-top-offset)' }}
        >
          <div className="bg-white/90 dark:bg-[#0B0B0C]/90 border-b border-stone-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 h-14">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                aria-label="Torna alla home del festival"
                className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center active:opacity-80 transition-opacity"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {festival.logoUrl && (
                  <img
                    src={festival.logoUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-white/10 flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-foreground truncate leading-tight">{festival.name}</div>
                  <div className="text-[10px] font-semibold text-primary capitalize leading-tight">
                    {activeTab === 'taps' && 'Taplist'}
                    {activeTab === 'food' && 'Food'}
                    {activeTab === 'rankings' && 'Classifica'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFestivalShare}
                aria-label="Condividi"
                className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center active:opacity-80 transition-opacity"
              >
                <Share2 className="h-[18px] w-[18px] text-foreground" />
              </button>
            </div>
          </div>
        </div>
        </DockPortal>
      )}

      {/* ── BOTTOM TAB BAR (mobile only) — attaccata al fondo, sostituisce la global nav ── */}
      <nav
        className={`ios-fixed-chrome bottom-nav-fixed lg:hidden fixed left-0 right-0 bottom-0 z-[55] bg-white dark:bg-[#0B0D10] border-t border-x border-stone-100 dark:border-white/[0.06] rounded-t-[32px] shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.55)] transition-opacity duration-200 ${
          isFestivalModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ paddingBottom: 'max(calc(var(--frozen-sab) - 16px), 0px)' }}
        aria-label="Navigazione del festival"
        role="tablist"
      >
        <div className="relative flex items-stretch h-[64px] px-2 gap-1 max-w-2xl mx-auto">
          {[
            { id: 'overview', label: 'Overview', Icon: HomeIcon },
            { id: 'taps', label: 'Taplist', Icon: Beer },
            ...(festival.showFood && data.food.length > 0
              ? [{ id: 'food', label: 'Food', Icon: UtensilsCrossed }]
              : []),
            { id: 'rankings', label: 'Classifica', Icon: Trophy },
          ].map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                onClick={() => setActiveTab(id)}
                data-testid={`festival-dock-${id}`}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-[20px] transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                    : 'text-stone-500 dark:text-stone-400 hover:text-foreground'
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.5 : 1.8}
                  fill={active ? 'currentColor' : 'none'}
                  style={active ? { fillOpacity: 0.12 } : {}}
                />
                <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
