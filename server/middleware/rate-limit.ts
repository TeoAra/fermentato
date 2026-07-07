import rateLimit from "express-rate-limit";
import type { Request } from "express";

const isDev = process.env.NODE_ENV !== "production";

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
