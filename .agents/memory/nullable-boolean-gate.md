---
name: Nullable boolean gate pattern
description: How to safely gate on Drizzle nullable boolean fields without false-positives for null/undefined.
---

# Nullable boolean gate pattern

## The rule
When gating UI or logic on a Drizzle boolean field that lacks `.notNull()`, always use strict equality:
```ts
field === false   // blocks only explicitly-false rows
```
Never use:
```ts
!field            // blocks false AND null AND undefined — false-positive for unset rows
```

## Why
Drizzle maps `boolean("col")` (without `.notNull()`) to `boolean | null` in TypeScript.
In PostgreSQL, rows created before the column existed (or with no explicit value) may have `NULL`.
`!null === true`, so a `!field` gate incorrectly blocks users whose field is NULL even though
they were never explicitly set to the "blocked" state.

## How to apply
Any time you add a feature gate like "block if email not verified":
- Check if the schema column has `.notNull()` — if not, use `=== false`.
- Applied in: App.tsx banner, BeerTastingForm.tsx, checkin-modal.tsx, user-profile-new.tsx
  (all use `user?.isEmailVerified === false` instead of `!user?.isEmailVerified`)
