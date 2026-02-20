import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { tmdbService } from "./services/tmdb.js";
import { gameLogicService, type DifficultyLevel } from "./services/gameLogic.js";
import { withRetry } from "./db.js";
import { insertDailyChallengeSchema, insertGameAttemptSchema, gameConnectionSchema, insertContactSubmissionSchema, insertVisitorAnalyticsSchema, insertUserChallengeCompletionSchema, insertMovieListSchema, insertMovieListEntrySchema } from "../../shared/schema.js";
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
  const difficultyOrder = ["easy", "medium", "hard"] as const;
  type ChallengeDifficulty = (typeof difficultyOrder)[number];

  const sortChallengesByDifficulty = <T extends { difficulty: string }>(challenges: T[]): T[] => {
    const ranking: Record<ChallengeDifficulty, number> = {
      easy: 0,
      medium: 1,
      hard: 2,
    };

    return [...challenges].sort((a, b) => {
      const aRank = ranking[a.difficulty as ChallengeDifficulty] ?? Number.MAX_SAFE_INTEGER;
      const bRank = ranking[b.difficulty as ChallengeDifficulty] ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  };

  const isDateDifficultyUniqueViolation = (error: unknown): boolean => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes("daily_challenges_date_difficulty_key");
  };

  const createChallengeForDifficulty = async (
    date: string,
    difficulty: ChallengeDifficulty,
    excludeActorIds: number[],
  ) => {
    const actors = await gameLogicService.generateDailyActors(difficulty, excludeActorIds);

    if (!actors) {
      console.error(`Failed to generate ${difficulty} challenge for ${date}`);
      return undefined;
    }

    // Add generated actors to exclusions so subsequent generations do not reuse them.
    excludeActorIds.push(actors.actor1.id, actors.actor2.id);

    const newChallenge = await storage.createDailyChallenge({
      date,
      status: "active",
      difficulty,
      startActorId: actors.actor1.id,
      startActorName: actors.actor1.name,
      startActorProfilePath: sanitizeImagePath(actors.actor1.profile_path),
      endActorId: actors.actor2.id,
      endActorName: actors.actor2.name,
      endActorProfilePath: sanitizeImagePath(actors.actor2.profile_path),
      hintsUsed: 0,
    });

    console.log(`Created ${difficulty} challenge: ${actors.actor1.name} -> ${actors.actor2.name}`);
    return newChallenge;
  };

  // Helper to generate a full challenge set for a specific date
  const generateChallengesForDate = async (date: string) => {
    try {
      // Get yesterday's challenges to exclude actors
      const yesterday = getYesterdayDateString();
      const previousChallenges = await storage.getDailyChallenges(yesterday);
      const excludeActorIds: number[] = previousChallenges.flatMap(c => [c.startActorId, c.endActorId]);

      console.log(`Generating challenges for ${date}, excluding ${excludeActorIds.length} actors`);

      const pairsMap = await gameLogicService.generateAllDailyChallenges(excludeActorIds);
      const generatedChallenges = [];

      for (const difficulty of difficultyOrder) {
        const pair = pairsMap.get(difficulty as DifficultyLevel);
        if (!pair) {
          console.error(`Failed to generate ${difficulty} challenge for ${date}`);
          continue;
        }

        const newChallenge = await storage.createDailyChallenge({
          date,
          status: "active",
          difficulty,
          startActorId: pair.actor1.id,
          startActorName: pair.actor1.name,
          startActorProfilePath: sanitizeImagePath(pair.actor1.profile_path),
          endActorId: pair.actor2.id,
          endActorName: pair.actor2.name,
          endActorProfilePath: sanitizeImagePath(pair.actor2.profile_path),
          hintsUsed: 0,
        });

        console.log(`Created ${difficulty} challenge: ${pair.actor1.name} -> ${pair.actor2.name}`);
        generatedChallenges.push(newChallenge);
      }
      return sortChallengesByDifficulty(generatedChallenges);
    } catch (error) {
      console.error("Error generating challenges:", error);
      return [];
    }
  };

  // Ensure each date has easy/medium/hard. Backfills missing difficulties using unified generation.
  const ensureDailyChallenges = async (date: string) => {
    try {
      let challenges = await storage.getDailyChallenges(date);
      const existingDifficulties = new Set(challenges.map((challenge) => challenge.difficulty));
      const missingDifficulties = difficultyOrder.filter(
        (difficulty) => !existingDifficulties.has(difficulty),
      );

      if (missingDifficulties.length === 0) {
        return sortChallengesByDifficulty(challenges);
      }

      const yesterday = getYesterdayDateString();
      const previousChallenges = await storage.getDailyChallenges(yesterday);
      const excludeActorIds: number[] = [
        ...previousChallenges.flatMap((challenge) => [challenge.startActorId, challenge.endActorId]),
        ...challenges.flatMap((challenge) => [challenge.startActorId, challenge.endActorId]),
      ];

      console.log(
        `Backfilling ${missingDifficulties.join(", ")} challenge(s) for ${date}; existing=${challenges.length}`,
      );

      // Use unified generation for consistent behavior
      const pairsMap = await gameLogicService.generateAllDailyChallenges(excludeActorIds);

      for (const difficulty of missingDifficulties) {
        const pair = pairsMap.get(difficulty as DifficultyLevel);
        if (!pair) {
          console.error(`Failed to generate ${difficulty} pair for backfill on ${date}`);
          continue;
        }

        try {
          await storage.createDailyChallenge({
            date,
            status: "active",
            difficulty,
            startActorId: pair.actor1.id,
            startActorName: pair.actor1.name,
            startActorProfilePath: sanitizeImagePath(pair.actor1.profile_path),
            endActorId: pair.actor2.id,
            endActorName: pair.actor2.name,
            endActorProfilePath: sanitizeImagePath(pair.actor2.profile_path),
            hintsUsed: 0,
          });
          console.log(`Backfilled ${difficulty} challenge: ${pair.actor1.name} -> ${pair.actor2.name}`);
        } catch (error) {
          if (isDateDifficultyUniqueViolation(error)) {
            console.log(`Skipping ${difficulty} backfill for ${date}: already created by another request`);
            continue;
          }
          throw error;
        }
      }

      challenges = await storage.getDailyChallenges(date);
      return sortChallengesByDifficulty(challenges);
    } catch (error) {
      console.error(`Error ensuring daily challenges for ${date}:`, error);
      return [];
    }
  };

  app.post("/api/daily-challenge", async (req, res) => {
    try {
      const { date, forceNew } = req.body;
      const today = date || getESTDateString();

      if (forceNew) {
        console.log(`Force generating new challenges for ${today}`);
        // Delete existing challenges
        await storage.deleteDailyChallenge(today); // deletes all for date? No, logic needs update in storage
        // usage of deleteDailyChallenge(date) deletes ALL challenges for that date? 
        // Let's verify storage implementation. 
        // Yes: db.delete(dailyChallenges).where(eq(dailyChallenges.date, date));

        const newChallenges = await generateChallengesForDate(today);
        return res.json(newChallenges);
      }

      const ensuredChallenges = await ensureDailyChallenges(today);
      res.json(ensuredChallenges);
    } catch (error) {
      console.error("Error in POST daily challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Diagnostic ping route
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok", message: "pong", timestamp: new Date().toISOString() });
  });

  // Temporary diagnostic endpoint — tests each generation step
  app.get("/api/debug/generation", async (_req, res) => {
    const steps: { step: string; result?: any; error?: string; ms: number }[] = [];
    const t = () => Date.now();

    // Step 1: DB read
    let start = t();
    try {
      const today = getESTDateString();
      const existing = await storage.getDailyChallenges(today);
      steps.push({ step: "db_read", result: { date: today, count: existing.length, difficulties: existing.map(c => c.difficulty) }, ms: t() - start });
    } catch (e: any) {
      steps.push({ step: "db_read", error: e.message, ms: t() - start });
    }

    // Step 2: Quality actor pool
    start = t();
    try {
      const pool = await tmdbService.getQualityActorPool();
      steps.push({ step: "quality_pool", result: { size: pool.length, sample: pool.slice(0, 3).map(a => a.name) }, ms: t() - start });
    } catch (e: any) {
      steps.push({ step: "quality_pool", error: e.message, ms: t() - start });
    }

    // Step 3: generateAllDailyChallenges
    start = t();
    try {
      const pairsMap = await gameLogicService.generateAllDailyChallenges([]);
      const pairs: Record<string, string> = {};
      for (const [diff, pair] of pairsMap) {
        pairs[diff] = `${pair.actor1.name} <-> ${pair.actor2.name}`;
      }
      steps.push({ step: "generate_all", result: { filled: pairsMap.size, pairs }, ms: t() - start });
    } catch (e: any) {
      steps.push({ step: "generate_all", error: e.message, ms: t() - start });
    }

    res.json({ steps, totalMs: steps.reduce((sum, s) => sum + s.ms, 0) });
  });

  // Get today's daily challenges (plural)
  app.get("/api/daily-challenges", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      const today = getESTDateString();
      const challenges = await ensureDailyChallenges(today);

      if (challenges.length === 0) {
        return res.status(503).json({ message: "Challenges unavailable, try again later" });
      }

      res.json(challenges);
    } catch (error) {
      console.error("Error getting daily challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy endpoint for backward compatibility (returns Medium or single)
  app.get("/api/daily-challenge", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      const today = getESTDateString();
      const challenges = await ensureDailyChallenges(today);

      if (challenges.length === 0) {
        return res.status(503).json({ message: "Challenges unavailable, try again later" });
      }

      const challenge = challenges.find(c => c.difficulty === 'medium') || challenges[0];
      res.json(challenge);
    } catch (error) {
      console.error("Get daily challenge error:", error);
      res.status(500).json({ message: "Internal server error" });
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

  // Force regenerate daily challenge (admin-only in production)
  app.delete("/api/daily-challenge/regenerate", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        const adminToken = req.headers.authorization?.replace("Bearer ", "");
        if (!adminToken) {
          return res.status(401).json({ message: "Admin authentication required" });
        }

        const adminSession = await validateAdminSession(adminToken);
        if (!adminSession) {
          return res.status(401).json({ message: "Invalid or expired admin session" });
        }
      }

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
      const challengeId = typeof req.query.challengeId === "string" ? req.query.challengeId : undefined;
      const today = getESTDateString();
      const challenge = challengeId
        ? await storage.getDailyChallengeById(challengeId)
        : await storage.getDailyChallenge(today);

      if (!challenge) {
        if (challengeId) {
          return res.status(404).json({ message: "Challenge not found" });
        }
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
      const { challengeId, actorType } = req.body; // 'start' or 'end'

      if (!actorType || (actorType !== 'start' && actorType !== 'end')) {
        return res.status(400).json({ message: "Actor type must be 'start' or 'end'" });
      }

      if (challengeId && typeof challengeId !== "string") {
        return res.status(400).json({ message: "Challenge ID must be a string" });
      }

      const today = getESTDateString();
      const challenge = challengeId
        ? await storage.getDailyChallengeById(challengeId)
        : await storage.getDailyChallenge(today);

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

      const { challengeId, connections: parsedConnections, startActorId, endActorId } = parseResult.data;
      connections = parsedConnections;

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

      // Save attempt - we await this BEFORE sending response to ensure
      // 1. Data consistency (analytics will be fresh when client fetches them)
      // 2. Execution reliability (serverless functions might freeze after response)
      try {
        const today = getESTDateString();

        const savePromise = (async () => {
          let challengeIdForAttempt: string | undefined;

          if (challengeId) {
            const selectedChallenge = await storage.getDailyChallengeById(challengeId);
            challengeIdForAttempt = selectedChallenge?.id;
          }

          if (!challengeIdForAttempt) {
            const todayChallenge = await storage.getDailyChallenge(today);
            challengeIdForAttempt = todayChallenge?.id;
          }

          if (challengeIdForAttempt) {
            await storage.createGameAttempt({
              challengeId: challengeIdForAttempt,
              moves: connections.length,
              completed: validationResult.completed || false,
              connections: JSON.stringify(connections),
            });
          }
        })();

        // Race between save and 2000ms timeout
        // We log error but don't fail the request if stats saving fails
        await Promise.race([
          savePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Stats save timeout")), 2000))
        ]);
      } catch (dbError) {
        // Silently fail stats saving if it takes too long
        console.error("Stats save error/timeout:", dbError);
      }

      // Send response after stats are ideally saved
      res.json(validationResult);

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

  // Get best completion users (leaderboard)
  app.get("/api/analytics/best-users", async (req, res) => {
    try {
      let challengeId = req.query.challengeId as string;

      if (!challengeId) {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);

        if (!challenge) {
          return res.status(404).json({ message: "No challenge found for today" });
        }
        challengeId = challenge.id;
      }

      const result = await storage.getBestCompletionUsers(challengeId);
      res.json(result);
    } catch (error) {
      console.error("Error getting best users:", error);
      res.status(500).json({ message: "Failed to get best users" });
    }
  });



  // Get incomplete challenges from past 5 days
  app.get("/api/user/incomplete-challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

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

      const actors = await gameLogicService.generateDailyActors('medium', excludeActorIds);
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

      // 3. Promote Next to Active (if exists)
      // Check if there's a "next" challenge specifically for TOMORROW
      let nextChallenge = await storage.getDailyChallenge(tomorrow);

      // If not specific tomorrow challenge, try just any 'next' regardless of date
      if (!nextChallenge || nextChallenge.status !== 'next') {
        nextChallenge = await storage.getChallengeByStatus('next');
      }

      if (nextChallenge) {
        console.log(`Promoting Next challenge [${nextChallenge.id}] to Active/Today`);

        // UPDATE existing next challenge to be today's active challenge
        await storage.updateDailyChallenge(nextChallenge.id, {
          date: today,
          status: 'active'
        });

        // NOW generate a NEW Next challenge for tomorrow
        const excludeActorIds = [nextChallenge.startActorId, nextChallenge.endActorId];
        const actors = await gameLogicService.generateDailyActors('medium', excludeActorIds);

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
          console.log(`Backfilled new Next challenge: ${newNextChallenge.startActorName} -> ${newNextChallenge.endActorName}`);
        }
      } else {
        // Fallback: If no "next" challenge exists at all, generate fresh active AND fresh next
        console.log("No next challenge found. Generating entirely fresh pipeline.");

        // 1. Generate Active
        const activeActors = await gameLogicService.generateDailyActors('medium', []);
        if (activeActors) {
          await storage.createDailyChallenge({
            date: today,
            status: 'active',
            startActorId: activeActors.actor1.id,
            startActorName: activeActors.actor1.name,
            startActorProfilePath: activeActors.actor1.profile_path,
            endActorId: activeActors.actor2.id,
            endActorName: activeActors.actor2.name,
            endActorProfilePath: activeActors.actor2.profile_path,
            hintsUsed: 0,
          });
        }

        // 2. Generate Next
        const exclude = activeActors ? [activeActors.actor1.id, activeActors.actor2.id] : [];
        const nextActors = await gameLogicService.generateDailyActors('medium', exclude);
        if (nextActors) {
          await storage.createDailyChallenge({
            date: tomorrow,
            status: 'next',
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

      res.json({ message: "Challenge reset and pipeline updated successfully" });
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

        const actors = await gameLogicService.generateDailyActors('medium', excludeIds);

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
      const actors = await gameLogicService.generateDailyActors('medium');
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

  // Admin endpoint to view registered users
  app.get("/api/admin/users", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const adminUser = await validateAdminSession(token);
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
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
    console.log(`🧪 Session test - Session exists: ${!!req.session}`);
    console.log(`🧪 Session exists:`, !!req.session);
    console.log(`🧪 Session contents:`, req.session);

    if (!req.session) {
      return res.json({ error: 'No session found' });
    }

    // Set a test value
    (req.session as any).testValue = 'test-' + Date.now();
    req.session.save((err: any) => {
      if (err) {
        console.error(`🧪 Session save error:`, err);
        return res.json({ error: 'Session save failed', details: err.message });
      }
      console.log(`🧪 Session saved successfully`);
      res.json({
        session: req.session,
        testValue: (req.session as any).testValue,
        success: true
      });
    });
  });

  // Session retrieve endpoint to test persistence
  app.get("/api/debug/session-retrieve", (req, res) => {
    console.log(`🧪 Session retrieve - Session exists: ${!!req.session}`);
    console.log(`🧪 Session exists:`, !!req.session);
    console.log(`🧪 Session contents:`, req.session);

    res.json({
      session: req.session,
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

      const challenge = await storage.getDailyChallengeById(parseResult.data.challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
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

        if (challenge.difficulty === 'easy') {
          statUpdates.easyCompletions = (currentStats.easyCompletions || 0) + 1;
        } else if (challenge.difficulty === 'medium') {
          statUpdates.mediumCompletions = (currentStats.mediumCompletions || 0) + 1;
        } else if (challenge.difficulty === 'hard') {
          statUpdates.hardCompletions = (currentStats.hardCompletions || 0) + 1;
        }

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

  // Get user completion status for a given day (for difficulty badges)
  app.get("/api/user/daily-completions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const dateParam = req.query.date as string | undefined;

      if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return res.status(400).json({ message: "Date must be in YYYY-MM-DD format" });
      }

      const date = dateParam || getESTDateString();
      const challenges = await storage.getDailyChallenges(date);
      const difficultyOrder: Record<string, number> = {
        easy: 0,
        medium: 1,
        hard: 2,
      };

      const sortedChallenges = [...challenges].sort((a, b) => {
        const aRank = difficultyOrder[a.difficulty] ?? Number.MAX_SAFE_INTEGER;
        const bRank = difficultyOrder[b.difficulty] ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      });

      const completions = await Promise.all(
        sortedChallenges.map(async challenge => {
          const completion = await storage.getUserChallengeCompletion(userId, challenge.id);
          return {
            challengeId: challenge.id,
            difficulty: challenge.difficulty,
            completed: !!completion,
            moves: completion?.moves ?? null,
          };
        })
      );

      res.json({
        date,
        completions,
      });
    } catch (error) {
      console.error("Error getting user daily completions:", error);
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

  // ===== Movie Lists Routes =====

  // GET /api/user/lists - Get all user's lists with entries
  app.get("/api/user/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const lists = await storage.getMovieListsByUser(userId);

      // Fetch entries for each list
      const listsWithEntries = await Promise.all(
        lists.map(async (list) => {
          const entries = await storage.getMovieListEntries(list.id);
          return { ...list, entries };
        })
      );

      res.json(listsWithEntries);
    } catch (error) {
      console.error("Error getting user lists:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/user/lists - Create new list
  app.post("/api/user/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const parseResult = insertMovieListSchema.safeParse({ ...req.body, userId });

      if (!parseResult.success) {
        return res.status(400).json({ errors: parseResult.error.errors });
      }

      const list = await storage.createMovieList(parseResult.data);
      res.status(201).json(list);
    } catch (error) {
      console.error("Error creating list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/user/lists/:id - Get a specific list with entries
  app.get("/api/user/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const list = await storage.getMovieListWithEntries(req.params.id);

      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }

      // Verify ownership
      if (list.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(list);
    } catch (error) {
      console.error("Error getting list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/user/lists/:id - Update list (rename, reorder)
  app.patch("/api/user/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existingList = await storage.getMovieList(req.params.id);

      if (!existingList) {
        return res.status(404).json({ message: "List not found" });
      }

      if (existingList.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { name, sortOrder } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;

      const list = await storage.updateMovieList(req.params.id, updates);
      res.json(list);
    } catch (error) {
      console.error("Error updating list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/user/lists/:id - Delete list
  app.delete("/api/user/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existingList = await storage.getMovieList(req.params.id);

      if (!existingList) {
        return res.status(404).json({ message: "List not found" });
      }

      if (existingList.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteMovieList(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/user/lists/:id/movies - Add movie to list
  app.post("/api/user/lists/:id/movies", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existingList = await storage.getMovieList(req.params.id);

      if (!existingList) {
        return res.status(404).json({ message: "List not found" });
      }

      if (existingList.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const parseResult = insertMovieListEntrySchema.safeParse({
        ...req.body,
        listId: req.params.id,
      });

      if (!parseResult.success) {
        return res.status(400).json({ errors: parseResult.error.errors });
      }

      const entry = await storage.addMovieToList(parseResult.data);
      res.status(201).json(entry);
    } catch (error: any) {
      // Handle unique constraint violation (movie already in list)
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Movie already in list" });
      }
      console.error("Error adding movie to list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/user/lists/:id/movies/:movieId - Remove movie from list
  app.delete("/api/user/lists/:id/movies/:movieId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existingList = await storage.getMovieList(req.params.id);

      if (!existingList) {
        return res.status(404).json({ message: "List not found" });
      }

      if (existingList.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.removeMovieFromList(req.params.id, parseInt(req.params.movieId));
      res.status(204).send();
    } catch (error) {
      console.error("Error removing movie from list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Username Management Routes =====

  // GET /api/user/check-username - Check username availability
  app.get("/api/user/check-username", isAuthenticated, async (req, res) => {
    try {
      const username = req.query.username as string;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Validate format: 3-20 chars, alphanumeric + underscore
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          available: false,
          message: "Username must be 3-20 characters, alphanumeric and underscores only",
        });
      }

      const existing = await storage.getUserByUsernameCaseInsensitive(username);
      const userId = (req.session as any).userId;

      // Available if no one has it, or the current user already has it
      const available = !existing || existing.id === userId;
      res.json({ available, message: available ? "Username is available" : "Username is taken" });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/user/username - Update username
  app.patch("/api/user/username", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          message: "Username must be 3-20 characters, alphanumeric and underscores only",
        });
      }

      // Check case-insensitive availability
      const existing = await storage.getUserByUsernameCaseInsensitive(username);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Username is already taken" });
      }

      const user = await storage.updateUser(userId, {
        username,
        usernameAutoGenerated: false,
      } as any);

      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Username is already taken" });
      }
      console.error("Error updating username:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Friends Routes =====

  // GET /api/friends/search - Search users by username
  app.get("/api/friends/search", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const q = req.query.q as string;

      if (!q || q.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      const results = await storage.searchUsersByUsername(q, userId);
      res.json(results);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/friends/request - Send friend request
  app.post("/api/friends/request", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { userId: targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ message: "userId is required" });
      }

      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      // Verify target user exists
      const targetUser = await storage.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const friendship = await storage.createFriendship(userId, targetUserId);
      res.status(201).json(friendship);
    } catch (error: any) {
      if (error.message === "Already friends") {
        return res.status(409).json({ message: "Already friends" });
      }
      if (error.message === "Friend request already sent") {
        return res.status(409).json({ message: "Friend request already sent" });
      }
      console.error("Error creating friend request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/friends/requests - Get incoming pending requests
  app.get("/api/friends/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const requests = await storage.getPendingRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error getting friend requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/friends/requests/sent - Get outgoing pending requests
  app.get("/api/friends/requests/sent", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const requests = await storage.getSentRequestsForUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error getting sent friend requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/friends/requests/count - Get pending request count
  app.get("/api/friends/requests/count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const requests = await storage.getPendingRequestsForUser(userId);
      res.json({ count: requests.length });
    } catch (error) {
      console.error("Error getting friend request count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/friends/requests/:id/accept - Accept a friend request
  app.post("/api/friends/requests/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const friendship = await storage.getFriendshipById(req.params.id);

      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      // IDOR check: only the addressee can accept
      if (friendship.addresseeId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ message: "Request is not pending" });
      }

      const updated = await storage.updateFriendshipStatus(req.params.id, "accepted");
      res.json(updated);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/friends/requests/:id/decline - Decline a friend request
  app.post("/api/friends/requests/:id/decline", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const friendship = await storage.getFriendshipById(req.params.id);

      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      // IDOR check: only the addressee can decline
      if (friendship.addresseeId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ message: "Request is not pending" });
      }

      await storage.deleteFriendship(req.params.id);
      res.json({ message: "Friend request declined" });
    } catch (error) {
      console.error("Error declining friend request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/friends - Get friends with today's status
  app.get("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const today = getESTDateString();
      const friends = await storage.getFriendsWithTodayStatus(userId, today);
      res.json(friends);
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/friends/leaderboard - Get friends leaderboard
  app.get("/api/friends/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const sort = (req.query.sort as string) || "streak";

      if (!["streak", "efficiency", "trophies"].includes(sort)) {
        return res.status(400).json({ message: "Invalid sort parameter. Use streak, efficiency, or trophies." });
      }

      const leaderboard = await storage.getFriendsLeaderboard(userId, sort);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error getting friends leaderboard:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/friends/:friendshipId - Remove a friend
  app.delete("/api/friends/:friendshipId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const friendship = await storage.getFriendshipById(req.params.friendshipId);

      if (!friendship) {
        return res.status(404).json({ message: "Friendship not found" });
      }

      // IDOR check: verify the session user is part of this friendship
      if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteFriendship(req.params.friendshipId);
      res.json({ message: "Friend removed" });
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/movie/:id/watch-providers - Get streaming providers for a movie
  app.get("/api/movie/:id/watch-providers", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      const region = (req.query.region as string) || 'US';

      const providers = await tmdbService.getWatchProviders(movieId, region);
      res.json(providers || { link: null, flatrate: [], rent: [], buy: [] });
    } catch (error) {
      console.error("Error getting watch providers:", error);
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

      // Archive any stale 'active' challenges (from yesterday or earlier)
      const activeChallenges = await storage.getAllChallengesByStatus('active');
      for (const challenge of activeChallenges) {
        if (challenge.date !== today) {
          await storage.updateChallengeStatus(challenge.id, 'archived');
          console.log(`Archived old challenge: ${challenge.date} (${challenge.difficulty})`);
        }
      }

      // Ensure today has a full Easy/Medium/Hard set (backfills partial sets too).
      const ensuredChallenges = await ensureDailyChallenges(today);
      console.log(`Daily challenges for ${today}: ${ensuredChallenges.map((challenge) => challenge.difficulty).join(", ")}`);

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
