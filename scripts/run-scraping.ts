#!/usr/bin/env tsx

/**
 * Script per eseguire lo scraping globale delle birre
 * Uso: npm run scrape-beers
 */

import { globalBeerScraping } from "../server/global-beer-scraper";

async function main() {
  console.log("🚀 Avvio scraping globale birre...");
  console.log("📡 Raccogliendo dati da Open Brewery DB e fonti curated...\n");
  
  try {
    await globalBeerScraping();
    console.log("\n🎉 Scraping completato con successo!");
    console.log("🔍 Verifica il database per vedere le nuove birre aggiunte");
    process.exit(0);
  } catch (error) {
    console.error("❌ Errore durante lo scraping:", error);
    process.exit(1);
  }
}

// Esegui sempre quando importato direttamente
main();