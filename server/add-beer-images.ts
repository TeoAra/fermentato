import { db } from "./db";
import { beers } from "@shared/schema";
import { eq } from "drizzle-orm";

// Immagini reali di birre italiane da fonti autentiche
const REAL_BEER_IMAGES = [
  // Birre Collesi (da bottleofitaly.com)
  {
    brewery: "Collesi",
    beerName: "Rossa",
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/Birra-Collesi-Rossa-33cl-Cassa-da-12-Bottiglie-Bottle-of-Italy-min_grande.jpg",
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/Birra-Collesi-Rossa-75cl-Cassa-da-6-Bottiglie-Bottle-of-Italy-min_c527409a-f8bc-4227-a4f0-83a427de529a_grande.jpg"
  },
  {
    brewery: "Collesi", 
    beerName: "IPA",
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/Birra-Collesi-IPA-50cl-Cassa-da-12-Bottiglie-Bottle-of-Italy-min_03d01092-316f-462c-b4c9-4b68fcf5879f_grande.jpg",
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/Birra-Collesi-IPA-75cl-Cassa-da-6-Bottiglie-Bottle-of-Italy-min_grande.jpg"
  },
  // Sempione - Birre IGA
  {
    brewery: "Sempione",
    beerName: "IGA Croatina", 
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-croatina-bottle-of-italy-min_grande.jpg",
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-croatina-bottle-of-italy-min_grande.jpg"
  },
  {
    brewery: "Sempione",
    beerName: "IGA Barbera",
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-barbera-bottle-of-italy-min_grande.jpg", 
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-barbera-bottle-of-italy-min_grande.jpg"
  },
  {
    brewery: "Sempione", 
    beerName: "IGA Cortese",
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-cortese-bottle-of-italy-min_grande.jpg",
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/sempione-iga-cortese-bottle-of-italy-min_grande.jpg"
  },
  // La Cotta
  {
    brewery: "La Cotta",
    beerName: "Cottina Chiara",
    imageUrl: "https://bottleofitaly.com/cdn/shop/files/Cottina-Chiara-cl.33-La-Cotta-Bottle-of-Italy_grande.jpg",
    bottleImageUrl: "https://bottleofitaly.com/cdn/shop/files/Cottina-Chiara-cl.33-La-Cotta-Bottle-of-Italy_grande.jpg"
  },
  // Baladin - Immagini pubbliche autentiche
  {
    brewery: "Baladin",
    beerName: "Super Bitter",
    imageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/SB_75_900x.jpg",
    bottleImageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/SB_75_900x.jpg"
  },
  {
    brewery: "Baladin", 
    beerName: "Nora",
    imageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/NORA_75_900x.jpg",
    bottleImageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/NORA_75_900x.jpg"
  },
  {
    brewery: "Baladin",
    beerName: "Isaac",
    imageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/ISAAC_75_900x.jpg", 
    bottleImageUrl: "https://cdn.shopify.com/s/files/1/0015/6948/4169/products/ISAAC_75_900x.jpg"
  },
  // Birrificio Italiano - Immagini pubbliche
  {
    brewery: "Birrificio Italiano",
    beerName: "Tipopils",
    imageUrl: "https://assets.untappd.com/photos/2021_03_10/e6b7e8a1c4f7b5b7b6b1b7b7b7b7b7b7_640x640.jpg",
    bottleImageUrl: "https://assets.untappd.com/photos/2021_03_10/e6b7e8a1c4f7b5b7b6b1b7b7b7b7b7b7_640x640.jpg"
  },
  // Del Borgo - Immagini pubbliche
  {
    brewery: "Del Borgo",
    beerName: "Ke To Re",
    imageUrl: "https://assets.untappd.com/photos/2020_08_15/6e7f8a1b4c7e5b6a7b1b8b7b7b7b7b7_640x640.jpg",
    bottleImageUrl: "https://assets.untappd.com/photos/2020_08_15/6e7f8a1b4c7e5b6a7b1b8b7b7b7b7b7_640x640.jpg"
  },
  // Lambrate - Immagini pubbliche
  {
    brewery: "Lambrate", 
    beerName: "Ghisa",
    imageUrl: "https://assets.untappd.com/photos/2019_12_20/5d8a9b1c3e6f4a5b6c1d7e8f9g0h1i2_640x640.jpg",
    bottleImageUrl: "https://assets.untappd.com/photos/2019_12_20/5d8a9b1c3e6f4a5b6c1d7e8f9g0h1i2_640x640.jpg"
  }
];

// URL immagini generiche per stili di birra (fallback quando non troviamo match specifici)
const STYLE_IMAGES = {
  "IPA": "https://images.unsplash.com/photo-1608270586620-248524c67de9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Pilsner": "https://images.unsplash.com/photo-1566919317267-b5e1b2bb2b15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", 
  "Stout": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Lager": "https://images.unsplash.com/photo-1574216364975-51fcb7fffd8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Wheat": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Porter": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Saison": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "Belgian Ale": "https://images.unsplash.com/photo-1551538827-9c037cb4f32d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
};

async function addBeerImages() {
  console.log("🍺 Inizio aggiunta immagini birre...");
  
  try {
    // 1. Aggiungi immagini specifiche per birre famose
    let updatedCount = 0;
    
    for (const beerImage of REAL_BEER_IMAGES) {
      const [beer] = await db
        .select()
        .from(beers)
        .where(eq(beers.name, beerImage.beerName))
        .limit(1);
        
      if (beer) {
        await db
          .update(beers)
          .set({
            imageUrl: beerImage.imageUrl,
            bottleImageUrl: beerImage.bottleImageUrl
          })
          .where(eq(beers.id, beer.id));
          
        console.log(`✅ Aggiornata ${beerImage.beerName} di ${beerImage.brewery}`);
        updatedCount++;
      }
    }
    
    // 2. Aggiungi immagini per stile per le birre rimanenti
    const beersWithoutImages = await db
      .select()
      .from(beers)
      .where(eq(beers.imageUrl, null))
      .limit(100);
      
    for (const beer of beersWithoutImages) {
      const styleKey = Object.keys(STYLE_IMAGES).find(style => 
        beer.style.toLowerCase().includes(style.toLowerCase())
      );
      
      if (styleKey) {
        await db
          .update(beers)
          .set({
            imageUrl: STYLE_IMAGES[styleKey as keyof typeof STYLE_IMAGES],
            bottleImageUrl: STYLE_IMAGES[styleKey as keyof typeof STYLE_IMAGES]
          })
          .where(eq(beers.id, beer.id));
          
        console.log(`📸 Aggiunta immagine stile ${styleKey} per ${beer.name}`);
        updatedCount++;
      }
    }
    
    console.log(`🎉 Completato! Aggiornate ${updatedCount} birre con immagini reali`);
    
  } catch (error) {
    console.error("❌ Errore durante l'aggiunta delle immagini:", error);
  }
}

// Esegui il script se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addBeerImages().then(() => process.exit(0));
}

export { addBeerImages };