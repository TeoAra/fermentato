import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, ArrowLeft, Beer, ExternalLink } from "lucide-react";

/**
 * Placeholder mostrato su iOS al posto delle pagine di acquisto/abbonamento
 * (prezzi, attivazione pub, creazione festival). Conforme alle linee guida
 * App Store 3.1.1 — i pagamenti per servizi B2B avvengono solo sul sito.
 *
 * Il pulsante "Apri nel browser" invia l'utente alla stessa pagina su
 * fermenta.to nel browser di sistema (Capacitor intercetta target="_system").
 */

const PATH_LABELS: Record<string, string> = {
  "/prezzi": "Vedi i piani e i prezzi",
  "/attiva-pub": "Attiva il tuo pub",
  "/registra-pub": "Registra il tuo pub",
  "/pub-registration": "Registra il tuo pub",
  "/festival": "Crea un nuovo festival",
  "/registra-festival": "Registra un festival",
};

export default function IosWebOnlyPage() {
  const [location] = useLocation();
  const targetUrl = `https://fermenta.to${location}`;
  const ctaLabel = PATH_LABELS[location] ?? "Continua sul sito";

  const openInBrowser = () => {
    window.open(targetUrl, "_system");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-8 text-center space-y-6 shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Gestione disponibile dal sito
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Per gestire l'abbonamento del tuo pub o creare un festival, prosegui
            sul sito{" "}
            <span className="font-semibold text-primary">fermenta.to</span> nel
            browser.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Una volta completato, potrai tornare e gestire tutto da questa app.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={openInBrowser}
            className="w-full h-12 rounded-2xl font-semibold"
            data-testid="button-open-in-browser"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {ctaLabel}
          </Button>
          <p className="text-[11px] text-muted-foreground truncate px-2">
            {targetUrl}
          </p>
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
    </div>
  );
}
