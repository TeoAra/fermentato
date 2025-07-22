#!/usr/bin/env tsx

/**
 * Script per unificare birrifici duplicati nel database
 * Uso: tsx scripts/unify-breweries.ts
 */

import { unifyBreweries, findDuplicateBreweries } from "../server/unify-breweries";

async function main() {
  console.log("🔄 Avvio unificazione birrifici duplicati...");
  console.log("📊 Ricerca e consolidamento birrifici con nomi simili...\n");
  
  try {
    // Prima mostra i duplicati trovati
    const duplicates = await findDuplicateBreweries();
    
    if (duplicates.length > 0) {
      console.log(`\n🚀 Avvio consolidamento di ${duplicates.length} gruppi duplicati...`);
      await unifyBreweries();
      console.log("\n✅ Database ottimizzato con successo!");
    } else {
      console.log("✅ Database già pulito, nessun duplicato trovato!");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Errore durante l'unificazione:", error);
    process.exit(1);
  }
}

main();