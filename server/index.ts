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
  // Run at midnight EST every day (0 0 * * * in EST timezone)
  // This translates to 5 AM UTC during EST (winter) or 4 AM UTC during EDT (summer)
  cron.schedule('0 5 * * *', async () => {
    try {
      // Check if we're in daylight saving time (EDT) and adjust
      const now = new Date();
      const january = new Date(now.getFullYear(), 0, 1);
      const july = new Date(now.getFullYear(), 6, 1);
      const isDST = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset()) !== now.getTimezoneOffset();
      
      // During DST (EDT), midnight EST is 4 AM UTC, otherwise 5 AM UTC
      const currentHour = now.getUTCHours();
      const expectedHour = isDST ? 4 : 5;
      
      if (currentHour !== expectedHour) {
        return; // Skip if not the right time for EST midnight
      }
      
      log('Daily challenge reset triggered - generating new challenge for today');
      
      // Get today's date in EST
      const today = getESTDateString();
      
      // Generate new daily challenge - use the routes API to ensure consistency
      const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, forceNew: true })
      });
      
      log(`New daily challenge generated for ${today}`);
    } catch (error) {
      console.error('Error during daily challenge reset:', error);
    }
  }, {
    timezone: "America/New_York" // EST/EDT timezone
  });

  // Also schedule for 4 AM UTC to handle DST transitions better
  cron.schedule('0 4 * * *', async () => {
    try {
      const now = new Date();
      const january = new Date(now.getFullYear(), 0, 1);
      const july = new Date(now.getFullYear(), 6, 1);
      const isDST = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset()) !== now.getTimezoneOffset();
      
      if (!isDST) {
        return; // Skip if not in DST
      }
      
      const currentHour = now.getUTCHours();
      if (currentHour !== 4) {
        return;
      }
      
      log('Daily challenge reset triggered (DST) - generating new challenge for today');
      
      const today = getESTDateString();
      // Generate new daily challenge - use the routes API to ensure consistency
      const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, forceNew: true })
      });
      
      log(`New daily challenge generated for ${today} (DST)`);
    } catch (error) {
      console.error('Error during DST daily challenge reset:', error);
    }
  });

  log('Daily challenge reset scheduler initialized - resets at midnight EST');
}

function getESTDateString(): string {
  // Get current date in EST timezone
  const now = new Date();
  const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  return estDate.getFullYear() + '-' + 
         String(estDate.getMonth() + 1).padStart(2, '0') + '-' + 
         String(estDate.getDate()).padStart(2, '0');
}
