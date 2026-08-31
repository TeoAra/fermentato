---
name: Cantina and taplist independence
description: Product rule for actions on pub bottle inventory and draught taplist.
---

Actions on a pub's cantina and taplist must be scoped to the list where the owner performed them. Matching beer IDs do not imply that visibility or deletion should be synchronized.

**Why:** A pub can legitimately sell the same beer both bottled and on tap. Silent cross-list updates can remove an active draught listing or create partial server state when one of two requests fails.

**How to apply:** Keep list mutations separate. If a future feature intentionally offers “apply to both,” make it an explicit owner choice and implement the combined change atomically or with reliable reconciliation.