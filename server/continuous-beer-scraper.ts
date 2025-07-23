import { db } from "./db";
import { breweries, beers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Comprehensive beer collection from multiple global sources
const ADDITIONAL_WORLD_BEERS = [
  // Nordic Countries - Scandinavia
  { name: "Carlsberg", brewery: "Carlsberg", country: "Denmark", style: "Euro Pale Lager", abv: 5.0, ibu: 24 },
  { name: "Tuborg Green", brewery: "Tuborg", country: "Denmark", style: "Euro Pale Lager", abv: 4.6, ibu: 15 },
  { name: "Pripps Blå", brewery: "Pripps", country: "Sweden", style: "Euro Pale Lager", abv: 5.3, ibu: 18 },
  { name: "Lapin Kulta", brewery: "Lapin Kulta", country: "Finland", style: "Euro Pale Lager", abv: 4.5, ibu: 12 },
  { name: "Ringnes", brewery: "Ringnes", country: "Norway", style: "Euro Pale Lager", abv: 4.5, ibu: 16 },
  
  // Eastern Europe
  { name: "Żywiec", brewery: "Żywiec", country: "Poland", style: "Euro Pale Lager", abv: 5.6, ibu: 18 },
  { name: "Tyskie", brewery: "Tyskie", country: "Poland", style: "Euro Pale Lager", abv: 5.2, ibu: 15 },
  { name: "Soproni", brewery: "Soproni", country: "Hungary", style: "Euro Pale Lager", abv: 4.9, ibu: 17 },
  { name: "Ursus", brewery: "Ursus", country: "Romania", style: "Euro Pale Lager", abv: 5.0, ibu: 16 },
  
  // Asia-Pacific Extended
  { name: "Tiger Beer", brewery: "Tiger", country: "Singapore", style: "Asian Lager", abv: 5.0, ibu: 16 },
  { name: "Singha", brewery: "Singha", country: "Thailand", style: "Asian Lager", abv: 5.0, ibu: 12 },
  { name: "Chang", brewery: "Chang", country: "Thailand", style: "Asian Lager", abv: 5.0, ibu: 10 },
  { name: "San Miguel Pale Pilsen", brewery: "San Miguel", country: "Philippines", style: "Asian Lager", abv: 5.0, ibu: 15 },
  { name: "Tsingtao", brewery: "Tsingtao", country: "China", style: "Chinese Lager", abv: 4.7, ibu: 12 },
  { name: "Harbin", brewery: "Harbin", country: "China", style: "Chinese Lager", abv: 4.8, ibu: 14 },
  
  // South Korea - Craft Movement
  { name: "Cass", brewery: "Cass", country: "South Korea", style: "Korean Lager", abv: 4.5, ibu: 12 },
  { name: "Hite", brewery: "Hite", country: "South Korea", style: "Korean Lager", abv: 4.5, ibu: 10 },
  { name: "OB Lager", brewery: "OB", country: "South Korea", style: "Korean Lager", abv: 4.8, ibu: 14 },
  
  // South America Extended
  { name: "Quilmes", brewery: "Quilmes", country: "Argentina", style: "South American Lager", abv: 4.9, ibu: 14 },
  { name: "Andes", brewery: "Andes", country: "Argentina", style: "South American Lager", abv: 5.0, ibu: 16 },
  { name: "Cristal", brewery: "Cristal", country: "Chile", style: "Chilean Lager", abv: 4.6, ibu: 12 },
  { name: "Escudo", brewery: "Escudo", country: "Chile", style: "Chilean Lager", abv: 4.8, ibu: 15 },
  { name: "Pilsen Callao", brewery: "Pilsen Callao", country: "Peru", style: "Peruvian Lager", abv: 5.0, ibu: 18 },
  { name: "Aguila", brewery: "Aguila", country: "Colombia", style: "Colombian Lager", abv: 4.0, ibu: 10 },
  
  // Africa
  { name: "Castle Lager", brewery: "Castle", country: "South Africa", style: "African Lager", abv: 5.0, ibu: 18 },
  { name: "Tusker", brewery: "Tusker", country: "Kenya", style: "African Lager", abv: 4.2, ibu: 15 },
  { name: "Star", brewery: "Star", country: "Nigeria", style: "African Lager", abv: 5.3, ibu: 12 },
  
  // USA Craft - More Regions
  { name: "Yuengling Traditional Lager", brewery: "Yuengling", country: "USA", style: "American Amber Lager", abv: 4.5, ibu: 10 },
  { name: "Shiner Bock", brewery: "Shiner", country: "USA", style: "Bock", abv: 4.4, ibu: 13 },
  { name: "Anchor Steam", brewery: "Anchor", country: "USA", style: "California Common", abv: 4.9, ibu: 35 },
  { name: "Deschutes Black Butte Porter", brewery: "Deschutes", country: "USA", style: "Robust Porter", abv: 5.2, ibu: 30 },
  { name: "Alaskan Amber", brewery: "Alaskan", country: "USA", style: "Altbier", abv: 5.3, ibu: 18 },
  
  // UK Regional Specialties
  { name: "Bitter & Twisted", brewery: "Harviestoun", country: "UK", style: "Golden Ale", abv: 4.2, ibu: 42 },
  { name: "Adnams Southwold Bitter", brewery: "Adnams", country: "UK", style: "English Bitter", abv: 3.7, ibu: 32 },
  { name: "Timothy Taylor Landlord", brewery: "Timothy Taylor", country: "UK", style: "English Pale Ale", abv: 4.1, ibu: 35 },
  
  // Germany Regional
  { name: "Augustiner Edelstoff", brewery: "Augustiner-Bräu", country: "Germany", style: "Export", abv: 5.6, ibu: 20 },
  { name: "Spaten Münchner Hell", brewery: "Spaten-Franziskaner-Bräu", country: "Germany", style: "Munich Helles", abv: 5.2, ibu: 18 },
  { name: "Bitburger Premium Pils", brewery: "Bitburger", country: "Germany", style: "German Pilsner", abv: 4.8, ibu: 25 },
  { name: "Beck's", brewery: "Beck's", country: "Germany", style: "German Pilsner", abv: 5.0, ibu: 20 },
  { name: "Warsteiner Premium Verum", brewery: "Warsteiner", country: "Germany", style: "German Pilsner", abv: 4.8, ibu: 24 },
  
  // Belgium Craft Extensions
  { name: "Bruges Zot", brewery: "De Halve Maan", country: "Belgium", style: "Belgian Blonde Ale", abv: 6.0, ibu: 20 },
  { name: "La Chouffe", brewery: "La Chouffe", country: "Belgium", style: "Belgian Strong Ale", abv: 8.0, ibu: 20 },
  { name: "Jupiler", brewery: "Jupiler", country: "Belgium", style: "Euro Pale Lager", abv: 5.2, ibu: 18 },
  
  // Italy Renaissance
  { name: "Nastro Azzurro", brewery: "Peroni", country: "Italy", style: "Euro Pale Lager", abv: 5.1, ibu: 24 },
  { name: "Moretti La Rossa", brewery: "Birra Moretti", country: "Italy", style: "Vienna Lager", abv: 7.2, ibu: 25 },
  { name: "Menabrea", brewery: "Menabrea", country: "Italy", style: "Euro Pale Lager", abv: 4.8, ibu: 16 },
  
  // Swiss Premium
  { name: "Feldschlösschen", brewery: "Feldschlösschen", country: "Switzerland", style: "Swiss Lager", abv: 4.8, ibu: 15 },
  { name: "Cardinal", brewery: "Cardinal", country: "Switzerland", style: "Swiss Lager", abv: 4.9, ibu: 18 },
  
  // Austria
  { name: "Gösser", brewery: "Gösser", country: "Austria", style: "Austrian Lager", abv: 5.2, ibu: 20 },
  { name: "Ottakringer", brewery: "Ottakringer", country: "Austria", style: "Austrian Lager", abv: 5.2, ibu: 18 },
  
  // Israel & Middle East
  { name: "Goldstar", brewery: "Goldstar", country: "Israel", style: "Israeli Lager", abv: 4.9, ibu: 12 },
  { name: "Maccabee", brewery: "Maccabee", country: "Israel", style: "Israeli Lager", abv: 4.9, ibu: 15 },
  
  // India Craft
  { name: "Kingfisher", brewery: "Kingfisher", country: "India", style: "Indian Lager", abv: 4.8, ibu: 12 },
  { name: "Haywards 5000", brewery: "Haywards", country: "India", style: "Strong Lager", abv: 7.0, ibu: 15 },
];

function getBeerStyleImage(style: string): string {
  const imageMap: { [key: string]: string } = {
    // European Lagers
    "Euro Pale Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "German Pilsner": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Swiss Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Austrian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Asian Lagers
    "Asian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Chinese Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Korean Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Indian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Israeli Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // South American
    "South American Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Chilean Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Peruvian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Colombian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // African
    "African Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // American Styles
    "American Amber Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "California Common": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Robust Porter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Altbier": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Bock": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // UK Styles
    "Golden Ale": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English Bitter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // German Styles
    "Export": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Munich Helles": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Belgian
    "Belgian Blonde Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Strong Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Special
    "Vienna Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Strong Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  };
  
  return imageMap[style] || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
}

function getCountrySpecificLogo(country: string): string {
  const logoMap: { [key: string]: string } = {
    "Denmark": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Sweden": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Norway": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Finland": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Poland": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Hungary": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Romania": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Singapore": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Thailand": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Philippines": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "China": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "South Korea": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Argentina": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Chile": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Peru": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Colombia": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "South Africa": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Kenya": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Nigeria": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Switzerland": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Austria": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Israel": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "India": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop"
  };
  
  return logoMap[country] || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop";
}

async function continuousBeerImport() {
  console.log("🌍 Starting continuous global beer import...");
  
  let addedBeers = 0;
  let createdBreweries = 0;
  
  for (const beerData of ADDITIONAL_WORLD_BEERS) {
    try {
      // Find or create brewery
      let brewery = await db
        .select()
        .from(breweries)
        .where(eq(breweries.name, beerData.brewery))
        .limit(1);
        
      if (brewery.length === 0) {
        const [newBrewery] = await db
          .insert(breweries)
          .values({
            name: beerData.brewery,
            location: "Unknown",
            region: "Unknown",
            logoUrl: getCountrySpecificLogo(beerData.country)
          })
          .returning();
          
        brewery = [newBrewery];
        createdBreweries++;
        console.log(`✅ Created brewery: ${beerData.brewery} (${beerData.country})`);
      }
      
      // Check if beer exists
      const existingBeer = await db
        .select()
        .from(beers)
        .where(eq(beers.name, beerData.name))
        .limit(1);
        
      if (existingBeer.length === 0) {
        const styleImage = getBeerStyleImage(beerData.style);
        
        await db
          .insert(beers)
          .values({
            name: beerData.name,
            breweryId: brewery[0].id,
            style: beerData.style,
            abv: beerData.abv.toString(),
            ibu: beerData.ibu,
            description: `Premium ${beerData.style} from ${beerData.country}. This beer represents the finest brewing traditions and is highly regarded worldwide for its authentic taste and quality.`,
            imageUrl: styleImage,
            bottleImageUrl: styleImage,
            logoUrl: styleImage,
            isBottled: true
          });
          
        addedBeers++;
        console.log(`✅ Added: ${beerData.name} by ${beerData.brewery} (${beerData.country})`);
      }
    } catch (error) {
      console.log(`⚠️ Error processing ${beerData.name}:`, error);
    }
  }
  
  // Final statistics
  const totalBeers = await db.select().from(beers);
  const totalBreweries = await db.select().from(breweries);
  
  console.log("🎉 Continuous import completed!");
  console.log(`📊 Session Results:`);
  console.log(`   • New beers added: ${addedBeers}`);
  console.log(`   • New breweries created: ${createdBreweries}`);
  console.log(`   • Total beers in database: ${totalBeers.length}`);
  console.log(`   • Total breweries in database: ${totalBreweries.length}`);
  
  return {
    addedBeers,
    createdBreweries,
    totalBeers: totalBeers.length,
    totalBreweries: totalBreweries.length
  };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  continuousBeerImport().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { continuousBeerImport };