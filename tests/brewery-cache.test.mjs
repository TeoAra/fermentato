// Integration test: brewery explore/search cache canonicalization (Task #159)
//
// Verifica che:
// 1. Richieste equivalenti (spazi/case) condividano la stessa cache entry E
//    la stessa query canonica — quindi restituiscano lo stesso risultato.
// 2. Richieste semanticamente diverse NON condividano la entry.
// 3. La cache dell'explore renda le richieste ripetute veloci.
//
// Esegui con:  node tests/brewery-cache.test.mjs
// Richiede che il server sia avviato (npm run dev).

const BASE = process.env.BASE_URL || "http://localhost:5000";

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
}

async function getJson(path) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30000) });
  const body = await res.json();
  return { status: res.status, body, ms: Date.now() - t0 };
}

// ── 1. Whitespace/case variants of the same search share one canonical result ──
const a = await getJson(`/api/breweries/search?q=${encodeURIComponent("baladin")}`);
const b = await getJson(`/api/breweries/search?q=${encodeURIComponent("  baladin  ")}`);
const c = await getJson(`/api/breweries/search?q=${encodeURIComponent("BALADIN")}`);
check("search: trimmed variant returns same result", JSON.stringify(a.body) === JSON.stringify(b.body));
check("search: case variant returns same result", JSON.stringify(a.body) === JSON.stringify(c.body));
check("search: 200 OK", a.status === 200 && b.status === 200 && c.status === 200);

// ── 2. Distinct queries do not collide ──
const d = await getJson(`/api/breweries/search?q=${encodeURIComponent("brew")}`);
check("search: distinct query yields distinct result", JSON.stringify(a.body) !== JSON.stringify(d.body));

// ── 3. Explore: whitespace variant of country shares entry, repeated hit is fast ──
const e1 = await getJson(`/api/breweries/explore?country=Italia&page=1&limit=12`);
const e2 = await getJson(`/api/breweries/explore?country=${encodeURIComponent(" Italia ")}&page=1&limit=12`);
check("explore: trimmed country variant returns same result", JSON.stringify(e1.body) === JSON.stringify(e2.body));
check("explore: cached repeat is fast (<300ms)", e2.ms < 300, `(${e2.ms}ms)`);

// ── 4. Explore: different page = different entry ──
const e3 = await getJson(`/api/breweries/explore?country=Italia&page=2&limit=12`);
check("explore: different page yields different result", JSON.stringify(e1.body) !== JSON.stringify(e3.body));

// ── 5. Delimiter collision: (q="x:y", country="z") must NOT share an entry
//       with (q="x", country="y:z") — keys are JSON-serialized, not ':'-joined ──
const c1 = await getJson(`/api/breweries/explore?q=${encodeURIComponent("x:y")}&country=${encodeURIComponent("z")}&page=1&limit=12`);
const c2 = await getJson(`/api/breweries/explore?q=${encodeURIComponent("x")}&country=${encodeURIComponent("y:z")}&page=1&limit=12`);
check("explore: colon-delimiter variants do not collide",
  JSON.stringify(c1.body) !== JSON.stringify(c2.body) || (c1.body.total === 0 && c2.body.total === 0),
  `(t1=${c1.body.total}, t2=${c2.body.total})`);
// Stronger check on a pair that DID collide under the old ':'-joined key
// (both produced ":italia::1:12") but whose results genuinely differ:
// q=":italia" matches no brewery name, while country="italia" matches many.
const c3 = await getJson(`/api/breweries/explore?q=${encodeURIComponent(":italia")}&page=1&limit=12`);
const c4 = await getJson(`/api/breweries/explore?country=italia&page=1&limit=12`);
check("explore: old-key-colliding pair yields independent (different) results",
  c3.body.total === 0 && c4.body.total > 0,
  `(q=':italia' total=${c3.body.total}, country='italia' total=${c4.body.total})`);

// ── 6. Single-flight: N concurrent COLD requests on the same fresh key must
//       share ONE storage query. Serially they'd take ~N × cold-time; with
//       single-flight the batch completes in ~1 × cold-time. ──
const freshQ = `zx${Date.now() % 100000}`; // unique per run → guaranteed cold
const coldStart = Date.now();
const single = await getJson(`/api/breweries/explore?q=${encodeURIComponent(freshQ)}a&page=1&limit=12`);
const coldMs = Date.now() - coldStart;
const t0 = Date.now();
const batch = await Promise.all(
  Array.from({ length: 5 }, () => getJson(`/api/breweries/explore?q=${encodeURIComponent(freshQ)}b&page=1&limit=12`))
);
const batchMs = Date.now() - t0;
const allEqual = batch.every(r => JSON.stringify(r.body) === JSON.stringify(batch[0].body));
check("single-flight: 5 concurrent cold requests return identical body", allEqual);
check("single-flight: batch completes in ~1x cold time, not 5x",
  batchMs < Math.max(coldMs * 2.5, 1500),
  `(cold=${coldMs}ms, batch of 5=${batchMs}ms)`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
