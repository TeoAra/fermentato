import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Check, X, Beer, Building2, Zap, Shield, Star, MessageCircle, BarChart3, Bell, QrCode, FileText, Tv2, Smartphone, Users, Map, Calendar, Image, RefreshCw, Lock, Crown, Sparkles, Mail } from "lucide-react";
import { SEO } from "@/components/seo";

const YES = () => <Check className="w-4 h-4 text-green-500 flex-shrink-0" />;
const NO = () => <X className="w-4 h-4 text-gray-300 flex-shrink-0" />;

interface FeatureRowProps {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  icon?: React.ReactNode;
}
function FeatureRow({ label, free, pro, icon }: FeatureRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {icon && <div className="flex-shrink-0 w-5 h-5 text-gray-400">{icon}</div>}
      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label}</div>
      <div className="w-20 text-center text-sm">
        {typeof free === 'boolean' ? (free ? <YES /> : <NO />) : <span className="text-gray-600 dark:text-gray-400 text-xs font-medium">{free}</span>}
      </div>
      <div className="w-24 text-center text-sm">
        {typeof pro === 'boolean' ? (pro ? <span className="flex justify-center"><YES /></span> : <span className="flex justify-center"><NO /></span>) : <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">{pro}</span>}
      </div>
    </div>
  );
}

export default function PrezziPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20 pb-24">
      <SEO
        title="Prezzi e Piani — Fermenta.to"
        description="Scopri i piani Fermenta.to per pub e birrifici. Piano gratuito sempre disponibile, Pro da 65€/anno. Nessun vincolo."
        url="https://fermenta.to/prezzi"
      />

      <div className="max-w-5xl mx-auto px-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </Link>

        {/* Hero */}
        <div className="text-center mb-14">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 mb-4 text-sm px-3 py-1">
            🍺 Piani Fermenta.to
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Porta il tuo locale online.<br />
            <span className="text-amber-500">Gratis, sempre.</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Registra il tuo profilo gratuitamente. Passa a Pro quando vuoi sbloccare tutte le funzionalità avanzate — nessun vincolo, disdici quando vuoi.
          </p>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE PUB                               */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
              <Beer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Piano Pub</h2>
              <p className="text-sm text-gray-500">Per pub, birrerie, locali specializzati e ristoranti con selezione artigianale</p>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free card */}
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Gratuito</div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">€0</div>
                <div className="text-sm text-gray-500">Per sempre · Registrazione immediata</div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button variant="outline" className="w-full mb-5" asChild>
                  <Link href="/auth">Inizia gratis</Link>
                </Button>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {[
                    "Profilo pub sul catalogo",
                    "Taplist digitale (fino a 10 birre alla spina)",
                    "Menu bottiglia (fino a 20 birre)",
                    "Pagina pubblica con mappa",
                    "Ricercabile dagli utenti Fermenta.to",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <YES /><span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro card */}
            <Card className="border-2 border-amber-400 dark:border-amber-500 relative shadow-lg shadow-amber-100 dark:shadow-amber-900/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white border-0 px-3 py-1 shadow">
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  Più popolare
                </Badge>
              </div>
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-1">Pro</div>
                <div className="flex items-end gap-2">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">€65</div>
                  <div className="text-gray-500 mb-1">/ anno</div>
                </div>
                <div className="text-sm text-gray-500">Attivazione immediata · Nessun vincolo</div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 mb-5" asChild>
                  <a href="mailto:info@fermenta.to?subject=Abbonamento Pro Pub">
                    <Zap className="w-4 h-4 mr-2" />
                    Attiva Pro Pub
                  </a>
                </Button>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {[
                    "Tutto del piano Gratuito",
                    "Taplist illimitata",
                    "Menu bottiglia illimitato",
                    "Menu digitale con categorie e prezzi",
                    "Modalità TV taplist a schermo intero",
                    "QR Code personalizzato per il tavolo",
                    "PDF menu scaricabile (aggiornato in tempo reale)",
                    "Gestione eventi e serate a tema",
                    "Notifiche push ai clienti che seguono il pub",
                    "Analytics visitatori (visite, tap più cliccate)",
                    "Badge verificato sul profilo",
                    "Priorità nei risultati di ricerca",
                    "Supporto email dedicato",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <YES /><span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature comparison table */}
          <Card>
            <CardContent className="p-6">
              {/* Table header */}
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Funzionalità</div>
                <div className="w-20 text-center text-xs font-semibold text-gray-500 uppercase">Gratuito</div>
                <div className="w-24 text-center text-xs font-semibold text-amber-600 uppercase">Pro</div>
              </div>
              {/* Profilo */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1">Profilo e Visibilità</div>
              <FeatureRow icon={<Map className="w-4 h-4" />} label="Profilo pub sul catalogo nazionale" free={true} pro={true} />
              <FeatureRow icon={<Map className="w-4 h-4" />} label="Pagina pubblica con mappa e orari" free={true} pro={true} />
              <FeatureRow icon={<Star className="w-4 h-4" />} label="Ricevere recensioni dagli utenti" free={true} pro={true} />
              <FeatureRow icon={<Shield className="w-4 h-4" />} label="Badge profilo verificato" free={false} pro={true} />
              <FeatureRow icon={<Sparkles className="w-4 h-4" />} label="Priorità nei risultati di ricerca" free={false} pro={true} />
              {/* Taplist */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Taplist e Menu</div>
              <FeatureRow icon={<Beer className="w-4 h-4" />} label="Taplist digitale (birre alla spina)" free="fino a 10" pro="illimitata" />
              <FeatureRow icon={<Beer className="w-4 h-4" />} label="Menu bottiglia" free="fino a 20" pro="illimitato" />
              <FeatureRow icon={<FileText className="w-4 h-4" />} label="Menu con categorie e prezzi" free={false} pro={true} />
              <FeatureRow icon={<RefreshCw className="w-4 h-4" />} label="Aggiornamento in tempo reale" free={true} pro={true} />
              {/* Strumenti */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Strumenti</div>
              <FeatureRow icon={<Tv2 className="w-4 h-4" />} label="Modalità TV taplist (schermo intero)" free={false} pro={true} />
              <FeatureRow icon={<QrCode className="w-4 h-4" />} label="QR Code personalizzato" free={false} pro={true} />
              <FeatureRow icon={<FileText className="w-4 h-4" />} label="PDF menu scaricabile in tempo reale" free={false} pro={true} />
              <FeatureRow icon={<Calendar className="w-4 h-4" />} label="Gestione eventi e serate" free={false} pro={true} />
              {/* Marketing */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Marketing e Analytics</div>
              <FeatureRow icon={<Bell className="w-4 h-4" />} label="Notifiche push ai clienti" free={false} pro={true} />
              <FeatureRow icon={<BarChart3 className="w-4 h-4" />} label="Analytics visite profilo" free={false} pro={true} />
              <FeatureRow icon={<BarChart3 className="w-4 h-4" />} label="Statistiche taplist (tap più cliccate)" free={false} pro={true} />
              <FeatureRow icon={<Mail className="w-4 h-4" />} label="Supporto email dedicato" free={false} pro={true} />
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE BIRRIFICIO                        */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Piano Birrificio</h2>
              <p className="text-sm text-gray-500">Per birrifici artigianali che vogliono gestire il catalogo e raggiungere nuovi appassionati</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free */}
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Gratuito</div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">€0</div>
                <div className="text-sm text-gray-500">Per sempre · Profilo pubblico</div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button variant="outline" className="w-full mb-5" asChild>
                  <Link href="/auth">Registra il birrificio</Link>
                </Button>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {[
                    "Profilo birrificio sul catalogo",
                    "Pagina pubblica con mappa",
                    "Birre presenti nel database nazionale",
                    "Ricercabile dagli utenti",
                    "Ricezione segnalazioni e suggerimenti",
                  ].map(f => <div key={f} className="flex items-start gap-2"><YES /><span>{f}</span></div>)}
                </div>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-2 border-orange-400 dark:border-orange-500 relative shadow-lg shadow-orange-100 dark:shadow-orange-900/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-orange-500 text-white border-0 px-3 py-1 shadow">
                  <Crown className="w-3.5 h-3.5 mr-1" />
                  Birrificio Verificato
                </Badge>
              </div>
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-1">Pro</div>
                <div className="flex items-end gap-2">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">€99</div>
                  <div className="text-gray-500 mb-1">/ anno</div>
                </div>
                <div className="text-sm text-gray-500">Attivazione immediata · Nessun vincolo</div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 mb-5" asChild>
                  <a href="mailto:info@fermenta.to?subject=Abbonamento Pro Birrificio">
                    <Zap className="w-4 h-4 mr-2" />
                    Attiva Pro Birrificio
                  </a>
                </Button>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {[
                    "Tutto del piano Gratuito",
                    "Profilo verificato con badge ufficiale",
                    "Gestione catalogo birre illimitato",
                    "Upload immagini prodotti e logo HD",
                    "Gestione eventi e degustazioni",
                    "Statistiche visualizzazioni e ricerche",
                    "Risposta alle recensioni degli utenti",
                    "Notifiche push ai seguaci del birrificio",
                    "Analytics dettagliate (visite, birre più cercate)",
                    "Segnalazioni e richieste dai fan",
                    "Ricezione richieste di aggiunta birre",
                    "Dashboard admin dedicata",
                    "Priorità nei risultati di ricerca",
                    "Supporto email prioritario",
                  ].map(f => <div key={f} className="flex items-start gap-2"><YES /><span>{f}</span></div>)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison table */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Funzionalità</div>
                <div className="w-20 text-center text-xs font-semibold text-gray-500 uppercase">Gratuito</div>
                <div className="w-24 text-center text-xs font-semibold text-orange-600 uppercase">Pro</div>
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1">Profilo e Catalogo</div>
              <FeatureRow icon={<Building2 className="w-4 h-4" />} label="Profilo birrificio sul catalogo" free={true} pro={true} />
              <FeatureRow icon={<Map className="w-4 h-4" />} label="Pagina pubblica con mappa" free={true} pro={true} />
              <FeatureRow icon={<Beer className="w-4 h-4" />} label="Birre presenti nel database" free={true} pro={true} />
              <FeatureRow icon={<Shield className="w-4 h-4" />} label="Badge birrificio verificato" free={false} pro={true} />
              <FeatureRow icon={<Image className="w-4 h-4" />} label="Upload immagini prodotti e logo HD" free={false} pro={true} />
              <FeatureRow icon={<Beer className="w-4 h-4" />} label="Gestione catalogo birre" free="limitato" pro="illimitato" />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Gestione e Comunicazione</div>
              <FeatureRow icon={<Calendar className="w-4 h-4" />} label="Gestione eventi e degustazioni" free={false} pro={true} />
              <FeatureRow icon={<Bell className="w-4 h-4" />} label="Notifiche push ai seguaci" free={false} pro={true} />
              <FeatureRow icon={<MessageCircle className="w-4 h-4" />} label="Risposta alle recensioni" free={false} pro={true} />
              <FeatureRow icon={<MessageCircle className="w-4 h-4" />} label="Segnalazioni e richieste dai fan" free={true} pro={true} />
              <FeatureRow icon={<Beer className="w-4 h-4" />} label="Ricezione richieste aggiunta birre" free={false} pro={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Analytics</div>
              <FeatureRow icon={<BarChart3 className="w-4 h-4" />} label="Statistiche visite profilo" free={false} pro={true} />
              <FeatureRow icon={<BarChart3 className="w-4 h-4" />} label="Birre più cercate e visualizzate" free={false} pro={true} />
              <FeatureRow icon={<Users className="w-4 h-4" />} label="Tendenze follower" free={false} pro={true} />
              <FeatureRow icon={<Sparkles className="w-4 h-4" />} label="Priorità nei risultati di ricerca" free={false} pro={true} />
              <FeatureRow icon={<Mail className="w-4 h-4" />} label="Supporto email prioritario" free={false} pro={true} />
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Domande frequenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: "Posso provare prima di pagare?", a: "Sì. Il piano gratuito è permanente e non richiede carta di credito. Puoi passare a Pro in qualsiasi momento." },
              { q: "Come funziona l'attivazione?", a: "Invia una mail a info@fermenta.to con il tuo profilo. L'attivazione avviene entro 24 ore lavorative. Ti contatteremo con le istruzioni di pagamento." },
              { q: "Posso disdire quando voglio?", a: "Sì. Nessun contratto vincolante. Il piano Pro rimane attivo fino alla scadenza dell'anno e non si rinnova automaticamente." },
              { q: "Come avviene il pagamento?", a: "Accettiamo bonifico bancario e carta di credito. A pagamento ricevuto attiviamo il piano entro pochi minuti." },
              { q: "È possibile avere sia pub che birrificio?", a: "Sì. I piani pub e birrificio sono separati e possono coesistere sullo stesso account." },
              { q: "I prezzi includono l'IVA?", a: "I prezzi indicati sono IVA esclusa. Per soggetti con P.IVA italiana si applica l'aliquota ordinaria del 22%." },
            ].map(({ q, a }) => (
              <Card key={q} className="bg-gray-50 dark:bg-gray-800/50 border-0">
                <CardContent className="p-5">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1.5 text-sm">{q}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{a}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Pronto a iniziare?</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">Registra il tuo locale gratuitamente oggi. Nessuna carta di credito richiesta.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-amber-600 hover:bg-gray-50 font-semibold" asChild>
              <Link href="/auth">Inizia gratis</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold" asChild>
              <a href="mailto:info@fermenta.to">Contattaci</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
