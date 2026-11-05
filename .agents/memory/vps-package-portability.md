---
name: VPS dependency portability
description: Keep dependency downloads portable between Replit and the external VPS.
---

**Rule:** Dependency lock files delivered to the VPS must use publicly reachable
package URLs, not Replit's private package-firewall hosts.

**Why:** A dependency update introduced private download URLs that worked in the
workspace but stopped the user's VPS deploy at dependency installation with
ENOTFOUND. Both `.local` and `.internal` host variants have appeared.

**How to apply:** Check lock-file URL portability after dependency updates and
verify replacement tarballs against the existing integrity hashes. Preserve
versions and integrity; changing the npm registry setting alone does not replace
explicit private tarball URLs already stored in a lock file.
