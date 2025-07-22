import { parse } from "csv-parse";
import { createReadStream } from "fs";
import { db } from "./db";
import { beers, breweries } from "@shared/schema";
import { eq } from "drizzle-orm";

interface BeerCSVRow {
  'ID': string;
  'Nome Birra': string;
  'Birrificio': string;
  'Stile': string;
  'ABV': string;
  'Descrizione': string;
  'Immagine': string;
}

async function importRemainingBeers() {
  console.log("Starting optimized beer import...");
  
  // Prima ottieni tutte le birre esistenti per evitare duplicati
  const existingBeers = await db.select({ name: beers.name }).from(beers);
  const existingBeerNames = new Set(existingBeers.map(b => b.name));
  console.log(`Found ${existingBeerNames.size} existing beers in database`);
  
  // Ottieni tutti i birrifici e crea un mapping nome -> ID
  const allBreweries = await db.select().from(breweries);
  const breweryMap = new Map<string, number>();
  
  allBreweries.forEach(brewery => {
    breweryMap.set(brewery.name, brewery.id);
  });
  console.log(`Found ${allBreweries.length} breweries in database`);
  
  const beersToImport: any[] = [];
  let processed = 0;
  let skipped = 0;
  
  return new Promise((resolve, reject) => {
    createReadStream('./attached_assets/birre_yhop_1753136978542.csv')
      .pipe(parse({ 
        columns: true, 
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"'
      }))
      .on('data', (row: BeerCSVRow) => {
        processed++;
        
        try {
          const beerName = row['Nome Birra']?.trim();
          const breweryName = row['Birrificio']?.trim();
          const style = row['Stile']?.trim() || 'Sconosciuto';
          const abvStr = row['ABV']?.trim();
          const description = row['Descrizione']?.trim();

          if (!beerName || !breweryName) {
            skipped++;
            return;
          }

          // Salta se la birra esiste già
          if (existingBeerNames.has(beerName)) {
            skipped++;
            return;
          }

          // Trova l'ID del birrificio
          const breweryId = breweryMap.get(breweryName);
          if (!breweryId) {
            console.log(`Brewery not found: ${breweryName} for beer: ${beerName}`);
            skipped++;
            return;
          }

          // Converti ABV
          let abv = "0.0";
          if (abvStr && abvStr !== '') {
            const abvNum = parseFloat(abvStr.replace('%', ''));
            if (!isNaN(abvNum)) {
              abv = abvNum.toString();
            }
          }

          beersToImport.push({
            name: beerName,
            breweryId: breweryId,
            style: style,
            abv: abv,
            ibu: null,
            description: description || null,
            color: null,
            logoUrl: `https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop`,
            isBottled: false,
          });

        } catch (error) {
          console.error(`Error processing row ${processed}:`, error);
          skipped++;
        }
      })
      .on('end', async () => {
        try {
          console.log(`Processed ${processed} rows, skipped ${skipped}, importing ${beersToImport.length} new beers`);
          
          // Importa in batch per migliori performance
          const batchSize = 500;
          let imported = 0;
          
          for (let i = 0; i < beersToImport.length; i += batchSize) {
            const batch = beersToImport.slice(i, i + batchSize);
            
            try {
              await db.insert(beers).values(batch);
              imported += batch.length;
              console.log(`Imported batch: ${imported}/${beersToImport.length} beers`);
            } catch (error) {
              console.error(`Error importing batch starting at ${i}:`, error);
              // Fallback: import one by one for this batch
              for (const beer of batch) {
                try {
                  await db.insert(beers).values(beer);
                  imported++;
                } catch (singleError) {
                  console.error(`Error importing single beer ${beer.name}:`, singleError);
                }
              }
            }
          }

          console.log(`✅ Import completato!`);
          console.log(`📊 Statistiche finali:`);
          console.log(`   - Righe processate: ${processed}`);
          console.log(`   - Birre saltate: ${skipped}`);
          console.log(`   - Birre importate: ${imported}`);
          
          resolve({ processed, skipped, imported });
        } catch (error) {
          console.error("Error during import:", error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Esegui l'import se questo file viene chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  importRemainingBeers()
    .then(() => {
      console.log("Optimized import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Optimized import failed:", error);
      process.exit(1);
    });
}

export { importRemainingBeers };