import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupJWTAuth, authenticateJWT, memoryStorage } from "./jwtAuth";
import { registerAdminRoutes } from "./routes-admin";
import { sql, eq } from "drizzle-orm";
import { upload, uploadImage, cloudinary } from "./cloudinary";
import { db } from "./db";
import { breweries, beers, pubs, users, tapList } from "@shared/schema";

import { insertPubSchema, insertTapListSchema, insertBottleListSchema, insertMenuCategorySchema, insertMenuItemSchema, pubRegistrationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup alternative JWT auth (for when database is disabled)
  setupJWTAuth(app);
  
  // Try to setup traditional auth, but continue if it fails
  try {
    await setupAuth(app);
  } catch (error) {
    console.warn("Database authentication unavailable, using JWT fallback:", error.message);
  }

  // Register admin routes
  registerAdminRoutes(app);

  // Auth routes - with fallback system
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // First try JWT authentication
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = require('./jwtAuth').verifyToken(token);
        if (decoded) {
          const user = await storage.getUser(decoded.userId);
          if (user) {
            return res.json(user);
          }
        }
      }
      
      // Fallback to traditional auth if available
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(401).json({ message: "Unauthorized" });
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

  // Get all pubs for explore page
  app.get("/api/pubs/all", async (req, res) => {
    try {
      const pubs = await storage.getPubs();
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching all pubs:", error);
      res.status(500).json({ message: "Failed to fetch all pubs" });
    }
  });

  // Get all breweries for explore page
  app.get("/api/breweries/all", async (req, res) => {
    try {
      const breweries = await storage.getBreweries();
      
      // Add beer count for each brewery
      const breweriesWithCount = await Promise.all(
        breweries.map(async (brewery: any) => {
          const beerCount = await storage.getBeersByBrewery(brewery.id);
          return { ...brewery, beerCount: beerCount.length };
        })
      );
      
      res.json(breweriesWithCount);
    } catch (error) {
      console.error("Error fetching all breweries:", error);
      res.status(500).json({ message: "Failed to fetch all breweries" });
    }
  });

  // Get unique beer styles for dropdown (must be before beers/:id)
  app.get("/api/beers/styles", async (req, res) => {
    try {
      const beers = await storage.getBeers();
      const uniqueStyles = [...new Set(beers.map(beer => beer.style).filter(Boolean))];
      const styles = uniqueStyles.map(style => ({ style }));
      res.json(styles);
    } catch (error) {
      console.error("Error fetching beer styles:", error);
      res.status(500).json({ message: "Failed to fetch beer styles" });
    }
  });

  // Get beer details by ID
  app.get("/api/beers/:id", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeerWithBrewery(beerId);
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
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pub ID" });
      }
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
      if (isNaN(pubId)) {
        return res.status(400).json({ message: "Invalid pub ID" });
      }

      // Check if user is the pub owner (authenticated endpoint)
      let isOwner = false;
      try {
        if (req.user?.claims?.sub) {
          const userId = req.user.claims.sub;
          const userPubs = await storage.getPubsByOwner(userId);
          isOwner = userPubs.some(pub => pub.id === pubId);
        }
      } catch (e) {
        // Not authenticated or other error, treat as public
      }

      // Use appropriate method based on ownership
      const tapList = isOwner 
        ? await storage.getTapListByPubForOwner(pubId)
        : await storage.getTapList(pubId);
      
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
      const bottleList = await storage.getBottleList(pubId);
      res.json(bottleList);
    } catch (error) {
      console.error("Error fetching bottle list:", error);
      res.status(500).json({ message: "Failed to fetch bottle list" });
    }
  });

  // Get all breweries
  app.get("/api/breweries", async (req, res) => {
    try {
      const random = req.query.random === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      let breweries;
      if (random) {
        breweries = await storage.getRandomBreweries(limit || 4);
      } else {
        breweries = await storage.getBreweries();
      }
      
      // Add beer count for each brewery
      const breweriesWithCount = await Promise.all(
        breweries.map(async (brewery: any) => {
          const beers = await storage.getBeersByBrewery(brewery.id);
          return { ...brewery, beerCount: beers.length };
        })
      );
      
      res.json(breweriesWithCount);
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
      try {
        const scraper = await import("./global-beer-scraper");
        const scrapingFunc = (scraper as any).globalBeerScraping || (scraper as any).default;
        
        // Run scraping in background
        if (scrapingFunc) {
          scrapingFunc()
            .then(() => console.log("✅ Global beer scraping completed"))
            .catch((err: any) => console.error("❌ Scraping error:", err));
        }
      } catch (err) {
        console.log("Scraper not available");
      }

      res.json({ 
        message: "Global beer scraping started in background",
        status: "processing"
      });
    } catch (error) {
      console.error("Error starting scraping:", error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  // Admin route for unifying duplicate breweries
  app.post("/api/admin/unify-breweries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Import the unification function dynamically
      const { unifyBreweries } = await import("./unify-breweries");
      
      // Run unification in background
      unifyBreweries()
        .then(() => console.log("✅ Brewery unification completed"))
        .catch((err: any) => console.error("❌ Unification error:", err));

      res.json({ 
        message: "Brewery unification started in background",
        status: "processing"
      });
    } catch (error) {
      console.error("Error starting unification:", error);
      res.status(500).json({ message: "Failed to start unification" });
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


  // Update tap list item (pub owner only)
  app.patch('/api/pubs/:pubId/taplist/:id', isAuthenticated, async (req, res) => {
    try {
      const { pubId, id } = req.params;
      const data = req.body;
      
      console.log('PATCH taplist item:', { pubId, id, data });
      
      const item = await storage.updateTapListItem(parseInt(id), data);
      console.log('Updated taplist item:', item);
      res.json(item);
    } catch (error) {
      console.error('Error updating tap list item:', error);
      res.status(500).json({ message: 'Failed to update tap list item' });
    }
  });

  // Delete tap list item (pub owner only)
  app.delete('/api/pubs/:pubId/taplist/:id', isAuthenticated, async (req, res) => {
    try {
      const { pubId, id } = req.params;
      
      console.log('DELETE taplist item:', { pubId, id });
      
      await storage.removeFromTapList(parseInt(id));
      console.log('Deleted taplist item:', id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting tap list item:', error);
      res.status(500).json({ message: 'Failed to delete tap list item' });
    }
  });

  // Update pub (owner or admin)
  app.patch("/api/pubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub or is admin
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
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

  // Add beer to tap (pub owner or admin)
  app.post("/api/pubs/:id/taplist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub or is admin
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      }

      const tapData = insertTapListSchema.parse({ ...req.body, pubId });
      const tapItem = await storage.addToTapList(tapData);
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
      const updatedTap = await storage.updateTapListItem(tapId, tapData);
      res.json(updatedTap);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating tap item:", error);
      res.status(500).json({ message: "Failed to update tap item" });
    }
  });

  // Remove beer from tap (pub owner only) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by DELETE /api/pubs/:pubId/taplist/:id

  // Add beer to bottle list (pub owner or admin)
  app.post("/api/pubs/:pubId/bottles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const isAdmin = user && (user.userType === 'admin' || user.activeRole === 'admin');
      if (!existingPub || (!isAdmin && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's bottle list" });
      }

      // Map component fields to database fields
      const { price, size, vintage, ...otherData } = req.body;
      const bottleData = insertBottleListSchema.parse({ 
        ...otherData, 
        pubId,
        priceBottle: price,    // Map price -> priceBottle 
        bottleSize: size || "33cl",  // Map size -> bottleSize
        description: vintage ? `${otherData.description || ""}\nAnnata: ${vintage}`.trim() : otherData.description
      });
      
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

  // Update bottle item (only pub owner) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by PATCH /api/pubs/:pubId/bottles/:id
  
  // Remove beer from bottle list (only pub owner) - REMOVED DUPLICATE ROUTE
  // This functionality is handled by DELETE /api/pubs/:pubId/bottles/:id

  // Update bottle list item (pub owner or admin)
  app.patch('/api/pubs/:pubId/bottles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { pubId, id } = req.params;
      const userId = req.user?.claims?.sub;
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(parseInt(pubId));
      const isAdmin = user && (user.userType === 'admin' || user.activeRole === 'admin');
      if (!existingPub || (!isAdmin && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's bottle list" });
      }
      
      // Map component fields to database fields
      const { price, size, vintage, ...otherData } = req.body;
      
      const updateData: any = { ...otherData };
      
      // Map fields if they exist in the request
      if (price !== undefined) updateData.priceBottle = price;
      if (size !== undefined) updateData.bottleSize = size;
      if (vintage !== undefined) {
        // Handle vintage in description
        const currentDescription = otherData.description || "";
        updateData.description = vintage ? `${currentDescription}\nAnnata: ${vintage}`.trim() : currentDescription;
      }
      
      console.log('PATCH bottle item:', { pubId, id, originalData: req.body, mappedData: updateData });
      
      const item = await storage.updateBottleItem(parseInt(id), updateData);
      console.log('Updated bottle item:', item);
      res.json(item);
    } catch (error) {
      console.error('Error updating bottle item:', error);
      res.status(500).json({ message: 'Failed to update bottle item' });
    }
  });

  // Delete bottle list item (pub owner only)
  app.delete('/api/pubs/:pubId/bottles/:id', isAuthenticated, async (req, res) => {
    try {
      const { pubId, id } = req.params;
      
      console.log('DELETE bottle item:', { pubId, id });
      
      await storage.removeBottleItem(parseInt(id));
      console.log('Deleted bottle item:', id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting bottle item:', error);
      res.status(500).json({ message: 'Failed to delete bottle item' });
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

  // Update menu category (only pub owner)
  app.patch("/api/pubs/:pubId/menu-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      const categoryId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Verify the category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu category does not belong to your pub" });
      }

      const updates = insertMenuCategorySchema.omit({ pubId: true, id: true }).partial().parse(req.body);
      const updatedCategory = await storage.updateMenuCategory(categoryId, updates);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating menu category:", error);
      res.status(500).json({ message: "Failed to update menu category" });
    }
  });

  // Delete menu category (only pub owner)
  app.delete("/api/pubs/:pubId/menu-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      const categoryId = parseInt(req.params.id);
      
      // Check if user owns the pub
      const existingPub = await storage.getPub(pubId);
      if (!existingPub || existingPub.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Verify the category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu category does not belong to your pub" });
      }

      await storage.deleteMenuCategory(categoryId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu category:", error);
      res.status(500).json({ message: "Failed to delete menu category" });
    }
  });

  // Get menu items for a category (public)
  app.get("/api/pubs/:pubId/menu/categories/:categoryId/items", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const items = await storage.getMenuItems(categoryId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Create menu item (pub owner or admin) - Updated to match frontend expectations and add pub ownership validation
  app.post("/api/pubs/:id/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const isAdmin = user && (user.userType === 'admin' || user.activeRole === 'admin');
      if (!existingPub || (!isAdmin && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Validate that the category belongs to the pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === req.body.categoryId);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category does not belong to this pub" });
      }

      const itemData = insertMenuItemSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({ ...req.body, categoryId: req.body.categoryId });
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

  // Legacy endpoint - keep for backward compatibility
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

  // Update menu item (pub owner or admin)
  app.patch("/api/pubs/:pubId/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const isAdmin = user && (user.userType === 'admin' || user.activeRole === 'admin');
      if (!existingPub || (!isAdmin && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Get the item to verify it belongs to this pub through its category
      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Verify the item's category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === item.categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu item does not belong to your pub" });
      }

      const updates = insertMenuItemSchema.omit({ id: true, categoryId: true, createdAt: true, updatedAt: true }).partial().parse(req.body);
      const updatedItem = await storage.updateMenuItem(itemId, updates);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // Delete menu item (only pub owner)
  app.delete("/api/pubs/:pubId/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const isAdmin = user && (user.userType === 'admin' || user.activeRole === 'admin');
      if (!existingPub || (!isAdmin && existingPub.ownerId !== userId)) {
        return res.status(403).json({ message: "Not authorized to modify this pub's menu" });
      }

      // Get the item to verify it belongs to this pub through its category
      const item = await storage.getMenuItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Verify the item's category belongs to this pub
      const categories = await storage.getMenuCategories(pubId);
      const categoryExists = categories.some(cat => cat.id === item.categoryId);
      if (!categoryExists) {
        return res.status(403).json({ message: "This menu item does not belong to your pub" });
      }

      await storage.deleteMenuItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user nickname
  app.patch('/api/user/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { nickname } = req.body;

      if (!nickname || nickname.trim().length < 2) {
        return res.status(400).json({ message: "Il nickname deve contenere almeno 2 caratteri" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if 15 days have passed since last nickname update
      if (user.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          return res.status(400).json({ 
            message: `Puoi cambiare il nickname solo ogni 15 giorni. Riprova tra ${Math.ceil(15 - daysDiff)} giorni.` 
          });
        }
      }

      const updatedUser = await storage.updateUser(userId, {
        nickname: nickname.trim(),
        lastNicknameUpdate: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Failed to update nickname" });
    }
  });

  // Universal Favorites routes
  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/:itemType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer';
      if (!['pub', 'brewery', 'beer'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      const favorites = await storage.getFavoritesByType(userId, itemType);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites by type:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemType, itemId } = req.body;
      
      if (!['pub', 'brewery', 'beer'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const favorite = await storage.addFavorite({ userId, itemType, itemId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:itemType/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      await storage.removeFavorite(userId, itemType, itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Delete favorite by ID (used by UserFavoritesSection)
  app.delete("/api/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteId = parseInt(req.params.id);
      
      await storage.removeFavoriteById(userId, favoriteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite by ID:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Delete favorite by ID (used by UserFavoritesSection)
  app.delete("/api/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteId = parseInt(req.params.id);
      
      await storage.removeFavoriteById(userId, favoriteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite by ID:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Reorder menu categories 
  app.patch("/api/pubs/:id/menu/categories/:categoryId/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const pubs = await storage.getPubsByOwner(userId);
      const pub = pubs.length > 0 ? pubs[0] : null;
      if (!pub || pub.id !== pubId) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(req.params.categoryId);
      const { newOrderIndex } = req.body;
      
      const category = await storage.updateMenuCategory(categoryId, { orderIndex: newOrderIndex });
      res.json(category);
    } catch (error) {
      console.error("Error reordering menu category:", error);
      res.status(500).json({ message: "Failed to reorder menu category" });
    }
  });

  app.get("/api/favorites/:itemType/:itemId/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const isFavorite = await storage.isFavorite(userId, itemType, itemId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // Get favorites count for any item (public endpoint)
  app.get("/api/favorites/:itemType/:itemId/count", async (req, res) => {
    try {
      const itemType = req.params.itemType as 'pub' | 'brewery' | 'beer';
      const itemId = parseInt(req.params.itemId);
      
      if (!['pub', 'brewery', 'beer'].includes(itemType)) {
        return res.status(400).json({ message: "Invalid item type" });
      }
      
      const count = await storage.getFavoritesCount(itemType, itemId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching favorites count:", error);
      res.status(500).json({ message: "Failed to fetch favorites count" });
    }
  });

  // User profile and activities routes
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update nickname with 15-day restriction
  app.patch('/api/user/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { nickname } = req.body;
      
      if (!nickname || nickname.trim().length === 0) {
        return res.status(400).json({ message: "Nickname è obbligatorio" });
      }
      
      if (nickname.length > 50) {
        return res.status(400).json({ message: "Il nickname deve essere massimo 50 caratteri" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      // Check if 15 days have passed since last update
      if (user.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          const daysRemaining = Math.ceil(15 - daysDiff);
          return res.status(400).json({ 
            message: `Puoi modificare il nickname tra ${daysRemaining} giorni` 
          });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        nickname: nickname.trim(),
        lastNicknameUpdate: new Date(),
        updatedAt: new Date()
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Errore aggiornamento nickname" });
    }
  });

  // Change user password
  app.patch("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Password attuale e nuova password sono richieste" 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: "La nuova password deve essere di almeno 6 caratteri" 
        });
      }

      // In a real implementation, you'd verify the current password here
      // For now, we'll skip current password verification since we don't store passwords
      // (using external auth provider)
      
      // Since we're using Replit Auth, password changes should be handled
      // through the auth provider. For now, return success message.
      res.json({ 
        message: "Per cambiare la password, vai alle impostazioni del tuo account Replit" 
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Errore cambio password" });
    }
  });

  // Upload profile image
  app.post('/api/user/upload-profile-image', isAuthenticated, (req: any, res, next) => {
    console.log('Request received:', req.method, req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body type:', typeof req.body);
    
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: "Errore durante l'upload: " + err.message });
      }
      
      console.log('After multer - req.file:', !!req.file);
      if (req.file) {
        console.log('File details:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferLength: req.file.buffer?.length
        });
      }
      
      next();
    });
  }, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nessuna immagine caricata" });
      }

      const imageUrl = await uploadImage(
        req.file.buffer,
        'profile-images',
        `user-${req.user.claims.sub}-${Date.now()}`
      );

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Errore upload immagine" });
    }
  });

  app.get('/api/user-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get user beer tastings
  app.get('/api/user/beer-tastings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tastings = await storage.getUserBeerTastings(userId);
      res.json(tastings);
    } catch (error) {
      console.error("Error fetching beer tastings:", error);
      res.status(500).json({ message: "Failed to fetch beer tastings" });
    }
  });

  // Update beer tasting
  app.patch('/api/user/beer-tastings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tastingId = parseInt(req.params.id);
      const { personalNotes, rating } = req.body;

      const updatedTasting = await storage.updateBeerTasting(tastingId, userId, { 
        personalNotes, 
        rating 
      });
      res.json(updatedTasting);
    } catch (error) {
      console.error("Error updating beer tasting:", error);
      res.status(500).json({ message: "Failed to update beer tasting" });
    }
  });

  // Admin-only middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      return res.status(500).json({ message: "Error verifying admin status" });
    }
  };

  // Helper function to check if user is admin or pub owner
  const isAdminOrPubOwner = async (userId: string, pubId: number): Promise<boolean> => {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;
      
      // Check if user is admin
      if (user.userType === 'admin' || user.active_role === 'admin' || (user.roles && user.roles.includes('admin'))) {
        return true;
      }
      
      // Check if user owns the pub
      const pubs = await storage.getPubsByOwner(userId);
      return pubs.some(pub => pub.id === pubId);
    } catch (error) {
      console.error("Error checking admin/owner status:", error);
      return false;
    }
  };

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = {
        totalUsers: await storage.getUserCount(),
        totalPubs: await storage.getPubCount(),
        totalBreweries: await storage.getBreweryCount(),
        totalBeers: await storage.getBeerCount(),
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/pubs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubs = await storage.getAllPubs();
      res.json(pubs);
    } catch (error) {
      console.error("Error fetching all pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  app.get('/api/admin/breweries', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweries = await storage.getAllBreweries();
      res.json(breweries);
    } catch (error) {
      console.error("Error fetching all breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });

  app.get('/api/admin/beers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beers = await storage.getAllBeers();
      res.json(beers);
    } catch (error) {
      console.error("Error fetching all beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  app.patch('/api/admin/beers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const updates = req.body;
      const beer = await storage.updateBeer(beerId, updates);
      res.json(beer);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  app.patch('/api/admin/breweries/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const updates = req.body;
      const brewery = await storage.updateBrewery(breweryId, updates);
      res.json(brewery);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  app.get('/api/admin/reviews/pending', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Mock pending reviews for now
      const pendingReviews: any[] = [];
      res.json(pendingReviews);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      res.status(500).json({ message: "Failed to fetch pending reviews" });
    }
  });

  app.post('/api/admin/reviews/:id/:action', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const action = req.params.action;
      // Mock review action for now
      res.json({ success: true, action });
    } catch (error) {
      console.error("Error processing review:", error);
      res.status(500).json({ message: "Failed to process review" });
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



  // Get global beer statistics
  app.get('/api/stats/global', async (req, res) => {
    try {
      // Total counts
      const totalBeers = await db.select().from(beers);
      const totalBreweries = await db.select().from(breweries);
      
      // Unique styles
      const uniqueStyles = await db
        .selectDistinct({ style: beers.style })
        .from(beers);
      
      // Top beer styles
      const topStyles = await db
        .select({
          style: beers.style,
          count: sql<number>`count(*)`
        })
        .from(beers)
        .groupBy(beers.style)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      // Breweries with most beers
      const topBreweries = await db
        .select({
          breweryName: breweries.name,
          location: breweries.location,
          beerCount: sql<number>`count(${beers.id})`
        })
        .from(breweries)
        .leftJoin(beers, eq(breweries.id, beers.breweryId))
        .groupBy(breweries.id, breweries.name, breweries.location)
        .orderBy(sql`count(${beers.id}) desc`)
        .limit(10);

      res.json({
        totalBeers: totalBeers.length,
        totalBreweries: totalBreweries.length,
        uniqueStyles: uniqueStyles.length,
        topStyles: topStyles,
        topBreweries: topBreweries,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
      res.status(500).json({ message: "Failed to fetch global statistics" });
    }
  });

  // Flexible pricing system endpoints (owner or admin)
  app.post("/api/pubs/:id/taplist/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const { prices } = req.body;
      
      // Convert prices array to object for JSON storage
      const priceObject = prices.reduce((acc: any, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});

      const updatedItem = await storage.updateTapListItem(itemId, { prices: priceObject });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating tap item prices:", error);
      res.status(500).json({ message: "Failed to update tap item prices" });
    }
  });

  // Beer replacement endpoints (owner or admin)
  app.patch("/api/pubs/:id/taplist/:itemId/replace", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const { newBeerId } = req.body;
      
      const updatedItem = await storage.updateTapListItem(itemId, { beerId: newBeerId });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error replacing beer:", error);
      res.status(500).json({ message: "Failed to replace beer" });
    }
  });

  // Same for bottles (owner or admin)
  app.post("/api/pubs/:id/bottles/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const { prices } = req.body;
      
      const priceObject = prices.reduce((acc: any, p: any) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});

      const updatedItem = await storage.updateBottleItem(itemId, { prices: priceObject });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating bottle item prices:", error);
      res.status(500).json({ message: "Failed to update bottle item prices" });
    }
  });

  app.patch("/api/pubs/:id/bottles/:itemId/replace", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const { newBeerId } = req.body;
      
      const updatedItem = await storage.updateBottleItem(itemId, { beerId: newBeerId });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error replacing bottle beer:", error);
      res.status(500).json({ message: "Failed to replace bottle beer" });
    }
  });

  // Menu categories CRUD endpoints (owner or admin)
  app.post("/api/pubs/:id/menu/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const category = await storage.createMenuCategory({ ...req.body, pubId });
      res.json(category);
    } catch (error) {
      console.error("Error creating menu category:", error);
      res.status(500).json({ message: "Failed to create menu category" });
    }
  });

  app.patch("/api/pubs/:id/menu/categories/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(req.params.categoryId);
      const category = await storage.updateMenuCategory(categoryId, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating menu category:", error);
      res.status(500).json({ message: "Failed to update menu category" });
    }
  });

  app.delete("/api/pubs/:id/menu/categories/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(req.params.categoryId);
      await storage.deleteMenuCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu category:", error);
      res.status(500).json({ message: "Failed to delete menu category" });
    }
  });

  // Menu items CRUD endpoints (owner or admin)
  app.post("/api/pubs/:id/menu/categories/:categoryId/items", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const categoryId = parseInt(req.params.categoryId);
      const item = await storage.createMenuItem(categoryId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.patch("/api/pubs/:id/menu/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const item = await storage.updateMenuItem(itemId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/pubs/:id/menu/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      await storage.deleteMenuItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // User beer tastings endpoints
  app.get("/api/user/beer-tastings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tastings = await storage.getUserBeerTastings(userId);
      res.json(tastings);
    } catch (error) {
      console.error("Error fetching user beer tastings:", error);
      res.status(500).json({ message: "Failed to fetch beer tastings" });
    }
  });

  app.post("/api/user/beer-tastings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tastingData = { ...req.body, userId };
      const tasting = await storage.addBeerTasting(tastingData);
      res.status(201).json(tasting);
    } catch (error) {
      console.error("Error adding beer tasting:", error);
      res.status(500).json({ message: "Failed to add beer tasting" });
    }
  });

  app.patch("/api/user/beer-tastings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tastingId = parseInt(req.params.id);
      const updated = await storage.updateBeerTasting(tastingId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating beer tasting:", error);
      res.status(500).json({ message: "Failed to update beer tasting" });
    }
  });

  app.delete("/api/user/beer-tastings/:beerId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const beerId = parseInt(req.params.beerId);
      await storage.removeBeerTasting(userId, beerId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error removing beer tasting:", error);
      res.status(500).json({ message: "Failed to remove beer tasting" });
    }
  });

  // User profile update endpoint
  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = req.body;
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });



  // Get user's available roles
  app.get("/api/auth/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rolesData = await storage.getUserRoles(userId);
      res.json(rolesData);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Switch user's active role
  app.post("/api/auth/switch-role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const validRoles = ["customer", "pub_owner", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.switchUserRole(userId, role);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error switching user role:", error);
      if (error.message === "User does not have permission for this role") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  // Update nickname (with 15-day limit)
  app.patch("/api/auth/user/nickname", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { nickname } = req.body;
      
      const user = await storage.getUser(userId);
      if (user?.lastNicknameUpdate) {
        const lastUpdate = new Date(user.lastNicknameUpdate);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 15) {
          return res.status(400).json({ 
            message: `Puoi cambiare il nickname tra ${Math.ceil(15 - daysDiff)} giorni` 
          });
        }
      }
      
      const updatedUser = await storage.updateUserNickname(userId, nickname);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating nickname:", error);
      res.status(500).json({ message: "Failed to update nickname" });
    }
  });

  // Get user's tasting for specific beer
  app.get("/api/beers/:beerId/user-tasting", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const beerId = parseInt(req.params.beerId);
      const tasting = await storage.getUserBeerTasting(userId, beerId);
      res.json(tasting);
    } catch (error) {
      console.error("Error fetching user beer tasting:", error);
      res.status(500).json({ message: "Failed to fetch user beer tasting" });
    }
  });

  // Update user email
  app.patch("/api/user/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;

      // Validate email
      if (!email || email.trim().length === 0) {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user can update email (15-day restriction)
      const user = await storage.getUser(userId);
      if (user?.emailLastUpdated) {
        const lastUpdate = new Date(user.emailLastUpdated);
        const now = new Date();
        const diffInDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
        
        if (diffInDays < 15) {
          return res.status(400).json({ 
            message: `You can only update your email every 15 days. Try again in ${15 - diffInDays} days.` 
          });
        }
      }

      const updatedUser = await storage.updateUser(userId, { 
        email: email.trim(),
        emailLastUpdated: new Date()
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  // Delete user account
  app.delete("/api/user/delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      await storage.deleteUser(userId);
      
      // Destroy session
      req.logout(() => {
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });

  // Search beers for admin (global search)
  app.get("/api/admin/beers/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: query = '', limit = 100 } = req.query;
      const allBeers = await storage.getBeers();
      const beers = allBeers.filter(beer => 
        beer.name.toLowerCase().includes(query.toString().toLowerCase()) ||
        beer.style?.toLowerCase().includes(query.toString().toLowerCase())
      ).slice(0, parseInt(limit.toString()) || 100);
      res.json(beers);
    } catch (error) {
      console.error("Error searching beers:", error);
      res.status(500).json({ message: "Failed to search beers" });
    }
  });

  // Search breweries for admin (global search)
  app.get("/api/admin/breweries/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: query = '', limit = 100 } = req.query;
      const allBreweries = await storage.getBreweries();
      const breweries = allBreweries.filter(brewery => 
        brewery.name.toLowerCase().includes(query.toString().toLowerCase()) ||
        brewery.location?.toLowerCase().includes(query.toString().toLowerCase())
      ).slice(0, parseInt(limit.toString()) || 100);
      res.json(breweries);
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  // Create new beer (admin)
  app.post("/api/admin/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const beer = await storage.createBeer(req.body);
      res.json(beer);
    } catch (error) {
      console.error("Error creating beer:", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  // Create new brewery (admin)
  app.post("/api/admin/breweries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const brewery = await storage.createBrewery(req.body);
      res.json(brewery);
    } catch (error) {
      console.error("Error creating brewery:", error);
      res.status(500).json({ message: "Failed to create brewery" });
    }
  });

  // Get all allergens
  app.get("/api/allergens", async (req, res) => {
    try {
      const allergens = await storage.getAllergens();
      res.json(allergens);
    } catch (error) {
      console.error("Error fetching allergens:", error);
      res.status(500).json({ message: "Failed to fetch allergens" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
