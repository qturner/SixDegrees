// @ts-nocheck
let cachedApp: any = null;

// Global error handlers to capture startup crashes in serverless
process.on('uncaughtException', (err) => {
    console.error('[API] UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[API] UNHANDLED REJECTION:', reason);
});

export default async (req: any, res: any) => {
    console.log(`[API] ${req.method} ${req.url} - starting`);

    try {
        if (!cachedApp) {
            console.log("[API] Initializing server module...");
            // Use dynamic import to catch errors during module loading
            // Removing extensions to help Vercel resolution of TS files
            const serverModule = await import('../server/index').catch(err => {
                console.error("[API] Failed to import server module:", err);
                throw new Error(`Server module import failed: ${err.message}`);
            });

            if (!serverModule.initServer) {
                console.error("[API] initServer not found in server module");
                throw new Error("initServer function missing");
            }

            console.log("[API] Calling initServer...");
            const { app } = await serverModule.initServer();
            cachedApp = app;
            console.log("[API] Server initialized successfully");
        }

        return cachedApp(req, res);
    } catch (error: any) {
        console.error("[API] CRITICAL FAILURE:", error);

        // Return detailed error in JSON for debugging
        return res.status(500).json({
            error: "FUNCTION_INVOCATION_FAILED",
            message: error?.message || "Unknown error during initialization",
            stack: error?.stack,
            phase: cachedApp ? "execution" : "initialization",
            timestamp: new Date().toISOString()
        });
    }
};
