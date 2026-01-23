// @ts-nocheck
import { initServer } from '../server/index.js';

let cachedApp: any = null;

export default async (req: any, res: any) => {
    try {
        if (!cachedApp) {
            console.log("Initializing server...");
            const { app } = await initServer();
            cachedApp = app;
            console.log("Server initialized successfully");
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error("CRITICAL: Server initialization failed", error);
        return res.status(500).json({
            message: "Internal Server Error during initialization",
            error: error?.message || "Unknown error",
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    }
};
