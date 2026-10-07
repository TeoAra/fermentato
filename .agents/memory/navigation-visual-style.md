---
name: Floating icon-only navigation and social visual style
description: Project-wide visual direction requested for bottom bars and general restyling.
---

L'utente vuole tutte le barre inferiori fluttuanti, «stile Instagram», senza descrizioni visibili delle icone, ma facilmente comprensibili. Anche il restyling generale deve essere semplice e molto attraente visivamente.

**Why:** the user explicitly chose this direction to reduce clutter and make the app feel like a modern social product.

**How to apply:** use the same compact visual language across public, account, owner and festival bars. Preserve accessible names, distinguishable standard icons, clear selected states and generous touch targets. Keep at most five primary destinations, exposing additional sections through a real menu rather than horizontal scrolling or lost functionality. Apply the social simplicity while preserving Fermenta's identity, not copying Instagram branding.

Il restyling richiesto comprende i contenuti delle Home, gli hero e le schede di birre, pub e birrifici, non soltanto barre e componenti condivisi.

**Why:** the user explicitly corrected a partial result that had left the main entity surfaces insufficiently modernized.

**How to apply:** verify both guest and signed-in Home paths and the real entity renderers in lists, search and detail views. Changing common buttons or headings alone does not fulfill this visual direction; retain each screen's information and actions.

Keep iOS fixed chrome untransformed and unblurred; floating placement must use frozen safe-area insets once.

**Why:** fixed-layer compositing has previously caused native iOS navigation to jump or remain stranded when overlays appear.

**How to apply:** coordinate with the existing iOS safe-area rules when adjusting spacing or presentation; a browser inset simulation is not proof of native-device stability.
