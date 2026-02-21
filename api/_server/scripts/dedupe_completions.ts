/**
 * Remove duplicate user_challenge_completions rows, keeping the earliest per (user_id, challenge_id).
 * Run once before applying the unique constraint.
 *
 * Usage: npx tsx api/_server/scripts/dedupe_completions.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Find all duplicates
  const dupes = await sql`
    SELECT user_id, challenge_id, count(*) as cnt
    FROM user_challenge_completions
    GROUP BY user_id, challenge_id
    HAVING count(*) > 1
  `;

  console.log(`Found ${dupes.length} duplicate (user, challenge) pairs`);

  for (const row of dupes) {
    console.log(`  user=${row.user_id} challenge=${row.challenge_id} count=${row.cnt}`);

    // Keep the earliest completion (by completed_at), delete the rest
    const deleted = await sql`
      DELETE FROM user_challenge_completions
      WHERE id IN (
        SELECT id FROM user_challenge_completions
        WHERE user_id = ${row.user_id} AND challenge_id = ${row.challenge_id}
        ORDER BY completed_at ASC
        OFFSET 1
      )
    `;
    console.log(`    deleted ${(deleted as any).count ?? 'extra'} duplicate(s)`);
  }

  console.log("Done. Re-run drizzle-kit push to apply the unique constraint.");
}

main().catch(console.error);
