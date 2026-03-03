import { useState } from "react";
import { useParams, Link } from "wouter";
import { GlutenFreeIcon } from "@/components/beer-badges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Beer as BeerIcon, 
  Thermometer, 
  Eye, 
  Droplets, 
  Wheat, 
  Building,
  ArrowLeft,
  Heart,
  Share2,
  Wine,
  Store,
  Sparkles,
  Target,
  Factory,
  Pencil,
  Save,
  X
} from "lucide-react";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BeerTastingForm from "@/components/BeerTastingForm";
import ImageWithFallback from "@/components/image-with-fallback";
import { ImageUpload } from "@/components/image-upload";

interface Beer {
  id: number;
  name: string;
  style: string;
  abv: string;
  ibu?: number;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
  bottleImageUrl?: string;
  color?: string;
  isBottled?: boolean;
  breweryId: number;
  brewery?: {
    id: number;
    name: string;
    location: string;
    region: string;
    logoUrl?: string;
  };
}

interface BeerAvailability {
  tapLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    tapItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
  bottleLocations: Array<{
    pub: {
      id: number;
      name: string;
      city: string;
      address: string;
    };
    bottleItem: {
      id: number;
      price?: string;
      isActive: boolean;
    };
  }>;
}

// Stats Card Component
const BeerStatsCard = ({ icon: Icon, value, label, gradient }: any) => (
  <div className="glass-card rounded-xl p-3 sm:p-4 group flex-shrink-0">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`p-2 sm:p-2.5 rounded-lg bg-gradient-to-br ${gradient} flex-shrink-0`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  </div>
);

export default function BeerDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTastingForm, setShowTastingForm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    style: '',
    abv: '',
    ibu: '',
    description: '',
    color: '',
    logoUrl: '',
    imageUrl: '',
    bottleImageUrl: '',
    isGlutenFree: false,
    isAlcoholFree: false,
  });
  
  const isAdmin = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && user?.userType === 'admin');
  
  const { data: beer, isLoading: beerLoading } = useQuery<Beer>({
    queryKey: ["/api/beers", id],
    enabled: !!id,
  });
  
  const updateBeerMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest(`/api/admin/beers/${id}`, { method: 'PATCH' }, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beers", id] });
      setIsEditDialogOpen(false);
      toast({ title: "Birra aggiornata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    },
  });
  
  const openEditDialog = () => {
    if (beer) {
      setEditForm({
        name: beer.name || '',
        style: beer.style || '',
        abv: beer.abv || '',
        ibu: beer.ibu?.toString() || '',
        description: beer.description || '',
        color: beer.color || '',
        logoUrl: beer.logoUrl || '',
        imageUrl: beer.imageUrl || '',
        bottleImageUrl: beer.bottleImageUrl || '',
        isGlutenFree: beer.isGlutenFree || false,
        isAlcoholFree: beer.isAlcoholFree || false,
      });
      setIsEditDialogOpen(true);
    }
  };
  
  const handleSaveEdit = () => {
    const updates: Record<string, any> = {
      name: editForm.name,
      style: editForm.style,
      abv: editForm.abv,
      description: editForm.description || null,
      color: editForm.color || null,
      logoUrl: editForm.logoUrl || null,
      imageUrl: editForm.imageUrl || null,
      bottleImageUrl: editForm.bottleImageUrl || null,
      isGlutenFree: editForm.isGlutenFree,
      isAlcoholFree: editForm.isAlcoholFree,
    };
    if (editForm.ibu) {
      updates.ibu = parseInt(editForm.ibu);
    }
    updateBeerMutation.mutate(updates);
  };

  const { data: availability, isLoading: availabilityLoading } = useQuery<BeerAvailability>({
    queryKey: ["/api/beers", id, "availability"],
    enabled: !!id,
  });

  // Check if beer is favorited
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const isBeerFavorited = Array.isArray(favorites) && favorites.some((fav: any) => 
    fav.itemType === 'beer' && fav.itemId === parseInt(id || '0')
  );

  // Check if user has already tasted this beer
  const { data: userTastings = [] } = useQuery<any[]>({
    queryKey: ["/api/user/beer-tastings"],
    enabled: isAuthenticated,
  });

  const existingTasting = userTastings.find((tasting: any) => tasting.beerId === parseInt(id || '0'));
  const hasTasted = !!existingTasting;

  // Community reviews (public)
  const { data: reviewsData } = useQuery<{ reviews: any[]; avgRating: number | null; reviewCount: number }>({
    queryKey: ["/api/beers", id, "reviews"],
    enabled: !!id,
  });

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
        description: isBeerFavorited ? "Rimossa dai favoriti" : "Aggiunta ai favoriti",
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
      itemType: 'beer',
      itemId: parseInt(id || '0'),
      action: isBeerFavorited ? 'remove' : 'add'
    });
  };

  const handleShare = async () => {
    const beerName = beer?.name || 'Birra';
    const currentUrl = window.location.href;
    
    const shareData = {
      title: `${beerName} - Fermenta`,
      text: `Scopri ${beerName} su Fermenta`,
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

  if (beerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-yellow-50 dark:from-gray-950 dark:via-amber-950 dark:to-yellow-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="skeleton rounded-2xl h-80 md:h-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-20"></div>
              ))}
            </div>
            <div className="skeleton rounded-2xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!beer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-yellow-50 dark:from-gray-950 dark:via-amber-950 dark:to-yellow-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 mx-auto flex items-center justify-center">
            <BeerIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Birra non trovata</h2>
          <p className="text-gray-600 dark:text-gray-400">
            La birra che stai cercando non esiste o è stata rimossa.
          </p>
          <Button asChild>
            <Link href="/">Torna alla Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tapLocations = availability?.tapLocations || [];
  const bottleLocations = availability?.bottleLocations || [];
  const totalLocations = tapLocations.length + bottleLocations.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-yellow-50 dark:from-gray-950 dark:via-amber-950 dark:to-yellow-950">
      
      {/* Modern Hero Section */}
      <div className="relative">
        <div className="relative h-96 md:h-[500px] overflow-hidden">
          <img
            src={beer?.imageUrl || beer?.bottleImageUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=1200&h=600&fit=crop"}
            alt={`${beer?.name} - Immagine`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12">
              <div className="glass-card rounded-2xl p-8 backdrop-blur-md bg-white/10 border border-white/20">
                <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
                  <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 w-full md:w-auto justify-center md:justify-start">
                    <ImageWithFallback
                      src={beer?.imageUrl || beer?.bottleImageUrl}
                      alt={beer?.name}
                      imageType="beer"
                      containerClassName="h-20 w-20 ring-4 ring-white/30 flex-shrink-0 rounded-xl"
                      className="h-20 w-20 object-cover rounded-xl"
                      iconSize="lg"
                    />
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl text-white mb-2 font-bold leading-tight">
                        {beer?.name}
                      </h1>
                      {beer?.brewery && (
                        <Link href={`/brewery/${beer.brewery.id}`}>
                          <p className="text-white/80 text-base sm:text-lg mb-4 hover:text-emerald-300 transition-colors cursor-pointer font-medium">
                            {beer.brewery.name}
                          </p>
                        </Link>
                      )}
                      <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4 flex-wrap gap-2">
                        <Badge className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-100 border-blue-300/30 backdrop-blur-sm px-3 py-2">
                          <Sparkles className="h-4 w-4 mr-2" />
                          {beer?.style}
                        </Badge>
                        {beer?.isGlutenFree && (
                          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-100 border-green-300/30 backdrop-blur-sm px-3 py-2 gap-1.5">
                            <GlutenFreeIcon size={18} className="text-green-200" />
                            Senza Glutine
                          </Badge>
                        )}
                        {beer?.isAlcoholFree && (
                          <Badge className="bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-100 border-sky-300/30 backdrop-blur-sm px-3 py-2">
                            0.0% Analcolica
                          </Badge>
                        )}
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
                        data-testid="button-admin-edit-beer"
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
                        isBeerFavorited ? 'bg-red-500/30 border-red-300/50' : 'bg-white/20'
                      }`}
                      data-testid="button-favorite"
                    >
                      <Heart className={`h-4 w-4 sm:mr-2 ${isBeerFavorited ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">{isBeerFavorited ? 'Salvata' : 'Salva'}</span>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible" style={{ WebkitOverflowScrolling: 'touch' }}>
          <BeerStatsCard 
            icon={Target}
            label="ABV"
            value={beer?.abv ? `${beer.abv}%` : 'N/D'}
            gradient="from-amber-500 to-orange-600"
          />
          <BeerStatsCard 
            icon={Droplets}
            label="Colore"
            value={beer?.color || 'N/D'}
            gradient="from-blue-500 to-indigo-600"
          />
          <BeerStatsCard 
            icon={Sparkles}
            label="Stile"
            value={beer?.style || 'N/D'}
            gradient="from-purple-500 to-pink-600"
          />
          <BeerStatsCard 
            icon={Store}
            label="Locali"
            value={totalLocations}
            gradient="from-green-500 to-emerald-600"
          />
        </div>

        {/* Description */}
        {beer?.description && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg mr-3">
                  <BeerIcon className="h-5 w-5 text-white" />
                </div>
                Descrizione
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {beer.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tasting Notes */}
        {isAuthenticated && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg mr-3">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  Note di Degustazione
                </h2>
                {hasTasted && !showTastingForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTastingForm(true)}
                    className="bg-white/60 dark:bg-gray-800/60"
                    data-testid="button-edit-tasting"
                  >
                    Modifica
                  </Button>
                )}
              </div>

              {showTastingForm || !hasTasted ? (
                <BeerTastingForm
                  beerId={parseInt(id || '0')}
                  existingTasting={existingTasting}
                  onSuccess={() => {
                    setShowTastingForm(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
                  }}
                  onCancel={() => setShowTastingForm(false)}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {existingTasting.rating}/5
                    </span>
                  </div>
                  {(existingTasting.personalNotes || existingTasting.notes) && (
                    <p className="text-gray-700 dark:text-gray-300 italic">
                      "{existingTasting.personalNotes || existingTasting.notes}"
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Degustata il {new Date(existingTasting.tastedAt).toLocaleDateString('it-IT')}
                    {existingTasting.format ? ` in ${existingTasting.format}` : ''}
                    {existingTasting.pubName ? ` presso ${existingTasting.pubName}` : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Community Reviews */}
        {reviewsData && reviewsData.reviewCount > 0 && (
          <Card className="glass-card border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg mr-3">
                    <Star className="h-5 w-5 text-white fill-white" />
                  </div>
                  Recensioni Community
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-5 w-5 ${s <= Math.round(reviewsData.avgRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{reviewsData.avgRating?.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? 'recensione' : 'recensioni'})</span>
                </div>
              </div>
              <div className="space-y-4">
                {reviewsData.reviews.slice(0, 10).map((review: any) => {
                  const displayName = review.nickname || review.firstName || 'Utente';
                  const initials = displayName[0]?.toUpperCase() || 'U';
                  return (
                    <div key={review.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {review.profileImageUrl && <AvatarImage src={review.profileImageUrl} />}
                        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{displayName}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= (review.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} />
                            ))}
                          </div>
                        </div>
                        {review.personalNotes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-1">"{review.personalNotes}"</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                          <span>{new Date(review.tastedAt).toLocaleDateString('it-IT')}</span>
                          {review.format && <span className="before:content-['·'] before:mr-2">{review.format}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Availability */}
        <Card className="glass-card border-0 mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg mr-3">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              Dove Trovarla ({totalLocations} {totalLocations === 1 ? 'locale' : 'locali'})
            </h2>

            {availabilityLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-lg"></div>
                ))}
              </div>
            ) : totalLocations === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Questa birra non è al momento disponibile in nessun locale.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tap Locations */}
                {tapLocations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Wine className="h-5 w-5 mr-2 text-amber-600" />
                      Alla Spina ({tapLocations.length})
                    </h3>
                    <div className="space-y-3">
                      {tapLocations.map((location: any, idx: number) => (
                        <Link key={idx} href={`/pub/${location.pub.id}`}>
                          <div className="glass-card border-0 p-4 hover:scale-102 transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                  {location.pub.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {location.pub.address}, {location.pub.city}
                                </p>
                              </div>
                              {location.tapItem.price && (
                                <Badge className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 text-green-800 dark:text-green-200 border-green-200">
                                  €{location.tapItem.price}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottle Locations */}
                {bottleLocations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <BeerIcon className="h-5 w-5 mr-2 text-blue-600" />
                      In Bottiglia ({bottleLocations.length})
                    </h3>
                    <div className="space-y-3">
                      {bottleLocations.map((location: any, idx: number) => (
                        <Link key={idx} href={`/pub/${location.pub.id}`}>
                          <div className="glass-card border-0 p-4 hover:scale-102 transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                  {location.pub.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {location.pub.address}, {location.pub.city}
                                </p>
                              </div>
                              {location.bottleItem.price && (
                                <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 text-blue-800 dark:text-blue-200 border-blue-200">
                                  €{location.bottleItem.price}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Admin Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Birra
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
                  placeholder="Nome della birra"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-style">Stile</Label>
                <Input
                  id="edit-style"
                  value={editForm.style}
                  onChange={(e) => setEditForm({ ...editForm, style: e.target.value })}
                  placeholder="Es. IPA, Lager, Stout..."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-abv">ABV (%)</Label>
                <Input
                  id="edit-abv"
                  value={editForm.abv}
                  onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })}
                  placeholder="5.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ibu">IBU</Label>
                <Input
                  id="edit-ibu"
                  type="number"
                  value={editForm.ibu}
                  onChange={(e) => setEditForm({ ...editForm, ibu: e.target.value })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Colore</Label>
                <Input
                  id="edit-color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  placeholder="Ambrato, Scuro..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descrizione della birra..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isGlutenFree}
                  onChange={(e) => setEditForm({ ...editForm, isGlutenFree: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5.5 7.5h5v1.5h-5z"/></svg>
                  Gluten Free
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isAlcoholFree}
                  onChange={(e) => setEditForm({ ...editForm, isAlcoholFree: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">0.0% Analcolica</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Immagine Birra"
                description="Immagine principale della birra"
                currentImageUrl={editForm.imageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, imageUrl: url || '' })}
                folder="beer-images"
                aspectRatio="square"
                maxSize={5}
                recommendedDimensions="400x400px"
              />
              <ImageUpload
                label="Immagine Bottiglia"
                description="Foto della bottiglia"
                currentImageUrl={editForm.bottleImageUrl || undefined}
                onImageChange={(url) => setEditForm({ ...editForm, bottleImageUrl: url || '' })}
                folder="beer-bottles"
                aspectRatio="portrait"
                maxSize={5}
                recommendedDimensions="300x450px"
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
                disabled={updateBeerMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateBeerMutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
