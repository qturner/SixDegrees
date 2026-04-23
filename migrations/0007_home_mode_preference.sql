ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "home_preferred_mode" text DEFAULT 'six_degrees';
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "home_preference_last_interaction_at" timestamp;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "home_preference_six_degrees_score" integer DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "home_preference_cast_call_score" integer DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "home_preference_premier_score" integer DEFAULT 0;
