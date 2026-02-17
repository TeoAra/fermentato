import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Beer as BeerIcon, Plus, Pencil, Trash2, Factory, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function BreweryDashboard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);

  const { data, isLoading } = useQuery<{ brewery: any; beers: Beer[] }>({
    queryKey: ["/api/brewery/my"],
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

      <Card className="mb-6 backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 border-orange-200/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">{brewery.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {brewery.location}{brewery.region ? `, ${brewery.region}` : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {brewery.description && (
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              {brewery.description}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <BeerIcon className="w-5 h-5 text-amber-600" />
          Le Tue Birre ({beers.length})
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
    </div>
  );
}
