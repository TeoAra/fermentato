import jwt from 'jsonwebtoken';
import type { Express, RequestHandler } from "express";
import type { User } from "@shared/schema";

// In-memory storage per utenti durante il problema del database
const inMemoryUsers = new Map<string, User>();

// Secret JWT (in produzione dovrebbe essere in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'fermenta-to-dev-secret-2024';

export interface JWTPayload {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

// Genera un JWT token
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role || 'customer'
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d',
    issuer: 'fermenta.to'
  });
}

// Verifica un JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Crea un utente demo per testing
export function createDemoUser(email: string = 'demo@fermenta.to'): User {
  const demoUser: User = {
    id: `demo-${Date.now()}`,
    email: email,
    firstName: 'Demo',
    lastName: 'User',
    profileImageUrl: null,
    role: 'pub_owner', // Gli diamo ruolo pub_owner per testare dashboard
    nickname: 'DemoUser',
    nicknameLastChanged: new Date(),
    bio: null,
    location: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  inMemoryUsers.set(demoUser.id, demoUser);
  return demoUser;
}

// Middleware di autenticazione JWT
export const authenticateJWT: RequestHandler = (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: "Token di accesso richiesto" });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Token non valido" });
  }
  
  // Recupera utente dalla memoria
  const user = inMemoryUsers.get(decoded.userId);
  if (!user) {
    return res.status(401).json({ message: "Utente non trovato" });
  }
  
  req.user = { claims: { sub: decoded.userId }, jwtUser: user };
  next();
};

// Setup autenticazione JWT alternativa
export function setupJWTAuth(app: Express) {
  // Login temporaneo - crea utente demo e restituisce token
  app.post("/api/auth/demo-login", (req, res) => {
    try {
      const { email } = req.body;
      const demoUser = createDemoUser(email || 'demo@fermenta.to');
      const token = generateToken(demoUser);
      
      res.json({
        token,
        user: demoUser,
        message: "Login demo eseguito con successo"
      });
    } catch (error) {
      console.error("Errore login demo:", error);
      res.status(500).json({ message: "Errore durante il login demo" });
    }
  });
  
  // Logout JWT
  app.post("/api/auth/logout", (req, res) => {
    // Con JWT il logout è gestito client-side rimuovendo il token
    res.json({ message: "Logout eseguito con successo" });
  });
  
  // Route per ottenere utente corrente
  app.get('/api/auth/user-jwt', authenticateJWT, (req: any, res) => {
    try {
      const user = req.user.jwtUser;
      res.json(user);
    } catch (error) {
      console.error("Errore recupero utente JWT:", error);
      res.status(500).json({ message: "Errore durante il recupero utente" });
    }
  });
}

// Storage in memoria per quando il database non funziona
export const memoryStorage = {
  getUser: async (id: string): Promise<User | undefined> => {
    return inMemoryUsers.get(id);
  },
  
  upsertUser: async (userData: any): Promise<User> => {
    const existingUser = inMemoryUsers.get(userData.id);
    if (existingUser) {
      const updatedUser = { ...existingUser, ...userData, updatedAt: new Date() };
      inMemoryUsers.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        role: userData.role || 'customer',
        nickname: userData.nickname || `user${Date.now()}`,
        nicknameLastChanged: new Date(),
        bio: null,
        location: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }
};