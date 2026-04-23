/**
 * Backfill per-mode streak columns and CC/Premier trophy columns from completion history.
 * Uses direct pg connection (not Neon serverless) to avoid WebSocket timeouts.
 *
 * Usage:
 *   cd ~/projects/six-degrees-backend
 *   set -a && source .env.local && set +a
 *   npx tsx api/_server/scripts/backfill_mode_streaks.ts
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function computeStreak(dates: string[]): { current: number; max: number; lastDate: string | null } {
  if (dates.length === 0) return { current: 0, max: 0, lastDate: null };

  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

  const now = new Date();
  const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const todayStr = estNow.toISOString().slice(0, 10);
  const yesterday = new Date(estNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Compute max streak
  let maxStreak = 1;
  let currentRun = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentRun++;
      maxStreak = Math.max(maxStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Compute current streak
  let currentStreak = 0;
  if (unique[0] === todayStr || unique[0] === yesterdayStr) {
    currentStreak = 1;
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1]);
      const curr = new Date(unique[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, max: maxStreak, lastDate: unique[0] };
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Fetching all users with stats...");
    const { rows: allStats } = await client.query('SELECT id, user_id FROM user_stats');
    console.log(`Found ${allStats.length} users with stats rows.`);

    for (const stats of allStats) {
      const userId = stats.user_id;
      console.log(`\nProcessing user ${userId}...`);

      // --- Six Degrees ---
      const { rows: sdRows } = await client.query(
        `SELECT DISTINCT dc.date FROM user_challenge_completions ucc
         JOIN daily_challenges dc ON ucc.challenge_id = dc.id
         WHERE ucc.user_id = $1`, [userId]
      );
      const sdDates = sdRows.map((r: any) => r.date);
      const sdStreak = computeStreak(sdDates);
      console.log(`  SD: ${sdDates.length} completions, current=${sdStreak.current}, max=${sdStreak.max}`);

      // --- Cast Call ---
      const { rows: ccRows } = await client.query(
        `SELECT ccc.challenge_date as date, cccomp.stars FROM cast_call_completions cccomp
         JOIN cast_call_challenges ccc ON cccomp.challenge_id = ccc.id
         WHERE cccomp.user_id = $1`, [userId]
      );
      const ccDates = ccRows.map((r: any) => r.date);
      const ccStreak = computeStreak(ccDates);

      // CC difficulty
      const { rows: ccDiffRows } = await client.query(
        `SELECT ccc.difficulty FROM cast_call_completions cccomp
         JOIN cast_call_challenges ccc ON cccomp.challenge_id = ccc.id
         WHERE cccomp.user_id = $1`, [userId]
      );
      let ccEasy = 0, ccMedium = 0, ccHard = 0;
      for (const r of ccDiffRows) {
        if (r.difficulty === "easy") ccEasy++;
        else if (r.difficulty === "medium") ccMedium++;
        else if (r.difficulty === "hard") ccHard++;
      }

      // CC trophies
      let directorsCut = 0, boxOfficeHit = 0, ccMatinee = 0, bMovie = 0, straightToDvd = 0, walkedOut = 0;
      for (const r of ccRows) {
        switch (r.stars) {
          case 5: directorsCut++; break;
          case 4: boxOfficeHit++; break;
          case 3: ccMatinee++; break;
          case 2: bMovie++; break;
          case 1: straightToDvd++; break;
          case 0: walkedOut++; break;
        }
      }
      console.log(`  CC: ${ccDates.length} completions, current=${ccStreak.current}, max=${ccStreak.max}`);

      // --- Premier ---
      const { rows: premRows } = await client.query(
        `SELECT pc.challenge_date as date, pcomp.reels, pcomp.result FROM premier_completions pcomp
         JOIN premier_challenges pc ON pcomp.challenge_id = pc.id
         WHERE pcomp.user_id = $1`, [userId]
      );
      const premDates = premRows.map((r: any) => r.date);
      const premStreak = computeStreak(premDates);

      // Premier difficulty
      const { rows: premDiffRows } = await client.query(
        `SELECT pc.difficulty FROM premier_completions pcomp
         JOIN premier_challenges pc ON pcomp.challenge_id = pc.id
         WHERE pcomp.user_id = $1`, [userId]
      );
      let premEasy = 0, premMedium = 0, premHard = 0;
      for (const r of premDiffRows) {
        if (r.difficulty === "easy") premEasy++;
        else if (r.difficulty === "medium") premMedium++;
        else if (r.difficulty === "hard") premHard++;
      }

      // Premier trophies
      let filmHistorian = 0, archivist = 0, cinephile = 0, casualViewer = 0, timeTraveler = 0, lostInTime = 0;
      for (const r of premRows) {
        if (r.reels === 0) filmHistorian++;
        else if (r.reels === 1) archivist++;
        else if (r.reels === 2) cinephile++;
        else if (r.reels === 3) casualViewer++;
        else if (r.reels === 4) timeTraveler++;
        else lostInTime++;
      }
      console.log(`  Premier: ${premDates.length} completions, current=${premStreak.current}, max=${premStreak.max}`);

      // --- Composite streak ---
      const allDates = [...sdDates, ...ccDates, ...premDates];
      const compositeStreak = computeStreak(allDates);
      console.log(`  Composite: current=${compositeStreak.current}, max=${compositeStreak.max}`);

      // --- Super streak ---
      const sdDateSet = new Set(sdDates);
      const ccDateSet = new Set(ccDates);
      const premDateSet = new Set(premDates);
      const superDates = [...sdDateSet].filter(d => ccDateSet.has(d) && premDateSet.has(d));
      const superStreak = computeStreak(superDates);
      console.log(`  Super streak: ${superDates.length} days, current=${superStreak.current}, max=${superStreak.max}`);

      // --- Write to DB ---
      await client.query(`
        UPDATE user_stats SET
          sd_streak_current = $1, sd_streak_max = $2, sd_last_played_date = $3,
          cast_call_streak_current = $4, cast_call_streak_max = $5, cast_call_last_played_date = $6,
          cast_call_easy_completions = $7, cast_call_medium_completions = $8, cast_call_hard_completions = $9,
          trophy_directors_cut = $10, trophy_box_office_hit = $11, trophy_cc_matinee = $12,
          trophy_b_movie = $13, trophy_straight_to_dvd = $14, trophy_walked_out = $15,
          premier_streak_current = $16, premier_streak_max = $17, premier_last_played_date = $18,
          premier_easy_completions = $19, premier_medium_completions = $20, premier_hard_completions = $21,
          trophy_film_historian = $22, trophy_archivist = $23, trophy_cinephile = $24,
          trophy_casual_viewer = $25, trophy_time_traveler = $26, trophy_lost_in_time = $27,
          current_streak = $28, max_streak = $29, last_played_date = $30,
          super_streak_current = $31, super_streak_max = $32, super_streak_last_date = $33
        WHERE id = $34
      `, [
        sdStreak.current, sdStreak.max, sdStreak.lastDate,
        ccStreak.current, ccStreak.max, ccStreak.lastDate,
        ccEasy, ccMedium, ccHard,
        directorsCut, boxOfficeHit, ccMatinee, bMovie, straightToDvd, walkedOut,
        premStreak.current, premStreak.max, premStreak.lastDate,
        premEasy, premMedium, premHard,
        filmHistorian, archivist, cinephile, casualViewer, timeTraveler, lostInTime,
        compositeStreak.current, compositeStreak.max, compositeStreak.lastDate,
        superStreak.current, superStreak.max, superStreak.lastDate,
        stats.id,
      ]);

      console.log(`  Updated.`);
    }

    console.log("\nBackfill complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
