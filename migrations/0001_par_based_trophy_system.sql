-- Par-Based Trophy System Migration
-- Adds estimatedMoves to daily_challenges, trophy columns to user_stats,
-- and unique constraint on user_challenge_completions
--
-- Safe to run on both fresh DBs (where 0000 already created these) and
-- existing DBs (where the old schema didn't have them).

-- 1. Add estimated_moves column to daily_challenges (nullable for old challenges)
ALTER TABLE "daily_challenges" ADD COLUMN IF NOT EXISTS "estimated_moves" INTEGER;

-- 2. Add unique constraint on (user_id, challenge_id) to prevent double-award
-- Use DO block to handle case where constraint already exists (e.g. from fresh 0000)
DO $$
BEGIN
  ALTER TABLE "user_challenge_completions"
    ADD CONSTRAINT "user_challenge_completions_user_challenge_unique"
    UNIQUE ("user_id", "challenge_id");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add trophy count columns to user_stats
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_walk_of_fame" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_oscar" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_golden_globe" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_emmy" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_sag" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "trophy_popcorn" INTEGER DEFAULT 0;
