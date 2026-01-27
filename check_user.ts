import { db } from "./api/_server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Checking for user qturner17@Gmail.com...");
    try {
        // Note: Emails from Google are usually normalized, but we'll check exact and lowercase
        const user = await db.select().from(users).where(eq(users.email, 'qturner17@Gmail.com'));

        if (user.length > 0) {
            console.log("User FOUND:", user[0]);
        } else {
            console.log("User NOT FOUND.");
            // transform to lowercase to check
            const userLower = await db.select().from(users).where(eq(users.email, 'qturner17@gmail.com'));
            if (userLower.length > 0) {
                console.log("User FOUND (lowercase):", userLower[0]);
            } else {
                console.log("User NOT FOUND (lowercase match failed too).");
            }
        }
    } catch (error) {
        console.error("Error checking user:", error);
    } finally {
        process.exit(0);
    }
}

main();
