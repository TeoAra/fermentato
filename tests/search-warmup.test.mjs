// Integration test: search cache warm-up (Task #126)
//
// Verifica che dopo l'avvio del server (e il warm-up statico di 5 s),
// le query a 1-2 caratteri ricavate dal corpus del DB siano già in cache
// e restituiscano X-Cache: HIT senza toccare PostgreSQL a freddo.
//
// Esegui con:  node tests/search-warmup.test.mjs
// Richiede che il server sia avviato (npm run dev) da almeno 15 secondi.

const BASE = process.env.BASE_URL || "http://localhost:5000";

async function checkPrefix(prefix, timeoutMs = 10000) {
  const url = `${BASE}/api/search?q=${encodeURIComponent(prefix)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const cacheHeader = res.headers.get("x-cache") ?? "(missing)";
  return { status: res.status, cacheHeader };
}

// Phase 1: probe ALL 26 single-char prefixes IN PARALLEL so the test stays fast.
const SEED_CHARS = "abcdefghijklmnopqrstuvwxyz".split("");
const probeResults = await Promise.all(
  SEED_CHARS.map(async (ch) => {
    try {
      const { status, cacheHeader } = await checkPrefix(ch);
      return { ch, hit: status === 200 && cacheHeader === "HIT" };
    } catch {
      return { ch, hit: false };
    }
  })
);

const hits = probeResults.filter(r => r.hit).map(r => r.ch);
const misses = probeResults.filter(r => !r.hit).map(r => r.ch);

console.log(`1-char HIT  (${hits.length}/26): ${hits.join(", ") || "(none)"}`);
console.log(`1-char MISS (${misses.length}/26): ${misses.join(", ")}`);
console.log();

let pass = 0;
let fail = 0;
const errors = [];

// Must have warmed at least 3 distinct single-char prefixes (corpus-derived).
if (hits.length >= 3) {
  pass++;
  console.log(`✓ ${hits.length} single-char prefixes cached — prefix warm-up is active`);
} else {
  fail++;
  errors.push(
    `✗ Only ${hits.length} single-char prefix(es) cached — expected ≥3. ` +
    `Warm-up may not have completed or the corpus is too small.`
  );
}

// Phase 2: for each cached 1-char prefix, verify that re-fetching it is STILL a HIT
// (cache is stable, not a one-time flush).
if (hits.length > 0) {
  const reChecks = await Promise.all(
    hits.slice(0, 5).map(async (ch) => {
      try {
        const { status, cacheHeader } = await checkPrefix(ch);
        return status === 200 && cacheHeader === "HIT";
      } catch { return false; }
    })
  );
  const stableCount = reChecks.filter(Boolean).length;
  if (stableCount === Math.min(hits.length, 5)) {
    pass++;
    console.log(`✓ Re-fetch confirms cache is stable for all ${stableCount} sampled prefix(es)`);
  } else {
    fail++;
    errors.push(`✗ ${Math.min(hits.length,5) - stableCount} prefix(es) lost their cache entry on re-fetch`);
  }
}

// Phase 3: X-Cache: MISS on first cold request, then HIT on repeat.
// We use an unlikely prefix to ensure it wasn't in the warm-up corpus.
// Allow up to 25 s for the first (cold) request — Neon may need to wake up.
const coldProbe = "zzz";
try {
  const first = await checkPrefix(coldProbe, 25000);
  const second = await checkPrefix(coldProbe, 10000);
  const firstIsMiss = first.status === 200 && first.cacheHeader === "MISS";
  const secondIsHit  = second.status === 200 && second.cacheHeader === "HIT";
  if (firstIsMiss && secondIsHit) {
    pass++;
    console.log(`✓ First-request X-Cache: MISS → second-request X-Cache: HIT for q="${coldProbe}" (caching works)`);
  } else {
    fail++;
    errors.push(
      `✗ q="${coldProbe}": 1st X-Cache=${first.cacheHeader} (expected MISS), 2nd X-Cache=${second.cacheHeader} (expected HIT)`
    );
  }
} catch (e) {
  fail++;
  errors.push(`✗ cold-probe fetch error: ${e.message}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (errors.length) {
  console.log("\nFailures:");
  errors.forEach(e => console.log(" ", e));
}
process.exit(fail > 0 ? 1 : 0);
