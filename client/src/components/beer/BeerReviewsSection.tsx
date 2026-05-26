import { lazy, Suspense } from "react";
import { Link } from "wouter";
import {
  Star,
  Filter,
  ArrowUpDown,
  ChevronDown,
  X,
  Flag,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RichTextDisplay } from "@/components/rich-text-editor";
import { getBadgeForCount } from "@/lib/badges";
import { CommunityPostsSection } from "@/components/social/CommunityPostsSection";

const BeerTastingForm = lazy(() => import("@/components/BeerTastingForm"));

interface ReviewsData {
  reviews: any[];
  avgRating: number | null;
  reviewCount: number;
  distribution: Record<number, number>;
}

interface BeerReviewsSectionProps {
  beerId: number;
  beerName?: string;
  isAuthenticated: boolean;
  hasTasted: boolean;
  existingTasting: any;
  showTastingForm: boolean;
  setShowTastingForm: (v: boolean) => void;
  onTastingSuccess: () => void;
  reviewsData?: ReviewsData;
  filteredReviews: any[];
  reviewFilterRating: number | null;
  setReviewFilterRating: (n: number | null) => void;
  reviewSortBy: "recent" | "highest" | "lowest";
  setReviewSortBy: (s: "recent" | "highest" | "lowest") => void;
  showAllReviews: boolean;
  setShowAllReviews: (v: boolean) => void;
  onReport: (reviewId: number) => void;
}

/**
 * Sezione recensioni di /beer/:id — nota personale + community reviews
 * con filtri/sort, distribuzione 5★, owner reply, flag report.
 */
export default function BeerReviewsSection({
  beerId,
  beerName,
  isAuthenticated,
  hasTasted,
  existingTasting,
  showTastingForm,
  setShowTastingForm,
  onTastingSuccess,
  reviewsData,
  filteredReviews,
  reviewFilterRating,
  setReviewFilterRating,
  reviewSortBy,
  setReviewSortBy,
  showAllReviews,
  setShowAllReviews,
  onReport,
}: BeerReviewsSectionProps) {
  return (
    <div id="beer-reviews" className="mt-8 space-y-6 scroll-mt-20">
      {/* My tasting note */}
      {isAuthenticated && (
        <div className="bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              La mia nota
            </h2>
            {hasTasted && !showTastingForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTastingForm(true)}
                className="bg-card h-8 text-xs"
                data-testid="button-edit-tasting"
              >
                Modifica
              </Button>
            )}
          </div>

          {showTastingForm || !hasTasted ? (
            <Suspense fallback={<div className="h-32 animate-pulse bg-stone-100 dark:bg-[#23262E] rounded-lg" />}>
              <BeerTastingForm
                beerId={beerId}
                existingTasting={existingTasting}
                onSuccess={onTastingSuccess}
                onCancel={() => setShowTastingForm(false)}
              />
            </Suspense>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= existingTasting.rating
                        ? "text-amber-500 fill-amber-500"
                        : "text-stone-300"
                    }`}
                  />
                ))}
                <span className="text-sm font-bold text-foreground">
                  {existingTasting.rating}/5
                </span>
              </div>
              {(existingTasting.personalNotes || existingTasting.notes) && (
                <div className="text-muted-foreground italic text-sm border-l-2 border-stone-200 pl-3">
                  <RichTextDisplay
                    html={String(
                      existingTasting.personalNotes || existingTasting.notes
                    )}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Degustata il{" "}
                {new Date(existingTasting.tastedAt).toLocaleDateString("it-IT")}
                {existingTasting.format ? ` in ${existingTasting.format}` : ""}
                {existingTasting.pubName
                  ? ` presso ${existingTasting.pubName}`
                  : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Community Reviews */}
      {reviewsData && reviewsData.reviewCount > 0 && (
        <div className="bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Recensioni Community
              <span className="text-sm font-normal text-muted-foreground">
                ({reviewsData.reviewCount})
              </span>
            </h2>
            {reviewsData.avgRating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= Math.round(reviewsData.avgRating || 0)
                        ? "text-amber-500 fill-amber-500"
                        : "text-stone-300 dark:text-stone-400"
                    }`}
                  />
                ))}
                <span className="ml-1 text-sm font-bold text-foreground">
                  {reviewsData.avgRating?.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {reviewsData.distribution && (
            <div className="mb-4 space-y-1.5 bg-stone-50/50 dark:bg-[#0B0D10]/20 rounded-xl p-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewsData.distribution?.[star] || 0;
                const pct =
                  reviewsData.reviewCount > 0
                    ? (count / reviewsData.reviewCount) * 100
                    : 0;
                const isActive = reviewFilterRating === star;
                return (
                  <button
                    key={star}
                    onClick={() => {
                      setReviewFilterRating(isActive ? null : star);
                      setShowAllReviews(false);
                    }}
                    className={`flex items-center gap-3 w-full rounded-lg px-1 py-0.5 transition-colors ${
                      isActive
                        ? "bg-stone-100 dark:bg-[#0B0D10]/30"
                        : "hover:bg-stone-50 dark:hover:bg-stone-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      <span className="text-xs font-bold text-muted-foreground w-3">
                        {star}
                      </span>
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="flex-1 h-2 bg-stone-100 dark:bg-orange-900/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isActive
                            ? "bg-gradient-to-r from-[#F77104] to-[#f5a623]"
                            : "bg-gradient-to-r from-yellow-400 to-orange-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Filtra:</span>
            </div>
            {reviewFilterRating !== null && (
              <button
                onClick={() => setReviewFilterRating(null)}
                className="flex items-center gap-1 text-xs bg-stone-50 dark:bg-[#0B0D10]/20 text-primary px-2.5 py-1 rounded-full font-medium border border-[#E8DED1] dark:border-white/[0.06]/30 hover:bg-stone-100 transition-colors"
              >
                {reviewFilterRating}★ <X className="h-3 w-3" />
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              {(["recent", "highest", "lowest"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setReviewSortBy(opt);
                    setShowAllReviews(false);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-all ${
                    reviewSortBy === opt
                      ? "text-white border-transparent"
                      : "text-muted-foreground border-stone-100 hover:border-primary/20"
                  }`}
                  style={
                    reviewSortBy === opt
                      ? {
                          background:
                            "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)",
                        }
                      : {}
                  }
                >
                  {opt === "recent"
                    ? "Recenti"
                    : opt === "highest"
                    ? "↑ Voto"
                    : "↓ Voto"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map(
              (review: any) => {
                const displayName =
                  review.nickname || review.firstName || "Utente";
                const initials = displayName[0]?.toUpperCase() || "U";
                const userBadge = getBadgeForCount(
                  Number(review.userReviewCount || 0)
                );
                const isPublicReviewer = review.isPublic !== false;
                return (
                  <div
                    key={review.id}
                    className="flex gap-3 p-3 bg-stone-50/30 dark:bg-[#0B0D10]/10 rounded-xl group"
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      {review.profileImageUrl && (
                        <AvatarImage src={review.profileImageUrl} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-[hsl(24,93%,49%)] to-[hsl(20,95%,42%)] text-white font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isPublicReviewer ? (
                            <Link
                              href={`/user/${review.nickname || review.userId}`}
                            >
                              <span className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors truncate">
                                {displayName}
                              </span>
                            </Link>
                          ) : (
                            <span className="font-bold text-sm text-foreground truncate">
                              {displayName}
                            </span>
                          )}
                          <span className="text-sm flex-shrink-0" title={userBadge.name}>
                            {userBadge.emoji}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= (review.rating || 0)
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-stone-300 dark:text-stone-400"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.personalNotes && (
                        <p className="text-sm text-foreground italic mb-1">
                          "{review.personalNotes}"
                        </p>
                      )}
                      {review.ownerReply && (
                        <div className="mt-2 ml-1 pl-3 border-l-2 border-[#E8DED1] dark:border-white/[0.06]/30 rounded-sm">
                          <div className="flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3 text-primary" />
                            <span className="text-xs font-bold text-primary">
                              Risposta del birrificio
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {review.ownerReply}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>
                            Degustata il{" "}
                            {new Date(review.tastedAt).toLocaleDateString(
                              "it-IT"
                            )}
                          </span>
                          {review.format && <span>in {review.format}</span>}
                          {review.pubId && review.pubName && (
                            <>
                              <span>presso</span>
                              <a
                                href={`/pub/${review.pubId}`}
                                className="text-primary hover:text-primary/80 hover:underline font-bold"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {review.pubName}
                              </a>
                            </>
                          )}
                        </div>
                        {isAuthenticated && (
                          <button
                            onClick={() => onReport(review.id)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Segnala recensione"
                          >
                            <Flag className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {filteredReviews.length > 5 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary hover:text-primary/80 border border-dashed border-[#E8DED1] dark:border-white/[0.06]/30 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/10 transition-colors"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showAllReviews ? "rotate-180" : ""
                }`}
              />
              {showAllReviews
                ? "Mostra meno"
                : `Mostra altre ${filteredReviews.length - 5} recensioni`}
            </button>
          )}

          {filteredReviews.length === 0 && reviewFilterRating !== null && (
            <div className="text-center py-6 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Nessuna recensione con {reviewFilterRating} stelle
              </p>
              <button
                onClick={() => setReviewFilterRating(null)}
                className="text-xs text-primary mt-1 hover:underline"
              >
                Rimuovi filtro
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Community posts ── */}
      {beerId && beerName && (
        <CommunityPostsSection
          entity={{ kind: "beer", id: beerId, name: beerName }}
          title="Post della community su questa birra"
        />
      )}
    </div>
  );
}
