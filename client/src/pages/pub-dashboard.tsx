import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TapListManager } from "@/components/taplist-manager";
import { BottleListManager } from "@/components/bottle-list-manager";
import { MenuManager } from "@/components/menu-manager";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Beer, Wine, Utensils, Building2, Plus, AlertCircle, LogIn,
  Facebook, Instagram, X as Twitter, Music, Clock
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";

interface Pub {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  ownerId: string;
}

interface TapItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  priceSmall?: string;
  priceMedium?: string;
  priceLarge?: string;
  tapNumber?: number;
  description?: string;
  isVisible: boolean;
}

interface BottleItem {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
    };
  };
  price: string;
  quantity: number;
  size?: string;
  vintage?: string;
  description?: string;
  isVisible: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  isVisible: boolean;
  orderIndex: number;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens: string[];
  isVisible: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  orderIndex: number;
}

export default function PubDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso Richiesto",
        description: "Devi effettuare l'accesso per gestire i tuoi pub.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get user's pubs
  const { data: pubs = [], isLoading: pubsLoading, error: pubsError } = useQuery<Pub[]>({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated,
  });

  // Get pub details when pub is selected
  const { data: tapList = [], error: tapListError } = useQuery<TapItem[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "taplist"],
    enabled: !!selectedPub?.id,
  });

  const { data: bottleList = [], error: bottleListError } = useQuery<BottleItem[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "bottles"],
    enabled: !!selectedPub?.id,
  });

  const { data: menu = [], error: menuError } = useQuery<MenuCategory[]>({
    queryKey: ["/api/pubs", selectedPub?.id, "menu"],
    enabled: !!selectedPub?.id,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [pubsError, tapListError, bottleListError, menuError].filter(Boolean);
    
    for (const error of errors) {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Sessione Scaduta",
          description: "La tua sessione è scaduta. Effettua nuovamente l'accesso.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
    }
  }, [pubsError, tapListError, bottleListError, menuError, toast]);

  // Select first pub when pubs are loaded
  useEffect(() => {
    if (pubs && pubs.length > 0 && !selectedPub) {
      setSelectedPub(pubs[0]);
    }
  }, [pubs, selectedPub]);

  if (isLoading || pubsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Accesso Richiesto</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Per gestire i tuoi pub devi prima effettuare l'accesso.
        </p>
        <Button asChild className="w-full">
          <a href="/api/login">
            <LogIn className="w-4 h-4 mr-2" />
            Accedi con Replit
          </a>
        </Button>
      </div>
    );
  }

  if (!pubs || pubs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Nessun Pub Registrato</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Non hai ancora registrato nessun pub. Inizia registrando il tuo primo locale.
          </p>
          <Button asChild>
            <a href="/pub-registration">
              <Plus className="w-4 h-4 mr-2" />
              Registra il tuo Pub
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Pub
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Gestisci i tuoi pub e le loro tap list
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Benvenuto, {user.firstName} {user.lastName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <a href="/pub-registration">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Pub
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/api/logout">
              Esci
            </a>
          </Button>
        </div>
      </div>

      {/* Selezione Pub */}
      {pubs.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="font-medium">Pub selezionato:</span>
              <div className="flex gap-2 flex-wrap">
                {pubs.map((pub) => (
                  <Button
                    key={pub.id}
                    variant={selectedPub?.id === pub.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPub(pub)}
                  >
                    {pub.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPub && (
        <div className="space-y-6">
          {/* Info Pub */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedPub.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {selectedPub.address}, {selectedPub.city} ({selectedPub.region})
                  </CardDescription>
                  {selectedPub.description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      {selectedPub.description}
                    </p>
                  )}
                </div>
                {selectedPub.logoUrl && (
                  <img
                    src={selectedPub.logoUrl}
                    alt={selectedPub.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabs per gestione */}
          <Tabs defaultValue="taplist" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Info Pub
              </TabsTrigger>
              <TabsTrigger value="taplist" className="flex items-center gap-2">
                <Beer className="w-4 h-4" />
                Tap List ({tapList.length})
              </TabsTrigger>
              <TabsTrigger value="bottles" className="flex items-center gap-2">
                <Wine className="w-4 h-4" />
                Cantina ({bottleList.length})
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Menu ({menu.length})
              </TabsTrigger>
            </TabsList>

            {/* Info Pub Tab */}
            <TabsContent value="info">
              <PubInfoTab pub={selectedPub} />
            </TabsContent>

            {/* Tap List */}
            <TabsContent value="taplist">
              <TapListManager pubId={selectedPub.id} tapList={tapList} />
            </TabsContent>

            {/* Cantina Birre */}
            <TabsContent value="bottles">
              <BottleListManager pubId={selectedPub.id} bottleList={bottleList} />
            </TabsContent>

            {/* Menu Cibo */}
            <TabsContent value="menu">
              <MenuManager pubId={selectedPub.id} menu={menu} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// Componente per gestire le informazioni del pub
function PubInfoTab({ pub }: { pub: Pub }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: pub.name || "",
    description: pub.description || "",
    phone: pub.phone || "",
    email: pub.email || "",
    websiteUrl: pub.websiteUrl || "",
    logoUrl: pub.logoUrl || "",
    imageUrl: pub.imageUrl || "",
    facebookUrl: pub.facebookUrl || "",
    instagramUrl: pub.instagramUrl || "",
    twitterUrl: pub.twitterUrl || "",
    tiktokUrl: pub.tiktokUrl || "",
  });

  const updatePubMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/pubs/${pub.id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Informazioni pub aggiornate correttamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessione Scaduta",
          description: "Effettua nuovamente l'accesso.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le informazioni",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePubMutation.mutate(formData);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Pub</CardTitle>
          <CardDescription>
            Aggiorna le informazioni principali del tuo pub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Pub</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome del pub"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione del pub"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@miopub.it"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="websiteUrl">Sito Web</Label>
              <Input
                id="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://www.miopub.it"
              />
            </div>

            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Immagine Copertina URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updatePubMutation.isPending}
            >
              {updatePubMutation.isPending ? "Salvataggio..." : "Salva Informazioni"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>
            Collega i tuoi profili social per aumentare la visibilità
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="facebookUrl" className="flex items-center gap-2">
              <SiFacebook className="w-4 h-4 text-blue-600" />
              Facebook
            </Label>
            <Input
              id="facebookUrl"
              value={formData.facebookUrl}
              onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
              placeholder="https://facebook.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="instagramUrl" className="flex items-center gap-2">
              <SiInstagram className="w-4 h-4 text-pink-600" />
              Instagram
            </Label>
            <Input
              id="instagramUrl"
              value={formData.instagramUrl}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="twitterUrl" className="flex items-center gap-2">
              <SiX className="w-4 h-4 text-black dark:text-white" />
              X (Twitter)
            </Label>
            <Input
              id="twitterUrl"
              value={formData.twitterUrl}
              onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
              placeholder="https://x.com/miopub"
            />
          </div>

          <div>
            <Label htmlFor="tiktokUrl" className="flex items-center gap-2">
              <SiTiktok className="w-4 h-4 text-black dark:text-white" />
              TikTok
            </Label>
            <Input
              id="tiktokUrl"
              value={formData.tiktokUrl}
              onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
              placeholder="https://tiktok.com/@miopub"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}