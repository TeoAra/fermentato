import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft, Beer } from "lucide-react";

/**
 * Placeholder mostrato su iOS al posto delle pagine di acquisto/abbonamento
 * (prezzi, attivazione pub, creazione festival).
 *
 * Conformità App Store Review Guideline 3.1.3(e) — Enterprise Services:
 * NESSUN pulsante / link cliccabile / URL visibile che porti a meccanismi
 * di pagamento esterni. Solo testo informativo che spiega che la gestione
 * del proprio account business avviene altrove. I pulsanti "Home" /
 * "Esplora" restano perché sono navigazione interna all'app, non CTA
 * verso un payment processor esterno.
 */

export default function IosWebOnlyPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-8 text-center space-y-6 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Info className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Sezione non disponibile in app
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questa app è uno strumento di consultazione e gestione dei
            contenuti del tuo locale. La configurazione iniziale dell'account
            business si effettua altrove.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Una volta completata la configurazione del tuo account, potrai
            tornare e gestire tutto da questa app.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <Link href="/explore/pubs" className="flex-1">
            <Button variant="ghost" className="w-full text-muted-foreground">
              <Beer className="w-4 h-4 mr-2" />
              Esplora
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
