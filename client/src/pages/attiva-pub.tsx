import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";
import {
  Crown, CheckCircle2, Zap, Beer, ArrowRight,
  Clock, CreditCard, Building2,
  ArrowLeft, Gift, Lock, Loader2
} from "lucide-react";

const PUB_FEATURES = [
  "Profilo pub verificato con badge ufficiale",
  "Taplist digitale illimitata",
  "Menu bottiglia illimitato",
  "Menu con categorie e prezzi",
  "Modalità TV taplist a schermo intero",
  "QR Code personalizzato per i tavoli",
  "PDF menu scaricabile in tempo reale",
  "Gestione eventi e serate a tema",
  "Notifiche push ai clienti che seguono il pub",
  "Analytics visitatori (visite, tap più cliccate)",
  "Priorità nei risultati di ricerca",
  "Dashboard gestionale dedicata",
  "Supporto email dedicato",
];

type Step = "choose" | "trial-confirm" | "checkout" | "trial-success" | "checkout-success" | "activating";

export default function AttivaPub() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [selectedPub, setSelectedPub] = useState<any>(null);
  const [registrationType, setRegistrationType] = useState<"pub" | "brewpub">("pub");

  // ── Mutations ──────────────────────────────────────────────────────────────

  const activateMutation = useMutation({
    mutationFn: (sessionId?: string) =>
      apiRequest("/api/stripe/activate-pub", { method: "POST" }, { sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      setStep("checkout-success");
    },
    onError: (err: any) => {
      toast({
        title: "Errore attivazione",
        description: err?.message || "Riprova o contatta il supporto",
        variant: "destructive",
      });
      setStep("checkout-success");
    },
  });

  const trialMutation = useMutation({
    mutationFn: (pubId: number) =>
      apiRequest(`/api/pubs/${pubId}/start-trial`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs/my"] });
      setStep("trial-success");
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile attivare il periodo di prova", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/stripe/pub-checkout", { method: "POST" }),
    onSuccess: (data: any) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Errore", description: "Nessun URL di pagamento ricevuto", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile avviare il pagamento", variant: "destructive" });
    },
  });

  // ── URL params check ───────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id") || undefined;

    if (params.get("checkout_success") === "1") {
      // Recover registration type saved before Stripe redirect
      const savedType = sessionStorage.getItem("fermenta_reg_type") as "pub" | "brewpub" | null;
      if (savedType) {
        setRegistrationType(savedType);
        sessionStorage.removeItem("fermenta_reg_type");
      }
      window.history.replaceState({}, "", "/attiva-pub");
      setStep("activating");
      if (isAuthenticated) activateMutation.mutate(sessionId);
    } else if (params.get("direct") === "1" && isAuthenticated) {
      // Detect brewpub case from server redirect
      const type = params.get("type") === "brewpub" ? "brewpub" : "pub";
      setRegistrationType(type);
      // Persist across Stripe redirect
      sessionStorage.setItem("fermenta_reg_type", type);
      window.history.replaceState({}, "", "/attiva-pub");
      setStep("checkout");
      setTimeout(() => checkoutMutation.mutate(), 800);
    }
  }, [isAuthenticated]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: userPubs = [] } = useQuery<any[]>({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated,
  });

  // ── Step: activating (spinner while we activate the pub) ──────────────────

  if (step === "activating") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Attivazione in corso…</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Stiamo configurando il tuo pub. Un attimo.</p>
        </div>
      </div>
    );
  }

  // ── Step: trial-success ───────────────────────────────────────────────────

  if (step === "trial-success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title="Periodo di prova attivato — Fermenta.to" url="https://fermenta.to/attiva-pub" />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Periodo di prova attivato!</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Hai 15 giorni gratuiti per esplorare tutte le funzionalità del Piano Pub Pro. Il tuo pub è ora verificato.
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 justify-center text-green-700 dark:text-green-300 font-semibold">
                <Clock className="w-4 h-4" />
                15 giorni di accesso completo gratuito
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                  Vai alla dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setStep("checkout")}>
                Attiva l'abbonamento completo
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Step: checkout-success ────────────────────────────────────────────────

  if (step === "checkout-success") {
    const isBrewpub = registrationType === "brewpub";
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title={isBrewpub ? "Brewpub attivato — Fermenta.to" : "Pub attivato — Fermenta.to"} url="https://fermenta.to/attiva-pub" />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isBrewpub ? "Il tuo brewpub è attivo!" : "Il tuo pub è attivo!"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Benvenuto nel Piano Pub Pro. Il tuo periodo di prova di 15 giorni è iniziato — nessun addebito per ora.
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 justify-center text-green-700 dark:text-green-300 font-semibold">
                <Clock className="w-4 h-4" />
                15 giorni gratuiti · poi €65/anno IVA inclusa
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Puoi disdire in qualsiasi momento durante la prova senza alcun addebito.
              </p>
            </div>
            {isBrewpub && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left space-y-1">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                  <Building2 className="w-4 h-4" />
                  Richiesta birrificio in attesa
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  La parte birrificio del tuo brewpub è in attesa di verifica da parte del nostro team. Riceverai una notifica appena approvata — di solito entro 24-48 ore.
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                  Vai alla dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Torna alla home</Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Step: checkout ────────────────────────────────────────────────────────

  if (step === "checkout") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title="Attiva Piano Pub — Fermenta.to" url="https://fermenta.to/attiva-pub" />
        <div className="max-w-lg mx-auto px-4 py-12 flex-1 w-full">
          <button onClick={() => setStep("choose")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Torna indietro
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Piano Pub Pro</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">15 giorni gratis · poi €65/anno IVA inclusa</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-900 dark:text-white">Piano Pub Pro — annuale</span>
                  <span className="text-2xl font-bold text-amber-600">€65</span>
                </div>
                <div className="space-y-2">
                  {[
                    "15 giorni di prova gratuita",
                    "Badge pub verificato",
                    "Taplist digitale illimitata",
                    "Analytics e notifiche push",
                    "Disdici quando vuoi nei 15 giorni — nessun addebito",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Pre-autorizzazione a €0</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Inserisci i dati della carta per la pre-autorizzazione. Non verrai addebitato per i primi 15 giorni. Se disdici prima della scadenza, non paghi nulla.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 text-base"
              disabled={checkoutMutation.isPending || !isAuthenticated}
              onClick={() => checkoutMutation.mutate()}
            >
              {checkoutMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reindirizzamento a Stripe…</>
              ) : (
                <><Lock className="w-4 h-4 mr-2" />Procedi al pagamento sicuro</>
              )}
            </Button>

            {!isAuthenticated && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Link href="/login" className="text-amber-600 hover:underline font-semibold">Accedi</Link> per procedere al pagamento.
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Lock className="w-3 h-3" />
              Pagamento sicuro e cifrato · Powered by Stripe
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Step: trial-confirm ───────────────────────────────────────────────────

  if (step === "trial-confirm") {
    const eligiblePubs = Array.isArray(userPubs) ? userPubs.filter((p: any) => p.subscriptionStatus === 'none') : [];
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title="Prova gratuita — Fermenta.to" url="https://fermenta.to/attiva-pub" />
        <div className="max-w-md mx-auto px-4 py-16 flex-1">
          <button onClick={() => setStep("choose")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Torna indietro
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Periodo di prova gratuita</h1>
            <p className="text-gray-500 dark:text-gray-400">15 giorni con tutte le funzionalità del Piano Pub Pro — senza carta di credito.</p>
          </div>

          {eligiblePubs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <p className="text-gray-500 dark:text-gray-400">
                  {!isAuthenticated
                    ? "Accedi per attivare il periodo di prova su un tuo pub."
                    : "Tutti i tuoi pub hanno già usato il periodo di prova o hanno un abbonamento attivo."
                  }
                </p>
                {!isAuthenticated && (
                  <a href="/api/login">
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white">Accedi</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Scegli il pub su cui attivare la prova:</p>
              {eligiblePubs.map((pub: any) => (
                <Card
                  key={pub.id}
                  className={`cursor-pointer transition-all border-2 ${selectedPub?.id === pub.id ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700 hover:border-amber-300"}`}
                  onClick={() => setSelectedPub(pub)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Beer className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{pub.name}</p>
                      <p className="text-sm text-gray-500">{pub.city}</p>
                    </div>
                    {selectedPub?.id === pub.id && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                  </CardContent>
                </Card>
              ))}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 mt-4"
                disabled={!selectedPub || trialMutation.isPending}
                onClick={() => selectedPub && trialMutation.mutate(selectedPub.id)}
              >
                {trialMutation.isPending ? "Attivazione..." : (
                  <><Gift className="w-4 h-4 mr-2" />Attiva 15 giorni gratis su {selectedPub?.name || "..."}</>
                )}
              </Button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ── Step: choose (default landing) ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
      <SEO
        title="Attiva il Piano Pub — Fermenta.to"
        description="Porta il tuo pub su Fermenta.to. Piano Pub Pro a 65€/anno con taplist digitale, analytics, notifiche push e molto altro."
        url="https://fermenta.to/attiva-pub"
      />

      <div className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">

        <div className="text-center mb-12">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 mb-4 text-sm px-3 py-1">
            Piano Pub Pro
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Porta il tuo pub<br />
            <span className="text-amber-500">su Fermenta.to</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Taplist digitale, analytics, notifiche push e molto altro. Tutto in un unico piano a <strong>€65/anno</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card
            className="border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group"
            onClick={() => isAuthenticated ? setStep("trial-confirm") : window.location.href = "/api/login"}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Prova gratuita</p>
                  <p className="text-xs text-gray-500">15 giorni — nessuna carta di credito</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Esplora tutte le funzionalità gratuitamente per 15 giorni. Nessun obbligo, nessun rinnovo automatico.
              </p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white group-hover:bg-amber-600">
                <Gift className="w-4 h-4 mr-2" />
                Inizia la prova gratuita
              </Button>
            </CardContent>
          </Card>

          <Card
            className="border-2 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-100 dark:shadow-amber-900/20 cursor-pointer group"
            onClick={() => setStep("checkout")}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-xl px-5 py-4 text-white">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  <span className="font-bold">Piano Pub Pro</span>
                </div>
                <Badge className="bg-white/20 border-0 text-white text-xs">Tutto incluso</Badge>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">€65</span>
                <span className="text-white/80 mb-0.5 text-sm">/ anno</span>
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Attiva subito con 15 giorni di prova gratuita. Se disdici nei 15 giorni non paghi nulla.
              </p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white group-hover:bg-amber-600">
                <Zap className="w-4 h-4 mr-2" />
                Attiva ora — €0 per 15 giorni
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-10">
          <CardContent className="p-6">
            <h2 className="font-bold text-gray-900 dark:text-white text-base mb-4">Tutto incluso nel Piano Pub Pro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PUB_FEATURES.map(f => (
                <div key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 mb-10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-800 dark:text-purple-200 text-sm">Sei un brewpub?</p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Se produci e somministri birra artigianale, puoi attivare sia il piano Pub che la verifica Birrificio sullo stesso account.
                </p>
                <Link href="/prezzi#brewpub">
                  <Button variant="link" className="text-purple-600 dark:text-purple-400 p-0 h-auto text-sm mt-1">
                    Scopri come funziona →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/prezzi">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla pagina prezzi
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
