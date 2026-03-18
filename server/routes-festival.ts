import type { Express } from "express";
import { db } from "./db";
import { isAuthenticated, isAdmin } from "./auth";
import {
  festivals, festivalTaps, festivalFoodItems, festivalRatings,
  beers, breweries,
} from "@shared/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";

function isFestivalManager(req: any): boolean {
  if (!req.isAuthenticated()) return false;
  const user = req.user as any;
  if (user.roles?.includes("admin") || user.activeRole === "admin") return true;
  return false; // expanded per-festival ownership check happens inside each route
}

function canManageFestival(req: any, festival: any): boolean {
  if (!req.isAuthenticated()) return false;
  const user = req.user as any;
  if (user.roles?.includes("admin") || user.activeRole === "admin") return true;
  if (festival.ownerId && festival.ownerId === user.id) return true;
  return false;
}

export function registerFestivalRoutes(app: Express) {
  // ── Public: list all active/past festivals (directory page) ──────────────────
  // IMPORTANT: must be registered BEFORE /api/festivals/:slug to avoid "public" being treated as a slug
  app.get("/api/festivals/public", async (_req, res) => {
    try {
      const rows = await db.select({
        id: festivals.id,
        name: festivals.name,
        slug: festivals.slug,
        description: festivals.description,
        location: festivals.location,
        startDate: festivals.startDate,
        endDate: festivals.endDate,
        isActive: festivals.isActive,
        logoUrl: festivals.logoUrl,
        coverImageUrl: festivals.coverImageUrl,
      })
      .from(festivals)
      .where(eq(festivals.isActive, true))
      .orderBy(festivals.startDate);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Public: get festival by slug ────────────────────────────────────────────
  app.get("/api/festivals/:slug", async (req, res) => {
    try {
      const [festival] = await db.select().from(festivals)
        .where(eq(festivals.slug, req.params.slug)).limit(1);
      if (!festival) return res.status(404).json({ message: "Festival non trovato" });
      if (!festival.isActive) return res.status(403).json({ message: "Festival non ancora attivato" });

      const taps = await db.select({
        id: festivalTaps.id,
        tapNumber: festivalTaps.tapNumber,
        beerId: festivalTaps.beerId,
        customBeerName: festivalTaps.customBeerName,
        customBreweryName: festivalTaps.customBreweryName,
        style: festivalTaps.style,
        abv: festivalTaps.abv,
        notes: festivalTaps.notes,
        isAvailable: festivalTaps.isAvailable,
        tapType: festivalTaps.tapType,
        updatedAt: festivalTaps.updatedAt,
        beerName: beers.name,
        beerStyle: beers.style,
        beerAbv: beers.abv,
        beerImageUrl: beers.imageUrl,
        breweryId: breweries.id,
        breweryName: breweries.name,
        breweryLogoUrl: breweries.logoUrl,
        avgRating: sql<number | null>`ROUND(AVG(${festivalRatings.rating})::numeric, 1)`,
        ratingCount: sql<number>`COUNT(${festivalRatings.id})`,
      })
      .from(festivalTaps)
      .leftJoin(beers, eq(festivalTaps.beerId, beers.id))
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .leftJoin(festivalRatings, eq(festivalTaps.id, festivalRatings.tapId))
      .where(eq(festivalTaps.festivalId, festival.id))
      .groupBy(festivalTaps.id, beers.name, beers.style, beers.abv, beers.imageUrl, breweries.id, breweries.name, breweries.logoUrl)
      .orderBy(festivalTaps.tapNumber);

      const food = festival.showFood
        ? await db.select().from(festivalFoodItems).where(eq(festivalFoodItems.festivalId, festival.id))
        : [];

      // User's own ratings for this festival (if authenticated)
      let userRatings: Record<number, number> = {};
      if ((req as any).isAuthenticated?.()) {
        const uid = (req as any).user?.id;
        const ur = await db.select({ tapId: festivalRatings.tapId, rating: festivalRatings.rating })
          .from(festivalRatings)
          .where(and(eq(festivalRatings.festivalId, festival.id), eq(festivalRatings.userId, uid)));
        ur.forEach(r => { userRatings[r.tapId] = r.rating; });
      }

      res.json({
        festival,
        taps: taps.map(t => ({
          ...t,
          avgRating: t.avgRating ? parseFloat(String(t.avgRating)) : null,
          ratingCount: Number(t.ratingCount || 0),
          userRating: userRatings[t.id] ?? null,
        })),
        food,
      });
    } catch (err) {
      console.error("Error fetching festival:", err);
      res.status(500).json({ message: "Errore nel caricamento del festival" });
    }
  });

  // ── Public: rate a tap ───────────────────────────────────────────────────────
  app.post("/api/festivals/:slug/taps/:tapId/rate", isAuthenticated as any, async (req: any, res) => {
    try {
      const { rating } = req.body;
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return res.status(400).json({ message: "Voto deve essere tra 1 e 10" });
      }
      const tapId = parseInt(req.params.tapId);
      const [tap] = await db.select().from(festivalTaps).where(eq(festivalTaps.id, tapId)).limit(1);
      if (!tap) return res.status(404).json({ message: "Spina non trovata" });

      await db.insert(festivalRatings).values({
        festivalId: tap.festivalId,
        tapId,
        userId: req.user.id,
        rating,
      })
      .onConflictDoUpdate({
        target: [festivalRatings.tapId, festivalRatings.userId],
        set: { rating },
      });

      const [agg] = await db.select({
        avg: sql<number>`ROUND(AVG(${festivalRatings.rating})::numeric, 1)`,
        count: sql<number>`COUNT(*)`,
      }).from(festivalRatings).where(eq(festivalRatings.tapId, tapId));

      res.json({ avgRating: parseFloat(String(agg.avg)), ratingCount: Number(agg.count), userRating: rating });
    } catch (err) {
      console.error("Error rating tap:", err);
      res.status(500).json({ message: "Errore nel salvataggio del voto" });
    }
  });

  // ── Manager: list all festivals (admin or owner) ─────────────────────────────
  app.get("/api/admin/festivals", isAuthenticated as any, async (req: any, res) => {
    try {
      const user = req.user as any;
      const isAdminUser = user.roles?.includes("admin") || user.activeRole === "admin";
      const rows = isAdminUser
        ? await db.select().from(festivals).orderBy(festivals.createdAt)
        : await db.select().from(festivals).where(eq(festivals.ownerId, user.id)).orderBy(festivals.createdAt);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Public: register a festival (any authenticated user) ────────────────────
  app.post("/api/festivals/register", isAuthenticated as any, async (req: any, res) => {
    try {
      const user = req.user as any;
      const { name, slug, description, location, startDate, endDate, showFood, logoUrl, coverImageUrl, priceEur } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "Nome e slug obbligatori" });
      const [fest] = await db.insert(festivals).values({
        name, slug,
        description: description || null,
        location: location || null,
        startDate: startDate || null,
        endDate: endDate || null,
        showFood: showFood ?? true,
        ownerId: user.id,
        logoUrl: logoUrl || null,
        coverImageUrl: coverImageUrl || null,
        priceEur: priceEur ? parseInt(priceEur) : 50,
        isActive: false,
      }).returning();
      res.json(fest);
    } catch (err: any) {
      if (err.code === "23505") return res.status(400).json({ message: "Slug già in uso, scegliene un altro" });
      console.error("Error registering festival:", err);
      res.status(500).json({ message: "Errore nella creazione" });
    }
  });

  // ── Beer search for festival tap editing (authenticated) ─────────────────────
  app.get("/api/festival-beers/search", isAuthenticated as any, async (req: any, res) => {
    try {
      const { q, limit = 20 } = req.query;
      if (!q || String(q).trim().length < 2) return res.json([]);
      const pattern = `%${q}%`;
      const results = await db.select({
        id: beers.id,
        name: beers.name,
        style: beers.style,
        abv: beers.abv,
        breweryName: breweries.name,
      })
      .from(beers)
      .leftJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(or(ilike(beers.name, pattern), ilike(breweries.name, pattern)))
      .limit(parseInt(String(limit)));
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Errore nella ricerca" });
    }
  });

  // ── Manager: admin-free festival activation ───────────────────────────────────
  app.post("/api/admin/festivals/:id/activate-free", isAuthenticated as any, isAdmin as any, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db.update(festivals)
        .set({ isActive: true, paidAt: new Date(), priceEur: 0 })
        .where(eq(festivals.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Festival non trovato" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Errore nell'attivazione" });
    }
  });

  // ── Manager: create festival ─────────────────────────────────────────────────
  app.post("/api/admin/festivals", isAuthenticated as any, async (req: any, res) => {
    try {
      const user = req.user as any;
      const isAdminUser = user.roles?.includes("admin") || user.activeRole === "admin";
      if (!isAdminUser) return res.status(403).json({ message: "Non autorizzato" });
      const { name, slug, description, location, startDate, endDate, showFood, ownerId, logoUrl, coverImageUrl, priceEur, schedule } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "Nome e slug obbligatori" });
      const [fest] = await db.insert(festivals).values({
        name, slug,
        description: description || null,
        location: location || null,
        startDate: startDate || null,
        endDate: endDate || null,
        showFood: showFood ?? true,
        ownerId: ownerId || user.id,
        logoUrl: logoUrl || null,
        coverImageUrl: coverImageUrl || null,
        priceEur: priceEur ? parseInt(priceEur) : 50,
        isActive: false,
        ...(schedule !== undefined ? { schedule } : {}),
      }).returning();
      res.json(fest);
    } catch (err: any) {
      if (err.code === "23505") return res.status(400).json({ message: "Slug già in uso" });
      res.status(500).json({ message: "Errore nella creazione" });
    }
  });

  // ── Manager: update festival meta (PATCH + PUT) ──────────────────────────────
  async function handleUpdateFestival(req: any, res: any) {
    try {
      const festId = parseInt(req.params.id);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest) return res.status(404).json({ message: "Festival non trovato" });
      if (!canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      const {
        name, description, location, startDate, endDate,
        isActive, showFood, logoUrl, coverImageUrl, priceEur, slug, schedule,
      } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location;
      if (startDate !== undefined) updateData.startDate = startDate || null;
      if (endDate !== undefined) updateData.endDate = endDate || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (showFood !== undefined) updateData.showFood = showFood;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
      if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl || null;
      if (priceEur !== undefined) updateData.priceEur = priceEur;
      if (slug !== undefined && slug !== fest.slug) updateData.slug = slug;
      if (schedule !== undefined) updateData.schedule = schedule;
      const [updated] = await db.update(festivals)
        .set(updateData)
        .where(eq(festivals.id, festId)).returning();
      res.json(updated);
    } catch (err: any) {
      if (err.code === "23505") return res.status(400).json({ message: "Slug già in uso" });
      res.status(500).json({ message: "Errore nel salvataggio" });
    }
  }
  app.patch("/api/admin/festivals/:id", isAuthenticated as any, handleUpdateFestival);
  app.put("/api/admin/festivals/:id", isAuthenticated as any, handleUpdateFestival);

  // ── Manager: upsert tap ──────────────────────────────────────────────────────
  app.put("/api/admin/festivals/:id/taps/:tapNumber", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const tapNumber = parseInt(req.params.tapNumber);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest || !canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      const { beerId, customBeerName, customBreweryName, style, abv, notes, isAvailable, tapType } = req.body;
      const [tap] = await db.insert(festivalTaps).values({
        festivalId: festId,
        tapNumber,
        beerId: beerId || null,
        customBeerName: customBeerName || null,
        customBreweryName: customBreweryName || null,
        style: style || null,
        abv: abv || null,
        notes: notes || null,
        isAvailable: isAvailable ?? true,
        tapType: tapType || "spina",
      })
      .onConflictDoUpdate({
        target: [festivalTaps.festivalId, festivalTaps.tapNumber],
        set: { beerId: beerId || null, customBeerName, customBreweryName, style, abv, notes, isAvailable, tapType: tapType || "spina", updatedAt: new Date() },
      })
      .returning();
      res.json(tap);
    } catch (err) {
      console.error("upsert tap error:", err);
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Manager: toggle tap availability ────────────────────────────────────────
  app.patch("/api/admin/festivals/:id/taps/:tapId/toggle", isAuthenticated as any, async (req: any, res) => {
    try {
      const tapId = parseInt(req.params.tapId);
      const [tap] = await db.select().from(festivalTaps).where(eq(festivalTaps.id, tapId)).limit(1);
      if (!tap) return res.status(404).json({ message: "Spina non trovata" });
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, tap.festivalId)).limit(1);
      if (!canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      const [updated] = await db.update(festivalTaps)
        .set({ isAvailable: !tap.isAvailable, updatedAt: new Date() })
        .where(eq(festivalTaps.id, tapId)).returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Manager: bulk create taps (N spine vuote) ────────────────────────────────
  app.post("/api/admin/festivals/:id/taps/bulk", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest || !canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      const { count } = req.body;
      const n = Math.min(parseInt(count) || 10, 200);
      for (let i = 1; i <= n; i++) {
        await db.insert(festivalTaps).values({ festivalId: festId, tapNumber: i })
          .onConflictDoNothing();
      }
      const taps = await db.select().from(festivalTaps).where(eq(festivalTaps.festivalId, festId)).orderBy(festivalTaps.tapNumber);
      res.json(taps);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Manager: food items CRUD ─────────────────────────────────────────────────
  app.get("/api/admin/festivals/:id/food", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const items = await db.select().from(festivalFoodItems).where(eq(festivalFoodItems.festivalId, festId));
      res.json(items);
    } catch (err) { res.status(500).json({ message: "Errore" }); }
  });

  app.post("/api/admin/festivals/:id/food", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest || !canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      const { name, description, price, category, allergens } = req.body;
      const [item] = await db.insert(festivalFoodItems).values({ festivalId: festId, name, description, price, category, allergens: allergens ?? null }).returning();
      res.json(item);
    } catch (err) { res.status(500).json({ message: "Errore" }); }
  });

  app.patch("/api/admin/festivals/food/:itemId", isAuthenticated as any, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { name, description, price, category, isAvailable, allergens } = req.body;
      const updateData: any = { name, description, price, category, isAvailable };
      if (allergens !== undefined) updateData.allergens = allergens;
      const [item] = await db.update(festivalFoodItems).set(updateData)
        .where(eq(festivalFoodItems.id, itemId)).returning();
      res.json(item);
    } catch (err) { res.status(500).json({ message: "Errore" }); }
  });

  app.delete("/api/admin/festivals/food/:itemId", isAuthenticated as any, async (req: any, res) => {
    try {
      await db.delete(festivalFoodItems).where(eq(festivalFoodItems.id, parseInt(req.params.itemId)));
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ message: "Errore" }); }
  });

  // ── Manager: dashboard stats ─────────────────────────────────────────────────
  app.get("/api/admin/festivals/:id/stats", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest || !canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });

      const [totals] = await db.select({
        totalTaps: sql<number>`COUNT(*)`,
        availableTaps: sql<number>`COUNT(*) FILTER (WHERE is_available = true)`,
        totalRatings: sql<number>`(SELECT COUNT(*) FROM festival_ratings WHERE festival_id = ${festId})`,
      }).from(festivalTaps).where(eq(festivalTaps.festivalId, festId));

      const topTaps = await db.select({
        tapId: festivalRatings.tapId,
        tapNumber: festivalTaps.tapNumber,
        customBeerName: festivalTaps.customBeerName,
        beerName: beers.name,
        avg: sql<number>`ROUND(AVG(${festivalRatings.rating})::numeric, 1)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(festivalRatings)
      .innerJoin(festivalTaps, eq(festivalRatings.tapId, festivalTaps.id))
      .leftJoin(beers, eq(festivalTaps.beerId, beers.id))
      .where(eq(festivalRatings.festivalId, festId))
      .groupBy(festivalRatings.tapId, festivalTaps.tapNumber, festivalTaps.customBeerName, beers.name)
      .orderBy(sql`AVG(${festivalRatings.rating}) DESC`)
      .limit(10);

      res.json({
        totalTaps: Number(totals.totalTaps),
        availableTaps: Number(totals.availableTaps),
        totalRatings: Number(totals.totalRatings),
        topTaps: topTaps.map(t => ({
          tapNumber: t.tapNumber,
          beerName: t.beerName || t.customBeerName || `Spina ${t.tapNumber}`,
          avg: parseFloat(String(t.avg)),
          count: Number(t.count),
        })),
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Stripe: create one-time checkout for festival ────────────────────────────
  app.post("/api/stripe/festival-checkout", isAuthenticated as any, async (req: any, res) => {
    try {
      const { festivalId, isRenewal } = req.body;
      if (!festivalId) return res.status(400).json({ message: "festivalId obbligatorio" });

      const [fest] = await db.select().from(festivals).where(eq(festivals.id, parseInt(festivalId))).limit(1);
      if (!fest) return res.status(404).json({ message: "Festival non trovato" });
      if (!canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "fermenta.to";
      const baseUrl = `https://${domain}`;
      const priceEur = fest.priceEur ?? 99;

      const userEmail = req.user?.email;
      const userName = req.user?.firstName || req.user?.username || "";

      const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string;
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: userName,
          metadata: { fermenta_user_id: String(req.user.id) },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: priceEur * 100,
            product_data: {
              name: `${isRenewal ? "Rinnovo" : "Attivazione"} Festival — ${fest.name}`,
              description: `Fermenta.to Festival Mode — accesso completo per la durata dell'evento`,
              metadata: { festivalId: String(fest.id), fermenta_type: "festival" },
            },
          },
        }],
        success_url: `${baseUrl}/festival-dashboard?checkout_success=1&festival_id=${fest.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/festival-dashboard?festival_id=${fest.id}`,
        locale: "it",
        metadata: {
          fermenta_user_id: String(req.user.id),
          festival_id: String(fest.id),
          fermenta_type: "festival",
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error("Festival checkout error:", err.message);
      res.status(500).json({ message: "Errore nel pagamento: " + err.message });
    }
  });

  // ── Stripe: activate festival after successful payment ───────────────────────
  app.post("/api/stripe/activate-festival", isAuthenticated as any, async (req: any, res) => {
    try {
      const { sessionId, festivalId } = req.body;
      if (!sessionId || !festivalId) return res.status(400).json({ message: "Dati mancanti" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ message: "Pagamento non completato" });
      }

      const festId = parseInt(festivalId);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId)).limit(1);
      if (!fest || !canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });

      const [updated] = await db.update(festivals)
        .set({ isActive: true, paidAt: new Date(), stripeSessionId: sessionId })
        .where(eq(festivals.id, festId))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error("Festival activation error:", err.message);
      res.status(500).json({ message: "Errore nell'attivazione: " + err.message });
    }
  });

  // ── Admin: manually activate festival (gifted/test) ─────────────────────────
  app.post("/api/admin/festivals/:id/activate", isAuthenticated as any, async (req: any, res) => {
    try {
      const user = req.user as any;
      const isAdminUser = user.roles?.includes("admin") || user.activeRole === "admin";
      if (!isAdminUser) return res.status(403).json({ message: "Non autorizzato" });
      const [updated] = await db.update(festivals)
        .set({ isActive: true, paidAt: new Date() })
        .where(eq(festivals.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // ── Delete festival (owner or admin) ─────────────────────────────────────────
  app.delete("/api/festivals/:id", isAuthenticated as any, async (req: any, res) => {
    try {
      const festId = parseInt(req.params.id);
      const [fest] = await db.select().from(festivals).where(eq(festivals.id, festId));
      if (!fest) return res.status(404).json({ message: "Festival non trovato" });
      if (!canManageFestival(req, fest)) return res.status(403).json({ message: "Non autorizzato" });
      await db.delete(festivalRatings).where(eq(festivalRatings.festivalId, festId));
      await db.delete(festivalFoodItems).where(eq(festivalFoodItems.festivalId, festId));
      await db.delete(festivalTaps).where(eq(festivalTaps.festivalId, festId));
      await db.delete(festivals).where(eq(festivals.id, festId));
      res.json({ message: `Festival "${fest.name}" eliminato con successo` });
    } catch (err: any) {
      console.error("Error deleting festival:", err);
      res.status(500).json({ message: err?.message || "Errore durante l'eliminazione" });
    }
  });
}
