/**
 * Script: import-beers-csv.ts
 *
 * Importa birre da CSV nel DB, collegandole ai birrifici per nome.
 * Gestisce file con 1M+ righe in streaming (senza caricare tutto in memoria).
 * Skippa birre già presenti (stesso nome normalizzato + stesso birrificio).
 *
 * Uso (un file):
 *   npx tsx scripts/import-beers-csv.ts attached_assets/file.csv
 *
 * Uso (due file in sequenza):
 *   npx tsx scripts/import-beers-csv.ts \
 *     attached_assets/rb_Beers_A-J_clean2_1773065275434.csv \
 *     attached_assets/rb_Beers_K-Z_clean2_1773065275434.csv
 *
 * Formati colonne supportati (rilevati automaticamente dall'intestazione):
 *
 *   FORMATO A (yhop/italiano):
 *     ID, Nome Birra, Birrificio, Stile, ABV, Descrizione, Immagine
 *
 *   FORMATO B (ratebeer nuovo):
 *     Beer ID, Brewer Name, Beer Name, ABV, Style Name, Brewer Country Name, Brewer Country Code
 */

import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
import { beers, breweries } from "../shared/schema";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL non impostato");

const isNeon = DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("neon.");

let db: any;
if (isNeon) {
  const { Pool: NeonPool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { default: ws } = await import("ws");
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString: DATABASE_URL });
  db = drizzle({ client: pool });
} else {
  const pg = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new pg.default.Pool({ connectionString: DATABASE_URL });
  db = drizzle({ client: pool });
}

// ─── Normalizzazione ─────────────────────────────────────────────────────────
function normName(s: string): string {
  return (s || "")
    .trim()
    // Apostrofi curvi → dritto, virgolette tipografiche → standard
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // BOM residuo
    .replace(/\uFEFF/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Parse ABV - gestisce:
//   - interi tipo 45 → 4.5%, 120 → 12.0%
//   - scientific notation artifact "6,4E+14" → 6.4%
//   - decimali normali "4.5" → 4.5%
function parseAbv(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  if (s === "0") return 0;

  let val: number;

  if (s.toUpperCase().includes("E")) {
    // "6,4E+14" → prendi la parte prima di E → "6,4" → 6.4
    const beforeE = s.split(/[Ee]/)[0];
    val = parseFloat(beforeE.replace(",", "."));
  } else {
    val = parseFloat(s.replace(",", ".").replace("%", ""));
  }

  if (isNaN(val) || val < 0) return null;

  // Se è un intero > 30, è probabilmente memorizzato come ABV × 10
  // es. 45 → 4.5%, 120 → 12.0%
  if (val > 30) {
    val = val / 10;
  }

  // Ancora troppo alto dopo la divisione → dato errato
  if (val > 50) return null;

  return Math.round(val * 10) / 10;
}

// ─── Rileva formato CSV dall'intestazione ────────────────────────────────────
type Format = "A_yhop" | "B_ratebeer";

function detectFormat(headers: string[]): Format {
  const h = headers.map((x) => x.toLowerCase().trim());
  if (h.includes("nome birra") || h.includes("birrificio")) return "A_yhop";
  // "beer id", "brewer name", "beer name" ecc.
  if (h.includes("brewer name") || h.includes("beer name")) return "B_ratebeer";
  if (h.some((x) => x.includes("brewer"))) return "B_ratebeer";
  return "A_yhop";
}

// ─── Estrai campi utili dalla riga CSV ───────────────────────────────────────
interface BeerRow {
  name: string;
  style: string;
  abv: number | null;
  description?: string;
  breweryNameRaw: string;
}

function extractRow(row: Record<string, string>, format: Format): BeerRow | null {
  if (format === "A_yhop") {
    const name = (row["Nome Birra"] || row["nome birra"] || "").trim();
    const brewery = (row["Birrificio"] || row["birrificio"] || "").trim();
    const style = (row["Stile"] || row["stile"] || "").trim();
    const abv = parseAbv(row["ABV"] || row["abv"] || "");
    const desc = (row["Descrizione"] || row["descrizione"] || "").trim();
    if (!name || !brewery) return null;
    return { name, style: style || "Other", abv, description: desc || undefined, breweryNameRaw: brewery };
  }

  if (format === "B_ratebeer") {
    // Colonne: Beer ID, Brewer Name, Beer Name, ABV, Style Name, Brewer Country Name, Brewer Country Code
    const name = (row["Beer Name"] || row["beer name"] || row["beer_name"] || "").trim();
    const brewery = (row["Brewer Name"] || row["brewer name"] || row["brewer_name"] || "").trim();
    const style = (row["Style Name"] || row["style name"] || row["style"] || "").trim();
    const abv = parseAbv(row["ABV"] || row["abv"] || "");
    if (!name || !brewery) return null;
    return { name, style: style || "Other", abv, breweryNameRaw: brewery };
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvFiles = process.argv.slice(2);

  if (csvFiles.length === 0) {
    console.error("Uso: npx tsx scripts/import-beers-csv.ts <file1.csv> [file2.csv] ...");
    process.exit(1);
  }

  // ─── Carica tutti i birrifici dal DB (nome → id) ──────────────────────────
  console.log("Caricamento birrifici dal DB...");
  const allBreweries = await db.select({ id: breweries.id, name: breweries.name }).from(breweries);
  const breweryByName = new Map<string, number>();
  for (const b of allBreweries) {
    breweryByName.set(normName(b.name), b.id);
  }
  console.log(`   ${breweryByName.size} birrifici disponibili per il matching`);

  // Dedup gestito dal DB via ON CONFLICT DO NOTHING (idx_beers_name_brewery_unique)
  const existingCountResult = await db.select({ count: sql<number>`COUNT(*)` }).from(beers);
  console.log(`   ${existingCountResult[0]?.count ?? 0} birre già presenti nel DB (dedup via indice DB)`);

  // ─── Stato globale ────────────────────────────────────────────────────────
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalNoBrewery = 0;
  let totalErrors = 0;
  let totalLines = 0;

  const BATCH_SIZE = 500;

  // ─── Processa ogni file CSV ───────────────────────────────────────────────
  for (const csvFile of csvFiles) {
    const fullPath = path.resolve(csvFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`File non trovato: ${fullPath}`);
      continue;
    }

    console.log(`\nImportazione: ${path.basename(csvFile)}`);

    let format: Format | null = null;
    let headersRead = false;
    let fileLines = 0;
    let fileInserted = 0;
    let fileSkipped = 0;
    let fileNoBrewery = 0;
    let fileErrors = 0;

    let batch: typeof beers.$inferInsert[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      try {
        const result = await db.insert(beers).values(batch).onConflictDoNothing();
        const inserted = (result as any)?.rowCount ?? batch.length;
        fileInserted += inserted;
        totalInserted += inserted;
        const skipped = batch.length - inserted;
        fileSkipped += skipped;
        totalSkipped += skipped;
      } catch (e: any) {
        for (const row of batch) {
          try {
            await db.insert(beers).values([row]).onConflictDoNothing();
            fileInserted++;
            totalInserted++;
          } catch {
            fileErrors++;
            totalErrors++;
          }
        }
      }
      batch = [];
    };

    const stream = createReadStream(fullPath, { encoding: "utf8" }).pipe(
      csvParser({ bom: true, skipLines: 0 })
    );

    for await (const row of stream as AsyncIterable<Record<string, string>>) {
      if (!headersRead) {
        headersRead = true;
        format = detectFormat(Object.keys(row));
        console.log(`   Formato rilevato: ${format}`);
      }

      fileLines++;
      totalLines++;

      const extracted = extractRow(row, format!);
      if (!extracted) {
        fileSkipped++;
        totalSkipped++;
        continue;
      }

      // ── Trova brewery_id nel DB per nome ────────────────────────────────
      const normalizedBrewerName = normName(extracted.breweryNameRaw);
      const dbBreweryId = breweryByName.get(normalizedBrewerName);

      if (!dbBreweryId) {
        fileNoBrewery++;
        totalNoBrewery++;
        continue;
      }

      // ── Aggiunge al batch (dedup via ON CONFLICT DO NOTHING sull'indice DB) ─
      const beerRow: any = {
        name: extracted.name.substring(0, 255),
        style: (extracted.style || "Other").substring(0, 100),
        abv: extracted.abv !== null ? String(extracted.abv) : null,
        description: extracted.description || null,
        breweryId: dbBreweryId,
        isAlcoholFree: extracted.abv === 0,
        isGlutenFree: false,
      };

      batch.push(beerRow);

      if (batch.length >= BATCH_SIZE) await flush();

      if (fileLines % 50000 === 0) {
        console.log(
          `   [${new Date().toISOString().substring(11,19)}] ${fileLines.toLocaleString()} righe | inserite: ${fileInserted.toLocaleString()} | no_birrificio: ${fileNoBrewery.toLocaleString()} | dup: ${fileSkipped.toLocaleString()}`
        );
      }
    }

    await flush();

    console.log(`\n   File completato:`);
    console.log(`     Righe lette:              ${fileLines.toLocaleString()}`);
    console.log(`     Birre inserite:           ${fileInserted.toLocaleString()}`);
    console.log(`     Duplicate (skip):         ${fileSkipped.toLocaleString()}`);
    console.log(`     Birrificio non trovato:   ${fileNoBrewery.toLocaleString()}`);
    console.log(`     Errori:                   ${fileErrors.toLocaleString()}`);
  }

  // ─── Riepilogo finale ─────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(50)}`);
  console.log(`IMPORTAZIONE COMPLETATA`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Totale righe processate:    ${totalLines.toLocaleString()}`);
  console.log(`Totale birre inserite:      ${totalInserted.toLocaleString()}`);
  console.log(`Duplicate saltate:          ${totalSkipped.toLocaleString()}`);
  console.log(`Birrificio non trovato:     ${totalNoBrewery.toLocaleString()}`);
  console.log(`Errori:                     ${totalErrors.toLocaleString()}`);

  // ─── Aggiorna sequenza ID ─────────────────────────────────────────────────
  const maxIdResult = await db.execute(sql`SELECT MAX(id) AS max_id FROM beers`);
  const newMaxId = Number((maxIdResult.rows[0] as any).max_id) || 0;
  if (newMaxId > 0) {
    await db.execute(sql`SELECT setval('beers_id_seq', ${newMaxId})`);
    console.log(`\nSequenza ID aggiornata a: ${newMaxId}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("Errore fatale:", e);
  process.exit(1);
});
