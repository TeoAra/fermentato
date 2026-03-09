/**
 * Script: import-breweries-xlsx.ts
 *
 * Importa birrifici da un file XLSX (RateBeer/simile) nel DB.
 * - Skippa i birrifici già esistenti (match per nome, case-insensitive)
 * - Salva la mappatura xlsx_id → db_id in scripts/brewery-id-map.json
 *   (serve poi per import-beers-csv.ts)
 *
 * Uso:
 *   npx tsx scripts/import-breweries-xlsx.ts <percorso.xlsx> [sheet_index]
 *   npx tsx scripts/import-breweries-xlsx.ts attached_assets/rb_Brewers_1773056659078.xlsx 0
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { breweries } from "../shared/schema";

import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL non impostato");

const db = drizzle(neon(DATABASE_URL));

// ─── Normalizzazione nome per confronto ─────────────────────────────────────
function normalizeName(name: string): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Mappa colonne XLSX → DB ─────────────────────────────────────────────────
// Adatta qui se le intestazioni del tuo foglio sono diverse
function mapRow(row: any[]): {
  xlsxId: number;
  name: string;
  location: string;
  region: string;
  country: string;
  description?: string;
} | null {
  // Formato atteso: Brewer ID, Brewer Name, Description, Email, Area Code,
  //                 Street Address, City, State ID, State Name, ZIP,
  //                 Country ID, Country Code, Country Name
  const xlsxId   = Number(row[0]);
  const name      = String(row[1] || "").trim();
  const desc      = String(row[2] || "").trim();
  const city      = String(row[6] || "").trim();
  const stateName = String(row[8] || "").trim();
  const country   = String(row[12] || "Italia").trim();

  if (!name || !xlsxId) return null;

  const location = city || "N/D";
  const region   = stateName || country;

  return {
    xlsxId,
    name,
    location,
    region,
    country,
    description: desc || undefined,
  };
}

async function main() {
  const filePath  = process.argv[2] || "attached_assets/rb_Brewers_1773056659078.xlsx";
  const sheetIdx  = parseInt(process.argv[3] || "0", 10);
  const mapOutput = path.resolve("scripts/brewery-id-map.json");

  console.log(`\n📂 Lettura XLSX: ${filePath}`);
  const wb    = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[sheetIdx]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  console.log(`📊 Foglio: "${wb.SheetNames[sheetIdx]}" — ${rows.length - 1} righe dati`);

  // ─── Carica nomi già presenti nel DB ───────────────────────────────────────
  console.log("🔍 Caricamento nomi esistenti dal DB...");
  const existing = await db.select({ id: breweries.id, name: breweries.name }).from(breweries);
  const existingMap = new Map<string, number>(); // nome normalizzato → id DB
  for (const b of existing) {
    existingMap.set(normalizeName(b.name), b.id);
  }
  console.log(`   ${existingMap.size} birrifici già nel DB`);

  // ─── Carica mappa esistente (per non perdere mapping precedenti) ───────────
  let idMap: Record<number, number> = {};
  if (fs.existsSync(mapOutput)) {
    idMap = JSON.parse(fs.readFileSync(mapOutput, "utf-8"));
    console.log(`   Mapping esistente caricato (${Object.keys(idMap).length} voci)`);
  }

  // ─── Elabora righe ────────────────────────────────────────────────────────
  const BATCH_SIZE = 200;
  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;
  let batch: typeof breweries.$inferInsert[] = [];
  let batchXlsxIds: number[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const batchCopy = [...batch];
    const idsCopy   = [...batchXlsxIds];
    batch = [];
    batchXlsxIds = [];
    try {
      await db.insert(breweries).values(batchCopy);
      // Ricarica i nuovi id dal DB per nome
      for (let i = 0; i < batchCopy.length; i++) {
        const norm = normalizeName(batchCopy[i].name!);
        // Aggiungiamo placeholder: la mappa viene ricostruita da rebuild-brewery-map.ts
        // esistente per dedup durante questa run
        existingMap.set(norm, -1);
        inserted++;
      }
    } catch (e: any) {
      console.error("  Errore batch insert:", e.message);
      errors += batchCopy.length;
    }
  };

  const dataRows = rows.slice(1); // salta header
  for (let i = 0; i < dataRows.length; i++) {
    const mapped = mapRow(dataRows[i]);
    if (!mapped) { skipped++; continue; }

    const { xlsxId, name, location, region, country, description } = mapped;
    const key = normalizeName(name);

    if (existingMap.has(key)) {
      // Già presente: registra solo il mapping
      idMap[xlsxId] = existingMap.get(key)!;
      skipped++;
    } else {
      // Nuovo birrificio
      batch.push({ name, location, region, country, description });
      batchXlsxIds.push(xlsxId);
      if (batch.length >= BATCH_SIZE) await flush();
    }

    if ((i + 1) % 5000 === 0) {
      process.stdout.write(`   ${i + 1}/${dataRows.length} righe... inseriti=${inserted} skippati=${skipped}\r`);
    }
  }
  await flush();

  // ─── Salva mapping ────────────────────────────────────────────────────────
  fs.writeFileSync(mapOutput, JSON.stringify(idMap, null, 2));

  console.log(`\n✅ Completato!`);
  console.log(`   Inseriti:  ${inserted}`);
  console.log(`   Skippati:  ${skipped} (già presenti o riga vuota)`);
  console.log(`   Errori:    ${errors}`);
  console.log(`   Mapping salvato in: ${mapOutput}`);
  console.log(`   Totale voci nella mappa: ${Object.keys(idMap).length}`);
}

main().catch(e => { console.error("Errore fatale:", e); process.exit(1); });
