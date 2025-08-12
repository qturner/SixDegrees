import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tmdbService } from "./services/tmdb";
import { gameLogicService } from "./services/gameLogic";
import { insertDailyChallengeSchema, insertGameAttemptSchema, gameConnectionSchema } from "@shared/schema";
import cron from "node-cron";

// Prevent race conditions in challenge creation
let challengeCreationPromise: Promise<any> | null = null;
let lastChallengeDate: string | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Get today's daily challenge
  app.get("/api/daily-challenge", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
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

      const today = new Date().toISOString().split('T')[0];
      const challenge = await storage.getDailyChallenge(today);
      
      console.log(`Hint request for ${today}, challenge found: ${challenge ? 'YES' : 'NO'}`);
      if (challenge) {
        console.log(`Challenge: ${challenge.startActorName} to ${challenge.endActorName} (hints: ${challenge.hintsUsed || 0})`);
      }
      
      if (!challenge) {
        return res.status(404).json({ message: "No challenge found for today" });
      }

      if ((challenge.hintsUsed || 0) >= 2) {
        return res.status(400).json({ message: "All hints have been used for today" });
      }

      const actorId = actorType === 'start' ? challenge.startActorId : challenge.endActorId;
      const actorName = actorType === 'start' ? challenge.startActorName : challenge.endActorName;
      
      const movies = await tmdbService.getActorHintMovies(actorId, 5);
      
      // Store the hint content and update hints used count
      const hintContent = JSON.stringify(movies);
      const updatedChallenge = await storage.updateDailyChallengeHints(
        challenge.id, 
        (challenge.hintsUsed || 0) + 1,
        actorType === 'start' ? hintContent : undefined,
        actorType === 'end' ? hintContent : undefined
      );
      
      res.json({
        actorName,
        movies,
        hintsRemaining: 2 - (updatedChallenge.hintsUsed || 0),
      });
    } catch (error) {
      console.error("Error getting hint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate complete game chain
  app.post("/api/validate-game", async (req, res) => {
    try {
      const parseResult = gameConnectionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request format",
          errors: parseResult.error.errors 
        });
      }

      const { connections, startActorId, endActorId } = parseResult.data;

      const result = await gameLogicService.validateCompleteChain({
        startActorId,
        endActorId,
        connections,
      });

      // If the game is completed, save the attempt
      if (result.completed) {
        const today = new Date().toISOString().split('T')[0];
        const challenge = await storage.getDailyChallenge(today);
        
        if (challenge) {
          await storage.createGameAttempt({
            challengeId: challenge.id,
            moves: connections.length,
            completed: true,
            connections: JSON.stringify(connections),
          });
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error validating game:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}
