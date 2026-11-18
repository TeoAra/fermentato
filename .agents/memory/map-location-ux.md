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

A coarse first GPS fix must not suppress later precise fixes. Cached coordinates need a limited lifetime and an accuracy estimate; permission denial and acquisition failure are different conditions.

**Why:** the user reported worse accuracy than comparable apps. Switching map tiles cannot improve the device's GPS fix, and treating old or coarse coordinates as current hides the actual problem.

**How to apply:** show the reported uncertainty honestly, refine with bounded high-accuracy acquisition, preserve map position after deliberate user panning, and never promise a fixed physical accuracy.

La mappa Home deve essere compatta, lasciando spazio agli altri elementi principali nel primo schermo. Il riquadro generico «Esplora sulla mappa» va tolto: quello spazio deve mostrare le informazioni del pub o birrificio cliccato.

**Why:** the user explicitly asked to reduce the map's dominance and replace static information with useful selected-place details.

**How to apply:** keep expanded viewing available, show a dismissible selected-place summary with its detail-page link, and clear it if filters remove that place. Preserve honest GPS status and errors through the locate control, filters and accessible feedback rather than restoring the static banner.
