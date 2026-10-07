---
name: Development watcher limits
description: Why a client-root Vite server can exhaust file watchers in this workspace.
---

Il root Vite impostato sul client non garantisce che vengano osservati solo i file del client: i plugin di sviluppo possono aggiungere l'intero workspace.

**Why:** Il preview si è chiuso con ENOSPC quando Vite ha iniziato a osservare la cache Nix del workspace. Non era spazio disco esaurito né un errore delle pagine.

**How to apply:** Quando si modificano i monitor del dev server o i plugin, escludere cache e directory di strumenti. Controllare le opzioni effettive passate al server in middleware mode, non solo la configurazione Vite esportata. Non tentare di risolvere questo sintomo cancellando dati o riavviando ripetutamente senza correggere il monitoraggio.
