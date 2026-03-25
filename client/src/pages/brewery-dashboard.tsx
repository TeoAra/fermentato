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
      <Card className="max-w-md w-full bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-stone-50 dark:bg-stone-900/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Richiesta in Attesa
            </h2>
            <p className="text-muted-foreground text-sm">
              La tua richiesta per il birrificio <strong>"{breweryName}"</strong> è in attesa di approvazione da parte dell'amministratore.
            </p>
          </div>
          <div className="bg-stone-50 dark:bg-orange-900/20 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-200">
            <AlertTriangle className="w-5 h-5 inline-block mr-2" />
            Non puoi accedere alla dashboard del birrificio fino all'approvazione. Riceverai una notifica quando la tua richiesta verrà gestita.
          </div>
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              Richiesta inviata il {new Date(createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl"
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
      <Card className="max-w-md w-full bg-white dark:bg-[hsl(25,14%,10%)] border border-red-100 dark:border-red-900/30 rounded-2xl shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Richiesta Rifiutata
            </h2>
            <p className="text-muted-foreground text-sm">
              La tua richiesta per il birrificio <strong>"{breweryName}"</strong> è stata rifiutata.
            </p>
          </div>
          {adminNotes && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-sm text-red-800 dark:text-red-200 text-left">
              <strong>Motivazione:</strong> {adminNotes}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl"
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
    news: { label: "Novità", color: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300", icon: Newspaper },
    release: { label: "Nuova Birra", color: "bg-stone-50 text-primary border-stone-200 dark:bg-stone-900/30 dark:text-orange-400", icon: Rocket },
    collab: { label: "Collaborazione", color: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300", icon: Users },
  };

  return (
    <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <div className="p-2 bg-primary rounded-xl mr-3 shadow-sm">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          Annunci & Uscite
        </h2>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Annuncio
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-stone-50/20 animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
          <p className="text-sm text-left sm:text-center">Nessun annuncio ancora. Pubblica una nuova birra, un evento o una collaborazione!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann: any) => {
            const t = typeLabel[ann.type] ?? typeLabel.news;
            const TIcon = t.icon;
            return (
              <div key={ann.id} className="flex gap-4 p-4 rounded-xl border border-stone-100 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] hover:bg-stone-50/50 dark:hover:bg-stone-900/10 transition-colors">
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${t.color}`}>
                      <TIcon className="w-3 h-3" />{t.label}
                    </span>
                    {ann.releaseDate && (
                      <span className="text-xs text-muted-foreground">
                        Data uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(ann.createdAt).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{ann.title}</p>
                  {ann.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(ann.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-1"
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
        <DialogContent className="max-w-md rounded-2xl border-stone-100 dark:border-[hsl(25,12%,16%)]">
          <DialogHeader>
            <DialogTitle>Nuovo Annuncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1 text-left">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="border-stone-200 rounded-xl focus:ring-primary/20"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="news">Novità / News</SelectItem>
                  <SelectItem value="release">Nuova Birra / Uscita Limitata</SelectItem>
                  <SelectItem value="collab">Collaborazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 text-left">
              <label className="text-sm font-medium">Titolo *</label>
              <Input
                placeholder="Es. Nuova IPA estiva in arrivo!"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="border-stone-200 dark:border-[hsl(25,12%,20%)] rounded-xl focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea
                placeholder="Racconta qualcosa di più..."
                rows={3}
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                className="border-stone-200 dark:border-[hsl(25,12%,20%)] rounded-xl focus-visible:ring-primary/20"
              />
            </div>
            {form.type === "release" && (
              <div className="space-y-1 text-left">
                <label className="text-sm font-medium">Data di uscita prevista</label>
                <Input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                  className="border-stone-200 dark:border-[hsl(25,12%,20%)] rounded-xl focus-visible:ring-primary/20"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-sm"
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
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl"
              >
                Annulla
              </Button>
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
    <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold text-foreground flex items-center mb-6">
        <div className="p-2 bg-primary rounded-xl mr-3 shadow-sm">
          <Store className="h-6 w-6 text-white" />
        </div>
        Dove Siamo in Spina
        {pubs.length > 0 && (
          <span className="ml-3 text-base font-normal text-muted-foreground">
            — {pubs.length} {pubs.length === 1 ? "pub" : "pub"} in Italia
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-stone-50/20 animate-pulse" />)}
        </div>
      ) : pubs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
          <p className="text-sm">Nessun pub ha ancora le tue birre in tap list.</p>
          <p className="text-xs mt-1">Quando un Publican aggiunge una tua birra, apparirà qui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pubs.map((pub: any) => (
            <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] hover:bg-stone-50/50 dark:hover:bg-stone-900/10 transition-colors cursor-pointer group">
                {pub.logo_url ? (
                  <img src={pub.logo_url} alt={pub.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-stone-200 dark:border-[hsl(25,12%,20%)]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary dark:group-hover:text-orange-400">{pub.name}</p>
                  {(pub.city || pub.region) && (
                    <p className="text-xs text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 inline mr-0.5 text-primary" />
                      {[pub.city, pub.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-primary dark:text-orange-400 font-medium mt-0.5">
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

const BreweryStatsCard = ({ icon: Icon, value, label, colorClass, onClick }: any) => (
  <div
    className={`bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-4 hover:scale-[1.02] transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className={`p-3 rounded-xl bg-stone-50 dark:bg-stone-900/30 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`h-5 w-5 ${colorClass || 'text-primary'}`} />
      </div>
      <div className="text-left">
        <p className="text-2xl font-bold text-primary dark:text-orange-400">{value}</p>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
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
        toast({ title: "Errore", description: "Impossibile aggiornare l'immagine", variant: "destructive" });
      }
    }
  }, [breweryQueryKey, adminBreweryId, isAdminMode, toast]);

  const createBeerMutation = useMutation({
    mutationFn: (values: BeerFormValues) => {
      const url = isAdminMode
        ? `/api/admin/breweries/${adminBreweryId}/beers`
        : "/api/brewery/beers";
      return apiRequest(url, { method: "POST" }, values);
    },
    onSuccess: () => {
      toast({ title: "Successo", description: "Birra aggiunta al catalogo" });
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  // `brewery` and `beerList` are already unified above (admin vs owner mode)
  const beers = beerList;

  if (!brewery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-200 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-stone-50 dark:bg-stone-900/30 flex items-center justify-center mb-6">
              <Factory className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Nessun Birrificio Associato</h2>
            <p className="text-muted-foreground text-sm">
              Non hai ancora un birrificio associato al tuo account.
            </p>
            <Button
              className="mt-6 w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-sm"
              onClick={() => window.location.href = '/'}
            >
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayedBeers = showAllBeers ? beers : beers.slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-12">
      {!isAdminMode && <RoleSwitcherBanner />}
      
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[hsl(25,14%,10%)] border-b border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-xl cursor-pointer hover:scale-105 transition-transform">
                <BeerIcon className="h-6 w-6 text-primary" />
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight text-left">Dashboard Birrificio</h1>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                {brewery.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdminMode && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl h-9"
                onClick={() => window.location.href = `/brewery/${brewery.slug || brewery.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Vedi Pubblico
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl h-9"
              onClick={() => {
                const url = `${window.location.origin}/brewery/${brewery.slug || brewery.id}`;
                if (navigator.share) {
                  navigator.share({ title: brewery.name, url });
                } else {
                  navigator.clipboard.writeText(url);
                  toast({ title: "Link copiato!" });
                }
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Hero / Cover Section */}
        <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-8 border border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm group">
          <ImageWithFallback
            src={brewery.coverImageUrl || "/brewery-cover.jpg"}
            alt={brewery.name}
            className="w-full h-full object-cover"
            fallbackType="brewery"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white dark:border-[hsl(25,14%,10%)] shadow-lg rounded-2xl">
                  <AvatarImage src={brewery.logoUrl} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-xl rounded-2xl">
                    {brewery.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mb-1 text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">{brewery.name}</h2>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {brewery.city || brewery.location || 'Posizione non impostata'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mb-1">
              <Button 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/20 rounded-xl h-9"
                onClick={() => setIsEditingImages(true)}
              >
                <Camera className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Foto</span>
              </Button>
              <Button 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/20 rounded-xl h-9"
                onClick={openProfileEdit}
              >
                <Pencil className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Profilo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <BreweryStatsCard
            icon={BeerIcon}
            value={beers.length}
            label="Birre"
            colorClass="text-primary"
          />
          <BreweryStatsCard
            icon={Eye}
            value={stats?.viewsWeek ?? '—'}
            label="Visite 7g"
            colorClass="text-primary"
          />
          <BreweryStatsCard
            icon={TrendingUp}
            value={stats?.viewsAllTime ?? '—'}
            label="Visite Totali"
            colorClass="text-primary"
          />
          <BreweryStatsCard
            icon={Star}
            value={stats?.totalReviews ?? '—'}
            label="Recensioni"
            colorClass="text-primary"
            onClick={() => setShowReviewsSection(v => !v)}
          />
          <BreweryStatsCard
            icon={Heart}
            value={stats?.totalFavorites ?? '—'}
            label="Preferiti"
            colorClass="text-primary"
          />
        </div>

        {/* Info section with contact details */}
        <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Il Birrificio</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrizione</p>
              {brewery.descriptionHtml ? (
                <div 
                  className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: brewery.descriptionHtml }}
                />
              ) : brewery.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{brewery.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nessuna descrizione impostata.</p>
              )}

              <div className="flex gap-4 mt-6">
                {(brewery as any).instagramUrl && (
                  <a href={(brewery as any).instagramUrl} target="_blank" rel="noopener" className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-xl text-primary hover:scale-110 transition-transform">
                    <SiInstagram className="h-5 w-5" />
                  </a>
                )}
                {(brewery as any).facebookUrl && (
                  <a href={(brewery as any).facebookUrl} target="_blank" rel="noopener" className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-xl text-primary hover:scale-110 transition-transform">
                    <SiFacebook className="h-5 w-5" />
                  </a>
                )}
                {(brewery as any).tiktokUrl && (
                  <a href={(brewery as any).tiktokUrl} target="_blank" rel="noopener" className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-xl text-primary hover:scale-110 transition-transform">
                    <SiTiktok className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Contatti</p>
              <div className="space-y-3">
                {brewery.websiteUrl && (
                  <a href={brewery.websiteUrl} target="_blank" rel="noopener" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group">
                    <div className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-lg group-hover:bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate">{brewery.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {(brewery as any).email && (
                  <a href={`mailto:${(brewery as any).email}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group">
                    <div className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-lg group-hover:bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate">{(brewery as any).email}</span>
                  </a>
                )}
                {brewery.phone && (
                  <a href={`tel:${brewery.phone}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group">
                    <div className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-lg group-hover:bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <span>{brewery.phone}</span>
                  </a>
                )}
                {brewery.vatNumber && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="p-2 bg-stone-50 dark:bg-stone-900/30 rounded-lg">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span>P.IVA: {brewery.vatNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Festival Mode CTA */}
        <Link href="/festival">
          <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-primary/20 dark:border-primary/20 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/10 dark:to-[hsl(25,14%,10%)] rounded-2xl p-5 mb-8 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-primary rounded-xl shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-foreground">Festival Mode</p>
                <p className="text-sm text-muted-foreground truncate">Crea il taplist QR per il tuo prossimo festival birra</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-primary shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        {/* Beers Section */}
        <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-xl shadow-sm">
                <BeerIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Catalogo Birre</h2>
              <Badge variant="secondary" className="bg-stone-50 text-orange-700 border-stone-200 ml-2">
                {beers.length}
              </Badge>
            </div>
            <Button
              onClick={openCreateDialog}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Birra
            </Button>
          </div>

          {beers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-stone-200 dark:border-stone-700/30 rounded-3xl">
              <div className="w-20 h-20 bg-stone-50 dark:bg-stone-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <BeerIcon className="h-10 w-10 text-primary opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Nessuna birra ancora</h3>
              <p className="text-muted-foreground mb-6">Aggiungi la prima birra al tuo catalogo!</p>
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8">
                <Plus className="w-4 h-4 mr-2" /> Inizia Ora
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedBeers.map((beer: Beer) => (
                  <Card key={beer.id} className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] hover:border-primary/30 transition-all duration-300 rounded-2xl shadow-sm group overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4 text-left">
                        <ImageWithFallback
                          src={beer?.imageUrl}
                          alt={beer?.name}
                          imageType="beer"
                          containerClassName="w-16 h-16 rounded-xl border border-stone-200 dark:border-stone-700/30"
                          className="w-16 h-16 object-cover rounded-xl group-hover:scale-110 transition-transform duration-500"
                          iconSize="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {beer.name}
                          </h3>
                          <p className="text-xs font-medium text-primary dark:text-orange-400">
                            {beer.style}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {beer.abv && (
                              <span className="text-[10px] font-bold bg-stone-50 text-orange-700 px-1.5 py-0.5 rounded border border-stone-200">
                                {beer.abv}% ABV
                              </span>
                            )}
                            {beer.ibu && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                {beer.ibu} IBU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {beer.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem] mb-4 text-left">
                          {beer.description}
                        </p>
                      )}

                      {/* Edit/Delete buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-stone-100 dark:border-stone-700/30">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditBeerDialog(beer)}
                          className="flex-1 border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" />
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
                          className="text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950 border-stone-200 dark:border-[hsl(25,12%,20%)] rounded-xl"
                          disabled={deleteBeerMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {beers.length > 6 && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllBeers(!showAllBeers)}
                    className="border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl bg-white dark:bg-transparent"
                  >
                    {showAllBeers ? 'Mostra Meno' : `Mostra Tutte (${beers.length})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
          <BreweryEventsManager breweryId={brewery.id} breweryName={brewery.name} />
        </div>

        {/* Reviews Section */}
        {showReviewsSection && (
          <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="p-2 bg-primary rounded-xl shadow-sm">
                  <Star className="h-5 w-5 text-white" />
                </div>
                Recensioni recenti
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReviewsSection(false)} className="rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!recentReviewsData ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentReviewsData.reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-stone-50/20 rounded-2xl">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nessuna recensione ricevuta ancora.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReviewsData.reviews.map((review: any) => (
                  <div key={review.id} className="rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] p-5 hover:bg-stone-50/30 transition-colors">
                    <div className="flex items-start justify-between gap-4 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-foreground">
                            {review.nickname || review.firstName || 'Appassionato Anonimo'}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">su</span>
                          <Link href={`/beers/${review.beerId}`}>
                            <span className="text-xs font-bold text-primary hover:underline cursor-pointer">{review.beerName}</span>
                          </Link>
                          <div className="flex items-center gap-0.5 ml-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < (review.rating || 0) ? 'text-primary fill-primary' : 'text-orange-100 dark:text-gray-800'}`} />
                            ))}
                          </div>
                        </div>
                        {review.personalNotes && (
                          <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-stone-200 pl-3 mb-3">"{review.personalNotes}"</p>
                        )}
                        {review.ownerReply && (
                          <div className="mt-3 bg-stone-50 dark:bg-stone-900/20 p-4 rounded-xl border border-stone-200 dark:border-stone-700/30">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">La tua risposta</p>
                            <p className="text-sm text-foreground">{review.ownerReply}</p>
                          </div>
                        )}
                        {replyingTo === review.id ? (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Ringrazia l'utente o commenta la recensione..."
                              rows={3}
                              className="text-sm border-stone-200 dark:border-[hsl(25,12%,20%)] rounded-xl focus-visible:ring-primary/20"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
                                disabled={!replyText.trim() || replyMutation.isPending}
                                onClick={() => replyMutation.mutate({ reviewId: review.id, reply: replyText })}
                              >
                                {replyMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                Pubblica Risposta
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                                Annulla
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-3 text-xs text-primary hover:text-primary hover:bg-stone-50 rounded-xl h-8 px-3"
                            onClick={() => { setReplyingTo(review.id); setReplyText(review.ownerReply || ""); }}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            {review.ownerReply ? 'Modifica risposta' : 'Rispondi alla recensione'}
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
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
          <div className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm p-6 text-center">
            <a
              href={brewery.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-300 font-bold shadow-md hover:shadow-lg active:scale-95"
            >
              <Globe className="h-5 w-5 mr-2" />
              Visita il Sito Web Ufficiale
            </a>
          </div>
        )}
      </main>

      {/* Profile Edit Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile} modal={false}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-stone-200 shadow-2xl"
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
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary rounded-xl">
                <Pencil className="h-5 w-5 text-white" />
              </div>
              Modifica Profilo Birrificio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Nome Birrificio</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Posizione</label>
                <AddressAutocomplete
                  value={editForm.location}
                  countryRestriction={null}
                  placeholder="Indirizzo del birrificio..."
                  onAddressSelect={(details) => {
                    setEditForm({
                      ...editForm,
                      location: details.formattedAddress,
                      region: details.region,
                      country: details.country,
                    });
                  }}
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Storia e Filosofia</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">Editor Avanzato</span>
              </label>
              <RichTextEditor
                content={editForm.descriptionHtml}
                onChange={(html) => setEditForm({ ...editForm, descriptionHtml: html })}
                placeholder="Racconta la storia del tuo birrificio, la filosofia, i premi, le collaborazioni…"
                maxChars={5000}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Sito Web</label>
                <Input
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://www.esempio.it"
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Telefono</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+39 012 3456789"
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Email Pubblica</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="info@birrificio.it"
                  type="email"
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-foreground">Partita IVA</label>
                <Input
                  value={editForm.vatNumber}
                  onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                  placeholder="IT01234567890"
                  className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                />
              </div>
            </div>
            <div className="bg-stone-50/50 dark:bg-stone-900/10 p-5 rounded-3xl border border-stone-200 dark:border-stone-700/30">
              <p className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground text-left">
                <SiInstagram className="h-4 w-4 text-primary" />
                Presenza Social
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-black rounded-xl border border-stone-200 flex-shrink-0">
                    <SiInstagram className="h-5 w-5 text-pink-600" />
                  </div>
                  <Input
                    value={editForm.instagramUrl}
                    onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                    placeholder="URL Instagram"
                    className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-black rounded-xl border border-stone-200 flex-shrink-0">
                    <SiFacebook className="h-5 w-5 text-blue-700" />
                  </div>
                  <Input
                    value={editForm.facebookUrl}
                    onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                    placeholder="URL Facebook"
                    className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-black rounded-xl border border-stone-200 flex-shrink-0">
                    <SiTiktok className="h-5 w-5 text-foreground" />
                  </div>
                  <Input
                    value={editForm.tiktokUrl}
                    onChange={(e) => setEditForm({ ...editForm, tiktokUrl: e.target.value })}
                    placeholder="URL TikTok"
                    className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <Button
                onClick={handleSaveProfile}
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-12 shadow-md"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Salva Profilo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditingProfile(false)}
                className="px-6 border-stone-200 hover:bg-stone-50 rounded-xl h-12"
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Edit Dialog */}
      <Dialog open={isEditingImages} onOpenChange={setIsEditingImages}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-stone-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary rounded-xl">
                <Camera className="h-5 w-5 text-white" />
              </div>
              Asset Visuali
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-foreground">Logo Brand</label>
              <ImageUpload
                label="Logo Birrificio"
                description="Formato quadrato raccomandato"
                currentImageUrl={brewery?.logoUrl}
                onImageChange={(url) => handleImageUpload(url, 'logo')}
                folder="brewery-logos"
                aspectRatio="square"
                recommendedDimensions="400x400px"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-foreground">Foto Copertina</label>
              <ImageUpload
                label="Immagine di Copertina"
                description="Formato orizzontale raccomandato"
                currentImageUrl={brewery?.coverImageUrl}
                onImageChange={(url) => handleImageUpload(url, 'cover')}
                folder="brewery-covers"
                aspectRatio="landscape"
                recommendedDimensions="1200x400px"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Beer Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-stone-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary rounded-xl">
                <BeerIcon className="h-5 w-5 text-white" />
              </div>
              {editingBeer ? "Modifica Birra" : "Nuova Birra in Gamma"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onBeerSubmit)} className="space-y-6 pt-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Nome Birra *</FormLabel>
                      <FormControl><Input placeholder="Es. Luppolina" {...field} className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Stile *</FormLabel>
                      <FormControl><Input placeholder="Es. American IPA" {...field} className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="abv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Grado Alc. (ABV %)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="5.2"
                          {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} 
                          className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11" />
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
                      <FormLabel className="font-bold">IBU (Amaro)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="45"
                          {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} 
                          className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11" />
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
                    <FormLabel className="font-bold">Colore</FormLabel>
                    <FormControl><Input placeholder="Es. Giallo Paglierino, Mogano..." {...field} value={field.value ?? ""} className="border-stone-200 rounded-xl focus-visible:ring-primary/20 h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Descrizione Organolettica</FormLabel>
                    <FormControl><Textarea placeholder="Note di degustazione, malti e luppoli utilizzati..." rows={3} {...field} value={field.value ?? ""} className="border-stone-200 rounded-xl focus-visible:ring-primary/20" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Immagine Prodotto</label>
                <ImageUpload
                  label="Immagine Birra"
                  description="Carica una foto della bottiglia o del bicchiere"
                  currentImageUrl={form.watch("imageUrl") || undefined}
                  onImageChange={(url) => form.setValue("imageUrl", url || "")}
                  folder="beer-images"
                  aspectRatio="square"
                  maxSize={5}
                  recommendedDimensions="400x400px"
                />
              </div>

              {/* Awards editor */}
              <div className="bg-stone-50/50 dark:bg-stone-900/10 p-5 rounded-3xl border border-stone-200 dark:border-stone-700/30 space-y-4">
                <label className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                  <Trophy className="h-4 w-4 text-primary" />
                  Hall of Fame (Premi)
                </label>
                {editingAwards.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {editingAwards.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-white dark:bg-black/40 rounded-xl px-3 py-2 border border-stone-200/50">
                        <Trophy className={`h-4 w-4 flex-shrink-0 ${a.type === 'gold' ? 'text-yellow-500' : a.type === 'silver' ? 'text-gray-300' : a.type === 'bronze' ? 'text-orange-700' : 'text-primary'}`} />
                        <span className="flex-1 truncate font-medium">{a.name} — {a.competition} ({a.year})</span>
                        <button type="button" onClick={() => setEditingAwards(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome premio (es. Oro)"
                    value={newAward.name}
                    onChange={(e) => setNewAward(prev => ({ ...prev, name: e.target.value }))}
                    className="text-sm border-stone-200 rounded-xl h-10"
                  />
                  <Input
                    placeholder="Competizione (es. BdA)"
                    value={newAward.competition}
                    onChange={(e) => setNewAward(prev => ({ ...prev, competition: e.target.value }))}
                    className="text-sm border-stone-200 rounded-xl h-10"
                  />
                  <Input
                    type="number"
                    placeholder="Anno"
                    value={newAward.year}
                    onChange={(e) => setNewAward(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="text-sm border-stone-200 rounded-xl h-10"
                  />
                  <Select value={newAward.type} onValueChange={(v) => setNewAward(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="text-sm border-stone-200 rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                  className="w-full border-stone-200 hover:bg-stone-50 rounded-xl font-bold py-5"
                  disabled={!newAward.name.trim() || !newAward.competition.trim()}
                  onClick={() => {
                    if (newAward.name.trim() && newAward.competition.trim()) {
                      setEditingAwards(prev => [...prev, { ...newAward }]);
                      setNewAward({ name: "", year: new Date().getFullYear(), competition: "", type: "gold" });
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2 text-primary" />
                  Aggiungi Riconoscimento
                </Button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-12 shadow-md"
                  disabled={createBeerMutation.isPending || updateBeerMutation.isPending}
                >
                  {createBeerMutation.isPending || updateBeerMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {editingBeer ? "Aggiorna Birra" : "Salva Birra"}
                </Button>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} className="px-6 border-stone-200 rounded-xl h-12">
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
