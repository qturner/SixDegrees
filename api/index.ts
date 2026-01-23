// @ts-nocheck
let cachedApp: any = null;

import { initServer } from './server/index.js';

export default async (req: any, res: any) => {
    // Global error handlers to capture startup crashes in serverless
    // Moved inside the handler to ensure they are set when the function is invoked
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    process.on('uncaughtException', (err) => {
        console.error('[API] UNCAUGHT EXCEPTION:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('[API] UNHANDLED REJECTION:', reason);
    });

    console.log(`[API] ${req.method} ${req.url} - starting`);

    try {
        if (!cachedApp) {
            console.log("[API] Calling initServer...");
            const { app } = await initServer();
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
