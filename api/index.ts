// @ts-nocheck
let cachedApp: any = null;

export default async (req: any, res: any) => {
    console.log(`[API] ${req.method} ${req.url} - v2 debug`);

    // Direct response for health check to bypass server initialization
    if (req.url === '/api/health' || req.url === '/api/health/') {
        const tmdbConfigured = !!(process.env.TMDB_API_KEY || process.env.API_KEY);
        const dbConfigured = !!process.env.DATABASE_URL;
        return res.status(200).json({
            status: tmdbConfigured && dbConfigured ? "ok" : "degraded",
            message: "Direct health check",
            tmdb: tmdbConfigured ? "configured" : "missing_key",
            database: dbConfigured ? "configured" : "missing_url",
            timestamp: new Date().toISOString(),
            vercel: !!process.env.VERCEL,
            version: "v6-async-stats"
        });
    }

    // Super-fast-path removed to ensure generation logic in routes.ts is used
    // This prevents serving stale 'Brad Pitt' fallback data

    console.log(`[API] ${req.method} ${req.url} - v3 production`);

    try {
        const { initServer } = await import('./_server/index.js');
        if (!cachedApp) {
            console.log("[API] Calling initServer from _server...");
            const initResult = await initServer();
            console.log("[API] initServer completed successfully");
            const { app } = initResult;
            cachedApp = app;
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error("[API] INITIALIZATION FAILURE:", error);
        return res.status(500).json({
            error: "INITIALIZATION_FAILURE",
            message: error?.message,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            phase: "init"
        });
    }
};
