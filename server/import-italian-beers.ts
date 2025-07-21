import { parse } from "csv-parse";
import { createReadStream } from "fs";
import { db } from "./db";
import { beers, breweries } from "@shared/schema";
import { eq, ilike } from "drizzle-orm";

interface BeerCSVRow {
  'ID': string;
  'Nome Birra': string;
  'Birrificio': string;
  'Stile': string;
  'ABV': string;
  'Descrizione': string;
  'Immagine': string;
}

async function importItalianBeersFromCSV() {
  console.log("Starting Italian beer import from CSV...");
  
  // Prima ottieni tutti i birrifici italiani dal database
  const italianBreweries = await db.select().from(breweries);
  const breweryMap = new Map();
  
  italianBreweries.forEach(brewery => {
    // Crea diverse variazioni del nome per il matching
    const variants = [
      brewery.name,
      brewery.name.toLowerCase(),
      brewery.name.replace(/\s+/g, ''),
      brewery.name.replace(/birrificio\s+/i, ''),
      brewery.name.replace(/brewery\s+/i, ''),
    ];
    
    variants.forEach(variant => {
      breweryMap.set(variant.toLowerCase(), brewery.id);
    });
  });

  console.log(`Found ${italianBreweries.length} Italian breweries in database`);
  
  const beersToImport: any[] = [];
  let processed = 0;
  let matched = 0;
  
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
            return;
          }

          // Cerca corrispondenza nel breweryMap
          const breweryKey = breweryName.toLowerCase();
          let breweryId = breweryMap.get(breweryKey);
          
          // Prova con variazioni del nome
          if (!breweryId) {
            for (const [key, id] of breweryMap.entries()) {
              if (key.includes(breweryKey) || breweryKey.includes(key)) {
                breweryId = id;
                break;
              }
            }
          }

          // Solo se troviamo un birrificio italiano, aggiungi la birra
          if (breweryId) {
            matched++;
            
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
          }

        } catch (error) {
          console.error(`Error processing row:`, error);
        }
      })
      .on('end', async () => {
        try {
          console.log(`Processed ${processed} rows, found ${matched} matches with Italian breweries`);
          console.log(`Importing ${beersToImport.length} Italian beers...`);
          
          let imported = 0;
          let skipped = 0;

          // Inserisci birre una alla volta per gestire duplicati
          for (const beer of beersToImport) {
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
                
                if (imported % 20 === 0) {
                  console.log(`Imported ${imported} Italian beers...`);
                }
              } else {
                skipped++;
              }
            } catch (error) {
              console.error(`Error inserting beer ${beer.name}:`, error);
              skipped++;
            }
          }

          console.log(`✅ Italian beer import completato!`);
          console.log(`📊 Statistiche:`);
          console.log(`   - Righe processate: ${processed}`);
          console.log(`   - Birre con birrifici italiani: ${matched}`);
          console.log(`   - Birre importate: ${imported}`);
          console.log(`   - Birre saltate (già esistenti): ${skipped}`);
          
          resolve({ imported, skipped, total: matched });
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
  importItalianBeersFromCSV()
    .then(() => {
      console.log("Italian beer import completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Italian beer import failed:", error);
      process.exit(1);
    });
}

export { importItalianBeersFromCSV };