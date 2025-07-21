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

async function importAllBreweriesAndBeers() {
  console.log("Starting complete brewery and beer import from CSV...");
  
  const breweriesToImport = new Map<string, any>();
  const beersToImport: any[] = [];
  let processed = 0;
  
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

          // Aggiungi birrificio alla mappa se non esiste già
          if (!breweriesToImport.has(breweryName)) {
            // Determina regione/paese basandosi sul nome
            let region = "Estero";
            const italianKeywords = ['birrificio', 'brewery', 'italia', 'italian'];
            const lowerBreweryName = breweryName.toLowerCase();
            
            if (italianKeywords.some(keyword => lowerBreweryName.includes(keyword))) {
              region = "Italia";
            }

            breweriesToImport.set(breweryName, {
              name: breweryName,
              location: "Non specificato",
              region: region,
              description: `Birrificio ${region.toLowerCase()}`,
              logoUrl: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=200&h=200&fit=crop",
              websiteUrl: null,
              latitude: null,
              longitude: null,
              rating: "0.0",
            });
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
            breweryName: breweryName, // Useremo questo per il mapping
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
        }
      })
      .on('end', async () => {
        try {
          console.log(`Processed ${processed} rows`);
          console.log(`Found ${breweriesToImport.size} unique breweries`);
          console.log(`Found ${beersToImport.length} beers to import`);
          
          // Fase 1: Importa birrifici
          console.log("\n=== FASE 1: Importazione Birrifici ===");
          let breweriesImported = 0;
          let breweriesSkipped = 0;
          const breweryIdMap = new Map<string, number>();
          
          // Prima ottieni tutti i birrifici esistenti
          const existingBreweries = await db.select().from(breweries);
          existingBreweries.forEach(brewery => {
            breweryIdMap.set(brewery.name, brewery.id);
          });
          
          for (const [breweryName, breweryData] of breweriesToImport.entries()) {
            try {
              if (breweryIdMap.has(breweryName)) {
                breweriesSkipped++;
                continue;
              }

              const [newBrewery] = await db.insert(breweries).values(breweryData).returning();
              breweryIdMap.set(breweryName, newBrewery.id);
              breweriesImported++;
              
              if (breweriesImported % 50 === 0) {
                console.log(`Imported ${breweriesImported} breweries...`);
              }
            } catch (error) {
              console.error(`Error importing brewery ${breweryName}:`, error);
              breweriesSkipped++;
            }
          }

          console.log(`✅ Birrifici - Importati: ${breweriesImported}, Saltati: ${breweriesSkipped}`);

          // Fase 2: Importa birre
          console.log("\n=== FASE 2: Importazione Birre ===");
          let beersImported = 0;
          let beersSkipped = 0;

          for (const beer of beersToImport) {
            try {
              // Trova l'ID del birrificio
              const breweryId = breweryIdMap.get(beer.breweryName);
              if (!breweryId) {
                console.error(`Brewery not found for beer ${beer.name}: ${beer.breweryName}`);
                beersSkipped++;
                continue;
              }

              // Verifica se la birra esiste già
              const existing = await db
                .select()
                .from(beers)
                .where(eq(beers.name, beer.name))
                .limit(1);

              if (existing.length === 0) {
                await db.insert(beers).values({
                  name: beer.name,
                  breweryId: breweryId,
                  style: beer.style,
                  abv: beer.abv,
                  ibu: beer.ibu,
                  description: beer.description,
                  color: beer.color,
                  logoUrl: beer.logoUrl,
                  isBottled: beer.isBottled,
                });
                beersImported++;
                
                if (beersImported % 100 === 0) {
                  console.log(`Imported ${beersImported} beers...`);
                }
              } else {
                beersSkipped++;
              }
            } catch (error) {
              console.error(`Error importing beer ${beer.name}:`, error);
              beersSkipped++;
            }
          }

          console.log(`✅ Import completato!`);
          console.log(`📊 Statistiche Finali:`);
          console.log(`   - Righe processate: ${processed}`);
          console.log(`   - Birrifici importati: ${breweriesImported}`);
          console.log(`   - Birrifici esistenti: ${breweriesSkipped}`);
          console.log(`   - Birre importate: ${beersImported}`);
          console.log(`   - Birre esistenti: ${beersSkipped}`);
          
          resolve({ 
            processed,
            breweriesImported, 
            breweriesSkipped,
            beersImported, 
            beersSkipped 
          });
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
  importAllBreweriesAndBeers()
    .then(() => {
      console.log("Complete import finished successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Complete import failed:", error);
      process.exit(1);
    });
}

export { importAllBreweriesAndBeers };