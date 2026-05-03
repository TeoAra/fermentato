import { eq, count, desc, asc, sql, or, ilike, and } from "drizzle-orm";
import { db, pool } from "./db";
import { beers, breweries, users, pubs, publicanRequests, breweryRequests, reviewReports, userBeerTastings, pubEvents, breweryEvents, contentSuggestions, additionRequests, scanLogs, favorites } from "@shared/schema";
import type { Express } from "express";
import { isAuthenticated, isAdmin } from "./auth";
import { sendPushToUser, sendPushToAdmins } from "./push-utils";
import { storage } from "./storage";

export function registerAdminRoutes(app: Express) {
  // User management endpoints
  app.patch('/api/admin/users/:id/suspend', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = (req.user as any)?.claims?.sub;
      
      if (userId === currentUserId) {
        return res.status(400).json({ error: "Non puoi sospendere te stesso" });
      }

      await db.update(users).set({ userType: 'banned' }).where(eq(users.id, userId));
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

      // Real cumulative growth: total users/pubs/breweries/beers per month for the last 6 months.
      const rows = await db.execute(sql`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW() - INTERVAL '5 months'),
            date_trunc('month', NOW()),
            INTERVAL '1 month'
          )::date AS month
        )
        SELECT
          to_char(m.month, 'YYYY-MM') AS month,
          (SELECT COUNT(*)::int FROM users      WHERE created_at <= (m.month + INTERVAL '1 month'))      AS users,
          (SELECT COUNT(*)::int FROM pubs       WHERE created_at <= (m.month + INTERVAL '1 month'))      AS pubs,
          (SELECT COUNT(*)::int FROM breweries  WHERE created_at <= (m.month + INTERVAL '1 month'))      AS breweries,
          (SELECT COUNT(*)::int FROM beers      WHERE created_at <= (m.month + INTERVAL '1 month'))      AS beers,
          (SELECT COUNT(*)::int FROM users      WHERE created_at >  m.month AND created_at <= (m.month + INTERVAL '1 month')) AS newUsers,
          (SELECT COUNT(*)::int FROM pubs       WHERE created_at >  m.month AND created_at <= (m.month + INTERVAL '1 month')) AS newPubs,
          (SELECT COUNT(*)::int FROM beers      WHERE created_at >  m.month AND created_at <= (m.month + INTERVAL '1 month')) AS newBeers
        FROM months m
        ORDER BY m.month ASC
      `);
      const growthData = ((rows as any).rows ?? rows).map((r: any) => ({
        month: r.month,
        users: Number(r.users),
        pubs: Number(r.pubs),
        breweries: Number(r.breweries),
        beers: Number(r.beers),
        newUsers: Number(r.newusers),
        newPubs: Number(r.newpubs),
        newBeers: Number(r.newbeers),
      }));
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

      // Real popular beers: top by tasting count, with avg rating and pub availability count.
      const popularBeers = await db.execute(sql`
        SELECT
          b.id,
          b.name,
          br.name AS brewery,
          b.style,
          ROUND(AVG(t.rating)::numeric, 1)::float AS "avgRating",
          COUNT(t.id)::int                         AS "reviewCount",
          (SELECT COUNT(DISTINCT pub_id)::int FROM tap_list WHERE beer_id = b.id AND is_active = true) AS "availableAt"
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        INNER JOIN user_beer_tastings t ON t.beer_id = b.id AND t.rating IS NOT NULL
        GROUP BY b.id, b.name, br.name, b.style
        HAVING COUNT(t.id) > 0
        ORDER BY COUNT(t.id) DESC, AVG(t.rating) DESC
        LIMIT 10
      `);
      res.json((popularBeers as any).rows ?? popularBeers);
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

  // Mass update beers — must be registered BEFORE /:id to avoid Express routing conflict
  app.patch('/api/admin/beers/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });

      let updatedCount = 0;

      const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
      if (safeIds.length === 0) return res.status(400).json({ message: "ids array required" });
      const idList = safeIds.join(',');

      if (updates.nameStripPrefix && typeof updates.nameStripPrefix === 'string' && updates.nameStripPrefix.trim()) {
        const prefix = updates.nameStripPrefix;
        await pool.query(
          `UPDATE beers SET name = TRIM(CASE WHEN LOWER(name) LIKE $1 || '%' THEN SUBSTRING(name FROM $2::int) ELSE name END) WHERE id IN (${idList})`,
          [prefix.toLowerCase(), prefix.length + 1]
        );
        updatedCount = safeIds.length;
      }

      if (updates.nameFindReplace && typeof updates.nameFindReplace === 'object' && updates.nameFindReplace.find) {
        const { find, replace = '' } = updates.nameFindReplace as { find: string; replace?: string };
        if (find.trim()) {
          await pool.query(
            `UPDATE beers SET name = TRIM(REPLACE(name, $1, $2)) WHERE id IN (${idList})`,
            [find, replace]
          );
          updatedCount = safeIds.length;
        }
      }

      const allowed = ['style', 'color', 'abv', 'ibu', 'is_gluten_free', 'is_alcohol_free'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length > 0) {
        const keys = Object.keys(safeUpdates);
        const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        const values = Object.values(safeUpdates);
        await pool.query(`UPDATE beers SET ${setClauses} WHERE id IN (${idList})`, values);
        updatedCount = safeIds.length;
      }

      if (updatedCount === 0) return res.status(400).json({ message: "Nessun campo valido da aggiornare" });
      res.json({ updated: updatedCount });
    } catch (error) {
      console.error("Mass update beers error:", error);
      res.status(500).json({ message: "Failed to mass update beers" });
    }
  });

  // Mass update breweries — must be before /:id
  app.patch('/api/admin/breweries/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
      if (safeIds.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['country', 'region', 'location', 'city', 'website_url'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = Object.values(safeUpdates);
      await pool.query(`UPDATE breweries SET ${setClauses} WHERE id IN (${safeIds.join(',')})`, values);
      res.json({ updated: safeIds.length });
    } catch (error) {
      console.error("Mass update breweries error:", error);
      res.status(500).json({ message: "Failed to mass update breweries" });
    }
  });

  // Mass update pubs — must be before /:id
  app.patch('/api/admin/pubs/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
      if (safeIds.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['city', 'region', 'country'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = Object.values(safeUpdates);
      await pool.query(`UPDATE pubs SET ${setClauses} WHERE id IN (${safeIds.join(',')})`, values);
      res.json({ updated: safeIds.length });
    } catch (error) {
      console.error("Mass update pubs error:", error);
      res.status(500).json({ message: "Failed to mass update pubs" });
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

      // Real reviews from user_beer_tastings (the canonical reviews table)
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const status = (req.query.status as string) || 'all';
      const allReviews = await db.execute(sql`
        SELECT
          t.id,
          t.user_id  AS "userId",
          t.beer_id  AS "beerId",
          t.pub_id   AS "pubId",
          t.rating::float AS rating,
          t.personal_notes AS comment,
          CASE WHEN t.owner_reply IS NOT NULL THEN 'replied' ELSE 'approved' END AS status,
          t.created_at AS "createdAt",
          t.tasted_at  AS "tastedAt",
          json_build_object('name', b.name, 'brewery', br.name) AS beer,
          CASE WHEN p.id IS NOT NULL
            THEN json_build_object('name', p.name)
            ELSE NULL END AS pub,
          json_build_object(
            'firstName', u.first_name,
            'lastName',  u.last_name,
            'nickname',  u.nickname,
            'email',     u.email
          ) AS "user"
        FROM user_beer_tastings t
        INNER JOIN beers b      ON b.id  = t.beer_id
        LEFT  JOIN breweries br ON br.id = b.brewery_id
        LEFT  JOIN pubs p       ON p.id  = t.pub_id
        LEFT  JOIN users u      ON u.id  = t.user_id
        WHERE t.rating IS NOT NULL
          ${status === 'replied'  ? sql`AND t.owner_reply IS NOT NULL` : sql``}
          ${status === 'unreplied'? sql`AND t.owner_reply IS NULL`     : sql``}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      res.json((allReviews as any).rows ?? allReviews);
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

      // Reviews in user_beer_tastings are already user-published; "approve" simply
      // ensures any associated report is resolved (no-op when there's none).
      const id = parseInt(req.params.id);
      try {
        await db.update(reviewReports)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(eq(reviewReports.reviewId, id));
      } catch {}
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

      // Reject = delete the user_beer_tastings row and resolve any related report.
      const id = parseInt(req.params.id);
      try {
        await db.update(reviewReports)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(eq(reviewReports.reviewId, id));
      } catch {}
      await db.delete(userBeerTastings).where(eq(userBeerTastings.id, id));
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

      // Notify all users who have favorited this brewery
      try {
        const breweryFollowers = await db
          .select({ userId: favorites.userId })
          .from(favorites)
          .where(
            and(
              eq(favorites.itemType, 'brewery'),
              eq(favorites.itemId, assignedBreweryId),
            )
          );

        const breweryLabel = request.breweryName;
        const notifyPromises = breweryFollowers
          .filter(f => f.userId !== request.userId)
          .map(f =>
            sendPushToUser(f.userId, {
              title: '🛡️ Birrificio Verificato',
              body: `${breweryLabel} è ora un birrificio verificato su Fermenta.to!`,
              url: `/brewery/${assignedBreweryId}`,
              type: 'brewery_verified',
              tag: `brewery_verified_${assignedBreweryId}`,
            }).catch(() => {})
          );
        await Promise.allSettled(notifyPromises);
      } catch (followerNotifErr) {
        console.error('Error notifying brewery followers:', followerNotifErr);
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
          logoUrl: (request as any).logoUrl || null,
          coverImageUrl: (request as any).coverImageUrl || null,
        }).returning();
        createdId = created.id;
      } else {
        const [created] = await db.insert(beers).values({
          name: request.beerName!,
          style: request.style || 'Non specificato',
          abv: request.abv ? parseFloat(request.abv) : null,
          breweryId: request.breweryId || null,
          description: request.description || null,
          imageUrl: request.imageUrl || null,
          logoUrl: (request as any).logoUrl || null,
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

  // ======= PUB SUBSCRIPTION MANAGEMENT =======

  // List all pubs with subscription info
  app.get('/api/admin/pub-subscriptions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rows = await db
        .select({
          id: pubs.id,
          name: pubs.name,
          city: pubs.city,
          isVerified: pubs.isVerified,
          subscriptionStatus: pubs.subscriptionStatus,
          subscriptionExpiresAt: pubs.subscriptionExpiresAt,
          trialEndsAt: pubs.trialEndsAt,
          ownerId: pubs.ownerId,
          ownerEmail: users.email,
          ownerNickname: users.nickname,
        })
        .from(pubs)
        .leftJoin(users, eq(pubs.ownerId, users.id))
        .orderBy(desc(pubs.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching pub subscriptions:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Gift/extend a pub subscription (admin only)
  app.post('/api/admin/pubs/:id/gift-subscription', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const { months } = req.body;
      const m = parseInt(months) || 12;

      const [existing] = await db.select({
        subscriptionExpiresAt: pubs.subscriptionExpiresAt,
        subscriptionStatus: pubs.subscriptionStatus,
        ownerId: pubs.ownerId,
      }).from(pubs).where(eq(pubs.id, pubId));

      if (!existing) return res.status(404).json({ message: "Pub non trovato" });

      // Cancel any active or trialing Stripe subscription for the pub owner
      if (existing.ownerId) {
        try {
          const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, existing.ownerId));
          if (owner?.email) {
            const { getUncachableStripeClient } = await import("./stripeClient");
            const stripe = getUncachableStripeClient();
            const customers = await stripe.customers.list({ email: owner.email, limit: 1 });
            if (customers.data.length > 0) {
              const cid = customers.data[0].id;
              for (const status of ['trialing', 'active'] as const) {
                const subs = await stripe.subscriptions.list({ customer: cid, status, limit: 5 });
                for (const sub of subs.data) await stripe.subscriptions.cancel(sub.id);
              }
            }
          }
        } catch (stripeErr: any) {
          console.warn("Gift subscription: Stripe cancel warning:", stripeErr.message);
        }
      }

      const now = new Date();
      const base = existing.subscriptionExpiresAt && new Date(existing.subscriptionExpiresAt) > now
        ? new Date(existing.subscriptionExpiresAt)
        : now;
      base.setMonth(base.getMonth() + m);

      await db.update(pubs).set({
        isVerified: true,
        subscriptionStatus: 'gifted',
        subscriptionExpiresAt: base,
        trialEndsAt: null,
      }).where(eq(pubs.id, pubId));

      res.json({ message: `Abbonamento regalato per ${m} mesi`, expiresAt: base });
    } catch (error) {
      console.error("Error gifting subscription:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Revoke a pub subscription (admin only)
  app.post('/api/admin/pubs/:id/revoke-subscription', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      await db.update(pubs).set({
        isVerified: false,
        subscriptionStatus: 'none',
        subscriptionExpiresAt: null,
        trialEndsAt: null,
      }).where(eq(pubs.id, pubId));
      res.json({ message: "Abbonamento revocato" });
    } catch (error) {
      console.error("Error revoking subscription:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Activate trial for a pub (pub owner or admin)
  app.post('/api/pubs/:id/start-trial', isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = req.user?.id || req.user?.claims?.sub;
      const isAdminUser = (req.user as any)?.userType === 'admin';

      const [existing] = await db.select().from(pubs).where(eq(pubs.id, pubId));
      if (!existing) return res.status(404).json({ message: "Pub non trovato" });

      if (!isAdminUser && existing.ownerId !== userId) {
        return res.status(403).json({ message: "Non autorizzato" });
      }

      // Only allow if no prior subscription
      if (existing.subscriptionStatus !== 'none') {
        return res.status(400).json({ message: "Il pub ha già un abbonamento o ha già usato il periodo di prova" });
      }

      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 15);

      await db.update(pubs).set({
        isVerified: true,
        subscriptionStatus: 'trial',
        trialEndsAt: trialEnds,
      }).where(eq(pubs.id, pubId));

      res.json({ message: "Periodo di prova attivato (15 giorni)", trialEndsAt: trialEnds });
    } catch (error) {
      console.error("Error starting trial:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Activate paid subscription (pub owner - after payment confirmation)
  app.post('/api/pubs/:id/activate-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = req.user?.id || req.user?.claims?.sub;
      const isAdminUser = (req.user as any)?.userType === 'admin';

      const [existing] = await db.select().from(pubs).where(eq(pubs.id, pubId));
      if (!existing) return res.status(404).json({ message: "Pub non trovato" });

      if (!isAdminUser && existing.ownerId !== userId) {
        return res.status(403).json({ message: "Non autorizzato" });
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.update(pubs).set({
        isVerified: true,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
        trialEndsAt: null,
      }).where(eq(pubs.id, pubId));

      res.json({ message: "Abbonamento attivato per 1 anno", expiresAt });
    } catch (error) {
      console.error("Error activating subscription:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Update pub verify route to actually update DB
  app.patch("/api/admin/pubs/:id/verify-and-activate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await db.update(pubs).set({
        isVerified: true,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      }).where(eq(pubs.id, pubId));
      res.json({ message: "Pub verificato e abbonamento attivato", pubId });
    } catch (error) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Admin scan logs
  app.get('/api/admin/scan-logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const rows = await db
        .select({
          id: scanLogs.id,
          userId: scanLogs.userId,
          imageUrl: scanLogs.imageUrl,
          ocrText: scanLogs.ocrText,
          ocrEngine: scanLogs.ocrEngine,
          source: scanLogs.source,
          usedQuery: scanLogs.usedQuery,
          topCandidates: scanLogs.topCandidates,
          chosenBeerId: scanLogs.chosenBeerId,
          chosenBreweryId: scanLogs.chosenBreweryId,
          wasCorrect: scanLogs.wasCorrect,
          latencyMs: scanLogs.latencyMs,
          createdAt: scanLogs.createdAt,
          userNickname: users.nickname,
          beerName: beers.name,
          beerStyle: beers.style,
          beerLogoUrl: beers.imageUrl,
          breweryName: breweries.name,
        })
        .from(scanLogs)
        .leftJoin(users, eq(scanLogs.userId, users.id))
        .leftJoin(beers, eq(scanLogs.chosenBeerId, beers.id))
        .leftJoin(breweries, eq(scanLogs.chosenBreweryId, breweries.id))
        .orderBy(desc(scanLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db.select({ total: count() }).from(scanLogs);

      res.json({ logs: rows, total, limit, offset });
    } catch (error) {
      console.error("Error fetching admin scan logs:", error);
      res.status(500).json({ message: "Errore" });
    }
  });
}