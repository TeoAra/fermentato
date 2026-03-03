import { eq, count, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "./db";
import { beers, breweries, users, pubs, publicanRequests, breweryRequests, reviewReports, userBeerTastings, pubEvents, breweryEvents } from "@shared/schema";
import type { Express } from "express";
import { isAuthenticated, isAdmin } from "./auth";
import { sendPushToUser } from "./push-utils";
import { storage } from "./storage";

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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = req.params.id;
      if (userId === (req.user as any)?.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      await db.delete(users).where(eq(users.id, userId));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });


  app.patch("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const userId = req.params.id;
      if (userId === (req.user as any)?.id) {
        return res.status(400).json({ message: "Non puoi modificare te stesso da qui" });
      }
      const { userType } = req.body;
      const allowed = ['customer', 'pub_owner', 'brewery_owner', 'admin', 'banned'];
      if (!userType || !allowed.includes(userType)) {
        return res.status(400).json({ message: "Tipo utente non valido" });
      }
      await db.update(users).set({ userType }).where(eq(users.id, userId));
      res.json({ message: "Utente aggiornato", userId, userType });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Errore aggiornamento utente" });
    }
  });

  // Admin pub management actions
  app.patch("/api/admin/pubs/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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

  // Add missing brewery search endpoint
  app.get("/api/admin/breweries/search", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.id !== "45321347") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { q: search, limit = 20 } = req.query;

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
        .execute();

      res.json(results);
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  app.get("/api/admin/pubs", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { search, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let baseQuery = db
        .select({
          id: users.id,
          email: users.email,
          nickname: users.nickname,
          firstName: users.firstName,
          lastName: users.lastName,
          userType: users.userType,
          activeRole: users.activeRole,
          profileImageUrl: users.profileImageUrl,
          isPublic: users.isPublic,
          createdAt: users.createdAt,
        })
        .from(users);

      if (search) {
        const pattern = `%${search}%`;
        baseQuery = baseQuery.where(
          sql`${users.email} ILIKE ${pattern} OR ${users.nickname} ILIKE ${pattern} OR ${users.firstName} ILIKE ${pattern}`
        ) as any;
      }

      const results = await baseQuery
        .orderBy(desc(users.createdAt))
        .limit(Number(limit))
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.id !== "45321347") {
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
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const statusFilter = req.query.status as string | undefined;
      const rows = await db
        .select({
          id: reviewReports.id,
          reviewId: reviewReports.reviewId,
          reporterId: reviewReports.reporterId,
          reason: reviewReports.reason,
          description: reviewReports.description,
          status: reviewReports.status,
          createdAt: reviewReports.createdAt,
          resolvedAt: reviewReports.resolvedAt,
          reviewRating: userBeerTastings.rating,
          reviewText: userBeerTastings.personalNotes,
          reviewBeerId: userBeerTastings.beerId,
          reviewUserId: userBeerTastings.userId,
          beerName: beers.name,
          beerStyle: beers.style,
          reporterNickname: users.nickname,
          reporterFirstName: users.firstName,
          reporterAvatar: users.profileImageUrl,
        })
        .from(reviewReports)
        .leftJoin(userBeerTastings, eq(reviewReports.reviewId, userBeerTastings.id))
        .leftJoin(beers, eq(userBeerTastings.beerId, beers.id))
        .leftJoin(users, eq(reviewReports.reporterId, users.id))
        .where(statusFilter && statusFilter !== 'all' ? eq(reviewReports.status, statusFilter) : sql`1=1`)
        .orderBy(desc(reviewReports.createdAt))
        .limit(100);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/admin/reports/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = parseInt(req.params.id);
      await db.update(reviewReports)
        .set({ status: 'resolved', resolvedAt: new Date() })
        .where(eq(reviewReports.id, id));
      res.json({ message: "Report risolto", reportId: id });
    } catch (error) {
      console.error("Error resolving report:", error);
      res.status(500).json({ message: "Failed to resolve report" });
    }
  });

  app.post("/api/admin/reports/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = parseInt(req.params.id);
      await db.update(reviewReports)
        .set({ status: 'dismissed', resolvedAt: new Date() })
        .where(eq(reviewReports.id, id));
      res.json({ message: "Report archiviato", reportId: id });
    } catch (error) {
      console.error("Error dismissing report:", error);
      res.status(500).json({ message: "Failed to dismiss report" });
    }
  });

  app.get("/api/admin/recent-activity", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const recentUsers = await db.select({
        name: sql<string>`COALESCE(${users.nickname}, ${users.firstName}, ${users.email})`,
        detail: users.userType,
        time: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt)).limit(5);

      const recentPubs = await db.select({
        name: pubs.name,
        detail: pubs.city,
        time: pubs.createdAt,
      }).from(pubs).where(sql`${pubs.createdAt} IS NOT NULL`).orderBy(desc(pubs.createdAt)).limit(5);

      const recentBreweries = await db.select({
        name: breweries.name,
        detail: breweries.location,
        time: breweries.createdAt,
      }).from(breweries).where(sql`${breweries.createdAt} IS NOT NULL`).orderBy(desc(breweries.createdAt)).limit(5);

      const recentReviews = await db.select({
        reviewerName: sql<string>`COALESCE(${users.nickname}, ${users.firstName}, 'Utente')`,
        beerName: beers.name,
        rating: userBeerTastings.rating,
        time: userBeerTastings.createdAt,
      }).from(userBeerTastings)
        .leftJoin(users, eq(userBeerTastings.userId, users.id))
        .leftJoin(beers, eq(userBeerTastings.beerId, beers.id))
        .where(sql`${userBeerTastings.rating} IS NOT NULL AND ${userBeerTastings.createdAt} IS NOT NULL`)
        .orderBy(desc(userBeerTastings.createdAt)).limit(5);

      const recentEvents = await db.select({
        name: pubEvents.title,
        detail: sql<string>`'Evento pub'`,
        time: pubEvents.createdAt,
      }).from(pubEvents).where(sql`${pubEvents.createdAt} IS NOT NULL`).orderBy(desc(pubEvents.createdAt)).limit(3);

      const combined = [
        ...recentUsers.map(u => ({ type: 'user', action: 'Nuovo utente iscritto', name: u.name, detail: u.detail, time: u.time?.toISOString() })),
        ...recentPubs.map(p => ({ type: 'pub', action: 'Nuovo pub registrato', name: p.name, detail: p.detail, time: p.time?.toISOString() })),
        ...recentBreweries.map(b => ({ type: 'brewery', action: 'Birrificio aggiunto', name: b.name, detail: b.detail, time: b.time?.toISOString() })),
        ...recentReviews.map(r => ({ type: 'review', action: `Recensione ★${r.rating}`, name: r.beerName || 'Birra', detail: `da ${r.reviewerName}`, time: r.time?.toISOString() })),
        ...recentEvents.map(e => ({ type: 'event', action: 'Evento creato', name: e.name, detail: null, time: e.time?.toISOString() })),
      ]
        .filter(a => a.time)
        .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
        .slice(0, 15);

      res.json(combined);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // ========================================
  // Publican Requests Management
  // ========================================

  // Get all publican requests (admin only)
  app.get("/api/admin/publican-requests", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requests = await db
        .select({
          id: publicanRequests.id,
          userId: publicanRequests.userId,
          pubName: publicanRequests.pubName,
          pubAddress: publicanRequests.pubAddress,
          pubCity: publicanRequests.pubCity,
          pubRegion: publicanRequests.pubRegion,
          vatNumber: publicanRequests.vatNumber,
          phone: publicanRequests.phone,
          email: publicanRequests.email,
          description: publicanRequests.description,
          status: publicanRequests.status,
          adminNotes: publicanRequests.adminNotes,
          createdAt: publicanRequests.createdAt,
          reviewedAt: publicanRequests.reviewedAt,
          reviewedBy: publicanRequests.reviewedBy,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(publicanRequests)
        .leftJoin(users, eq(publicanRequests.userId, users.id))
        .orderBy(desc(publicanRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error("Error fetching publican requests:", error);
      res.status(500).json({ message: "Errore nel recupero delle richieste" });
    }
  });

  // Get pending publican requests count (for admin notifications)
  app.get("/api/admin/publican-requests/pending-count", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await db
        .select({ count: count() })
        .from(publicanRequests)
        .where(eq(publicanRequests.status, 'pending'));

      res.json({ count: result[0]?.count || 0 });
    } catch (error) {
      console.error("Error fetching pending count:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Approve publican request
  app.post("/api/admin/publican-requests/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = (req.user as any)?.id;
      const { adminNotes } = req.body;

      // Get the request
      const [request] = await db
        .select()
        .from(publicanRequests)
        .where(eq(publicanRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Richiesta non trovata" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Richiesta già processata" });
      }

      // Create the pub with safe defaults for optional fields
      const [newPub] = await db.insert(pubs).values({
        name: request.pubName,
        address: request.pubAddress,
        city: request.pubCity,
        region: request.pubRegion || request.pubCity || 'Italia',
        vatNumber: request.vatNumber || null,
        phone: request.phone || null,
        email: request.email || null,
        description: request.description || null,
        ownerId: request.userId,
        isActive: true,
      }).returning();

      // Update user to pub_owner role
      const [user] = await db.select().from(users).where(eq(users.id, request.userId));
      if (user) {
        const currentRoles = user.roles || ['customer'];
        if (!currentRoles.includes('pub_owner')) {
          await db.update(users)
            .set({ 
              roles: [...currentRoles, 'pub_owner'],
              userType: 'pub_owner',
            })
            .where(eq(users.id, request.userId));
        }
      }

      // Update the request status
      await db.update(publicanRequests)
        .set({
          status: 'approved',
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(publicanRequests.id, requestId));

      res.json({ 
        message: "Richiesta approvata con successo", 
        pubId: newPub.id,
        userId: request.userId 
      });
    } catch (error) {
      console.error("Error approving publican request:", error);
      res.status(500).json({ message: "Errore durante l'approvazione" });
    }
  });

  // Reject publican request
  app.post("/api/admin/publican-requests/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = (req.user as any)?.id;
      const { adminNotes } = req.body;

      // Get the request
      const [request] = await db
        .select()
        .from(publicanRequests)
        .where(eq(publicanRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Richiesta non trovata" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Richiesta già processata" });
      }

      // Update the request status
      await db.update(publicanRequests)
        .set({
          status: 'rejected',
          adminNotes: adminNotes || 'Richiesta rifiutata',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(publicanRequests.id, requestId));

      res.json({ message: "Richiesta rifiutata" });
    } catch (error) {
      console.error("Error rejecting publican request:", error);
      res.status(500).json({ message: "Errore durante il rifiuto" });
    }
  });

  // ===== BREWERY REQUESTS =====

  app.get("/api/admin/brewery-requests", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requests = await db
        .select({
          id: breweryRequests.id,
          userId: breweryRequests.userId,
          breweryName: breweryRequests.breweryName,
          breweryLocation: breweryRequests.breweryLocation,
          breweryRegion: breweryRequests.breweryRegion,
          breweryCountry: breweryRequests.breweryCountry,
          vatNumber: breweryRequests.vatNumber,
          phone: breweryRequests.phone,
          email: breweryRequests.email,
          websiteUrl: breweryRequests.websiteUrl,
          description: breweryRequests.description,
          existingBreweryId: breweryRequests.existingBreweryId,
          status: breweryRequests.status,
          adminNotes: breweryRequests.adminNotes,
          createdAt: breweryRequests.createdAt,
          reviewedAt: breweryRequests.reviewedAt,
          reviewedBy: breweryRequests.reviewedBy,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(breweryRequests)
        .leftJoin(users, eq(breweryRequests.userId, users.id))
        .orderBy(desc(breweryRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error("Error fetching brewery requests:", error);
      res.status(500).json({ message: "Errore nel recupero delle richieste birrificio" });
    }
  });

  app.get("/api/admin/brewery-requests/pending-count", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await db
        .select({ count: count() })
        .from(breweryRequests)
        .where(eq(breweryRequests.status, 'pending'));

      res.json({ count: result[0]?.count || 0 });
    } catch (error) {
      console.error("Error fetching brewery pending count:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  app.post("/api/admin/brewery-requests/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = (req.user as any)?.id;
      const { adminNotes } = req.body;

      const [request] = await db
        .select()
        .from(breweryRequests)
        .where(eq(breweryRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Richiesta non trovata" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Richiesta già processata" });
      }

      let assignedBreweryId: number;

      if (request.existingBreweryId) {
        assignedBreweryId = request.existingBreweryId;
      } else {
        const [newBrewery] = await db.insert(breweries).values({
          name: request.breweryName,
          location: request.breweryLocation,
          region: request.breweryRegion || 'N/A',
          country: request.breweryCountry || 'Italia',
          description: request.description || null,
          websiteUrl: request.websiteUrl || null,
          vatNumber: request.vatNumber || null,
          phone: request.phone || null,
        }).returning();
        assignedBreweryId = newBrewery.id;
      }

      const [user] = await db.select().from(users).where(eq(users.id, request.userId));
      if (user) {
        const currentRoles = user.roles || ['customer'];
        if (!currentRoles.includes('brewery_owner')) {
          await db.update(users)
            .set({
              roles: [...currentRoles, 'brewery_owner'],
              userType: 'brewery_owner',
              breweryId: assignedBreweryId,
            })
            .where(eq(users.id, request.userId));
        }
      }

      await db.update(breweryRequests)
        .set({
          status: 'approved',
          adminNotes: adminNotes || null,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(breweryRequests.id, requestId));

      try {
        await storage.createNotification({
          userId: request.userId,
          type: 'brewery_request_approved',
          title: 'Richiesta birrificio approvata',
          message: `La tua richiesta per il birrificio "${request.breweryName}" è stata approvata!`,
          pubId: null,
          beerId: null,
          isRead: false,
        });
        await sendPushToUser(request.userId, {
          title: 'Richiesta birrificio approvata!',
          body: `Il tuo birrificio "${request.breweryName}" è stato approvato. Puoi iniziare a gestirlo!`,
          url: '/brewery-dashboard',
        });
      } catch (notifErr) {
        console.error('Error sending approval notification:', notifErr);
      }

      res.json({
        message: "Richiesta birrificio approvata con successo",
        breweryId: assignedBreweryId,
        userId: request.userId,
      });
    } catch (error) {
      console.error("Error approving brewery request:", error);
      res.status(500).json({ message: "Errore durante l'approvazione" });
    }
  });

  app.post("/api/admin/brewery-requests/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = (req.user as any)?.id;
      const { adminNotes } = req.body;

      const [request] = await db
        .select()
        .from(breweryRequests)
        .where(eq(breweryRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Richiesta non trovata" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Richiesta già processata" });
      }

      await db.update(breweryRequests)
        .set({
          status: 'rejected',
          adminNotes: adminNotes || 'Richiesta rifiutata',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        })
        .where(eq(breweryRequests.id, requestId));

      try {
        await storage.createNotification({
          userId: request.userId,
          type: 'brewery_request_rejected',
          title: 'Richiesta birrificio rifiutata',
          message: `La tua richiesta per il birrificio "${request.breweryName}" è stata rifiutata.${adminNotes ? ' Motivo: ' + adminNotes : ''}`,
          pubId: null,
          beerId: null,
          isRead: false,
        });
        await sendPushToUser(request.userId, {
          title: 'Richiesta birrificio rifiutata',
          body: `La tua richiesta per "${request.breweryName}" è stata rifiutata.`,
        });
      } catch (notifErr) {
        console.error('Error sending rejection notification:', notifErr);
      }

      res.json({ message: "Richiesta rifiutata" });
    } catch (error) {
      console.error("Error rejecting brewery request:", error);
      res.status(500).json({ message: "Errore durante il rifiuto" });
    }
  });
}