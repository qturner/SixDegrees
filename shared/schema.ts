import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const dailyChallenges = pgTable("daily_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  status: text("status").notNull().default("active"), // "active", "upcoming", "archived"
  startActorId: integer("start_actor_id").notNull(),
  startActorName: text("start_actor_name").notNull(),
  startActorProfilePath: text("start_actor_profile_path"),
  endActorId: integer("end_actor_id").notNull(),
  endActorName: text("end_actor_name").notNull(),
  endActorProfilePath: text("end_actor_profile_path"),
  hintsUsed: integer("hints_used").default(0),
  startActorHint: text("start_actor_hint"), // JSON string of hint movies
  endActorHint: text("end_actor_hint"),     // JSON string of hint movies
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameAttempts = pgTable("game_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull(),
  moves: integer("moves").notNull(),
  completed: boolean("completed").default(false),
  connections: text("connections").notNull(), // JSON string of connections
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertGameAttemptSchema = createInsertSchema(gameAttempts).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type InsertGameAttempt = z.infer<typeof insertGameAttemptSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type GameAttempt = typeof gameAttempts.$inferSelect;

// API response types
export const actorSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable(),
  known_for_department: z.string().optional(),
});

export const movieSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().optional(),
  poster_path: z.string().nullable(),
  overview: z.string().optional(),
  popularity: z.number().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
});

export const connectionSchema = z.object({
  actorId: z.number(),
  actorName: z.string(),
  actorProfilePath: z.string().nullable().optional(),
  movieId: z.number(),
  movieTitle: z.string(),
  moviePosterPath: z.string().nullable().optional(),
});

export const gameConnectionSchema = z.object({
  connections: z.array(connectionSchema),
  startActorId: z.number(),
  endActorId: z.number(),
});

export const validationResultSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
  completed: z.boolean().optional(),
  moves: z.number().optional(),
});

export type Actor = z.infer<typeof actorSchema>;
export type Movie = z.infer<typeof movieSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type GameConnection = z.infer<typeof gameConnectionSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;

// Admin Users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, lastLoginAt: true });
export type InsertAdminUserType = z.infer<typeof insertAdminUserSchema>;

// Admin Sessions table
export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => adminUsers.id).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = typeof adminSessions.$inferInsert;

// Contact form submissions table
export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).default("new"), // new, read, responded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true
});

// Visitor analytics table for tracking referrals and traffic sources
export const visitorAnalytics = pgTable("visitor_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // Browser fingerprint/session
  referrer: text("referrer"), // Full referrer URL
  referrerDomain: varchar("referrer_domain", { length: 255 }), // e.g., 'google.com'
  referrerType: varchar("referrer_type", { length: 50 }), // 'search', 'social', 'direct', 'referral'
  utmSource: varchar("utm_source", { length: 100 }), // UTM parameters
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  utmContent: varchar("utm_content", { length: 100 }),
  utmTerm: varchar("utm_term", { length: 100 }),
  searchQuery: text("search_query"), // If available from search engines
  userAgent: text("user_agent"), // Browser/device info
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4/IPv6 (hashed for privacy)
  country: varchar("country", { length: 2 }), // Country code
  entryPage: varchar("entry_page", { length: 500 }), // First page visited
  exitPage: varchar("exit_page", { length: 500 }), // Last page visited
  pageviews: integer("pageviews").default(1), // Total pages viewed
  sessionDuration: integer("session_duration"), // Time spent in seconds
  bounced: boolean("bounced").default(false), // Single page visit
  converted: boolean("converted").default(false), // Played the game
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type VisitorAnalytics = typeof visitorAnalytics.$inferSelect;
export const insertVisitorAnalyticsSchema = createInsertSchema(visitorAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertVisitorAnalytics = z.infer<typeof insertVisitorAnalyticsSchema>;

// Session storage table for Google OAuth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(), // connect-pg-simple expects JSON/JSONB
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for email/password + Google authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password"), // Nullable for Google auth users
  googleId: varchar("google_id").unique(), // For Google auth
  appleId: varchar("apple_id").unique(), // For Apple auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  picture: text("picture"), // Google profile picture
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User challenge completions table
export const userChallengeCompletions = pgTable("user_challenge_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  challengeId: varchar("challenge_id").references(() => dailyChallenges.id).notNull(),
  moves: integer("moves").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  connections: text("connections").notNull(), // JSON string of connections used
}, (table) => [
  index("idx_user_completions").on(table.userId),
  index("idx_challenge_completions").on(table.challengeId),
]);

// User stats tracking table
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalCompletions: integer("total_completions").default(0),
  totalMoves: integer("total_moves").default(0),
  currentStreak: integer("current_streak").default(0),
  maxStreak: integer("max_streak").default(0),
  lastPlayedDate: text("last_played_date"), // YYYY-MM-DD to track daily streaks
  completionsAt1Move: integer("completions_at_1_move").default(0),
  completionsAt2Moves: integer("completions_at_2_moves").default(0),
  completionsAt3Moves: integer("completions_at_3_moves").default(0),
  completionsAt4Moves: integer("completions_at_4_moves").default(0),
  completionsAt5Moves: integer("completions_at_5_moves").default(0),
  completionsAt6Moves: integer("completions_at_6_moves").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  completions: many(userChallengeCompletions),
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const userChallengeCompletionsRelations = relations(userChallengeCompletions, ({ one }) => ({
  user: one(users, {
    fields: [userChallengeCompletions.userId],
    references: [users.id],
  }),
  challenge: one(dailyChallenges, {
    fields: [userChallengeCompletions.challengeId],
    references: [dailyChallenges.id],
  }),
}));

export const dailyChallengesRelations = relations(dailyChallenges, ({ many }) => ({
  completions: many(userChallengeCompletions),
}));

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = typeof userStats.$inferInsert;
export type UserChallengeCompletion = typeof userChallengeCompletions.$inferSelect;
export type InsertUserChallengeCompletion = typeof userChallengeCompletions.$inferInsert;

export const insertUserChallengeCompletionSchema = createInsertSchema(userChallengeCompletions).omit({
  id: true,
  userId: true,
  completedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = insertUserSchema.extend({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserChallengeCompletionType = z.infer<typeof insertUserChallengeCompletionSchema>;
export type InsertUserType = z.infer<typeof insertUserSchema>;
export type LoginType = z.infer<typeof loginSchema>;
export type RegisterType = z.infer<typeof registerSchema>;
export type InsertUserStatsType = z.infer<typeof insertUserStatsSchema>;
