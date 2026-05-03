// Smoke test minimo per area admin (Task #8).
// Verifica che TUTTI gli endpoint /api/admin/* (sample rappresentativo)
// rispondano con 401 senza autenticazione e che il server non vada in 500.
//
// Esegui con:  node tests/admin-smoke.test.mjs
// Richiede che il server sia avviato (npm run dev).

const BASE = process.env.BASE_URL || "http://localhost:5000";

const ENDPOINTS = [
  // stats / analytics (cached)
  ["GET", "/api/admin/stats"],
  ["GET", "/api/admin/analytics/growth"],
  ["GET", "/api/admin/analytics/popular-beers"],
  ["GET", "/api/admin/recent-activity"],
  // content lists (paginated server-side)
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/beers"],
  ["GET", "/api/admin/breweries"],
  ["GET", "/api/admin/pubs"],
  // moderation
  ["GET", "/api/admin/reports"],
  ["GET", "/api/admin/reports/pending-count"],
  // suggestions
  ["GET", "/api/admin/suggestions"],
  ["GET", "/api/admin/suggestions/pending-count"],
  // addition requests
  ["GET", "/api/admin/addition-requests"],
  ["GET", "/api/admin/addition-requests/pending-count"],
  // requests (publican / brewery)
  ["GET", "/api/admin/publican-requests"],
  ["GET", "/api/admin/brewery-requests"],
  // ricerche
  ["GET", "/api/admin/beers/search?q=test"],
  ["GET", "/api/admin/breweries/search?q=test"],
  ["GET", "/api/admin/pubs/search?q=test"],
  // mutations distruttive
  ["DELETE", "/api/admin/beers/999999"],
  ["DELETE", "/api/admin/breweries/999999"],
  ["DELETE", "/api/admin/pubs/999999"],
  ["PATCH", "/api/admin/beers/mass-update"],
  ["PATCH", "/api/admin/breweries/mass-update"],
  ["POST", "/api/admin/breweries/merge"],
  ["POST", "/api/admin/scrape-beers"],
];

let pass = 0;
let fail = 0;
const errors = [];

for (const [method, path] of ENDPOINTS) {
  try {
    const res = await fetch(`${BASE}${path}`, { method });
    if (res.status === 401) {
      pass++;
      console.log(`✓ ${method.padEnd(6)} ${path.padEnd(50)} → 401`);
    } else {
      fail++;
      const body = await res.text().catch(() => "");
      errors.push(`✗ ${method} ${path} → ${res.status} (atteso 401)\n   body: ${body.slice(0, 120)}`);
      console.log(`✗ ${method.padEnd(6)} ${path.padEnd(50)} → ${res.status}  (atteso 401)`);
    }
  } catch (e) {
    fail++;
    errors.push(`✗ ${method} ${path} → ${e.message}`);
    console.log(`✗ ${method.padEnd(6)} ${path.padEnd(50)} → network error`);
  }
}

console.log(`\n=== Risultati: ${pass}/${ENDPOINTS.length} OK, ${fail} falliti ===`);
if (fail > 0) {
  console.log("\nFallimenti:");
  errors.forEach(e => console.log("  " + e));
  process.exit(1);
}
console.log("Tutte le route admin protette correttamente.");
