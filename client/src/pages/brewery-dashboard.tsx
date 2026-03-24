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
import RichTextEditor from "@/components/rich-text-editor";
import ImageWithFallback from "@/components/image-with-fallback";
import {
  Beer as BeerIcon, Plus, Pencil, Trash2, Factory, MapPin, Loader2,
  Globe, Phone, FileText, Camera, Clock, AlertTriangle, Building,
  Target, Sparkles, Save, X, Share2, ExternalLink, Mail,
  Megaphone, Store, Newspaper, Rocket, Users, QrCode,
  Trophy, Star, Eye, Heart, MessageSquare, TrendingUp, Send
} from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok } from "react-icons/si";
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
            <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
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

interface BreweryDashboardProps {
  adminBreweryId?: number;
}

export default function BreweryDashboard({ adminBreweryId }: BreweryDashboardProps = {}) {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const isAdminMode = !!adminBreweryId;
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (isAdminMode) return;
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
    name: '', description: '', descriptionHtml: '', location: '', region: '', country: '',
    websiteUrl: '', email: '', phone: '', vatNumber: '',
    instagramUrl: '', facebookUrl: '', tiktokUrl: '',
    latitude: '', longitude: '',
  });

  const { data: requestStatus, isLoading: requestLoading } = useQuery<{
    hasRequest: boolean;
    status?: string;
    breweryName?: string;
    adminNotes?: string | null;
    createdAt?: string | null;
  }>({
    queryKey: ["/api/brewery/request-status"],
    enabled: !!user && !isAdminMode,
  });

  // Owner mode: fetch {brewery, beers} from /api/brewery/my
  const { data, isLoading } = useQuery<{ brewery: any; beers: Beer[] }>({
    queryKey: ["/api/brewery/my"],
    enabled: !isAdminMode && !!user && (user as any)?.breweryId != null,
  });

  // Admin mode: fetch brewery and beers separately
  const { data: adminBrewery, isLoading: adminBreweryLoading } = useQuery<any>({
    queryKey: ["/api/breweries", adminBreweryId],
    enabled: isAdminMode && !!adminBreweryId,
  });
  const { data: adminBeers = [], isLoading: adminBeersLoading } = useQuery<Beer[]>({
    queryKey: ["/api/breweries", adminBreweryId, "beers"],
    enabled: isAdminMode && !!adminBreweryId,
  });

  // Unified brewery + beers for the rest of the component
  const brewery: any = isAdminMode ? adminBrewery : data?.brewery;
  const beerList: Beer[] = isAdminMode ? (adminBeers as Beer[]) : (data?.beers ?? []);
  const isLoading2 = isAdminMode ? (adminBreweryLoading || adminBeersLoading) : isLoading;

  const { data: stats } = useQuery<{
    viewsWeek: number;
    viewsAllTime: number;
    topBeers: Array<{ beerId: number; beerName: string; views: number }>;
    totalReviews: number;
    totalFavorites: number;
  }>({
    queryKey: isAdminMode ? ["/api/admin/brewery", adminBreweryId, "stats"] : ["/api/brewery/stats"],
    enabled: isAdminMode ? !!adminBreweryId : (!!user && (user as any)?.breweryId != null),
  });

  const [showReviewsSection, setShowReviewsSection] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingAwards, setEditingAwards] = useState<Array<{name: string; year: number; competition: string; type?: string}>>([]);
  const [newAward, setNewAward] = useState({ name: "", year: new Date().getFullYear(), competition: "", type: "gold" });

  const reviewsQueryKey = isAdminMode
    ? ["/api/admin/brewery", adminBreweryId, "recent-reviews"]
    : ["/api/brewery/recent-reviews"];

  const { data: recentReviewsData } = useQuery<{ reviews: any[] }>({
    queryKey: reviewsQueryKey,
    enabled: showReviewsSection && (isAdminMode ? !!adminBreweryId : (!!user && (user as any)?.breweryId != null)),
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: number; reply: string }) => {
      const url = isAdminMode
        ? `/api/admin/brewery/reviews/${reviewId}/reply`
        : `/api/brewery/reviews/${reviewId}/reply`;
      return apiRequest(url, { method: "PATCH" }, { reply });
    },
    onSuccess: () => {
      toast({ title: "Risposta pubblicata!", description: "La tua risposta è ora visibile nella scheda della birra." });
      setReplyingTo(null);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: reviewsQueryKey });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile pubblicare la risposta", variant: "destructive" });
    },
  });

  const form = useForm<BeerFormValues>({
    resolver: zodResolver(beerFormSchema),
    defaultValues: {
      name: "", style: "", abv: null, ibu: null, description: "", color: "", imageUrl: "",
    },
  });

  const breweryQueryKey = isAdminMode
    ? ["/api/breweries", adminBreweryId]
    : ["/api/brewery/my"];

  const updateProfileMutation = useMutation({
    mutationFn: (values: any) => {
      const url = isAdminMode
        ? `/api/admin/breweries/${adminBreweryId}`
        : "/api/brewery/profile";
      return apiRequest(url, { method: "PATCH" }, values);
    },
    onSuccess: () => {
      toast({ title: "Successo", description: "Profilo birrificio aggiornato" });
      queryClient.invalidateQueries({ queryKey: breweryQueryKey });
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
        const patchUrl = isAdminMode
          ? `/api/admin/breweries/${adminBreweryId}`
          : "/api/brewery/profile";
        await apiRequest(patchUrl, { method: "PATCH" }, updateData);
        queryClient.invalidateQueries({ queryKey: breweryQueryKey });
        toast({ title: "Successo", description: `${type === 'cover' ? 'Copertina' : 'Logo'} aggiornato` });
      } catch {
        toast({ title: "Errore", description: "Impossibile salvare l'immagine", variant: "destructive" });
      }
    }
  }, [toast, isAdminMode, adminBreweryId]);

  const createBeerMutation = useMutation({
    mutationFn: (values: BeerFormValues) => {
      const url = isAdminMode
        ? `/api/admin/brewery/${adminBreweryId}/beers`
        : "/api/brewery/beers";
      return apiRequest(url, { method: "POST" }, values);
    },
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra aggiunta con successo" });
      queryClient.invalidateQueries({ queryKey: breweryQueryKey });
      if (isAdminMode) queryClient.invalidateQueries({ queryKey: ["/api/breweries", adminBreweryId, "beers"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la birra", variant: "destructive" });
    },
  });

  const updateBeerMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: BeerFormValues }) => {
      const url = isAdminMode
        ? `/api/admin/beers/${id}`
        : `/api/brewery/beers/${id}`;
      return apiRequest(url, { method: "PATCH" }, values);
    },
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra aggiornata" });
      queryClient.invalidateQueries({ queryKey: breweryQueryKey });
      if (isAdminMode) queryClient.invalidateQueries({ queryKey: ["/api/breweries", adminBreweryId, "beers"] });
      setDialogOpen(false);
      setEditingBeer(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la birra", variant: "destructive" });
    },
  });

  const deleteBeerMutation = useMutation({
    mutationFn: (id: number) => {
      const url = isAdminMode
        ? `/api/admin/beers/${id}`
        : `/api/brewery/beers/${id}`;
      return apiRequest(url, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra eliminata" });
      queryClient.invalidateQueries({ queryKey: breweryQueryKey });
      if (isAdminMode) queryClient.invalidateQueries({ queryKey: ["/api/breweries", adminBreweryId, "beers"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingBeer(null);
    form.reset({ name: "", style: "", abv: null, ibu: null, description: "", color: "", imageUrl: "" });
    setEditingAwards([]);
    setNewAward({ name: "", year: new Date().getFullYear(), competition: "", type: "gold" });
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
    setEditingAwards((beer as any).awards || []);
    setNewAward({ name: "", year: new Date().getFullYear(), competition: "", type: "gold" });
    setDialogOpen(true);
  };

  const onBeerSubmit = (values: BeerFormValues) => {
    const payload = { ...values, awards: editingAwards };
    if (editingBeer) {
      updateBeerMutation.mutate({ id: editingBeer.id, values: payload as any });
    } else {
      createBeerMutation.mutate(payload as any);
    }
  };

  const openProfileEdit = () => {
    if (brewery) {
      setEditForm({
        name: brewery.name || '',
        description: brewery.description || '',
        descriptionHtml: (brewery as any).descriptionHtml || brewery.description || '',
        location: brewery.location || '', region: brewery.region || '',
        country: brewery.country || '', websiteUrl: brewery.websiteUrl || '',
        email: (brewery as any).email || '',
        phone: brewery.phone || '', vatNumber: brewery.vatNumber || '',
        instagramUrl: (brewery as any).instagramUrl || '',
        facebookUrl: (brewery as any).facebookUrl || '',
        tiktokUrl: (brewery as any).tiktokUrl || '',
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

  if (isLoading2) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-orange-600" />
      </div>
    );
  }

  // `brewery` and `beerList` are already unified above (admin vs owner mode)
  const beers = beerList;

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

        {/* Stats Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Statistiche
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <BreweryStatsCard
              icon={BeerIcon}
              label="Birre in catalogo"
              value={beers.length}
              gradient="from-amber-500 to-orange-600"
            />
            <BreweryStatsCard
              icon={Eye}
              label="Visite 7 giorni"
              value={stats?.viewsWeek ?? '—'}
              gradient="from-sky-500 to-blue-600"
            />
            <BreweryStatsCard
              icon={TrendingUp}
              label="Visite totali"
              value={stats?.viewsAllTime ?? '—'}
              gradient="from-indigo-500 to-purple-600"
            />
            <BreweryStatsCard
              icon={Star}
              label="Recensioni"
              value={stats?.totalReviews ?? '—'}
              gradient="from-yellow-400 to-amber-500"
              onClick={() => setShowReviewsSection(v => !v)}
            />
            <BreweryStatsCard
              icon={Heart}
              label="Preferiti"
              value={stats?.totalFavorites ?? '—'}
              gradient="from-rose-500 to-pink-600"
            />
          </div>
          {stats?.topBeers && stats.topBeers.length > 0 && (
            <div className="mt-3 p-3 glass-card rounded-xl flex flex-wrap gap-3 items-center">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top 30gg:</span>
              {stats.topBeers.map((b, i) => (
                <span key={b.beerId} className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                  <Trophy className={`h-3.5 w-3.5 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`} />
                  {b.beerName}
                  <span className="text-xs text-gray-400">({b.views} views)</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Festival Mode CTA */}
        <Link href="/festival">
          <div className="glass-card rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 mb-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-amber-500 rounded-xl shrink-0">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">Festival Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Crea il taplist QR per il tuo prossimo festival birra</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-amber-500 shrink-0" />
          </div>
        </Link>

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
        {(brewery.websiteUrl || brewery.phone || (brewery as any).email || (brewery as any).instagramUrl || (brewery as any).facebookUrl || (brewery as any).tiktokUrl || brewery.vatNumber) && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {brewery.websiteUrl && (
                  <a href={brewery.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{brewery.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {(brewery as any).email && (
                  <a href={`mailto:${(brewery as any).email}`} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{(brewery as any).email}</span>
                  </a>
                )}
                {brewery.phone && (
                  <a href={`tel:${brewery.phone}`} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{brewery.phone}</span>
                  </a>
                )}
                {(brewery as any).instagramUrl && (
                  <a href={(brewery as any).instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors">
                    <SiInstagram className="w-4 h-4 flex-shrink-0" />
                    <span>Instagram</span>
                  </a>
                )}
                {(brewery as any).facebookUrl && (
                  <a href={(brewery as any).facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <SiFacebook className="w-4 h-4 flex-shrink-0" />
                    <span>Facebook</span>
                  </a>
                )}
                {(brewery as any).tiktokUrl && (
                  <a href={(brewery as any).tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-colors">
                    <SiTiktok className="w-4 h-4 flex-shrink-0" />
                    <span>TikTok</span>
                  </a>
                )}
                {brewery.vatNumber && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400">
                    <FileText className="w-4 h-4 flex-shrink-0" />
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

        {/* Reviews Section */}
        {showReviewsSection && (
          <div className="glass-card border-0 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl">
                  <Star className="h-5 w-5 text-white" />
                </div>
                Recensioni recenti
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReviewsSection(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!recentReviewsData ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : recentReviewsData.reviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nessuna recensione ancora</p>
            ) : (
              <div className="space-y-4">
                {recentReviewsData.reviews.map((review: any) => (
                  <div key={review.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {review.nickname || review.firstName || 'Anonimo'}
                          </span>
                          <span className="text-xs text-gray-500">su</span>
                          <Link href={`/beers/${review.beerId}`}>
                            <span className="text-xs font-medium text-amber-600 hover:underline cursor-pointer">{review.beerName}</span>
                          </Link>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < (review.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        {review.personalNotes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{review.personalNotes}</p>
                        )}
                        {review.ownerReply && (
                          <div className="mt-2 pl-3 border-l-2 border-amber-300 dark:border-amber-700">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">La tua risposta</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{review.ownerReply}</p>
                          </div>
                        )}
                        {replyingTo === review.id ? (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Scrivi la tua risposta..."
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                                disabled={!replyText.trim() || replyMutation.isPending}
                                onClick={() => replyMutation.mutate({ reviewId: review.id, reply: replyText })}
                              >
                                {replyMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                Pubblica
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                                Annulla
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
                            onClick={() => { setReplyingTo(review.id); setReplyText(review.ownerReply || ""); }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {review.ownerReply ? 'Modifica risposta' : 'Rispondi'}
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {review.tastedAt ? new Date(review.tastedAt).toLocaleDateString('it-IT') : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              <label className="text-sm font-medium">
                Descrizione
                <span className="ml-2 text-xs text-gray-400 font-normal">Editor avanzato — testo, grassetto, elenchi, link e molto altro</span>
              </label>
              <RichTextEditor
                content={editForm.descriptionHtml}
                onChange={(html) => setEditForm({ ...editForm, descriptionHtml: html })}
                placeholder="Racconta la storia del tuo birrificio, la filosofia, i premi, le collaborazioni…"
                maxChars={5000}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email pubblica</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="info@birrificio.it"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Partita IVA</label>
                <Input
                  value={editForm.vatNumber}
                  onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                  placeholder="IT..."
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <SiInstagram className="h-4 w-4 text-pink-500" />
                Social Media
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <SiInstagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <Input
                    value={editForm.instagramUrl}
                    onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/tuobirrificio"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SiFacebook className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <Input
                    value={editForm.facebookUrl}
                    onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/tuobirrificio"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SiTiktok className="h-4 w-4 text-gray-800 dark:text-white flex-shrink-0" />
                  <Input
                    value={editForm.tiktokUrl}
                    onChange={(e) => setEditForm({ ...editForm, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@tuobirrificio"
                  />
                </div>
              </div>
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

              {/* Awards editor */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Premi e Riconoscimenti
                </label>
                {editingAwards.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {editingAwards.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                        <Trophy className={`h-3.5 w-3.5 flex-shrink-0 ${a.type === 'gold' ? 'text-yellow-500' : a.type === 'silver' ? 'text-gray-400' : a.type === 'bronze' ? 'text-amber-700' : 'text-blue-500'}`} />
                        <span className="flex-1 truncate">{a.name} — {a.competition} ({a.year})</span>
                        <button type="button" onClick={() => setEditingAwards(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome premio (es. Medaglia d'Oro)"
                    value={newAward.name}
                    onChange={(e) => setNewAward(prev => ({ ...prev, name: e.target.value }))}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Competizione (es. Birra dell'Anno)"
                    value={newAward.competition}
                    onChange={(e) => setNewAward(prev => ({ ...prev, competition: e.target.value }))}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Anno"
                    value={newAward.year}
                    onChange={(e) => setNewAward(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="text-sm"
                  />
                  <Select value={newAward.type} onValueChange={(v) => setNewAward(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Oro</SelectItem>
                      <SelectItem value="silver">Argento</SelectItem>
                      <SelectItem value="bronze">Bronzo</SelectItem>
                      <SelectItem value="special">Speciale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!newAward.name.trim() || !newAward.competition.trim()}
                  onClick={() => {
                    if (newAward.name.trim() && newAward.competition.trim()) {
                      setEditingAwards(prev => [...prev, { ...newAward }]);
                      setNewAward({ name: "", year: new Date().getFullYear(), competition: "", type: "gold" });
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Aggiungi premio
                </Button>
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
