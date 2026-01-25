import { storage } from "./api/_server/storage.js";

async function check() {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');

    console.log(`Checking database for ${today}...`);

    try {
        const challenge = await storage.getDailyChallenge(today);
        if (challenge) {
            console.log("Challenge found for today:", challenge.startActorName, "to", challenge.endActorName, "(Status:", challenge.status, ")");
        } else {
            console.log("No challenge found for today.");
        }

        const allActive = await storage.getAllChallengesByStatus('active');
        console.log("All active challenges:", allActive.map(c => `${c.date}: ${c.startActorName} to ${c.endActorName}`).join(', '));

        process.exit(0);
    } catch (error) {
        console.error("Failed to check database:", error);
        process.exit(1);
    }
}

check();
