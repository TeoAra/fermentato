#!/usr/bin/env npx tsx
/**
 * Fix placeholder beer images in bulk.
 *
 * Due storiche scelte, migliaia di birre hanno come `logo_url` e/o `image_url`
 * foto generiche di Unsplash (boccale generico, bottiglia stock, ecc.). Il
 * client mostra `logo_url || image_url`, quindi anche quando il finder web
 * trova un'immagine reale in `image_url`, l'utente continua a vedere il
 * boccale generico perché `logo_url` ha la priorità.
 *
 * Questo script lavora in 2 fasi:
 *
 *   FASE A (sempre eseguita, sicurissima):
 *     - Per ogni birra dove logo_url o image_url puntano a un placeholder
 *       Unsplash noto, li azzera (NULL). Nessuna immagine reale viene toccata.
 *
 *   FASE B (opzionale, --search):
 *     - Per le birre appena ripulite, lancia il finder web che cerca su
 *       Google/Wikipedia/Untappd/etc. Accetta SOLO risultati ad alta
 *       confidenza (force=false): se il finder non è sicuro, lascia la birra
 *       senza immagine invece di metterne una sbagliata.
 *
 * Uso:
 *   npx tsx scripts/fix-placeholder-beer-images.ts              # solo fase A (dry-run via --dry)
 *   npx tsx scripts/fix-placeholder-beer-images.ts --apply      # applica fase A
 *   npx tsx scripts/fix-placeholder-beer-images.ts --apply --search           # fase A + B
 *   npx tsx scripts/fix-placeholder-beer-images.ts --apply --search --limit 500
 *   npx tsx scripts/fix-placeholder-beer-images.ts --apply --search --country Italia
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { findAndUpdateBeerImage } from "../server/beer-image-finder";

neonConfig.webSocketConstructor = ws;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SEARCH = args.includes("--search");
const LIMIT = parseInt(args.find((_, i) => args[i - 1] === "--limit") ?? "0") || 0;
const COUNTRY = args.find((_, i) => args[i - 1] === "--country") ?? null;
const CONCURRENCY = parseInt(args.find((_, i) => args[i - 1] === "--concurrency") ?? "4");

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

const PLACEHOLDER_LIKE = "%unsplash.com%";

async function phaseA(): Promise<{ logosCleared: number; imagesCleared: number }> {
  console.log("\n=== FASE A — ripulisco placeholder Unsplash ===");

  const logoCountQ = await pool.query(
    `SELECT COUNT(*)::int AS n FROM beers WHERE logo_url ILIKE $1`,
    [PLACEHOLDER_LIKE],
  );
  const imageCountQ = await pool.query(
    `SELECT COUNT(*)::int AS n FROM beers WHERE image_url ILIKE $1`,
    [PLACEHOLDER_LIKE],
  );
  const logoN = logoCountQ.rows[0]?.n ?? 0;
  const imageN = imageCountQ.rows[0]?.n ?? 0;

  console.log(`  Trovate ${logoN.toLocaleString()} righe con logo_url placeholder`);
  console.log(`  Trovate ${imageN.toLocaleString()} righe con image_url placeholder`);

  if (!APPLY) {
    console.log("  [DRY-RUN] Nessuna modifica scritta. Usa --apply per applicare.");
    return { logosCleared: 0, imagesCleared: 0 };
  }

  const upd1 = await pool.query(
    `UPDATE beers SET logo_url = NULL WHERE logo_url ILIKE $1`,
    [PLACEHOLDER_LIKE],
  );
  const upd2 = await pool.query(
    `UPDATE beers SET image_url = NULL WHERE image_url ILIKE $1`,
    [PLACEHOLDER_LIKE],
  );
  console.log(`  ✓ Azzerati ${upd1.rowCount} logo_url e ${upd2.rowCount} image_url`);
  return { logosCleared: upd1.rowCount ?? 0, imagesCleared: upd2.rowCount ?? 0 };
}

async function phaseB(): Promise<void> {
  console.log("\n=== FASE B — ricerca web (solo alta confidenza) ===");

  const where: string[] = [
    "(b.logo_url IS NULL AND b.image_url IS NULL)",
  ];
  const params: any[] = [];
  if (COUNTRY) {
    params.push(COUNTRY);
    where.push(`br.country = $${params.length}`);
  }

  const limitSql = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const { rows } = await pool.query(
    `SELECT b.id, b.name, br.name AS brewery_name, br.website AS brewery_website
     FROM beers b
     LEFT JOIN breweries br ON br.id = b.brewery_id
     WHERE ${where.join(" AND ")}
     ORDER BY b.id ASC
     ${limitSql}`,
    params,
  );

  console.log(`  Candidati: ${rows.length.toLocaleString()} birre (concurrency=${CONCURRENCY})`);
  if (!APPLY) {
    console.log("  [DRY-RUN] Nessuna ricerca eseguita. Usa --apply per lanciare.");
    return;
  }

  let processed = 0;
  let updated = 0;

  async function worker(slice: typeof rows): Promise<void> {
    for (const beer of slice) {
      try {
        const before = await pool.query(
          "SELECT image_url FROM beers WHERE id = $1",
          [beer.id],
        );
        await findAndUpdateBeerImage(
          beer.id,
          beer.name,
          beer.brewery_name,
          beer.brewery_website,
          false, // force=false → accetta solo "high" confidence, in dubbio ignora
        );
        const after = await pool.query(
          "SELECT image_url FROM beers WHERE id = $1",
          [beer.id],
        );
        if (after.rows[0]?.image_url && after.rows[0].image_url !== before.rows[0]?.image_url) {
          updated++;
        }
      } catch (e: any) {
        console.warn(`  ! beer ${beer.id} "${beer.name}": ${e?.message?.substring(0, 80)}`);
      } finally {
        processed++;
        if (processed % 25 === 0) {
          console.log(`  … ${processed}/${rows.length}  (aggiornate: ${updated})`);
        }
      }
    }
  }

  const chunkSize = Math.ceil(rows.length / Math.max(1, CONCURRENCY));
  const chunks: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) chunks.push(rows.slice(i, i + chunkSize));
  await Promise.all(chunks.map(worker));

  console.log(`  ✓ Fase B completata. Processate ${processed}, immagini nuove: ${updated}`);
}

(async () => {
  console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"}${SEARCH ? "  +ricerca web" : ""}`);
  if (COUNTRY) console.log(`Filtro paese (solo fase B): ${COUNTRY}`);
  if (LIMIT > 0) console.log(`Limite (solo fase B): ${LIMIT}`);

  await phaseA();
  if (SEARCH) await phaseB();

  console.log("\nFatto.");
  await pool.end();
  process.exit(0);
})().catch(async (e) => {
  console.error("Errore fatale:", e);
  await pool.end().catch(() => {});
  process.exit(1);
});
