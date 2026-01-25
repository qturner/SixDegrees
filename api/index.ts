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

    if (req.url.includes('/api/daily-challenge')) {
        console.log("[API] Daily challenge super-fast-path hit");
        const fallbackChallenge = {
            id: "fallback-id",
            date: new Date().toISOString().split('T')[0],
            status: "active",
            startActorId: 287,
            startActorName: "Brad Pitt",
            startActorProfilePath: "/ccB9v899mS87Vp9zY7pXpxH97S.jpg",
            endActorId: 11701,
            endActorName: "Angelina Jolie",
            endActorProfilePath: "/tj6S4S6Leydf9S8p5LpS35zR6X.jpg",
            hintsUsed: 0
        };

        try {
            // Use a separate, very fast import for neon
            const { neon } = await import('@neondatabase/serverless');
            const sql = neon(process.env.DATABASE_URL!);

            // Set a very short timeout for the query
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date()).replace(/\//g, '-');

            console.log(`[API] Querying DB for ${today}...`);
            const results = await Promise.race([
                sql`SELECT * FROM daily_challenges WHERE date = ${today} AND (status = 'active' OR status = 'active ') LIMIT 1`,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
            ]) as any[];

            if (results && results.length > 0) {
                const c = results[0];
                // Map snake_case to camelCase
                const challenge = {
                    id: c.id,
                    date: c.date,
                    status: c.status,
                    startActorId: c.start_actor_id,
                    startActorName: c.start_actor_name,
                    startActorProfilePath: c.start_actor_profile_path,
                    endActorId: c.end_actor_id,
                    endActorName: c.end_actor_name,
                    endActorProfilePath: c.end_actor_profile_path,
                    hintsUsed: c.hints_used
                };
                console.log("[API] Super-fast-path: Success");
                return res.status(200).json(challenge);
            }
            console.log("[API] Super-fast-path: No challenge found, using fallback");
            return res.status(200).json(fallbackChallenge);
        } catch (error) {
            console.error("[API] Super-fast-path error:", error);
            return res.status(200).json(fallbackChallenge);
        }
    }

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
