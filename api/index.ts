// @ts-nocheck
let cachedApp: any = null;

export default async (req: any, res: any) => {
    console.log(`[API] ${req.method} ${req.url} - v2 debug`);

    // Direct response for health check to bypass server initialization
    if (req.url === '/api/health' || req.url === '/api/health/') {
        return res.status(200).json({
            status: "debug",
            message: "Barebones API handler reached",
            timestamp: new Date().toISOString(),
            vercel: !!process.env.VERCEL
        });
    }

    try {
        const { initServer } = await import('./server/index.js');
        if (!cachedApp) {
            console.log("[API] Calling initServer in debug mode...");
            const { app } = await initServer();
            cachedApp = app;
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error("[API] DEBUG BOOT FAILURE:", error);
        return res.status(500).json({
            error: "DEBUG_BOOT_FAILURE",
            message: error?.message,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            phase: "debug_init"
        });
    }
};
