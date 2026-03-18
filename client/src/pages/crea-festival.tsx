import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, MapPin, Calendar, ExternalLink } from "lucide-react";
import {
  Beer, QrCode, BarChart3, UtensilsCrossed, Star,
  CreditCard, CheckCircle2, ArrowRight, Smartphone, Zap,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const PRICE = 50;

const FEATURES = [
  { icon: QrCode, title: "Taplist QR digitale", desc: "I visitatori scannerizzano il QR e vedono tutte le birre in tempo reale" },
  { icon: Star, title: "Valutazioni 1–10", desc: "Ogni birra riceve voti dagli utenti: costruisci la classifica del festival" },
  { icon: UtensilsCrossed, title: "Menu cibo", desc: "Aggiungi e aggiorna il menu cibo con disponibilità in tempo reale" },
  { icon: BarChart3, title: "Classifiche live", desc: "Vedi in tempo reale le birre più amate e le spine più richieste" },
  { icon: Smartphone, title: "Mobile-first", desc: "Ottimizzato per smartphone, nessuna app da installare per i visitatori" },
  { icon: Zap, title: "Attivazione immediata", desc: "Paga e il tuo festival è live in pochi minuti" },
];

function FestivalCreationForm({ onCreated }: { onCreated: (fest: any) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "", slug: "", description: "", location: "",
    startDate: "", endDate: "", showFood: true,
    logoUrl: "", coverImageUrl: "", priceEur: PRICE,
  });
  const [slugEdited, setSlugEdited] = useState(false);

  const suggestSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/festivals/register", { method: "POST" }, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/festivals/public"] });
      toast({ title: "Festival creato! Ora procedi con il pagamento per attivarlo." });
      onCreated(data);
    },
    onError: (err: any) => toast({ title: err?.message || "Errore nella creazione", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Immagini — stacked su mobile */}
      <ImageUpload
        label="Logo festival"
        description="Icona quadrata (400×400px)"
        currentImageUrl={form.logoUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, logoUrl: url || "" }))}
        folder="festivals/logos"
        aspectRatio="square"
        recommendedDimensions="400×400px"
      />
      <ImageUpload
        label="Immagine di copertina"
        description="Banner orizzontale (1200×400px)"
        currentImageUrl={form.coverImageUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, coverImageUrl: url || "" }))}
        folder="festivals/covers"
        aspectRatio="landscape"
        recommendedDimensions="1200×400px"
      />

      <Separator />

      {/* Nome */}
      <div>
        <Label>Nome del festival *</Label>
        <Input
          className="mt-1"
          value={form.name}
          onChange={e => {
            const name = e.target.value;
            setForm(f => ({ ...f, name, slug: slugEdited ? f.slug : suggestSlug(name) }));
          }}
          placeholder="Es. Roma Beer Fest 2026"
        />
      </div>

      {/* Slug */}
      <div>
        <Label>URL pubblico (slug) *</Label>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">/festival/</span>
          <Input
            value={form.slug}
            onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value })); }}
            placeholder="roma-beer-fest-2026"
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Questo sarà il link del vostro taplist QR</p>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data inizio</Label>
          <Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>Data fine</Label>
          <Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Location con Google */}
      <div>
        <Label>Location</Label>
        <div className="mt-1">
          <AddressAutocomplete
            value={form.location}
            onAddressSelect={d => setForm(f => ({ ...f, location: d.formattedAddress }))}
            placeholder="Es. Parco della Musica, Roma"
            countryRestriction={null}
          />
        </div>
      </div>

      {/* Descrizione */}
      <div>
        <Label>Descrizione breve</Label>
        <Textarea
          className="mt-1"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Descrivi il tuo festival in 1-2 righe"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
        <Label>Mostra sezione menu cibo</Label>
      </div>

      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
        size="lg"
        onClick={() => createMutation.mutate(form)}
        disabled={createMutation.isPending || !form.name || !form.slug}
      >
        {createMutation.isPending
          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
          : <ArrowRight className="h-4 w-4 mr-2" />}
        Crea festival e procedi al pagamento
      </Button>
      <p className="text-xs text-center text-gray-400">
        Pagamento sicuro via Stripe · €{PRICE} una tantum · Nessun abbonamento
      </p>
    </div>
  );
}

function FestivalCard({ fest }: { fest: any }) {
  const today = new Date();
  const end = fest.endDate ? new Date(fest.endDate) : null;
  const start = fest.startDate ? new Date(fest.startDate) : null;
  const isPast = end && end < today;
  const isLive = !isPast && start && start <= today;
  const isFuture = start && start > today;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${isPast ? "opacity-70" : ""}`}>
      {fest.coverImageUrl && (
        <div className="h-28 relative">
          <img src={fest.coverImageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {fest.logoUrl && (
            <img src={fest.logoUrl} alt="" className="absolute bottom-2 left-3 w-10 h-10 rounded-xl object-cover shadow-lg border-2 border-white" />
          )}
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!fest.coverImageUrl && fest.logoUrl && (
              <img src={fest.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            )}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{fest.name}</h3>
          </div>
          {isPast ? (
            <Badge variant="secondary" className="text-xs flex-shrink-0">Concluso</Badge>
          ) : isLive ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0">In corso</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs flex-shrink-0">In arrivo</Badge>
          )}
        </div>
        {fest.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {fest.location}
          </div>
        )}
        {(fest.startDate || fest.endDate) && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            {fest.startDate && fest.endDate
              ? `${formatDate(fest.startDate)} – ${formatDate(fest.endDate)}`
              : fest.startDate ? `Dal ${formatDate(fest.startDate)}`
              : `Fino al ${formatDate(fest.endDate)}`}
          </div>
        )}
        {fest.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{fest.description}</p>
        )}
        {fest.isActive && (
          <Link href={`/festival/${fest.slug}`}>
            <Button size="sm" variant="outline" className="w-full mt-1 text-xs h-7">
              <ExternalLink className="h-3 w-3 mr-1" />
              Vedi taplist
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreaFestival() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [createdFest, setCreatedFest] = useState<any>(null);

  // Auto-open form if redirected back after login with ?open=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") === "1" && isAuthenticated) {
      setShowForm(true);
      window.history.replaceState({}, "", "/festival");
    }
  }, [isAuthenticated]);

  // Public festival list (all, including past)
  const { data: publicFests = [] } = useQuery<any[]>({
    queryKey: ["/api/festivals/public"],
    queryFn: () => apiRequest("/api/festivals/public"),
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ festivalId }: { festivalId: number }) =>
      apiRequest("/api/stripe/festival-checkout", { method: "POST" }, { festivalId }),
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: () => toast({ title: "Errore nel pagamento", variant: "destructive" }),
  });

  const handleCreated = (fest: any) => {
    setCreatedFest(fest);
    setShowForm(false);
  };

  const handleStartCreate = () => {
    if (!isAuthenticated) {
      navigate("/registra-festival");
      return;
    }
    const userType = (user as any)?.userType;
    const activeRole = (user as any)?.activeRole;
    const canCreate = ["pub_owner", "brewery_owner", "admin"].includes(userType) ||
                      ["pub_owner", "brewery_owner", "admin"].includes(activeRole);
    if (!canCreate) {
      navigate("/registra-festival");
      return;
    }
    setShowForm(true);
  };

  const today = new Date();
  const liveFests = publicFests.filter(f => {
    const end = f.endDate ? new Date(f.endDate) : null;
    return f.isActive && (!end || end >= today);
  });
  const pastFests = publicFests.filter(f => {
    const end = f.endDate ? new Date(f.endDate) : null;
    return end && end < today;
  });
  const futureFests = publicFests.filter(f => {
    const start = f.startDate ? new Date(f.startDate) : null;
    const end = f.endDate ? new Date(f.endDate) : null;
    return f.isActive && start && start > today && (!end || end >= today);
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <Badge className="bg-white/20 text-white border-white/30 mb-4">Festival Mode</Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Il tuo festival di birra<br />
            <span className="text-amber-200">digitale e interattivo</span>
          </h1>
          <p className="text-amber-100 text-lg mb-8 max-w-xl mx-auto">
            Taplist QR in tempo reale, valutazioni dai visitatori, menu cibo, classifiche live.
            Attivazione immediata con un pagamento unico.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-white text-amber-700 hover:bg-amber-50 font-bold text-base px-8"
              onClick={handleStartCreate}
            >
              <Beer className="h-5 w-5 mr-2" />
              Crea il tuo festival
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <div className="flex items-center gap-2 text-amber-100">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">€{PRICE} una tantum · nessun abbonamento</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Post-creation: payment CTA */}
        {createdFest && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  "{createdFest.name}" è pronto!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Completa il pagamento per attivare il taplist pubblico.
                </p>
              </div>
              <div className="text-4xl font-extrabold text-amber-600">€{createdFest.priceEur ?? PRICE}</div>
              <p className="text-sm text-gray-500">Pagamento unico · accesso per tutta la durata dell'evento</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => checkoutMutation.mutate({ festivalId: createdFest.id })}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Paga e attiva il festival
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(`/festival-dashboard?festival_id=${createdFest.id}`)}
                >
                  Gestisci prima le spine
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Puoi configurare spine e menu anche ora. Il taplist diventerà pubblico solo dopo il pagamento.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Festival showcase carousel */}
        {publicFests.length > 0 && (
          <div className="space-y-8">

            {/* Active + upcoming: big horizontal scroll carousel */}
            {(liveFests.length > 0 || futureFests.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Festival in corso e in arrivo
                  </h2>
                  <span className="ml-auto text-xs text-gray-400">scorri →</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth -mx-4 px-4">
                  {[...liveFests, ...futureFests].map(f => (
                    <div key={f.id} className="flex-shrink-0 w-72 snap-start">
                      <FestivalCard fest={f} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past: compact horizontal scroll */}
            {pastFests.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                  <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400">Festival passati</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4">
                  {pastFests.map(f => (
                    <div key={f.id} className="flex-shrink-0 w-60 snap-start">
                      <FestivalCard fest={f} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Features */}
        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
            Tutto quello che ti serve, già incluso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <Card className="border-2 border-amber-200 dark:border-amber-800">
          <CardContent className="py-10 text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Una tariffa unica. Nessuna sorpresa.</h2>
            <div className="text-6xl font-extrabold text-amber-600">€{PRICE}</div>
            <p className="text-gray-500">Pagamento unico per tutta la durata del festival</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto text-sm text-left">
              {[
                "Taplist QR illimitato",
                "Spine e birre illimitate",
                "Menu cibo con gestione disponibilità",
                "Valutazioni dei visitatori",
                "Classifiche live in tempo reale",
                "Dashboard gestionale completa",
                "Supporto email incluso",
                "Pagamento sicuro via Stripe",
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{f}</span>
                </div>
              ))}
            </div>
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10"
              onClick={handleStartCreate}
            >
              Inizia ora
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Domande frequenti</h2>
          {[
            {
              q: "I visitatori devono scaricare un'app?",
              a: "No. Il taplist è una pagina web accessibile via QR code con qualsiasi smartphone. Nessuna installazione richiesta."
            },
            {
              q: "Posso modificare le spine durante il festival?",
              a: "Sì, puoi aggiungere spine, segnarle come esaurite o modificarle in tempo reale dalla dashboard."
            },
            {
              q: "Cosa succede dopo il termine del festival?",
              a: "Il taplist viene disattivato automaticamente. Le statistiche e le classifiche restano visibili nella dashboard per sempre. Puoi rinnovare per una nuova edizione."
            },
            {
              q: "Posso usarlo per più edizioni dello stesso festival?",
              a: `Sì, ogni edizione è un festival separato. Il rinnovo costa €${PRICE} per ogni nuova edizione.`
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{q}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            Hai già un festival su Fermenta?{" "}
            <Link href="/festival-dashboard" className="text-amber-600 font-semibold hover:underline">
              Vai alla dashboard
            </Link>
          </p>
        </div>
      </div>

      {/* Creation form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea il tuo festival</DialogTitle>
          </DialogHeader>
          <FestivalCreationForm onCreated={handleCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
