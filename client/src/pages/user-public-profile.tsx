import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, ArrowLeft, Calendar, Beer, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Footer from "@/components/footer";
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
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "text-yellow-500 fill-yellow-500" : "text-stone-300 dark:text-stone-400"}`}
        />
      ))}
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
        ? `${badge.borderColor} bg-white dark:bg-gray-800`
        : "border-gray-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-900 opacity-40"
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

export default function UserPublicProfile() {
  const { nickname } = useParams<{ nickname: string }>();

  const { data: profile, isLoading, error } = useQuery<any>({
    queryKey: ["/api/users", nickname, "profile"],
    queryFn: () => fetch(`/api/users/${encodeURIComponent(nickname || "")}/profile`).then(r => {
      if (!r.ok) throw new Error(r.status === 403 ? "private" : r.status === 404 ? "not_found" : "error");
      return r.json();
    }),
    enabled: !!nickname,
    retry: false,
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla home
          </Link>
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-6">
        {/* Hero Profile Card */}
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
                  {profile.id && <FollowButton userId={profile.id} className="border-white/30 text-white hover:bg-white/10" />}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <span className="text-white/90 font-semibold text-lg">{badge.name}</span>
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Livello {badge.level}</span>
                </div>
                {profile.bio && <p className="text-white/80 text-sm max-w-md">{profile.bio}</p>}
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
            <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground dark:text-stone-300">
                  Progresso verso <strong>{nextBadge.name}</strong> {nextBadge.emoji}
                </span>
                <span className="text-sm text-muted-foreground">
                  {profile.reviewCount} / {nextBadge.minReviews}
                </span>
              </div>
              <div className="h-2.5 bg-stone-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

        {/* Favorite Styles — clickable */}
        {profile.favoriteStyles && profile.favoriteStyles.length > 0 && (
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
        )}

        {/* Achievement Badges */}
        {earnedAchievements.length > 0 && (
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
        )}

        {/* Badge Progression */}
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

        {/* Recent Reviews */}
        {profile.recentReviews && profile.recentReviews.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <h2 className="font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Ultime recensioni ({profile.reviewCount})
              </h2>
              <div className="space-y-3">
                {profile.recentReviews.map((review: any) => (
                  <Link key={review.id} href={`/beer/${review.beerId}`}>
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
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
                          <p className="text-xs text-muted-foreground dark:text-stone-400 italic mt-1 line-clamp-2">"{review.personalNotes}"</p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">
                          {format(new Date(review.tastedAt), "d MMM yyyy", { locale: it })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
