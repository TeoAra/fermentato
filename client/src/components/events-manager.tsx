import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor, { richTextToPlain, isRichContentEmpty } from "@/components/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { format, isPast, isFuture } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Clock,
  EyeOff,
  CalendarDays,
  PartyPopper,
  Share2,
  Music,
  Trophy,
  GlassWater,
  Sparkles,
  Tag,
  Star,
  Users,
} from "lucide-react";

export const EVENT_CATEGORIES: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: any }> = {
  degustazione: { label: "Degustazione", color: "#8B5CF6", bg: "bg-violet-100 text-violet-800", darkBg: "dark:bg-violet-900 dark:text-violet-200", icon: GlassWater },
  live_music: { label: "Live Music", color: "#EC4899", bg: "bg-pink-100 text-pink-800", darkBg: "dark:bg-pink-900 dark:text-pink-200", icon: Music },
  sport: { label: "Sport", color: "#10B981", bg: "bg-emerald-100 text-emerald-800", darkBg: "dark:bg-emerald-900 dark:text-emerald-200", icon: Trophy },
  festa: { label: "Festa", color: "#F59E0B", bg: "bg-amber-100 text-amber-800", darkBg: "dark:bg-amber-900 dark:text-amber-200", icon: PartyPopper },
  altro: { label: "Altro", color: "#6B7280", bg: "bg-stone-100 text-foreground", darkBg: "dark:bg-[#15202B] dark:text-gray-200", icon: Sparkles },
};

interface EventsManagerProps {
  pubId: number;
  pubName?: string;
}

interface EventForm {
  title: string;
  description: string;
  category: string;
  eventDate: string;
  endDate: string;
  imageUrl: string;
  isPublished: boolean;
}

const emptyForm: EventForm = {
  title: "",
  description: "",
  category: "altro",
  eventDate: "",
  endDate: "",
  imageUrl: "",
  isPublished: true,
};

function getShareUrl(pubId: number, eventId: number) {
  return `${window.location.origin}/pub/${pubId}?event=${eventId}`;
}


export function EventCategoryBadge({ category }: { category?: string | null }) {
  const cat = EVENT_CATEGORIES[category || "altro"] || EVENT_CATEGORIES.altro;
  const Icon = cat.icon;
  return (
    <Badge className={`${cat.bg} ${cat.darkBg} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {cat.label}
    </Badge>
  );
}

export function EventShareButtons({ event, pubId, size = "sm" }: { event: any; pubId: number; size?: "sm" | "default" }) {
  const { toast } = useToast();
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  const handleShare = async () => {
    const url = getShareUrl(pubId, event.id);
    const text = `${event.title} - ${format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}`;

    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: event.title, text, url });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast({ title: "Link copiato!" });
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copiato!" });
    }
  };

  return (
    <Button variant="ghost" size="icon" className={`${btnSize} text-muted-foreground dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#1B2735]`} onClick={handleShare} title="Condividi">
      <Share2 className={iconSize} />
    </Button>
  );
}

// ----- EventInterestButton -----
// readOnly=true → usato nel pannello gestione (mostra solo il contatore)
// readOnly=false → usato nel pub-detail / activity (bottone interattivo)
export function EventInterestButton({
  eventId,
  type,
  readOnly = false,
}: {
  eventId: number;
  type: "pub" | "brewery";
  readOnly?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const qKey = [`/api/${type}-events/${eventId}/interest`];

  const { data } = useQuery<{ count: number; userInterested: boolean }>({
    queryKey: qKey,
    queryFn: () => apiRequest(`/api/${type}-events/${eventId}/interest`),
    enabled: !!eventId,
    staleTime: 60_000,
  });

  const count = data?.count ?? 0;
  const interested = data?.userInterested ?? false;

  const mutation = useMutation({
    mutationFn: () => apiRequest(`/api/${type}-events/${eventId}/interest`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  if (readOnly) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-stone-400">
        <Users className="h-3.5 w-3.5" />
        <span>{count} {count === 1 ? "interessato" : "interessati"}</span>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!isAuthenticated) return;
        mutation.mutate();
      }}
      disabled={mutation.isPending || !isAuthenticated}
      title={isAuthenticated ? (interested ? "Non sono più interessato" : "Sono interessato") : "Accedi per segnare il tuo interesse"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none
        ${interested
          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
          : "bg-stone-100 dark:bg-[#1B2735] text-muted-foreground dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#232F3D]"
        }
        ${!isAuthenticated ? "opacity-60 cursor-default" : "cursor-pointer"}
      `}
    >
      <Star className={`h-3.5 w-3.5 ${interested ? "fill-amber-500 text-amber-500" : ""}`} />
      <span>{count > 0 ? count : ""} {interested ? "Interessato" : "Interessato?"}</span>
    </button>
  );
}

export function EventsManager({ pubId, pubName }: EventsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/pubs", String(pubId), "events"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/events`),
    enabled: !!pubId,
  });

  const invalidatePubEvents = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "events"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/pubs/${pubId}/events`, { method: "POST" }, data),
    onSuccess: () => {
      invalidatePubEvents();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Evento creato", description: "L'evento è stato pubblicato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile creare l'evento", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/pubs/${pubId}/events/${id}`, { method: "PATCH" }, data),
    onSuccess: () => {
      invalidatePubEvents();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Evento aggiornato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile aggiornare", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidatePubEvents();
      toast({ title: "Evento eliminato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" }),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openEdit = (event: any) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description || "",
      category: event.category || "altro",
      eventDate: event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      imageUrl: event.imageUrl || "",
      isPublished: event.isPublished ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.eventDate) {
      toast({ title: "Compila i campi obbligatori", description: "Titolo e data sono richiesti", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      pubId,
      eventDate: new Date(form.eventDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      imageUrl: form.imageUrl || null,
      description: form.description || null,
      category: form.category || "altro",
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Un evento è "passato" solo quando la sua fine è prima di adesso.
  // Se end_date manca, lasciamo 12h di tolleranza dopo event_date.
  const isEventPast = (e: any) => {
    const end = e.endDate ? new Date(e.endDate) : new Date(new Date(e.eventDate).getTime() + 12 * 60 * 60 * 1000);
    return end.getTime() < Date.now();
  };
  const upcomingEvents = (events as any[]).filter((e: any) => !isEventPast(e));
  const pastEvents = (events as any[]).filter((e: any) => isEventPast(e));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-purple-600" />
            Eventi
          </h2>
          <p className="text-muted-foreground dark:text-stone-400">Gestisci gli eventi del tuo pub</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="event-title">Titolo *</Label>
                <Input
                  id="event-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Es. Serata degustazione IPA"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <Icon className="h-4 w-4" />
                            <span>{cat.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event-desc">Descrizione</Label>
                <RichTextEditor
                  content={form.description}
                  onChange={(html) => setForm({ ...form, description: html })}
                  placeholder="Descrivi l'evento..."
                  maxChars={3000}
                />
              </div>

              <ImageUpload
                label="Immagine Evento"
                description="Carica un'immagine per l'evento"
                currentImageUrl={form.imageUrl || undefined}
                onImageChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                folder="events"
                aspectRatio="landscape"
                recommendedDimensions="1200x630px"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-date">Data e Ora Inizio *</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="event-end">Data e Ora Fine</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#1B2735] rounded-lg">
                <div>
                  <p className="font-medium text-sm">Pubblicato</p>
                  <p className="text-xs text-muted-foreground">Visibile ai clienti</p>
                </div>
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingId ? "Aggiorna Evento" : "Crea Evento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (events as any[]).length === 0 ? (
        <Card className="p-8 text-center">
          <PartyPopper className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground dark:text-stone-300">Nessun evento</h3>
          <p className="text-sm text-muted-foreground mt-2">Crea il tuo primo evento per attirare clienti!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Prossimi ({upcomingEvents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} pubId={pubId} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground dark:text-stone-400 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Passati ({pastEvents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                {pastEvents.slice(0, 4).map((event: any) => (
                  <EventCard key={event.id} event={event} pubId={pubId} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, pubId, onEdit, onDelete, isPast }: { event: any; pubId: number; onEdit: (e: any) => void; onDelete: (id: number) => void; isPast?: boolean }) {
  const cat = EVENT_CATEGORIES[event.category || "altro"] || EVENT_CATEGORIES.altro;

  return (
    <Card className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      {event.imageUrl && (
        <div className="h-36 bg-cover bg-center relative" style={{ backgroundImage: `url(${event.imageUrl})` }}>
          <div className="absolute top-2 left-2">
            <EventCategoryBadge category={event.category} />
          </div>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {!event.imageUrl && <EventCategoryBadge category={event.category} />}
              <h4 className="font-semibold text-foreground dark:text-white truncate">{event.title}</h4>
              {!event.isPublished && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Bozza
                </Badge>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground dark:text-stone-400 gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
            </div>
            {event.endDate && (
              <div className="flex items-center text-xs text-muted-foreground gap-1 mb-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: it })}</span>
              </div>
            )}
            {!isRichContentEmpty(event.description) && (
              <p className="text-sm text-muted-foreground dark:text-stone-400 line-clamp-2 mb-2">{richTextToPlain(event.description)}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <EventShareButtons event={event} pubId={pubId} size="sm" />
              <EventInterestButton eventId={event.id} type="pub" readOnly />
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => onDelete(event.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// BREWERY EVENTS MANAGER
// ============================================================

interface BreweryEventsManagerProps {
  breweryId: number;
  breweryName?: string;
}

function BreweryEventCard({ event, breweryId, onEdit, onDelete, isPast }: { event: any; breweryId: number; onEdit: (e: any) => void; onDelete: (id: number) => void; isPast?: boolean }) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/brewery/${breweryId}?event=${event.id}`;
    const text = `${event.title} - ${format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copiato!" });
    }
  };

  return (
    <Card className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      {event.imageUrl && (
        <div className="h-36 bg-cover bg-center relative" style={{ backgroundImage: `url(${event.imageUrl})` }}>
          <div className="absolute top-2 left-2"><EventCategoryBadge category={event.category} /></div>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {!event.imageUrl && <EventCategoryBadge category={event.category} />}
              <h4 className="font-semibold text-foreground dark:text-white truncate">{event.title}</h4>
              {!event.isPublished && (
                <Badge variant="secondary" className="text-xs shrink-0"><EyeOff className="h-3 w-3 mr-1" />Bozza</Badge>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground dark:text-stone-400 gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
            </div>
            {event.endDate && (
              <div className="flex items-center text-xs text-muted-foreground gap-1 mb-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: it })}</span>
              </div>
            )}
            {!isRichContentEmpty(event.description) && <p className="text-sm text-muted-foreground dark:text-stone-400 line-clamp-2 mb-2">{richTextToPlain(event.description)}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground dark:text-stone-400" onClick={handleShare} title="Condividi">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <EventInterestButton eventId={event.id} type="brewery" readOnly />
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => onDelete(event.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BreweryEventsManager({ breweryId, breweryName }: BreweryEventsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/breweries", String(breweryId), "events", "all"],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/events/all`),
    enabled: !!breweryId,
  });

  const invalidateBreweryEvents = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/breweries", String(breweryId), "events"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/breweries/${breweryId}/events`, { method: "POST" }, data),
    onSuccess: () => {
      invalidateBreweryEvents();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Evento creato", description: "L'evento è stato pubblicato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile creare l'evento", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/breweries/${breweryId}/events/${id}`, { method: "PATCH" }, data),
    onSuccess: () => {
      invalidateBreweryEvents();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Evento aggiornato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile aggiornare", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/breweries/${breweryId}/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateBreweryEvents();
      toast({ title: "Evento eliminato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" }),
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openEdit = (event: any) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description || "",
      category: event.category || "altro",
      eventDate: event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      imageUrl: event.imageUrl || "",
      isPublished: event.isPublished ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.eventDate) {
      toast({ title: "Compila i campi obbligatori", description: "Titolo e data sono richiesti", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      breweryId,
      eventDate: new Date(form.eventDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      imageUrl: form.imageUrl || null,
      description: form.description || null,
      category: form.category || "altro",
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Un evento è "passato" solo quando la sua fine è prima di adesso.
  // Se end_date manca, lasciamo 12h di tolleranza dopo event_date.
  const isEventPast = (e: any) => {
    const end = e.endDate ? new Date(e.endDate) : new Date(new Date(e.eventDate).getTime() + 12 * 60 * 60 * 1000);
    return end.getTime() < Date.now();
  };
  const upcomingEvents = (events as any[]).filter((e: any) => !isEventPast(e));
  const pastEvents = (events as any[]).filter((e: any) => isEventPast(e));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-purple-600" />
            Eventi del Birrificio
          </h2>
          <p className="text-muted-foreground dark:text-stone-400">Degustazioni, open day, fiere e altro</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="be-title">Titolo *</Label>
                <Input id="be-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Es. Open day — visita al birrificio" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger><SelectValue placeholder="Scegli categoria" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_CATEGORIES).map(([key, cat]) => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <Icon className="h-4 w-4" />
                            <span>{cat.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="be-desc">Descrizione</Label>
                <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Descrivi l'evento..." maxChars={3000} />
              </div>
              <ImageUpload
                label="Immagine Evento"
                description="Carica un'immagine per l'evento"
                currentImageUrl={form.imageUrl || undefined}
                onImageChange={(url) => setForm({ ...form, imageUrl: url || "" })}
                folder="events"
                aspectRatio="landscape"
                recommendedDimensions="1200x630px"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="be-date">Data e Ora Inizio *</Label>
                  <Input id="be-date" type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="be-end">Data e Ora Fine</Label>
                  <Input id="be-end" type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#1B2735] rounded-lg">
                <div>
                  <p className="font-medium text-sm">Pubblicato</p>
                  <p className="text-xs text-muted-foreground">Visibile al pubblico</p>
                </div>
                <Switch checked={form.isPublished} onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })} />
              </div>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full">
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingId ? "Aggiorna Evento" : "Crea Evento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (events as any[]).length === 0 ? (
        <Card className="p-8 text-center">
          <PartyPopper className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground dark:text-stone-300">Nessun evento</h3>
          <p className="text-sm text-muted-foreground mt-2">Crea il primo evento del birrificio: open day, degustazioni, fiere...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Prossimi ({upcomingEvents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event: any) => (
                  <BreweryEventCard key={event.id} event={event} breweryId={breweryId} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground dark:text-stone-400 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Passati ({pastEvents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                {pastEvents.slice(0, 4).map((event: any) => (
                  <BreweryEventCard key={event.id} event={event} breweryId={breweryId} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
