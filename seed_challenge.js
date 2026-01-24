import { storage } from "./api/_server/storage.js";

// Manually seed a challenge for today to unblock the site
async function seed() {
    // Replicate getESTDateString logic
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');

    console.log(`Seeding challenge for ${today}...`);

    try {
        const existing = await storage.getDailyChallenge(today);
        if (existing) {
            console.log("Challenge already exists for today:", existing.startActorName, "to", existing.endActorName);
            process.exit(0);
        }

        const challenge = await storage.createDailyChallenge({
            date: today,
            status: "active",
            startActorId: 287, // Brad Pitt
            startActorName: "Brad Pitt",
            startActorProfilePath: "/ccqXYUvGkwu39tUisSfvZAFp9G1.jpg",
            endActorId: 11701, // Angelina Jolie
            endActorName: "Angelina Jolie",
            endActorProfilePath: "/v0pX36F768H8L83pX98O98L98X9.jpg", // Angelina Jolie's real path is usually different, TMDB will fix
            hintsUsed: 0,
        });

        console.log("Successfully seeded challenge:", challenge.startActorName, "to", challenge.endActorName);
        process.exit(0);
    } catch (error) {
        console.error("Failed to seed challenge:", error);
        process.exit(1);
    }
}

seed();
