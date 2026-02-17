import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Beer } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Beer as BeerIcon, Plus, Pencil, Trash2, Factory, MapPin, Loader2, ImageIcon, Globe, Phone, FileText, Camera, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/image-upload";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const beerFormSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  style: z.string().min(1, "Lo stile è obbligatorio"),
  abv: z.coerce.number().min(0).max(100).optional().nullable(),
  ibu: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isBottled: z.boolean().default(false),
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

function BreweryProfileEditor({ brewery, onUpdate }: { brewery: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const profileForm = useForm({
    defaultValues: {
      name: brewery.name || "",
      description: brewery.description || "",
      location: brewery.location || "",
      region: brewery.region || "",
      country: brewery.country || "",
      websiteUrl: brewery.websiteUrl || "",
      phone: brewery.phone || "",
      vatNumber: brewery.vatNumber || "",
      latitude: brewery.latitude || "",
      longitude: brewery.longitude || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: any) =>
      apiRequest("/api/brewery/profile", { method: "PATCH" }, values),
    onSuccess: () => {
      toast({ title: "Successo", description: "Profilo birrificio aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
      setIsEditing(false);
      onUpdate();
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

  const onProfileSubmit = (values: any) => {
    updateProfileMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <div className="relative rounded-xl overflow-hidden">
        {brewery.coverImageUrl ? (
          <img src={brewery.coverImageUrl} alt="Cover" className="w-full h-48 sm:h-64 object-cover" />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-gradient-to-r from-amber-200 to-orange-300 dark:from-amber-900 dark:to-orange-900 flex items-center justify-center">
            <Camera className="w-12 h-12 text-white/60" />
          </div>
        )}
        <div className="absolute bottom-4 left-4 flex items-end gap-4">
          {brewery.logoUrl ? (
            <img src={brewery.logoUrl} alt="Logo" className="w-20 h-20 rounded-xl border-4 border-white shadow-lg object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-xl border-4 border-white shadow-lg bg-white flex items-center justify-center">
              <Factory className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <h2 className="text-white font-bold text-lg">{brewery.name}</h2>
            {brewery.location && (
              <p className="text-white/80 text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {brewery.location}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUpload
          label="Logo Birrificio"
          description="Immagine quadrata consigliata"
          currentImageUrl={brewery.logoUrl}
          onImageChange={(url) => handleImageUpload(url, 'logo')}
          folder="brewery-logos"
          aspectRatio="square"
          recommendedDimensions="400x400px"
        />
        <ImageUpload
          label="Immagine di Copertina"
          description="Formato orizzontale consigliato"
          currentImageUrl={brewery.coverImageUrl}
          onImageChange={(url) => handleImageUpload(url, 'cover')}
          folder="brewery-covers"
          aspectRatio="landscape"
          recommendedDimensions="1200x400px"
        />
      </div>

      {!isEditing ? (
        <Card className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-orange-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Informazioni Birrificio</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Modifica
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {brewery.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Descrizione</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{brewery.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brewery.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{brewery.location}{brewery.region ? `, ${brewery.region}` : ""}{brewery.country ? ` (${brewery.country})` : ""}</span>
                </div>
              )}
              {brewery.websiteUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={brewery.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline truncate">{brewery.websiteUrl}</a>
                </div>
              )}
              {brewery.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{brewery.phone}</span>
                </div>
              )}
              {brewery.vatNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>P.IVA: {brewery.vatNumber}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-amber-300">
          <CardHeader>
            <CardTitle className="text-lg">Modifica Profilo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome Birrificio</label>
                <Input {...profileForm.register("name")} />
              </div>
              <div>
                <label className="text-sm font-medium">Descrizione</label>
                <Textarea {...profileForm.register("description")} rows={4} placeholder="Racconta la storia del tuo birrificio..." />
              </div>
              <div>
                <label className="text-sm font-medium">Posizione</label>
                <AddressAutocomplete
                  value={profileForm.watch("location")}
                  countryRestriction={null}
                  placeholder="Cerca indirizzo birrificio..."
                  onAddressSelect={(details) => {
                    profileForm.setValue("location", details.formattedAddress);
                    profileForm.setValue("region", details.region);
                    profileForm.setValue("country", details.country);
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sito Web</label>
                  <Input {...profileForm.register("websiteUrl")} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefono</label>
                  <Input {...profileForm.register("phone")} placeholder="+39..." />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Partita IVA</label>
                <Input {...profileForm.register("vatNumber")} placeholder="IT..." />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salva Modifiche
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BreweryDashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

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
      name: "",
      style: "",
      abv: null,
      ibu: null,
      description: "",
      color: "",
      isBottled: false,
    },
  });

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
      toast({ title: "Successo", description: "Birra aggiornata con successo" });
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
      toast({ title: "Successo", description: "Birra eliminata con successo" });
      queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la birra", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingBeer(null);
    form.reset({
      name: "",
      style: "",
      abv: null,
      ibu: null,
      description: "",
      color: "",
      isBottled: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (beer: Beer) => {
    setEditingBeer(beer);
    form.reset({
      name: beer.name,
      style: beer.style,
      abv: beer.abv ? parseFloat(beer.abv) : null,
      ibu: beer.ibu ?? null,
      description: beer.description ?? "",
      color: beer.color ?? "",
      isBottled: beer.isBottled ?? false,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: BeerFormValues) => {
    if (editingBeer) {
      updateBeerMutation.mutate({ id: editingBeer.id, values });
    } else {
      createBeerMutation.mutate(values);
    }
  };

  if (authLoading || requestLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Caricamento...</p>
        </div>
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
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Caricamento dashboard birrificio...</p>
        </div>
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

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Dashboard Birrificio
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
            Gestisci il tuo birrificio e le tue birre
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Profilo
          </TabsTrigger>
          <TabsTrigger value="beers" className="flex items-center gap-2">
            <BeerIcon className="w-4 h-4" /> Birre ({beers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <BreweryProfileEditor brewery={brewery} onUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/brewery/my"] })} />
        </TabsContent>

        <TabsContent value="beers">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <BeerIcon className="w-5 h-5 text-amber-600" />
              Le Tue Birre
            </h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openCreateDialog}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Birra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBeer ? "Modifica Birra" : "Nuova Birra"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome della birra" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder="Es. IPA, Lager, Stout..." {...field} />
                          </FormControl>
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
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="5.5"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                              />
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
                              <Input
                                type="number"
                                placeholder="40"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                              />
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
                          <FormControl>
                            <Input placeholder="Es. Dorato, Ambrato, Scuro..." {...field} value={field.value ?? ""} />
                          </FormControl>
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
                          <FormControl>
                            <Textarea
                              placeholder="Descrivi la tua birra..."
                              rows={3}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isBottled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <FormLabel className="text-sm font-medium">Disponibile in bottiglia</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      disabled={createBeerMutation.isPending || updateBeerMutation.isPending}
                    >
                      {(createBeerMutation.isPending || updateBeerMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingBeer ? "Salva Modifiche" : "Aggiungi Birra"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {beers.length === 0 ? (
            <Card className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-orange-200/50">
              <CardContent className="pt-6 text-center py-12">
                <BeerIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna birra</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Non hai ancora aggiunto nessuna birra. Inizia aggiungendo la tua prima birra!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beers.map((beer) => (
                <Card
                  key={beer.id}
                  className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-orange-200/50 shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{beer.name}</CardTitle>
                        <CardDescription className="mt-1">{beer.style}</CardDescription>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(beer)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteBeerMutation.mutate(beer.id)}
                          disabled={deleteBeerMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {beer.abv && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          ABV {beer.abv}%
                        </Badge>
                      )}
                      {beer.ibu && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                          IBU {beer.ibu}
                        </Badge>
                      )}
                      {beer.color && (
                        <Badge variant="outline">{beer.color}</Badge>
                      )}
                      {beer.isBottled && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Bottiglia
                        </Badge>
                      )}
                    </div>
                    {beer.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {beer.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
