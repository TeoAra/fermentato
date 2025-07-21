import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import type { InsertBrewery, InsertBeer } from "@shared/schema";

interface BeerCsvRow {
  ID: string;
  "Nome Birra": string;
  "Birrificio": string;
  "Stile": string;
  "ABV": string;
  "Descrizione": string;
  "Immagine": string;
}

interface BreweryCsvRow {
  ID: string;
  "Nome": string;
  "Indirizzo": string;
  "URL": string;
}

// Map di birrifici già importati per evitare duplicati
const breweryMap = new Map<string, number>();

function parseABV(abvString: string): string {
  // Rimuove il simbolo % e converte in numero
  return abvString.replace('%', '').trim();
}

function extractLocation(address: string): { city: string; region: string } {
  // Estrae città e regione dall'indirizzo
  const parts = address.split(',').map(s => s.trim());
  
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const cityPart = parts[parts.length - 2];
    
    // Cerca pattern come "Milano (MI)" o "Roma"
    const cityMatch = cityPart.match(/^([^(]+)(?:\s*\(([^)]+)\))?/);
    const city = cityMatch ? cityMatch[1].trim() : cityPart;
    
    // Cerca sigle regionali comuni
    const regionMatch = lastPart.match(/\(([A-Z]{2})\)/) || cityPart.match(/\(([A-Z]{2})\)/);
    let region = regionMatch ? regionMatch[1] : '';
    
    // Mappa alcune sigle regionali
    const regionMap: Record<string, string> = {
      'MI': 'Lombardia', 'TO': 'Piemonte', 'RM': 'Lazio', 'NA': 'Campania',
      'PA': 'Sicilia', 'FI': 'Toscana', 'BO': 'Emilia-Romagna', 'VE': 'Veneto',
      'BA': 'Puglia', 'CT': 'Sicilia', 'GE': 'Liguria', 'PD': 'Veneto',
      'BG': 'Lombardia', 'BS': 'Lombardia', 'TN': 'Trentino-Alto Adige',
      'BZ': 'Trentino-Alto Adige', 'UD': 'Friuli-Venezia Giulia',
      'TS': 'Friuli-Venezia Giulia', 'AO': 'Valle d\'Aosta', 'CN': 'Piemonte',
      'AL': 'Piemonte', 'AT': 'Piemonte', 'VC': 'Piemonte', 'NO': 'Piemonte',
      'VB': 'Piemonte', 'BI': 'Piemonte', 'CO': 'Lombardia', 'SO': 'Lombardia',
      'VA': 'Lombardia', 'LC': 'Lombardia', 'LO': 'Lombardia', 'MN': 'Lombardia',
      'PV': 'Lombardia', 'CR': 'Lombardia', 'BL': 'Veneto', 'TV': 'Veneto',
      'VI': 'Veneto', 'VR': 'Veneto', 'RO': 'Veneto', 'TG': 'Friuli-Venezia Giulia',
      'GO': 'Friuli-Venezia Giulia', 'PN': 'Friuli-Venezia Giulia',
      'PC': 'Emilia-Romagna', 'PR': 'Emilia-Romagna', 'RE': 'Emilia-Romagna',
      'MO': 'Emilia-Romagna', 'FE': 'Emilia-Romagna', 'RA': 'Emilia-Romagna',
      'FC': 'Emilia-Romagna', 'RN': 'Emilia-Romagna', 'MS': 'Toscana',
      'LU': 'Toscana', 'PT': 'Toscana', 'PO': 'Toscana', 'LI': 'Toscana',
      'PI': 'Toscana', 'AR': 'Toscana', 'SI': 'Toscana', 'GR': 'Toscana',
      'PG': 'Umbria', 'TR': 'Umbria', 'VT': 'Lazio', 'RI': 'Lazio',
      'FR': 'Lazio', 'LT': 'Lazio', 'AQ': 'Abruzzo', 'TE': 'Abruzzo',
      'PE': 'Abruzzo', 'CH': 'Abruzzo', 'CB': 'Molise', 'IS': 'Molise',
      'CE': 'Campania', 'BN': 'Campania', 'AV': 'Campania', 'SA': 'Campania',
      'FG': 'Puglia', 'BT': 'Puglia', 'BR': 'Puglia', 'TA': 'Puglia',
      'LE': 'Puglia', 'PZ': 'Basilicata', 'MT': 'Basilicata', 'CS': 'Calabria',
      'CZ': 'Calabria', 'RC': 'Calabria', 'KR': 'Calabria', 'VV': 'Calabria',
      'TP': 'Sicilia', 'AG': 'Sicilia', 'CL': 'Sicilia', 'EN': 'Sicilia',
      'ME': 'Sicilia', 'RG': 'Sicilia', 'SR': 'Sicilia', 'SS': 'Sardegna',
      'NU': 'Sardegna', 'OR': 'Sardegna', 'CA': 'Sardegna', 'CI': 'Sardegna',
      'OG': 'Sardegna', 'OT': 'Sardegna', 'SU': 'Sardegna'
    };
    
    region = regionMap[region] || region || 'Italia';
    
    return { city, region };
  }
  
  return { city: address || 'Sconosciuta', region: 'Italia' };
}

async function importBreweries(csvPath: string) {
  console.log("🍺 Importing breweries...");
  
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records: BreweryCsvRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      // Salta righe vuote o con nomi mancanti
      if (!record.Nome || record.Nome.trim() === '' || record.Nome === ',') {
        skipped++;
        continue;
      }

      // Filtra solo birrifici italiani
      const address = record.Indirizzo || '';
      if (address.includes('(DEU)') || address.includes('(GBR)') || 
          address.includes('(USA)') || address.includes('(FRA)') || 
          address.includes('(ESP)') || address.includes('(BEL)') ||
          address.includes('(CAN)') || address.includes('(AUT)') ||
          address.includes('(NOR)') || address.includes('(SWE)') ||
          address.includes('(IRE)') || address.includes('(POL)') ||
          address.includes('(BRA)')) {
        skipped++;
        continue;
      }

      const { city, region } = extractLocation(address);
      
      const breweryData: InsertBrewery = {
        name: record.Nome.trim(),
        location: city,
        region: region,
        description: `Birrificio artigianale italiano`,
        websiteUrl: record.URL && record.URL !== ',' ? record.URL : undefined,
      };

      const brewery = await storage.createBrewery(breweryData);
      breweryMap.set(record.Nome.trim(), brewery.id);
      imported++;

      if (imported % 100 === 0) {
        console.log(`✅ Imported ${imported} breweries...`);
      }

    } catch (error) {
      console.error(`❌ Error importing brewery ${record.Nome}:`, error);
      skipped++;
    }
  }

  console.log(`🎉 Breweries import completed: ${imported} imported, ${skipped} skipped`);
}

async function importBeers(csvPath: string) {
  console.log("🍻 Importing beers...");
  
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records: BeerCsvRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      // Salta righe vuote o con nomi mancanti
      if (!record["Nome Birra"] || !record["Birrificio"] || 
          record["Nome Birra"].trim() === '' || record["Birrificio"].trim() === '') {
        skipped++;
        continue;
      }

      // Trova il birrificio corrispondente
      const breweryId = breweryMap.get(record["Birrificio"].trim());
      if (!breweryId) {
        // Prova a cercare il birrificio nel database
        const existingBreweries = await storage.searchBreweries(record["Birrificio"].trim());
        if (existingBreweries.length === 0) {
          skipped++;
          continue;
        }
        breweryMap.set(record["Birrificio"].trim(), existingBreweries[0].id);
      }

      const finalBreweryId = breweryMap.get(record["Birrificio"].trim());
      if (!finalBreweryId) {
        skipped++;
        continue;
      }

      const beerData: InsertBeer = {
        name: record["Nome Birra"].trim(),
        style: record["Stile"] || 'Ale',
        abv: parseABV(record["ABV"] || '5%'),
        description: record["Descrizione"] || '',
        breweryId: finalBreweryId,
        logoUrl: record["Immagine"] && record["Immagine"] !== 'Nessuna immagine' ? record["Immagine"] : undefined,
      };

      await storage.createBeer(beerData);
      imported++;

      if (imported % 500 === 0) {
        console.log(`✅ Imported ${imported} beers...`);
      }

    } catch (error) {
      console.error(`❌ Error importing beer ${record["Nome Birra"]}:`, error);
      skipped++;
    }
  }

  console.log(`🎉 Beers import completed: ${imported} imported, ${skipped} skipped`);
}

export async function importAllData() {
  try {
    console.log("🚀 Starting data import...");
    
    const breweriesPath = path.join(process.cwd(), 'attached_assets', 'breweries_1753136998070.csv');
    const beersPath = path.join(process.cwd(), 'attached_assets', 'birre_yhop_1753136978542.csv');
    
    // Import breweries first
    await importBreweries(breweriesPath);
    
    // Then import beers
    await importBeers(beersPath);
    
    console.log("🎉 Data import completed successfully!");
    
  } catch (error) {
    console.error("💥 Data import failed:", error);
    throw error;
  }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importAllData().catch(console.error);
}