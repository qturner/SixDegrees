import { gameLogicService } from "./api/_server/services/gameLogic.ts";
import { tmdbService } from "./api/_server/services/tmdb.ts";

async function testGeneration() {
    console.log("--- Testing TMDB Generation ---");
    try {
        for (let i = 0; i < 3; i++) {
            console.log(`\nAttempt ${i + 1}:`);
            const result = await gameLogicService.generateDailyActors([]);
            if (result) {
                console.log(`Generated: ${result.actor1.name} -> ${result.actor2.name}`);
            } else {
                console.log("Failed to generate actors.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testGeneration();
