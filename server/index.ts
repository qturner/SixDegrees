import express, { type Request, Response, NextFunction } from "express";
import cron from "node-cron";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { gameLogicService } from "./services/gameLogic.ts";
import { storage } from "./storage.ts";

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
    
    // Setup daily challenge reset at midnight EST after server is running
    setupDailyChallengeReset(port);
  });
})();

function setupDailyChallengeReset(port: number) {
  // Schedule for midnight EST/EDT - dual-challenge system
  cron.schedule('0 0 * * *', async () => {
    try {
      log('Daily challenge reset triggered - transitioning tomorrow to today and generating new tomorrow');
      
      // Get today's and tomorrow's dates in EST/EDT timezone
      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();
      
      // Step 1: Check if tomorrow's challenge exists and promote it to today
      try {
        const tomorrowResponse = await fetch(`http://localhost:${port}/api/admin/tomorrow-challenge`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (tomorrowResponse.ok) {
          const tomorrowChallenge = await tomorrowResponse.json();
          
          // Archive old today's challenge and promote tomorrow's challenge
          const todayResponse = await fetch(`http://localhost:${port}/api/daily-challenge`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (todayResponse.ok) {
            const todayChallenge = await todayResponse.json();
            // Archive current challenge by deleting it
            await fetch(`http://localhost:${port}/api/daily-challenge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date: todayChallenge.date, forceNew: true, action: 'archive' })
            });
          }
          
          // Promote tomorrow's challenge to today with updated date and status
          const newTodayChallenge = {
            ...tomorrowChallenge,
            date: today,
            status: 'active'
          };
          
          // Delete old tomorrow challenge
          await fetch(`http://localhost:${port}/api/admin/reset-tomorrow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          // Create today's challenge from former tomorrow
          await fetch(`http://localhost:${port}/api/daily-challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTodayChallenge, forceNew: true })
          });
          
          log(`Promoted tomorrow's challenge to today: ${newTodayChallenge.startActorName} to ${newTodayChallenge.endActorName}`);
        } else {
          // No tomorrow challenge exists, generate today's normally
          const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, forceNew: true })
          });
          
          if (response.ok) {
            const newChallenge = await response.json();
            log(`Generated new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
          }
        }
      } catch (transitionError) {
        log(`Error transitioning challenges: ${transitionError}`);
        // Fallback to normal generation
        const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, forceNew: true })
        });
      }
      
      // Step 2: Generate new tomorrow's challenge
      try {
        const newTomorrowResponse = await fetch(`http://localhost:${port}/api/admin/reset-tomorrow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (newTomorrowResponse.ok) {
          const newTomorrowChallenge = await newTomorrowResponse.json();
          log(`Generated new challenge for ${tomorrow}: ${newTomorrowChallenge.challenge.startActorName} to ${newTomorrowChallenge.challenge.endActorName}`);
        } else {
          log(`Failed to generate tomorrow's challenge: ${newTomorrowResponse.status}`);
        }
      } catch (tomorrowError) {
        log(`Error generating tomorrow's challenge: ${tomorrowError}`);
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
