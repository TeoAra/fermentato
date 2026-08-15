---
name: URL state sync vs popstate
description: How to sync filter state to the URL on explore pages without breaking Back/Forward
---
Rule: never `pushState` from a state-sync effect that also runs after a `popstate` restore — the effect re-pushes the restored URL and destroys forward history.

**Why:** all three Explore pages had this bug when URL-backed filters were added; review caught Back/Forward loops.

**How to apply:** set a ref flag inside the popstate handler; the URL-sync effect checks the flag and skips (or `replaceState`s) that one run. Also serialize non-default filter values explicitly (an explicit "all" must not share the default's bare URL). Pattern lives in explore-beers/breweries/pubs pages.
