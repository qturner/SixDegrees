-- Pro Subscription Migration
-- Adds user_subscriptions and subscription_events tables,
-- and streak shield columns to user_stats.
--
-- Safe to run on both fresh DBs and existing DBs (idempotent).

-- 1. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id"),
  "status" TEXT NOT NULL DEFAULT 'active',
  "plan" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "original_transaction_id" TEXT NOT NULL,
  "latest_transaction_id" TEXT,
  "current_period_ends_at" TIMESTAMP,
  "trial_started_at" TIMESTAMP,
  "trial_ends_at" TIMESTAMP,
  "auto_renew_enabled" BOOLEAN DEFAULT TRUE,
  "app_account_token" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'Production',
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Unique constraints for user_subscriptions
DO $$
BEGIN
  ALTER TABLE "user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE ("user_id");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_original_transaction_id_unique" UNIQUE ("original_transaction_id");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create subscription_events table
CREATE TABLE IF NOT EXISTS "subscription_events" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_uuid" TEXT,
  "notification_type" TEXT NOT NULL,
  "subtype" TEXT,
  "original_transaction_id" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "processed_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE "subscription_events"
    ADD CONSTRAINT "subscription_events_notification_uuid_unique" UNIQUE ("notification_uuid");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add streak shield columns to user_stats
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "streak_shields_remaining" INTEGER DEFAULT 0;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "streak_shield_month" TEXT;
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "last_shield_used_date" TEXT;
