# Servizi locali senza Gemini

Non sono necessarie chiavi Gemini/Google AI per scanner, bot, traduzioni o ricerca.
I servizi Google estranei a Gemini (login, notifiche Firebase, CAPTCHA, eventuali
mappe) restano invariati.

## Scanner

Ordine: PaddleOCR locale → Tesseract nativo → Tesseract.js (WASM nel processo
Node). Nessuna foto viene inviata a un'API OCR esterna. La prima esecuzione
Tesseract.js scarica i modelli open source italiano/inglese e li conserva nella
cache temporanea del server. Servono accesso alla rete al primo avvio, memoria e
CPU del server; non ci sono tariffe per scansione. Un processo esegue al massimo
una scansione alla volta; richieste concorrenti ricevono 429 con Retry-After.

PaddleOCR è opzionale. Sul VPS Tesseract nativo con i dati `ita` e `eng` evita
il caricamento del worker WASM. Il fallback funziona anche senza questi binari.
I log e le scansioni precedenti sono preservati.

## Ricerca e bot

La ricerca testuale e la memoria delle scansioni confermate usano PostgreSQL
(pg_trgm/unaccent già previsti dal progetto), non un modello remoto. La ricerca
immagini esistente rimane gratuita. CLIP, se già configurato, rimane locale.
Lo script remoto per generare gli embedding è stato rimosso: non si rigenerano
né si eliminano dati storici. Vettori di modelli diversi non sono confrontabili.
Il bot interpreta già i comandi italiani con regole locali.

## Traduzioni

LibreTranslate è software open source (AGPL-3.0) da eseguire su un server
controllato dal gestore. Non viene usata un'istanza pubblica con quota o API
a pagamento. Installazione/modelli consumano risorse del proprio server.

1. Installare LibreTranslate seguendo il progetto ufficiale:
   https://github.com/LibreTranslate/LibreTranslate
2. Eseguirlo come servizio persistente, su interfaccia privata, ad esempio
   `127.0.0.1:5001`, abilitando almeno italiano e inglese.
3. Nel processo dell'app configurare `LIBRETRANSLATE_URL=http://127.0.0.1:5001`
   e riavviare l'app. Non pubblicare la porta del traduttore su Internet.
4. Verificare `/languages` dell'istanza e provare una traduzione dall'admin.

L'istanza non viene installata sul VPS dal solo aggiornamento del codice.
Senza configurazione gli endpoint di traduzione rispondono 503 e il testo
originale non viene modificato. Errori di rete non causano perdita dei testi.

## Aggiornamento produzione

Inviare le modifiche al repository e distribuire il codice sul VPS con la
procedura consueta. Finché il VPS esegue il vecchio codice, può ancora chiamare
il vecchio provider. La vecchia chiave può essere rimossa dagli ambienti e
revocata nella console del provider dopo aver verificato gli altri eventuali
utilizzatori. La rimozione del codice non revoca credenziali o servizi esterni.
