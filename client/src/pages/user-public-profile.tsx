import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { RichTextDisplay, richTextToPlain } from "@/components/rich-text-editor";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  ArrowLeft,
  Calendar,
  Beer,
  Lock,
  Share2,
  Home as HomeIcon,
  Award,
  Wine,
  Activity as ActivityIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import Footer from "@/components/footer";
import { useAnyModalOpen, DockPortal } from "@/components/bottom-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { useToast } from "@/hooks/use-toast";
import {
  getBadgeForCount,
  getNextBadge,
  getProgressToNextBadge,
  BADGE_LEVELS,
  computeAchievements,
  ACHIEVEMENT_CATEGORY_LABEL,
  ACHIEVEMENT_CATEGORY_EMOJI,
  type AchievementCategory,
  type AchievementData,
} from "@/lib/badges";
import ImageWithFallback from "@/components/image-with-fallback";
import { FollowButton } from "@/components/FollowButton";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const full = rating >= s;
        const half = !full && rating >= s - 0.5;
        return (
          <span key={s} className="relative inline-block w-3.5 h-3.5">
            <Star className="h-3.5 w-3.5 text-stone-300 dark:text-stone-400 absolute inset-0" />
            {(full || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: full ? "100%" : "50%" }}
              >
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function BadgeCard({ badge, reviewCount, isCurrentLevel }: { badge: any; reviewCount: number; isCurrentLevel: boolean }) {
  const unlocked = reviewCount >= badge.minReviews;
  return (
    <div className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
      isCurrentLevel
        ? `border-current bg-gradient-to-br ${badge.bgFrom} ${badge.bgTo} text-white shadow-lg scale-105`
        : unlocked
        ? `${badge.borderColor} bg-white dark:bg-[#1A1D24]`
        : "border-gray-200 dark:border-[#23262E] bg-stone-50 dark:bg-[#0B0D10] opacity-40"
    }`}>
      {isCurrentLevel && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow">
          Attuale
        </div>
      )}
      <span className="text-3xl">{badge.emoji}</span>
      <span className={`text-xs font-bold text-center leading-tight ${isCurrentLevel ? "text-white" : "text-muted-foreground dark:text-stone-300"}`}>
        {badge.name}
      </span>
      <span className={`text-xs ${isCurrentLevel ? "text-white/80" : "text-stone-400 dark:text-stone-400"}`}>
        {badge.minReviews}+ rec.
      </span>
    </div>
  );
}

const CATEGORY_COLORS: Record<AchievementCategory, string> = {
  quantity: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  style: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  country: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
  special: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800",
};

const GLASS_CARD =
  "bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:bg-white/[0.04] dark:border-white/[0.06] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-2xl";

export default function UserPublicProfile() {
  const { nickname } = useParams<{ nickname: string }>();
  const { toast } = useToast();

  // SSR-safe: start from "recensioni" (valid desktop tab); switch to overview on mobile in effect.
  const [activeTab, setActiveTab] = useState("recensioni");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setActiveTab((prev) => (!mq.matches && prev === "recensioni" ? "overview" : prev));
    const handler = (e: MediaQueryListEvent) => {
      setActiveTab((prev) => {
        if (e.matches && prev === "overview") return "recensioni";
        return prev;
      });
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  const isModalOpen = useAnyModalOpen();

  const { data: profile, isLoading, error } = useQuery<any>({
    queryKey: ["/api/users", nickname, "profile"],
    queryFn: () => fetch(`/api/users/${encodeURIComponent(nickname || "")}/profile`).then(r => {
      if (!r.ok) throw new Error(r.status === 403 ? "private" : r.status === 404 ? "not_found" : "error");
      return r.json();
    }),
    enabled: !!nickname,
    retry: false,
  });

  const handleShare = async () => {
    const displayName = profile?.nickname || profile?.firstName || "Utente";
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `${displayName} - Fermenta.to`,
      text: `Scopri il profilo di ${displayName} su Fermenta.to`,
      url: currentUrl,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        toast({ title: "Link copiato! 📋", description: "Il link del profilo è stato copiato negli appunti" });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const errorMsg = (error as any)?.message;
  if (errorMsg === "private" || errorMsg === "not_found" || (!isLoading && !profile)) {
    const isPrivate = errorMsg === "private";
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-0 shadow-2xl">
          <CardContent className="py-12 text-center space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isPrivate ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-orange-600'}`}>
              {isPrivate ? <Lock className="h-10 w-10 text-white" /> : <span className="text-4xl">🍺</span>}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
                {isPrivate ? 'Profilo privato' : 'Utente non trovato'}
              </h2>
              <p className="text-muted-foreground dark:text-stone-400">
                {isPrivate
                  ? 'Questo utente ha scelto di mantenere il suo profilo privato.'
                  : 'Il profilo che stai cercando non esiste o è stato rimosso.'}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">Torna alla home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const badge = getBadgeForCount(profile.reviewCount);
  const nextBadge = getNextBadge(profile.reviewCount);
  const progress = getProgressToNextBadge(profile.reviewCount);
  const displayName = profile.nickname || profile.firstName || "Utente";
  const initials = displayName[0]?.toUpperCase() || "U";

  // Compute achievements
  const achievementData: AchievementData = {
    reviewCount: profile.reviewCount || 0,
    tastingCount: profile.tastingCount || 0,
    styleCounts: profile.styleCounts || {},
    countryCounts: profile.countryCounts || {},
    countryCount: profile.countryCount || 0,
    styleCount: profile.styleCount || 0,
  };
  const earnedAchievements = computeAchievements(achievementData);
  const achievementsByCategory = earnedAchievements.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<AchievementCategory, typeof earnedAchievements>);
  const categoryOrder: AchievementCategory[] = ['quantity', 'style', 'country', 'special'];

  const recentReviews: any[] = Array.isArray(profile.recentReviews) ? profile.recentReviews : [];

  // ── Reusable sections ─────────────────────────────────────────────────
  const HeroSection = (
    <Card className="border-0 shadow-2xl overflow-hidden">
      <div className="relative bg-gradient-to-br from-neutral-800 to-neutral-900 p-8 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${badge.bgFrom} ${badge.bgTo} opacity-[0.18]`} />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative flex-shrink-0">
            <Avatar className="h-28 w-28 ring-4 ring-white/40 shadow-xl">
              {profile.profileImageUrl && <AvatarImage src={profile.profileImageUrl} />}
              <AvatarFallback className="text-3xl font-bold bg-white/20 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg text-xl">
              {badge.emoji}
            </div>
          </div>
          <div className="text-center sm:text-left text-white">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              {profile.id && <FollowButton userId={profile.id} />}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="text-white/90 font-semibold text-lg">{badge.name}</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Livello {badge.level}</span>
            </div>
            {profile.bio && (
              <div className="text-white/80 text-sm max-w-md">
                <RichTextDisplay html={profile.bio} />
              </div>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-white/70 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {profile.joinedAt ? `Iscritto ${format(new Date(profile.joinedAt), "MMMM yyyy", { locale: it })}` : "Iscritto da un po'"}
              </span>
              <span className="flex items-center gap-1">
                <Beer className="h-3.5 w-3.5" />
                {profile.reviewCount} recensioni
              </span>
              {earnedAchievements.length > 0 && (
                <span className="flex items-center gap-1">
                  🏅 {earnedAchievements.length} achievement
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {nextBadge && (
        <div className="px-6 py-4 bg-white dark:bg-[#0B0D10] border-t border-gray-100 dark:border-[#23262E]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground dark:text-stone-300">
              Progresso verso <strong>{nextBadge.name}</strong> {nextBadge.emoji}
            </span>
            <span className="text-sm text-muted-foreground">
              {profile.reviewCount} / {nextBadge.minReviews}
            </span>
          </div>
          <div className="h-2.5 bg-stone-200 dark:bg-[#12151A] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${badge.bgFrom} ${badge.bgTo} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {!nextBadge && (
        <div className="px-6 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-t border-yellow-200 dark:border-yellow-800 text-center">
          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
            🌟 Leggenda assoluta! Hai raggiunto il livello massimo.
          </span>
        </div>
      )}
    </Card>
  );

  const FavoriteStylesSection = profile.favoriteStyles && profile.favoriteStyles.length > 0 ? (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h2 className="font-bold text-foreground dark:text-white mb-3 flex items-center gap-2">
          🍺 Stili preferiti
        </h2>
        <div className="flex flex-wrap gap-2">
          {profile.favoriteStyles.map((style: string) => (
            <Link key={style} href={`/search?q=${encodeURIComponent(style)}`}>
              <Badge
                variant="secondary"
                className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer transition-colors border border-amber-200 dark:border-amber-700 px-3 py-1"
              >
                {style}
              </Badge>
            </Link>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-3">Clicca uno stile per cercarlo nel catalogo</p>
      </CardContent>
    </Card>
  ) : null;

  const AchievementsSection = earnedAchievements.length > 0 ? (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground dark:text-white flex items-center gap-2">
            🏅 Achievement ({earnedAchievements.length})
          </h2>
          <span className="text-xs text-muted-foreground dark:text-stone-400">
            Badge guadagnati per traguardi speciali
          </span>
        </div>
        <div className="space-y-5">
          {categoryOrder.map(cat => {
            const catAchievements = achievementsByCategory[cat];
            if (!catAchievements || catAchievements.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-muted-foreground dark:text-stone-400 mb-2 flex items-center gap-2">
                  <span>{ACHIEVEMENT_CATEGORY_EMOJI[cat]}</span>
                  {ACHIEVEMENT_CATEGORY_LABEL[cat]}
                  <span className="text-xs text-stone-400">({catAchievements.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {catAchievements.map(a => (
                    <div
                      key={a.id}
                      title={a.description}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:scale-105 cursor-default ${CATEGORY_COLORS[a.category]}`}
                    >
                      <span className="text-sm">{a.emoji}</span>
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  ) : null;

  const BadgeProgressionSection = (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h2 className="font-bold text-foreground dark:text-white mb-1">Percorso Livelli</h2>
        <p className="text-sm text-muted-foreground dark:text-stone-400 mb-4">
          {badge.description}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BADGE_LEVELS.map((b) => (
            <BadgeCard
              key={b.level}
              badge={b}
              reviewCount={profile.reviewCount}
              isCurrentLevel={b.level === badge.level}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const RecentReviewsSection = recentReviews.length > 0 ? (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h2 className="font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Ultime recensioni ({profile.reviewCount})
        </h2>
        <div className="space-y-3">
          {recentReviews.map((review: any) => (
            <Link key={review.id} href={`/beer/${review.beerId}`}>
              <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-[#1A1D24] transition-colors cursor-pointer">
                <ImageWithFallback
                  src={review.beerImageUrl}
                  alt={review.beerName}
                  imageType="beer"
                  containerClassName="w-12 h-12 rounded-lg flex-shrink-0"
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-foreground dark:text-white truncate">{review.beerName}</span>
                    <StarDisplay rating={review.rating} />
                  </div>
                  {review.beerStyle && <span className="text-xs text-muted-foreground">{review.beerStyle}</span>}
                  {review.personalNotes && (
                    <p className="text-xs text-muted-foreground dark:text-stone-400 italic mt-1 line-clamp-2">"{richTextToPlain(review.personalNotes)}"</p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">
                    {format(new Date(review.tastedAt), "d MMM yyyy", { locale: it })}
                    {review.format && <span className="ml-1">· {review.format}</span>}
                    {review.pubName && <span className="ml-1">· {review.pubName}</span>}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  ) : null;

  const tabLabel = (id: string) => {
    switch (id) {
      case 'recensioni': return 'Recensioni';
      case 'cellar': return 'Cellar';
      case 'attivita': return 'Attività';
      default: return '';
    }
  };

  const seoTitle = `${displayName} — Profilo | Fermenta.to`;
  const seoDesc = `Scopri il profilo di ${displayName} su Fermenta.to: ${profile.reviewCount || 0} recensioni di birre artigianali italiane.`;
  const seoUrl = `https://fermenta.to/u/${encodeURIComponent(nickname || "")}`;

  return (
    <>
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:url" content={seoUrl} />
      {profile.profileImageUrl && <meta property="og:image" content={profile.profileImageUrl} />}
      <meta name="robots" content="noindex" />
      <link rel="canonical" href={seoUrl} />
    </Helmet>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Back button — desktop only (mobile uses sticky topbar) */}
      <div className="hidden lg:block max-w-4xl mx-auto px-4 pt-6">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla home
          </Link>
        </Button>
      </div>

      <PageContainer
        variant="standard"
        className={`pt-4 ${activeTab !== 'overview' ? 'lg:!pt-8 lg:!pb-8' : ''}`}
        style={{
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
          paddingTop: activeTab !== 'overview' ? '56px' : undefined,
        }}
      >
        {/* ── MOBILE HERO (only on overview) ── */}
        <div className={`lg:hidden ${activeTab !== 'overview' ? 'hidden' : ''} space-y-4 pb-4`}>
          {HeroSection}
        </div>

        {/* ── DESKTOP FULL LAYOUT (unchanged) ── */}
        <div className="hidden lg:block space-y-6 pb-12">
          {HeroSection}
          {FavoriteStylesSection}
          {AchievementsSection}
          {BadgeProgressionSection}
          {RecentReviewsSection}
        </div>

        {/* ── MOBILE TABS ── */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Overview: glass preview cards */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* Stats summary */}
              <div className={`${GLASS_CARD} p-5`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-extrabold text-foreground">{profile.reviewCount || 0}</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Recensioni</div>
                  </div>
                  <div className="border-x border-stone-200/60 dark:border-white/[0.06]">
                    <div className="text-2xl font-extrabold text-foreground">{earnedAchievements.length}</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Achievement</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-foreground">{badge.level}</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Livello</div>
                  </div>
                </div>
                {nextBadge && (
                  <div className="mt-4 pt-4 border-t border-stone-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Verso <strong className="text-foreground">{nextBadge.name}</strong> {nextBadge.emoji}
                      </span>
                      <span className="text-xs text-muted-foreground">{profile.reviewCount} / {nextBadge.minReviews}</span>
                    </div>
                    <div className="h-2 bg-stone-200/70 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${badge.bgFrom} ${badge.bgTo} rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Favorite styles preview */}
              {profile.favoriteStyles && profile.favoriteStyles.length > 0 && (
                <div className={`${GLASS_CARD} p-5`}>
                  <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                    🍺 Stili preferiti
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.favoriteStyles.slice(0, 6).map((style: string) => (
                      <Link key={style} href={`/search?q=${encodeURIComponent(style)}`}>
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 px-2.5 py-0.5 text-xs"
                        >
                          {style}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent reviews preview (top 3) */}
              {recentReviews.length > 0 && (
                <div className={`${GLASS_CARD} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      Ultime recensioni
                    </h3>
                    <button
                      onClick={() => setActiveTab('recensioni')}
                      className="text-xs font-semibold text-primary hover:underline"
                      data-testid="user-overview-view-reviews"
                    >
                      Vedi tutte
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentReviews.slice(0, 3).map((review: any) => (
                      <Link key={review.id} href={`/beer/${review.beerId}`}>
                        <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-stone-50/60 dark:hover:bg-white/[0.04] transition-colors">
                          <ImageWithFallback
                            src={review.beerImageUrl}
                            alt={review.beerName}
                            imageType="beer"
                            containerClassName="w-10 h-10 rounded-lg flex-shrink-0"
                            className="w-10 h-10 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-foreground truncate">{review.beerName}</span>
                              <StarDisplay rating={review.rating} />
                            </div>
                            {review.beerStyle && <span className="text-[10px] text-muted-foreground">{review.beerStyle}</span>}
                            {(review.format || review.pubName) && (
                              <span className="text-[10px] text-stone-400">
                                {review.format}{review.format && review.pubName ? " · " : ""}{review.pubName}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements preview */}
              {earnedAchievements.length > 0 && (
                <div className={`${GLASS_CARD} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      🏅 Achievement ({earnedAchievements.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab('attivita')}
                      className="text-xs font-semibold text-primary hover:underline"
                      data-testid="user-overview-view-attivita"
                    >
                      Vedi tutti
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {earnedAchievements.slice(0, 8).map(a => (
                      <div
                        key={a.id}
                        title={a.description}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${CATEGORY_COLORS[a.category]}`}
                      >
                        <span className="text-xs">{a.emoji}</span>
                        {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Recensioni */}
            <TabsContent value="recensioni" className="mt-0 space-y-4">
              {recentReviews.length > 0 ? (
                RecentReviewsSection
              ) : (
                <div className={`${GLASS_CARD} p-8 text-center`}>
                  <Star className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                  <h3 className="font-bold text-foreground mb-1">Nessuna recensione</h3>
                  <p className="text-sm text-muted-foreground">{displayName} non ha ancora pubblicato recensioni.</p>
                </div>
              )}
            </TabsContent>

            {/* Cellar */}
            <TabsContent value="cellar" className="mt-0 space-y-4">
              <div className={`${GLASS_CARD} p-8 text-center`}>
                <Wine className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <h3 className="font-bold text-foreground mb-1">Cellar in arrivo</h3>
                <p className="text-sm text-muted-foreground">
                  La cantina personale di {displayName} sarà visibile qui appena disponibile.
                </p>
              </div>
            </TabsContent>

            {/* Attività */}
            <TabsContent value="attivita" className="mt-0 space-y-4">
              {AchievementsSection || (
                <div className={`${GLASS_CARD} p-8 text-center`}>
                  <Award className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                  <h3 className="font-bold text-foreground mb-1">Nessun achievement</h3>
                  <p className="text-sm text-muted-foreground">{displayName} non ha ancora sbloccato achievement.</p>
                </div>
              )}
              {BadgeProgressionSection}
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>

      <Footer />

      {/* ── STICKY MINI TOP BAR (mobile, non-overview) ── */}
      {activeTab !== 'overview' && !isModalOpen && (
        <DockPortal>
        <div
          className="lg:hidden fixed inset-x-0 z-[49]"
          style={{ top: 'var(--mobile-top-offset)' }}
        >
          <div className="bg-white/70 dark:bg-[#0B0B0C]/70 backdrop-blur-xl border-b border-stone-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 h-14">
              <button
                onClick={() => setActiveTab('overview')}
                aria-label="Torna alla home del profilo"
                className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center tap-scale active:scale-95"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  {profile.profileImageUrl && <AvatarImage src={profile.profileImageUrl} />}
                  <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-foreground truncate leading-tight">{displayName}</div>
                  <div className="text-[10px] font-semibold text-primary capitalize leading-tight">
                    {tabLabel(activeTab)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleShare}
                aria-label="Condividi profilo"
                className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center tap-scale active:scale-95"
              >
                <Share2 className="h-[18px] w-[18px] text-foreground" />
              </button>
            </div>
          </div>
        </div>
        </DockPortal>
      )}

      {/* ── FLOATING BOTTOM DOCK (mobile only) ── */}
      <nav
        className={`lg:hidden fixed left-0 right-0 z-40 transition-opacity duration-200 ${
          isModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        aria-label="Navigazione del profilo"
      >
        <div className="mx-auto max-w-md px-4">
          <div
            role="tablist"
            aria-label="Sezioni del profilo"
            className="bg-white/75 dark:bg-[#121315]/80 backdrop-blur-2xl rounded-[28px] border border-white/60 dark:border-white/[0.08] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-stretch justify-between p-1.5 gap-1">
              {[
                { id: 'overview',   label: 'Overview',   Icon: HomeIcon },
                { id: 'recensioni', label: 'Recensioni', Icon: Star },
                { id: 'cellar',     label: 'Cellar',     Icon: Wine },
                { id: 'attivita',   label: 'Attività',   Icon: ActivityIcon },
              ].map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? 'page' : undefined}
                    aria-label={label}
                    data-testid={`user-dock-${id}`}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-[20px] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      active
                        ? 'bg-primary/10 dark:bg-primary/15 text-primary'
                        : 'text-stone-500 dark:text-stone-400 hover:text-foreground'
                    }`}
                  >
                    <Icon
                      className="h-[20px] w-[20px]"
                      strokeWidth={active ? 2.6 : 1.8}
                      fill={active ? 'currentColor' : 'none'}
                      style={active ? { fillOpacity: 0.18 } : {}}
                    />
                    <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
    </>
  );
}
