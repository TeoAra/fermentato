import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Beer, 
  Wine, 
  Utensils, 
  Facebook, 
  Instagram, 
  Twitter,
  Plus,
  Edit,
  Trash2,
  Upload,
  Globe
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok } from "react-icons/si";

interface Pub {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  vatNumber?: string;
  businessName?: string;
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
  priceBottle: string;
  bottleSize: string;
  quantity?: number;
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  orderIndex: number;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  allergens?: string[];
  isAvailable: boolean;
  orderIndex: number;
}

export default function PubDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);

  // Get user's pubs
  const { data: pubs = [], isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated,
  });

  // Get pub details, tap list, bottle list, and menu
  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", selectedPub?.id, "taplist"],
    enabled: !!selectedPub?.id,
  });

  const { data: bottleList = [] } = useQuery({
    queryKey: ["/api/pubs", selectedPub?.id, "bottles"],
    enabled: !!selectedPub?.id,
  });

  const { data: menu = [] } = useQuery({
    queryKey: ["/api/pubs", selectedPub?.id, "menu"],
    enabled: !!selectedPub?.id,
  });

  // Update pub mutation
  const updatePubMutation = useMutation({
    mutationFn: async (data: Partial<Pub>) => {
      if (!selectedPub) throw new Error("No pub selected");
      return apiRequest(`/api/pubs/${selectedPub.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Pub aggiornato con successo" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il pub",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (pubs && pubs.length > 0 && !selectedPub) {
      setSelectedPub(pubs[0]);
    }
  }, [pubs, selectedPub]);

  if (isLoading || pubsLoading) {
    return <div className="flex items-center justify-center h-64">Caricamento...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Accesso Richiesto</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Devi essere autenticato come proprietario di un pub per accedere alla dashboard.
        </p>
        <Button onClick={() => window.location.href = "/api/login"}>
          Accedi
        </Button>
      </div>
    );
  }

  if (!pubs || pubs.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Nessun Pub Registrato</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Non hai ancora registrato nessun pub. Registra il tuo pub per iniziare.
        </p>
        <Button onClick={() => window.location.href = "/register-pub"}>
          Registra Pub
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Pub
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestisci il tuo pub, tap list, cantina e menu
          </p>
        </div>

        {/* Pub Selection */}
        {pubs.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Seleziona Pub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pubs.map((pub: Pub) => (
                  <Card
                    key={pub.id}
                    className={`cursor-pointer transition-all ${
                      selectedPub?.id === pub.id
                        ? "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedPub(pub)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{pub.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {pub.city}, {pub.region}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPub && (
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Info & Social
              </TabsTrigger>
              <TabsTrigger value="taplist" className="flex items-center gap-2">
                <Beer className="w-4 h-4" />
                Tap List
              </TabsTrigger>
              <TabsTrigger value="cantina" className="flex items-center gap-2">
                <Wine className="w-4 h-4" />
                Cantina
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Menu Cibo
              </TabsTrigger>
            </TabsList>

            {/* Informazioni e Social Media */}
            <TabsContent value="info">
              <PubInfoTab pub={selectedPub} onUpdate={updatePubMutation.mutate} />
            </TabsContent>

            {/* Tap List */}
            <TabsContent value="taplist">
              <TapListTab pubId={selectedPub.id} tapList={tapList} />
            </TabsContent>

            {/* Cantina (Bottle List) */}
            <TabsContent value="cantina">
              <CantinaTab pubId={selectedPub.id} bottleList={bottleList} />
            </TabsContent>

            {/* Menu Cibo */}
            <TabsContent value="menu">
              <MenuTab pubId={selectedPub.id} menu={menu} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// Componente per gestire le informazioni del pub e social media
function PubInfoTab({ pub, onUpdate }: { pub: Pub; onUpdate: (data: Partial<Pub>) => void }) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
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

            <Button type="submit" className="w-full">
              Salva Informazioni
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

          <Button 
            onClick={() => onUpdate(formData)} 
            className="w-full"
          >
            Salva Social Media
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente per gestire la Tap List
function TapListTab({ pubId, tapList }: { pubId: number; tapList: TapItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tap List</CardTitle>
            <CardDescription>
              Gestisci le birre alla spina del tuo pub
            </CardDescription>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Birra
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tapList.length === 0 ? (
          <div className="text-center py-8">
            <Beer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Nessuna birra in tap list. Aggiungi la prima birra!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tapList.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {item.beer.logoUrl && (
                    <img
                      src={item.beer.logoUrl}
                      alt={item.beer.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{item.beer.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {item.beer.brewery.name} • {item.beer.style} • {item.beer.abv}%
                    </p>
                    {item.tapNumber && (
                      <Badge variant="outline" className="mt-1">
                        Spina {item.tapNumber}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {item.priceSmall && (
                      <p className="text-sm">Piccola: €{item.priceSmall}</p>
                    )}
                    {item.priceMedium && (
                      <p className="text-sm">Media: €{item.priceMedium}</p>
                    )}
                    {item.priceLarge && (
                      <p className="text-sm">Grande: €{item.priceLarge}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente per gestire la Cantina (Bottle List)
function CantinaTab({ pubId, bottleList }: { pubId: number; bottleList: BottleItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cantina Birre</CardTitle>
            <CardDescription>
              Gestisci le birre in bottiglia del tuo pub
            </CardDescription>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Bottiglia
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bottleList.length === 0 ? (
          <div className="text-center py-8">
            <Wine className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Nessuna birra in cantina. Aggiungi la prima bottiglia!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bottleList.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  {item.beer.logoUrl && (
                    <img
                      src={item.beer.logoUrl}
                      alt={item.beer.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.beer.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {item.beer.brewery.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.beer.style} • {item.beer.abv}%
                    </p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Prezzo:</span>
                    <span className="font-semibold">€{item.priceBottle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Formato:</span>
                    <span>{item.bottleSize}</span>
                  </div>
                  {item.quantity && (
                    <div className="flex justify-between text-sm">
                      <span>Disponibili:</span>
                      <Badge variant={item.quantity > 5 ? "default" : "destructive"}>
                        {item.quantity}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente per gestire il Menu Cibo
function MenuTab({ pubId, menu }: { pubId: number; menu: MenuCategory[] }) {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista Categorie */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categorie Menu</CardTitle>
              <CardDescription>
                Gestisci le categorie del menu
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {menu.length === 0 ? (
            <div className="text-center py-8">
              <Utensils className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Nessuna categoria menu
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {menu.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCategory?.id === category.id
                      ? "bg-orange-100 dark:bg-orange-900/20 border-orange-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {category.items.length} prodotti
                  </p>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prodotti della Categoria Selezionata */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {selectedCategory ? selectedCategory.name : "Seleziona una categoria"}
                </CardTitle>
                <CardDescription>
                  {selectedCategory 
                    ? `Gestisci i prodotti della categoria ${selectedCategory.name}`
                    : "Seleziona una categoria per vedere i prodotti"
                  }
                </CardDescription>
              </div>
              {selectedCategory && (
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Prodotto
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCategory ? (
              <div className="text-center py-12">
                <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  Seleziona una categoria per vedere i prodotti
                </p>
              </div>
            ) : selectedCategory.items.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  Nessun prodotto in questa categoria
                </p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Primo Prodotto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCategory.items.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant={item.isAvailable ? "default" : "secondary"}>
                            {item.isAvailable ? "Disponibile" : "Non disponibile"}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.allergens.map((allergen) => (
                              <Badge key={allergen} variant="outline" className="text-xs">
                                {allergen}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-orange-600">
                          €{item.price}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}