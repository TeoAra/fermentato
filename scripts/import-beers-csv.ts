/**
 * Script: import-beers-csv.ts
 *
 * Importa birre da CSV nel DB, collegandole ai birrifici per NOME.
 * Gestisce file con 1M+ righe in streaming (senza caricare tutto in memoria).
 * Skippa birre già presenti (stesso nome + stesso birrificio).
 *
 * Uso:
 *   npx tsx scripts/import-beers-csv.ts <file.csv>
 *   npx tsx scripts/import-beers-csv.ts attached_assets/birre_yhop_1753136978542.csv
 *
 * Formati colonne supportati (rilevati automaticamente dall'intestazione):
 *
 *   FORMATO A (yhop/italiano):
 *     ID, Nome Birra, Birrificio, Stile, ABV, Descrizione, Immagine
 *
 *   FORMATO B (ratebeer-style con brewery_id):
 *     beer_id, beer_name, brewery_id, brewery_name, style, abv, description, ...
 *     (brewery_id riferisce al mapping xlsx_id → db_id salvato in brewery-id-map.json)
 *
 * Il mapping xlsx birrifici va generato prima con: import-breweries-xlsx.ts
 */

import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { beers, breweries } from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL non impostato");

const db = drizzle(neon(DATABASE_URL));

// ─── Normalizzazione ─────────────────────────────────────────────────────────
function normName(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseAbv(raw: string): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace("%", "").trim());
  if (isNaN(n)) return null;
  return Math.round(n * 10) / 10; // 1 decimale
}

// ─── Rileva formato CSV dall'intestazione ────────────────────────────────────
type Format = "A_yhop" | "B_ratebeer";

function detectFormat(headers: string[]): Format {
  const h = headers.map(x => x.toLowerCase().trim());
  if (h.includes("nome birra") || h.includes("birrificio")) return "A_yhop";
  if (h.includes("brewery_id") || h.includes("beer_name")) return "B_ratebeer";
  // Fallback: prova a capire
  if (h.some(x => x.includes("brewer"))) return "B_ratebeer";
  return "A_yhop";
}

// ─── Estrai campi utili dalla riga CSV ───────────────────────────────────────
interface BeerRow {
  name: string;
  style: string;
  abv: number | null;
  description?: string;
  breweryNameRaw?: string;   // per formato A e B (lookup per nome)
  breweryXlsxId?: number;    // per formato B (lookup per id mapping)
}

function extractRow(row: Record<string, string>, format: Format): BeerRow | null {
  if (format === "A_yhop") {
    const name    = (row["Nome Birra"] || row["nome birra"] || "").trim();
    const brewery = (row["Birrificio"] || row["birrificio"] || "").trim();
    const style   = (row["Stile"]     || row["stile"]      || "").trim();
    const abv     = parseAbv(row["ABV"] || row["abv"] || "");
    const desc    = (row["Descrizione"] || row["descrizione"] || "").trim();
    if (!name || !brewery || !style) return null;
    return { name, style, abv, description: desc || undefined, breweryNameRaw: brewery };
  }

  if (format === "B_ratebeer") {
    const name       = (row["beer_name"]     || row["Beer Name"]     || row["name"]         || "").trim();
    const brewName   = (row["brewery_name"]  || row["Brewery Name"]  || row["brewer_name"]  || "").trim();
    const brewIdRaw  = (row["brewery_id"]    || row["Brewer ID"]     || "").trim();
    const style      = (row["style"]         || row["Style"]         || row["beer_style"]   || "").trim();
    const abv        = parseAbv(row["abv"]   || row["ABV"]           || "");
    const desc       = (row["description"]   || row["Description"]   || "").trim();
    if (!name || !style) return null;
    return {
      name,
      style,
      abv,
      description: desc || undefined,
      breweryNameRaw: brewName || undefined,
      breweryXlsxId: brewIdRaw ? Number(brewIdRaw) : undefined,
    };
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvFile   = process.argv[2];
  const mapFile   = path.resolve("scripts/brewery-id-map.json");

  if (!csvFile) {
    console.error("Uso: npx tsx scripts/import-beers-csv.ts <file.csv>");
    process.exit(1);
  }
  if (!fs.existsSync(csvFile)) {
    console.error(`File non trovato: ${csvFile}`);
    process.exit(1);
  }

  // ─── Carica mapping xlsx_id → db_id (se esiste) ──────────────────────────
  let xlsxIdToDbId: Record<number, number> = {};
  if (fs.existsSync(mapFile)) {
    xlsxIdToDbId = JSON.parse(fs.readFileSync(mapFile, "utf-8"));
    console.log(`📋 Mapping birrifici caricato: ${Object.keys(xlsxIdToDbId).length} voci`);
  } else {
    console.log("⚠️  Nessun file brewery-id-map.json trovato — collegamento solo per nome");
  }

  // ─── Carica tutti i birrifici dal DB (nome → id) ──────────────────────────
  console.log("🔍 Caricamento birrifici dal DB...");
  const allBreweries = await db.select({ id: breweries.id, name: breweries.name }).from(breweries);
  const breweryByName = new Map<string, number>();
  for (const b of allBreweries) {
    breweryByName.set(normName(b.name), b.id);
  }
  console.log(`   ${breweryByName.size} birrifici disponibili`);

  // ─── Carica birre esistenti (name lower + brewery_id) per dedup ───────────
  console.log("🔍 Caricamento birre esistenti...");
  const allBeers = await db.select({ name: beers.name, breweryId: beers.breweryId }).from(beers);
  const existingBeers = new Set<string>();
  for (const b of allBeers) {
    existingBeers.add(`${normName(b.name)}::${b.breweryId}`);
  }
  console.log(`   ${existingBeers.size} birre già nel DB`);

  // ─── Streaming lettura CSV ────────────────────────────────────────────────
  console.log(`\n📂 Lettura CSV: ${csvFile}`);

  let format: Format | null = null;
  let inserted = 0;
  let skipped  = 0;
  let noBrewery = 0;
  let errors  = 0;
  let total   = 0;

  const BATCH_SIZE = 300;
  let batch: typeof beers.$inferInsert[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    try {
      await db.insert(beers).values(batch);
      inserted += batch.length;
    } catch (e: any) {
      // Prova insert uno a uno per isolare eventuali errori
      for (const row of batch) {
        try {
          await db.insert(beers).values([row]);
          inserted++;
        } catch {
          errors++;
        }
      }
    }
    batch = [];
  };

  // Usa for-await per gestire il backpressure correttamente (non carica tutto in memoria)
  const stream = createReadStream(csvFile).pipe(csvParser());

  let headersRead = false;
  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    if (!headersRead) {
      headersRead = true;
      format = detectFormat(Object.keys(row));
      console.log(`   Formato rilevato: ${format}`);
    }

    total++;

    const extracted = extractRow(row, format!);
    if (!extracted) { skipped++; continue; }

    // ── Trova brewery_id nel DB ───────────────────────────────────────────
    let dbBreweryId: number | undefined;

    // 1. Prova via xlsx_id → db_id (se disponibile)
    if (extracted.breweryXlsxId && xlsxIdToDbId[extracted.breweryXlsxId]) {
      dbBreweryId = xlsxIdToDbId[extracted.breweryXlsxId];
    }

    // 2. Prova via nome birrificio (match esatto normalizzato)
    if (!dbBreweryId && extracted.breweryNameRaw) {
      const norm = normName(extracted.breweryNameRaw);
      dbBreweryId = breweryByName.get(norm);

      // 3. Fallback: ricerca parziale (parole chiave del nome)
      if (!dbBreweryId && norm.length > 5) {
        const tokens = norm.split(" ").slice(0, 3).join(" ");
        for (const [key, id] of breweryByName) {
          if (key.startsWith(tokens)) {
            dbBreweryId = id;
            break;
          }
        }
      }
    }

    if (!dbBreweryId) { noBrewery++; continue; }

    // ── Dedup ─────────────────────────────────────────────────────────────
    const key = `${normName(extracted.name)}::${dbBreweryId}`;
    if (existingBeers.has(key)) { skipped++; continue; }
    existingBeers.add(key);

    // ── Aggiunge al batch ──────────────────────────────────────────────────
    batch.push({
      name: extracted.name,
      style: extracted.style || "Unknown",
      abv: extracted.abv !== null ? String(extracted.abv) : undefined,
      description: extracted.description,
      breweryId: dbBreweryId,
    } as any);

    if (batch.length >= BATCH_SIZE) await flush(); // stream in pausa automatica con for-await

    if (total % 10000 === 0) {
      process.stdout.write(
        `   ${total} righe lette | ins=${inserted} skip=${skipped} no_brewery=${noBrewery} err=${errors}\r`
      );
    }
  }
  await flush();

  console.log(`\n\n✅ Import completato!`);
  console.log(`   Totale righe lette:       ${total}`);
  console.log(`   Birre inserite:           ${inserted}`);
  console.log(`   Skippate (duplicati):     ${skipped}`);
  console.log(`   Skippate (no birrificio): ${noBrewery}`);
  console.log(`   Errori:                   ${errors}`);
}

main().catch(e => { console.error("Errore fatale:", e); process.exit(1); });
