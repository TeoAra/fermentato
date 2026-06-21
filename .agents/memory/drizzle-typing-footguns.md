---
name: Drizzle typing footguns
description: Non-obvious Drizzle/TS traps that only surface once the db handle is typed (decimal=string, dynamic builders, count-without-from).
---

These were masked for a long time because `server/db.ts` exported `db` as `any`. Typing it as `NodePgDatabase<typeof schema>` surfaced ~20 real, silently-wrong behaviors. Keep `db` typed; do not revert to `any`.

**Why:** an `any` db handle disables every Drizzle type guarantee, so wrong-column writes, wrong-shape reads, and always-0 aggregates compile and ship silently.

**How to apply — recurring traps:**
- **decimal columns are TS `string`** (e.g. `beers.abv`, `userBeerTastings.rating`). Wrap with `Number(...)` before arithmetic/`Math.round` (otherwise string concat / `NaN`) and with `String(...)` when inserting/updating.
- **Reassigned query builders need `.$dynamic()`**: `let q = db.select()...; q = q.where(...)` only type-checks if the base ends in `.$dynamic()`.
- **`db.select({ count: sql\`...\` })` WITHOUT `.from(...)`** returns the *builder*, not a row. Awaiting it yields no rows → `result[0]?.count` is always 0. Always add `.from(table)`, or use `db.execute(sql\`...\`)` and read `.rows`.
- **Count/exec results are arrays**: `(await db.select({count}).from(x))[0]?.count` — forgetting `[0]` silently reads `undefined` → 0.
- **Chained `.where().where()`** does not AND — only one is honored. Use `.where(and(a, b))`.
