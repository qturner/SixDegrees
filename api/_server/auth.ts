import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";
import { storage } from "./storage.js";
import { loginSchema, registerSchema } from "../../shared/schema.js";
import { ZodError } from "zod";

// Session middleware setup
const PostgresSessionStore = connectPg(session);

export async function setupAuth(app: Express) {
  let sessionStore: any;

  try {
    console.log('[AUTH] Initializing Postgres session store...');
    sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    console.log('[AUTH] Postgres session store initialized');
  } catch (error) {
    console.error('[AUTH] Failed to initialize Postgres session store, falling back to memory store:', error);
    const MemoryStore = (await import('memorystore')).default(session as any);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    console.log('[AUTH] Memory store initialized');
  }

  // Setup session middleware
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));

  // Registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check if username is taken
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Create user stats record
      await storage.createUserStats({
        userId: user.id,
      });

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Get user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const passwordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Return user without password
      const { password, ...userResponse } = user;
      res.status(200).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/user/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user stats endpoint
  app.get("/api/user/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const stats = await storage.getUserStats(userId);

      if (!stats) {
        // Create initial stats if they don't exist
        const newStats = await storage.createUserStats({ userId });
        return res.json(newStats);
      }

      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Authentication middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};