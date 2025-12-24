import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users, oauthAccounts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'fermenta-to-session-secret-change-in-production',
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
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'https://fermenta.to/api/auth/google/callback';
    
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
            // Create new user
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
              isEmailVerified: true, // Google emails are verified
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
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email e password sono obbligatori' });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: 'La password deve essere di almeno 8 caratteri' });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email already exists
      const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing) {
        return res.status(400).json({ message: 'Email già registrata' });
      }
      
      const hashedPassword = await hashPassword(password);
      const userId = nanoid();
      
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        userType: 'customer',
        roles: ['customer'],
        activeRole: 'customer',
        isEmailVerified: false,
      }).returning();
      
      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Errore durante il login' });
        }
        
        const { hashedPassword: _, ...userWithoutPassword } = newUser;
        res.json({ user: userWithoutPassword, message: 'Registrazione completata' });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Errore durante la registrazione' });
    }
  });

  // Login with email/password
  app.post('/api/auth/login', (req, res, next) => {
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
      passport.authenticate('google', { 
        failureRedirect: '/login?error=google_auth_failed',
        successRedirect: '/'
      })
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
      res.json(userWithoutPassword);
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
