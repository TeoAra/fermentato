import { db } from "./db";
import { breweries, beers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Google Places-style brewery data
const GOOGLE_PLACES_STYLE_BREWERIES = [
  // USA Craft Breweries
  { name: "Founders Brewing Co.", city: "Grand Rapids", state: "Michigan", country: "USA", type: "micro" },
  { name: "New Belgium Brewing", city: "Fort Collins", state: "Colorado", country: "USA", type: "regional" },
  { name: "Bell's Brewery", city: "Kalamazoo", state: "Michigan", country: "USA", type: "regional" },
  { name: "Lagunitas Brewing Company", city: "Petaluma", state: "California", country: "USA", type: "large" },
  { name: "Russian River Brewing Company", city: "Santa Rosa", state: "California", country: "USA", type: "micro" },
  { name: "Trillium Brewing Company", city: "Boston", state: "Massachusetts", country: "USA", type: "micro" },
  { name: "Tree House Brewing Company", city: "Charlton", state: "Massachusetts", country: "USA", type: "micro" },
  
  // UK Craft Breweries
  { name: "Beavertown Brewery", city: "London", state: "England", country: "UK", type: "micro" },
  { name: "BrewDog", city: "Ellon", state: "Scotland", country: "UK", type: "large" },
  { name: "Thornbridge Brewery", city: "Bakewell", state: "England", country: "UK", type: "micro" },
  { name: "Cloudwater Brew Co", city: "Manchester", state: "England", country: "UK", type: "micro" },
  
  // German Breweries
  { name: "Ayinger", city: "Aying", state: "Bavaria", country: "Germany", type: "regional" },
  { name: "Hofbräu München", city: "Munich", state: "Bavaria", country: "Germany", type: "large" },
  { name: "Löwenbräu", city: "Munich", state: "Bavaria", country: "Germany", type: "large" },
  { name: "Schneider Weisse", city: "Kelheim", state: "Bavaria", country: "Germany", type: "regional" },
  
  // Belgian Breweries  
  { name: "Cantillon Brewery", city: "Brussels", state: "Brussels", country: "Belgium", type: "micro" },
  { name: "De Halve Maan", city: "Bruges", state: "West Flanders", country: "Belgium", type: "micro" },
  { name: "Brewery Rodenbach", city: "Roeselare", state: "West Flanders", country: "Belgium", type: "regional" },
  
  // Canadian Breweries
  { name: "Dieu du Ciel!", city: "Montreal", state: "Quebec", country: "Canada", type: "micro" },
  { name: "Beau's Lug-Tread", city: "Vankleek Hill", state: "Ontario", country: "Canada", type: "micro" },
  
  // Australian Breweries
  { name: "Stone & Wood", city: "Byron Bay", state: "NSW", country: "Australia", type: "micro" },
  { name: "Pirate Life Brewing", city: "Adelaide", state: "SA", country: "Australia", type: "micro" },
  
  // Japanese Craft Breweries
  { name: "Hitachino Nest Beer", city: "Naka", state: "Ibaraki", country: "Japan", type: "micro" },
  { name: "Baird Brewing Company", city: "Numazu", state: "Shizuoka", country: "Japan", type: "micro" },
  
  // New Zealand
  { name: "Garage Project", city: "Wellington", state: "Wellington", country: "New Zealand", type: "micro" },
  { name: "Epic Brewing Company", city: "Auckland", state: "Auckland", country: "New Zealand", type: "micro" }
];

// Expanded world famous beers database
const EXPANDED_WORLD_BEERS = [
  // USA Advanced Craft
  { name: "Pliny the Elder", brewery: "Russian River Brewing Company", country: "USA", style: "American Double IPA", abv: 8.0, ibu: 100 },
  { name: "Founders All Day IPA", brewery: "Founders Brewing Co.", country: "USA", style: "Session IPA", abv: 4.7, ibu: 42 },
  { name: "New Belgium Fat Tire", brewery: "New Belgium Brewing", country: "USA", style: "Amber Ale", abv: 5.2, ibu: 22 },
  { name: "Bell's Two Hearted IPA", brewery: "Bell's Brewery", country: "USA", style: "American IPA", abv: 7.0, ibu: 55 },
  { name: "Lagunitas IPA", brewery: "Lagunitas Brewing Company", country: "USA", style: "American IPA", abv: 6.2, ibu: 51.5 },
  
  // UK Advanced Craft
  { name: "Beavertown Gamma Ray", brewery: "Beavertown Brewery", country: "UK", style: "American Pale Ale", abv: 5.4, ibu: 45 },
  { name: "BrewDog Punk IPA", brewery: "BrewDog", country: "UK", style: "India Pale Ale", abv: 5.6, ibu: 65 },
  { name: "Thornbridge Jaipur IPA", brewery: "Thornbridge Brewery", country: "UK", style: "India Pale Ale", abv: 5.9, ibu: 45 },
  
  // German Traditional + Modern
  { name: "Ayinger Celebrator", brewery: "Ayinger", country: "Germany", style: "Doppelbock", abv: 6.7, ibu: 21 },
  { name: "Hofbräu Original", brewery: "Hofbräu München", country: "Germany", style: "Munich Helles", abv: 5.1, ibu: 18 },
  { name: "Löwenbräu Original", brewery: "Löwenbräu", country: "Germany", style: "Munich Helles", abv: 5.2, ibu: 20 },
  
  // Belgian Specialties
  { name: "Cantillon Gueuze", brewery: "Cantillon Brewery", country: "Belgium", style: "Gueuze", abv: 5.0, ibu: 11 },
  { name: "Brugse Zot Blonde", brewery: "De Halve Maan", country: "Belgium", style: "Belgian Blonde Ale", abv: 6.0, ibu: 20 },
  { name: "Rodenbach Grand Cru", brewery: "Brewery Rodenbach", country: "Belgium", style: "Flanders Red Ale", abv: 6.0, ibu: 18 },
  
  // International Craft
  { name: "Stone & Wood Pacific Ale", brewery: "Stone & Wood", country: "Australia", style: "Australian Pale Ale", abv: 4.4, ibu: 26 },
  { name: "Hitachino Nest White Ale", brewery: "Hitachino Nest Beer", country: "Japan", style: "Belgian Witbier", abv: 5.5, ibu: 15 },
  { name: "Garage Project Pils", brewery: "Garage Project", country: "New Zealand", style: "Czech Pilsner", abv: 4.8, ibu: 28 },
  
  // Traditional European Classics
  { name: "Weihenstephaner Original", brewery: "Weihenstephan", country: "Germany", style: "Munich Helles", abv: 5.1, ibu: 26 },
  { name: "Paulaner Hefe-Weizen", brewery: "Paulaner", country: "Germany", style: "Hefeweizen", abv: 5.5, ibu: 12 },
  { name: "Franziskaner Hefe-Weisse", brewery: "Spaten-Franziskaner-Bräu", country: "Germany", style: "Hefeweizen", abv: 5.0, ibu: 11 },
  
  // More Belgian Classics
  { name: "Leffe Blonde", brewery: "Leffe", country: "Belgium", style: "Belgian Blonde Ale", abv: 6.6, ibu: 15 },
  { name: "Stella Artois", brewery: "Stella Artois", country: "Belgium", style: "Euro Pale Lager", abv: 5.0, ibu: 24 },
  { name: "Hoegaarden", brewery: "Hoegaarden", country: "Belgium", style: "Belgian Witbier", abv: 4.9, ibu: 9 },
  
  // Czech Originals
  { name: "Kozel Premium", brewery: "Kozel", country: "Czech Republic", style: "Czech Lager", abv: 4.6, ibu: 18 },
  { name: "Bernard Dark Lager", brewery: "Bernard", country: "Czech Republic", style: "Czech Dark Lager", abv: 5.1, ibu: 22 },
  
  // Additional International
  { name: "Estrella Damm", brewery: "Estrella Damm", country: "Spain", style: "Euro Pale Lager", abv: 5.4, ibu: 15 },
  { name: "Moretti", brewery: "Birra Moretti", country: "Italy", style: "Euro Pale Lager", abv: 4.6, ibu: 12 },
  { name: "Peroni Nastro Azzurro", brewery: "Peroni", country: "Italy", style: "Euro Pale Lager", abv: 5.1, ibu: 24 }
];

function getStyleBasedImage(style: string): string {
  const styleImageMap: { [key: string]: string } = {
    // IPAs
    "American IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "India Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", 
    "American Double IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Session IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Pale Ales
    "American Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Australian Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Lagers
    "Euro Pale Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Lager": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Dark Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Munich Helles": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Pilsner": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Wheat Beers
    "Hefeweizen": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Witbier": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Belgian Styles
    "Belgian Blonde Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Strong Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Gueuze": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Flanders Red Ale": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Dark Beers
    "Doppelbock": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Others
    "Amber Ale": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  };
  
  return styleImageMap[style] || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
}

async function addGoogleStyleBreweries(): Promise<number> {
  let addedCount = 0;
  
  for (const breweryData of GOOGLE_PLACES_STYLE_BREWERIES) {
    try {
      // Check if brewery already exists
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
            location: breweryData.city,
            region: breweryData.state,
            country: breweryData.country,
            logoUrl: getCountrySpecificLogo(breweryData.country)
          });
          
        addedCount++;
        console.log(`✅ Added brewery: ${breweryData.name} (${breweryData.city}, ${breweryData.country})`);
      }
    } catch (error) {
      console.log(`⚠️ Error adding brewery ${breweryData.name}:`, error);
    }
  }
  
  return addedCount;
}

async function addExpandedWorldBeers(): Promise<number> {
  let addedCount = 0;
  
  for (const beerData of EXPANDED_WORLD_BEERS) {
    try {
      // Find or create brewery
      let brewery = await db
        .select()
        .from(breweries)
        .where(eq(breweries.name, beerData.brewery))
        .limit(1);
        
      if (brewery.length === 0) {
        // Create brewery if doesn't exist
        const [newBrewery] = await db
          .insert(breweries)
          .values({
            name: beerData.brewery,
            location: "Unknown",
            region: "Unknown", 
            country: beerData.country,
            logoUrl: getCountrySpecificLogo(beerData.country)
          })
          .returning();
          
        brewery = [newBrewery];
        console.log(`✅ Created brewery: ${beerData.brewery}`);
      }
      
      // Check if beer already exists
      const existingBeer = await db
        .select()
        .from(beers)
        .where(eq(beers.name, beerData.name))
        .limit(1);
        
      if (existingBeer.length === 0) {
        const styleImage = getStyleBasedImage(beerData.style);
        
        await db
          .insert(beers)
          .values({
            name: beerData.name,
            breweryId: brewery[0].id,
            style: beerData.style,
            abv: beerData.abv.toString(),
            ibu: beerData.ibu,
            description: `Renowned ${beerData.style} from ${beerData.country}. A world-famous beer celebrated for its distinctive flavor profile and brewing excellence.`,
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

function getCountrySpecificLogo(country: string): string {
  const logoMap: { [key: string]: string } = {
    "USA": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "UK": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Germany": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Belgium": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Canada": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Australia": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Japan": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "New Zealand": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Czech Republic": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Spain": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center",
    "Italy": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center"
  };
  
  return logoMap[country] || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop&crop=center";
}

async function runEnhancedGlobalScraper() {
  console.log("🌍 Starting enhanced global beer scraper...");
  
  try {
    // Phase 1: Add Google Places-style breweries
    console.log("📍 Phase 1: Adding Google Places-style breweries...");
    const breweriesAdded = await addGoogleStyleBreweries();
    
    // Phase 2: Add expanded world famous beers
    console.log("🍺 Phase 2: Adding expanded world famous beers...");
    const beersAdded = await addExpandedWorldBeers();
    
    // Final statistics
    const totalBreweries = await db.select().from(breweries);
    const totalBeers = await db.select().from(beers);
    
    console.log("🎉 Enhanced global scraper completed!");
    console.log(`📊 Final Statistics:`);
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
    console.error("❌ Error in enhanced global scraper:", error);
    throw error;
  }
}

// Run scraper if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedGlobalScraper().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { runEnhancedGlobalScraper };