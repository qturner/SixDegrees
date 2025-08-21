import express, { type Request, Response, NextFunction } from "express";
import cron from "node-cron";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { gameLogicService } from "./services/gameLogic.ts";
import { storage } from "./storage.ts";
import { checkDatabaseHealth } from "./db";

const app = express();
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

(async () => {
  // Check database health but don't block startup
  let dbHealthy = false;
  try {
    log('Checking database connection...');
    dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      log('✅ Database connection verified successfully');
    } else {
      log('⚠️ Database connection failed, but starting server anyway');
    }
  } catch (error: any) {
    log(`⚠️ Database health check error: ${error?.message || 'Unknown error'}, but starting server anyway`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Always setup daily challenge reset at midnight EST after server is running
    // The cron job will handle database connectivity issues internally
    setupDailyChallengeReset(port);
    
    if (!dbHealthy) {
      log('⚠️ Database initially unhealthy, but cron job will retry connections as needed');
    }
  });
})();

function setupDailyChallengeReset(port: number) {
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
          storage = (await import('./storage')).storage;
          
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
          const gameLogicService = (await import('./services/gameLogic')).gameLogicService;
          const actors = await gameLogicService.generateDailyActors();
          
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
