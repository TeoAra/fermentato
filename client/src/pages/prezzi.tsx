import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, X, Beer, Building2, Zap, Shield, Star, MessageCircle, BarChart3, Bell, QrCode, FileText, Tv2, Users, Map, Calendar, Image, RefreshCw, Lock, Crown, Sparkles, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";

const YES = () => <span className="flex justify-center"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /></span>;
const NO = () => <span className="flex justify-center"><X className="w-4 h-4 text-gray-300 flex-shrink-0" /></span>;

interface FeatureRowProps {
  label: string;
  included: boolean | string;
  icon?: React.ReactNode;
}
function FeatureRow({ label, included, icon }: FeatureRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {icon && <div className="flex-shrink-0 w-4 h-4 text-gray-400">{icon}</div>}
      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label}</div>
      <div className="flex-shrink-0">
        {typeof included === 'boolean'
          ? (included ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-gray-300" />)
          : <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">{included}</span>}
      </div>
    </div>
  );
}

export default function PrezziPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 pt-20">
      <SEO
        title="Prezzi e Piani — Fermenta.to"
        description="Scopri i piani Fermenta.to per pub e birrifici. Piano pub da 65€/anno. Birrifici verificati gratuitamente."
        url="https://fermenta.to/prezzi"
      />

      <div className="max-w-5xl mx-auto px-4 pb-24">

        {/* Hero */}
        <div className="text-center mb-14 pt-6">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 mb-4 text-sm px-3 py-1">
            🍺 Piani Fermenta.to
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Porta il tuo locale online.<br />
            <span className="text-amber-500">Semplice e trasparente.</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Un piano per i pub, una verifica gratuita per i birrifici. Nessun vincolo, nessuna sorpresa.
          </p>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE PUB                               */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
              <Beer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Piano Pub</h2>
              <p className="text-sm text-gray-500">Per pub, birrerie, locali specializzati e ristoranti con selezione artigianale</p>
            </div>
          </div>

          {/* Single Pro card */}
          <div className="max-w-md mx-auto mb-8">
            <Card className="border-2 border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-100 dark:shadow-amber-900/20">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-xl px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span className="font-bold text-lg">Piano Pub Pro</span>
                  </div>
                  <Badge className="bg-white/20 border-0 text-white text-xs">Tutto incluso</Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold">€65</span>
                  <span className="text-white/80 mb-1">/ anno</span>
                </div>
                <p className="text-white/70 text-sm mt-1">Attivazione immediata · Nessun rinnovo automatico</p>
              </div>
              <CardContent className="p-6">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white mb-6 h-11 text-base font-semibold" asChild>
                  <Link href="/attiva-pub">
                    <Zap className="w-4 h-4 mr-2" />
                    Registrati
                  </Link>
                </Button>
                <div className="space-y-2">
                  {[
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
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-base">Cosa include il piano</h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1">Profilo e Visibilità</div>
              <FeatureRow icon={<Map />} label="Profilo pub sul catalogo nazionale" included={true} />
              <FeatureRow icon={<Map />} label="Pagina pubblica con mappa e orari" included={true} />
              <FeatureRow icon={<Star />} label="Ricevere recensioni dagli utenti" included={true} />
              <FeatureRow icon={<Shield />} label="Badge profilo verificato" included={true} />
              <FeatureRow icon={<Sparkles />} label="Priorità nei risultati di ricerca" included={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Taplist e Menu</div>
              <FeatureRow icon={<Beer />} label="Taplist digitale illimitata" included={true} />
              <FeatureRow icon={<Beer />} label="Menu bottiglia illimitato" included={true} />
              <FeatureRow icon={<FileText />} label="Menu con categorie e prezzi" included={true} />
              <FeatureRow icon={<RefreshCw />} label="Aggiornamento in tempo reale" included={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Strumenti</div>
              <FeatureRow icon={<Tv2 />} label="Modalità TV taplist (schermo intero)" included={true} />
              <FeatureRow icon={<QrCode />} label="QR Code personalizzato" included={true} />
              <FeatureRow icon={<FileText />} label="PDF menu scaricabile in tempo reale" included={true} />
              <FeatureRow icon={<Calendar />} label="Gestione eventi e serate" included={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Marketing e Analytics</div>
              <FeatureRow icon={<Bell />} label="Notifiche push ai clienti" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Analytics visite profilo" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Statistiche taplist (tap più cliccate)" included={true} />
              <FeatureRow icon={<Mail />} label="Supporto email dedicato" included={true} />
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE BIRRIFICIO                        */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Piano Birrificio</h2>
              <p className="text-sm text-gray-500">Per birrifici artigianali — completamente gratuito</p>
            </div>
          </div>

          {/* Single free + verified card */}
          <div className="max-w-md mx-auto mb-8">
            <Card className="border-2 border-orange-300 dark:border-orange-700 shadow-xl shadow-orange-50 dark:shadow-orange-900/10">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-xl px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold text-lg">Birrificio Verificato</span>
                  </div>
                  <Badge className="bg-white/20 border-0 text-white text-xs font-bold">GRATUITO</Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold">€0</span>
                  <span className="text-white/80 mb-1">/ sempre</span>
                </div>
                <p className="text-white/70 text-sm mt-1">Richiedi la verifica · Approvazione entro 24h</p>
              </div>
              <CardContent className="p-6">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white mb-6 h-11 text-base font-semibold" asChild>
                  <Link href="/auth">
                    <Building2 className="w-4 h-4 mr-2" />
                    Registra il Birrificio
                  </Link>
                </Button>
                <div className="space-y-2">
                  {[
                    "Tutto del profilo gratuito",
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
                    "Dashboard gestionale dedicata",
                    "Priorità nei risultati di ricerca",
                    "Supporto email prioritario",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info box */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-200 text-sm">Come funziona la verifica</p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Registra il birrificio, poi contattaci per richiedere la verifica. Il team Fermenta.to controlla i dati e approva il badge entro 24 ore lavorative. I birrifici verificati hanno accesso a tutte le funzionalità avanzate — senza costi.
                </p>
              </div>
            </div>
          </div>

          {/* Feature table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-base">Cosa include la verifica</h3>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 pb-1">Profilo e Catalogo</div>
              <FeatureRow icon={<Building2 />} label="Profilo birrificio sul catalogo" included={true} />
              <FeatureRow icon={<Map />} label="Pagina pubblica con mappa" included={true} />
              <FeatureRow icon={<Beer />} label="Birre presenti nel database" included={true} />
              <FeatureRow icon={<Shield />} label="Badge birrificio verificato" included={true} />
              <FeatureRow icon={<Image />} label="Upload immagini prodotti e logo HD" included={true} />
              <FeatureRow icon={<Beer />} label="Gestione catalogo birre illimitato" included={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Gestione e Comunicazione</div>
              <FeatureRow icon={<Calendar />} label="Gestione eventi e degustazioni" included={true} />
              <FeatureRow icon={<Bell />} label="Notifiche push ai seguaci" included={true} />
              <FeatureRow icon={<MessageCircle />} label="Risposta alle recensioni" included={true} />
              <FeatureRow icon={<MessageCircle />} label="Segnalazioni e richieste dai fan" included={true} />
              <FeatureRow icon={<Beer />} label="Ricezione richieste aggiunta birre" included={true} />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-4 pb-1">Analytics e Visibilità</div>
              <FeatureRow icon={<BarChart3 />} label="Statistiche visite profilo" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Birre più cercate e visualizzate" included={true} />
              <FeatureRow icon={<Users />} label="Tendenze follower" included={true} />
              <FeatureRow icon={<Sparkles />} label="Priorità nei risultati di ricerca" included={true} />
              <FeatureRow icon={<Mail />} label="Supporto email prioritario" included={true} />
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  BREWPUB                                   */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Brewpub?</h3>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-xs">Entrambi i piani</Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Se sei sia un birrificio che un pub, puoi attivare entrambi i piani sullo stesso account. Il tuo profilo apparirà sia nel catalogo birrifici che in quello dei pub, e avrai accesso a una <strong>doppia dashboard</strong> — una per gestire la produzione e il catalogo birre, una per taplist, menu, eventi e prenotazioni del locale.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-400">
                      <Building2 className="w-3 h-3 mr-1" /> Birrificio verificato (gratuito)
                    </Badge>
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                      <Beer className="w-3 h-3 mr-1" /> Pub Pro (€65/anno)
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Domande frequenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: "Come si attiva il piano pub?", a: "Invia una mail a info@fermenta.to con il nome del tuo pub. Attiviamo il piano entro 24 ore lavorative. Nessun contratto vincolante, nessun rinnovo automatico." },
              { q: "Come faccio a ottenere la verifica birrificio?", a: "Registra il profilo del birrificio, poi contattaci a info@fermenta.to. Il team verifica i dati e attiva il badge entro 24 ore. La verifica è completamente gratuita." },
              { q: "Posso disdire il piano pub?", a: "Sì. Nessun vincolo. Il piano rimane attivo fino alla scadenza annuale e non si rinnova automaticamente." },
              { q: "Come avviene il pagamento del piano pub?", a: "Accettiamo bonifico bancario e carta di credito. A pagamento confermato attiviamo il piano entro pochi minuti." },
              { q: "Posso avere sia pub che birrificio?", a: "Sì. I due piani sono separati e coesistono sullo stesso account. Se sei un brewpub avrai una doppia dashboard — una per il birrificio, una per il pub." },
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
          <p className="text-white/80 mb-6 max-w-md mx-auto">Registra il tuo profilo oggi. Nessuna carta di credito richiesta.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-amber-600 hover:bg-gray-50 font-semibold shadow-md" asChild>
              <Link href="/attiva-pub">
                <ArrowRight className="w-4 h-4 mr-2" />
                Registrati
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-amber-600 font-semibold bg-white/10" asChild>
              <a href="mailto:info@fermenta.to">
                <Mail className="w-4 h-4 mr-2" />
                Contattaci
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
