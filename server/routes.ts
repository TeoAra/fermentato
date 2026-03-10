import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { registerAdminRoutes } from "./routes-admin";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import { upload, uploadImage, cloudinary } from "./cloudinary";
import { db } from "./db";
import { breweries, beers, pubs, users, tapList, bottleList, userBeerTastings, favorites, menuCategories, menuItems, pubSizes, notifications, pushSubscriptions, breweryRequests, pubEvents, breweryEvents, insertBreweryEventSchema, reviewReports, oauthAccounts, userActivities, ratings, publicanRequests, notificationPreferences } from "@shared/schema";

import { insertPubSchema, insertTapListSchema, insertBottleListSchema, insertMenuCategorySchema, insertMenuItemSchema, pubRegistrationSchema, insertPubEventSchema } from "@shared/schema";
import { z } from "zod";
import webpush from "web-push";
import { initVapid, sendPushToUser, sendPushToUserImmediate, sendPushToAdmins } from "./push-utils";
import { testSmtpConnection } from "./email";
import { translateToItalian, looksItalian } from "./translate";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';

// Simple in-memory search cache with TTL
const searchCache = new Map<string, { data: any; ts: number }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
function getCached(key: string) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SEARCH_CACHE_TTL) { searchCache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any) {
  if (searchCache.size > 500) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 100);
    oldest.forEach(([k]) => searchCache.delete(k));
  }
  searchCache.set(key, { data, ts: Date.now() });
}

if (initVapid()) {
  console.log('Web Push configured with VAPID keys');
} else {
  console.warn('VAPID keys not set - push notifications disabled');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication (email/password + Google OAuth)
  try {
    await setupAuth(app);
    console.log("Authentication system initialized successfully");
  } catch (error: any) {
    console.error("Failed to initialize authentication:", error.message);
  }

  // Test SMTP connection at startup
  testSmtpConnection();

  // Register admin routes
  registerAdminRoutes(app);

  // Public routes - no authentication required
  
  // Get all pubs
  app.get("/api/pubs", async (req, res) => {
    try {
      const pubs = await storage.getPubs();
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
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
      const allBreweries = await storage.getBreweriesWithBeerCount();
      res.json(allBreweries);
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

  // Get top beer styles with counts (real data from DB)
  app.get("/api/beers/popular-styles", async (req, res) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 30);
      const rows = await db
        .select({
          style: beers.style,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(beers)
        .where(sql`${beers.style} IS NOT NULL AND ${beers.style} != ''`)
        .groupBy(beers.style)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(limit);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching popular styles:", error);
      res.status(500).json({ message: "Failed to fetch popular styles" });
    }
  });

  // Get real search suggestions (popular styles, top breweries, top cities)
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const cached = getCached('suggestions');
      if (cached) return res.json(cached);
      const [topStyles, topBreweries, topCities] = await Promise.all([
        db.select({ name: beers.style, count: sql<number>`COUNT(*)::int` })
          .from(beers)
          .where(sql`${beers.style} IS NOT NULL AND ${beers.style} != ''`)
          .groupBy(beers.style)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(12),
        db.select({ name: breweries.name })
          .from(breweries)
          .where(sql`${breweries.name} IS NOT NULL AND ${breweries.name} != ''`)
          .orderBy(sql`RANDOM()`)
          .limit(6),
        db.select({ name: pubs.city, count: sql<number>`COUNT(*)::int` })
          .from(pubs)
          .where(sql`${pubs.city} IS NOT NULL AND ${pubs.city} != ''`)
          .groupBy(pubs.city)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(6),
      ]);
      const result = {
        styles: topStyles.map(r => r.name).filter(Boolean),
        breweries: topBreweries.map(r => r.name).filter(Boolean),
        cities: topCities.map(r => r.name).filter(Boolean),
      };
      setCache('suggestions', result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
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
      // Auto-translate description in background if not Italian
      if (beer.description && !looksItalian(beer.description)) {
        translateToItalian(beer.description).then(async (translated) => {
          if (translated) {
            await db.execute(sql`UPDATE beers SET description = ${translated} WHERE id = ${beerId}`);
          }
        }).catch(() => {});
      }
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

  // Explore breweries (paginated, filterable by name + country)
  app.get("/api/breweries/explore", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const country = (req.query.country as string) || "";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(60, parseInt(req.query.limit as string) || 48);
      const result = await storage.exploreBreweries(q, country, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error exploring breweries:", error);
      res.status(500).json({ message: "Failed to explore breweries" });
    }
  });

  // Get all brewery countries with counts
  app.get("/api/breweries/countries", async (req, res) => {
    try {
      const countries = await storage.getBreweryCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching brewery countries:", error);
      res.status(500).json({ message: "Failed to fetch brewery countries" });
    }
  });

  // Search breweries (public, for registration)
  app.get("/api/breweries/search", async (req, res) => {
    try {
      const query = req.query.q as string || req.query.query as string || '';
      if (query.length < 2) return res.json([]);
      const results = await storage.searchBreweries(query);
      res.json(results.slice(0, 10));
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
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
      // Fetch beers with avg rating, review count, and favorite count in one query
      const beerRows = await db.select({
        id: beers.id,
        name: beers.name,
        style: beers.style,
        abv: beers.abv,
        ibu: beers.ibu,
        color: beers.color,
        description: beers.description,
        imageUrl: beers.imageUrl,
        breweryId: beers.breweryId,
        isGlutenFree: beers.isGlutenFree,
        isAlcoholFree: beers.isAlcoholFree,
        avgRating: sql<number>`ROUND(AVG(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN ${userBeerTastings.rating} END)::numeric, 2)`,
        reviewCount: sql<number>`COUNT(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN 1 END)`,
        favoriteCount: sql<number>`(SELECT COUNT(*) FROM favorites f WHERE f.item_type = 'beer' AND f.item_id = ${beers.id})`,
      })
      .from(beers)
      .leftJoin(userBeerTastings, eq(beers.id, userBeerTastings.beerId))
      .where(eq(beers.breweryId, breweryId))
      .groupBy(beers.id)
      .orderBy(beers.name);

      const result = beerRows.map(b => ({
        ...b,
        avgRating: b.avgRating ? parseFloat(String(b.avgRating)) : null,
        reviewCount: Number(b.reviewCount || 0),
        favoriteCount: Number(b.favoriteCount || 0),
      }));
      res.json(result);
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
        if ((req.user as any)?.id) {
          const userId = (req.user as any).id;
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

  app.get("/api/cast-config", (_req, res) => {
    const appId = process.env.CAST_APP_ID || '';
    res.json({ appId: appId || null });
  });

  app.get("/api/pubs/:id/taplist-image", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      if (isNaN(pubId)) return res.status(400).json({ message: "Invalid pub ID" });

      const pub = await storage.getPub(pubId);
      if (!pub) return res.status(404).json({ message: "Pub not found" });

      const tapList = await storage.getTapList(pubId);
      const activeTaps = tapList.filter((t: any) => t.isActive);

      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const W = 1920;
      const H = 1080;
      const headerH = 80;
      const footerH = 30;
      const padding = 24;
      const gridGap = 16;
      const contentH = H - headerH - footerH - padding * 2;
      const contentW = W - padding * 2;

      const count = activeTaps.length;
      let cols: number, rows: number;
      if (count <= 2) { cols = 2; rows = 1; }
      else if (count <= 4) { cols = 2; rows = 2; }
      else if (count <= 6) { cols = 2; rows = 3; }
      else if (count <= 9) { cols = 3; rows = 3; }
      else { cols = 3; rows = 4; }

      const cardW = (contentW - (cols - 1) * gridGap) / cols;
      const cardH = (contentH - (rows - 1) * gridGap) / rows;

      const pubName = esc(pub.name || 'Pub');
      const now = new Date();
      const timeStr = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
      const dateStr = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });

      let cards = '';
      activeTaps.slice(0, cols * rows).forEach((tap: any, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = padding + col * (cardW + gridGap);
        const cy = headerH + padding + row * (cardH + gridGap);

        const beerName = esc(tap.beer?.name || tap.customBeerName || tap.beerName || 'Birra');
        const brewery = esc(tap.beer?.brewery?.name || tap.breweryName || '');
        const style = esc(tap.beer?.style || tap.beerStyle || '');
        const abv = (tap.beer?.abv || tap.beerAbv) ? `${tap.beer?.abv || tap.beerAbv}%` : '';
        const tapNum = tap.tapNumber || i + 1;
        const prices = Array.isArray(tap.prices) ? tap.prices : [];

        const nameSize = count <= 4 ? 32 : count <= 6 ? 26 : 22;
        const brewSize = count <= 4 ? 20 : count <= 6 ? 17 : 14;
        const badgeSize = count <= 4 ? 16 : count <= 6 ? 13 : 11;
        const priceSize = count <= 4 ? 28 : count <= 6 ? 22 : 18;
        const priceLabelSize = count <= 4 ? 13 : count <= 6 ? 11 : 9;
        const circleR = count <= 4 ? 50 : count <= 6 ? 38 : 30;

        cards += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="16" fill="rgba(31,41,55,0.7)" stroke="rgba(75,85,99,0.4)" stroke-width="1"/>`;

        cards += `<circle cx="${cx + 20 + circleR}" cy="${cy + cardH/2}" r="${circleR}" fill="rgba(55,65,81,0.6)" stroke="rgba(245,158,11,0.25)" stroke-width="2"/>`;
        cards += `<text x="${cx + 20 + circleR}" y="${cy + cardH/2 + 6}" fill="rgba(245,158,11,0.5)" font-size="${circleR * 0.7}" font-family="sans-serif" text-anchor="middle" font-weight="bold">🍺</text>`;

        const numR = count <= 4 ? 18 : count <= 6 ? 15 : 12;
        cards += `<circle cx="${cx + cardW - 20}" cy="${cy + 20}" r="${numR}" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>`;
        cards += `<text x="${cx + cardW - 20}" y="${cy + 20 + numR * 0.35}" fill="#F59E0B" font-size="${numR}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${tapNum}</text>`;

        const textX = cx + 20 + circleR * 2 + 16;
        const textMaxW = cardW - (20 + circleR * 2 + 16) - 30;
        let textY = cy + cardH * 0.28;

        cards += `<text x="${textX}" y="${textY}" fill="white" font-size="${nameSize}" font-weight="bold" font-family="sans-serif"><tspan textLength="${Math.min(beerName.length * nameSize * 0.55, textMaxW)}" lengthAdjust="spacingAndGlyphs">${beerName}</tspan></text>`;
        textY += nameSize + 4;

        if (brewery) {
          cards += `<text x="${textX}" y="${textY}" fill="rgba(245,158,11,0.8)" font-size="${brewSize}" font-family="sans-serif" font-weight="500">${brewery}</text>`;
          textY += brewSize + 8;
        }

        let badgeX = textX;
        if (style) {
          const stylePadX = 12;
          const styleW = style.length * badgeSize * 0.55 + stylePadX * 2;
          cards += `<rect x="${badgeX}" y="${textY - badgeSize + 2}" width="${styleW}" height="${badgeSize + 8}" rx="${(badgeSize + 8) / 2}" fill="rgba(55,65,81,0.7)" stroke="rgba(75,85,99,0.4)" stroke-width="1"/>`;
          cards += `<text x="${badgeX + stylePadX}" y="${textY + 4}" fill="#D1D5DB" font-size="${badgeSize}" font-family="sans-serif">${style}</text>`;
          badgeX += styleW + 8;
        }
        if (abv) {
          const abvPadX = 10;
          const abvW = abv.length * badgeSize * 0.6 + abvPadX * 2;
          cards += `<rect x="${badgeX}" y="${textY - badgeSize + 2}" width="${abvW}" height="${badgeSize + 8}" rx="${(badgeSize + 8) / 2}" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.25)" stroke-width="1"/>`;
          cards += `<text x="${badgeX + abvPadX}" y="${textY + 4}" fill="#F59E0B" font-size="${badgeSize}" font-family="sans-serif" font-weight="bold">${abv}</text>`;
        }

        if (prices.length > 0) {
          textY += badgeSize + 18;
          let priceX = textX;
          prices.forEach((p: any) => {
            const size = esc(p.size || '');
            const price = `€${parseFloat(p.price || "0").toFixed(1)}`;
            if (size) {
              cards += `<text x="${priceX}" y="${textY - 8}" fill="#9CA3AF" font-size="${priceLabelSize}" font-family="sans-serif" text-transform="uppercase">${size}</text>`;
            }
            cards += `<text x="${priceX}" y="${textY + priceSize * 0.6}" fill="white" font-size="${priceSize}" font-family="sans-serif" font-weight="bold">${price}</text>`;
            priceX += priceSize * 3.5;
          });
        }
      });

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#030712"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="${headerH}" fill="none"/>
  <line x1="0" y1="${headerH}" x2="${W}" y2="${headerH}" stroke="rgba(31,41,55,0.5)" stroke-width="1"/>

  <circle cx="${padding + 28}" cy="${headerH / 2}" r="24" fill="url(#title)"/>
  <text x="${padding + 28}" y="${headerH / 2 + 7}" fill="white" font-size="22" font-family="sans-serif" text-anchor="middle" font-weight="bold">🍺</text>

  <text x="${padding + 64}" y="${headerH / 2 - 6}" fill="url(#title)" font-size="32" font-weight="bold" font-family="sans-serif">${pubName}</text>
  <text x="${padding + 64}" y="${headerH / 2 + 18}" fill="#6B7280" font-size="14" font-family="sans-serif">${activeTaps.length} birre alla spina</text>

  <text x="${W - padding}" y="${headerH / 2 - 4}" fill="#D1D5DB" font-size="32" font-weight="bold" font-family="sans-serif" text-anchor="end">${timeStr}</text>
  <text x="${W - padding}" y="${headerH / 2 + 18}" fill="#6B7280" font-size="14" font-family="sans-serif" text-anchor="end">${dateStr}</text>

  ${cards}

  <text x="${W / 2}" y="${H - 8}" fill="rgba(75,85,99,0.6)" font-size="12" font-family="sans-serif" text-anchor="middle">fermenta.to</text>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.send(svg);
    } catch (error) {
      console.error("Error generating taplist image:", error);
      res.status(500).json({ message: "Failed to generate taplist image" });
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

  // Full menu endpoint: categories + all items in a single query (eliminates N+1)
  app.get("/api/pubs/:id/menu/full", async (req, res) => {
    try {
      const pubId = parseInt(req.params.id);
      if (isNaN(pubId)) return res.status(400).json({ message: "Invalid pub ID" });
      const menu = await storage.getMenuByPub(pubId);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      res.json(menu);
    } catch (error) {
      console.error("Error fetching full menu:", error);
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
      const result = await storage.getBreweriesWithBeerCount(limit, random);
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json(result);
    } catch (error) {
      console.error("Error fetching breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
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

      const glutenFree = req.query.glutenFree === 'true';
      const alcoholFree = req.query.alcoholFree === 'true';
      const style = (req.query.style as string) || undefined;
      const minAbv = req.query.minAbv ? parseFloat(req.query.minAbv as string) : undefined;
      const maxAbv = req.query.maxAbv ? parseFloat(req.query.maxAbv as string) : undefined;
      const minIbu = req.query.minIbu ? parseFloat(req.query.minIbu as string) : undefined;
      const maxIbu = req.query.maxIbu ? parseFloat(req.query.maxIbu as string) : undefined;

      const cacheKey = `search:${query}:${glutenFree}:${alcoholFree}:${style}:${minAbv}:${maxAbv}:${minIbu}:${maxIbu}`;
      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      const filters: any = {};
      if (glutenFree) filters.glutenFree = true;
      if (alcoholFree) filters.alcoholFree = true;
      if (style) filters.style = style;
      if (minAbv !== undefined) filters.minAbv = minAbv;
      if (maxAbv !== undefined) filters.maxAbv = maxAbv;
      if (minIbu !== undefined) filters.minIbu = minIbu;
      if (maxIbu !== undefined) filters.maxIbu = maxIbu;

      const [pubs, breweries, beersResult] = await Promise.all([
        storage.searchPubs(query),
        storage.searchBreweries(query),
        storage.searchBeers(query, filters),
      ]);

      const result = { pubs, breweries, beers: beersResult };
      setCache(cacheKey, result);
      res.setHeader('X-Cache', 'MISS');
      res.json(result);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Database statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const [pubCount, breweryCount, beerCount, reviewCount, eventCount] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(beers),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
        db.select({ count: sql<number>`(SELECT COUNT(*) FROM pub_events) + (SELECT COUNT(*) FROM brewery_events)` }),
      ]);
      const stats = {
        totalPubs: pubCount[0]?.count || 0,
        totalBreweries: breweryCount[0]?.count || 0,
        totalBeers: beerCount[0]?.count || 0,
        totalReviews: reviewCount[0]?.count || 0,
        totalEvents: eventCount[0]?.count || 0,
        averageBeersPerBrewery: breweryCount[0]?.count > 0 ? Math.round((beerCount[0]?.count || 0) / breweryCount[0].count) : 0,
        lastUpdated: new Date().toISOString()
      };
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
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

      const existingItems = await storage.getTapListByPubForOwner(parseInt(pubId));
      const existingItem = existingItems.find((t: any) => t.id === parseInt(id));
      const oldBeerId = existingItem?.beerId;
      
      const item = await storage.updateTapListItem(parseInt(id), data);
      console.log('Updated taplist item:', item);

      if (data.beerId && oldBeerId && data.beerId !== oldBeerId) {
        const newBeer = await storage.getBeer(data.beerId);
        if (newBeer) {
          notifyTapListChange(parseInt(pubId), 'tap_change', newBeer.name, newBeer.id);
        }
      }

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

      const tapItems = await storage.getTapListByPubForOwner(parseInt(pubId));
      const removedItem = tapItems.find((t: any) => t.id === parseInt(id));

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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user owns the pub or is admin
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to modify this pub's tap list" });
      }

      const tapData = insertTapListSchema.parse({ ...req.body, pubId });
      const tapItem = await storage.addToTapList(tapData);

      const beer = await storage.getBeer(tapData.beerId);
      if (beer) {
        notifyTapListChange(pubId, 'new_beer', beer.name, beer.id);
      }

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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
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
      const userId = (req.user as any)?.id;
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(parseInt(pubId));
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
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
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
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
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const itemId = parseInt(req.params.id);
      
      // Check if user is admin or owns the pub
      const user = await storage.getUser(userId);
      const existingPub = await storage.getPub(pubId);
      const effectiveRole = user?.activeRole || user?.userType;
      const isAdminRole = effectiveRole === 'admin';
      if (!existingPub || (!isAdminRole && existingPub.ownerId !== userId)) {
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

  // Update user profile (consolidated)
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const updates = { ...req.body };

      if (updates.profileImageUrl !== undefined && updates.lastProfileImageUpdate) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.lastProfileImageUpdate) {
          const lastUpdate = new Date(currentUser.lastProfileImageUpdate);
          const now = new Date();
          const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
          if (daysDiff < 15) {
            return res.status(400).json({
              message: `Puoi cambiare l'immagine del profilo solo ogni 15 giorni. Riprova tra ${Math.ceil(15 - daysDiff)} giorni.`
            });
          }
        }
      }

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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/:itemType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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

  // Delete favorite by ID
  app.delete("/api/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any).id;
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

  // Update nickname with 15-day restriction
  app.patch('/api/user/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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

  // Change or set user password
  app.patch("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "La nuova password deve essere di almeno 6 caratteri" });
      }

      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const bcrypt = await import("bcrypt");

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "Utente non trovato" });

      if (user.hashedPassword) {
        // Account con password — verifica quella attuale
        if (!currentPassword) {
          return res.status(400).json({ message: "Password attuale richiesta" });
        }
        const valid = await bcrypt.default.compare(currentPassword, user.hashedPassword);
        if (!valid) {
          return res.status(400).json({ message: "Password attuale non corretta" });
        }
      }
      // Account social senza password → imposta direttamente

      const hashed = await bcrypt.default.hash(newPassword, 12);
      await db.update(users).set({
        hashedPassword: hashed,
        passwordLastUpdated: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      res.json({ message: user.hashedPassword ? "Password aggiornata con successo" : "Password impostata con successo" });
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
        `user-${(req.user as any).id}-${Date.now()}`
      );

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Errore upload immagine" });
    }
  });

  app.get('/api/user-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const tastingId = parseInt(req.params.id);
      const { personalNotes, rating, pubId, format } = req.body;

      const updateData: any = {};
      if (personalNotes !== undefined) updateData.personalNotes = personalNotes;
      if (rating !== undefined) updateData.rating = rating;
      if (pubId !== undefined) updateData.pubId = pubId;
      if (format !== undefined) updateData.format = format;

      const updatedTasting = await storage.updateBeerTasting(tastingId, updateData, userId);
      res.json(updatedTasting);
    } catch (error) {
      console.error("Error updating beer tasting:", error);
      res.status(500).json({ message: "Failed to update beer tasting" });
    }
  });

  // Admin-only middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (!user || effectiveRole !== 'admin') {
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
      
      const effectiveRole = user.activeRole || user.userType;
      
      // Check if user is currently acting as admin
      if (effectiveRole === 'admin') {
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

  const notifyTapListChange = async (pubId: number, type: 'new_beer' | 'tap_change', beerName: string, beerId?: number) => {
    try {
      const pub = await storage.getPub(pubId);
      if (!pub) return;

      const titleMap = {
        new_beer: `Nuova birra alla spina!`,
        tap_change: `Cambio alla spina!`,
      };
      const messageMap = {
        new_beer: `${pub.name} ha aggiunto "${beerName}" alle spine.`,
        tap_change: `${pub.name} ha messo "${beerName}" alla spina.`,
      };

      const pubFavUserIds = await storage.getUsersWhoFavoritedPub(pubId);
      for (const userId of pubFavUserIds) {
        const prefs = await storage.getNotificationPreferences(userId);
        if (prefs && !prefs.tapChanges) continue;

        await storage.createNotification({
          userId,
          type,
          title: titleMap[type],
          message: messageMap[type],
          pubId,
          beerId: beerId ?? null,
          isRead: false,
        });

        sendPushToUser(userId, {
          title: titleMap[type],
          body: messageMap[type],
          url: `/pub/${pubId}`,
          type: 'tap_change',
        });
      }

      if (beerId) {
        const notifiedSet = new Set(pubFavUserIds);

        const beerFavUserIds = await storage.getUsersWhoFavoritedBeer(beerId);
        for (const userId of beerFavUserIds) {
          if (notifiedSet.has(userId)) continue;
          notifiedSet.add(userId);

          const prefs = await storage.getNotificationPreferences(userId);
          if (prefs && !prefs.tapChanges) continue;

          await storage.createNotification({
            userId,
            type: 'new_beer',
            title: `La tua birra preferita disponibile!`,
            message: `"${beerName}" è ora alla spina da ${pub.name}.`,
            pubId,
            beerId,
            isRead: false,
          });

          sendPushToUser(userId, {
            title: `La tua birra preferita disponibile!`,
            body: `"${beerName}" è ora alla spina da ${pub.name}.`,
            url: `/pub/${pubId}`,
            type: 'new_beer',
          });
        }

        const beer = await storage.getBeer(beerId);
        if (beer?.breweryId) {
          const breweryFavUserIds = await storage.getUsersWhoFavoritedBrewery(beer.breweryId);
          const brewery = await storage.getBrewery(beer.breweryId);
          const breweryName = brewery?.name || 'il tuo birrificio preferito';

          for (const userId of breweryFavUserIds) {
            if (notifiedSet.has(userId)) continue;
            notifiedSet.add(userId);

            const prefs = await storage.getNotificationPreferences(userId);
            if (prefs && !prefs.tapChanges) continue;

            await storage.createNotification({
              userId,
              type: 'new_beer',
              title: `Novità dal tuo birrificio preferito!`,
              message: `${pub.name} ha "${beerName}" di ${breweryName} alla spina.`,
              pubId,
              beerId,
              isRead: false,
            });

            sendPushToUser(userId, {
              title: `Novità dal tuo birrificio preferito!`,
              body: `${pub.name} ha "${beerName}" di ${breweryName} alla spina.`,
              url: `/pub/${pubId}`,
              type: 'new_beer',
            });
          }
        }
      }
    } catch (error) {
      console.error("Error sending tap change notifications:", error);
    }
  };

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [reviewCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(userBeerTastings).where(sql`${userBeerTastings.rating} IS NOT NULL`);
      const [tastingCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(userBeerTastings);
      const [pubEventCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(pubEvents);
      const [breweryEventCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(breweryEvents);

      const [userCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const [pubCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(pubs);
      const [breweryCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(breweries);
      const [beerCountResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(beers);

      const stats = {
        totalUsers: Number(userCountResult?.count || 0),
        totalPubs: Number(pubCountResult?.count || 0),
        totalBreweries: Number(breweryCountResult?.count || 0),
        totalBeers: Number(beerCountResult?.count || 0),
        totalReviews: Number(reviewCountResult?.count || 0),
        totalTastings: Number(tastingCountResult?.count || 0),
        totalEvents: Number(pubEventCountResult?.count || 0) + Number(breweryEventCountResult?.count || 0),
        lastUpdated: new Date().toISOString(),
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Batch translate beer descriptions to Italian
  app.post('/api/admin/translate-beers', isAuthenticated, isAdmin, async (req: any, res) => {
    const batchSize = Math.min(parseInt(req.query.batch as string) || 20, 50);
    const offsetVal = parseInt(req.query.offset as string) || 0;
    try {
      const rows = await db.execute(sql`
        SELECT id, description FROM beers
        WHERE description IS NOT NULL
          AND description != ''
          AND length(description) > 10
        ORDER BY id
        LIMIT ${batchSize} OFFSET ${offsetVal}
      `) as any;
      const beerList = rows.rows || rows;
      let translated = 0;
      let skipped = 0;
      for (const beer of beerList) {
        if (looksItalian(beer.description)) {
          skipped++;
          continue;
        }
        const result = await translateToItalian(beer.description);
        if (result) {
          await db.execute(sql`UPDATE beers SET description = ${result} WHERE id = ${beer.id}`);
          translated++;
        } else {
          skipped++;
        }
        await new Promise(r => setTimeout(r, 300));
      }
      res.json({ translated, skipped, processed: beerList.length, nextOffset: offsetVal + beerList.length });
    } catch (error) {
      console.error("Translation batch error:", error);
      res.status(500).json({ message: "Translation failed", error: String(error) });
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

  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const { userType } = req.body;
      if (!userType) return res.status(400).json({ message: "userType required" });
      await db.update(users).set({ userType }).where(eq(users.id, targetId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const target = await storage.getUser(targetId);
      if (!target) return res.status(404).json({ message: "Utente non trovato" });

      // Cannot delete yourself
      if (targetId === (req.user as any).id) {
        return res.status(400).json({ message: "Non puoi eliminare il tuo account" });
      }

      // Clean up all child records in FK-dependency order
      await db.delete(notifications).where(eq(notifications.userId, targetId));
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, targetId));
      await db.delete(favorites).where(eq(favorites.userId, targetId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.userId, targetId));
      await db.delete(ratings).where(eq(ratings.userId, targetId));
      await db.delete(userActivities).where(eq(userActivities.userId, targetId));
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, targetId));
      await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, targetId));

      // Disassociate pubs from this owner (don't delete the pub)
      await db.update(pubs).set({ ownerId: null }).where(eq(pubs.ownerId, targetId));

      // Nullify reviewed_by references (admin who reviewed requests)
      await db.update(publicanRequests).set({ reviewedBy: null }).where(eq(publicanRequests.reviewedBy, targetId));
      await db.update(breweryRequests).set({ reviewedBy: null }).where(eq(breweryRequests.reviewedBy, targetId));

      // Delete requests submitted by this user
      await db.delete(publicanRequests).where(eq(publicanRequests.userId, targetId));
      await db.delete(breweryRequests).where(eq(breweryRequests.userId, targetId));

      // Finally delete the user using raw SQL with RETURNING to confirm deletion
      const deleted = await db.execute(sql`DELETE FROM users WHERE id = ${targetId} RETURNING id`);
      
      if (!deleted.rows || deleted.rows.length === 0) {
        console.error(`[admin] Delete user ${targetId}: DELETE returned 0 rows - possible FK constraint or missing record`);
        // Try to get FK violations by querying remaining refs
        const refs = await db.execute(sql`
          SELECT 'notifications' as tbl, COUNT(*) FROM notifications WHERE user_id = ${targetId}
          UNION ALL SELECT 'favorites', COUNT(*) FROM favorites WHERE user_id = ${targetId}
          UNION ALL SELECT 'ratings', COUNT(*) FROM ratings WHERE user_id = ${targetId}
          UNION ALL SELECT 'pubs_owner', COUNT(*) FROM pubs WHERE owner_id = ${targetId}
        `);
        console.error("[admin] Remaining FK refs:", refs.rows);
        return res.status(500).json({ message: "Eliminazione fallita: il record non è stato rimosso dal database" });
      }

      console.log(`[admin] User ${targetId} deleted successfully`);
      res.json({ success: true, message: `Utente "${target.nickname || target.firstName || targetId}" eliminato` });
    } catch (error: any) {
      console.error("Error deleting user:", error?.message || error);
      res.status(500).json({ message: `Errore eliminazione: ${error?.message || "Errore sconosciuto"}` });
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

  app.get('/api/admin/pubs/search', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '50')), 100);
      if (!q) return res.json([]);
      const pattern = `%${q}%`;
      const results = await db.select().from(pubs)
        .where(sql`(${pubs.name} ILIKE ${pattern} OR ${pubs.city} ILIKE ${pattern} OR ${pubs.address} ILIKE ${pattern})`)
        .orderBy(pubs.name)
        .limit(limit);
      res.json(results);
    } catch (error) {
      console.error("Error searching pubs:", error);
      res.status(500).json({ message: "Failed to search pubs" });
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
      const userId = (req.user as any).id;
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
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ message: 'Servizio immagini non configurato. Contatta l\'amministratore.' });
      }

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
      const [beerCount, breweryCount, pubCount, userCount, styleCount, reviewCount, eventCount, topStyles, topBreweries] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)::int` }).from(beers),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
        db.select({ count: sql<number>`COUNT(DISTINCT style)::int` }).from(beers),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
        db.select({ count: sql<number>`(SELECT COUNT(*) FROM pub_events) + (SELECT COUNT(*) FROM brewery_events)` }),
        db.select({ style: beers.style, count: sql<number>`COUNT(*)::int` })
          .from(beers).groupBy(beers.style).orderBy(sql`COUNT(*) desc`).limit(10),
        db.select({
            breweryName: breweries.name,
            location: breweries.location,
            beerCount: sql<number>`COUNT(${beers.id})::int`
          })
          .from(breweries)
          .leftJoin(beers, eq(breweries.id, beers.breweryId))
          .groupBy(breweries.id, breweries.name, breweries.location)
          .orderBy(sql`COUNT(${beers.id}) desc`)
          .limit(10),
      ]);

      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json({
        totalBeers: beerCount[0]?.count || 0,
        totalBreweries: breweryCount[0]?.count || 0,
        totalPubs: pubCount[0]?.count || 0,
        totalUsers: userCount[0]?.count || 0,
        totalReviews: reviewCount[0]?.count || 0,
        totalEvents: eventCount[0]?.count || 0,
        uniqueStyles: styleCount[0]?.count || 0,
        topStyles,
        topBreweries,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
      res.status(500).json({ message: "Failed to fetch global statistics" });
    }
  });

  app.get('/api/recent-tap-changes', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const results = await db
        .selectDistinctOn([notifications.pubId, notifications.beerId], {
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          pubId: notifications.pubId,
          beerId: notifications.beerId,
          createdAt: notifications.createdAt,
          pubName: pubs.name,
          pubCity: pubs.city,
          pubLatitude: pubs.latitude,
          pubLongitude: pubs.longitude,
        })
        .from(notifications)
        .innerJoin(pubs, eq(notifications.pubId, pubs.id))
        .where(
          sql`${notifications.type} IN ('new_beer', 'tap_change') AND ${notifications.createdAt} > NOW() - INTERVAL '30 days'`
        )
        .orderBy(notifications.pubId, notifications.beerId, sql`${notifications.createdAt} DESC`)
        .limit(limit);

      const sorted = results.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      res.json(sorted);
    } catch (error) {
      console.error("Error fetching recent tap changes:", error);
      res.status(500).json({ message: "Failed to fetch recent tap changes" });
    }
  });

  // Flexible pricing system endpoints (owner or admin)
  app.post("/api/pubs/:id/taplist/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const pubId = parseInt(req.params.id);
      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to manage this pub" });
      }

      const itemId = parseInt(req.params.itemId);
      const { newBeerId } = req.body;
      
      const updatedItem = await storage.updateTapListItem(itemId, { beerId: newBeerId });

      const newBeer = await storage.getBeer(newBeerId);
      if (newBeer) {
        notifyTapListChange(pubId, 'tap_change', newBeer.name, newBeer.id);
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error replacing beer:", error);
      res.status(500).json({ message: "Failed to replace beer" });
    }
  });

  // Same for bottles (owner or admin)
  app.post("/api/pubs/:id/bottles/:itemId/prices", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any).id;
      const tastings = await storage.getUserBeerTastings(userId);
      res.json(tastings);
    } catch (error) {
      console.error("Error fetching user beer tastings:", error);
      res.status(500).json({ message: "Failed to fetch beer tastings" });
    }
  });

  app.post("/api/user/beer-tastings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const tastingData = { ...req.body, userId };
      const tasting = await storage.addBeerTasting(tastingData);
      res.status(201).json(tasting);
    } catch (error) {
      console.error("Error adding beer tasting:", error);
      res.status(500).json({ message: "Failed to add beer tasting" });
    }
  });

  app.delete("/api/user/beer-tastings/:beerId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const beerId = parseInt(req.params.beerId);
      await storage.removeBeerTasting(userId, beerId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error removing beer tasting:", error);
      res.status(500).json({ message: "Failed to remove beer tasting" });
    }
  });


  // Get user's available roles
  app.get("/api/auth/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const validRoles = ["customer", "pub_owner", "brewery_owner", "admin"];
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
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      const beerId = parseInt(req.params.beerId);
      const tasting = await storage.getUserBeerTasting(userId, beerId);
      res.json(tasting);
    } catch (error) {
      console.error("Error fetching user beer tasting:", error);
      res.status(500).json({ message: "Failed to fetch user beer tasting" });
    }
  });


  app.post("/api/reviews/:tastingId/report", isAuthenticated, async (req: any, res) => {
    try {
      const reporterId = (req.user as any).id;
      const tastingId = parseInt(req.params.tastingId);
      const { reason, description } = req.body;
      if (!reason) return res.status(400).json({ message: "Motivo obbligatorio" });
      const existing = await db.select({ id: reviewReports.id })
        .from(reviewReports)
        .where(eq(reviewReports.reviewId, tastingId))
        .limit(1);
      const alreadyReported = existing.some((r) => r.id);
      await db.insert(reviewReports).values({
        reviewId: tastingId,
        reporterId,
        reason,
        description: description || null,
      });
      res.json({ message: "Segnalazione inviata con successo" });
    } catch (error) {
      console.error("Error reporting review:", error);
      res.status(500).json({ message: "Errore nell'invio della segnalazione" });
    }
  });

  // Update user email
  app.patch("/api/user/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
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
      const userId = (req.user as any).id;
      
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

  // Search beers for admin (global search - multi-word, includes brewery name)
  app.get("/api/admin/beers/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { q: query = '', limit = 50 } = req.query;
      const queryStr = query.toString().trim();
      const limitNum = Math.min(parseInt(limit.toString()) || 50, 100);

      if (!queryStr) return res.json([]);

      const searchTerms = queryStr.toLowerCase().split(/\s+/).filter((t: string) => t.length > 0);
      
      const whereClauses = searchTerms.map(term => {
        const p = `%${term}%`;
        return sql`(LOWER(b.name) LIKE ${p} OR LOWER(b.style) LIKE ${p} OR LOWER(br.name) LIKE ${p} OR LOWER(br.location) LIKE ${p})`;
      });

      const results = await db.execute(sql`
        SELECT 
          b.id, b.name, b.style, b.abv, b.ibu, b.color, b.image_url AS "imageUrl",
          b.is_gluten_free AS "isGlutenFree", b.is_alcohol_free AS "isAlcoholFree",
          b.description, b.brewery_id AS "breweryId",
          JSON_BUILD_OBJECT(
            'id', br.id, 'name', br.name, 'location', br.location, 
            'country', br.country, 'logoUrl', br.logo_url
          ) AS brewery
        FROM beers b
        LEFT JOIN breweries br ON b.brewery_id = br.id
        WHERE ${sql.join(whereClauses, sql` AND `)}
        ORDER BY b.name ASC
        LIMIT ${limitNum}
      `);

      res.json(results.rows);
    } catch (error) {
      console.error("Error searching beers:", error);
      res.status(500).json({ message: "Failed to search beers" });
    }
  });

  // Search breweries for admin (global search - multi-word)
  app.get("/api/admin/breweries/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const queryStr = String(req.query.q || '').trim();
      const limitNum = Math.min(parseInt(String(req.query.limit || '50')), 100);

      if (!queryStr) return res.json([]);

      const searchTerms = queryStr.toLowerCase().split(/\s+/).filter((t: string) => t.length > 0);
      
      const whereClauses = searchTerms.map(term => {
        const p = `%${term}%`;
        return sql`(LOWER(name) LIKE ${p} OR LOWER(location) LIKE ${p} OR LOWER(country) LIKE ${p} OR LOWER(region) LIKE ${p})`;
      });

      const results = await db.select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        country: breweries.country,
        region: breweries.region,
        logoUrl: breweries.logoUrl,
        coverImageUrl: breweries.coverImageUrl,
        websiteUrl: breweries.websiteUrl,
      }).from(breweries)
        .where(sql.join(whereClauses, sql` AND `))
        .orderBy(breweries.name)
        .limit(limitNum);
      
      res.json(results);
    } catch (error) {
      console.error("Error searching breweries:", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  // Admin delete beer (cleans up related tap list, bottle list, tastings)
  app.delete("/api/admin/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer) {
        return res.status(404).json({ message: "Birra non trovata" });
      }
      await db.delete(tapList).where(eq(tapList.beerId, beerId));
      await db.delete(bottleList).where(eq(bottleList.beerId, beerId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.beerId, beerId));
      await db.delete(favorites).where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beerId)));
      await storage.deleteBeer(beerId);
      res.json({ message: `Birra "${beer.name}" eliminata con successo` });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione della birra" });
    }
  });

  // Admin delete brewery (also deletes its beers and their references)
  app.delete("/api/admin/breweries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const breweryId = parseInt(req.params.id);
      const brewery = await storage.getBrewery(breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Birrificio non trovato" });
      }
      const breweryBeers = await storage.getBeersByBrewery(breweryId);
      for (const beer of breweryBeers) {
        await db.delete(tapList).where(eq(tapList.beerId, beer.id));
        await db.delete(bottleList).where(eq(bottleList.beerId, beer.id));
        await db.delete(userBeerTastings).where(eq(userBeerTastings.beerId, beer.id));
        await db.delete(favorites).where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beer.id)));
        await storage.deleteBeer(beer.id);
      }
      await storage.deleteBrewery(breweryId);
      res.json({ message: `Birrificio "${brewery.name}" e ${breweryBeers.length} birre eliminate con successo` });
    } catch (error) {
      console.error("Error deleting brewery:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione del birrificio" });
    }
  });

  // Admin delete pub (cleans up related data)
  app.delete("/api/admin/pubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const pubId = parseInt(req.params.id);
      const pub = await storage.getPub(pubId);
      if (!pub) {
        return res.status(404).json({ message: "Pub non trovato" });
      }
      await db.delete(tapList).where(eq(tapList.pubId, pubId));
      await db.delete(bottleList).where(eq(bottleList.pubId, pubId));
      const cats = await db.select().from(menuCategories).where(eq(menuCategories.pubId, pubId));
      for (const cat of cats) {
        await db.delete(menuItems).where(eq(menuItems.categoryId, cat.id));
      }
      await db.delete(menuCategories).where(eq(menuCategories.pubId, pubId));
      await db.delete(pubSizes).where(eq(pubSizes.pubId, pubId));
      await db.delete(favorites).where(and(eq(favorites.itemType, 'pub'), eq(favorites.itemId, pubId)));
      await db.delete(pubEvents).where(eq(pubEvents.pubId, pubId));
      await storage.deletePub(pubId);
      res.json({ message: `Pub "${pub.name}" eliminato con successo` });
    } catch (error) {
      console.error("Error deleting pub:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione del pub" });
    }
  });

  app.get("/api/owner/breweries/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { q: query = '' } = req.query;
      const allBreweries = await storage.getBreweries();
      const filtered = allBreweries.filter(b =>
        b.name.toLowerCase().includes(query.toString().toLowerCase()) ||
        b.location?.toLowerCase().includes(query.toString().toLowerCase())
      ).slice(0, 20);
      res.json(filtered);
    } catch (error) {
      console.error("Error searching breweries (owner):", error);
      res.status(500).json({ message: "Failed to search breweries" });
    }
  });

  app.post("/api/owner/breweries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { name, location } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: "Nome e località sono obbligatori" });
      }

      const brewery = await storage.createBrewery({
        name: name.trim(),
        location: location.trim(),
        region: req.body.region?.trim() || "",
        description: req.body.description?.trim() || null,
        websiteUrl: req.body.websiteUrl?.trim() || null,
        logoUrl: req.body.logoUrl?.trim() || null,
        coverImageUrl: req.body.coverImageUrl?.trim() || null,
      });
      res.json(brewery);
    } catch (error) {
      console.error("Error creating brewery (owner):", error);
      res.status(500).json({ message: "Failed to create brewery" });
    }
  });

  app.post("/api/owner/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || (!user.roles?.includes('pub_owner') && !user.roles?.includes('admin'))) {
        return res.status(403).json({ message: "Pub owner access required" });
      }

      const { name, breweryId, style, abv } = req.body;
      if (!name || !breweryId || !style) {
        return res.status(400).json({ message: "Nome, birrificio e stile sono obbligatori" });
      }

      const beer = await storage.createBeer({
        name: name.trim(),
        breweryId: parseInt(breweryId),
        style: style.trim(),
        abv: abv ? String(abv) : null,
        ibu: req.body.ibu ? parseInt(req.body.ibu) : null,
        description: req.body.description?.trim() || null,
        imageUrl: req.body.imageUrl?.trim() || null,
        isGlutenFree: req.body.isGlutenFree === true,
        isAlcoholFree: req.body.isAlcoholFree === true,
      });
      res.json(beer);
    } catch (error) {
      console.error("Error creating beer (owner):", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  // Create new beer (admin)
  app.post("/api/admin/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
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
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const brewery = await storage.createBrewery(req.body);
      res.json(brewery);
    } catch (error) {
      console.error("Error creating brewery:", error);
      res.status(500).json({ message: "Failed to create brewery" });
    }
  });

  // Create new pub (admin)
  app.post("/api/admin/pubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const pub = await storage.createPub(req.body);
      res.json(pub);
    } catch (error) {
      console.error("Error creating pub:", error);
      res.status(500).json({ message: "Failed to create pub" });
    }
  });

  // Update beer (admin only)
  app.patch("/api/admin/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const beerId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedBeer = await storage.updateBeer(beerId, updates);
      res.json(updatedBeer);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  // Update brewery (admin only)
  app.patch("/api/admin/breweries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      const effectiveRole = user?.activeRole || user?.userType;
      if (effectiveRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const breweryId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedBrewery = await storage.updateBrewery(breweryId, updates);
      res.json(updatedBrewery);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  // Admin recent activity (real data from DB)
  app.get("/api/admin/recent-activity", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '10')), 100);
      const typeFilter = req.query.type as string | undefined;
      const fetchAll = !typeFilter || typeFilter === 'all';
      const perType = Math.max(limit, 20);

      const activities: any[] = [];

      if (fetchAll || typeFilter === 'user') {
        const recentUsers = await db.select({ id: users.id, nickname: users.nickname, firstName: users.firstName, createdAt: users.createdAt, userType: users.userType })
          .from(users).orderBy(desc(users.createdAt)).limit(perType);
        for (const u of recentUsers) {
          activities.push({ type: 'user', action: u.userType === 'pub_owner' ? 'Nuovo pub owner registrato' : u.userType === 'brewery_owner' ? 'Nuovo brewery owner registrato' : 'Nuovo utente registrato', name: u.nickname || u.firstName || 'Utente', detail: u.userType, time: u.createdAt, icon: 'user', link: '/admin/users' });
        }
      }

      if (fetchAll || typeFilter === 'pub') {
        const recentPubs = await db.select({ id: pubs.id, name: pubs.name, createdAt: pubs.createdAt, city: pubs.city })
          .from(pubs).orderBy(desc(pubs.createdAt)).limit(perType);
        for (const p of recentPubs) {
          activities.push({ type: 'pub', action: 'Nuovo pub registrato', name: p.name, detail: p.city, time: p.createdAt, icon: 'pub', itemId: p.id, link: `/pub/${p.id}` });
        }
      }

      if (fetchAll || typeFilter === 'brewery') {
        const recentBreweries = await db.select({ id: breweries.id, name: breweries.name, createdAt: breweries.createdAt, location: breweries.location })
          .from(breweries).orderBy(desc(breweries.createdAt)).limit(perType);
        for (const b of recentBreweries) {
          activities.push({ type: 'brewery', action: 'Nuovo birrificio aggiunto', name: b.name, detail: b.location, time: b.createdAt, icon: 'brewery', itemId: b.id, link: `/brewery/${b.id}` });
        }
      }

      if (fetchAll || typeFilter === 'review') {
        const recentReviews = await db.select({
          id: userBeerTastings.id,
          beerId: userBeerTastings.beerId,
          rating: userBeerTastings.rating,
          tastedAt: userBeerTastings.tastedAt,
          beerName: beers.name,
          reviewerName: users.nickname,
          reviewerFirst: users.firstName,
        })
          .from(userBeerTastings)
          .innerJoin(beers, eq(beers.id, userBeerTastings.beerId))
          .innerJoin(users, eq(users.id, userBeerTastings.userId))
          .where(sql`${userBeerTastings.rating} IS NOT NULL`)
          .orderBy(desc(userBeerTastings.tastedAt))
          .limit(perType);
        for (const r of recentReviews) {
          activities.push({ type: 'review', action: `Recensione ${r.rating}★`, name: r.beerName, detail: `di ${r.reviewerName || r.reviewerFirst || 'Utente'}`, time: r.tastedAt, icon: 'review', itemId: r.beerId, link: `/beer/${r.beerId}` });
        }
      }

      if (fetchAll || typeFilter === 'event') {
        const recentPubEvents = await db.select({ id: pubEvents.id, pubId: pubEvents.pubId, title: pubEvents.title, createdAt: pubEvents.createdAt })
          .from(pubEvents).orderBy(desc(pubEvents.createdAt)).limit(perType);
        for (const e of recentPubEvents) {
          activities.push({ type: 'event', action: 'Nuovo evento pub', name: e.title, time: e.createdAt, icon: 'event', itemId: e.pubId, link: `/pub/${e.pubId}` });
        }

        const recentBreweryEvents = await db.select({ id: breweryEvents.id, breweryId: breweryEvents.breweryId, title: breweryEvents.title, createdAt: breweryEvents.createdAt })
          .from(breweryEvents).orderBy(desc(breweryEvents.createdAt)).limit(perType);
        for (const e of recentBreweryEvents) {
          activities.push({ type: 'event', action: 'Nuovo evento birrificio', name: e.title, time: e.createdAt, icon: 'event', itemId: e.breweryId, link: `/brewery/${e.breweryId}` });
        }
      }

      activities.sort((a, b) => {
        const ta = a.time ? new Date(a.time).getTime() : 0;
        const tb = b.time ? new Date(b.time).getTime() : 0;
        return tb - ta;
      });

      res.json(activities.slice(0, limit));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
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

  // ==================== NOTIFICATIONS ====================

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const notifs = await storage.getNotifications(userId);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      await db.delete(notifications).where(eq(notifications.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      res.status(500).json({ message: "Failed to delete notifications" });
    }
  });

  // Notification preferences
  app.get("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      let prefs = await storage.getNotificationPreferences(userId);
      if (!prefs) {
        prefs = await storage.upsertNotificationPreferences(userId, {});
      }
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const prefs = await storage.upsertNotificationPreferences(userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Brewery request status
  app.get("/api/brewery/request-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const [request] = await db
        .select()
        .from(breweryRequests)
        .where(eq(breweryRequests.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(1);

      if (!request) {
        return res.json({ hasRequest: false });
      }

      res.json({
        hasRequest: true,
        status: request.status,
        breweryName: request.breweryName,
        adminNotes: request.adminNotes,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
      });
    } catch (error) {
      console.error("Error fetching brewery request status:", error);
      res.status(500).json({ message: "Failed to fetch request status" });
    }
  });

  // Brewery owner routes
  app.get("/api/brewery/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(404).json({ message: "Nessun birrificio associato" });
      }
      const brewery = await storage.getBrewery(user.breweryId);
      if (!brewery) {
        return res.status(404).json({ message: "Birrificio non trovato" });
      }
      const beerList = await storage.getBeersByBrewery(brewery.id);
      res.json({ brewery, beers: beerList });
    } catch (error) {
      console.error("Error fetching my brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  app.post("/api/brewery/beers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const beerData = { ...req.body, breweryId: user.breweryId };
      const beer = await storage.createBeer(beerData);
      res.status(201).json(beer);
    } catch (error) {
      console.error("Error creating beer:", error);
      res.status(500).json({ message: "Failed to create beer" });
    }
  });

  app.patch("/api/brewery/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer || beer.breweryId !== user.breweryId) {
        return res.status(403).json({ message: "Non puoi modificare questa birra" });
      }
      const updated = await storage.updateBeer(beerId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating beer:", error);
      res.status(500).json({ message: "Failed to update beer" });
    }
  });

  app.delete("/api/brewery/beers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer || beer.breweryId !== user.breweryId) {
        return res.status(403).json({ message: "Non puoi eliminare questa birra" });
      }
      await storage.deleteBeer(beerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Failed to delete beer" });
    }
  });

  app.patch("/api/brewery/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      const updated = await storage.updateBrewery(user.breweryId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating brewery:", error);
      res.status(500).json({ message: "Failed to update brewery" });
    }
  });

  // Brewery image upload
  app.post("/api/brewery/upload-image", isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user?.breweryId) {
        return res.status(403).json({ message: "Non sei associato a nessun birrificio" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Nessuna immagine caricata" });
      }
      const imageType = req.body.type || 'logo';
      const folder = imageType === 'cover' ? 'brewery-covers' : 'brewery-logos';
      const result = await uploadImage(req.file.buffer, folder);
      const updateData = imageType === 'cover'
        ? { coverImageUrl: result.secure_url }
        : { logoUrl: result.secure_url };
      const updated = await storage.updateBrewery(user.breweryId, updateData);
      res.json({ url: result.secure_url, brewery: updated });
    } catch (error) {
      console.error("Error uploading brewery image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Push notification routes
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { endpoint, p256dh, auth } = req.body;
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Missing subscription data" });
      }
      await storage.createPushSubscription({ userId, endpoint, p256dh, auth });
      res.json({ success: true });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.post("/api/push/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const subs = await storage.getPushSubscriptionsByUser(userId);
      if (subs.length === 0) {
        return res.status(404).json({ message: "Nessuna sottoscrizione push trovata. Attiva prima le notifiche." });
      }
      await sendPushToUserImmediate(userId, {
        title: "Fermenta.to - Test",
        body: "Le notifiche push funzionano correttamente! Riceverai avvisi quando i tuoi pub preferiti aggiornano le spine.",
        url: "/dashboard",
        type: "test",
      });
      res.json({ success: true, subscriptions: subs.length });
    } catch (error) {
      console.error("Error sending test push:", error);
      res.status(500).json({ message: "Errore nell'invio della notifica di test" });
    }
  });

  app.get("/api/push/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const subs = await storage.getPushSubscriptionsByUser(userId);
      res.json({ subscribed: subs.length > 0, subscriptionCount: subs.length });
    } catch (error) {
      res.status(500).json({ message: "Errore nel controllo stato push" });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      } else {
        const userId = (req.user as any).id;
        await storage.deletePushSubscriptionsByUser(userId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // ==================== Pub Events Routes ====================

  // GET upcoming events across all pubs (public)
  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  // GET published events for a pub (public)
  app.get("/api/pubs/:pubId/events", async (req, res) => {
    try {
      const pubId = parseInt(req.params.pubId);
      if (isNaN(pubId)) {
        return res.status(400).json({ message: "Invalid pub ID" });
      }
      const events = await storage.getPubEvents(pubId, true);
      const publishedEvents = events.filter(e => e.isPublished);
      res.json(publishedEvents);
    } catch (error) {
      console.error("Error fetching pub events:", error);
      res.status(500).json({ message: "Failed to fetch pub events" });
    }
  });

  // POST create event for a pub (authenticated pub owner or admin)
  app.post("/api/pubs/:pubId/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      if (isNaN(pubId)) {
        return res.status(400).json({ message: "Invalid pub ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to create events for this pub" });
      }

      const pub = await storage.getPub(pubId);
      if (!pub) {
        return res.status(404).json({ message: "Pub not found" });
      }

      const body = { ...req.body, pubId };
      if (body.eventDate && typeof body.eventDate === 'string') body.eventDate = new Date(body.eventDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const eventData = insertPubEventSchema.parse(body);
      const event = await storage.createPubEvent(eventData);

      // Send push notifications to users who favorited this pub
      try {
        const pubFavUserIds = await storage.getUsersWhoFavoritedPub(pubId);
        for (const favUserId of pubFavUserIds) {
          const prefs = await storage.getNotificationPreferences(favUserId);
          if (prefs && !prefs.events) continue;
          await storage.createNotification({
            userId: favUserId, type: 'event', title: `Nuovo evento da ${pub.name}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId, beerId: null, isRead: false,
          });
          sendPushToUser(favUserId, {
            title: `Nuovo evento da ${pub.name}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/pub/${pubId}`, type: 'event',
          });
        }
      } catch (notifError) {
        console.error("Error sending event notifications:", notifError);
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating pub event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH update event for a pub (authenticated pub owner or admin)
  app.patch("/api/pubs/:pubId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(pubId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid pub or event ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to update events for this pub" });
      }

      const existingEvent = await storage.getPubEvent(eventId);
      if (!existingEvent || existingEvent.pubId !== pubId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updateBody = { ...req.body };
      if (updateBody.eventDate && typeof updateBody.eventDate === 'string') updateBody.eventDate = new Date(updateBody.eventDate);
      if (updateBody.endDate && typeof updateBody.endDate === 'string') updateBody.endDate = new Date(updateBody.endDate);
      const updateData = insertPubEventSchema.partial().parse(updateBody);
      const updated = await storage.updatePubEvent(eventId, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating pub event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE event for a pub (authenticated pub owner or admin)
  app.delete("/api/pubs/:pubId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const pubId = parseInt(req.params.pubId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(pubId) || isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid pub or event ID" });
      }

      const canEdit = await isAdminOrPubOwner(userId, pubId);
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to delete events for this pub" });
      }

      const existingEvent = await storage.getPubEvent(eventId);
      if (!existingEvent || existingEvent.pubId !== pubId) {
        return res.status(404).json({ message: "Event not found" });
      }

      await storage.deletePubEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pub event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============================================================
  // BREWERY EVENTS ROUTES
  // ============================================================

  // GET all published events for a brewery (public)
  app.get("/api/breweries/:breweryId/events", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });
      const events = await db.select().from(breweryEvents)
        .where(and(
          eq(breweryEvents.breweryId, breweryId),
          eq(breweryEvents.isPublished, true),
          sql`COALESCE(${breweryEvents.endDate}, ${breweryEvents.eventDate}) + INTERVAL '12 hours' > NOW()`,
        ))
        .orderBy(asc(breweryEvents.eventDate));
      res.json(events);
    } catch (error) {
      console.error("Error fetching brewery events:", error);
      res.status(500).json({ message: "Failed to fetch brewery events" });
    }
  });

  // GET all events (including unpublished) for brewery owner dashboard
  app.get("/api/breweries/:breweryId/events/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const events = await db.select().from(breweryEvents)
        .where(eq(breweryEvents.breweryId, breweryId))
        .orderBy(breweryEvents.eventDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching brewery events:", error);
      res.status(500).json({ message: "Failed to fetch brewery events" });
    }
  });

  // POST create event for a brewery
  app.post("/api/breweries/:breweryId/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized to create events for this brewery" });

      const body = { ...req.body, breweryId };
      if (body.eventDate && typeof body.eventDate === 'string') body.eventDate = new Date(body.eventDate);
      if (body.endDate && typeof body.endDate === 'string') body.endDate = new Date(body.endDate);
      const eventData = insertBreweryEventSchema.parse(body);
      const [event] = await db.insert(breweryEvents).values(eventData).returning();

      // Send push notifications to users who favorited this brewery
      try {
        const [brewery] = await db.select().from(breweries).where(eq(breweries.id, breweryId));
        const favUsers = await db.select().from(favorites)
          .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
        for (const fav of favUsers) {
          const prefs = await storage.getNotificationPreferences(fav.userId);
          if (prefs && !prefs.events) continue;
          await storage.createNotification({
            userId: fav.userId, type: 'event', title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId: null, beerId: null, breweryId, isRead: false,
          });
          sendPushToUser(fav.userId, {
            title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/brewery/${breweryId}`, type: 'event',
          });
        }
      } catch (notifError) {
        console.error("Error sending brewery event notifications:", notifError);
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      console.error("Error creating brewery event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PATCH update event for a brewery
  app.patch("/api/breweries/:breweryId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(breweryId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const [existing] = await db.select().from(breweryEvents).where(eq(breweryEvents.id, eventId));
      if (!existing || existing.breweryId !== breweryId) return res.status(404).json({ message: "Event not found" });

      const updateBody = { ...req.body };
      if (updateBody.eventDate && typeof updateBody.eventDate === 'string') updateBody.eventDate = new Date(updateBody.eventDate);
      if (updateBody.endDate && typeof updateBody.endDate === 'string') updateBody.endDate = new Date(updateBody.endDate);
      const updateData = insertBreweryEventSchema.partial().parse(updateBody);
      const [updated] = await db.update(breweryEvents).set({ ...updateData, updatedAt: new Date() })
        .where(eq(breweryEvents.id, eventId)).returning();
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      console.error("Error updating brewery event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // DELETE event for a brewery
  app.delete("/api/breweries/:breweryId/events/:eventId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const breweryId = parseInt(req.params.breweryId);
      const eventId = parseInt(req.params.eventId);
      if (isNaN(breweryId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

      const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
      const isAdmin = userRecord?.userType === 'admin' || (userRecord?.roles || []).includes('admin');
      const isOwner = userRecord?.breweryId === breweryId;
      if (!isAdmin && !isOwner) return res.status(403).json({ message: "Not authorized" });

      const [existing] = await db.select().from(breweryEvents).where(eq(breweryEvents.id, eventId));
      if (!existing || existing.breweryId !== breweryId) return res.status(404).json({ message: "Event not found" });

      await db.delete(breweryEvents).where(eq(breweryEvents.id, eventId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brewery event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============================================================
  // BEER REVIEWS (public tastings with user info)
  // ============================================================

  // GET public reviews for a beer (all tastings with a rating) — includes per-user review count for badges
  app.get("/api/beers/:beerId/reviews", async (req, res) => {
    try {
      const beerId = parseInt(req.params.beerId);
      if (isNaN(beerId)) return res.status(400).json({ message: "Invalid beer ID" });

      const reviews = await db
        .select({
          id: userBeerTastings.id,
          rating: userBeerTastings.rating,
          personalNotes: userBeerTastings.personalNotes,
          format: userBeerTastings.format,
          tastedAt: userBeerTastings.tastedAt,
          userId: userBeerTastings.userId,
          pubId: userBeerTastings.pubId,
          pubName: pubs.name,
          nickname: users.nickname,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          isPublic: users.isPublic,
          userReviewCount: sql<number>`(SELECT COUNT(*) FROM user_beer_tastings ubt WHERE ubt.user_id = ${userBeerTastings.userId} AND ubt.rating IS NOT NULL)`,
        })
        .from(userBeerTastings)
        .leftJoin(users, eq(userBeerTastings.userId, users.id))
        .leftJoin(pubs, eq(userBeerTastings.pubId, pubs.id))
        .where(and(eq(userBeerTastings.beerId, beerId), sql`${userBeerTastings.rating} IS NOT NULL`))
        .orderBy(desc(userBeerTastings.tastedAt));

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : null;

      // Rating distribution
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of reviews) { if (r.rating) distribution[r.rating] = (distribution[r.rating] || 0) + 1; }

      res.json({
        reviews,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: reviews.length,
        distribution,
      });
    } catch (error) {
      console.error("Error fetching beer reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // GET brewery average rating (from all beer tastings)
  app.get("/api/breweries/:id/rating", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      if (isNaN(breweryId)) return res.status(400).json({ message: "Invalid brewery ID" });

      const [ratingResult] = await db.select({
        avgRating: sql<number>`ROUND(AVG(${userBeerTastings.rating})::numeric, 1)`,
        reviewCount: sql<number>`COUNT(${userBeerTastings.rating})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(and(eq(beers.breweryId, breweryId), sql`${userBeerTastings.rating} IS NOT NULL`));

      res.json({
        avgRating: ratingResult?.avgRating ? parseFloat(String(ratingResult.avgRating)) : null,
        reviewCount: Number(ratingResult?.reviewCount || 0),
      });
    } catch (error) {
      console.error("Error fetching brewery rating:", error);
      res.status(500).json({ message: "Failed to fetch brewery rating" });
    }
  });

  // GET public user profile by nickname or id
  app.get("/api/users/:identifier/profile", async (req, res) => {
    try {
      const { identifier } = req.params;
      const currentUserId = (req.user as any)?.id;

      // Try nickname first, then id
      let [profile] = await db.select({
        id: users.id,
        nickname: users.nickname,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        favoriteStyles: users.favoriteStyles,
        joinedAt: users.joinedAt,
        isPublic: users.isPublic,
        userType: users.userType,
      }).from(users).where(eq(users.nickname, identifier));

      if (!profile) {
        [profile] = await db.select({
          id: users.id,
          nickname: users.nickname,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          bio: users.bio,
          favoriteStyles: users.favoriteStyles,
          joinedAt: users.joinedAt,
          isPublic: users.isPublic,
          userType: users.userType,
        }).from(users).where(eq(users.id, identifier));
      }

      if (!profile) return res.status(404).json({ message: "Utente non trovato" });

      const isOwner = currentUserId === profile.id;
      if (profile.isPublic === false && !isOwner) {
        return res.status(403).json({ message: "Questo profilo è privato" });
      }

      // Get review count and recent reviews
      const [countRow] = await db.select({
        count: sql<number>`COUNT(*)`,
      }).from(userBeerTastings)
        .where(and(eq(userBeerTastings.userId, profile.id), sql`${userBeerTastings.rating} IS NOT NULL`));
      const reviewCount = Number(countRow?.count || 0);

      const recentReviews = await db.select({
        id: userBeerTastings.id,
        rating: userBeerTastings.rating,
        personalNotes: userBeerTastings.personalNotes,
        tastedAt: userBeerTastings.tastedAt,
        beerId: userBeerTastings.beerId,
        beerName: beers.name,
        beerStyle: beers.style,
        beerImageUrl: beers.imageUrl,
      })
      .from(userBeerTastings)
      .leftJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${userBeerTastings.rating} IS NOT NULL`))
      .orderBy(desc(userBeerTastings.tastedAt))
      .limit(12);

      // Total tastings count (for achievements)
      const [tastingRow] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(userBeerTastings).where(eq(userBeerTastings.userId, profile.id));
      const tastingCount = Number(tastingRow?.count || 0);

      // Style counts (for style achievements)
      const styleCountsRaw = await db.select({
        style: beers.style,
        count: sql<number>`COUNT(DISTINCT ${userBeerTastings.beerId})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${beers.style} IS NOT NULL`))
      .groupBy(beers.style);

      const styleCounts: Record<string, number> = {};
      for (const row of styleCountsRaw) {
        if (row.style) styleCounts[row.style] = Number(row.count);
      }

      // Country counts (for country achievements)
      const countryCountsRaw = await db.select({
        country: breweries.country,
        count: sql<number>`COUNT(DISTINCT ${userBeerTastings.beerId})`,
      })
      .from(userBeerTastings)
      .innerJoin(beers, eq(userBeerTastings.beerId, beers.id))
      .innerJoin(breweries, eq(beers.breweryId, breweries.id))
      .where(and(eq(userBeerTastings.userId, profile.id), sql`${breweries.country} IS NOT NULL`))
      .groupBy(breweries.country);

      const countryCounts: Record<string, number> = {};
      for (const row of countryCountsRaw) {
        if (row.country) countryCounts[row.country] = Number(row.count);
      }

      res.json({
        ...profile,
        reviewCount,
        tastingCount,
        recentReviews,
        isOwner,
        styleCounts,
        countryCounts,
        styleCount: Object.keys(styleCounts).length,
        countryCount: Object.keys(countryCounts).length,
      });
    } catch (error) {
      console.error("Error fetching public profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // PATCH update user privacy setting
  app.patch("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { isPublic } = req.body;
      if (typeof isPublic !== 'boolean') return res.status(400).json({ message: "isPublic deve essere boolean" });

      await db.update(users).set({ isPublic, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ isPublic });
    } catch (error) {
      console.error("Error updating privacy:", error);
      res.status(500).json({ message: "Errore aggiornamento privacy" });
    }
  });

  // Background job: every 60s check for events that just started and send push notifications
  setInterval(async () => {
    try {
      const { pubEvents: pendingPub, breweryEvents: pendingBrewery } = await storage.getPendingStartNotifications();

      for (const event of pendingPub) {
        const favUserIds = await storage.getUsersWhoFavoritedPub(event.pubId);
        for (const favUserId of favUserIds) {
          const prefs = await storage.getNotificationPreferences(favUserId);
          if (prefs && !prefs.events) continue;
          await storage.createNotification({
            userId: favUserId, type: 'event',
            title: `L'evento "${event.title}" è iniziato!`,
            message: `${event.pubName} ti aspetta adesso!`,
            pubId: event.pubId, beerId: null, isRead: false,
          });
          sendPushToUser(favUserId, {
            title: `L'evento "${event.title}" è iniziato!`,
            body: `${event.pubName} ti aspetta adesso!`,
            url: `/pub/${event.pubId}`, type: 'event',
          });
        }
        await storage.markPubEventStartSent(event.id);
      }

      for (const event of pendingBrewery) {
        const favUsers = await db.select().from(favorites)
          .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, event.breweryId)));
        for (const fav of favUsers) {
          const prefs = await storage.getNotificationPreferences(fav.userId);
          if (prefs && !prefs.events) continue;
          await storage.createNotification({
            userId: fav.userId, type: 'event',
            title: `L'evento "${event.title}" è iniziato!`,
            message: `${event.breweryName} ti aspetta adesso!`,
            pubId: null, beerId: null, breweryId: event.breweryId, isRead: false,
          });
          sendPushToUser(fav.userId, {
            title: `L'evento "${event.title}" è iniziato!`,
            body: `${event.breweryName} ti aspetta adesso!`,
            url: `/brewery/${event.breweryId}`, type: 'event',
          });
        }
        await storage.markBreweryEventStartSent(event.id);
      }
    } catch (err) {
      console.error('Event start notification job error:', err);
    }
  }, 60 * 1000);

  const httpServer = createServer(app);
  return httpServer;
}
