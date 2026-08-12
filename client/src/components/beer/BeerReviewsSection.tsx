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
import CheckinSocialBar from "@/components/social/CheckinSocialBar";
import { ZoomableImage } from "@/components/ImageLightbox";

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
    <div id="beer-reviews" className="mt-4 space-y-4 scroll-mt-20">
      {/* La mia nota */}
      {isAuthenticated && (
        <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-2">
              <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
              La mia nota
            </h2>
            {hasTasted && !showTastingForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTastingForm(true)}
                className="h-8 text-xs rounded-full border-[#E8DED1] dark:border-white/[0.06]"
                data-testid="button-edit-tasting"
              >
                Modifica
              </Button>
            )}
          </div>

          {showTastingForm || !hasTasted ? (
            <Suspense fallback={<div className="h-32 animate-pulse bg-[#FAF7F1] dark:bg-[#12151A] rounded-xl" />}>
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
                        ? "text-[#F59E0B] fill-[#F59E0B]"
                        : "text-[#E8DED1] dark:text-white/20"
                    }`}
                  />
                ))}
                <span className="text-sm font-bold text-[#151515] dark:text-[#F5F5F5]">
                  {existingTasting.rating}/5
                </span>
              </div>
              {(existingTasting.personalNotes || existingTasting.notes) && (
                <div className="text-[#6B6357] dark:text-[#B7BDC7] italic text-sm border-l-2 border-[#F59E0B]/40 pl-3">
                  <RichTextDisplay
                    html={String(existingTasting.personalNotes || existingTasting.notes)}
                  />
                </div>
              )}
              <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7]">
                Degustata il{" "}
                {new Date(existingTasting.tastedAt).toLocaleDateString("it-IT")}
                {existingTasting.format ? ` in ${existingTasting.format}` : ""}
                {existingTasting.pubName ? ` presso ${existingTasting.pubName}` : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recensioni Community */}
      {reviewsData && reviewsData.reviewCount > 0 && (
        <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-2">
              <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
              Recensioni Community
              <span className="text-sm font-normal text-[#6B6357] dark:text-[#B7BDC7]">
                ({reviewsData.reviewCount})
              </span>
            </h2>
            {reviewsData.avgRating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => {
                  const avg = reviewsData.avgRating || 0;
                  const full = avg >= s;
                  const half = !full && avg >= s - 0.5;
                  return (
                    <span key={s} className="relative inline-block w-3.5 h-3.5">
                      <Star className="h-3.5 w-3.5 text-[#E8DED1] dark:text-white/20 absolute inset-0" />
                      {(full || half) && (
                        <span className="absolute inset-0 overflow-hidden" style={{ width: full ? "100%" : "50%" }}>
                          <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                        </span>
                      )}
                    </span>
                  );
                })}
                <span className="ml-1 text-sm font-bold text-[#151515] dark:text-[#F5F5F5]">
                  {reviewsData.avgRating?.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Distribution */}
          {reviewsData.distribution && (
            <div className="mb-4 space-y-1.5 bg-[#FAF7F1] dark:bg-[#12151A] rounded-xl p-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewsData.distribution?.[star] || 0;
                const pct = reviewsData.reviewCount > 0 ? (count / reviewsData.reviewCount) * 100 : 0;
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
                        ? "bg-[#FFF7EA] dark:bg-[#F59E0B]/10"
                        : "hover:bg-white/60 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      <span className="text-xs font-bold text-[#6B6357] dark:text-[#B7BDC7] w-3">
                        {star}
                      </span>
                      <Star className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
                    </div>
                    <div className="flex-1 h-2 bg-[#E8DED1] dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isActive
                            ? "bg-[#F59E0B]"
                            : "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#6B6357] dark:text-[#B7BDC7] w-6 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters / Sort */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#6B6357] dark:text-[#B7BDC7]">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Filtra:</span>
            </div>
            {reviewFilterRating !== null && (
              <button
                onClick={() => setReviewFilterRating(null)}
                className="flex items-center gap-1 text-xs bg-[#FFF7EA] dark:bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1 rounded-full font-bold border border-[#F59E0B]/30 hover:bg-[#FFF0D0] transition-colors"
              >
                {reviewFilterRating}★ <X className="h-3 w-3" />
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#6B6357] dark:text-[#B7BDC7]" />
              {(["recent", "highest", "lowest"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setReviewSortBy(opt);
                    setShowAllReviews(false);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-all ${
                    reviewSortBy === opt
                      ? "bg-[#F59E0B] border-[#F59E0B] text-white"
                      : "text-[#6B6357] dark:text-[#B7BDC7] border-[#E8DED1] dark:border-white/[0.06] hover:border-[#F59E0B]/40"
                  }`}
                >
                  {opt === "recent" ? "Recenti" : opt === "highest" ? "↑ Voto" : "↓ Voto"}
                </button>
              ))}
            </div>
          </div>

          {/* Review list */}
          <div className="space-y-3">
            {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map((review: any) => {
              const displayName = review.nickname || review.firstName || "Utente";
              const initials = displayName[0]?.toUpperCase() || "U";
              const userBadge = getBadgeForCount(Number(review.userReviewCount || 0));
              const isPublicReviewer = review.isPublic !== false;
              return (
                <div
                  key={review.id}
                  className="flex gap-3 p-3 bg-[#FAF7F1] dark:bg-[#12151A] rounded-xl group"
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    {review.profileImageUrl && <AvatarImage src={review.profileImageUrl} />}
                    <AvatarFallback className="bg-[#F59E0B]/20 text-[#F59E0B] font-bold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isPublicReviewer ? (
                          <Link href={`/user/${review.nickname || review.userId}`}>
                            <span className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] hover:text-[#F59E0B] cursor-pointer transition-colors truncate">
                              {displayName}
                            </span>
                          </Link>
                        ) : (
                          <span className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] truncate">
                            {displayName}
                          </span>
                        )}
                        <span className="text-sm flex-shrink-0" title={userBadge.name}>
                          {userBadge.emoji}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => {
                          const r = review.rating || 0;
                          const full = r >= s;
                          const half = !full && r >= s - 0.5;
                          return (
                            <span key={s} className="relative inline-block w-3 h-3">
                              <Star className="h-3 w-3 text-[#E8DED1] dark:text-white/20 absolute inset-0" />
                              {(full || half) && (
                                <span className="absolute inset-0 overflow-hidden" style={{ width: full ? "100%" : "50%" }}>
                                  <Star className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {review.personalNotes && (
                      <p className="text-sm text-[#151515] dark:text-[#F5F5F5] italic mb-1">
                        "{review.personalNotes}"
                      </p>
                    )}
                    {(review.photoUrl || review.photo_url) && (
                      <div className="mt-2 mb-2 rounded-xl overflow-hidden max-h-64">
                        <ZoomableImage
                          src={review.photoUrl || review.photo_url}
                          alt="Foto assaggio"
                          className="w-full object-cover max-h-64"
                        />
                      </div>
                    )}
                    {review.ownerReply && (
                      <div className="mt-2 ml-1 pl-3 border-l-2 border-[#F59E0B]/40 rounded-sm">
                        <div className="flex items-center gap-1 mb-0.5">
                          <MessageSquare className="h-3 w-3 text-[#F59E0B]" />
                          <span className="text-xs font-bold text-[#F59E0B]">
                            Risposta del birrificio
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed">
                          {review.ownerReply}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#6B6357] dark:text-[#B7BDC7] flex-wrap mt-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span>
                          Degustata il{" "}
                          {new Date(review.tastedAt).toLocaleDateString("it-IT")}
                        </span>
                        {review.format && <span>in {review.format}</span>}
                        {review.pubId && review.pubName && (
                          <>
                            <span>presso</span>
                            <a
                              href={`/pub/${review.pubId}`}
                              className="text-[#F59E0B] hover:text-[#F59E0B]/80 hover:underline font-bold"
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
                          className="flex items-center gap-1 text-[#6B6357] dark:text-[#B7BDC7] hover:text-red-500 transition-colors"
                          title="Segnala recensione"
                        >
                          <Flag className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <CheckinSocialBar
                      tastingId={review.id}
                      compact
                      initialLikes={review.likesCount != null ? { count: review.likesCount, liked: review.liked ?? false, commentsCount: review.commentsCount ?? 0 } : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredReviews.length > 5 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-sm font-bold text-[#F59E0B] border border-dashed border-[#F59E0B]/30 rounded-xl hover:bg-[#FFF7EA] dark:hover:bg-[#F59E0B]/5 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllReviews ? "rotate-180" : ""}`} />
              {showAllReviews
                ? "Mostra meno"
                : `Mostra altre ${filteredReviews.length - 5} recensioni`}
            </button>
          )}

          {filteredReviews.length === 0 && reviewFilterRating !== null && (
            <div className="text-center py-6 text-[#6B6357] dark:text-[#B7BDC7]">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessuna recensione con {reviewFilterRating} stelle</p>
              <button
                onClick={() => setReviewFilterRating(null)}
                className="text-xs text-[#F59E0B] mt-1 hover:underline font-bold"
              >
                Rimuovi filtro
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
