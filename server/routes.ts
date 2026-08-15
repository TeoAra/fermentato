import type { Express } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchRateLimit, generalApiRateLimit, checkinRateLimit } from "./middleware/rate-limit";
import { createServer, type Server } from "http";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Versione app da version.json (auto-incrementata da scripts/bump-version.sh) ──
function getAppVersion(): string {
  try {
    const f = join(process.cwd(), "version.json");
    if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).version ?? "1.0.0";
  } catch {}
  return process.env.APP_VERSION ?? "1.0.0";
}
import { addClient, removeClient, broadcastPubUpdate } from "./pubBroadcast";

// ─── Simple in-memory TTL cache ──────────────────────────────────────────────
const _memCache = new Map<string, { data: any; expires: number }>();
// Single-flight: concurrent requests for the same key share one fetch instead
// of each running the (potentially heavy) query — prevents cache stampedes
// under load (e.g. many users opening Esplora birrifici at once).
const _memInflight = new Map<string, Promise<any>>();

// Heavy-query concurrency limiter. Single-flight dedupes per key, but many
// DISTINCT heavy keys (e.g. different brewery search terms / by-style
// aggregations) can still fire at once and exhaust the 10-connection pool.
// `heavy: true` routes the compute through a shared semaphore of 4 so at most
// 4 heavy queries touch the DB concurrently; cheap caches are unaffected.
const HEAVY_LIMIT = 4;
let _heavyActive = 0;
const _heavyQueue: Array<() => void> = [];
function _acquireHeavy(): Promise<void> {
  if (_heavyActive < HEAVY_LIMIT) {
    _heavyActive++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => _heavyQueue.push(resolve));
}
function _releaseHeavy(): void {
  const next = _heavyQueue.shift();
  if (next) next();
  else _heavyActive--;
}

interface MemCachedOptions {
  /** Route the compute through the shared heavy-query semaphore (limit 4). */
  heavy?: boolean;
}

async function memCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts?: MemCachedOptions,
): Promise<T> {
  const hit = _memCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  const inflight = _memInflight.get(key);
  if (inflight) return inflight as Promise<T>;
  const compute = opts?.heavy
    ? async () => {
        // Acquire AFTER the single-flight check so only the one deduped compute
        // per key waits on the semaphore, and we never hold a slot while cached.
        await _acquireHeavy();
        try {
          return await fetcher();
        } finally {
          _releaseHeavy();
        }
      }
    : fetcher;
  const p = (async () => {
    const data = await compute();
    // Bound growth: keys include user input (search terms, pagination), so
    // sweep expired entries and evict oldest if the cache gets large.
    if (_memCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of _memCache) if (v.expires <= now) _memCache.delete(k);
      if (_memCache.size > 500) {
        const oldest = [..._memCache.entries()].sort((a, b) => a[1].expires - b[1].expires).slice(0, 100);
        for (const [k] of oldest) _memCache.delete(k);
      }
    }
    _memCache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  })();
  _memInflight.set(key, p);
  try {
    return await p;
  } finally {
    _memInflight.delete(key);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
const execFileAsync = promisify(execFile);
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { registerAdminRoutes } from "./routes-admin";
import { registerFestivalRoutes, runFestivalMigrations } from "./routes-festival";
import { sql, eq, and, desc, asc, gte, count } from "drizzle-orm";
import { upload, uploadImage, cloudinary } from "./cloudinary";
import { db, pool } from "./db";
import { makeFeedCursor, parseFeedCursor } from "./feed-cursor";
import { breweryActiveSql, beerVisibleSql, rawBreweryActive, rawBeerVisibleJoined, rawBeerVisibleExists } from "./visibility";
import { normalizeBeerSearch, buildBeerSearchFragments } from "./search-normalize";
import { registerCatalogCacheBuster, registerHomeCacheBuster, registerPubStatsBuster, registerBreweryStatsBuster, bustBreweryStats } from "./catalog-cache";
import { breweries, beers, pubs, users, tapList, bottleList, userBeerTastings, favorites, menuCategories, menuItems, pubSizes, notifications, pushSubscriptions, breweryRequests, pubEvents, breweryEvents, insertBreweryEventSchema, reviewReports, oauthAccounts, userActivities, ratings, publicanRequests, notificationPreferences, staticPages, additionRequests, scanLogs, pubPageViews, breweryAnnouncements, insertBreweryAnnouncementSchema, beerCollaborations, festivals, beerViews } from "@shared/schema";

import { insertPubSchema, insertTapListSchema, insertBottleListSchema, insertMenuCategorySchema, insertMenuItemSchema, pubRegistrationSchema, insertPubEventSchema } from "@shared/schema";
import { z } from "zod";
import webpush from "web-push";
import { initVapid, sendPushToUser, sendPushToUserImmediate, sendPushToAdmins } from "./push-utils";
import { testSmtpConnection, sendWishlistBeerAvailableEmail } from "./email";
import { shouldSendEmailNotification } from "./push-utils";
import { translateToItalian, looksItalian } from "./translate";
import { generateEmbedding, pgVector, beerEmbedText } from "./embeddings";
import { findAndUpdateBeerImage, isPlaceholderImage, findBestBeerImage, rehostImageOnCloudinary } from "./beer-image-finder";
import { findBestBreweryLogo, uploadBreweryLogo } from "./brewery-image-finder";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';

// Simple in-memory search cache with TTL
const searchCache = new Map<string, { data: any; ts: number }>();
const SEARCH_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
function getCached(key: string) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SEARCH_CACHE_TTL) { searchCache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any) {
  if (searchCache.size > 2000) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 400);
    oldest.forEach(([k]) => searchCache.delete(k));
  }
  searchCache.set(key, { data, ts: Date.now() });
}
function clearSearchCache() { searchCache.clear(); }

// Clears every catalog-derived cache (search results + in-memory TTL cache).
// Call after any mutation that changes brewery/beer visibility, deletion or edits
// so archived/restored items disappear/reappear immediately.
function clearCatalogCaches() {
  searchCache.clear();
  _memCache.clear();
}
// Register with the shared registry so other modules (e.g. routes-admin.ts
// deletes) can invalidate these caches without an import cycle.
registerCatalogCacheBuster(clearCatalogCaches);
registerHomeCacheBuster(() => _memCache.delete("home:taplist-activity"));
// Per-pub stats cache buster — called by bot mutations and HTTP taplist routes
registerPubStatsBuster((pubId: number) => _memCache.delete(`stats-extended:${pubId}`));
// Per-brewery stats cache buster — called whenever a tasting is created/updated/deleted
// Invalidate all period-scoped keys (7d, 30d, 90d) so every window refreshes after a mutation
registerBreweryStatsBuster((breweryId: number) => {
  for (const d of [7, 30, 90]) {
    _memCache.delete(`brewery-stats-extended:${breweryId}:${d}`);
  }
});

// ── Popular search-term logging + cache pre-warming ─────────────────────────
// Track how often each term is searched so we can periodically re-warm the
// search cache for the most popular terms. This keeps common searches fast even
// right after a cache flush (e.g. following an archive/edit/delete mutation).
const searchTermCounts = new Map<string, number>();
function normalizeSearchTerm(raw: string) {
  return (raw || "").trim().toLowerCase();
}
// Single source of truth for the /api/search cache key so the request path and
// the warmer always agree on the key (the query is normalized to avoid
// case/spacing misses, e.g. "IPA" vs "ipa").
function buildSearchCacheKey(
  query: string,
  f: { glutenFree?: boolean; alcoholFree?: boolean; style?: string; minAbv?: number; maxAbv?: number; minIbu?: number; maxIbu?: number; city?: string },
  type: string = "all",
) {
  // Normalize style and city to lowercase so the key is consistent between the
  // request path (which receives them verbatim from the UI, e.g. "IPA") and the
  // warmer (which reads them from the DB with original casing).
  const styleKey = (f.style ?? "").toLowerCase().trim();
  const cityKey  = (f.city  ?? "").toLowerCase().trim();
  return `search:${normalizeSearchTerm(query)}:${type}:${!!f.glutenFree}:${!!f.alcoholFree}:${styleKey}:${f.minAbv ?? ""}:${f.maxAbv ?? ""}:${f.minIbu ?? ""}:${f.maxIbu ?? ""}:${cityKey}`;
}
function logSearchTerm(raw: string) {
  const t = normalizeSearchTerm(raw);
  if (t.length < 1 || t.length > 80) return;
  searchTermCounts.set(t, (searchTermCounts.get(t) || 0) + 1);
  if (searchTermCounts.size > 2000) {
    const top = [...searchTermCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1000);
    searchTermCounts.clear();
    for (const [k, v] of top) searchTermCounts.set(k, v);
  }
}

// Shared global-search logic used by both /api/search and the warmer so the
// cached payload never drifts from what the endpoint actually returns.
async function performGlobalSearch(query: string, filters: any, type: string = "all") {
  const runAll = type === "all";
  const [pubs, breweries, beersResult, usersResult] = await Promise.all([
    (runAll || type === "pubs") ? storage.searchPubs(query, filters.city) : Promise.resolve([]),
    (runAll || type === "breweries") ? storage.searchBreweries(query) : Promise.resolve([]),
    (runAll || type === "beers") ? storage.searchBeers(query, filters) : Promise.resolve([]),
    pool.query(
      `SELECT id, nickname,
              first_name AS "firstName", last_name AS "lastName",
              profile_image_url AS "profileImageUrl"
       FROM users
       WHERE unaccent(lower(COALESCE(nickname,''))) LIKE unaccent(lower($1))
          OR unaccent(lower(COALESCE(first_name,''))) LIKE unaccent(lower($1))
          OR unaccent(lower(COALESCE(last_name,''))) LIKE unaccent(lower($1))
       ORDER BY nickname NULLS LAST
       LIMIT 10`,
      [`%${query}%`]
    ),
  ]);
  return { pubs, breweries, beers: beersResult, users: usersResult.rows };
}

async function warmPopularSearches(topN = 100) {
  const top = [...searchTermCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
  for (const [term] of top) {
    const cacheKey = buildSearchCacheKey(term, {});
    if (getCached(cacheKey)) continue;
    try {
      const result = await performGlobalSearch(term, {});
      setCache(cacheKey, result);
    } catch { /* warming is best-effort */ }
  }
}
// Re-warm the most popular searches every 15 minutes (best-effort, non-blocking).
setInterval(() => { warmPopularSearches().catch(() => {}); }, 15 * 60 * 1000).unref();

// ── Static startup warm-up ───────────────────────────────────────────────────
// On boot, pre-warm the cache with EVERY keystroke prefix of the most common
// beer styles and brewery/pub name tokens so that first-letter queries ("i",
// "ip", "ipa"…) are already cached before any user types them.
//
// Strategy:
//  1. Pull top styles + brewery/pub first-word tokens from the DB.
//  2. For each full term, generate ALL its prefixes (1-char onward).
//  3. Deduplicate and warm all prefix queries in parallel batches of 5,
//     skipping any key already present in the cache.
async function warmStaticSearchTerms() {
  try {
    // Gather corpus from DB in parallel
    const [stylesResult, breweryWordsResult, pubWordsResult] = await Promise.all([
      pool.query<{ style: string }>(
        `SELECT style FROM beers WHERE style IS NOT NULL GROUP BY style ORDER BY count(*) DESC LIMIT 60`
      ),
      pool.query<{ word: string }>(
        `SELECT lower(split_part(name, ' ', 1)) AS word
         FROM breweries
         WHERE is_closed IS NOT TRUE
           AND length(split_part(name, ' ', 1)) >= 1
         GROUP BY word ORDER BY count(*) DESC LIMIT 40`
      ),
      pool.query<{ word: string }>(
        `SELECT lower(split_part(name, ' ', 1)) AS word
         FROM pubs
         WHERE length(split_part(name, ' ', 1)) >= 1
         GROUP BY word ORDER BY count(*) DESC LIMIT 20`
      ),
    ]);

    // Build the full-term corpus (normalized)
    const fullTerms = new Set<string>();
    for (const row of stylesResult.rows) {
      const t = normalizeSearchTerm(row.style);
      if (t.length >= 1) fullTerms.add(t);
    }
    for (const row of [...breweryWordsResult.rows, ...pubWordsResult.rows]) {
      const t = normalizeSearchTerm(row.word);
      if (t.length >= 1) fullTerms.add(t);
    }

    // Expand to ALL keystroke prefixes (1-char, 2-char, …, full term).
    // This ensures typing "i" → "ip" → "ipa" all hit the cache.
    const allPrefixes = new Set<string>();
    for (const term of fullTerms) {
      // Start at 3: 1-2 char LIKE patterns can't use trigram indexes → 30s seq
      // scans that saturate the pool (short queries use the cheap prefix plan).
      for (let len = 3; len <= term.length; len++) {
        allPrefixes.add(term.slice(0, len));
      }
    }

    // Sort shortest-first so single-char ("i", "s", …) and two-char ("ip", "st", …)
    // prefixes are cached before longer terms — these are the ones users type first.
    const todo = [...allPrefixes]
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .filter(prefix => !getCached(buildSearchCacheKey(prefix, {})));

    // Warm ONE prefix at a time with a small inter-query pause.
    // performGlobalSearch itself fires 4 sub-queries in parallel (pubs + breweries +
    // beers + users), so running just 1 warm-up query at a time is already 4 concurrent
    // DB statements — plenty for a background task without starving the connection pool.
    // A 50 ms pause between prefixes lets the event loop serve any waiting HTTP requests.
    for (const prefix of todo) {
      const cacheKey = buildSearchCacheKey(prefix, {});
      if (getCached(cacheKey)) continue;
      try {
        const result = await performGlobalSearch(prefix, {});
        setCache(cacheKey, result);
      } catch { /* best-effort */ }
      await new Promise(r => setTimeout(r, 50));
    }
  } catch { /* non-fatal: DB may not be ready yet on first boot */ }
}
// ── Filtered warm-up ─────────────────────────────────────────────────────────
// Warm the most common FILTERED searches (style, gluten-free, city) so they
// are served from cache on first use after a restart.
//
// The search UI requires query.length > 1 before it fires, and the server
// returns 400 for an empty query, so we MUST warm with real typed prefixes —
// not empty strings. We re-use the same prefix corpus that warmStaticSearchTerms
// builds, then cross it with three filter dimensions:
//
//  1. glutenFree=true × ALL corpus prefixes
//     (gluten-free is the most-used boolean filter, applied while typing anything)
//  2. Each top style × prefixes of that style's own name
//     (users who filter by "IPA" typically type "i" → "ip" → "ipa")
//  3. Each top city × prefixes of that city's name
//     (same pattern: type the city name with the city filter active)
//
// All warming is sequential with a 50 ms pause to avoid starving the pool.
async function warmFilteredSearchTerms() {
  try {
    // Fetch corpus ingredients (styles + brewery/pub first-word tokens + cities)
    const [stylesResult, breweryWordsResult, pubWordsResult, citiesResult] = await Promise.all([
      pool.query<{ style: string }>(
        `SELECT style FROM beers WHERE style IS NOT NULL GROUP BY style ORDER BY count(*) DESC LIMIT 30`
      ),
      pool.query<{ word: string }>(
        `SELECT lower(split_part(name, ' ', 1)) AS word
         FROM breweries
         WHERE is_closed IS NOT TRUE AND length(split_part(name, ' ', 1)) >= 1
         GROUP BY word ORDER BY count(*) DESC LIMIT 40`
      ),
      pool.query<{ word: string }>(
        `SELECT lower(split_part(name, ' ', 1)) AS word
         FROM pubs WHERE length(split_part(name, ' ', 1)) >= 1
         GROUP BY word ORDER BY count(*) DESC LIMIT 20`
      ),
      pool.query<{ city: string }>(
        `SELECT city FROM pubs WHERE city IS NOT NULL AND city <> '' GROUP BY city ORDER BY count(*) DESC LIMIT 15`
      ),
    ]);

    // ── Build the same prefix corpus as warmStaticSearchTerms ──────────────
    const fullTerms = new Set<string>();
    for (const row of stylesResult.rows) {
      const t = normalizeSearchTerm(row.style);
      if (t.length >= 1) fullTerms.add(t);
    }
    for (const row of [...breweryWordsResult.rows, ...pubWordsResult.rows]) {
      const t = normalizeSearchTerm(row.word);
      if (t.length >= 1) fullTerms.add(t);
    }
    const allPrefixes: string[] = [];
    {
      const prefixSet = new Set<string>();
      for (const term of fullTerms) {
        for (let len = 3; len <= term.length; len++) prefixSet.add(term.slice(0, len));
      }
      allPrefixes.push(...[...prefixSet].sort((a, b) => a.length - b.length || a.localeCompare(b)));
    }

    // Helper: sequential warmer for a list of (prefix, filters) pairs
    async function warmList(items: Array<{ prefix: string; filters: Parameters<typeof buildSearchCacheKey>[1] }>) {
      for (const { prefix, filters } of items) {
        const cacheKey = buildSearchCacheKey(prefix, filters);
        if (getCached(cacheKey)) continue;
        try {
          const result = await performGlobalSearch(prefix, filters);
          setCache(cacheKey, result);
        } catch { /* best-effort */ }
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // 1. glutenFree=true × ALL corpus prefixes
    await warmList(allPrefixes.map(prefix => ({ prefix, filters: { glutenFree: true } as const })));

    // 2. Each top style × prefixes of that style's own name (+ with glutenFree)
    for (const row of stylesResult.rows) {
      const style = row.style.trim(); // original casing for the actual DB query
      const normalized = normalizeSearchTerm(style);
      if (!normalized) continue;
      const stylePrefixes = Array.from({ length: normalized.length }, (_, i) => normalized.slice(0, i + 1)).filter(p => p.length >= 3);

      await warmList(stylePrefixes.map(prefix => ({ prefix, filters: { style } })));
      await warmList(stylePrefixes.map(prefix => ({ prefix, filters: { style, glutenFree: true } as const })));
    }

    // 3. Each top city × prefixes of that city's name
    for (const row of citiesResult.rows) {
      const city = row.city.trim(); // original casing for the actual DB query
      const normalized = normalizeSearchTerm(city);
      if (!normalized) continue;
      const cityPrefixes = Array.from({ length: normalized.length }, (_, i) => normalized.slice(0, i + 1)).filter(p => p.length >= 3);

      await warmList(cityPrefixes.map(prefix => ({ prefix, filters: { city } })));
    }
  } catch { /* non-fatal */ }
}

// Delay slightly so the DB connection pool is fully ready before we hit it.
setTimeout(() => { warmStaticSearchTerms().catch(() => {}); }, 5000).unref();
// Filtered warm-up runs shortly after the static one (give static a head-start).
setTimeout(() => { warmFilteredSearchTerms().catch(() => {}); }, 8000).unref();
// Re-warm the static corpus slightly ahead of TTL expiry so corpus prefix entries
// never go cold between restarts. Interval is 13 min < SEARCH_CACHE_TTL (15 min).
setInterval(() => { warmStaticSearchTerms().catch(() => {}); }, 13 * 60 * 1000).unref();
// Re-warm filtered combos on the same cadence.
setInterval(() => { warmFilteredSearchTerms().catch(() => {}); }, 13 * 60 * 1000).unref();

// ── Persistent search-term store (PostgreSQL) ────────────────────────────────
// Keeps the top-N user-searched terms across server restarts so popular
// searches are served from cache immediately after a deploy/restart, not just
// after the first wave of organic traffic rebuilds the in-memory counts.

async function ensureSearchWarmTermsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_warm_terms (
      term TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/** Load persisted terms into searchTermCounts at startup. */
async function loadPersistedSearchTerms() {
  try {
    await ensureSearchWarmTermsTable();
    const res = await pool.query<{ term: string; count: string }>(
      `SELECT term, count FROM search_warm_terms ORDER BY count DESC LIMIT 1000`
    );
    for (const { term, count } of res.rows) {
      const n = parseInt(count as string, 10) || 1;
      // Merge: keep the higher count (in-memory may already have some traffic)
      const existing = searchTermCounts.get(term) ?? 0;
      if (n > existing) searchTermCounts.set(term, n);
    }
    if (res.rows.length > 0) {
      console.log(`[search-warm] Loaded ${res.rows.length} persisted search terms from DB`);
      // Immediately warm the cache for the most popular persisted terms so users
      // get fast responses right after a restart, before organic traffic rebuilds it.
      warmPopularSearches().catch(() => {});
    }
  } catch (e: any) {
    console.warn("[search-warm] Could not load persisted terms:", e?.message);
  }
}

/** Upsert the top-1000 in-memory search terms to the DB. */
async function persistSearchTerms() {
  if (searchTermCounts.size === 0) return;
  try {
    await ensureSearchWarmTermsTable();
    const top = [...searchTermCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1000);
    if (top.length === 0) return;
    // Build a single multi-row upsert for efficiency
    const values = top.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, now())`).join(", ");
    const params = top.flatMap(([term, count]) => [term, count]);
    await pool.query(
      `INSERT INTO search_warm_terms (term, count, updated_at)
       VALUES ${values}
       ON CONFLICT (term) DO UPDATE
         SET count = EXCLUDED.count,
             updated_at = EXCLUDED.updated_at`,
      params
    );
  } catch (e: any) {
    console.warn("[search-warm] Could not persist search terms:", e?.message);
  }
}

// Load persisted terms on startup (2 s — before the static warm-up at 5 s).
// This seeds searchTermCounts so warmPopularSearches() (called inside) can
// warm real user queries before any organic traffic arrives.
setTimeout(() => { loadPersistedSearchTerms().catch(() => {}); }, 2000).unref();

// Persist terms periodically so counts survive across restarts.
setInterval(() => { persistSearchTerms().catch(() => {}); }, 10 * 60 * 1000).unref();

// Persist on graceful shutdown (SIGTERM from systemd/Replit, SIGINT from Ctrl-C).
// Use a safety timeout so a hung DB query never blocks the process from exiting.
function _flushSearchTermsAndExit() {
  const safety = setTimeout(() => process.exit(0), 4000);
  if (safety.unref) safety.unref();
  persistSearchTerms().finally(() => { clearTimeout(safety); process.exit(0); });
}
process.once("SIGTERM", _flushSearchTermsAndExit);
process.once("SIGINT",  _flushSearchTermsAndExit);

// ── Shared helper: base64 dataURL → temp file ───────────────────────────────
async function writeTempImage(dataUrl: string): Promise<{ path: string; ext: string } | null> {
  const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!m) return null;
  const ext = m[2] === "png" ? "png" : "jpg";
  const path = `${tmpdir()}/ocr_${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path, Buffer.from(m[3], "base64"));
  return { path, ext };
}

// ── PaddleOCR (best accuracy, Python script) ────────────────────────────────
// Runs server/paddle_ocr.py — installed once on VPS, cached models ~200MB.
const PADDLE_SCRIPT = new URL("../server/paddle_ocr.py", import.meta.url).pathname;

async function runPaddleOCR(dataUrl: string): Promise<{ text: string; available: boolean }> {
  const tmp = await writeTempImage(dataUrl);
  if (!tmp) return { text: "", available: false };
  try {
    const { stdout } = await execFileAsync("python3", [PADDLE_SCRIPT, tmp.path], {
      timeout: 55000,
      env: {
        ...process.env,
        GLOG_minloglevel: "3",
        FLAGS_call_stack_level: "0",
        FLAGS_use_mkldnn: "0",
        PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: "True",
        OMP_NUM_THREADS: "2",
      },
    });
    return { text: stdout.trim(), available: true };
  } catch (e: any) {
    if (e?.code === 2) return { text: "", available: false }; // not installed
    if (!e?.message?.includes("ENOENT")) console.error("PaddleOCR error:", e?.message);
    return { text: "", available: true };
  } finally {
    unlink(tmp.path).catch(() => {});
  }
}

// ── Tesseract fallback (already on VPS, fast, no models to download) ─────────
async function runLocalTesseract(dataUrl: string): Promise<string> {
  const tmp = await writeTempImage(dataUrl);
  if (!tmp) return "";

  const runTesseract = async (psm: string): Promise<string> => {
    try {
      const { stdout } = await execFileAsync(
        "tesseract", [tmp.path, "stdout", "-l", "ita+eng", "--psm", psm, "--oem", "3"],
        { timeout: 15000 }
      );
      return stdout.trim();
    } catch (e: any) {
      // Tesseract exits with code 1 when text confidence is low but may still produce stdout
      if (e?.stdout && (e.stdout as string).trim().length > 0) return (e.stdout as string).trim();
      if (!e?.message?.includes("ENOENT")) console.error("Tesseract error:", e?.message?.split("\n")[0]);
      return "";
    }
  };

  try {
    // PSM 11 = sparse text (best for labels with mixed layout)
    const text11 = await runTesseract("11");
    if (text11.length >= 4) return text11;
    // PSM 6 = assume uniform block of text
    const text6 = await runTesseract("6");
    return text6;
  } finally {
    unlink(tmp.path).catch(() => {});
  }
}

if (initVapid()) {
  console.log('Web Push configured with VAPID keys');
} else {
  console.warn('VAPID keys not set - web push (PWA) disabled. APNs (iOS native) still works if APNS_KEY_ID/TEAM_ID/P8_KEY are set.');
}
if (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_P8_KEY) {
  console.log('APNs configured for iOS native push (bundle:', process.env.APNS_BUNDLE_ID || 'to.fermentato.app', ')');
} else {
  console.warn('APNs not fully configured - iOS native push disabled. Set APNS_KEY_ID, APNS_TEAM_ID, APNS_P8_KEY.');
}
if (!process.env.FCM_SERVICE_ACCOUNT) {
  console.warn('FCM not configured - Android native push disabled. Set FCM_SERVICE_ACCOUNT (Firebase Console → Project Settings → Service accounts → Generate private key).');
} else {
  try {
    const sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    console.log('FCM configured - Android native push enabled (project:', sa.project_id, ')');
  } catch {
    console.error('FCM_SERVICE_ACCOUNT is not valid JSON - Android push disabled.');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Rate limit globale su tutte le API ───────────────────────────────────────
  // 300 req / 5 min per IP (loopback escluso). Ogni endpoint critico ha poi
  // il proprio limite più stretto (login, register, search, ecc.).
  app.use("/api/", generalApiRateLimit);

  // Setup authentication (email/password + Google OAuth)
  try {
    await setupAuth(app);
    console.log("Authentication system initialized successfully");
  } catch (error: any) {
    console.error("Failed to initialize authentication:", error.message);
  }

  // Endpoint nativi per Google/Apple Sign-In dell'app iOS/Android (Capacitor).
  // Su native, il plugin @capgo/capacitor-social-login fornisce idToken /
  // identityToken firmati dal provider; questi endpoint li verificano e
  // creano la sessione (vedi server/native-auth.ts).
  const { registerNativeAuthRoutes } = await import("./native-auth");
  registerNativeAuthRoutes(app);
  console.log("Native auth routes (Google/Apple) registered");

  // Test SMTP connection at startup
  testSmtpConnection();

  // Register admin routes
  registerAdminRoutes(app);
  registerFestivalRoutes(app);
  runFestivalMigrations();

  // Register social/microblog/news/broadcast routes
  const { registerSocialRoutes } = await import("./routes-social");
  await registerSocialRoutes(app);

  // Register bot routes (Telegram + WhatsApp) + run migrations
  const { registerBotRoutes, runBotMigrations } = await import("./bot-routes");
  registerBotRoutes(app);
  runBotMigrations();

  // Register Telegram webhook on startup
  // Usa APP_DOMAIN su VPS, REPLIT_DOMAINS su Replit
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const domain = process.env.APP_DOMAIN
      || process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      import("./telegram-bot").then(({ registerTelegramWebhook }) => {
        registerTelegramWebhook(`https://${domain}`).catch(() => {});
      });
    }
  }

  // ── Cleanup expired event/festival interests ──────────────────────────────
  async function cleanupExpiredInterests() {
    let pubCount = 0, brewCount = 0, festCount = 0;
    try {
      const r = await pool.query(`
        DELETE FROM pub_event_interests
        WHERE event_id IN (
          SELECT id FROM pub_events
          WHERE COALESCE(end_date, event_date) + INTERVAL '12 hours' < NOW()
        )
      `);
      pubCount = r.rowCount || 0;
    } catch (_) {}
    try {
      const r = await pool.query(`
        DELETE FROM brewery_event_interests
        WHERE event_id IN (
          SELECT id FROM brewery_events
          WHERE COALESCE(end_date, event_date) + INTERVAL '12 hours' < NOW()
        )
      `);
      brewCount = r.rowCount || 0;
    } catch (_) {}
    try {
      const r = await pool.query(`
        DELETE FROM favorites
        WHERE item_type = 'festival'
          AND item_id IN (
            SELECT id FROM festivals
            WHERE end_date IS NOT NULL AND end_date::timestamp < NOW()
          )
      `);
      festCount = r.rowCount || 0;
    } catch (_) {}
    const total = pubCount + brewCount + festCount;
    if (total > 0) {
      console.log(`[cleanup] Removed ${pubCount} pub event, ${brewCount} brewery event, ${festCount} festival interests (expired)`);
    }
  }
  // Run at startup and every hour
  cleanupExpiredInterests();
  setInterval(cleanupExpiredInterests, 60 * 60 * 1000);

  // ── Event-start push notifications ──────────────────────────────────────────
  // Periodically sends push to "interested" users when their event has just
  // started (within the last hour) and the notification has not been sent yet.
  async function sendEventStartNotifications() {
    try {
      // ── Pub events ──
      const pubRes = await pool.query(`
        SELECT e.id, e.title, e.event_date, e.image_url, e.pub_id,
               p.name AS pub_name
        FROM pub_events e
        INNER JOIN pubs p ON p.id = e.pub_id
        WHERE e.is_published = true
          AND e.start_notification_sent = false
          AND e.event_date <= NOW()
          AND e.event_date >  NOW() - INTERVAL '2 hours'
        LIMIT 50
      `);
      for (const row of pubRes.rows) {
        // Mark sent FIRST (atomic guard) to prevent duplicate notifications
        // on concurrent runs / restart-mid-loop. We then dispatch the (fire-and-forget) pushes.
        const upd = await pool.query(
          `UPDATE pub_events SET start_notification_sent = true
             WHERE id = $1 AND start_notification_sent = false`,
          [row.id]
        );
        if (upd.rowCount === 0) continue; // Another worker/run claimed it
        const interestedRes = await pool.query(
          `SELECT user_id FROM pub_event_interests WHERE event_id = $1`,
          [row.id]
        );
        const userIds: string[] = interestedRes.rows.map((r: any) => r.user_id);
        for (const uid of userIds) {
          sendPushToUser(uid, {
            title: `🍺 ${row.title} è iniziato!`,
            body: `Sta succedendo ora a ${row.pub_name}`,
            url: `/eventi/pub/${row.id}`,
            tag: `event-pub-${row.id}`,
            icon: row.image_url || undefined,
            category: 'events',
          });
        }
      }

      // ── Brewery events ──
      const brewRes = await pool.query(`
        SELECT e.id, e.title, e.event_date, e.image_url, e.brewery_id,
               br.name AS brewery_name
        FROM brewery_events e
        INNER JOIN breweries br ON br.id = e.brewery_id
        WHERE e.is_published = true
          AND e.start_notification_sent = false
          AND e.event_date <= NOW()
          AND e.event_date >  NOW() - INTERVAL '2 hours'
        LIMIT 50
      `);
      for (const row of brewRes.rows) {
        // Mark sent FIRST (atomic guard) to prevent duplicate notifications.
        const upd = await pool.query(
          `UPDATE brewery_events SET start_notification_sent = true
             WHERE id = $1 AND start_notification_sent = false`,
          [row.id]
        );
        if (upd.rowCount === 0) continue;
        const interestedRes = await pool.query(
          `SELECT user_id FROM brewery_event_interests WHERE event_id = $1`,
          [row.id]
        );
        const userIds: string[] = interestedRes.rows.map((r: any) => r.user_id);
        for (const uid of userIds) {
          sendPushToUser(uid, {
            title: `🍺 ${row.title} è iniziato!`,
            body: `Sta succedendo ora a ${row.brewery_name}`,
            url: `/eventi/brewery/${row.id}`,
            tag: `event-brewery-${row.id}`,
            icon: row.image_url || undefined,
            category: 'events',
          });
        }
      }

      const total = pubRes.rowCount! + brewRes.rowCount!;
      if (total > 0) {
        console.log(`[event-notifs] Sent start notifications for ${total} events`);
      }
    } catch (err) {
      console.error("[event-notifs] error:", err);
    }
  }
  // Run after a short delay so the server is fully ready, then every 10 minutes.
  setTimeout(sendEventStartNotifications, 30_000);
  setInterval(sendEventStartNotifications, 10 * 60 * 1000);

  // ── Event day-of reminders ──────────────────────────────────────────────────
  // Once per event, on the day it starts, remind every "interested" user that
  // the event is happening today. Sends both a push and an in-app notification
  // (the latter respects the user's notification preferences via
  // storage.createNotification). Guarded by the reminder_sent flag so each
  // event is reminded exactly once. Fires for events starting later "today"
  // (event_date is still in the future but on the current calendar day) so the
  // reminder arrives the morning-of rather than at start time.
  async function sendEventDayReminders() {
    // Process a single event: atomically claim it (set reminder_sent=true),
    // create the in-app notifications (AWAITED — this is the durable signal),
    // then attempt pushes (best-effort, failures logged but non-blocking).
    // If in-app notification creation fails, reset reminder_sent=false so the
    // reminder is retried on a later run. Per-event try/catch isolates failures.
    async function processEvent(opts: {
      table: "pub_events" | "brewery_events";
      interestTable: "pub_event_interests" | "brewery_event_interests";
      row: any;
      venueName: string;
      urlPath: string;
      tagPrefix: string;
      notifKey: "pubId" | "breweryId";
      venueId: number;
    }): Promise<boolean> {
      const { table, interestTable, row, venueName, urlPath, tagPrefix, notifKey, venueId } = opts;
      // Atomic claim (RETURNING id) so concurrent runs / restarts don't double-send.
      const upd = await pool.query(
        `UPDATE ${table} SET reminder_sent = true
           WHERE id = $1 AND reminder_sent = false RETURNING id`,
        [row.id]
      );
      if (upd.rowCount === 0) return false; // Another run claimed it

      try {
        const interestedRes = await pool.query(
          `SELECT user_id FROM ${interestTable} WHERE event_id = $1`,
          [row.id]
        );
        const userIds: string[] = interestedRes.rows.map((r: any) => r.user_id);

        // 1) In-app notifications — AWAITED. These are the durable signal that
        //    gates the "sent" flag. respects notification preferences internally.
        await Promise.all(userIds.map((uid) =>
          storage.createNotification({
            userId: uid,
            type: 'event',
            title: `Oggi: ${row.title}`,
            message: `L'evento a cui sei interessato si tiene oggi presso ${venueName}`,
            urlPath,
            [notifKey]: venueId,
          } as any)
        ));

        // 2) Push — best-effort. Failures are logged but do NOT block/reset the
        //    sent flag (in-app notifications already delivered successfully).
        for (const uid of userIds) {
          try {
            await sendPushToUser(uid, {
              title: `📅 Oggi: ${row.title}`,
              body: `L'evento a cui sei interessato si tiene oggi presso ${venueName}`,
              url: urlPath,
              tag: `${tagPrefix}-${row.id}`,
              icon: row.image_url || undefined,
              category: 'events',
            });
          } catch (pushErr) {
            console.error(`[event-notifs] push failed for user ${uid}, event ${row.id}:`, pushErr);
          }
        }
        return true;
      } catch (err) {
        // In-app notification creation failed — undo the claim so we retry later.
        console.error(`[event-notifs] reminder failed for ${table} ${row.id}, resetting:`, err);
        await pool.query(
          `UPDATE ${table} SET reminder_sent = false WHERE id = $1`,
          [row.id]
        ).catch(() => {});
        return false;
      }
    }

    try {
      // "Today" = Italy's calendar day. event_date is a timezone-less timestamp
      // representing local Italian wall-clock time, so compare against the
      // current date in Europe/Rome.
      // ── Pub events starting later today ──
      const pubRes = await pool.query(`
        SELECT e.id, e.title, e.event_date, e.image_url, e.pub_id,
               p.name AS pub_name
        FROM pub_events e
        INNER JOIN pubs p ON p.id = e.pub_id
        WHERE e.is_published = true
          AND e.reminder_sent = false
          AND e.event_date >= NOW()
          AND e.event_date::date = (NOW() AT TIME ZONE 'Europe/Rome')::date
        LIMIT 50
      `);
      let sent = 0;
      for (const row of pubRes.rows) {
        const ok = await processEvent({
          table: "pub_events",
          interestTable: "pub_event_interests",
          row,
          venueName: row.pub_name,
          urlPath: `/eventi/pub/${row.id}`,
          tagPrefix: "event-reminder-pub",
          notifKey: "pubId",
          venueId: row.pub_id,
        });
        if (ok) sent++;
      }

      // ── Brewery events starting later today ──
      const brewRes = await pool.query(`
        SELECT e.id, e.title, e.event_date, e.image_url, e.brewery_id,
               br.name AS brewery_name
        FROM brewery_events e
        INNER JOIN breweries br ON br.id = e.brewery_id
        WHERE e.is_published = true
          AND e.reminder_sent = false
          AND e.event_date >= NOW()
          AND e.event_date::date = (NOW() AT TIME ZONE 'Europe/Rome')::date
        LIMIT 50
      `);
      for (const row of brewRes.rows) {
        const ok = await processEvent({
          table: "brewery_events",
          interestTable: "brewery_event_interests",
          row,
          venueName: row.brewery_name,
          urlPath: `/eventi/brewery/${row.id}`,
          tagPrefix: "event-reminder-brewery",
          notifKey: "breweryId",
          venueId: row.brewery_id,
        });
        if (ok) sent++;
      }

      if (sent > 0) {
        console.log(`[event-notifs] Sent day-of reminders for ${sent} events`);
      }
    } catch (err) {
      console.error("[event-notifs] day-reminder error:", err);
    }
  }
  // Run after startup, then every 30 minutes (lightweight: guarded by reminder_sent).
  setTimeout(sendEventDayReminders, 45_000);
  setInterval(sendEventDayReminders, 30 * 60 * 1000);

  // Startup: ensure festival_food_items has allergens column
  (async () => {
    try {
      await pool.query(`ALTER TABLE festival_food_items ADD COLUMN IF NOT EXISTS allergens jsonb`);
    } catch (e) {
      console.error("[festival_food_items] allergens migration error:", e);
    }
  })();

  // Startup: ensure pub_events / brewery_events have reminder_sent column
  // (day-of reminder for "interested" users — see sendEventDayReminders)
  (async () => {
    try {
      await pool.query(`ALTER TABLE pub_events ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false`);
      await pool.query(`ALTER TABLE brewery_events ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false`);
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url_path varchar`);
    } catch (e: any) {
      console.error("[events] reminder_sent migration error:", e.message);
    }
  })();

  // Startup: ensure allergens.name unique constraint (drizzle-kit requires TTY to apply interactively)
  (async () => {
    try {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS allergens_name_unique ON allergens(name)`);
    } catch (e: any) {
      console.warn("[allergens] unique index skipped:", e.message);
    }
  })();

  // Startup: ensure breweries has social/contact columns
  (async () => {
    try {
      await pool.query(`
        ALTER TABLE breweries ADD COLUMN IF NOT EXISTS email varchar;
        ALTER TABLE breweries ADD COLUMN IF NOT EXISTS instagram_url varchar;
        ALTER TABLE breweries ADD COLUMN IF NOT EXISTS facebook_url varchar;
        ALTER TABLE breweries ADD COLUMN IF NOT EXISTS tiktok_url varchar;
      `);
    } catch (e) {
      console.error("[breweries] social columns migration error:", e);
    }
  })();

  // Startup: ensure beers has awards column
  (async () => {
    try {
      await pool.query(`ALTER TABLE beers ADD COLUMN IF NOT EXISTS awards jsonb`);
    } catch (e) {
      console.error("[beers] awards migration error:", e);
    }
  })();

  // Startup: ensure user_beer_tastings has owner_reply columns + photo + decimal rating
  (async () => {
    try {
      await pool.query(`ALTER TABLE user_beer_tastings ADD COLUMN IF NOT EXISTS owner_reply text`);
      await pool.query(`ALTER TABLE user_beer_tastings ADD COLUMN IF NOT EXISTS owner_reply_at timestamp`);
      await pool.query(`ALTER TABLE user_beer_tastings ADD COLUMN IF NOT EXISTS photo_url text`);
      await pool.query(`ALTER TABLE user_beer_tastings ALTER COLUMN rating TYPE numeric(3,1) USING rating::numeric`);
    } catch (e) {
      console.error("[user_beer_tastings] migration error:", e);
    }
  })();

  // Startup: ensure festivals has schedule column
  (async () => {
    try {
      await pool.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS schedule jsonb`);
    } catch (e) {
      console.error("[festivals] schedule migration error:", e);
    }
  })();

  // Startup: ensure festival_ratings has owner_reply / comment columns
  (async () => {
    try {
      await pool.query(`ALTER TABLE festival_ratings ADD COLUMN IF NOT EXISTS comment text`);
      await pool.query(`ALTER TABLE festival_ratings ADD COLUMN IF NOT EXISTS owner_reply text`);
      await pool.query(`ALTER TABLE festival_ratings ADD COLUMN IF NOT EXISTS owner_reply_at timestamp`);
    } catch (e) {
      console.error("[festival_ratings] reply migration error:", e);
    }
  })();

  // Startup: ensure festival_taps has tap_type column
  (async () => {
    try {
      await pool.query(`ALTER TABLE festival_taps ADD COLUMN IF NOT EXISTS tap_type varchar(20) DEFAULT 'spina'`);
    } catch (e) {
      console.error("[festival_taps] tap_type migration error:", e);
    }
  })();

  // ── Startup: indici performance per le rotte di lista più calde ──────────
  // (CREATE INDEX IF NOT EXISTS è idempotente; sicuro a ogni avvio)
  (async () => {
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_brewery_id ON beers(brewery_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_style_lower ON beers((lower(style))) WHERE style IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_pubs_lat_lng ON pubs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_pubs_slug ON pubs(slug)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_slug ON breweries(slug)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_lat_lng ON breweries(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tap_list_pub_id ON tap_list(pub_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tap_list_beer_id ON tap_list(beer_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_favorites_user_item ON favorites(user_id, item_type, item_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beer_views_beer_date ON beer_views(beer_id, viewed_at)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_beer_tastings_user ON user_beer_tastings(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_beer_tastings_beer ON user_beer_tastings(beer_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_beer_tastings_beer_date ON user_beer_tastings(beer_id, created_at)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_favorites_type_item ON favorites(item_type, item_id)`);
    } catch (e) {
      // ignored
    }
  })();

  // ── Startup: estensioni + indici GIN trigram per la ricerca full-text ──────
  // Questi indici rendono LIKE '%termine%' O(log n) invece di O(n seq scan).
  // CREATE INDEX IF NOT EXISTS è idempotente. La prima esecuzione costruisce
  // gli indici (qualche secondo su DB piccoli, 1-2 min su 50k+ righe).
  (async () => {
    try {
      // Estensioni (no-op se già presenti)
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).catch(() => {});
      await pool.query(`CREATE EXTENSION IF NOT EXISTS unaccent`).catch(() => {});
      // Funzione unaccent IMMUTABLE richiesta dagli indici su espressione
      await pool.query(`
        CREATE OR REPLACE FUNCTION unaccent_immutable(text)
          RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
          $$ SELECT unaccent($1) $$
      `).catch(() => {});

      // ── BIRRE ──
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_name_unaccent_trgm
        ON beers USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops)`).catch(() => {});
      // Btree prefix index for SHORT (1-2 char) queries where trigram GIN can't help
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_name_unaccent_prefix
        ON beers (unaccent_immutable(lower(name)) text_pattern_ops)`).catch(() => {});
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_name_compact_trgm
        ON beers USING GIN (regexp_replace(lower(name), '\\s+', '', 'g') gin_trgm_ops)`).catch(() => {});
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_style_trgm
        ON beers USING GIN (lower(COALESCE(style,'')) gin_trgm_ops) WHERE style IS NOT NULL`).catch(() => {});
      // Functional index for exact case-insensitive style browse (/api/beers/by-style):
      // `WHERE lower(style) = lower($1)` on 1.19M rows needs this btree or it seq-scans.
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_beers_style_lower
        ON beers (lower(style))`).catch(() => {});

      // ── BIRRIFICI ──
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_name_unaccent_trgm
        ON breweries USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops)`).catch(() => {});
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_name_compact_trgm
        ON breweries USING GIN (regexp_replace(lower(name), '\\s+', '', 'g') gin_trgm_ops)`).catch(() => {});
      // Esplora birrifici search also matches città/nazione (see storage.exploreBreweries);
      // these keep the location/country branches of the search UNION index-backed.
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_location_unaccent_trgm
        ON breweries USING GIN (unaccent_immutable(lower(COALESCE(location,''))) gin_trgm_ops) WHERE location IS NOT NULL`).catch(() => {});
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_breweries_country_unaccent_trgm
        ON breweries USING GIN (unaccent_immutable(lower(COALESCE(country,''))) gin_trgm_ops) WHERE country IS NOT NULL`).catch(() => {});

      // ── PUB ──
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_pubs_name_trgm
        ON pubs USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops)`).catch(() => {});
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_pubs_city_trgm
        ON pubs USING GIN (unaccent_immutable(lower(COALESCE(city,''))) gin_trgm_ops) WHERE city IS NOT NULL`).catch(() => {});

      // ── UTENTI ──
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_nickname_trgm
        ON users USING GIN (unaccent_immutable(lower(COALESCE(nickname,''))) gin_trgm_ops)`).catch(() => {});

      console.log('[indexes] GIN trigram indexes ready');
    } catch (e) {
      // Su alcune tabelle (es. beer_views) potrebbero non esserci ancora;
      // log soft, non blocca l'avvio.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[indexes] migration soft-fail:", msg.slice(0, 120));
    }
  })();

  // Startup: ensure pubs have slug column + auto-generate slugs
  (async () => {
    try {
      // Ensure pub_page_views table exists (may be missing on older VPS schemas)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pub_page_views (
          pub_id integer NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
          view_date date NOT NULL DEFAULT CURRENT_DATE,
          view_count integer NOT NULL DEFAULT 1,
          PRIMARY KEY (pub_id, view_date)
        )
      `);
    } catch (e) {
      console.error("[pub_page_views] table creation error:", e);
    }
    try {
      await pool.query(`ALTER TABLE pubs ADD COLUMN IF NOT EXISTS slug varchar(150) UNIQUE`);
      const { rows } = await pool.query(`SELECT id, name FROM pubs WHERE slug IS NULL`);
      for (const row of rows) {
        const base = row.name
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 100);
        let slug = base;
        let counter = 2;
        while (true) {
          const { rows: taken } = await pool.query(`SELECT id FROM pubs WHERE slug = $1 AND id != $2 LIMIT 1`, [slug, row.id]);
          if (taken.length === 0) {
            await pool.query(`UPDATE pubs SET slug = $1 WHERE id = $2`, [slug, row.id]);
            break;
          }
          slug = `${base}-${counter}`;
          counter++;
        }
      }
    } catch (e) {
      console.error("[pubs] slug migration error:", e);
    }
  })();

  // ─── New feature tables migrations ───────────────────────────────────────────
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_cellar (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          beer_id INTEGER NOT NULL REFERENCES beers(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1,
          notes TEXT,
          vintage VARCHAR(10),
          purchase_price NUMERIC(8,2),
          added_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, beer_id)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_wishlist (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          beer_id INTEGER NOT NULL REFERENCES beers(id) ON DELETE CASCADE,
          added_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, beer_id)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS next_tap_proposals (
          id SERIAL PRIMARY KEY,
          pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
          beer_id INTEGER NOT NULL REFERENCES beers(id) ON DELETE CASCADE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS next_tap_votes (
          id SERIAL PRIMARY KEY,
          proposal_id INTEGER NOT NULL REFERENCES next_tap_proposals(id) ON DELETE CASCADE,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(proposal_id, user_id)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_follows (
          id SERIAL PRIMARY KEY,
          follower_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(follower_id, following_id)
        )
      `);
      // Soft migrations for menu_items new columns
      await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS pairing_beer_name VARCHAR(255)`).catch(() => {});
      await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
      await pool.query(`ALTER TABLE next_tap_proposals ADD COLUMN IF NOT EXISTS keg_count INTEGER DEFAULT 1`).catch(() => {});
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tap_change_logs (
          id SERIAL PRIMARY KEY,
          pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
          tap_number INTEGER,
          tap_type VARCHAR(20),
          old_beer_id INTEGER,
          old_beer_name VARCHAR(255),
          new_beer_id INTEGER,
          new_beer_name VARCHAR(255),
          changed_at TIMESTAMP DEFAULT NOW(),
          duration_minutes INTEGER
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tap_cleanings (
          id SERIAL PRIMARY KEY,
          pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
          tap_number INTEGER,
          tap_type VARCHAR(20) DEFAULT 'spina',
          line_name VARCHAR(100),
          cleaned_at TIMESTAMP DEFAULT NOW(),
          notes TEXT
        )
      `);
    } catch (e) {
      console.error("[migration] new feature tables error:", e);
    }
  })();

  // Helper: resolve pub ID from numeric id or slug
  async function resolvePubId(param: string): Promise<number | null> {
    const numId = parseInt(param);
    if (!isNaN(numId)) return numId;
    const pub = await storage.getPubBySlug(param);
    return pub?.id ?? null;
  }

  // Public routes - no authentication required
  
  // Get all pubs
  app.get("/api/pubs", async (req, res) => {
    try {
      const pubs = await storage.getPubs();
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  // Public pub search — used by check-in modal
  app.get("/api/pubs/search", async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      if (!q) return res.json([]);
      const results = await storage.searchPubs(q);
      res.json(results.slice(0, 15));
    } catch (error) {
      console.error("Error searching pubs:", error);
      res.status(500).json({ message: "Failed to search pubs" });
    }
  });

  // Get all pubs for explore page — slim projection (only fields the Esplora
  // Pub page/map consume) + short-TTL memCached + Cache-Control, mirroring
  // /api/pubs. Keeps the browser payload small and cache-friendly.
  app.get("/api/pubs/all", async (req, res) => {
    try {
      const pubs = await memCached("pubs:explore:v1", 2 * 60 * 1000, () =>
        storage.getPubsForExplore()
      );
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching all pubs:", error);
      res.status(500).json({ message: "Failed to fetch all pubs" });
    }
  });

  // Nearby pubs — sorted by haversine distance from user's position
  app.get("/api/pubs/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = Math.min(parseFloat(req.query.radius as string) || 15, 100);
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "lat e lng sono obbligatori" });
      }

      const result = await db.execute(sql`
        SELECT
          p.id, p.name, p.slug, p.city, p.region, p.address,
          p.logo_url        AS "logoUrl",
          p.cover_image_url AS "coverImageUrl",
          p.latitude, p.longitude,
          p.opening_hours   AS "openingHours",
          p.phone,
          p.website_url     AS "websiteUrl",
          p.rating,
          (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(p.latitude::float))
              * cos(radians(p.longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(p.latitude::float))
            )
          )) AS "distanceKm"
        FROM pubs p
        WHERE p.latitude  IS NOT NULL
          AND p.longitude IS NOT NULL
          AND p.latitude::text  NOT IN ('0', '')
          AND p.longitude::text NOT IN ('0', '')
          AND COALESCE(p.is_closed, false) = false
        HAVING (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(p.latitude::float))
              * cos(radians(p.longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(p.latitude::float))
            )
          )) <= ${radius}
        ORDER BY "distanceKm" ASC
        LIMIT ${limit}
      `);

      res.setHeader('Cache-Control', 'no-store');
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching nearby pubs:", error.message);
      res.status(500).json({ message: "Errore nel recupero dei pub vicini" });
    }
  });

  // Pubs serving a specific beer style on tap (used by Esplora Birre → Dove berle)
  app.get("/api/pubs/by-style", async (req, res) => {
    try {
      const style = (req.query.style as string)?.trim();
      if (!style) return res.status(400).json({ message: "style param required" });
      const cacheKey = `pubs:by-style:v1:${style.toLowerCase()}`;
      const result = await memCached(cacheKey, 5 * 60 * 1000, async () => {
        const rows = await db
          .select({
            id: pubs.id,
            name: pubs.name,
            slug: pubs.slug,
            city: pubs.city,
            region: pubs.region,
            latitude: pubs.latitude,
            longitude: pubs.longitude,
            coverImageUrl: pubs.coverImageUrl,
            logoUrl: pubs.logoUrl,
            rating: pubs.rating,
            openingHours: pubs.openingHours,
            tapCount: sql<number>`COUNT(DISTINCT ${tapList.id})::int`,
          })
          .from(pubs)
          .innerJoin(tapList, eq(tapList.pubId, pubs.id))
          .innerJoin(beers, eq(beers.id, tapList.beerId))
          .where(sql`lower(${beers.style}) = lower(${style}) AND ${tapList.isActive} = true AND ${tapList.isVisible} = true`)
          .groupBy(pubs.id);
        return rows;
      });
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(result);
    } catch (error) {
      console.error("Error fetching pubs by style:", error);
      res.status(500).json({ message: "Failed to fetch pubs by style" });
    }
  });

  // Get all breweries for explore page
  app.get("/api/breweries/all", async (req, res) => {
    try {
      const allBreweries = await memCached("breweries:all:gps", 5 * 60 * 1000, async () => {
        const all = await storage.getBreweriesWithBeerCount(undefined, false);
        return (all as any[]).filter((b: any) => b.latitude && b.longitude);
      });
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(allBreweries);
    } catch (error) {
      console.error("Error fetching all breweries:", error);
      res.status(500).json({ message: "Failed to fetch all breweries" });
    }
  });

  // Lightweight map-only endpoint: only id, name, lat, lng, logoUrl — no JOINs, very fast
  app.get("/api/breweries/map", async (req, res) => {
    try {
      const mapData = await memCached("breweries:map:v1", 10 * 60 * 1000, async () => {
        return storage.getBreweriesForMap();
      });
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(mapData);
    } catch (error) {
      console.error("Error fetching breweries for map:", error);
      res.status(500).json({ message: "Failed to fetch breweries for map" });
    }
  });

  // Get unique beer styles for dropdown (must be before beers/:id)
  app.get("/api/beers/styles", async (req, res) => {
    try {
      const styles = await memCached("beers:styles:v1", 10 * 60 * 1000, async () => {
        const rows = await db
          .selectDistinct({ style: beers.style })
          .from(beers)
          .where(sql`${beers.style} IS NOT NULL AND ${beers.style} != ''`)
          .orderBy(beers.style);
        return rows as Array<{ style: string }>;
      });
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.json(styles);
    } catch (error) {
      console.error("Error fetching beer styles:", error);
      res.status(500).json({ message: "Failed to fetch beer styles" });
    }
  });

  // Get top beer styles with counts (real data from DB)
  app.get("/api/beers/popular-styles", async (req, res) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 30);
      const rows = await memCached(`beers:popular-styles:v2:${limit}`, 10 * 60 * 1000, () =>
        db
          .select({ style: beers.style, count: sql<number>`COUNT(*)::int` })
          .from(beers)
          .where(and(sql`${beers.style} IS NOT NULL AND ${beers.style} != ''`, beerVisibleSql))
          .groupBy(beers.style)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(limit)
      );
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(rows);
    } catch (error) {
      console.error("Error fetching popular styles:", error);
      res.status(500).json({ message: "Failed to fetch popular styles" });
    }
  });

  // ── Routing reale via OSRM ────────────────────────────────────────────────
  // GET /api/route?fromLat&fromLng&toLat&toLng&mode=driving|walking|cycling
  // Ritorna distanza/durata reali su strada con cache 24h e fallback Haversine.
  app.get("/api/route", async (req, res) => {
    try {
      const fromLat = parseFloat(req.query.fromLat as string);
      const fromLng = parseFloat(req.query.fromLng as string);
      const toLat = parseFloat(req.query.toLat as string);
      const toLng = parseFloat(req.query.toLng as string);
      const modeRaw = (req.query.mode as string) || "driving";
      const mode = (modeRaw === "walking" || modeRaw === "cycling") ? modeRaw : "driving";

      if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
        return res.status(400).json({ message: "fromLat, fromLng, toLat, toLng sono obbligatori" });
      }

      // IP hardening: ci fidiamo di req.ip (Express applica trust proxy se
      // configurato). Evitiamo di leggere x-forwarded-for grezzo per non
      // permettere spoof dell'header e bypass del rate-limit.
      const ip = req.ip || "anon";
      const { getRouteDistance, tryConsumeToken } = await import("./routing");
      if (!tryConsumeToken(ip)) {
        // Rate-limit per IP: forziamo il fallback Haversine senza toccare OSRM.
        console.warn(`[routing] rate-limit per IP ${ip}`);
        const r = await getRouteDistance(
          { lat: fromLat, lng: fromLng },
          { lat: toLat, lng: toLng },
          mode as "driving" | "walking" | "cycling",
          { forceFallback: true },
        );
        res.setHeader("X-Rate-Limited", "1");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.json(r);
      }
      const r = await getRouteDistance(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng },
        mode as "driving" | "walking" | "cycling",
      );
      // Cache HTTP breve (CDN/browser); il backend ha già la sua cache 24h.
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
      res.json(r);
    } catch (error) {
      console.error("Error computing route:", error);
      res.status(500).json({ message: "Failed to compute route" });
    }
  });

  // Trending beers (most viewed in last N days)
  app.get("/api/beers/trending", async (req, res) => {
    try {
      const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
      const days = Math.min(30, parseInt(req.query.days as string) || 7);
      const results = await memCached(`beers:trending:${limit}:${days}`, 5 * 60 * 1000, () => storage.getTrendingBeers(limit, days));
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      res.json(results);
    } catch (error) {
      console.error("Error fetching trending beers:", error);
      res.status(500).json({ message: "Failed to fetch trending beers" });
    }
  });

  // Popular beers nearby — ranked by check-in count + favorite count among
  // pubs within `radiusKm` of the supplied (lat, lng). Used by the
  // "Birre più popolari in zona" carousel on /activity.
  app.get("/api/beers/popular-nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radiusKm = Math.min(500, parseFloat(req.query.radiusKm as string) || 10);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
      if (!isFinite(lat) || !isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng query params are required" });
      }

      const cacheKey = `beers:popular-nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}:${limit}`;
      const rows = await memCached(cacheKey, 2 * 60 * 1000, async () => {
        const result = await db.execute(sql`
          WITH nearby_pubs AS (
            SELECT id, name, latitude, longitude,
              (6371 * acos(LEAST(1.0, GREATEST(-1.0,
                cos(radians(${lat})) * cos(radians(latitude::float))
                * cos(radians(longitude::float) - radians(${lng}))
                + sin(radians(${lat})) * sin(radians(latitude::float))
              )))) AS distance
            FROM pubs
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          ),
          nearby_in_range AS (
            SELECT * FROM nearby_pubs WHERE distance <= ${radiusKm}
          ),
          beer_pubs AS (
            SELECT t.beer_id, t.pub_id
            FROM tap_list t
            JOIN nearby_in_range np ON np.id = t.pub_id
            WHERE t.is_active = true
            UNION
            SELECT bl.beer_id, bl.pub_id
            FROM bottle_list bl
            JOIN nearby_in_range np ON np.id = bl.pub_id
            WHERE bl.is_active = true
          ),
          nearest_pub_per_beer AS (
            SELECT DISTINCT ON (bp.beer_id)
              bp.beer_id, bp.pub_id, np.distance, np.name AS pub_name,
              np.latitude AS pub_latitude, np.longitude AS pub_longitude
            FROM beer_pubs bp
            JOIN nearby_in_range np ON np.id = bp.pub_id
            ORDER BY bp.beer_id, np.distance ASC
          ),
          tasting_counts AS (
            SELECT ubt.beer_id, COUNT(*)::int AS tasting_count
            FROM user_beer_tastings ubt
            JOIN nearby_in_range np ON np.id = ubt.pub_id
            WHERE ubt.beer_id IN (SELECT beer_id FROM beer_pubs)
            GROUP BY ubt.beer_id
          ),
          favorite_counts AS (
            SELECT item_id AS beer_id, COUNT(*)::int AS favorite_count
            FROM favorites
            WHERE item_type = 'beer'
              AND item_id IN (SELECT beer_id FROM beer_pubs)
            GROUP BY item_id
          )
          SELECT
            b.id AS beer_id,
            b.name AS beer_name,
            b.style AS beer_style,
            b.abv AS beer_abv,
            b.image_url AS beer_image_url,
            br.id AS brewery_id,
            br.name AS brewery_name,
            br.logo_url AS brewery_logo_url,
            np.pub_id AS pub_id,
            np.pub_name AS pub_name,
            np.pub_latitude AS pub_latitude,
            np.pub_longitude AS pub_longitude,
            np.distance AS distance,
            COALESCE(tc.tasting_count, 0) AS tasting_count,
            COALESCE(fc.favorite_count, 0) AS favorite_count,
            (COALESCE(tc.tasting_count, 0) * 2 + COALESCE(fc.favorite_count, 0)) AS popularity_score
          FROM nearest_pub_per_beer np
          JOIN beers b ON b.id = np.beer_id
          LEFT JOIN breweries br ON br.id = b.brewery_id
          LEFT JOIN tasting_counts tc ON tc.beer_id = b.id
          LEFT JOIN favorite_counts fc ON fc.beer_id = b.id
          WHERE COALESCE(b.is_hidden, false) = false
            AND COALESCE(b.is_discontinued, false) = false
            AND COALESCE(br.is_closed, false) = false
            AND (COALESCE(tc.tasting_count, 0) > 0 OR COALESCE(fc.favorite_count, 0) > 0)
          ORDER BY popularity_score DESC, np.distance ASC, b.name ASC
          LIMIT ${limit}
        `);

        return (result.rows as any[]).map((r: any) => ({
          id: Number(r.beer_id),
          distance: r.distance != null ? Number(r.distance) : null,
          tastingCount: Number(r.tasting_count) || 0,
          favoriteCount: Number(r.favorite_count) || 0,
          popularityScore: Number(r.popularity_score) || 0,
          beer: {
            id: Number(r.beer_id),
            name: r.beer_name,
            style: r.beer_style,
            abv: r.beer_abv,
            imageUrl: r.beer_image_url,
            brewery: r.brewery_id ? {
              id: Number(r.brewery_id),
              name: r.brewery_name,
              logoUrl: r.brewery_logo_url,
            } : null,
          },
          pub: r.pub_id ? {
            id: Number(r.pub_id),
            name: r.pub_name,
            latitude: r.pub_latitude,
            longitude: r.pub_longitude,
          } : null,
        }));
      });

      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(rows);
    } catch (error) {
      console.error("Error fetching popular beers nearby:", error);
      res.status(500).json({ message: "Failed to fetch popular beers nearby" });
    }
  });

  // Similar beers by style
  app.get("/api/beers/:id/similar", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      if (isNaN(beerId)) return res.status(400).json({ message: "Invalid beer id" });
      const beer = await storage.getBeer(beerId);
      if (!beer) return res.status(404).json({ message: "Beer not found" });
      const results = await storage.getSimilarBeers(beerId, beer.style, 6);
      res.json(results);
    } catch (error) {
      console.error("Error fetching similar beers:", error);
      res.status(500).json({ message: "Failed to fetch similar beers" });
    }
  });

  // Log a beer page view (fire-and-forget, no auth required)
  app.post("/api/beers/:id/view", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      if (isNaN(beerId)) return res.status(400).json({ message: "Invalid beer id" });
      const userId = (req.user as any)?.id as string | undefined;
      await storage.logBeerView(beerId, userId);
      res.json({ ok: true });
    } catch (error) {
      // Non-critical: silently ignore analytics errors
      res.json({ ok: false });
    }
  });

  // Browse beers by exact style (case-insensitive), server-side sort + pagination.
  //
  // sort=popular  → tasting_count*2 + favorite_count DESC   (default)
  // sort=top      → avg tasting rating DESC, min 3 votes (fewer votes rank last)
  // sort=newest   → id DESC
  //
  // Index-friendly on 1.19M rows: the `lower(style) = lower($1)` predicate is
  // served by idx_beers_style_lower (functional btree, created at startup), so
  // we only ever aggregate/sort the small per-style subset — never a full-table
  // aggregation. LIMIT+OFFSET paginates that subset. Aggregates (tasting count,
  // favorite count, avg rating) join via idx_tastings_beer_id / favorites, then
  // the ordered page is cached with memCached (key JSON-array serialized).
  app.get("/api/beers/by-style", async (req, res) => {
    try {
      const style = (req.query.style as string)?.trim();
      if (!style) return res.status(400).json({ message: "style param required" });
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 30));
      // Clamp offset ≥ 0 and cap at 5000 so deep-paging can't force huge scans.
      const offset = Math.min(5000, Math.max(0, parseInt(req.query.offset as string) || 0));
      const sortRaw = ((req.query.sort as string) || "popular").trim();
      const sort = (["popular", "top", "newest"].includes(sortRaw) ? sortRaw : "popular") as
        "popular" | "top" | "newest";

      const cacheKey = `beers:by-style:v2:${JSON.stringify([style.toLowerCase(), sort, limit, offset])}`;
      // heavy: this aggregates/sorts a per-style subset of 1.19M beers; many
      // distinct style/sort/offset keys firing at once could otherwise exhaust
      // the pool. The shared semaphore (limit 4) caps concurrent DB work.
      const rows = await memCached(cacheKey, 2 * 60 * 1000, async () => {
        // Shared page-hydration tail: enrich a set of beer ids (the ordered
        // page) with brewery + aggregate columns for display. Aggregates here
        // run over the ~page-sized `page` set only, using idx_tastings_beer_id
        // and idx_favorites_item.
        const hydrate = `
          SELECT
            b.id, b.name, b.style, b.abv, b.ibu,
            b.image_url  AS "imageUrl",
            b.brewery_id AS "breweryId",
            br.name      AS "breweryName",
            br.logo_url  AS "breweryLogoUrl",
            COALESCE(agg.tasting_count, 0)::int AS "tastingCount",
            COALESCE(agg.rating_count, 0)::int  AS "ratingCount",
            CASE WHEN COALESCE(agg.rating_count, 0) > 0
                 THEN ROUND(agg.avg_rating::numeric, 2)::float ELSE NULL END AS "avgRating",
            COALESCE(fav.favorite_count, 0)::int AS "favoriteCount"
          FROM page p
          JOIN beers b ON b.id = p.id
          LEFT JOIN breweries br ON br.id = b.brewery_id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS tasting_count,
                   COUNT(t.rating)::int AS rating_count,
                   AVG(t.rating::numeric) AS avg_rating
            FROM user_beer_tastings t WHERE t.beer_id = p.id
          ) agg ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS favorite_count
            FROM favorites f WHERE f.item_type = 'beer' AND f.item_id = p.id
          ) fav ON true
          ORDER BY p.rn ASC
        `;

        let sqlText: string;
        if (sort === "newest") {
          // Ordering is by id only → pick the page BEFORE any aggregation, so
          // aggregates run on ~30 rows, not the whole style subset.
          sqlText = `
            WITH page AS (
              SELECT b.id, ROW_NUMBER() OVER (ORDER BY b.id DESC) AS rn
              FROM beers b
              LEFT JOIN breweries br ON br.id = b.brewery_id
              WHERE lower(b.style) = lower($1)
                AND COALESCE(b.is_hidden, false) = false
                AND COALESCE(b.is_discontinued, false) = false
                AND COALESCE(br.is_closed, false) = false
              ORDER BY b.id DESC
              LIMIT $2 OFFSET $3
            )
            ${hydrate}
          `;
        } else {
          // popular / top: ordering depends on aggregates, so aggregate the
          // matched subset (bounded per style, driven by idx_beers_style_lower
          // + beer_id indexes), rank, then hydrate the chosen page.
          // `top` requires >=3 votes so a lone 5.0 can't outrank a well-reviewed
          // beer; ties fall back to rating_count then id.
          // Every variant ends with `a.id DESC` — a unique, stable tie-break so
          // same-name/same-score beers keep a fixed order across offset pages
          // (otherwise rows could duplicate or vanish between pages).
          const orderBy =
            sort === "top"
              ? `(CASE WHEN a.rating_count >= 3 THEN 1 ELSE 0 END) DESC,
                 a.avg_rating DESC NULLS LAST, a.rating_count DESC, a.id DESC`
              : `(a.tasting_count * 2 + a.favorite_count) DESC, a.rating_count DESC, a.name ASC, a.id DESC`;
          sqlText = `
            WITH matched AS (
              SELECT b.id, b.name
              FROM beers b
              LEFT JOIN breweries br ON br.id = b.brewery_id
              WHERE lower(b.style) = lower($1)
                AND COALESCE(b.is_hidden, false) = false
                AND COALESCE(b.is_discontinued, false) = false
                AND COALESCE(br.is_closed, false) = false
            ),
            aggregated AS (
              SELECT m.id, m.name,
                COALESCE(t.tasting_count, 0) AS tasting_count,
                COALESCE(t.rating_count, 0) AS rating_count,
                t.avg_rating AS avg_rating,
                COALESCE(f.favorite_count, 0) AS favorite_count
              FROM matched m
              LEFT JOIN (
                SELECT beer_id,
                       COUNT(*)::int AS tasting_count,
                       COUNT(rating)::int AS rating_count,
                       AVG(rating::numeric) AS avg_rating
                FROM user_beer_tastings
                WHERE beer_id IN (SELECT id FROM matched)
                GROUP BY beer_id
              ) t ON t.beer_id = m.id
              LEFT JOIN (
                SELECT item_id, COUNT(*)::int AS favorite_count
                FROM favorites
                WHERE item_type = 'beer' AND item_id IN (SELECT id FROM matched)
                GROUP BY item_id
              ) f ON f.item_id = m.id
            ),
            page AS (
              SELECT a.id, ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS rn
              FROM aggregated a
              ORDER BY ${orderBy}
              LIMIT $2 OFFSET $3
            )
            ${hydrate}
          `;
        }

        const result = await pool.query(sqlText, [style, limit, offset]);
        return result.rows as any[];
      }, { heavy: true });

      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(rows);
    } catch (error) {
      console.error("Error fetching beers by style:", error);
      res.status(500).json({ message: "Failed to fetch beers by style" });
    }
  });

  // Get real search suggestions (popular styles, top breweries, top cities)
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const cached = getCached('suggestions');
      if (cached) return res.json(cached);
      const [topStyles, topBreweries, topCities] = await Promise.all([
        db.select({ name: beers.style, count: sql<number>`COUNT(*)::int` })
          .from(beers)
          .where(and(sql`${beers.style} IS NOT NULL AND ${beers.style} != ''`, beerVisibleSql))
          .groupBy(beers.style)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(12),
        db.select({ name: breweries.name })
          .from(breweries)
          .where(and(sql`${breweries.name} IS NOT NULL AND ${breweries.name} != ''`, breweryActiveSql))
          .orderBy(sql`RANDOM()`)
          .limit(6),
        db.select({ name: pubs.city, count: sql<number>`COUNT(*)::int` })
          .from(pubs)
          .where(sql`${pubs.city} IS NOT NULL AND ${pubs.city} != ''`)
          .groupBy(pubs.city)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(6),
      ]);
      const result = {
        styles: topStyles.map((r) => r.name).filter(Boolean),
        breweries: topBreweries.map((r) => r.name).filter(Boolean),
        cities: topCities.map((r) => r.name).filter(Boolean),
      };
      setCache('suggestions', result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Public beer search — server-side, used by owner beer-proposal dialog
  app.get("/api/beers/search", async (req, res) => {
    try {
      const { q: query = '', limit = '20', offset = '0' } = req.query;
      const queryStr = (query as string).trim();
      const limitNum = Math.min(parseInt(limit as string) || 20, 50);
      const offsetNum = Math.max(0, parseInt(offset as string) || 0);
      if (queryStr.length < 2) return res.json([]);
      if (queryStr.length > 200) return res.status(400).json({ message: "Query troppo lunga" });

      // Shared accent-insensitive search (see server/search-normalize.ts):
      // UNION(exact phrase + most-selective tokens) then a full uncapped AND
      // filter on the small candidate set.
      const n = normalizeBeerSearch(queryStr);
      if (n.meaningful.length === 0) return res.json([]);

      const qp: any[] = [];
      const { candidateCTE, matchFilter, scoreExpr } = buildBeerSearchFragments(n, qp);

      const sqlText = `
        WITH ${candidateCTE}
        SELECT
          b.id, b.name, b.style, b.abv, b.image_url AS "imageUrl",
          b.is_gluten_free AS "isGlutenFree", b.is_alcohol_free AS "isAlcoholFree",
          b.brewery_id AS "breweryId", br.name AS "breweryName", br.logo_url AS "breweryLogo",
          (${scoreExpr}) AS _score
        FROM beers b
        LEFT JOIN breweries br ON b.brewery_id = br.id
        WHERE b.id = ANY(ARRAY(SELECT ci.id FROM candidate_ids ci))
          AND COALESCE(b.is_discontinued, false) = false
          AND COALESCE(br.is_closed, false) = false
          ${matchFilter}
        ORDER BY (${scoreExpr}) DESC, length(b.name) ASC, b.name ASC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const results = await pool.query(sqlText, qp);
      res.json(results.rows);
    } catch (error) {
      console.error("Error searching beers:", error);
      res.status(500).json({ message: "Failed to search beers" });
    }
  });

  // Random beer ("Sorprendimi"). Must be declared BEFORE /api/beers/:id.
  app.get("/api/beers/random", async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT b.id, b.name, b.style, b.abv, b.image_url AS "imageUrl",
               br.name AS "breweryName", br.id AS "breweryId", br.logo_url AS "breweryLogoUrl"
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        WHERE b.image_url IS NOT NULL
          AND COALESCE(b.is_discontinued, false) = false
          AND COALESCE(br.is_closed, false) = false
        ORDER BY RANDOM()
        LIMIT 1
      `);
      const row = ((rows as any).rows ?? rows)[0];
      if (!row) { res.status(404).json({ message: "Nessuna birra disponibile" }); return; }
      res.json(row);
    } catch (err: any) {
      console.error("Random beer error:", err.message);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Get beer details by ID
  app.get("/api/beers/:id", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeerWithBrewery(beerId);
      if (!beer) {
        return res.status(404).json({ message: "Beer not found" });
      }
      res.json(beer);
      // Auto-translate description in background if not Italian
      if (beer.description && !looksItalian(beer.description)) {
        translateToItalian(beer.description).then(async (translated) => {
          if (translated) {
            await db.execute(sql`UPDATE beers SET description = ${translated} WHERE id = ${beerId}`);
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Error fetching beer:", error);
      res.status(500).json({ message: "Failed to fetch beer" });
    }
  });

  // Get where a beer is available (tap and bottle)
  app.get("/api/beers/:id/availability", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const availability = await storage.getBeerAvailability(beerId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching beer availability:", error);
      res.status(500).json({ message: "Failed to fetch beer availability" });
    }
  });

  // Personal check-in history for a beer (authenticated user only)
  app.get("/api/beers/:id/my-checkins", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT
           ubt.id,
           ubt.rating::float                 AS "rating",
           ubt.personal_notes                AS "personalNotes",
           ubt.format,
           ubt.photo_url                     AS "photoUrl",
           ubt.tasted_at                     AS "tastedAt",
           ubt.pub_id                        AS "pubId",
           p.name                            AS "pubName",
           p.slug                            AS "pubSlug",
           p.city                            AS "pubCity"
         FROM user_beer_tastings ubt
         LEFT JOIN pubs p ON p.id = ubt.pub_id
         WHERE ubt.user_id = $1
           AND ubt.beer_id = $2
         ORDER BY ubt.tasted_at DESC`,
        [userId, beerId]
      );
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching user beer check-ins:", error.message);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  // Explore breweries (paginated, filterable by name + country)
  app.get("/api/breweries/explore", async (req, res) => {
    try {
      // Canonicalize (trim) BEFORE both cache-key construction and the storage
      // call, so equivalent requests share a cache entry and " foo " can never
      // poison the entry for "foo". Case-normalizing only the key is safe: all
      // underlying predicates are ILIKE/LOWER (case-insensitive).
      const q = ((req.query.q as string) || "").trim();
      const country = ((req.query.country as string) || "").trim();
      const excludeCountry = ((req.query.excludeCountry as string) || "").trim();
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(60, parseInt(req.query.limit as string) || 48);
      // Cache: the underlying query does a LEFT JOIN + COUNT over ~1.2M beers
      // (~1-2s) — without caching, concurrent visitors on the Esplora
      // birrifici page saturate the pool (max 10) under load.
      // JSON.stringify of an array gives an unambiguous serialization — a
      // plain ':'-joined string would let q="x:y" collide with country="y:z".
      const cacheKey = `breweries:explore:v3:${JSON.stringify([q.toLowerCase(), country.toLowerCase(), excludeCountry.toLowerCase(), page, limit])}`;
      // Per-brewery beer counts are computed once per 10min (a single
      // HashAggregate over ~1.19M beers, ~0.5s) and shared across every
      // filter/page combo, instead of a per-page LEFT JOIN + GROUP BY. Fetched
      // OUTSIDE the explore compute so the explore query never holds a heavy
      // semaphore slot while waiting on this one (which would risk starving the
      // limiter). Both caches are heavy + single-flight, so a cold cache under
      // load still only runs each query once and never exhausts the pool.
      const beerCountMap = await memCached(
        "breweries:beer-counts:v1",
        10 * 60 * 1000,
        () => storage.getBreweryBeerCounts(),
        { heavy: true },
      );
      const result = await memCached(
        cacheKey,
        5 * 60 * 1000,
        () => storage.exploreBreweries(q, country, page, limit, excludeCountry || undefined, beerCountMap),
        { heavy: true },
      );
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(result);
    } catch (error) {
      console.error("Error exploring breweries:", error);
      res.status(500).json({ message: "Failed to explore breweries" });
    }
  });

  // Get all brewery countries with counts
  app.get("/api/breweries/countries", async (req, res) => {
    try {
      const countries = await memCached("breweries:countries:v1", 10 * 60 * 1000, () =>
        storage.getBreweryCountries()
      );
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(countries);
    } catch (error) {
      console.error("Error fetching brewery countries:", error);
      res.status(500).json({ message: "Failed to fetch brewery countries" });
    }
  });

  // Search breweries (public, for registration)
  app.get("/api/breweries/search", async (req, res) => {
    try {
      // Trim BEFORE both cache key and storage call so equivalent requests
      // share one entry and whitespace variants can't poison the cache.
      const query = ((req.query.q as string) || (req.query.query as string) || '').trim();
      if (query.length < 2) return res.json([]);
      // Cached: searchBreweries ranks by a COUNT join over ~1.2M beers.
      const results = await memCached(
        `breweries:search:v2:${JSON.stringify(query.toLowerCase())}`,
        10 * 60 * 1000,
        () => storage.searchBreweries(query)
      );
      res.json(results.slice(0, 10));
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  // Get nearby breweries (must be before /:id to avoid param capture)
  app.get("/api/breweries/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const limit = Math.min(parseInt(req.query.limit as string) || 4, 20);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "lat e lng sono obbligatori" });
      }

      // Haversine formula in PostgreSQL — only consider breweries with valid coordinates
      const result = await db.execute(sql`
        SELECT
          b.id, b.name, b.location, b.region, b.country,
          b.description, b.logo_url AS "logoUrl",
          b.cover_image_url AS "coverImageUrl",
          b.website_url AS "websiteUrl",
          b.latitude, b.longitude,
          COUNT(beer.id)::int AS "beerCount",
          (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(b.latitude::float))
              * cos(radians(b.longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(b.latitude::float))
            )
          )) AS "_distance"
        FROM breweries b
        LEFT JOIN beers beer ON beer.brewery_id = b.id AND COALESCE(beer.is_discontinued, false) = false
        WHERE b.latitude IS NOT NULL
          AND b.longitude IS NOT NULL
          AND b.latitude::text != '0'
          AND b.longitude::text != '0'
          AND b.latitude::text != ''
          AND b.longitude::text != ''
          AND COALESCE(b.is_closed, false) = false
        GROUP BY b.id
        ORDER BY "_distance" ASC
        LIMIT ${limit}
      `);

      res.setHeader('Cache-Control', 'no-store');
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching nearby breweries:", error.message);
      res.status(500).json({ message: "Errore nel recupero dei birrifici vicini" });
    }
  });

  // Get brewery details by ID
  app.get("/api/breweries/:id", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const brewery = await storage.getBrewery(breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Brewery not found" });
      }
      // Check if brewery has a verified owner
      const [ownerRow] = await db.select({ id: users.id }).from(users).where(eq(users.breweryId, breweryId)).limit(1);
      res.json({ ...brewery, hasOwner: !!ownerRow });
    } catch (error) {
      console.error("Error fetching brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  // Get all beers from a brewery (own beers + collaboration beers)
  app.get("/api/breweries/:id/beers", async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const reqUser = req.user;
      const adminView = reqUser?.userType === 'admin' || reqUser?.activeRole === 'admin';

      // Fetch own beers + beers where this brewery is a collaborator
      const beerRows = await db.select({
        id: beers.id,
        name: beers.name,
        style: beers.style,
        abv: beers.abv,
        ibu: beers.ibu,
        color: beers.color,
        description: beers.description,
        imageUrl: beers.imageUrl,
        breweryId: beers.breweryId,
        primaryBreweryName: sql<string>`(SELECT name FROM breweries pb WHERE pb.id = ${beers.breweryId})`,
        primaryBreweryLogoUrl: sql<string | null>`(SELECT logo_url FROM breweries pb WHERE pb.id = ${beers.breweryId})`,
        isGlutenFree: beers.isGlutenFree,
        isAlcoholFree: beers.isAlcoholFree,
        isCollaboration: beers.isCollaboration,
        isHidden: beers.isHidden,
        avgRating: sql<number>`ROUND(AVG(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN ${userBeerTastings.rating} END)::numeric, 2)`,
        reviewCount: sql<number>`COUNT(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN 1 END)`,
        favoriteCount: sql<number>`(SELECT COUNT(*) FROM favorites f WHERE f.item_type = 'beer' AND f.item_id = ${beers.id})`,
        locationCount: sql<number>`(SELECT COUNT(DISTINCT pub_id) FROM (SELECT pub_id FROM tap_list WHERE beer_id = ${beers.id} AND COALESCE(is_active, true) = true UNION SELECT pub_id FROM bottle_list WHERE beer_id = ${beers.id} AND COALESCE(is_active, true) = true) AS combined)::int`,
      })
      .from(beers)
      .leftJoin(userBeerTastings, eq(beers.id, userBeerTastings.beerId))
      .where(sql`(${beers.breweryId} = ${breweryId} OR ${beers.id} IN (SELECT beer_id FROM beer_collaborations WHERE brewery_id = ${breweryId}))${adminView ? sql`` : sql` AND COALESCE(${beers.isHidden}, false) = false AND COALESCE(${beers.isDiscontinued}, false) = false`}`)
      .groupBy(beers.id)
      .orderBy(beers.name);

      // Fetch collaboration info for each beer
      const beerIds = beerRows.map((b) => b.id);
      let collabMap: Record<number, { id: number; name: string; logoUrl: string | null }[]> = {};
      if (beerIds.length > 0) {
        const collabRows = await db.select({
          beerId: beerCollaborations.beerId,
          breweryId: breweries.id,
          breweryName: breweries.name,
          breweryLogo: breweries.logoUrl,
        })
        .from(beerCollaborations)
        .innerJoin(breweries, eq(beerCollaborations.breweryId, breweries.id))
        .where(sql`${beerCollaborations.beerId} = ANY(ARRAY[${sql.join(beerIds.map((id: number) => sql`${id}`), sql`, `)}]::int[])`);

        for (const row of collabRows) {
          if (!collabMap[row.beerId]) collabMap[row.beerId] = [];
          collabMap[row.beerId].push({ id: row.breweryId, name: row.breweryName, logoUrl: row.breweryLogo });
        }
      }

      const result = beerRows.map((b) => {
        const isCollabBeer = b.breweryId !== breweryId;
        // For partner-brewery beers (collab beers not owned by this brewery),
        // show the PRIMARY brewery as the "con:" partner.
        // For own beers, show the collab partner breweries.
        const collaboratingBreweries = isCollabBeer
          ? [{ id: b.breweryId, name: b.primaryBreweryName ?? '', logoUrl: b.primaryBreweryLogoUrl ?? null }]
          : collabMap[b.id] || [];
        return {
          id: b.id,
          name: b.name,
          style: b.style,
          abv: b.abv,
          ibu: b.ibu,
          color: b.color,
          description: b.description,
          imageUrl: b.imageUrl,
          breweryId: b.breweryId,
          isGlutenFree: b.isGlutenFree,
          isAlcoholFree: b.isAlcoholFree,
          isCollaboration: b.isCollaboration,
          avgRating: b.avgRating ? parseFloat(String(b.avgRating)) : null,
          reviewCount: Number(b.reviewCount || 0),
          favoriteCount: Number(b.favoriteCount || 0),
          locationCount: Number(b.locationCount || 0),
          collaboratingBreweries,
          isCollabBeer,
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching brewery beers:", error);
      res.status(500).json({ message: "Failed to fetch brewery beers" });
    }
  });

  // Get collaborations for a specific beer
  app.get("/api/beers/:id/collaborations", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const collabRows = await db.select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        logoUrl: breweries.logoUrl,
      })
      .from(beerCollaborations)
      .innerJoin(breweries, eq(beerCollaborations.breweryId, breweries.id))
      .where(eq(beerCollaborations.beerId, beerId));
      res.json(collabRows);
    } catch (error) {
      console.error("Error fetching beer collaborations:", error);
      res.status(500).json({ message: "Failed to fetch beer collaborations" });
    }
  });

  // Dedicated endpoint to save collaboration breweries for a beer
  app.put("/api/beers/:id/collaborations", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const { breweryIds } = req.body;
      if (!Array.isArray(breweryIds)) {
        return res.status(400).json({ message: "breweryIds must be an array" });
      }
      await db.delete(beerCollaborations).where(eq(beerCollaborations.beerId, beerId));
      const ids = breweryIds.map(Number).filter(n => !isNaN(n));
      for (const brewId of ids) {
        await db.insert(beerCollaborations).values({ beerId, breweryId: brewId }).onConflictDoNothing();
      }
      try {
        await db.execute(sql`UPDATE beers SET is_collaboration = ${ids.length > 0} WHERE id = ${beerId}`);
      } catch { /* column may not exist */ }
      const saved = await db.select({ id: breweries.id, name: breweries.name, logoUrl: breweries.logoUrl })
        .from(beerCollaborations)
        .innerJoin(breweries, eq(beerCollaborations.breweryId, breweries.id))
        .where(eq(beerCollaborations.beerId, beerId));
      res.json(saved);
    } catch (error) {
      console.error("Error saving beer collaborations:", error);
      res.status(500).json({ message: "Failed to save beer collaborations" });
    }
  });

  // Get all beers (public endpoint for browsing catalog)
  app.get("/api/beers", async (req, res) => {
    try {
      const beers = await storage.getBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching all beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  // Get pub by ID
  app.get("/api/pubs/:id", async (req, res) => {
    try {
      const param = req.params.id;
      const numId = parseInt(param);
      let pub;
      if (isNaN(numId)) {
        pub = await storage.getPubBySlug(param);
      } else {
        pub = await storage.getPub(numId);
        if (!pub && param.length > 0) {
          pub = await storage.getPubBySlug(param);
        }
      }
      if (!pub) {
        return res.status(404).json({ message: "Pub not found" });
      }
      res.json(pub);
    } catch (error) {
      console.error("Error fetching pub:", error);
      res.status(500).json({ message: "Failed to fetch pub" });
    }
  });

  // Get tap list for a pub
  app.get("/api/pubs/:id/taplist", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) {
        return res.status(404).json({ message: "Pub not found" });
      }

      // Check if user is the pub owner (authenticated endpoint)
      let isOwner = false;
      try {
        if ((req.user as any)?.id) {
          const userId = (req.user as any).id;
          const userPubs = await storage.getPubsByOwner(userId);
          isOwner = userPubs.some(pub => pub.id === pubId);
        }
      } catch (e) {
        // Not authenticated or other error, treat as public
      }

      // Use appropriate method based on ownership
      const tapList = isOwner 
        ? await storage.getTapListByPubForOwner(pubId)
        : await storage.getTapList(pubId);
      
      res.json(tapList);
    } catch (error) {
      console.error("Error fetching tap list:", error);
      res.status(500).json({ message: "Failed to fetch tap list" });
    }
  });

  app.get("/api/cast-config", (_req, res) => {
    // 6666EC62 = Fermenta receiver custom registrato su Cast Developer Console.
    // Riceve messaggi sul namespace 'urn:x-cast:fermenta.to' e apre la taplist
    // (es. https://fermenta.to/tv/7) sulla TV. Se il receiver è in stato Draft
    // sulla Console solo i device aggiunti come "test device" lo vedranno nella
    // discovery — per produzione va pubblicato.
    const appId = process.env.CAST_APP_ID || 'CC1AD845';
    res.json({ appId });
  });

  app.get("/api/pubs/:id/taplist-image", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      if (isNaN(pubId)) return res.status(400).json({ message: "Invalid pub ID" });

      const pub = await storage.getPub(pubId);
      if (!pub) return res.status(404).json({ message: "Pub not found" });

      const tapList = await storage.getTapList(pubId);
      const activeTaps = tapList.filter((t: any) => t.isActive);

      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const W = 1920;
      const H = 1080;
      const headerH = 80;
      const footerH = 30;
      const padding = 24;
      const gridGap = 16;
      const contentH = H - headerH - footerH - padding * 2;
      const contentW = W - padding * 2;

      const count = activeTaps.length;
      let cols: number, rows: number;
      if (count <= 2) { cols = 2; rows = 1; }
      else if (count <= 4) { cols = 2; rows = 2; }
      else if (count <= 6) { cols = 2; rows = 3; }
      else if (count <= 9) { cols = 3; rows = 3; }
      else { cols = 3; rows = 4; }

      const cardW = (contentW - (cols - 1) * gridGap) / cols;
      const cardH = (contentH - (rows - 1) * gridGap) / rows;

      const pubName = esc(pub.name || 'Pub');
      const now = new Date();
      const timeStr = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
      const dateStr = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });

      let cards = '';
      activeTaps.slice(0, cols * rows).forEach((tap: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = padding + col * (cardW + gridGap);
        const cy = headerH + padding + row * (cardH + gridGap);

        const beerName = esc(tap.beer?.name || tap.customBeerName || tap.beerName || 'Birra');
        const brewery = esc(tap.beer?.brewery?.name || tap.breweryName || '');
        const style = esc(tap.beer?.style || tap.beerStyle || '');
        const abv = (tap.beer?.abv || tap.beerAbv) ? `${tap.beer?.abv || tap.beerAbv}%` : '';
        const tapNum = tap.tapNumber || i + 1;
        const prices = Array.isArray(tap.prices) ? tap.prices : [];

        const nameSize = count <= 4 ? 32 : count <= 6 ? 26 : 22;
        const brewSize = count <= 4 ? 20 : count <= 6 ? 17 : 14;
        const badgeSize = count <= 4 ? 16 : count <= 6 ? 13 : 11;
        const priceSize = count <= 4 ? 28 : count <= 6 ? 22 : 18;
        const priceLabelSize = count <= 4 ? 13 : count <= 6 ? 11 : 9;
        const circleR = count <= 4 ? 50 : count <= 6 ? 38 : 30;

        cards += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="16" fill="rgba(31,41,55,0.7)" stroke="rgba(75,85,99,0.4)" stroke-width="1"/>`;

        cards += `<circle cx="${cx + 20 + circleR}" cy="${cy + cardH/2}" r="${circleR}" fill="rgba(55,65,81,0.6)" stroke="rgba(245,158,11,0.25)" stroke-width="2"/>`;
        cards += `<text x="${cx + 20 + circleR}" y="${cy + cardH/2 + 6}" fill="rgba(245,158,11,0.5)" font-size="${circleR * 0.7}" font-family="sans-serif" text-anchor="middle" font-weight="bold">🍺</text>`;

        const numR = count <= 4 ? 18 : count <= 6 ? 15 : 12;
        cards += `<circle cx="${cx + cardW - 20}" cy="${cy + 20}" r="${numR}" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>`;
        cards += `<text x="${cx + cardW - 20}" y="${cy + 20 + numR * 0.35}" fill="#F59E0B" font-size="${numR}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${tapNum}</text>`;

        const textX = cx + 20 + circleR * 2 + 16;
        const textMaxW = cardW - (20 + circleR * 2 + 16) - 30;
        let textY = cy + cardH * 0.28;

        cards += `<text x="${textX}" y="${textY}" fill="white" font-size="${nameSize}" font-weight="bold" font-family="sans-serif"><tspan textLength="${Math.min(beerName.length * nameSize * 0.55, textMaxW)}" lengthAdjust="spacingAndGlyphs">${beerName}</tspan></text>`;
        textY += nameSize + 4;

        if (brewery) {
          cards += `<text x="${textX}" y="${textY}" fill="rgba(245,158,11,0.8)" font-size="${brewSize}" font-family="sans-serif" font-weight="500">${brewery}</text>`;
          textY += brewSize + 8;
        }

        let badgeX = textX;
        if (style) {
          const stylePadX = 12;
          const styleW = style.length * badgeSize * 0.55 + stylePadX * 2;
          cards += `<rect x="${badgeX}" y="${textY - badgeSize + 2}" width="${styleW}" height="${badgeSize + 8}" rx="${(badgeSize + 8) / 2}" fill="rgba(55,65,81,0.7)" stroke="rgba(75,85,99,0.4)" stroke-width="1"/>`;
          cards += `<text x="${badgeX + stylePadX}" y="${textY + 4}" fill="#D1D5DB" font-size="${badgeSize}" font-family="sans-serif">${style}</text>`;
          badgeX += styleW + 8;
        }
        if (abv) {
          const abvPadX = 10;
          const abvW = abv.length * badgeSize * 0.6 + abvPadX * 2;
          cards += `<rect x="${badgeX}" y="${textY - badgeSize + 2}" width="${abvW}" height="${badgeSize + 8}" rx="${(badgeSize + 8) / 2}" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.25)" stroke-width="1"/>`;
          cards += `<text x="${badgeX + abvPadX}" y="${textY + 4}" fill="#F59E0B" font-size="${badgeSize}" font-family="sans-serif" font-weight="bold">${abv}</text>`;
        }

        if (prices.length > 0) {
          textY += badgeSize + 18;
          let priceX = textX;
          prices.forEach((p: any) => {
            const size = esc(p.size || '');
            const price = `€${parseFloat(p.price || "0").toFixed(1)}`;
            if (size) {
              cards += `<text x="${priceX}" y="${textY - 8}" fill="#9CA3AF" font-size="${priceLabelSize}" font-family="sans-serif" text-transform="uppercase">${size}</text>`;
            }
            cards += `<text x="${priceX}" y="${textY + priceSize * 0.6}" fill="white" font-size="${priceSize}" font-family="sans-serif" font-weight="bold">${price}</text>`;
            priceX += priceSize * 3.5;
          });
        }
      });

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="${headerH}" fill="none"/>
  <line x1="0" y1="${headerH}" x2="${W}" y2="${headerH}" stroke="rgba(31,41,55,0.5)" stroke-width="1"/>

  <circle cx="${padding + 28}" cy="${headerH / 2}" r="24" fill="url(#title)"/>
  <text x="${padding + 28}" y="${headerH / 2 + 7}" fill="white" font-size="22" font-family="sans-serif" text-anchor="middle" font-weight="bold">🍺</text>

  <text x="${padding + 64}" y="${headerH / 2 - 6}" fill="url(#title)" font-size="32" font-weight="bold" font-family="sans-serif">${pubName}</text>
  <text x="${padding + 64}" y="${headerH / 2 + 18}" fill="#6B7280" font-size="14" font-family="sans-serif">${activeTaps.length} birre alla spina</text>

  <text x="${W - padding}" y="${headerH / 2 - 4}" fill="#D1D5DB" font-size="32" font-weight="bold" font-family="sans-serif" text-anchor="end">${timeStr}</text>
  <text x="${W - padding}" y="${headerH / 2 + 18}" fill="#6B7280" font-size="14" font-family="sans-serif" text-anchor="end">${dateStr}</text>

  ${cards}

  <text x="${W / 2}" y="${H - 8}" fill="rgba(75,85,99,0.6)" font-size="12" font-family="sans-serif" text-anchor="middle">fermenta.to</text>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.send(svg);
    } catch (error) {
      console.error("Error generating taplist image:", error);
      res.status(500).json({ message: "Failed to generate taplist image" });
    }
  });

  // Get menu for a pub
  app.get("/api/pubs/:id/menu", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });
      // Public endpoint: include hidden ONLY if requester owns the pub or is admin
      let includeHidden = false;
      try {
        const userId = (req.user as any)?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          const effectiveRole = user?.activeRole || user?.userType;
          if (effectiveRole === 'admin') includeHidden = true;
          else {
            const userPubs = await storage.getPubsByOwner(userId);
            if (userPubs.some((p: any) => p.id === pubId)) includeHidden = true;
          }
        }
      } catch {}
      const menu = await storage.getMenuByPub(pubId, includeHidden);
      res.json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // Full menu endpoint: categories + all items in a single query (eliminates N+1)
  app.get("/api/pubs/:id/menu/full", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });
      // Owner / admin sees hidden items in the dashboard preview;
      // public visitors get only visible categories/items.
      let includeHidden = false;
      try {
        const userId = (req.user as any)?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          const effectiveRole = user?.activeRole || user?.userType;
          if (effectiveRole === 'admin') includeHidden = true;
          else {
            const userPubs = await storage.getPubsByOwner(userId);
            if (userPubs.some((p: any) => p.id === pubId)) includeHidden = true;
          }
        }
      } catch {}
      const menu = await storage.getMenuByPub(pubId, includeHidden);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(menu);
    } catch (error) {
      console.error("Error fetching full menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // Get bottle list (cantina) for a pub
  app.get("/api/pubs/:id/bottles", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });

      // Check if requesting user is the pub owner (same pattern as taplist)
      let isOwner = false;
      try {
        if ((req.user as any)?.id) {
          const userId = (req.user as any).id;
          const userPubs = await storage.getPubsByOwner(userId);
          isOwner = userPubs.some(pub => pub.id === pubId);
        }
      } catch (e) {
        // Not authenticated or other error, treat as public
      }

      const bottles = isOwner
        ? await storage.getBottleListForOwner(pubId)
        : await storage.getBottleList(pubId);

      res.json(bottles);
    } catch (error) {
      console.error("Error fetching bottle list:", error);
      res.status(500).json({ message: "Failed to fetch bottle list" });
    }
  });

  // SSE: real-time pub updates stream
  app.get("/api/pubs/:id/live", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      res.write(`: connected to pub ${pubId}\n\n`);

      const client = addClient(pubId, res);

      const keepalive = setInterval(() => {
        try { res.write(`: ping\n\n`); } catch { clearInterval(keepalive); }
      }, 25000);

      req.on("close", () => {
        clearInterval(keepalive);
        removeClient(client);
      });
    } catch (error) {
      console.error("SSE error:", error);
      res.status(500).end();
    }
  });

  // Get all breweries
  app.get("/api/breweries", async (req, res) => {
    try {
      const random = req.query.random === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      // Always fetch/cache the full sorted list; shuffle in-memory for random requests
      const full = await memCached("breweries:all", 5 * 60 * 1000, () =>
        storage.getBreweriesWithBeerCount(undefined, false)
      );
      let result: any[] = full;
      if (random) {
        // Fisher-Yates partial shuffle — O(limit) not O(n log n)
        const arr = full.slice();
        const n = limit ?? arr.length;
        for (let i = 0; i < n; i++) {
          const j = i + Math.floor(Math.random() * (arr.length - i));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        result = arr.slice(0, n);
      } else if (limit) {
        result = full.slice(0, limit);
      }
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(result);
    } catch (error) {
      console.error("Error fetching breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });

  // Beer routes
  app.get('/api/beers', async (req, res) => {
    try {
      const beers = await storage.getBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  // Search endpoints
  app.get("/api/search", searchRateLimit, async (req, res) => {
    try {
      const query = ((req.query.q as string) || "").trim();
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      if (query.length > 200) {
        return res.status(400).json({ message: "Query troppo lunga" });
      }
      logSearchTerm(query);

      const glutenFree = req.query.glutenFree === 'true';
      const alcoholFree = req.query.alcoholFree === 'true';
      const style = (req.query.style as string) || undefined;
      const city = ((req.query.city as string) || "").trim() || undefined;
      const minAbv = req.query.minAbv ? parseFloat(req.query.minAbv as string) : undefined;
      const maxAbv = req.query.maxAbv ? parseFloat(req.query.maxAbv as string) : undefined;
      const minIbu = req.query.minIbu ? parseFloat(req.query.minIbu as string) : undefined;
      const maxIbu = req.query.maxIbu ? parseFloat(req.query.maxIbu as string) : undefined;

      const type = ((req.query.type as string) || "all").trim();
      const cacheKey = buildSearchCacheKey(query, { glutenFree, alcoholFree, style, minAbv, maxAbv, minIbu, maxIbu, city }, type);
      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      const filters: any = {};
      if (glutenFree) filters.glutenFree = true;
      if (alcoholFree) filters.alcoholFree = true;
      if (style) filters.style = style;
      if (city) filters.city = city;
      if (minAbv !== undefined) filters.minAbv = minAbv;
      if (maxAbv !== undefined) filters.maxAbv = maxAbv;
      if (minIbu !== undefined) filters.minIbu = minIbu;
      if (maxIbu !== undefined) filters.maxIbu = maxIbu;

      const result = await performGlobalSearch(query, filters, type);
      setCache(cacheKey, result);
      res.setHeader('X-Cache', 'MISS');
      res.json(result);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Database statistics endpoint
  // GET /api/geocode?q=...&country=IT
  // Geocoding proxy: usa Google Places Text Search se VITE_GOOGLE_MAPS_API_KEY è impostata,
  // altrimenti Photon + Nominatim in parallelo come fallback gratuito.
  app.get("/api/geocode", async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      if (q.length < 2) return res.json({ features: [] });
      const country = String(req.query.country ?? "").toUpperCase();

      const googleKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

      // ── Google Places Text Search (se disponibile) ───────────────────────────
      if (googleKey) {
        try {
          const gParams = new URLSearchParams({
            query: q,
            key: googleKey,
            language: "it",
            region: country.toLowerCase() || "it",
            fields: "formatted_address,geometry,name,address_components",
          });
          const gRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${gParams}`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (gRes.ok) {
            const gData: any = await gRes.json();
            if (gData.status === "OK" && gData.results?.length) {
              // Converte il formato Google in GeoJSON Photon-like per compatibilità col frontend
              const features = (gData.results as any[]).slice(0, 7).map((r: any) => {
                const comps: any[] = r.address_components ?? [];
                const get = (...types: string[]) =>
                  comps.find((c: any) => types.some(t => c.types.includes(t)))?.long_name ?? "";
                return {
                  geometry: { coordinates: [r.geometry.location.lng, r.geometry.location.lat] },
                  properties: {
                    name: r.name,
                    city: get("locality", "administrative_area_level_3"),
                    state: get("administrative_area_level_1"),
                    postcode: get("postal_code"),
                    street: get("route"),
                    housenumber: get("street_number"),
                    country: get("country"),
                    country_code: comps.find((c: any) => c.types.includes("country"))?.short_name ?? "",
                    osm_id: 0,
                    _formatted: r.formatted_address,
                  },
                };
              });
              return res.json({ features, source: "google" });
            }
          }
        } catch { /* fallthrough to Photon */ }
      }

      // ── Photon + Nominatim in parallelo (fallback gratuito) ──────────────────
      const photonParams = new URLSearchParams({ q, limit: "6", lang: "it" });
      if (country === "IT") {
        photonParams.set("lat", "42.5");
        photonParams.set("lon", "12.5");
        photonParams.set("location_bias_scale", "0.5");
      }

      const nominatimParams = new URLSearchParams({
        q, format: "json", addressdetails: "1", limit: "6", "accept-language": "it",
      });
      if (country) nominatimParams.set("countrycodes", country.toLowerCase());

      const [photonData, nominatimData] = await Promise.allSettled([
        fetch(`https://photon.komoot.io/api/?${photonParams}`, {
          headers: { "User-Agent": "Fermentato/1.0 (fermenta.to)" },
          signal: AbortSignal.timeout(6000),
        }).then(r => r.ok ? r.json() : { features: [] }),
        fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams}`, {
          headers: { "User-Agent": "Fermentato/1.0 (fermenta.to)" },
          signal: AbortSignal.timeout(6000),
        }).then(r => r.ok ? r.json() : []),
      ]);

      const photonFeatures: any[] = photonData.status === "fulfilled"
        ? (photonData.value?.features ?? []) : [];

      // Converte Nominatim in formato Photon-like
      const nominatimRaw: any[] = nominatimData.status === "fulfilled"
        ? (Array.isArray(nominatimData.value) ? nominatimData.value : []) : [];
      const nominatimFeatures = nominatimRaw.map((r: any) => ({
        geometry: { coordinates: [parseFloat(r.lon), parseFloat(r.lat)] },
        properties: {
          name: r.name || r.display_name?.split(",")[0] || "",
          city: r.address?.city ?? r.address?.town ?? r.address?.village ?? "",
          state: r.address?.state ?? "",
          postcode: r.address?.postcode ?? "",
          street: r.address?.road ?? "",
          housenumber: r.address?.house_number ?? "",
          country: r.address?.country ?? "",
          country_code: r.address?.country_code?.toUpperCase() ?? "",
          osm_id: r.place_id ?? 0,
        },
      }));

      // Unisce i risultati, deduplicando per coordinate approssimate
      const seen = new Set<string>();
      const merged = [...photonFeatures, ...nominatimFeatures].filter((f: any) => {
        if (!country) return true;
        const cc = f.properties?.country_code?.toUpperCase();
        if (cc && cc !== country) return false;
        const [lng, lat] = f.geometry?.coordinates ?? [0, 0];
        const key = `${Math.round(lat * 100)},${Math.round(lng * 100)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 7);

      res.json({ features: merged, source: "osm" });
    } catch {
      res.json({ features: [] });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await memCached("stats:global:v2", 5 * 60 * 1000, async () => {
        const [pubCount, breweryCount, beerCount, reviewCount, pubEventCount, breweryEventCount, userCount, styleCount] = await Promise.all([
          db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries).where(breweryActiveSql),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(beers).where(beerVisibleSql),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(pubEvents),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(breweryEvents),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
          db.select({ count: sql<number>`COUNT(DISTINCT style)::int` }).from(beers).where(beerVisibleSql),
        ]);
        return {
          totalPubs: pubCount[0]?.count || 0,
          totalBreweries: breweryCount[0]?.count || 0,
          totalBeers: beerCount[0]?.count || 0,
          totalReviews: reviewCount[0]?.count || 0,
          totalEvents: (pubEventCount[0]?.count || 0) + (breweryEventCount[0]?.count || 0),
          totalUsers: userCount[0]?.count || 0,
          uniqueStyles: styleCount[0]?.count || 0,
          averageBeersPerBrewery: breweryCount[0]?.count > 0 ? Math.round((beerCount[0]?.count || 0) / breweryCount[0].count) : 0,
          lastUpdated: new Date().toISOString()
        };
      });
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching database stats:", error);
      res.status(500).json({ message: "Failed to fetch database statistics" });
    }
  });

  // Protected routes - authentication required

  // Admin route for global beer scraping
  app.post("/api/admin/scrape-beers", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Import the scraping function dynamically
      try {
        const scraper = await import("./global-beer-scraper");
        const scrapingFunc = (scraper as any).globalBeerScraping || (scraper as any).default;
        
        // Run scraping in background
        if (scrapingFunc) {
          scrapingFunc()
            .then(() => console.log("✅ Global beer scraping completed"))
            .catch((err: any) => console.error("❌ Scraping error:", err));
        }
      } catch (err) {
        console.log("Scraper not available");
      }

      res.json({ 
        message: "Global beer scraping started in background",
        status: "processing"
      });
    } catch (error) {
      console.error("Error starting scraping:", error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  // Admin route for unifying duplicate breweries
  app.post("/api/admin/unify-breweries", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Import the unification function dynamically
      const { unifyBreweries } = await import("./unify-breweries");
      
      // Run unification in background
      unifyBreweries()
        .then(() => console.log("✅ Brewery unification completed"))
        .catch((err: any) => console.error("❌ Unification error:", err));

      res.json({ 
        message: "Brewery unification started in background",
        status: "processing"
      });
    } catch (error) {
      console.error("Error starting unification:", error);
      res.status(500).json({ message: "Failed to start unification" });
    }
  });

  // Helper: generate a unique slug for a pub. Uses userSlug if provided, else derives from name.
  async function generatePubSlug(name: string, id: number, userSlug?: string): Promise<string> {
    const base = userSlug?.trim()
      ? userSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100)
      : name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
    let slug = base;
    let counter = 2;
    while (true) {
      const { rows } = await pool.query(`SELECT id FROM pubs WHERE slug = $1 AND id != $2 LIMIT 1`, [slug, id]);
      if (rows.length === 0) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }

  // Register a new pub (one per user)
  app.post("/api/pubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Check if user already has a pub
      const existingPubs = await storage.getPubsByOwner(userId);
      if (existingPubs.length > 0) {
        return res.status(400).json({ message: "Un utente può registrare solo un pub" });
      }
      
      const pubData = pubRegistrationSchema.parse({ ...req.body, ownerId: userId });
      const pub = await storage.createPub(pubData);

      // Generate and assign unique slug immediately after creation
      const slug = await generatePubSlug(pub.name, pub.id, pubData.slug || undefined);
      await pool.query(`UPDATE pubs SET slug = $1 WHERE id = $2`, [slug, pub.id]);
      pub.slug = slug;
      
      // Update user type to pub_owner
      await storage.updateUserType(userId, 'pub_owner');
      
      res.status(201).json(pub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating pub:", error);
      res.status(500).json({ message: "Failed to create pub" });
    }
  });

  // Cancel trial for current user's pub
  app.post("/api/my-pub/cancel-trial", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const [pub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (!pub) return res.status(404).json({ message: "Nessun pub trovato" });
      if (pub.subscriptionStatus !== 'trial') {
        return res.status(400).json({ message: "Il pub non è in prova" });
      }
      // Also cancel on Stripe (subscription in trialing state)
      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const userEmail = (req.user as any).email;
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const trialingSubs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'trialing', limit: 1 });
          for (const sub of trialingSubs.data) await stripe.subscriptions.cancel(sub.id);
        }
      } catch (stripeErr: any) { console.warn("Stripe trial cancel warning:", stripeErr.message); }

      await db.update(pubs).set({
        subscriptionStatus: 'cancelled',
        trialEndsAt: null,
        isVerified: false,
        isActive: false,
      }).where(eq(pubs.id, pub.id));
      res.json({ message: "Prova annullata. Il pub è stato ibernato." });
    } catch (error) {
      console.error("Error cancelling trial:", error);
      res.status(500).json({ message: "Errore durante l'annullamento" });
    }
  });

  // Cancel active paid subscription → hibernate pub
  app.post("/api/my-pub/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const userEmail = (req.user as any).email;
      const [pub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (!pub) return res.status(404).json({ message: "Nessun pub trovato" });

      // Cancel on Stripe — look up by customer email
      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const cid = customers.data[0].id;
          for (const status of ['active', 'trialing'] as const) {
            const subs = await stripe.subscriptions.list({ customer: cid, status, limit: 5 });
            for (const sub of subs.data) await stripe.subscriptions.cancel(sub.id);
          }
        }
      } catch (stripeErr: any) { console.warn("Stripe subscription cancel warning:", stripeErr.message); }

      await db.update(pubs).set({
        subscriptionStatus: 'cancelled',
        trialEndsAt: null,
        isVerified: false,
        isActive: false,
      }).where(eq(pubs.id, pub.id));
      res.json({ message: "Abbonamento disdetto. Il pub è stato ibernato." });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Errore durante la disdetta" });
    }
  });

  // Get pubs owned by current user  
  app.get("/api/my-pub/pending-request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const [req_] = await db.select({
        status: publicanRequests.status,
        pubName: publicanRequests.pubName,
      }).from(publicanRequests).where(eq(publicanRequests.userId, userId));
      res.json(req_ ?? null);
    } catch (error) {
      res.json(null);
    }
  });

  app.get("/api/my-pubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubs = await storage.getPubsByOwner(userId);
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching user pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });


  // Reorder tap list (drag-and-drop)
  app.post('/api/pubs/:id/taplist/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) return res.status(403).json({ message: "Not authorized" });
      const { order } = req.body; // [{ id, tapNumber }]
      if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array" });
      await Promise.all(
        order.map(({ id, tapNumber }: { id: number; tapNumber: number }) =>
          storage.updateTapListItem(id, { tapNumber })
        )
      );
      broadcastPubUpdate(pubId, "taplist");
      _memCache.delete(`stats-extended:${pubId}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error reordering taplist:', error);
      res.status(500).json({ message: "Failed to reorder tap list" });
    }
  });

  // Update tap list item (pub owner only)
  app.patch('/api/pubs/:pubId/taplist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { pubId, id } = req.params;
      const data = req.body;

      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const canEdit = await isAdminOrPubOwner(userId, parseInt(pubId));
      if (!canEdit) return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      
      const existingItems = await storage.getTapListByPubForOwner(parseInt(pubId));
      const existingItem = existingItems.find((t: any) => t.id === parseInt(id));
      const oldBeerId = existingItem?.beerId;
      
      const item = await storage.updateTapListItem(parseInt(id), data);

      if (data.beerId && oldBeerId && data.beerId !== oldBeerId) {
        const newBeer = await storage.getBeer(data.beerId);
        if (newBeer) {
          notifyTapListChange(parseInt(pubId), 'tap_change', newBeer.name, newBeer.id);
          // Use POST-update active state: explicit data.isActive wins; otherwise carry forward existing
          const tapPostActive = data.isActive !== undefined
            ? data.isActive === true
            : existingItem?.isActive !== false;
          if (tapPostActive) {
            storage.getPub(parseInt(pubId)).then((pub) => {
              if (pub) notifyWishlistBeerAvailable(parseInt(pubId), data.beerId, newBeer.name, pub, new Set(), 'tap');
            }).catch(() => {});
          }
        }
        // Auto-log the beer change
        try {
          const oldBeer = await storage.getBeer(oldBeerId);
          const durationMs = existingItem?.addedAt ? Date.now() - new Date(existingItem.addedAt).getTime() : null;
          const durationMinutes = durationMs ? Math.round(durationMs / 60000) : null;
          await pool.query(
            `INSERT INTO tap_change_logs (pub_id, tap_number, tap_type, old_beer_id, old_beer_name, new_beer_id, new_beer_name, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [parseInt(pubId), existingItem?.tapNumber ?? null, existingItem?.tapType ?? null, oldBeerId, oldBeer?.name ?? null, data.beerId, newBeer?.name ?? null, durationMinutes]
          );
        } catch (logErr) {
          console.warn('[tap-change-log] auto-log failed:', logErr);
        }
      }

      // Detect inactive → active transition: notify wishlist users for the beer that just became available
      const wasInactive = existingItem?.isActive === false;
      const nowActive = data.isActive === true;
      if (wasInactive && nowActive && item) {
        const activatedBeerId = (item as any).beerId ?? existingItem?.beerId;
        if (activatedBeerId) {
          const activatedBeer = await storage.getBeer(activatedBeerId);
          const pub = await storage.getPub(parseInt(pubId));
          if (activatedBeer && pub) {
            notifyWishlistBeerAvailable(parseInt(pubId), activatedBeerId, activatedBeer.name, pub, new Set(), 'tap');
          }
        }
      }

      broadcastPubUpdate(parseInt(pubId), "taplist");
      _memCache.delete("home:taplist-activity");
      _memCache.delete(`stats-extended:${parseInt(pubId)}`);
      res.json(item);
    } catch (error) {
      console.error('Error updating tap list item:', error);
      res.status(500).json({ message: 'Failed to update tap list item' });
    }
  });

  // Delete tap list item (pub owner only)
  app.delete('/api/pubs/:pubId/taplist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { pubId, id } = req.params;

      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const canEdit = await isAdminOrPubOwner(userId, parseInt(pubId));
      if (!canEdit) return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      
      const tapItems = await storage.getTapListByPubForOwner(parseInt(pubId));
      const removedItem = tapItems.find((t: any) => t.id === parseInt(id));

      // Auto-log the keg removal before deleting
      if (removedItem) {
        try {
          const beerName = (removedItem as any).beer?.name || (removedItem as any).beerName || null;
          const durationMs = removedItem.addedAt ? Date.now() - new Date(removedItem.addedAt).getTime() : null;
          const durationMinutes = durationMs ? Math.round(durationMs / 60000) : null;
          await pool.query(
            `INSERT INTO tap_change_logs (pub_id, tap_number, tap_type, old_beer_id, old_beer_name, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6)`,
            [parseInt(pubId), removedItem.tapNumber ?? null, removedItem.tapType ?? null, removedItem.beerId ?? null, beerName, durationMinutes]
          );
        } catch (logErr) {
          console.warn('[tap-change-log] auto-log failed:', logErr);
        }
      }

      await storage.removeFromTapList(parseInt(id));

      broadcastPubUpdate(parseInt(pubId), "taplist");
      _memCache.delete("home:taplist-activity");
      _memCache.delete(`stats-extended:${parseInt(pubId)}`);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting tap list item:', error);
      res.status(500).json({ message: 'Failed to delete tap list item' });
    }
  });

  // Update pub (owner or admin)
  app.patch("/api/pubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub or is admin
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to update this pub" });
      }

      // Only include logoUrl/coverImageUrl if explicitly provided in the request body
      // (undefined means "not sent" = don't touch; empty string means "remove")
      const updateData: any = { ...req.body };
      if ('logoUrl' in req.body) updateData.logoUrl = req.body.logoUrl || null;
      if ('coverImageUrl' in req.body) updateData.coverImageUrl = req.body.coverImageUrl || null;
      
      const pubData = insertPubSchema.partial().parse(updateData);
      const updatedPub = await storage.updatePub(pubId, pubData);
      res.json(updatedPub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error updating pub:", error);
      res.status(500).json({ message: "Failed to update pub" });
    }
  });

  // Add beer to tap (pub owner or admin)
  app.post("/api/pubs/:id/taplist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub or is admin
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      }

      const tapData = insertTapListSchema.parse({ ...req.body, pubId });
      const tapItem = await storage.addToTapList(tapData);

      const beer = await storage.getBeer(tapData.beerId);
      if (beer) {
        // Only notify if the added item is actually active
        if (tapItem.isActive !== false) {
          notifyTapListChange(pubId, 'new_beer', beer.name, beer.id);
          // Wishlist notifications dispatched separately (empty set — independent of tapChanges prefs)
          storage.getPub(pubId).then((pub) => {
            if (pub) notifyWishlistBeerAvailable(pubId, beer.id, beer.name, pub, new Set(), 'tap');
          }).catch(() => {});
        }
      }

      broadcastPubUpdate(pubId, "taplist");
      _memCache.delete("home:taplist-activity");
      _memCache.delete(`stats-extended:${pubId}`);
      res.status(201).json(tapItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error adding beer to tap:", error);
      res.status(500).json({ message: "Failed to add beer to tap" });
    }
  });

  // Update tap item (pub owner only)
  app.patch("/api/taplist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tapId = parseInt(req.params.id);
      const tapData = insertTapListSchema.partial().parse(req.body);
      const updatedTap = await storage.updateTapListItem(tapId, tapData);
      // Bust the per-pub stats cache so the owner dashboard reflects the change immediately
      if ((updatedTap as any)?.pubId) {
        _memCache.delete(`stats-extended:${(updatedTap as any).pubId}`);
      }
      res.json(updatedTap);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error updating tap item:", error);
      res.status(500).json({ message: "Failed to update tap item" });
    }
  });

  // Remove beer from tap (pub owner only) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by DELETE /api/pubs/:pubId/taplist/:id

  // Add beer to bottle list (pub owner or admin)
  app.post("/api/pubs/:pubId/bottles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's bottle list" });
      }

      // Map component fields to database fields
      const { price, size, vintage, ...otherData } = req.body;
      const bottleData = insertBottleListSchema.parse({ 
        ...otherData, 
        pubId,
        priceBottle: price,    // Map price -> priceBottle 
        bottleSize: size || "33cl",  // Map size -> bottleSize
        description: vintage ? `${otherData.description || ""}\nAnnata: ${vintage}`.trim() : otherData.description
      });
      
      const bottleItem = await storage.addBeerToBottles(bottleData);
      broadcastPubUpdate(pubId, "bottles");
      // Notify wishlist users about new bottle availability (only if item is active)
      if (bottleData.beerId && bottleItem.isActive !== false) {
        const pub = await storage.getPub(pubId);
        const beer = await storage.getBeer(bottleData.beerId);
        if (pub && beer) {
          notifyWishlistBeerAvailable(pubId, bottleData.beerId, beer.name, pub, new Set(), 'bottle');
        }
      }
      res.status(201).json(bottleItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error adding beer to bottle list:", error);
      res.status(500).json({ message: "Failed to add beer to bottle list" });
    }
  });

  // Update bottle item (only pub owner) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by PATCH /api/pubs/:pubId/bottles/:id
  
  // Remove beer from bottle list (only pub owner) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by DELETE /api/pubs/:pubId/bottles/:id

  // Update bottle list item (pub owner or admin)
  app.patch('/api/pubs/:pubId/bottles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { pubId, id } = req.params;
      const userId = (req.user as any)?.id;
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(parseInt(pubId));
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's bottle list" });
      }
      
      // Map component fields to database fields
      const { price, size, vintage, ...otherData } = req.body;
      
      const updateData: any = { ...otherData };
      
      // Map fields if they exist in the request
      if (price !== undefined) updateData.priceBottle = price;
      if (size !== undefined) updateData.bottleSize = size;
      if (vintage !== undefined) {
        // Handle vintage in description
        const currentDescription = otherData.description || "";
        updateData.description = vintage ? `${currentDescription}\nAnnata: ${vintage}`.trim() : currentDescription;
      }
      
      // Fetch existing item before update to detect inactive → active transition
      const existingBottleItem = await pool.query(
        `SELECT is_active, beer_id FROM bottle_list WHERE id = $1`, [parseInt(id)]
      ).then((r: any) => r.rows[0]).catch(() => null);

      const item = await storage.updateBottleItem(parseInt(id), updateData);

      // Determine post-update active state (updateData.isActive if set, else carry forward existing)
      const postUpdateIsActive = updateData.isActive !== undefined
        ? updateData.isActive === true
        : existingBottleItem?.is_active !== false;

      // Detect inactive → active transition: notify wishlist users for current beer
      const bottleWasInactive = existingBottleItem?.is_active === false;
      if (bottleWasInactive && postUpdateIsActive && item) {
        const activatedBeerId = (item as any).beerId ?? existingBottleItem?.beer_id;
        if (activatedBeerId) {
          const activatedBeer = await storage.getBeer(activatedBeerId);
          const pub = await storage.getPub(parseInt(pubId));
          if (activatedBeer && pub) {
            notifyWishlistBeerAvailable(parseInt(pubId), activatedBeerId, activatedBeer.name, pub, new Set(), 'bottle');
          }
        }
      }

      // Detect beer replacement on an already-active slot: notify wishlist for the new beer
      const oldBeerId = existingBottleItem?.beer_id;
      const newBeerId = updateData.beerId;
      const beerChanged = newBeerId && oldBeerId && newBeerId !== oldBeerId;
      if (beerChanged && !bottleWasInactive && postUpdateIsActive) {
        const newBeer = await storage.getBeer(newBeerId);
        const pub = await storage.getPub(parseInt(pubId));
        if (newBeer && pub) {
          notifyWishlistBeerAvailable(parseInt(pubId), newBeerId, newBeer.name, pub, new Set(), 'bottle');
        }
      }

      broadcastPubUpdate(parseInt(pubId), "bottles");
      res.json(item);
    } catch (error) {
      console.error('Error updating bottle item:', error);
      res.status(500).json({ message: 'Failed to update bottle item' });
    }
  });

  // Delete bottle list item (pub owner only)
  app.delete('/api/pubs/:pubId/bottles/:id', isAuthenticated, async (req, res) => {
    try {
      const { pubId, id } = req.params;
      
      await storage.removeBottleItem(parseInt(String(id)));
      broadcastPubUpdate(parseInt(String(pubId)), "bottles");
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting bottle item:', error);
      res.status(500).json({ message: 'Failed to delete bottle item' });
    }
  });

  // Reorder bottle list items
  app.post('/api/pubs/:pubId/bottles/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const pubId = parseInt(req.params.pubId);
      const userPubs = await storage.getPubsByOwner(userId);
      const userRoles = req.user?.roles ?? [];
      if (!userRoles.includes('admin') && !userPubs.some((p: any) => p.id === pubId)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { order } = req.body as { order: { id: number; orderIndex: number }[] };
      if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array" });
      await storage.reorderBottleItems(order);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error reordering bottle items:', error);
      res.status(500).json({ message: 'Failed to reorder bottle items' });
    }
  });

  // ── Drink items routes ─────────────────────────────────────────────────────
  app.get("/api/pubs/:id/drinks", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });
      const items = await storage.getDrinkItems(pubId, false);
      res.json(items);
    } catch (error) {
      console.error("Error fetching public drink items:", error);
      res.status(500).json({ message: "Failed to fetch drink items" });
    }
  });

  app.get("/api/pubs/:id/drinks/all", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!existingPub || (effectiveRole !== 'admin' && existingPub.ownerId !== userId))
        return res.status(403).json({ message: "Not authorized" });
      const items = await storage.getDrinkItems(pubId, true);
      res.json(items);
    } catch (error) {
      console.error("Error fetching drink items:", error);
      res.status(500).json({ message: "Failed to fetch drink items" });
    }
  });

  app.post("/api/pubs/:id/drinks", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!existingPub || (effectiveRole !== 'admin' && existingPub.ownerId !== userId))
        return res.status(403).json({ message: "Not authorized to modify this pub's drinks" });
      const item = await storage.createDrinkItem({ ...req.body, pubId });
      broadcastPubUpdate(pubId, "drinks");
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating drink item:", error);
      res.status(500).json({ message: "Failed to create drink item" });
    }
  });

  app.patch("/api/pubs/:pubId/drinks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.pubId);
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!existingPub || (effectiveRole !== 'admin' && existingPub.ownerId !== userId))
        return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.updateDrinkItem(parseInt(req.params.id), req.body);
      broadcastPubUpdate(pubId, "drinks");
      res.json(updated);
    } catch (error) {
      console.error("Error updating drink item:", error);
      res.status(500).json({ message: "Failed to update drink item" });
    }
  });

  app.delete("/api/pubs/:pubId/drinks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.pubId);
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!existingPub || (effectiveRole !== 'admin' && existingPub.ownerId !== userId))
        return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDrinkItem(parseInt(req.params.id));
      broadcastPubUpdate(pubId, "drinks");
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting drink item:", error);
      res.status(500).json({ message: "Failed to delete drink item" });
    }
  });
  // ── /Drink items routes ────────────────────────────────────────────────────

  // ── Drink categories routes ───────────────────────────────────────────────
  const drinkAuthMiddleware = async (req: any, res: any): Promise<{ pubId: number } | null> => {
    const pubId = parseInt(req.params.pubId || req.params.id);
    const userId = (req.user as any)?.id;
    if (!userId) { res.status(401).json({ message: "Not authenticated" }); return null; }
    const user = await storage.getUser(userId);
    const pub = await storage.getPub(pubId);
    const role = user?.activeRole || user?.userType;
    if (!pub || (role !== "admin" && pub.ownerId !== userId)) {
      res.status(403).json({ message: "Not authorized" }); return null;
    }
    return { pubId };
  };

  // Public: visible categories with visible items
  app.get("/api/pubs/:id/drink-categories", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.id);
      if (!pubId) return res.status(404).json({ message: "Pub not found" });
      const cats = await storage.getDrinkCategoriesWithItems(pubId, false);
      res.json(cats);
    } catch (e: any) {
      console.error("Error fetching public drink categories:", e?.message ?? e);
      res.status(500).json({ message: "Failed to fetch drink categories" });
    }
  });

  // Owner: all categories including hidden
  app.get("/api/pubs/:id/drink-categories/all", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      const cats = await storage.getDrinkCategoriesWithItems(ctx.pubId, true);
      res.json(cats);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch drink categories" });
    }
  });

  app.post("/api/pubs/:id/drink-categories", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      const cats = await storage.getDrinkCategoriesWithItems(ctx.pubId, true);
      const cat = await storage.createDrinkCategory({ ...req.body, pubId: ctx.pubId, orderIndex: cats.length });
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.status(201).json(cat);
    } catch (e) {
      res.status(500).json({ message: "Failed to create drink category" });
    }
  });

  app.patch("/api/pubs/:pubId/drink-categories/:catId", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      const cat = await storage.updateDrinkCategory(parseInt(req.params.catId), req.body);
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json(cat);
    } catch (e) {
      res.status(500).json({ message: "Failed to update drink category" });
    }
  });

  app.patch("/api/pubs/:pubId/drink-categories/:catId/toggle-visibility", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      const cats = await storage.getDrinkCategoriesWithItems(ctx.pubId, true);
      const cat = cats.find((c: any) => c.id === parseInt(req.params.catId));
      if (!cat) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateDrinkCategory(cat.id, { isVisible: !cat.isVisible });
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });

  app.delete("/api/pubs/:pubId/drink-categories/:catId", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      await storage.deleteDrinkCategory(parseInt(req.params.catId));
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete drink category" });
    }
  });

  app.post("/api/pubs/:id/drink-categories/reorder", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      await storage.reorderDrinkCategories(req.body.order);
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to reorder" });
    }
  });

  app.post("/api/pubs/:pubId/drink-categories/:catId/items/reorder", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      await storage.reorderDrinkItems(req.body.order);
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to reorder items" });
    }
  });

  app.patch("/api/pubs/:pubId/drink-items/:id/toggle-visibility", isAuthenticated, async (req: any, res) => {
    const ctx = await drinkAuthMiddleware(req, res);
    if (!ctx) return;
    try {
      const item = await storage.updateDrinkItem(parseInt(req.params.id), {});
      // Re-fetch to get current state
      const allItems = await storage.getDrinkItems(ctx.pubId, true);
      const current = allItems.find((i: any) => i.id === parseInt(req.params.id));
      if (!current) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateDrinkItem(current.id, { isVisible: !current.isVisible });
      broadcastPubUpdate(ctx.pubId, "drinks");
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to toggle item visibility" });
    }
  });
  // ── /Drink categories routes ───────────────────────────────────────────────

  // Create menu category (only pub owner)
  app.post("/api/pubs/:id/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      const categoryData = insertMenuCategorySchema.parse({ ...req.body, pubId });
      const category = await storage.createMenuCategory(categoryData);
      broadcastPubUpdate(pubId, "menu");
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating menu category:", error);
      res.status(500).json({ message: "Failed to create menu category" });
    }
  });

  // Update menu category (only pub owner)
  app.patch("/api/pubs/:pubId/menu-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const categoryId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Verify the category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu category does not belong to your pub" });
      }

      const allowedCatFields = ['name', 'description', 'infoBox', 'isVisible', 'orderIndex'];
      const updates: Record<string, any> = {};
      for (const field of allowedCatFields) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }
      const updatedCategory = await storage.updateMenuCategory(categoryId, updates);
      broadcastPubUpdate(pubId, "menu");
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating menu category:", error);
      res.status(500).json({ message: "Failed to update menu category" });
    }
  });

  // Delete menu category (only pub owner)
  app.delete("/api/pubs/:pubId/menu-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const categoryId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Verify the category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu category does not belong to your pub" });
      }

      await storage.deleteMenuCategory(categoryId);
      broadcastPubUpdate(pubId, "menu");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu category:", error);
      res.status(500).json({ message: "Failed to delete menu category" });
    }
  });

  // Get menu items for a category (public)
  app.get("/api/pubs/:pubId/menu/categories/:categoryId/items", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const items = await storage.getMenuItems(categoryId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Create menu item (pub owner or admin) - Updated to match frontend expectations and add pub ownership validation
  app.post("/api/pubs/:id/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Validate that the category belongs to the pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === req.body.categoryId);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category does not belong to this pub" });
      }

      // Normalizza il payload: garantisce price come stringa decimale e tipi corretti.
      const rawPrice = req.body?.price;
      const normalizedPrice =
        rawPrice === undefined || rawPrice === null || rawPrice === ''
          ? rawPrice
          : String(rawPrice).trim().replace(',', '.');
      // Whitelist esplicita: solo i campi che lo schema consente. Zod 4 con
      // schemi creati da drizzle-zod è strict per default, quindi qualsiasi
      // chiave extra (id, createdAt, ecc.) farebbe fallire la parse().
      const b = req.body || {};
      const normalizedBody: any = {
        categoryId: Number(b.categoryId),
        name: typeof b.name === 'string' ? b.name : '',
        description: b.description ?? null,
        price: normalizedPrice,
        allergens: Array.isArray(b.allergens) ? b.allergens : [],
        isVisible: b.isVisible !== undefined ? !!b.isVisible : true,
        isAvailable: b.isAvailable !== undefined ? !!b.isAvailable : true,
        isInfoBox: b.isInfoBox !== undefined ? !!b.isInfoBox : false,
        isVegetarian: b.isVegetarian !== undefined ? !!b.isVegetarian : false,
        isSpicy: b.isSpicy !== undefined ? !!b.isSpicy : false,
        imageUrl: b.imageUrl ?? null,
        pairingBeerName: b.pairingBeerName ? String(b.pairingBeerName).trim() : null,
        orderIndex: b.orderIndex !== undefined ? Number(b.orderIndex) : 0,
      };
      // Schema esplicito (no .omit()): in alcune combinazioni Zod 4 + drizzle-zod
      // chiamare .omit({id: true}) su uno schema dove `id` è già stato auto-rimosso
      // lancia "Unrecognized key: 'id'" lazily al parse(). Definirlo a mano è solido.
      const menuItemPayloadSchema = z.object({
        categoryId: z.number().int(),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Prezzo non valido'),
        allergens: z.array(z.string()).default([]),
        isVisible: z.boolean().default(true),
        isAvailable: z.boolean().default(true),
        isInfoBox: z.boolean().default(false),
        isVegetarian: z.boolean().default(false),
        isSpicy: z.boolean().default(false),
        imageUrl: z.string().nullable().optional(),
        pairingBeerName: z.string().nullable().optional(),
        orderIndex: z.number().int().default(0),
      });
      const itemData = menuItemPayloadSchema.parse(normalizedBody);
      const item = await storage.createMenuItem(itemData);
      broadcastPubUpdate(pubId, "menu");
      res.status(201).json(item);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("[menu-items] validation failed:", JSON.stringify(error.issues), "body=", JSON.stringify(req.body));
        const summary = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        return res.status(400).json({ message: `Dati non validi: ${summary}`, errors: error.issues });
      }
      console.error("[menu-items] create failed:", error?.message || error, "body=", JSON.stringify(req.body));
      res.status(500).json({ message: error?.message || "Failed to create menu item" });
    }
  });

  // Legacy endpoint - keep for backward compatibility
  app.post("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const itemData = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Update menu item (pub owner or admin)
  app.patch("/api/pubs/:pubId/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Get the item to verify it belongs to this pub through its category
      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Verify the item's category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === item.categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu item does not belong to your pub" });
      }

      // Extract allowed fields directly from req.body to avoid Zod stripping boolean false values
      const allowedFields = ['name', 'description', 'price', 'allergens', 'isVisible', 'isAvailable', 'isInfoBox', 'isVegetarian', 'isSpicy', 'imageUrl', 'pairingBeerName', 'orderIndex', 'categoryId'];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }
      // If categoryId is being changed, verify the new category belongs to this pub
      if (updates.categoryId && updates.categoryId !== item.categoryId) {
        const catExists = categories.some(cat => cat.id === updates.categoryId);
        if (!catExists) {
          return res.status(400).json({ message: "Category does not belong to this pub" });
        }
      }
      const updatedItem = await storage.updateMenuItem(itemId, updates);
      broadcastPubUpdate(pubId, "menu");
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // Toggle menu item visibility (reads from DB and flips, same pattern as beer toggle)
  app.patch("/api/pubs/:pubId/menu-items/:id/toggle-visibility", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);

      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [current] = await db.select({ isVisible: menuItems.isVisible }).from(menuItems).where(eq(menuItems.id, itemId));
      if (!current) return res.status(404).json({ message: "Menu item not found" });
      const newVisible = !current.isVisible;
      const [updated] = await db.update(menuItems).set({ isVisible: newVisible, updatedAt: new Date() }).where(eq(menuItems.id, itemId)).returning();
      broadcastPubUpdate(pubId, "menu");
      res.json(updated);
    } catch (error) {
      console.error("Error toggling menu item visibility:", error);
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });

  // Toggle menu item availability (reads from DB and flips)
  app.patch("/api/pubs/:pubId/menu-items/:id/toggle-availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);

      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [current] = await db.select({ isAvailable: menuItems.isAvailable }).from(menuItems).where(eq(menuItems.id, itemId));
      if (!current) return res.status(404).json({ message: "Menu item not found" });
      const newAvailable = !current.isAvailable;
      const [updated] = await db.update(menuItems).set({ isAvailable: newAvailable, updatedAt: new Date() }).where(eq(menuItems.id, itemId)).returning();
      broadcastPubUpdate(pubId, "menu");
      res.json(updated);
    } catch (error) {
      console.error("Error toggling menu item availability:", error);
      res.status(500).json({ message: "Failed to toggle availability" });
    }
  });

  // Toggle menu category visibility (reads from DB and flips)
  app.patch("/api/pubs/:pubId/menu-categories/:id/toggle-visibility", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const categoryId = parseInt(req.params.id);

      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [current] = await db.select({ isVisible: menuCategories.isVisible }).from(menuCategories).where(eq(menuCategories.id, categoryId));
      if (!current) return res.status(404).json({ message: "Menu category not found" });
      const newVisible = !current.isVisible;
      const [updated] = await db.update(menuCategories).set({ isVisible: newVisible }).where(eq(menuCategories.id, categoryId)).returning();
      broadcastPubUpdate(pubId, "menu");
      res.json(updated);
    } catch (error) {
      console.error("Error toggling menu category visibility:", error);
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });

  // Delete menu item (only pub owner)
  app.delete("/api/pubs/:pubId/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Get the item to verify it belongs to this pub through its category
      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Verify the item's category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === item.categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu item does not belong to your pub" });
      }

      await storage.deleteMenuItem(itemId);
      broadcastPubUpdate(pubId, "menu");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Update user profile (consolidated)
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const updates = { ...req.body };

      // Convert any date string fields to Date objects (Drizzle requires Date, not string)
      const dateFields = ['lastProfileImageUpdate', 'createdAt', 'updatedAt', 'birthDate'];
      for (const field of dateFields) {
        if (updates[field] !== undefined && updates[field] !== null && typeof updates[field] === 'string') {
          const parsed = new Date(updates[field]);
          updates[field] = isNaN(parsed.getTime()) ? undefined : parsed;
        }
      }

      if (updates.profileImageUrl !== undefined && updates.lastProfileImageUpdate) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.lastProfileImageUpdate) {
          const lastUpdate = new Date(currentUser.lastProfileImageUpdate as any);
          const now = new Date();
          const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
          if (daysDiff < 15) {
            return res.status(400).json({
              message: `Puoi cambiare l'immagine del profilo solo ogni 15 giorni. Riprova tra ${Math.ceil(15 - daysDiff)} giorni.`
            });
          }
        }
      }

      // If changing profile image, set lastProfileImageUpdate to now
      if (updates.profileImageUrl !== undefined && !updates.lastProfileImageUpdate) {
        updates.lastProfileImageUpdate = new Date();
      }

      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user nickname
  app.patch('/api/user/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { nickname } = req.body;

      if (!nickname || nickname.trim().length < 2) {
        return res.status(400).json({ message: "Il nickname deve contenere almeno 2 caratteri" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if 15 days have passed since last nickname update
      if (user.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          return res.status(400).json({ 
            message: `Puoi cambiare il nickname solo ogni 15 giorni. Riprova tra ${Math.ceil(15 - daysDiff)} giorni.` 
          });
        }
      }

      const updatedUser = await storage.updateUser(userId, {
        nickname: nickname.trim(),
        lastNicknameUpdate: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Failed to update nickname" });
    }
  });

  // Universal Favorites routes
  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/:itemType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer' | 'festival';
      if (!['pub', 'brewery', 'beer', 'festival'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      if (itemType === 'festival') {
        const favs = await db.select({
          id: favorites.id, itemId: favorites.itemId, itemType: favorites.itemType, createdAt: favorites.createdAt,
          name: festivals.name, slug: festivals.slug, location: festivals.location,
          startDate: festivals.startDate, endDate: festivals.endDate,
          logoUrl: festivals.logoUrl, coverImageUrl: festivals.coverImageUrl,
        })
          .from(favorites)
          .leftJoin(festivals, eq(festivals.id, favorites.itemId))
          .where(and(eq(favorites.userId, userId), eq(favorites.itemType, 'festival')));
        return res.json(favs);
      }
      const favData = await storage.getFavoritesByType(userId, itemType);
      res.json(favData);
    } catch (error) {
      console.error("Error fetching favorites by type:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { itemType, itemId } = req.body;
      
      if (!['pub', 'brewery', 'beer', 'festival'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const favorite = await storage.addFavorite({ userId, itemType, itemId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:itemType/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer' | 'festival';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer', 'festival'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      await storage.removeFavorite(userId, itemType, itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Delete favorite by ID
  app.delete("/api/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const favoriteId = parseInt(req.params.id);
      
      await storage.removeFavoriteById(userId, favoriteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite by ID:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Bulk reorder menu categories (array of {id, orderIndex})
  // Reorder menu items within a category
  app.post("/api/pubs/:pubId/menu-categories/:catId/items/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const pubId = parseInt(req.params.pubId);
      const userPubs = await storage.getPubsByOwner(userId);
      const userRoles = req.user?.roles ?? [];
      if (!userRoles.includes('admin') && !userPubs.some((p: any) => p.id === pubId)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { order } = req.body as { order: { id: number; orderIndex: number }[] };
      if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array" });
      await storage.reorderMenuItems(order);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error reordering menu items:", error);
      res.status(500).json({ message: "Failed to reorder menu items" });
    }
  });

  app.post("/api/pubs/:id/menu-categories/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const pubId = parseInt(req.params.id);
      const userPubs = await storage.getPubsByOwner(userId);
      const userRoles = req.user?.roles ?? [];
      if (!userRoles.includes('admin') && !userPubs.some((p: any) => p.id === pubId)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { order } = req.body as { order: { id: number; orderIndex: number }[] };
      if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array" });
      await Promise.all(order.map(({ id, orderIndex }) =>
        storage.updateMenuCategory(id, { orderIndex })
      ));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error bulk-reordering menu categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  // Reorder menu categories 
  app.patch("/api/pubs/:id/menu/categories/:categoryId/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const pubs = await storage.getPubsByOwner(userId);
      const pub = pubs.length > 0 ? pubs[0] : null;
      if (!pub || pub.id !== pubId) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(String(req.params.categoryId));
      const { newOrderIndex } = req.body;
      
      const category = await storage.updateMenuCategory(categoryId, { orderIndex: newOrderIndex });
      res.json(category);
    } catch (error) {
      console.error("Error reordering menu category:", error);
      res.status(500).json({ message: "Failed to reorder menu category" });
    }
  });

  app.get("/api/favorites/:itemType/:itemId/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer' | 'festival';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer', 'festival'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const isFavorite = await storage.isFavorite(userId, itemType, itemId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // Get favorites count for any item (public endpoint)
  app.get("/api/favorites/:itemType/:itemId/count", async (req, res) => {
    try {
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer' | 'festival';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer', 'festival'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const count = await storage.getFavoritesCount(itemType, itemId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching favorites count:", error);
      res.status(500).json({ message: "Failed to fetch favorites count" });
    }
  });

  // Update nickname with 15-day restriction
  app.patch('/api/user/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { nickname } = req.body;
      
      if (!nickname || nickname.trim().length === 0) {
        return res.status(400).json({ message: "Nickname è obbligatorio" });
      }
      
      if (nickname.length > 50) {
        return res.status(400).json({ message: "Il nickname deve essere massimo 50 caratteri" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      // Check if 15 days have passed since last update
      if (user.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          const daysRemaining = Math.ceil(15 - daysDiff);
          return res.status(400).json({ 
            message: `Puoi modificare il nickname tra ${daysRemaining} giorni` 
          });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        nickname: nickname.trim(),
        lastNicknameUpdate: new Date(),
        updatedAt: new Date()
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Errore aggiornamento nickname" });
    }
  });

  // Change or set user password
  app.patch("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "La nuova password deve essere di almeno 6 caratteri" });
      }

      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const bcrypt = await import("bcrypt");

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "Utente non trovato" });

      if (user.hashedPassword) {
        // Account con password — verifica quella attuale
        if (!currentPassword) {
          return res.status(400).json({ message: "Password attuale richiesta" });
        }
        const valid = await bcrypt.default.compare(currentPassword, user.hashedPassword);
        if (!valid) {
          return res.status(400).json({ message: "Password attuale non corretta" });
        }
      }
      // Account social senza password → imposta direttamente

      const hashed = await bcrypt.default.hash(newPassword, 12);
      await db.update(users).set({
        hashedPassword: hashed,
        passwordLastUpdated: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      res.json({ message: user.hashedPassword ? "Password aggiornata con successo" : "Password impostata con successo" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Errore cambio password" });
    }
  });

  // Upload profile image
  app.post('/api/user/upload-profile-image', isAuthenticated, (req: any, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: "Errore durante l'upload: " + err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nessuna immagine caricata" });
      }

      const imageUrl = await uploadImage(
        req.file.buffer,
        'profile-images',
        `user-${(req.user as any).id}-${Date.now()}`
      );

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Errore upload immagine" });
    }
  });

  app.get('/api/user-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Recent activities for a specific pub (public — used on pub detail Spina tab)
  app.get('/api/pubs/:id/recent-activities', async (req, res) => {
    try {
      const pubId = parseInt(req.params.id, 10);
      if (!Number.isFinite(pubId)) {
        return res.status(400).json({ message: 'Invalid pub id' });
      }
      const parsedLimit = parseInt(req.query.limit as string);
      const limit = Math.max(1, Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 8, 30));
      const activities = await storage.getPubRecentActivities(pubId, limit);
      res.set('Cache-Control', 'public, max-age=60');
      res.json(activities);
    } catch (error) {
      console.error('Error fetching pub recent activities:', error);
      res.status(500).json({ message: 'Failed to fetch pub activities' });
    }
  });

  // Get user beer tastings
  app.get('/api/user/beer-tastings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tastings = await storage.getUserBeerTastings(userId);
      res.json(tastings);
    } catch (error) {
      console.error("Error fetching beer tastings:", error);
      res.status(500).json({ message: "Failed to fetch beer tastings" });
    }
  });

  // Update beer tasting
  app.patch('/api/user/beer-tastings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tastingId = parseInt(req.params.id);
      const { personalNotes, rating, pubId, format, photoUrl } = req.body;

      const updateData: any = {};
      if (personalNotes !== undefined) updateData.personalNotes = personalNotes;
      if (rating !== undefined) updateData.rating = rating;
      if (pubId !== undefined) updateData.pubId = pubId;
      if (format !== undefined) updateData.format = format;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

      const updatedTasting = await storage.updateBeerTasting(tastingId, updateData, userId);
      res.json(updatedTasting);

      // Bust brewery stats cache for the affected brewery (fire-and-forget)
      pool.query(
        `SELECT b.brewery_id FROM user_beer_tastings t JOIN beers b ON b.id = t.beer_id WHERE t.id = $1`,
        [tastingId]
      ).then(r => { if (r.rows[0]?.brewery_id) bustBreweryStats(r.rows[0].brewery_id); })
       .catch(() => {});
    } catch (error) {
      console.error("Error updating beer tasting:", error);
      res.status(500).json({ message: "Failed to update beer tasting" });
    }
  });

  // Upload tasting photo
  app.post('/api/user/beer-tastings/upload-photo', isAuthenticated, (req: any, res, next) => {
    upload.single('photo')(req, res, async (err) => {
      if (err) return res.status(400).json({ message: "Upload error: " + err.message });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      try {
        const photoUrl = await uploadImage(req.file.path, 'tasting-photos');
        res.json({ photoUrl });
      } catch (error) {
        console.error("Error uploading tasting photo:", error);
        res.status(500).json({ message: "Failed to upload photo" });
      }
    });
  });

  // Helper function to check if user is admin or pub owner
  const isAdminOrPubOwner = async (userId: string, pubId: number): Promise<boolean> => {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;
      
      const effectiveRole = user.activeRole || user.userType;
      
      // Check if user is currently acting as admin
      if (effectiveRole === 'admin') {
        return true;
      }
      
      // Check if user owns the pub
      const pubs = await storage.getPubsByOwner(userId);
      return pubs.some(pub => pub.id === pubId);
    } catch (error) {
      console.error("Error checking admin/owner status:", error);
      return false;
    }
  };

  const notifyTapListChange = async (pubId: number, type: 'new_beer' | 'tap_change', beerName: string, beerId?: number) => {
    try {
      const pub = await storage.getPub(pubId);
      if (!pub) return;

      const titleMap = {
        new_beer: `Nuova birra alla spina!`,
        tap_change: `Cambio alla spina!`,
      };
      const messageMap = {
        new_beer: `${pub.name} ha aggiunto "${beerName}" alle spine.`,
        tap_change: `${pub.name} ha messo "${beerName}" alla spina.`,
      };

      const pubFavUserIds = await storage.getUsersWhoFavoritedPub(pubId);
      for (const userId of pubFavUserIds) {
        const prefs = await storage.getNotificationPreferences(userId);
        if (prefs && !prefs.tapChanges) continue;

        await storage.createNotification({
          userId,
          type,
          title: titleMap[type],
          message: messageMap[type],
          pubId,
          beerId: beerId ?? null,
          isRead: false,
        });

        sendPushToUser(userId, {
          title: titleMap[type],
          body: messageMap[type],
          url: `/pub/${pubId}`,
          type: 'tap_change',
          icon: pub.logoUrl || undefined,
          category: 'tapChanges',
        });
      }

      if (beerId) {
        const notifiedSet = new Set(pubFavUserIds);

        const beerFavUserIds = await storage.getUsersWhoFavoritedBeer(beerId);
        for (const userId of beerFavUserIds) {
          if (notifiedSet.has(userId)) continue;
          notifiedSet.add(userId);

          const prefs = await storage.getNotificationPreferences(userId);
          if (prefs && !prefs.tapChanges) continue;

          await storage.createNotification({
            userId,
            type: 'new_beer',
            title: `La tua birra preferita disponibile!`,
            message: `"${beerName}" è ora alla spina da ${pub.name}.`,
            pubId,
            beerId,
            isRead: false,
          });

          sendPushToUser(userId, {
            title: `La tua birra preferita disponibile!`,
            body: `"${beerName}" è ora alla spina da ${pub.name}.`,
            url: `/pub/${pubId}`,
            type: 'new_beer',
            icon: pub.logoUrl || undefined,
            category: 'tapChanges',
          });
        }

        const beer = await storage.getBeer(beerId);
        if (beer?.breweryId) {
          const breweryFavUserIds = await storage.getUsersWhoFavoritedBrewery(beer.breweryId);
          const brewery = await storage.getBrewery(beer.breweryId);
          const breweryName = brewery?.name || 'il tuo birrificio preferito';

          for (const userId of breweryFavUserIds) {
            if (notifiedSet.has(userId)) continue;
            notifiedSet.add(userId);

            const prefs = await storage.getNotificationPreferences(userId);
            if (prefs && !prefs.tapChanges) continue;

            await storage.createNotification({
              userId,
              type: 'new_beer',
              title: `Novità dal tuo birrificio preferito!`,
              message: `${pub.name} ha "${beerName}" di ${breweryName} alla spina.`,
              pubId,
              beerId,
              isRead: false,
            });

            sendPushToUser(userId, {
              title: `Novità dal tuo birrificio preferito!`,
              body: `${pub.name} ha "${beerName}" di ${breweryName} alla spina.`,
              url: `/pub/${pubId}`,
              type: 'new_beer',
              icon: brewery?.logoUrl || undefined,
              category: 'tapChanges',
            });
          }
        }

      }
    } catch (error) {
      console.error("Error sending tap change notifications:", error);
    }
  };
  // NOTE: wishlist-beer notifications are dispatched SEPARATELY at each
  // call site (not inside notifyTapListChange) so that:
  //  a) we can gate on the tap slot being active, and
  //  b) wishlistNearby users are never suppressed by tapChanges opt-outs.

  // ─── Wishlist notification helpers ────────────────────────────────────────
  /**
   * Returns all user_ids who have `beerId` in their wishlist.
   * Uses raw pool since user_wishlist is a raw-SQL table.
   */
  async function getWishlistUsersForBeer(beerId: number): Promise<string[]> {
    try {
      const result = await pool.query(
        'SELECT user_id FROM user_wishlist WHERE beer_id = $1',
        [beerId]
      );
      return result.rows.map((r: any) => r.user_id as string);
    } catch { return []; }
  }

  /**
   * Inserts a dedup row (user, beer, pub). Returns true if this is the first
   * time we're notifying this user about this beer at this pub.
   */
  async function tryMarkWishlistNotifSent(userId: string, beerId: number, pubId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `INSERT INTO wishlist_beer_notifications (user_id, beer_id, pub_id)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, beer_id, pub_id) DO NOTHING`,
        [userId, beerId, pubId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch { return false; }
  }

  /**
   * Fire-and-forget: notifies wishlist users about a beer becoming available.
   * `source`: 'tap' | 'bottle' — controls the notification message.
   * `alreadyNotified`: set of userIds already sent a notification in this same
   *   event (e.g. pub/beer favourites) — we skip them to avoid duplicates.
   */
  /**
   * Returns the set of user IDs from `candidates` who have demonstrated
   * geographic proximity to `pubCity` — defined as having at least one
   * favourite pub or check-in (user_beer_tastings with a pub_id) in a pub
   * whose city matches case-insensitively.
   *
   * This is the server-side proximity signal we use in lieu of stored GPS
   * coordinates, which the platform does not persist.
   */
  async function filterUsersByCity(candidates: string[], pubCity: string): Promise<Set<string>> {
    if (candidates.length === 0) return new Set();
    try {
      const { rows } = await pool.query(`
        SELECT DISTINCT u.user_id FROM (
          -- pub favourites in the same city
          SELECT f.user_id
          FROM favorites f
          JOIN pubs p ON p.id = f.item_id
          WHERE f.item_type = 'pub'
            AND f.user_id = ANY($1)
            AND LOWER(TRIM(p.city)) = LOWER(TRIM($2))
          UNION
          -- check-ins at pubs in the same city
          SELECT ubt.user_id
          FROM user_beer_tastings ubt
          JOIN pubs p ON p.id = ubt.pub_id
          WHERE ubt.user_id = ANY($1)
            AND LOWER(TRIM(p.city)) = LOWER(TRIM($2))
        ) u
      `, [candidates, pubCity]);
      return new Set<string>(rows.map((r: any) => r.user_id as string));
    } catch (e) {
      console.error("[wishlist-notif] filterUsersByCity error:", e);
      return new Set();
    }
  }

  async function notifyWishlistBeerAvailable(
    pubId: number,
    beerId: number,
    beerName: string,
    pub: { id: number; name: string; city: string; logoUrl?: string | null },
    alreadyNotified = new Set<string>(),
    source: 'tap' | 'bottle' = 'tap',
  ): Promise<void> {
    try {
      const allWishlistUsers = await getWishlistUsersForBeer(beerId);

      // Only notify users who can be placed in the pub's city via prior interactions
      const candidates = allWishlistUsers.filter(id => !alreadyNotified.has(id));
      if (candidates.length === 0) return;

      const nearbyUsers = await filterUsersByCity(candidates, pub.city);
      if (nearbyUsers.size === 0) return;

      for (const userId of nearbyUsers) {
        // Check notification preferences BEFORE claiming the dedup slot so that
        // a user who opts back in after being opted out can still be notified.
        const prefs = await storage.getNotificationPreferences(userId);
        if (prefs && (prefs as any).wishlistNearby === false) continue;

        // Anti-spam: max 1 notification per beer+pub per user.
        // Dedup slot is claimed only for users who will actually receive the notification.
        const isNew = await tryMarkWishlistNotifSent(userId, beerId, pubId);
        if (!isNew) continue;

        const sourceLabel = source === 'tap' ? 'alla spina' : 'in bottiglia';
        const title = `Birra dalla tua wishlist disponibile!`;
        const message = `"${beerName}" è ora disponibile ${sourceLabel} da ${pub.name} (${pub.city}).`;

        await storage.createNotification({
          userId,
          type: 'wishlist_beer_nearby',
          title,
          message,
          pubId,
          beerId,
          isRead: false,
        });

        sendPushToUser(userId, {
          title,
          body: message,
          url: `/pub/${pubId}`,
          type: 'wishlist_beer_nearby',
          icon: pub.logoUrl || undefined,
          category: 'wishlistNearby',
        });

        // Email channel — gated by wishlistNearbyEmail + master emailEnabled
        shouldSendEmailNotification(userId, 'wishlistNearby').then(async (allowed) => {
          if (!allowed) return;
          const { rows: [recipient] } = await pool.query(
            `SELECT email FROM users WHERE id = $1`, [userId]
          );
          if (recipient?.email) {
            const pubSlug = (pub as any).slug || String(pubId);
            sendWishlistBeerAvailableEmail(recipient.email, beerName, pub.name, pub.city, pubSlug, source).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error("[wishlist-notif] error:", error);
    }
  }

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await memCached('admin:stats', 60_000, async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [
        reviewCountResult, tastingCountResult, pubEventCountResult, breweryEventCountResult,
        userCountResult, pubCountResult, breweryCountResult, beerCountResult, festivalCountResult,
        avgRatingResult, activeUsersResult, newUsersResult, pendingPubsResult, pendingBreweriesResult,
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`${userBeerTastings.rating} IS NOT NULL`),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubEvents),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweryEvents),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(beers),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(festivals),
        db.select({ avg: sql<number>`COALESCE(AVG(rating)::float, 0)` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
        // Active users = users who tasted/added a beer view in last 30 days
        db.execute(sql`
          SELECT COUNT(DISTINCT user_id)::int AS count FROM (
            SELECT user_id FROM user_beer_tastings WHERE created_at >= ${thirtyDaysAgo} AND user_id IS NOT NULL
            UNION
            SELECT user_id FROM beer_views          WHERE viewed_at >= ${thirtyDaysAgo} AND user_id IS NOT NULL
          ) u
        `),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(users).where(sql`created_at >= ${monthStart}`),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(publicanRequests).where(sql`status = 'pending'`),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweryRequests).where(sql`status = 'pending'`),
      ]);

      const activeUsers = Number(((activeUsersResult as any).rows ?? activeUsersResult)[0]?.count || 0);
      const stats = {
        totalUsers: Number(userCountResult[0]?.count || 0),
        totalPubs: Number(pubCountResult[0]?.count || 0),
        totalBreweries: Number(breweryCountResult[0]?.count || 0),
        totalBeers: Number(beerCountResult[0]?.count || 0),
        totalReviews: Number(reviewCountResult[0]?.count || 0),
        totalTastings: Number(tastingCountResult[0]?.count || 0),
        totalEvents: Number(pubEventCountResult[0]?.count || 0) + Number(breweryEventCountResult[0]?.count || 0),
        totalFestivals: Number(festivalCountResult[0]?.count || 0),
        averageRating: Number((avgRatingResult[0]?.avg || 0).toFixed(2)),
        activeUsers,
        newUsersThisMonth: Number(newUsersResult[0]?.count || 0),
        pendingPubRequests: Number(pendingPubsResult[0]?.count || 0),
        pendingBreweryRequests: Number(pendingBreweriesResult[0]?.count || 0),
        lastUpdated: new Date().toISOString(),
      };
      return stats;
      });
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // On-demand translate for frontend (device language)
  app.post('/api/translate', async (req: any, res) => {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) return res.status(400).json({ message: "text e targetLang richiesti" });
    try {
      const { translateText } = await import("./translate");
      const result = await translateText(text, targetLang);
      res.json({ translated: result });
    } catch (err) {
      res.status(500).json({ message: "Errore traduzione" });
    }
  });

  // Batch translate beer descriptions to Italian
  app.post('/api/admin/translate-beers', isAuthenticated, isAdmin, async (req: any, res) => {
    const batchSize = Math.min(parseInt(req.query.batch as string) || 10, 30);
    const offsetVal = parseInt(req.query.offset as string) || 0;
    try {
      const rows = await db.execute(sql`
        SELECT id, description FROM beers
        WHERE description IS NOT NULL
          AND description != ''
          AND length(description) > 10
        ORDER BY id
        LIMIT ${batchSize} OFFSET ${offsetVal}
      `) as any;
      const beerList = rows.rows || rows;
      let translated = 0;
      let skipped = 0;
      for (const beer of beerList) {
        if (looksItalian(beer.description)) {
          skipped++;
          continue;
        }
        const result = await translateToItalian(beer.description);
        if (result) {
          await db.execute(sql`UPDATE beers SET description = ${result} WHERE id = ${beer.id}`);
          translated++;
          await new Promise(r => setTimeout(r, 500));
        } else {
          skipped++;
        }
      }
      res.json({ translated, skipped, processed: beerList.length, nextOffset: offsetVal + beerList.length });
    } catch (error) {
      console.error("Translation batch error:", error);
      res.status(500).json({ message: "Translation failed", error: String(error) });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/search', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json([]);
      const pattern = `%${q}%`;
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.nickname,
          full_name: sql<string | null>`NULLIF(TRIM(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')), '')`,
        })
        .from(users)
        .where(
          sql`(${users.email} ILIKE ${pattern} OR ${users.nickname} ILIKE ${pattern} OR ${users.firstName} ILIKE ${pattern} OR ${users.lastName} ILIKE ${pattern})`
        )
        .limit(10);
      res.json(rows);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const { userType, breweryId } = req.body;
      if (!userType) return res.status(400).json({ message: "userType required" });

      const [existingUser] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, targetId));
      const currentRoles: string[] = existingUser?.roles || ['customer'];

      const roleMap: Record<string, string> = {
        pub_owner: 'pub_owner',
        brewery_owner: 'brewery_owner',
        admin: 'admin',
        customer: 'customer',
      };
      const newRole = roleMap[userType] || userType;
      const newRoles = currentRoles.includes(newRole) ? currentRoles : ['customer', ...currentRoles.filter(r => r !== 'customer'), newRole];

      const updateData: any = {
        userType,
        roles: newRoles,
        activeRole: userType === 'customer' ? 'customer' : newRole,
        updatedAt: new Date(),
      };
      if (userType === 'brewery_owner' && breweryId) {
        updateData.breweryId = breweryId;
      }

      await db.update(users).set(updateData).where(eq(users.id, targetId));

      // When admin manually grants brewery_owner role, clear any rejected/pending brewery requests
      // so the user is no longer stuck on the "Richiesta Rifiutata" screen.
      if (userType === 'brewery_owner') {
        await db.update(breweryRequests).set({
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: (req as any).user?.id || null,
          adminNotes: 'Approvato manualmente dall\'amministratore',
        }).where(
          and(
            eq(breweryRequests.userId, targetId),
            sql`${breweryRequests.status} IN ('rejected', 'pending')`
          )
        );
      }

      // Same for pub_owner: clear rejected/pending publican requests
      if (userType === 'pub_owner') {
        await db.update(publicanRequests).set({
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: (req as any).user?.id || null,
          adminNotes: 'Approvato manualmente dall\'amministratore',
        }).where(
          and(
            eq(publicanRequests.userId, targetId),
            sql`${publicanRequests.status} IN ('rejected', 'pending')`
          )
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin: edit user profile fields (email, name, nickname, bio)
  app.patch('/api/admin/users/:id/profile', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const { email, firstName, lastName, nickname, bio, phone } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (email !== undefined) updateData.email = email.trim() || null;
      if (firstName !== undefined) updateData.firstName = firstName.trim() || null;
      if (lastName !== undefined) updateData.lastName = lastName.trim() || null;
      if (nickname !== undefined) updateData.nickname = nickname.trim() || null;
      if (bio !== undefined) updateData.bio = bio.trim() || null;

      await db.update(users).set(updateData).where(eq(users.id, targetId));
      res.json({ success: true });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Email o nickname già in uso da un altro utente" });
      }
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Impossibile aggiornare il profilo" });
    }
  });

  // Admin: resend verification email to a specific user by ID
  app.post('/api/admin/users/:id/resend-verification', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const [user] = await db.select({ id: users.id, email: users.email, isEmailVerified: users.isEmailVerified }).from(users).where(eq(users.id, targetId));
      if (!user) return res.status(404).json({ message: "Utente non trovato" });
      if (!user.email) return res.status(400).json({ message: "Questo utente non ha un'email registrata" });
      if (user.isEmailVerified) return res.status(400).json({ message: "L'email è già verificata" });
      const { nanoid } = await import("nanoid");
      const verificationToken = nanoid(32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users).set({ emailVerificationToken: verificationToken, emailVerificationExpires: verificationExpires }).where(eq(users.id, targetId));
      const { sendVerificationEmail } = await import("./email");
      await sendVerificationEmail(user.email, verificationToken);
      res.json({ success: true, message: "Email di verifica inviata" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Errore nell'invio dell'email" });
    }
  });

  // Admin: force-verify a user's email (unblocks ghost accounts that never confirmed)
  app.patch('/api/admin/users/:id/verify-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
      if (!existing) return res.status(404).json({ message: "Utente non trovato" });
      await db.update(users).set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      }).where(eq(users.id, targetId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error force-verifying email:", error);
      res.status(500).json({ message: "Errore nella verifica forzata" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const target = await storage.getUser(targetId);
      if (!target) return res.status(404).json({ message: "Utente non trovato" });

      // Cannot delete yourself
      if (targetId === (req.user as any).id) {
        return res.status(400).json({ message: "Non puoi eliminare il tuo account" });
      }

      // Clean up all child records in FK-dependency order
      await db.delete(notifications).where(eq(notifications.userId, targetId));
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, targetId));
      await db.delete(favorites).where(eq(favorites.userId, targetId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.userId, targetId));
      await db.delete(ratings).where(eq(ratings.userId, targetId));
      await db.delete(userActivities).where(eq(userActivities.userId, targetId));
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, targetId));
      await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, targetId));

      // Delete pubs owned by this user — cascade through all child FK tables first
      await db.execute(sql`DELETE FROM menu_items WHERE category_id IN (SELECT id FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId}))`);
      await db.execute(sql`DELETE FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM tap_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM bottle_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM pub_sizes WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM ratings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM user_beer_tastings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.delete(pubs).where(eq(pubs.ownerId, targetId));
      // Brewery stays in DB (data preserved) — no owner link needed

      // Nullify reviewed_by references (admin who reviewed requests)
      await db.update(publicanRequests).set({ reviewedBy: null }).where(eq(publicanRequests.reviewedBy, targetId));
      await db.update(breweryRequests).set({ reviewedBy: null }).where(eq(breweryRequests.reviewedBy, targetId));

      // Delete requests submitted by this user
      await db.delete(publicanRequests).where(eq(publicanRequests.userId, targetId));
      await db.delete(breweryRequests).where(eq(breweryRequests.userId, targetId));

      // Finally delete the user using raw SQL with RETURNING to confirm deletion
      const deleted = await db.execute(sql`DELETE FROM users WHERE id = ${targetId} RETURNING id`);
      
      if (!deleted.rows || deleted.rows.length === 0) {
        console.error(`[admin] Delete user ${targetId}: DELETE returned 0 rows - possible FK constraint or missing record`);
        // Try to get FK violations by querying remaining refs
        const refs = await db.execute(sql`
          SELECT 'notifications' as tbl, COUNT(*) FROM notifications WHERE user_id = ${targetId}
          UNION ALL SELECT 'favorites', COUNT(*) FROM favorites WHERE user_id = ${targetId}
          UNION ALL SELECT 'ratings', COUNT(*) FROM ratings WHERE user_id = ${targetId}
          UNION ALL SELECT 'pubs_owner', COUNT(*) FROM pubs WHERE owner_id = ${targetId}
        `);
        console.error("[admin] Remaining FK refs:", refs.rows);
        return res.status(500).json({ message: "Eliminazione fallita: il record non è stato rimosso dal database" });
      }

      console.log(`[admin] User ${targetId} deleted successfully`);
      res.json({ success: true, message: `Utente "${target.nickname || target.firstName || targetId}" eliminato` });
    } catch (error: any) {
      console.error("Error deleting user:", error?.message || error);
      res.status(500).json({ message: `Errore eliminazione: ${error?.message || "Errore sconosciuto"}` });
    }
  });

  // ─── Admin: Publican Requests (legacy storico — pub ora attivati via Stripe) ───

  app.get('/api/admin/publican-requests', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: publicanRequests.id,
          userId: publicanRequests.userId,
          pubName: publicanRequests.pubName,
          pubAddress: publicanRequests.pubAddress,
          pubCity: publicanRequests.pubCity,
          pubRegion: publicanRequests.pubRegion,
          vatNumber: publicanRequests.vatNumber,
          phone: publicanRequests.phone,
          email: publicanRequests.email,
          description: publicanRequests.description,
          status: publicanRequests.status,
          adminNotes: publicanRequests.adminNotes,
          createdAt: publicanRequests.createdAt,
          reviewedAt: publicanRequests.reviewedAt,
          reviewedBy: publicanRequests.reviewedBy,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(publicanRequests)
        .leftJoin(users, eq(publicanRequests.userId, users.id))
        .orderBy(desc(publicanRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching publican requests:", error);
      res.status(500).json({ message: "Failed to fetch publican requests" });
    }
  });

  app.post('/api/admin/publican-requests/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;

      const [pubReq] = await db.select().from(publicanRequests).where(eq(publicanRequests.id, id));
      if (!pubReq) return res.status(404).json({ message: "Richiesta non trovata" });
      if (pubReq.status === 'approved') return res.status(400).json({ message: "Già approvata" });

      // Create the pub from request data
      const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const [newPub] = await db.insert(pubs).values({
        name: pubReq.pubName,
        address: pubReq.pubAddress,
        city: pubReq.pubCity,
        region: pubReq.pubRegion || pubReq.pubCity,
        phone: pubReq.phone || null,
        email: pubReq.email || null,
        description: pubReq.description || null,
        vatNumber: pubReq.vatNumber || null,
        ownerId: pubReq.userId,
        isVerified: true,
        subscriptionStatus: 'trial',
        trialEndsAt,
        isActive: true,
      }).returning();

      // Update request status
      await db.update(publicanRequests).set({
        status: 'approved',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(publicanRequests.id, id));

      // Promote user to pub_owner, preserving existing roles
      const [existingUser] = await db.select({ roles: users.roles, userType: users.userType }).from(users).where(eq(users.id, pubReq.userId));
      const currentRoles: string[] = existingUser?.roles || ['customer'];
      const newRoles = currentRoles.includes('pub_owner') ? currentRoles : [...currentRoles, 'pub_owner'];

      await db.update(users).set({
        roles: newRoles,
        userType: 'pub_owner',
        activeRole: 'pub_owner',
        updatedAt: new Date(),
      }).where(eq(users.id, pubReq.userId));

      // Notify user
      try {
        await db.insert(notifications).values({
          userId: pubReq.userId,
          type: 'system',
          title: '🎉 Pub approvato!',
          message: `Il tuo locale "${pubReq.pubName}" è stato verificato. Accedi alla dashboard per gestire taplist e menu.`,
          isRead: false,
        });
      } catch {}

      res.json({ success: true, pubId: newPub.id });
    } catch (error) {
      console.error("Error approving publican request:", error);
      res.status(500).json({ message: "Failed to approve publican request" });
    }
  });

  app.post('/api/admin/publican-requests/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;
      await db.update(publicanRequests).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(publicanRequests.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting publican request:", error);
      res.status(500).json({ message: "Failed to reject publican request" });
    }
  });

  // ─── Admin: Brewery Requests (unico caso con approvazione admin) ───────────

  app.get('/api/admin/brewery-requests', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: breweryRequests.id,
          userId: breweryRequests.userId,
          breweryName: sql<string>`COALESCE(
            CASE WHEN ${breweryRequests.existingBreweryId} IS NOT NULL
              THEN (SELECT name FROM breweries WHERE id = ${breweryRequests.existingBreweryId})
              ELSE NULL END,
            ${breweryRequests.breweryName}
          )`.as('brewery_name'),
          breweryLocation: breweryRequests.breweryLocation,
          breweryRegion: breweryRequests.breweryRegion,
          breweryCountry: breweryRequests.breweryCountry,
          vatNumber: breweryRequests.vatNumber,
          phone: breweryRequests.phone,
          email: breweryRequests.email,
          websiteUrl: breweryRequests.websiteUrl,
          description: breweryRequests.description,
          existingBreweryId: breweryRequests.existingBreweryId,
          status: breweryRequests.status,
          adminNotes: breweryRequests.adminNotes,
          createdAt: breweryRequests.createdAt,
          reviewedAt: breweryRequests.reviewedAt,
          reviewedBy: breweryRequests.reviewedBy,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(breweryRequests)
        .leftJoin(users, eq(breweryRequests.userId, users.id))
        .orderBy(desc(breweryRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching brewery requests:", error);
      res.status(500).json({ message: "Failed to fetch brewery requests" });
    }
  });

  app.post('/api/admin/brewery-requests/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;

      const [brewReq] = await db.select().from(breweryRequests).where(eq(breweryRequests.id, id));
      if (!brewReq) return res.status(404).json({ message: "Richiesta non trovata" });
      if (brewReq.status === 'approved') return res.status(400).json({ message: "Già approvata" });

      let breweryId: number;

      if (brewReq.existingBreweryId) {
        // Claim existing brewery
        breweryId = brewReq.existingBreweryId;
      } else {
        // Create new brewery from request data
        const [newBrewery] = await db.insert(breweries).values({
          name: brewReq.breweryName,
          location: brewReq.breweryLocation,
          region: brewReq.breweryRegion || brewReq.breweryLocation,
          country: brewReq.breweryCountry || 'Italia',
          vatNumber: brewReq.vatNumber || null,
          phone: brewReq.phone || null,
          websiteUrl: brewReq.websiteUrl || null,
          description: brewReq.description || null,
        }).returning();
        breweryId = newBrewery.id;
      }

      // Update brewery request status
      await db.update(breweryRequests).set({
        status: 'approved',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(breweryRequests.id, id));

      // Promote user: add brewery_owner role preserving existing roles
      const [existingUser] = await db.select({ roles: users.roles, userType: users.userType }).from(users).where(eq(users.id, brewReq.userId));
      const currentRoles: string[] = existingUser?.roles || ['customer'];
      const newRoles = currentRoles.includes('brewery_owner') ? currentRoles : [...currentRoles, 'brewery_owner'];
      const isPubOwner = currentRoles.includes('pub_owner');

      await db.update(users).set({
        roles: newRoles,
        userType: isPubOwner ? existingUser.userType : 'brewery_owner',
        activeRole: 'brewery_owner',
        breweryId,
        updatedAt: new Date(),
      }).where(eq(users.id, brewReq.userId));

      // Notify user
      try {
        await db.insert(notifications).values({
          userId: brewReq.userId,
          type: 'system',
          title: '🎉 Birrificio approvato!',
          message: `Il tuo birrificio "${brewReq.breweryName}" è stato verificato. Ora puoi accedere alla dashboard del birrificio.`,
          isRead: false,
        });
      } catch {}

      res.json({ success: true, breweryId });
    } catch (error) {
      console.error("Error approving brewery request:", error);
      res.status(500).json({ message: "Failed to approve brewery request" });
    }
  });

  app.post('/api/admin/brewery-requests/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;

      const [brewReq] = await db.select().from(breweryRequests).where(eq(breweryRequests.id, id));
      if (!brewReq) return res.status(404).json({ message: "Richiesta non trovata" });

      await db.update(breweryRequests).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(breweryRequests.id, id));

      // Notify user
      try {
        await db.insert(notifications).values({
          userId: brewReq.userId,
          type: 'system',
          title: 'Richiesta birrificio non approvata',
          message: adminNotes
            ? `La tua richiesta per "${brewReq.breweryName}" non è stata approvata. Nota: ${adminNotes}`
            : `La tua richiesta per "${brewReq.breweryName}" non è stata approvata. Contattaci per maggiori informazioni.`,
          isRead: false,
        });
      } catch {}

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting brewery request:", error);
      res.status(500).json({ message: "Failed to reject brewery request" });
    }
  });

  app.get('/api/admin/pubs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubs = await storage.getAllPubs();
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching all pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  app.get('/api/admin/pubs/search', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '50')), 100);
      if (!q) return res.json([]);
      const pattern = `%${q}%`;
      const results = await db.select().from(pubs)
        .where(sql`(${pubs.name} ILIKE ${pattern} OR ${pubs.city} ILIKE ${pattern} OR ${pubs.address} ILIKE ${pattern})`)
        .orderBy(pubs.name)
        .limit(limit);
      res.json(results);
    } catch (error) {
      console.error("Error searching pubs:", error);
      res.status(500).json({ message: "Failed to search pubs" });
    }
  });

  app.get('/api/admin/breweries', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweries = await storage.getAllBreweries();
      res.json(breweries);
    } catch (error) {
      console.error("Error fetching all breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });

  app.get('/api/admin/beers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beers = await storage.getAllBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching all beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  // Mass update beers (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/beers/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
      if (safeIds.length === 0) return res.status(400).json({ message: "ids array required" });
      const idList = safeIds.join(',');

      let updatedCount = 0;

      if (updates.nameStripPrefix && typeof updates.nameStripPrefix === 'string' && updates.nameStripPrefix.trim()) {
        const prefix = updates.nameStripPrefix;
        await pool.query(
          `UPDATE beers SET name = TRIM(CASE WHEN LOWER(name) LIKE $1 || '%' THEN SUBSTRING(name FROM $2::int) ELSE name END) WHERE id IN (${idList})`,
          [prefix.toLowerCase(), prefix.length + 1]
        );
        updatedCount = safeIds.length;
      }

      if (updates.nameFindReplace && typeof updates.nameFindReplace === 'object' && updates.nameFindReplace.find) {
        const { find, replace = '' } = updates.nameFindReplace as { find: string; replace?: string };
        if (find.trim()) {
          await pool.query(
            `UPDATE beers SET name = TRIM(REPLACE(name, $1, $2)) WHERE id IN (${idList})`,
            [find, replace]
          );
          updatedCount = safeIds.length;
        }
      }

      const allowed = ['style', 'color', 'abv', 'ibu', 'is_gluten_free', 'is_alcohol_free'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length > 0) {
        const keys = Object.keys(safeUpdates);
        const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        const values = Object.values(safeUpdates);
        await pool.query(`UPDATE beers SET ${setClauses} WHERE id IN (${idList})`, values);
        updatedCount = safeIds.length;
      }

      if (updatedCount === 0) return res.status(400).json({ message: "Nessun campo valido da aggiornare" });
      res.json({ updated: updatedCount });
    } catch (error) {
      console.error("Mass update beers error:", error);
      res.status(500).json({ message: "Failed to mass update beers" });
    }
  });

  // Mass update breweries (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/breweries/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['country', 'region', 'location', 'city', 'website_url'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = [ids, ...Object.values(safeUpdates)];
      await pool.query(`UPDATE breweries SET ${setClauses} WHERE id = ANY($1::int[])`, values);
      res.json({ updated: ids.length });
    } catch (error) {
      console.error("Mass update breweries error:", error);
      res.status(500).json({ message: "Failed to mass update breweries" });
    }
  });

  // Find duplicate breweries using pg_trgm similarity
  app.get('/api/admin/breweries/find-duplicates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const threshold = parseFloat(req.query.threshold as string) || 0.75;
      const country = req.query.country as string || null;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      let rows: any[];
      try {
        // Use pg_trgm similarity for fuzzy matching
        const countryFilter = country ? `AND (b1.country = $3 OR b2.country = $3)` : '';
        const params: any[] = [threshold, limit];
        if (country) params.push(country);

        const result = await pool.query(`
          SELECT
            b1.id as id1, b1.name as name1, b1.country as country1,
            b1.region as region1, b1.location as location1, b1.logo_url as logo1,
            b2.id as id2, b2.name as name2, b2.country as country2,
            b2.region as region2, b2.location as location2, b2.logo_url as logo2,
            ROUND(similarity(lower(b1.name), lower(b2.name))::numeric, 3) as sim,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b1.id)::int as beers1,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b2.id)::int as beers2
          FROM breweries b1
          JOIN breweries b2 ON b1.id < b2.id
            AND similarity(lower(b1.name), lower(b2.name)) >= $1
            ${countryFilter}
          ORDER BY sim DESC, LEAST(b1.id, b2.id)
          LIMIT $2
        `, params);
        rows = result.rows;
      } catch (trgmErr: any) {
        // Fallback: exact lowercase name match
        const result = await pool.query(`
          SELECT
            b1.id as id1, b1.name as name1, b1.country as country1,
            b1.region as region1, b1.location as location1, b1.logo_url as logo1,
            b2.id as id2, b2.name as name2, b2.country as country2,
            b2.region as region2, b2.location as location2, b2.logo_url as logo2,
            1.0 as sim,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b1.id)::int as beers1,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b2.id)::int as beers2
          FROM breweries b1
          JOIN breweries b2 ON b1.id < b2.id
            AND lower(b1.name) = lower(b2.name)
          ORDER BY b1.name
          LIMIT $1
        `, [limit]);
        rows = result.rows;
      }

      res.json(rows);
    } catch (error) {
      console.error("Find duplicates error:", error);
      res.status(500).json({ message: "Errore nella ricerca duplicati" });
    }
  });

  // Merge two breweries — keepId survives, mergeId is deleted after migrating all data
  app.post('/api/admin/breweries/merge', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { keepId, mergeId } = req.body as { keepId: number; mergeId: number };
      if (!keepId || !mergeId || keepId === mergeId) {
        return res.status(400).json({ message: "keepId e mergeId devono essere diversi e validi" });
      }

      // Verify both breweries exist
      const { rows: both } = await pool.query(
        `SELECT id, name FROM breweries WHERE id = ANY($1::int[])`,
        [[keepId, mergeId]]
      );
      if (both.length < 2) return res.status(404).json({ message: "Uno o entrambi i birrifici non trovati" });
      const keepName = both.find((r: any) => r.id === keepId)?.name;

      // Check which optional columns exist (schema may differ across environments)
      const { rows: colChecks } = await pool.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE (table_name = 'user_beer_tastings' AND column_name = 'brewery_id')
           OR (table_name = 'beers' AND column_name = 'brewery_name')
      `);
      const hasTastingsBreweryId = colChecks.some((r: any) => r.table_name === 'user_beer_tastings' && r.column_name === 'brewery_id');
      const hasBeersBreweryName  = colChecks.some((r: any) => r.table_name === 'beers' && r.column_name === 'brewery_name');

      // Run all migrations in a transaction
      await pool.query('BEGIN');
      try {
        // 1. Move beers
        if (hasBeersBreweryName) {
          await pool.query(
            `UPDATE beers SET brewery_id = $1, brewery_name = $2 WHERE brewery_id = $3`,
            [keepId, keepName, mergeId]
          );
        } else {
          await pool.query(
            `UPDATE beers SET brewery_id = $1 WHERE brewery_id = $2`,
            [keepId, mergeId]
          );
        }
        // 2. Move user_beer_tastings (only if brewery_id column exists)
        if (hasTastingsBreweryId) {
          await pool.query(
            `UPDATE user_beer_tastings SET brewery_id = $1 WHERE brewery_id = $2`,
            [keepId, mergeId]
          );
        }
        // 3. Move brewery events (re-assign to kept brewery)
        await pool.query(
          `UPDATE brewery_events SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 4. Move addition_requests (column is brewery_id, not existing_brewery_id)
        await pool.query(
          `UPDATE addition_requests SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 4b. Move brewery_requests (this table uses existing_brewery_id)
        await pool.query(
          `UPDATE brewery_requests SET existing_brewery_id = $1 WHERE existing_brewery_id = $2`,
          [keepId, mergeId]
        );
        // 5. Move brewery owner users
        await pool.query(
          `UPDATE users SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 6. Null-out notifications brewery_id (no cascade on this column — must clear manually)
        await pool.query(
          `UPDATE notifications SET brewery_id = NULL WHERE brewery_id = $1`,
          [mergeId]
        );
        // 7. Delete the merged brewery (scan_logs.chosen_brewery_id is set null on cascade)
        await pool.query(`DELETE FROM breweries WHERE id = $1`, [mergeId]);
        await pool.query('COMMIT');
      } catch (txErr) {
        await pool.query('ROLLBACK');
        throw txErr;
      }

      const beerCount = await pool.query(
        `SELECT COUNT(*) FROM beers WHERE brewery_id = $1`, [keepId]
      );
      res.json({
        success: true,
        keepId,
        mergeId,
        keepName,
        beersMoved: parseInt(beerCount.rows[0].count),
      });
    } catch (error) {
      console.error("Brewery merge error:", error);
      res.status(500).json({ message: "Errore durante il merge dei birrifici" });
    }
  });

  // Sync brewery_name field in beers for a specific brewery
  app.post('/api/admin/breweries/:id/sync-beer-names', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const { rows: brewRows } = await pool.query(`SELECT name FROM breweries WHERE id = $1`, [breweryId]);
      if (!brewRows.length) return res.status(404).json({ message: "Brewery not found" });
      const breweryName = brewRows[0].name;
      const result = await pool.query(
        `UPDATE beers SET brewery_name = $1 WHERE brewery_id = $2 AND (brewery_name IS NULL OR brewery_name != $1)`,
        [breweryName, breweryId]
      );
      res.json({ updated: result.rowCount ?? 0, breweryName });
    } catch (error) {
      console.error("Sync beer names error:", error);
      res.status(500).json({ message: "Failed to sync beer names" });
    }
  });

  // Mass update pubs (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/pubs/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['city', 'region', 'country'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = [ids, ...Object.values(safeUpdates)];
      await pool.query(`UPDATE pubs SET ${setClauses} WHERE id = ANY($1::int[])`, values);
      res.json({ updated: ids.length });
    } catch (error) {
      console.error("Mass update pubs error:", error);
      res.status(500).json({ message: "Failed to mass update pubs" });
    }
  });

  // Toggle beer hidden status
  app.patch('/api/admin/beers/:id/toggle-visibility', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const [current] = await db.select({ isHidden: beers.isHidden }).from(beers).where(eq(beers.id, beerId));
      if (!current) return res.status(404).json({ message: "Beer not found" });
      const newHidden = !current.isHidden;
      await db.update(beers).set({ isHidden: newHidden }).where(eq(beers.id, beerId));
      res.json({ id: beerId, isHidden: newHidden });
    } catch (error) {
      console.error("Error toggling beer visibility:", error);
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });

  app.patch('/api/admin/beers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      // Extract collab fields before passing to updateBeer to avoid schema column issues
      const { collaborationBreweryIds, isCollaboration, ...updates } = req.body;
      const beer = await storage.updateBeer(beerId, updates);
      if (updates.logoUrl || updates.imageUrl || updates.logo_url || updates.image_url) {
        clipIndexBeer(beerId, updates.logoUrl || updates.logo_url || updates.imageUrl || updates.image_url);
      }

      // Update collaboration breweries if provided (replace all)
      if (collaborationBreweryIds !== undefined) {
        await db.delete(beerCollaborations).where(eq(beerCollaborations.beerId, beerId));
        const ids = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
        for (const brewId of ids) {
          await db.insert(beerCollaborations).values({ beerId, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        // Auto-derive is_collaboration from the collab list (safe SQL, ignores missing column)
        try {
          await db.execute(sql`UPDATE beers SET is_collaboration = ${ids.length > 0} WHERE id = ${beerId}`);
        } catch { /* column may not exist on older DB, non-blocking */ }
      }

      res.json(beer);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  app.patch('/api/admin/breweries/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const updates = { ...req.body };
      if (updates.latitude === '' || updates.latitude === undefined) updates.latitude = null;
      if (updates.longitude === '' || updates.longitude === undefined) updates.longitude = null;
      const brewery = await storage.updateBrewery(breweryId, updates);
      res.json(brewery);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  // Admin: soft-archive / restore a brewery (reversible, no deletion).
  // Archiving a brewery cascades is_discontinued=true onto its beers so the whole
  // brewery + its beers disappear from search/listings/suggestions/counters.
  // Restoring sets is_closed=false and reactivates beers auto-archived with the brewery
  // (discontinued_source 'cascade' or 'ratebeer_import') without touching beers archived
  // manually by an admin (discontinued_source='admin').
  app.patch('/api/admin/breweries/:id/archive', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const archived = req.body?.archived !== false; // default: archive
      const [current] = await db.select({ id: breweries.id }).from(breweries).where(eq(breweries.id, breweryId));
      if (!current) return res.status(404).json({ message: "Brewery not found" });

      if (archived) {
        await db.execute(sql`UPDATE breweries SET is_closed = true, closed_source = 'admin', closed_at = NOW() WHERE id = ${breweryId}`);
        // Cascade only onto beers that are still active; mark them as cascade-archived
        // so we can selectively restore them later.
        await db.execute(sql`UPDATE beers SET is_discontinued = true, discontinued_source = 'cascade' WHERE brewery_id = ${breweryId} AND COALESCE(is_discontinued, false) = false`);
      } else {
        await db.execute(sql`UPDATE breweries SET is_closed = false, closed_source = NULL, closed_at = NULL WHERE id = ${breweryId}`);
        // Restore beers auto-archived with the brewery (admin cascade OR RateBeer import),
        // preserving beers archived individually by an admin (discontinued_source='admin').
        await db.execute(sql`UPDATE beers SET is_discontinued = false, discontinued_source = NULL WHERE brewery_id = ${breweryId} AND discontinued_source IN ('cascade', 'ratebeer_import')`);
      }
      clearCatalogCaches();
      res.json({ id: breweryId, isClosed: archived });
    } catch (error) {
      console.error("Error archiving brewery:", error);
      res.status(500).json({ message: "Failed to archive brewery" });
    }
  });

  // Admin: soft-archive / restore a single beer (reversible, no deletion).
  app.patch('/api/admin/beers/:id/archive', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const archived = req.body?.archived !== false; // default: archive
      const [current] = await db.select({ id: beers.id }).from(beers).where(eq(beers.id, beerId));
      if (!current) return res.status(404).json({ message: "Beer not found" });
      if (archived) {
        await db.execute(sql`UPDATE beers SET is_discontinued = true, discontinued_source = 'admin' WHERE id = ${beerId}`);
      } else {
        await db.execute(sql`UPDATE beers SET is_discontinued = false, discontinued_source = NULL WHERE id = ${beerId}`);
      }
      clearCatalogCaches();
      res.json({ id: beerId, isDiscontinued: archived });
    } catch (error) {
      console.error("Error archiving beer:", error);
      res.status(500).json({ message: "Failed to archive beer" });
    }
  });

  // Admin: suspicious-brewery candidates for soft-archive.
  // Ranks breweries by inactivity signals computed purely from DB data
  // (no LLM): zero beers, no taplist/bottlelist presence, no recent views,
  // no events. Higher score = more likely closed/retired. Read-only; the
  // admin confirms before archiving via the /archive endpoint above.
  app.get('/api/admin/breweries/suspicious', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(500, parseInt(req.query.limit as string) || 100);
      const result = await db.execute(sql`
        WITH b AS (
          SELECT br.id, br.name, br.location, br.country, br.website_url,
            (SELECT COUNT(*) FROM beers be WHERE be.brewery_id = br.id) AS beer_count,
            (SELECT COUNT(*) FROM tap_list tl JOIN beers be ON be.id = tl.beer_id WHERE be.brewery_id = br.id AND tl.is_active = true) AS tap_count,
            (SELECT COUNT(*) FROM bottle_list bl JOIN beers be ON be.id = bl.beer_id WHERE be.brewery_id = br.id AND bl.is_active = true) AS bottle_count,
            (SELECT COUNT(*) FROM brewery_events ev WHERE ev.brewery_id = br.id) AS event_count,
            (SELECT COUNT(*) FROM beer_views bv JOIN beers be ON be.id = bv.beer_id WHERE be.brewery_id = br.id AND bv.viewed_at > NOW() - INTERVAL '180 days') AS recent_views
          FROM breweries br
          WHERE COALESCE(br.is_closed, false) = false
        )
        SELECT *,
          ( (CASE WHEN beer_count = 0 THEN 3 ELSE 0 END)
          + (CASE WHEN tap_count = 0 AND bottle_count = 0 THEN 2 ELSE 0 END)
          + (CASE WHEN recent_views = 0 THEN 2 ELSE 0 END)
          + (CASE WHEN event_count = 0 THEN 1 ELSE 0 END)
          + (CASE WHEN website_url IS NULL OR website_url = '' THEN 1 ELSE 0 END)
          ) AS suspicion_score
        FROM b
        WHERE (tap_count = 0 AND bottle_count = 0 AND recent_views = 0)
        ORDER BY suspicion_score DESC, beer_count ASC, name ASC
        LIMIT ${limit}
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching suspicious breweries:", error);
      res.status(500).json({ message: "Failed to fetch suspicious breweries" });
    }
  });

  // Admin: batch geocode breweries without coordinates
  // Strategia: deduplication per location string → poche API call Nominatim (gratuito, no key)
  app.post('/api/admin/breweries/geocode', isAuthenticated, isAdmin, async (req: any, res) => {
    // Recupera le location UNICHE senza coordinate (un solo geocoding per città/regione)
    const { rows: uniqueLocs } = await pool.query(`
      SELECT DISTINCT ON (LOWER(TRIM(location)))
        LOWER(TRIM(location)) AS loc_key,
        location,
        COALESCE(country, 'Italia') AS country
      FROM breweries
      WHERE (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')
        AND location IS NOT NULL AND TRIM(location) != ''
      LIMIT 60
    `);

    if (uniqueLocs.length === 0) {
      return res.json({ total: 0, geocoded: 0, failed: 0, breweriesUpdated: 0 });
    }

    let geocoded = 0, failed = 0, breweriesUpdated = 0;

    for (const row of uniqueLocs) {
      const q = encodeURIComponent(`${row.location}, ${row.country}`);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=it`,
          { headers: { 'User-Agent': 'Fermenta.to/1.0 (noreply@fermenta.to)' } }
        );
        const data = await r.json() as any[];
        if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
          const lat = data[0].lat;
          const lng = data[0].lon;
          // Aggiorna TUTTI i birrifici con questa location in una sola query
          const upd = await pool.query(
            `UPDATE breweries
             SET latitude = $1, longitude = $2
             WHERE LOWER(TRIM(location)) = $3
               AND (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')`,
            [lat, lng, row.loc_key]
          );
          breweriesUpdated += upd.rowCount ?? 0;
          geocoded++;
        } else {
          failed++;
        }
        // Nominatim: max 1 req/sec
        await new Promise(ok => setTimeout(ok, 1100));
      } catch {
        failed++;
        await new Promise(ok => setTimeout(ok, 1100));
      }
    }

    // Bust cache → mappa aggiornata immediatamente
    _memCache.delete("breweries:all:200");
    _memCache.delete("breweries:all");

    res.json({ total: uniqueLocs.length, geocoded, failed, breweriesUpdated });
  });

  // Admin: stats for any brewery
  app.get('/api/admin/brewery/:id/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [viewsWeek, viewsAllTime, topBeerRows, reviewsCount, favoritesCount] = await Promise.all([
        db.select({ total: sql<number>`COUNT(*)::int` }).from(beerViews).innerJoin(beers, eq(beerViews.beerId, beers.id)).where(and(eq(beers.breweryId, breweryId), gte(beerViews.viewedAt, sevenDaysAgo))),
        db.select({ total: sql<number>`COUNT(*)::int` }).from(beerViews).innerJoin(beers, eq(beerViews.beerId, beers.id)).where(eq(beers.breweryId, breweryId)),
        db.select({ beerId: beerViews.beerId, beerName: beers.name, views: sql<number>`COUNT(*)::int` }).from(beerViews).innerJoin(beers, eq(beerViews.beerId, beers.id)).where(and(eq(beers.breweryId, breweryId), gte(beerViews.viewedAt, thirtyDaysAgo))).groupBy(beerViews.beerId, beers.name).orderBy(desc(sql`COUNT(*)`)).limit(3),
        db.select({ total: sql<number>`COUNT(*)::int` }).from(userBeerTastings).innerJoin(beers, eq(userBeerTastings.beerId, beers.id)).where(and(eq(beers.breweryId, breweryId), sql`${userBeerTastings.rating} IS NOT NULL`)),
        db.select({ total: sql<number>`COUNT(*)::int` }).from(favorites).innerJoin(beers, sql`${favorites.itemId} = ${beers.id} AND ${favorites.itemType} = 'beer'`).where(eq(beers.breweryId, breweryId)),
      ]);
      res.json({ viewsWeek: viewsWeek[0]?.total || 0, viewsAllTime: viewsAllTime[0]?.total || 0, topBeers: topBeerRows, totalReviews: reviewsCount[0]?.total || 0, totalFavorites: favoritesCount[0]?.total || 0 });
    } catch (error) {
      console.error("Error fetching admin brewery stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin: recent reviews for any brewery
  app.get('/api/admin/brewery/:id/recent-reviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const reviews = await db
        .select({ id: userBeerTastings.id, beerId: userBeerTastings.beerId, beerName: beers.name, rating: userBeerTastings.rating, personalNotes: userBeerTastings.personalNotes, tastedAt: userBeerTastings.tastedAt, userId: userBeerTastings.userId, nickname: users.nickname, firstName: users.firstName, ownerReply: userBeerTastings.ownerReply, ownerReplyAt: userBeerTastings.ownerReplyAt })
        .from(userBeerTastings)
        .innerJoin(beers, and(eq(userBeerTastings.beerId, beers.id), eq(beers.breweryId, breweryId)))
        .leftJoin(users, eq(userBeerTastings.userId, users.id))
        .where(sql`${userBeerTastings.rating} IS NOT NULL`)
        .orderBy(desc(userBeerTastings.tastedAt))
        .limit(20);
      res.json({ reviews });
    } catch (error) {
      console.error("Error fetching admin brewery reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Admin: create beer for any brewery
  app.post('/api/admin/brewery/:id/beers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const { collaborationBreweryIds, isCollaboration, ...bodyData } = req.body;
      const beer = await storage.createBeer({ ...bodyData, breweryId });
      const collabIds = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
      if (collabIds.length > 0) {
        for (const brewId of collabIds) {
          await db.insert(beerCollaborations).values({ beerId: beer.id, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        try { await db.execute(sql`UPDATE beers SET is_collaboration = true WHERE id = ${beer.id}`); } catch {}
      }
      res.status(201).json(beer);
    } catch (error) {
      console.error("Error creating beer (admin):", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  // Admin: reply to any review
  app.patch('/api/admin/brewery/reviews/:reviewId/reply', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const { reply } = req.body;
      if (!reply || typeof reply !== 'string') return res.status(400).json({ message: "Testo risposta richiesto" });
      await db.update(userBeerTastings).set({ ownerReply: reply.trim(), ownerReplyAt: new Date() }).where(eq(userBeerTastings.id, reviewId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error replying to review (admin):", error);
      res.status(500).json({ message: "Failed to reply" });
    }
  });

  app.get('/api/admin/reviews/pending', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Mock pending reviews for now
      const pendingReviews: any[] = [];
      res.json(pendingReviews);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      res.status(500).json({ message: "Failed to fetch pending reviews" });
    }
  });

  app.post('/api/admin/reviews/:id/:action', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const action = req.params.action;
      // Mock review action for now
      res.json({ success: true, action });
    } catch (error) {
      console.error("Error processing review:", error);
      res.status(500).json({ message: "Failed to process review" });
    }
  });

  // Rating routes
  app.post("/api/ratings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { pubId, rating } = req.body;
      const ratingRecord = await storage.addRating({ userId, pubId, rating });
      res.status(201).json(ratingRecord);
    } catch (error) {
      console.error("Error adding rating:", error);
      res.status(500).json({ message: "Failed to add rating" });
    }
  });

  app.get("/api/pubs/:id/ratings", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const ratings = await storage.getRatingsByPub(pubId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Image upload routes
  app.post('/api/upload/image', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ message: 'Servizio immagini non configurato. Contatta l\'amministratore.' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Nessun file fornito' });
      }

      const folder = req.body.folder || 'general';
      const imageUrl = await uploadImage(req.file.buffer, folder);

      res.json({ url: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Errore durante l\'upload dell\'immagine' });
    }
  });


  // Get global beer statistics
  app.get('/api/stats/global', async (req, res) => {
    try {
      const [beerCount, breweryCount, pubCount, userCount, styleCount, reviewCount, pubEventCount, breweryEventCount, topStyles, topBreweries] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)::int` }).from(beers).where(beerVisibleSql),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries).where(breweryActiveSql),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
        db.select({ count: sql<number>`COUNT(DISTINCT style)::int` }).from(beers).where(beerVisibleSql),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubEvents),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweryEvents),
        db.select({ style: beers.style, count: sql<number>`COUNT(*)::int` })
          .from(beers).where(beerVisibleSql).groupBy(beers.style).orderBy(sql`COUNT(*) desc`).limit(10),
        db.select({
            breweryName: breweries.name,
            location: breweries.location,
            beerCount: sql<number>`COUNT(${beers.id})::int`
          })
          .from(breweries)
          .leftJoin(beers, and(eq(breweries.id, beers.breweryId), sql`COALESCE(${beers.isDiscontinued}, false) = false`))
          .where(breweryActiveSql)
          .groupBy(breweries.id, breweries.name, breweries.location)
          .orderBy(sql`COUNT(${beers.id}) desc`)
          .limit(10),
      ]);

      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json({
        totalBeers: beerCount[0]?.count || 0,
        totalBreweries: breweryCount[0]?.count || 0,
        totalPubs: pubCount[0]?.count || 0,
        totalUsers: userCount[0]?.count || 0,
        totalReviews: reviewCount[0]?.count || 0,
        totalEvents: (pubEventCount[0]?.count || 0) + (breweryEventCount[0]?.count || 0),
        uniqueStyles: styleCount[0]?.count || 0,
        topStyles,
        topBreweries,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
      res.status(500).json({ message: "Failed to fetch global statistics" });
    }
  });

  app.get('/api/recent-tap-changes', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const results = await db
        .selectDistinctOn([notifications.pubId, notifications.beerId], {
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          pubId: notifications.pubId,
          beerId: notifications.beerId,
          createdAt: notifications.createdAt,
          pubName: pubs.name,
          pubCity: pubs.city,
          pubLatitude: pubs.latitude,
          pubLongitude: pubs.longitude,
        })
        .from(notifications)
        .innerJoin(pubs, eq(notifications.pubId, pubs.id))
        .where(
          sql`${notifications.type} IN ('new_beer', 'tap_change') AND ${notifications.createdAt} > NOW() - INTERVAL '30 days'`
        )
        .orderBy(notifications.pubId, notifications.beerId, sql`${notifications.createdAt} DESC`)
        .limit(limit);

      const sorted = results.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      res.json(sorted);
    } catch (error) {
      console.error("Error fetching recent tap changes:", error);
      res.status(500).json({ message: "Failed to fetch recent tap changes" });
    }
  });

  // Flexible pricing system endpoints (owner or admin)
  app.post("/api/pubs/:id/taplist/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      const { prices } = req.body;
      
      // Convert prices array to object for JSON storage
      const priceObject = prices.reduce((acc: any, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});

      const updatedItem = await storage.updateTapListItem(itemId, { prices: priceObject });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating tap item prices:", error);
      res.status(500).json({ message: "Failed to update tap item prices" });
    }
  });

  // Beer replacement endpoints (owner or admin)
  app.patch("/api/pubs/:id/taplist/:itemId/replace", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      const { newBeerId } = req.body;
      
      const updatedItem = await storage.updateTapListItem(itemId, { beerId: newBeerId });

      const newBeer = await storage.getBeer(newBeerId);
      if (newBeer) {
        notifyTapListChange(pubId, 'tap_change', newBeer.name, newBeer.id);
        // Wishlist: gate on the POST-update active state so a simultaneous deactivation doesn't alert
        const tapPostActive = (updatedItem as any)?.isActive !== false;
        if (tapPostActive) {
          storage.getPub(pubId).then((pub) => {
            if (pub) notifyWishlistBeerAvailable(pubId, newBeerId, newBeer.name, pub, new Set(), 'tap');
          }).catch(() => {});
        }
      }

      broadcastPubUpdate(pubId, "taplist");
      _memCache.delete("home:taplist-activity");
      _memCache.delete(`stats-extended:${pubId}`);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error replacing beer:", error);
      res.status(500).json({ message: "Failed to replace beer" });
    }
  });

  // Same for bottles (owner or admin)
  app.post("/api/pubs/:id/bottles/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      const { prices } = req.body;
      
      const priceObject = prices.reduce((acc: any, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});

      const updatedItem = await storage.updateBottleItem(itemId, { prices: priceObject });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating bottle item prices:", error);
      res.status(500).json({ message: "Failed to update bottle item prices" });
    }
  });

  app.patch("/api/pubs/:id/bottles/:itemId/replace", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      const { newBeerId } = req.body;

      // Check if the bottle slot is currently active before notifying
      const existingBottleSlot = await pool.query(
        `SELECT is_active FROM bottle_list WHERE id = $1`, [itemId]
      ).then((r: any) => r.rows[0]).catch(() => null);

      const updatedItem = await storage.updateBottleItem(itemId, { beerId: newBeerId });

      // Notify wishlist users for the new beer if the slot is active
      if (existingBottleSlot?.is_active !== false && newBeerId) {
        const newBeer = await storage.getBeer(newBeerId);
        const pub = await storage.getPub(pubId);
        if (newBeer && pub) {
          notifyWishlistBeerAvailable(pubId, newBeerId, newBeer.name, pub, new Set(), 'bottle');
        }
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error replacing bottle beer:", error);
      res.status(500).json({ message: "Failed to replace bottle beer" });
    }
  });

  // Menu categories CRUD endpoints (owner or admin)
  app.post("/api/pubs/:id/menu/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const category = await storage.createMenuCategory({ ...req.body, pubId });
      res.json(category);
    } catch (error) {
      console.error("Error creating menu category:", error);
      res.status(500).json({ message: "Failed to create menu category" });
    }
  });

  app.patch("/api/pubs/:id/menu/categories/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(String(req.params.categoryId));
      const category = await storage.updateMenuCategory(categoryId, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating menu category:", error);
      res.status(500).json({ message: "Failed to update menu category" });
    }
  });

  app.delete("/api/pubs/:id/menu/categories/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(String(req.params.categoryId));
      await storage.deleteMenuCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu category:", error);
      res.status(500).json({ message: "Failed to delete menu category" });
    }
  });

  // Menu items CRUD endpoints (owner or admin)
  app.post("/api/pubs/:id/menu/categories/:categoryId/items", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(String(req.params.categoryId));
      const item = await storage.createMenuItem({ ...req.body, categoryId });
      res.json(item);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.patch("/api/pubs/:id/menu/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      const item = await storage.updateMenuItem(itemId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/pubs/:id/menu/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(String(req.params.id));
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(String(req.params.itemId));
      await storage.deleteMenuItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // User beer tastings endpoints
  app.get("/api/user/beer-tastings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tastings = await storage.getUserBeerTastings(userId);
      res.json(tastings);
    } catch (error) {
      console.error("Error fetching user beer tastings:", error);
      res.status(500).json({ message: "Failed to fetch beer tastings" });
    }
  });

  app.post("/api/user/beer-tastings", isAuthenticated, checkinRateLimit, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tastingData = { ...req.body, userId };
      const tasting = await storage.addBeerTasting(tastingData);
      res.status(201).json(tasting);

      // Bust brewery stats cache for the affected brewery (fire-and-forget)
      if (tastingData.beerId) {
        pool.query(`SELECT brewery_id FROM beers WHERE id = $1`, [tastingData.beerId])
          .then(r => { if (r.rows[0]?.brewery_id) bustBreweryStats(r.rows[0].brewery_id); })
          .catch(() => {});
      }

      // Notify followers asynchronously
      try {
        const user = req.user as any;
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.nickname || "Qualcuno";
        const beerId = tastingData.beerId;
        const pubId = tastingData.pubId;

        let beerName = "una birra";
        let pubName: string | null = null;

        if (beerId) {
          const beerRow = await pool.query(`SELECT name FROM beers WHERE id = $1`, [beerId]);
          if (beerRow.rows[0]) beerName = beerRow.rows[0].name;
        }
        if (pubId) {
          const pubRow = await pool.query(`SELECT name FROM pubs WHERE id = $1`, [pubId]);
          if (pubRow.rows[0]) pubName = pubRow.rows[0].name;
        }

        const { rows: followers } = await pool.query(
          `SELECT follower_id FROM user_follows WHERE following_id = $1`,
          [userId]
        );

        const body = pubName
          ? `${displayName} sta bevendo ${beerName} al ${pubName}`
          : `${displayName} sta bevendo ${beerName}`;

        for (const { follower_id } of followers) {
          sendPushToUser(follower_id, {
            title: "🍺 Check-in amico",
            body,
            url: `/user/${user.nickname}`,
            type: "checkin",
            tag: `checkin-${userId}`,
            category: 'newFollowers',
          });
        }
      } catch (pushErr) {
        console.error("Error sending checkin push:", pushErr);
      }
    } catch (error) {
      console.error("Error adding beer tasting:", error);
      res.status(500).json({ message: "Failed to add beer tasting" });
    }
  });

  // Upload tasting photo (second registration point)
  app.post("/api/user/beer-tastings/upload-photo", isAuthenticated, (req: any, res) => {
    upload.single('photo')(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: "Upload error: " + err.message });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      try {
        const photoUrl = await uploadImage(req.file.path, 'tasting-photos');
        res.json({ photoUrl });
      } catch (error) {
        console.error("Error uploading tasting photo:", error);
        res.status(500).json({ message: "Failed to upload photo" });
      }
    });
  });

  app.delete("/api/user/beer-tastings/:beerId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const beerId = parseInt(req.params.beerId);
      await storage.removeBeerTasting(userId, beerId);
      res.status(200).json({ success: true });

      // Bust brewery stats cache for the affected brewery (fire-and-forget)
      pool.query(`SELECT brewery_id FROM beers WHERE id = $1`, [beerId])
        .then(r => { if (r.rows[0]?.brewery_id) bustBreweryStats(r.rows[0].brewery_id); })
        .catch(() => {});
    } catch (error) {
      console.error("Error removing beer tasting:", error);
      res.status(500).json({ message: "Failed to remove beer tasting" });
    }
  });


  // Get user's available roles
  app.get("/api/auth/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const rolesData = await storage.getUserRoles(userId);
      res.json(rolesData);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Switch user's active role
  app.post("/api/auth/switch-role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const validRoles = ["customer", "pub_owner", "brewery_owner", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.switchUserRole(userId, role);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error switching user role:", error);
      if (error.message === "User does not have permission for this role") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  // Update nickname (with 15-day limit)
  app.patch("/api/auth/user/nickname", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { nickname } = req.body;
      
      const user = await storage.getUser(userId);
      if (user?.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          return res.status(400).json({ 
            message: `Puoi cambiare il nickname tra ${Math.ceil(15 - daysDiff)} giorni` 
          });
        }
      }
      
      const updatedUser = await storage.updateUserNickname(userId, nickname);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Failed to update nickname" });
    }
  });

  // Get user's tasting for specific beer
  app.get("/api/beers/:beerId/user-tasting", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const beerId = parseInt(req.params.beerId);
      const tasting = await storage.getUserBeerTasting(userId, beerId);
      res.json(tasting);
    } catch (error) {
      console.error("Error fetching user beer tasting:", error);
      res.status(500).json({ message: "Failed to fetch user beer tasting" });
    }
  });


  // Backward-compat: scrive nel nuovo content_reports
  app.post("/api/reviews/:tastingId/report", isAuthenticated, async (req: any, res) => {
    try {
      const reporterId = (req.user as any).id;
      const tastingId = parseInt(req.params.tastingId);
      const { reason, description } = req.body;
      if (!reason) return res.status(400).json({ message: "Motivo obbligatorio" });
      const dup = await pool.query(
        `SELECT id FROM content_reports WHERE target_type = 'review' AND target_id = $1 AND reporter_id = $2 AND status = 'pending'`,
        [tastingId, reporterId],
      );
      if (dup.rowCount && dup.rowCount > 0) {
        return res.json({ message: "Segnalazione già inviata", duplicate: true });
      }
      await pool.query(
        `INSERT INTO content_reports (target_type, target_id, reporter_id, reason, description)
         VALUES ('review', $1, $2, $3, $4)`,
        [tastingId, reporterId, String(reason).slice(0, 50), description ? String(description).slice(0, 500) : null],
      );
      res.json({ message: "Segnalazione inviata con successo" });
    } catch (error) {
      console.error("Error reporting review:", error);
      res.status(500).json({ message: "Errore nell'invio della segnalazione" });
    }
  });

  // Update user email
  app.patch("/api/user/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { email } = req.body;

      // Validate email
      if (!email || email.trim().length === 0) {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user can update email (15-day restriction)
      const user = await storage.getUser(userId);
      if (user?.emailLastUpdated) {
        const lastUpdate = new Date(user.emailLastUpdated);
        const now = new Date();
        const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
        
        if (diffInDays < 15) {
          return res.status(400).json({ 
            message: `You can only update your email every 15 days. Try again in ${15 - diffInDays} days.` 
          });
        }
      }

      const updatedUser = await storage.updateUser(userId, { 
        email: email.trim(),
        emailLastUpdated: new Date()
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  // Delete user account
  app.delete("/api/user/delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;

      // Cascade delete child records in FK-dependency order
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      await db.delete(favorites).where(eq(favorites.userId, userId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.userId, userId));
      await db.delete(ratings).where(eq(ratings.userId, userId));
      await db.delete(userActivities).where(eq(userActivities.userId, userId));
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, userId));

      // Delete pubs owned by this user — cascade through all child FK tables first
      await db.execute(sql`DELETE FROM menu_items WHERE category_id IN (SELECT id FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId}))`);
      await db.execute(sql`DELETE FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM tap_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM bottle_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM pub_sizes WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM ratings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM user_beer_tastings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.delete(pubs).where(eq(pubs.ownerId, userId));
      // Brewery stays in DB (data preserved) — no owner link

      // Delete registration requests
      await db.delete(publicanRequests).where(eq(publicanRequests.userId, userId));
      await db.delete(breweryRequests).where(eq(breweryRequests.userId, userId));

      // Delete the user
      await db.delete(users).where(eq(users.id, userId));

      req.logout(() => {
        req.session.destroy(() => {
          res.json({ message: "Account deleted successfully" });
        });
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });

  // Search beers for admin (global search - multi-word, includes brewery name)
  app.get("/api/admin/beers/search", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: query = '', limit = 50 } = req.query;
      const queryStr = query.toString().trim();
      const limitNum = Math.min(parseInt(limit.toString()) || 50, 100);

      if (!queryStr) return res.json([]);

      const searchTerms = queryStr.toLowerCase().split(/\s+/).filter((t: string) => t.length > 0);
      
      const whereClauses = searchTerms.map((term: string) => {
        const p = `%${term}%`;
        return sql`(LOWER(b.name) LIKE ${p} OR LOWER(b.style) LIKE ${p} OR LOWER(br.name) LIKE ${p} OR LOWER(br.location) LIKE ${p})`;
      });

      const results = await db.execute(sql`
        SELECT 
          b.id, b.name, b.style, b.abv, b.ibu, b.color, b.image_url AS "imageUrl",
          b.is_gluten_free AS "isGlutenFree", b.is_alcohol_free AS "isAlcoholFree",
          b.description, b.brewery_id AS "breweryId",
          JSON_BUILD_OBJECT(
            'id', br.id, 'name', br.name, 'location', br.location, 
            'country', br.country, 'logoUrl', br.logo_url
          ) AS brewery
        FROM beers b
        LEFT JOIN breweries br ON b.brewery_id = br.id
        WHERE ${sql.join(whereClauses, sql` AND `)}
        ORDER BY b.name ASC
        LIMIT ${limitNum}
      `);

      res.json(results.rows);
    } catch (error) {
      console.error("Error searching beers:", error);
      res.status(500).json({ message: "Failed to search beers" });
    }
  });

  // Search breweries for admin (global search - multi-word)
  app.get("/api/admin/breweries/search", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const queryStr = String(req.query.q || '').trim();
      const limitNum = Math.min(parseInt(String(req.query.limit || '50')), 100);

      if (!queryStr) return res.json([]);

      const searchTerms = queryStr.toLowerCase().split(/\s+/).filter((t: string) => t.length > 0);
      
      const whereClauses = searchTerms.map(term => {
        const p = `%${term}%`;
        return sql`(LOWER(name) LIKE ${p} OR LOWER(location) LIKE ${p} OR LOWER(country) LIKE ${p} OR LOWER(region) LIKE ${p})`;
      });

      const results = await db.select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        country: breweries.country,
        region: breweries.region,
        logoUrl: breweries.logoUrl,
        coverImageUrl: breweries.coverImageUrl,
        websiteUrl: breweries.websiteUrl,
      }).from(breweries)
        .where(sql.join(whereClauses, sql` AND `))
        .orderBy(breweries.name)
        .limit(limitNum);
      
      res.json(results);
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  // Admin delete beer (cleans up related tap list, bottle list, tastings)
  app.delete("/api/admin/beers/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer) {
        return res.status(404).json({ message: "Birra non trovata" });
      }
      await db.delete(tapList).where(eq(tapList.beerId, beerId));
      await db.delete(bottleList).where(eq(bottleList.beerId, beerId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.beerId, beerId));
      await db.delete(favorites).where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beerId)));
      // Null-out notifications (FK with NO ACTION — must clear manually)
      await db.execute(sql`UPDATE notifications SET beer_id = NULL WHERE beer_id = ${beerId}`);
      await storage.deleteBeer(beerId);
      res.json({ message: `Birra "${beer.name}" eliminata con successo` });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione della birra" });
    }
  });

  // Admin delete brewery (also deletes its beers and their references)
  app.delete("/api/admin/breweries/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const brewery = await storage.getBrewery(breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Birrificio non trovato" });
      }
      const breweryBeers = await storage.getBeersByBrewery(breweryId);
      for (const beer of breweryBeers) {
        await db.delete(tapList).where(eq(tapList.beerId, beer.id));
        await db.delete(bottleList).where(eq(bottleList.beerId, beer.id));
        await db.delete(userBeerTastings).where(eq(userBeerTastings.beerId, beer.id));
        await db.delete(favorites).where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beer.id)));
        await db.execute(sql`UPDATE notifications SET beer_id = NULL WHERE beer_id = ${beer.id}`);
        await storage.deleteBeer(beer.id);
      }
      // Clear brewery FK references before deleting (all NO ACTION constraints)
      await db.execute(sql`UPDATE notifications SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE users SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE brewery_requests SET existing_brewery_id = NULL WHERE existing_brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE addition_requests SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.delete(favorites).where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
      await storage.deleteBrewery(breweryId);
      res.json({ message: `Birrificio "${brewery.name}" e ${breweryBeers.length} birre eliminate con successo` });
    } catch (error) {
      console.error("Error deleting brewery:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione del birrificio" });
    }
  });

  // Admin delete pub (cleans up related data)
  app.delete("/api/admin/pubs/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const pub = await storage.getPub(pubId);
      if (!pub) {
        return res.status(404).json({ message: "Pub non trovato" });
      }
      await db.delete(tapList).where(eq(tapList.pubId, pubId));
      await db.delete(bottleList).where(eq(bottleList.pubId, pubId));
      const cats = await db.select().from(menuCategories).where(eq(menuCategories.pubId, pubId));
      for (const cat of cats) {
        await db.delete(menuItems).where(eq(menuItems.categoryId, cat.id));
      }
      await db.delete(menuCategories).where(eq(menuCategories.pubId, pubId));
      await db.delete(pubSizes).where(eq(pubSizes.pubId, pubId));
      await db.delete(favorites).where(and(eq(favorites.itemType, 'pub'), eq(favorites.itemId, pubId)));
      await db.delete(pubEvents).where(eq(pubEvents.pubId, pubId));
      await db.delete(ratings).where(eq(ratings.pubId, pubId));
      // Null-out FK references with NO ACTION
      await db.execute(sql`UPDATE notifications SET pub_id = NULL WHERE pub_id = ${pubId}`);
      await db.execute(sql`UPDATE user_beer_tastings SET pub_id = NULL WHERE pub_id = ${pubId}`);
      // Null-out any legacy pub_id on users table (may exist on VPS schema)
      try { await db.execute(sql`UPDATE users SET pub_id = NULL WHERE pub_id = ${pubId}`); } catch (_) {}
      // Null-out any legacy pub_id on sessions table (may exist on VPS schema)
      try { await db.execute(sql`UPDATE sessions SET pub_id = NULL WHERE pub_id = ${pubId}`); } catch (_) {}
      // pub_page_views may not have ON DELETE CASCADE on older VPS schema — delete explicitly
      try { await db.delete(pubPageViews).where(eq(pubPageViews.pubId, pubId)); } catch (_) {}
      await storage.deletePub(pubId);
      res.json({ message: `Pub "${pub.name}" eliminato con successo` });
    } catch (error: any) {
      console.error("Error deleting pub:", error);
      const detail = error?.detail || error?.message || "Errore sconosciuto";
      const hint = error?.table ? ` (tabella: ${error.table})` : "";
      res.status(500).json({ message: `Impossibile eliminare il pub: ${detail}${hint}` });
    }
  });

  app.get("/api/owner/breweries/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { q: query = '' } = req.query;
      const allBreweries = await storage.getBreweries();
      const filtered = allBreweries.filter(b =>
        b.name.toLowerCase().includes(query.toString().toLowerCase()) ||
        b.location?.toLowerCase().includes(query.toString().toLowerCase())
      ).slice(0, 20);
      res.json(filtered);
    } catch (error) {
      console.error("Error searching breweries (owner):", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  app.post("/api/owner/breweries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { name, location } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: "Nome e località sono obbligatori" });
      }

      const brewery = await storage.createBrewery({
        name: name.trim(),
        location: location.trim(),
        region: req.body.region?.trim() || "",
        description: req.body.description?.trim() || null,
        websiteUrl: req.body.websiteUrl?.trim() || null,
        logoUrl: req.body.logoUrl?.trim() || null,
        coverImageUrl: req.body.coverImageUrl?.trim() || null,
      });
      res.json(brewery);
    } catch (error) {
      console.error("Error creating brewery (owner):", error);
      res.status(500).json({ message: "Failed to create brewery" });
    }
  });

  app.post("/api/owner/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { name, breweryId, style, abv } = req.body;
      if (!name || !breweryId || !style) {
        return res.status(400).json({ message: "Nome, birrificio e stile sono obbligatori" });
      }

      const beer = await storage.createBeer({
        name: name.trim(),
        breweryId: parseInt(breweryId),
        style: style.trim(),
        abv: abv ? String(abv) : null,
        ibu: req.body.ibu ? parseInt(req.body.ibu) : null,
        description: req.body.description?.trim() || null,
        imageUrl: req.body.imageUrl?.trim() || null,
        isGlutenFree: req.body.isGlutenFree === true,
        isAlcoholFree: req.body.isAlcoholFree === true,
      });
      clearSearchCache();
      res.json(beer);
    } catch (error) {
      console.error("Error creating beer (owner):", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  // Pub owner: update beer description (only for non-verified-brewery beers)
  app.patch("/api/owner/beers/:id/description", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin') && user.activeRole !== 'pub_owner')) {
        return res.status(403).json({ message: "Pub owner access required" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeerWithBrewery(beerId);
      if (!beer) return res.status(404).json({ message: "Birra non trovata" });
      if (beer.brewery?.isVerified && user.activeRole !== 'admin') {
        return res.status(403).json({ message: "Non puoi modificare la descrizione di birre di birrifici verificati" });
      }
      const { description } = req.body;
      const updated = await storage.updateBeer(beerId, { description: description?.trim() ?? null });
      clearSearchCache();
      res.json(updated);
    } catch (error) {
      console.error("Error updating beer description (owner):", error);
      res.status(500).json({ message: "Failed to update beer description" });
    }
  });

  // Pub owner: full beer update (name, style, abv, ibu, color, description, imageUrl, isGlutenFree, isAlcoholFree, isCollaboration)
  app.patch("/api/owner/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin') && user.activeRole !== 'pub_owner')) {
        return res.status(403).json({ message: "Pub owner access required" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeerWithBrewery(beerId);
      if (!beer) return res.status(404).json({ message: "Birra non trovata" });
      // Only block editing if brewery is verified AND user is not admin
      if (beer.brewery?.isVerified && !user.roles?.includes('admin') && user.activeRole !== 'admin') {
        return res.status(403).json({ message: "Non puoi modificare birre di birrifici verificati" });
      }
      const { collaborationBreweryIds, isCollaboration, ...updates } = req.body;
      const allowed = ['name','style','abv','ibu','color','description','imageUrl','isGlutenFree','isAlcoholFree'];
      const sanitized: Record<string, any> = {};
      for (const k of allowed) { if (k in updates) sanitized[k] = updates[k]; }
      const updated = await storage.updateBeer(beerId, sanitized);
      if (sanitized.imageUrl) {
        try { clipIndexBeer(beerId, sanitized.imageUrl); } catch { /* non-blocking */ }
      }
      if (collaborationBreweryIds !== undefined) {
        await db.delete(beerCollaborations).where(eq(beerCollaborations.beerId, beerId));
        const ids = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
        for (const brewId of ids) {
          await db.insert(beerCollaborations).values({ beerId, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        try { await db.execute(sql`UPDATE beers SET is_collaboration = ${ids.length > 0} WHERE id = ${beerId}`); } catch { /* non-blocking */ }
      }
      clearSearchCache();
      res.json(updated);
    } catch (error) {
      console.error("Error updating beer (owner):", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  // Create new beer (admin)
  app.post("/api/admin/beers", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { collaborationBreweryIds, isCollaboration, ...beerData } = req.body;
      const beer = await storage.createBeer(beerData);

      // Save collaboration breweries if provided
      const collabIds = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
      if (collabIds.length > 0) {
        for (const brewId of collabIds) {
          await db.insert(beerCollaborations).values({ beerId: beer.id, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        try {
          await db.execute(sql`UPDATE beers SET is_collaboration = true WHERE id = ${beer.id}`);
        } catch { /* column may not exist on older DB, non-blocking */ }
      }

      clearSearchCache();
      res.json(beer);
    } catch (error) {
      console.error("Error creating beer:", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  // Create new brewery (admin)
  app.post("/api/admin/breweries", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const brewery = await storage.createBrewery(req.body);
      res.json(brewery);
    } catch (error) {
      console.error("Error creating brewery:", error);
      res.status(500).json({ message: "Failed to create brewery" });
    }
  });

  // Create new pub (admin)
  app.post("/api/admin/pubs", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const pub = await storage.createPub(req.body);
      res.json(pub);
    } catch (error) {
      console.error("Error creating pub:", error);
      res.status(500).json({ message: "Failed to create pub" });
    }
  });

  // Admin recent activity (real data from DB)
  app.get("/api/admin/recent-activity", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '10')), 100);
      const typeFilter = req.query.type as string | undefined;
      const fetchAll = !typeFilter || typeFilter === 'all';
      const perType = Math.max(limit, 20);

      const activities: any[] = [];

      if (fetchAll || typeFilter === 'user') {
        const recentUsers = await db.select({ id: users.id, nickname: users.nickname, firstName: users.firstName, createdAt: users.createdAt, userType: users.userType })
          .from(users).orderBy(desc(users.createdAt)).limit(perType);
        for (const u of recentUsers) {
          activities.push({ type: 'user', action: u.userType === 'pub_owner' ? 'Nuovo pub owner registrato' : u.userType === 'brewery_owner' ? 'Nuovo brewery owner registrato' : 'Nuovo utente registrato', name: u.nickname || u.firstName || 'Utente', detail: u.userType, time: u.createdAt, icon: 'user', link: '/admin/users' });
        }
      }

      if (fetchAll || typeFilter === 'pub') {
        const recentPubs = await db.select({ id: pubs.id, name: pubs.name, createdAt: pubs.createdAt, city: pubs.city })
          .from(pubs).orderBy(desc(pubs.createdAt)).limit(perType);
        for (const p of recentPubs) {
          activities.push({ type: 'pub', action: 'Nuovo pub registrato', name: p.name, detail: p.city, time: p.createdAt, icon: 'pub', itemId: p.id, link: `/pub/${p.id}` });
        }
      }

      if (fetchAll || typeFilter === 'brewery') {
        const recentBreweries = await db.select({ id: breweries.id, name: breweries.name, createdAt: breweries.createdAt, location: breweries.location })
          .from(breweries).orderBy(desc(breweries.createdAt)).limit(perType);
        for (const b of recentBreweries) {
          activities.push({ type: 'brewery', action: 'Nuovo birrificio aggiunto', name: b.name, detail: b.location, time: b.createdAt, icon: 'brewery', itemId: b.id, link: `/brewery/${b.id}` });
        }
      }

      if (fetchAll || typeFilter === 'review') {
        const recentReviews = await db.select({
          id: userBeerTastings.id,
          beerId: userBeerTastings.beerId,
          rating: userBeerTastings.rating,
          tastedAt: userBeerTastings.tastedAt,
          beerName: beers.name,
          reviewerName: users.nickname,
          reviewerFirst: users.firstName,
        })
          .from(userBeerTastings)
          .innerJoin(beers, eq(beers.id, userBeerTastings.beerId))
          .innerJoin(users, eq(users.id, userBeerTastings.userId))
          .where(sql`${userBeerTastings.rating} IS NOT NULL`)
          .orderBy(desc(userBeerTastings.tastedAt))
          .limit(perType);
        for (const r of recentReviews) {
          activities.push({ type: 'review', action: `Recensione ${r.rating}★`, name: r.beerName, detail: `di ${r.reviewerName || r.reviewerFirst || 'Utente'}`, time: r.tastedAt, icon: 'review', itemId: r.beerId, link: `/beer/${r.beerId}` });
        }
      }

      if (fetchAll || typeFilter === 'event') {
        const recentPubEvents = await db.select({ id: pubEvents.id, pubId: pubEvents.pubId, title: pubEvents.title, createdAt: pubEvents.createdAt })
          .from(pubEvents).orderBy(desc(pubEvents.createdAt)).limit(perType);
        for (const e of recentPubEvents) {
          activities.push({ type: 'event', action: 'Nuovo evento pub', name: e.title, time: e.createdAt, icon: 'event', itemId: e.pubId, link: `/pub/${e.pubId}` });
        }

        const recentBreweryEvents = await db.select({ id: breweryEvents.id, breweryId: breweryEvents.breweryId, title: breweryEvents.title, createdAt: breweryEvents.createdAt })
          .from(breweryEvents).orderBy(desc(breweryEvents.createdAt)).limit(perType);
        for (const e of recentBreweryEvents) {
          activities.push({ type: 'event', action: 'Nuovo evento birrificio', name: e.title, time: e.createdAt, icon: 'event', itemId: e.breweryId, link: `/brewery/${e.breweryId}` });
        }
      }

      if (fetchAll || typeFilter === 'festival') {
        const recentFestivals = await db.select({ id: festivals.id, name: festivals.name, slug: festivals.slug, isActive: festivals.isActive, createdAt: festivals.paidAt })
          .from(festivals).orderBy(desc(festivals.id)).limit(perType);
        for (const f of recentFestivals) {
          activities.push({ type: 'festival', action: f.isActive ? 'Festival attivato' : 'Festival creato', name: f.name, time: f.createdAt, icon: 'festival', link: `/festival-dashboard` });
        }
      }

      activities.sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0;
        const tb = b.time ? new Date(b.time).getTime() : 0;
        return tb - ta;
      });

      res.json(activities.slice(0, limit));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Get all allergens
  app.get("/api/allergens", async (req, res) => {
    try {
      const allergens = await storage.getAllergens();
      res.json(allergens);
    } catch (error) {
      console.error("Error fetching allergens:", error);
      res.status(500).json({ message: "Failed to fetch allergens" });
    }
  });

  // ==================== NOTIFICATIONS ====================

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const filterType = typeof req.query.type === 'string' ? req.query.type : null;
      const limit = Math.min(200, parseInt(String(req.query.limit ?? '100'), 10) || 100);
      const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);
      // Filtro + paginazione DB-level (più efficienti su volumi grandi).
      const page = await storage.getNotifications(userId, { type: filterType, limit, offset });
      res.json(page);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      await db.delete(notifications).where(eq(notifications.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ message: "Failed to delete notifications" });
    }
  });

  // Notification preferences
  app.get("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      let prefs = await storage.getNotificationPreferences(userId);
      if (!prefs) {
        prefs = await storage.upsertNotificationPreferences(userId, {});
      }
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const prefs = await storage.upsertNotificationPreferences(userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Brewery request status
  app.get("/api/brewery/request-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const [request] = await db
        .select()
        .from(breweryRequests)
        .where(eq(breweryRequests.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(1);

      if (!request) {
        return res.json({ hasRequest: false });
      }

      res.json({
        hasRequest: true,
        status: request.status,
        breweryName: request.breweryName,
        adminNotes: request.adminNotes,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
      });
    } catch (error) {
      console.error("Error fetching brewery request status:", error);
      res.status(500).json({ message: "Failed to fetch request status" });
    }
  });

  // Brewery owner routes
  app.get("/api/brewery/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(404).json({ message: "Nessun birrificio associato" });
      }
      const brewery = await storage.getBrewery(user.breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Birrificio non trovato" });
      }
      const beerList = await storage.getBeersByBrewery(brewery.id);
      res.json({ brewery, beers: beerList });
    } catch (error) {
      console.error("Error fetching my brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  // Brewery stats for the owner dashboard
  app.get("/api/brewery/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) return res.status(404).json({ message: "Nessun birrificio" });
      const breweryId = user.breweryId;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [viewsWeek, viewsAllTime, topBeerRows, reviewsCount, favoritesCount] = await Promise.all([
        // Views last 7 days
        db.select({ total: sql<number>`COUNT(*)::int` })
          .from(beerViews)
          .innerJoin(beers, eq(beerViews.beerId, beers.id))
          .where(and(eq(beers.breweryId, breweryId), gte(beerViews.viewedAt, sevenDaysAgo))),
        // Views all time
        db.select({ total: sql<number>`COUNT(*)::int` })
          .from(beerViews)
          .innerJoin(beers, eq(beerViews.beerId, beers.id))
          .where(eq(beers.breweryId, breweryId)),
        // Top beer by views (last 30 days)
        db.select({ beerId: beerViews.beerId, beerName: beers.name, views: sql<number>`COUNT(*)::int` })
          .from(beerViews)
          .innerJoin(beers, eq(beerViews.beerId, beers.id))
          .where(and(eq(beers.breweryId, breweryId), gte(beerViews.viewedAt, thirtyDaysAgo)))
          .groupBy(beerViews.beerId, beers.name)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(3),
        // Total reviews
        db.select({ total: sql<number>`COUNT(*)::int` })
          .from(userBeerTastings)
          .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
          .where(and(eq(beers.breweryId, breweryId), sql`${userBeerTastings.rating} IS NOT NULL`)),
        // Total favorites on brewery's beers
        db.select({ total: sql<number>`COUNT(*)::int` })
          .from(favorites)
          .innerJoin(beers, sql`${favorites.itemId} = ${beers.id} AND ${favorites.itemType} = 'beer'`)
          .where(eq(beers.breweryId, breweryId)),
      ]);

      res.json({
        viewsWeek: viewsWeek[0]?.total || 0,
        viewsAllTime: viewsAllTime[0]?.total || 0,
        topBeers: topBeerRows,
        totalReviews: reviewsCount[0]?.total || 0,
        totalFavorites: favoritesCount[0]?.total || 0,
      });
    } catch (error) {
      console.error("Error fetching brewery stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Recent reviews for brewery owner dashboard
  app.get("/api/brewery/recent-reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) return res.status(404).json({ message: "Nessun birrificio" });

      const reviews = await db
        .select({
          id: userBeerTastings.id,
          beerId: userBeerTastings.beerId,
          beerName: beers.name,
          rating: userBeerTastings.rating,
          personalNotes: userBeerTastings.personalNotes,
          tastedAt: userBeerTastings.tastedAt,
          userId: userBeerTastings.userId,
          nickname: users.nickname,
          firstName: users.firstName,
          ownerReply: userBeerTastings.ownerReply,
          ownerReplyAt: userBeerTastings.ownerReplyAt,
        })
        .from(userBeerTastings)
        .innerJoin(beers, and(eq(userBeerTastings.beerId, beers.id), eq(beers.breweryId, user.breweryId)))
        .leftJoin(users, eq(userBeerTastings.userId, users.id))
        .where(sql`${userBeerTastings.rating} IS NOT NULL`)
        .orderBy(desc(userBeerTastings.tastedAt))
        .limit(20);

      res.json({ reviews });
    } catch (error) {
      console.error("Error fetching recent reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Reply to a review (brewery owner only)
  app.patch("/api/brewery/reviews/:reviewId/reply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) return res.status(403).json({ message: "Non sei un proprietario di birrificio" });
      const reviewId = parseInt(req.params.reviewId);
      const { reply } = req.body;
      if (!reply || typeof reply !== 'string') return res.status(400).json({ message: "Testo risposta richiesto" });

      // Verify the review is for one of this brewery's beers
      const [review] = await db
        .select({ id: userBeerTastings.id, beerId: userBeerTastings.beerId })
        .from(userBeerTastings)
        .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
        .where(and(eq(userBeerTastings.id, reviewId), eq(beers.breweryId, user.breweryId)));

      if (!review) return res.status(403).json({ message: "Recensione non trovata o non di tua pertinenza" });

      await db.update(userBeerTastings)
        .set({ ownerReply: reply.trim(), ownerReplyAt: new Date() })
        .where(eq(userBeerTastings.id, reviewId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error replying to review:", error);
      res.status(500).json({ message: "Failed to reply" });
    }
  });

  app.post("/api/brewery/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const { collaborationBreweryIds, isCollaboration, ...bodyData } = req.body;
      const beerData = { ...bodyData, breweryId: user.breweryId };
      const beer = await storage.createBeer(beerData);
      const collabIds = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
      if (collabIds.length > 0) {
        for (const brewId of collabIds) {
          await db.insert(beerCollaborations).values({ beerId: beer.id, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        try {
          await db.execute(sql`UPDATE beers SET is_collaboration = true WHERE id = ${beer.id}`);
        } catch { /* column may not exist on older DB */ }
      }
      clearSearchCache();
      res.status(201).json(beer);
    } catch (error) {
      console.error("Error creating beer:", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  app.patch("/api/brewery/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!user?.breweryId && effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer || (beer.breweryId !== user?.breweryId && effectiveRole !== 'admin')) {
        return res.status(403).json({ message: "Non puoi modificare questa birra" });
      }
      const { collaborationBreweryIds, isCollaboration, ...beerData } = req.body;
      const updated = await storage.updateBeer(beerId, beerData);
      const newImg = beerData.logoUrl || beerData.logo_url || beerData.imageUrl || beerData.image_url;
      if (newImg) clipIndexBeer(beerId, newImg);
      // Handle collaboration breweries
      if (collaborationBreweryIds !== undefined) {
        await db.delete(beerCollaborations).where(eq(beerCollaborations.beerId, beerId));
        const ids = Array.isArray(collaborationBreweryIds) ? collaborationBreweryIds : [];
        for (const brewId of ids) {
          await db.insert(beerCollaborations).values({ beerId, breweryId: Number(brewId) }).onConflictDoNothing();
        }
        try {
          await db.execute(sql`UPDATE beers SET is_collaboration = ${ids.length > 0} WHERE id = ${beerId}`);
        } catch { /* column may not exist on older DB */ }
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  app.delete("/api/brewery/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer || beer.breweryId !== user.breweryId) {
        return res.status(403).json({ message: "Non puoi eliminare questa birra" });
      }
      await storage.deleteBeer(beerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Failed to delete beer" });
    }
  });

  app.patch("/api/brewery/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const body = { ...req.body };
      // Converti stringa vuota → null per campi decimal (latitude/longitude)
      if (body.latitude === '' || body.latitude === undefined) body.latitude = null;
      if (body.longitude === '' || body.longitude === undefined) body.longitude = null;
      const updated = await storage.updateBrewery(user.breweryId, body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  // Brewery image upload
  app.post("/api/brewery/upload-image", isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Nessuna immagine caricata" });
      }
      const imageType = req.body.type || 'logo';
      const folder = imageType === 'cover' ? 'brewery-covers' : 'brewery-logos';
      const result = await uploadImage(req.file.buffer, folder);
      const updateData = imageType === 'cover'
        ? { coverImageUrl: result }
        : { logoUrl: result };
      const updated = await storage.updateBrewery(user.breweryId, updateData);
      res.json({ url: result, brewery: updated });
    } catch (error) {
      console.error("Error uploading brewery image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Push notification routes
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { endpoint, p256dh, auth } = req.body;
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Missing subscription data" });
      }
      await storage.createPushSubscription({ userId, endpoint, p256dh, auth });
      res.json({ success: true });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.post("/api/push/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const subs = await storage.getPushSubscriptionsByUser(userId);
      const nativeTokens = await storage.getNativePushTokensByUser(userId);
      if (subs.length === 0 && nativeTokens.length === 0) {
        return res.status(404).json({ message: "Nessuna sottoscrizione push trovata. Attiva prima le notifiche." });
      }
      console.log(`[push:test] userId=${userId} webSubs=${subs.length} nativeTokens=${nativeTokens.length}`);
      await sendPushToUserImmediate(userId, {
        title: "Fermenta.to - Test",
        body: "Le notifiche push funzionano correttamente! Riceverai avvisi quando i tuoi pub preferiti aggiornano le spine.",
        url: "/dashboard",
        type: "test",
        category: 'adminBroadcasts',
      });
      res.json({ success: true, subscriptions: subs.length, nativeTokens: nativeTokens.length });
    } catch (error) {
      console.error("Error sending test push:", error);
      res.status(500).json({ message: "Errore nell'invio della notifica di test" });
    }
  });

  app.get("/api/push/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const subs = await storage.getPushSubscriptionsByUser(userId);
      res.json({ subscribed: subs.length > 0, subscriptionCount: subs.length });
    } catch (error) {
      res.status(500).json({ message: "Errore nel controllo stato push" });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      } else {
        const userId = (req.user as any).id;
        await storage.deletePushSubscriptionsByUser(userId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Native push token (FCM/APNs via Capacitor)
  app.post("/api/push/native-token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { token, platform } = req.body;
      if (!token || !platform) return res.status(400).json({ message: "token e platform obbligatori" });
      await storage.saveNativePushToken(userId, token, platform);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving native push token:", error);
      res.status(500).json({ message: "Errore salvataggio token nativo" });
    }
  });

  app.delete("/api/push/native-token", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "token obbligatorio" });
      await storage.deleteNativePushToken(token);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Errore eliminazione token nativo" });
    }
  });

  // ==================== Pub Events Routes ====================

  // GET upcoming events across all pubs (public)
  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  // GET unified public events discovery (pub + brewery), with filters & pagination
  app.get("/api/events/public", async (req, res) => {
    try {
      const q        = ((req.query.q as string)        || "").trim();
      const category = ((req.query.category as string) || "").trim();
      const city     = ((req.query.city as string)     || "").trim();
      const source   = ((req.query.source as string)   || "all").trim(); // all|pub|brewery
      const fromStr  = (req.query.from as string)      || "";
      const toStr    = (req.query.to as string)        || "";
      const limit    = Math.min(parseInt(req.query.limit as string)  || 30, 500);
      const offset   = Math.max(parseInt(req.query.offset as string) || 0, 0);

      // Default: from "now" forward (only upcoming/ongoing).
      const fromDate = fromStr ? new Date(fromStr) : new Date();
      const toDate   = toStr   ? new Date(toStr)   : null;

      const qLike    = q     ? `%${q.toLowerCase()}%`    : null;
      const cityLike = city  ? `%${city.toLowerCase()}%` : null;
      const catVal   = category || null;
      const includePub     = source === "all" || source === "pub";
      const includeBrewery = source === "all" || source === "brewery";

      const rows = await db.execute(sql`
        WITH evts AS (
          ${includePub ? sql`
          SELECT
            'pub'::text AS source_type,
            e.id, e.title, e.description, e.category,
            e.event_date AS "eventDate", e.end_date AS "endDate",
            e.image_url  AS "imageUrl",  e.created_at AS "createdAt",
            p.id   AS "venueId",
            p.name AS "venueName",
            p.slug AS "venueSlug",
            p.city AS "venueCity",
            p.logo_url AS "venueLogoUrl",
            p.latitude AS "venueLatitude",
            p.longitude AS "venueLongitude"
          FROM pub_events e
          INNER JOIN pubs p ON p.id = e.pub_id
          WHERE e.is_published = true
            AND COALESCE(e.end_date, e.event_date + INTERVAL '12 hours') >= ${fromDate}
            ${toDate    ? sql`AND e.event_date <= ${toDate}`           : sql``}
            ${qLike     ? sql`AND (LOWER(e.title) LIKE ${qLike} OR LOWER(COALESCE(e.description,'')) LIKE ${qLike} OR LOWER(p.name) LIKE ${qLike})` : sql``}
            ${cityLike  ? sql`AND LOWER(COALESCE(p.city,'')) LIKE ${cityLike}` : sql``}
            ${catVal    ? sql`AND e.category = ${catVal}`              : sql``}
          ` : sql`SELECT NULL::text AS source_type, NULL::int AS id, NULL::text AS title, NULL::text AS description, NULL::text AS category, NULL::timestamp AS "eventDate", NULL::timestamp AS "endDate", NULL::text AS "imageUrl", NULL::timestamp AS "createdAt", NULL::int AS "venueId", NULL::text AS "venueName", NULL::text AS "venueSlug", NULL::text AS "venueCity", NULL::text AS "venueLogoUrl", NULL::numeric AS "venueLatitude", NULL::numeric AS "venueLongitude" WHERE false`}
          UNION ALL
          ${includeBrewery ? sql`
          SELECT
            'brewery'::text AS source_type,
            e.id, e.title, e.description, e.category,
            e.event_date AS "eventDate", e.end_date AS "endDate",
            e.image_url  AS "imageUrl",  e.created_at AS "createdAt",
            br.id   AS "venueId",
            br.name AS "venueName",
            NULL::text AS "venueSlug",
            br.location AS "venueCity",
            br.logo_url AS "venueLogoUrl",
            br.latitude  AS "venueLatitude",
            br.longitude AS "venueLongitude"
          FROM brewery_events e
          INNER JOIN breweries br ON br.id = e.brewery_id
          WHERE e.is_published = true
            AND COALESCE(e.end_date, e.event_date + INTERVAL '12 hours') >= ${fromDate}
            ${toDate    ? sql`AND e.event_date <= ${toDate}`           : sql``}
            ${qLike     ? sql`AND (LOWER(e.title) LIKE ${qLike} OR LOWER(COALESCE(e.description,'')) LIKE ${qLike} OR LOWER(br.name) LIKE ${qLike})` : sql``}
            ${cityLike  ? sql`AND LOWER(COALESCE(br.location,'')) LIKE ${cityLike}` : sql``}
            ${catVal    ? sql`AND e.category = ${catVal}`              : sql``}
          ` : sql`SELECT NULL::text AS source_type, NULL::int AS id, NULL::text AS title, NULL::text AS description, NULL::text AS category, NULL::timestamp AS "eventDate", NULL::timestamp AS "endDate", NULL::text AS "imageUrl", NULL::timestamp AS "createdAt", NULL::int AS "venueId", NULL::text AS "venueName", NULL::text AS "venueSlug", NULL::text AS "venueCity", NULL::text AS "venueLogoUrl", NULL::numeric AS "venueLatitude", NULL::numeric AS "venueLongitude" WHERE false`}
        )
        SELECT *,
          (SELECT COUNT(*)::int FROM evts) AS total_count
        FROM evts
        ORDER BY "eventDate" ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const all = ((rows as any).rows ?? rows) as any[];
      const totalCount = all.length > 0 ? Number(all[0].total_count) : 0;
      const events = all.map(({ total_count, ...rest }) => ({
        ...rest,
        sourceType: rest.source_type,
      }));
      res.json({ events, totalCount, limit, offset });
    } catch (err: any) {
      console.error("Error fetching public events:", err.message);
      res.status(500).json({ message: "Errore caricamento eventi" });
    }
  });

  // GET distinct cities that currently have published (upcoming/ongoing) events.
  // Used for the city autocomplete on the /eventi page.
  app.get("/api/events/cities", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").trim().toLowerCase();
      const qLike = q ? `%${q}%` : null;
      const rows = await db.execute(sql`
        SELECT city FROM (
          SELECT DISTINCT TRIM(p.city) AS city
          FROM pub_events e
          INNER JOIN pubs p ON p.id = e.pub_id
          WHERE e.is_published = true
            AND COALESCE(e.end_date, e.event_date + INTERVAL '12 hours') >= NOW()
            AND p.city IS NOT NULL AND TRIM(p.city) <> ''
          UNION
          SELECT DISTINCT TRIM(br.location) AS city
          FROM brewery_events e
          INNER JOIN breweries br ON br.id = e.brewery_id
          WHERE e.is_published = true
            AND COALESCE(e.end_date, e.event_date + INTERVAL '12 hours') >= NOW()
            AND br.location IS NOT NULL AND TRIM(br.location) <> ''
        ) c
        ${qLike ? sql`WHERE LOWER(c.city) LIKE ${qLike}` : sql``}
        ORDER BY city ASC
        LIMIT 50
      `);
      const all = ((rows as any).rows ?? rows) as any[];
      res.json({ cities: all.map((r) => r.city).filter(Boolean) });
    } catch (err: any) {
      console.error("Error fetching event cities:", err.message);
      res.status(500).json({ message: "Errore caricamento città" });
    }
  });

  // GET single event (pub or brewery), unified, public
  app.get("/api/events/:type/:id", async (req, res) => {
    try {
      const type = req.params.type;
      const id = parseInt(req.params.id);
      if (Number.isNaN(id) || (type !== "pub" && type !== "brewery")) {
        return res.status(400).json({ message: "Parametri non validi" });
      }
      const rows = type === "pub"
        ? await db.execute(sql`
            SELECT 'pub'::text AS "sourceType",
              e.id, e.title, e.description, e.category,
              e.event_date AS "eventDate", e.end_date AS "endDate",
              e.image_url AS "imageUrl", e.is_published AS "isPublished",
              e.pub_id AS "venueId",
              p.name  AS "venueName", p.slug AS "venueSlug",
              p.address AS "venueAddress", p.city AS "venueCity",
              p.logo_url AS "venueLogoUrl",
              p.latitude AS "venueLatitude", p.longitude AS "venueLongitude"
            FROM pub_events e
            INNER JOIN pubs p ON p.id = e.pub_id
            WHERE e.id = ${id} AND e.is_published = true
            LIMIT 1
          `)
        : await db.execute(sql`
            SELECT 'brewery'::text AS "sourceType",
              e.id, e.title, e.description, e.category,
              e.event_date AS "eventDate", e.end_date AS "endDate",
              e.image_url AS "imageUrl", e.is_published AS "isPublished",
              e.brewery_id AS "venueId",
              br.name AS "venueName", NULL::text AS "venueSlug",
              br.location AS "venueAddress", br.location AS "venueCity",
              br.logo_url AS "venueLogoUrl",
              NULL::numeric AS "venueLatitude", NULL::numeric AS "venueLongitude"
            FROM brewery_events e
            INNER JOIN breweries br ON br.id = e.brewery_id
            WHERE e.id = ${id} AND e.is_published = true
            LIMIT 1
          `);
      const row = ((rows as any).rows ?? rows)[0];
      if (!row) return res.status(404).json({ message: "Evento non trovato" });
      res.json(row);
    } catch (err: any) {
      console.error("Error fetching event:", err.message);
      res.status(500).json({ message: "Errore" });
    }
  });

  // GET published events for a pub (public)
  app.get("/api/pubs/:pubId/events", async (req, res) => {
    try {
      const pubId = await resolvePubId(req.params.pubId);
      if (!pubId) {
        return res.status(404).json({ message: "Pub not found" });
      }
      const events = await storage.getPubEvents(pubId, true);
      const publishedEvents = events.filter(e => e.isPublished);
      res.json(publishedEvents);
    } catch (error) {
      console.error("Error fetching pub events:", error);
      res.status(500).json({ message: "Failed to fetch pub events" });
    }
  });

  // POST create event for a pub (authenticated pub owner or admin)
  app.post("/api/pubs/:pubId/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      if (isNaN(pubId)) {
        return res.status(400).json({ message: "Invalid pub ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to create events for this pub" });
      }

      const pub = await storage.getPub(pubId);
      if (!pub) {
        return res.status(404).json({ message: "Pub not found" });
      }

      const body = { ...req.body, pubId };
      if (body.eventDate && typeof body.eventDate === 'string') body.eventDate = new Date(body.eventDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const eventData = insertPubEventSchema.parse(body);
      const event = await storage.createPubEvent(eventData);

      // Send push notifications to users who favorited this pub
      try {
        const pubFavUserIds = await storage.getUsersWhoFavoritedPub(pubId);
        for (const favUserId of pubFavUserIds) {
          const prefs = await storage.getNotificationPreferences(favUserId);
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: favUserId, type: 'event', title: `Nuovo evento da ${pub.name}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId, beerId: null, isRead: false,
            urlPath: `/eventi/pub/${event.id}`,
          });
          sendPushToUser(favUserId, {
            title: `Nuovo evento da ${pub.name}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/eventi/pub/${event.id}`, type: 'event',
            icon: pub.logoUrl || undefined,
            category: 'events',
          });
        }
      } catch (notifError) {
        console.error("Error sending event notifications:", notifError);
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating pub event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH update event for a pub (authenticated pub owner or admin)
  app.patch("/api/pubs/:pubId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(pubId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid pub or event ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to update events for this pub" });
      }

      const existingEvent = await storage.getPubEvent(eventId);
      if (!existingEvent || existingEvent.pubId !== pubId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updateBody = { ...req.body };
      if (updateBody.eventDate && typeof updateBody.eventDate === 'string') updateBody.eventDate = new Date(updateBody.eventDate);
      if (updateBody.endDate && typeof updateBody.endDate === 'string') updateBody.endDate = new Date(updateBody.endDate);
      const updateData = insertPubEventSchema.partial().parse(updateBody);
      const updated = await storage.updatePubEvent(eventId, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error updating pub event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE event for a pub (authenticated pub owner or admin)
  app.delete("/api/pubs/:pubId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(pubId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid pub or event ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to delete events for this pub" });
      }

      const existingEvent = await storage.getPubEvent(eventId);
      if (!existingEvent || existingEvent.pubId !== pubId) {
        return res.status(404).json({ message: "Event not found" });
      }

      await storage.deletePubEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pub event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============================================================
  // BREWERY EVENTS ROUTES
  // ============================================================

  // GET all published events for a brewery (public)
  app.get("/api/breweries/:breweryId/events", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });
      const events = await db.select().from(breweryEvents)
        .where(and(
          eq(breweryEvents.breweryId, breweryId),
          eq(breweryEvents.isPublished, true),
          sql`COALESCE(${breweryEvents.endDate}, ${breweryEvents.eventDate}) + INTERVAL '12 hours' > NOW()`,
        ))
        .orderBy(asc(breweryEvents.eventDate));
      res.json(events);
    } catch (error) {
      console.error("Error fetching brewery events:", error);
      res.status(500).json({ message: "Failed to fetch brewery events" });
    }
  });

  // GET all events (including unpublished) for brewery owner dashboard
  app.get("/api/breweries/:breweryId/events/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const events = await db.select().from(breweryEvents)
        .where(eq(breweryEvents.breweryId, breweryId))
        .orderBy(breweryEvents.eventDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching brewery events:", error);
      res.status(500).json({ message: "Failed to fetch brewery events" });
    }
  });

  // POST create event for a brewery
  app.post("/api/breweries/:breweryId/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized to create events for this brewery" });

      const body = { ...req.body, breweryId };
      if (body.eventDate && typeof body.eventDate === 'string') body.eventDate = new Date(body.eventDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const eventData = insertBreweryEventSchema.parse(body);
      const [event] = await db.insert(breweryEvents).values(eventData).returning();

      // Send push notifications to users who favorited this brewery
      try {
        const [brewery] = await db.select().from(breweries).where(eq(breweries.id, breweryId));
        const favUsers = await db.select().from(favorites)
          .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
        for (const fav of favUsers) {
          const prefs = await storage.getNotificationPreferences(fav.userId);
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: fav.userId, type: 'event', title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId: null, beerId: null, breweryId, isRead: false,
            urlPath: `/eventi/brewery/${event.id}`,
          });
          sendPushToUser(fav.userId, {
            title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/eventi/brewery/${event.id}`, type: 'event',
            icon: brewery?.logoUrl || undefined,
            category: 'events',
          });
        }
      } catch (notifError) {
        console.error("Error sending brewery event notifications:", notifError);
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.issues });
      console.error("Error creating brewery event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH update event for a brewery
  app.patch("/api/breweries/:breweryId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(breweryId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const [existing] = await db.select().from(breweryEvents).where(eq(breweryEvents.id, eventId));
      if (!existing || existing.breweryId !== breweryId) return res.status(404).json({ message: "Event not found" });

      const updateBody = { ...req.body };
      if (updateBody.eventDate && typeof updateBody.eventDate === 'string') updateBody.eventDate = new Date(updateBody.eventDate);
      if (updateBody.endDate && typeof updateBody.endDate === 'string') updateBody.endDate = new Date(updateBody.endDate);
      const updateData = insertBreweryEventSchema.partial().parse(updateBody);
      const [updated] = await db.update(breweryEvents).set({ ...updateData, updatedAt: new Date() })
        .where(eq(breweryEvents.id, eventId)).returning();
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.issues });
      console.error("Error updating brewery event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE event for a brewery
  app.delete("/api/breweries/:breweryId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(breweryId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const [existing] = await db.select().from(breweryEvents).where(eq(breweryEvents.id, eventId));
      if (!existing || existing.breweryId !== breweryId) return res.status(404).json({ message: "Event not found" });

      await db.delete(breweryEvents).where(eq(breweryEvents.id, eventId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brewery event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============================================================
  // EVENT INTERESTS (pub + brewery events — chi è interessato)
  // ============================================================

  // GET interest count + user state for a pub event
  app.get("/api/pub-events/:eventId/interest", async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const count = await storage.getPubEventInterestCount(eventId);
      const userId = req.user?.id;
      const userInterested = userId ? await storage.getPubEventUserInterest(userId, eventId) : false;
      res.json({ count, userInterested });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interest" });
    }
  });

  // POST toggle interest for a pub event (authenticated)
  app.post("/api/pub-events/:eventId/interest", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const userId = (req.user as any).id;
      const interested = await storage.togglePubEventInterest(userId, eventId);
      const count = await storage.getPubEventInterestCount(eventId);
      res.json({ interested, count });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle interest" });
    }
  });

  // GET interest count + user state for a brewery event
  app.get("/api/brewery-events/:eventId/interest", async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const count = await storage.getBreweryEventInterestCount(eventId);
      const userId = req.user?.id;
      const userInterested = userId ? await storage.getBreweryEventUserInterest(userId, eventId) : false;
      res.json({ count, userInterested });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interest" });
    }
  });

  // POST toggle interest for a brewery event (authenticated)
  app.post("/api/brewery-events/:eventId/interest", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const userId = (req.user as any).id;
      const interested = await storage.toggleBreweryEventInterest(userId, eventId);
      const count = await storage.getBreweryEventInterestCount(eventId);
      res.json({ interested, count });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle interest" });
    }
  });

  // ============================================================
  // BEER REVIEWS (public tastings with user info)
  // ============================================================

  // GET public reviews for a beer (all tastings with a rating) — includes per-user review count for badges
  app.get("/api/beers/:beerId/reviews", async (req, res) => {
    try {
      const beerId = parseInt(req.params.beerId);
      if (isNaN(beerId)) return res.status(400).json({ message: "Invalid beer ID" });

      const currentUserId = (req.user as any)?.id || null;
      const reviews = await db
        .select({
          id: userBeerTastings.id,
          rating: userBeerTastings.rating,
          personalNotes: userBeerTastings.personalNotes,
          format: userBeerTastings.format,
          tastedAt: userBeerTastings.tastedAt,
          userId: userBeerTastings.userId,
          pubId: userBeerTastings.pubId,
          pubName: pubs.name,
          nickname: users.nickname,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          isPublic: users.isPublic,
          ownerReply: userBeerTastings.ownerReply,
          ownerReplyAt: userBeerTastings.ownerReplyAt,
          userReviewCount: sql<number>`(SELECT COUNT(*) FROM user_beer_tastings ubt WHERE ubt.user_id = ${userBeerTastings.userId} AND ubt.rating IS NOT NULL)`,
          photoUrl: sql<string | null>`"user_beer_tastings"."photo_url"`,
          likesCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_likes WHERE tasting_id = ${userBeerTastings.id})`,
          commentsCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_comments WHERE tasting_id = ${userBeerTastings.id})`,
          liked: currentUserId
            ? sql<boolean>`EXISTS(SELECT 1 FROM checkin_likes WHERE tasting_id = ${userBeerTastings.id} AND user_id = ${currentUserId})`
            : sql<boolean>`false`,
        })
        .from(userBeerTastings)
        .leftJoin(users, eq(userBeerTastings.userId, users.id))
        .leftJoin(pubs, eq(userBeerTastings.pubId, pubs.id))
        .where(and(eq(userBeerTastings.beerId, beerId), sql`${userBeerTastings.rating} IS NOT NULL`))
        .orderBy(desc(userBeerTastings.tastedAt));

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
        : null;

      // Rating distribution — bucket decimal ratings to nearest integer
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of reviews) {
        if (r.rating) {
          const bucket = Math.min(5, Math.max(1, Math.round(Number(r.rating))));
          distribution[bucket] = (distribution[bucket] || 0) + 1;
        }
      }

      res.json({
        reviews,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: reviews.length,
        distribution,
      });
    } catch (error) {
      console.error("Error fetching beer reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // GET brewery average rating (from all beer tastings)
  app.get("/api/breweries/:id/rating", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [ratingResult] = await db.select({
        avgRating: sql<number>`ROUND(AVG(${userBeerTastings.rating})::numeric, 1)`,
        reviewCount: sql<number>`COUNT(${userBeerTastings.rating})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(and(eq(beers.breweryId, breweryId), sql`${userBeerTastings.rating} IS NOT NULL`));

      res.json({
        avgRating: ratingResult?.avgRating ? parseFloat(String(ratingResult.avgRating)) : null,
        reviewCount: Number(ratingResult?.reviewCount || 0),
      });
    } catch (error) {
      console.error("Error fetching brewery rating:", error);
      res.status(500).json({ message: "Failed to fetch brewery rating" });
    }
  });

  // GET public user profile by nickname or id
  app.get("/api/users/:identifier/profile", async (req, res) => {
    try {
      const { identifier } = req.params;
      const currentUserId = (req.user as any)?.id;

      // Try nickname first, then id
      let [profile] = await db.select({
        id: users.id,
        nickname: users.nickname,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        favoriteStyles: users.favoriteStyles,
        joinedAt: users.joinedAt,
        isPublic: users.isPublic,
        userType: users.userType,
      }).from(users).where(eq(users.nickname, identifier));

      if (!profile) {
        [profile] = await db.select({
          id: users.id,
          nickname: users.nickname,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          bio: users.bio,
          favoriteStyles: users.favoriteStyles,
          joinedAt: users.joinedAt,
          isPublic: users.isPublic,
          userType: users.userType,
        }).from(users).where(eq(users.id, identifier));
      }

      if (!profile) return res.status(404).json({ message: "Utente non trovato" });

      const isOwner = currentUserId === profile.id;
      if (profile.isPublic === false && !isOwner) {
        return res.status(403).json({ message: "Questo profilo è privato" });
      }

      // Get review count and recent reviews
      const [countRow] = await db.select({
        count: sql<number>`COUNT(*)`,
      }).from(userBeerTastings)
        .where(and(eq(userBeerTastings.userId, profile.id), sql`${userBeerTastings.rating} IS NOT NULL`));
      const reviewCount = Number(countRow?.count || 0);

      const recentReviews = await db.select({
        id: userBeerTastings.id,
        rating: userBeerTastings.rating,
        personalNotes: userBeerTastings.personalNotes,
        tastedAt: userBeerTastings.tastedAt,
        beerId: userBeerTastings.beerId,
        beerName: beers.name,
        beerStyle: beers.style,
        beerImageUrl: beers.imageUrl,
        format: userBeerTastings.format,
        pubId: userBeerTastings.pubId,
        pubName: pubs.name,
        likesCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_likes WHERE tasting_id = ${userBeerTastings.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*)::int FROM checkin_comments WHERE tasting_id = ${userBeerTastings.id})`,
        liked: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM checkin_likes WHERE tasting_id = ${userBeerTastings.id} AND user_id = ${currentUserId})`
          : sql<boolean>`false`,
      })
      .from(userBeerTastings)
      .leftJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .leftJoin(pubs, eq(userBeerTastings.pubId, pubs.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${userBeerTastings.rating} IS NOT NULL`))
      .orderBy(desc(userBeerTastings.tastedAt))
      .limit(12);

      // Total tastings count (for achievements)
      const [tastingRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(userBeerTastings).where(eq(userBeerTastings.userId, profile.id));
      const tastingCount = Number(tastingRow?.count || 0);

      // Style counts (for style achievements)
      const styleCountsRaw = await db.select({
        style: beers.style,
        count: sql<number>`COUNT(DISTINCT ${userBeerTastings.beerId})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${beers.style} IS NOT NULL`))
      .groupBy(beers.style);

      const styleCounts: Record<string, number> = {};
      for (const row of styleCountsRaw) {
        if (row.style) styleCounts[row.style] = Number(row.count);
      }

      // Country counts (for country achievements)
      const countryCountsRaw = await db.select({
        country: breweries.country,
        count: sql<number>`COUNT(DISTINCT ${userBeerTastings.beerId})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .innerJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${breweries.country} IS NOT NULL`))
      .groupBy(breweries.country);

      const countryCounts: Record<string, number> = {};
      for (const row of countryCountsRaw) {
        if (row.country) countryCounts[row.country] = Number(row.count);
      }

      res.json({
        ...profile,
        reviewCount,
        tastingCount,
        recentReviews,
        isOwner,
        styleCounts,
        countryCounts,
        styleCount: Object.keys(styleCounts).length,
        countryCount: Object.keys(countryCounts).length,
      });
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // PATCH update user privacy setting
  app.patch("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { isPublic } = req.body;
      if (typeof isPublic !== 'boolean') return res.status(400).json({ message: "isPublic deve essere boolean" });

      await db.update(users).set({ isPublic, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ isPublic });
    } catch (error) {
      console.error("Error updating privacy:", error);
      res.status(500).json({ message: "Errore aggiornamento privacy" });
    }
  });

  // Background job: every 60s check for events that just started and send push notifications
  setInterval(async () => {
    try {
      const { pubEvents: pendingPub, breweryEvents: pendingBrewery } = await storage.getPendingStartNotifications();

      for (const event of pendingPub) {
        const favUserIds = await storage.getUsersWhoFavoritedPub(event.pubId);
        for (const favUserId of favUserIds) {
          const prefs = await storage.getNotificationPreferences(favUserId);
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: favUserId, type: 'event',
            title: `L'evento "${event.title}" è iniziato!`,
            message: `${event.pubName} ti aspetta adesso!`,
            pubId: event.pubId, beerId: null, isRead: false,
            urlPath: `/eventi/pub/${event.id}`,
          });
          sendPushToUser(favUserId, {
            title: `L'evento "${event.title}" è iniziato!`,
            body: `${event.pubName} ti aspetta adesso!`,
            url: `/eventi/pub/${event.id}`, type: 'event',
            icon: event.pubLogoUrl || undefined,
            category: 'events',
          });
        }
        await storage.markPubEventStartSent(event.id);
      }

      for (const event of pendingBrewery) {
        const favUsers = await db.select().from(favorites)
          .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, event.breweryId)));
        for (const fav of favUsers) {
          const prefs = await storage.getNotificationPreferences(fav.userId);
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: fav.userId, type: 'event',
            title: `L'evento "${event.title}" è iniziato!`,
            message: `${event.breweryName} ti aspetta adesso!`,
            pubId: null, beerId: null, breweryId: event.breweryId, isRead: false,
            urlPath: `/eventi/brewery/${event.id}`,
          });
          sendPushToUser(fav.userId, {
            title: `L'evento "${event.title}" è iniziato!`,
            body: `${event.breweryName} ti aspetta adesso!`,
            url: `/eventi/brewery/${event.id}`, type: 'event',
            icon: event.breweryLogoUrl || undefined,
            category: 'events',
          });
        }
        await storage.markBreweryEventStartSent(event.id);
      }
    } catch (err) {
      console.error('Event start notification job error:', err);
    }
  }, 60 * 1000);

  // CLIP image-similarity search endpoint
  // Calls the local CLIP service (127.0.0.1:5002) to embed the photo,
  // then uses pgvector cosine similarity to find matching beers.
  const CLIP_SERVICE_URL = "http://127.0.0.1:5002";
  const CLIP_TIMEOUT_MS = 8000;

  /** Fire-and-forget: indicizza una birra nel CLIP service in background. */
  function clipIndexBeer(beerId: number, imageUrl: string | null | undefined): void {
    if (!imageUrl || !imageUrl.startsWith("http")) return;
    fetch(`${CLIP_SERVICE_URL}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: beerId, url: imageUrl }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => {});
  }

  async function callClipEmbed(imageDataUrl: string): Promise<number[] | null> {
    try {
      const base64 = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLIP_TIMEOUT_MS);
      const resp = await fetch(`${CLIP_SERVICE_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: base64 }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json() as { embedding: number[] };
      return data.embedding ?? null;
    } catch {
      return null;
    }
  }

  // ── Scan text search: OR-based, word-by-word, sorted by match count ────────
  // Much more robust than /api/search for noisy OCR text
  app.post("/api/scan/search", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body as { text?: string };
      if (!text || typeof text !== "string" || text.trim().length < 2) {
        return res.json({ beers: [], breweries: [] });
      }

      // ── Scan Memory: check if we have a confirmed match for similar OCR text ──
      // Uses pg_trgm similarity to find previous scans with same label
      try {
        const memRes = await pool.query(`
          SELECT sl.chosen_beer_id, COUNT(*) as confirm_count,
                 MAX(similarity(lower(unaccent(sl.ocr_text)), lower(unaccent($1)))) as best_sim
          FROM scan_logs sl
          WHERE sl.chosen_beer_id IS NOT NULL
            AND sl.was_correct IS NOT FALSE
            AND sl.ocr_text IS NOT NULL
            AND similarity(lower(unaccent(sl.ocr_text)), lower(unaccent($1))) > 0.65
          GROUP BY sl.chosen_beer_id
          ORDER BY confirm_count DESC, best_sim DESC
          LIMIT 1
        `, [text.trim()]);

        if (memRes.rows.length > 0) {
          const { chosen_beer_id, confirm_count, best_sim } = memRes.rows[0];
          const beerRes = await pool.query(`
            SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl",
                   b.brewery_id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
            FROM beers b
            LEFT JOIN breweries br ON b.brewery_id = br.id
            WHERE b.id = $1
          `, [chosen_beer_id]);

          if (beerRes.rows.length > 0) {
            return res.json({
              beers: [{ ...beerRes.rows[0], memoryMatch: true, memorySimilarity: parseFloat(best_sim), memoryConfirmCount: parseInt(confirm_count) }],
              breweries: [],
              words: [],
              memoryMatch: true,
            });
          }
        }
      } catch { /* pg_trgm may not be installed — fall through to regular search */ }

      // ── Vector Memory: semantic similarity via pgvector (fallback to pg_trgm) ──
      // Only runs if pg_trgm didn't find anything above. Generates an embedding
      // for the current OCR text and finds the closest confirmed scan (pgvector).
      try {
        const vec = await generateEmbedding(text.trim());
        if (vec) {
          const vecMem = await pool.query(`
            SELECT sl.chosen_beer_id,
                   1 - (sl.ocr_embedding <=> $1::vector) AS similarity
            FROM scan_logs sl
            WHERE sl.chosen_beer_id IS NOT NULL
              AND sl.was_correct IS NOT FALSE
              AND sl.ocr_embedding IS NOT NULL
              AND 1 - (sl.ocr_embedding <=> $1::vector) > 0.88
            ORDER BY similarity DESC
            LIMIT 1
          `, [pgVector(vec)]);

          if (vecMem.rows.length > 0) {
            const { chosen_beer_id, similarity } = vecMem.rows[0];
            const beerRes = await pool.query(`
              SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl",
                     b.brewery_id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
              FROM beers b
              LEFT JOIN breweries br ON b.brewery_id = br.id
              WHERE b.id = $1
            `, [chosen_beer_id]);

            if (beerRes.rows.length > 0) {
              return res.json({
                beers: [{ ...beerRes.rows[0], memoryMatch: true, memorySimilarity: parseFloat(similarity), memorySource: "vector" }],
                breweries: [],
                words: [],
                memoryMatch: true,
              });
            }
          }

          // ── Beer-name vector search (if beer_embeddings table is populated) ──
          // Finds the closest beer by name embedding, even when text differs.
          const beerVec = await pool.query(`
            SELECT be.beer_id,
                   1 - (be.embedding <=> $1::vector) AS similarity
            FROM beer_embeddings be
            WHERE 1 - (be.embedding <=> $1::vector) > 0.91
            ORDER BY similarity DESC
            LIMIT 5
          `, [pgVector(vec)]);

          if (beerVec.rows.length > 0) {
            const ids = beerVec.rows.map((r: any) => r.beer_id);
            const simMap = Object.fromEntries(beerVec.rows.map((r: any) => [r.beer_id, parseFloat(r.similarity)]));
            const beerRows = await pool.query(`
              SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl",
                     b.brewery_id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
              FROM beers b
              LEFT JOIN breweries br ON b.brewery_id = br.id
              WHERE b.id = ANY($1::int[])
            `, [ids]);

            if (beerRows.rows.length > 0) {
              const sorted = beerRows.rows
                .map((b: any) => ({ ...b, vectorSimilarity: simMap[b.id] }))
                .sort((a: any, b: any) => b.vectorSimilarity - a.vectorSimilarity);
              return res.json({ beers: sorted, breweries: [], words: [], vectorMatch: true });
            }
          }
        }
      } catch { /* pgvector not yet installed — fall through */ }

      const SCAN_STOP = new Set([
        "birra","beer","bianca","rossa","scura","chiara","artigianale","craft",
        "italiana","birrificio","brewery","brewing","birreria","brasserie",
        "bottiglia","lattina","fusto","spina","fresca","fredda",
        "ipa","apa","stout","lager","porter","weizen","saison","pilsner","pilsen",
        "vol","abv","alc","alcohole","alcol","gradazione","contiene","conservare",
        "ingredienti","acqua","orzo","malto","luppolo","lievito","frumento",
        "prodotto","prodotta","prodotte","prodotti","italia","italian","made",
        "from","with","the","and","for","ale","new","old","special","premium",
        "limited","edition","batch","numero","serie","single",
        "original","classic","gold","silver","red","white","black","blue",
        "verde","blu","giallo","nero","bianco","dorata","dorato",
        "rosso","chiara","scura","ambrata","ambrato",
      ]);

      // Extract meaningful words, keep only top 3 longest (most distinctive)
      // to keep the SQL fast on large tables
      const words = text
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòùáéíóú\s]/gi, " ")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length >= 4 && !/^\d+(\.\d+)?%?$/.test(w) && !SCAN_STOP.has(w));

      if (words.length === 0) return res.json({ beers: [], breweries: [] });

      // Deduplicate, sort longest-first (most distinctive), cap at 3
      const uniqueWords = [...new Set(words)]
        .sort((a, b) => b.length - a.length)
        .slice(0, 4);
      const patterns = uniqueWords.map(w => `%${w}%`);

      // Full phrase pattern — highest priority when it matches exactly
      const fullPhrase = `%${text.trim().toLowerCase().replace(/\s+/g, " ")}%`;
      const fullPhraseParam = patterns.length + 1;

      // AND-conditions: ALL words must appear in the column (precise multi-word)
      // OR-conditions:  ANY word matches (fallback, used in WHERE for inclusion)
      const nameAndConds = (alias: string, col: string, offset = 0) =>
        patterns.map((_, i) => `${alias}.${col} ILIKE $${i + 1 + offset}`).join(" AND ");
      const nameOrConds = (alias: string, col: string, offset = 0) =>
        patterns.map((_, i) => `${alias}.${col} ILIKE $${i + 1 + offset}`).join(" OR ");

      // ── Split-query strategy ──────────────────────────────────────────────
      // Score: 3 = full phrase in name, 2 = all words in name (AND), 1 = any word
      // This puts "True Tricks Wild Raccoon" above unrelated "Wild" beers.
      const beersByNameQ = await pool.query(`
        SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl", b.brewery_id as "breweryId",
          CASE
            WHEN b.name ILIKE $${fullPhraseParam} THEN 3
            WHEN (${nameAndConds("b", "name")}) THEN 2
            ELSE 1
          END AS _score
        FROM beers b
        WHERE (${nameOrConds("b", "name")})
           OR (${nameOrConds("b", "style")})
        ORDER BY _score DESC, length(b.name) ASC, b.name ASC
        LIMIT 20
      `, [...patterns, fullPhrase]);

      // Query 2: match breweries by name — AND (all words must be in brewery name)
      const breweryResult = await pool.query(`
        SELECT br.id, br.name, br.country, br.logo_url as "logoUrl", br.location as "city"
        FROM breweries br
        WHERE ${nameOrConds("br", "name")}
        ORDER BY length(br.name) ASC, br.name ASC
        LIMIT 5
      `, patterns);

      // Query 3: beers from matched breweries (uses idx_beers_brewery_id)
      let beersByBreweryRows: any[] = [];
      if (breweryResult.rows.length > 0) {
        const brIds = breweryResult.rows.map((r: any) => r.id);
        const brBeers = await pool.query(`
          SELECT b.id, b.name, b.style, b.abv, b.image_url as "imageUrl", b.brewery_id as "breweryId"
          FROM beers b
          WHERE b.brewery_id = ANY($1::int[])
          ORDER BY b.name ASC
          LIMIT 20
        `, [brIds]);
        beersByBreweryRows = brBeers.rows;
      }

      // Merge + deduplicate beer results; brewery-matched beers get score 1 (no phrase/AND bonus)
      const seenIds = new Set<number>();
      const mergedBeers: any[] = [];
      for (const b of [...beersByNameQ.rows, ...beersByBreweryRows]) {
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          mergedBeers.push({ ...b, _score: b._score ?? 1 });
        }
      }
      // Sort: highest score first, then shortest name (most specific)
      mergedBeers.sort((a, b) =>
        (b._score - a._score) || (a.name.length - b.name.length) || a.name.localeCompare(b.name)
      );

      // Enrich with brewery info (single IN query on small result set)
      const brMap: Record<number, any> = {};
      breweryResult.rows.forEach((br: any) => { brMap[br.id] = br; });
      const unknownBrIds = [...new Set(mergedBeers.map(b => b.breweryId).filter(id => id && !brMap[id]))];
      if (unknownBrIds.length > 0) {
        const extra = await pool.query(`SELECT id, name, logo_url as "logoUrl" FROM breweries WHERE id = ANY($1::int[])`, [unknownBrIds]);
        extra.rows.forEach((br: any) => { brMap[br.id] = br; });
      }
      const enriched = mergedBeers.slice(0, 15).map(b => ({
        ...b,
        breweryName: brMap[b.breweryId]?.name ?? null,
        breweryLogoUrl: brMap[b.breweryId]?.logoUrl ?? null,
      }));

      res.json({
        beers: enriched,
        breweries: breweryResult.rows,
        words: uniqueWords,
      });
    } catch (error) {
      console.error("[scan/search] error:", error);
      res.status(500).json({ beers: [], breweries: [] });
    }
  });

  app.post("/api/scan/image-search", isAuthenticated, async (req: any, res) => {
    try {
      const { image, limit = 5 } = req.body as { image?: string; limit?: number };
      if (!image || !image.startsWith("data:image")) {
        return res.status(400).json({ error: "image required" });
      }

      const base64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const maxLimit = Math.min(Number(limit), 10);

      // Call CLIP service /search endpoint (handles embed + similarity in Python/numpy)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLIP_TIMEOUT_MS);
      let clipResp: Response;
      try {
        clipResp = await fetch(`${CLIP_SERVICE_URL}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_b64: base64, limit: maxLimit, min_similarity: 0.60 }),
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {
        clearTimeout(timer);
        return res.json({ available: false, results: [] });
      }

      if (!clipResp.ok) return res.json({ available: false, results: [] });
      const clipData = await clipResp.json() as { results: Array<{ id: number; similarity: number }>; indexed: number };

      if (!clipData.results?.length) {
        return res.json({ available: true, results: [], indexed: clipData.indexed ?? 0 });
      }

      // Fetch full beer details for matched IDs
      const ids = clipData.results.map((r: any) => r.id);
      const simMap = Object.fromEntries(clipData.results.map((r: any) => [r.id, r.similarity]));

      const beerRows = await db.execute(sql`
        SELECT b.id, b.name, b.style, b.abv,
               b.logo_url as "logoUrl", b.image_url as "imageUrl",
               br.id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        WHERE b.id = ANY(${ids}::int[])
      `);

      const results = (beerRows.rows as any[]).map(b => ({
        ...b,
        similarity: simMap[b.id] ?? 0,
      })).sort((a, b) => b.similarity - a.similarity);

      res.json({ available: true, results, indexed: clipData.indexed ?? 0 });
    } catch (error) {
      console.error("Image search error:", error);
      res.json({ available: false, results: [] });
    }
  });

  // OCR endpoint — PaddleOCR primary, Tesseract + OCR.space as fallback.
  app.post("/api/scan/ocr", isAuthenticated, async (req, res) => {
    try {
      const { image } = req.body as { image?: string };
      if (!image || !image.startsWith("data:image")) {
        return res.status(400).json({ error: "Missing image data" });
      }

      // ── 1. Gemini 2.0 Flash Vision (primary — context-aware beer label reader) ──
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          const mimeType = (image.match(/^data:(image\/[^;]+);base64/) ?? [])[1] ?? "image/jpeg";
          const base64Data = image.replace(/^data:image\/[^;]+;base64,/, "");

          const prompt = `Sei uno scanner specializzato in etichette di birra artigianale (craft beer).
Analizza questa immagine di un'etichetta, fusto, lattina o bottiglia di birra.
Estrai SOLO le seguenti informazioni se presenti:
- Nome della birra
- Nome del birrificio o produttore
- Stile birrario (es. IPA, Stout, Pilsner, Weizen, ecc.)
- Gradazione alcolica (ABV)

Rispondi con UNA SOLA RIGA di testo contenente solo le parole chiave estratte, separate da spazi.
Non aggiungere spiegazioni, punteggiatura decorativa né formattazione.
Se l'immagine non è un'etichetta di birra o non riesci a leggere nulla, rispondi con stringa vuota.`;

          const result = await model.generateContent([
            { inlineData: { data: base64Data, mimeType } },
            prompt,
          ]);

          const geminiText = result.response.text().trim();
          if (geminiText.length >= 3) {
            return res.json({ text: geminiText, exitCode: 1, engine: "gemini-2.0-flash" });
          }
        } catch (geminiErr: any) {
          // Quota esaurita o errore temporaneo → fallback a PaddleOCR
          console.warn("[scan/ocr] Gemini error, falling back:", geminiErr?.message ?? geminiErr);
        }
      }

      // ── 2. PaddleOCR (fallback — neural OCR locale) ───────────────────────
      const paddle = await runPaddleOCR(image);
      if (paddle.available && paddle.text.trim().length >= 3) {
        return res.json({ text: paddle.text, exitCode: 1, engine: "paddleocr" });
      }

      // ── 3. Tesseract (sempre disponibile) ────────────────────────────────
      const tesseractText = await runLocalTesseract(image);
      if (tesseractText && tesseractText.trim().length >= 3) {
        return res.json({ text: tesseractText, exitCode: 1, engine: "tesseract" });
      }

      // ── 4. OCR.space cloud (solo se key configurata) ──────────────────────
      const ocrSpaceKey = process.env.OCR_SPACE_KEY;
      if (!ocrSpaceKey) {
        return res.json({ text: tesseractText || "", exitCode: 0, engine: paddle.available ? "paddleocr" : "tesseract" });
      }

      const params = new URLSearchParams();
      params.append("apikey", ocrSpaceKey);
      params.append("base64Image", image);
      params.append("language", "ita");
      params.append("OCREngine", "2");
      params.append("scale", "true");
      params.append("detectOrientation", "true");
      params.append("isTable", "false");
      params.append("isOverlayRequired", "false");

      const ocrRes = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!ocrRes.ok) return res.json({ text: "", exitCode: -1, engine: "ocrspace_fail" });
      const ocrData = await ocrRes.json() as any;
      if (ocrData.IsErroredOnProcessing) return res.json({ text: "", exitCode: -1 });

      const parsed = ocrData.ParsedResults?.[0];
      return res.json({ text: parsed?.ParsedText || "", exitCode: parsed?.FileParseExitCode ?? -1, engine: "ocrspace" });
    } catch (err) {
      console.error("OCR error:", err);
      return res.status(500).json({ error: "OCR failed" });
    }
  });

  // ── Static Pages (public read, admin write) ────────────────────────────────

  function sanitizePageHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript\s*:/gi, '#');
  }

  app.get("/api/pages/:slug", async (req, res) => {
    const { slug } = req.params;
    const [page] = await db.select().from(staticPages).where(eq(staticPages.slug, slug));
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  });

  app.get("/api/admin/pages", isAuthenticated, isAdmin, async (_req, res) => {
    const pages = await db.select().from(staticPages).orderBy(asc(staticPages.slug));
    res.json(pages);
  });

  app.put("/api/admin/pages/:slug", isAuthenticated, isAdmin, async (req, res) => {
    const slug = String(req.params.slug);
    const { title, content } = req.body;
    if (!title || content === undefined) return res.status(400).json({ error: "title and content required" });
    const safeContent = sanitizePageHtml(String(content));
    const [existing] = await db.select().from(staticPages).where(eq(staticPages.slug, slug));
    if (existing) {
      const [updated] = await db.update(staticPages)
        .set({ title, content: safeContent, updatedAt: new Date() })
        .where(eq(staticPages.slug, slug))
        .returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(staticPages).values({ slug, title, content: safeContent }).returning();
      return res.status(201).json(created);
    }
  });

  // ─── Addition Requests (user-facing) ─────────────────────────────────────────

  // Submit a new beer or brewery addition request
  app.post("/api/addition-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { type, beerName, breweryName, breweryId, style, abv, city, country, websiteUrl, description, notes, imageUrl, logoUrl, coverImageUrl } = req.body;
      if (!type || !['beer', 'brewery'].includes(type)) {
        return res.status(400).json({ message: "Tipo non valido (beer o brewery)" });
      }
      if (type === 'beer' && !beerName?.trim()) {
        return res.status(400).json({ message: "Nome birra obbligatorio" });
      }
      if (type === 'brewery' && !breweryName?.trim()) {
        return res.status(400).json({ message: "Nome birrificio obbligatorio" });
      }

      const [request] = await db.insert(additionRequests).values({
        userId,
        type,
        beerName: beerName?.trim() || null,
        breweryName: breweryName?.trim() || null,
        breweryId: breweryId ? parseInt(breweryId) : null,
        style: style?.trim() || null,
        abv: abv?.trim() || null,
        city: city?.trim() || null,
        country: country?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        coverImageUrl: coverImageUrl?.trim() || null,
        notes: notes?.trim() || null,
      }).returning();

      // Get submitter name
      const [submitter] = await db.select({ nickname: users.nickname, firstName: users.firstName })
        .from(users).where(eq(users.id, userId)).limit(1);
      const submitterName = submitter?.nickname || submitter?.firstName || 'Un utente';

      const typeLabel = type === 'beer' ? 'birra' : 'birrificio';
      const itemLabel = type === 'beer' ? (beerName || 'nuova birra') : (breweryName || 'nuovo birrificio');

      // Notify all admins
      await sendPushToAdmins({
        title: `🍺 Richiesta aggiunta ${typeLabel}`,
        body: `${submitterName} vuole aggiungere: ${itemLabel}`,
        url: '/admin/addition-requests',
        type: 'addition_request',
      });

      // If beer request for existing brewery: notify brewery owner
      if (type === 'beer' && breweryId) {
        const brId = parseInt(breweryId);
        const [owner] = await db.select({ id: users.id })
          .from(users)
          .where(and(eq(users.breweryId, brId), eq(users.userType, 'brewery_owner')))
          .limit(1);
        if (owner) {
          await sendPushToUser(owner.id, {
            title: '🍺 Richiesta nuova birra',
            body: `${submitterName} vuole aggiungere "${itemLabel}" al tuo birrificio`,
            url: '/admin/addition-requests',
            type: 'addition_request',
            category: 'breweryReplies',
          });
        }
      }

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating addition request:", error);
      res.status(500).json({ message: "Errore durante l'invio della richiesta" });
    }
  });

  // List current user's own addition requests
  app.get("/api/addition-requests/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const rows = await db.select().from(additionRequests)
        .where(eq(additionRequests.userId, userId))
        .orderBy(desc(additionRequests.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching user addition requests:", error);
      res.status(500).json({ message: "Errore nel caricamento" });
    }
  });

  // ─── Scan Logs ────────────────────────────────────────────────────────────────

  // Create a scan log (called after OCR + search completes)
  app.post("/api/scan-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { ocrText, ocrEngine, source, usedQuery, topCandidates, latencyMs, imageDataUrl } = req.body;

      let imageUrl: string | null = null;
      if (imageDataUrl && imageDataUrl.startsWith("data:image")) {
        try {
          const buffer = Buffer.from(imageDataUrl.split(",")[1], "base64");
          imageUrl = await uploadImage(buffer, "scan-logs");
        } catch (e) {
          console.error("Scan log image upload failed:", e);
        }
      }

      const [log] = await db.insert(scanLogs).values({
        userId,
        imageUrl,
        ocrText: ocrText || null,
        ocrEngine: ocrEngine || null,
        source: source || "ocr",
        usedQuery: usedQuery || null,
        topCandidates: topCandidates || null,
        latencyMs: latencyMs || null,
      }).returning();

      res.status(201).json({ id: log.id });
    } catch (error) {
      console.error("Error creating scan log:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Enrich a beer with barcode and/or OFF image URL (from scanner)
  app.post("/api/beers/:id/enrich-barcode", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const { barcode, offImageUrl } = req.body;
      if (!barcode && !offImageUrl) return res.json({ updated: false });

      const [beer] = await db.select().from(beers).where(eq(beers.id, beerId)).limit(1);
      if (!beer) return res.status(404).json({ error: "Beer not found" });

      const updates: Record<string, unknown> = {};
      if (barcode && !beer.barcode) updates.barcode = barcode;
      if (offImageUrl && !beer.logoUrl && !beer.imageUrl) updates.logoUrl = offImageUrl;

      if (Object.keys(updates).length > 0) {
        await db.update(beers).set(updates).where(eq(beers.id, beerId));
        return res.json({ updated: true, fields: Object.keys(updates) });
      }
      res.json({ updated: false, reason: "already set" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manually trigger web image search for a beer (admin or beer owner)
  // POST /api/beers/:id/find-image-preview
  // Synchronous: returns the best web image URL (NOT saved) so the user can
  // accept/reject it inside an edit dialog. Returns { imageUrl: null } when
  // the search isn't confident — UI then falls back to manual upload.
  app.post("/api/beers/:id/find-image-preview", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      if (isNaN(beerId)) return res.status(400).json({ message: "invalid id" });

      const info = (await pool.query(`
        SELECT b.name, b.brewery_id, br.name AS brewery_name, br.website_url
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        WHERE b.id = $1
      `, [beerId])).rows[0];
      if (!info) return res.status(404).json({ message: "beer not found" });

      // Authorise: admin, brewery owner della birra, OR qualsiasi pub_owner.
      // La preview è solo lettura (cerca un'immagine sul web e la restituisce
      // senza salvarla in DB). I pub owner gestiscono i menù del loro locale
      // e hanno bisogno di poter cercare le copertine delle birre che servono.
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      const userRoles = user?.roles || [];
      const isAdminUser = effectiveRole === "admin" || userRoles.includes("admin");
      const isBreweryOwnerOfThis = user?.breweryId != null && user.breweryId === info.brewery_id;
      const isPubOwner = effectiveRole === "pub_owner" || userRoles.includes("pub_owner");
      const isBreweryOwner = effectiveRole === "brewery_owner" || userRoles.includes("brewery_owner");
      if (!isAdminUser && !isBreweryOwnerOfThis && !isPubOwner && !isBreweryOwner) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const result = await findBestBeerImage(info.name, info.brewery_name ?? "", info.website_url);
      // Return also low-confidence results: the user sees a preview and confirms before applying,
      // so showing something is better than returning null.
      if (!result.url) {
        return res.json({ imageUrl: null, confidence: result.confidence, source: result.source });
      }

      // Re-host onto Cloudinary so the URL is stable + transformable.
      const cloudUrl = await rehostImageOnCloudinary(result.url, "beer-images", `web_${beerId}`);
      res.json({
        imageUrl: cloudUrl ?? result.url,
        confidence: "high",
        source: result.source,
      });
    } catch (e: any) {
      console.error("[find-image-preview] error:", e?.message);
      res.status(500).json({ message: e?.message ?? "search failed" });
    }
  });

  // POST /api/beer-images/search-by-name
  // Used when creating a NEW beer (no id yet) — search by name + brewery name.
  // Authorise admin / pub_owner / brewery_owner. Returns { imageUrl, confidence, source }.
  app.post("/api/beer-images/search-by-name", isAuthenticated, async (req: any, res) => {
    try {
      const { beerName, breweryName, breweryId } = req.body || {};
      if (!beerName || typeof beerName !== "string" || beerName.trim().length < 2) {
        return res.status(400).json({ message: "beerName required" });
      }

      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      const userRoles = user?.roles || [];
      const isAdminUser = effectiveRole === "admin" || userRoles.includes("admin");
      const isPubOwner = effectiveRole === "pub_owner" || userRoles.includes("pub_owner");
      const isBreweryOwner = effectiveRole === "brewery_owner" || userRoles.includes("brewery_owner");
      if (!isAdminUser && !isPubOwner && !isBreweryOwner) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Lookup brewery website if id provided
      let websiteUrl: string | null = null;
      let resolvedBreweryName = breweryName || "";
      if (breweryId) {
        const br = (await pool.query(
          `SELECT name, website_url FROM breweries WHERE id = $1`,
          [parseInt(breweryId)],
        )).rows[0];
        if (br) {
          websiteUrl = br.website_url ?? null;
          if (!resolvedBreweryName) resolvedBreweryName = br.name;
        }
      }

      const result = await findBestBeerImage(beerName.trim(), resolvedBreweryName, websiteUrl);
      if (result.confidence !== "high" || !result.url) {
        return res.json({ imageUrl: null, confidence: result.confidence, source: result.source });
      }

      const safeSlug = beerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "beer";
      const cloudUrl = await rehostImageOnCloudinary(result.url, "beer-images", `web_new_${safeSlug}`);
      res.json({
        imageUrl: cloudUrl ?? result.url,
        confidence: "high",
        source: result.source,
      });
    } catch (e: any) {
      console.error("[search-by-name] error:", e?.message);
      res.status(500).json({ message: e?.message ?? "search failed" });
    }
  });

  // POST /api/breweries/:id/find-logo-preview
  // Synchronous brewery logo search — same preview-then-confirm pattern as above.
  app.post("/api/breweries/:id/find-logo-preview", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      if (isNaN(breweryId)) return res.status(400).json({ message: "invalid id" });

      // Authorise: admin or owner of this brewery
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminUser = effectiveRole === "admin";
      const isOwner = user?.breweryId === breweryId;
      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const info = (await pool.query(
        `SELECT name, website_url, location FROM breweries WHERE id = $1`,
        [breweryId],
      )).rows[0];
      if (!info) return res.status(404).json({ message: "brewery not found" });

      const result = await findBestBreweryLogo(info.name, info.website_url, info.location);
      if (result.confidence !== "high" || !result.url) {
        return res.json({ logoUrl: null, confidence: result.confidence, source: result.source });
      }

      const cloudUrl = await uploadBreweryLogo(result.url, breweryId);
      res.json({
        logoUrl: cloudUrl ?? result.url,
        confidence: "high",
        source: result.source,
      });
    } catch (e: any) {
      console.error("[find-logo-preview] error:", e?.message);
      res.status(500).json({ message: e?.message ?? "search failed" });
    }
  });

  // POST /api/beers/:id/find-web-image   body: { force?: boolean }
  app.post("/api/beers/:id/find-web-image", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const force = req.body?.force === true;
      if (isNaN(beerId)) return res.status(400).json({ error: "invalid id" });

      const beerInfo = await pool.query(`
        SELECT b.name, b.image_url, b.brewery_id, br.name AS brewery_name, br.website_url
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        WHERE b.id = $1
      `, [beerId]);
      const info = beerInfo.rows[0];
      if (!info) return res.status(404).json({ error: "beer not found" });

      // Authorise: admin, brewery owner, OR pub owner (any authenticated titolare)
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminUser = effectiveRole === "admin";
      const isBreweryOwner = user?.breweryId != null && user.breweryId === info.brewery_id;
      const isPubOwner = effectiveRole === "pub_owner";
      if (!isAdminUser && !isBreweryOwner && !isPubOwner) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (info.image_url && !isPlaceholderImage(info.image_url) && !force) return res.json({ status: "skipped", reason: "already has image" });

      // Acknowledge immediately; search runs in background
      res.json({ status: "searching", beerName: info.name });

      setImmediate(() =>
        findAndUpdateBeerImage(beerId, info.name, info.brewery_name ?? "", info.website_url, force)
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Save user feedback for a scan log (chosen result + correctness)
  app.patch("/api/scan-logs/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const logId = parseInt(req.params.id);
      const { chosenBeerId, chosenBreweryId, wasCorrect, correctedBeerId } = req.body;

      const [existing] = await db.select({ userId: scanLogs.userId })
        .from(scanLogs).where(eq(scanLogs.id, logId)).limit(1);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Log non trovato" });
      }

      await db.update(scanLogs).set({
        chosenBeerId: chosenBeerId || null,
        chosenBreweryId: chosenBreweryId || null,
        wasCorrect: wasCorrect ?? null,
        correctedBeerId: correctedBeerId || null,
      }).where(eq(scanLogs.id, logId));

      // ── Store OCR embedding in background when confirmed correct ────────────
      // wasCorrect=true OR correctedBeerId set (manual correction) both count.
      if (wasCorrect !== false) {
        const targetBeer = chosenBeerId || correctedBeerId;
        if (targetBeer) {
          setImmediate(async () => {
            try {
              const [logRow] = await db.select({ ocrText: scanLogs.ocrText })
                .from(scanLogs).where(eq(scanLogs.id, logId)).limit(1);
              if (!logRow?.ocrText) return;

              const vec = await generateEmbedding(logRow.ocrText);
              if (!vec) return;

              await pool.query(
                `UPDATE scan_logs SET ocr_embedding = $1::vector WHERE id = $2`,
                [pgVector(vec), logId]
              );
            } catch (e: any) {
              // pgvector not yet installed — silent, no crash
              if (!e?.message?.includes("column") && !e?.message?.includes("vector")) {
                console.error("embedding store error:", e?.message?.substring(0, 80));
              }
            }
          });
        }
      }

      // ── Index confirmed scan photo in CLIP service (visual fingerprint) ─────
      // Grows the CLIP index organically: each confirmed label photo is stored
      // under the confirmed beer_id, so future scans of the same label are found
      // instantly by visual similarity — no OCR required.
      if (wasCorrect !== false) {
        const targetBeer = chosenBeerId || correctedBeerId;
        if (targetBeer) {
          setImmediate(async () => {
            try {
              const [logRow] = await db.select({ imageUrl: scanLogs.imageUrl })
                .from(scanLogs).where(eq(scanLogs.id, logId)).limit(1);
              if (!logRow?.imageUrl || !logRow.imageUrl.startsWith("http")) return;

              await fetch(`${CLIP_SERVICE_URL}/index`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: targetBeer, url: logRow.imageUrl }),
                signal: AbortSignal.timeout(30000),
              });
              console.log(`[clip] indexed scan photo for beer ${targetBeer}`);
            } catch { /* CLIP not running — silent */ }
          });
        }
      }

      // ── Find best web image for the confirmed beer (if it has none) ──────────
      // Searches Untappd + brewery website + DuckDuckGo, uploads winner to Cloudinary.
      if (wasCorrect !== false) {
        const targetBeer = chosenBeerId || correctedBeerId;
        if (targetBeer) {
          setImmediate(async () => {
            try {
              const beerInfo = await pool.query(`
                SELECT b.name, b.image_url, br.name AS brewery_name, br.website_url
                FROM beers b
                LEFT JOIN breweries br ON br.id = b.brewery_id
                WHERE b.id = $1
              `, [targetBeer]);
              const info = beerInfo.rows[0];
              if (!info || (info.image_url && !isPlaceholderImage(info.image_url))) return; // already has real image — skip
              await findAndUpdateBeerImage(targetBeer, info.name, info.brewery_name ?? "", info.website_url);
            } catch { /* silent */ }
          });
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Error updating scan log feedback:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Get current user's scan history
  app.get("/api/scan-logs/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const rows = await db
        .select({
          id: scanLogs.id,
          imageUrl: scanLogs.imageUrl,
          ocrText: scanLogs.ocrText,
          ocrEngine: scanLogs.ocrEngine,
          source: scanLogs.source,
          usedQuery: scanLogs.usedQuery,
          topCandidates: scanLogs.topCandidates,
          chosenBeerId: scanLogs.chosenBeerId,
          chosenBreweryId: scanLogs.chosenBreweryId,
          wasCorrect: scanLogs.wasCorrect,
          latencyMs: scanLogs.latencyMs,
          createdAt: scanLogs.createdAt,
          beerName: beers.name,
          beerStyle: beers.style,
          beerLogoUrl: beers.logoUrl,
          breweryName: breweries.name,
        })
        .from(scanLogs)
        .leftJoin(beers, eq(scanLogs.chosenBeerId, beers.id))
        .leftJoin(breweries, eq(scanLogs.chosenBreweryId, breweries.id))
        .where(eq(scanLogs.userId, userId))
        .orderBy(desc(scanLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(rows);
    } catch (error) {
      console.error("Error fetching scan logs:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Pub subscription request (sends email/notification to admin) - legacy fallback
  app.post("/api/pub-subscription-request", async (req: any, res) => {
    try {
      const { pubName, ownerName, email, vatNumber, phone, city, notes } = req.body;
      if (!pubName || !ownerName || !email) {
        return res.status(400).json({ message: "Dati obbligatori mancanti" });
      }
      console.log("[PUB SUBSCRIPTION REQUEST]", { pubName, ownerName, email, vatNumber, phone, city, notes, timestamp: new Date().toISOString() });
      res.json({ message: "Richiesta ricevuta" });
    } catch (error) {
      console.error("Error handling pub subscription request:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Stripe Checkout Session per abbonamento pub (€65/anno, 15 giorni di prova)
  app.post("/api/stripe/pub-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userName = req.user?.username || req.user?.displayName || "";
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "fermenta.to";
      const baseUrl = `https://${domain}`;

      // Trova o crea il prezzo €65/anno con 15 giorni di prova
      // Prima cerca un prezzo esistente tramite la variabile d'ambiente
      let priceId = process.env.STRIPE_PUB_PRICE_ID;
      if (!priceId) {
        // Cerca o crea il prodotto e il prezzo
        const products = await stripe.products.list({ active: true, limit: 10 });
        let product = products.data.find(p => p.metadata?.fermenta_type === "pub_subscription");
        if (!product) {
          product = await stripe.products.create({
            name: "Piano Pub Pro — Fermenta.to",
            description: "Accesso completo al pannello pub: taplist digitale, analytics, notifiche push, badge verificato",
            metadata: { fermenta_type: "pub_subscription" },
          });
        }
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        let price = prices.data.find(p => p.unit_amount === 6500 && p.currency === "eur" && p.recurring?.interval === "year");
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: 6500,
            currency: "eur",
            recurring: { interval: "year" },
            metadata: { fermenta_type: "pub_subscription" },
          });
        }
        priceId = price.id;
      }

      // Crea o trova il customer Stripe per l'utente
      const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string;
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: userName,
          metadata: { fermenta_user_id: String(userId) },
        });
        customerId = customer.id;
      }

      // Riattivazione: nessun trial (abbonamento già usato in passato)
      const isReactivation = req.body?.reactivate === true;

      const subscriptionData: any = {
        metadata: { fermenta_user_id: String(userId) },
      };
      if (!isReactivation) {
        subscriptionData.trial_period_days = 15;
      }

      // Crea la Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: subscriptionData,
        success_url: `${baseUrl}/attiva-pub?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/attiva-pub`,
        payment_method_collection: "always",
        locale: "it",
        metadata: { fermenta_user_id: String(userId) },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Stripe checkout error:", error.message);
      res.status(500).json({ message: "Errore nella creazione del pagamento: " + error.message });
    }
  });

  // ─── Auto-activate pub after Stripe checkout ─────────────────────────────
  app.post("/api/stripe/activate-pub", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { sessionId } = req.body;

      // Optionally verify the Stripe session belongs to this user
      if (sessionId) {
        try {
          const { getUncachableStripeClient } = await import("./stripeClient");
          const stripe = await getUncachableStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.status !== "complete") {
            return res.status(400).json({ message: "Checkout non completato" });
          }
        } catch (stripeErr: any) {
          console.warn("Stripe session verify warning:", stripeErr.message);
        }
      }

      // Check if pub already exists for user
      const [existingPub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (existingPub) {
        // Ensure pub has trial/active status
        const trialEndsAt = existingPub.trialEndsAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await db.update(pubs).set({ isVerified: true, subscriptionStatus: "trial", trialEndsAt }).where(eq(pubs.id, existingPub.id));

        // Also ensure user has pub_owner role (could be missing if registered via register-pub)
        const currentRoles: string[] = req.user?.roles || ["customer"];
        if (!currentRoles.includes("pub_owner")) {
          const newRoles = [...currentRoles, "pub_owner"];
          await db.update(users).set({
            roles: newRoles,
            userType: "pub_owner",
            activeRole: "pub_owner",
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
          const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
          req.login(updatedUser, () => {});
        }

        return res.json({ success: true, pub: existingPub, alreadyActive: true });
      }

      // Find the publicanRequest
      const [pubReq] = await db.select().from(publicanRequests).where(eq(publicanRequests.userId, userId));
      if (!pubReq) {
        return res.status(404).json({ message: "Nessuna richiesta pub trovata. Registra prima il tuo locale." });
      }

      // Create the pub from the request data
      const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const [newPub] = await db.insert(pubs).values({
        name: pubReq.pubName,
        address: pubReq.pubAddress,
        city: pubReq.pubCity,
        region: pubReq.pubRegion || pubReq.pubCity,
        phone: pubReq.phone || null,
        email: pubReq.email || req.user?.email || null,
        description: pubReq.description || null,
        vatNumber: pubReq.vatNumber || null,
        ownerId: userId,
        isVerified: true,
        subscriptionStatus: "trial",
        trialEndsAt,
        isActive: true,
      }).returning();

      // Update publicanRequest to approved
      await db.update(publicanRequests).set({
        status: "approved",
        reviewedAt: new Date(),
      }).where(eq(publicanRequests.id, pubReq.id));

      // Promote user to pub_owner role
      const currentRoles = req.user?.roles || ["customer"];
      const newRoles = currentRoles.includes("pub_owner") ? currentRoles : [...currentRoles, "pub_owner"];
      await db.update(users).set({
        roles: newRoles,
        userType: "pub_owner",
        activeRole: "pub_owner",
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      // Refresh session
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
      req.login(updatedUser, () => {});

      res.json({ success: true, pub: newPub });
    } catch (error: any) {
      console.error("activate-pub error:", error);
      res.status(500).json({ message: "Errore durante l'attivazione: " + error.message });
    }
  });

  // ─── Analytics: track pub page view (anonymous, fire-and-forget) ───────────
  app.post("/api/analytics/pub-view", async (req, res) => {
    try {
      const { pubId } = req.body;
      if (!pubId || isNaN(parseInt(pubId))) { res.json({ ok: true }); return; }
      await db.execute(
        sql`INSERT INTO pub_page_views (pub_id, view_date, view_count)
            VALUES (${parseInt(pubId)}, CURRENT_DATE, 1)
            ON CONFLICT (pub_id, view_date)
            DO UPDATE SET view_count = pub_page_views.view_count + 1`
      );
      res.json({ ok: true });
    } catch { res.json({ ok: true }); }
  });

  // ─── Pub stats: extended metrics for owner dashboard ───────────────────────
  app.get("/api/pubs/:id/stats-extended", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = req.user?.id;
      const pub = await storage.getPub(pubId);
      if (!pub) { res.status(404).json({ message: "Pub non trovato" }); return; }
      const isOwner = pub.ownerId === userId;
      const isAdminUser = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdminUser) { res.status(403).json({ message: "Non autorizzato" }); return; }

      const payload = await memCached(`stats-extended:${pubId}`, 60 * 60 * 1000, async () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [taps, bottles, favs, ratingAgg, checkinsTotal, checkinsMonth, topBeerOnTapRows, topBeerCheckinRows, checkinSeriesRows] = await Promise.all([
          // Active beers on tap
          db.select({ n: sql<number>`COUNT(*)::int` }).from(tapList).where(and(eq(tapList.pubId, pubId), eq(tapList.isActive, true))),
          // Active bottles
          db.select({ n: sql<number>`COUNT(*)::int` }).from(bottleList).where(and(eq(bottleList.pubId, pubId), eq(bottleList.isActive, true))),
          // Favorites count
          db.select({ n: sql<number>`COUNT(*)::int` }).from(favorites).where(and(eq(favorites.itemType, 'pub'), eq(favorites.itemId, pubId))),
          // Pub rating aggregate
          db.select({ avg: sql<number>`COALESCE(AVG(rating)::float, 0)`, n: sql<number>`COUNT(*)::int` }).from(ratings).where(eq(ratings.pubId, pubId)),
          // All-time checkins (tastings) at this pub
          db.select({ n: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(eq(userBeerTastings.pubId, pubId)),
          // Last 30d checkins
          db.select({ n: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(and(eq(userBeerTastings.pubId, pubId), gte(userBeerTastings.createdAt, thirtyDaysAgo))),
          // Top beer currently on tap (by checkins/tastings at this pub, last 90d)
          db.execute(sql`
            SELECT b.id, b.name, br.name AS brewery, b.style, b.image_url AS "imageUrl",
                   COUNT(t.id)::int AS tastings,
                   ROUND(COALESCE(AVG(t.rating)::numeric, 0), 1)::float AS "avgRating"
            FROM tap_list tl
            JOIN beers b      ON b.id = tl.beer_id
            LEFT JOIN breweries br ON br.id = b.brewery_id
            LEFT JOIN user_beer_tastings t ON t.beer_id = b.id AND t.pub_id = ${pubId}
                  AND t.created_at >= NOW() - INTERVAL '90 days'
            WHERE tl.pub_id = ${pubId} AND tl.is_active = true
            GROUP BY b.id, b.name, br.name, b.style, b.image_url
            ORDER BY COUNT(t.id) DESC, b.name ASC
            LIMIT 5
          `),
          // Top beer overall by checkins at this pub
          db.execute(sql`
            SELECT b.id, b.name, br.name AS brewery, b.style, b.image_url AS "imageUrl",
                   COUNT(t.id)::int AS checkins,
                   ROUND(COALESCE(AVG(t.rating)::numeric, 0), 1)::float AS "avgRating"
            FROM user_beer_tastings t
            JOIN beers b ON b.id = t.beer_id
            LEFT JOIN breweries br ON br.id = b.brewery_id
            WHERE t.pub_id = ${pubId}
            GROUP BY b.id, b.name, br.name, b.style, b.image_url
            ORDER BY COUNT(t.id) DESC
            LIMIT 5
          `),
          // 30-day daily check-in series (for sparkline)
          pool.query(
            `SELECT d.day::text AS date, COALESCE(COUNT(t.id)::int, 0) AS checkins
             FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d(day)
             LEFT JOIN user_beer_tastings t
               ON DATE(t.created_at) = d.day AND t.pub_id = $1
             GROUP BY d.day
             ORDER BY d.day ASC`,
            [pubId]
          ),
        ]);

        return {
          beersOnTap: taps[0]?.n ?? 0,
          bottlesActive: bottles[0]?.n ?? 0,
          favorites: favs[0]?.n ?? 0,
          ratingAvg: Number((ratingAgg[0]?.avg ?? 0).toFixed(2)),
          ratingCount: ratingAgg[0]?.n ?? 0,
          checkinsTotal: checkinsTotal[0]?.n ?? 0,
          checkinsMonth: checkinsMonth[0]?.n ?? 0,
          topBeersOnTap: ((topBeerOnTapRows as any).rows ?? topBeerOnTapRows),
          topBeersAllTime: ((topBeerCheckinRows as any).rows ?? topBeerCheckinRows),
          checkinSeries: (checkinSeriesRows.rows ?? []).map((r: any) => ({ date: r.date, checkins: Number(r.checkins) })),
        };
      });

      res.json(payload);
    } catch (err: any) {
      console.error("Pub stats-extended error:", err.message);
      res.status(500).json({ message: "Errore stats pub" });
    }
  });

  // ─── Brewery stats-extended for brewery owner dashboard ─────────────────────
  app.get("/api/breweries/:id/stats-extended", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const isOwner = user?.breweryId === breweryId;
      const isAdminUser = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdminUser) { res.status(403).json({ message: "Non autorizzato" }); return; }

      const rawDays = parseInt(req.query.days as string) || 30;
      const days = Math.min(Math.max(rawDays, 1), 90);

      const payload = await memCached(`brewery-stats-extended:${breweryId}:${days}`, 60 * 60 * 1000, async () => {
        const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const intervalExpr = `${days - 1} days`;

        const [favs, viewsWeekRows, checkinSeriesRows, viewsSeriesRows, topBeersByViewsRows] = await Promise.all([
          // Favorites count (brewery-level favorites)
          db.select({ n: sql<number>`COUNT(*)::int` })
            .from(favorites)
            .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId))),
          // Views last 7 days (beer_views joined to beers)
          db.select({ total: sql<number>`COUNT(*)::int` })
            .from(beerViews)
            .innerJoin(beers, eq(beerViews.beerId, beers.id))
            .where(and(eq(beers.breweryId, breweryId), gte(beerViews.viewedAt, sevenDaysAgo))),
          // Daily check-in series for the selected window
          pool.query(
            `SELECT d.day::text AS date, COALESCE(COUNT(t.id)::int, 0) AS checkins
             FROM generate_series(CURRENT_DATE - INTERVAL '${intervalExpr}', CURRENT_DATE, '1 day') AS d(day)
             LEFT JOIN (
               SELECT t2.id, t2.created_at
               FROM user_beer_tastings t2
               JOIN beers b2 ON b2.id = t2.beer_id AND b2.brewery_id = $1
               WHERE t2.created_at >= CURRENT_DATE - INTERVAL '${intervalExpr}'
             ) t ON DATE(t.created_at) = d.day
             GROUP BY d.day
             ORDER BY d.day ASC`,
            [breweryId]
          ),
          // Daily views series for the selected window
          pool.query(
            `SELECT d.day::text AS date, COALESCE(COUNT(bv.id)::int, 0) AS views
             FROM generate_series(CURRENT_DATE - INTERVAL '${intervalExpr}', CURRENT_DATE, '1 day') AS d(day)
             LEFT JOIN (
               SELECT bv2.id, bv2.viewed_at
               FROM beer_views bv2
               JOIN beers b2 ON b2.id = bv2.beer_id AND b2.brewery_id = $1
               WHERE bv2.viewed_at >= CURRENT_DATE - INTERVAL '${intervalExpr}'
             ) bv ON DATE(bv.viewed_at) = d.day
             GROUP BY d.day
             ORDER BY d.day ASC`,
            [breweryId]
          ),
          // Top 10 beers by views in the selected window
          pool.query(
            `SELECT b.id AS "beerId", b.name AS "beerName", b.image_url AS "imageUrl",
                    COUNT(bv.id)::int AS views
             FROM beer_views bv
             JOIN beers b ON b.id = bv.beer_id
             WHERE b.brewery_id = $1
               AND bv.viewed_at >= CURRENT_DATE - INTERVAL '${intervalExpr}'
             GROUP BY b.id, b.name, b.image_url
             ORDER BY COUNT(bv.id) DESC
             LIMIT 10`,
            [breweryId]
          ),
        ]);

        // Run count queries separately (simpler SQL)
        const [checkinsMonthRow, checkinsTotalRow, topBeerRows] = await Promise.all([
          pool.query(
            `SELECT COUNT(t.id)::int AS n
             FROM user_beer_tastings t
             JOIN beers b ON b.id = t.beer_id AND b.brewery_id = $1
             WHERE t.created_at >= $2`,
            [breweryId, windowStart]
          ),
          pool.query(
            `SELECT COUNT(t.id)::int AS n
             FROM user_beer_tastings t
             JOIN beers b ON b.id = t.beer_id AND b.brewery_id = $1`,
            [breweryId]
          ),
          pool.query(
            `SELECT b.id, b.name, b.image_url AS "imageUrl",
                    COUNT(t.id)::int AS checkins,
                    ROUND(COALESCE(AVG(t.rating)::numeric, 0), 1)::float AS "avgRating"
             FROM user_beer_tastings t
             JOIN beers b ON b.id = t.beer_id
             WHERE b.brewery_id = $1
             GROUP BY b.id, b.name, b.image_url
             ORDER BY COUNT(t.id) DESC
             LIMIT 5`,
            [breweryId]
          ),
        ]);

        const viewsLast30 = (viewsSeriesRows.rows ?? []).reduce((s: number, r: any) => s + Number(r.views), 0);

        return {
          favorites: favs[0]?.n ?? 0,
          checkinsMonth: Number(checkinsMonthRow.rows[0]?.n ?? 0),
          checkinsTotal: Number(checkinsTotalRow.rows[0]?.n ?? 0),
          topBeersAllTime: topBeerRows.rows ?? [],
          checkinSeries: (checkinSeriesRows.rows ?? []).map((r: any) => ({ date: r.date, checkins: Number(r.checkins) })),
          viewsWeek: viewsWeekRows[0]?.total ?? 0,
          viewsLast30,
          viewsSeries: (viewsSeriesRows.rows ?? []).map((r: any) => ({ date: r.date, views: Number(r.views) })),
          topBeersByViews: (topBeersByViewsRows.rows ?? []).map((r: any) => ({
            beerId: r.beerId,
            beerName: r.beerName,
            imageUrl: r.imageUrl ?? null,
            views: Number(r.views),
          })),
        };
      });

      res.json(payload);
    } catch (err: any) {
      console.error("Brewery stats-extended error:", err.message);
      res.status(500).json({ message: "Errore stats birrificio" });
    }
  });

  // ─── Analytics: pub analytics for owner dashboard ───────────────────────────
  app.get("/api/pubs/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = req.user?.id;
      const pub = await storage.getPub(pubId);
      if (!pub) { res.status(404).json({ message: "Pub non trovato" }); return; }
      const isOwner = pub.ownerId === userId;
      const isAdminUser = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdminUser) { res.status(403).json({ message: "Non autorizzato" }); return; }

      // Last 30 days of views
      const rows = await db.execute(
        sql`SELECT view_date::text as view_date, view_count
            FROM pub_page_views
            WHERE pub_id = ${pubId}
              AND view_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY view_date ASC`
      );

      // Build a complete 30-day series (fill missing days with 0)
      const map: Record<string, number> = {};
      for (const row of (rows as any).rows ?? rows) {
        map[row.view_date] = Number(row.view_count);
      }
      const series: { date: string; views: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        series.push({ date: key, views: map[key] ?? 0 });
      }

      const today = series[series.length - 1]?.views ?? 0;
      const yesterday = series[series.length - 2]?.views ?? 0;
      const last7 = series.slice(-7).reduce((s, d) => s + d.views, 0);
      const last30 = series.reduce((s, d) => s + d.views, 0);

      res.json({ today, yesterday, last7, last30, series });
    } catch (err: any) {
      console.error("Analytics error:", err.message);
      res.status(500).json({ message: "Errore nel recupero delle analitiche" });
    }
  });

  // ─── Home: recenti aggiunte alla taplist ─────────────────────────────────────
  app.get("/api/home/taplist-activity", async (_req, res) => {
    try {
      const data = await memCached("home:taplist-activity", 2 * 60 * 1000, async () => {
        const rows = await db.execute(sql`
          SELECT
            tl.id,
            p.id  AS pub_id,
            p.name AS pub_name,
            p.logo_url AS pub_logo,
            p.cover_image_url AS pub_cover,
            p.city AS pub_city,
            b.id   AS beer_id,
            b.name AS beer_name,
            b.style AS beer_style,
            b.abv,
            b.image_url AS beer_image,
            tl.tap_type
          FROM tap_list tl
          JOIN pubs  p ON p.id = tl.pub_id  AND p.is_active = true
          JOIN beers b ON b.id = tl.beer_id
          WHERE tl.is_active = true
          ORDER BY COALESCE(tl.updated_at, tl.added_at) DESC NULLS LAST, tl.id DESC
          LIMIT 20
        `);
        return (rows as any).rows ?? rows;
      });
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Home: recent brewery announcements (all breweries, for home page feed) ──
  app.get("/api/home/announcements", async (_req, res) => {
    try {
      const rows = await memCached("home:announcements", 3 * 60 * 1000, () =>
        db
          .select({
            id: breweryAnnouncements.id,
            type: breweryAnnouncements.type,
            title: breweryAnnouncements.title,
            content: breweryAnnouncements.content,
            releaseDate: breweryAnnouncements.releaseDate,
            createdAt: breweryAnnouncements.createdAt,
            breweryId: breweryAnnouncements.breweryId,
            breweryName: breweries.name,
            breweryLogo: breweries.logoUrl,
          })
          .from(breweryAnnouncements)
          .innerJoin(breweries, eq(breweries.id, breweryAnnouncements.breweryId))
          .where(eq(breweryAnnouncements.isPublished, true))
          .orderBy(desc(breweryAnnouncements.createdAt))
          .limit(8)
      );
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
      res.json(rows);
    } catch (e: any) {
      // Table may not exist yet in this environment — return empty array gracefully
      console.warn("[home/announcements]", e.message);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json([]);
    }
  });

  // ─── Brewery Announcements ───────────────────────────────────────────────────
  // GET public announcements
  app.get("/api/breweries/:id/announcements", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const rows = await db
        .select()
        .from(breweryAnnouncements)
        .where(and(eq(breweryAnnouncements.breweryId, breweryId), eq(breweryAnnouncements.isPublished, true)))
        .orderBy(desc(breweryAnnouncements.createdAt))
        .limit(20);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // POST create announcement (brewery owner only)
  app.post("/api/breweries/:id/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const brewery = await db.select().from(breweries).where(eq(breweries.id, breweryId)).limit(1);
      if (!brewery[0]) { res.status(404).json({ message: "Birrificio non trovato" }); return; }
      const isOwner = req.user?.breweryId === breweryId;
      const isAdmin = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdmin) { res.status(403).json({ message: "Non autorizzato" }); return; }
      const parsed = insertBreweryAnnouncementSchema.parse({ ...req.body, breweryId });
      const [created] = await db.insert(breweryAnnouncements).values(parsed).returning();
      res.status(201).json(created);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // DELETE announcement
  app.delete("/api/breweries/:id/announcements/:annId", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const annId = parseInt(req.params.annId);
      const brewery = await db.select().from(breweries).where(eq(breweries.id, breweryId)).limit(1);
      if (!brewery[0]) { res.status(404).json({ message: "Birrificio non trovato" }); return; }
      const isOwner = req.user?.breweryId === breweryId;
      const isAdmin = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdmin) { res.status(403).json({ message: "Non autorizzato" }); return; }
      await db.delete(breweryAnnouncements).where(and(eq(breweryAnnouncements.id, annId), eq(breweryAnnouncements.breweryId, breweryId)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Brewery Distribution ────────────────────────────────────────────────────
  // GET pubs that have at least one beer from this brewery on their taplist
  app.get("/api/breweries/:id/distribution", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const isOwner = user?.breweryId === breweryId;
      const isAdminUser = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdminUser) { res.status(403).json({ message: "Non autorizzato" }); return; }

      const rows = await db.execute(sql`
        SELECT
          p.id, p.name, p.address, p.city, p.region,
          p.latitude, p.longitude, p.logo_url,
          COUNT(DISTINCT tl.beer_id)::int AS beer_count,
          MAX(tl.updated_at) AS last_updated,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'beerId', b.id,
              'beerName', b.name,
              'imageUrl', b.image_url,
              'updatedAt', tl.updated_at
            ) ORDER BY b.name ASC
          ) AS beers_on_tap
        FROM tap_list tl
        JOIN beers b ON b.id = tl.beer_id AND b.brewery_id = ${breweryId}
        JOIN pubs p ON p.id = tl.pub_id AND p.is_active = true
        WHERE tl.is_active = true
        GROUP BY p.id, p.name, p.address, p.city, p.region, p.latitude, p.longitude, p.logo_url
        ORDER BY beer_count DESC, p.name ASC
        LIMIT 100
      `);
      res.json((rows as any).rows ?? rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Beer Passport ───────────────────────────────────────────────────────────
  // GET: for authenticated user, returns regions of tasted beers (with brewery region)
  app.get("/api/users/me/beer-passport", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      // From tastings → beer → brewery → region
      const tastingRows = await db.execute(sql`
        SELECT DISTINCT
          br.region,
          br.location,
          COUNT(DISTINCT ubt.beer_id)::int AS beers_tasted,
          COUNT(DISTINCT br.id)::int AS breweries_tasted
        FROM user_beer_tastings ubt
        JOIN beers b ON b.id = ubt.beer_id
        JOIN breweries br ON br.id = b.brewery_id
        WHERE ubt.user_id = ${userId}
          AND br.region IS NOT NULL AND br.region != ''
        GROUP BY br.region, br.location
        ORDER BY beers_tasted DESC
      `);
      // Also count total unique beers tasted
      const totalRows = await db.execute(sql`
        SELECT COUNT(DISTINCT beer_id)::int AS total_beers,
               COUNT(DISTINCT (SELECT brewery_id FROM beers WHERE id = beer_id))::int AS total_breweries
        FROM user_beer_tastings WHERE user_id = ${userId}
      `);
      const total = ((totalRows as any).rows ?? totalRows)[0] ?? { total_beers: 0, total_breweries: 0 };
      res.json({
        regions: (tastingRows as any).rows ?? tastingRows,
        totalBeers: Number(total.total_beers),
        totalBreweries: Number(total.total_breweries),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Robots.txt ─────────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send([
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin/",
      "Disallow: /dashboard/",
      "Disallow: /api/",
      "Disallow: /auth",
      "Disallow: /onboarding",
      "Disallow: /scan",
      "Disallow: /tv/",
      "Disallow: /festival-tv/",
      "",
      "# AI crawlers — allow indexing for GEO/AEO",
      "User-agent: GPTBot",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
      "User-agent: PerplexityBot",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
      "User-agent: ClaudeBot",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
      "User-agent: Googlebot",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
      "Sitemap: https://fermenta.to/sitemap.xml",
    ].join("\n"));
  });

  // ─── Sitemap ────────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const [allPubs, allBreweries, allBeers, allFestivals] = await Promise.all([
        db.select({ id: pubs.id, updatedAt: pubs.updatedAt }).from(pubs).where(eq(pubs.isActive, true)).limit(5000),
        db.select({ id: breweries.id, updatedAt: sql<string>`NOW()` }).from(breweries).limit(5000),
        db.select({ id: beers.id }).from(beers).limit(10000),
        db.select({ slug: festivals.slug, updatedAt: sql<string>`NOW()` }).from(festivals).limit(1000),
      ]);
      const base = "https://fermenta.to";
      const todayISO = new Date().toISOString().slice(0, 10);
      const url = (loc: string, priority: string, freq: string, lastmod?: string) =>
        `  <url><loc>${base}${loc}</loc><lastmod>${lastmod ?? todayISO}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
      const lines = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`,
        url("/", "1.0", "daily"),
        url("/explore/pubs", "0.9", "daily"),
        url("/explore/breweries", "0.9", "weekly"),
        url("/explore/beers", "0.9", "weekly"),
        url("/search", "0.7", "weekly"),
        ...allPubs.map((p) => url(`/pub/${p.id}`, "0.8", "daily", p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined)),
        ...allBreweries.map((b) => url(`/brewery/${b.id}`, "0.7", "weekly")),
        ...allBeers.map((b) => url(`/beer/${b.id}`, "0.6", "monthly")),
        ...allFestivals.filter((f) => f.slug).map((f) => url(`/festival/${f.slug}`, "0.8", "weekly")),
        `</urlset>`,
      ];
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(lines.join("\n"));
    } catch (err: any) {
      console.error("Sitemap error:", err.message);
      res.status(500).send("Errore generazione sitemap");
    }
  });

  // ─── Social + AI crawler OG tag injection ───────────────────────────────────
  const SOCIAL_BOTS = /whatsapp|telegram|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot|gptbot|perplexitybot|claudebot|anthropic|applebot|yandex|duckduckbot|bytespider/i;

  const ogHtml = (meta: { title: string; description: string; image?: string; url: string; type?: string; jsonld?: object | object[] }) => `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="UTF-8">
<title>${meta.title}</title>
<meta name="description" content="${meta.description.replace(/"/g, '&quot;')}">
<link rel="canonical" href="${meta.url}">
<meta property="og:title" content="${meta.title.replace(/"/g, '&quot;')}">
<meta property="og:description" content="${meta.description.replace(/"/g, '&quot;')}">
<meta property="og:url" content="${meta.url}">
<meta property="og:type" content="${meta.type ?? "website"}">
<meta property="og:site_name" content="Fermenta.to">
<meta property="og:locale" content="it_IT">
${meta.image ? `<meta property="og:image" content="${meta.image}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@fermentato">
<meta name="twitter:title" content="${meta.title.replace(/"/g, '&quot;')}">
<meta name="twitter:description" content="${meta.description.replace(/"/g, '&quot;')}">
${meta.image ? `<meta name="twitter:image" content="${meta.image}">` : ""}
${meta.jsonld ? `<script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>` : ""}
</head><body></body></html>`;

  app.get(["/pub/:id", "/brewery/:id", "/beer/:id"], async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_BOTS.test(ua)) return next();
    try {
      const base = "https://fermenta.to";
      const id = parseInt(String(req.params.id));
      if (req.path.startsWith("/pub/")) {
        const pub = await storage.getPub(id);
        if (!pub) return next();
        const p = pub as any;
        const pubUrl = `${base}/pub/${id}`;
        res.send(ogHtml({
          title: `${p.name} — Birre artigianali | Fermenta.to`,
          description: p.description ? p.description.slice(0, 155) : `Scopri la taplist di ${p.name} su Fermenta.to. Orari, posizione e birre artigianali disponibili.`,
          image: p.coverImageUrl || p.imageUrl,
          url: pubUrl,
          type: "website",
          jsonld: [
            { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": base + "/" }, { "@type": "ListItem", "position": 2, "name": "Pub", "item": base + "/explore/pubs" }, { "@type": "ListItem", "position": 3, "name": p.name, "item": pubUrl }] },
            { "@context": "https://schema.org", "@type": "BarOrPub", "@id": pubUrl, "name": p.name, "description": p.description?.slice(0, 200) || `Pub con birre artigianali a ${p.city ?? "Italia"}`, "url": pubUrl, "image": p.coverImageUrl || p.imageUrl, "priceRange": "€€", "servesCuisine": "Craft Beer", "telephone": p.phone, ...(p.address ? { "address": { "@type": "PostalAddress", "streetAddress": p.address, "addressLocality": p.city, "addressCountry": "IT" } } : {}), ...(p.latitude && p.longitude ? { "geo": { "@type": "GeoCoordinates", "latitude": p.latitude, "longitude": p.longitude } } : {}) }
          ],
        }));
      } else if (req.path.startsWith("/brewery/")) {
        const br = await storage.getBrewery(id);
        if (!br) return next();
        const b = br as any;
        const brewUrl = `${base}/brewery/${id}`;
        res.send(ogHtml({
          title: `${b.name} — Birrificio artigianale | Fermenta.to`,
          description: b.description ? b.description.slice(0, 155) : `Scopri le birre di ${b.name}${b.location ? ` a ${b.location}` : ""} su Fermenta.to.`,
          image: b.coverImageUrl || b.logoUrl,
          url: brewUrl,
          jsonld: [
            { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": base + "/" }, { "@type": "ListItem", "position": 2, "name": "Birrifici", "item": base + "/explore/breweries" }, { "@type": "ListItem", "position": 3, "name": b.name, "item": brewUrl }] },
            { "@context": "https://schema.org", "@type": "Brewery", "@id": brewUrl, "name": b.name, "description": b.description?.slice(0, 200) || `Birrificio artigianale${b.location ? ` a ${b.location}` : ""}`, "url": brewUrl, "image": b.coverImageUrl || b.logoUrl, ...(b.logoUrl ? { "logo": { "@type": "ImageObject", "url": b.logoUrl } } : {}), ...(b.location ? { "address": { "@type": "PostalAddress", "addressLocality": b.location, "addressCountry": "IT" } } : {}), ...(b.website ? { "sameAs": [b.website] } : {}) }
          ],
        }));
      } else {
        const beer = await storage.getBeer(id);
        if (!beer) return next();
        const beerData = beer as any;
        const beerUrl = `${base}/beer/${id}`;
        res.send(ogHtml({
          title: `${beerData.name} — ${beerData.style ?? "Birra artigianale"} | Fermenta.to`,
          description: beerData.description ? beerData.description.slice(0, 155) : `${beerData.name} è una ${beerData.style ?? "birra artigianale"}${beerData.brewery?.name ? ` di ${beerData.brewery.name}` : ""}${beerData.abv ? `. Gradazione: ${beerData.abv}% ABV` : ""}. Scoprila su Fermenta.to.`,
          image: beerData.imageUrl,
          url: beerUrl,
          jsonld: [
            { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": base + "/" }, { "@type": "ListItem", "position": 2, "name": "Birre", "item": base + "/explore/beers" }, ...(beerData.brewery?.name ? [{ "@type": "ListItem", "position": 3, "name": beerData.brewery.name, "item": base + "/brewery/" + beerData.brewery.id }] : []), { "@type": "ListItem", "position": beerData.brewery?.name ? 4 : 3, "name": beerData.name, "item": beerUrl }] },
            { "@context": "https://schema.org", "@type": "Product", "@id": beerUrl, "name": beerData.name, "description": beerData.description?.slice(0, 200) || `${beerData.name} — ${beerData.style ?? "birra artigianale"}`, "url": beerUrl, "image": beerData.imageUrl, "category": beerData.style, "brand": beerData.brewery?.name ? { "@type": "Brand", "name": beerData.brewery.name } : undefined, "additionalProperty": [...(beerData.abv ? [{ "@type": "PropertyValue", "name": "ABV", "value": `${beerData.abv}%` }] : []), ...(beerData.ibu ? [{ "@type": "PropertyValue", "name": "IBU", "value": String(beerData.ibu) }] : [])] }
          ],
        }));
      }
    } catch { next(); }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VIRTUAL CELLAR
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/cellar", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(`
      SELECT uc.*, b.name as beer_name, b.style as beer_style, b.abv as beer_abv,
             b.image_url as beer_image, br.name as brewery_name, br.logo_url as brewery_logo
      FROM user_cellar uc
      JOIN beers b ON b.id = uc.beer_id
      LEFT JOIN breweries br ON br.id = b.brewery_id
      WHERE uc.user_id = $1
      ORDER BY uc.added_at DESC
    `, [userId]);
    res.json(rows);
  });

  app.post("/api/user/cellar", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { beerId, quantity = 1, notes, vintage, purchasePrice } = req.body;
    if (!beerId) return res.status(400).json({ message: "beerId richiesto" });
    try {
      const { rows } = await pool.query(`
        INSERT INTO user_cellar (user_id, beer_id, quantity, notes, vintage, purchase_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, beer_id) DO UPDATE
          SET quantity = $3, notes = $4, vintage = $5, purchase_price = $6
        RETURNING *
      `, [userId, beerId, quantity, notes || null, vintage || null, purchasePrice || null]);
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/user/cellar/:beerId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await pool.query(`DELETE FROM user_cellar WHERE user_id = $1 AND beer_id = $2`, [userId, req.params.beerId]);
    res.json({ ok: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WISHLIST
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/wishlist", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(`
      SELECT uw.*, b.name as beer_name, b.style as beer_style, b.abv as beer_abv,
             b.image_url as beer_image, br.name as brewery_name, br.logo_url as brewery_logo
      FROM user_wishlist uw
      JOIN beers b ON b.id = uw.beer_id
      LEFT JOIN breweries br ON br.id = b.brewery_id
      WHERE uw.user_id = $1
      ORDER BY uw.added_at DESC
    `, [userId]);
    res.json(rows);
  });

  app.post("/api/user/wishlist", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { beerId } = req.body;
    if (!beerId) return res.status(400).json({ message: "beerId richiesto" });
    const { rows } = await pool.query(`
      INSERT INTO user_wishlist (user_id, beer_id) VALUES ($1, $2)
      ON CONFLICT (user_id, beer_id) DO NOTHING
      RETURNING *
    `, [userId, beerId]);
    res.json(rows[0] ?? { userId, beerId });
  });

  app.delete("/api/user/wishlist/:beerId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await pool.query(`DELETE FROM user_wishlist WHERE user_id = $1 AND beer_id = $2`, [userId, req.params.beerId]);
    res.json({ ok: true });
  });

  // ─── Wishlist available nearby ────────────────────────────────────────────
  // GET /api/user/wishlist/available-nearby?lat=X&lng=Y&radius=20
  // Requires valid lat/lng — returns pubs within `radius` km that currently
  // have wishlist beers on tap (is_active=true) or in bottles (is_active=true).
  // MUST be registered BEFORE the parameterized /:beerId route below so Express
  // does not treat the literal segment "available-nearby" as a beerId value.
  app.get("/api/user/wishlist/available-nearby", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id as string;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 20;

    // Geolocation is required — without it we cannot say anything is "nearby"
    if (!isFinite(lat) || !isFinite(lng)) {
      return res.json({ available: [] });
    }

    try {
      // 1. Get user's wishlist beer IDs
      const { rows: wishlistRows } = await pool.query(
        'SELECT beer_id FROM user_wishlist WHERE user_id = $1',
        [userId]
      );
      if (wishlistRows.length === 0) return res.json({ available: [] });

      const beerIds = wishlistRows.map((r: any) => r.beer_id as number);

      // 2. Haversine distance expression (parameterised lat/lng via literal values
      //    already validated as finite floats above — safe to interpolate)
      const distanceExpr = `(6371 * acos(
        LEAST(1.0, cos(radians(${lat})) * cos(radians(p.latitude::float))
          * cos(radians(p.longitude::float) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(p.latitude::float))
        )))`;

      // 3. Query active taplist and bottle_list entries for the beer IDs,
      //    joined to pubs with known coordinates within radius
      const { rows } = await pool.query(`
        SELECT
          sub.beer_id,
          sub.pub_id,
          p.name       AS pub_name,
          p.city,
          p.slug       AS pub_slug,
          p.logo_url   AS pub_logo,
          ${distanceExpr} AS distance_km,
          sub.source
        FROM (
          SELECT tl.beer_id, tl.pub_id, 'tap'::text AS source
          FROM tap_list tl
          WHERE tl.beer_id = ANY($1) AND tl.is_active = TRUE
          UNION ALL
          SELECT bl.beer_id, bl.pub_id, 'bottle'::text AS source
          FROM bottle_list bl
          WHERE bl.beer_id = ANY($1) AND bl.is_active = TRUE
        ) sub
        JOIN pubs p ON p.id = sub.pub_id
        WHERE p.latitude  IS NOT NULL
          AND p.longitude IS NOT NULL
          AND ${distanceExpr} <= ${radius}
        ORDER BY ${distanceExpr} ASC
        LIMIT 50
      `, [beerIds]);

      res.json({ available: rows });
    } catch (error) {
      console.error("[wishlist/available-nearby]", error);
      res.status(500).json({ message: "Failed to check nearby availability" });
    }
  });

  // Check if a single beer is in the user's wishlist (parameterized — must stay AFTER available-nearby)
  app.get("/api/user/wishlist/:beerId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(
      `SELECT id FROM user_wishlist WHERE user_id = $1 AND beer_id = $2`,
      [userId, req.params.beerId]
    );
    res.json({ inWishlist: rows.length > 0 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROSSIMA SPINA (Next Tap Voting)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/pubs/:pubId/next-tap", async (req, res) => {
    const pubId = await resolvePubId(req.params.pubId);
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = (req.user as any)?.id ?? null;
    const { rows } = await pool.query(`
      SELECT ntp.*, b.name as beer_name, b.style as beer_style, b.abv as beer_abv,
             b.image_url as beer_image, br.name as brewery_name,
             COALESCE(ntp.keg_count, 1) as keg_count,
             COUNT(ntv.id) as vote_count,
             ${userId ? `MAX(CASE WHEN ntv.user_id = $2 THEN 1 ELSE 0 END) = 1 as user_voted` : `false as user_voted`}
      FROM next_tap_proposals ntp
      JOIN beers b ON b.id = ntp.beer_id
      LEFT JOIN breweries br ON br.id = b.brewery_id
      LEFT JOIN next_tap_votes ntv ON ntv.proposal_id = ntp.id
      WHERE ntp.pub_id = $1 AND ntp.is_active = true
      GROUP BY ntp.id, b.name, b.style, b.abv, b.image_url, br.name
      ORDER BY vote_count DESC
    `, userId ? [pubId, userId] : [pubId]);
    res.json(rows);
  });

  app.post("/api/pubs/:pubId/next-tap", isAuthenticated, async (req, res) => {
    const pubId = await resolvePubId(String(req.params.pubId));
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = (req.user as any).id;
    const pub = await storage.getPub(pubId);
    const user = req.user as any;
    if (!pub) return res.status(404).json({ message: "Pub non trovato" });
    if (pub.ownerId !== userId && !user.isAdmin) return res.status(403).json({ message: "Non autorizzato" });
    const { beerId, description, kegCount } = req.body;
    if (!beerId) return res.status(400).json({ message: "beerId richiesto" });
    const count = Math.max(1, Math.min(20, parseInt(kegCount) || 1));
    const { rows } = await pool.query(`
      INSERT INTO next_tap_proposals (pub_id, beer_id, description, keg_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [pubId, beerId, description || null, count]);
    res.json(rows[0]);
  });

  app.patch("/api/next-tap/:proposalId/count", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const user = req.user as any;
    const proposalId = parseInt(String(req.params.proposalId));
    const { rows: found } = await pool.query(
      `SELECT ntp.*, p.owner_id FROM next_tap_proposals ntp JOIN pubs p ON p.id = ntp.pub_id WHERE ntp.id = $1`,
      [proposalId]
    );
    if (!found[0]) return res.status(404).json({ message: "Proposta non trovata" });
    if (found[0].owner_id !== userId && !user.isAdmin) return res.status(403).json({ message: "Non autorizzato" });
    const delta = parseInt(req.body.delta) || 0;
    const current = found[0].keg_count ?? 1;
    const newCount = Math.max(0, Math.min(20, current + delta));
    if (newCount === 0) {
      await pool.query(`DELETE FROM next_tap_proposals WHERE id = $1`, [proposalId]);
      return res.json({ removed: true });
    }
    const { rows } = await pool.query(
      `UPDATE next_tap_proposals SET keg_count = $1 WHERE id = $2 RETURNING *`,
      [newCount, proposalId]
    );
    res.json(rows[0]);
  });

  app.post("/api/next-tap/:proposalId/vote", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const proposalId = parseInt(String(req.params.proposalId));
    try {
      await pool.query(`
        INSERT INTO next_tap_votes (proposal_id, user_id) VALUES ($1, $2)
        ON CONFLICT (proposal_id, user_id) DO NOTHING
      `, [proposalId, userId]);
      const { rows } = await pool.query(`SELECT COUNT(*) as votes FROM next_tap_votes WHERE proposal_id = $1`, [proposalId]);
      res.json({ votes: parseInt(rows[0].votes) });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/next-tap/:proposalId/vote", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    await pool.query(`DELETE FROM next_tap_votes WHERE proposal_id = $1 AND user_id = $2`, [req.params.proposalId, userId]);
    const { rows } = await pool.query(`SELECT COUNT(*) as votes FROM next_tap_votes WHERE proposal_id = $1`, [req.params.proposalId]);
    res.json({ votes: parseInt(rows[0].votes) });
  });

  app.delete("/api/next-tap/:proposalId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const user = req.user as any;
    const { rows } = await pool.query(`SELECT ntp.*, p.owner_id FROM next_tap_proposals ntp JOIN pubs p ON p.id = ntp.pub_id WHERE ntp.id = $1`, [req.params.proposalId]);
    if (!rows[0]) return res.status(404).json({ message: "Proposta non trovata" });
    if (rows[0].owner_id !== userId && !user.isAdmin) return res.status(403).json({ message: "Non autorizzato" });
    await pool.query(`DELETE FROM next_tap_proposals WHERE id = $1`, [req.params.proposalId]);
    res.json({ ok: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TAP CHANGE LOGS (cambi fusto)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/pubs/:pubId/tap-change-logs", isAuthenticated, async (req: any, res) => {
    const pubId = await resolvePubId(req.params.pubId);
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = req.user?.id;
    const canEdit = await isAdminOrPubOwner(userId, pubId);
    if (!canEdit) return res.status(403).json({ message: "Non autorizzato" });
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const { rows } = await pool.query(
      `SELECT * FROM tap_change_logs WHERE pub_id = $1 ORDER BY changed_at DESC LIMIT $2`,
      [pubId, limit]
    );
    res.json(rows);
  });

  app.post("/api/pubs/:pubId/tap-change-logs", isAuthenticated, async (req: any, res) => {
    const pubId = await resolvePubId(req.params.pubId);
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = req.user?.id;
    const canEdit = await isAdminOrPubOwner(userId, pubId);
    if (!canEdit) return res.status(403).json({ message: "Non autorizzato" });
    const { tapNumber, tapType, oldBeerId, oldBeerName, newBeerId, newBeerName, durationMinutes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tap_change_logs (pub_id, tap_number, tap_type, old_beer_id, old_beer_name, new_beer_id, new_beer_name, duration_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [pubId, tapNumber ?? null, tapType ?? null, oldBeerId ?? null, oldBeerName ?? null, newBeerId ?? null, newBeerName ?? null, durationMinutes ?? null]
    );
    res.status(201).json(rows[0]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TAP CLEANINGS (lavaggi linee)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/pubs/:pubId/tap-cleanings", isAuthenticated, async (req: any, res) => {
    const pubId = await resolvePubId(req.params.pubId);
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = req.user?.id;
    const canEdit = await isAdminOrPubOwner(userId, pubId);
    if (!canEdit) return res.status(403).json({ message: "Non autorizzato" });
    const { rows } = await pool.query(
      `SELECT * FROM tap_cleanings WHERE pub_id = $1 ORDER BY cleaned_at DESC LIMIT 200`,
      [pubId]
    );
    res.json(rows);
  });

  app.post("/api/pubs/:pubId/tap-cleanings", isAuthenticated, async (req: any, res) => {
    const pubId = await resolvePubId(req.params.pubId);
    if (!pubId) return res.status(404).json({ message: "Pub non trovato" });
    const userId = req.user?.id;
    const canEdit = await isAdminOrPubOwner(userId, pubId);
    if (!canEdit) return res.status(403).json({ message: "Non autorizzato" });
    const { tapNumber, tapType, lineName, notes, cleanedAt } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tap_cleanings (pub_id, tap_number, tap_type, line_name, notes, cleaned_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [pubId, tapNumber ?? null, tapType ?? 'spina', lineName ?? null, notes ?? null, cleanedAt ? new Date(cleanedAt) : new Date()]
    );
    res.status(201).json(rows[0]);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // USER FOLLOWS
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/following", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(`
      SELECT u.id, u.nickname as username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') as display_name,
             u.profile_image_url,
             uf.created_at as followed_at
      FROM user_follows uf
      JOIN users u ON u.id = uf.following_id
      WHERE uf.follower_id = $1
      ORDER BY uf.created_at DESC
    `, [userId]);
    res.json(rows);
  });

  app.get("/api/user/followers", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(`
      SELECT u.id, u.nickname as username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') as display_name,
             u.profile_image_url,
             uf.created_at as followed_at
      FROM user_follows uf
      JOIN users u ON u.id = uf.follower_id
      WHERE uf.following_id = $1
      ORDER BY uf.created_at DESC
    `, [userId]);
    res.json(rows);
  });

  app.get("/api/users/:userId/follow-status", isAuthenticated, async (req, res) => {
    const meId = (req.user as any).id;
    const { rows } = await pool.query(`SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2`, [meId, req.params.userId]);
    res.json({ following: rows.length > 0 });
  });

  app.post("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    const meId = (req.user as any).id;
    const targetId = String(req.params.userId);
    if (meId === targetId) return res.status(400).json({ message: "Non puoi seguire te stesso" });
    await pool.query(`INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [meId, targetId]);
    res.json({ following: true });

    // Async: push + notifica in-app all'utente seguito
    (async () => {
      try {
        const me = req.user as any;
        const displayName = me.nickname || [me.firstName, me.lastName].filter(Boolean).join(" ").trim() || "Qualcuno";
        const profileUrl = me.nickname ? `/user/${me.nickname}` : "/feed";
        await Promise.allSettled([
          sendPushToUser(targetId, {
            title: "👤 Nuovo follower",
            body: `${displayName} ha iniziato a seguirti`,
            url: profileUrl,
            tag: `follow-${meId}`,
            category: 'newFollowers',
          }),
          storage.createNotification({
            userId: targetId,
            type: "follow",
            title: "Nuovo follower",
            message: `${displayName} ha iniziato a seguirti`,
          }),
        ]);
      } catch (e) {
        console.error("[follow] notification error:", e);
      }
    })();
  });

  app.delete("/api/users/:userId/follow", isAuthenticated, async (req, res) => {
    const meId = (req.user as any).id;
    await pool.query(`DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`, [meId, req.params.userId]);
    res.json({ following: false });
  });

  // Public user search (for social discovery)
  app.get("/api/users/search", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").trim();
      if (q.length < 2) return res.json([]);
      const { rows } = await pool.query(
        `SELECT id, nickname, first_name, last_name, profile_image_url
         FROM users
         WHERE is_public IS NOT FALSE
           AND (
             unaccent(lower(COALESCE(nickname,''))) LIKE unaccent(lower($1))
             OR unaccent(lower(COALESCE(first_name,''))) LIKE unaccent(lower($1))
             OR unaccent(lower(COALESCE(last_name,''))) LIKE unaccent(lower($1))
           )
         ORDER BY nickname NULLS LAST
         LIMIT 20`,
        [`%${q}%`]
      );
      res.json(rows);
    } catch (err) {
      console.error("User search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  /* Unified mention search: users + pubs + breweries */
  app.get("/api/mentions/search", async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").trim();
      if (q.length < 1) return res.json([]);
      const like = `%${q}%`;
      const { rows } = await pool.query(`
        SELECT 'user' AS kind, id AS id, id AS slug,
               COALESCE(nickname, TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) AS name,
               nickname AS handle,
               profile_image_url AS image
        FROM users
        WHERE is_public IS NOT FALSE
          AND (
            unaccent(lower(COALESCE(nickname,'')))    LIKE unaccent(lower($1))
            OR unaccent(lower(COALESCE(first_name,''))) LIKE unaccent(lower($1))
            OR unaccent(lower(COALESCE(last_name,'')))  LIKE unaccent(lower($1))
          )

        UNION ALL

        SELECT 'pub' AS kind, id::text AS id, COALESCE(slug, id::text) AS slug,
               name, slug AS handle, logo_url AS image
        FROM pubs
        WHERE unaccent(lower(COALESCE(name,''))) LIKE unaccent(lower($1))
           OR lower(COALESCE(slug,'')) LIKE lower($1)

        UNION ALL

        SELECT 'brewery' AS kind, id::text AS id, COALESCE(slug, id::text) AS slug,
               name, slug AS handle, logo_url AS image
        FROM breweries
        WHERE unaccent(lower(COALESCE(name,''))) LIKE unaccent(lower($1))
           OR lower(COALESCE(slug,'')) LIKE lower($1)

        ORDER BY name
        LIMIT 20
      `, [like]);
      res.json(rows);
    } catch (err) {
      console.error("Mentions search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Activity feed from people I follow
  app.get("/api/user/feed", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 50);
    // Keyset/cursor pagination: cursor = "<isoTs>_<id>" over (tasted_at, id) DESC.
    // Avoids duplicates/skips when new check-ins land between page fetches.
    const cursor = parseFeedCursor(req.query.cursor as string | undefined);

    const params: any[] = [userId];
    let cursorClause = "";
    if (cursor) {
      params.push(cursor.ts, cursor.id);
      cursorClause = `AND (ubt.tasted_at::timestamptz, ubt.id) < ($${params.length - 1}::timestamptz, $${params.length}::int)`;
    }
    params.push(limit + 1);

    const { rows } = await pool.query(`
      SELECT ubt.id, ubt.rating, ubt.personal_notes as notes, ubt.photo_url, ubt.format, ubt.tasted_at,
             u.id as user_id,
             u.nickname as username,
             COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.nickname) as display_name,
             u.profile_image_url,
             b.id as beer_id, b.name as beer_name, b.style as beer_style, b.image_url as beer_image,
             br.name as brewery_name,
             p.id as pub_id, p.name as pub_name, p.city as pub_city,
             COALESCE(lc.likes_count, 0)::int AS likes_count,
             COALESCE(cc.comments_count, 0)::int AS comments_count,
             (EXISTS(SELECT 1 FROM checkin_likes cl2 WHERE cl2.tasting_id = ubt.id AND cl2.user_id = $1)) AS liked
      FROM user_beer_tastings ubt
      JOIN users u ON u.id = ubt.user_id
      JOIN beers b ON b.id = ubt.beer_id
      LEFT JOIN breweries br ON br.id = b.brewery_id
      LEFT JOIN pubs p ON p.id = ubt.pub_id
      LEFT JOIN (
        SELECT tasting_id, COUNT(*)::int AS likes_count FROM checkin_likes GROUP BY tasting_id
      ) lc ON lc.tasting_id = ubt.id
      LEFT JOIN (
        SELECT tasting_id, COUNT(*)::int AS comments_count FROM checkin_comments GROUP BY tasting_id
      ) cc ON cc.tasting_id = ubt.id
      WHERE ubt.user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = $1
      )
      ${cursorClause}
      ORDER BY ubt.tasted_at DESC, ubt.id DESC
      LIMIT $${params.length}
    `, params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? makeFeedCursor(last.tasted_at, last.id) : null;
    res.json({ items, hasMore, nextCursor });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // USER STATS (computed from tastings)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = String((req.user as any).id);
      const [tastingsCountRes, totalRes, styleRes, breweryRes, formatRes, monthlyRes, topBeersRes, streakRes] = await Promise.all([
        db.select({ cnt: count() }).from(userBeerTastings).where(eq(userBeerTastings.userId, userId)),
        pool.query(`SELECT AVG(rating) as avg_rating, MAX(rating) as max_rating FROM user_beer_tastings WHERE user_id = $1`, [userId]),
        pool.query(`SELECT b.style, COUNT(*) as cnt FROM user_beer_tastings ubt JOIN beers b ON b.id = ubt.beer_id WHERE ubt.user_id = $1 AND b.style IS NOT NULL GROUP BY b.style ORDER BY cnt DESC LIMIT 5`, [userId]),
        pool.query(`SELECT br.name, br.logo_url, COUNT(*) as cnt FROM user_beer_tastings ubt JOIN beers b ON b.id = ubt.beer_id LEFT JOIN breweries br ON br.id = b.brewery_id WHERE ubt.user_id = $1 AND br.name IS NOT NULL GROUP BY br.name, br.logo_url ORDER BY cnt DESC LIMIT 5`, [userId]),
        pool.query(`SELECT format, COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1 AND format IS NOT NULL GROUP BY format ORDER BY cnt DESC`, [userId]),
        pool.query(`SELECT DATE_TRUNC('month', tasted_at) as month, COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1 GROUP BY month ORDER BY month DESC LIMIT 12`, [userId]),
        pool.query(`SELECT b.id, b.name, b.image_url, b.style, ubt.rating FROM user_beer_tastings ubt JOIN beers b ON b.id = ubt.beer_id WHERE ubt.user_id = $1 AND ubt.rating IS NOT NULL ORDER BY ubt.rating DESC, ubt.tasted_at DESC LIMIT 10`, [userId]),
        pool.query(`
          WITH daily AS (
            SELECT DATE_TRUNC('day', tasted_at)::date AS d FROM user_beer_tastings WHERE user_id = $1
            GROUP BY d ORDER BY d DESC
          ),
          streaks AS (
            SELECT d, d - ROW_NUMBER() OVER (ORDER BY d DESC)::int * INTERVAL '1 day' as grp FROM daily
          )
          SELECT COUNT(*) as streak FROM streaks WHERE grp = (SELECT grp FROM streaks LIMIT 1)
        `, [userId]),
      ]);
      const tastingsTotal = Number(tastingsCountRes[0]?.cnt ?? 0);
      // beer_reviews is an optional table; default to 0 if it doesn't exist
      const reviewsTotal = await pool.query(`SELECT COUNT(*) as total FROM beer_reviews WHERE user_id = $1`, [userId])
        .then((r) => parseInt(r.rows[0]?.total ?? 0))
        .catch(() => 0);
      const avgRow = totalRes.rows[0];
      res.json({
        total: tastingsTotal,
        totalCheckins: tastingsTotal,
        totalReviews: reviewsTotal,
        avgRating: avgRow?.avg_rating ? parseFloat(parseFloat(avgRow.avg_rating).toFixed(1)) : null,
        topStyles: styleRes.rows,
        topBreweries: breweryRes.rows,
        formatBreakdown: formatRes.rows,
        monthlyActivity: monthlyRes.rows.reverse(),
        topBeers: topBeersRes.rows,
        currentStreak: parseInt(streakRes.rows[0]?.streak ?? 0),
      });
    } catch (e: any) {
      console.error("[user/stats]", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BADGES (computed from activity)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/badges", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const [countRes, withNotesRes, withPhotoRes, stylesRes, hasMaxRatingRes, followsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1`, [userId]),
      pool.query(`SELECT COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1 AND personal_notes IS NOT NULL AND personal_notes != ''`, [userId]),
      pool.query(`SELECT COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1 AND photo_url IS NOT NULL`, [userId]),
      pool.query(`SELECT COUNT(DISTINCT b.style) as cnt FROM user_beer_tastings ubt JOIN beers b ON b.id = ubt.beer_id WHERE ubt.user_id = $1 AND b.style IS NOT NULL`, [userId]),
      pool.query(`SELECT COUNT(*) as cnt FROM user_beer_tastings WHERE user_id = $1 AND rating >= 5.0`, [userId]),
      pool.query(`SELECT COUNT(*) as cnt FROM user_follows WHERE follower_id = $1`, [userId]),
    ]);
    const total = parseInt(countRes.rows[0].cnt);
    const withNotes = parseInt(withNotesRes.rows[0].cnt);
    const withPhoto = parseInt(withPhotoRes.rows[0].cnt);
    const styles = parseInt(stylesRes.rows[0].cnt);
    const maxRatings = parseInt(hasMaxRatingRes.rows[0].cnt);
    const follows = parseInt(followsRes.rows[0].cnt);

    const allBadges = [
      { key: "primo_sorso", name: "Primo Sorso", description: "Primo assaggio registrato", icon: "🍺", earned: total >= 1 },
      { key: "esploratore", name: "Esploratore", description: "10 assaggi completati", icon: "🧭", earned: total >= 10 },
      { key: "degustatore", name: "Degustatore", description: "25 assaggi completati", icon: "🎓", earned: total >= 25 },
      { key: "sommelier", name: "Sommelier", description: "50 assaggi completati", icon: "🏆", earned: total >= 50 },
      { key: "guru", name: "Guru della Birra", description: "100 assaggi completati", icon: "⭐", earned: total >= 100 },
      { key: "critico", name: "Critico", description: "10 assaggi con note scritte", icon: "✍️", earned: withNotes >= 10 },
      { key: "fotografo", name: "Fotografo", description: "Prima foto aggiunta a un assaggio", icon: "📸", earned: withPhoto >= 1 },
      { key: "cacciatore_stili", name: "Cacciatore di Stili", description: "5 stili diversi assaggiati", icon: "🎯", earned: styles >= 5 },
      { key: "globe_trotter", name: "Globe Trotter", description: "10 stili diversi assaggiati", icon: "🌍", earned: styles >= 10 },
      { key: "perfezionista", name: "Perfezionista", description: "Voto 5.0 dato a una birra", icon: "💎", earned: maxRatings >= 1 },
      { key: "sociale", name: "Sociale", description: "Segui 5 amici", icon: "👥", earned: follows >= 5 },
    ];
    res.json(allBadges);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AI SOMMELIER (algorithmic recommendations)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/user/recommendations", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    // 1. Get user's top styles (from ratings >= 4)
    const { rows: topStyles } = await pool.query(`
      SELECT b.style, AVG(ubt.rating) as avg_rating, COUNT(*) as cnt
      FROM user_beer_tastings ubt
      JOIN beers b ON b.id = ubt.beer_id
      WHERE ubt.user_id = $1 AND ubt.rating >= 4 AND b.style IS NOT NULL
      GROUP BY b.style
      ORDER BY avg_rating DESC, cnt DESC
      LIMIT 3
    `, [userId]);

    // 2. Get beers user hasn't tasted in those styles, sorted by community avg rating
    const styles = topStyles.map((r: any) => r.style);
    if (styles.length === 0) {
      // No preferences yet - recommend most rated beers overall
      const { rows } = await pool.query(`
        SELECT b.id, b.name, b.style, b.abv, b.image_url, br.name as brewery_name,
               AVG(ubt2.rating) as avg_rating, COUNT(ubt2.id) as rating_count
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        LEFT JOIN user_beer_tastings ubt2 ON ubt2.beer_id = b.id
        WHERE b.id NOT IN (SELECT beer_id FROM user_beer_tastings WHERE user_id = $1)
        GROUP BY b.id, br.name
        HAVING COUNT(ubt2.id) >= 2
        ORDER BY avg_rating DESC NULLS LAST
        LIMIT 10
      `, [userId]);
      return res.json({ recommendations: rows, reason: "Le birre più apprezzate dalla community" });
    }

    const { rows } = await pool.query(`
      SELECT b.id, b.name, b.style, b.abv, b.image_url, br.name as brewery_name,
             AVG(ubt2.rating) as avg_rating, COUNT(ubt2.id) as rating_count
      FROM beers b
      LEFT JOIN breweries br ON br.id = b.brewery_id
      LEFT JOIN user_beer_tastings ubt2 ON ubt2.beer_id = b.id
      WHERE b.style = ANY($2::text[])
        AND b.id NOT IN (SELECT beer_id FROM user_beer_tastings WHERE user_id = $1)
      GROUP BY b.id, br.name
      ORDER BY avg_rating DESC NULLS LAST, rating_count DESC
      LIMIT 10
    `, [userId, styles]);
    res.json({ recommendations: rows, topStyles: styles, reason: `Basate sui tuoi stili preferiti: ${styles.slice(0, 2).join(", ")}` });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC USER PROFILE (for social features)
  // ─────────────────────────────────────────────────────────────────────────────
  app.get("/api/users/:userId/profile", async (req, res) => {
    const { rows } = await pool.query(`
      SELECT u.id,
             u.nickname as username,
             COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.nickname) as display_name,
             u.profile_image_url, u.created_at,
             COUNT(DISTINCT ubt.id) as tasting_count,
             ROUND(AVG(ubt.rating)::numeric, 1) as avg_rating,
             COUNT(DISTINCT uf1.follower_id) as followers_count,
             COUNT(DISTINCT uf2.following_id) as following_count
      FROM users u
      LEFT JOIN user_beer_tastings ubt ON ubt.user_id = u.id
      LEFT JOIN user_follows uf1 ON uf1.following_id = u.id
      LEFT JOIN user_follows uf2 ON uf2.follower_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.nickname, u.first_name, u.last_name, u.profile_image_url, u.created_at
    `, [req.params.userId]);
    if (!rows[0]) return res.status(404).json({ message: "Utente non trovato" });
    res.json(rows[0]);
  });

  app.get("/api/users/:userId/tastings", async (req, res) => {
    const currentUserId = (req.user as any)?.id || null;
    const { rows } = await pool.query(`
      SELECT ubt.id, ubt.rating, ubt.notes, ubt.photo_url, ubt.format, ubt.tasted_at,
             b.id as beer_id, b.name as beer_name, b.style as beer_style, b.image_url as beer_image,
             br.name as brewery_name,
             COALESCE(lc.likes_count, 0)::int AS likes_count,
             COALESCE(cc.comments_count, 0)::int AS comments_count,
             (EXISTS(SELECT 1 FROM checkin_likes cl2 WHERE cl2.tasting_id = ubt.id AND cl2.user_id = $2)) AS liked
      FROM user_beer_tastings ubt
      JOIN beers b ON b.id = ubt.beer_id
      LEFT JOIN breweries br ON br.id = b.brewery_id
      LEFT JOIN (
        SELECT tasting_id, COUNT(*)::int AS likes_count FROM checkin_likes GROUP BY tasting_id
      ) lc ON lc.tasting_id = ubt.id
      LEFT JOIN (
        SELECT tasting_id, COUNT(*)::int AS comments_count FROM checkin_comments GROUP BY tasting_id
      ) cc ON cc.tasting_id = ubt.id
      WHERE ubt.user_id = $1
      ORDER BY ubt.tasted_at DESC
      LIMIT 20
    `, [req.params.userId, currentUserId]);
    res.json(rows);
  });

  // Check if beer is in user's cellar
  app.get("/api/user/cellar/:beerId", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).id;
    const { rows } = await pool.query(`SELECT * FROM user_cellar WHERE user_id = $1 AND beer_id = $2`, [userId, req.params.beerId]);
    res.json(rows[0] ?? null);
  });

  // ── App version check + APK download ─────────────────────────────────────
  // Endpoint letto dall'APK Capacitor all'avvio per verificare se serve aggiornare.
  // Variabili d'ambiente sul server:
  //   APP_VERSION      = versione corrente dell'APK (es. "1.0.0")  default: "1.0.0"
  //   APP_MIN_VERSION  = versione minima richiesta  (es. "1.1.0")  default: "1.0.0"
  //   APP_RELEASE_NOTES = testo opzionale mostrato nel dialog       default: ""
  app.get("/api/app-version", (_req, res) => {
    const ver = getAppVersion();
    res.json({
      current:      ver,
      minimum:      process.env.APP_MIN_VERSION    ?? ver,
      downloadUrl:  "https://fermenta.to/api/download/apk",
      releaseNotes: process.env.APP_RELEASE_NOTES  ?? "",
    });
  });

  // Scarica l'APK più recente — il file va copiato in <root>/downloads/fermenta.apk
  // dal build script (GitHub Actions → build-android.yml lo carica via artefatto,
  // oppure build-apk.sh su VPS lo copia automaticamente).
  app.get("/api/download/apk", (_req, res) => {
    const apkPath = join(process.cwd(), "downloads", "fermenta.apk");
    if (!existsSync(apkPath)) {
      return res.status(404).json({
        error: "APK non disponibile al momento. Riprova più tardi.",
      });
    }
    res.setHeader("Content-Disposition", 'attachment; filename="fermenta.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.sendFile(apkPath);
  });
  // ──────────────────────────────────────────────────────────────────────────

  const httpServer = createServer(app);
  return httpServer;
}
