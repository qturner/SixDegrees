import { db } from "./api/_server/db.ts";
import { dailyChallenges } from "./shared/schema.ts";
import { desc } from "drizzle-orm";

async function dumpAll() {
    console.log("--- DUMPING ALL CHALLENGES ---");
    try {
        const all = await db.select().from(dailyChallenges).orderBy(desc(dailyChallenges.date));
        all.forEach(c => {
            console.log(`[${c.id}] Status: ${c.status} | Date: ${c.date} | Created: ${c.createdAt} | ${c.startActorName} -> ${c.endActorName}`);
        });
    } catch (e) {
        console.error(e);
    }
}

dumpAll();
