-- Reactions migration
-- Adds friend activity emoji reactions with one-reaction-per-user-per-pill uniqueness.

CREATE TABLE IF NOT EXISTS "reactions" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "reactor_user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "challenge_date" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
  "emoji" TEXT NOT NULL CHECK ("emoji" IN ('🔥', '👏', '💀', '😂', '🤯', '👀')),
  "created_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "reactions_unique_per_user" UNIQUE ("reactor_user_id", "target_user_id", "challenge_date", "difficulty")
);

CREATE INDEX IF NOT EXISTS "idx_reactions_target_date"
  ON "reactions" USING btree ("target_user_id", "challenge_date");
