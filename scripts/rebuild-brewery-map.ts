import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { breweries } from "../shared/schema";
import fs from "fs";
import path from "path";

const db = drizzle(neon(process.env.DATABASE_URL!));

async function main() {
  console.log("Caricamento birrifici dal DB...");
  const all = await db.select({ id: breweries.id, name: breweries.name }).from(breweries);
  const dbMap = new Map<string, number>();
  for (const b of all) {
    dbMap.set(b.name.trim().toLowerCase().replace(/\s+/g, " "), b.id);
  }
  console.log(`${dbMap.size} birrifici nel DB`);

  const xlsxFile = process.argv[2] || "attached_assets/rb_Brewers_1773056659078.xlsx";
  console.log(`Lettura XLSX: ${xlsxFile}`);
  const wb = XLSX.readFile(xlsxFile);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  console.log(`${rows.length - 1} righe nel foglio`);

  const idMap: Record<number, number> = {};
  let matched = 0; let unmatched = 0;

  for (const row of rows.slice(1)) {
    const xlsxId = Number(row[0]);
    const name = String(row[1] || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!xlsxId || !name) continue;
    const dbId = dbMap.get(name);
    if (dbId) { idMap[xlsxId] = dbId; matched++; }
    else unmatched++;
  }

  const outFile = path.resolve("scripts/brewery-id-map.json");
  fs.writeFileSync(outFile, JSON.stringify(idMap, null, 2));
  console.log(`\n✅ Mapping completato:`);
  console.log(`   Trovati (con mapping): ${matched}`);
  console.log(`   Non trovati:           ${unmatched}`);
  console.log(`   File salvato:          ${outFile}`);
}
main().catch(e => { console.error(e); process.exit(1); });
