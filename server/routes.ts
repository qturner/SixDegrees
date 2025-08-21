import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tmdbService } from "./services/tmdb";
import { gameLogicService } from "./services/gameLogic";
import { withRetry } from "./db";
import { insertDailyChallengeSchema, insertGameAttemptSchema, gameConnectionSchema, insertContactSubmissionSchema, insertVisitorAnalyticsSchema } from "@shared/schema";
import { createAdminUser, authenticateAdmin, createAdminSession, validateAdminSession, deleteAdminSession } from "./adminAuth";
import { emailService } from "./services/email";
import { registerTestEmailRoutes } from "./routes/testEmail";
import cron from "node-cron";

function getESTDateString(): string {
  // Get current date in EST/EDT timezone using proper Intl formatting
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  
  return formatter.format(now); // Returns YYYY-MM-DD format
}

function getTomorrowDateString(): string {
  // Get tomorrow's date in EST/EDT timezone
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
  
  return formatter.format(tomorrow); // Returns YYYY-MM-DD format
}

// Prevent race conditions in challenge creation
let challengeCreationPromise: Promise<any> | null = null;
let lastChallengeDate: string | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Test email service on startup
  setTimeout(async () => {
    const { emailService } = await import("./services/email");
    await emailService.testConnection();
  }, 2000);

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
        // Get current active challenge to exclude those actors
        let excludeActorIds: number[] = [];
        try {
          const currentChallenge = await storage.getChallengeByStatus('active');
          if (currentChallenge && currentChallenge.date !== today) {
            excludeActorIds.push(currentChallenge.startActorId, currentChallenge.endActorId);
            console.log(`Excluding actors from previous challenge: ${currentChallenge.startActorName} and ${currentChallenge.endActorName}`);
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
          startActorProfilePath: actors.actor1.profile_path,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: actors.actor2.profile_path,
          hintsUsed: 0,
        });
        
        console.log(`Force-created new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
        return res.json(newChallenge);
      }
      
      // Regular generation logic (same as GET)
      let challenge = await storage.getDailyChallenge(today);
      if (!challenge) {
        // Get current active challenge to exclude those actors
        let excludeActorIds: number[] = [];
        try {
          const currentChallenge = await storage.getChallengeByStatus('active');
          if (currentChallenge && currentChallenge.date !== today) {
            excludeActorIds.push(currentChallenge.startActorId, currentChallenge.endActorId);
            console.log(`Excluding actors from previous challenge: ${currentChallenge.startActorName} and ${currentChallenge.endActorName}`);
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
          startActorProfilePath: actors.actor1.profile_path,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: actors.actor2.profile_path,
          hintsUsed: 0,
        });
      }
      
      res.json(challenge);
    } catch (error) {
      console.error("Error in POST daily challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get today's daily challenge
  app.get("/api/daily-challenge", async (req, res) => {
    try {
      const today = getESTDateString(); // Use EST date, not UTC
      
      // Try to get challenge with longer timeout for better resilience
      let challenge;
      try {
        challenge = await withRetry(() => storage.getDailyChallenge(today), 5); // Increased retries for this critical endpoint
      } catch (dbError) {
        console.error("Database error when fetching challenge:", dbError);
        // Return a fallback error that doesn't block the UI completely
        return res.status(503).json({ 
          message: "Database temporarily unavailable. Please refresh in a moment.",
          retry: true 
        });
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
                const yesterdayDate = new Date();
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                const yesterday = yesterdayDate.toISOString().split('T')[0];
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
                startActorProfilePath: actors.actor1.profile_path,
                endActorId: actors.actor2.id,
                endActorName: actors.actor2.name,
                endActorProfilePath: actors.actor2.profile_path,
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
        } catch (creationError) {
          console.error("Error creating new challenge:", creationError);
          return res.status(503).json({ 
            message: "Unable to generate daily challenge due to database issues. Please refresh in a moment.",
            retry: true 
          });
        }
        
        if (!challenge) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }
      } else {
        console.log(`Found existing challenge: ${challenge.startActorName} to ${challenge.endActorName} (hints: ${challenge.hintsUsed || 0})`);
      }

      res.json(challenge);
    } catch (error) {
      console.error("Error getting daily challenge:", error);
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
      res.json(actors);
    } catch (error) {
      console.error("Error searching actors:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search for movies
  app.get("/api/search/movies", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const movies = await tmdbService.searchMovies(query);
      res.json(movies);
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
      const today = new Date().toISOString().split('T')[0];
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
      const today = new Date().toISOString().split('T')[0];
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
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate complete game chain
  app.post("/api/validate-game", async (req, res) => {
    let validationResult = null;
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
      try {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);
        
        if (challenge) {
          await storage.createGameAttempt({
            challengeId: challenge.id,
            moves: connections.length,
            completed: validationResult.completed || false,
            connections: JSON.stringify(connections),
          });
        }
      } catch (dbError) {
        console.error("Error saving game attempt:", dbError);
        // Don't let database save errors affect the validation response
      }

      res.json(validationResult);
    } catch (error) {
      console.error("Error validating game:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics endpoint for anonymous game statistics
  app.get("/api/analytics", async (req, res) => {
    try {
      // Get today's challenge to use its ID for analytics
      const today = getESTDateString();
      const challenge = await storage.getDailyChallenge(today);
      
      if (!challenge) {
        return res.status(404).json({ message: "No challenge found for today" });
      }

      const stats = await storage.getChallengeAnalytics(challenge.id);
      res.json(stats);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Failed to get analytics" });
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

  // Generate new daily challenge (manual trigger)
  app.post("/api/generate-challenge", async (req, res) => {
    try {
      // Get current active challenge to exclude those actors from new generation
      let excludeActorIds: number[] = [];
      try {
        const currentChallenge = await storage.getChallengeByStatus('active');
        if (currentChallenge) {
          excludeActorIds.push(currentChallenge.startActorId, currentChallenge.endActorId);
          console.log(`Excluding actors from current challenge: ${currentChallenge.startActorName} and ${currentChallenge.endActorName}`);
        }
      } catch (exclusionError) {
        console.log("Could not check for actors to exclude, proceeding with normal generation");
      }
      
      const actors = await gameLogicService.generateDailyActors(excludeActorIds);
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate challenge" });
      }

      const today = new Date().toISOString().split('T')[0];
      const challenge = await storage.createDailyChallenge({
        date: today,
        status: "active",
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        startActorProfilePath: actors.actor1.profile_path,
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: actors.actor2.profile_path,
      });

      res.json(challenge);
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Schedule daily challenge generation at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Generating new daily challenge...');
      const actors = await gameLogicService.generateDailyActors();
      if (actors) {
        const today = getESTDateString();
        await storage.createDailyChallenge({
          date: today,
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          startActorProfilePath: actors.actor1.profile_path,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: actors.actor2.profile_path,
        });
        console.log('Daily challenge generated successfully');
      }
    } catch (error) {
      console.error('Error generating daily challenge:', error);
    }
  });

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

  // Admin challenge reset
  app.delete("/api/admin/reset-challenge", requireAdminAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await storage.deleteDailyChallenge(today);
      console.log(`Admin reset challenge for ${today}`);
      res.json({ message: "Daily challenge reset successfully" });
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
        console.log(`No next challenge found for ${tomorrow}, current status: ${challenge?.status || 'not found'}`);
        return res.status(404).json({ message: "No challenge scheduled for tomorrow" });
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
        startActorProfilePath: actors.actor1.profile_path,
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: actors.actor2.profile_path,
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

  // Register test email routes
  registerTestEmailRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
