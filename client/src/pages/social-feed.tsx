import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  Users, Package, MapPin, Search, UserPlus, UserMinus,
  BarChart3, Award, TrendingUp, Star, Heart, MessageCircle,
  PenSquare, Newspaper, Camera, Zap, ChevronRight, ExternalLink,
  Clock, Beer as BeerIcon, Send, AtSign, Loader2, X, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CheckinSocialBar from "@/components/social/CheckinSocialBar";
import { ZoomableImage } from "@/components/ImageLightbox";
import TrendingHashtags from "@/components/social/TrendingHashtags";
import { InlinePostComposer } from "@/components/social/InlinePostComposer";
import { EntityPreviewCard, type EntityType } from "@/components/social/EntityPreviewCard";

/* ── helpers ── */
const FORMAT_LABELS: Record<string, string> = {
  spina: "Alla spina", bottiglia: "Bottiglia", lattina: "Lattina", growler: "Growler",
};
const BADGE_DEFS = [
  { key: "primo_sorso",       icon: "🍺", name: "Primo Sorso",        description: "Primo assaggio" },
  { key: "esploratore",       icon: "🧭", name: "Esploratore",         description: "10 assaggi" },
  { key: "degustatore",       icon: "🎓", name: "Degustatore",         description: "25 assaggi" },
  { key: "sommelier",         icon: "🏆", name: "Sommelier",           description: "50 assaggi" },
  { key: "guru",              icon: "⭐", name: "Guru della Birra",    description: "100 assaggi" },
  { key: "critico",           icon: "✍️", name: "Critico",             description: "10 note scritte" },
  { key: "fotografo",         icon: "📸", name: "Fotografo",           description: "Prima foto" },
  { key: "cacciatore_stili",  icon: "🎯", name: "Cacciatore di Stili", description: "5 stili diversi" },
  { key: "globe_trotter",     icon: "🌍", name: "Globe Trotter",       description: "10 stili diversi" },
  { key: "perfezionista",     icon: "💎", name: "Perfezionista",       description: "Voto 5.0 dato" },
  { key: "sociale",           icon: "👥", name: "Sociale",             description: "5 amici seguiti" },
];

/* ── UserAvatar ── */
function UserAvatar({ user, size = 9 }: { user: any; size?: number }) {
  const name = user.display_name ?? user.nickname ?? "?";
  const sz = `w-${size} h-${size}`;
  return user.profile_image_url ? (
    <img src={user.profile_image_url} alt={name}
      className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-[#1A1D24]`} />
  ) : (
    <div className={`${sz} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-[#1A1D24]`}>
      <span className="text-primary font-black text-sm">{(name?.[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

/* ── RatingStars ── */
function RatingStars({ rating }: { rating: number }) {
  const r = Math.round(parseFloat(rating.toString()));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= r ? "text-amber-400 fill-amber-400" : "text-stone-200 dark:text-stone-700"}`} />
      ))}
      <span className="text-xs font-bold text-stone-600 dark:text-stone-300 ml-1">
        {parseFloat(rating.toString()).toFixed(1)}
      </span>
    </div>
  );
}


/* ── NewsStrip ── */
function NewsStrip({ news }: { news: any[] }) {
  if (!news.length) return null;
  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
          <Newspaper className="w-3 h-3" /> News birra
        </span>
        <Link href="/news">
          <span className="text-[11px] text-primary font-bold flex items-center gap-0.5 hover:underline">
            Vedi tutte <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar">
        {news.slice(0, 6).map((n: any) => (
          <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 w-36 group">
            <div className="rounded-xl overflow-hidden bg-stone-100 dark:bg-[#12151A] mb-1.5 h-20 relative">
              {n.image_url ? (
                <img src={n.image_url} alt="" loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-stone-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <p className="text-[10px] font-black uppercase text-primary mb-0.5 truncate">{n.source_name}</p>
            <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug">{n.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── CheckinCard ── */
function CheckinCard({ data }: { data: any }) {
  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <UserAvatar
          user={{
            profile_image_url: data.profile_image_url,
            display_name: data.display_name ?? data.username,
            nickname: data.username,
          }}
          size={8}
        />
        <div className="flex-1 min-w-0">
          <Link href={`/user/${data.username}`}>
            <span className="text-sm font-bold text-stone-900 dark:text-stone-50 hover:text-primary transition-colors">
              {data.display_name ?? data.username}
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            {data.tasted_at
              ? formatDistanceToNow(new Date(data.tasted_at), { addSuffix: true, locale: it })
              : ""}
            <span className="text-stone-200 dark:text-stone-700">·</span>
            <span className="font-semibold text-primary/70">check-in</span>
          </div>
        </div>
        {data.format && (
          <span className="text-[10px] font-bold bg-stone-100 dark:bg-white/[0.05] text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-full flex-shrink-0">
            {FORMAT_LABELS[data.format] ?? data.format}
          </span>
        )}
      </div>

      {/* Beer body */}
      <div className="px-4 pb-3">
        <div className="flex gap-3">
          <Link href={`/beer/${data.beer_id}`} className="flex-shrink-0">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl bg-[#FAF7F1] dark:bg-[#12151A] overflow-hidden flex items-center justify-center border border-stone-100 dark:border-white/[0.04]">
              {data.beer_image ? (
                <img src={data.beer_image} alt={data.beer_name}
                  className="w-full h-full object-contain p-1.5" />
              ) : (
                <Package className="w-6 h-6 text-stone-300" />
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/beer/${data.beer_id}`}>
              <p className="font-bold text-stone-900 dark:text-stone-50 leading-tight hover:text-primary transition-colors line-clamp-2">
                {data.beer_name}
              </p>
            </Link>
            {data.brewery_name && (
              <p className="text-xs text-stone-400 mt-0.5 truncate">{data.brewery_name}</p>
            )}
            {data.rating && (
              <div className="mt-1.5">
                <RatingStars rating={data.rating} />
              </div>
            )}
            {data.pub_id && data.pub_name && (
              <Link href={`/pub/${data.pub_id}`}>
                <p className="text-xs text-primary font-semibold mt-1.5 flex items-center gap-1 hover:underline">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {data.pub_name}{data.pub_city ? `, ${data.pub_city}` : ""}
                  </span>
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="mt-2.5 bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 border border-stone-100/80 dark:border-white/[0.03]">
            <p className="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed line-clamp-3">
              "{data.notes}"
            </p>
          </div>
        )}
      </div>

      {/* Photo — tap to zoom */}
      {data.photo_url && (
        <div className="px-4 pb-3">
          <ZoomableImage src={data.photo_url} alt="Foto assaggio"
            className="rounded-xl w-full max-h-80 object-cover" />
        </div>
      )}

      {/* Social bar */}
      <div className="border-t border-stone-100 dark:border-white/[0.04] px-2">
        <CheckinSocialBar tastingId={data.id} />
      </div>
    </div>
  );
}

/* ── MicroblogCard ── */
function MicroblogCard({ post }: { post: any }) {
  const queryClient = useQueryClient();
  const [entityPreview, setEntityPreview] = useState<{
    type: EntityType; id: number; rect: DOMRect;
  } | null>(null);

  const likeMut = useMutation({
    mutationFn: () =>
      apiRequest(`/api/microblog/posts/${post.id}/like`, {
        method: post.liked ? "DELETE" : "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
    },
  });

  const handleEntityChip = (
    e: React.MouseEvent,
    type: EntityType,
    id: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEntityPreview({ type, id, rect });
  };

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <UserAvatar user={post} size={8} />
        <div className="flex-1 min-w-0">
          <Link href={`/user/${post.username}`}>
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50 hover:text-primary transition-colors">
              {post.display_name ?? post.username}
            </p>
          </Link>
          <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
            <span className="text-stone-200 dark:text-stone-700">·</span>
            <span className="font-semibold text-amber-500/80">📝 post</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-stone-800 dark:text-stone-100 whitespace-pre-wrap leading-relaxed">
        {post.content}
      </p>

      {post.image_url && (
        <ZoomableImage src={post.image_url} alt=""
          className="mt-3 rounded-xl w-full max-h-80 object-cover" />
      )}

      {(post.beer_name || post.pub_name || post.brewery_name) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.beer_name && (
            <Link href={`/beer/${post.beer_id}`}>
              <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold cursor-pointer hover:bg-primary/20">
                🍺 {post.beer_name}
              </span>
            </Link>
          )}
          {post.pub_name && post.pub_id && (
            <button
              onClick={(e) => handleEntityChip(e, "pub", post.pub_id)}
              className="text-[10px] bg-stone-100 dark:bg-[#12151A] text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-full font-semibold hover:bg-stone-200 dark:hover:bg-[#0B0D10] transition-colors cursor-pointer"
            >
              📍 {post.pub_name}
            </button>
          )}
          {post.brewery_name && post.brewery_id && (
            <button
              onClick={(e) => handleEntityChip(e, "brewery", post.brewery_id)}
              className="text-[10px] bg-stone-100 dark:bg-[#12151A] text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-full font-semibold hover:bg-stone-200 dark:hover:bg-[#0B0D10] transition-colors cursor-pointer"
            >
              🏭 {post.brewery_name}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.04] flex items-center gap-4">
        <button
          onClick={() => likeMut.mutate()}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
            post.liked ? "text-red-500" : "text-stone-400 hover:text-red-500"
          }`}
        >
          <Heart className="w-4 h-4" fill={post.liked ? "currentColor" : "none"} />
          {post.likes_count ?? 0}
        </button>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-400">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count ?? 0}
        </span>
      </div>

      {entityPreview && (
        <EntityPreviewCard
          type={entityPreview.type}
          id={entityPreview.id}
          anchorRect={entityPreview.rect}
          onClose={() => setEntityPreview(null)}
        />
      )}
    </div>
  );
}

/* ── UserRow ── */
function UserRow({
  user,
  followingIds,
  onToggle,
}: {
  user: any;
  followingIds: Set<string>;
  onToggle: (id: string, following: boolean) => void;
}) {
  const handle = user.username ?? user.nickname;
  const name =
    user.display_name ??
    ([user.first_name, user.last_name].filter(Boolean).join(" ") || handle);
  const isFollowing = followingIds.has(user.id);
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <Link href={`/user/${handle}`}>
        <UserAvatar user={{ ...user, display_name: name }} size={10} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/user/${handle}`}>
          <p className="font-bold text-stone-800 dark:text-stone-100 text-sm truncate">{name}</p>
          {handle && <p className="text-xs text-stone-400 truncate">@{handle}</p>}
        </Link>
      </div>
      <button
        onClick={() => onToggle(user.id, isFollowing)}
        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
          isFollowing
            ? "bg-stone-100 dark:bg-[#12151A] text-stone-500 dark:text-stone-400"
            : "bg-primary text-white shadow-sm shadow-primary/20"
        }`}
      >
        {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
        {isFollowing ? "Segui già" : "Segui"}
      </button>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
      {icon && <div className="flex justify-center mb-1 opacity-40">{icon}</div>}
      <p className="text-2xl font-black text-stone-900 dark:text-stone-50 font-poppins leading-none">
        {value}
      </p>
      <p className="text-xs text-stone-500 mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-primary mt-0.5 font-semibold">{sub}</p>}
    </div>
  );
}

/* ── Desktop sidebar ── */
function DesktopSidebar({
  stats,
  badges,
  following,
  news,
}: {
  stats: any;
  badges: any[];
  following: any[];
  news: any[];
}) {
  const earnedBadges = (badges ?? []).filter((b: any) => b.earned);
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-[72px] self-start">
      {/* Mini stats */}
      {stats && stats.total > 0 && (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Le tue stats
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { v: stats.total, l: "assaggi" },
              { v: stats.avgRating ? Number(stats.avgRating).toFixed(1) : "—", l: "voto medio" },
              { v: `${earnedBadges.length}/${BADGE_DEFS.length}`, l: "badge" },
            ].map(({ v, l }) => (
              <div key={l} className="text-center">
                <p className="text-xl font-black text-stone-900 dark:text-stone-50">{v}</p>
                <p className="text-[10px] text-stone-400 font-medium">{l}</p>
              </div>
            ))}
          </div>
          {stats.topStyles?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {stats.topStyles.slice(0, 3).map((s: any) => {
                const max = stats.topStyles[0].cnt;
                return (
                  <div key={s.style}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-stone-600 dark:text-stone-300 font-medium truncate">{s.style}</span>
                      <span className="text-stone-400 ml-1 flex-shrink-0">{s.cnt}</span>
                    </div>
                    <div className="h-1 bg-stone-100 dark:bg-[#12151A] rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${(s.cnt / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/my-stats">
            <button className="w-full text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1">
              Vedi tutte le stats <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}

      {/* Find friends CTA */}
      {following?.length === 0 && (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Trova amici
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Cerca appassionati nella scheda <strong>Amici</strong> per vedere i loro assaggi nel feed.
          </p>
        </div>
      )}

      {/* Trending hashtags sidebar */}
      <TrendingHashtags limit={10} />

      {/* News sidebar */}
      {news?.length > 0 && (
        <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              <Newspaper className="w-3 h-3" /> News
            </p>
            <Link href="/news">
              <span className="text-[11px] text-primary font-bold hover:underline">Tutte</span>
            </Link>
          </div>
          <div className="space-y-3">
            {news.slice(0, 4).map((n: any) => (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 group">
                {n.image_url && (
                  <img src={n.image_url} alt="" loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 group-hover:opacity-90 transition" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase text-primary truncate">{n.source_name}</p>
                  <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 line-clamp-2 leading-snug mt-0.5 group-hover:text-primary transition-colors">
                    {n.title}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 text-stone-300 flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── Feed skeleton ── */
function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2 w-20 rounded" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="w-[72px] h-[72px] rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
export default function SocialFeed() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({
    queryKey: ["/api/user/feed"],
    enabled: isAuthenticated,
  });
  const { data: microblogFeed = [] } = useQuery<any[]>({
    queryKey: ["/api/microblog/feed"],
    enabled: isAuthenticated,
  });
  const { data: news = [] } = useQuery<any[]>({
    queryKey: ["/api/news", "feed"],
    queryFn: async () => {
      const r = await fetch("/api/news?limit=6");
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
  });
  const { data: following = [], isLoading: followingLoading } = useQuery<any[]>({
    queryKey: ["/api/user/following"],
    enabled: isAuthenticated,
  });
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<any[]>({
    queryKey: ["/api/users/search", debouncedSearch],
    queryFn: async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
    enabled: debouncedSearch.length >= 2,
  });
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });
  const { data: badges = [], isLoading: badgesLoading } = useQuery<any[]>({
    queryKey: ["/api/user/badges"],
    enabled: isAuthenticated,
  });

  const timeline = [
    ...feed.map((it: any) => ({
      kind: "checkin" as const,
      sortAt: new Date(it.tasted_at).getTime(),
      data: it,
    })),
    ...microblogFeed.map((p: any) => ({
      kind: "post" as const,
      sortAt: new Date(p.created_at).getTime(),
      data: p,
    })),
  ].sort((a, b) => b.sortAt - a.sortAt);

  const followingIds = new Set<string>((following as any[]).map((u: any) => u.id));

  const followMutation = useMutation({
    mutationFn: ({ id, following }: { id: string; following: boolean }) =>
      apiRequest(`/api/users/${id}/follow`, { method: following ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
    },
    onError: () =>
      toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" }),
  });

  /* Unauthenticated */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center mx-auto shadow-sm">
            <Users className="w-9 h-9 text-stone-300" />
          </div>
          <div>
            <p className="font-black text-stone-800 dark:text-stone-100 font-poppins text-lg">
              Feed sociale
            </p>
            <p className="text-sm text-stone-500 mt-1">
              Accedi per vedere i check-in dei tuoi amici
            </p>
          </div>
          <Link href="/auth">
            <Button className="w-full bg-primary text-white rounded-xl font-bold">Accedi</Button>
          </Link>
        </div>
      </div>
    );
  }

  const earnedBadges = badges.filter((b: any) => b.earned);

  return (
    <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] pb-28">
      <Helmet><title>Sociale | Fermenta.to</title></Helmet>

      <Tabs defaultValue="feed" className="w-full">
        {/* Sticky header */}
        <div className="bg-white/90 dark:bg-[#0B0D10]/90 backdrop-blur-xl border-b border-stone-100/80 dark:border-white/[0.05] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-0">
            <h1 className="text-xl font-black text-stone-900 dark:text-stone-50 font-poppins mb-3">
              Sociale
            </h1>
            <TabsList className="w-full bg-transparent p-0 h-auto border-b border-stone-100 dark:border-white/[0.05] rounded-none justify-start gap-0">
              {[
                { value: "feed",  label: "Feed" },
                { value: "amici", label: `Amici${following.length > 0 ? ` (${following.length})` : ""}` },
                { value: "stats", label: "Le mie stats" },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-stone-500 px-4 py-2.5 text-sm font-bold"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* ── FEED TAB ── */}
        <TabsContent value="feed" className="mt-0">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4">
            <div className="lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">

              {/* Main feed */}
              <div className="space-y-3">
                <InlinePostComposer user={user as any} />

                {/* News strip — mobile only */}
                <div className="lg:hidden">
                  <NewsStrip news={news} />
                </div>

                {/* Trending hashtags — mobile only */}
                <div className="lg:hidden">
                  <TrendingHashtags limit={10} compact />
                </div>

                {feedLoading ? (
                  <FeedSkeleton />
                ) : timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center shadow-sm">
                      <Users className="w-9 h-9 text-stone-300" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-700 dark:text-stone-300 font-poppins">
                        {following.length === 0
                          ? "Non stai seguendo nessuno"
                          : "Nessuna attività recente"}
                      </p>
                      <p className="text-sm text-stone-400 mt-1 max-w-xs mx-auto">
                        {following.length === 0
                          ? "Cerca appassionati nella scheda Amici per iniziare"
                          : "I tuoi amici non hanno fatto check-in né scritto post di recente"}
                      </p>
                    </div>
                    <Link href="/microblog/nuovo">
                      <Button className="rounded-xl mt-1 bg-primary text-white font-bold">
                        <PenSquare className="w-4 h-4 mr-2" /> Scrivi un post
                      </Button>
                    </Link>
                  </div>
                ) : (
                  timeline.map(entry =>
                    entry.kind === "post" ? (
                      <MicroblogCard key={`p-${entry.data.id}`} post={entry.data} />
                    ) : (
                      <CheckinCard key={`c-${entry.data.id}`} data={entry.data} />
                    )
                  )
                )}
              </div>

              {/* Desktop sidebar */}
              <DesktopSidebar
                stats={stats}
                badges={badges}
                following={following}
                news={news}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── AMICI TAB ── */}
        <TabsContent value="amici" className="mt-0">
          <div className="max-w-2xl mx-auto px-4 lg:px-8 py-4 space-y-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Cerca per nome o nickname…"
                className="pl-9 rounded-xl h-11 bg-white dark:bg-[#1A1D24] border-[#E8DED1] dark:border-white/[0.06]"
              />
            </div>

            {debouncedSearch.length >= 2 && (
              <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 divide-y divide-stone-100 dark:divide-white/[0.04]">
                {searchLoading ? (
                  <div className="py-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded-xl" />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="py-5 text-sm text-stone-400 text-center">Nessun utente trovato</p>
                ) : (
                  searchResults.map((u: any) => (
                    <UserRow key={u.id} user={u} followingIds={followingIds}
                      onToggle={(id, isFollowing) =>
                        followMutation.mutate({ id, following: isFollowing })
                      }
                    />
                  ))
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 px-1">
                Chi segui {following.length > 0 ? `· ${following.length}` : ""}
              </p>
              {followingLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : following.length === 0 ? (
                <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                  <p className="text-sm text-stone-400">
                    Cerca in alto per trovare persone da seguire
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 divide-y divide-stone-100 dark:divide-white/[0.04]">
                  {(following as any[]).map((u: any) => (
                    <UserRow key={u.id} user={u} followingIds={followingIds}
                      onToggle={(id, isFollowing) =>
                        followMutation.mutate({ id, following: isFollowing })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── STATS TAB ── */}
        <TabsContent value="stats" className="mt-0">
          {statsLoading || badgesLoading ? (
            <div className="max-w-2xl mx-auto px-4 lg:px-8 py-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : !stats || stats.total === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 px-6 text-center gap-4">
              <BarChart3 className="w-12 h-12 text-stone-300" />
              <div>
                <p className="font-bold text-stone-600 dark:text-stone-300">
                  Nessuna statistica ancora
                </p>
                <p className="text-sm text-stone-400 mt-1">Fai il primo check-in per iniziare</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 lg:px-8 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Assaggi" value={stats.total}
                  icon={<BeerIcon className="w-4 h-4" />} />
                <StatCard
                  label="Voto medio"
                  value={stats.avgRating ? `${Number(stats.avgRating).toFixed(1)}★` : "—"}
                  icon={<Star className="w-4 h-4" />}
                />
                <StatCard
                  label="Streak"
                  value={stats.currentStreak > 0 ? `${stats.currentStreak}🔥` : "—"}
                  sub={stats.currentStreak > 0 ? "giorni" : undefined}
                />
              </div>

              {stats.topStyles?.length > 0 && (
                <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Stili preferiti
                  </p>
                  <div className="space-y-2.5">
                    {stats.topStyles.slice(0, 5).map((s: any) => {
                      const max = stats.topStyles[0].cnt;
                      return (
                        <div key={s.style}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-700 dark:text-stone-200 font-semibold truncate">
                              {s.style}
                            </span>
                            <span className="text-stone-400 ml-2 flex-shrink-0 font-medium">{s.cnt}</span>
                          </div>
                          <div className="h-1.5 bg-stone-100 dark:bg-[#12151A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${(s.cnt / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.formatBreakdown?.length > 0 && (
                <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">
                    Come bevi
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.formatBreakdown.map((f: any) => (
                      <div key={f.format}
                        className="bg-stone-50 dark:bg-[#12151A] rounded-xl px-4 py-2.5 text-center">
                        <p className="text-lg font-black text-stone-800 dark:text-stone-100">{f.cnt}</p>
                        <p className="text-[10px] text-stone-400 font-medium">
                          {FORMAT_LABELS[f.format] ?? f.format}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.topBreweries?.length > 0 && (
                <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Birrifici preferiti
                  </p>
                  <div className="space-y-2.5">
                    {stats.topBreweries.slice(0, 5).map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name}
                            className="w-8 h-8 rounded-lg object-contain bg-stone-50 dark:bg-[#12151A] flex-shrink-0 border border-stone-100 dark:border-white/[0.04]" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#12151A] flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-black text-stone-400">{i + 1}</span>
                          </div>
                        )}
                        <span className="text-sm text-stone-700 dark:text-stone-200 truncate flex-1 font-medium">
                          {b.name}
                        </span>
                        <span className="text-xs text-stone-400 flex-shrink-0 font-semibold">
                          {b.cnt} 🍺
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Badge · {earnedBadges.length}/{BADGE_DEFS.length}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {BADGE_DEFS.map(def => {
                    const earned = badges.find((b: any) => b.key === def.key)?.earned;
                    return (
                      <div
                        key={def.key}
                        title={def.description}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-all ${
                          earned
                            ? "bg-primary/10 ring-1 ring-primary/20"
                            : "bg-stone-50 dark:bg-[#12151A] opacity-35 grayscale"
                        }`}
                      >
                        <span className="text-2xl leading-none">{def.icon}</span>
                        <p className="text-[9px] font-bold text-stone-600 dark:text-stone-300 leading-tight">
                          {def.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
