import { sql } from "drizzle-orm";
import { breweries, beers } from "@shared/schema";

// ─── Soft-archive visibility helpers ─────────────────────────────────────────
// Centralized rules for excluding closed breweries and discontinued beers from
// search, listings, suggestions and counters. Reversible: nothing is deleted.
//
// Rules:
//  - A brewery is visible when is_closed IS NOT TRUE.
//  - A beer is visible when is_discontinued IS NOT TRUE AND its brewery is not closed.
//
// Two flavors are provided because the codebase mixes Drizzle query-builder
// queries with hand-written raw SQL (db.execute / pool.query).

// ── Drizzle query-builder fragments (tables referenced by their real names) ──

/** Brewery not soft-archived. Use in `.where(...)` of queries on the breweries table. */
export const breweryActiveSql = sql`COALESCE(${breweries.isClosed}, false) = false`;

/**
 * Beer visible: not discontinued AND its brewery is not closed.
 * Self-contained (uses a correlated NOT EXISTS) so it works on beer-only queries
 * without needing an explicit join.
 */
export const beerVisibleSql = sql`COALESCE(${beers.isDiscontinued}, false) = false AND NOT EXISTS (SELECT 1 FROM breweries _bv WHERE _bv.id = ${beers.breweryId} AND _bv.is_closed = true)`;

// ── Raw SQL string builders (for db.execute(sql.raw(...)) / pool.query) ──

/** `COALESCE(<alias>.is_closed, false) = false` */
export const rawBreweryActive = (alias = "breweries") =>
  `COALESCE(${alias}.is_closed, false) = false`;

/** Beer visible when the breweries table IS joined under `breweryAlias`. */
export const rawBeerVisibleJoined = (beerAlias: string, breweryAlias: string) =>
  `COALESCE(${beerAlias}.is_discontinued, false) = false AND COALESCE(${breweryAlias}.is_closed, false) = false`;

/** Beer visible when breweries is NOT joined (correlated anti-join on brewery_id). */
export const rawBeerVisibleExists = (beerAlias = "beers") =>
  `COALESCE(${beerAlias}.is_discontinued, false) = false AND NOT EXISTS (SELECT 1 FROM breweries _bv WHERE _bv.id = ${beerAlias}.brewery_id AND _bv.is_closed = true)`;
