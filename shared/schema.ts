import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  movieId: z.number(),
  movieTitle: z.string(),
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
