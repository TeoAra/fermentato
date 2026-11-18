---
name: Map and location UX
description: Keep the current map provider and distinguish GPS precision from map rendering.
---

Improve the existing free map rather than replacing it with Google Maps.

**Why:** the user explicitly chose “Mappa attuale migliorata” and supplied YHOP screenshots as visual references.

**How to apply:** use the references for clear pins, locate/filter controls and expanded viewing; do not infer the provider used by YHOP or introduce paid map services.

L'utente giudica la cartografia precedente e gli indicatori troppo pesanti all'occhio e vuole una mappa coerente con il sito: fondo crema, arancione esistente, dettagli meno invadenti e segnaposto piccoli ma facili da toccare.

**Why:** ha chiarito che non cercava soltanto la disposizione dello screenshot, ma una cartografia e indicatori visivamente più curati.

**How to apply:** mantenere una soluzione gratuita/open source; una base vettoriale personalizzabile è appropriata. Non presentare la semplificazione grafica come un miglioramento della precisione fisica del GPS.

Tutte le mappe devono essere uguali nello stile, non soltanto la Home: la richiesta comprende pub, birrifici e le altre mappe del sito.

**Why:** l'utente ha esplicitamente chiesto di estendere lo stesso trattamento a tutte le mappe.

**How to apply:** riutilizzare cartografia, tavolozza, simboli e controlli condivisi anche nei dettagli, negli eventi e nelle anteprime dei percorsi; preservare le funzioni specifiche senza introdurre un altro stile locale.

I segnaposto devono essere piccoli, tutti della stessa forma e senza icone interne, distinguendo pub e birrifici con colori diversi. Le informazioni del luogo selezionato e i filtri devono stare in basso.

**Why:** l'utente ha segnalato che in modalità espansa le schede finivano sotto l'header e ha chiesto esplicitamente segnalibri uguali senza icone.

**How to apply:** usare il disegno condiviso anche nei marker nativi delle mappe e nei dettagli. La mappa espansa deve uscire dagli antenati trasformati della pagina, rispettare gli inset congelati una sola volta e non lasciare header/dock sopra schede e filtri. Verificare l'apertura con una posizione GPS già disponibile, non soltanto con GPS inizialmente assente.

Le prove delle mappe con eventi simulati devono rispettare il livello cartografico interrogato: una singola feature restituita indistintamente per tutti i livelli può produrre errori artificiali della fotocamera.

**Why:** un'interazione simulata con un locale attivava anche l'espansione di un cluster inesistente, generando coordinate non valide e facendo sembrare guasta la mappa.

**How to apply:** separare le feature dei cluster da quelle dei singoli punti nelle fixture; non diagnosticare un problema di rendering dalle sole eccezioni della fotocamera prima di verificare l'evento simulato.

A coarse first GPS fix must not suppress later precise fixes. Cached coordinates need a limited lifetime and an accuracy estimate; permission denial and acquisition failure are different conditions.

**Why:** the user reported worse accuracy than comparable apps. Switching map tiles cannot improve the device's GPS fix, and treating old or coarse coordinates as current hides the actual problem.

**How to apply:** show the reported uncertainty honestly, refine with bounded high-accuracy acquisition, preserve map position after deliberate user panning, and never promise a fixed physical accuracy.

La mappa Home deve essere compatta, lasciando spazio agli altri elementi principali nel primo schermo. Il riquadro generico «Esplora sulla mappa» va tolto: quello spazio deve mostrare le informazioni del pub o birrificio cliccato.

**Why:** the user explicitly asked to reduce the map's dominance and replace static information with useful selected-place details.

**How to apply:** keep expanded viewing available, show a dismissible selected-place summary with its detail-page link, and clear it if filters remove that place. Preserve honest GPS status and errors through the locate control, filters and accessible feedback rather than restoring the static banner.
