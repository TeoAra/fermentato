import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Beer } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/image-upload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ImageWithFallback from "@/components/image-with-fallback";
import {
  Beer as BeerIcon, Plus, Pencil, Trash2, Factory, MapPin, Loader2,
  Globe, Phone, FileText, Camera, Clock, AlertTriangle, Building,
  Target, Sparkles, Save, X, Share2, ExternalLink,
  Megaphone, Store, Newspaper, Rocket, Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreweryEventsManager } from "@/components/events-manager";
import { RoleSwitcherBanner } from "@/components/role-switcher-banner";

const beerFormSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  style: z.string().min(1, "Lo stile è obbligatorio"),
  abv: z.coerce.number().min(0).max(100).optional().nullable(),
  ibu: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

type BeerFormValues = z.infer<typeof beerFormSchema>;

function PendingApprovalOverlay({ breweryName, createdAt }: { breweryName: string; createdAt: string | null }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full backdrop-blur-lg bg-white/95 dark:bg-gray-800/95 border-amber-300 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Richiesta in Attesa
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              La tua richiesta per il birrificio <strong>"{breweryName}"</strong> è in attesa di approvazione da parte dell'amministratore.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 inline-block mr-2" />
            Non puoi accedere alla dashboard del birrificio fino all'approvazione. Riceverai una notifica quando la tua richiesta verrà gestita.
          </div>
          {createdAt && (
            <p className="text-xs text-gray-500">
              Richiesta inviata il {new Date(createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Torna alla Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RejectedOverlay({ breweryName, adminNotes }: { breweryName: string; adminNotes: string | null }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full backdrop-blur-lg bg-white/95 dark:bg-gray-800/95 border-red-300 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Richiesta Rifiutata
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              La tua richiesta per il birrificio <strong>"{breweryName}"</strong> è stata rifiutata.
            </p>
          </div>
          {adminNotes && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-800 dark:text-red-200 text-left">
              <strong>Motivazione:</strong> {adminNotes}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Torna alla Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Announcements Manager ──────────────────────────────────────────────────
function AnnouncementsManager({ breweryId }: { breweryId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "news", title: "", content: "", releaseDate: "" });

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/breweries", breweryId, "announcements"],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/announcements`),
    staleTime: 2 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest(`/api/breweries/${breweryId}/announcements`, { method: "POST" }, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", breweryId, "announcements"] });
      setOpen(false);
      setForm({ type: "news", title: "", content: "", releaseDate: "" });
      toast({ title: "Annuncio pubblicato!" });
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (annId: number) => apiRequest(`/api/breweries/${breweryId}/announcements/${annId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/breweries", breweryId, "announcements"] }),
  });

  const typeLabel: Record<string, { label: string; color: string; icon: any }> = {
    news: { label: "Novità", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Newspaper },
    release: { label: "Nuova Birra", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Rocket },
    collab: { label: "Collaborazione", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Users },
  };

  return (
    <div className="glass-card border-0 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          Annunci & Uscite
        </h2>
        <Button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Annuncio
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun annuncio ancora. Pubblica una nuova birra, un evento o una collaborazione!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann: any) => {
            const t = typeLabel[ann.type] ?? typeLabel.news;
            const TIcon = t.icon;
            return (
              <div key={ann.id} className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
                      <TIcon className="w-3 h-3" />{t.label}
                    </span>
                    {ann.releaseDate && (
                      <span className="text-xs text-gray-500">
                        Data uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(ann.createdAt).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{ann.title}</p>
                  {ann.content && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{ann.content}</p>}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(ann.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Annuncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">Novità / News</SelectItem>
                  <SelectItem value="release">Nuova Birra / Uscita Limitata</SelectItem>
                  <SelectItem value="collab">Collaborazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Titolo *</label>
              <Input
                placeholder="Es. Nuova IPA estiva in arrivo!"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea
                placeholder="Racconta qualcosa di più..."
                rows={3}
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            {form.type === "release" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Data di uscita prevista</label>
                <Input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600"
                disabled={!form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  type: form.type,
                  title: form.title,
                  content: form.content || null,
                  releaseDate: form.releaseDate || null,
                  isPublished: true,
                })}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Pubblica
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Distribution Section ────────────────────────────────────────────────────
function DistributionSection({ breweryId }: { breweryId: number }) {
  const { data: pubs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/breweries", breweryId, "distribution"],
    queryFn: () => apiRequest(`/api/breweries/${breweryId}/distribution`),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="glass-card border-0 rounded-2xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
          <Store className="h-6 w-6 text-white" />
        </div>
        Dove Siamo in Spina
        {pubs.length > 0 && (
          <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">
            — {pubs.length} {pubs.length === 1 ? "pub" : "pub"} in Italia
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : pubs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun pub ha ancora le tue birre in tap list.</p>
          <p className="text-xs mt-1">Quando un Publican aggiunge una tua birra, apparirà qui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pubs.map((pub: any) => (
            <Link key={pub.id} href={`/pub/${pub.id}`}>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer group">
                {pub.logo_url ? (
                  <img src={pub.logo_url} alt={pub.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">{pub.name}</p>
                  {(pub.city || pub.region) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {[pub.city, pub.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {pub.beer_count} {Number(pub.beer_count) === 1 ? "birra" : "birre"} in spina
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const BreweryStatsCard = ({ icon: Icon, value, label, gradient, onClick }: any) => (
  <div
    className={`glass-card rounded-xl p-4 hover:scale-105 transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

export default function BreweryDashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'success') {
      setTimeout(() => {
        toast({
          title: "Email verificata!",
          description: "Benvenuto su Fermenta.to. La tua richiesta di registrazione come birrificio è in attesa di approvazione.",
        });
      }, 800);
      window.history.replaceState({}, '', '/brewery-dashboard');
    }
  }, []);

  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [showAllBeers, setShowAllBeers] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', description: '', location: '', region: '', country: '',
    websiteUrl: '', phone: '', vatNumber: '', latitude: '', longitude: '',
  });

  const { data: requestStatus, isLoading: requestLoading } = useQuery<{
    hasRequest: boolean;
    status?: string;
    breweryName?: string;
    adminNotes?: string | null;
    createdAt?: string | null;
  }>({
    queryKey: ["/api/brewery/request-status"],
    enabled: !!user,
  });

  const { data, isLoading } = useQuery<{ brewery: any; beers: Beer[] }>({
    queryKey: ["/api/brewery/my"],
    enabled: !!user && (user as any)?.breweryId != null,
  });

  const form = useForm<BeerFormValues>({
    resolver: zodResolver(beerFormSchema),
    defaultValues: {
      name: "", style: "", abv: null, ibu: null, description: "", color: "", imageUrl: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: any) =>
      apiRequest("/api/brewery/profile", { method: "PATCH" }, values),
    onSuccess: () => {
      toast({ title: "Successo", description: "Profilo birrificio aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
      setIsEditingProfile(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare il profilo", variant: "destructive" });
    },
  });

  const handleImageUpload = useCallback(async (url: string | null, type: 'logo' | 'cover') => {
    if (url) {
      try {
        const updateData = type === 'cover' ? { coverImageUrl: url } : { logoUrl: url };
        await apiRequest("/api/brewery/profile", { method: "PATCH" }, updateData);
        queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
        toast({ title: "Successo", description: `${type === 'cover' ? 'Copertina' : 'Logo'} aggiornato` });
      } catch {
        toast({ title: "Errore", description: "Impossibile salvare l'immagine", variant: "destructive" });
      }
    }
  }, [toast]);

  const createBeerMutation = useMutation({
    mutationFn: (values: BeerFormValues) =>
      apiRequest("/api/brewery/beers", { method: "POST" }, values),
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra aggiunta con successo" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la birra", variant: "destructive" });
    },
  });

  const updateBeerMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: BeerFormValues }) =>
      apiRequest(`/api/brewery/beers/${id}`, { method: "PATCH" }, values),
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra aggiornata" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
      setDialogOpen(false);
      setEditingBeer(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la birra", variant: "destructive" });
    },
  });

  const deleteBeerMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/brewery/beers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra eliminata" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingBeer(null);
    form.reset({ name: "", style: "", abv: null, ibu: null, description: "", color: "", imageUrl: "" });
    setDialogOpen(true);
  };

  const openEditBeerDialog = (beer: Beer) => {
    setEditingBeer(beer);
    form.reset({
      name: beer.name, style: beer.style,
      abv: beer.abv ? parseFloat(beer.abv) : null,
      ibu: beer.ibu ?? null, description: beer.description ?? "",
      color: beer.color ?? "", imageUrl: beer.imageUrl ?? "",
    });
    setDialogOpen(true);
  };

  const onBeerSubmit = (values: BeerFormValues) => {
    if (editingBeer) {
      updateBeerMutation.mutate({ id: editingBeer.id, values });
    } else {
      createBeerMutation.mutate(values);
    }
  };

  const openProfileEdit = () => {
    if (brewery) {
      setEditForm({
        name: brewery.name || '', description: brewery.description || '',
        location: brewery.location || '', region: brewery.region || '',
        country: brewery.country || '', websiteUrl: brewery.websiteUrl || '',
        phone: brewery.phone || '', vatNumber: brewery.vatNumber || '',
        latitude: brewery.latitude || '', longitude: brewery.longitude || '',
      });
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  if (authLoading || requestLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-orange-600" />
      </div>
    );
  }

  if (requestStatus?.hasRequest && requestStatus.status === 'pending') {
    return <PendingApprovalOverlay breweryName={requestStatus.breweryName || ''} createdAt={requestStatus.createdAt || null} />;
  }

  if (requestStatus?.hasRequest && requestStatus.status === 'rejected') {
    return <RejectedOverlay breweryName={requestStatus.breweryName || ''} adminNotes={requestStatus.adminNotes || null} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-orange-600" />
      </div>
    );
  }

  const brewery = data?.brewery;
  const beers = data?.beers ?? [];

  if (!brewery) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <Card className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-orange-200/50">
          <CardContent className="pt-6 text-center">
            <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Nessun Birrificio Associato</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Non hai ancora un birrificio associato al tuo account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayedBeers = showAllBeers ? beers : beers.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-amber-950 dark:to-orange-950">

      {/* Hero Section - same as public page */}
      <div className="relative">
        <div className="relative h-96 md:h-[500px] overflow-hidden">
          <img
            src={brewery.coverImageUrl || "/brewery-cover.jpg"}
            alt={`${brewery.name} - Copertina`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>

          {/* Edit cover button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingImages(true)}
            className="absolute top-4 right-4 backdrop-blur-md bg-white/20 border-white/40 text-white hover:bg-white/30 z-10"
          >
            <Camera className="h-4 w-4 mr-2" />
            Modifica Immagini
          </Button>

          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12">
              <div className="glass-card rounded-2xl p-8 backdrop-blur-md bg-white/10 border border-white/20">
                <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
                  <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 w-full md:w-auto justify-center md:justify-start">
                    {brewery.logoUrl ? (
                      <Avatar className="h-20 w-20 ring-4 ring-white/30 flex-shrink-0">
                        <AvatarImage src={brewery.logoUrl} alt={`${brewery.name} - Logo`} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                          {brewery.name?.[0] || 'B'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-20 w-20 rounded-full ring-4 ring-white/30 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <Factory className="h-10 w-10 text-white" />
                      </div>
                    )}
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl text-white mb-4 font-bold leading-tight">
                        {brewery.name}
                      </h1>
                      <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                        {brewery.location && (
                          <div className="flex items-center text-white/90 backdrop-blur-sm bg-white/10 rounded-lg px-4 py-2">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="text-sm font-medium">{brewery.location} {brewery.region && `(${brewery.region})`}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner action buttons */}
                  <div className="flex items-center justify-center md:justify-end space-x-2 sm:space-x-3 w-full md:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openProfileEdit}
                      className="backdrop-blur-md bg-amber-500/30 border-amber-300/50 text-white hover:bg-amber-500/50 hover:border-amber-300/70 transition-all duration-300 font-medium shadow-lg min-h-[44px]"
                    >
                      <Pencil className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Modifica Profilo</span>
                    </Button>
                    <Link href={`/brewery/${brewery.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="backdrop-blur-md bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 transition-all duration-300 font-medium shadow-lg min-h-[44px]"
                      >
                        <ExternalLink className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Vedi Pagina Pubblica</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RoleSwitcherBanner currentView="brewery" />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <BreweryStatsCard
            icon={BeerIcon}
            label="Birre"
            value={beers.length}
            gradient="from-amber-500 to-orange-600"
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brewery.name + ' ' + brewery.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <BreweryStatsCard
              icon={MapPin}
              label="Cerca su Maps"
              value={brewery.location || 'N/D'}
              gradient="from-blue-500 to-indigo-600"
            />
          </a>
        </div>

        {/* Description */}
        {brewery.description && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg mr-3">
                  <Building className="h-5 w-5 text-white" />
                </div>
                Il Birrificio
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {brewery.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info section with contact details */}
        {(brewery.websiteUrl || brewery.phone || brewery.vatNumber) && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {brewery.websiteUrl && (
                  <a href={brewery.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-amber-600 hover:underline">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{brewery.websiteUrl}</span>
                  </a>
                )}
                {brewery.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{brewery.phone}</span>
                  </div>
                )}
                {brewery.vatNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>P.IVA: {brewery.vatNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Beers Section - same layout as public page, with edit buttons */}
        <div className="glass-card border-0 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <BeerIcon className="h-6 w-6 text-white" />
              </div>
              Birre ({beers.length})
            </h2>
            <Button
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Birra
            </Button>
          </div>

          {beers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <BeerIcon className="h-10 w-10 text-gray-400 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nessuna birra ancora
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aggiungi la prima birra al tuo catalogo!
              </p>
              <Button onClick={openCreateDialog} className="bg-gradient-to-r from-amber-500 to-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Aggiungi la prima birra
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedBeers.map((beer: Beer) => (
                  <Card key={beer.id} className="glass-card border-0 h-full hover:scale-[1.02] transition-all duration-300 group relative">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4 mb-4">
                        <ImageWithFallback
                          src={beer?.imageUrl}
                          alt={beer?.name}
                          imageType="beer"
                          containerClassName="w-16 h-16 rounded-xl"
                          className="w-16 h-16 object-cover rounded-xl"
                          iconSize="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                            {beer.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {beer.style}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {beer.abv && (
                          <Badge variant="outline" className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 text-orange-800 dark:text-orange-200">
                            <Target className="h-3 w-3 mr-1" />
                            {beer.abv}% ABV
                          </Badge>
                        )}
                        {beer.ibu && (
                          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 text-blue-800 dark:text-blue-200">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {beer.ibu} IBU
                          </Badge>
                        )}
                        {beer.isBottled && (
                          <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 text-green-800 dark:text-green-200">
                            In bottiglia
                          </Badge>
                        )}
                      </div>

                      {beer.description && (
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {beer.description}
                        </p>
                      )}

                      {/* Edit/Delete buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditBeerDialog(beer)}
                          className="flex-1"
                        >
                          <Pencil className="w-3 h-3 mr-2" />
                          Modifica
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Eliminare "${beer.name}"?`)) {
                              deleteBeerMutation.mutate(beer.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          disabled={deleteBeerMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {beers.length > 6 && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllBeers(!showAllBeers)}
                    className="bg-white/60 dark:bg-gray-800/60"
                  >
                    {showAllBeers ? 'Mostra meno' : `Mostra tutte (${beers.length})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Events Section */}
        <div className="glass-card border-0 rounded-2xl p-6 mb-8">
          <BreweryEventsManager breweryId={brewery.id} breweryName={brewery.name} />
        </div>

        {/* ─── Annunci & Release ──────────────────────────────────────────────── */}
        <AnnouncementsManager breweryId={brewery.id} />

        {/* ─── Mappa Distribuzione ─────────────────────────────────────────────── */}
        <DistributionSection breweryId={brewery.id} />

        {/* Website Link */}
        {brewery.websiteUrl && (
          <div className="glass-card border-0 rounded-xl p-6 text-center">
            <a
              href={brewery.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 font-medium"
            >
              <Globe className="h-5 w-5 mr-2" />
              Visita il sito web
            </a>
          </div>
        )}
      </main>

      {/* Profile Edit Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile} modal={false}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Profilo Birrificio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Birrificio</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Posizione</label>
                <AddressAutocomplete
                  value={editForm.location}
                  countryRestriction={null}
                  placeholder="Cerca indirizzo..."
                  onAddressSelect={(details) => {
                    setEditForm({
                      ...editForm,
                      location: details.formattedAddress,
                      region: details.region,
                      country: details.country,
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                placeholder="Racconta la storia del tuo birrificio..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sito Web</label>
                <Input
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefono</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+39..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Partita IVA</label>
              <Input
                value={editForm.vatNumber}
                onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                placeholder="IT..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveProfile}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salva Modifiche
              </Button>
              <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Edit Dialog */}
      <Dialog open={isEditingImages} onOpenChange={setIsEditingImages}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Modifica Immagini
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <ImageUpload
              label="Logo Birrificio"
              description="Immagine quadrata consigliata"
              currentImageUrl={brewery?.logoUrl}
              onImageChange={(url) => handleImageUpload(url, 'logo')}
              folder="brewery-logos"
              aspectRatio="square"
              recommendedDimensions="400x400px"
            />
            <ImageUpload
              label="Immagine di Copertina"
              description="Formato orizzontale consigliato"
              currentImageUrl={brewery?.coverImageUrl}
              onImageChange={(url) => handleImageUpload(url, 'cover')}
              folder="brewery-covers"
              aspectRatio="landscape"
              recommendedDimensions="1200x400px"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Beer Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBeer ? "Modifica Birra" : "Nuova Birra"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onBeerSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Nome della birra" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stile *</FormLabel>
                    <FormControl><Input placeholder="Es. IPA, Lager, Stout..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="abv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABV (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="5.0"
                          {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ibu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBU</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="40"
                          {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore</FormLabel>
                    <FormControl><Input placeholder="Es. Dorata, Ambrata, Scura..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl><Textarea placeholder="Descrivi la birra..." rows={3} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Immagine Birra</label>
                <ImageUpload
                  label="Immagine Birra"
                  description="Immagine principale della birra"
                  currentImageUrl={form.watch("imageUrl") || undefined}
                  onImageChange={(url) => form.setValue("imageUrl", url || "")}
                  folder="beer-images"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="400x400px"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  disabled={createBeerMutation.isPending || updateBeerMutation.isPending}
                >
                  {(createBeerMutation.isPending || updateBeerMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBeer ? "Salva Modifiche" : "Aggiungi Birra"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
