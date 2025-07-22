import { db } from "./db";
import { beers, breweries, insertBeerSchema, insertBrewerySchema } from "@shared/schema";
import { eq, ilike } from "drizzle-orm";

interface OpenBreweryAPI {
  id: string;
  name: string;
  brewery_type: string;
  address_1: string;
  city: string;
  state_province: string;
  country: string;
  longitude?: string;
  latitude?: string;
  phone?: string;
  website_url?: string;
  state?: string;
}

interface BeerData {
  name: string;
  style: string;
  abv: string;
  ibu?: number;
  description?: string;
  color?: string;
  isBottled: boolean;
  logoUrl?: string;
}

// Dati globali raccolti da diverse fonti per birrifici famosi
const GLOBAL_BEER_DATA: Record<string, BeerData[]> = {
  // Dogfish Head (USA)
  "dogfish head": [
    {
      name: "60 Minute IPA",
      style: "American IPA",
      abv: "6.0",
      ibu: 60,
      description: "Continously hopped IPA with citrus and floral notes",
      color: "Golden amber",
      isBottled: true
    },
    {
      name: "90 Minute IPA",
      style: "Imperial IPA",
      abv: "9.0",
      ibu: 90,
      description: "Imperial IPA with intense hop character and caramel malt backbone",
      color: "Deep amber",
      isBottled: true
    },
    {
      name: "120 Minute IPA",
      style: "American Double IPA",
      abv: "15.0",
      ibu: 120,
      description: "Extreme beer with massive hop flavor and alcohol warmth",
      color: "Deep copper",
      isBottled: true
    }
  ],
  
  // Stone Brewing (USA)
  "stone brewing": [
    {
      name: "Stone IPA",
      style: "American IPA",
      abv: "6.9",
      ibu: 77,
      description: "Bold, citrusy American IPA with tropical fruit notes",
      color: "Golden amber",
      isBottled: true
    },
    {
      name: "Arrogant Bastard Ale",
      style: "American Strong Ale",
      abv: "7.2",
      ibu: 100,
      description: "Aggressive ale with intense hop bitterness and malt character",
      color: "Deep amber",
      isBottled: true
    }
  ],

  // BrewDog (UK)
  "brewdog": [
    {
      name: "Punk IPA",
      style: "India Pale Ale",
      abv: "5.6",
      ibu: 45,
      description: "Post-modern classic with tropical fruit flavours and sharp bitter finish",
      color: "Golden",
      isBottled: true
    },
    {
      name: "Dead Pony Club",
      style: "Session IPA",
      abv: "3.8",
      ibu: 35,
      description: "Sessionable IPA packed with hop character despite lower ABV",
      color: "Pale gold",
      isBottled: true
    },
    {
      name: "Elvis Juice",
      style: "Grapefruit IPA",
      abv: "6.5",
      ibu: 40,
      description: "IPA infused with grapefruit for citrus explosion",
      color: "Golden amber",
      isBottled: true
    }
  ],

  // Cantillon (Belgium)
  "cantillon": [
    {
      name: "Gueuze 100% Lambic",
      style: "Gueuze",
      abv: "5.0",
      ibu: 10,
      description: "Traditional Belgian lambic with wild fermentation and tart character",
      color: "Golden yellow",
      isBottled: true
    },
    {
      name: "Kriek 100% Lambic",
      style: "Fruit Lambic",
      abv: "5.0",
      ibu: 8,
      description: "Cherry lambic with intense fruit flavors and wild yeast character",
      color: "Deep red",
      isBottled: true
    }
  ],

  // Weihenstephan (Germany)
  "weihenstephan": [
    {
      name: "Hefeweizen",
      style: "Hefeweizen",
      abv: "5.4",
      ibu: 14,
      description: "Classic Bavarian wheat beer with banana and clove notes",
      color: "Cloudy golden",
      isBottled: true
    },
    {
      name: "Pilsner",
      style: "German Pilsner",
      abv: "5.1",
      ibu: 28,
      description: "Traditional German pilsner with noble hop character",
      color: "Golden",
      isBottled: true
    }
  ],

  // Founders (USA)
  "founders brewing": [
    {
      name: "All Day IPA",
      style: "Session IPA",
      abv: "4.7",
      ibu: 42,
      description: "Low ABV IPA with full hop flavor for all-day drinking",
      color: "Golden",
      isBottled: true
    },
    {
      name: "Kentucky Breakfast Stout",
      style: "Imperial Stout",
      abv: "12.0",
      ibu: 70,
      description: "Bourbon barrel-aged stout with coffee and chocolate notes",
      color: "Black",
      isBottled: true
    }
  ],

  // Bell's (USA)
  "bell's brewery": [
    {
      name: "Two Hearted Ale",
      style: "American IPA",
      abv: "7.0",
      ibu: 55,
      description: "Perfectly balanced IPA with Centennial hops",
      color: "Amber",
      isBottled: true
    },
    {
      name: "Hopslam",
      style: "Double IPA",
      abv: "10.0",
      ibu: 70,
      description: "Honey-infused double IPA with intense hop character",
      color: "Golden amber",
      isBottled: true
    }
  ],

  // Duvel (Belgium)
  "duvel": [
    {
      name: "Duvel",
      style: "Belgian Golden Strong Ale",
      abv: "8.5",
      ibu: 32,
      description: "Classic Belgian strong ale with complex yeast character",
      color: "Golden",
      isBottled: true
    },
    {
      name: "Duvel Tripel Hop",
      style: "Belgian Strong Ale",
      abv: "9.5",
      ibu: 40,
      description: "Duvel with additional American hops for extra complexity",
      color: "Golden amber",
      isBottled: true
    }
  ],

  // Chimay (Belgium)
  "chimay": [
    {
      name: "Chimay Blue",
      style: "Belgian Quadrupel",
      abv: "9.0",
      ibu: 25,
      description: "Dark Trappist ale with rich fruit and spice notes",
      color: "Dark brown",
      isBottled: true
    },
    {
      name: "Chimay Red",
      style: "Belgian Dubbel",
      abv: "7.0",
      ibu: 20,
      description: "Copper-colored Trappist ale with caramel and fruit flavors",
      color: "Copper red",
      isBottled: true
    }
  ],

  // Russian River (USA)
  "russian river": [
    {
      name: "Pliny the Elder",
      style: "Double IPA",
      abv: "8.0",
      ibu: 100,
      description: "Legendary West Coast DIPA with intense hop aroma and flavor",
      color: "Golden amber",
      isBottled: true
    },
    {
      name: "Blind Pig IPA",
      style: "American IPA",
      abv: "6.25",
      ibu: 70,
      description: "Classic American IPA with citrus and pine hop character",
      color: "Golden",
      isBottled: true
    }
  ]
};

async function fetchGlobalBreweries() {
  console.log("🌍 Raccogliendo birrifici globali da Open Brewery DB...");
  
  const countries = ["United States", "United Kingdom", "Belgium", "Germany", "Netherlands", "Italy", "France", "Czech Republic"];
  const allBreweries: OpenBreweryAPI[] = [];
  
  for (const country of countries) {
    try {
      const response = await fetch(`https://api.openbrewerydb.org/v1/breweries?by_country=${encodeURIComponent(country)}&per_page=50`);
      if (response.ok) {
        const breweries: OpenBreweryAPI[] = await response.json();
        allBreweries.push(...breweries);
        console.log(`  ✅ ${country}: ${breweries.length} birrifici trovati`);
      }
    } catch (error) {
      console.log(`  ❌ Errore per ${country}:`, error);
    }
  }
  
  return allBreweries;
}

async function addBreweryToDatabase(breweryData: OpenBreweryAPI) {
  // Controlla se il birrificio esiste già
  const existing = await db
    .select()
    .from(breweries)
    .where(ilike(breweries.name, `%${breweryData.name}%`))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Crea nuovo birrificio
  const newBrewery = {
    name: breweryData.name,
    location: breweryData.city || "Unknown",
    region: breweryData.state_province || breweryData.country || "Unknown",
    description: `${breweryData.brewery_type} brewery located in ${breweryData.city}, ${breweryData.country}`,
    logoUrl: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=200&h=200&fit=crop",
    websiteUrl: breweryData.website_url || null,
    latitude: breweryData.latitude ? parseFloat(breweryData.latitude) : null,
    longitude: breweryData.longitude ? parseFloat(breweryData.longitude) : null,
    rating: "4.0"
  };

  const [inserted] = await db.insert(breweries).values(newBrewery).returning();
  return inserted;
}

async function addBeersForBrewery(brewery: any, beersData: BeerData[]) {
  let addedCount = 0;
  
  for (const beerData of beersData) {
    // Verifica se la birra esiste già
    const existingBeer = await db
      .select()
      .from(beers)
      .where(eq(beers.name, beerData.name))
      .limit(1);

    if (existingBeer.length === 0) {
      const newBeer = {
        ...beerData,
        breweryId: brewery.id,
        logoUrl: beerData.logoUrl || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop"
      };

      await db.insert(beers).values(newBeer);
      addedCount++;
      console.log(`    ✅ Aggiunta: ${beerData.name} (${beerData.style})`);
    }
  }
  
  return addedCount;
}

async function globalBeerScraping() {
  console.log("🚀 Avvio scraping globale delle birre...");
  
  try {
    // Step 1: Ottieni birrifici globali da API
    const globalBreweries = await fetchGlobalBreweries();
    console.log(`📊 Totale birrifici trovati: ${globalBreweries.length}`);

    let totalBreweriesAdded = 0;
    let totalBeersAdded = 0;

    // Step 2: Processa ogni birrificio
    for (const breweryData of globalBreweries.slice(0, 30)) { // Limitiamo per evitare overload
      try {
        // Aggiungi birrificio al database
        const brewery = await addBreweryToDatabase(breweryData);
        
        if (brewery) {
          // Cerca birre corrispondenti nei nostri dati curated
          const breweryNameLower = brewery.name.toLowerCase();
          
          for (const [key, beersData] of Object.entries(GLOBAL_BEER_DATA)) {
            if (breweryNameLower.includes(key) || key.includes(breweryNameLower)) {
              console.log(`🍺 Aggiungendo birre per ${brewery.name}...`);
              const added = await addBeersForBrewery(brewery, beersData);
              totalBeersAdded += added;
              break;
            }
          }
          
          totalBreweriesAdded++;
        }
      } catch (error) {
        console.log(`  ⚠️ Errore processando ${breweryData.name}:`, error);
      }
    }

    // Step 3: Aggiungi dati speciali per birrifici famosi non trovati via API
    console.log("🌟 Aggiungendo birrifici famosi mancanti...");
    
    const famousBreweries = [
      {
        name: "Russian River Brewing Company",
        location: "Santa Rosa",
        region: "California",
        description: "Famous for Pliny the Elder and sour beers",
        country: "United States"
      },
      {
        name: "Cantillon Brewery",
        location: "Brussels",
        region: "Brussels",
        description: "Traditional lambic brewery since 1900",
        country: "Belgium"
      }
    ];

    for (const famousData of famousBreweries) {
      const brewery = await addBreweryToDatabase({
        id: famousData.name.toLowerCase().replace(/\s+/g, '-'),
        name: famousData.name,
        brewery_type: "micro",
        address_1: "",
        city: famousData.location,
        state_province: famousData.region,
        country: famousData.country
      });

      const breweryKey = Object.keys(GLOBAL_BEER_DATA).find(key => 
        famousData.name.toLowerCase().includes(key)
      );

      if (breweryKey && brewery) {
        const added = await addBeersForBrewery(brewery, GLOBAL_BEER_DATA[breweryKey]);
        totalBeersAdded += added;
      }
    }

    console.log(`\n🎉 Scraping globale completato!`);
    console.log(`📈 Statistiche:`);
    console.log(`   • Birrifici processati: ${totalBreweriesAdded}`);
    console.log(`   • Birre aggiunte: ${totalBeersAdded}`);
    console.log(`   • Database arricchito con dati autentici globali`);

  } catch (error) {
    console.error("❌ Errore durante lo scraping globale:", error);
  }
}

export { globalBeerScraping };

// Per eseguire direttamente: tsx server/global-beer-scraper.ts
// Questo è gestito dallo script separato scripts/run-scraping.ts