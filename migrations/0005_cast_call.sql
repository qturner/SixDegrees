-- Cast Call challenges table
CREATE TABLE IF NOT EXISTS "cast_call_challenges" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_date" text NOT NULL,
  "difficulty" text NOT NULL,
  "movie_id" integer NOT NULL,
  "movie_title" text NOT NULL,
  "movie_year" integer NOT NULL,
  "movie_poster_path" text,
  "genre" text NOT NULL,
  "actors" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "cast_call_challenges_date_difficulty_key" UNIQUE ("challenge_date", "difficulty")
);

CREATE INDEX IF NOT EXISTS "idx_cast_call_challenges_date" ON "cast_call_challenges" ("challenge_date");

-- Cast Call completions table
CREATE TABLE IF NOT EXISTS "cast_call_completions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "challenge_id" varchar NOT NULL REFERENCES "cast_call_challenges"("id"),
  "actors_revealed" integer NOT NULL,
  "total_guesses" integer NOT NULL,
  "stars" integer NOT NULL,
  "correct" boolean NOT NULL,
  "completed_at" timestamp DEFAULT now(),
  CONSTRAINT "cast_call_completions_user_challenge_unique" UNIQUE ("user_id", "challenge_id")
);

CREATE INDEX IF NOT EXISTS "idx_cast_call_completions_user" ON "cast_call_completions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_cast_call_completions_challenge" ON "cast_call_completions" ("challenge_id");

-- Add cast_call_completions column to user_stats
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "cast_call_completions" integer DEFAULT 0;
