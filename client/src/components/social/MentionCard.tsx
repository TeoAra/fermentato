import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Beer, UserPlus, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MentionCardProps {
  nickname: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-stone-300"}`}
        />
      ))}
    </span>
  );
}

export function MentionCard({ nickname, anchorRect, onClose }: MentionCardProps) {
  const [, setLocation] = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/users/${nickname}/profile`],
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Position the card near the anchor, keeping it inside the viewport
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;

    let top = anchorRect.bottom + GAP;
    let left = anchorRect.left;

    // Flip up if not enough space below
    if (top + card.height > vh - 16) top = anchorRect.top - card.height - GAP;
    // Clamp horizontally
    if (left + card.width > vw - 16) left = vw - card.width - 16;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [anchorRect, isLoading]);

  // Close on outside click or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  const goToProfile = () => {
    setLocation(`/user/${nickname}`);
    onClose();
  };

  const displayName = profile
    ? (profile.nickname || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || nickname)
    : nickname;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`mention-card-${nickname}`}
        ref={cardRef}
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 150 }}
        className="w-64 bg-white dark:bg-[#1A1D24] rounded-2xl border border-stone-200 dark:border-white/[0.08] shadow-xl overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : !profile ? (
          <div className="p-4 text-center text-sm text-stone-400">Utente non trovato</div>
        ) : (
          <>
            {/* Header with avatar */}
            <div className="p-4 pb-3">
              <div className="flex items-start gap-3">
                {profile.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-[#1A1D24]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center shrink-0 text-white font-bold text-lg">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-900 dark:text-white truncate">{displayName}</p>
                  <p className="text-xs text-stone-400">@{nickname}</p>
                  {profile.reviewCount > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Beer className="w-3 h-3 text-stone-400" />
                      <span className="text-xs text-stone-500 dark:text-stone-400">{profile.reviewCount} recensioni</span>
                    </div>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="mt-2.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {profile.favoriteStyles?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.favoriteStyles.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action */}
            <div className="px-4 pb-4">
              <Button
                size="sm"
                className="w-full rounded-xl h-8 text-xs gap-1.5"
                onClick={goToProfile}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Vedi profilo
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
