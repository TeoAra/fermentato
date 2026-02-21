import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/image-upload";
import { format, isPast, isFuture } from "date-fns";
import { it } from "date-fns/locale";
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
  Link as LinkIcon,
  Music,
  Trophy,
  GlassWater,
  Sparkles,
  Tag,
} from "lucide-react";
import { SiFacebook, SiX, SiWhatsapp } from "react-icons/si";

export const EVENT_CATEGORIES: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: any }> = {
  degustazione: { label: "Degustazione", color: "#8B5CF6", bg: "bg-violet-100 text-violet-800", darkBg: "dark:bg-violet-900 dark:text-violet-200", icon: GlassWater },
  live_music: { label: "Live Music", color: "#EC4899", bg: "bg-pink-100 text-pink-800", darkBg: "dark:bg-pink-900 dark:text-pink-200", icon: Music },
  sport: { label: "Sport", color: "#10B981", bg: "bg-emerald-100 text-emerald-800", darkBg: "dark:bg-emerald-900 dark:text-emerald-200", icon: Trophy },
  festa: { label: "Festa", color: "#F59E0B", bg: "bg-amber-100 text-amber-800", darkBg: "dark:bg-amber-900 dark:text-amber-200", icon: PartyPopper },
  altro: { label: "Altro", color: "#6B7280", bg: "bg-gray-100 text-gray-800", darkBg: "dark:bg-gray-900 dark:text-gray-200", icon: Sparkles },
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

function shareEvent(platform: string, event: any, pubId: number) {
  const url = getShareUrl(pubId, event.id);
  const text = `${event.title} - ${format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}`;

  switch (platform) {
    case "facebook":
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
      break;
    case "twitter":
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
      break;
    case "whatsapp":
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
      break;
    case "copy":
      navigator.clipboard.writeText(url);
      break;
  }
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

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className={`${btnSize} text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950`} onClick={() => shareEvent("facebook", event, pubId)} title="Facebook">
        <SiFacebook className={iconSize} />
      </Button>
      <Button variant="ghost" size="icon" className={`${btnSize} text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800`} onClick={() => shareEvent("twitter", event, pubId)} title="X (Twitter)">
        <SiX className={iconSize} />
      </Button>
      <Button variant="ghost" size="icon" className={`${btnSize} text-green-600 hover:bg-green-50 dark:hover:bg-green-950`} onClick={() => shareEvent("whatsapp", event, pubId)} title="WhatsApp">
        <SiWhatsapp className={iconSize} />
      </Button>
      <Button variant="ghost" size="icon" className={`${btnSize} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800`} onClick={() => { shareEvent("copy", event, pubId); toast({ title: "Link copiato!" }); }} title="Copia link">
        <LinkIcon className={iconSize} />
      </Button>
    </div>
  );
}

export function EventsManager({ pubId, pubName }: EventsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/pubs", pubId, "events"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/events`),
    enabled: !!pubId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/pubs/${pubId}/events`, { method: "POST" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "events"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "events"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Evento aggiornato" });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile aggiornare", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/pubs/${pubId}/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", pubId, "events"] });
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

  const upcomingEvents = (events as any[]).filter((e: any) => isFuture(new Date(e.eventDate)));
  const pastEvents = (events as any[]).filter((e: any) => isPast(new Date(e.eventDate)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-purple-600" />
            Eventi
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Gestisci gli eventi del tuo pub</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <Textarea
                  id="event-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrivi l'evento..."
                  rows={3}
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

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Pubblicato</p>
                  <p className="text-xs text-gray-500">Visibile ai clienti</p>
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
          <PartyPopper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Nessun evento</h3>
          <p className="text-sm text-gray-500 mt-2">Crea il tuo primo evento per attirare clienti!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
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
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
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
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">{event.title}</h4>
              {!event.isPublished && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Bozza
                </Badge>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
            </div>
            {event.endDate && (
              <div className="flex items-center text-xs text-gray-500 gap-1 mb-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: it })}</span>
              </div>
            )}
            {event.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{event.description}</p>
            )}
            <EventShareButtons event={event} pubId={pubId} size="sm" />
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
