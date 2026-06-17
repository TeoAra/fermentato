import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Check, X, Beer, Building2, Zap, Shield, Star, MessageCircle, BarChart3, Bell, QrCode,
  FileText, Tv2, Users, Map, Calendar, Image, RefreshCw, Lock, Crown, Sparkles, Mail,
  CheckCircle2, ArrowRight, Bot, GlassWater, Megaphone, Truck, Camera, Heart, Search,
  ScanLine, Activity, Ticket, Globe, MessageSquare,
} from "lucide-react";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";
import { PageContainer } from "@/components/layout/page-container";

const YES = () => <span className="flex justify-center"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /></span>;
const NO = () => <span className="flex justify-center"><X className="w-4 h-4 text-stone-300 flex-shrink-0" /></span>;

interface FeatureRowProps {
  label: string;
  included: boolean | string;
  icon?: React.ReactNode;
}
function FeatureRow({ label, included, icon }: FeatureRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-[#23262E] last:border-0">
      {icon && <div className="flex-shrink-0 w-4 h-4 text-stone-400">{icon}</div>}
      <div className="flex-1 text-sm text-muted-foreground dark:text-stone-300">{label}</div>
      <div className="flex-shrink-0">
        {typeof included === 'boolean'
          ? (included ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-stone-300" />)
          : <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">{included}</span>}
      </div>
    </div>
  );
}

export default function PrezziPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-[#0B0D10]">
      <SEO
        title="Prezzi e Piani — Fermenta.to"
        description="Scopri i piani Fermenta.to per pub e birrifici. Piano pub da 65€/anno. Birrifici verificati gratuitamente."
        url="https://fermenta.to/prezzi"
      />

      <PageContainer variant="standard" className="pb-24">

        {/* Hero */}
        <div className="text-center mb-14 pt-6">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 mb-4 text-sm px-3 py-1">
            🍺 Piani Fermenta.to
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground dark:text-white mb-4">
            Porta il tuo locale online.<br />
            <span className="text-amber-500">Semplice e trasparente.</span>
          </h1>
          <p className="text-lg text-muted-foreground dark:text-stone-400 max-w-2xl mx-auto">
            Un piano per i pub, una verifica gratuita per i birrifici. L'app è gratuita per tutti gli appassionati.
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
              <h2 className="text-2xl font-bold text-foreground dark:text-white">Piano Pub</h2>
              <p className="text-sm text-muted-foreground">Per pub, birrerie, locali specializzati e ristoranti con selezione artigianale</p>
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
                <Button className="w-full text-white mb-6 h-11 text-base font-semibold border-0" style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }} asChild>
                  <Link href="/registra-pub">
                    <Zap className="w-4 h-4 mr-2" />
                    Registra il tuo pub — prova gratis
                  </Link>
                </Button>
                <div className="space-y-2">
                  {[
                    "Profilo pub verificato con badge ufficiale",
                    "Taplist digitale illimitata",
                    "Cantina (vini, spirit, sidri)",
                    "Bevande (cocktail, analcolici, soft drink)",
                    "Menu con categorie e prezzi",
                    "Modalità TV taplist a schermo intero",
                    "QR Code personalizzato per i tavoli",
                    "PDF menu scaricabile in tempo reale",
                    "Gestione eventi e serate a tema",
                    "Bot Telegram & WhatsApp (gestione da chat)",
                    "Notifiche push ai clienti che seguono il pub",
                    "Analytics visitatori (visite, tap più cliccate)",
                    "Priorità nei risultati di ricerca",
                    "Dashboard gestionale dedicata",
                    "Supporto email dedicato",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature table */}
          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="p-6">
              <h3 className="font-bold text-foreground dark:text-white mb-4 text-base">Cosa include il piano</h3>

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-2 pb-1">Profilo e Visibilità</div>
              <FeatureRow icon={<Map />} label="Profilo pub sul catalogo nazionale" included={true} />
              <FeatureRow icon={<Map />} label="Pagina pubblica con mappa e orari" included={true} />
              <FeatureRow icon={<Star />} label="Ricevere recensioni dagli utenti" included={true} />
              <FeatureRow icon={<Shield />} label="Badge profilo verificato" included={true} />
              <FeatureRow icon={<Sparkles />} label="Priorità nei risultati di ricerca" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Taplist, Cantina e Menu</div>
              <FeatureRow icon={<Beer />} label="Taplist digitale illimitata (spine)" included={true} />
              <FeatureRow icon={<Beer />} label="Cantina illimitata (bottiglie, vini, spirit)" included={true} />
              <FeatureRow icon={<GlassWater />} label="Bevande (cocktail, analcolici, soft drink)" included={true} />
              <FeatureRow icon={<FileText />} label="Menu con categorie e prezzi" included={true} />
              <FeatureRow icon={<RefreshCw />} label="Aggiornamento in tempo reale" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Strumenti Operativi</div>
              <FeatureRow icon={<Tv2 />} label="Modalità TV taplist (schermo intero)" included={true} />
              <FeatureRow icon={<QrCode />} label="QR Code personalizzato" included={true} />
              <FeatureRow icon={<FileText />} label="PDF menu scaricabile in tempo reale" included={true} />
              <FeatureRow icon={<Calendar />} label="Gestione eventi e serate" included={true} />
              <FeatureRow icon={<Bot />} label="Bot Telegram — comandi in italiano" included={true} />
              <FeatureRow icon={<Bot />} label="Bot WhatsApp — gestione da chat" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Marketing e Analytics</div>
              <FeatureRow icon={<Bell />} label="Notifiche push ai clienti" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Analytics visite profilo" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Statistiche taplist (tap più cliccate)" included={true} />
              <FeatureRow icon={<Users />} label="Check-in degli utenti tracciati" included={true} />
              <FeatureRow icon={<Mail />} label="Supporto email dedicato" included={true} />
            </CardContent>
          </Card>

          {/* Festival mode add-on */}
          <div className="mt-4 bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800/40 rounded-xl p-4 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <Ticket className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-pink-800 dark:text-pink-200 text-sm">Festival Mode — disponibile come add-on</p>
                <p className="text-sm text-pink-700 dark:text-pink-300 mt-1">
                  Attiva una taplist digitale dedicata per eventi e festival. Voti in tempo reale, QR per i visitatori, classifica birre, gestione staff. Disponibile separatamente per ogni festival.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE BIRRIFICIO                        */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-stone-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white">Piano Birrificio</h2>
              <p className="text-sm text-muted-foreground">Per birrifici artigianali — completamente gratuito</p>
            </div>
          </div>

          {/* Single free + verified card */}
          <div className="max-w-md mx-auto mb-8">
            <Card className="border-2 border-orange-300 dark:border-stone-600 shadow-xl shadow-orange-50 dark:shadow-orange-900/10">
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
                <Button className="w-full text-white mb-6 h-11 text-base font-semibold border-0" style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }} asChild>
                  <Link href="/auth">
                    <Building2 className="w-4 h-4 mr-2" />
                    Registra il Birrificio
                  </Link>
                </Button>
                <div className="space-y-2">
                  {[
                    "Profilo verificato con badge ufficiale",
                    "Gestione catalogo birre illimitato",
                    "Upload immagini prodotti e logo HD",
                    "Annunci e comunicati ai fan (novità, release, collab)",
                    "Gestione canali di distribuzione",
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
                    <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info box */}
          <div className="bg-stone-50 dark:bg-orange-900/20 border border-stone-300 dark:border-[#23262E] rounded-xl p-4 mb-8 max-w-2xl mx-auto">
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
          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="p-6">
              <h3 className="font-bold text-foreground dark:text-white mb-4 text-base">Cosa include la verifica</h3>

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-2 pb-1">Profilo e Catalogo</div>
              <FeatureRow icon={<Building2 />} label="Profilo birrificio sul catalogo" included={true} />
              <FeatureRow icon={<Map />} label="Pagina pubblica con mappa" included={true} />
              <FeatureRow icon={<Beer />} label="Birre presenti nel database" included={true} />
              <FeatureRow icon={<Shield />} label="Badge birrificio verificato" included={true} />
              <FeatureRow icon={<Image />} label="Upload immagini prodotti e logo HD" included={true} />
              <FeatureRow icon={<Beer />} label="Gestione catalogo birre illimitato" included={true} />
              <FeatureRow icon={<Globe />} label="Gestione canali di distribuzione" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Comunicazione e Community</div>
              <FeatureRow icon={<Megaphone />} label="Annunci ai fan (novità, release, collab)" included={true} />
              <FeatureRow icon={<Calendar />} label="Gestione eventi e degustazioni" included={true} />
              <FeatureRow icon={<Bell />} label="Notifiche push ai seguaci" included={true} />
              <FeatureRow icon={<MessageCircle />} label="Risposta alle recensioni" included={true} />
              <FeatureRow icon={<MessageSquare />} label="Segnalazioni e richieste dai fan" included={true} />
              <FeatureRow icon={<Beer />} label="Ricezione richieste aggiunta birre" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Analytics e Visibilità</div>
              <FeatureRow icon={<BarChart3 />} label="Statistiche visite profilo" included={true} />
              <FeatureRow icon={<BarChart3 />} label="Birre più cercate e visualizzate" included={true} />
              <FeatureRow icon={<Users />} label="Tendenze follower" included={true} />
              <FeatureRow icon={<Sparkles />} label="Priorità nei risultati di ricerca" included={true} />
              <FeatureRow icon={<Mail />} label="Supporto email prioritario" included={true} />
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/*  SEZIONE UTENTI (GRATUITO)                 */}
        {/* ══════════════════════════════════════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white">Per gli Appassionati</h2>
              <p className="text-sm text-muted-foreground">L'app per i beer lover — completamente gratuita, per sempre</p>
            </div>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <Card className="border-2 border-blue-200 dark:border-blue-800/40 shadow-xl shadow-blue-50 dark:shadow-blue-900/10">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-xl px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    <span className="font-bold text-lg">Account Appassionato</span>
                  </div>
                  <Badge className="bg-white/20 border-0 text-white text-xs font-bold">GRATIS</Badge>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold">€0</span>
                  <span className="text-white/80 mb-1">/ sempre</span>
                </div>
                <p className="text-white/70 text-sm mt-1">Registrati subito · Nessuna carta di credito</p>
              </div>
              <CardContent className="p-6">
                <Button className="w-full text-white mb-6 h-11 text-base font-semibold border-0" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }} asChild>
                  <Link href="/auth">
                    <Zap className="w-4 h-4 mr-2" />
                    Crea il tuo account
                  </Link>
                </Button>
                <div className="space-y-2">
                  {[
                    "Ricerca birre, pub e birrifici in tutta Italia",
                    "Scoperta per stile, ABV, ingredienti",
                    "Scanner birra AI (foto, barcode, etichetta)",
                    "Check-in con foto nei pub",
                    "Recensioni e voti alle birre",
                    "Preferiti: birre, pub, birrifici",
                    "Feed attività e novità dai tuoi preferiti",
                    "Notifiche push eventi e nuove birre",
                    "Profilo pubblico con badge e traguardi",
                    "Mappa pub e birrifici vicino a te",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="p-6">
              <h3 className="font-bold text-foreground dark:text-white mb-4 text-base">Tutto gratis per gli appassionati</h3>

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-2 pb-1">Scoperta e Ricerca</div>
              <FeatureRow icon={<Search />} label="Ricerca per nome, stile, birrificio" included={true} />
              <FeatureRow icon={<Beer />} label="Catalogo completo birre italiane" included={true} />
              <FeatureRow icon={<Map />} label="Mappa pub e birrifici vicino a te" included={true} />
              <FeatureRow icon={<Sparkles />} label="Suggerimento 'Sorprendimi' casuale" included={true} />
              <FeatureRow icon={<ScanLine />} label="Scanner AI (foto, barcode, etichetta)" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Community e Interazione</div>
              <FeatureRow icon={<CheckCircle2 />} label="Check-in nei pub con foto" included={true} />
              <FeatureRow icon={<Star />} label="Recensioni e voti alle birre" included={true} />
              <FeatureRow icon={<Heart />} label="Preferiti: birre, pub, birrifici" included={true} />
              <FeatureRow icon={<Activity />} label="Feed attività e aggiornamenti" included={true} />
              <FeatureRow icon={<MessageCircle />} label="Post e commenti nella community" included={true} />

              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide pt-4 pb-1">Profilo e Notifiche</div>
              <FeatureRow icon={<Users />} label="Profilo pubblico personalizzato" included={true} />
              <FeatureRow icon={<Crown />} label="Badge e traguardi gamification" included={true} />
              <FeatureRow icon={<Bell />} label="Notifiche eventi e nuove birre" included={true} />
              <FeatureRow icon={<Calendar />} label="Agenda eventi pub preferiti" included={true} />
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
                    <h3 className="text-lg font-bold text-foreground dark:text-white">Brewpub?</h3>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-xs">Entrambi i piani</Badge>
                  </div>
                  <p className="text-muted-foreground dark:text-stone-400 text-sm leading-relaxed">
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
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">Domande frequenti</h2>
          <p className="text-center text-muted-foreground text-sm mb-8">Tutto quello che devi sapere su Fermenta.to</p>
          <div className="max-w-2xl mx-auto rounded-3xl overflow-hidden bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Accordion type="single" collapsible className="divide-y divide-stone-100 dark:divide-stone-700/30">
              {[
                { q: "Come si attiva il piano pub?", a: "Registra il tuo pub e attiva subito il periodo di prova gratuito di 15 giorni — senza carta di credito. Al termine, puoi continuare con il piano completo a €65/anno (IVA inclusa) tramite carta, PayPal o altri metodi online. L'abbonamento non si rinnova automaticamente: ricevi un avviso prima della scadenza." },
                { q: "Come funziona il Bot Telegram/WhatsApp?", a: "Dal dashboard del pub puoi collegare il tuo account Telegram o WhatsApp. Una volta collegato, puoi gestire taplist, prezzi e visibilità delle birre direttamente dalla chat, usando comandi in italiano. Gemini interpreta i messaggi in linguaggio naturale — niente codici da ricordare." },
                { q: "Cos'è il Festival Mode?", a: "È un add-on che attivi per singoli eventi: una taplist digitale dedicata al festival, con voti in tempo reale dai visitatori, classifica birre, gestione staff e QR code per l'ingresso. Si attiva separatamente per ogni festival, con un costo una-tantum per evento." },
                { q: "Come faccio a ottenere la verifica birrificio?", a: "Registra il profilo del birrificio. Il team verifica i dati e attiva il badge entro poche ore. La verifica è completamente gratuita." },
                { q: "Posso disdire il piano pub?", a: "Sì, in qualsiasi momento prima del rinnovo annuale. Il piano rimane attivo fino alla scadenza e non verrà rinnovato. Nessun costo di recesso." },
                { q: "Posso avere sia pub che birrificio?", a: "Sì. I due piani sono separati e coesistono sullo stesso account. Se sei un brewpub avrai una doppia dashboard — una per il birrificio, una per il pub." },
                { q: "I prezzi includono l'IVA?", a: "Sì, i prezzi indicati sono IVA inclusa (22% Italia)." },
                { q: "L'app per gli appassionati è davvero gratuita?", a: "Sì, sempre. Registrarsi, cercare birre, fare check-in, scrivere recensioni, seguire pub e birrifici, ricevere notifiche e usare lo scanner AI sono funzionalità completamente gratuite per tutti gli utenti." },
              ].map(({ q, a }, i) => (
                <AccordionItem key={q} value={`faq-${i}`} className="border-0 px-6">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline hover:text-primary transition-colors py-5 text-left">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center rounded-3xl p-8 text-white mb-8" style={{ background: "linear-gradient(135deg, #F77104 0%, #f98a0e 50%, #f5a623 100%)" }}>
          <h2 className="text-2xl font-bold mb-2">Pronto a iniziare?</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">15 giorni di prova gratuita per i pub, verifica gratuita per i birrifici. App sempre gratis per gli appassionati.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-stone-50 font-semibold shadow-md" asChild>
              <Link href="/registra-pub">
                <ArrowRight className="w-4 h-4 mr-2" />
                Registra il tuo pub — prova gratis
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold bg-white/10" asChild>
              <a href="mailto:info@fermenta.to">
                <Mail className="w-4 h-4 mr-2" />
                Contattaci
              </a>
            </Button>
          </div>
        </div>
      </PageContainer>

      <Footer />
    </div>
  );
}
