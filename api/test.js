export default async function handler(req, res) {
    try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL || "");

        let dbError = null;
        let challenges = [];

        try {
            challenges = await sql`SELECT * FROM daily_challenges ORDER BY date DESC LIMIT 20`;
        } catch (e) {
            dbError = e.message;
        }

        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            env: {
                hasTmdbKey: !!(process.env.TMDB_API_KEY || process.env.API_KEY),
                hasDbUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV,
                vercel: !!process.env.VERCEL
            },
            db: {
                error: dbError,
                count: challenges.length,
                challenges: challenges.map(c => ({
                    id: c.id,
                    date: c.date,
                    status: c.status,
                    start: c.start_actor_name,
                    end: c.end_actor_name,
                    createdAt: c.created_at
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message,
            stack: error.stack
        });
    }
}
