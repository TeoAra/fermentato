---
name: Plain descriptions and consistent management forms
description: User requirements for description text and beer/product/category forms.
---

«Nelle descrizioni non deve esserci il formato e tipologia di testo ma un testo normale che però funzionino gli a capo e basta.»

**Why:** the user reported visible `<p>` tags and unwanted formatting controls.

**How to apply:** use plain multiline text for descriptions, including legacy HTML and escaped HTML when displaying/editing them. Preserve line breaks and remove embedded formatting, not ordinary punctuation. Do not bulk rewrite stored descriptions just to fix their display. Editorial/legal pages are separate content and should retain their deliberate rich formatting.

Per i profili birrificio, il passaggio al testo semplice deve conservare la
descrizione estesa del vecchio editor, non sostituirla con un riassunto legacy.
Un salvataggio esplicito, anche vuoto, rende definitivo il nuovo testo.

**Why:** mantenere entrambe le versioni senza una precedenza precisa può
accorciare la storia oppure far ricomparire una descrizione cancellata.

**How to apply:** mostrare ed editare la stessa versione completa; dopo un
salvataggio non recuperare più il vecchio contenuto come ripiego.

I moduli aggiungi/modifica birra devono essere coerenti tra i percorsi, senza doppio scroll interno; la stessa regola vale per prodotti e categorie.

**Why:** the user explicitly requested matching forms and a simpler mobile editing experience.

**How to apply:** share the common beer fields while preserving role-specific permissions and validation. Long text fields grow with their content; the dialog owns scrolling. Check quick-edit fields as well as the main form, not just the outer dialog. Autonomous popup pickers may have their own scroll, but inline form bodies/lists should not.

## Public menu descriptions

I vini vanno separati dalle altre bevande. Le descrizioni dei prodotti devono
essere leggibili per intero in una scheda popup; anche toccando l'immagine di una
birra in taplist o cantina deve aprirsi una scheda con tutti i dettagli disponibili.

**Why:** the user reported truncated wine descriptions and asked to read product
and beer details without leaving the venue menu.

**How to apply:** preserve wine subcategories, expose the full plain multiline
description and current venue prices, and keep popup scrolling to one container.
Keep favorite/check-in actions independent of opening details.

Le anteprime nell'elenco devono rimanere compatte anche con descrizioni molto
lunghe; nei popup nome del prodotto e chiusura devono restare visibili durante
la lettura.

**Why:** screenshots from the user's iPhone showed wine rows stretched by full
descriptions and a scrolled popup with its title and close control out of view.

**How to apply:** verify actual rendered preview height, not just the presence
of a truncation class. Keep a non-scrolling popup heading above the sole
scrollable content area; apply the same treatment to wine and beer details.

Nei popup delle birre il logo deve essere sempre circolare, riempito e centrato,
senza un riquadro quadrato o margini interni attorno all'immagine.

**Why:** the user explicitly requested this presentation after seeing the beer
detail popup with a square inset around its logo.

**How to apply:** use centered, proportional cover cropping inside a circular
mask, including for missing-image fallbacks. This applies to beer popup logos,
not venue cover artwork, which must still be displayed uncropped.

## Verifica dei moduli su mobile

L'emulazione mobile Chromium può espandere il layout viewport quando il contenuto
dietro un dialog deborda orizzontalmente: lo screenshot viene scalato e i click
CDP possono colpire un pulsante diverso dalle coordinate CSS osservate.

**Why:** durante una regressione del modulo categorie il layout viewport era più
largo del viewport visibile; un click sintetico su Salva finiva su Annulla,
pur essendo corretti il DOM e la gestione dei dati.

**How to apply:** confrontare layout e visual viewport prima di attribuire un
click fallito al salvataggio. Verificare separatamente identità del nodo,
focus e payload; l'attivazione da tastiera può isolare il test del submit.
Non dichiarare verificata la tastiera nativa iOS sulla sola base di Chromium.
