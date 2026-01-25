import { db } from "./api/_server/db.js";
import { dailyChallenges } from "./shared/schema.js";
import { eq } from "drizzle-orm";

async function fix() {
    console.log("Fixing thumbnails...");
    try {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()).replace(/\//g, '-');

        console.log(`Updating challenge for ${today}`);

        const res = await db.update(dailyChallenges)
            .set({
                startActorProfilePath: '/cckcYc2v0yh1tc9QjRelptcOBko.jpg',
                endActorProfilePath: '/nXA9vMvskmIDB5NqHCkTQPmemep.jpg'
            })
            .where(eq(dailyChallenges.date, today))
            .returning();

        console.log("Updated:", res);
        process.exit(0);
    } catch (error) {
        console.error("Failed:", error);
        process.exit(1);
    }
}

fix();
