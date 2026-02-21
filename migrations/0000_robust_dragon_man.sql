CREATE TABLE "admin_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(50) DEFAULT 'new',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"start_actor_id" integer NOT NULL,
	"start_actor_name" text NOT NULL,
	"start_actor_profile_path" text,
	"end_actor_id" integer NOT NULL,
	"end_actor_name" text NOT NULL,
	"end_actor_profile_path" text,
	"estimated_moves" integer,
	"hints_used" integer DEFAULT 0,
	"start_actor_hint" text,
	"end_actor_hint" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_challenges_date_difficulty_key" UNIQUE("date","difficulty")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" varchar NOT NULL,
	"addressee_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "friendships_requester_addressee_unique" UNIQUE("requester_id","addressee_id")
);
--> statement-breakpoint
CREATE TABLE "game_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" varchar NOT NULL,
	"moves" integer NOT NULL,
	"completed" boolean DEFAULT false,
	"connections" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "movie_list_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" varchar NOT NULL,
	"tmdb_movie_id" integer NOT NULL,
	"movie_title" text NOT NULL,
	"movie_poster_path" text,
	"movie_release_date" text,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "movie_list_entries_list_movie_unique" UNIQUE("list_id","tmdb_movie_id")
);
--> statement-breakpoint
CREATE TABLE "movie_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_challenge_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" varchar NOT NULL,
	"moves" integer NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"connections" text NOT NULL,
	CONSTRAINT "user_challenge_completions_user_challenge_unique" UNIQUE("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_completions" integer DEFAULT 0,
	"total_moves" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"max_streak" integer DEFAULT 0,
	"last_played_date" text,
	"easy_completions" integer DEFAULT 0,
	"medium_completions" integer DEFAULT 0,
	"hard_completions" integer DEFAULT 0,
	"completions_at_1_move" integer DEFAULT 0,
	"completions_at_2_moves" integer DEFAULT 0,
	"completions_at_3_moves" integer DEFAULT 0,
	"completions_at_4_moves" integer DEFAULT 0,
	"completions_at_5_moves" integer DEFAULT 0,
	"completions_at_6_moves" integer DEFAULT 0,
	"trophy_walk_of_fame" integer DEFAULT 0,
	"trophy_oscar" integer DEFAULT 0,
	"trophy_golden_globe" integer DEFAULT 0,
	"trophy_emmy" integer DEFAULT 0,
	"trophy_sag" integer DEFAULT 0,
	"trophy_popcorn" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"username" varchar NOT NULL,
	"password" varchar,
	"google_id" varchar,
	"apple_id" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"picture" text,
	"username_auto_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_apple_id_unique" UNIQUE("apple_id")
);
--> statement-breakpoint
CREATE TABLE "visitor_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"referrer" text,
	"referrer_domain" varchar(255),
	"referrer_type" varchar(50),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"utm_content" varchar(100),
	"utm_term" varchar(100),
	"search_query" text,
	"user_agent" text,
	"ip_address" varchar(45),
	"country" varchar(2),
	"entry_page" varchar(500),
	"exit_page" varchar(500),
	"pageviews" integer DEFAULT 1,
	"session_duration" integer,
	"bounced" boolean DEFAULT false,
	"converted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_list_entries" ADD CONSTRAINT "movie_list_entries_list_id_movie_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."movie_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_lists" ADD CONSTRAINT "movie_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_completions" ADD CONSTRAINT "user_challenge_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_completions" ADD CONSTRAINT "user_challenge_completions_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_friendships_requester" ON "friendships" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_friendships_addressee" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_user_completions" ON "user_challenge_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_challenge_completions" ON "user_challenge_completions" USING btree ("challenge_id");