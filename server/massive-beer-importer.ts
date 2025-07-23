import { db } from "./db";
import { breweries, beers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Comprehensive global beer database with authentic data
const WORLD_BEER_COLLECTION = [
  // USA - Craft Beer Powerhouse
  { name: "Founder's Porter", brewery: "Founders Brewing Co.", country: "USA", state: "Michigan", style: "Robust Porter", abv: 6.5, ibu: 45 },
  { name: "Kentucky Breakfast Stout", brewery: "Founders Brewing Co.", country: "USA", state: "Michigan", style: "Imperial Stout", abv: 11.2, ibu: 70 },
  { name: "Hop Stoopid", brewery: "Lagunitas Brewing Company", country: "USA", state: "California", style: "American IPA", abv: 8.0, ibu: 102 },
  { name: "Little Sumpin' Sumpin'", brewery: "Lagunitas Brewing Company", country: "USA", state: "California", style: "American Pale Wheat Ale", abv: 7.5, ibu: 65 },
  { name: "Oberon", brewery: "Bell's Brewery", country: "USA", state: "Michigan", style: "American Wheat Beer", abv: 5.8, ibu: 10 },
  { name: "Hopslam", brewery: "Bell's Brewery", country: "USA", state: "Michigan", style: "Double IPA", abv: 10.0, ibu: 85 },
  { name: "1554 Enlightened Black Ale", brewery: "New Belgium Brewing", country: "USA", state: "Colorado", style: "Dark Lager", abv: 5.5, ibu: 20 },
  { name: "Voodoo Ranger IPA", brewery: "New Belgium Brewing", country: "USA", state: "Colorado", style: "American IPA", abv: 7.0, ibu: 50 },
  
  // Germany - Traditional Excellence
  { name: "Ayinger Oktober Fest-Märzen", brewery: "Ayinger", country: "Germany", state: "Bavaria", style: "Märzen", abv: 5.8, ibu: 18 },
  { name: "Ayinger Ur-Weisse", brewery: "Ayinger", country: "Germany", state: "Bavaria", style: "Hefeweizen", abv: 5.8, ibu: 14 },
  { name: "Hofbräu Oktoberfestbier", brewery: "Hofbräu München", country: "Germany", state: "Bavaria", style: "Oktoberfest", abv: 6.3, ibu: 25 },
  { name: "Löwenbräu Oktoberfest", brewery: "Löwenbräu", country: "Germany", state: "Bavaria", style: "Oktoberfest", abv: 6.1, ibu: 20 },
  { name: "Paulaner Oktoberfest", brewery: "Paulaner", country: "Germany", state: "Bavaria", style: "Märzen", abv: 6.0, ibu: 18 },
  { name: "Schneider Weisse Aventinus", brewery: "Schneider Weisse", country: "Germany", state: "Bavaria", style: "Weizenbock", abv: 8.2, ibu: 16 },
  
  // Belgium - Complex Specialties  
  { name: "Delirium Tremens", brewery: "Huyghe Brewery", country: "Belgium", state: "East Flanders", style: "Belgian Strong Pale Ale", abv: 8.5, ibu: 18 },
  { name: "Kwak", brewery: "Pauwel Kwak", country: "Belgium", state: "East Flanders", style: "Belgian Strong Ale", abv: 8.4, ibu: 25 },
  { name: "St. Bernardus Abt 12", brewery: "St. Bernardus", country: "Belgium", state: "West Flanders", style: "Belgian Quadrupel", abv: 10.0, ibu: 22 },
  { name: "Tripel Karmeliet", brewery: "Bosteels", country: "Belgium", state: "East Flanders", style: "Belgian Tripel", abv: 8.4, ibu: 15 },
  { name: "Saison Dupont", brewery: "Brasserie Dupont", country: "Belgium", state: "Hainaut", style: "Saison", abv: 6.5, ibu: 32 },
  { name: "Leffe Brune", brewery: "Leffe", country: "Belgium", state: "Namur", style: "Belgian Dubbel", abv: 6.5, ibu: 20 },
  
  // UK & Ireland - Traditional Ales
  { name: "Newcastle Brown Ale", brewery: "Newcastle", country: "UK", state: "England", style: "English Brown Ale", abv: 4.7, ibu: 17 },
  { name: "Old Speckled Hen", brewery: "Greene King", country: "UK", state: "England", style: "English Bitter", abv: 5.0, ibu: 30 },
  { name: "Boddingtons", brewery: "Boddingtons", country: "UK", state: "England", style: "English Bitter", abv: 4.7, ibu: 20 },
  { name: "Bass Pale Ale", brewery: "Bass", country: "UK", state: "England", style: "English Pale Ale", abv: 5.1, ibu: 25 },
  { name: "Murphy's Irish Stout", brewery: "Murphy's", country: "Ireland", state: "Cork", style: "Irish Stout", abv: 4.3, ibu: 35 },
  { name: "Smithwick's Red Ale", brewery: "Smithwick's", country: "Ireland", state: "Kilkenny", style: "Irish Red Ale", abv: 4.5, ibu: 22 },
  
  // Australia & New Zealand - Pacific Excellence
  { name: "Victoria Bitter", brewery: "CUB", country: "Australia", state: "Victoria", style: "Australian Lager", abv: 4.9, ibu: 25 },
  { name: "XXXX Gold", brewery: "XXXX", country: "Australia", state: "Queensland", style: "Australian Lager", abv: 3.5, ibu: 12 },
  { name: "Tooheys New", brewery: "Tooheys", country: "Australia", state: "NSW", style: "Australian Lager", abv: 4.6, ibu: 16 },
  { name: "Speight's Gold Medal Ale", brewery: "Speight's", country: "New Zealand", state: "Otago", style: "New Zealand Bitter", abv: 4.0, ibu: 25 },
  { name: "Steinlager Pure", brewery: "Steinlager", country: "New Zealand", state: "Auckland", style: "Premium Lager", abv: 5.0, ibu: 15 },
  
  // Japan - Modern Craft & Traditional
  { name: "Yebisu Premium", brewery: "Yebisu", country: "Japan", state: "Tokyo", style: "German-style Lager", abv: 5.0, ibu: 20 },
  { name: "Orion Draft", brewery: "Orion", country: "Japan", state: "Okinawa", style: "Japanese Rice Lager", abv: 5.0, ibu: 18 },
  { name: "Coedo Kyara", brewery: "Coedo", country: "Japan", state: "Saitama", style: "Munich Helles", abv: 5.5, ibu: 20 },
  { name: "Hitachino Nest Red Rice Ale", brewery: "Hitachino Nest Beer", country: "Japan", state: "Ibaraki", style: "Specialty Beer", abv: 7.0, ibu: 17 },
  
  // Mexico - Light Lagers
  { name: "Tecate", brewery: "Tecate", country: "Mexico", state: "Baja California", style: "Mexican Lager", abv: 4.5, ibu: 10 },
  { name: "Pacifico", brewery: "Pacifico", country: "Mexico", state: "Sinaloa", style: "Mexican Lager", abv: 4.4, ibu: 18 },
  { name: "Negra Modelo", brewery: "Grupo Modelo", country: "Mexico", state: "Mexico City", style: "Munich Dunkel", abv: 5.4, ibu: 16 },
  { name: "Victoria", brewery: "Grupo Modelo", country: "Mexico", state: "Mexico City", style: "Vienna Lager", abv: 4.0, ibu: 18 },
  
  // Czech Republic - Pilsner Masters
  { name: "Gambrinus", brewery: "Gambrinus", country: "Czech Republic", state: "Plzen", style: "Czech Pilsner", abv: 4.3, ibu: 25 },
  { name: "Velkopopovický Kozel", brewery: "Kozel", country: "Czech Republic", state: "Velké Popovice", style: "Czech Lager", abv: 4.6, ibu: 18 },
  { name: "Bernard Celebration", brewery: "Bernard", country: "Czech Republic", state: "Humpolec", style: "Czech Lager", abv: 5.0, ibu: 20 },
  { name: "Krusovice Imperial", brewery: "Krusovice", country: "Czech Republic", state: "Krusovice", style: "Czech Premium Lager", abv: 5.0, ibu: 22 },
  
  // Netherlands - Dutch Tradition
  { name: "Heineken", brewery: "Heineken", country: "Netherlands", state: "North Holland", style: "Euro Pale Lager", abv: 5.0, ibu: 23 },
  { name: "Amstel Light", brewery: "Amstel", country: "Netherlands", state: "North Holland", style: "Light Beer", abv: 3.5, ibu: 15 },
  { name: "Grolsch Premium Lager", brewery: "Grolsch", country: "Netherlands", state: "Gelderland", style: "Euro Pale Lager", abv: 5.0, ibu: 27 },
  
  // Spain & Portugal - Iberian Selection
  { name: "Mahou Cinco Estrellas", brewery: "Mahou", country: "Spain", state: "Madrid", style: "Euro Pale Lager", abv: 5.5, ibu: 25 },
  { name: "San Miguel", brewery: "San Miguel", country: "Spain", state: "Lleida", style: "Euro Pale Lager", abv: 5.4, ibu: 20 },
  { name: "Super Bock", brewery: "Super Bock", country: "Portugal", state: "Porto", style: "Euro Pale Lager", abv: 5.2, ibu: 15 },
  { name: "Sagres", brewery: "Sagres", country: "Portugal", state: "Lisbon", style: "Euro Pale Lager", abv: 5.1, ibu: 12 },
  
  // France - Artisanal Renaissance
  { name: "Kronenbourg 1664", brewery: "Kronenbourg", country: "France", state: "Alsace", style: "Euro Pale Lager", abv: 5.0, ibu: 20 },
  { name: "Pelforth Blonde", brewery: "Pelforth", country: "France", state: "Nord", style: "Blonde Ale", abv: 5.8, ibu: 15 },
  { name: "Fischer", brewery: "Fischer", country: "France", state: "Alsace", style: "Euro Pale Lager", abv: 5.0, ibu: 18 },
  
  // Canada - Northern Excellence
  { name: "Labatt Blue", brewery: "Labatt", country: "Canada", state: "Ontario", style: "North American Lager", abv: 5.0, ibu: 12 },
  { name: "Alexander Keith's IPA", brewery: "Alexander Keith's", country: "Canada", state: "Nova Scotia", style: "English IPA", abv: 5.0, ibu: 28 },
  { name: "Sleeman Honey Brown", brewery: "Sleeman", country: "Canada", state: "Ontario", style: "Honey Beer", abv: 5.2, ibu: 15 },
  
  // Brazil - South American Giants
  { name: "Skol", brewery: "AmBev", country: "Brazil", state: "São Paulo", style: "American Lager", abv: 4.7, ibu: 8 },
  { name: "Itaipava", brewery: "Petrópolis", country: "Brazil", state: "Rio de Janeiro", style: "American Lager", abv: 4.6, ibu: 10 },
];

async function createBreweryIfNotExists(breweryName: string, country: string, state: string): Promise<any> {
  let brewery = await db
    .select()
    .from(breweries)
    .where(eq(breweries.name, breweryName))
    .limit(1);
    
  if (brewery.length === 0) {
    const [newBrewery] = await db
      .insert(breweries)
      .values({
        name: breweryName,
        location: state || "Unknown",
        region: state || "Unknown",
        logoUrl: getCountryLogo(country)
      })
      .returning();
      
    brewery = [newBrewery];
    console.log(`✅ Created brewery: ${breweryName} (${country})`);
  }
  
  return brewery[0];
}

function getCountryLogo(country: string): string {
  const countryLogos: { [key: string]: string } = {
    "USA": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Germany": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Belgium": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "UK": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Ireland": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Australia": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "New Zealand": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Japan": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Mexico": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Czech Republic": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Netherlands": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Spain": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Portugal": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "France": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Canada": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop",
    "Brazil": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop"
  };
  
  return countryLogos[country] || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=100&h=100&fit=crop";
}

function getStyleImage(style: string): string {
  const styleImages: { [key: string]: string } = {
    // IPAs and Pale Ales
    "American IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Double IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "American Pale Wheat Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Lagers
    "Euro Pale Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Pilsner": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Lager": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Czech Premium Lager": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Mexican Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Australian Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Japanese Rice Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "German-style Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Premium Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "North American Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "American Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Light Beer": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Wheat Beers
    "American Wheat Beer": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Hefeweizen": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Weizenbock": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Dark Beers
    "Robust Porter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Imperial Stout": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Irish Stout": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Dark Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Munich Dunkel": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English Brown Ale": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Belgian Styles
    "Belgian Strong Pale Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Strong Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Quadrupel": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Tripel": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Belgian Dubbel": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Saison": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Traditional Styles
    "Märzen": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Oktoberfest": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English Bitter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "English Pale Ale": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Irish Red Ale": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "New Zealand Bitter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Vienna Lager": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Munich Helles": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    
    // Specialty 
    "Blonde Ale": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Honey Beer": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "Specialty Beer": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  };
  
  return styleImages[style] || "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
}

async function massiveImport() {
  console.log("🌍 Starting massive world beer import...");
  
  let beersAdded = 0;
  let breweriesCreated = 0;
  
  for (const beerData of WORLD_BEER_COLLECTION) {
    try {
      // Create brewery if needed
      const brewery = await createBreweryIfNotExists(beerData.brewery, beerData.country, beerData.state);
      if (!brewery.id) breweriesCreated++;
      
      // Check if beer exists
      const existingBeer = await db
        .select()
        .from(beers)
        .where(eq(beers.name, beerData.name))
        .limit(1);
        
      if (existingBeer.length === 0) {
        const styleImage = getStyleImage(beerData.style);
        
        await db
          .insert(beers)
          .values({
            name: beerData.name,
            breweryId: brewery.id,
            style: beerData.style,
            abv: beerData.abv.toString(),
            ibu: Math.round(beerData.ibu),
            description: `Authentic ${beerData.style} from ${beerData.country}. A renowned beer that represents the finest brewing traditions of ${beerData.state || beerData.country}.`,
            imageUrl: styleImage,
            bottleImageUrl: styleImage,
            logoUrl: styleImage,
            isBottled: true
          });
          
        beersAdded++;
        console.log(`✅ Added: ${beerData.name} by ${beerData.brewery} (${beerData.country})`);
      }
    } catch (error) {
      console.log(`⚠️ Error adding ${beerData.name}:`, error);
    }
  }
  
  // Final stats
  const totalBreweries = await db.select().from(breweries);
  const totalBeers = await db.select().from(beers);
  
  console.log("🎉 Massive import completed!");
  console.log(`📊 Statistics:`);
  console.log(`   • New beers added: ${beersAdded}`);
  console.log(`   • New breweries created: ${breweriesCreated}`);
  console.log(`   • Total breweries: ${totalBreweries.length}`);
  console.log(`   • Total beers: ${totalBeers.length}`);
  
  return {
    beersAdded,
    breweriesCreated,
    totalBreweries: totalBreweries.length,
    totalBeers: totalBeers.length
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  massiveImport().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { massiveImport };