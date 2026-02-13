import express, { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { pool, getPool } from "./db.js";
import { storage } from "./storage.js";
import { loginSchema, registerSchema } from "../../shared/schema.js";
import { ZodError } from "zod";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import appleSignin from "apple-signin-auth";
import crypto from "crypto";

export async function setupAuth(app: Express) {
  // Use cookie-session instead of express-session for Vercel/Serverless
  // This stores the session data in the cookie itself (encrypted),
  // avoiding database lookups and connection issues for auth.
  const cookieSession = (await import("cookie-session")).default;
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'fallback-secret-for-development'],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true
  }));

  // Helper to ensure session exists for TS compatibility
  app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
      (req.session as any).regenerate = (cb: any) => cb();
    }
    if (req.session && !req.session.save) {
      (req.session as any).save = (cb: any) => cb();
    }
    next();
  });

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
      // Return false if user was deleted so passport clears the stale session
      // instead of crashing with "Failed to deserialize user"
      done(null, user || false);
    } catch (error) {
      done(error, null);
    }
  });

  // Google Auth Routes
  app.get("/api/auth/google", (req: Request, res: Response, next: NextFunction) => {
    // Check if coming from mobile app
    const isMobile = req.query.platform === 'ios';
    const state = isMobile ? 'mobile' : undefined;

    passport.authenticate("google", {
      scope: ["profile", "email"],
      state
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", (err: Error | null, user: any) => {
      if (err || !user) {
        console.error('AUTH: Google callback failed', err?.message || 'No user returned');
        // Redirect mobile app with error so ASWebAuthenticationSession completes
        if (req.query.state === 'mobile') {
          const errorMsg = encodeURIComponent(err?.message || 'Authentication failed');
          return res.redirect(`sixdegrees://auth/callback?error=${errorMsg}`);
        }
        return res.redirect("/");
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('AUTH: Google login session error', loginErr.message);
          if (req.query.state === 'mobile') {
            return res.redirect(`sixdegrees://auth/callback?error=${encodeURIComponent(loginErr.message)}`);
          }
          return res.redirect("/");
        }

        // Manually set userId for our custom isAuthenticated middleware
        (req.session as any).userId = (req.user as any).id;

        console.log('AUTH: Google login successful. Session set.');

        // Check state to see if we should redirect to mobile app
        if (req.query.state === 'mobile') {
          console.log('AUTH: Redirecting to mobile app scheme');
          // Construct session cookie value directly from the session object.
          // Can't read req.headers.cookie because ASWebAuthenticationSession in
          // ephemeral mode sends no incoming cookies — the session only exists
          // on the response side via cookie-session middleware.
          const sessionData = JSON.stringify(req.session);
          const sessionValue = Buffer.from(sessionData).toString('base64');
          const key = process.env.SESSION_SECRET || 'fallback-secret-for-development';
          // Must match keygrip's URL-safe base64 encoding: / → _, + → -, strip =
          const sessionSig = crypto
            .createHmac('sha1', key)
            .update('session=' + sessionValue)
            .digest('base64')
            .replace(/\/|\+|=/g, (x: string) => ({ '/': '_', '+': '-', '=': '' })[x] || '');
          const session = encodeURIComponent(sessionValue);
          const sig = encodeURIComponent(sessionSig);
          return res.redirect(`sixdegrees://auth/callback?success=true&session=${session}&session_sig=${sig}`);
        }

        // cookie-session saves automatically when response ends
        res.redirect("/");
      });
    })(req, res, next);
  });

  // Apple Sign In Endpoint
  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      const { identityToken, authorizationCode, firstName, lastName } = req.body;

      if (!identityToken) {
        return res.status(400).json({ message: "Missing identity token" });
      }

      // Verify identity token
      let idToken;
      try {
        idToken = await appleSignin.verifyIdToken(identityToken, {
          audience: "com.sixdegreesapp.ios",
          ignoreExpiration: true, // Optional: might want to enforce expiration in prod
        });
      } catch (err: any) {
        console.error("Apple auth verification failed:", err);
        return res.status(401).json({ message: "Invalid identity token" });
      }

      const appleId = idToken.sub;
      const email = idToken.email;

      if (!appleId) {
        return res.status(400).json({ message: "No Apple ID found in token" });
      }

      // 1. Check if user exists by Apple ID
      let user = await storage.getUserByAppleId(appleId);

      if (!user) {
        // 2. Check if user exists by email (link accounts)
        // Apple doesn't always provide email on subsequent logins, but verified token usually has it?
        // Actually, verifyIdToken returns the decoded token which contains email if scope was requested.
        // If email is present, we try to link.
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link existing email user to Apple
            if (!user.appleId) {
              user = await storage.updateUser(user.id, { appleId });
              console.log(`AUTH: Linked Apple ID to existing user ${user.id}`);
            }
          }
        }

        if (!user) {
          // 3. Create new user
          if (!email) {
            return res.status(400).json({ message: "Email required for new account" });
          }

          const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

          user = await storage.createUser({
            email,
            username,
            appleId,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            password: "", // No password
          });

          // Create stats for new user
          await storage.createUserStats({ userId: user.id });
        } else {
          // If we found a user by email, we should update their appleId so next time lookup works
          if (!user.appleId) {
            user = await storage.updateUser(user.id, { appleId });
            console.log(`AUTH: Linked Apple ID to existing user ${user.id}`);
          }
        }
      }

      // Set session
      (req.session as any).userId = user.id;

      const { password, ...userResponse } = user;
      res.json(userResponse);

    } catch (error) {
      console.error("Apple auth error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

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
  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // cookie-session way to destroy session
    req.session = null as any;
    res.clearCookie('session');
    res.clearCookie('session.sig');
    res.status(200).json({ message: "Logged out successfully" });
  });

  // Delete account endpoint
  app.delete("/api/user/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteUserAccount(userId);

      // Clear session
      req.session = null as any;
      res.clearCookie("session");
      res.clearCookie("session.sig");

      res.status(200).json({ message: "Account deleted" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
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