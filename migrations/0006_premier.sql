-- Premier challenges table
CREATE TABLE IF NOT EXISTS "premier_challenges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_date" text NOT NULL,
  "difficulty" text NOT NULL CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
  "movies" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "premier_challenges_date_difficulty_key" UNIQUE ("challenge_date", "difficulty")
);

CREATE INDEX IF NOT EXISTS "idx_premier_challenges_date" ON "premier_challenges" ("challenge_date");

-- Premier completions table
CREATE TABLE IF NOT EXISTS "premier_completions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "challenge_id" varchar NOT NULL REFERENCES "premier_challenges"("id"),
  "movies_sorted" integer NOT NULL,
  "reels" integer NOT NULL,
  "result" text NOT NULL CHECK ("result" IN ('won', 'failed')),
  "completed_at" timestamp DEFAULT now(),
  CONSTRAINT "premier_completions_user_challenge_unique" UNIQUE ("user_id", "challenge_id")
);

CREATE INDEX IF NOT EXISTS "idx_premier_completions_user" ON "premier_completions" ("user_id");

-- Add premier_attempts column to user_stats
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "premier_attempts" integer DEFAULT 0;
