---
name: Plain descriptions and consistent management forms
description: User requirements for description text and beer/product/category forms.
---

«Nelle descrizioni non deve esserci il formato e tipologia di testo ma un testo normale che però funzionino gli a capo e basta.»

**Why:** the user reported visible `<p>` tags and unwanted formatting controls.

**How to apply:** use plain multiline text for descriptions, including legacy HTML and escaped HTML when displaying/editing them. Preserve line breaks and remove embedded formatting, not ordinary punctuation. Do not bulk rewrite stored descriptions just to fix their display. Editorial/legal pages are separate content and should retain their deliberate rich formatting.

I moduli aggiungi/modifica birra devono essere coerenti tra i percorsi, senza doppio scroll interno; la stessa regola vale per prodotti e categorie.

**Why:** the user explicitly requested matching forms and a simpler mobile editing experience.

**How to apply:** share the common beer fields while preserving role-specific permissions and validation. Long text fields grow with their content; the dialog owns scrolling. Check quick-edit fields as well as the main form, not just the outer dialog. Autonomous popup pickers may have their own scroll, but inline form bodies/lists should not.
