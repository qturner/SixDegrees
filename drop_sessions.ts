import { getPool } from "./api/_server/db";

async function main() {
    console.log("Dropping sessions table...");
    const pool = getPool();

    try {
        await pool.query('DROP TABLE IF EXISTS sessions');
        console.log("Use DROP TABLE IF EXISTS sessions; success.");
    } catch (error) {
        console.error("Error dropping table:", error);
        process.exit(1);
    } finally {
        console.log("Done.");
        process.exit(0);
    }
}

main();
