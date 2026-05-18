/**
 * Endpoint per il login nativo (iOS/Android Capacitor) tramite Google
 * e Apple Sign-In.
 *
 * Flusso:
 *  1. L'app nativa usa il plugin @capgo/capacitor-social-login per ottenere
 *     un idToken (Google) o identityToken (Apple) firmato dal provider.
 *  2. L'app POSTa il token a questi endpoint.
 *  3. Il backend verifica la firma del token contro le chiavi pubbliche del
 *     provider (Google Discovery / Apple JWKS), estrae sub+email+name.
 *  4. Trova o crea l'utente, registra l'OAuth account, esegue req.login().
 *
 * NOTA: Apple manda il name SOLO al primo login; va salvato subito.
 * Email può essere un alias relay (xxx@privaterelay.appleid.com).
 */
import type { Express } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, oauthAccounts } from "@shared/schema";
import type { User } from "@shared/schema";

// iOS OAuth Client ID Google (PUBBLICO, lo stesso usato dall'app iOS).
// Web client ID se presente nelle env vars (per audience multipla).
const GOOGLE_IOS_CLIENT_ID =
  "131123139785-stv42sugd3i1u0lb3u0jssoink746n81.apps.googleusercontent.com";

const googleClient = new OAuth2Client();

// Apple JWKS — chiavi pubbliche cambiano periodicamente, jwks-rsa fa cache 10min.
const appleJwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
});

function getAppleKey(header: any, cb: any) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) return cb(err || new Error("no_key"));
    cb(null, key.getPublicKey());
  });
}

// Bundle ID iOS = audience del token Apple (iOS).
const APPLE_BUNDLE_ID = "to.fermentato.app";
// Service ID Apple Sign-In web (per il fallback web/Android).
const APPLE_SERVICE_ID = "to.fermentato.app.web";

interface NormalizedUser {
  provider: "google" | "apple";
  providerUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
}

async function findOrCreateUser(p: NormalizedUser): Promise<User> {
  // 1. Cerca l'OAuth account esistente
  const [existing] = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, p.provider),
        eq(oauthAccounts.providerUserId, p.providerUserId),
      ),
    );
  if (existing) {
    const [user] = await db.select().from(users).where(eq(users.id, existing.userId));
    if (user) return user;
  }

  // 2. Cerca utente con stessa email (per linkare account email/password
  // esistente al provider). Apple relay email — è comunque univoca e stabile.
  let user: User | undefined;
  if (p.email) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, p.email));
    user = byEmail;
    // Backfill: Apple invia firstName/lastName SOLO al primo Sign-In; se
    // troviamo un account esistente (es. creato via email/password) e i
    // campi nome sono vuoti, riempiamoli adesso — altrimenti perdiamo il
    // nome per sempre alle successive login.
    if (user) {
      const patch: Partial<User> = {};
      if (!user.firstName && p.firstName) patch.firstName = p.firstName;
      if (!user.lastName && p.lastName) patch.lastName = p.lastName;
      if (!user.profileImageUrl && p.profileImageUrl) patch.profileImageUrl = p.profileImageUrl;
      if (Object.keys(patch).length > 0) {
        const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
        if (updated) user = updated;
      }
    }
  }

  // 3. Crea utente nuovo
  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        id: nanoid(),
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        profileImageUrl: p.profileImageUrl,
        userType: "customer",
        roles: ["customer"],
        activeRole: "customer",
        isEmailVerified: p.emailVerified,
        needsOnboarding: false,
      })
      .returning();
    if (!newUser) throw new Error("user_creation_failed");
    user = newUser;
  }

  // 4. Linka OAuth account (se non già linkato)
  await db
    .insert(oauthAccounts)
    .values({
      userId: user.id,
      provider: p.provider,
      providerUserId: p.providerUserId,
    })
    .onConflictDoNothing();

  return user;
}

function loginUser(req: any, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.login(user, (err: any) => (err ? reject(err) : resolve()));
  });
}

export function registerNativeAuthRoutes(app: Express): void {
  // ─── Google native login ────────────────────────────────────────────────
  app.post("/api/auth/google-native", async (req, res) => {
    try {
      const { idToken } = req.body as { idToken?: string };
      if (!idToken) return res.status(400).json({ error: "missing_id_token" });

      const audience = [GOOGLE_IOS_CLIENT_ID];
      if (process.env.GOOGLE_CLIENT_ID) audience.push(process.env.GOOGLE_CLIENT_ID);
      if (process.env.GOOGLE_ANDROID_CLIENT_ID)
        audience.push(process.env.GOOGLE_ANDROID_CLIENT_ID);

      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (!payload?.sub) return res.status(401).json({ error: "invalid_token" });

      const user = await findOrCreateUser({
        provider: "google",
        providerUserId: payload.sub,
        email: payload.email?.toLowerCase() ?? null,
        firstName: payload.given_name ?? null,
        lastName: payload.family_name ?? null,
        profileImageUrl: payload.picture ?? null,
        emailVerified: payload.email_verified === true,
      });
      await loginUser(req, user);

      const role = user.activeRole || user.userType;
      res.json({ ok: true, redirectTo: role === "admin" ? "/admin" : "/dashboard" });
    } catch (err: any) {
      console.error("[google-native] error:", err?.message || err);
      res.status(401).json({ error: "verification_failed", detail: err?.message });
    }
  });

  // ─── Apple native login ─────────────────────────────────────────────────
  app.post("/api/auth/apple-native", async (req, res) => {
    try {
      const { identityToken, firstName, lastName, email } = req.body as {
        identityToken?: string;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      };
      if (!identityToken) return res.status(400).json({ error: "missing_token" });

      // Verifica firma del JWT contro le chiavi pubbliche Apple
      const payload = await new Promise<any>((resolve, reject) => {
        jwt.verify(
          identityToken,
          getAppleKey,
          {
            algorithms: ["RS256"],
            issuer: "https://appleid.apple.com",
            audience: [APPLE_BUNDLE_ID, APPLE_SERVICE_ID],
          },
          (err, decoded) => (err ? reject(err) : resolve(decoded)),
        );
      });

      if (!payload?.sub) return res.status(401).json({ error: "invalid_token" });

      const tokenEmail = (payload.email as string | undefined)?.toLowerCase() ?? null;
      const finalEmail = tokenEmail ?? email?.toLowerCase() ?? null;
      const emailVerified = payload.email_verified === true || payload.email_verified === "true";

      const user = await findOrCreateUser({
        provider: "apple",
        providerUserId: payload.sub,
        email: finalEmail,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        profileImageUrl: null,
        emailVerified,
      });
      await loginUser(req, user);

      const role = user.activeRole || user.userType;
      res.json({ ok: true, redirectTo: role === "admin" ? "/admin" : "/dashboard" });
    } catch (err: any) {
      console.error("[apple-native] error:", err?.message || err);
      res.status(401).json({ error: "verification_failed", detail: err?.message });
    }
  });
}
