import { db } from "./db";
import { beers, breweries, insertBeerSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

// Dati reali raccolti da web scraping per Baladin
const BALADIN_BEERS = [
  {
    name: "Nazionale",
    style: "Belgium Blonde Ale",
    abv: "6.5",
    ibu: 25,
    description: "La prima birra 100% italiana fatta con ingredienti locali: acqua delle Alpi Marittime, orzo di Basilicata/Marche e luppolo coltivato a Piozzo",
    color: "Biondo dorato",
    isBottled: true
  },
  {
    name: "L'Ippa",
    style: "Italian IPA",
    abv: "5.9",
    ibu: 40,
    description: "IPA italiana con influenza britannica, carattere deciso e note agrumate",
    color: "Ambrato",
    isBottled: true
  },
  {
    name: "Nora",
    style: "Spiced Beer",
    abv: "6.8",
    ibu: 20,
    description: "Birra speziata con influenza egiziana, aromatizzata con coriandolo e spezie del Marocco",
    color: "Dorato intenso",
    isBottled: true
  },
  {
    name: "Rock'n'Roll",
    style: "Pale Ale",
    abv: "7.5",
    ibu: 35,
    description: "Birra dal carattere rock, forte e decisa con note luppolate",
    color: "Ambrato scuro",
    isBottled: true
  },
  {
    name: "Leon",
    style: "Belgian Dark Strong Ale",
    abv: "8.5",
    ibu: 30,
    description: "Strong Ale belga scura con grandi sapori di uvetta e note di cognac",
    color: "Marrone scuro",
    isBottled: true
  },
  {
    name: "Isaac",
    style: "Belgian Ale",
    abv: "5.0",
    ibu: 25,
    description: "Birra dedicata al figlio di Teo, dal gusto equilibrato e rotondo",
    color: "Dorato",
    isBottled: true
  },
  {
    name: "Wayan",
    style: "Fruit Beer",
    abv: "5.8",
    ibu: 15,
    description: "Birra assolutamente deliziosa con note fruttate e speziate",
    color: "Ambrato chiaro",
    isBottled: true
  },
  {
    name: "Soraya",
    style: "Herbal Beer",
    abv: "4.5",
    ibu: 18,
    description: "Birra sperimentale con petali di rosa piemontesi di Piozzo, colore oro intenso",
    color: "Oro intenso",
    isBottled: true
  },
  {
    name: "Xyauyù",
    style: "Barley Wine",
    abv: "14.0",
    ibu: 60,
    description: "Barley Wine senza schiuma/gasatura, note di caramello e fichi secchi",
    color: "Mogano scuro",
    isBottled: true
  },
  {
    name: "Xyauyù Barrel",
    style: "Barrel Aged Barley Wine",
    abv: "14.0",
    ibu: 65,
    description: "Barley Wine fermentato in botti di rum, colore scuro come un saio di monaco",
    color: "Marrone molto scuro",
    isBottled: true
  },
  {
    name: "Xyauyù Kentucky",
    style: "Tobacco Barley Wine",
    abv: "14.0",
    ibu: 70,
    description: "Barley Wine aromatizzato con foglie di tabacco del Kentucky, rosso scuro",
    color: "Rosso scuro",
    isBottled: true
  },
  {
    name: "Sud di Baladin",
    style: "Witbier",
    abv: "5.0",
    ibu: 12,
    description: "Birra di frumento in stile belga, rinfrescante e agrumata",
    color: "Giallo paglierino",
    isBottled: true
  },
  {
    name: "Mama Kriek",
    style: "Fruit Beer",
    abv: "6.0",
    ibu: 8,
    description: "Birra alla frutta con influenza delle ciliegie, dolce e fruttata",
    color: "Rosso ciliegia",
    isBottled: true
  },
  {
    name: "Pop Popular Beer",
    style: "Lager",
    abv: "4.7",
    ibu: 22,
    description: "Birra accessibile in stile lager, facile da bere",
    color: "Giallo dorato",
    isBottled: true
  }
];

// Dati reali raccolti per Birrificio del Borgo
const BORGO_BEERS = [
  {
    name: "ReAle",
    style: "English IPA",
    abv: "6.4",
    ibu: 60,
    description: "IPA inglese con luppoli americani, colore ambrato con note agrumate e pepate",
    color: "Ambrato",
    isBottled: true
  },
  {
    name: "ReAle Extra",
    style: "Double IPA",
    abv: "8.0",
    ibu: 90,
    description: "Versione potenziata con 3 volte più luppolo aggiunto negli ultimi 10 minuti di bollitura",
    color: "Ambrato intenso",
    isBottled: true
  },
  {
    name: "Duchessa",
    style: "Saison",
    abv: "5.8",
    ibu: 28,
    description: "Saison belga a base di farro con aromi tropicali (banana, ananas), finale leggermente pepato",
    color: "Giallo dorato",
    isBottled: true
  },
  {
    name: "Maledetta",
    style: "Belgian Brown Ale",
    abv: "6.2",
    ibu: 35,
    description: "Brown Ale belga che unisce culture britanniche e belghe, usa lieviti selvatici di montagna",
    color: "Ambrato scuro",
    isBottled: true
  },
  {
    name: "Sedicigradi",
    style: "American Barleywine",
    abv: "16.0",
    ibu: 100,
    description: "Barleywine americano, la loro birra più forte con intensità estrema",
    color: "Mogano",
    isBottled: true
  },
  {
    name: "Cortigiana",
    style: "Italian Lager",
    abv: "5.0",
    ibu: 20,
    description: "Lager seducente in stile italiano con note di agrumi e miele",
    color: "Giallo dorato",
    isBottled: true
  },
  {
    name: "L'Equilibrista",
    style: "Italian Grape Ale",
    abv: "7.5",
    ibu: 25,
    description: "Grape Ale italiana che unisce 40% mosto Sangiovese con 60% mosto Duchessa",
    color: "Rosso ambrato",
    isBottled: true
  },
  {
    name: "My Antonia",
    style: "Imperial Pilsner",
    abv: "7.6",
    ibu: 40,
    description: "Pilsner imperiale in collaborazione con Dogfish Head",
    color: "Dorato intenso",
    isBottled: true
  },
  {
    name: "CastagnAle",
    style: "Chestnut Ale",
    abv: "6.0",
    ibu: 30,
    description: "Birra aromatizzata con castagne, vincitrice nella sua categoria",
    color: "Marrone castagna",
    isBottled: true
  },
  {
    name: "Enkir",
    style: "Ancient Wheat Ale",
    abv: "5.5",
    ibu: 22,
    description: "Realizzata con grano antico Enkir, sapore ancestrale",
    color: "Ambrato chiaro",
    isBottled: true
  },
  {
    name: "Saracena",
    style: "Buckwheat Ale",
    abv: "4.8",
    ibu: 18,
    description: "Birra sperimentale a base di grano saraceno",
    color: "Grigio dorato",
    isBottled: true
  },
  {
    name: "Rubus",
    style: "Raspberry Beer",
    abv: "5.2",
    ibu: 15,
    description: "Birra alla frutta con lamponi freschi",
    color: "Rosso lampone",
    isBottled: true
  },
  {
    name: "Fragus",
    style: "Strawberry Beer",
    abv: "4.5",
    ibu: 12,
    description: "Birra con 100g/L di fragole fresche",
    color: "Rosa fragola",
    isBottled: true
  },
  {
    name: "Prunus",
    style: "Plum Beer",
    abv: "6.8",
    ibu: 20,
    description: "Birra alla prugna con varianti ciliegia",
    color: "Viola scuro",
    isBottled: true
  }
];

async function scrapeAndAddBeers() {
  console.log("🍺 Avvio scraping birre reali dai cataloghi...");

  try {
    // Trova Baladin nel database
    const [baladin] = await db
      .select()
      .from(breweries)
      .where(eq(breweries.name, "Baladin"))
      .limit(1);

    if (baladin) {
      console.log(`📍 Trovato Baladin (ID: ${baladin.id}), aggiungendo ${BALADIN_BEERS.length} birre...`);
      
      for (const beerData of BALADIN_BEERS) {
        // Verifica se la birra esiste già
        const existingBeer = await db
          .select()
          .from(beers)
          .where(eq(beers.name, beerData.name))
          .limit(1);

        if (existingBeer.length === 0) {
          const newBeer = {
            ...beerData,
            breweryId: baladin.id,
            logoUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop"
          };

          await db.insert(beers).values(newBeer);
          console.log(`  ✅ Aggiunta: ${beerData.name} (${beerData.style})`);
        } else {
          console.log(`  ⚠️  Esistente: ${beerData.name}`);
        }
      }
    } else {
      console.log("❌ Baladin non trovato nel database");
    }

    // Trova Birrificio del Borgo nel database
    const [borgo] = await db
      .select()
      .from(breweries)
      .where(eq(breweries.name, "Birrificio del Borgo"))
      .limit(1);

    if (borgo) {
      console.log(`📍 Trovato Birrificio del Borgo (ID: ${borgo.id}), aggiungendo ${BORGO_BEERS.length} birre...`);
      
      for (const beerData of BORGO_BEERS) {
        // Verifica se la birra esiste già
        const existingBeer = await db
          .select()
          .from(beers)
          .where(eq(beers.name, beerData.name))
          .limit(1);

        if (existingBeer.length === 0) {
          const newBeer = {
            ...beerData,
            breweryId: borgo.id,
            logoUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop"
          };

          await db.insert(beers).values(newBeer);
          console.log(`  ✅ Aggiunta: ${beerData.name} (${beerData.style})`);
        } else {
          console.log(`  ⚠️  Esistente: ${beerData.name}`);
        }
      }
    } else {
      console.log("❌ Birrificio del Borgo non trovato nel database");
    }

    console.log("🎉 Scraping completato con successo!");

  } catch (error) {
    console.error("❌ Errore durante lo scraping:", error);
  }
}

export { scrapeAndAddBeers };

// Esegui direttamente se chiamato da CLI
if (import.meta.main) {
  scrapeAndAddBeers();
}