---
name: OpenStreetMap referrer policy
description: Why map tiles can return blocked 403 images and the privacy-preserving header needed to identify the site.
---

OSM's public tile service requires an identifying Referer from web clients. Do not restore a blanket `no-referrer` document policy for pages using those tiles.

**Why:** the desktop production map displayed OSM's blocked/403 images because Helmet's default suppressed the site's Referer. The same tile returned 200 with an identifying origin. This was not a GPS or map-layout error.

**How to apply:** retain `strict-origin-when-cross-origin` so cross-origin HTTPS requests expose only the site's origin, not paths, search terms or coordinates. Keep visible OSM attribution and comply with https://operations.osmfoundation.org/policies/tiles/ rather than changing domains or proxying around blocks.

Invalidate only the tile-cache namespace when correcting a policy that may have left blocked images cached. Preserve unrelated app caches and user preferences. Verify real browser requests return tiles successfully and contain only an origin Referer; a source-level header check alone does not verify the outgoing image requests.
