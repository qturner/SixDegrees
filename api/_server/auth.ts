import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import connectPg from "connect-pg-simple";
import { pool, getPool } from "./db.js";
import { storage } from "./storage.js";
import { loginSchema, registerSchema } from "../../shared/schema.js";
import { ZodError } from "zod";

// Session middleware setup
const PostgresSessionStore = connectPg(session);

export async function setupAuth(app: Express) {
  // Initialize Postgres session store
  // CRITICAL: Must match the table name in shared/schema.ts ("sessions")
  // and MUST NOT fall back to MemoryStore in production (Vercel),
  // otherwise auth will loop silently.
  console.log('[AUTH] Initializing Postgres session store...');
  const dbPool = getPool();
  const sessionStore = new PostgresSessionStore({
    pool: dbPool,
    tableName: 'sessions', // Explicitly match Drizzle schema
    createTableIfMissing: true,
  });
  console.log('[AUTH] Postgres session store initialized');

  // Setup session middleware
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: "lax", // Essential for OAuth redirects to work
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackURL: process.env.NODE_ENV === "production"
      ? "https://www.sixdegrees.app/api/auth/google/callback"
      : "http://localhost:5001/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('AUTH: Google callback received', { id: profile.id, email: profile.emails?.[0]?.value });

      const googleId = profile.id;
      const email = profile.emails?.[0].value;
      const picture = profile.photos?.[0].value;
      const firstName = profile.name?.givenName;
      const lastName = profile.name?.familyName;

      if (!email) {
        console.error('AUTH: No email in Google profile');
        return done(new Error("No email found from Google profile"), undefined);
      }

      console.log('AUTH: Checking for existing user by Google ID...');
      // 1. Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleId);

      if (!user) {
        // 2. Check if user exists by email (link accounts)
        user = await storage.getUserByEmail(email);

        if (user) {
          // Link existing email user to Google
          // We can't update using storage interface yet easily without expanding it
          // For now, we'll assume new user or strict google match
          // TODO: Implement linking if separate update method exists
        } else {
          // 3. Create new user
          const username = email.split('@')[0] + Math.floor(Math.random() * 1000); // Generate unique-ish username

          user = await storage.createUser({
            email,
            username,
            googleId,
            firstName,
            lastName,
            picture,
            password: "", // No password for Google users
          });

          // Create stats for new user
          await storage.createUserStats({ userId: user.id });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google Auth Routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      // Manually set userId for our custom isAuthenticated middleware
      // (Passport sets req.user, but our app uses req.session.userId elsewhere)
      if (req.user) {
        (req.session as any).userId = (req.user as any).id;
      }

      console.log('AUTH: Google login successful. Saving session...');
      req.session.save((err) => {
        if (err) {
          console.error("AUTH: Session save error:", err);
          return res.redirect("/");
        }
        console.log('AUTH: Session saved. Redirecting to home.');
        res.redirect("/");
      });
    }
  );

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
      if (!user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

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

  // Debug session endpoint - TEMPORARY
  app.get("/api/auth/debug-session", (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      sessionID: req.sessionID,
      hasSession: !!req.session,
      userId: (req.session as any)?.userId,
      passportUser: req.user,
      cookieConfig: (req.session?.cookie) || 'No cookie config',
      headers: {
        host: req.headers.host,
        referer: req.headers.referer,
        cookiePresent: !!req.headers.cookie
      }
    });
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