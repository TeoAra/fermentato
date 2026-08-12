import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  Users, Package, MapPin, Search, UserPlus, UserMinus,
  Star, Heart, MessageCircle, PenSquare, Newspaper,
  ChevronRight, ExternalLink, Clock, Loader2, Building2,
  Flame, TrendingUp, Beer as BeerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EntityChip } from "@/components/social/EntityChip";
import { PostContent } from "@/components/social/PostContent";
import { MicroblogSocialBar } from "@/components/social/MicroblogSocialBar";

/* ── helpers ── */
const FORMAT_LABELS: Record<string, string> = {
  spina: "Alla spina", bottiglia: "Bottiglia", lattina: "Lattina", growler: "Growler",
};

type FilterType = "all" | "post" | "checkin";

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

/* ── CheckinCard ── */
function CheckinCard({ data }: { data: any }) {
  const [beerPreviewRect, setBeerPreviewRect] = useState<DOMRect | null>(null);

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <UserAvatar
          user={{ profile_image_url: data.profile_image_url, display_name: data.display_name ?? data.username, nickname: data.username }}
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
            {data.tasted_at ? formatDistanceToNow(new Date(data.tasted_at), { addSuffix: true, locale: it }) : ""}
            <span className="text-stone-200 dark:text-stone-700">·</span>
            <span className="font-semibold text-amber-600/80">🍺 check-in</span>
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
          <button
            onClick={(e) => {
              e.preventDefault();
              setBeerPreviewRect((e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
            className="flex-shrink-0 cursor-pointer"
          >
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl bg-[#FAF7F1] dark:bg-[#12151A] overflow-hidden flex items-center justify-center border border-stone-100 dark:border-white/[0.04] hover:border-primary/40 transition-colors">
              {data.beer_image ? (
                <img src={data.beer_image} alt={data.beer_name} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Package className="w-6 h-6 text-stone-300" />
              )}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                setBeerPreviewRect((e.currentTarget as HTMLElement).getBoundingClientRect());
              }}
              className="text-left w-full"
            >
              <p className="font-bold text-stone-900 dark:text-stone-50 leading-tight hover:text-primary transition-colors line-clamp-2">
                {data.beer_name}
              </p>
            </button>
            {data.brewery_name && <p className="text-xs text-stone-400 mt-0.5 truncate">{data.brewery_name}</p>}
            {data.rating && <div className="mt-1.5"><RatingStars rating={data.rating} /></div>}
            {data.pub_id && data.pub_name && (
              <div className="mt-1.5">
                <EntityChip
                  type="pub"
                  id={data.pub_id}
                  label={`${data.pub_name}${data.pub_city ? `, ${data.pub_city}` : ""}`}
                />
              </div>
            )}
          </div>
        </div>
        {beerPreviewRect && (
          <EntityPreviewCard
            type="beer"
            id={data.beer_id}
            anchorRect={beerPreviewRect}
            onClose={() => setBeerPreviewRect(null)}
          />
        )}
        {data.notes && (
          <div className="mt-2.5 bg-stone-50 dark:bg-[#12151A] rounded-xl px-3 py-2 border border-stone-100/80 dark:border-white/[0.03]">
            <p className="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed line-clamp-3">"{data.notes}"</p>
          </div>
        )}
      </div>
      {data.photo_url && (
        <div className="px-4 pb-3">
          <ZoomableImage src={data.photo_url} alt="Foto assaggio" className="rounded-xl w-full max-h-80 object-cover" />
        </div>
      )}
      <div className="border-t border-stone-100 dark:border-white/[0.04] px-4 pb-3">
        <CheckinSocialBar
          tastingId={data.id}
          initialLikes={
            data.likes_count != null
              ? { count: data.likes_count, liked: data.liked ?? false, commentsCount: data.comments_count ?? 0 }
              : undefined
          }
        />
      </div>
    </div>
  );
}

/* ── MicroblogCard ── */
function MicroblogCard({ post }: { post: any }) {
  const isEntityPost = post.author_type && post.author_type !== "user";
  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center gap-2.5 mb-3">
        {isEntityPost ? (
          post.entity_logo_url ? (
            <img src={post.entity_logo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#E8DED1] dark:border-white/[0.06]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">
                {(post.entity_name ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        ) : (
          <UserAvatar user={post} size={8} />
        )}
        <div className="flex-1 min-w-0">
          {isEntityPost ? (
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
              {post.entity_name ?? (post.author_type === "pub" ? "Locale" : "Birrificio")}
            </p>
          ) : (
            <Link href={`/user/${post.username}`}>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50 hover:text-primary transition-colors">
                {post.display_name ?? post.username}
              </p>
            </Link>
          )}
          <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
            <span className="text-stone-200 dark:text-stone-700">·</span>
            {isEntityPost ? (
              <span className="font-semibold text-blue-500/80">📢 aggiornamento</span>
            ) : (
              <span className="font-semibold text-amber-500/80">📝 post</span>
            )}
            {post.updated_at && new Date(post.updated_at) > new Date(post.created_at) && (
              <><span className="text-stone-200 dark:text-stone-700">·</span><span className="italic text-stone-400/70">modificato</span></>
            )}
          </p>
        </div>
      </div>
      <PostContent content={post.content} />
      {post.image_url && (
        <ZoomableImage src={post.image_url} alt="" className="mt-3 rounded-xl w-full max-h-80 object-cover" />
      )}
      {(post.beer_name || post.pub_name || post.brewery_name) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.beer_name && post.beer_id && (
            <EntityChip type="beer" id={post.beer_id} label={post.beer_name} />
          )}
          {post.pub_name && post.pub_id && (
            <EntityChip type="pub" id={post.pub_id} label={post.pub_name} />
          )}
          {post.brewery_name && post.brewery_id && (
            <EntityChip type="brewery" id={post.brewery_id} label={post.brewery_name} />
          )}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.04]">
        <MicroblogSocialBar
          postId={post.id}
          postUserId={post.user_id}
          liked={post.liked}
          likesCount={post.likes_count ?? 0}
          commentsCount={post.comments_count ?? 0}
          content={post.content ?? ""}
          authorType={post.author_type}
          authorEntityId={post.author_entity_id}
        />
      </div>
    </div>
  );
}

/* ── TrendingBeersStrip ── */
function TrendingBeerDrinkers({
  beerId, beerName, onClose,
}: { beerId: number; beerName: string; onClose: () => void }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: drinkers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/community/trending-beers", beerId, "drinkers"],
    queryFn: async () => {
      const r = await fetch(`/api/community/trending-beers/${beerId}/drinkers`);
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });

  // local optimistic follow state: Map<userId, isFollowing>
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({});

  const followMut = useMutation({
    mutationFn: ({ id, isFollowing }: { id: string; isFollowing: boolean }) =>
      apiRequest(`/api/users/${id}/follow`, { method: isFollowing ? "DELETE" : "POST" }),
    onMutate: ({ id, isFollowing }) => {
      setLocalFollow(prev => ({ ...prev, [id]: !isFollowing }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
    },
    onError: (_err, { id, isFollowing }) => {
      setLocalFollow(prev => ({ ...prev, [id]: isFollowing })); // revert
      toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" });
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">
          Chi ha bevuto questa settimana
        </p>
        <Link href={`/beer/${beerId}`}
          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
          Vai alla birra <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2 py-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-3 flex-1 rounded" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : drinkers.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-3">
          {"Nessuno l'ha bevuta questa settimana"}
        </p>
      ) : (
        <div className="space-y-0.5">
          {drinkers.map((u: any) => {
            const isFollowing = u.id in localFollow ? localFollow[u.id] : u.is_following;
            return (
              <div key={u.id} className="flex items-center gap-2.5 py-2">
                <Link href={`/user/${u.username}`} className="flex-shrink-0">
                  <UserAvatar user={u} size={8} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/user/${u.username}`}>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate hover:text-primary transition-colors">
                      {u.display_name || u.username}
                    </p>
                  </Link>
                  {u.username && (
                    <p className="text-[10px] text-stone-400 truncate">@{u.username}</p>
                  )}
                </div>
                {isAuthenticated ? (
                  <button
                    onClick={() => followMut.mutate({ id: u.id, isFollowing })}
                    disabled={followMut.isPending}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 flex-shrink-0 ${
                      isFollowing
                        ? "bg-stone-100 dark:bg-[#12151A] text-stone-500 dark:text-stone-400"
                        : "bg-primary text-white shadow-sm shadow-primary/20"
                    }`}
                  >
                    {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                    {isFollowing ? "Segui già" : "Segui"}
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-stone-200 dark:border-white/[0.10] text-stone-400 dark:text-stone-500 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                  >
                    <UserPlus className="w-3 h-3" />
                    Accedi
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrendingBeersStrip() {
  const [selectedBeer, setSelectedBeer] = useState<{ id: number; name: string } | null>(null);

  const { data: beers = [] } = useQuery<any[]>({
    queryKey: ["/api/community/trending-beers"],
    staleTime: 5 * 60_000,
    refetchInterval: 3 * 60_000,
  });
  if (beers.length === 0) return null;
  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Flame className="w-3.5 h-3.5 text-amber-500" />
        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">In tendenza questa settimana</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {beers.map((beer: any) => {
          const isSelected = selectedBeer?.id === beer.id;
          return (
            <button
              key={beer.id}
              onClick={() => setSelectedBeer(isSelected ? null : { id: beer.id, name: beer.name })}
              className="flex-shrink-0 w-[72px] group text-left"
            >
              <div className={`w-[72px] h-[72px] mx-auto rounded-xl bg-[#FAF7F1] dark:bg-[#12151A] border overflow-hidden flex items-center justify-center mb-1.5 transition-colors ${
                isSelected
                  ? "border-primary/60 ring-2 ring-primary/20"
                  : "border-stone-100 dark:border-white/[0.04] group-hover:border-primary/30"
              }`}>
                {beer.image_url ? (
                  <img src={beer.image_url} alt={beer.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
                ) : (
                  <span className="text-2xl">🍺</span>
                )}
              </div>
              <p className={`text-[10px] font-bold text-center leading-tight line-clamp-2 transition-colors ${
                isSelected ? "text-primary" : "text-stone-700 dark:text-stone-300 group-hover:text-primary"
              }`}>{beer.name}</p>
              <p className="text-[9px] text-amber-500 font-semibold text-center mt-0.5">
                {beer.checkin_count} {beer.checkin_count === "1" ? "assaggio" : "assaggi"}
              </p>
            </button>
          );
        })}
      </div>
      {selectedBeer && (
        <TrendingBeerDrinkers
          key={selectedBeer.id}
          beerId={selectedBeer.id}
          beerName={selectedBeer.name}
          onClose={() => setSelectedBeer(null)}
        />
      )}
    </div>
  );
}

/* ── CommunityStats ── */
function CommunityStats() {
  const { data: stats } = useQuery<{ checkins_today: number; posts_today: number; active_week: number }>({
    queryKey: ["/api/community/stats"],
    staleTime: 5 * 60_000,
    refetchInterval: 3 * 60_000,
  });
  if (!stats || (stats.checkins_today === 0 && stats.posts_today === 0)) return null;
  return (
    <div className="flex items-center gap-3 px-1">
      {stats.checkins_today > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
          <span className="text-base leading-none">🍺</span>
          <span><span className="font-black text-stone-700 dark:text-stone-200">{stats.checkins_today}</span> {stats.checkins_today === 1 ? "check-in" : "check-in"} oggi</span>
        </div>
      )}
      {stats.posts_today > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
          <span className="text-base leading-none">📝</span>
          <span><span className="font-black text-stone-700 dark:text-stone-200">{stats.posts_today}</span> {stats.posts_today === 1 ? "post" : "post"} oggi</span>
        </div>
      )}
      {stats.active_week > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span><span className="font-black text-stone-700 dark:text-stone-200">{stats.active_week}</span> attivi</span>
        </div>
      )}
    </div>
  );
}

/* ── UserRow ── */
function UserRow({ user, followingIds, onToggle }: { user: any; followingIds: Set<string>; onToggle: (id: string, following: boolean) => void }) {
  const handle = user.username ?? user.nickname;
  const name = user.display_name ?? ([user.first_name, user.last_name].filter(Boolean).join(" ") || handle);
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
          isFollowing ? "bg-stone-100 dark:bg-[#12151A] text-stone-500 dark:text-stone-400" : "bg-primary text-white shadow-sm shadow-primary/20"
        }`}
      >
        {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
        {isFollowing ? "Segui già" : "Segui"}
      </button>
    </div>
  );
}

/* ── GuestPeopleSidebar ── */
function GuestPeopleSidebar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
        <Users className="w-3 h-3" /> Scopri persone
      </p>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca per nome o nickname…"
          className="pl-9 rounded-xl h-9 text-xs bg-stone-50 dark:bg-[#12151A] border-stone-200 dark:border-white/[0.06]"
        />
      </div>
      {debouncedQuery.length >= 2 ? (
        isLoading ? (
          <div className="py-2 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="py-3 text-xs text-stone-400 text-center">Nessun utente trovato</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
            {results.slice(0, 5).map((u: any) => {
              const handle = u.username ?? u.nickname;
              const name = u.display_name ?? ([u.first_name, u.last_name].filter(Boolean).join(" ") || handle);
              return (
                <div key={u.id} className="flex items-center gap-2.5 py-2.5">
                  <Link href={`/user/${handle}`} className="flex-shrink-0">
                    <UserAvatar user={{ ...u, display_name: name }} size={8} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/user/${handle}`}>
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate hover:text-primary transition-colors">{name}</p>
                      {handle && <p className="text-[10px] text-stone-400 truncate">@{handle}</p>}
                    </Link>
                  </div>
                  <Link
                    href="/auth"
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full border border-stone-200 dark:border-white/[0.10] text-stone-400 dark:text-stone-500 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                  >
                    <UserPlus className="w-3 h-3" />
                    Segui
                  </Link>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-2">
          Cerca un nome per trovare appassionati da seguire
        </p>
      )}
    </div>
  );
}

/* ── FeedSkeleton ── */
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

/* ── FilterChip ── */
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        active
          ? "bg-primary text-white shadow-sm shadow-primary/20"
          : "bg-stone-100 dark:bg-[#1A1D24] text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
export default function CommunityPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showPeople, setShowPeople] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  const { data: feed = [], isLoading: feedLoading } = useQuery<any[]>({
    queryKey: ["/api/user/feed"],
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });
  const { data: microblogFeed = [], isLoading: microblogLoading } = useQuery<any[]>({
    queryKey: ["/api/microblog/feed"],
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
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

  const isLoading = feedLoading || microblogLoading;

  const rawTimeline = useMemo(() => [
    ...feed.map((it: any) => ({ kind: "checkin" as const, sortAt: new Date(it.tasted_at).getTime(), data: it })),
    ...(microblogFeed as any[]).map((p: any) => ({ kind: "post" as const, sortAt: new Date(p.created_at).getTime(), data: p })),
  ].sort((a, b) => b.sortAt - a.sortAt), [feed, microblogFeed]);

  const timeline = useMemo(() => {
    if (filter === "post") return rawTimeline.filter(e => e.kind === "post");
    if (filter === "checkin") return rawTimeline.filter(e => e.kind === "checkin");
    return rawTimeline;
  }, [rawTimeline, filter]);

  const followingIds = useMemo(() => new Set<string>((following as any[]).map((u: any) => u.id)), [following]);

  const followMutation = useMutation({
    mutationFn: ({ id, following }: { id: string; following: boolean }) =>
      apiRequest(`/api/users/${id}/follow`, { method: following ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
    },
    onError: () => toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" }),
  });

  /* Unauthenticated gate */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] pb-28">
        <Helmet><title>Community | Fermenta.to</title></Helmet>
        <div className="bg-white/90 dark:bg-[#0B0D10]/90 backdrop-blur-xl border-b border-stone-100/80 dark:border-white/[0.05] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-3">
            <h1 className="text-xl font-black text-stone-900 dark:text-stone-50 font-poppins">Community</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4">
          <div className="lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">

            {/* ── Left column ── */}
            <div className="space-y-4">
              {/* Trending beers — visible without auth */}
              <TrendingBeersStrip />

              {/* Trending hashtags — visible on all screen sizes in left column */}
              <TrendingHashtags limit={10} compact />

              {/* Auth CTA */}
              <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8">
                <div className="text-center space-y-4 max-w-xs mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-[hsl(36,10%,96%)] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center mx-auto">
                    <Users className="w-7 h-7 text-stone-300" />
                  </div>
                  <div>
                    <p className="font-black text-stone-800 dark:text-stone-100 font-poppins">
                      Unisciti alla community
                    </p>
                    <p className="text-sm text-stone-500 mt-1">
                      Accedi per vedere i post e i check-in dei tuoi amici
                    </p>
                  </div>
                  <Link href="/auth">
                    <Button className="w-full bg-primary text-white rounded-xl font-bold">Accedi o registrati</Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Desktop sidebar ── */}
            <aside className="hidden lg:flex flex-col gap-4 sticky top-[72px] self-start max-h-[calc(100vh-88px)] overflow-y-auto [scrollbar-width:thin]">

              {/* People discovery — search with sign-in prompts */}
              <GuestPeopleSidebar />

              {/* Unisciti CTA card */}
              <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-black text-stone-800 dark:text-stone-100 text-sm font-poppins leading-tight">
                    Unisciti alla community
                  </p>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                  Registrati per condividere i tuoi assaggi, seguire altri appassionati e partecipare alle discussioni.
                </p>
                <Link href="/auth">
                  <Button className="w-full bg-primary text-white rounded-xl font-bold text-sm h-9">
                    Accedi o registrati
                  </Button>
                </Link>
              </div>

            </aside>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,10%,96%)] dark:bg-[#0B0D10] pb-28">
      <Helmet><title>Community | Fermenta.to</title></Helmet>

      {/* Sticky header */}
      <div className="bg-white/90 dark:bg-[#0B0D10]/90 backdrop-blur-xl border-b border-stone-100/80 dark:border-white/[0.05] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 pb-3">
          <h1 className="text-xl font-black text-stone-900 dark:text-stone-50 font-poppins mb-3">
            Community
          </h1>
          {/* Filter chips */}
          <div className="flex items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Tutti</FilterChip>
            <FilterChip active={filter === "post"} onClick={() => setFilter("post")}>📝 Post</FilterChip>
            <FilterChip active={filter === "checkin"} onClick={() => setFilter("checkin")}>🍺 Check-in</FilterChip>
          </div>
          <div className="mt-2">
            <CommunityStats />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4">
        <div className="lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">

          {/* ── Main feed column ── */}
          <div className="space-y-3">
            {/* Composer */}
            <InlinePostComposer user={user as any} />

            {/* Feed — mobile shows trending interstitial after 3rd item */}
            {isLoading ? (
              <FeedSkeleton />
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center shadow-sm">
                  <Users className="w-9 h-9 text-stone-300" />
                </div>
                <div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 font-poppins">
                    {following.length === 0 ? "Non stai seguendo nessuno" : "Nessuna attività recente"}
                  </p>
                  <p className="text-sm text-stone-400 mt-1 max-w-xs mx-auto">
                    {following.length === 0
                      ? "Cerca appassionati nella sezione Scopri persone per iniziare"
                      : filter === "all"
                        ? "I tuoi amici non hanno fatto check-in né scritto post di recente"
                        : filter === "post"
                          ? "Nessun post recente dai tuoi amici"
                          : "Nessun check-in recente dai tuoi amici"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Link href="/microblog/nuovo">
                    <Button className="rounded-xl bg-primary text-white font-bold">
                      <PenSquare className="w-4 h-4 mr-2" /> Scrivi un post
                    </Button>
                  </Link>
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => setShowPeople(true)}>
                    <Users className="w-4 h-4 mr-2" /> Scopri persone
                  </Button>
                </div>
                {/* On mobile show trending even on empty feed */}
                <div className="lg:hidden w-full space-y-3 mt-2">
                  <TrendingBeersStrip />
                  <TrendingHashtags limit={8} compact />
                </div>
              </div>
            ) : (
              <>
                {timeline.slice(0, 3).map(entry =>
                  entry.kind === "post" ? (
                    <MicroblogCard key={`p-${entry.data.id}`} post={entry.data} />
                  ) : (
                    <CheckinCard key={`c-${entry.data.id}`} data={entry.data} />
                  )
                )}
                {/* Mobile interstitial trending section (hidden on desktop — sidebar shows these) */}
                <div className="lg:hidden space-y-3">
                  <TrendingBeersStrip />
                  <TrendingHashtags limit={8} compact />
                </div>
                {timeline.slice(3).map(entry =>
                  entry.kind === "post" ? (
                    <MicroblogCard key={`p-${entry.data.id}`} post={entry.data} />
                  ) : (
                    <CheckinCard key={`c-${entry.data.id}`} data={entry.data} />
                  )
                )}
              </>
            )}

            {/* Scopri persone — mobile only (desktop has it permanently in sidebar) */}
            <div className="lg:hidden bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                onClick={() => setShowPeople(p => !p)}
              >
                <span className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Scopri persone
                </span>
                <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${showPeople ? "rotate-90" : ""}`} />
              </button>
              {showPeople && (
                <div className="px-4 pb-4 space-y-3 border-t border-stone-100 dark:border-white/[0.04]">
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Cerca per nome o nickname…"
                      className="pl-9 rounded-xl h-10 bg-stone-50 dark:bg-[#12151A] border-stone-200 dark:border-white/[0.06]"
                    />
                  </div>
                  {debouncedSearch.length >= 2 && (
                    <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                      {searchLoading ? (
                        <div className="py-3 space-y-2">
                          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <p className="py-4 text-sm text-stone-400 text-center">Nessun utente trovato</p>
                      ) : (
                        searchResults.map((u: any) => (
                          <UserRow key={u.id} user={u} followingIds={followingIds}
                            onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })} />
                        ))
                      )}
                    </div>
                  )}
                  {debouncedSearch.length < 2 && following.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">
                        Chi segui · {following.length}
                      </p>
                      <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                        {(following as any[]).slice(0, 5).map((u: any) => (
                          <UserRow key={u.id} user={u} followingIds={followingIds}
                            onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })} />
                        ))}
                      </div>
                    </div>
                  )}
                  {debouncedSearch.length < 2 && following.length === 0 && (
                    <p className="text-sm text-stone-400 text-center py-3">
                      Cerca un nome per trovare appassionati da seguire
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[72px] self-start max-h-[calc(100vh-88px)] overflow-y-auto [scrollbar-width:thin]">

            {/* 1. Trending beers */}
            <TrendingBeersStrip />

            {/* 2. Trending hashtags */}
            <TrendingHashtags limit={10} />

            {/* 3. Scopri persone — always open on desktop */}
            <div className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Scopri persone
              </p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Cerca per nome o nickname…"
                  className="pl-9 rounded-xl h-9 text-xs bg-stone-50 dark:bg-[#12151A] border-stone-200 dark:border-white/[0.06]"
                />
              </div>
              {debouncedSearch.length >= 2 ? (
                <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                  {searchLoading ? (
                    <div className="py-2 space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="py-3 text-xs text-stone-400 text-center">Nessun utente trovato</p>
                  ) : (
                    searchResults.slice(0, 5).map((u: any) => (
                      <UserRow key={u.id} user={u} followingIds={followingIds}
                        onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })} />
                    ))
                  )}
                </div>
              ) : following.length > 0 ? (
                <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 pb-2">
                    Chi segui · {following.length}
                  </p>
                  {(following as any[]).slice(0, 5).map((u: any) => (
                    <UserRow key={u.id} user={u} followingIds={followingIds}
                      onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })} />
                  ))}
                  {following.length > 5 && (
                    <p className="text-xs text-stone-400 text-center pt-2">+{following.length - 5} altri</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-2">
                  Cerca un nome per trovare appassionati da seguire
                </p>
              )}
            </div>

            {/* 4. News */}
            {news.length > 0 && (
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
                    <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 group">
                      {n.image_url && (
                        <img src={n.image_url} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 group-hover:opacity-90 transition" />
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

        </div>
      </div>
    </div>
  );
}
