import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Users, Package, MapPin, Search, UserPlus, UserMinus, BarChart3, Award, TrendingUp, Star, Heart, MessageCircle, PenSquare, Newspaper } from "lucide-react";
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

function RatingStars({ rating }: { rating: number }) {
  const r = parseFloat(rating.toString());
  return (
    <span className="text-primary font-bold text-xs">
      {"★".repeat(Math.round(r))}{"☆".repeat(5 - Math.round(r))} {r.toFixed(1)}
    </span>
  );
}

function UserAvatar({ user, size = 9 }: { user: any; size?: number }) {
  const name = user.display_name ?? user.nickname ?? "?";
  const sz = `w-${size} h-${size}`;
  return user.profile_image_url ? (
    <img src={user.profile_image_url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="text-primary text-sm font-bold">{(name?.[0] ?? "?").toUpperCase()}</span>
    </div>
  );
}

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
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-sm truncate">{name}</p>
          {handle && <p className="text-xs text-stone-400 truncate">@{handle}</p>}
        </Link>
      </div>
      <button
        onClick={() => onToggle(user.id, isFollowing)}
        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
          isFollowing
            ? "bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300"
            : "bg-primary text-white"
        }`}
      >
        {isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
        {isFollowing ? "Segui già" : "Segui"}
      </button>
    </div>
  );
}

// ─── Stats constants ────────────────────────────────────────────────────────
const FORMAT_LABELS: Record<string, string> = {
  spina: "Alla spina", bottiglia: "Bottiglia", lattina: "Lattina", growler: "Growler",
};
const BADGE_DEFS = [
  { key: "primo_sorso", icon: "🍺", name: "Primo Sorso", description: "Primo assaggio" },
  { key: "esploratore", icon: "🧭", name: "Esploratore", description: "10 assaggi" },
  { key: "degustatore", icon: "🎓", name: "Degustatore", description: "25 assaggi" },
  { key: "sommelier", icon: "🏆", name: "Sommelier", description: "50 assaggi" },
  { key: "guru", icon: "⭐", name: "Guru della Birra", description: "100 assaggi" },
  { key: "critico", icon: "✍️", name: "Critico", description: "10 note scritte" },
  { key: "fotografo", icon: "📸", name: "Fotografo", description: "Prima foto" },
  { key: "cacciatore_stili", icon: "🎯", name: "Cacciatore di Stili", description: "5 stili diversi" },
  { key: "globe_trotter", icon: "🌍", name: "Globe Trotter", description: "10 stili diversi" },
  { key: "perfezionista", icon: "💎", name: "Perfezionista", description: "Voto 5.0 dato" },
  { key: "sociale", icon: "👥", name: "Sociale", description: "5 amici seguiti" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 text-center">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 font-poppins">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-primary mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Microblog post card ────────────────────────────────────────────────────
function MicroblogPostCard({ post }: { post: any }) {
  const queryClient = useQueryClient();
  const likeMut = useMutation({
    mutationFn: () => apiRequest(`/api/microblog/posts/${post.id}/like`, { method: post.liked ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/microblog/discover"] });
    },
  });
  return (
    <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserAvatar user={post} size={8} />
        <div className="flex-1 min-w-0">
          <Link href={`/user/${post.username}`}>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{post.display_name ?? post.username}</p>
          </Link>
          <p className="text-[10px] text-stone-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })} · 📝 microblog
          </p>
        </div>
      </div>
      <p className="text-sm text-stone-800 dark:text-stone-100 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-3 rounded-xl w-full max-h-96 object-cover" />
      )}
      {(post.beer_name || post.pub_name || post.brewery_name) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.beer_name && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">🍺 {post.beer_name}</span>}
          {post.pub_name && <span className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">📍 {post.pub_name}</span>}
          {post.brewery_name && <span className="text-[10px] bg-stone-100 dark:bg-[#1A1D24] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-full">🏭 {post.brewery_name}</span>}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-[#23262E]/40 flex items-center gap-4">
        <button onClick={() => likeMut.mutate()}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${post.liked ? "text-red-500" : "text-stone-500 hover:text-red-500"}`}>
          <Heart className="w-4 h-4" fill={post.liked ? "currentColor" : "none"} />
          {post.likes_count ?? 0}
        </button>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
          <MessageCircle className="w-4 h-4" />
          {post.comments_count ?? 0}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
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
      const r = await fetch("/api/news?limit=5");
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
  });

  // Merged timeline: check-ins + microblog posts, sorted by date
  const timeline = [
    ...feed.map((it: any) => ({ kind: "checkin" as const, sortAt: new Date(it.tasted_at).getTime(), data: it })),
    ...microblogFeed.map((p: any) => ({ kind: "post" as const, sortAt: new Date(p.created_at).getTime(), data: p })),
  ].sort((a, b) => b.sortAt - a.sortAt);

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

  // Stats queries
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });
  const { data: badges = [], isLoading: badgesLoading } = useQuery<any[]>({
    queryKey: ["/api/user/badges"],
    enabled: isAuthenticated,
  });

  // Set of IDs I'm following
  const followingIds = new Set<string>((following as any[]).map((u: any) => u.id));

  const followMutation = useMutation({
    mutationFn: ({ id, following }: { id: string; following: boolean }) =>
      apiRequest(`/api/users/${id}/follow`, { method: following ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
    },
    onError: () => toast({ title: "Errore", description: "Riprova tra poco", variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Users className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per vedere il feed degli amici</p>
          <Link href="/auth"><Button className="bg-primary text-white">Accedi</Button></Link>
        </div>
      </div>
    );
  }

  const earnedBadges = badges.filter((b: any) => b.earned);
  const totalFormat = (stats?.formatBreakdown ?? []).reduce((s: number, f: any) => s + parseInt(f.cnt), 0);

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet><title>Sociale | Fermenta.to</title></Helmet>

      <Tabs defaultValue="feed" className="w-full">
      <div className="bg-white dark:bg-[#1A1D24] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 pt-5 pb-0 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins mb-3">Sociale</h1>
          <TabsList className="w-full bg-transparent p-0 h-auto border-b border-stone-100 dark:border-[#23262E]/50 rounded-none justify-start gap-0">
            {[
              { value: "feed", label: "Feed" },
              { value: "amici", label: `Amici${following.length > 0 ? ` (${following.length})` : ""}` },
              { value: "stats", label: "Le mie stats" },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-stone-500 px-4 py-2.5 text-sm font-semibold"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

          {/* ── FEED TAB ─────────────────────────────────────────────── */}
          <TabsContent value="feed" className="mt-0">
            {feedLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-16 px-6 text-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1A1D24] flex items-center justify-center shadow-sm">
                  <Users className="w-9 h-9 text-stone-300" />
                </div>
                <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">
                  {following.length === 0 ? "Non stai seguendo nessuno" : "Nessuna attività recente"}
                </p>
                <p className="text-sm text-stone-400">
                  {following.length === 0
                    ? "Cerca appassionati nella scheda Amici"
                    : "I tuoi amici non hanno fatto check-in né scritto post di recente"}
                </p>
                <Link href="/microblog/nuovo">
                  <Button className="rounded-full mt-2"><PenSquare className="w-4 h-4 mr-2" />Scrivi un post</Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Compose CTA + News strip */}
                <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-3">
                  <UserAvatar user={user as any} size={9} />
                  <Link href="/microblog/nuovo" className="flex-1">
                    <button className="w-full text-left text-sm text-stone-400 bg-stone-50 dark:bg-[#1A1D24] rounded-full px-4 py-2.5 hover:bg-stone-100 dark:hover:bg-[#12151A] transition">
                      Cosa stai bevendo, {(user as any)?.firstName ?? "appassionato"}?
                    </button>
                  </Link>
                  <Link href="/microblog/nuovo">
                    <button className="bg-primary text-white rounded-full p-2 hover:bg-primary/90"><PenSquare className="w-4 h-4" /></button>
                  </Link>
                </div>

                {news.length > 0 && (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                        <Newspaper className="w-3 h-3" /> News birra
                      </p>
                      <Link href="/news"><span className="text-[11px] text-primary font-bold">Vedi tutte</span></Link>
                    </div>
                    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                      {news.slice(0, 5).map((n: any) => (
                        <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 w-44 bg-stone-50 dark:bg-[#1A1D24] rounded-xl overflow-hidden hover:shadow-md transition">
                          {n.image_url && <img src={n.image_url} alt="" loading="lazy" className="w-full h-20 object-cover" />}
                          <div className="p-2">
                            <p className="text-[9px] font-bold uppercase text-primary truncate">{n.source_name}</p>
                            <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug mt-0.5">{n.title}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {timeline.map((entry) => entry.kind === "post" ? (
                  <MicroblogPostCard key={`p-${entry.data.id}`} post={entry.data} />
                ) : (
                  <div key={`c-${entry.data.id}`} className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserAvatar user={{ profile_image_url: entry.data.profile_image_url, display_name: entry.data.display_name ?? entry.data.username, nickname: entry.data.username }} size={8} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/user/${entry.data.username}`}>
                          <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{entry.data.display_name ?? entry.data.username}</span>
                        </Link>
                        <p className="text-xs text-stone-400">
                          {entry.data.tasted_at ? `${formatDistanceToNow(new Date(entry.data.tasted_at), { addSuffix: true, locale: it })} · ` : ""}🍺 check-in
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      {entry.data.beer_image ? (
                        <img src={entry.data.beer_image} alt={entry.data.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[#12151A] flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#12151A] flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-stone-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/beer/${entry.data.beer_id}`}>
                          <p className="font-semibold text-stone-900 dark:text-stone-50 text-sm">{entry.data.beer_name}</p>
                        </Link>
                        <p className="text-xs text-stone-400 mt-0.5">{entry.data.brewery_name}</p>
                        {entry.data.pub_id && entry.data.pub_name && (
                          <Link href={`/pub/${entry.data.pub_id}`}>
                            <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.data.pub_name}{entry.data.pub_city ? `, ${entry.data.pub_city}` : ""}
                            </p>
                          </Link>
                        )}
                        {entry.data.rating && <div className="mt-1"><RatingStars rating={entry.data.rating} /></div>}
                        {entry.data.notes && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 italic">"{entry.data.notes}"</p>}
                        {entry.data.photo_url && (
                          <img src={entry.data.photo_url} alt="Foto assaggio" className="mt-2 rounded-xl w-full max-h-72 object-cover" />
                        )}
                      </div>
                    </div>
                    <CheckinSocialBar tastingId={entry.data.id} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── AMICI TAB ────────────────────────────────────────────── */}
          <TabsContent value="amici" className="mt-0">
            <div className="p-4 space-y-5">
              {/* User search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Cerca per nome o nickname…"
                    className="pl-9 rounded-xl"
                  />
                </div>

                {debouncedSearch.length >= 2 && (
                  <div className="mt-3 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 px-4 divide-y divide-stone-100 dark:divide-stone-700/30">
                    {searchLoading ? (
                      <div className="py-4 space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="py-4 text-sm text-stone-400 text-center">Nessun utente trovato</p>
                    ) : (
                      searchResults.map((u: any) => (
                        <UserRow
                          key={u.id}
                          user={u}
                          followingIds={followingIds}
                          onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Who you follow */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2 px-1">
                  Chi segui {following.length > 0 ? `· ${following.length}` : ""}
                </p>
                {followingLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  </div>
                ) : following.length === 0 ? (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    <p className="text-sm text-stone-400">Cerca in alto per trovare persone da seguire</p>
                  </div>
                ) : (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 px-4 divide-y divide-stone-100 dark:divide-stone-700/30">
                    {(following as any[]).map((u: any) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        followingIds={followingIds}
                        onToggle={(id, isFollowing) => followMutation.mutate({ id, following: isFollowing })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── STATS TAB ────────────────────────────────────────────── */}
          <TabsContent value="stats" className="mt-0">
            {statsLoading || badgesLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : !stats || stats.total === 0 ? (
              <div className="flex flex-col items-center justify-center pt-16 px-6 text-center gap-4">
                <BarChart3 className="w-12 h-12 text-stone-300" />
                <p className="font-semibold text-stone-600 dark:text-stone-300">Nessuna statistica ancora</p>
                <p className="text-sm text-stone-400">Fai il primo check-in per iniziare</p>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {/* Key stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Assaggi" value={stats.total} />
                  <StatCard label="Voto medio" value={stats.avgRating ? `${stats.avgRating} ★` : "—"} />
                  <StatCard label="Streak" value={stats.currentStreak > 0 ? `${stats.currentStreak}🔥` : "—"} sub={stats.currentStreak > 0 ? "giorni" : undefined} />
                </div>

                {/* Top styles */}
                {stats.topStyles?.length > 0 && (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Stili preferiti
                    </p>
                    <div className="space-y-2">
                      {stats.topStyles.slice(0, 5).map((s: any, i: number) => {
                        const max = stats.topStyles[0].cnt;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-stone-700 dark:text-stone-200 font-medium truncate">{s.style}</span>
                              <span className="text-stone-400 ml-2 flex-shrink-0">{s.cnt}</span>
                            </div>
                            <div className="h-1.5 bg-stone-100 dark:bg-[#12151A] rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(s.cnt / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Format breakdown */}
                {stats.formatBreakdown?.length > 0 && (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Come bevi</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.formatBreakdown.map((f: any) => (
                        <div key={f.format} className="bg-stone-50 dark:bg-[#1A1D24] rounded-xl px-3 py-2 text-center">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{f.cnt}</p>
                          <p className="text-[10px] text-stone-400">{FORMAT_LABELS[f.format] ?? f.format}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top breweries */}
                {stats.topBreweries?.length > 0 && (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Birrifici preferiti
                    </p>
                    <div className="space-y-2">
                      {stats.topBreweries.slice(0, 5).map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          {b.logo_url && <img src={b.logo_url} alt={b.name} className="w-7 h-7 rounded-lg object-contain bg-stone-50 dark:bg-[#1A1D24] flex-shrink-0" />}
                          <span className="text-sm text-stone-700 dark:text-stone-200 truncate flex-1">{b.name}</span>
                          <span className="text-xs text-stone-400 flex-shrink-0">{b.cnt} 🍺</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges */}
                {BADGE_DEFS.length > 0 && (
                  <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Badge · {earnedBadges.length}/{BADGE_DEFS.length}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {BADGE_DEFS.map(def => {
                        const earned = badges.find((b: any) => b.key === def.key)?.earned;
                        return (
                          <div key={def.key} className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center ${earned ? "bg-primary/10" : "bg-stone-50 dark:bg-[#1A1D24] opacity-40"}`}>
                            <span className="text-2xl">{def.icon}</span>
                            <p className="text-[9px] font-bold text-stone-600 dark:text-stone-300 leading-tight">{def.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
}
