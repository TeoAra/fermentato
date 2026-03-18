import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { ImageUpload } from "@/components/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  Beer, QrCode, BarChart3, UtensilsCrossed, Star,
  CreditCard, CheckCircle2, ArrowRight, Smartphone,
  Zap, Users,
} from "lucide-react";

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
    logoUrl: "", coverImageUrl: "", priceEur: 99,
  });

  const suggestSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/festivals/register", { method: "POST" }, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival creato! Ora procedi con il pagamento per attivarlo." });
      onCreated(data);
    },
    onError: (err: any) => toast({ title: err?.message || "Errore nella creazione", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Nome del festival *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || suggestSlug(e.target.value) }))}
            placeholder="Es. Roma Beer Fest 2026"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>URL pubblico (slug) *</Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 whitespace-nowrap">/festival/</span>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="roma-beer-fest-2026"
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Questo sarà il link del vostro taplist QR</p>
        </div>
        <div>
          <Label>Data inizio</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>Data fine</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Es. Parco della Musica, Roma" />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrizione breve</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Descrivi il tuo festival in 1-2 righe"
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
          <Label>Mostra sezione menu cibo</Label>
        </div>
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
        Pagamento sicuro via Stripe · €99 una tantum · Nessun abbonamento
      </p>
    </div>
  );
}

export default function CreaFestival() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  // Auto-open form if redirected back after login with ?open=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") === "1" && isAuthenticated) {
      setShowForm(true);
      window.history.replaceState({}, "", "/crea-festival");
    }
  }, [isAuthenticated]);
  const [createdFest, setCreatedFest] = useState<any>(null);

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
      window.location.href = `/api/login?returnTo=${encodeURIComponent("/crea-festival?open=1")}`;
      return;
    }
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-[hsl(25,14%,7%)]">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
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
              <span className="text-sm font-medium">€99 una tantum · nessun abbonamento</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

        {/* Se il festival è stato creato, mostra il pulsante pagamento */}
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
              <div className="text-4xl font-extrabold text-amber-600">€{createdFest.priceEur ?? 99}</div>
              <div className="text-sm text-gray-500">Pagamento unico · accesso per tutta la durata dell'evento</div>
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

        {/* Features grid */}
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
            <div className="text-6xl font-extrabold text-amber-600">€99</div>
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
              a: "Sì, ogni edizione è un festival separato. Il rinnovo costa €99 per ogni nuova edizione."
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{q}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{a}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="text-center py-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Hai già un festival su Fermenta?{" "}
            <Link href="/festival-dashboard" className="text-amber-600 font-semibold hover:underline">
              Vai alla dashboard
            </Link>
          </p>
          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10"
            onClick={handleStartCreate}
          >
            <Beer className="h-5 w-5 mr-2" />
            Crea il tuo festival digitale
          </Button>
        </div>
      </div>

      <Footer />

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
