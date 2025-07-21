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

async function importBeersFromCSV() {
  console.log("Starting beer import from CSV...");
  
  const beersToImport: any[] = [];
  
  return new Promise((resolve, reject) => {
    createReadStream('./attached_assets/birre_yhop_1753136978542.csv')
      .pipe(parse({ 
        columns: true, 
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"'
      }))
      .on('data', async (row: BeerCSVRow) => {
        try {
          // Pulisci e valida i dati
          const beerName = row['Nome Birra']?.trim();
          const breweryName = row['Birrificio']?.trim();
          const style = row['Stile']?.trim() || 'Sconosciuto';
          const abvStr = row['ABV']?.trim();
          const description = row['Descrizione']?.trim();

          if (!beerName || !breweryName) {
            console.log(`Skipping row - missing beer name or brewery name`);
            return;
          }

          // Cerca il birrificio per nome nel nostro database
          const brewery = await db.select().from(breweries).where(eq(breweries.name, breweryName)).limit(1);
          let breweryId = 2; // Default a Baladin se non trovato

          if (brewery.length > 0) {
            breweryId = brewery[0].id;
          } else {
            // Se il birrificio non esiste, usa un birrificio di default
            console.log(`Brewery not found: ${breweryName}, using default brewery ID ${breweryId} for beer ${beerName}`);
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
          console.error(`Error processing row:`, error, row);
        }
      })
      .on('end', async () => {
        try {
          console.log(`Processing ${beersToImport.length} beers for import...`);
          
          // Inserisci birre in batch per migliori performance
          const batchSize = 100;
          let imported = 0;
          let skipped = 0;

          for (let i = 0; i < beersToImport.length; i += batchSize) {
            const batch = beersToImport.slice(i, i + batchSize);
            
            for (const beer of batch) {
              try {
                // Verifica se la birra esiste già
                const existing = await db
                  .select()
                  .from(beers)
                  .where(eq(beers.name, beer.name))
                  .limit(1);

                if (existing.length === 0) {
                  await db.insert(beers).values(beer);
                  imported++;
                  
                  if (imported % 50 === 0) {
                    console.log(`Imported ${imported} beers...`);
                  }
                } else {
                  skipped++;
                }
              } catch (error) {
                console.error(`Error inserting beer ${beer.name}:`, error);
                skipped++;
              }
            }
          }

          console.log(`✅ Import completato!`);
          console.log(`📊 Statistiche:`);
          console.log(`   - Birre importate: ${imported}`);
          console.log(`   - Birre saltate (già esistenti): ${skipped}`);
          console.log(`   - Totale elaborate: ${beersToImport.length}`);
          
          resolve({ imported, skipped, total: beersToImport.length });
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
  importBeersFromCSV()
    .then(() => {
      console.log("Beer import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Beer import failed:", error);
      process.exit(1);
    });
}

export { importBeersFromCSV };