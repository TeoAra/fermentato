import { db } from "./db";
import { breweries, beers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Open Brewery DB - API gratuita per birrifici mondiali
const OPEN_BREWERY_API = "https://api.openbrewerydb.org/v1/breweries";

// Beer.db API - Database birre open source
const BEER_DB_API = "http://prost.herokuapp.com/api";

// Stili di birra comuni con immagini appropriate
const BEER_STYLES_IMAGES = {
  // Stili principali
  "IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "India Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Pilsner": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Stout": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Porter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Wheat": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Weizen": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Belgian Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Saison": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Lambic": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Blonde": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Amber": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
};

// Birre famose mondiali con dati reali
const WORLD_FAMOUS_BEERS = [
  // Belgio
  { name: "Chimay Blue", brewery: "Chimay", country: "Belgium", style: "Belgian Strong Ale", abv: 9.0, ibu: 35 },
  { name: "Westmalle Tripel", brewery: "Westmalle", country: "Belgium", style: "Belgian Tripel", abv: 9.5, ibu: 38 },
  { name: "Orval", brewery: "Orval", country: "Belgium", style: "Belgian Pale Ale", abv: 6.2, ibu: 32 },
  { name: "Rochefort 10", brewery: "Rochefort", country: "Belgium", style: "Belgian Quadrupel", abv: 11.3, ibu: 27 },
  { name: "Duvel", brewery: "Duvel Moortgat", country: "Belgium", style: "Belgian Strong Ale", abv: 8.5, ibu: 32 },
  
  // Germania
  { name: "Weihenstephaner Hefeweizen", brewery: "Weihenstephan", country: "Germany", style: "Hefeweizen", abv: 5.4, ibu: 14 },
  { name: "Augustiner Lagerbier Hell", brewery: "Augustiner-Bräu", country: "Germany", style: "Munich Helles", abv: 5.2, ibu: 20 },
  { name: "Schneider Weisse TAP 7", brewery: "Schneider Weisse", country: "Germany", style: "Hefeweizen", abv: 5.4, ibu: 14 },
  { name: "Spaten München", brewery: "Spaten-Franziskaner-Bräu", country: "Germany", style: "Munich Helles", abv: 5.2, ibu: 20 },
  
  // Repubblica Ceca
  { name: "Pilsner Urquell", brewery: "Pilsner Urquell", country: "Czech Republic", style: "Czech Pilsner", abv: 4.4, ibu: 40 },
  { name: "Budweiser Budvar", brewery: "Budweiser Budvar", country: "Czech Republic", style: "Czech Lager", abv: 5.0, ibu: 20 },
  { name: "Staropramen", brewery: "Staropramen", country: "Czech Republic", style: "Czech Lager", abv: 5.0, ibu: 18 },
  
  // USA
  { name: "Sierra Nevada Pale Ale", brewery: "Sierra Nevada", country: "USA", style: "American Pale Ale", abv: 5.6, ibu: 38 },
  { name: "Sam Adams Boston Lager", brewery: "Boston Beer Company", country: "USA", style: "Vienna Lager", abv: 4.9, ibu: 30 },
  { name: "Dogfish Head 60 Minute IPA", brewery: "Dogfish Head", country: "USA", style: "American IPA", abv: 6.0, ibu: 60 },
  { name: "Stone IPA", brewery: "Stone Brewing", country: "USA", style: "American IPA", abv: 6.9, ibu: 71 },
  { name: "Brooklyn Lager", brewery: "Brooklyn Brewery", country: "USA", style: "American Amber Lager", abv: 5.2, ibu: 33 },
  
  // Regno Unito
  { name: "Fuller's London Pride", brewery: "Fuller's", country: "UK", style: "English Bitter", abv: 4.7, ibu: 31 },
  { name: "Guinness Draught", brewery: "Guinness", country: "Ireland", style: "Irish Stout", abv: 4.2, ibu: 45 },
  { name: "Young's Double Chocolate Stout", brewery: "Young's", country: "UK", style: "Sweet Stout", abv: 5.2, ibu: 28 },
  { name: "Samuel Smith's Imperial IPA", brewery: "Samuel Smith", country: "UK", style: "English IPA", abv: 7.0, ibu: 65 },
  
  // Canada
  { name: "Unibroue La Fin du Monde", brewery: "Unibroue", country: "Canada", style: "Belgian Tripel", abv: 9.0, ibu: 19 },
  { name: "Molson Canadian", brewery: "Molson", country: "Canada", style: "North American Lager", abv: 5.0, ibu: 10 },
  
  // Australia
  { name: "Coopers Pale Ale", brewery: "Coopers", country: "Australia", style: "Australian Pale Ale", abv: 4.5, ibu: 35 },
  { name: "Little Creatures Pale Ale", brewery: "Little Creatures", country: "Australia", style: "Australian Pale Ale", abv: 5.2, ibu: 40 },
  
  // Giappone
  { name: "Asahi Super Dry", brewery: "Asahi", country: "Japan", style: "Japanese Rice Lager", abv: 5.0, ibu: 16 },
  { name: "Sapporo Premium", brewery: "Sapporo", country: "Japan", style: "Japanese Lager", abv: 4.9, ibu: 18 },
  { name: "Kirin Ichiban", brewery: "Kirin", country: "Japan", style: "Japanese Lager", abv: 5.0, ibu: 18 },
  
  // Messico
  { name: "Corona Extra", brewery: "Grupo Modelo", country: "Mexico", style: "Mexican Lager", abv: 4.5, ibu: 18 },
  { name: "Dos Equis Lager", brewery: "Cuauhtémoc Moctezuma", country: "Mexico", style: "Mexican Lager", abv: 4.2, ibu: 15 },
  
  // Brasile
  { name: "Brahma", brewery: "AmBev", country: "Brazil", style: "American Lager", abv: 4.3, ibu: 10 },
  { name: "Antarctica", brewery: "AmBev", country: "Brazil", style: "American Lager", abv: 4.5, ibu: 12 }
];

interface BreweryData {
  name: string;
  location: string;
  region: string;
  country: string;
  brewery_type?: string;
  website_url?: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
}

async function fetchFromOpenBreweryDB(): Promise<BreweryData[]> {
  console.log("🌍 Fetching breweries from Open Brewery DB...");
  
  try {
    const countries = ['united_states', 'canada', 'united_kingdom', 'germany', 'belgium', 'france', 'australia', 'netherlands'];
    const allBreweries: BreweryData[] = [];
    
    for (const country of countries) {
      console.log(`Fetching breweries from ${country}...`);
      
      const response = await fetch(`${OPEN_BREWERY_API}?by_country=${country}&per_page=50`);
      if (!response.ok) {
        console.log(`⚠️ Error fetching from ${country}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const breweries = data.map((brewery: any) => ({
        name: brewery.name,
        location: brewery.city || 'Unknown',
        region: brewery.state_province || brewery.state || 'Unknown',
        country: brewery.country || country.replace('_', ' ').toUpperCase(),
        brewery_type: brewery.brewery_type,
        website_url: brewery.website_url,
        phone: brewery.phone,
        latitude: brewery.latitude,
        longitude: brewery.longitude
      }));
      
      allBreweries.push(...breweries);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Fetched ${allBreweries.length} breweries from Open Brewery DB`);
    return allBreweries;
    
  } catch (error) {
    console.error("❌ Error fetching from Open Brewery DB:", error);
    return [];
  }
}

async function addWorldBreweries(breweries: BreweryData[]): Promise<number> {
  let addedCount = 0;
  
  for (const breweryData of breweries) {
    try {
      // Verifica se il birrificio esiste già
      const existing = await db
        .select()
        .from(breweries)
        .where(eq(breweries.name, breweryData.name))
        .limit(1);
        
      if (existing.length === 0) {
        await db
          .insert(breweries)
          .values({
            name: breweryData.name,
            location: breweryData.location,
            region: breweryData.region,
            country: breweryData.country,
            websiteUrl: breweryData.website_url,
            phoneNumber: breweryData.phone,
            // Aggiungi logo generico basato sul paese
            logoUrl: getCountryBreweryLogo(breweryData.country)
          });
          
        addedCount++;
        console.log(`✅ Added brewery: ${breweryData.name} (${breweryData.country})`);
      }
    } catch (error) {
      console.log(`⚠️ Error adding brewery ${breweryData.name}:`, error);
    }
  }
  
  return addedCount;
}

async function addWorldFamousBeers(): Promise<number> {
  let addedCount = 0;
  
  for (const beerData of WORLD_FAMOUS_BEERS) {
    try {
      // Trova o crea il birrificio
      let brewery = await db
        .select()
        .from(breweries)
        .where(eq(breweries.name, beerData.brewery))
        .limit(1);
        
      if (brewery.length === 0) {
        // Crea il birrificio se non esiste
        const [newBrewery] = await db
          .insert(breweries)
          .values({
            name: beerData.brewery,
            location: "Unknown",
            region: "Unknown", 
            country: beerData.country,
            logoUrl: getCountryBreweryLogo(beerData.country)
          })
          .returning();
          
        brewery = [newBrewery];
        console.log(`✅ Created brewery: ${beerData.brewery}`);
      }
      
      // Verifica se la birra esiste già
      const existingBeer = await db
        .select()
        .from(beers)
        .where(eq(beers.name, beerData.name))
        .limit(1);
        
      if (existingBeer.length === 0) {
        const styleImage = getImageForStyle(beerData.style);
        
        await db
          .insert(beers)
          .values({
            name: beerData.name,
            breweryId: brewery[0].id,
            style: beerData.style,
            abv: beerData.abv.toString(),
            ibu: beerData.ibu,
            description: `Famous ${beerData.style} from ${beerData.country}. Known worldwide for its exceptional quality and authentic taste.`,
            imageUrl: styleImage,
            bottleImageUrl: styleImage,
            logoUrl: styleImage,
            isBottled: true
          });
          
        addedCount++;
        console.log(`✅ Added beer: ${beerData.name} by ${beerData.brewery}`);
      }
    } catch (error) {
      console.log(`⚠️ Error adding beer ${beerData.name}:`, error);
    }
  }
  
  return addedCount;
}

function getImageForStyle(style: string): string {
  // Cerca corrispondenza esatta
  if (BEER_STYLES_IMAGES[style]) {
    return BEER_STYLES_IMAGES[style];
  }
  
  // Cerca corrispondenza parziale
  for (const [styleName, imageUrl] of Object.entries(BEER_STYLES_IMAGES)) {
    if (style.toLowerCase().includes(styleName.toLowerCase())) {
      return imageUrl;
    }
  }
  
  // Fallback generico
  return "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
}

function getCountryBreweryLogo(country: string): string {
  const logoMap: { [key: string]: string } = {
    "Belgium": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Germany": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop", 
    "USA": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "UK": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Ireland": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Canada": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Australia": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Japan": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Czech Republic": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop"
  };
  
  return logoMap[country] || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop";
}

async function scrapeWorldBeers() {
  console.log("🍺 Starting global beer scraping...");
  
  try {
    // 1. Aggiungi birrifici da Open Brewery DB
    console.log("📍 Phase 1: Adding world breweries...");
    const breweryData = await fetchFromOpenBreweryDB();
    const breweriesAdded = await addWorldBreweries(breweryData);
    
    // 2. Aggiungi birre famose mondiali
    console.log("🌟 Phase 2: Adding world famous beers...");
    const beersAdded = await addWorldFamousBeers();
    
    // 3. Statistiche finali
    const totalBreweries = await db.select().from(breweries);
    const totalBeers = await db.select().from(beers);
    
    console.log("🎉 Global beer scraping completed!");
    console.log(`📊 Statistics:`);
    console.log(`   • New breweries added: ${breweriesAdded}`);
    console.log(`   • New beers added: ${beersAdded}`);
    console.log(`   • Total breweries in DB: ${totalBreweries.length}`);
    console.log(`   • Total beers in DB: ${totalBeers.length}`);
    
    return {
      breweriesAdded,
      beersAdded,
      totalBreweries: totalBreweries.length,
      totalBeers: totalBeers.length
    };
    
  } catch (error) {
    console.error("❌ Error in global beer scraping:", error);
    throw error;
  }
}

// Esegui lo scraping se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeWorldBeers().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { scrapeWorldBeers };