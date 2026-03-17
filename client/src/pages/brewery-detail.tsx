import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer, 
  Globe, 
  ArrowLeft, 
  Heart, 
  Share2, 
  Building,
  Award,
  Sparkles,
  Factory,
  Target,
  Pencil,
  Save,
  X,
  CalendarDays,
  Calendar,
  Clock,
  Lightbulb,
  ShieldCheck,
  Megaphone,
  Newspaper,
  Rocket,
  Users,
  Store,
  Building2,
} from "lucide-react";
import { EventCategoryBadge, EventInterestButton } from "@/components/events-manager";
import { format, isFuture } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";
import SuggestChangeDialog from "@/components/SuggestChangeDialog";
import AddressAutocomplete from "@/components/address-autocomplete";

interface Brewery {
  id: number;
  name: string;
  location: string;
  region?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
}

interface Beer {
  id: number;
  name: string;
  style: string;
  abv?: string;
  ibu?: number;
  description?: string;
  imageUrl?: string;
  avgRating?: number | null;
  reviewCount?: number;
  favoriteCount?: number;
  isCollaboration?: boolean;
  isCollabBeer?: boolean;
  breweryId?: number;
  collaboratingBreweries?: { id: number; name: string; logoUrl: string | null }[];
}

// Stats Card Component
const BreweryStatsCard = ({ icon: Icon, value, label, gradient }: any) => (
  <div className="glass-card rounded-xl p-4 hover:scale-105 transition-all duration-300 group">
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

export default function BreweryDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAllBeers, setShowAllBeers] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    region: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    websiteUrl: '',
  });
  
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && user?.userType === 'admin');
  
  const { data: brewery, isLoading: breweryLoading } = useQuery<Brewery>({
    queryKey: ["/api/breweries", id],
    enabled: !!id,
  });
  
  const updateBreweryMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest(`/api/admin/breweries/${id}`, { method: 'PATCH' }, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/breweries", id] });
      setIsEditDialogOpen(false);
      toast({ title: "Birrificio aggiornato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });
  
  const openEditDialog = () => {
    if (brewery) {
      setEditForm({
        name: brewery.name || '',
        location: brewery.location || '',
        region: brewery.region || '',
        description: brewery.description || '',
        logoUrl: brewery.logoUrl || '',
        coverImageUrl: brewery.coverImageUrl || '',
        websiteUrl: brewery.websiteUrl || '',
      });
      setIsEditDialogOpen(true);
    }
  };
  
  const handleSaveEdit = () => {
    const updates: Record<string, any> = {
      name: editForm.name,
      location: editForm.location,
      region: editForm.region || null,
      description: editForm.description || null,
      logoUrl: editForm.logoUrl || null,
      coverImageUrl: editForm.coverImageUrl || null,
      websiteUrl: editForm.websiteUrl || null,
    };
    updateBreweryMutation.mutate(updates);
  };

  const { data: beers = [], isLoading: beersLoading } = useQuery<Beer[]>({
    queryKey: ["/api/breweries", id, "beers"],
    enabled: !!id,
  });

  const { data: breweryEvents = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "events"],
    enabled: !!id,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "announcements"],
    enabled: !!id,
    staleTime: 3 * 60_000,
  });

  const { data: distribution = [] } = useQuery<any[]>({
    queryKey: ["/api/breweries", id, "distribution"],
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const { data: breweryRating } = useQuery<{ avgRating: number | null; reviewCount: number }>({
    queryKey: ["/api/breweries", id, "rating"],
    enabled: !!id,
  });

  // Brewery favorites count (public)
  const { data: breweryFavoritesCount } = useQuery<{ count: string }>({
    queryKey: ["/api/favorites", "brewery", id, "count"],
    queryFn: () => fetch(`/api/favorites/brewery/${id}/count`).then(r => r.json()),
    enabled: !!id,
  });
  const favCount = breweryFavoritesCount ? parseInt(String(breweryFavoritesCount.count)) : 0;

  // Check if brewery is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBreweryFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'brewery' && fav.itemId === parseInt(id || '0')
  );

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ itemType, itemId, action }: { itemType: string, itemId: number, action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('/api/favorites', { method: 'POST' }, { itemType, itemId });
      } else {
        return apiRequest(`/api/favorites/${itemType}/${itemId}`, { method: 'DELETE' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "✅ Successo",
        description: isBreweryFavorited ? "Rimosso dai favoriti" : "Aggiunto ai favoriti",
      });
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Non è stato possibile aggiornare i favoriti",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "⚠️ Accesso richiesto",
        description: "Effettua l'accesso per aggiungere ai favoriti",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      itemType: 'brewery',
      itemId: parseInt(id || '0'),
      action: isBreweryFavorited ? 'remove' : 'add'
    });
  };

  const handleShare = async () => {
    const breweryName = brewery?.name || 'Birrificio';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${breweryName} - Fermenta`,
      text: `Scopri ${breweryName} su Fermenta`,
      url: currentUrl,
    };

    try {
      if (navigator.share && typeof navigator.share === 'function') {
        let canShare = true;
        try {
          if (navigator.canShare && typeof navigator.canShare === 'function') {
            canShare = navigator.canShare(shareData);
          }
        } catch (e) {
          canShare = true;
        }

        if (canShare) {
          await navigator.share(shareData);
          toast({ title: "🎉 Condiviso con successo!" });
          return;
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        toast({ title: "📋 Link copiato negli appunti!" });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.warn('Share failed:', error);
    }
  };

  if (breweryLoading) {
    return (
      <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="skeleton rounded-2xl h-80 md:h-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-20"></div>
              ))}
            </div>
            <div className="skeleton rounded-2xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!brewery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Birrificio non trovato</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Il birrificio che stai cercando non esiste o è stato rimosso.
          </p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayedBeers = showAllBeers ? beers : beers.slice(0, 6);

  const seoTitle = brewery?.name ? `${brewery.name} — Birrificio Artigianale | Fermenta.to` : "Fermenta.to";
  const seoDesc = (brewery as any)?.description
    ? (brewery as any).description.slice(0, 155)
    : brewery?.name
    ? `Scopri tutte le birre artigianali di ${brewery.name} su Fermenta.to: stili, ABV, dove trovarle.`
    : "Fermenta.to — La piattaforma per gli amanti della birra artigianale.";
  const seoImage = brewery?.coverImageUrl || brewery?.logoUrl;
  const seoUrl = `https://fermenta.to/brewery/${id}`;

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Fermenta.to" />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Brewery",
          "name": brewery?.name,
          "description": (brewery as any)?.description,
          "url": seoUrl,
          "image": seoImage,
        })}</script>
      </Helmet>
      
      {/* Modern Hero Section */}
      <div className="relative">
        <div className="relative h-[440px] md:h-[520px] overflow-hidden">
          <img
            src={brewery?.coverImageUrl || "/brewery-cover.jpg"}
            alt={`${brewery?.name} - Copertina`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="glass-card rounded-2xl p-5 sm:p-8 backdrop-blur-md bg-white/10 border border-white/20">
                <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-5 sm:gap-8">
                  <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6 w-full md:w-auto justify-center md:justify-start">
                    {brewery?.logoUrl && (
                      <Avatar className="h-20 w-20 ring-4 ring-white/30 flex-shrink-0">
                        <AvatarImage src={brewery.logoUrl} alt={`${brewery.name} - Logo`} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-2xl">
                          {brewery?.name?.[0] || 'B'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center md:gap-3 mb-4">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl text-white font-bold leading-tight">
                          {brewery?.name}
                        </h1>
                        {(brewery as any)?.hasOwner && (
                          <div className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 rounded-full px-3 py-1 mt-2 md:mt-0 self-center md:self-auto shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-white" />
                            <span className="text-xs font-semibold text-white">Birrificio Verificato</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center text-white/90 backdrop-blur-sm bg-white/10 rounded-lg px-4 py-2">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">{brewery?.location} {brewery?.region && `(${brewery.region})`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-center md:justify-end space-x-2 sm:space-x-3 w-full md:w-auto">
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={openEditDialog}
                        className="backdrop-blur-md bg-amber-500/30 border-amber-300/50 text-white hover:bg-amber-500/50 hover:border-amber-300/70 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px]"
                        data-testid="button-admin-edit-brewery"
                      >
                        <Pencil className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Modifica</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleFavoriteToggle}
                      disabled={favoriteMutation.isPending}
                      className={`backdrop-blur-md border-white/40 text-white hover:bg-white/30 hover:border-white/60 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px] ${
                        isBreweryFavorited ? 'bg-red-500/30 border-red-300/50' : 'bg-white/20'
                      }`}
                      data-testid="button-favorite"
                    >
                      <Heart className={`h-4 w-4 sm:mr-2 ${isBreweryFavorited ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">
                        {isBreweryFavorited ? 'Salvato' : 'Salva'}
                        {favCount > 0 && <span className="ml-1.5 opacity-80">· {favCount}</span>}
                      </span>
                      {favCount > 0 && <span className="sm:hidden ml-1 text-xs opacity-80">{favCount}</span>}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleShare}
                      className="backdrop-blur-md bg-white/20 border-white/40 text-white hover:bg-white/30 hover:border-white/60 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px]"
                      data-testid="button-share"
                    >
                      <Share2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Condividi</span>
                    </Button>
                    {isAuthenticated && !isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSuggestDialogOpen(true)}
                        className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-amber-500/30 hover:border-amber-300/50 transition-all duration-300 font-medium shadow-lg min-h-[44px] min-w-[44px]"
                        data-testid="button-suggest-change"
                      >
                        <Lightbulb className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Suggerisci modifica</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <BreweryStatsCard 
            icon={Beer}
            label="Birre"
            value={beers.length}
            gradient="from-amber-500 to-orange-600"
          />
          {/* Rating Card */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500">
                <Star className="h-5 w-5 text-white fill-white" />
              </div>
              <div>
                {breweryRating?.avgRating ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{breweryRating.avgRating.toFixed(1)} <span className="text-yellow-500">★</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{breweryRating.reviewCount} {breweryRating.reviewCount === 1 ? 'recensione' : 'recensioni'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400 dark:text-gray-400">—</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Nessuna recensione</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brewery?.name + ' ' + brewery?.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="glass-card rounded-xl p-4 hover:scale-105 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{brewery?.location || 'N/D'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">Cerca su Maps</p>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Description */}
        {brewery?.description && (
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

        {/* Beers Section */}
        <div className="glass-card border-0 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Beer className="h-6 w-6 text-white" />
              </div>
              Birre ({beers.length})
            </h2>
          </div>
          
          {beersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-48 rounded-xl"></div>
              ))}
            </div>
          ) : beers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Beer className="h-10 w-10 text-gray-400 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nessuna birra disponibile
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Questo birrificio non ha ancora birre nel catalogo.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedBeers.map((beer: Beer) => (
                  <Link key={beer.id} href={`/beer/${beer.id}`}>
                    <Card className={`glass-card border-0 h-full hover:scale-105 transition-all duration-300 group cursor-pointer relative ${beer.isCollaboration ? 'ring-1 ring-purple-300 dark:ring-purple-700' : ''}`}>
                      {/* Collaboration badge top-left — includes partner name */}
                      {beer.isCollaboration && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-full shadow" onClick={e => e.preventDefault()}>
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span>Collab</span>
                          {beer.collaboratingBreweries && beer.collaboratingBreweries.length > 0 && (
                            <>
                              <span className="opacity-50 mx-0.5">·</span>
                              {beer.collaboratingBreweries.map((b, i) => (
                                <span key={b.id} className="inline-flex items-center gap-0.5">
                                  {i > 0 && <span className="opacity-50 mx-0.5">×</span>}
                                  <Link href={`/brewery/${b.id}`}>
                                    <span className="hover:underline cursor-pointer">{b.name}</span>
                                  </Link>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                      {/* Rating badge top-right */}
                      {beer.avgRating != null && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-yellow-400/95 dark:bg-yellow-500/95 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          <Star className="h-3 w-3 fill-yellow-900" />
                          {beer.avgRating.toFixed(2)}
                          {beer.reviewCount && beer.reviewCount > 0 && (
                            <span className="ml-0.5 opacity-70 font-normal">({beer.reviewCount})</span>
                          )}
                        </div>
                      )}
                      <CardContent className="p-6">
                        <div className={`flex items-start space-x-4 mb-4 ${beer.isCollaboration ? 'mt-4' : ''}`}>
                          <ImageWithFallback
                            src={beer?.imageUrl}
                            alt={beer?.name}
                            imageType="beer"
                            containerClassName="w-16 h-16 rounded-xl"
                            className="w-16 h-16 object-cover rounded-xl"
                            iconSize="lg"
                          />
                          <div className="flex-1 min-w-0 pr-8">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-600 group-hover:bg-clip-text transition-all">
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
                        </div>
                        
                        
                        {beer.description && (
                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                            {beer.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              
              {beers.length > 6 && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllBeers(!showAllBeers)}
                    className="bg-white/60 dark:bg-gray-800/60"
                    data-testid="button-toggle-beers"
                  >
                    {showAllBeers ? 'Mostra meno' : `Mostra tutte (${beers.length})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Events Section */}
        {breweryEvents.length > 0 && (
          <div className="glass-card border-0 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mr-3">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              Eventi ({breweryEvents.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breweryEvents.filter(e => isFuture(new Date(e.eventDate))).slice(0, 4).map((event: any) => (
                <Card key={event.id} className="overflow-hidden glass-card border-0">
                  {event.imageUrl && (
                    <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageUrl})` }} />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <EventCategoryBadge category={event.category} />
                      <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 gap-1 mb-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{format(new Date(event.eventDate), "d MMMM yyyy 'alle' HH:mm", { locale: itLocale })}</span>
                    </div>
                    {event.endDate && (
                      <div className="flex items-center text-xs text-gray-500 gap-1 mb-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>fino alle {format(new Date(event.endDate), "HH:mm", { locale: itLocale })}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 mb-2">{event.description}</p>
                    )}
                    <EventInterestButton eventId={event.id} type="brewery" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── Announcements Section ─────────────────────────────────────── */}
        {announcements.length > 0 && (
          <div className="glass-card border-0 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mr-3">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              Annunci & Uscite
            </h2>
            <div className="space-y-4">
              {announcements.slice(0, 5).map((ann: any) => {
                const typeMap: Record<string, { label: string; color: string; Icon: any }> = {
                  news: { label: "Novità", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", Icon: Newspaper },
                  release: { label: "Nuova Birra", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", Icon: Rocket },
                  collab: { label: "Collaborazione", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", Icon: Users },
                };
                const t = typeMap[ann.type] ?? typeMap.news;
                return (
                  <div key={ann.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
                        <t.Icon className="w-3 h-3" />{t.label}
                      </span>
                      {ann.releaseDate && (
                        <span className="text-xs text-gray-500">
                          Uscita: {new Date(ann.releaseDate).toLocaleDateString("it-IT")}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(ann.createdAt).toLocaleDateString("it-IT")}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">{ann.title}</p>
                    {ann.content && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.content}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Distribution Section ─────────────────────────────────────────── */}
        {distribution.length > 0 && (
          <div className="glass-card border-0 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-3">
                <Store className="h-6 w-6 text-white" />
              </div>
              Dove Trovarci in Spina
              <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">— {distribution.length} pub</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {distribution.map((pub: any) => (
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
          </div>
        )}

        {/* Website Link */}
        {brewery?.websiteUrl && (
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

      {/* Admin Edit Dialog - modal={false} allows Google Maps dropdown to receive clicks */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} modal={false}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Birrificio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome del birrificio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Località</Label>
                <AddressAutocomplete
                  value={editForm.location}
                  onChange={(address, city, region) => {
                    setEditForm({ 
                      ...editForm, 
                      location: address,
                      region: region || editForm.region
                    });
                  }}
                  placeholder="Cerca via, luogo, attività..."
                  searchType="all"
                  countryRestriction={null}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrizione del birrificio..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Logo Birrificio"
                description="Logo del birrificio"
                currentImageUrl={editForm.logoUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, logoUrl: url || '' })}
                folder="brewery-logos"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="300x300px"
              />
              <ImageUpload
                label="Immagine di Copertina"
                description="Immagine principale del birrificio"
                currentImageUrl={editForm.coverImageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, coverImageUrl: url || '' })}
                folder="brewery-covers"
                aspectRatio="landscape"
                maxSize={5}
                recommendedDimensions="1200x600px"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateBreweryMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateBreweryMutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggest Change Dialog */}
      {brewery && (
        <SuggestChangeDialog
          open={isSuggestDialogOpen}
          onOpenChange={setIsSuggestDialogOpen}
          type="brewery"
          itemId={brewery.id}
          currentData={{
            name: brewery.name,
            location: brewery.location,
            region: brewery.region ?? null,
            description: brewery.description ?? null,
            websiteUrl: brewery.websiteUrl ?? null,
            logoUrl: brewery.logoUrl ?? null,
            coverImageUrl: brewery.coverImageUrl ?? null,
          }}
        />
      )}

      <Footer />
    </div>
  );
}
