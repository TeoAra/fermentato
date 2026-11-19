# Correzione mirata della posizione di Luppolino Pub

Questa procedura è **manuale**: preparare o aggiornare il codice non cambia
automaticamente i dati del VPS. Non eseguire lo script sul database di sviluppo
aspettandosi che i dati vengano trasferiti sul sito online.

## Punto da correggere

| | Latitudine | Longitudine |
|---|---:|---:|
| Valore precedente atteso | 45.35000000 | 11.86670000 |
| Punto dello stesso locale e indirizzo su OpenStreetMap | 45.34512630 | 11.86987190 |

Fonte: [Il Luppolino Pub, Via Sant’Andrea 29, Albignasego — nodo OSM](https://www.openstreetmap.org/node/12814925943).
Dati © OpenStreetMap contributors, ODbL.
I due punti distano circa 596 metri: uno scarto compatibile con i 587 metri
segnalati da una persona dentro il locale.
Il riferimento cartografico non è un rilievo topografico dell’ingresso.

Lo script cerca **solo** `luppolino-pub`, richiede id `7`, nome `Luppolino Pub`
e le coordinate precedenti attese. Si ferma se qualcuno ha già modificato
il punto con altri valori. Non cambia menu, taplist, altri locali o schema.
Oltre alle coordinate aggiorna soltanto la data tecnica di modifica della scheda.

## 1. Anteprima senza modifiche

Prima rendere disponibile questo aggiornamento nel repository sul VPS.
Usare Node **20.12 o successivo** (la versione 20.19 del VPS va bene).
Dalla cartella dell’app:

```bash
cd /www/nodeapps/fermenta
git pull --ff-only
node --env-file=.env scripts/fix-luppolino-location.mjs
```

Lo script usa il `DATABASE_URL` della configurazione, senza stamparlo.
Verificare di usare lo stesso ambiente/database dell’app PM2 `fermenta`.
Non condividere il contenuto del file `.env`.
Una variabile `DATABASE_URL` già esportata nella shell prevale sul file:
se presente deve indicare lo stesso database.

L’anteprima apre una transazione di sola lettura e la annulla. Mostra nome,
indirizzo, coordinate attuali e richieste. Non scrive nulla.

## 2. Applicazione

Se i dati dell’anteprima corrispondono al locale:

```bash
node --env-file=.env scripts/fix-luppolino-location.mjs --apply &&
pm2 restart fermenta
```

La modifica è atomica, con blocco della singola riga e controllo dei valori
precedenti. Il riavvio riguarda solo `fermenta`, svuota le cache in memoria
e può interrompere brevemente le richieste in corso.
Non servono build web, migrazioni dello schema o nuove build iOS/Android.

Se il punto è già corretto, lo script non modifica nulla. Se nome, id,
coordinate o numero di righe non corrispondono, si interrompe senza applicare
la correzione.

## 3. Controllo

Rieseguire l’anteprima: deve mostrare le nuove coordinate e
«Il punto è già quello richiesto».

Riaprire l’app e richiedere una posizione aggiornata con il pulsante di
localizzazione. Le risposte della lista possono essere ancora nella cache del
browser per circa 2–3 minuti; attendere e ricaricare se necessario.

La distanza non viene forzata a zero: resta quella effettivamente calcolata
tra il GPS e il punto del locale. Al chiuso può persistere un’incertezza GPS.
Se rimane uno scarto importante anche con il nuovo punto, confrontare posizione
del dispositivo, accuratezza dichiarata e punto dell’ingresso.

## Ripristino, solo se necessario

Questo comando riporta alle **vecchie coordinate errate**; non eseguirlo
durante l’applicazione normale:

```bash
node --env-file=.env scripts/fix-luppolino-location.mjs --rollback &&
pm2 restart fermenta
```

Il ripristino è consentito solo se il punto coincide ancora con quello
applicato dallo script: non sovrascrive modifiche successive.

## Verifica dello script

```bash
node --test tests/luppolino-location-fix.test.mjs
```

I test usano una connessione simulata isolata: non accedono ai database,
non modificano dati reali e non dimostrano l’avvenuta applicazione sul VPS.
