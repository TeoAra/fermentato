import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Ultimo aggiornamento: 24 Dicembre 2024</p>

          <div className="prose dark:prose-invert max-w-none">
            <h2>1. Introduzione</h2>
            <p>
              Fermenta.to ("noi", "nostro" o "Servizio") rispetta la tua privacy e si impegna a proteggere 
              i tuoi dati personali. Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo 
              le tue informazioni quando utilizzi il nostro sito web.
            </p>

            <h2>2. Dati che Raccogliamo</h2>
            <p>Possiamo raccogliere le seguenti informazioni:</p>
            <ul>
              <li><strong>Dati di registrazione:</strong> nome, cognome, indirizzo email quando crei un account</li>
              <li><strong>Dati di accesso tramite Google:</strong> email, nome e foto profilo se accedi con Google</li>
              <li><strong>Dati di utilizzo:</strong> informazioni su come utilizzi il Servizio</li>
              <li><strong>Dati dei locali:</strong> informazioni sui pub registrati dai gestori</li>
              <li><strong>Preferiti:</strong> i tuoi pub, birrifici e birre preferiti</li>
            </ul>

            <h2>3. Come Utilizziamo i Tuoi Dati</h2>
            <p>Utilizziamo i tuoi dati per:</p>
            <ul>
              <li>Fornire e mantenere il Servizio</li>
              <li>Gestire il tuo account</li>
              <li>Personalizzare la tua esperienza</li>
              <li>Comunicare con te riguardo aggiornamenti o promozioni</li>
              <li>Migliorare il Servizio</li>
            </ul>

            <h2>4. Base Giuridica del Trattamento</h2>
            <p>
              Il trattamento dei tuoi dati si basa su: il tuo consenso, l'esecuzione di un contratto, 
              obblighi legali, e/o nostri legittimi interessi nel fornire e migliorare il Servizio.
            </p>

            <h2>5. Condivisione dei Dati</h2>
            <p>Non vendiamo i tuoi dati personali. Possiamo condividere i tuoi dati con:</p>
            <ul>
              <li><strong>Fornitori di servizi:</strong> terze parti che ci aiutano a gestire il Servizio</li>
              <li><strong>Autorità:</strong> quando richiesto dalla legge</li>
              <li><strong>Altri utenti:</strong> informazioni pubbliche come recensioni o preferiti pubblici</li>
            </ul>

            <h2>6. Sicurezza dei Dati</h2>
            <p>
              Implementiamo misure di sicurezza appropriate per proteggere i tuoi dati, tra cui:
            </p>
            <ul>
              <li>Crittografia delle password</li>
              <li>Connessioni HTTPS sicure</li>
              <li>Accesso limitato ai dati personali</li>
            </ul>

            <h2>7. I Tuoi Diritti (GDPR)</h2>
            <p>In conformità con il GDPR, hai il diritto di:</p>
            <ul>
              <li><strong>Accesso:</strong> richiedere una copia dei tuoi dati personali</li>
              <li><strong>Rettifica:</strong> correggere dati inaccurati</li>
              <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati</li>
              <li><strong>Limitazione:</strong> limitare il trattamento dei tuoi dati</li>
              <li><strong>Portabilità:</strong> ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Opposizione:</strong> opporti al trattamento dei tuoi dati</li>
            </ul>

            <h2>8. Cookie</h2>
            <p>
              Utilizziamo cookie essenziali per il funzionamento del Servizio, inclusi cookie di sessione 
              per mantenere il tuo accesso. Non utilizziamo cookie di tracciamento di terze parti senza 
              il tuo consenso.
            </p>

            <h2>9. Conservazione dei Dati</h2>
            <p>
              Conserviamo i tuoi dati personali per il tempo necessario a fornire il Servizio e per 
              adempiere ai nostri obblighi legali. Puoi richiedere la cancellazione del tuo account 
              in qualsiasi momento.
            </p>

            <h2>10. Trasferimento Internazionale</h2>
            <p>
              I tuoi dati possono essere trasferiti e mantenuti su server situati al di fuori del tuo 
              paese di residenza. Ci assicuriamo che tali trasferimenti rispettino le normative applicabili.
            </p>

            <h2>11. Modifiche alla Privacy Policy</h2>
            <p>
              Possiamo aggiornare questa Privacy Policy periodicamente. Ti informeremo di eventuali 
              modifiche significative pubblicando la nuova policy su questa pagina.
            </p>

            <h2>12. Contatti</h2>
            <p>
              Per domande sulla nostra Privacy Policy o per esercitare i tuoi diritti, contattaci:
            </p>
            <ul>
              <li>Email: privacy@fermenta.to</li>
              <li>Sito: fermenta.to</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
