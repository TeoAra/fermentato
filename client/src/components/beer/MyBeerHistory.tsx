/**
 * MyBeerHistory — personal check-in card(s) shown in the beer detail page.
 *
 * Shows the authenticated user's tasting record(s) for this beer:
 * date, pub (if any), star rating, and personal notes.
 *
 * Note: the DB enforces UNIQUE(user_id, beer_id), so at most 1 record exists,
 * but the component is designed as a list for forward compatibility.
 */
import { Link } from "wouter";
import { Star, MapPin, Clock, Beer as BeerIcon, ChevronRight } from "lucide-react";

interface Checkin {
  id: number;
  rating: number | null;
  personalNotes: string | null;
  format: string | null;
  photoUrl: string | null;
  tastedAt: string | null;
  pubId: number | null;
  pubName: string | null;
  pubSlug: string | null;
  pubCity: string | null;
}

interface MyBeerHistoryProps {
  checkins: Checkin[];
  beerId: number;
  /** Max rows before "vedi tutte" link (default 3) */
  maxVisible?: number;
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "Data sconosciuta";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Data sconosciuta";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (mins < 2) return "Poco fa";
  if (hours < 1) return `${mins} minut${mins === 1 ? "o" : "i"} fa`;
  if (hours < 24) return `${hours} or${hours === 1 ? "a" : "e"} fa`;
  if (days < 7) return `${days} giorn${days === 1 ? "o" : "i"} fa`;
  if (days < 30) return `${Math.floor(days / 7)} settiman${Math.floor(days / 7) === 1 ? "a" : "e"} fa`;
  if (months < 12) return `${months} mes${months === 1 ? "e" : "i"} fa`;
  return `${years} ann${years === 1 ? "o" : "i"} fa`;
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= full ? "text-amber-400" : i === full + 1 && half ? "text-amber-400" : "text-stone-200 dark:text-stone-700"}`}
          fill={i <= full ? "currentColor" : i === full + 1 && half ? "currentColor" : "none"}
          strokeWidth={1.5}
          style={i === full + 1 && half ? { clipPath: "inset(0 50% 0 0)" } : {}}
        />
      ))}
      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-0.5">
        {Number(rating).toFixed(1).replace(".", ",")}
      </span>
    </span>
  );
}

export default function MyBeerHistory({ checkins, beerId, maxVisible = 3 }: MyBeerHistoryProps) {
  if (!checkins || checkins.length === 0) return null;

  const visible = checkins.slice(0, maxVisible);
  const hasMore = checkins.length > maxVisible;

  return (
    <div className="mt-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-1.5">
          <BeerIcon className="w-4 h-4 text-primary" />
          {checkins.length === 1 ? "La tua esperienza" : `Le tue esperienze (${checkins.length})`}
        </h3>
        {hasMore && (
          <Link href={`/user/tastings?beerId=${beerId}`}>
            <span className="text-xs font-bold text-primary tap-scale flex items-center gap-0.5">
              Vedi tutte <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>

      <div className="space-y-2.5">
        {visible.map(c => (
          <div
            key={c.id}
            className="bg-white dark:bg-[#1A1D24] rounded-[18px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden"
          >
            {/* Photo strip (if any) */}
            {c.photoUrl && (
              <div className="h-28 overflow-hidden">
                <img src={c.photoUrl} alt="Foto assaggio" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="px-4 py-3.5 space-y-2">
              {/* Top row: rating + date */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {c.rating != null ? (
                  <StarRating rating={c.rating} />
                ) : (
                  <span className="text-xs text-muted-foreground italic">Nessun voto</span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {relativeDate(c.tastedAt)}
                </span>
              </div>

              {/* Notes */}
              {c.personalNotes && (
                <blockquote className="text-sm text-[#4A4540] dark:text-[#C7CDD6] leading-relaxed border-l-2 border-primary/30 pl-3 italic">
                  "{c.personalNotes}"
                </blockquote>
              )}

              {/* Footer: pub + format */}
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                {c.pubId && c.pubName ? (
                  <Link href={c.pubSlug ? `/pub/${c.pubSlug}` : `/pub/${c.pubId}`}>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-orange-400 hover:underline tap-scale">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {c.pubName}{c.pubCity ? ` · ${c.pubCity}` : ""}
                    </span>
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Locale non specificato
                  </span>
                )}
                {c.format && (
                  <span className="text-[10px] font-bold bg-stone-100 dark:bg-[#23262E] text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                    {c.format}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
