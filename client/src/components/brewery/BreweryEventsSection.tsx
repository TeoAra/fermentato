import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { CalendarDays, Clock, Megaphone, Newspaper } from "lucide-react";
import { EventCategoryBadge, EventInterestButton } from "@/components/events-manager";

interface BreweryEventsSectionProps {
  announcements: any[];
  breweryEvents: any[];
}

/**
 * Tab "Serate" / "Eventi" per /brewery/:id.
 * Mostra annunci + prossimi eventi del birrificio.
 */
export default function BreweryEventsSection({
  announcements,
  breweryEvents,
}: BreweryEventsSectionProps) {
  return (
    <div className="space-y-4 pt-4">
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#F59E0B]" />
            Annunci
          </h3>
          <div className="space-y-3">
            {announcements.map((announcement: any) => (
              <div
                key={announcement.id}
                className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF7EA] dark:bg-[#F59E0B]/15 flex items-center justify-center text-[#F59E0B] shrink-0">
                    <Newspaper className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-[#151515] dark:text-[#F5F5F5]">{announcement.title}</h4>
                    <p className="text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed">
                      {announcement.content}
                    </p>
                    <p className="text-[10px] font-bold text-[#F59E0B] pt-2 uppercase tracking-wider">
                      {format(new Date(announcement.createdAt), "d MMMM yyyy", {
                        locale: itLocale,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {breweryEvents.filter((e) => isFuture(new Date(e.eventDate))).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5] flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#F59E0B]" />
            Prossimi Eventi
          </h3>
          <div className="space-y-3">
            {breweryEvents
              .filter((e) => isFuture(new Date(e.eventDate)))
              .slice(0, 4)
              .map((event: any) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-[#1A1D24] rounded-[20px] overflow-hidden border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                >
                  {event.imageUrl && (
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${event.imageUrl})` }}
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <EventCategoryBadge category={event.category} />
                      <div className="text-[10px] font-bold text-[#F59E0B] uppercase">
                        {format(new Date(event.eventDate), "d MMM", { locale: itLocale })}
                      </div>
                    </div>
                    <h4 className="font-bold text-[#151515] dark:text-[#F5F5F5] text-base mb-1.5">{event.title}</h4>
                    <div className="flex items-center text-xs text-[#6B6357] dark:text-[#B7BDC7] gap-1.5 mb-4">
                      <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                      <span>
                        {format(new Date(event.eventDate), "HH:mm", { locale: itLocale })}
                      </span>
                    </div>
                    <EventInterestButton eventId={event.id} type="brewery" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
