import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tmdbService } from "./services/tmdb";
import { gameLogicService } from "./services/gameLogic";
import { insertDailyChallengeSchema, insertGameAttemptSchema, gameConnectionSchema } from "@shared/schema";
import { createAdminUser, authenticateAdmin, createAdminSession, validateAdminSession, deleteAdminSession } from "./adminAuth";
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

// Prevent race conditions in challenge creation
let challengeCreationPromise: Promise<any> | null = null;
let lastChallengeDate: string | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
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
        
        // Generate new challenge
        const actors = await gameLogicService.generateDailyActors();
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }

        const newChallenge = await storage.createDailyChallenge({
          date: today,
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
        const actors = await gameLogicService.generateDailyActors();
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }

        challenge = await storage.createDailyChallenge({
          date: today,
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
      let challenge = await storage.getDailyChallenge(today);

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
              const existingChallenge = await storage.getDailyChallenge(today);
              if (existingChallenge) {
                console.log(`Challenge was created by another request: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
                return existingChallenge;
              }

              // Generate new challenge for today
              const actors = await gameLogicService.generateDailyActors();
              if (!actors) {
                throw new Error("Unable to generate daily challenge");
              }

              const newChallenge = await storage.createDailyChallenge({
                date: today,
                startActorId: actors.actor1.id,
                startActorName: actors.actor1.name,
                startActorProfilePath: actors.actor1.profile_path,
                endActorId: actors.actor2.id,
                endActorName: actors.actor2.name,
                endActorProfilePath: actors.actor2.profile_path,
                hintsUsed: 0,
              });
              console.log(`Created new challenge: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
              return newChallenge;
            } finally {
              // Clear the promise so future requests can create new challenges if needed
              challengeCreationPromise = null;
            }
          })();
        }
        
        challenge = await challengeCreationPromise;
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
      const actors = await gameLogicService.generateDailyActors();
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate challenge" });
      }

      const today = new Date().toISOString().split('T')[0];
      const challenge = await storage.createDailyChallenge({
        date: today,
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
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
        const today = new Date().toISOString().split('T')[0];
        await storage.createDailyChallenge({
          date: today,
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
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

      const today = new Date().toISOString().split('T')[0];
      
      // Delete existing challenge for today
      await storage.deleteDailyChallenge(today);
      
      // Create new challenge with selected actors
      const challenge = await storage.createDailyChallenge({
        date: today,
        startActorId,
        startActorName,
        endActorId,
        endActorName,
      });
      
      console.log(`Admin set custom challenge for ${today}: ${startActorName} to ${endActorName}`);
      res.json({ message: "Custom challenge set successfully", challenge });
    } catch (error) {
      console.error("Admin set challenge error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
