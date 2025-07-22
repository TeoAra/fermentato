import { db } from "./db";
import { breweries, beers } from "@shared/schema";
import { eq, ilike, sql } from "drizzle-orm";

interface BreweryGroup {
  canonical: any;
  duplicates: any[];
}

async function findDuplicateBreweries() {
  console.log("🔍 Cercando birrifici duplicati...");
  
  const allBreweries = await db.select().from(breweries);
  const groups: Map<string, BreweryGroup> = new Map();
  
  // Raggruppa birrifici con nomi simili
  for (const brewery of allBreweries) {
    const normalizedName = brewery.name.toLowerCase()
      .replace(/birra\s+/i, '')
      .replace(/birrificio\s+/i, '')
      .replace(/brewery\s+/i, '')
      .replace(/brewing\s+/i, '')
      .replace(/\s*\(.*\)/g, '') // Rimuove parentesi come "(AB InBev)"
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        canonical: brewery,
        duplicates: []
      });
    } else {
      const group = groups.get(normalizedName)!;
      group.duplicates.push(brewery);
    }
  }
  
  // Filtra solo i gruppi con duplicati
  const duplicateGroups = Array.from(groups.values()).filter(group => group.duplicates.length > 0);
  
  console.log(`📊 Trovati ${duplicateGroups.length} gruppi di birrifici duplicati:`);
  for (const group of duplicateGroups) {
    console.log(`  • "${group.canonical.name}" ha ${group.duplicates.length} duplicati:`);
    for (const dup of group.duplicates) {
      console.log(`    - ID ${dup.id}: "${dup.name}"`);
    }
  }
  
  return duplicateGroups;
}

async function unifyBreweries() {
  console.log("🔄 Avvio unificazione birrifici duplicati...");
  
  try {
    const duplicateGroups = await findDuplicateBreweries();
    
    if (duplicateGroups.length === 0) {
      console.log("✅ Nessun birrificio duplicato trovato!");
      return;
    }
    
    let totalUnified = 0;
    let totalBeersTransferred = 0;
    
    for (const group of duplicateGroups) {
      console.log(`\n🏭 Unificando "${group.canonical.name}"...`);
      
      // Per ogni duplicato
      for (const duplicate of group.duplicates) {
        console.log(`  📦 Trasferendo birre da "${duplicate.name}" (ID: ${duplicate.id})...`);
        
        // Trova tutte le birre del duplicato
        const beersByDuplicate = await db
          .select()
          .from(beers)
          .where(eq(beers.breweryId, duplicate.id));
        
        console.log(`    • Trovate ${beersByDuplicate.length} birre da trasferire`);
        
        // Trasferisci le birre al birrificio canonico
        for (const beer of beersByDuplicate) {
          // Verifica se esiste già una birra con lo stesso nome nel birrificio canonico
          const existingBeer = await db
            .select()
            .from(beers)
            .where(eq(beers.name, beer.name))
            .where(eq(beers.breweryId, group.canonical.id))
            .limit(1);
          
          if (existingBeer.length === 0) {
            // Trasferisci la birra al birrificio canonico
            await db
              .update(beers)
              .set({ breweryId: group.canonical.id })
              .where(eq(beers.id, beer.id));
            
            console.log(`      ✅ Trasferita: "${beer.name}"`);
            totalBeersTransferred++;
          } else {
            // Elimina la birra duplicata
            await db.delete(beers).where(eq(beers.id, beer.id));
            console.log(`      🗑️ Eliminata duplicata: "${beer.name}"`);
          }
        }
        
        // Elimina il birrificio duplicato
        await db.delete(breweries).where(eq(breweries.id, duplicate.id));
        console.log(`    🗑️ Eliminato birrificio duplicato "${duplicate.name}"`);
        totalUnified++;
      }
      
      // Aggiorna le informazioni del birrificio canonico se necessario
      const canonicalBeers = await db
        .select()
        .from(beers)
        .where(eq(beers.breweryId, group.canonical.id));
      
      console.log(`  ✅ Birrificio unificato: "${group.canonical.name}" ora ha ${canonicalBeers.length} birre`);
    }
    
    console.log(`\n🎉 Unificazione completata!`);
    console.log(`📈 Statistiche:`);
    console.log(`   • Birrifici duplicati eliminati: ${totalUnified}`);
    console.log(`   • Birre trasferite: ${totalBeersTransferred}`);
    console.log(`   • Database pulito e ottimizzato`);
    
  } catch (error) {
    console.error("❌ Errore durante l'unificazione:", error);
    throw error;
  }
}

export { unifyBreweries, findDuplicateBreweries };

// Script eseguibile direttamente (gestito da scripts separati)