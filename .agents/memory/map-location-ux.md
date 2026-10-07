---
name: Map and location UX
description: Keep the current map provider and distinguish GPS precision from map rendering.
---

Improve the existing free map rather than replacing it with Google Maps.

**Why:** the user explicitly chose “Mappa attuale migliorata” and supplied YHOP screenshots as visual references.

**How to apply:** use the references for clear pins, locate/filter controls and expanded viewing; do not infer the provider used by YHOP or introduce paid map services.

A coarse first GPS fix must not suppress later precise fixes. Cached coordinates need a limited lifetime and an accuracy estimate; permission denial and acquisition failure are different conditions.

**Why:** the user reported worse accuracy than comparable apps. Switching map tiles cannot improve the device's GPS fix, and treating old or coarse coordinates as current hides the actual problem.

**How to apply:** show the reported uncertainty honestly, refine with bounded high-accuracy acquisition, preserve map position after deliberate user panning, and never promise a fixed physical accuracy.
