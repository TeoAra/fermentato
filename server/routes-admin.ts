import { eq, count, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "./db";
import { beers, breweries, users, pubs } from "@shared/schema";
import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";

export function registerAdminRoutes(app: Express) {
  // User management endpoints
  app.patch('/api/admin/users/:id/suspend', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      
      if (userId === currentUserId) {
        return res.status(400).json({ error: "Non puoi sospendere te stesso" });
      }

      // For now, we'll just return success (in production, implement actual suspension logic)
      res.json({ message: "Utente sospeso con successo", userId });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      
      if (userId === currentUserId) {
        return res.status(400).json({ error: "Non puoi eliminare te stesso" });
      }

      // For now, we'll just return success (in production, implement actual deletion logic)
      res.json({ message: "Utente eliminato con successo", userId });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  app.patch('/api/admin/pubs/:id/verify', isAuthenticated, async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      
      // For now, we'll just return success (in production, implement actual verification logic)
      res.json({ message: "Pub verificato con successo", pubId });
    } catch (error) {
      console.error('Error verifying pub:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });
  
  // Admin user management actions
  app.patch("/api/admin/users/:id/suspend", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = req.params.id;
      // In production this would update a suspended field
      // For now just return success
      res.json({ message: "User suspended successfully", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.patch("/api/admin/users/:id/activate", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = req.params.id;
      res.json({ message: "User activated successfully", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = req.params.id;
      if (userId === req.user.claims.sub) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      await db.delete(users).where(eq(users.id, userId));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin pub management actions
  app.patch("/api/admin/pubs/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const pubId = parseInt(req.params.id);
      res.json({ message: "Pub verified successfully", pubId });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify pub" });
    }
  });

  app.patch("/api/admin/pubs/:id/suspend", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const pubId = parseInt(req.params.id);
      res.json({ message: "Pub suspended successfully", pubId });
    } catch (error) {
      res.status(500).json({ message: "Failed to suspend pub" });
    }
  });
  // Admin analytics endpoints
  app.get("/api/admin/analytics/growth", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Mock growth data for now - in production this would come from time-series data
      const growthData = [
        { month: "2024-11", users: 245, pubs: 18 },
        { month: "2024-12", users: 312, pubs: 23 },
        { month: "2025-01", users: 389, pubs: 28 },
      ];

      res.json(growthData);
    } catch (error) {
      console.error("Error fetching growth analytics:", error);
      res.status(500).json({ message: "Failed to fetch growth analytics" });
    }
  });

  app.get("/api/admin/analytics/popular-beers", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get most popular beers (mock for now since reviews table doesn't exist yet)
      const popularBeers = await db
        .select({
          id: beers.id,
          name: beers.name,
          brewery: breweries.name,
          style: beers.style,
          avgRating: sql<number>`4.2`,
          reviewCount: sql<number>`FLOOR(RANDOM() * 100 + 10)`,
          availableAt: sql<number>`1`,
        })
        .from(beers)
        .leftJoin(breweries, eq(beers.breweryId, breweries.id))
        .where(sql`${beers.name} IN ('Carlsberg', 'Heineken', 'Guinness', 'Stella Artois', 'Punk IPA', 'Super Baladin', 'L''Ippa', 'Open Baladin')`)
        .limit(10);

      res.json(popularBeers);
    } catch (error) {
      console.error("Error fetching popular beers:", error);
      res.status(500).json({ message: "Failed to fetch popular beers" });
    }
  });

  // Admin-only data endpoints
  app.get("/api/admin/beers", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db
        .select({
          id: beers.id,
          name: beers.name,
          brewery: breweries.name,
          style: beers.style,
          abv: beers.abv,
          ibu: beers.ibu,
          description: beers.description,
          imageUrl: beers.imageUrl,
          bottleImageUrl: beers.bottleImageUrl,
        })
        .from(beers)
        .leftJoin(breweries, eq(beers.breweryId, breweries.id));

      if (search) {
        query = query.where(sql`${beers.name} ILIKE ${'%' + search + '%'} OR ${breweries.name} ILIKE ${'%' + search + '%'}`);
      }

      const results = await query
        .orderBy(beers.name)
        .limit(parseInt(limit))
        .offset(offset);

      res.json(results);
    } catch (error) {
      console.error("Error fetching beers:", error);
      res.status(500).json({ message: "Failed to fetch beers" });
    }
  });

  app.get("/api/admin/breweries", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db.select().from(breweries);

      if (search) {
        query = query.where(
          or(
            ilike(breweries.name, `%${search}%`),
            ilike(breweries.location, `%${search}%`)
          )
        );
      }

      const results = await query
        .orderBy(breweries.name)
        .limit(parseInt(limit))
        .offset(offset)
        .execute();

      res.json(results);
    } catch (error) {
      console.error("Error fetching breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });

  app.get("/api/admin/pubs", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db.select().from(pubs).leftJoin(users, eq(pubs.ownerId, users.id));

      if (search) {
        query = query.where(
          or(
            ilike(pubs.name, `%${search}%`),
            ilike(pubs.city, `%${search}%`)
          )
        );
      }

      const results = await query
        .orderBy(pubs.name)
        .limit(parseInt(limit))
        .offset(offset)
        .execute();

      res.json(results);
    } catch (error) {
      console.error("Error fetching pubs:", error);
      res.status(500).json({ message: "Failed to fetch pubs" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          userType: users.userType,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users);

      if (search) {
        query = query.where(sql`${users.email} ILIKE ${'%' + search + '%'} OR ${users.firstName} ILIKE ${'%' + search + '%'} OR ${users.lastName} ILIKE ${'%' + search + '%'}`);
      }

      const results = await query
        .orderBy(users.createdAt)
        .limit(parseInt(limit))
        .offset(offset)
        .execute();

      res.json(results);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Beer and brewery update endpoints
  app.patch("/api/admin/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Remove undefined/null values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
      );

      const [updatedBeer] = await db
        .update(beers)
        .set(cleanData)
        .where(eq(beers.id, parseInt(id)))
        .returning();

      if (!updatedBeer) {
        return res.status(404).json({ message: "Beer not found" });
      }

      res.json(updatedBeer);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  app.patch("/api/admin/breweries/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Remove undefined/null values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
      );

      const [updatedBrewery] = await db
        .update(breweries)
        .set(cleanData)
        .where(eq(breweries.id, parseInt(id)))
        .returning();

      if (!updatedBrewery) {
        return res.status(404).json({ message: "Brewery not found" });
      }

      res.json(updatedBrewery);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  // Review moderation endpoints (mock for now since reviews table doesn't exist)
  app.get("/api/admin/reviews/all", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Mock reviews data - in production this would come from reviews table
      const allReviews = [
        {
          id: 1,
          userId: '45370502',
          beerId: 30114,
          pubId: 7,
          rating: 5,
          comment: 'Ottima birra IPA, molto luppolata e fresca. Perfetta per l\'estate!',
          status: 'approved',
          createdAt: new Date('2024-01-18T15:30:00Z').toISOString(),
          beer: { name: 'BrewDog Punk IPA', brewery: 'BrewDog' },
          pub: { name: 'Luppolino Pub' },
          user: { firstName: 'Matteo', lastName: 'Bettio', email: 'matteobettio94@gmail.com' }
        },
        {
          id: 2,
          userId: '45321347',
          beerId: 3,
          pubId: null,
          rating: 4,
          comment: 'Super Baladin sempre una garanzia. Birra artisanale italiana di qualità superiore.',
          status: 'approved',
          createdAt: new Date('2024-01-17T10:15:00Z').toISOString(),
          beer: { name: 'Super Baladin', brewery: 'Baladin' },
          pub: null,
          user: { firstName: 'Mario', lastName: 'Admin', email: 'chromiumpd@gmail.com' }
        }
      ];

      res.json(allReviews);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/admin/reviews/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      
      // Mock response - in production this would update the reviews table
      res.json({ message: "Review approved", reviewId: id });
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ message: "Failed to approve review" });
    }
  });

  app.post("/api/admin/reviews/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      
      // Mock response - in production this would update the reviews table
      res.json({ message: "Review rejected", reviewId: id });
    } catch (error) {
      console.error("Error rejecting review:", error);
      res.status(500).json({ message: "Failed to reject review" });
    }
  });

  // Reports endpoints (mock for now since we don't have reports table)
  app.get("/api/admin/reports", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Mock reports data - in production this would come from a reports table
      const reports = [
        {
          id: 1,
          type: 'review',
          targetId: 1,
          reporterId: '12345',
          reason: 'Contenuto inappropriato',
          description: 'Linguaggio offensivo nella recensione',
          status: 'pending',
          createdAt: new Date('2024-01-20T10:00:00Z').toISOString(),
        },
        {
          id: 2,
          type: 'user',
          targetId: 2,
          reporterId: '67890',
          reason: 'Spam',
          description: 'Utente che pubblica recensioni false ripetutamente',
          status: 'pending',
          createdAt: new Date('2024-01-19T15:30:00Z').toISOString(),
        },
      ];

      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/admin/reports/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      
      // Mock response - in production this would update the reports table
      res.json({ message: "Report resolved", reportId: id });
    } catch (error) {
      console.error("Error resolving report:", error);
      res.status(500).json({ message: "Failed to resolve report" });
    }
  });

  app.post("/api/admin/reports/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.claims?.sub !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { id } = req.params;
      
      // Mock response - in production this would update the reports table
      res.json({ message: "Report dismissed", reportId: id });
    } catch (error) {
      console.error("Error dismissing report:", error);
      res.status(500).json({ message: "Failed to dismiss report" });
    }
  });
}