import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { tmdbService } from "./services/tmdb.js";
import { gameLogicService } from "./services/gameLogic.js";
import { withRetry } from "./db.js";
import { insertDailyChallengeSchema, insertGameAttemptSchema, gameConnectionSchema, insertContactSubmissionSchema, insertVisitorAnalyticsSchema, insertUserChallengeCompletionSchema } from "../../shared/schema.js";
import { createAdminUser, authenticateAdmin, createAdminSession, validateAdminSession, deleteAdminSession } from "./adminAuth.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { emailService } from "./services/email.js";
import { registerTestEmailRoutes } from "./internal_routes/testEmail.js";
import cron from "node-cron";

function getESTDateString(date: Date = new Date()): string {
  // Use Intl.DateTimeFormat to ensure consistent YYYY-MM-DD format regardless of environment locale
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // en-CA format is YYYY-MM-DD, but we'll normalize it to be 100% sure
  const formatted = formatter.format(date);
  return formatted.replace(/\//g, '-');
}

function getYesterdayDateString(): string {
  // Get yesterday's date in EST/EDT timezone
  const date = new Date();
  date.setHours(date.getHours() - 12); // Move back half a day to ensure we drop into yesterday EST if we are early morning UTC
  date.setDate(date.getDate() - 1);
  return getESTDateString(date);
}

function getTomorrowDateString(): string {
  // Get tomorrow's date in EST/EDT timezone
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getESTDateString(date);
}

// Helper to ensure image paths are relative and clean
function sanitizeImagePath(path: string | null | undefined): string | null {
  if (!path) return null;
  // If it's a full URL, strip the base parts
  let cleanPath = path;
  if (path.startsWith('http')) {
    const parts = path.split('/');
    cleanPath = '/' + parts[parts.length - 1];
  }
  // Ensure it starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  return cleanPath;
}

// Prevent race conditions in challenge creation
let challengeCreationPromise: Promise<any> | null = null;
let lastChallengeDate: string | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup email/password authentication
  await setupAuth(app);

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const { checkDatabaseHealth } = await import("./db.js");
      const dbHealthy = await checkDatabaseHealth();
      const tmdbConfigured = !!process.env.TMDB_API_KEY || !!process.env.API_KEY;

      res.json({
        status: dbHealthy && tmdbConfigured ? "ok" : "degraded",
        database: dbHealthy ? "connected" : "disconnected",
        tmdb: tmdbConfigured ? "configured" : "missing_key",
        time: new Date().toISOString(),
        estDate: getESTDateString(),
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error?.message });
    }
  });


  // Theme samples route
  app.get("/theme-samples", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movie Game Theme Samples</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .theme-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-bottom: 40px; }
        .theme-card { border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .theme-header { padding: 20px; text-align: center; color: white; font-weight: bold; font-size: 18px; }
        .theme-content { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .sample-button { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .sample-card { padding: 16px; border-radius: 8px; border: 1px solid; }
        .color-palette { display: flex; gap: 10px; margin-top: 10px; }
        .color-swatch { width: 40px; height: 40px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3); }
        h1 { text-align: center; margin-bottom: 40px; color: #333; font-size: 32px; }
        .theme-name { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        .back-link { display: inline-block; margin-bottom: 20px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Back to Game</a>
        <h1>🎬 Movie Game Theme Samples</h1>
        
        <div class="theme-grid">
            <!-- Classic Hollywood Glamour -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #B8860B, #DAA520);">
                    Classic Hollywood Glamour
                    <div class="theme-name">Rich golds and deep blacks</div>
                </div>
                <div class="theme-content" style="background: #0D0D0D; color: #F8F8FF;">
                    <button class="sample-button" style="background: #B8860B; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F7E7CE; color: #0D0D0D; border-color: #B8860B;">
                        ✓ Valid connection! Ryan Reynolds and Blake Lively both appear in Green Lantern
                    </div>
                    <button class="sample-button" style="background: #36454F; color: #F8F8FF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #B8860B;"></div>
                        <div class="color-swatch" style="background: #F7E7CE;"></div>
                        <div class="color-swatch" style="background: #0D0D0D;"></div>
                        <div class="color-swatch" style="background: #C0C0C0;"></div>
                    </div>
                </div>
            </div>

            <!-- Film Noir Mystery -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #722F37, #8B0000);">
                    Film Noir Mystery
                    <div class="theme-name">Dramatic shadows and vintage cinema</div>
                </div>
                <div class="theme-content" style="background: #1C1C1C; color: #FFFDD0;">
                    <button class="sample-button" style="background: #722F37; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFDD0; color: #1C1C1C; border-color: #8B0000;">
                        ✓ Valid connection! Humphrey Bogart and Lauren Bacall both appear in The Big Sleep
                    </div>
                    <button class="sample-button" style="background: #2F4F4F; color: #FFFDD0;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #722F37;"></div>
                        <div class="color-swatch" style="background: #8B0000;"></div>
                        <div class="color-swatch" style="background: #1C1C1C;"></div>
                        <div class="color-swatch" style="background: #FFFDD0;"></div>
                    </div>
                </div>
            </div>

            <!-- Hollywood Sign Sunset -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #FF6347, #FF7F50);">
                    Hollywood Sign Sunset
                    <div class="theme-name">Warm California sunset colors</div>
                </div>
                <div class="theme-content" style="background: #483D8B; color: #FFD700;">
                    <button class="sample-button" style="background: #FF6347; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFB6C1; color: #483D8B; border-color: #FF7F50;">
                        ✓ Valid connection! Leonardo DiCaprio and Margot Robbie both appear in The Wolf of Wall Street
                    </div>
                    <button class="sample-button" style="background: #2F4F4F; color: #FFD700;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #FF6347;"></div>
                        <div class="color-swatch" style="background: #FF7F50;"></div>
                        <div class="color-swatch" style="background: #483D8B;"></div>
                        <div class="color-swatch" style="background: #FFD700;"></div>
                    </div>
                </div>
            </div>

            <!-- Movie Theater Classic -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #DC143C, #B22222);">
                    Movie Theater Classic
                    <div class="theme-name">Red velvet and gold elegance</div>
                </div>
                <div class="theme-content" style="background: #191970; color: #F5F5DC;">
                    <button class="sample-button" style="background: #DC143C; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F5F5DC; color: #191970; border-color: #DAA520;">
                        ✓ Valid connection! Tom Hanks and Meg Ryan both appear in You've Got Mail
                    </div>
                    <button class="sample-button" style="background: #DAA520; color: #191970;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #DC143C;"></div>
                        <div class="color-swatch" style="background: #DAA520;"></div>
                        <div class="color-swatch" style="background: #191970;"></div>
                        <div class="color-swatch" style="background: #F5F5DC;"></div>
                    </div>
                </div>
            </div>

            <!-- Silver Screen Elegance -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #C0C0C0, #E5E4E2);">
                    Silver Screen Elegance
                    <div class="theme-name">Monochromatic with metallic accents</div>
                </div>
                <div class="theme-content" style="background: #36454F; color: #FFFFFF;">
                    <button class="sample-button" style="background: #C0C0C0; color: #000;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFFFF; color: #36454F; border-color: #C0C0C0;">
                        ✓ Valid connection! Grace Kelly and Cary Grant both appear in To Catch a Thief
                    </div>
                    <button class="sample-button" style="background: #708090; color: #FFFFFF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #C0C0C0;"></div>
                        <div class="color-swatch" style="background: #E5E4E2;"></div>
                        <div class="color-swatch" style="background: #36454F;"></div>
                        <div class="color-swatch" style="background: #708090;"></div>
                    </div>
                </div>
            </div>

            <!-- Modern Hollywood -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #0080FF, #00BFFF);">
                    Modern Hollywood
                    <div class="theme-name">Contemporary cinema with neon accents</div>
                </div>
                <div class="theme-content" style="background: #2F4F4F; color: #FFFFFF;">
                    <button class="sample-button" style="background: #0080FF; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #39FF14; color: #2F4F4F; border-color: #FF1493;">
                        ✓ Valid connection! Chris Evans and Scarlett Johansson both appear in The Avengers
                    </div>
                    <button class="sample-button" style="background: #FF1493; color: white;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #0080FF;"></div>
                        <div class="color-swatch" style="background: #00BFFF;"></div>
                        <div class="color-swatch" style="background: #FF1493;"></div>
                        <div class="color-swatch" style="background: #39FF14;"></div>
                    </div>
                </div>
            </div>

            <!-- Oscar Night -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #FFD700, #D4A942);">
                    Oscar Night
                    <div class="theme-name">Awards ceremony elegance</div>
                </div>
                <div class="theme-content" style="background: #191970; color: #F8F8FF;">
                    <button class="sample-button" style="background: #FFD700; color: #191970;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F8F8FF; color: #191970; border-color: #E8B4B8;">
                        ✓ Valid connection! Meryl Streep and Anne Hathaway both appear in The Devil Wears Prada
                    </div>
                    <button class="sample-button" style="background: #000080; color: #F8F8FF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #FFD700;"></div>
                        <div class="color-swatch" style="background: #D4A942;"></div>
                        <div class="color-swatch" style="background: #191970;"></div>
                        <div class="color-swatch" style="background: #E8B4B8;"></div>
                    </div>
                </div>
            </div>

            <!-- Vintage Cinema -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #704214, #D2691E);">
                    Vintage Cinema
                    <div class="theme-name">Warm sepia and earth tones</div>
                </div>
                <div class="theme-content" style="background: #355E3B; color: #FFFDD0;">
                    <button class="sample-button" style="background: #704214; color: #FFFDD0;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFDD0; color: #355E3B; border-color: #D2691E;">
                        ✓ Valid connection! Clark Gable and Vivien Leigh both appear in Gone with the Wind
                    </div>
                    <button class="sample-button" style="background: #6B8E23; color: #FFFDD0;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #704214;"></div>
                        <div class="color-swatch" style="background: #D2691E;"></div>
                        <div class="color-swatch" style="background: #355E3B;"></div>
                        <div class="color-swatch" style="background: #FFFDD0;"></div>
                    </div>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #666; font-size: 14px;">
            <p>Each theme shows sample buttons, validation feedback, and color palette</p>
            <p>Colors can be adjusted based on your preferences</p>
        </div>
    </div>
</body>
</html>
    `);
  });
  // Force reset daily challenge (used by cron job and admin)
  app.post("/api/daily-challenge", async (req, res) => {
    try {
      const { date, forceNew } = req.body;
      const today = date || getESTDateString();

      if (forceNew) {
        console.log(`Force generating new challenge for ${today}`);
        // Delete existing challenge if it exists
        const existingChallenge = await storage.getDailyChallenge(today);
        if (existingChallenge) {
          console.log(`Deleting existing challenge: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
          await storage.deleteDailyChallenge(today);
        }

        // Generate new challenge with exclusion logic
        // Get yesterday's challenge to exclude those actors
        let excludeActorIds: number[] = [];
        try {
          const yesterday = getYesterdayDateString();
          const previousChallenge = await storage.getDailyChallenge(yesterday);
          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
          }
        } catch (exclusionError) {
          console.log("Could not check for actors to exclude, proceeding with normal generation");
        }

        const actors = await gameLogicService.generateDailyActors(excludeActorIds);
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }

        const newChallenge = await storage.createDailyChallenge({
          date: today,
          status: "active",
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
          hintsUsed: 0,
        });

        console.log(`Force-created new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
        return res.json(newChallenge);
      }

      // Regular generation logic (same as GET)
      let challenge = await storage.getDailyChallenge(today);
      if (!challenge) {
        // Get yesterday's challenge to exclude those actors
        let excludeActorIds: number[] = [];
        try {
          const yesterday = getYesterdayDateString();
          const previousChallenge = await storage.getDailyChallenge(yesterday);
          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
          }
        } catch (exclusionError) {
          console.log("Could not check for actors to exclude, proceeding with normal generation");
        }

        const actors = await gameLogicService.generateDailyActors(excludeActorIds);
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }

        challenge = await storage.createDailyChallenge({
          date: today,
          status: "active",
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
          hintsUsed: 0,
        });
      }

      res.json(challenge);
    } catch (error) {
      console.error("Error in POST daily challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Diagnostic ping route
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok", message: "pong", timestamp: new Date().toISOString() });
  });

  // Get today's daily challenge
  app.get("/api/daily-challenge", async (req, res) => {
    try {
      const today = getESTDateString(); // Use EST date, not UTC

      // Try to get challenge with longer timeout for better resilience
      let challenge;
      try {
        challenge = await storage.getDailyChallenge(today);
      } catch (dbError) {
        console.error("Database error when fetching challenge:", dbError);
        // Return a fallback error that doesn't block the UI completely
        return res.status(503).json({
          message: "Database temporarily unavailable. Please refresh in a moment.",
          retry: true
        });
      }

      // FALLBACK: If no challenge for today, check if there's a "next" challenge that should be promoted
      // This handles the case when the midnight cron job didn't run (server was down)
      if (!challenge) {
        console.log(`No challenge found for ${today}, checking for pending 'next' challenge to promote...`);

        try {
          const nextChallenge = await storage.getChallengeByStatus('next');

          if (nextChallenge) {
            console.log(`Found pending 'next' challenge: ${nextChallenge.startActorName} to ${nextChallenge.endActorName} - promoting to active`);

            // Archive old active challenge(s) if any exist
            const activeChallenge = await storage.getChallengeByStatus('active');
            if (activeChallenge) {
              await storage.deleteDailyChallenge(activeChallenge.date);
              console.log(`Archived old active challenge: ${activeChallenge.startActorName} to ${activeChallenge.endActorName}`);
            }

            // Delete the next challenge and recreate as active with today's date
            await storage.deleteDailyChallenge(nextChallenge.date);

            challenge = await storage.createDailyChallenge({
              date: today,
              status: 'active',
              startActorId: nextChallenge.startActorId,
              startActorName: nextChallenge.startActorName,
              startActorProfilePath: nextChallenge.startActorProfilePath || null,
              endActorId: nextChallenge.endActorId,
              endActorName: nextChallenge.endActorName,
              endActorProfilePath: nextChallenge.endActorProfilePath || null,
              hintsUsed: 0,
            });

            console.log(`Successfully promoted 'next' to 'active': ${challenge.startActorName} to ${challenge.endActorName} for ${today}`);

            // Generate a new "next" challenge for tomorrow
            const tomorrow = getTomorrowDateString();
            try {
              const excludeActorIds = [challenge.startActorId, challenge.endActorId];
              const actors = await gameLogicService.generateDailyActors(excludeActorIds);

              if (actors) {
                await storage.createDailyChallenge({
                  date: tomorrow,
                  status: "next",
                  startActorId: actors.actor1.id,
                  startActorName: actors.actor1.name,
                  startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
                  endActorId: actors.actor2.id,
                  endActorName: actors.actor2.name,
                  endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
                  hintsUsed: 0,
                });
                console.log(`Generated new 'next' challenge for ${tomorrow}: ${actors.actor1.name} to ${actors.actor2.name}`);
              }
            } catch (nextGenError) {
              console.error("Error generating next challenge:", nextGenError);
              // Continue even if next challenge generation fails
            }
          }
        } catch (promotionError: any) {
          console.error("Error checking/promoting next challenge:", promotionError?.message || promotionError);
          if (promotionError?.stack) console.error(promotionError.stack);
          // Continue to fallback generation below
        }
      }

      if (!challenge) {
        console.log(`No challenge found for ${today}, generating new challenge...`);

        // Prevent race conditions by using a shared promise
        // Reset promise if date has changed (new day)
        if (lastChallengeDate !== today) {
          challengeCreationPromise = null;
          lastChallengeDate = today;
        }

        if (!challengeCreationPromise) {
          challengeCreationPromise = (async () => {
            try {
              // Double-check if challenge was created while we were waiting
              const existingChallenge = await withRetry(() => storage.getDailyChallenge(today), 5);
              if (existingChallenge) {
                console.log(`Challenge was created by another request: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
                return existingChallenge;
              }

              // Generate new challenge for today with exclusion logic
              // Get yesterday's challenge to exclude those actors
              let excludeActorIds: number[] = [];
              try {
                const yesterday = getYesterdayDateString();
                const previousChallenge = await storage.getDailyChallenge(yesterday);
                if (previousChallenge) {
                  excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
                  console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
                }
              } catch (exclusionError) {
                console.log("Could not check for actors to exclude, proceeding with normal generation");
              }

              const actors = await gameLogicService.generateDailyActors(excludeActorIds);
              if (!actors) {
                throw new Error("Unable to generate daily challenge");
              }

              const newChallenge = await withRetry(() => storage.createDailyChallenge({
                date: today,
                status: "active",
                startActorId: actors.actor1.id,
                startActorName: actors.actor1.name,
                startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
                endActorId: actors.actor2.id,
                endActorName: actors.actor2.name,
                endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
                hintsUsed: 0,
              }), 5);
              console.log(`Created new challenge: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
              return newChallenge;
            } finally {
              // Clear the promise so future requests can create new challenges if needed
              challengeCreationPromise = null;
            }
          })();
        }

        try {
          challenge = await challengeCreationPromise;
        } catch (creationError: any) {
          console.error("Error creating new challenge:", creationError?.message || creationError);
          if (creationError?.stack) console.error(creationError.stack);
          return res.status(503).json({
            message: "Unable to generate daily challenge due to database issues. Please refresh in a moment.",
            retry: true
          });
        }

        if (!challenge) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }
      }

      res.json(challenge);
    } catch (error: any) {
      console.error("CRITICAL error getting daily challenge:", error?.message || error);
      if (error?.stack) console.error(error.stack);
      res.status(500).json({
        message: "Internal server error",
        error: error?.message || "Unknown error",
        path: "/api/daily-challenge"
      });
    }
  });

  // Search for actors
  app.get("/api/search/actors", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const actors = await tmdbService.searchActors(query);
      const sanitizedActors = actors.map(actor => ({
        ...actor,
        profile_path: sanitizeImagePath(actor.profile_path)
      }));
      res.json(sanitizedActors);
    } catch (error) {
      console.error("Error searching actors:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search for movies - also checks challenge actors' filmographies for titles with special characters
  app.get("/api/search/movies", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      // Get standard search results
      const movies = await tmdbService.searchMovies(query);

      const sanitizedMovies = movies.map(movie => ({
        ...movie,
        poster_path: sanitizeImagePath(movie.poster_path)
      }));
      res.json(sanitizedMovies);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate a single connection
  app.post("/api/validate-connection", async (req, res) => {
    try {
      const { actorId, movieId, previousActorId, nextActorId } = req.body;

      if (!actorId || !movieId) {
        return res.status(400).json({ message: "Actor ID and Movie ID are required" });
      }

      const result = await gameLogicService.validateConnection(
        actorId,
        movieId,
        previousActorId,
        nextActorId
      );

      res.json(result);
    } catch (error) {
      console.error("Error validating connection:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Force regenerate daily challenge (for development/admin)
  app.delete("/api/daily-challenge/regenerate", async (req, res) => {
    try {
      const today = getESTDateString();
      await storage.deleteDailyChallenge(today);
      console.log(`Challenge for ${today} deleted, hints will reset for new challenge`);
      res.json({ message: "Challenge cleared, next request will generate a new one" });
    } catch (error) {
      console.error("Error clearing challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get hints for daily challenge
  // Get stored hints for daily challenge
  app.get("/api/daily-challenge/hints", async (req, res) => {
    try {
      const today = getESTDateString();
      const challenge = await storage.getDailyChallenge(today);

      if (!challenge) {
        return res.status(404).json({ message: "No challenge found" });
      }

      const result: any = {
        hintsUsed: challenge.hintsUsed || 0,
        startActorHint: null,
        endActorHint: null,
      };

      // Parse stored hints if they exist
      if (challenge.startActorHint) {
        try {
          result.startActorHint = {
            actorName: challenge.startActorName,
            movies: JSON.parse(challenge.startActorHint),
          };
        } catch (error) {
          console.error("Error parsing start actor hint:", error);
        }
      }

      if (challenge.endActorHint) {
        try {
          result.endActorHint = {
            actorName: challenge.endActorName,
            movies: JSON.parse(challenge.endActorHint),
          };
        } catch (error) {
          console.error("Error parsing end actor hint:", error);
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error getting stored hints:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/daily-challenge/hint", async (req, res) => {
    try {
      const { actorType } = req.body; // 'start' or 'end'

      if (!actorType || (actorType !== 'start' && actorType !== 'end')) {
        return res.status(400).json({ message: "Actor type must be 'start' or 'end'" });
      }

      const today = getESTDateString();
      const challenge = await storage.getDailyChallenge(today);

      console.log(`Hint request for ${today}, challenge found: ${challenge ? 'YES' : 'NO'}`);
      if (challenge) {
        console.log(`Challenge: ${challenge.startActorName} to ${challenge.endActorName} (hints: ${challenge.hintsUsed || 0}) [ID: ${challenge.id}]`);
      }

      if (!challenge) {
        return res.status(404).json({ message: "No challenge found for today" });
      }

      // Allow users to access hints anytime - no restriction on viewing hints

      const actorId = actorType === 'start' ? challenge.startActorId : challenge.endActorId;
      const actorName = actorType === 'start' ? challenge.startActorName : challenge.endActorName;

      const movies = await tmdbService.getActorHintMovies(actorId, 5);

      // Check if this hint has already been generated and stored
      const existingHintField = actorType === 'start' ? challenge.startActorHint : challenge.endActorHint;
      let updatedChallenge = challenge;

      if (!existingHintField) {
        // Only increment hint count and store hint if it hasn't been generated before
        const hintContent = JSON.stringify(movies);
        updatedChallenge = await storage.updateDailyChallengeHints(
          challenge.id,
          (challenge.hintsUsed || 0) + 1,
          actorType === 'start' ? hintContent : undefined,
          actorType === 'end' ? hintContent : undefined
        );
      }

      res.json({
        actorName,
        movies,
        hintsRemaining: Math.max(0, 2 - (updatedChallenge.hintsUsed || 0)),
      });
    } catch (error) {
      console.error("Error getting hint:", error);
      res.status(500).json({
        message: "Internal server error while fetching hint",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Validate complete game chain
  app.post("/api/validate-game", async (req, res) => {
    let validationResult: any = {
      valid: false,
      completed: false,
      message: "Initialization failed"
    };
    let connections = [];

    try {
      const parseResult = gameConnectionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }

      connections = parseResult.data.connections;
      const { startActorId, endActorId } = parseResult.data;

      try {
        validationResult = await gameLogicService.validateCompleteChain({
          startActorId,
          endActorId,
          connections,
        });
      } catch (validationError) {
        console.error("Validation error:", validationError);
        // Create a failed result even if validation throws an error
        validationResult = {
          valid: false,
          completed: false,
          message: "Validation failed due to an error"
        };
      }

      // Save ALL attempts (both completed and failed) - ALWAYS save, even if validation had errors
      // Send response immediately to avoid UI hanging
      res.json(validationResult);

      // Save attempt in background - use current request scope but don't await response
      // In serverless, we must be careful. Vercel waits for async work in "Serverless Function" 
      // but if we want to be safe we should await it OR use waitUntil if available (Next.js/Cloudflare)
      // Since this is Express on Vercel, we should actually await it BUT with a timeout race
      // so we don't block the user for more than 500ms for stats.
      try {
        const today = getESTDateString();
        const savePromise = (async () => {
          const challenge = await storage.getDailyChallenge(today);
          if (challenge) {
            await storage.createGameAttempt({
              challengeId: challenge.id,
              moves: connections.length,
              completed: validationResult.completed || false,
              connections: JSON.stringify(connections),
            });
          }
        })();

        // Race between save and 500ms timeout
        // We log error but don't fail the request
        await Promise.race([
          savePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Stats save timeout")), 500))
        ]);
      } catch (dbError) {
        // Silently fail stats saving if it takes too long
        console.error("Background stats save error/timeout:", dbError);
      }
    } catch (error) {
      console.error("Error validating game:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics endpoint for anonymous game statistics
  app.get("/api/analytics", async (req, res) => {
    try {
      // Use provided challengeId or fall back to today's challenge
      let challengeId = req.query.challengeId as string;

      if (!challengeId) {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);

        if (!challenge) {
          return res.status(404).json({ message: "No challenge found for today" });
        }
        challengeId = challenge.id;
      }

      const stats = await storage.getChallengeAnalytics(challengeId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Get current user info
  app.get("/api/user/me", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.claims) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const userData = {
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.given_name,
        lastName: user.claims.family_name,
        profileImageUrl: user.claims.picture,
      };

      res.json(userData);
    } catch (error) {
      console.error("Error getting user info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user stats
  app.get("/api/user/stats", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const userId = user.claims.sub;

      const completions = await storage.getUserCompletions(userId);
      const moveDistribution = await storage.getUserMoveDistribution(userId);

      const totalChallenges = completions.length;
      const completedChallenges = completions.filter(c => c.moves <= 6).length;
      const averageMoves = completions.length > 0
        ? Math.round((completions.reduce((sum, c) => sum + c.moves, 0) / completions.length) * 10) / 10
        : 0;
      const bestScore = completions.length > 0
        ? Math.min(...completions.map(c => c.moves))
        : null;

      res.json({
        totalChallenges,
        completedChallenges,
        averageMoves,
        bestScore,
        moveDistribution,
      });
    } catch (error) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get incomplete challenges from past 5 days
  app.get("/api/user/incomplete-challenges", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const userId = user.claims.sub;

      // Get challenges from the past 5 days
      const challenges = [];
      for (let i = 1; i <= 5; i++) {
        const date = new Date();
        date.setHours(date.getHours() - 12); // Offset to ensure we don't skip a day if running early morning UTC
        date.setDate(date.getDate() - i);
        const dateStr = getESTDateString(date);

        const challenge = await storage.getDailyChallenge(dateStr);
        if (challenge) {
          // Check if user has completed this challenge
          const completion = await storage.getUserChallengeCompletion(userId, challenge.id);
          if (!completion) {
            challenges.push(challenge);
          }
        }
      }

      res.json(challenges);
    } catch (error) {
      console.error("Error getting incomplete challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get movie credits (actors in a movie)
  app.get("/api/movie/:id/credits", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }

      const actors = await tmdbService.getMovieCredits(movieId);
      res.json(actors);
    } catch (error) {
      console.error("Error getting movie credits:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get actor's movies
  app.get("/api/actor/:id/movies", async (req, res) => {
    try {
      const actorId = parseInt(req.params.id);
      if (isNaN(actorId)) {
        return res.status(400).json({ message: "Invalid actor ID" });
      }

      const movies = await tmdbService.getActorMovies(actorId);
      res.json(movies);
    } catch (error) {
      console.error("Error getting actor movies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify and repair challenge thumbnails
  app.post("/api/verify-thumbnails", async (req, res) => {
    try {
      const { challengeId } = req.body;
      let challenge;

      if (challengeId) {
        challenge = await storage.getDailyChallengeById(challengeId);
      } else {
        // Verify today's challenge by default
        const today = getESTDateString();
        challenge = await storage.getDailyChallenge(today);
      }

      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      console.log(`Verifying thumbnails for challenge: ${challenge.startActorName} to ${challenge.endActorName}`);

      const verification = await tmdbService.verifyChallengeThumbnails({
        id: challenge.id,
        startActorId: challenge.startActorId,
        startActorName: challenge.startActorName,
        startActorProfilePath: challenge.startActorProfilePath,
        endActorId: challenge.endActorId,
        endActorName: challenge.endActorName,
        endActorProfilePath: challenge.endActorProfilePath
      });

      if (verification.needsUpdate) {
        // Update the database with correct thumbnails
        const updates: any = {};
        if (verification.correctStartPath !== undefined) {
          updates.startActorProfilePath = verification.correctStartPath;
        }
        if (verification.correctEndPath !== undefined) {
          updates.endActorProfilePath = verification.correctEndPath;
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateDailyChallenge(challenge.id, updates);
          console.log(`Updated thumbnails for challenge ${challenge.id}:`, updates);
        }

        return res.json({
          message: "Thumbnails verified and updated",
          issues: verification.issues,
          updates: updates,
          success: true
        });
      } else {
        return res.json({
          message: "Thumbnails are correct",
          success: true
        });
      }
    } catch (error) {
      console.error("Error verifying thumbnails:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate new daily challenge (manual trigger)
  app.post("/api/generate-challenge", async (req, res) => {
    try {
      // Get yesterday's challenge to exclude those actors from new generation
      let excludeActorIds: number[] = [];
      try {
        const yesterday = getYesterdayDateString();
        const previousChallenge = await storage.getDailyChallenge(yesterday);
        if (previousChallenge) {
          excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
          console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
        }
      } catch (exclusionError) {
        console.log("Could not check for actors to exclude, proceeding with normal generation");
      }

      const actors = await gameLogicService.generateDailyActors(excludeActorIds);
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate challenge" });
      }

      const today = getESTDateString();
      const challenge = await storage.createDailyChallenge({
        date: today,
        status: "active",
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
      });

      res.json(challenge);
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // NOTE: Daily challenge reset is handled in server/index.ts with proper EST/EDT timezone
  // The cron job there promotes "next" to "active" and generates new "next" at midnight Eastern

  // Admin authentication middleware
  const requireAdminAuth = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      const session = await validateAdminSession(token);
      if (!session) {
        return res.status(401).json({ message: "Invalid or expired admin session" });
      }

      req.adminSession = session;
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Admin setup route (for initial admin creation)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (email !== "qturner17@gmail.com") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const user = await createAdminUser(email, password);
      res.json({ message: "Admin user created successfully", userId: user.id });
    } catch (error) {
      console.error("Admin setup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await authenticateAdmin(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const session = await createAdminSession(user.id);
      res.json({
        message: "Login successful",
        token: session.token,
        expiresAt: session.expiresAt
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", requireAdminAuth, async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await deleteAdminSession(token);
      }
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin challenge reset - promotes next to active and generates new next
  app.delete("/api/admin/reset-challenge", requireAdminAuth, async (req, res) => {
    try {
      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();

      // 1. Clear the in-memory cache to ensure the next GET request hits the DB
      challengeCreationPromise = null;
      lastChallengeDate = null;

      // 2. Delete ALL 'active' challenges (duplicates, stale dates, etc.)
      const activeChallenges = await storage.getAllChallengesByStatus('active');
      for (const challenge of activeChallenges) {
        console.log(`Deleting active challenge [${challenge.id}] dated ${challenge.date}`);
        await storage.deleteDailyChallengeById(challenge.id);
      }

      // 2. Ensure today's challenge is gone (redundant but safe)
      await storage.deleteDailyChallenge(today);

      // Check if there's a "next" challenge that will be promoted
      const nextChallenge = await storage.getChallengeByStatus('next');

      if (nextChallenge) {
        // The GET endpoint will promote this to active
        // But we need to generate a NEW next challenge so we don't have duplicates
        console.log(`Next challenge (${nextChallenge.startActorName} to ${nextChallenge.endActorName}) will be promoted to active`);

        // Generate a brand new next challenge with different actors
        const excludeActorIds = [nextChallenge.startActorId, nextChallenge.endActorId];
        const actors = await gameLogicService.generateDailyActors(excludeActorIds);

        if (actors) {
          // Delete the old next challenge date entry if it exists for tomorrow
          const existingTomorrow = await storage.getDailyChallenge(tomorrow);
          if (existingTomorrow) {
            await storage.deleteDailyChallenge(tomorrow);
          }

          // Create new next challenge for tomorrow
          const newNextChallenge = await storage.createDailyChallenge({
            date: tomorrow,
            status: "next",
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0,
          });

          console.log(`Generated new next challenge: ${newNextChallenge.startActorName} to ${newNextChallenge.endActorName}`);
        }
      } else {
        // Fallback: If no "next" challenge, generate a NEW active challenge immediately
        console.log("No next challenge found during reset, generating fresh active challenge for today");
        const actors = await gameLogicService.generateDailyActors([]);
        if (actors) {
          await storage.createDailyChallenge({
            date: today,
            status: 'active',
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0,
          });
          console.log(`Generated fresh active challenge: ${actors.actor1.name} to ${actors.actor2.name}`);
        }
      }

      res.json({ message: "Daily challenge reset successfully, new next challenge generated" });
    } catch (error) {
      console.error("Admin challenge reset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin set custom challenge
  app.post("/api/admin/set-challenge", requireAdminAuth, async (req, res) => {
    try {
      const { startActorId, startActorName, endActorId, endActorName } = req.body;

      if (!startActorId || !startActorName || !endActorId || !endActorName) {
        return res.status(400).json({ message: "All actor fields are required" });
      }

      const tomorrow = getTomorrowDateString();

      // Delete existing next challenge
      const existingNext = await storage.getChallengeByStatus('next');
      if (existingNext) {
        console.log(`Deleting existing next challenge: ${existingNext.startActorName} to ${existingNext.endActorName}`);
        await storage.deleteDailyChallenge(existingNext.date);
      }

      // Create new NEXT challenge with selected actors (will become tomorrow's challenge)
      const challenge = await storage.createDailyChallenge({
        date: tomorrow,
        status: "next",
        startActorId,
        startActorName,
        endActorId,
        endActorName,
      });

      console.log(`Admin set custom NEXT challenge for ${tomorrow}: ${startActorName} to ${endActorName}`);
      res.json({ message: "Custom next challenge set successfully - will become active tomorrow", challenge });
    } catch (error) {
      console.error("Admin set challenge error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin route: Get next daily challenge preview (24 hours in advance)
  app.get("/api/admin/next-challenge", requireAdminAuth, async (req, res) => {
    try {
      const tomorrow = getTomorrowDateString();
      console.log(`Looking for next daily challenge for date: ${tomorrow}`);

      // Get challenge with status 'next' for tomorrow
      const challenge = await storage.getDailyChallenge(tomorrow);

      if (!challenge || challenge.status !== 'next') {
        console.log(`No next challenge found for ${tomorrow}, generating one now...`);

        // Auto-generate logic
        const currentActive = await storage.getChallengeByStatus('active');
        const excludeIds = currentActive ? [currentActive.startActorId, currentActive.endActorId] : [];

        const actors = await gameLogicService.generateDailyActors(excludeIds);

        if (actors) {
          const newNextChallenge = await storage.createDailyChallenge({
            date: tomorrow,
            status: "next",
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0,
          });

          console.log(`Generated new next challenge: ${newNextChallenge.startActorName} to ${newNextChallenge.endActorName}`);
          return res.json(newNextChallenge);
        } else {
          return res.status(500).json({ message: "Failed to generate next challenge" });
        }
      }

      console.log(`Found next challenge: ${challenge.startActorName} to ${challenge.endActorName}`);
      res.json(challenge);
    } catch (error) {
      console.error("Error getting next challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin route: Reset next daily challenge (24 hours in advance)
  app.post("/api/admin/reset-next-challenge", requireAdminAuth, async (req, res) => {
    try {
      const tomorrow = getTomorrowDateString();

      // Delete existing next challenge if it exists
      const existingChallenge = await storage.getDailyChallenge(tomorrow);
      if (existingChallenge) {
        console.log(`Deleting existing next challenge: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
        await storage.deleteDailyChallenge(tomorrow);
      }

      // Generate new next challenge (24 hours in advance)
      const actors = await gameLogicService.generateDailyActors();
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate next challenge" });
      }

      const newChallenge = await storage.createDailyChallenge({
        date: tomorrow,
        status: "next",
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
        hintsUsed: 0,
      });

      console.log(`Created new next challenge: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
      res.json({ message: "Next challenge reset successfully", challenge: newChallenge });
    } catch (error) {
      console.error("Error resetting tomorrow's challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const parseResult = insertContactSubmissionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }

      const submission = await storage.createContactSubmission(parseResult.data);

      // Send email notification (non-blocking)
      emailService.sendContactNotification(submission).catch(error => {
        console.error('Email notification failed:', error);
      });

      res.json({
        message: "Contact submission received successfully",
        id: submission.id
      });
    } catch (error) {
      console.error("Error creating contact submission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin endpoint to view contact submissions
  app.get("/api/admin/contacts", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const adminUser = await validateAdminSession(token);
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      const submissions = await storage.getContactSubmissions();
      // Filter to only show submissions that haven't been read
      const unreadSubmissions = submissions.filter(submission => submission.status === 'new');
      res.json(unreadSubmissions);
    } catch (error) {
      console.error("Error getting contact submissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin endpoint to update contact submission status
  app.patch("/api/admin/contacts/:id", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const adminUser = await validateAdminSession(token);
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required" });
      }

      await storage.updateContactSubmissionStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating contact submission status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Track visitor endpoint
  app.post("/api/analytics/track-visit", async (req, res) => {
    try {
      const visitorData = req.body;

      // Ensure sessionId is provided in the request body
      if (!visitorData.sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Create visitor session with proper error handling
      try {
        const session = await withRetry(() => storage.trackVisitor({
          ...visitorData,
          ipAddress: req.ip || req.connection.remoteAddress,
          converted: false,
          bounced: true, // Will be updated to false if user engages
          sessionDuration: 0,
        }), 3);

        res.json({ sessionId: session.id, message: "Visit tracked" });
      } catch (dbError) {
        console.error("Database error tracking visitor:", dbError);
        // Return success anyway to not block the frontend
        res.json({ sessionId: visitorData.sessionId, message: "Visit tracking temporarily unavailable" });
      }
    } catch (error) {
      console.error("Error tracking visit:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Referral Analytics API Routes
  app.get("/api/analytics/referrals", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await storage.getReferralAnalytics(days);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching referral analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/analytics/track-conversion", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      await storage.updateVisitorSession(sessionId, {
        converted: true,
        bounced: false
      });

      res.json({ message: "Conversion tracked" });
    } catch (error) {
      console.error("Error tracking conversion:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Debug endpoint for production troubleshooting
  app.get("/api/debug/auth-status", async (req, res) => {
    try {
      const user = (req as any).user;
      const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      const repolyDomain = process.env.REPLIT_DOMAINS || 'not-set';

      res.json({
        timestamp: new Date().toISOString(),
        isAuthenticated: !!user,
        user: user ? {
          sub: user.claims?.sub,
          email: user.claims?.email,
          name: `${user.claims?.given_name} ${user.claims?.family_name}`.trim()
        } : null,
        hasGoogleCredentials,
        repolyDomain,
        sessionID: req.sessionID,
        environment: process.env.NODE_ENV || 'unknown'
      });
    } catch (error) {
      res.status(500).json({
        error: "Debug endpoint failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Session test endpoint to diagnose OAuth state issues
  app.get("/api/debug/session-test", (req, res) => {
    console.log(`🧪 Session test - Session ID: ${req.sessionID}`);
    console.log(`🧪 Session exists:`, !!req.session);
    console.log(`🧪 Session contents:`, req.session);

    if (!req.session) {
      return res.json({ error: 'No session found', sessionId: req.sessionID });
    }

    // Set a test value
    (req.session as any).testValue = 'test-' + Date.now();
    req.session.save((err) => {
      if (err) {
        console.error(`🧪 Session save error:`, err);
        return res.json({ error: 'Session save failed', details: err.message });
      }
      console.log(`🧪 Session saved successfully`);
      res.json({
        sessionId: req.sessionID,
        testValue: (req.session as any).testValue,
        success: true
      });
    });
  });

  // Session retrieve endpoint to test persistence
  app.get("/api/debug/session-retrieve", (req, res) => {
    console.log(`🧪 Session retrieve - Session ID: ${req.sessionID}`);
    console.log(`🧪 Session exists:`, !!req.session);
    console.log(`🧪 Session contents:`, req.session);

    res.json({
      sessionId: req.sessionID,
      testValue: req.session ? (req.session as any).testValue : null,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
  });

  // Test OAuth callback with mock Google response
  app.get("/api/debug/test-callback", async (req, res) => {
    try {
      console.log("🔧 Testing OAuth callback with mock parameters");

      // Simulate what Google would send back
      const mockCallbackParams = {
        code: "test-auth-code",
        state: "test-state",
        scope: "openid email profile"
      };

      console.log("🔧 Mock callback params:", mockCallbackParams);

      res.json({
        message: "OAuth callback test initiated",
        mockParams: mockCallbackParams,
        note: "Check server logs for detailed OAuth callback processing"
      });
    } catch (error) {
      res.status(500).json({
        error: "OAuth callback test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // User challenge completion routes
  app.post("/api/user-challenge-completion", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const parseResult = insertUserChallengeCompletionSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }

      // Check if user already completed this challenge
      const existingCompletion = await storage.getUserChallengeCompletion(userId, parseResult.data.challengeId);
      if (existingCompletion) {
        return res.status(400).json({ message: "Challenge already completed" });
      }

      // Record the completion
      const completion = await storage.createUserChallengeCompletion({
        ...parseResult.data,
        userId
      });

      // Update user stats
      const currentStats = await storage.getUserStats(userId);
      if (currentStats) {
        const moves = parseResult.data.moves;
        const today = getESTDateString();
        const yesterday = getYesterdayDateString();

        // Calculate streak
        let currentStreak = currentStats.currentStreak || 0;
        let maxStreak = currentStats.maxStreak || 0;
        const lastPlayed = currentStats.lastPlayedDate;

        if (lastPlayed === today) {
          // Already played today, streak remains same
        } else if (lastPlayed === yesterday) {
          // Played yesterday, increment streak
          currentStreak += 1;
        } else {
          // Missed a day or first time, reset streak
          currentStreak = 1;
        }

        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }

        const statUpdates: Partial<typeof currentStats> = {
          totalCompletions: (currentStats.totalCompletions || 0) + 1,
          totalMoves: (currentStats.totalMoves || 0) + moves,
          currentStreak,
          maxStreak,
          lastPlayedDate: today,
        };

        // Update move count stats
        if (moves === 1) statUpdates.completionsAt1Move = (currentStats.completionsAt1Move || 0) + 1;
        else if (moves === 2) statUpdates.completionsAt2Moves = (currentStats.completionsAt2Moves || 0) + 1;
        else if (moves === 3) statUpdates.completionsAt3Moves = (currentStats.completionsAt3Moves || 0) + 1;
        else if (moves === 4) statUpdates.completionsAt4Moves = (currentStats.completionsAt4Moves || 0) + 1;
        else if (moves === 5) statUpdates.completionsAt5Moves = (currentStats.completionsAt5Moves || 0) + 1;
        else if (moves === 6) statUpdates.completionsAt6Moves = (currentStats.completionsAt6Moves || 0) + 1;

        await storage.updateUserStats(userId, statUpdates);
      }

      res.status(201).json(completion);
    } catch (error) {
      console.error("Error creating user challenge completion:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's recent challenges (last 5)
  app.get("/api/user/recent-challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const recentChallenges = await storage.getRecentChallengesForUser(userId, 5);
      res.json(recentChallenges);
    } catch (error) {
      console.error("Error getting recent challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's move distribution stats
  app.get("/api/user/move-distribution", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const moveDistribution = await storage.getUserMoveDistribution(userId);
      res.json(moveDistribution);
    } catch (error) {
      console.error("Error getting user move distribution:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Secure Cron Reset endpoint for Vercel
  app.get("/api/cron/reset", async (req, res) => {
    // Basic security check using Vercel's CRON_SECRET or a custom one
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("🚀 Vercel Cron trigger: Daily challenge reset initiated");

      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();

      // Transition 'next' to 'active'
      const nextChallenge = await storage.getChallengeByStatus('next');
      if (nextChallenge) {
        console.log(`Promoting next challenge: ${nextChallenge.startActorName} to ${nextChallenge.endActorName}`);

        const activeChallenge = await storage.getChallengeByStatus('active');
        if (activeChallenge) {
          await storage.deleteDailyChallenge(activeChallenge.date);
        }

        await storage.deleteDailyChallenge(nextChallenge.date);
        await storage.createDailyChallenge({
          date: today,
          status: 'active',
          startActorId: nextChallenge.startActorId,
          startActorName: nextChallenge.startActorName,
          startActorProfilePath: nextChallenge.startActorProfilePath,
          endActorId: nextChallenge.endActorId,
          endActorName: nextChallenge.endActorName,
          endActorProfilePath: nextChallenge.endActorProfilePath,
          hintsUsed: 0,
        });
      } else {
        // Fallback: Generate if no 'next' exists
        console.log("No next challenge found, generating new one for today");
        const actors = await gameLogicService.generateDailyActors([]);
        if (actors) {
          await storage.createDailyChallenge({
            date: today,
            status: "active",
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0,
          });
        }
      }

      // Generate new 'next' for tomorrow
      const currentActive = await storage.getChallengeByStatus('active');
      if (currentActive) {
        const excludeIds = [currentActive.startActorId, currentActive.endActorId];
        const nextActors = await gameLogicService.generateDailyActors(excludeIds);
        if (nextActors) {
          await storage.createDailyChallenge({
            date: tomorrow,
            status: "next",
            startActorId: nextActors.actor1.id,
            startActorName: nextActors.actor1.name,
            startActorProfilePath: nextActors.actor1.profile_path,
            endActorId: nextActors.actor2.id,
            endActorName: nextActors.actor2.name,
            endActorProfilePath: nextActors.actor2.profile_path,
            hintsUsed: 0,
          });
        }
      }

      res.json({ message: "Daily challenge reset completed successfully", date: today });
    } catch (error) {
      console.error("Cron reset error:", error);
      res.status(500).json({ message: "Failed to reset daily challenge", error: String(error) });
    }
  });

  // Register test email routes
  registerTestEmailRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
