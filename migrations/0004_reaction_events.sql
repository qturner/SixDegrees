-- Reaction inbox events migration
-- Adds append-only event history for incoming emoji reactions.

CREATE TABLE IF NOT EXISTS "reaction_events" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reactor_user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "challenge_date" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
  "emoji" TEXT NOT NULL CHECK ("emoji" IN ('🔥', '👏', '💀', '😂', '🤯', '👀')),
  "reaction_id" VARCHAR,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "read_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_reaction_events_target_created"
  ON "reaction_events" USING btree ("target_user_id", "created_at", "id");

CREATE INDEX IF NOT EXISTS "idx_reaction_events_target_unread"
  ON "reaction_events" USING btree ("target_user_id", "read_at")
  WHERE "read_at" IS NULL;
