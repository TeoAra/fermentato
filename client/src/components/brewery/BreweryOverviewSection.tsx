import { motion } from "framer-motion";
import { Globe, MapPin, Navigation as NavIcon, Building2, Factory, Megaphone } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
import { Map as PigeonMap, Overlay as PigeonOverlay } from "pigeon-maps";
import { osmTileProvider } from "@/lib/map-tiles";
import { RichTextDisplay, isRichContentEmpty } from "@/components/rich-text-editor";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { PostContent } from "@/components/social/PostContent";
import { MicroblogSocialBar } from "@/components/social/MicroblogSocialBar";

interface BreweryOverviewSectionProps {
  brewery: any;
  onDirections?: () => void;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function BreweryOverviewSection({
  brewery,
  onDirections,
}: BreweryOverviewSectionProps) {
  const lat = brewery?.latitude ? Number(brewery.latitude) : null;
  const lng = brewery?.longitude ? Number(brewery.longitude) : null;
  const hasMap = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  const hasDescription =
    brewery?.description || !isRichContentEmpty(brewery?.richContent);
  const hasContacts =
    brewery?.websiteUrl ||
    brewery?.instagramUrl ||
    brewery?.facebookUrl ||
    brewery?.tiktokUrl;

  const { data: entityPosts } = useQuery<any[]>({
    queryKey: [`/api/microblog/entity-posts`, "brewery", brewery?.id],
    queryFn: async () => {
      if (!brewery?.id) return [];
      const r = await fetch(`/api/microblog/entity-posts?type=brewery&id=${brewery.id}&limit=5`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!brewery?.id,
    staleTime: 60_000,
  });

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4 pt-4"
      data-testid="brewery-overview-section"
    >
      {/* Chi siamo */}
      {hasDescription && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-2">
            Chi siamo
          </h3>
          <RichTextDisplay
            html={
              (!isRichContentEmpty(brewery?.richContent) && typeof brewery?.richContent === "string")
                ? brewery.richContent
                : (brewery?.description ?? "")
            }
            className="text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed"
          />
        </motion.div>
      )}

      {/* Casa madre / sub-brand */}
      {brewery?.parentCompany && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF7EA] dark:bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0">
            <Factory className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-bold text-[#6B6357] dark:text-[#B7BDC7]">
              Parte del gruppo
            </p>
            <p className="font-bold text-[#151515] dark:text-[#F5F5F5] truncate">
              {brewery.parentCompany}
            </p>
          </div>
        </motion.div>
      )}

      {/* Mappa */}
      {hasMap && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="h-[180px] relative">
            <PigeonMap
              defaultCenter={[lat as number, lng as number]}
              defaultZoom={13}
              provider={osmTileProvider}
              attribution={false}
              mouseEvents={false}
              touchEvents={false}
            >
              <PigeonOverlay anchor={[lat as number, lng as number]}>
                <div className="w-7 h-7 rounded-full bg-[#F59E0B] border-2 border-white shadow-md flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
              </PigeonOverlay>
            </PigeonMap>
          </div>
          {onDirections && (
            <button
              type="button"
              onClick={onDirections}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[#F59E0B] hover:bg-[#FAF7F1] dark:hover:bg-[#12151A] transition-colors"
              data-testid="brewery-overview-directions"
            >
              <NavIcon className="w-4 h-4" />
              Indicazioni stradali
            </button>
          )}
        </motion.div>
      )}

      {/* Contatti */}
      {hasContacts && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-3">
            Contatti
          </h3>
          <div className="space-y-2">
            {brewery.websiteUrl && (
              <a
                href={brewery.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 text-sm text-[#151515] dark:text-[#F5F5F5] hover:text-[#F59E0B] transition-colors"
              >
                <Globe className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-medium truncate">
                  {brewery.websiteUrl.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
            {(brewery.facebookUrl || brewery.instagramUrl || brewery.tiktokUrl) && (
              <div className="flex items-center gap-2 pt-2">
                {brewery.instagramUrl && (
                  <a
                    href={brewery.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center text-[#E1306C] hover:bg-white dark:hover:bg-[#1A1D24] transition-colors"
                  >
                    <SiInstagram className="w-4 h-4" />
                  </a>
                )}
                {brewery.facebookUrl && (
                  <a
                    href={brewery.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center text-[#1877F2] hover:bg-white dark:hover:bg-[#1A1D24] transition-colors"
                  >
                    <SiFacebook className="w-4 h-4" />
                  </a>
                )}
                {brewery.tiktokUrl && (
                  <a
                    href={brewery.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-9 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center text-[#151515] dark:text-[#F5F5F5] hover:bg-white dark:hover:bg-[#1A1D24] transition-colors"
                  >
                    <SiTiktok className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Indirizzo */}
      {brewery?.address && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 flex items-start gap-3"
        >
          <Building2 className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#151515] dark:text-[#F5F5F5]">
            <p className="font-semibold">{brewery.address}</p>
            <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
              {[brewery.location, brewery.region, brewery.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </motion.div>
      )}

      {/* Aggiornamenti dal birrificio */}
      {Array.isArray(entityPosts) && entityPosts.length > 0 && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5]">Aggiornamenti</h3>
          </div>
          <div className="space-y-3">
            {entityPosts.map((p: any) => (
              <div key={p.id} className="border-t border-[#E8DED1] dark:border-white/[0.04] pt-3 first:border-t-0 first:pt-0">
                <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mb-1">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: it })}
                </p>
                <div className="text-sm text-[#151515] dark:text-[#F5F5F5] leading-snug line-clamp-3">
                  <PostContent content={p.content} />
                </div>
                {p.image_url && (
                  <img src={p.image_url} alt="" className="mt-2 rounded-xl w-full max-h-48 object-cover" />
                )}
                <div className="mt-2 pt-2 border-t border-[#E8DED1] dark:border-white/[0.04]">
                  <MicroblogSocialBar
                    postId={p.id}
                    postUserId={p.user_id}
                    liked={p.liked ?? false}
                    likesCount={p.likes_count ?? 0}
                    commentsCount={p.comments_count ?? 0}
                    content={p.content ?? ""}
                    authorType={p.author_type}
                    authorEntityId={p.author_entity_id}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
