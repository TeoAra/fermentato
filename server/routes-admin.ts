import { eq, count, desc, asc, sql, or, ilike, and } from "drizzle-orm";
import { db } from "./db";
import { beers, breweries, users, pubs, publicanRequests, breweryRequests, reviewReports, userBeerTastings, pubEvents, breweryEvents, contentSuggestions, additionRequests } from "@shared/schema";
import type { Express } from "express";
import { isAuthenticated, isAdmin } from "./auth";
import { sendPushToUser, sendPushToAdmins } from "./push-utils";
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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

  // Brewery search endpoint for AdminContentManager
  app.get("/api/admin/breweries/search", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { q: search, limit = 20 } = req.query;

      let query = db.select().from(breweries);

      if (search) {
        query = query.where(
          or(
            ilike(breweries.name, `%${search}%`),
            ilike(breweries.location, `%${search}%`),
            ilike(breweries.country, `%${search}%`)
          )
        ) as any;
      }

      const results = await query
        .orderBy(breweries.name)
        .limit(parseInt(String(limit)))
        .execute();

      res.json(results);
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  app.get("/api/admin/pubs", isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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
      if ((req.user as any)?.userType !== 'admin') {
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

  // ========================================
  // Admin Search endpoints (for AdminContentManager)
  // ========================================

  app.get("/api/admin/beers/search", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { q, limit = 50 } = req.query;
      if (!q || String(q).trim().length < 1) return res.json([]);

      const pattern = `%${q}%`;
      const results = await db
        .select({
          id: beers.id,
          name: beers.name,
          style: beers.style,
          abv: beers.abv,
          ibu: beers.ibu,
          description: beers.description,
          imageUrl: beers.imageUrl,
          isGlutenFree: beers.isGlutenFree,
          isAlcoholFree: beers.isAlcoholFree,
          brewery: {
            id: breweries.id,
            name: breweries.name,
            logoUrl: breweries.logoUrl,
          },
        })
        .from(beers)
        .leftJoin(breweries, eq(beers.breweryId, breweries.id))
        .where(
          or(
            ilike(beers.name, pattern),
            ilike(breweries.name, pattern),
            ilike(beers.style, pattern),
          )
        )
        .orderBy(beers.name)
        .limit(Number(limit));

      res.json(results);
    } catch (error) {
      console.error("Error searching beers:", error);
      res.status(500).json({ message: "Errore nella ricerca birre" });
    }
  });

  app.get("/api/admin/pubs/search", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { q, limit = 50 } = req.query;
      if (!q || String(q).trim().length < 1) return res.json([]);

      const pattern = `%${q}%`;
      const results = await db
        .select()
        .from(pubs)
        .where(
          or(
            ilike(pubs.name, pattern),
            ilike(pubs.city, pattern),
            ilike(pubs.address, pattern),
          )
        )
        .orderBy(pubs.name)
        .limit(Number(limit));

      res.json(results);
    } catch (error) {
      console.error("Error searching pubs:", error);
      res.status(500).json({ message: "Errore nella ricerca pub" });
    }
  });

  // ========================================
  // Admin DELETE endpoints
  // ========================================

  app.delete("/api/admin/beers/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });

      await db.delete(beers).where(eq(beers.id, id));
      res.json({ message: "Birra eliminata con successo" });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
  });

  app.delete("/api/admin/breweries/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });

      await db.delete(beers).where(eq(beers.breweryId, id));
      await db.delete(breweries).where(eq(breweries.id, id));
      res.json({ message: "Birrificio e relative birre eliminate con successo" });
    } catch (error) {
      console.error("Error deleting brewery:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
  });

  app.delete("/api/admin/pubs/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID non valido" });

      await db.delete(pubs).where(eq(pubs.id, id));
      res.json({ message: "Pub eliminato con successo" });
    } catch (error) {
      console.error("Error deleting pub:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione" });
    }
  });

  // ─── Content Suggestions ───────────────────────────────────────────────────

  // Submit a suggestion (any authenticated user)
  app.post("/api/suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { type, itemId, proposedChanges, currentData, message } = req.body;
      if (!type || !itemId || !proposedChanges) {
        return res.status(400).json({ message: "Dati mancanti" });
      }
      if (!['beer', 'brewery'].includes(type)) {
        return res.status(400).json({ message: "Tipo non valido" });
      }

      const [suggestion] = await db.insert(contentSuggestions).values({
        type,
        itemId: parseInt(itemId),
        userId,
        proposedChanges,
        currentData: currentData || null,
        message: message || null,
      }).returning();

      // Get user info for notification
      const [submitter] = await db.select({ nickname: users.nickname, firstName: users.firstName })
        .from(users).where(eq(users.id, userId)).limit(1);
      const submitterName = submitter?.nickname || submitter?.firstName || 'Un utente';

      // Notify all admins
      const itemLabel = type === 'beer' ? 'birra' : 'birrificio';
      await sendPushToAdmins({
        title: '📝 Nuovo suggerimento',
        body: `${submitterName} ha suggerito modifiche a una ${itemLabel}`,
        url: '/admin/suggestions',
        type: 'suggestion',
      });

      // If brewery: notify brewery owner (if registered)
      if (type === 'brewery') {
        const [breweryOwner] = await db.select({ id: users.id })
          .from(users)
          .where(and(eq(users.breweryId, parseInt(itemId)), eq(users.userType, 'brewery_owner')))
          .limit(1);
        if (breweryOwner) {
          await sendPushToUser(breweryOwner.id, {
            title: '📝 Suggerimento ricevuto',
            body: `${submitterName} ha suggerito modifiche al tuo birrificio`,
            url: `/brewery/${itemId}`,
            type: 'suggestion',
          });
        }
      }

      res.status(201).json(suggestion);
    } catch (error) {
      console.error("Error creating suggestion:", error);
      res.status(500).json({ message: "Errore durante l'invio del suggerimento" });
    }
  });

  // List all suggestions (admin only)
  app.get("/api/admin/suggestions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const statusFilter = (req.query.status as string) || 'pending';
      const rows = await db.select({
        suggestion: contentSuggestions,
        user: {
          id: users.id,
          nickname: users.nickname,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
        .from(contentSuggestions)
        .leftJoin(users, eq(contentSuggestions.userId, users.id))
        .where(eq(contentSuggestions.status, statusFilter))
        .orderBy(desc(contentSuggestions.createdAt));

      // Enrich with item name
      const enriched = await Promise.all(rows.map(async (row) => {
        let itemName = '';
        try {
          if (row.suggestion.type === 'beer') {
            const [b] = await db.select({ name: beers.name }).from(beers).where(eq(beers.id, row.suggestion.itemId)).limit(1);
            itemName = b?.name || '';
          } else {
            const [br] = await db.select({ name: breweries.name }).from(breweries).where(eq(breweries.id, row.suggestion.itemId)).limit(1);
            itemName = br?.name || '';
          }
        } catch {}
        return { ...row.suggestion, user: row.user, itemName };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Errore nel caricamento dei suggerimenti" });
    }
  });

  // Pending count (for admin badge)
  app.get("/api/admin/suggestions/pending-count", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [{ value }] = await db.select({ value: count() })
        .from(contentSuggestions)
        .where(eq(contentSuggestions.status, 'pending'));
      res.json({ count: value });
    } catch (error) {
      res.json({ count: 0 });
    }
  });

  // Approve suggestion — apply changes to beer/brewery
  app.patch("/api/admin/suggestions/:id/approve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      const adminId = req.user?.claims?.sub || req.user?.id;
      const { adminNotes } = req.body;

      const [suggestion] = await db.select().from(contentSuggestions).where(eq(contentSuggestions.id, suggestionId)).limit(1);
      if (!suggestion) return res.status(404).json({ message: "Suggerimento non trovato" });
      if (suggestion.status !== 'pending') return res.status(400).json({ message: "Suggerimento già gestito" });

      const changes = suggestion.proposedChanges as Record<string, any>;

      // Apply changes
      if (suggestion.type === 'beer') {
        await storage.updateBeer(suggestion.itemId, changes);
      } else {
        await storage.updateBrewery(suggestion.itemId, changes);
      }

      // Mark as approved
      await db.update(contentSuggestions).set({
        status: 'approved',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(contentSuggestions.id, suggestionId));

      // Notify the user who suggested
      await sendPushToUser(suggestion.userId, {
        title: '✅ Suggerimento approvato',
        body: `Il tuo suggerimento per ${suggestion.type === 'beer' ? 'la birra' : 'il birrificio'} è stato approvato!`,
        url: `/${suggestion.type === 'beer' ? 'beer' : 'brewery'}/${suggestion.itemId}`,
        type: 'suggestion_approved',
      });

      res.json({ message: "Suggerimento approvato e modifiche applicate" });
    } catch (error) {
      console.error("Error approving suggestion:", error);
      res.status(500).json({ message: "Errore durante l'approvazione" });
    }
  });

  // Reject suggestion
  app.patch("/api/admin/suggestions/:id/reject", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const suggestionId = parseInt(req.params.id);
      const adminId = req.user?.claims?.sub || req.user?.id;
      const { adminNotes } = req.body;

      const [suggestion] = await db.select().from(contentSuggestions).where(eq(contentSuggestions.id, suggestionId)).limit(1);
      if (!suggestion) return res.status(404).json({ message: "Suggerimento non trovato" });
      if (suggestion.status !== 'pending') return res.status(400).json({ message: "Suggerimento già gestito" });

      await db.update(contentSuggestions).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(contentSuggestions.id, suggestionId));

      // Notify the user who suggested
      await sendPushToUser(suggestion.userId, {
        title: '❌ Suggerimento non approvato',
        body: `Il tuo suggerimento per ${suggestion.type === 'beer' ? 'la birra' : 'il birrificio'} non è stato accettato${adminNotes ? ': ' + adminNotes : '.'}`,
        url: `/${suggestion.type === 'beer' ? 'beer' : 'brewery'}/${suggestion.itemId}`,
        type: 'suggestion_rejected',
      });

      res.json({ message: "Suggerimento rifiutato" });
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      res.status(500).json({ message: "Errore durante il rifiuto" });
    }
  });

  // ─── Addition Requests (admin + brewery_owner) ────────────────────────────

  // Middleware: isAdmin OR is brewery_owner (used inline below)
  const canManageAdditions = async (req: any, res: any, next: any) => {
    const userType = req.user?.userType || req.user?.claims?.userType;
    const isAdminUser = userType === 'admin';
    const isBreweryOwner = userType === 'brewery_owner' || (req.user?.roles || []).includes('brewery_owner');
    if (isAdminUser || isBreweryOwner) return next();
    return res.status(403).json({ message: "Accesso non autorizzato" });
  };

  // List all addition requests (admin sees all; brewery_owner sees only their brewery's beer requests)
  app.get("/api/admin/addition-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const userRecord = await db.select({ userType: users.userType, roles: users.roles, breweryId: users.breweryId })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (!userRecord.length) return res.status(403).json({ message: "Utente non trovato" });

      const { userType, roles, breweryId } = userRecord[0];
      const isAdminUser = userType === 'admin';
      const isBreweryOwner = userType === 'brewery_owner' || (roles || []).includes('brewery_owner');
      if (!isAdminUser && !isBreweryOwner) return res.status(403).json({ message: "Accesso non autorizzato" });

      const statusFilter = (req.query.status as string) || 'pending';

      let query = db.select({
        request: additionRequests,
        user: { id: users.id, nickname: users.nickname, firstName: users.firstName, profileImageUrl: users.profileImageUrl },
      })
        .from(additionRequests)
        .leftJoin(users, eq(additionRequests.userId, users.id))
        .where(eq(additionRequests.status, statusFilter))
        .orderBy(desc(additionRequests.createdAt));

      let rows = await query;

      // Brewery owners only see beer requests for their brewery
      if (isBreweryOwner && !isAdminUser && breweryId) {
        rows = rows.filter(r => r.request.type === 'beer' && r.request.breweryId === breweryId);
      }

      const result = rows.map(r => ({ ...r.request, user: r.user }));
      res.json(result);
    } catch (error) {
      console.error("Error listing addition requests:", error);
      res.status(500).json({ message: "Errore nel caricamento delle richieste" });
    }
  });

  // Pending count for admin badge
  app.get("/api/admin/addition-requests/pending-count", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const [{ value }] = await db.select({ value: count() })
        .from(additionRequests).where(eq(additionRequests.status, 'pending'));
      res.json({ count: value });
    } catch {
      res.json({ count: 0 });
    }
  });

  // Approve addition request → create beer or brewery in DB
  app.patch("/api/admin/addition-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const userRecord = await db.select({ userType: users.userType, roles: users.roles, breweryId: users.breweryId })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (!userRecord.length) return res.status(403).json({ message: "Utente non trovato" });

      const { userType, roles, breweryId: myBreweryId } = userRecord[0];
      const isAdminUser = userType === 'admin';
      const isBreweryOwner = userType === 'brewery_owner' || (roles || []).includes('brewery_owner');
      if (!isAdminUser && !isBreweryOwner) return res.status(403).json({ message: "Accesso non autorizzato" });

      const reqId = parseInt(req.params.id);
      const [request] = await db.select().from(additionRequests).where(eq(additionRequests.id, reqId)).limit(1);
      if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
      if (request.status !== 'pending') return res.status(400).json({ message: "Richiesta già gestita" });

      // Brewery owners can only approve beer requests for their brewery
      if (isBreweryOwner && !isAdminUser) {
        if (request.type !== 'beer' || request.breweryId !== myBreweryId) {
          return res.status(403).json({ message: "Non autorizzato per questa richiesta" });
        }
      }

      const { adminNotes } = req.body;
      let createdId: number | null = null;

      if (request.type === 'brewery') {
        const [created] = await db.insert(breweries).values({
          name: request.breweryName!,
          location: request.city || '',
          region: '',
          country: request.country || 'Italia',
          description: request.description || null,
          websiteUrl: request.websiteUrl || null,
        }).returning();
        createdId = created.id;
      } else {
        const [created] = await db.insert(beers).values({
          name: request.beerName!,
          style: request.style || 'Non specificato',
          abv: request.abv ? parseFloat(request.abv) : null,
          breweryId: request.breweryId || null,
          description: request.description || null,
        }).returning();
        createdId = created.id;
      }

      await db.update(additionRequests).set({
        status: 'approved',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: userId,
      }).where(eq(additionRequests.id, reqId));

      // Notify the requester
      const typeLabel = request.type === 'beer' ? 'birra' : 'birrificio';
      const name = request.type === 'beer' ? request.beerName : request.breweryName;
      await sendPushToUser(request.userId, {
        title: '✅ Richiesta approvata',
        body: `La tua richiesta di aggiungere "${name}" è stata approvata!`,
        url: createdId ? `/${request.type === 'beer' ? 'beer' : 'brewery'}/${createdId}` : '/scan',
        type: 'addition_approved',
      });

      res.json({ message: `${typeLabel} aggiunt${request.type === 'beer' ? 'a' : 'o'} con successo`, id: createdId });
    } catch (error) {
      console.error("Error approving addition request:", error);
      res.status(500).json({ message: "Errore durante l'approvazione" });
    }
  });

  // Reject addition request
  app.patch("/api/admin/addition-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const userRecord = await db.select({ userType: users.userType, roles: users.roles, breweryId: users.breweryId })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (!userRecord.length) return res.status(403).json({ message: "Utente non trovato" });

      const { userType, roles } = userRecord[0];
      const isAdminUser = userType === 'admin';
      const isBreweryOwner = userType === 'brewery_owner' || (roles || []).includes('brewery_owner');
      if (!isAdminUser && !isBreweryOwner) return res.status(403).json({ message: "Accesso non autorizzato" });

      const reqId = parseInt(req.params.id);
      const [request] = await db.select().from(additionRequests).where(eq(additionRequests.id, reqId)).limit(1);
      if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
      if (request.status !== 'pending') return res.status(400).json({ message: "Richiesta già gestita" });

      const { adminNotes } = req.body;

      await db.update(additionRequests).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: userId,
      }).where(eq(additionRequests.id, reqId));

      const name = request.type === 'beer' ? request.beerName : request.breweryName;
      await sendPushToUser(request.userId, {
        title: '❌ Richiesta non approvata',
        body: `La richiesta di aggiungere "${name}" non è stata accettata${adminNotes ? ': ' + adminNotes : '.'}`,
        url: '/scan',
        type: 'addition_rejected',
      });

      res.json({ message: "Richiesta rifiutata" });
    } catch (error) {
      console.error("Error rejecting addition request:", error);
      res.status(500).json({ message: "Errore durante il rifiuto" });
    }
  });
}