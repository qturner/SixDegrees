/**
 * Backfill trophy counts from existing user_challenge_completions.
 * For each completion, computes the trophy tier from (moves, challenge.estimated_moves, challenge.difficulty)
 * and aggregates into user_stats trophy columns.
 *
 * Usage: npx tsx api/_server/scripts/backfill_trophies.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function getDefaultPar(difficulty: string): number {
  if (difficulty === "easy") return 2;
  if (difficulty === "hard") return 6;
  return 4;
}

function computeTrophyTier(moves: number, par: number): string {
  if (moves === 1) return "walkOfFame";
  const relative = moves - par;
  if (relative <= -2) return "oscar";
  if (relative === -1) return "goldenGlobe";
  if (relative === 0) return "emmy";
  if (relative === 1) return "sag";
  return "popcorn";
}

async function main() {
  // Fetch all completions joined with their challenge data
  const completions = await sql`
    SELECT
      ucc.user_id,
      ucc.moves,
      dc.estimated_moves,
      dc.difficulty
    FROM user_challenge_completions ucc
    JOIN daily_challenges dc ON dc.id = ucc.challenge_id
  `;

  console.log(`Processing ${completions.length} completions...`);

  // Aggregate trophy counts per user
  const userTrophies: Record<string, Record<string, number>> = {};

  for (const row of completions) {
    const userId = row.user_id;
    const moves = row.moves as number;
    const par = (row.estimated_moves as number | null) ?? getDefaultPar(row.difficulty as string);
    const tier = computeTrophyTier(moves, par);

    if (!userTrophies[userId]) {
      userTrophies[userId] = {
        walkOfFame: 0, oscar: 0, goldenGlobe: 0,
        emmy: 0, sag: 0, popcorn: 0,
      };
    }
    userTrophies[userId][tier]++;
  }

  const userIds = Object.keys(userTrophies);
  console.log(`Updating trophy counts for ${userIds.length} users...`);

  for (const userId of userIds) {
    const t = userTrophies[userId];
    console.log(`  ${userId}: WoF=${t.walkOfFame} O=${t.oscar} GG=${t.goldenGlobe} E=${t.emmy} S=${t.sag} P=${t.popcorn}`);

    await sql`
      UPDATE user_stats SET
        trophy_walk_of_fame = ${t.walkOfFame},
        trophy_oscar = ${t.oscar},
        trophy_golden_globe = ${t.goldenGlobe},
        trophy_emmy = ${t.emmy},
        trophy_sag = ${t.sag},
        trophy_popcorn = ${t.popcorn},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  }

  console.log("Done. Trophy counts backfilled from existing completions.");
}

main().catch(console.error);
