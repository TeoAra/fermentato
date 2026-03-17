import type { Express } from "express";
import { createServer, type Server } from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
const execFileAsync = promisify(execFile);
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { registerAdminRoutes } from "./routes-admin";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import { upload, uploadImage, cloudinary } from "./cloudinary";
import { db, pool } from "./db";
import { breweries, beers, pubs, users, tapList, bottleList, userBeerTastings, favorites, menuCategories, menuItems, pubSizes, notifications, pushSubscriptions, breweryRequests, pubEvents, breweryEvents, insertBreweryEventSchema, reviewReports, oauthAccounts, userActivities, ratings, publicanRequests, notificationPreferences, staticPages, additionRequests, scanLogs, pubPageViews, breweryAnnouncements, insertBreweryAnnouncementSchema, beerCollaborations } from "@shared/schema";

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

// ── Shared helper: base64 dataURL → temp file ───────────────────────────────
async function writeTempImage(dataUrl: string): Promise<{ path: string; ext: string } | null> {
  const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!m) return null;
  const ext = m[2] === "png" ? "png" : "jpg";
  const path = `${tmpdir()}/ocr_${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path, Buffer.from(m[3], "base64"));
  return { path, ext };
}

// ── Gemini Vision OCR (primary engine) ──────────────────────────────────────
// Uses gemini-2.0-flash (stable, strong vision). Returns structured JSON so
// we get: beerName, breweryName AND the full raw text — giving fuzzy search
// more material to work with even when label interpretation is uncertain.
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GEMINI_PROMPT = `You are analyzing an Italian craft beer label, can or bottle.

Your job:
1. Read ALL text visible in the image, exactly as written (including any partial words).
2. Identify the BEER NAME (usually the largest or most prominent text, often a proper name or invented word).
3. Identify the BREWERY NAME (the producer — look for words like "Birrificio", "Brewery", "Birra", or a brand logo name).

Return ONLY a JSON object with this exact shape — no markdown, no explanation:
{
  "beerName": "<beer name or empty string>",
  "breweryName": "<brewery name or empty string>",
  "allText": "<all text you can read, space-separated, in order of visual prominence>"
}

Rules:
- If you cannot distinguish beer name from brewery name, put your best guess in beerName and leave breweryName empty.
- The allText field must include EVERYTHING readable: beer name, brewery, style, ABV, taglines, batch numbers.
- Never invent text that is not visible. If the image is too blurry or dark, return empty strings.
- ABV percentages (e.g. "6.5%") and style words (IPA, Stout, Lager) often appear but are NOT the beer name.`;

async function runGeminiOCR(dataUrl: string): Promise<{ text: string; available: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: "", available: false };

  const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/);
  if (!m) return { text: "", available: false };

  try {
    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: m[1], data: m[3] } },
          { text: GEMINI_PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(18000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`Gemini OCR HTTP ${res.status}:`, (err as any)?.error?.message?.substring(0, 120));
      return { text: "", available: res.status !== 401 && res.status !== 403 };
    }

    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!raw) return { text: "", available: true };

    // Parse the structured JSON response
    let parsed: { beerName?: string; breweryName?: string; allText?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Gemini sometimes wraps JSON in markdown — strip ```json ... ```
      const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      try { parsed = JSON.parse(stripped); } catch { parsed = {}; }
    }

    const beerName = (parsed.beerName ?? "").trim();
    const breweryName = (parsed.breweryName ?? "").trim();
    const allText = (parsed.allText ?? "").trim();

    // Build a search string: put beerName first (highest weight), then brewery, then full text
    const combined = [beerName, breweryName, allText]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    console.log(`Gemini OCR → beer="${beerName}" brewery="${breweryName}" allText="${allText.substring(0, 80)}"`);
    return { text: combined, available: true };
  } catch (e: any) {
    console.error("Gemini OCR error:", e?.message?.substring(0, 120));
    return { text: "", available: true };
  }
}

// ── PaddleOCR (best accuracy, Python script) ────────────────────────────────
// Runs server/paddle_ocr.py — installed once on VPS, cached models ~200MB.
const PADDLE_SCRIPT = new URL("../server/paddle_ocr.py", import.meta.url).pathname;

async function runPaddleOCR(dataUrl: string): Promise<{ text: string; available: boolean }> {
  const tmp = await writeTempImage(dataUrl);
  if (!tmp) return { text: "", available: false };
  try {
    const { stdout } = await execFileAsync("python3", [PADDLE_SCRIPT, tmp.path], {
      timeout: 55000,
      env: {
        ...process.env,
        GLOG_minloglevel: "3",
        FLAGS_call_stack_level: "0",
        FLAGS_use_mkldnn: "0",
        PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: "True",
        OMP_NUM_THREADS: "2",
      },
    });
    return { text: stdout.trim(), available: true };
  } catch (e: any) {
    if (e?.code === 2) return { text: "", available: false }; // not installed
    if (!e?.message?.includes("ENOENT")) console.error("PaddleOCR error:", e?.message);
    return { text: "", available: true };
  } finally {
    unlink(tmp.path).catch(() => {});
  }
}

// ── Tesseract fallback (already on VPS, fast, no models to download) ─────────
async function runLocalTesseract(dataUrl: string): Promise<string> {
  const tmp = await writeTempImage(dataUrl);
  if (!tmp) return "";

  const runTesseract = async (psm: string): Promise<string> => {
    try {
      const { stdout } = await execFileAsync(
        "tesseract", [tmp.path, "stdout", "-l", "ita+eng", "--psm", psm, "--oem", "3"],
        { timeout: 15000 }
      );
      return stdout.trim();
    } catch (e: any) {
      // Tesseract exits with code 1 when text confidence is low but may still produce stdout
      if (e?.stdout && (e.stdout as string).trim().length > 0) return (e.stdout as string).trim();
      if (!e?.message?.includes("ENOENT")) console.error("Tesseract error:", e?.message?.split("\n")[0]);
      return "";
    }
  };

  try {
    // PSM 11 = sparse text (best for labels with mixed layout)
    const text11 = await runTesseract("11");
    if (text11.length >= 4) return text11;
    // PSM 6 = assume uniform block of text
    const text6 = await runTesseract("6");
    return text6;
  } finally {
    unlink(tmp.path).catch(() => {});
  }
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

  // Browse beers by exact style (case-insensitive)
  app.get("/api/beers/by-style", async (req, res) => {
    try {
      const style = (req.query.style as string)?.trim();
      if (!style) return res.status(400).json({ message: "style param required" });
      const limit = Math.min(100, parseInt(req.query.limit as string) || 60);
      const offset = parseInt(req.query.offset as string) || 0;
      const rows = await db
        .select({
          id: beers.id,
          name: beers.name,
          style: beers.style,
          abv: beers.abv,
          ibu: beers.ibu,
          imageUrl: beers.imageUrl,
          breweryId: beers.breweryId,
          breweryName: breweries.name,
          breweryLogoUrl: breweries.logoUrl,
        })
        .from(beers)
        .leftJoin(breweries, eq(beers.breweryId, breweries.id))
        .where(sql`lower(${beers.style}) = lower(${style})`)
        .orderBy(beers.name)
        .limit(limit)
        .offset(offset);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching beers by style:", error);
      res.status(500).json({ message: "Failed to fetch beers by style" });
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
      // Check if brewery has a verified owner
      const [ownerRow] = await db.select({ id: users.id }).from(users).where(eq(users.breweryId, breweryId)).limit(1);
      res.json({ ...brewery, hasOwner: !!ownerRow });
    } catch (error) {
      console.error("Error fetching brewery:", error);
      res.status(500).json({ message: "Failed to fetch brewery" });
    }
  });

  // Get all beers from a brewery (own beers + collaboration beers)
  app.get("/api/breweries/:id/beers", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      // Fetch own beers + beers where this brewery is a collaborator
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
        isCollaboration: beers.isCollaboration,
        avgRating: sql<number>`ROUND(AVG(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN ${userBeerTastings.rating} END)::numeric, 2)`,
        reviewCount: sql<number>`COUNT(CASE WHEN ${userBeerTastings.rating} IS NOT NULL THEN 1 END)`,
        favoriteCount: sql<number>`(SELECT COUNT(*) FROM favorites f WHERE f.item_type = 'beer' AND f.item_id = ${beers.id})`,
      })
      .from(beers)
      .leftJoin(userBeerTastings, eq(beers.id, userBeerTastings.beerId))
      .where(sql`${beers.breweryId} = ${breweryId} OR ${beers.id} IN (SELECT beer_id FROM beer_collaborations WHERE brewery_id = ${breweryId})`)
      .groupBy(beers.id)
      .orderBy(beers.name);

      // Fetch collaboration info for each beer
      const beerIds = beerRows.map(b => b.id);
      let collabMap: Record<number, { id: number; name: string; logoUrl: string | null }[]> = {};
      if (beerIds.length > 0) {
        const collabRows = await db.select({
          beerId: beerCollaborations.beerId,
          breweryId: breweries.id,
          breweryName: breweries.name,
          breweryLogo: breweries.logoUrl,
        })
        .from(beerCollaborations)
        .innerJoin(breweries, eq(beerCollaborations.breweryId, breweries.id))
        .where(sql`${beerCollaborations.beerId} = ANY(ARRAY[${sql.join(beerIds.map(id => sql`${id}`), sql`, `)}]::int[])`);

        for (const row of collabRows) {
          if (!collabMap[row.beerId]) collabMap[row.beerId] = [];
          collabMap[row.beerId].push({ id: row.breweryId, name: row.breweryName, logoUrl: row.breweryLogo });
        }
      }

      const result = beerRows.map(b => ({
        ...b,
        avgRating: b.avgRating ? parseFloat(String(b.avgRating)) : null,
        reviewCount: Number(b.reviewCount || 0),
        favoriteCount: Number(b.favoriteCount || 0),
        collaboratingBreweries: collabMap[b.id] || [],
        isCollabBeer: b.breweryId !== breweryId, // true if this is a collab beer (not own)
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching brewery beers:", error);
      res.status(500).json({ message: "Failed to fetch brewery beers" });
    }
  });

  // Get collaborations for a specific beer
  app.get("/api/beers/:id/collaborations", async (req, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const collabRows = await db.select({
        id: breweries.id,
        name: breweries.name,
        location: breweries.location,
        logoUrl: breweries.logoUrl,
      })
      .from(beerCollaborations)
      .innerJoin(breweries, eq(beerCollaborations.breweryId, breweries.id))
      .where(eq(beerCollaborations.beerId, beerId));
      res.json(collabRows);
    } catch (error) {
      console.error("Error fetching beer collaborations:", error);
      res.status(500).json({ message: "Failed to fetch beer collaborations" });
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
      if (random) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching breweries:", error);
      res.status(500).json({ message: "Failed to fetch breweries" });
    }
  });


  // Nearest breweries sorted by haversine distance (server-side)
  app.get("/api/breweries/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const limit = Math.min(parseInt(req.query.limit as string) || 4, 20);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "lat e lng sono obbligatori" });
      }

      // Haversine formula in PostgreSQL — only consider breweries with valid coordinates
      const result = await db.execute(sql`
        SELECT
          b.id, b.name, b.location, b.region, b.country,
          b.description, b.logo_url AS "logoUrl",
          b.cover_image_url AS "coverImageUrl",
          b.website_url AS "websiteUrl",
          b.latitude, b.longitude,
          COUNT(beer.id)::int AS "beerCount",
          (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(b.latitude::float))
              * cos(radians(b.longitude::float) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(b.latitude::float))
            )
          )) AS "_distance"
        FROM breweries b
        LEFT JOIN beers beer ON beer.brewery_id = b.id
        WHERE b.latitude IS NOT NULL
          AND b.longitude IS NOT NULL
          AND b.latitude::text != '0'
          AND b.longitude::text != '0'
          AND b.latitude::text != ''
          AND b.longitude::text != ''
        GROUP BY b.id
        ORDER BY "_distance" ASC
        LIMIT ${limit}
      `);

      res.setHeader('Cache-Control', 'no-store');
      res.json(result.rows);
    } catch (error: any) {
      console.error("Error fetching nearby breweries:", error.message);
      res.status(500).json({ message: "Errore nel recupero dei birrifici vicini" });
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
      const [pubCount, breweryCount, beerCount, reviewCount, eventCount, userCount, styleCount] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)::int` }).from(pubs),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(breweries),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(beers),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(userBeerTastings).where(sql`rating IS NOT NULL`),
        db.select({ count: sql<number>`(SELECT COUNT(*) FROM pub_events) + (SELECT COUNT(*) FROM brewery_events)` }),
        db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
        db.select({ count: sql<number>`COUNT(DISTINCT style)::int` }).from(beers),
      ]);
      const stats = {
        totalPubs: pubCount[0]?.count || 0,
        totalBreweries: breweryCount[0]?.count || 0,
        totalBeers: beerCount[0]?.count || 0,
        totalReviews: reviewCount[0]?.count || 0,
        totalEvents: eventCount[0]?.count || 0,
        totalUsers: userCount[0]?.count || 0,
        uniqueStyles: styleCount[0]?.count || 0,
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

  // Cancel trial for current user's pub
  app.post("/api/my-pub/cancel-trial", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const [pub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (!pub) return res.status(404).json({ message: "Nessun pub trovato" });
      if (pub.subscriptionStatus !== 'trial') {
        return res.status(400).json({ message: "Il pub non è in prova" });
      }
      // Also cancel on Stripe (subscription in trialing state)
      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const userEmail = (req.user as any).email;
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const trialingSubs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'trialing', limit: 1 });
          for (const sub of trialingSubs.data) await stripe.subscriptions.cancel(sub.id);
        }
      } catch (stripeErr: any) { console.warn("Stripe trial cancel warning:", stripeErr.message); }

      await db.update(pubs).set({
        subscriptionStatus: 'cancelled',
        trialEndsAt: null,
        isVerified: false,
        isActive: false,
      }).where(eq(pubs.id, pub.id));
      res.json({ message: "Prova annullata. Il pub è stato ibernato." });
    } catch (error) {
      console.error("Error cancelling trial:", error);
      res.status(500).json({ message: "Errore durante l'annullamento" });
    }
  });

  // Cancel active paid subscription → hibernate pub
  app.post("/api/my-pub/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const userEmail = (req.user as any).email;
      const [pub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (!pub) return res.status(404).json({ message: "Nessun pub trovato" });

      // Cancel on Stripe — look up by customer email
      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const cid = customers.data[0].id;
          for (const status of ['active', 'trialing'] as const) {
            const subs = await stripe.subscriptions.list({ customer: cid, status, limit: 5 });
            for (const sub of subs.data) await stripe.subscriptions.cancel(sub.id);
          }
        }
      } catch (stripeErr: any) { console.warn("Stripe subscription cancel warning:", stripeErr.message); }

      await db.update(pubs).set({
        subscriptionStatus: 'cancelled',
        trialEndsAt: null,
        isVerified: false,
        isActive: false,
      }).where(eq(pubs.id, pub.id));
      res.json({ message: "Abbonamento disdetto. Il pub è stato ibernato." });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Errore durante la disdetta" });
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

      const updates = insertMenuItemSchema.omit({ id: true, createdAt: true, updatedAt: true }).partial().parse(req.body);
      // If categoryId is being changed, verify the new category belongs to this pub
      if (updates.categoryId && updates.categoryId !== item.categoryId) {
        const catExists = categories.some(cat => cat.id === updates.categoryId);
        if (!catExists) {
          return res.status(400).json({ message: "Category does not belong to this pub" });
        }
      }
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
          icon: pub.logoUrl || undefined,
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
            icon: pub.logoUrl || undefined,
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
              icon: brewery?.logoUrl || undefined,
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
    const batchSize = Math.min(parseInt(req.query.batch as string) || 10, 30);
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
          await new Promise(r => setTimeout(r, 500));
        } else {
          skipped++;
        }
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

      const [existingUser] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, targetId));
      const currentRoles: string[] = existingUser?.roles || ['customer'];

      const roleMap: Record<string, string> = {
        pub_owner: 'pub_owner',
        brewery_owner: 'brewery_owner',
        admin: 'admin',
        customer: 'customer',
      };
      const newRole = roleMap[userType] || userType;
      const newRoles = currentRoles.includes(newRole) ? currentRoles : ['customer', ...currentRoles.filter(r => r !== 'customer'), newRole];

      await db.update(users).set({
        userType,
        roles: newRoles,
        activeRole: userType === 'customer' ? 'customer' : newRole,
        updatedAt: new Date(),
      }).where(eq(users.id, targetId));

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

      // Delete pubs owned by this user — cascade through all child FK tables first
      await db.execute(sql`DELETE FROM menu_items WHERE category_id IN (SELECT id FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId}))`);
      await db.execute(sql`DELETE FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM tap_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM bottle_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM pub_sizes WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM ratings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.execute(sql`DELETE FROM user_beer_tastings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${targetId})`);
      await db.delete(pubs).where(eq(pubs.ownerId, targetId));
      // Brewery stays in DB (data preserved) — no owner link needed

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

  // ─── Admin: Publican Requests (legacy storico — pub ora attivati via Stripe) ───

  app.get('/api/admin/publican-requests', isAuthenticated, isAdmin, async (req: any, res) => {
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
      res.status(500).json({ message: "Failed to fetch publican requests" });
    }
  });

  app.post('/api/admin/publican-requests/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;
      await db.update(publicanRequests).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(publicanRequests.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting publican request:", error);
      res.status(500).json({ message: "Failed to reject publican request" });
    }
  });

  // ─── Admin: Brewery Requests (unico caso con approvazione admin) ───────────

  app.get('/api/admin/brewery-requests', isAuthenticated, isAdmin, async (req: any, res) => {
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
      res.status(500).json({ message: "Failed to fetch brewery requests" });
    }
  });

  app.post('/api/admin/brewery-requests/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;

      const [brewReq] = await db.select().from(breweryRequests).where(eq(breweryRequests.id, id));
      if (!brewReq) return res.status(404).json({ message: "Richiesta non trovata" });
      if (brewReq.status === 'approved') return res.status(400).json({ message: "Già approvata" });

      let breweryId: number;

      if (brewReq.existingBreweryId) {
        // Claim existing brewery
        breweryId = brewReq.existingBreweryId;
      } else {
        // Create new brewery from request data
        const [newBrewery] = await db.insert(breweries).values({
          name: brewReq.breweryName,
          location: brewReq.breweryLocation,
          region: brewReq.breweryRegion || brewReq.breweryLocation,
          country: brewReq.breweryCountry || 'Italia',
          vatNumber: brewReq.vatNumber || null,
          phone: brewReq.phone || null,
          websiteUrl: brewReq.websiteUrl || null,
          description: brewReq.description || null,
        }).returning();
        breweryId = newBrewery.id;
      }

      // Update brewery request status
      await db.update(breweryRequests).set({
        status: 'approved',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(breweryRequests.id, id));

      // Promote user: add brewery_owner role preserving existing roles
      const [existingUser] = await db.select({ roles: users.roles, userType: users.userType }).from(users).where(eq(users.id, brewReq.userId));
      const currentRoles: string[] = existingUser?.roles || ['customer'];
      const newRoles = currentRoles.includes('brewery_owner') ? currentRoles : [...currentRoles, 'brewery_owner'];
      const isPubOwner = currentRoles.includes('pub_owner');

      await db.update(users).set({
        roles: newRoles,
        userType: isPubOwner ? existingUser.userType : 'brewery_owner',
        activeRole: 'brewery_owner',
        breweryId,
        updatedAt: new Date(),
      }).where(eq(users.id, brewReq.userId));

      // Notify user
      try {
        await db.insert(notifications).values({
          userId: brewReq.userId,
          type: 'system',
          title: '🎉 Birrificio approvato!',
          message: `Il tuo birrificio "${brewReq.breweryName}" è stato verificato. Ora puoi accedere alla dashboard del birrificio.`,
          isRead: false,
        });
      } catch {}

      res.json({ success: true, breweryId });
    } catch (error) {
      console.error("Error approving brewery request:", error);
      res.status(500).json({ message: "Failed to approve brewery request" });
    }
  });

  app.post('/api/admin/brewery-requests/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminNotes } = req.body;
      const adminId = (req.user as any).id;

      const [brewReq] = await db.select().from(breweryRequests).where(eq(breweryRequests.id, id));
      if (!brewReq) return res.status(404).json({ message: "Richiesta non trovata" });

      await db.update(breweryRequests).set({
        status: 'rejected',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      }).where(eq(breweryRequests.id, id));

      // Notify user
      try {
        await db.insert(notifications).values({
          userId: brewReq.userId,
          type: 'system',
          title: 'Richiesta birrificio non approvata',
          message: adminNotes
            ? `La tua richiesta per "${brewReq.breweryName}" non è stata approvata. Nota: ${adminNotes}`
            : `La tua richiesta per "${brewReq.breweryName}" non è stata approvata. Contattaci per maggiori informazioni.`,
          isRead: false,
        });
      } catch {}

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting brewery request:", error);
      res.status(500).json({ message: "Failed to reject brewery request" });
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

  // Mass update beers (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/beers/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
      if (safeIds.length === 0) return res.status(400).json({ message: "ids array required" });
      const idList = safeIds.join(',');

      let updatedCount = 0;

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

  // Mass update breweries (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/breweries/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['country', 'region', 'location', 'city', 'website_url'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = [ids, ...Object.values(safeUpdates)];
      await pool.query(`UPDATE breweries SET ${setClauses} WHERE id = ANY($1::int[])`, values);
      res.json({ updated: ids.length });
    } catch (error) {
      console.error("Mass update breweries error:", error);
      res.status(500).json({ message: "Failed to mass update breweries" });
    }
  });

  // Find duplicate breweries using pg_trgm similarity
  app.get('/api/admin/breweries/find-duplicates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const threshold = parseFloat(req.query.threshold as string) || 0.75;
      const country = req.query.country as string || null;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

      let rows: any[];
      try {
        // Use pg_trgm similarity for fuzzy matching
        const countryFilter = country ? `AND (b1.country = $3 OR b2.country = $3)` : '';
        const params: any[] = [threshold, limit];
        if (country) params.push(country);

        const result = await pool.query(`
          SELECT
            b1.id as id1, b1.name as name1, b1.country as country1,
            b1.region as region1, b1.location as location1, b1.logo_url as logo1,
            b2.id as id2, b2.name as name2, b2.country as country2,
            b2.region as region2, b2.location as location2, b2.logo_url as logo2,
            ROUND(similarity(lower(b1.name), lower(b2.name))::numeric, 3) as sim,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b1.id)::int as beers1,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b2.id)::int as beers2
          FROM breweries b1
          JOIN breweries b2 ON b1.id < b2.id
            AND similarity(lower(b1.name), lower(b2.name)) >= $1
            ${countryFilter}
          ORDER BY sim DESC, LEAST(b1.id, b2.id)
          LIMIT $2
        `, params);
        rows = result.rows;
      } catch (trgmErr: any) {
        // Fallback: exact lowercase name match
        const result = await pool.query(`
          SELECT
            b1.id as id1, b1.name as name1, b1.country as country1,
            b1.region as region1, b1.location as location1, b1.logo_url as logo1,
            b2.id as id2, b2.name as name2, b2.country as country2,
            b2.region as region2, b2.location as location2, b2.logo_url as logo2,
            1.0 as sim,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b1.id)::int as beers1,
            (SELECT COUNT(*) FROM beers WHERE brewery_id = b2.id)::int as beers2
          FROM breweries b1
          JOIN breweries b2 ON b1.id < b2.id
            AND lower(b1.name) = lower(b2.name)
          ORDER BY b1.name
          LIMIT $1
        `, [limit]);
        rows = result.rows;
      }

      res.json(rows);
    } catch (error) {
      console.error("Find duplicates error:", error);
      res.status(500).json({ message: "Errore nella ricerca duplicati" });
    }
  });

  // Merge two breweries — keepId survives, mergeId is deleted after migrating all data
  app.post('/api/admin/breweries/merge', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { keepId, mergeId } = req.body as { keepId: number; mergeId: number };
      if (!keepId || !mergeId || keepId === mergeId) {
        return res.status(400).json({ message: "keepId e mergeId devono essere diversi e validi" });
      }

      // Verify both breweries exist
      const { rows: both } = await pool.query(
        `SELECT id, name FROM breweries WHERE id = ANY($1::int[])`,
        [[keepId, mergeId]]
      );
      if (both.length < 2) return res.status(404).json({ message: "Uno o entrambi i birrifici non trovati" });
      const keepName = both.find((r: any) => r.id === keepId)?.name;

      // Check which optional columns exist (schema may differ across environments)
      const { rows: colChecks } = await pool.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE (table_name = 'user_beer_tastings' AND column_name = 'brewery_id')
           OR (table_name = 'beers' AND column_name = 'brewery_name')
      `);
      const hasTastingsBreweryId = colChecks.some((r: any) => r.table_name === 'user_beer_tastings' && r.column_name === 'brewery_id');
      const hasBeersBreweryName  = colChecks.some((r: any) => r.table_name === 'beers' && r.column_name === 'brewery_name');

      // Run all migrations in a transaction
      await pool.query('BEGIN');
      try {
        // 1. Move beers
        if (hasBeersBreweryName) {
          await pool.query(
            `UPDATE beers SET brewery_id = $1, brewery_name = $2 WHERE brewery_id = $3`,
            [keepId, keepName, mergeId]
          );
        } else {
          await pool.query(
            `UPDATE beers SET brewery_id = $1 WHERE brewery_id = $2`,
            [keepId, mergeId]
          );
        }
        // 2. Move user_beer_tastings (only if brewery_id column exists)
        if (hasTastingsBreweryId) {
          await pool.query(
            `UPDATE user_beer_tastings SET brewery_id = $1 WHERE brewery_id = $2`,
            [keepId, mergeId]
          );
        }
        // 3. Move brewery events (re-assign to kept brewery)
        await pool.query(
          `UPDATE brewery_events SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 4. Move addition_requests (column is brewery_id, not existing_brewery_id)
        await pool.query(
          `UPDATE addition_requests SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 4b. Move brewery_requests (this table uses existing_brewery_id)
        await pool.query(
          `UPDATE brewery_requests SET existing_brewery_id = $1 WHERE existing_brewery_id = $2`,
          [keepId, mergeId]
        );
        // 5. Move brewery owner users
        await pool.query(
          `UPDATE users SET brewery_id = $1 WHERE brewery_id = $2`,
          [keepId, mergeId]
        );
        // 6. Null-out notifications brewery_id (no cascade on this column — must clear manually)
        await pool.query(
          `UPDATE notifications SET brewery_id = NULL WHERE brewery_id = $1`,
          [mergeId]
        );
        // 7. Delete the merged brewery (scan_logs.chosen_brewery_id is set null on cascade)
        await pool.query(`DELETE FROM breweries WHERE id = $1`, [mergeId]);
        await pool.query('COMMIT');
      } catch (txErr) {
        await pool.query('ROLLBACK');
        throw txErr;
      }

      const beerCount = await pool.query(
        `SELECT COUNT(*) FROM beers WHERE brewery_id = $1`, [keepId]
      );
      res.json({
        success: true,
        keepId,
        mergeId,
        keepName,
        beersMoved: parseInt(beerCount.rows[0].count),
      });
    } catch (error) {
      console.error("Brewery merge error:", error);
      res.status(500).json({ message: "Errore durante il merge dei birrifici" });
    }
  });

  // Sync brewery_name field in beers for a specific brewery
  app.post('/api/admin/breweries/:id/sync-beer-names', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const { rows: brewRows } = await pool.query(`SELECT name FROM breweries WHERE id = $1`, [breweryId]);
      if (!brewRows.length) return res.status(404).json({ message: "Brewery not found" });
      const breweryName = brewRows[0].name;
      const result = await pool.query(
        `UPDATE beers SET brewery_name = $1 WHERE brewery_id = $2 AND (brewery_name IS NULL OR brewery_name != $1)`,
        [breweryName, breweryId]
      );
      res.json({ updated: result.rowCount ?? 0, breweryName });
    } catch (error) {
      console.error("Sync beer names error:", error);
      res.status(500).json({ message: "Failed to sync beer names" });
    }
  });

  // Mass update pubs (must be before /:id to avoid Express conflict)
  app.patch('/api/admin/pubs/mass-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { ids, updates } = req.body as { ids: number[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
      const allowed = ['city', 'region', 'country'];
      const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
      if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const keys = Object.keys(safeUpdates);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const values = [ids, ...Object.values(safeUpdates)];
      await pool.query(`UPDATE pubs SET ${setClauses} WHERE id = ANY($1::int[])`, values);
      res.json({ updated: ids.length });
    } catch (error) {
      console.error("Mass update pubs error:", error);
      res.status(500).json({ message: "Failed to mass update pubs" });
    }
  });

  app.patch('/api/admin/beers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const { collaborationBreweryIds, ...updates } = req.body;
      const beer = await storage.updateBeer(beerId, updates);
      if (updates.logoUrl || updates.imageUrl || updates.logo_url || updates.image_url) {
        clipIndexBeer(beerId, updates.logoUrl || updates.logo_url || updates.imageUrl || updates.image_url);
      }

      // Update collaboration breweries if provided (replace all)
      if (collaborationBreweryIds !== undefined) {
        await db.delete(beerCollaborations).where(eq(beerCollaborations.beerId, beerId));
        if (Array.isArray(collaborationBreweryIds) && collaborationBreweryIds.length > 0) {
          for (const brewId of collaborationBreweryIds) {
            await db.insert(beerCollaborations).values({ beerId, breweryId: brewId }).onConflictDoNothing();
          }
        }
      }

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

      // Cascade delete child records in FK-dependency order
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      await db.delete(favorites).where(eq(favorites.userId, userId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.userId, userId));
      await db.delete(ratings).where(eq(ratings.userId, userId));
      await db.delete(userActivities).where(eq(userActivities.userId, userId));
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, userId));

      // Delete pubs owned by this user — cascade through all child FK tables first
      await db.execute(sql`DELETE FROM menu_items WHERE category_id IN (SELECT id FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId}))`);
      await db.execute(sql`DELETE FROM menu_categories WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM tap_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM bottle_list WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM pub_sizes WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM ratings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.execute(sql`DELETE FROM user_beer_tastings WHERE pub_id IN (SELECT id FROM pubs WHERE owner_id = ${userId})`);
      await db.delete(pubs).where(eq(pubs.ownerId, userId));
      // Brewery stays in DB (data preserved) — no owner link

      // Delete registration requests
      await db.delete(publicanRequests).where(eq(publicanRequests.userId, userId));
      await db.delete(breweryRequests).where(eq(breweryRequests.userId, userId));

      // Delete the user
      await db.delete(users).where(eq(users.id, userId));

      req.logout(() => {
        req.session.destroy(() => {
          res.json({ message: "Account deleted successfully" });
        });
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
  app.delete("/api/admin/beers/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const beer = await storage.getBeer(beerId);
      if (!beer) {
        return res.status(404).json({ message: "Birra non trovata" });
      }
      await db.delete(tapList).where(eq(tapList.beerId, beerId));
      await db.delete(bottleList).where(eq(bottleList.beerId, beerId));
      await db.delete(userBeerTastings).where(eq(userBeerTastings.beerId, beerId));
      await db.delete(favorites).where(and(eq(favorites.itemType, 'beer'), eq(favorites.itemId, beerId)));
      // Null-out notifications (FK with NO ACTION — must clear manually)
      await db.execute(sql`UPDATE notifications SET beer_id = NULL WHERE beer_id = ${beerId}`);
      await storage.deleteBeer(beerId);
      res.json({ message: `Birra "${beer.name}" eliminata con successo` });
    } catch (error) {
      console.error("Error deleting beer:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione della birra" });
    }
  });

  // Admin delete brewery (also deletes its beers and their references)
  app.delete("/api/admin/breweries/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
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
        await db.execute(sql`UPDATE notifications SET beer_id = NULL WHERE beer_id = ${beer.id}`);
        await storage.deleteBeer(beer.id);
      }
      // Clear brewery FK references before deleting (all NO ACTION constraints)
      await db.execute(sql`UPDATE notifications SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE users SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE brewery_requests SET existing_brewery_id = NULL WHERE existing_brewery_id = ${breweryId}`);
      await db.execute(sql`UPDATE addition_requests SET brewery_id = NULL WHERE brewery_id = ${breweryId}`);
      await db.delete(favorites).where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, breweryId)));
      await storage.deleteBrewery(breweryId);
      res.json({ message: `Birrificio "${brewery.name}" e ${breweryBeers.length} birre eliminate con successo` });
    } catch (error) {
      console.error("Error deleting brewery:", error);
      res.status(500).json({ message: "Errore durante l'eliminazione del birrificio" });
    }
  });

  // Admin delete pub (cleans up related data)
  app.delete("/api/admin/pubs/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
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
      await db.delete(ratings).where(eq(ratings.pubId, pubId));
      // Null-out FK references with NO ACTION
      await db.execute(sql`UPDATE notifications SET pub_id = NULL WHERE pub_id = ${pubId}`);
      await db.execute(sql`UPDATE user_beer_tastings SET pub_id = NULL WHERE pub_id = ${pubId}`);
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

      const { collaborationBreweryIds, ...beerData } = req.body;
      const beer = await storage.createBeer(beerData);

      // Save collaboration breweries if provided
      if (collaborationBreweryIds && Array.isArray(collaborationBreweryIds) && collaborationBreweryIds.length > 0) {
        for (const brewId of collaborationBreweryIds) {
          await db.insert(beerCollaborations).values({ beerId: beer.id, breweryId: brewId }).onConflictDoNothing();
        }
      }

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
      const newImg = req.body.logoUrl || req.body.logo_url || req.body.imageUrl || req.body.image_url;
      if (newImg) clipIndexBeer(beerId, newImg);
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
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: favUserId, type: 'event', title: `Nuovo evento da ${pub.name}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId, beerId: null, isRead: false,
          });
          sendPushToUser(favUserId, {
            title: `Nuovo evento da ${pub.name}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/pub/${pubId}`, type: 'event',
            icon: pub.logoUrl || undefined,
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
          if (prefs?.events === false) continue;
          await storage.createNotification({
            userId: fav.userId, type: 'event', title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            message: `"${event.title}" - Non perderlo!`,
            pubId: null, beerId: null, breweryId, isRead: false,
          });
          sendPushToUser(fav.userId, {
            title: `Nuovo evento da ${brewery?.name || 'birrificio'}!`,
            body: `"${event.title}" - Non perderlo!`,
            url: `/brewery/${breweryId}`, type: 'event',
            icon: brewery?.logoUrl || undefined,
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
  // EVENT INTERESTS (pub + brewery events — chi è interessato)
  // ============================================================

  // GET interest count + user state for a pub event
  app.get("/api/pub-events/:eventId/interest", async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const count = await storage.getPubEventInterestCount(eventId);
      const userId = req.user?.id;
      const userInterested = userId ? await storage.getPubEventUserInterest(userId, eventId) : false;
      res.json({ count, userInterested });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interest" });
    }
  });

  // POST toggle interest for a pub event (authenticated)
  app.post("/api/pub-events/:eventId/interest", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const userId = (req.user as any).id;
      const interested = await storage.togglePubEventInterest(userId, eventId);
      const count = await storage.getPubEventInterestCount(eventId);
      res.json({ interested, count });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle interest" });
    }
  });

  // GET interest count + user state for a brewery event
  app.get("/api/brewery-events/:eventId/interest", async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const count = await storage.getBreweryEventInterestCount(eventId);
      const userId = req.user?.id;
      const userInterested = userId ? await storage.getBreweryEventUserInterest(userId, eventId) : false;
      res.json({ count, userInterested });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch interest" });
    }
  });

  // POST toggle interest for a brewery event (authenticated)
  app.post("/api/brewery-events/:eventId/interest", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
      const userId = (req.user as any).id;
      const interested = await storage.toggleBreweryEventInterest(userId, eventId);
      const count = await storage.getBreweryEventInterestCount(eventId);
      res.json({ interested, count });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle interest" });
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
          if (prefs?.events === false) continue;
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
            icon: event.pubLogoUrl || undefined,
          });
        }
        await storage.markPubEventStartSent(event.id);
      }

      for (const event of pendingBrewery) {
        const favUsers = await db.select().from(favorites)
          .where(and(eq(favorites.itemType, 'brewery'), eq(favorites.itemId, event.breweryId)));
        for (const fav of favUsers) {
          const prefs = await storage.getNotificationPreferences(fav.userId);
          if (prefs?.events === false) continue;
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
            icon: event.breweryLogoUrl || undefined,
          });
        }
        await storage.markBreweryEventStartSent(event.id);
      }
    } catch (err) {
      console.error('Event start notification job error:', err);
    }
  }, 60 * 1000);

  // CLIP image-similarity search endpoint
  // Calls the local CLIP service (127.0.0.1:5002) to embed the photo,
  // then uses pgvector cosine similarity to find matching beers.
  const CLIP_SERVICE_URL = "http://127.0.0.1:5002";
  const CLIP_TIMEOUT_MS = 8000;

  /** Fire-and-forget: indicizza una birra nel CLIP service in background. */
  function clipIndexBeer(beerId: number, imageUrl: string | null | undefined): void {
    if (!imageUrl || !imageUrl.startsWith("http")) return;
    fetch(`${CLIP_SERVICE_URL}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: beerId, url: imageUrl }),
      signal: AbortSignal.timeout(30000),
    }).catch(() => {});
  }

  async function callClipEmbed(imageDataUrl: string): Promise<number[] | null> {
    try {
      const base64 = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLIP_TIMEOUT_MS);
      const resp = await fetch(`${CLIP_SERVICE_URL}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: base64 }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json() as { embedding: number[] };
      return data.embedding ?? null;
    } catch {
      return null;
    }
  }

  app.post("/api/scan/image-search", isAuthenticated, async (req: any, res) => {
    try {
      const { image, limit = 5 } = req.body as { image?: string; limit?: number };
      if (!image || !image.startsWith("data:image")) {
        return res.status(400).json({ error: "image required" });
      }

      const base64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const maxLimit = Math.min(Number(limit), 10);

      // Call CLIP service /search endpoint (handles embed + similarity in Python/numpy)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLIP_TIMEOUT_MS);
      let clipResp: Response;
      try {
        clipResp = await fetch(`${CLIP_SERVICE_URL}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_b64: base64, limit: maxLimit, min_similarity: 0.5 }),
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {
        clearTimeout(timer);
        return res.json({ available: false, results: [] });
      }

      if (!clipResp.ok) return res.json({ available: false, results: [] });
      const clipData = await clipResp.json() as { results: Array<{ id: number; similarity: number }>; indexed: number };

      if (!clipData.results?.length) {
        return res.json({ available: true, results: [], indexed: clipData.indexed ?? 0 });
      }

      // Fetch full beer details for matched IDs
      const ids = clipData.results.map((r: any) => r.id);
      const simMap = Object.fromEntries(clipData.results.map((r: any) => [r.id, r.similarity]));

      const beerRows = await db.execute(sql`
        SELECT b.id, b.name, b.style, b.abv,
               b.logo_url as "logoUrl", b.image_url as "imageUrl",
               br.id as "breweryId", br.name as "breweryName", br.logo_url as "breweryLogoUrl"
        FROM beers b
        LEFT JOIN breweries br ON br.id = b.brewery_id
        WHERE b.id = ANY(${ids}::int[])
      `);

      const results = (beerRows.rows as any[]).map(b => ({
        ...b,
        similarity: simMap[b.id] ?? 0,
      })).sort((a, b) => b.similarity - a.similarity);

      res.json({ available: true, results, indexed: clipData.indexed ?? 0 });
    } catch (error) {
      console.error("Image search error:", error);
      res.json({ available: false, results: [] });
    }
  });

  // OCR endpoint — Gemini Vision as primary, Tesseract + OCR.space as fallback.
  app.post("/api/scan/ocr", isAuthenticated, async (req, res) => {
    try {
      const { image } = req.body as { image?: string };
      if (!image || !image.startsWith("data:image")) {
        return res.status(400).json({ error: "Missing image data" });
      }

      // ── 1. Gemini Vision (primary — fast, handles stylised beer label fonts) ─
      const gemini = await runGeminiOCR(image);
      if (gemini.available && gemini.text.trim().length >= 3) {
        return res.json({ text: gemini.text, exitCode: 1, engine: "gemini" });
      }

      // ── 2. PaddleOCR (fallback — neural net on VPS) ────────────────────────
      const paddle = await runPaddleOCR(image);
      if (paddle.available && paddle.text.trim().length >= 3) {
        return res.json({ text: paddle.text, exitCode: 1, engine: "paddleocr" });
      }

      // ── 3. Tesseract fallback (always available on VPS) ───────────────────
      const tesseractText = await runLocalTesseract(image);
      if (tesseractText && tesseractText.trim().length >= 3) {
        return res.json({ text: tesseractText, exitCode: 1, engine: "tesseract" });
      }

      // ── 4. OCR.space cloud (only if personal key set) ─────────────────────
      const apiKey = process.env.OCR_SPACE_KEY;
      if (!apiKey) {
        return res.json({ text: tesseractText || "", exitCode: 0, engine: paddle.available ? "paddleocr" : "tesseract" });
      }

      const params = new URLSearchParams();
      params.append("apikey", apiKey);
      params.append("base64Image", image);
      params.append("language", "ita");
      params.append("OCREngine", "2");
      params.append("scale", "true");
      params.append("detectOrientation", "true");
      params.append("isTable", "false");
      params.append("isOverlayRequired", "false");

      const ocrRes = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!ocrRes.ok) return res.json({ text: "", exitCode: -1, engine: "ocrspace_fail" });
      const ocrData = await ocrRes.json() as any;
      if (ocrData.IsErroredOnProcessing) return res.json({ text: "", exitCode: -1 });

      const parsed = ocrData.ParsedResults?.[0];
      return res.json({ text: parsed?.ParsedText || "", exitCode: parsed?.FileParseExitCode ?? -1, engine: "ocrspace" });
    } catch (err) {
      console.error("OCR error:", err);
      return res.status(500).json({ error: "OCR failed" });
    }
  });

  // ── Static Pages (public read, admin write) ────────────────────────────────

  function sanitizePageHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript\s*:/gi, '#');
  }

  app.get("/api/pages/:slug", async (req, res) => {
    const { slug } = req.params;
    const [page] = await db.select().from(staticPages).where(eq(staticPages.slug, slug));
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  });

  app.get("/api/admin/pages", isAuthenticated, isAdmin, async (_req, res) => {
    const pages = await db.select().from(staticPages).orderBy(asc(staticPages.slug));
    res.json(pages);
  });

  app.put("/api/admin/pages/:slug", isAuthenticated, isAdmin, async (req, res) => {
    const { slug } = req.params;
    const { title, content } = req.body;
    if (!title || content === undefined) return res.status(400).json({ error: "title and content required" });
    const safeContent = sanitizePageHtml(String(content));
    const [existing] = await db.select().from(staticPages).where(eq(staticPages.slug, slug));
    if (existing) {
      const [updated] = await db.update(staticPages)
        .set({ title, content: safeContent, updatedAt: new Date() })
        .where(eq(staticPages.slug, slug))
        .returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(staticPages).values({ slug, title, content: safeContent }).returning();
      return res.status(201).json(created);
    }
  });

  // ─── Addition Requests (user-facing) ─────────────────────────────────────────

  // Submit a new beer or brewery addition request
  app.post("/api/addition-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { type, beerName, breweryName, breweryId, style, abv, city, country, websiteUrl, description, notes, imageUrl, logoUrl, coverImageUrl } = req.body;
      if (!type || !['beer', 'brewery'].includes(type)) {
        return res.status(400).json({ message: "Tipo non valido (beer o brewery)" });
      }
      if (type === 'beer' && !beerName?.trim()) {
        return res.status(400).json({ message: "Nome birra obbligatorio" });
      }
      if (type === 'brewery' && !breweryName?.trim()) {
        return res.status(400).json({ message: "Nome birrificio obbligatorio" });
      }

      const [request] = await db.insert(additionRequests).values({
        userId,
        type,
        beerName: beerName?.trim() || null,
        breweryName: breweryName?.trim() || null,
        breweryId: breweryId ? parseInt(breweryId) : null,
        style: style?.trim() || null,
        abv: abv?.trim() || null,
        city: city?.trim() || null,
        country: country?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        coverImageUrl: coverImageUrl?.trim() || null,
        notes: notes?.trim() || null,
      }).returning();

      // Get submitter name
      const [submitter] = await db.select({ nickname: users.nickname, firstName: users.firstName })
        .from(users).where(eq(users.id, userId)).limit(1);
      const submitterName = submitter?.nickname || submitter?.firstName || 'Un utente';

      const typeLabel = type === 'beer' ? 'birra' : 'birrificio';
      const itemLabel = type === 'beer' ? (beerName || 'nuova birra') : (breweryName || 'nuovo birrificio');

      // Notify all admins
      await sendPushToAdmins({
        title: `🍺 Richiesta aggiunta ${typeLabel}`,
        body: `${submitterName} vuole aggiungere: ${itemLabel}`,
        url: '/admin/addition-requests',
        type: 'addition_request',
      });

      // If beer request for existing brewery: notify brewery owner
      if (type === 'beer' && breweryId) {
        const brId = parseInt(breweryId);
        const [owner] = await db.select({ id: users.id })
          .from(users)
          .where(and(eq(users.breweryId, brId), eq(users.userType, 'brewery_owner')))
          .limit(1);
        if (owner) {
          await sendPushToUser(owner.id, {
            title: '🍺 Richiesta nuova birra',
            body: `${submitterName} vuole aggiungere "${itemLabel}" al tuo birrificio`,
            url: '/admin/addition-requests',
            type: 'addition_request',
          });
        }
      }

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating addition request:", error);
      res.status(500).json({ message: "Errore durante l'invio della richiesta" });
    }
  });

  // List current user's own addition requests
  app.get("/api/addition-requests/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const rows = await db.select().from(additionRequests)
        .where(eq(additionRequests.userId, userId))
        .orderBy(desc(additionRequests.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching user addition requests:", error);
      res.status(500).json({ message: "Errore nel caricamento" });
    }
  });

  // ─── Scan Logs ────────────────────────────────────────────────────────────────

  // Create a scan log (called after OCR + search completes)
  app.post("/api/scan-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { ocrText, ocrEngine, source, usedQuery, topCandidates, latencyMs, imageDataUrl } = req.body;

      let imageUrl: string | null = null;
      if (imageDataUrl && imageDataUrl.startsWith("data:image")) {
        try {
          const buffer = Buffer.from(imageDataUrl.split(",")[1], "base64");
          imageUrl = await uploadImage(buffer, "scan-logs");
        } catch (e) {
          console.error("Scan log image upload failed:", e);
        }
      }

      const [log] = await db.insert(scanLogs).values({
        userId,
        imageUrl,
        ocrText: ocrText || null,
        ocrEngine: ocrEngine || null,
        source: source || "ocr",
        usedQuery: usedQuery || null,
        topCandidates: topCandidates || null,
        latencyMs: latencyMs || null,
      }).returning();

      res.status(201).json({ id: log.id });
    } catch (error) {
      console.error("Error creating scan log:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Enrich a beer with barcode and/or OFF image URL (from scanner)
  app.post("/api/beers/:id/enrich-barcode", isAuthenticated, async (req: any, res) => {
    try {
      const beerId = parseInt(req.params.id);
      const { barcode, offImageUrl } = req.body;
      if (!barcode && !offImageUrl) return res.json({ updated: false });

      const [beer] = await db.select().from(beers).where(eq(beers.id, beerId)).limit(1);
      if (!beer) return res.status(404).json({ error: "Beer not found" });

      const updates: Record<string, unknown> = {};
      if (barcode && !beer.barcode) updates.barcode = barcode;
      if (offImageUrl && !beer.logoUrl && !beer.imageUrl) updates.logoUrl = offImageUrl;

      if (Object.keys(updates).length > 0) {
        await db.update(beers).set(updates).where(eq(beers.id, beerId));
        return res.json({ updated: true, fields: Object.keys(updates) });
      }
      res.json({ updated: false, reason: "already set" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Save user feedback for a scan log (chosen result + correctness)
  app.patch("/api/scan-logs/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const logId = parseInt(req.params.id);
      const { chosenBeerId, chosenBreweryId, wasCorrect, correctedBeerId } = req.body;

      const [existing] = await db.select({ userId: scanLogs.userId })
        .from(scanLogs).where(eq(scanLogs.id, logId)).limit(1);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Log non trovato" });
      }

      await db.update(scanLogs).set({
        chosenBeerId: chosenBeerId || null,
        chosenBreweryId: chosenBreweryId || null,
        wasCorrect: wasCorrect ?? null,
        correctedBeerId: correctedBeerId || null,
      }).where(eq(scanLogs.id, logId));

      res.json({ ok: true });
    } catch (error) {
      console.error("Error updating scan log feedback:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Get current user's scan history
  app.get("/api/scan-logs/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const rows = await db
        .select({
          id: scanLogs.id,
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
          beerName: beers.name,
          beerStyle: beers.style,
          beerLogoUrl: beers.logoUrl,
          breweryName: breweries.name,
        })
        .from(scanLogs)
        .leftJoin(beers, eq(scanLogs.chosenBeerId, beers.id))
        .leftJoin(breweries, eq(scanLogs.chosenBreweryId, breweries.id))
        .where(eq(scanLogs.userId, userId))
        .orderBy(desc(scanLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(rows);
    } catch (error) {
      console.error("Error fetching scan logs:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Pub subscription request (sends email/notification to admin) - legacy fallback
  app.post("/api/pub-subscription-request", async (req: any, res) => {
    try {
      const { pubName, ownerName, email, vatNumber, phone, city, notes } = req.body;
      if (!pubName || !ownerName || !email) {
        return res.status(400).json({ message: "Dati obbligatori mancanti" });
      }
      console.log("[PUB SUBSCRIPTION REQUEST]", { pubName, ownerName, email, vatNumber, phone, city, notes, timestamp: new Date().toISOString() });
      res.json({ message: "Richiesta ricevuta" });
    } catch (error) {
      console.error("Error handling pub subscription request:", error);
      res.status(500).json({ message: "Errore" });
    }
  });

  // Stripe Checkout Session per abbonamento pub (€65/anno, 15 giorni di prova)
  app.post("/api/stripe/pub-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userName = req.user?.username || req.user?.displayName || "";
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "fermenta.to";
      const baseUrl = `https://${domain}`;

      // Trova o crea il prezzo €65/anno con 15 giorni di prova
      // Prima cerca un prezzo esistente tramite la variabile d'ambiente
      let priceId = process.env.STRIPE_PUB_PRICE_ID;
      if (!priceId) {
        // Cerca o crea il prodotto e il prezzo
        const products = await stripe.products.list({ active: true, limit: 10 });
        let product = products.data.find(p => p.metadata?.fermenta_type === "pub_subscription");
        if (!product) {
          product = await stripe.products.create({
            name: "Piano Pub Pro — Fermenta.to",
            description: "Accesso completo al pannello pub: taplist digitale, analytics, notifiche push, badge verificato",
            metadata: { fermenta_type: "pub_subscription" },
          });
        }
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        let price = prices.data.find(p => p.unit_amount === 6500 && p.currency === "eur" && p.recurring?.interval === "year");
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: 6500,
            currency: "eur",
            recurring: { interval: "year" },
            metadata: { fermenta_type: "pub_subscription" },
          });
        }
        priceId = price.id;
      }

      // Crea o trova il customer Stripe per l'utente
      const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string;
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: userName,
          metadata: { fermenta_user_id: String(userId) },
        });
        customerId = customer.id;
      }

      // Riattivazione: nessun trial (abbonamento già usato in passato)
      const isReactivation = req.body?.reactivate === true;

      const subscriptionData: any = {
        metadata: { fermenta_user_id: String(userId) },
      };
      if (!isReactivation) {
        subscriptionData.trial_period_days = 15;
      }

      // Crea la Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: subscriptionData,
        success_url: `${baseUrl}/attiva-pub?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/attiva-pub`,
        payment_method_collection: "always",
        locale: "it",
        metadata: { fermenta_user_id: String(userId) },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Stripe checkout error:", error.message);
      res.status(500).json({ message: "Errore nella creazione del pagamento: " + error.message });
    }
  });

  // ─── Auto-activate pub after Stripe checkout ─────────────────────────────
  app.post("/api/stripe/activate-pub", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });

      const { sessionId } = req.body;

      // Optionally verify the Stripe session belongs to this user
      if (sessionId) {
        try {
          const { getUncachableStripeClient } = await import("./stripeClient");
          const stripe = await getUncachableStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.status !== "complete") {
            return res.status(400).json({ message: "Checkout non completato" });
          }
        } catch (stripeErr: any) {
          console.warn("Stripe session verify warning:", stripeErr.message);
        }
      }

      // Check if pub already exists for user
      const [existingPub] = await db.select().from(pubs).where(eq(pubs.ownerId, userId));
      if (existingPub) {
        // Ensure pub has trial/active status
        const trialEndsAt = existingPub.trialEndsAt || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await db.update(pubs).set({ isVerified: true, subscriptionStatus: "trial", trialEndsAt }).where(eq(pubs.id, existingPub.id));

        // Also ensure user has pub_owner role (could be missing if registered via register-pub)
        const currentRoles: string[] = req.user?.roles || ["customer"];
        if (!currentRoles.includes("pub_owner")) {
          const newRoles = [...currentRoles, "pub_owner"];
          await db.update(users).set({
            roles: newRoles,
            userType: "pub_owner",
            activeRole: "pub_owner",
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
          const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
          req.login(updatedUser, () => {});
        }

        return res.json({ success: true, pub: existingPub, alreadyActive: true });
      }

      // Find the publicanRequest
      const [pubReq] = await db.select().from(publicanRequests).where(eq(publicanRequests.userId, userId));
      if (!pubReq) {
        return res.status(404).json({ message: "Nessuna richiesta pub trovata. Registra prima il tuo locale." });
      }

      // Create the pub from the request data
      const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const [newPub] = await db.insert(pubs).values({
        name: pubReq.pubName,
        address: pubReq.pubAddress,
        city: pubReq.pubCity,
        region: pubReq.pubRegion || pubReq.pubCity,
        phone: pubReq.phone || null,
        email: pubReq.email || req.user?.email || null,
        description: pubReq.description || null,
        vatNumber: pubReq.vatNumber || null,
        ownerId: userId,
        isVerified: true,
        subscriptionStatus: "trial",
        trialEndsAt,
        isActive: true,
      }).returning();

      // Update publicanRequest to approved
      await db.update(publicanRequests).set({
        status: "approved",
        reviewedAt: new Date(),
      }).where(eq(publicanRequests.id, pubReq.id));

      // Promote user to pub_owner role
      const currentRoles = req.user?.roles || ["customer"];
      const newRoles = currentRoles.includes("pub_owner") ? currentRoles : [...currentRoles, "pub_owner"];
      await db.update(users).set({
        roles: newRoles,
        userType: "pub_owner",
        activeRole: "pub_owner",
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      // Refresh session
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
      req.login(updatedUser, () => {});

      res.json({ success: true, pub: newPub });
    } catch (error: any) {
      console.error("activate-pub error:", error);
      res.status(500).json({ message: "Errore durante l'attivazione: " + error.message });
    }
  });

  // ─── Analytics: track pub page view (anonymous, fire-and-forget) ───────────
  app.post("/api/analytics/pub-view", async (req, res) => {
    try {
      const { pubId } = req.body;
      if (!pubId || isNaN(parseInt(pubId))) { res.json({ ok: true }); return; }
      await db.execute(
        sql`INSERT INTO pub_page_views (pub_id, view_date, view_count)
            VALUES (${parseInt(pubId)}, CURRENT_DATE, 1)
            ON CONFLICT (pub_id, view_date)
            DO UPDATE SET view_count = pub_page_views.view_count + 1`
      );
      res.json({ ok: true });
    } catch { res.json({ ok: true }); }
  });

  // ─── Analytics: pub analytics for owner dashboard ───────────────────────────
  app.get("/api/pubs/:id/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const pubId = parseInt(req.params.id);
      const userId = req.user?.id;
      const pub = await storage.getPub(pubId);
      if (!pub) { res.status(404).json({ message: "Pub non trovato" }); return; }
      const isOwner = pub.ownerId === userId;
      const isAdminUser = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdminUser) { res.status(403).json({ message: "Non autorizzato" }); return; }

      // Last 30 days of views
      const rows = await db.execute(
        sql`SELECT view_date::text as view_date, view_count
            FROM pub_page_views
            WHERE pub_id = ${pubId}
              AND view_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY view_date ASC`
      );

      // Build a complete 30-day series (fill missing days with 0)
      const map: Record<string, number> = {};
      for (const row of (rows as any).rows ?? rows) {
        map[row.view_date] = Number(row.view_count);
      }
      const series: { date: string; views: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        series.push({ date: key, views: map[key] ?? 0 });
      }

      const today = series[series.length - 1]?.views ?? 0;
      const yesterday = series[series.length - 2]?.views ?? 0;
      const last7 = series.slice(-7).reduce((s, d) => s + d.views, 0);
      const last30 = series.reduce((s, d) => s + d.views, 0);

      res.json({ today, yesterday, last7, last30, series });
    } catch (err: any) {
      console.error("Analytics error:", err.message);
      res.status(500).json({ message: "Errore nel recupero delle analitiche" });
    }
  });

  // ─── Home: recenti aggiunte alla taplist ─────────────────────────────────────
  app.get("/api/home/taplist-activity", async (_req, res) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          tl.id,
          p.id  AS pub_id,
          p.name AS pub_name,
          p.logo_url AS pub_logo,
          p.cover_image_url AS pub_cover,
          p.city AS pub_city,
          b.id   AS beer_id,
          b.name AS beer_name,
          b.style AS beer_style,
          b.abv,
          b.image_url AS beer_image,
          tl.tap_type
        FROM tap_list tl
        JOIN pubs  p ON p.id = tl.pub_id  AND p.is_active = true
        JOIN beers b ON b.id = tl.beer_id
        WHERE tl.is_active = true
        ORDER BY tl.id DESC
        LIMIT 20
      `);
      res.json((rows as any).rows ?? rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Home: recent brewery announcements (all breweries, for home page feed) ──
  app.get("/api/home/announcements", async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: breweryAnnouncements.id,
          type: breweryAnnouncements.type,
          title: breweryAnnouncements.title,
          content: breweryAnnouncements.content,
          releaseDate: breweryAnnouncements.releaseDate,
          createdAt: breweryAnnouncements.createdAt,
          breweryId: breweryAnnouncements.breweryId,
          breweryName: breweries.name,
          breweryLogo: breweries.logoUrl,
        })
        .from(breweryAnnouncements)
        .innerJoin(breweries, eq(breweries.id, breweryAnnouncements.breweryId))
        .where(eq(breweryAnnouncements.isPublished, true))
        .orderBy(desc(breweryAnnouncements.createdAt))
        .limit(8);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Brewery Announcements ───────────────────────────────────────────────────
  // GET public announcements
  app.get("/api/breweries/:id/announcements", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const rows = await db
        .select()
        .from(breweryAnnouncements)
        .where(and(eq(breweryAnnouncements.breweryId, breweryId), eq(breweryAnnouncements.isPublished, true)))
        .orderBy(desc(breweryAnnouncements.createdAt))
        .limit(20);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // POST create announcement (brewery owner only)
  app.post("/api/breweries/:id/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const brewery = await db.select().from(breweries).where(eq(breweries.id, breweryId)).limit(1);
      if (!brewery[0]) { res.status(404).json({ message: "Birrificio non trovato" }); return; }
      const isOwner = brewery[0].ownerId === req.user?.id;
      const isAdmin = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdmin) { res.status(403).json({ message: "Non autorizzato" }); return; }
      const parsed = insertBreweryAnnouncementSchema.parse({ ...req.body, breweryId });
      const [created] = await db.insert(breweryAnnouncements).values(parsed).returning();
      res.status(201).json(created);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // DELETE announcement
  app.delete("/api/breweries/:id/announcements/:annId", isAuthenticated, async (req: any, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const annId = parseInt(req.params.annId);
      const brewery = await db.select().from(breweries).where(eq(breweries.id, breweryId)).limit(1);
      if (!brewery[0]) { res.status(404).json({ message: "Birrificio non trovato" }); return; }
      const isOwner = brewery[0].ownerId === req.user?.id;
      const isAdmin = req.user?.activeRole === "admin" || req.user?.userType === "admin";
      if (!isOwner && !isAdmin) { res.status(403).json({ message: "Non autorizzato" }); return; }
      await db.delete(breweryAnnouncements).where(and(eq(breweryAnnouncements.id, annId), eq(breweryAnnouncements.breweryId, breweryId)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Brewery Distribution ────────────────────────────────────────────────────
  // GET pubs that have at least one beer from this brewery on their taplist
  app.get("/api/breweries/:id/distribution", async (req, res) => {
    try {
      const breweryId = parseInt(req.params.id);
      const rows = await db.execute(sql`
        SELECT DISTINCT
          p.id, p.name, p.address, p.city, p.region,
          p.latitude, p.longitude, p.logo_url,
          COUNT(DISTINCT tl.beer_id)::int AS beer_count
        FROM tap_list tl
        JOIN beers b ON b.id = tl.beer_id AND b.brewery_id = ${breweryId}
        JOIN pubs p ON p.id = tl.pub_id AND p.is_active = true
        WHERE tl.is_active = true
        GROUP BY p.id, p.name, p.address, p.city, p.region, p.latitude, p.longitude, p.logo_url
        ORDER BY beer_count DESC, p.name ASC
        LIMIT 100
      `);
      res.json((rows as any).rows ?? rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Beer Passport ───────────────────────────────────────────────────────────
  // GET: for authenticated user, returns regions of tasted beers (with brewery region)
  app.get("/api/users/me/beer-passport", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      // From tastings → beer → brewery → region
      const tastingRows = await db.execute(sql`
        SELECT DISTINCT
          br.region,
          br.location,
          COUNT(DISTINCT ubt.beer_id)::int AS beers_tasted,
          COUNT(DISTINCT br.id)::int AS breweries_tasted
        FROM user_beer_tastings ubt
        JOIN beers b ON b.id = ubt.beer_id
        JOIN breweries br ON br.id = b.brewery_id
        WHERE ubt.user_id = ${userId}
          AND br.region IS NOT NULL AND br.region != ''
        GROUP BY br.region, br.location
        ORDER BY beers_tasted DESC
      `);
      // Also count total unique beers tasted
      const totalRows = await db.execute(sql`
        SELECT COUNT(DISTINCT beer_id)::int AS total_beers,
               COUNT(DISTINCT (SELECT brewery_id FROM beers WHERE id = beer_id))::int AS total_breweries
        FROM user_beer_tastings WHERE user_id = ${userId}
      `);
      const total = ((totalRows as any).rows ?? totalRows)[0] ?? { total_beers: 0, total_breweries: 0 };
      res.json({
        regions: (tastingRows as any).rows ?? tastingRows,
        totalBeers: Number(total.total_beers),
        totalBreweries: Number(total.total_breweries),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Sitemap ────────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const [allPubs, allBreweries, allBeers] = await Promise.all([
        db.select({ id: pubs.id, updatedAt: pubs.updatedAt }).from(pubs).where(eq(pubs.isActive, true)).limit(5000),
        db.select({ id: breweries.id }).from(breweries).limit(5000),
        db.select({ id: beers.id }).from(beers).limit(10000),
      ]);
      const base = "https://fermenta.to";
      const url = (loc: string, priority: string, freq: string) =>
        `  <url><loc>${loc}</loc><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
      const lines = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
        url(base + "/", "1.0", "daily"),
        url(base + "/explore/pubs", "0.9", "daily"),
        url(base + "/explore/breweries", "0.9", "weekly"),
        url(base + "/explore/beers", "0.9", "weekly"),
        ...allPubs.map(p => url(`${base}/pub/${p.id}`, "0.8", "daily")),
        ...allBreweries.map(b => url(`${base}/brewery/${b.id}`, "0.7", "weekly")),
        ...allBeers.map(b => url(`${base}/beer/${b.id}`, "0.6", "monthly")),
        `</urlset>`,
      ];
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(lines.join("\n"));
    } catch (err: any) {
      console.error("Sitemap error:", err.message);
      res.status(500).send("Errore generazione sitemap");
    }
  });

  // ─── Social crawler OG tag injection ────────────────────────────────────────
  const SOCIAL_BOTS = /whatsapp|telegram|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot/i;

  const ogHtml = (meta: { title: string; description: string; image?: string; url: string; type?: string }) => `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="UTF-8">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${meta.url}">
<meta property="og:type" content="${meta.type ?? "website"}">
<meta property="og:site_name" content="Fermenta.to">
${meta.image ? `<meta property="og:image" content="${meta.image}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${meta.title}">
<meta name="twitter:description" content="${meta.description}">
${meta.image ? `<meta name="twitter:image" content="${meta.image}">` : ""}
</head><body></body></html>`;

  app.get(["/pub/:id", "/brewery/:id", "/beer/:id"], async (req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (!SOCIAL_BOTS.test(ua)) return next();
    try {
      const base = "https://fermenta.to";
      const id = parseInt(req.params.id);
      if (req.path.startsWith("/pub/")) {
        const pub = await storage.getPub(id);
        if (!pub) return next();
        const p = pub as any;
        res.send(ogHtml({
          title: `${p.name} — Birre artigianali | Fermenta.to`,
          description: p.description ? p.description.slice(0, 155) : `Scopri la taplist di ${p.name} su Fermenta.to`,
          image: p.coverImageUrl || p.logoUrl,
          url: `${base}/pub/${id}`,
          type: "website",
        }));
      } else if (req.path.startsWith("/brewery/")) {
        const br = await storage.getBrewery(id);
        if (!br) return next();
        const b = br as any;
        res.send(ogHtml({
          title: `${b.name} — Birrificio artigianale | Fermenta.to`,
          description: b.description ? b.description.slice(0, 155) : `Scopri le birre di ${b.name} su Fermenta.to`,
          image: b.coverImageUrl || b.logoUrl,
          url: `${base}/brewery/${id}`,
        }));
      } else {
        const beer = await storage.getBeer(id);
        if (!beer) return next();
        const beerData = beer as any;
        res.send(ogHtml({
          title: `${beerData.name} — ${beerData.style ?? "Birra artigianale"} | Fermenta.to`,
          description: beerData.description ? beerData.description.slice(0, 155) : `Scopri ${beerData.name} su Fermenta.to`,
          image: beerData.imageUrl,
          url: `${base}/beer/${id}`,
        }));
      }
    } catch { next(); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
