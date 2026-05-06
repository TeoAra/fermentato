/**
 * Bot Routes — API per gestione connessioni bot (Telegram / WhatsApp).
 * Registra anche i webhook e il processo di collegamento account.
 */
import type { Express, Request, Response } from "express";
import { db, pool } from "./db";
import { botConnections, botLinkTokens, pubs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { generateLinkToken } from "./bot-commands";
import { handleTelegramWebhook } from "./telegram-bot";
import { handleWhatsAppVerify } from "./whatsapp-bot";

// ── Migrazione automatica — crea le tabelle bot se non esistono ───────────────
export async function runBotMigrations(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_connections (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
        platform VARCHAR(20) NOT NULL,
        chat_id VARCHAR(100) NOT NULL,
        display_name VARCHAR,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT bot_connections_platform_chat_id_unique UNIQUE (platform, chat_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_link_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[bot] migrations ok");
  } catch (e: any) {
    console.error("[bot] migration error:", e.message);
  }
}

function isAuthenticated(req: any, res: Response, next: Function) {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  next();
}

export function registerBotRoutes(app: Express): void {

  // ── GET /api/bot/connections — lista connessioni dell'utente ────────────────
  app.get("/api/bot/connections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub ?? req.user.id;
      const rows = await db
        .select()
        .from(botConnections)
        .where(and(eq(botConnections.userId, userId), eq(botConnections.isActive, true)));
      res.json(rows);
    } catch (e) {
      res.status(500).json({ message: "Errore nel recupero connessioni" });
    }
  });

  // ── DELETE /api/bot/connections/:id — scollega un bot ───────────────────────
  app.delete("/api/bot/connections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub ?? req.user.id;
      const id = parseInt(req.params.id);
      await db
        .update(botConnections)
        .set({ isActive: false })
        .where(and(eq(botConnections.id, id), eq(botConnections.userId, userId)));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Errore nello scollegamento" });
    }
  });

  // ── POST /api/bot/link-token — genera un token di collegamento (15 min) ─────
  app.post("/api/bot/link-token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub ?? req.user.id;

      // Determina il pubId: primo pub dell'utente o quello passato nel body
      let pubId: number | null = req.body?.pubId ?? null;
      if (!pubId) {
        const [pub] = await db.select({ id: pubs.id }).from(pubs).where(eq(pubs.ownerId, userId));
        pubId = pub?.id ?? null;
      }
      if (!pubId) return res.status(400).json({ message: "Nessun pub trovato per l'utente" });

      const token = generateLinkToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti

      await db.insert(botLinkTokens).values({ token, userId, pubId, expiresAt });

      res.json({ token, expiresAt });
    } catch (e) {
      res.status(500).json({ message: "Errore nella generazione del token" });
    }
  });

  // ── POST /api/bot/telegram/webhook — Telegram update ────────────────────────
  app.post("/api/bot/telegram/webhook", async (req: Request, res: Response) => {
    await handleTelegramWebhook(req, res);
  });

  // ── GET /api/bot/whatsapp/webhook — Meta verifica webhook ───────────────────
  app.get("/api/bot/whatsapp/webhook", (req: Request, res: Response) => {
    handleWhatsAppVerify(req, res);
  });

  // ── GET /api/bot/status — stato configurazione bot ──────────────────────────
  app.get("/api/bot/status", (_req, res) => {
    res.json({
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
      whatsappPhoneDisplay: process.env.WHATSAPP_DISPLAY_PHONE ?? null,
    });
  });
}
