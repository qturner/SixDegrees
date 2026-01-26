import { storage } from "./api/_server/storage.ts";

// Check daily challenges
async function checkChallenges() {
    try {
        console.log("\n--- Checking Daily Challenges ---");
        const challenges = await storage.getAllChallengesByStatus('active');
        console.log(`Found ${challenges.length} ACTIVE challenges:`);
        challenges.forEach(c => console.log(`- [${c.id}] ${c.date} | ${c.startActorName} -> ${c.endActorName}`));

        const nextChallenges = await storage.getAllChallengesByStatus('next');
        console.log(`Found ${nextChallenges.length} NEXT challenges:`);
        nextChallenges.forEach(c => console.log(`- [${c.id}] ${c.date} | ${c.startActorName} -> ${c.endActorName}`));
    } catch (e) {
        console.error("Error checking challenges:", e);
    }
}

checkChallenges().then(() => process.exit(0));
