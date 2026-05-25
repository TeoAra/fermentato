import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Phone,
  Mail,
  Globe,
  Navigation as NavIcon,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { Map as PigeonMap, Overlay as PigeonOverlay } from "pigeon-maps";
import { RichTextDisplay, isRichContentEmpty } from "@/components/rich-text-editor";
import type { PubLike } from "./types";

interface OverviewSectionProps {
  pub: PubLike;
  events?: any[];
  onShowHours?: () => void;
  onCall?: () => void;
  onDirections?: () => void;
}

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Lun" },
  { key: "tuesday", label: "Mar" },
  { key: "wednesday", label: "Mer" },
  { key: "thursday", label: "Gio" },
  { key: "friday", label: "Ven" },
  { key: "saturday", label: "Sab" },
  { key: "sunday", label: "Dom" },
];

function todayKey() {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function OverviewSection({
  pub,
  events,
  onShowHours,
  onCall,
  onDirections,
}: OverviewSectionProps) {
  const amenities = Array.isArray(pub?.amenities) ? pub!.amenities! : [];
  const lat = pub?.latitude ? Number(pub.latitude) : null;
  const lng = pub?.longitude ? Number(pub.longitude) : null;
  const hasMap = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  const today = todayKey();
  const upcomingEvents = Array.isArray(events)
    ? events.filter((e) => !e?.eventDate || new Date(e.eventDate) >= new Date(new Date().toDateString())).slice(0, 3)
    : [];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4 pt-4"
      data-testid="overview-section"
    >
      {/* Chi siamo */}
      {(pub?.description || !isRichContentEmpty(pub?.richContent)) && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-2">Chi siamo</h3>
          {!isRichContentEmpty(pub?.richContent) ? (
            <RichTextDisplay
              html={typeof pub?.richContent === "string" ? pub.richContent : ""}
              className="text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed"
            />
          ) : (
            <p className="text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed whitespace-pre-line">{pub?.description}</p>
          )}
        </motion.div>
      )}

      {/* Amenities chips — solo se il pub ha caratteristiche reali */}
      {amenities.length > 0 && (
        <motion.div variants={item}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {amenities.map((a) => (
              <span
                key={a}
                className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-xs font-semibold text-[#151515] dark:text-[#F5F5F5] shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              >
                {a}
              </span>
            ))}
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
              defaultZoom={15}
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
          <button
            type="button"
            onClick={onDirections}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-[#F59E0B] hover:bg-[#FAF7F1] dark:bg-[#12151A] transition-colors"
            data-testid="overview-directions"
          >
            <NavIcon className="w-4 h-4" />
            Indicazioni stradali
          </button>
        </motion.div>
      )}

      {/* Orari */}
      {pub?.openingHours && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F59E0B]" />
              Orari di apertura
            </h3>
            {onShowHours && (
              <button
                type="button"
                onClick={onShowHours}
                className="text-xs font-semibold text-[#F59E0B] hover:underline"
              >
                Dettagli
              </button>
            )}
          </div>
          <div className="divide-y divide-[#E8DED1]/60">
            {DAYS.map((d) => {
              const h = pub.openingHours?.[d.key];
              const isToday = d.key === today;
              const isClosed = !h || h.isClosed;
              return (
                <div
                  key={d.key}
                  className={`flex justify-between items-center py-2 text-sm ${
                    isToday ? "rounded-lg bg-[#FFF7EA] dark:bg-[#F59E0B]/15 px-2 -mx-2 my-0.5" : ""
                  }`}
                >
                  <span className={`font-medium ${isToday ? "text-[#F59E0B] font-bold" : "text-[#151515] dark:text-[#F5F5F5]"}`}>
                    {d.label}
                    {isToday && <span className="ml-1.5 text-[10px] font-bold uppercase">Oggi</span>}
                  </span>
                  <span className={`tabular-nums ${isClosed ? "text-red-500" : "text-[#6B6357] dark:text-[#B7BDC7]"}`}>
                    {isClosed ? "Chiuso" : `${h.open} – ${h.close}`}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Contatti */}
      {(pub?.phone || pub?.email || pub?.websiteUrl || pub?.facebookUrl || pub?.instagramUrl) && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-3">Contatti</h3>
          <div className="space-y-2">
            {pub.phone && (
              <button
                type="button"
                onClick={onCall}
                className="w-full flex items-center gap-3 py-2 text-sm text-[#151515] dark:text-[#F5F5F5] hover:text-[#F59E0B] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-medium">{pub.phone}</span>
              </button>
            )}
            {pub.email && (
              <a href={`mailto:${pub.email}`} className="flex items-center gap-3 py-2 text-sm text-[#151515] dark:text-[#F5F5F5] hover:text-[#F59E0B] transition-colors">
                <Mail className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-medium truncate">{pub.email}</span>
              </a>
            )}
            {pub.websiteUrl && (
              <a href={pub.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 text-sm text-[#151515] dark:text-[#F5F5F5] hover:text-[#F59E0B] transition-colors">
                <Globe className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-medium truncate">{pub.websiteUrl.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
            {(pub.facebookUrl || pub.instagramUrl) && (
              <div className="flex items-center gap-2 pt-2">
                {pub.facebookUrl && (
                  <a
                    href={pub.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center text-[#1877F2] hover:bg-white dark:bg-[#1A1D24] transition-colors"
                  >
                    <SiFacebook className="w-4 h-4" />
                  </a>
                )}
                {pub.instagramUrl && (
                  <a
                    href={pub.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center text-[#E1306C] hover:bg-white dark:bg-[#1A1D24] transition-colors"
                  >
                    <SiInstagram className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Eventi */}
      {upcomingEvents.length > 0 && (
        <motion.div
          variants={item}
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
        >
          <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F59E0B]" />
            Prossimi eventi
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map((e: any) => (
              <Link
                key={e.id}
                href={`/event/${e.id}`}
                className="flex items-center gap-3 py-2 rounded-xl hover:bg-[#FAF7F1] dark:bg-[#12151A] transition-colors px-2 -mx-2"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFF7EA] dark:bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#F59E0B] uppercase leading-none">
                    {e.eventDate ? new Date(e.eventDate).toLocaleDateString("it-IT", { month: "short" }).replace(".", "") : "—"}
                  </span>
                  <span className="text-base font-black text-[#151515] dark:text-[#F5F5F5] leading-tight">
                    {e.eventDate ? new Date(e.eventDate).getDate() : "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] truncate">{e.title || e.name}</p>
                  {e.description && (
                    <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] truncate">{e.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
