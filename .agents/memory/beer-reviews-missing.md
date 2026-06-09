---
name: beer_reviews table missing
description: beer_reviews is referenced in raw SQL but does not exist in the DB — guard every query.
---

# beer_reviews table missing

## The rule
`beer_reviews` is referenced in raw SQL in `server/routes.ts` but the table does NOT exist in the
database. Any query against it must have a fallback (e.g. `.catch(() => 0)`), otherwise the endpoint
500s on a missing relation.

## Why
The raw SQL predates / diverged from the actual schema; reviews live elsewhere. The query was never
backed by a real table, so it throws "relation \"beer_reviews\" does not exist" at runtime.

## How to apply
Before adding any stat/count that joins or selects from `beer_reviews`, either create the table in
`shared/schema.ts` first, or wrap the raw query so a missing relation degrades to a safe default.
