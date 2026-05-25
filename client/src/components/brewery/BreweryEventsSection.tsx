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
    <>
      {announcements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Annunci
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((announcement: any) => (
              <div
                key={announcement.id}
                className="bg-white dark:bg-card rounded-2xl border border-[#E8DED1] dark:border-white/[0.06]/20 p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-[#0B0D10]/30 flex items-center justify-center text-primary shrink-0">
                    <Newspaper className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">{announcement.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {announcement.content}
                    </p>
                    <p className="text-[10px] font-bold text-primary pt-2 uppercase tracking-wider">
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

      {breweryEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Prossimi Eventi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breweryEvents
              .filter((e) => isFuture(new Date(e.eventDate)))
              .slice(0, 4)
              .map((event: any) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-card rounded-3xl overflow-hidden border border-[#E8DED1] dark:border-white/[0.06]/20 shadow-sm group"
                >
                  {event.imageUrl && (
                    <div
                      className="h-40 bg-cover bg-center transition-transform group-hover:scale-105 duration-500"
                      style={{ backgroundImage: `url(${event.imageUrl})` }}
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <EventCategoryBadge category={event.category} />
                      <div className="text-[10px] font-bold text-primary uppercase">
                        {format(new Date(event.eventDate), "d MMM", { locale: itLocale })}
                      </div>
                    </div>
                    <h4 className="font-bold text-foreground text-lg mb-2">{event.title}</h4>
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5 mb-4">
                      <Clock className="h-3.5 w-3.5 text-primary" />
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
    </>
  );
}
