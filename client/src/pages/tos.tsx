import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Home
          </Button>
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Termini di Servizio</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Ultimo aggiornamento: 24 Dicembre 2024</p>

          <div className="prose dark:prose-invert max-w-none">
            <h2>1. Accettazione dei Termini</h2>
            <p>
              Utilizzando il sito web Fermenta.to ("Servizio"), accetti di essere vincolato dai presenti Termini di Servizio. 
              Se non accetti questi termini, ti preghiamo di non utilizzare il Servizio.
            </p>

            <h2>2. Descrizione del Servizio</h2>
            <p>
              Fermenta.to è una piattaforma dedicata alla scoperta di birre artigianali italiane, pub e birrifici. 
              Il Servizio consente agli utenti di:
            </p>
            <ul>
              <li>Cercare e scoprire pub e birrifici in Italia</li>
              <li>Visualizzare menu, tap list e informazioni sui locali</li>
              <li>Salvare i propri locali e birre preferiti</li>
              <li>Per i gestori di locali: registrare e gestire il proprio pub</li>
            </ul>

            <h2>3. Account Utente</h2>
            <p>
              Per utilizzare alcune funzionalità del Servizio, potrebbe essere necessario creare un account. 
              Sei responsabile di:
            </p>
            <ul>
              <li>Mantenere la riservatezza delle tue credenziali di accesso</li>
              <li>Tutte le attività che si verificano con il tuo account</li>
              <li>Notificarci immediatamente qualsiasi uso non autorizzato del tuo account</li>
            </ul>

            <h2>4. Utilizzo Accettabile</h2>
            <p>Ti impegni a non:</p>
            <ul>
              <li>Violare leggi o regolamenti applicabili</li>
              <li>Pubblicare contenuti falsi, fuorvianti o diffamatori</li>
              <li>Interferire con il funzionamento del Servizio</li>
              <li>Tentare di accedere a sistemi o dati non autorizzati</li>
              <li>Utilizzare il Servizio per scopi commerciali non autorizzati</li>
            </ul>

            <h2>5. Contenuti degli Utenti</h2>
            <p>
              Gli utenti possono contribuire con contenuti al Servizio. Mantenendo la proprietà dei tuoi contenuti, 
              ci concedi una licenza mondiale, non esclusiva e royalty-free per utilizzare, modificare e visualizzare 
              tali contenuti in relazione al Servizio.
            </p>

            <h2>6. Proprietà Intellettuale</h2>
            <p>
              Il Servizio e i suoi contenuti originali, funzionalità e caratteristiche sono di proprietà di Fermenta.to 
              e sono protetti da copyright, marchi e altre leggi sulla proprietà intellettuale.
            </p>

            <h2>7. Limitazione di Responsabilità</h2>
            <p>
              Il Servizio viene fornito "così com'è" senza garanzie di alcun tipo. Non saremo responsabili per 
              danni diretti, indiretti, incidentali, speciali o consequenziali derivanti dall'uso del Servizio.
            </p>

            <h2>8. Informazioni sui Locali</h2>
            <p>
              Le informazioni sui pub, birrifici e birre sono fornite dai gestori dei locali o da fonti terze. 
              Non garantiamo l'accuratezza, completezza o aggiornamento di tali informazioni. 
              Ti consigliamo di verificare direttamente con i locali prima di visitarli.
            </p>

            <h2>9. Modifiche ai Termini</h2>
            <p>
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. Le modifiche saranno 
              efficaci immediatamente dopo la pubblicazione sul Servizio. L'uso continuato del Servizio dopo 
              tali modifiche costituisce accettazione dei nuovi Termini.
            </p>

            <h2>10. Risoluzione</h2>
            <p>
              Possiamo terminare o sospendere il tuo accesso al Servizio immediatamente, senza preavviso, per 
              qualsiasi violazione di questi Termini.
            </p>

            <h2>11. Legge Applicabile</h2>
            <p>
              Questi Termini sono regolati dalle leggi italiane. Qualsiasi controversia sarà sottoposta alla 
              giurisdizione esclusiva dei tribunali italiani.
            </p>

            <h2>12. Contatti</h2>
            <p>
              Per domande su questi Termini di Servizio, contattaci all'indirizzo: info@fermenta.to
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
