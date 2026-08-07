import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users, oauthAccounts, publicanRequests, breweries, breweryRequests, pubs } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import type { User } from "@shared/schema";
import { storage } from "./storage";
import { sendPushToAdmins } from "./push-utils";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit } from "./middleware/rate-limit";

declare module "passport-local" {
  interface IVerifyOptions {
    email?: string | null;
  }
}

const SALT_ROUNDS = 12;

async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) return true;
  if (!token) return false;
  try {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    const resp = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      // sameSite:'none' permette all'app Capacitor (cross-origin) di inviare i cookie
      // secure deve essere true quando sameSite='none' (garantito in prod)
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy (email/password)
  passport.use(new LocalStrategy(
    { usernameField: 'emailOrUsername', passwordField: 'password' },
    async (emailOrUsername, password, done) => {
      try {
        const input = emailOrUsername.trim().toLowerCase();
        const isEmail = input.includes('@');
        const [user] = isEmail
          ? await db.select().from(users).where(eq(users.email, input))
          : await db.select().from(users).where(eq(sql`lower(${users.nickname})`, input.replace(/^@/, '')));
        
        if (!user) {
          return done(null, false, { message: 'Credenziali non corrette' });
        }
        
        if (!user.hashedPassword) {
          return done(null, false, { message: 'Account creato con social login. Usa Google per accedere.' });
        }
        
        const isValid = await verifyPassword(password, user.hashedPassword);
        if (!isValid) {
          return done(null, false, { message: 'Email o password non corretti' });
        }

        if (!user.isEmailVerified) {
          return done(null, false, { message: 'EMAIL_NOT_VERIFIED', email: user.email });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google OAuth Strategy (only if credentials are available)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Dynamic callback URL based on environment
    let callbackURL = process.env.GOOGLE_CALLBACK_URL;
    if (!callbackURL) {
      const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
      if (domain) {
        callbackURL = `https://${domain}/api/auth/google/callback`;
      } else {
        callbackURL = 'https://fermenta.to/api/auth/google/callback';
      }
    }
    console.log('Google OAuth callback URL:', callbackURL);
    
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase();
          
          // Check if OAuth account already exists
          const [existingOAuth] = await db.select()
            .from(oauthAccounts)
            .where(and(
              eq(oauthAccounts.provider, 'google'),
              eq(oauthAccounts.providerUserId, googleId)
            ));
          
          if (existingOAuth) {
            // Update tokens
            await db.update(oauthAccounts)
              .set({ 
                accessToken, 
                refreshToken: refreshToken || existingOAuth.refreshToken,
                updatedAt: new Date() 
              })
              .where(eq(oauthAccounts.id, existingOAuth.id));
            
            const [user] = await db.select().from(users).where(eq(users.id, existingOAuth.userId));
            return done(null, user);
          }
          
          // Check if user exists with same email
          let user: User | undefined;
          if (email) {
            const [existingUser] = await db.select().from(users).where(eq(users.email, email));
            user = existingUser;
          }
          
          if (!user) {
            // Create new user — go straight to dashboard, no orphan onboarding page
            const userId = nanoid();
            const [newUser] = await db.insert(users).values({
              id: userId,
              email,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
              userType: 'customer',
              roles: ['customer'],
              activeRole: 'customer',
              isEmailVerified: true,
              needsOnboarding: false,
            }).returning();
            user = newUser;
          }
          
          if (!user) {
            return done(new Error('Errore creazione utente Google'));
          }

          // Link OAuth account
          await db.insert(oauthAccounts).values({
            userId: user.id,
            provider: 'google',
            providerUserId: googleId,
            accessToken,
            refreshToken,
          });
          
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    ));
  }

  // Serialize/Deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Auth Routes

  // Check nickname availability
  app.get('/api/auth/check-nickname', async (req, res) => {
    const { nickname } = req.query as { nickname: string };
    if (!nickname || nickname.length < 3) return res.json({ available: false });
    if (!/^[a-zA-Z0-9_.]+$/.test(nickname)) return res.json({ available: false });
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(eq(sql`lower(${users.nickname})`, nickname.toLowerCase()));
    return res.json({ available: !existing });
  });

  // Check pub slug availability (used during registration)
  app.get('/api/auth/check-pub-slug', async (req, res) => {
    const { slug } = req.query as { slug: string };
    if (!slug || slug.length < 2) return res.json({ available: false });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.json({ available: false, invalid: true });
    const [existing] = await db.select({ id: pubs.id }).from(pubs)
      .where(eq(pubs.slug, slug.toLowerCase()));
    return res.json({ available: !existing });
  });

  // Register with email/password
  app.post('/api/auth/register', registerRateLimit, async (req, res) => {
    try {
      const { 
        nickname, email, password,
        isPublican, pubName, pubAddress, pubCity, pubRegion, vatNumber, phone, description,
        isBrewery, breweryId: existingBreweryId, breweryName, breweryLocation, breweryRegion, breweryCountry, breweryVatNumber, breweryPhone, breweryDescription, breweryWebsite,
        recaptchaToken
      } = req.body;

      const recaptchaOk = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaOk) {
        return res.status(400).json({ message: 'Verifica reCAPTCHA fallita. Riprova.' });
      }
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email e password sono obbligatori' });
      }

      if (!nickname || nickname.trim().length < 3) {
        return res.status(400).json({ message: 'Username: minimo 3 caratteri' });
      }

      const normalizedNickname = nickname.trim();
      if (!/^[a-zA-Z0-9_.]+$/.test(normalizedNickname)) {
        return res.status(400).json({ message: 'Username: solo lettere, numeri, punti e underscore' });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });
      }
      
      // Validate publican fields if registering as publican
      if (isPublican) {
        const trimmedPubName = typeof pubName === 'string' ? pubName.trim() : '';
        const trimmedPubAddress = typeof pubAddress === 'string' ? pubAddress.trim() : '';
        const trimmedPubCity = typeof pubCity === 'string' ? pubCity.trim() : '';
        
        if (!trimmedPubName || !trimmedPubAddress || !trimmedPubCity) {
          return res.status(400).json({ message: 'Nome locale, indirizzo e città sono obbligatori per i gestori' });
        }
        
        if (trimmedPubName.length > 100 || trimmedPubAddress.length > 200 || trimmedPubCity.length > 100) {
          return res.status(400).json({ message: 'Dati del locale troppo lunghi' });
        }
      }

      // Validate brewery fields if registering as brewery
      if (isBrewery && !existingBreweryId) {
        const trimmedBreweryName = typeof breweryName === 'string' ? breweryName.trim() : '';
        if (!trimmedBreweryName) {
          return res.status(400).json({ message: 'Nome del birrificio è obbligatorio' });
        }
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email already exists
      const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing) {
        return res.status(400).json({ message: 'Email già registrata' });
      }

      // Check if nickname already exists
      const [existingNick] = await db.select().from(users).where(eq(sql`lower(${users.nickname})`, normalizedNickname.toLowerCase()));
      if (existingNick) {
        return res.status(400).json({ message: 'Username già in uso, scegline un altro' });
      }
      
      const hashedPwd = await hashPassword(password);
      const userId = nanoid();

      // Determine roles - brewery_owner is NOT assigned at registration, only after approval
      const userRoles: string[] = ['customer'];
      
      const verificationToken = nanoid(32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [newUser] = await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        hashedPassword: hashedPwd,
        nickname: normalizedNickname,
        userType: 'customer',
        roles: userRoles,
        activeRole: 'customer',
        breweryId: null,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      }).returning();
      
      // If registering as publican, create a pending request
      if (isPublican) {
        const trimmedPubName = typeof pubName === 'string' ? pubName.trim() : '';
        const trimmedPubAddress = typeof pubAddress === 'string' ? pubAddress.trim() : '';
        const trimmedPubCity = typeof pubCity === 'string' ? pubCity.trim() : '';
        const trimmedPubRegion = typeof pubRegion === 'string' ? pubRegion.trim() : null;
        const trimmedVatNumber = typeof vatNumber === 'string' ? vatNumber.trim() : null;
        const trimmedPhone = typeof phone === 'string' ? phone.trim() : null;
        const trimmedDescription = typeof description === 'string' ? description.trim() : null;
        
        await db.insert(publicanRequests).values({
          userId: userId,
          pubName: trimmedPubName,
          pubAddress: trimmedPubAddress,
          pubCity: trimmedPubCity,
          pubRegion: trimmedPubRegion || null,
          vatNumber: trimmedVatNumber || null,
          phone: trimmedPhone || null,
          email: normalizedEmail,
          description: trimmedDescription || null,
          status: 'pending',
        });
        
        console.log(`New publican request created for user ${userId} - Pub: ${trimmedPubName}`);

        try {
          const adminIds = await storage.getAdminUserIds();
          for (const adminId of adminIds) {
            await storage.createNotification({
              userId: adminId,
              type: 'new_pub_request',
              title: 'Nuova richiesta pub',
              message: `${normalizedEmail} ha richiesto di registrare "${trimmedPubName}" (${trimmedPubCity}).`,
              pubId: null,
              beerId: null,
              isRead: false,
            });
          }
          await sendPushToAdmins({
            title: 'Nuova richiesta pub',
            body: `${normalizedEmail} ha richiesto di registrare "${trimmedPubName}" (${trimmedPubCity}).`,
            url: '/admin/requests',
          });
        } catch (notifError) {
          console.error('Error sending admin notification:', notifError);
        }
      }

      // If registering as brewery, create a pending brewery request
      if (isBrewery) {
        const trimmedBreweryName = typeof breweryName === 'string' ? breweryName.trim() : '';
        const trimmedBreweryLocation = typeof breweryLocation === 'string' ? breweryLocation.trim() : '';
        const trimmedBreweryRegion = typeof breweryRegion === 'string' ? breweryRegion.trim() : null;
        const trimmedBreweryCountry = typeof breweryCountry === 'string' ? breweryCountry.trim() : null;
        const trimmedBreweryVat = typeof breweryVatNumber === 'string' ? breweryVatNumber.trim() : null;
        const trimmedBreweryPhone = typeof breweryPhone === 'string' ? breweryPhone.trim() : null;
        const trimmedBreweryWebsite = typeof breweryWebsite === 'string' ? breweryWebsite.trim() : null;
        const trimmedBreweryDesc = typeof breweryDescription === 'string' ? breweryDescription.trim() : null;

        // When the user selected an existing brewery, look up its real name so the admin sees it.
        let resolvedBreweryName = trimmedBreweryName;
        if (!resolvedBreweryName && existingBreweryId) {
          const [existingBrew] = await db.select({ name: breweries.name }).from(breweries).where(eq(breweries.id, parseInt(existingBreweryId)));
          resolvedBreweryName = existingBrew?.name || '';
        }
        await db.insert(breweryRequests).values({
          userId: userId,
          breweryName: resolvedBreweryName || 'Birrificio',
          breweryLocation: trimmedBreweryLocation || 'N/A',
          breweryRegion: trimmedBreweryRegion || null,
          breweryCountry: trimmedBreweryCountry || null,
          vatNumber: trimmedBreweryVat || null,
          phone: trimmedBreweryPhone || null,
          email: normalizedEmail,
          websiteUrl: trimmedBreweryWebsite || null,
          description: trimmedBreweryDesc || null,
          existingBreweryId: existingBreweryId ? parseInt(existingBreweryId) : null,
          status: 'pending',
        });

        console.log(`New brewery request created for user ${userId} - Brewery: ${trimmedBreweryName || 'existing #' + existingBreweryId}`);

        try {
          const adminIds = await storage.getAdminUserIds();
          for (const adminId of adminIds) {
            await storage.createNotification({
              userId: adminId,
              type: 'new_brewery_request',
              title: 'Nuova richiesta birrificio',
              message: `${normalizedEmail} ha richiesto di registrare il birrificio "${trimmedBreweryName || 'esistente'}"${trimmedBreweryLocation ? ` (${trimmedBreweryLocation})` : ''}.`,
              pubId: null,
              beerId: null,
              isRead: false,
            });
          }
          await sendPushToAdmins({
            title: 'Nuova richiesta birrificio',
            body: `${normalizedEmail} ha richiesto di registrare il birrificio "${trimmedBreweryName || 'esistente'}".`,
            url: '/admin/requests?section=brewery',
          });
        } catch (notifError) {
          console.error('Error sending admin brewery notification:', notifError);
        }
      }
      
      // Send verification email and return pending state
      try {
        await sendVerificationEmail(normalizedEmail, verificationToken);
      } catch (emailErr) {
        console.error('Error sending verification email:', emailErr);
      }

      res.json({
        pendingVerification: true,
        email: normalizedEmail,
        message: 'Registrazione quasi completata! Controlla la tua email e clicca sul link di conferma per attivare il tuo account.',
        publicanRequest: isPublican ? true : false,
        breweryRequest: isBrewery ? true : false,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Errore durante la registrazione' });
    }
  });

  // Register a pub or brewpub (direct pub creation + optional trial start on email verify)
  app.post('/api/auth/register-pub', async (req, res) => {
    try {
      const {
        nickname, email, password,
        pubName, pubAddress, pubCity, pubRegion, vatNumber, phone, description,
        pubLat, pubLng, pubSlug,
        isBrewpub,
        breweryId: existingBreweryId, breweryName, breweryLocation, breweryRegion, breweryCountry,
        breweryVatNumber, breweryPhone, breweryDescription, breweryWebsite,
        recaptchaToken,
      } = req.body;

      const recaptchaOk = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaOk) return res.status(400).json({ message: 'Verifica reCAPTCHA fallita. Riprova.' });

      if (!nickname || nickname.trim().length < 3) return res.status(400).json({ message: 'Username: minimo 3 caratteri' });
      if (!/^[a-zA-Z0-9_.]+$/.test(nickname.trim())) return res.status(400).json({ message: 'Username: solo lettere, numeri, punti e underscore' });
      if (!email || !password) return res.status(400).json({ message: 'Email e password sono obbligatori' });
      if (password.length < 8) return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });

      const trimmedPubName = (pubName || '').trim();
      const trimmedPubAddress = (pubAddress || '').trim();
      const trimmedPubCity = (pubCity || '').trim();
      if (!trimmedPubName || !trimmedPubAddress || !trimmedPubCity) {
        return res.status(400).json({ message: 'Nome locale, indirizzo e città sono obbligatori' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedNickname = nickname.trim();

      const [existingEmail] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existingEmail) return res.status(400).json({ message: 'Email già registrata' });

      const [existingNick] = await db.select().from(users).where(eq(sql`lower(${users.nickname})`, normalizedNickname.toLowerCase()));
      if (existingNick) return res.status(400).json({ message: 'Username già in uso, scegline un altro' });

      const hashedPwd = await hashPassword(password);
      const userId = nanoid();
      const verificationToken = nanoid(32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        hashedPassword: hashedPwd,
        nickname: normalizedNickname,
        userType: 'customer',
        roles: ['customer'],
        activeRole: 'customer',
        breweryId: null,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      // Create pub directly in pubs table (unverified, no subscription yet)
      const [newPub] = await db.insert(pubs).values({
        name: trimmedPubName,
        address: trimmedPubAddress,
        city: trimmedPubCity,
        region: (pubRegion || '').trim() || trimmedPubCity,
        phone: (phone || '').trim() || null,
        description: (description || '').trim() || null,
        vatNumber: (vatNumber || '').trim() || null,
        latitude: pubLat != null ? String(pubLat) : null,
        longitude: pubLng != null ? String(pubLng) : null,
        ownerId: userId,
        isVerified: false,
        subscriptionStatus: 'none',
        isActive: true,
      }).returning({ id: pubs.id });

      // Generate and assign slug immediately (do not wait for startup migration)
      try {
        const rawSlug = typeof pubSlug === 'string' && pubSlug.trim()
          ? pubSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
          : trimmedPubName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
        let finalSlug = rawSlug;
        let counter = 2;
        while (true) {
          const [taken] = await db.select({ id: pubs.id }).from(pubs).where(
            sql`${pubs.slug} = ${finalSlug} AND ${pubs.id} != ${newPub.id}`
          ).limit(1);
          if (!taken) break;
          finalSlug = `${rawSlug}-${counter}`;
          counter++;
        }
        await db.update(pubs).set({ slug: finalSlug }).where(eq(pubs.id, newPub.id));
      } catch (slugErr) {
        console.error('[register-pub] slug generation error:', slugErr);
      }

      // If brewpub: create brewery request for admin approval
      if (isBrewpub) {
        const trimmedBreweryName = (breweryName || '').trim();
        if (trimmedBreweryName || existingBreweryId) {
          // When the user selected an existing brewery, look up its real name.
          let resolvedBrewpubBreweryName = trimmedBreweryName;
          if (!resolvedBrewpubBreweryName && existingBreweryId) {
            const [existingBrew] = await db.select({ name: breweries.name }).from(breweries).where(eq(breweries.id, parseInt(existingBreweryId)));
            resolvedBrewpubBreweryName = existingBrew?.name || '';
          }
          await db.insert(breweryRequests).values({
            userId,
            breweryName: resolvedBrewpubBreweryName || 'Birrificio',
            breweryLocation: (breweryLocation || '').trim() || trimmedPubCity,
            breweryRegion: (breweryRegion || '').trim() || null,
            breweryCountry: (breweryCountry || '').trim() || null,
            vatNumber: (breweryVatNumber || '').trim() || null,
            phone: (breweryPhone || '').trim() || null,
            email: normalizedEmail,
            websiteUrl: (breweryWebsite || '').trim() || null,
            description: (breweryDescription || '').trim() || null,
            existingBreweryId: existingBreweryId ? parseInt(existingBreweryId) : null,
            status: 'pending',
          });

          try {
            const adminIds = await storage.getAdminUserIds();
            for (const adminId of adminIds) {
              await storage.createNotification({
                userId: adminId,
                type: 'new_brewery_request',
                title: 'Nuova richiesta brewpub',
                message: `${normalizedEmail} ha registrato il brewpub "${trimmedPubName}" e richiede di associare il birrificio "${trimmedBreweryName || 'esistente'}".`,
                pubId: null,
                beerId: null,
                isRead: false,
              });
            }
          } catch (e) { console.error('Error sending brewpub notification:', e); }
        }
      }

      // Notify admins of new pub registration
      try {
        const adminIds = await storage.getAdminUserIds();
        for (const adminId of adminIds) {
          await storage.createNotification({
            userId: adminId,
            type: 'new_pub_request',
            title: 'Nuovo pub registrato',
            message: `${normalizedEmail} ha registrato "${trimmedPubName}" (${trimmedPubCity})${isBrewpub ? ' come brewpub' : ''}.`,
            pubId: null,
            beerId: null,
            isRead: false,
          });
        }
        await sendPushToAdmins({
          title: 'Nuovo pub registrato',
          body: `${normalizedEmail} ha registrato "${trimmedPubName}" (${trimmedPubCity}).`,
          url: '/admin/publican-requests?section=pub',
        });
      } catch (e) { console.error('Error sending admin notification:', e); }

      try {
        await sendVerificationEmail(normalizedEmail, verificationToken);
      } catch (e) { console.error('Error sending verification email:', e); }

      res.json({
        pendingVerification: true,
        email: normalizedEmail,
        message: 'Registrazione quasi completata! Controlla la tua email e clicca sul link di conferma per avviare la tua prova gratuita di 15 giorni.',
        pubRegistration: true,
        isBrewpub: !!isBrewpub,
      });
    } catch (error) {
      console.error('Pub registration error:', error);
      res.status(500).json({ message: 'Errore durante la registrazione' });
    }
  });

  // Login with email/password
  app.post('/api/auth/login', loginRateLimit, async (req, res, next) => {
    const recaptchaOk = await verifyRecaptcha(req.body.recaptchaToken);
    if (!recaptchaOk) {
      return res.status(400).json({ message: 'Verifica reCAPTCHA fallita. Riprova.' });
    }

    passport.authenticate('local', (err: any, user: User, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Errore durante il login' });
      }
      if (!user) {
        if (info?.message === 'EMAIL_NOT_VERIFIED') {
          return res.status(403).json({
            message: 'Email non verificata. Controlla la tua casella di posta.',
            emailNotVerified: true,
            email: info.email,
          });
        }
        return res.status(401).json({ message: info?.message || 'Credenziali non valide' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Errore durante il login' });
        }
        
        if (req.body.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 giorni
        } else {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 giorno
        }

        const { hashedPassword: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  // Email verification
  app.get('/api/auth/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.redirect('/auth?verified=invalid');
    }
    try {
      const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
      if (!user) {
        return res.redirect('/auth?verified=invalid');
      }
      if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
        return res.redirect('/auth?verified=expired&email=' + encodeURIComponent(user.email || ''));
      }
      const [updatedUser] = await db.update(users).set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }).where(eq(users.id, user.id)).returning();

      // Fetch all relevant registration data in parallel to determine user type
      const [[userPub], [pubReq], [brewReq]] = await Promise.all([
        db.select().from(pubs).where(eq(pubs.ownerId, user.id)),
        db.select().from(publicanRequests).where(eq(publicanRequests.userId, user.id)),
        db.select().from(breweryRequests).where(eq(breweryRequests.userId, user.id)),
      ]);

      const pubNeedsStripe = userPub && (!userPub.subscriptionStatus || userPub.subscriptionStatus === 'none');
      const pubActive = userPub && userPub.subscriptionStatus && userPub.subscriptionStatus !== 'none';

      /*
       * Registration type matrix:
       *
       *  pubNeedsStripe + brewReq  → brewpub  (pub via Stripe + brewery pending admin)
       *  pubNeedsStripe only       → pub      (pub via Stripe)
       *  pubActive                 → pub re-verify (already has subscription)
       *  pubReq only (old flow)    → pub      (publicanRequest, via Stripe)
       *  brewReq only              → brewery  (brewery-only, waiting admin approval)
       *  nothing                   → customer
       */
      let redirectUrl: string;
      if (pubNeedsStripe && brewReq) {
        // Brewpub: complete pub activation via Stripe first; brewery request goes to admin
        redirectUrl = '/attiva-pub?direct=1&type=brewpub';
      } else if (pubNeedsStripe) {
        // Pub: needs Stripe checkout to activate
        redirectUrl = '/attiva-pub?direct=1';
      } else if (pubActive) {
        // Pub already subscribed (re-verification or edge case)
        redirectUrl = '/dashboard?verified=success';
      } else if (pubReq) {
        // Old registration flow via /api/auth/register with isPublican=true
        redirectUrl = '/attiva-pub?direct=1';
      } else if (brewReq) {
        // Brewery-only: in attesa di approvazione admin
        redirectUrl = '/brewery-dashboard?verified=success';
      } else {
        // Pure customer
        redirectUrl = '/dashboard?email_confirmed=1';
      }

      // Auto-login the user so they don't need to fill login form + reCAPTCHA
      req.login(updatedUser, (loginErr) => {
        if (loginErr) {
          console.error('Auto-login after verify failed:', loginErr);
          return res.redirect(redirectUrl);
        }
        // Force session save before redirect to avoid race condition where
        // the browser follows the redirect before the session is persisted
        req.session.save((saveErr) => {
          if (saveErr) console.error('Session save error after verify-email login:', saveErr);
          res.redirect(redirectUrl);
        });
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.redirect('/auth?verified=invalid');
    }
  });

  // Resend verification email
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email richiesta' });
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (!user || user.isEmailVerified) {
        return res.json({ message: 'Se l\'email è registrata e non verificata, riceverai un nuovo link.' });
      }
      const verificationToken = nanoid(32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users).set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      }).where(eq(users.id, user.id));
      await sendVerificationEmail(normalizedEmail, verificationToken);
      res.json({ message: 'Email di conferma inviata! Controlla la tua casella di posta.' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Errore durante l\'invio dell\'email' });
    }
  });

  // Forgot password — send reset email
  app.post('/api/auth/forgot-password', forgotPasswordRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email richiesta' });
      const normalizedEmail = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      // Always return success to avoid email enumeration
      if (!user || !user.hashedPassword) {
        return res.json({ message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.' });
      }
      const resetToken = nanoid(48);
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.update(users).set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      }).where(eq(users.id, user.id));
      await sendPasswordResetEmail(normalizedEmail, resetToken);
      res.json({ message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Errore interno. Riprova più tardi.' });
    }
  });

  // Reset password — validate token and set new password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: 'Token e password richiesti' });
      if (password.length < 8) return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });
      const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
      if (!user) return res.status(400).json({ message: 'Link non valido o già utilizzato' });
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: 'Link scaduto. Richiedi un nuovo link per reimpostare la password.' });
      }
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await db.update(users).set({
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordLastUpdated: new Date(),
      }).where(eq(users.id, user.id));
      res.json({ message: 'Password aggiornata con successo! Ora puoi accedere con la nuova password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Errore interno. Riprova più tardi.' });
    }
  });

  // ── In-memory store for mobile app OAuth exchange tokens (60s TTL) ────────
  // Chrome Custom Tabs e WebView Capacitor hanno jar di cookie separati, quindi
  // dopo l'OAuth nel browser il WebView non vede la sessione. Usiamo un token
  // monouso che il WebView scambia direttamente con /api/auth/exchange-app-token.
  const appAuthTokens = new Map<string, { userId: number; expires: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of appAuthTokens) {
      if (val.expires < now) appAuthTokens.delete(key);
    }
  }, 30_000);

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', (req: any, res, next) => {
      const reqId = req.query.req_id as string | undefined;
      // Se c'è un reqId (flusso mobile Chrome Custom Tabs), lo passiamo come
      // stato OAuth. Il callback lo leggerà per associare il token.
      if (reqId && /^[\w-]{8,64}$/.test(reqId)) {
        passport.authenticate('google', { scope: ['profile', 'email'], state: reqId })(req, res, next);
      } else {
        passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
      }
    });

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
      (req: any, res) => {
        const user = req.user as User;
        // Il state è il reqId se il flusso proviene da Chrome Custom Tabs (app mobile)
        const reqId = req.query.state as string | undefined;
        const isMobileAppFlow = reqId && /^[\w-]{8,64}$/.test(reqId) && user;

        if (isMobileAppFlow) {
          // Salva un token di scambio monouso (60s) che il WebView userà per creare la sessione
          appAuthTokens.set(reqId, { userId: (user as any).id, expires: Date.now() + 60_000 });
          req.session.save((saveErr: any) => {
            if (saveErr) console.error('Session save error after Google OAuth (app):', saveErr);
            // Redirect a una pagina che l'app può rilevare tramite polling
            res.redirect('/auth-app-callback?req_id=' + encodeURIComponent(reqId));
          });
          return;
        }

        // Flusso web standard
        const role = user?.activeRole || user?.userType;
        const target = role === 'admin' ? '/admin' : '/dashboard';
        req.session.save((saveErr: any) => {
          if (saveErr) console.error('Session save error after Google OAuth:', saveErr);
          res.redirect(target);
        });
      }
    );

    // Polling: l'app mobile controlla se il token di scambio è pronto
    app.get('/api/auth/app-token-status/:reqId', (req, res) => {
      const token = appAuthTokens.get(req.params.reqId);
      res.json({ ready: !!(token && token.expires > Date.now()) });
    });

    // Exchange: il WebView Capacitor scambia il reqId per una vera sessione cookie
    app.post('/api/auth/exchange-app-token', async (req: any, res) => {
      const { reqId } = req.body;
      if (!reqId) return res.status(400).json({ error: 'missing_req_id' });
      const token = appAuthTokens.get(reqId);
      if (!token || token.expires < Date.now()) {
        return res.status(401).json({ error: 'invalid_or_expired_token' });
      }
      appAuthTokens.delete(reqId); // monouso
      const [user] = await db.select().from(users).where(eq(users.id, token.userId as any));
      if (!user) return res.status(401).json({ error: 'user_not_found' });
      req.login(user, (err: any) => {
        if (err) return res.status(500).json({ error: 'login_failed' });
        req.session.save((saveErr: any) => {
          if (saveErr) console.error('Session save error in exchange-app-token:', saveErr);
          res.json({ ok: true });
        });
      });
    });
  }

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Errore durante il logout' });
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout effettuato' });
      });
    });
  });

  // Get current user
  app.get('/api/auth/user', async (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as User;
      const { hashedPassword: _, ...userWithoutPassword } = user;
      // Derive managedPubId: look up any pub owned by this user
      let managedPubId: number | null = null;
      try {
        const [ownedPub] = await db.select({ id: pubs.id }).from(pubs).where(eq(pubs.ownerId, user.id)).limit(1);
        managedPubId = ownedPub?.id ?? null;
      } catch {
        // non-blocking: fall back to null
      }
      // breweryId is already stored directly on the user row (users.brewery_id)
      res.json({ ...userWithoutPassword, hasPassword: !!user.hashedPassword, managedPubId });
    } else {
      res.status(401).json({ message: 'Non autenticato' });
    }
  });

  // Check nickname availability (used during onboarding)
  app.get('/api/auth/check-nickname', isAuthenticated, async (req: any, res) => {
    try {
      const nickname = (req.query.nickname as string || '').trim();
      if (!nickname || nickname.length < 3) {
        return res.json({ available: false, reason: 'too_short' });
      }
      if (!/^[a-zA-Z0-9_.]+$/.test(nickname)) {
        return res.json({ available: false, reason: 'invalid_chars' });
      }
      const currentUser = req.user as User;
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.nickname, nickname), sql`${users.id} != ${currentUser.id}`));
      res.json({ available: !existing });
    } catch (err) {
      res.status(500).json({ available: false });
    }
  });

  // Legacy login endpoint (redirect)
  app.get('/api/login', (req, res) => {
    res.redirect('/login');
  });

  // Legacy logout endpoint
  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });

  // Complete onboarding after social login
  app.post('/api/auth/complete-onboarding', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const {
        role, // 'customer' | 'pub_owner' | 'brewery_owner'
        // profile fields (set during onboarding step 1)
        nickname, firstName, lastName,
        // pub fields
        pubName, pubAddress, pubCity, pubRegion, vatNumber, phone, description,
        // brewery fields
        breweryId: existingBreweryId, breweryName, breweryLocation, breweryRegion,
        breweryCountry, breweryVatNumber, breweryPhone, breweryDescription, breweryWebsite,
      } = req.body;

      let newRoles = ['customer'];
      let newUserType = 'customer';
      let newBreweryId = user.breweryId;

      if (role === 'pub_owner') {
        if (!pubName || !pubAddress || !pubCity) {
          return res.status(400).json({ message: 'Nome locale, indirizzo e città sono obbligatori' });
        }
        // Keep user as 'customer' until Stripe checkout is completed
        newRoles = ['customer'];
        newUserType = 'customer';

        // Create pub directly (unverified, no subscription) — Stripe will activate it
        await db.insert(pubs).values({
          name: pubName.trim(),
          address: pubAddress.trim(),
          city: pubCity.trim(),
          region: pubRegion?.trim() || pubCity.trim(),
          vatNumber: vatNumber?.trim() || null,
          phone: phone?.trim() || null,
          description: description?.trim() || null,
          ownerId: user.id,
          isVerified: false,
          subscriptionStatus: 'none',
          isActive: true,
        });

        // Notify admins of new registration
        try {
          await sendPushToAdmins({ title: 'Nuovo pub registrato', body: `Nuovo pub registrato via Google: ${pubName} (${pubCity})` });
        } catch {}

      } else if (role === 'brewery_owner') {
        if (!existingBreweryId && !breweryName) {
          return res.status(400).json({ message: 'Seleziona o inserisci il nome del birrificio' });
        }
        newRoles = ['customer', 'brewery_owner'];
        newUserType = 'brewery_owner';

        if (existingBreweryId) {
          newBreweryId = existingBreweryId;
        } else {
          // Create brewery request for admin approval
          await db.insert(breweryRequests).values({
            userId: user.id,
            breweryName: breweryName.trim(),
            breweryLocation: breweryLocation?.trim() || '',
            breweryRegion: breweryRegion?.trim() || null,
            breweryCountry: breweryCountry?.trim() || 'Italia',
            vatNumber: breweryVatNumber?.trim() || null,
            phone: breweryPhone?.trim() || null,
            description: breweryDescription?.trim() || null,
            websiteUrl: breweryWebsite?.trim() || null,
            status: 'pending',
          });
          try {
            await sendPushToAdmins({ title: 'Nuova richiesta birrificio', body: `Nuova richiesta birrificio da ${user.firstName || user.email}: ${breweryName}` });
          } catch {}
        }
      }

      // Validate nickname uniqueness if provided
      if (nickname) {
        const trimmedNick = nickname.trim();
        if (trimmedNick.length >= 3 && /^[a-zA-Z0-9_.]+$/.test(trimmedNick)) {
          const [nickTaken] = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.nickname, trimmedNick), sql`${users.id} != ${user.id}`));
          if (nickTaken) {
            return res.status(400).json({ message: 'Username già in uso, scegline un altro' });
          }
        }
      }

      // Build profile patch (only overwrite if value provided and field is currently empty)
      const profilePatch: Record<string, any> = {};
      if (nickname?.trim()) profilePatch.nickname = nickname.trim();
      if (firstName?.trim() && !user.firstName) profilePatch.firstName = firstName.trim();
      if (lastName?.trim() && !user.lastName) profilePatch.lastName = lastName.trim();

      // Update user record
      await db.update(users).set({
        ...profilePatch,
        roles: newRoles,
        userType: newUserType,
        activeRole: 'customer',
        breweryId: newBreweryId || null,
        needsOnboarding: false,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      // CRITICO: aspetta sia req.login() che session.save() prima di rispondere.
      // Senza questo, il client viene rimbalzato a /login dopo l'onboarding
      // perché legge /api/auth/user prima che la sessione aggiornata sia
      // persistita su Postgres (stesso pattern del fix in native-auth.ts).
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err: any) => {
          if (err) return reject(err);
          req.session.save((saveErr: any) => (saveErr ? reject(saveErr) : resolve()));
        });
      });

      const { hashedPassword: _, ...userOut } = updatedUser;

      // For pub_owner: redirect to Stripe checkout; for brewery: pending dashboard; for customer: dashboard
      let redirectTo: string | null = null;
      if (role === 'pub_owner') {
        redirectTo = '/attiva-pub?direct=1';
      } else if (role === 'brewery_owner') {
        redirectTo = '/brewery-dashboard?pending=1';
      } else {
        redirectTo = '/dashboard';
      }
      res.json({ user: userOut, message: 'Profilo completato!', redirectTo });
    } catch (error) {
      console.error('complete-onboarding error:', error);
      res.status(500).json({ message: 'Errore durante il completamento del profilo' });
    }
  });

  // Request upgrade to pub_owner role
  app.post('/api/auth/become-publican', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { pubName, address, city, vatNumber, phone } = req.body;

      if (!pubName || !address || !city) {
        return res.status(400).json({ 
          message: 'Nome locale, indirizzo e città sono obbligatori' 
        });
      }

      // Check if user already has pub_owner role
      if (user.roles?.includes('pub_owner')) {
        return res.status(400).json({ 
          message: 'Hai già il ruolo di publican' 
        });
      }

      // Add pub_owner role to user
      const newRoles = [...(user.roles || ['customer']), 'pub_owner'];
      
      await db.update(users)
        .set({ 
          roles: newRoles,
          userType: 'pub_owner'
        })
        .where(eq(users.id, user.id));

      // Create the pub with the provided info
      const { storage } = await import('./storage');
      await storage.createPub({
        name: pubName,
        address,
        city,
        region: city, // Default region to city, can be updated later
        vatNumber: vatNumber || null,
        phone: phone || null,
        ownerId: user.id,
        isActive: false, // Pending verification
      });

      // Update session with new roles — aspetta save() prima di rispondere
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err: any) => {
          if (err) return reject(err);
          req.session.save((saveErr: any) => (saveErr ? reject(saveErr) : resolve()));
        });
      });

      res.json({ 
        message: 'Congratulazioni! Ora sei un publican. Il tuo locale è in attesa di verifica.',
        roles: newRoles
      });
    } catch (error) {
      console.error('Become publican error:', error);
      res.status(500).json({ message: 'Errore durante la richiesta' });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Non autenticato' });
};

// Middleware to check if user is admin
// effectiveRole = activeRole || userType, also honors roles[] membership
export const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  const user = req.user as User;
  const effectiveRole = user.activeRole || user.userType;
  const roles = user.roles ?? [];
  if (effectiveRole === 'admin' || roles.includes('admin')) {
    return next();
  }

  res.status(403).json({ message: 'Accesso non autorizzato' });
};

// Middleware: admin OR brewery_owner (for endpoints that delegate fine-grained ownership checks inside the handler)
export const isAdminOrBreweryOwner: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  const user = req.user as User;
  const effectiveRole = user.activeRole || user.userType;
  const roles = user.roles ?? [];
  if (
    effectiveRole === 'admin' || roles.includes('admin') ||
    effectiveRole === 'brewery_owner' || roles.includes('brewery_owner')
  ) {
    return next();
  }
  res.status(403).json({ message: 'Accesso non autorizzato' });
};

// Middleware to check if user is pub owner
export const isPubOwner: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  
  const user = req.user as User;
  if (user.roles?.includes('pub_owner') || user.roles?.includes('admin')) {
    return next();
  }
  
  res.status(403).json({ message: 'Accesso non autorizzato' });
};
