import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, ArrowLeft, Beer } from "lucide-react";

/**
 * Placeholder mostrato su iOS al posto delle pagine di acquisto/abbonamento
 * (prezzi, attivazione pub, creazione festival). Conforme alle linee guida
 * App Store 3.1.1 — i pagamenti per servizi B2B avvengono solo sul sito.
 */
export default function IosWebOnlyPage() {
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
            Per gestire l'abbonamento del tuo pub o creare un festival, visita{" "}
            <span className="font-semibold text-primary">fermenta.to</span> dal
            browser del tuo computer o telefono.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Una volta attivato, potrai continuare a gestire tutto da questa app.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla home
            </Button>
          </Link>
          <Link href="/explore/pubs">
            <Button variant="ghost" className="w-full text-muted-foreground">
              <Beer className="w-4 h-4 mr-2" />
              Esplora pub e birre
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
