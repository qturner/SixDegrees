import * as dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import cron from "node-cron";
import { registerRoutes } from "./routes.js";
import { log } from "./vite.js";
import { gameLogicService } from "./services/gameLogic.js";
import { storage } from "./storage.js";
import { checkDatabaseHealth } from "./db.js";

export const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

let isInitialized = false;
let initPromise: Promise<{ app: any; server: any; dbHealthy: boolean }> | null = null;

export const initServer = async () => {
  if (isInitialized) return initPromise!;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Check database health but don't block startup
    let dbHealthy = false;
    // Run health check in background so we don't timeout the lambda
    (async () => {
      try {
        log('Checking database connection in background...');
        dbHealthy = await checkDatabaseHealth();
        if (dbHealthy) {
          log('✅ Database connection verified successfully');
        } else {
          log('⚠️ Database connection failed');
        }
      } catch (error: any) {
        log(`⚠️ Database health check error: ${error?.message || 'Unknown error'}`);
      }
    })();

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`Error ${status}: ${message}`);
      if (err.stack) console.error(err.stack);

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
    } else if (!process.env.VERCEL) {
      const { serveStatic } = await import("./vite.js");
      serveStatic(app);
    }

    isInitialized = true;
    return { app, server, dbHealthy };
  })();

  return initPromise;
};

// Start the server if this file is run directly (not as a module)
// or if we are not on Vercel (where it acts as a serverless function)
if (!process.env.VERCEL && (process.env.NODE_ENV !== "production" || import.meta.url === `file://${process.argv[1]}`)) {
  (async () => {
    const { server, dbHealthy } = await initServer();
    const port = parseInt(process.env.PORT || '5001', 10);
    server.listen({
      port,
      host: "0.0.0.0",
    }, async () => {
      log(`serving on port ${port}`);
      setupDailyChallengeReset(port);
    });
  })();
}

export default app;

function setupDailyChallengeReset(port: number) {
  if (process.env.VERCEL) return; // Don't run cron on Vercel

  // Schedule for midnight EST/EDT - dual-challenge system
  cron.schedule('0 0 * * *', async () => {
    try {
      log('Daily challenge reset triggered - transitioning next to active and generating new next');

      // Get today's and tomorrow's dates in EST/EDT timezone
      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();

      // Step 1: Try to promote next challenge to current with retry logic
      let storage;
      let retryCount = 0;
      const maxRetries = 5;
      let promotionSuccessful = false;

      while (retryCount < maxRetries && !promotionSuccessful) {
        try {
          storage = (await import('./storage.js')).storage;

          // Look for "next" status challenge for today
          const nextChallenge = await storage.getChallengeByStatus('next');

          if (nextChallenge) {
            log(`Found next challenge to promote: ${nextChallenge.startActorName} to ${nextChallenge.endActorName}`);

            // Archive old current challenge if it exists
            const currentChallenge = await storage.getChallengeByStatus('active');
            if (currentChallenge) {
              await storage.deleteDailyChallenge(currentChallenge.date);
              log(`Archived old current challenge: ${currentChallenge.startActorName} to ${currentChallenge.endActorName}`);
            }

            // Delete the next challenge and recreate as active
            await storage.deleteDailyChallenge(nextChallenge.date);

            const newCurrentChallenge = await storage.createDailyChallenge({
              date: today,
              status: 'active',
              startActorId: nextChallenge.startActorId,
              startActorName: nextChallenge.startActorName,
              endActorId: nextChallenge.endActorId,
              endActorName: nextChallenge.endActorName,
            });

            log(`Successfully promoted next challenge to current: ${newCurrentChallenge.startActorName} to ${newCurrentChallenge.endActorName}`);
            promotionSuccessful = true;
            break;
          } else {
            log('No next challenge found, will generate new challenge via API');
            break;
          }
        } catch (dbError) {
          retryCount++;
          log(`Database connection attempt ${retryCount}/${maxRetries} failed: ${dbError}`);

          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            log('All database retry attempts failed, falling back to API generation');
          }
        }
      }

      // If promotion failed, generate new challenge via API
      if (!promotionSuccessful) {
        try {
          const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, forceNew: true })
          });

          if (response.ok) {
            const newChallenge = await response.json();
            log(`Generated new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
          }
        } catch (apiError) {
          log(`Error generating challenge via API: ${apiError}`);
        }
      }

      // Step 2: Generate new Next Daily Challenge (24 hours in advance)
      if (storage) {
        try {
          const gameLogicService = (await import('./services/gameLogic.js')).gameLogicService;

          // Get current active challenge (which becomes yesterday after promotion) to exclude those actors
          const previousChallenge = await storage.getChallengeByStatus('active');
          const excludeActorIds: number[] = [];

          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            log(`Excluding actors from previous challenge: ${previousChallenge.startActorName} (${previousChallenge.startActorId}) and ${previousChallenge.endActorName} (${previousChallenge.endActorId})`);
          }

          const actors = await gameLogicService.generateDailyActors(excludeActorIds);

          if (actors) {
            const newNextChallenge = await storage.createDailyChallenge({
              date: tomorrow,
              status: "next",
              startActorId: actors.actor1.id,
              startActorName: actors.actor1.name,
              endActorId: actors.actor2.id,
              endActorName: actors.actor2.name,
            });

            log(`Generated new Next Daily Challenge for ${tomorrow}: ${newNextChallenge.startActorName} to ${newNextChallenge.endActorName}`);
          } else {
            log(`Failed to generate actors for Next Daily Challenge`);
          }
        } catch (nextError) {
          log(`Error generating Next Daily Challenge: ${nextError}`);
        }
      }

    } catch (error) {
      console.error('Error during dual challenge reset:', error);
    }
  }, {
    timezone: "America/New_York" // Automatically handles EST/EDT
  });

  log('Dual challenge reset scheduler initialized - resets at midnight EST/EDT');
}

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

function getTomorrowDateString(): string {
  // Get tomorrow's date in EST/EDT timezone
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getESTDateString(date);
}
