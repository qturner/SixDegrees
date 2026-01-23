
import { storage } from "./api/server/storage";
import { tmdbService } from "./api/server/services/tmdb";

async function diagnose() {
    console.log("--- Production Diagnostics ---");

    // 1. Check Date Formats
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const today = formatter.format(date).replace(/\//g, '-');
    console.log(`Current EST Date: ${today}`);

    // 2. Check Database
    try {
        console.log("Checking database access...");
        const challenge = await storage.getDailyChallenge(today);
        if (challenge) {
            console.log(`✅ Found challenge for today: ${challenge.startActorName} to ${challenge.endActorName}`);
        } else {
            console.log(`❌ No challenge found for today (${today})`);

            const allActive = await storage.getAllChallengesByStatus('active');
            console.log(`Found ${allActive.length} active challenges in total.`);
            allActive.forEach(c => {
                console.log(`  - ${c.date}: ${c.startActorName} to ${c.endActorName}`);
            });
        }
    } catch (err: any) {
        console.error("❌ Database Error:", err.message);
    }

    // 3. Check TMDB
    try {
        console.log("Checking TMDB configuration...");
        if (!process.env.TMDB_API_KEY && !process.env.API_KEY) {
            console.log("❌ TMDB API Key is MISSING in environment variables");
        } else {
            console.log("✅ TMDB API Key is present");
            const actors = await tmdbService.getPopularActors();
            console.log(`✅ TMDB connection ok, found ${actors.length} popular actors`);
        }
    } catch (err: any) {
        console.error("❌ TMDB Error:", err.message);
    }

    process.exit(0);
}

diagnose();
