import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { upload, uploadImage } from "./cloudinary";

import { insertPubSchema, insertTapListSchema, insertBottleListSchema, insertMenuCategorySchema, insertMenuItemSchema, pubRegistrationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public routes - no authentication required
  
  // Get all pubs
  app.get("/api/pubs", async (req, res) => {
    try {
      const pubs = await storage.getPubs();
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  // Get beer details by ID
  app.get("/api/beers/:id", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer) {
        return res.status(404).json({ message: "Beer not found" });
      }
      res.json(beer);
    } catch (error) {
      console.error("Error fetching beer:", error);
      res.status(500).json({ message: "Failed to fetch beer" });
    }
  });

  // Get where a beer is available (tap and bottle)
  app.get("/api/beers/:id/availability", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const availability = await storage.getBeerAvailability(beerId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching beer availability:", error);
      res.status(500).json({ message: "Failed to fetch beer availability" });
    }
  });

  // Get brewery details by ID
  app.get("/api/breweries/:id", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const brewery = await storage.getBrewery(breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Brewery not found" });
      }
      res.json(brewery);
    } catch (error) {
      console.error("Error fetching brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  // Get all beers from a brewery
  app.get("/api/breweries/:id/beers", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const beers = await storage.getBeersByBrewery(breweryId);
      res.json(beers);
    } catch (error) {
      console.error("Error fetching brewery beers:", error);
      res.status(500).json({ message: "Failed to fetch brewery beers" });
    }
  });

  // Get all beers (public endpoint for browsing catalog)
  app.get("/api/beers", async (req, res) => {
    try {
      const beers = await storage.getBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching all beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  // Get pub by ID
  app.get("/api/pubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pub = await storage.getPub(id);
      if (!pub) {
        return res.status(404).json({ message: "Pub not found" });
      }
      res.json(pub);
    } catch (error) {
      console.error("Error fetching pub:", error);
      res.status(500).json({ message: "Failed to fetch pub" });
    }
  });

  // Get tap list for a pub
  app.get("/api/pubs/:id/taplist", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const tapList = await storage.getTapListByPub(pubId);
      res.json(tapList);
    } catch (error) {
      console.error("Error fetching tap list:", error);
      res.status(500).json({ message: "Failed to fetch tap list" });
    }
  });

  // Get menu for a pub
  app.get("/api/pubs/:id/menu", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const menu = await storage.getMenuByPub(pubId);
      res.json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // Get bottle list (cantina) for a pub
  app.get("/api/pubs/:id/bottles", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const bottleList = await storage.getBottleListByPub(pubId);
      res.json(bottleList);
    } catch (error) {
      console.error("Error fetching bottle list:", error);
      res.status(500).json({ message: "Failed to fetch bottle list" });
    }
  });

  // Get all breweries
  app.get("/api/breweries", async (req, res) => {
    try {
      const breweries = await storage.getBreweries();
      res.json(breweries);
    } catch (error) {
      console.error("Error fetching breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });

  // Get brewery by ID
  app.get("/api/breweries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const brewery = await storage.getBrewery(id);
      if (!brewery) {
        return res.status(404).json({ message: "Brewery not found" });
      }
      res.json(brewery);
    } catch (error) {
      console.error("Error fetching brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  // Get beers by brewery
  app.get("/api/breweries/:id/beers", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const beers = await storage.getBeersByBrewery(breweryId);
      res.json(beers);
    } catch (error) {
      console.error("Error fetching beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  // Beer routes
  app.get('/api/beers', async (req, res) => {
    try {
      const beers = await storage.getBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  app.get('/api/beers/:id', async (req, res) => {
    try {
      const beer = await storage.getBeerWithBrewery(parseInt(req.params.id));
      if (!beer) {
        return res.status(404).json({ message: "Beer not found" });
      }
      res.json(beer);
    } catch (error) {
      console.error("Error fetching beer:", error);
      res.status(500).json({ message: "Failed to fetch beer" });
    }
  });

  app.get('/api/beers/:id/taps', async (req, res) => {
    try {
      const tapLocations = await storage.getBeerTapLocations(parseInt(req.params.id));
      res.json(tapLocations);
    } catch (error) {
      console.error("Error fetching beer tap locations:", error);
      res.status(500).json({ message: "Failed to fetch beer tap locations" });
    }
  });

  // Search endpoints
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const [pubs, breweries, beers] = await Promise.all([
        storage.searchPubs(query),
        storage.searchBreweries(query),
        storage.searchBeers(query),
      ]);

      res.json({ pubs, breweries, beers });
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Database statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const [allPubs, allBreweries, allBeers] = await Promise.all([
        storage.getPubs(),
        storage.getBreweries(),
        storage.getBeers(),
      ]);

      // Calculate statistics
      const stats = {
        totalPubs: allPubs.length,
        totalBreweries: allBreweries.length,
        totalBeers: allBeers.length,
        averageBeersPerBrewery: allBreweries.length > 0 ? Math.round(allBeers.length / allBreweries.length) : 0,
        topBeerStyles: allBeers.reduce((acc: Record<string, number>, beer) => {
          const style = beer.style || "Unknown";
          acc[style] = (acc[style] || 0) + 1;
          return acc;
        }, {}),
        breweryLocations: allBreweries.reduce((acc: Record<string, number>, brewery) => {
          const location = brewery.location || "Unknown";
          acc[location] = (acc[location] || 0) + 1;
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching database stats:", error);
      res.status(500).json({ message: "Failed to fetch database statistics" });
    }
  });

  // Protected routes - authentication required

  // Admin route for global beer scraping
  app.post("/api/admin/scrape-beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Import the scraping function dynamically
      const { globalBeerScraping } = await import("./global-beer-scraper");
      
      // Run scraping in background
      globalBeerScraping()
        .then(() => console.log("✅ Global beer scraping completed"))
        .catch(err => console.error("❌ Scraping error:", err));

      res.json({ 
        message: "Global beer scraping started in background",
        status: "processing"
      });
    } catch (error) {
      console.error("Error starting scraping:", error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  // Register a new pub (one per user)
  app.post("/api/pubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a pub
      const existingPubs = await storage.getPubsByOwner(userId);
      if (existingPubs.length > 0) {
        return res.status(400).json({ message: "Un utente può registrare solo un pub" });
      }
      
      const pubData = pubRegistrationSchema.parse({ ...req.body, ownerId: userId });
      const pub = await storage.createPub(pubData);
      
      // Update user type to pub_owner
      await storage.updateUserType(userId, 'pub_owner');
      
      res.status(201).json(pub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating pub:", error);
      res.status(500).json({ message: "Failed to create pub" });
    }
  });

  // Get pubs owned by current user  
  app.get("/api/my-pubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubs = await storage.getPubsByOwner(userId);
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching user pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  // Update pub (owner only)
  app.patch("/api/pubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this pub" });
      }

      // Include logoUrl and coverImageUrl in update data
      const updateData = {
        ...req.body,
        logoUrl: req.body.logoUrl || null,
        coverImageUrl: req.body.coverImageUrl || null,
      };
      
      const pubData = insertPubSchema.partial().parse(updateData);
      const updatedPub = await storage.updatePub(pubId, pubData);
      res.json(updatedPub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating pub:", error);
      res.status(500).json({ message: "Failed to update pub" });
    }
  });

  // Add beer to tap (pub owner only)
  app.post("/api/pubs/:id/taplist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      }

      const tapData = insertTapListSchema.parse({ ...req.body, pubId });
      const tapItem = await storage.addBeerToTap(tapData);
      res.status(201).json(tapItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding beer to tap:", error);
      res.status(500).json({ message: "Failed to add beer to tap" });
    }
  });

  // Update tap item (pub owner only)
  app.patch("/api/taplist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tapId = parseInt(req.params.id);
      const tapData = insertTapListSchema.partial().parse(req.body);
      const updatedTap = await storage.updateTapItem(tapId, tapData);
      res.json(updatedTap);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating tap item:", error);
      res.status(500).json({ message: "Failed to update tap item" });
    }
  });

  // Remove beer from tap (pub owner only)
  app.delete("/api/taplist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tapId = parseInt(req.params.id);
      await storage.removeBeerFromTap(tapId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing beer from tap:", error);
      res.status(500).json({ message: "Failed to remove beer from tap" });
    }
  });

  // Add beer to bottle list (pub owner only)
  app.post("/api/pubs/:id/bottles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's bottle list" });
      }

      const bottleData = insertBottleListSchema.parse({ ...req.body, pubId });
      const bottleItem = await storage.addBeerToBottles(bottleData);
      res.status(201).json(bottleItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding beer to bottle list:", error);
      res.status(500).json({ message: "Failed to add beer to bottle list" });
    }
  });

  // Update bottle item (only pub owner)
  app.patch("/api/bottles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bottleId = parseInt(req.params.id);
      const bottleData = insertBottleListSchema.partial().parse(req.body);
      const updatedBottle = await storage.updateBottleItem(bottleId, bottleData);
      res.json(updatedBottle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating bottle item:", error);
      res.status(500).json({ message: "Failed to update bottle item" });
    }
  });

  // Remove beer from bottle list (only pub owner)
  app.delete("/api/bottles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bottleId = parseInt(req.params.id);
      await storage.removeBeerFromBottles(bottleId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing beer from bottle list:", error);
      res.status(500).json({ message: "Failed to remove beer from bottle list" });
    }
  });

  // Create menu category (only pub owner)
  app.post("/api/pubs/:id/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      const categoryData = insertMenuCategorySchema.parse({ ...req.body, pubId });
      const category = await storage.createMenuCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating menu category:", error);
      res.status(500).json({ message: "Failed to create menu category" });
    }
  });

  // Create menu item (only pub owner)
  app.post("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const itemData = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavoritesByUser(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pubId } = req.body;
      const favorite = await storage.addFavorite({ userId, pubId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:pubId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      await storage.removeFavorite(userId, pubId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Rating routes
  app.post("/api/ratings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pubId, rating } = req.body;
      const ratingRecord = await storage.addRating({ userId, pubId, rating });
      res.status(201).json(ratingRecord);
    } catch (error) {
      console.error("Error adding rating:", error);
      res.status(500).json({ message: "Failed to add rating" });
    }
  });

  app.get("/api/pubs/:id/ratings", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const ratings = await storage.getRatingsByPub(pubId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  // Image upload routes
  app.post('/api/upload/image', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nessun file fornito' });
      }

      const folder = req.body.folder || 'general';
      const imageUrl = await uploadImage(req.file.buffer, folder);

      res.json({ url: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Errore durante l\'upload dell\'immagine' });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
