import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users, oauthAccounts, publicanRequests, breweries, breweryRequests } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { User } from "@shared/schema";
import { storage } from "./storage";
import { sendPushToAdmins } from "./push-utils";

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
      sameSite: 'lax',
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
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
        
        if (!user) {
          return done(null, false, { message: 'Email o password non corretti' });
        }
        
        if (!user.hashedPassword) {
          return done(null, false, { message: 'Account creato con social login. Usa Google per accedere.' });
        }
        
        const isValid = await verifyPassword(password, user.hashedPassword);
        if (!isValid) {
          return done(null, false, { message: 'Email o password non corretti' });
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
            // Create new user — flag for onboarding
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
              needsOnboarding: true,
            }).returning();
            user = newUser;
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

  // Register with email/password
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { 
        email, password, firstName, lastName,
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
      
      const hashedPwd = await hashPassword(password);
      const userId = nanoid();

      // Determine roles - brewery_owner is NOT assigned at registration, only after approval
      const userRoles: string[] = ['customer'];
      
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        hashedPassword: hashedPwd,
        firstName: firstName || null,
        lastName: lastName || null,
        userType: 'customer',
        roles: userRoles,
        activeRole: 'customer',
        breweryId: null,
        isEmailVerified: false,
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
            url: '/admin',
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

        await db.insert(breweryRequests).values({
          userId: userId,
          breweryName: trimmedBreweryName || 'Birrificio',
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
            url: '/admin',
          });
        } catch (notifError) {
          console.error('Error sending admin brewery notification:', notifError);
        }
      }
      
      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Errore durante il login' });
        }
        
        const { hashedPassword: _, ...userWithoutPassword } = newUser;
        res.json({ 
          user: userWithoutPassword, 
          message: isPublican ? 'Richiesta pub inviata, in attesa di approvazione' : isBrewery ? 'Richiesta birrificio inviata, in attesa di approvazione' : 'Registrazione completata',
          publicanRequest: isPublican ? true : false,
          breweryRequest: isBrewery ? true : false
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Errore durante la registrazione' });
    }
  });

  // Login with email/password
  app.post('/api/auth/login', async (req, res, next) => {
    const recaptchaOk = await verifyRecaptcha(req.body.recaptchaToken);
    if (!recaptchaOk) {
      return res.status(400).json({ message: 'Verifica reCAPTCHA fallita. Riprova.' });
    }

    passport.authenticate('local', (err: any, user: User, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Errore durante il login' });
      }
      if (!user) {
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

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    }));

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
      (req, res) => {
        const user = req.user as User;
        if (user?.needsOnboarding) {
          return res.redirect('/onboarding');
        }
        res.redirect('/');
      }
    );
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
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as User;
      const { hashedPassword: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, hasPassword: !!user.hashedPassword });
    } else {
      res.status(401).json({ message: 'Non autenticato' });
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
        newRoles = ['customer', 'pub_owner'];
        newUserType = 'pub_owner';

        // Create publican request for admin approval
        await db.insert(publicanRequests).values({
          userId: user.id,
          pubName: pubName.trim(),
          pubAddress: pubAddress.trim(),
          pubCity: pubCity.trim(),
          pubRegion: pubRegion?.trim() || pubCity.trim(),
          vatNumber: vatNumber?.trim() || null,
          phone: phone?.trim() || null,
          description: description?.trim() || null,
          status: 'pending',
        });

        // Notify admins
        try {
          await sendPushToAdmins(`Nuova richiesta pub da ${user.firstName || user.email}: ${pubName}`);
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
            await sendPushToAdmins(`Nuova richiesta birrificio da ${user.firstName || user.email}: ${breweryName}`);
          } catch {}
        }
      }

      // Update user record
      await db.update(users).set({
        roles: newRoles,
        userType: newUserType,
        activeRole: role === 'customer' ? 'customer' : newRoles[newRoles.length - 1],
        breweryId: newBreweryId || null,
        needsOnboarding: false,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      req.login(updatedUser, () => {});

      const { hashedPassword: _, ...userOut } = updatedUser;
      res.json({ user: userOut, message: 'Profilo completato!' });
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

      // Update session with new roles
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      req.login(updatedUser, (err) => {
        if (err) {
          console.error('Session update error:', err);
        }
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
export const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  
  const user = req.user as User;
  if (user.roles?.includes('admin') || user.activeRole === 'admin') {
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
