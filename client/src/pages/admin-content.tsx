import { useState } from "react";
import { ArrowLeft, BeerIcon, Building2, MapPin, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminContentManager from "@/components/AdminContentManager";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function GeocodeBreweriesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; geocoded: number; failed: number } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleGeocode = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/admin/breweries/geocode");
      setResult(data);
      qc.invalidateQueries({ queryKey: ["/api/breweries"] });
      qc.invalidateQueries({ queryKey: ["/api/home/map-data"] });
      toast({
        title: "Geocoding completato",
        description: `${data.geocoded}/${data.total} birrifici geocodificati`,
      });
    } catch (e: any) {
      toast({ title: "Errore geocoding", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl">
      <Globe className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Geocodifica birrifici senza coordinate</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">Assegna automaticamente lat/lng a tutti i birrifici con indirizzo ma senza coordinate (max 200 per volta)</p>
        {result && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {result.geocoded} geocodificati · {result.failed} falliti · {result.total} totali esaminati
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl flex-shrink-0"
        onClick={handleGeocode}
        disabled={loading}
      >
        {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Geocoding...</> : "Geocodifica"}
      </Button>
    </div>
  );
}

export default function AdminContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-200 hover:bg-stone-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Gestione Contenuti
          </h1>
        </div>

        <Tabs defaultValue="beers" className="space-y-6">
          <TabsList className="bg-stone-50 dark:bg-[hsl(25,14%,12%)] p-1 rounded-2xl h-auto">
            <TabsTrigger value="beers" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <BeerIcon className="w-4 h-4" />
              Birre
            </TabsTrigger>
            <TabsTrigger value="breweries" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4" />
              Birrifici
            </TabsTrigger>
            <TabsTrigger value="pubs" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <MapPin className="w-4 h-4" />
              Pub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beers">
            <AdminContentManager type="beers" />
          </TabsContent>

          <TabsContent value="breweries">
            <GeocodeBreweriesButton />
            <AdminContentManager type="breweries" />
          </TabsContent>

          <TabsContent value="pubs">
            <AdminContentManager type="pubs" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
