import { db } from "./db";
import { pubs, tapList, bottleList, menuCategories, menuItems, beers, breweries } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDemoData() {
  try {
    console.log("Seeding demo data...");

    // Seed demo pubs with realistic Italian data
    const demoPubs = [
      {
        id: 1,
        name: "The Hop Garden",
        address: "Via Roma 15",
        city: "Milano",
        region: "Lombardia",
        postalCode: "20121",
        description: "Birreria artigianale nel cuore di Milano con oltre 20 spine e 100 birre in bottiglia. Cucina tradizionale lombarda rivisitata.",
        phone: "+39 02 1234567",
        email: "info@thehopgarden.it",
        websiteUrl: "https://thehopgarden.it",
        logoUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&h=200&fit=crop",
        imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=400&fit=crop",
        latitude: 45.4642,
        longitude: 9.1900,
        ownerId: "demo-owner-1",
        facebookUrl: "https://facebook.com/thehopgarden",
        instagramUrl: "https://instagram.com/thehopgarden_milano",
      },
      {
        id: 2,
        name: "Birrificio del Borgo",
        address: "Piazza Navona 42",
        city: "Roma",
        region: "Lazio",
        postalCode: "00186",
        description: "Storico locale romano specializzato in birre artigianali italiane e internazionali. Menu tipico laziale con supplì e carbonara.",
        phone: "+39 06 9876543",
        email: "info@birrificiodelborgo.roma",
        websiteUrl: "https://birrificiodelborgo.it",
        logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
        imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=400&fit=crop",
        latitude: 41.9028,
        longitude: 12.4964,
        ownerId: "demo-owner-2",
        instagramUrl: "https://instagram.com/birrificiodelborgo_roma",
        twitterUrl: "https://twitter.com/birrificioborgo",
      },
      {
        id: 3,
        name: "Malto & Luppolo",
        address: "Corso Francia 128",
        city: "Torino",
        region: "Piemonte",
        postalCode: "10143",
        description: "Birreria torinese con focus su birre piemontesi e cucina del territorio. Ampia selezione di birre da microbirrifici locali.",
        phone: "+39 011 5551234",
        email: "info@maltoluppolo.to",
        logoUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&h=200&fit=crop",
        imageUrl: "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&h=400&fit=crop",
        latitude: 45.0703,
        longitude: 7.6869,
        ownerId: "demo-owner-3",
        facebookUrl: "https://facebook.com/maltoluppolo.torino",
      },
      {
        id: 4,
        name: "La Cantina delle Birre",
        address: "Via del Campo 23",
        city: "Firenze",
        region: "Toscana",
        postalCode: "50123",
        description: "Enoteca e birreria fiorentina con oltre 200 etichette. Taglieri toscani e primi piatti della tradizione.",
        phone: "+39 055 2341567",
        email: "info@cantinabirre.fi",
        websiteUrl: "https://cantinabirre.firenze.it",
        logoUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop",
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
        latitude: 43.7696,
        longitude: 11.2558,
        ownerId: "demo-owner-4",
        instagramUrl: "https://instagram.com/cantinabirre_firenze",
      }
    ];

    // Insert demo pubs
    for (const pub of demoPubs) {
      await db.insert(pubs).values(pub).onConflictDoUpdate({
        target: pubs.id,
        set: {
          name: pub.name,
          description: pub.description,
          phone: pub.phone,
          email: pub.email,
          websiteUrl: pub.websiteUrl,
          logoUrl: pub.logoUrl,
          imageUrl: pub.imageUrl,
          facebookUrl: pub.facebookUrl,
          instagramUrl: pub.instagramUrl,
          twitterUrl: pub.twitterUrl,
        }
      });
    }

    // Demo tap list data for each pub
    const demoTapList = [
      // The Hop Garden (Milano) - Pub ID 1
      { pubId: 1, beerId: 1, priceSmall: "4.50", priceMedium: "7.00", priceLarge: "8.50", tapNumber: 1, description: "Fresca e beverina, perfetta per l'aperitivo", isVisible: true },
      { pubId: 1, beerId: 3, priceSmall: "5.00", priceMedium: "7.50", priceLarge: "9.00", tapNumber: 2, description: "IPA luppolata con note agrumate", isVisible: true },
      { pubId: 1, beerId: 5, priceSmall: "4.80", priceMedium: "7.20", priceLarge: "8.80", tapNumber: 3, description: "Weizen tradizionale bavarese", isVisible: true },
      { pubId: 1, beerId: 7, priceSmall: "5.20", priceMedium: "8.00", priceLarge: "9.50", tapNumber: 4, description: "Stout cremosa con note di caffè", isVisible: true },

      // Birrificio del Borgo (Roma) - Pub ID 2  
      { pubId: 2, beerId: 2, priceSmall: "4.20", priceMedium: "6.80", priceLarge: "8.20", tapNumber: 1, description: "Pilsner italiana di eccellenza", isVisible: true },
      { pubId: 2, beerId: 4, priceSmall: "5.50", priceMedium: "8.20", priceLarge: "10.00", tapNumber: 2, description: "APA equilibrata e aromatica", isVisible: true },
      { pubId: 2, beerId: 6, priceSmall: "4.60", priceMedium: "7.00", priceLarge: "8.60", tapNumber: 3, description: "Saison belga dal carattere rustico", isVisible: true },
      { pubId: 2, beerId: 8, priceSmall: "5.80", priceMedium: "8.50", priceLarge: "10.20", tapNumber: 4, description: "Porter robusta dal sapore intenso", isVisible: true },

      // Malto & Luppolo (Torino) - Pub ID 3
      { pubId: 3, beerId: 1, priceSmall: "4.30", priceMedium: "6.90", priceLarge: "8.30", tapNumber: 1, description: "Lager piemontese dal sapore pulito", isVisible: true },
      { pubId: 3, beerId: 9, priceSmall: "5.10", priceMedium: "7.80", priceLarge: "9.30", tapNumber: 2, description: "Amber ale dal maltato intenso", isVisible: true },
      { pubId: 3, beerId: 11, priceSmall: "4.90", priceMedium: "7.40", priceLarge: "8.90", tapNumber: 3, description: "Golden ale leggera e profumata", isVisible: true },

      // La Cantina delle Birre (Firenze) - Pub ID 4
      { pubId: 4, beerId: 10, priceSmall: "5.40", priceMedium: "8.10", priceLarge: "9.80", tapNumber: 1, description: "Barley Wine invecchiata 12 mesi", isVisible: true },
      { pubId: 4, beerId: 12, priceSmall: "4.70", priceMedium: "7.10", priceLarge: "8.70", tapNumber: 2, description: "Brown ale inglese dal sapore morbido", isVisible: true },
      { pubId: 4, beerId: 2, priceSmall: "4.40", priceMedium: "7.00", priceLarge: "8.40", tapNumber: 3, description: "Pilsner classica sempre disponibile", isVisible: true },
    ];

    // Insert demo tap list
    for (const tap of demoTapList) {
      await db.insert(tapList).values(tap).onConflictDoNothing();
    }

    // Demo bottle list data
    const demoBottleList = [
      // The Hop Garden (Milano)
      { pubId: 1, beerId: 13, priceBottle: "12.50", bottleSize: "0.33L", quantity: 24, description: "Tripel belga di alta fermentazione", isVisible: true },
      { pubId: 1, beerId: 14, priceBottle: "15.80", bottleSize: "0.5L", quantity: 12, description: "Imperial Stout aged in bourbon barrels", isVisible: true },
      { pubId: 1, beerId: 15, priceBottle: "9.90", bottleSize: "0.33L", quantity: 36, description: "Wit belga con coriandolo e scorza d'arancia", isVisible: true },

      // Birrificio del Borgo (Roma)
      { pubId: 2, beerId: 16, priceBottle: "11.20", bottleSize: "0.33L", quantity: 18, description: "Lambic tradizionale belga", isVisible: true },
      { pubId: 2, beerId: 17, priceBottle: "13.70", bottleSize: "0.375L", quantity: 15, description: "Quadrupel monastica belga", isVisible: true },
      { pubId: 2, beerId: 18, priceBottle: "8.60", bottleSize: "0.33L", quantity: 30, description: "Kölsch tedesca leggera e rinfrescante", isVisible: true },

      // Malto & Luppolo (Torino)  
      { pubId: 3, beerId: 19, priceBottle: "14.90", bottleSize: "0.5L", quantity: 8, description: "Eisbock bavarese dal 12% vol", isVisible: true },
      { pubId: 3, beerId: 20, priceBottle: "10.40", bottleSize: "0.33L", quantity: 20, description: "Märzen oktoberfest tradizionale", isVisible: true },

      // La Cantina delle Birre (Firenze)
      { pubId: 4, beerId: 21, priceBottle: "16.50", bottleSize: "0.375L", quantity: 6, description: "Vintage ale invecchiata 3 anni", isVisible: true },
      { pubId: 4, beerId: 22, priceBottle: "7.80", bottleSize: "0.33L", quantity: 42, description: "Mild ale inglese sessionable", isVisible: true },
    ];

    // Insert demo bottle list
    for (const bottle of demoBottleList) {
      await db.insert(bottleList).values(bottle).onConflictDoNothing();
    }

    // Demo menu categories
    const demoCategories = [
      // The Hop Garden (Milano)
      { pubId: 1, name: "Antipasti", description: "Selezione di antipasti lombardi e internazionali", isVisible: true, orderIndex: 1 },
      { pubId: 1, name: "Primi Piatti", description: "Risotti e pasta fresca della tradizione", isVisible: true, orderIndex: 2 },
      { pubId: 1, name: "Secondi", description: "Carni e pesci accompagnati dalle nostre birre", isVisible: true, orderIndex: 3 },
      { pubId: 1, name: "Dolci", description: "Dolci della casa e abbinamenti birra", isVisible: true, orderIndex: 4 },

      // Birrificio del Borgo (Roma)
      { pubId: 2, name: "Antipasti Romani", description: "Specialità della tradizione capitolina", isVisible: true, orderIndex: 1 },
      { pubId: 2, name: "Primi", description: "Pasta all'uovo e gnocchi fatti in casa", isVisible: true, orderIndex: 2 },
      { pubId: 2, name: "Secondi", description: "Carni alla griglia e piatti tipici laziali", isVisible: true, orderIndex: 3 },

      // Malto & Luppolo (Torino)
      { pubId: 3, name: "Aperitivo", description: "Stuzzichini per l'happy hour torinese", isVisible: true, orderIndex: 1 },
      { pubId: 3, name: "Piatti Piemontesi", description: "Cucina tradizionale del territorio", isVisible: true, orderIndex: 2 },
      { pubId: 3, name: "Formaggi", description: "Selezione di formaggi piemontesi DOP", isVisible: true, orderIndex: 3 },

      // La Cantina delle Birre (Firenze)
      { pubId: 4, name: "Taglieri", description: "Salumi e formaggi toscani selezionati", isVisible: true, orderIndex: 1 },
      { pubId: 4, name: "Zuppe", description: "Zuppe tipiche della tradizione fiorentina", isVisible: true, orderIndex: 2 },
      { pubId: 4, name: "Carne", description: "Bistecche alla fiorentina e arrosti", isVisible: true, orderIndex: 3 },
    ];

    // Insert demo categories and get their IDs
    const insertedCategories = [];
    for (const category of demoCategories) {
      const [inserted] = await db.insert(menuCategories).values(category).onConflictDoNothing().returning();
      if (inserted) insertedCategories.push(inserted);
    }

    // Get existing categories if not inserted
    if (insertedCategories.length === 0) {
      const existing = await db.select().from(menuCategories).where(eq(menuCategories.pubId, 1));
      insertedCategories.push(...existing);
    }

    // Demo menu items with realistic Italian food and allergens
    const demoMenuItems = [
      // The Hop Garden - Antipasti (category 1)
      { categoryId: 1, name: "Tagliere Milanese", description: "Salumi lombardi, gorgonzola DOP, mostarda di Cremona", price: "16.50", allergens: ["Latticini", "Solfiti"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 1, name: "Vitello Tonnato", description: "Fettine di vitello con salsa tonnata e capperi", price: "14.00", allergens: ["Uova", "Pesce"], isVisible: true, isAvailable: true, orderIndex: 2 },
      { categoryId: 1, name: "Bruschette Miste", description: "Trio di bruschette: pomodoro, 'nduja, ricotta e miele", price: "9.50", allergens: ["Glutine", "Latticini"], isVisible: true, isAvailable: true, orderIndex: 3 },

      // The Hop Garden - Primi (category 2)  
      { categoryId: 2, name: "Risotto all'Amarone", description: "Risotto mantecato con Amarone, radicchio e gorgonzola", price: "18.00", allergens: ["Latticini", "Solfiti"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 2, name: "Pasta e Fagioli", description: "Maltagliati con fagioli borlotti e pancetta", price: "13.50", allergens: ["Glutine"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // The Hop Garden - Secondi (category 3)
      { categoryId: 3, name: "Cotoletta alla Milanese", description: "Costoletta di vitello impanata e fritta", price: "24.00", allergens: ["Glutine", "Uova"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 3, name: "Salmone in Crosta", description: "Filetto di salmone in crosta di pistacchi", price: "22.00", allergens: ["Pesce", "Frutta a guscio"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // Birrificio del Borgo - Antipasti Romani (category 5)
      { categoryId: 5, name: "Supplì al Telefono", description: "Classici supplì romani con mozzarella filante", price: "8.50", allergens: ["Glutine", "Latticini", "Uova"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 5, name: "Maritozzi con Mortadella", description: "Pane romano farcito con mortadella e stracciatella", price: "12.00", allergens: ["Glutine", "Latticini"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // Birrificio del Borgo - Primi (category 6)
      { categoryId: 6, name: "Cacio e Pepe", description: "Tonnarelli con pecorino romano e pepe nero", price: "14.00", allergens: ["Glutine", "Latticini"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 6, name: "Carbonara", description: "Spaghetti con guanciale, uova e pecorino", price: "15.50", allergens: ["Glutine", "Uova", "Latticini"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // Malto & Luppolo - Aperitivo (category 8)  
      { categoryId: 8, name: "Acciughe al Verde", description: "Acciughe del Cantabrico con salsa verde piemontese", price: "11.00", allergens: ["Pesce"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 8, name: "Bagna Cauda", description: "Verdure crude con salsa tipica piemontese", price: "13.50", allergens: ["Pesce"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // La Cantina delle Birre - Taglieri (category 11)
      { categoryId: 11, name: "Tagliere del Chianti", description: "Pecorino toscano, salami, miele di acacia", price: "18.50", allergens: ["Latticini"], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 11, name: "Crostini Toscani", description: "Fegatini di pollo su pane toscano tostato", price: "9.00", allergens: ["Glutine"], isVisible: true, isAvailable: true, orderIndex: 2 },

      // La Cantina delle Birre - Carne (category 13)
      { categoryId: 13, name: "Bistecca alla Fiorentina", description: "T-bone di Chianina da 800g, cottura al sangue", price: "45.00", allergens: [], isVisible: true, isAvailable: true, orderIndex: 1 },
      { categoryId: 13, name: "Peposo dell'Impruneta", description: "Spezzatino di manzo al Chianti Classico", price: "19.50", allergens: ["Solfiti"], isVisible: true, isAvailable: true, orderIndex: 2 },
    ];

    // Insert demo menu items
    for (const item of demoMenuItems) {
      await db.insert(menuItems).values(item).onConflictDoNothing();
    }

    console.log("Demo data seeded successfully!");
    return { success: true, message: "Demo data seeded successfully" };

  } catch (error) {
    console.error("Error seeding demo data:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}