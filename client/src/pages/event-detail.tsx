import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarDays, MapPin, Clock, Beer, Building2, ArrowLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EventCategoryBadge,
  EventInterestButton,
  EventShareButtons,
} from "@/components/events-manager";
import { CommunityPostsSection } from "@/components/social/CommunityPostsSection";

type EventDetail = {
  sourceType: "pub" | "brewery";
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  eventDate: string;
  endDate: string | null;
  imageUrl: string | null;
  venueId: number;
  venueName: string;
  venueSlug: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueLogoUrl: string | null;
  venueLatitude: string | null;
  venueLongitude: string | null;
};

export default function EventDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params.type as "pub" | "brewery";
  const id = parseInt(params.id);

  const validType = type === "pub" || type === "brewery";

  const { data: ev, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["/api/events", type, String(id)],
    queryFn: () => fetch(`/api/events/${type}/${id}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: validType && !Number.isNaN(id),
  });

  if (!validType || Number.isNaN(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card><CardContent className="p-8 text-center">URL evento non valido.</CardContent></Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !ev) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <h3 className="font-semibold">Evento non trovato</h3>
            <p className="text-sm text-muted-foreground mt-1">
              L'evento potrebbe essere stato rimosso o non più pubblicato.
            </p>
            <Link href="/eventi">
              <Button variant="link" className="mt-3">Torna agli eventi</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const start = new Date(ev.eventDate);
  const end = ev.endDate ? new Date(ev.endDate) : null;
  const SourceIcon = ev.sourceType === "brewery" ? Building2 : Beer;
  const venueHref = ev.sourceType === "pub"
    ? `/pub/${ev.venueId}`
    : `/birrificio/${ev.venueId}`;

  const lat = ev.venueLatitude ? parseFloat(ev.venueLatitude) : null;
  const lng = ev.venueLongitude ? parseFloat(ev.venueLongitude) : null;
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : ev.venueAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.venueAddress + " " + (ev.venueCity || ""))}`
      : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0F1820]">
      <Helmet>
        <title>{ev.title} · Eventi · Fermenta.to</title>
        <meta name="description" content={ev.description?.slice(0, 160) || `${ev.title} - ${ev.venueName}`} />
        <meta property="og:title" content={ev.title} />
        {ev.imageUrl && <meta property="og:image" content={ev.imageUrl} />}
      </Helmet>

      {/* Cover */}
      <div className="relative">
        {ev.imageUrl ? (
          <div className="relative h-64 sm:h-80 lg:h-96 bg-stone-200 dark:bg-[#15202B]">
            <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="h-48 sm:h-64 bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500" />
        )}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition tap-scale z-10"
          data-testid="link-back-eventi"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 pb-16">
        <Card className="border-stone-200 dark:border-white/10 shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="gap-1">
                <SourceIcon className="h-3 w-3" />
                {ev.sourceType === "brewery" ? "Birrificio" : "Pub"}
              </Badge>
              {ev.category && <EventCategoryBadge category={ev.category} />}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground dark:text-white">{ev.title}</h1>

            <div className="mt-3 space-y-1.5 text-sm text-foreground/80 dark:text-stone-300">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                <span className="font-medium">
                  {format(start, "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span>
                  {format(start, "HH:mm")}
                  {end && ` - ${format(end, "HH:mm")}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <EventInterestButton eventId={ev.id} type={ev.sourceType} />
              <EventShareButtons event={{ ...ev, eventDate: ev.eventDate }} pubId={ev.venueId} size="default" />
            </div>

            {/* Description */}
            {ev.description && (
              <div className="mt-6 prose prose-stone dark:prose-invert max-w-none">
                <p className="whitespace-pre-line text-foreground dark:text-stone-200">{ev.description}</p>
              </div>
            )}

            {/* Venue card */}
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-white/10">
              <h2 className="text-xs uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400 mb-3">
                {ev.sourceType === "brewery" ? "Birrificio" : "Locale"}
              </h2>
              <Link href={venueHref}>
                <a className="block group" data-testid="link-event-venue">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 transition">
                    {ev.venueLogoUrl ? (
                      <img src={ev.venueLogoUrl} alt={ev.venueName} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <SourceIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                        {ev.venueName}
                      </p>
                      {(ev.venueAddress || ev.venueCity) && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {[ev.venueAddress, ev.venueCity].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
                  </div>
                </a>
              </Link>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full mt-3 gap-2" data-testid="btn-event-directions">
                    <MapPin className="h-4 w-4" />
                    Indicazioni stradali
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Community posts ── */}
        <CommunityPostsSection
          entity={{ kind: "event", id: ev.id, sourceType: ev.sourceType, name: ev.title }}
          title="Post della community su questo evento"
        />
      </div>
    </div>
  );
}
