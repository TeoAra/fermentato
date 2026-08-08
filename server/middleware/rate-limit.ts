import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { pool } from "../db";

const isDev = process.env.NODE_ENV !== "production";

// ── Sicurezza: log eventi al superamento del limite per-utente ─────────────
// Usa un bucket orario con upsert: max 1 riga per (user, endpoint, ora).
// Violazioni ripetute nella stessa ora incrementano il contatore — nessun
// rischio di unbounded table growth da flooding intenzionale.
async function logSecurityEvent(userId: string, endpoint: string, _ip: string) {
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, endpoint, bucket, violation_count, last_violation_at)
       VALUES ($1, $2, date_trunc('hour', NOW()), 1, NOW())
       ON CONFLICT (user_id, endpoint, bucket)
       DO UPDATE SET
         violation_count   = security_events.violation_count + 1,
         last_violation_at = NOW()`,
      [userId, endpoint],
    );
  } catch {
    // La tabella potrebbe non esistere ancora: skip silenzioso
  }
}

/**
 * Rate limit per-utente autenticato su azioni di scrittura social.
 * Key = user:<userId>:<endpoint> — non tocca gli utenti anonimi (già coperti da generalApiRateLimit).
 * In dev il limite è 100× per non bloccare il testing.
 */
function createUserRateLimit(opts: {
  windowMs: number;
  max: number;
  message: string;
  endpoint: string;
}) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: isDev ? opts.max * 100 : opts.max,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user?.id ? `user:${user.id}:${opts.endpoint}` : (req.ip ?? "anon");
    },
    handler: (req: Request, res: any) => {
      const user = (req as any).user;
      if (user?.id) {
        logSecurityEvent(user.id, opts.endpoint, req.ip ?? "").catch(() => {});
      }
      res.status(429).json({ message: opts.message });
    },
    standardHeaders: true,
    legacyHeaders: false,
    // IP fallback nel keyGenerator non viene mai raggiunto: skip esclude gli anonimi.
    // La validazione statica di express-rate-limit non lo sa → disabilitarla esplicitamente.
    validate: { keyGeneratorIpFallback: false },
    // Gli utenti anonimi sono già coperti da generalApiRateLimit
    skip: (req: Request) => !(req as any).user?.id,
  });
}

/** POST /api/user/beer-tastings — max 10 check-in ogni 10 min */
export const checkinRateLimit = createUserRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Stai facendo troppi check-in. Riprova tra 10 minuti.",
  endpoint: "checkin",
});

/** POST *\/like — max 30 like al minuto */
export const likeRateLimit = createUserRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Stai mettendo troppi like. Riprova tra un minuto.",
  endpoint: "like",
});

/** POST *\/comments — max 20 commenti ogni 10 min */
export const commentRateLimit = createUserRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Stai commentando troppo velocemente. Riprova tra 10 minuti.",
  endpoint: "comment",
});

/** POST /api/microblog/posts — max 5 post ogni 10 min */
export const microblogPostRateLimit = createUserRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Stai pubblicando troppi post. Riprova tra 10 minuti.",
  endpoint: "microblog_post",
});

/**
 * Login brute-force protection: 10 tentativi ogni 15 minuti per IP.
 * In dev il limite è allentato (100 req) per non bloccare il testing.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { message: "Troppi tentativi di login. Riprova tra 15 minuti." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registrazione spam protection: 5 nuovi account ogni ora per IP.
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 5,
  message: { message: "Troppi account creati da questo indirizzo. Riprova tra un'ora." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset / forgot-password: 3 richieste ogni 30 minuti per IP.
 * Previene l'abuso dell'endpoint per inviare spam email.
 */
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: isDev ? 100 : 3,
  message: { message: "Troppe richieste di recupero password. Riprova tra 30 minuti." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search API: 60 ricerche al minuto per IP.
 * Il pre-warming interno bypassa questo limite via skip (loopback).
 */
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 300 : 60,
  message: { message: "Troppe ricerche. Rallenta un po'." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip ?? "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  },
});

/**
 * Limite generale su tutte le API: 300 richieste ogni 5 minuti per IP.
 * Blocca flooding e brute-force su endpoint non altrimenti protetti.
 * Il loopback (pre-warming, task interni) viene escluso automaticamente.
 */
export const generalApiRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 5000 : 300,
  message: { message: "Troppe richieste. Riprova tra qualche minuto." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const ip = req.ip ?? "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  },
});
