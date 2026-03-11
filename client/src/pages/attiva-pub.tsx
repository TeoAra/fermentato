import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";
import {
  Crown, CheckCircle2, Zap, Beer, ArrowRight, Shield, Star, Bell, BarChart3,
  QrCode, Tv2, FileText, Calendar, MapPin, Clock, Mail, Building2, Users,
  ArrowLeft, Gift
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

type Step = "choose" | "trial-confirm" | "checkout" | "trial-success" | "checkout-success";

export default function AttivaPub() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [selectedPub, setSelectedPub] = useState<any>(null);
  const [form, setForm] = useState({
    pubName: "", ownerName: "", email: "", vatNumber: "", phone: "", city: "", notes: ""
  });

  const { data: userPubs = [] } = useQuery<any[]>({
    queryKey: ["/api/my-pubs"],
    enabled: isAuthenticated,
  });

  const trialMutation = useMutation({
    mutationFn: (pubId: number) => apiRequest(`/api/pubs/${pubId}/start-trial`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs/my"] });
      setStep("trial-success");
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile attivare il periodo di prova", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("/api/pub-subscription-request", { method: "POST" }, data),
    onSuccess: () => setStep("checkout-success"),
    onError: () => {
      setStep("checkout-success");
    },
  });

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pubName || !form.ownerName || !form.email) {
      toast({ title: "Campi obbligatori", description: "Compila nome pub, nome e cognome ed email", variant: "destructive" });
      return;
    }
    checkoutMutation.mutate(form);
  };

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

  if (step === "checkout-success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title="Richiesta inviata — Fermenta.to" url="https://fermenta.to/attiva-pub" />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Richiesta inviata!</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Abbiamo ricevuto la tua richiesta. Ti contatteremo entro 24 ore con le istruzioni per il pagamento e l'attivazione.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Come funziona l'attivazione:</p>
              <div className="space-y-1.5">
                {[
                  "Riceverai un'email con i dati per il bonifico bancario (o link al pagamento con carta)",
                  "Effettua il pagamento di €65 + IVA",
                  "Il tuo profilo verrà verificato e attivato automaticamente",
                  "Puoi usare il prova gratuita di 15 giorni nel frattempo",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/">
              <Button variant="outline">Torna alla home</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (step === "checkout") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
        <SEO title="Attiva Piano Pub — Fermenta.to" url="https://fermenta.to/attiva-pub" />
        <div className="max-w-2xl mx-auto px-4 py-12 flex-1 w-full">
          <button onClick={() => setStep("choose")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Torna indietro
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attiva Piano Pub Pro</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">€65 / anno + IVA · Accesso completo</p>
            </div>
          </div>

          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Dati del pub</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pubName">Nome del pub *</Label>
                    <Input id="pubName" value={form.pubName} onChange={e => setForm(f => ({ ...f, pubName: e.target.value }))} placeholder="es. Luppolino Pub" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Città *</Label>
                    <Input id="city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="es. Milano" required />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Dati del titolare</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerName">Nome e Cognome *</Label>
                    <Input id="ownerName" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Mario Rossi" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="tuo@email.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+39 333 1234567" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vatNumber">P.IVA (se disponibile)</Label>
                    <Input id="vatNumber" value={form.vatNumber} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} placeholder="IT01234567890" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Note aggiuntive</Label>
                  <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informazioni aggiuntive sul tuo pub..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Come funziona il pagamento</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Dopo aver inviato questa richiesta, ti contatteremo entro 24 ore con le istruzioni di pagamento (bonifico bancario o carta di credito). Il piano verrà attivato automaticamente dopo la conferma del pagamento.
                    </p>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mt-2">Importo: €65 + IVA 22% = €79,30</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 text-base" disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? "Invio in corso..." : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Invia richiesta di attivazione
                  </>
                )}
              </Button>
              {isAuthenticated && userPubs.length > 0 && userPubs.some((p: any) => p.subscriptionStatus === 'none') && (
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setStep("trial-confirm")}>
                  <Gift className="w-4 h-4 mr-2" />
                  Prova 15 giorni gratis
                </Button>
              )}
            </div>
          </form>
        </div>
        <Footer />
      </div>
    );
  }

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
                <Card key={pub.id} className={`cursor-pointer transition-all border-2 ${selectedPub?.id === pub.id ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700 hover:border-amber-300"}`}
                  onClick={() => setSelectedPub(pub)}>
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
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Attiva 15 giorni gratis su {selectedPub?.name || "..."}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 flex flex-col">
      <SEO
        title="Attiva il Piano Pub — Fermenta.to"
        description="Porta il tuo pub su Fermenta.to. Piano Pub Pro a 65€/anno con taplist digitale, analytics, notifiche push e molto altro."
        url="https://fermenta.to/attiva-pub"
      />

      <div className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">

        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 mb-4 text-sm px-3 py-1">
            🍺 Piano Pub Pro
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Porta il tuo pub<br />
            <span className="text-amber-500">su Fermenta.to</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Taplist digitale, analytics, notifiche push e molto altro. Tutto in un unico piano a <strong>€65/anno</strong>.
          </p>
        </div>

        {/* Two options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Trial */}
          <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group"
            onClick={() => isAuthenticated ? setStep("trial-confirm") : window.location.href = "/api/login"}>
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
                Esplora tutte le funzionalità del Piano Pub Pro gratuitamente per 15 giorni. Nessun obbligo, nessun rinnovo automatico.
              </p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white group-hover:bg-amber-600">
                <Gift className="w-4 h-4 mr-2" />
                Inizia la prova gratuita
              </Button>
            </CardContent>
          </Card>

          {/* Full subscription */}
          <Card className="border-2 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-100 dark:shadow-amber-900/20 cursor-pointer group"
            onClick={() => setStep("checkout")}>
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
                Accesso completo per 1 anno. Nessun rinnovo automatico.
              </p>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white group-hover:bg-amber-600">
                <Zap className="w-4 h-4 mr-2" />
                Registrati
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature list */}
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

        {/* Brewpub note */}
        <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 mb-10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-800 dark:text-purple-200 text-sm">Sei un brewpub?</p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Se produci e somministri birra artigianale, puoi attivare sia il piano Pub che la verifica Birrificio sullo stesso account.
                  Avrai una doppia dashboard — una per la produzione, una per il locale.
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
