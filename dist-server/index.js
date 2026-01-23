var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  actorSchema: () => actorSchema,
  adminSessions: () => adminSessions,
  adminUsers: () => adminUsers,
  connectionSchema: () => connectionSchema,
  contactSubmissions: () => contactSubmissions,
  dailyChallenges: () => dailyChallenges,
  dailyChallengesRelations: () => dailyChallengesRelations,
  gameAttempts: () => gameAttempts,
  gameConnectionSchema: () => gameConnectionSchema,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertContactSubmissionSchema: () => insertContactSubmissionSchema,
  insertDailyChallengeSchema: () => insertDailyChallengeSchema,
  insertGameAttemptSchema: () => insertGameAttemptSchema,
  insertUserChallengeCompletionSchema: () => insertUserChallengeCompletionSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserStatsSchema: () => insertUserStatsSchema,
  insertVisitorAnalyticsSchema: () => insertVisitorAnalyticsSchema,
  loginSchema: () => loginSchema,
  movieSchema: () => movieSchema,
  registerSchema: () => registerSchema,
  sessions: () => sessions,
  userChallengeCompletions: () => userChallengeCompletions,
  userChallengeCompletionsRelations: () => userChallengeCompletionsRelations,
  userStats: () => userStats,
  userStatsRelations: () => userStatsRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  validationResultSchema: () => validationResultSchema,
  visitorAnalytics: () => visitorAnalytics
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
var dailyChallenges, gameAttempts, insertDailyChallengeSchema, insertGameAttemptSchema, actorSchema, movieSchema, connectionSchema, gameConnectionSchema, validationResultSchema, adminUsers, insertAdminUserSchema, adminSessions, contactSubmissions, insertContactSubmissionSchema, visitorAnalytics, insertVisitorAnalyticsSchema, sessions, users, userChallengeCompletions, userStats, usersRelations, userStatsRelations, userChallengeCompletionsRelations, dailyChallengesRelations, insertUserChallengeCompletionSchema, insertUserSchema, loginSchema, registerSchema, insertUserStatsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    dailyChallenges = pgTable("daily_challenges", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      date: text("date").notNull().unique(),
      // YYYY-MM-DD format
      status: text("status").notNull().default("active"),
      // "active", "upcoming", "archived"
      startActorId: integer("start_actor_id").notNull(),
      startActorName: text("start_actor_name").notNull(),
      startActorProfilePath: text("start_actor_profile_path"),
      endActorId: integer("end_actor_id").notNull(),
      endActorName: text("end_actor_name").notNull(),
      endActorProfilePath: text("end_actor_profile_path"),
      hintsUsed: integer("hints_used").default(0),
      startActorHint: text("start_actor_hint"),
      // JSON string of hint movies
      endActorHint: text("end_actor_hint"),
      // JSON string of hint movies
      createdAt: timestamp("created_at").defaultNow()
    });
    gameAttempts = pgTable("game_attempts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      challengeId: varchar("challenge_id").notNull(),
      moves: integer("moves").notNull(),
      completed: boolean("completed").default(false),
      connections: text("connections").notNull(),
      // JSON string of connections
      createdAt: timestamp("created_at").defaultNow()
    });
    insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
      id: true,
      createdAt: true
    });
    insertGameAttemptSchema = createInsertSchema(gameAttempts).omit({
      id: true,
      createdAt: true
    });
    actorSchema = z.object({
      id: z.number(),
      name: z.string(),
      profile_path: z.string().nullable(),
      known_for_department: z.string().optional()
    });
    movieSchema = z.object({
      id: z.number(),
      title: z.string(),
      release_date: z.string().optional(),
      poster_path: z.string().nullable(),
      overview: z.string().optional(),
      popularity: z.number().optional(),
      vote_average: z.number().optional(),
      vote_count: z.number().optional()
    });
    connectionSchema = z.object({
      actorId: z.number(),
      actorName: z.string(),
      movieId: z.number(),
      movieTitle: z.string()
    });
    gameConnectionSchema = z.object({
      connections: z.array(connectionSchema),
      startActorId: z.number(),
      endActorId: z.number()
    });
    validationResultSchema = z.object({
      valid: z.boolean(),
      message: z.string(),
      completed: z.boolean().optional(),
      moves: z.number().optional()
    });
    adminUsers = pgTable("admin_users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email", { length: 255 }).unique().notNull(),
      passwordHash: varchar("password_hash", { length: 255 }).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      lastLoginAt: timestamp("last_login_at")
    });
    insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true, lastLoginAt: true });
    adminSessions = pgTable("admin_sessions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      adminUserId: varchar("admin_user_id").references(() => adminUsers.id).notNull(),
      token: varchar("token", { length: 255 }).unique().notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    contactSubmissions = pgTable("contact_submissions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name", { length: 255 }).notNull(),
      email: varchar("email", { length: 255 }).notNull(),
      message: text("message").notNull(),
      status: varchar("status", { length: 50 }).default("new"),
      // new, read, responded
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true
    });
    visitorAnalytics = pgTable("visitor_analytics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      sessionId: varchar("session_id").notNull(),
      // Browser fingerprint/session
      referrer: text("referrer"),
      // Full referrer URL
      referrerDomain: varchar("referrer_domain", { length: 255 }),
      // e.g., 'google.com'
      referrerType: varchar("referrer_type", { length: 50 }),
      // 'search', 'social', 'direct', 'referral'
      utmSource: varchar("utm_source", { length: 100 }),
      // UTM parameters
      utmMedium: varchar("utm_medium", { length: 100 }),
      utmCampaign: varchar("utm_campaign", { length: 100 }),
      utmContent: varchar("utm_content", { length: 100 }),
      utmTerm: varchar("utm_term", { length: 100 }),
      searchQuery: text("search_query"),
      // If available from search engines
      userAgent: text("user_agent"),
      // Browser/device info
      ipAddress: varchar("ip_address", { length: 45 }),
      // IPv4/IPv6 (hashed for privacy)
      country: varchar("country", { length: 2 }),
      // Country code
      entryPage: varchar("entry_page", { length: 500 }),
      // First page visited
      exitPage: varchar("exit_page", { length: 500 }),
      // Last page visited
      pageviews: integer("pageviews").default(1),
      // Total pages viewed
      sessionDuration: integer("session_duration"),
      // Time spent in seconds
      bounced: boolean("bounced").default(false),
      // Single page visit
      converted: boolean("converted").default(false),
      // Played the game
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertVisitorAnalyticsSchema = createInsertSchema(visitorAnalytics).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: text("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email").unique().notNull(),
      username: varchar("username").unique().notNull(),
      password: varchar("password").notNull(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    userChallengeCompletions = pgTable("user_challenge_completions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      challengeId: varchar("challenge_id").references(() => dailyChallenges.id).notNull(),
      moves: integer("moves").notNull(),
      completedAt: timestamp("completed_at").defaultNow(),
      connections: text("connections").notNull()
      // JSON string of connections used
    }, (table) => [
      index("idx_user_completions").on(table.userId),
      index("idx_challenge_completions").on(table.challengeId)
    ]);
    userStats = pgTable("user_stats", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      totalCompletions: integer("total_completions").default(0),
      totalMoves: integer("total_moves").default(0),
      completionsAt1Move: integer("completions_at_1_move").default(0),
      completionsAt2Moves: integer("completions_at_2_moves").default(0),
      completionsAt3Moves: integer("completions_at_3_moves").default(0),
      completionsAt4Moves: integer("completions_at_4_moves").default(0),
      completionsAt5Moves: integer("completions_at_5_moves").default(0),
      completionsAt6Moves: integer("completions_at_6_moves").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    usersRelations = relations(users, ({ one, many }) => ({
      completions: many(userChallengeCompletions),
      stats: one(userStats, {
        fields: [users.id],
        references: [userStats.userId]
      })
    }));
    userStatsRelations = relations(userStats, ({ one }) => ({
      user: one(users, {
        fields: [userStats.userId],
        references: [users.id]
      })
    }));
    userChallengeCompletionsRelations = relations(userChallengeCompletions, ({ one }) => ({
      user: one(users, {
        fields: [userChallengeCompletions.userId],
        references: [users.id]
      }),
      challenge: one(dailyChallenges, {
        fields: [userChallengeCompletions.challengeId],
        references: [dailyChallenges.id]
      })
    }));
    dailyChallengesRelations = relations(dailyChallenges, ({ many }) => ({
      completions: many(userChallengeCompletions)
    }));
    insertUserChallengeCompletionSchema = createInsertSchema(userChallengeCompletions).omit({
      id: true,
      completedAt: true
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    registerSchema = insertUserSchema.extend({
      username: z.string().min(3).max(50),
      password: z.string().min(8)
    });
    insertUserStatsSchema = createInsertSchema(userStats).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/db.ts
import * as dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryableError = error?.code === "EAI_AGAIN" || error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT" || error?.message?.includes("getaddrinfo") || error?.message?.includes("connection") || error?.message?.includes("timeout") || error?.message?.includes("WebSocket") || error?.message?.includes("Cannot set property message") || error?.name === "ErrorEvent" || error?.name === "TypeError";
      if (isRetryableError) {
        const delay = Math.min(2e3 * Math.pow(1.5, attempt - 1), 15e3);
        console.log(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message || error.toString()}`);
        if (attempt < maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`All ${maxRetries} connection attempts failed. Last error:`, error.message || error.toString());
        }
      }
      throw error;
    }
  }
  throw lastError;
}
async function checkDatabaseHealth() {
  try {
    await withRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        return true;
      } finally {
        client.release();
      }
    });
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    dotenv.config();
    neonConfig.webSocketConstructor = ws;
    neonConfig.fetchConnectionCache = true;
    neonConfig.useSecureWebSocket = true;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3e4,
      // Further increased timeout for slow networks
      idleTimeoutMillis: 3e5,
      // 5 minutes idle timeout
      max: 5,
      // Further reduced max connections for stability
      allowExitOnIdle: true,
      // Add additional configuration for stability
      application_name: "movie-connection-game",
      statement_timeout: 3e4,
      // 30 second statement timeout
      query_timeout: 3e4
      // 30 second query timeout
    });
    pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });
    pool.on("connect", () => {
      console.log("Database pool connected successfully");
    });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, and, gt, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DatabaseStorage = class {
      // Daily Challenge methods
      async getDailyChallenge(date) {
        return await withRetry(async () => {
          const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.date, date));
          return challenge || void 0;
        });
      }
      async getDailyChallengeById(id) {
        return await withRetry(async () => {
          const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, id));
          return challenge || void 0;
        });
      }
      async getChallengeByStatus(status) {
        return await withRetry(async () => {
          const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
          return challenge || void 0;
        });
      }
      async getAllChallengesByStatus(status) {
        return await withRetry(async () => {
          return await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
        });
      }
      async createDailyChallenge(insertChallenge) {
        return await withRetry(async () => {
          const [challenge] = await db.insert(dailyChallenges).values(insertChallenge).returning();
          return challenge;
        });
      }
      async updateDailyChallenge(id, updates) {
        return await withRetry(async () => {
          const [challenge] = await db.update(dailyChallenges).set(updates).where(eq(dailyChallenges.id, id)).returning();
          return challenge;
        });
      }
      async updateChallengeStatus(challengeId, status) {
        return await withRetry(async () => {
          const [challenge] = await db.update(dailyChallenges).set({ status }).where(eq(dailyChallenges.id, challengeId)).returning();
          return challenge;
        });
      }
      async updateDailyChallengeHints(challengeId, hintsUsed, startActorHint, endActorHint) {
        return await withRetry(async () => {
          const updateData = { hintsUsed };
          if (startActorHint !== void 0) updateData.startActorHint = startActorHint;
          if (endActorHint !== void 0) updateData.endActorHint = endActorHint;
          const [challenge] = await db.update(dailyChallenges).set(updateData).where(eq(dailyChallenges.id, challengeId)).returning();
          return challenge;
        });
      }
      async deleteDailyChallenge(date) {
        await withRetry(async () => {
          await db.delete(dailyChallenges).where(eq(dailyChallenges.date, date));
        });
      }
      // Game Attempt methods
      async createGameAttempt(insertAttempt) {
        return await withRetry(async () => {
          const [attempt] = await db.insert(gameAttempts).values(insertAttempt).returning();
          return attempt;
        });
      }
      async getGameAttemptsByChallenge(challengeId) {
        return await withRetry(async () => {
          return await db.select().from(gameAttempts).where(eq(gameAttempts.challengeId, challengeId));
        });
      }
      async getChallengeAnalytics(challengeId) {
        return await withRetry(async () => {
          const attempts = await db.select().from(gameAttempts).where(eq(gameAttempts.challengeId, challengeId));
          const challenge = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, challengeId)).limit(1);
          const excludedActorIds = challenge.length > 0 ? [challenge[0].startActorId.toString(), challenge[0].endActorId.toString()] : [];
          const totalAttempts = attempts.length;
          const completedAttempts = attempts.filter((a) => a.completed).length;
          const completionRate = totalAttempts > 0 ? completedAttempts / totalAttempts * 100 : 0;
          const completedMoves = attempts.filter((a) => a.completed).map((a) => a.moves);
          const avgMoves = completedMoves.length > 0 ? completedMoves.reduce((sum, moves) => sum + moves, 0) / completedMoves.length : 0;
          const moveDistribution = Array.from({ length: 6 }, (_, i) => {
            const moves = i + 1;
            const count2 = completedMoves.filter((m) => m === moves).length;
            return { moves, count: count2 };
          });
          const movieUsage = /* @__PURE__ */ new Map();
          const actorUsage = /* @__PURE__ */ new Map();
          for (const attempt of attempts.filter((a) => a.completed)) {
            if (attempt.connections) {
              try {
                const connections = JSON.parse(attempt.connections);
                const uniqueMoviesInChain = /* @__PURE__ */ new Set();
                const uniqueActorsInChain = /* @__PURE__ */ new Set();
                for (const connection of connections) {
                  if (connection.movieId && connection.movieTitle) {
                    uniqueMoviesInChain.add(connection.movieId);
                  }
                  const actorIdStr = connection.actorId.toString();
                  if (connection.actorId && connection.actorName && !excludedActorIds.includes(actorIdStr)) {
                    uniqueActorsInChain.add(actorIdStr);
                  }
                }
                uniqueMoviesInChain.forEach((movieId) => {
                  const connection = connections.find((c) => c.movieId === movieId);
                  if (connection) {
                    const existing = movieUsage.get(movieId);
                    movieUsage.set(movieId, {
                      title: connection.movieTitle,
                      count: (existing?.count || 0) + 1
                    });
                  }
                });
                uniqueActorsInChain.forEach((actorId) => {
                  const connection = connections.find((c) => c.actorId.toString() === actorId);
                  if (connection) {
                    const existing = actorUsage.get(actorId);
                    actorUsage.set(actorId, {
                      name: connection.actorName,
                      count: (existing?.count || 0) + 1
                    });
                  }
                });
              } catch (error) {
                console.error("Error parsing connection chain:", error);
              }
            }
          }
          const mostUsedMovies = Array.from(movieUsage.entries()).map(([id, data]) => ({ id, title: data.title, count: data.count })).sort((a, b) => b.count - a.count).slice(0, 5);
          const mostUsedActors = Array.from(actorUsage.entries()).map(([id, data]) => ({ id, name: data.name, count: data.count })).sort((a, b) => b.count - a.count).slice(0, 5);
          const fewestMoves = completedMoves.length > 0 ? Math.min(...completedMoves) : 0;
          return {
            totalAttempts,
            completedAttempts,
            completionRate: Math.round(completionRate * 100) / 100,
            avgMoves: Math.round(avgMoves * 100) / 100,
            fewestMoves,
            moveDistribution,
            mostUsedMovies,
            mostUsedActors
          };
        });
      }
      // Admin methods
      async createAdminUser(user) {
        return await withRetry(async () => {
          const hashedPassword = await bcrypt.hash(user.passwordHash, 12);
          const [adminUser] = await db.insert(adminUsers).values({
            ...user,
            passwordHash: hashedPassword
          }).returning();
          return adminUser;
        });
      }
      async getAdminUserByEmail(email) {
        return await withRetry(async () => {
          const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
          return user || void 0;
        });
      }
      async createAdminSession(session2) {
        return await withRetry(async () => {
          const [adminSession] = await db.insert(adminSessions).values(session2).returning();
          return adminSession;
        });
      }
      async getValidAdminSession(token) {
        return await withRetry(async () => {
          const [session2] = await db.select().from(adminSessions).where(and(
            eq(adminSessions.token, token),
            gt(adminSessions.expiresAt, /* @__PURE__ */ new Date())
          ));
          return session2 || void 0;
        });
      }
      async deleteAdminSession(token) {
        await withRetry(async () => {
          await db.delete(adminSessions).where(eq(adminSessions.token, token));
        });
      }
      async updateAdminLastLogin(userId) {
        await withRetry(async () => {
          await db.update(adminUsers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(adminUsers.id, userId));
        });
      }
      // Contact methods
      async createContactSubmission(insertSubmission) {
        return await withRetry(async () => {
          const [submission] = await db.insert(contactSubmissions).values(insertSubmission).returning();
          return submission;
        });
      }
      async getContactSubmissions() {
        return await withRetry(async () => {
          return await db.select().from(contactSubmissions).orderBy(contactSubmissions.createdAt);
        });
      }
      async updateContactSubmissionStatus(id, status) {
        await withRetry(async () => {
          await db.update(contactSubmissions).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contactSubmissions.id, id));
        });
      }
      // Visitor Analytics methods
      async trackVisitor(insertAnalytics) {
        return await withRetry(async () => {
          const [analytics] = await db.insert(visitorAnalytics).values(insertAnalytics).returning();
          return analytics;
        });
      }
      async updateVisitorSession(sessionId, updates) {
        await withRetry(async () => {
          await db.update(visitorAnalytics).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(visitorAnalytics.sessionId, sessionId));
        });
      }
      async getReferralAnalytics(days = 30) {
        return await withRetry(async () => {
          const cutoffDate = /* @__PURE__ */ new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          const visitors = await db.select().from(visitorAnalytics).where(gt(visitorAnalytics.createdAt, cutoffDate));
          const totalVisitors = visitors.length;
          const referrerMap = /* @__PURE__ */ new Map();
          const topReferrersMap = /* @__PURE__ */ new Map();
          const searchQueriesMap = /* @__PURE__ */ new Map();
          const utmSourcesMap = /* @__PURE__ */ new Map();
          const geographicMap = /* @__PURE__ */ new Map();
          const deviceMap = /* @__PURE__ */ new Map();
          let convertedVisitors = 0;
          for (const visitor of visitors) {
            if (visitor.converted) convertedVisitors++;
            const domain = visitor.referrerDomain || "direct";
            const type = visitor.referrerType || "direct";
            if (referrerMap.has(domain)) {
              referrerMap.get(domain).count++;
            } else {
              referrerMap.set(domain, { type, count: 1 });
            }
            topReferrersMap.set(domain, (topReferrersMap.get(domain) || 0) + 1);
            if (visitor.searchQuery) {
              searchQueriesMap.set(visitor.searchQuery, (searchQueriesMap.get(visitor.searchQuery) || 0) + 1);
            }
            if (visitor.utmSource) {
              const key = visitor.utmSource;
              const existing = utmSourcesMap.get(key);
              if (existing) {
                existing.count++;
              } else {
                utmSourcesMap.set(key, {
                  medium: visitor.utmMedium || "",
                  campaign: visitor.utmCampaign || "",
                  count: 1
                });
              }
            }
            if (visitor.country) {
              geographicMap.set(visitor.country, (geographicMap.get(visitor.country) || 0) + 1);
            }
            if (visitor.userAgent) {
              let deviceInfo = "Unknown";
              if (visitor.userAgent.includes("Mobile")) deviceInfo = "Mobile";
              else if (visitor.userAgent.includes("Tablet")) deviceInfo = "Tablet";
              else deviceInfo = "Desktop";
              deviceMap.set(deviceInfo, (deviceMap.get(deviceInfo) || 0) + 1);
            }
          }
          const referralBreakdown = Array.from(referrerMap.entries()).map(([domain, data]) => ({
            domain,
            type: data.type,
            count: data.count,
            percentage: Math.round(data.count / totalVisitors * 100 * 100) / 100
          })).sort((a, b) => b.count - a.count);
          const topReferrers = Array.from(topReferrersMap.entries()).map(([domain, count2]) => ({
            domain,
            count: count2,
            percentage: Math.round(count2 / totalVisitors * 100 * 100) / 100
          })).sort((a, b) => b.count - a.count).slice(0, 10);
          const searchQueries = Array.from(searchQueriesMap.entries()).map(([query, count2]) => ({ query, count: count2 })).sort((a, b) => b.count - a.count).slice(0, 10);
          const utmSources = Array.from(utmSourcesMap.entries()).map(([source, data]) => ({
            source,
            medium: data.medium,
            campaign: data.campaign,
            count: data.count
          })).sort((a, b) => b.count - a.count);
          const geographicData = Array.from(geographicMap.entries()).map(([country, count2]) => ({ country, count: count2 })).sort((a, b) => b.count - a.count).slice(0, 10);
          const deviceData = Array.from(deviceMap.entries()).map(([userAgent, count2]) => ({ userAgent, count: count2 })).sort((a, b) => b.count - a.count);
          return {
            totalVisitors,
            referralBreakdown,
            topReferrers,
            searchQueries,
            utmSources,
            conversionRates: {
              total: totalVisitors,
              converted: convertedVisitors,
              rate: totalVisitors > 0 ? Math.round(convertedVisitors / totalVisitors * 100 * 100) / 100 : 0
            },
            geographicData,
            deviceData
          };
        });
      }
      // User methods (email/password)
      async getUserById(id) {
        return await withRetry(async () => {
          const [user] = await db.select().from(users).where(eq(users.id, id));
          return user || void 0;
        });
      }
      async getUserByEmail(email) {
        return await withRetry(async () => {
          const [user] = await db.select().from(users).where(eq(users.email, email));
          return user || void 0;
        });
      }
      async getUserByUsername(username) {
        return await withRetry(async () => {
          const [user] = await db.select().from(users).where(eq(users.username, username));
          return user || void 0;
        });
      }
      async createUser(userData) {
        return await withRetry(async () => {
          const [user] = await db.insert(users).values(userData).returning();
          return user;
        });
      }
      // User stats methods
      async getUserStats(userId) {
        return await withRetry(async () => {
          const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
          return stats || void 0;
        });
      }
      async createUserStats(statsData) {
        return await withRetry(async () => {
          const [stats] = await db.insert(userStats).values(statsData).returning();
          return stats;
        });
      }
      async updateUserStats(userId, updates) {
        return await withRetry(async () => {
          const [stats] = await db.update(userStats).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(userStats.userId, userId)).returning();
          return stats;
        });
      }
      // User Challenge Completion methods
      async createUserChallengeCompletion(completion) {
        return await withRetry(async () => {
          const [userCompletion] = await db.insert(userChallengeCompletions).values(completion).returning();
          return userCompletion;
        });
      }
      async getUserChallengeCompletion(userId, challengeId) {
        return await withRetry(async () => {
          const [completion] = await db.select().from(userChallengeCompletions).where(and(
            eq(userChallengeCompletions.userId, userId),
            eq(userChallengeCompletions.challengeId, challengeId)
          ));
          return completion || void 0;
        });
      }
      async getUserCompletions(userId) {
        return await withRetry(async () => {
          return await db.select().from(userChallengeCompletions).where(eq(userChallengeCompletions.userId, userId)).orderBy(desc(userChallengeCompletions.completedAt));
        });
      }
      async getUserMoveDistribution(userId) {
        return await withRetry(async () => {
          const results = await db.select({
            moves: userChallengeCompletions.moves,
            count: count()
          }).from(userChallengeCompletions).where(eq(userChallengeCompletions.userId, userId)).groupBy(userChallengeCompletions.moves).orderBy(userChallengeCompletions.moves);
          return results.map((row) => ({ moves: row.moves, count: Number(row.count) }));
        });
      }
      async getRecentChallengesForUser(userId, limit) {
        return await withRetry(async () => {
          const recentChallenges = await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, "active")).orderBy(desc(dailyChallenges.date)).limit(limit);
          const results = [];
          for (const challenge of recentChallenges) {
            const completion = await this.getUserChallengeCompletion(userId, challenge.id);
            results.push({
              challenge,
              completed: !!completion,
              moves: completion?.moves
            });
          }
          return results;
        });
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/services/tmdb.ts
var TMDbService, tmdbService;
var init_tmdb = __esm({
  "server/services/tmdb.ts"() {
    "use strict";
    TMDbService = class {
      config;
      // Genre IDs to filter out
      EXCLUDED_GENRES = {
        ANIMATION: 16,
        DOCUMENTARY: 99,
        TV_MOVIE: 10770,
        // TV Movies often include stand-up specials and single-person shows
        MUSIC: 10402
        // Music documentaries and concert films
      };
      // Actors to exclude (primarily voice actors, stand-up comedians, or those not suitable for the game)
      EXCLUDED_ACTORS = /* @__PURE__ */ new Set([
        // Voice actors
        "Cree Summer",
        "Tara Strong",
        "Frank Welker",
        "Grey Griffin",
        "Jim Cummings",
        "Tom Kenny",
        "Billy West",
        "Maurice LaMarche",
        "Rob Paulsen",
        "Dee Bradley Baker",
        "Charlie Adler",
        "Nancy Cartwright",
        "Hank Azaria",
        "Dan Castellaneta",
        "Julie Kavner",
        "Yeardley Smith",
        "Harry Shearer",
        "Phil LaMarr",
        "Carlos Alazraqui",
        "Kath Soucie",
        "Jeff Bennett",
        "Corey Burton",
        "Kevin Michael Richardson",
        "John DiMaggio",
        "Mark Hamill",
        // Primarily voice work in recent years
        // Stand-up comedians (primarily solo performers)
        "Dave Chappelle",
        "Chris Rock",
        "Eddie Murphy",
        // Primarily known for solo stand-up, though has acted
        "Richard Pryor",
        "George Carlin",
        "Robin Williams",
        // Though he acted, much of his filmography is solo or voice work
        "Joan Rivers",
        "Andrew Dice Clay",
        "Sam Kinison"
      ]);
      constructor() {
        this.config = {
          apiKey: process.env.TMDB_API_KEY || process.env.API_KEY || "",
          baseUrl: "https://api.themoviedb.org/3",
          imageBaseUrl: "https://image.tmdb.org/t/p/w500"
        };
        if (!this.config.apiKey) {
          console.warn("TMDB API Key not found. Please set TMDB_API_KEY or API_KEY environment variable.");
        }
      }
      async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.config.baseUrl}${endpoint}`);
        url.searchParams.append("api_key", this.config.apiKey);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      }
      async searchActors(query) {
        if (!query.trim()) return [];
        try {
          const response = await this.makeRequest("/search/person", {
            query: query.trim(),
            include_adult: "false"
          });
          const actors = response.results.filter((person) => person.known_for_department === "Acting").map((person) => ({
            id: person.id,
            name: person.name,
            profile_path: person.profile_path,
            known_for_department: person.known_for_department
          }));
          const filteredActors = await this.filterActorsByGenre(actors);
          return filteredActors.slice(0, 20);
        } catch (error) {
          console.error("Error searching actors:", error);
          return [];
        }
      }
      async searchMovies(query) {
        if (!query.trim()) return [];
        try {
          const response = await this.makeRequest("/search/movie", {
            query: query.trim(),
            include_adult: "false",
            "primary_release_date.gte": "1970-01-01"
          });
          let allResults = [...response.results];
          const words = query.trim().split(/\s+/);
          if (words.length >= 2 && !query.includes("+")) {
            try {
              const plusQuery = words.join(" + ");
              const plusResponse = await this.makeRequest("/search/movie", {
                query: plusQuery,
                include_adult: "false",
                "primary_release_date.gte": "1970-01-01"
              });
              const existingIds = new Set(allResults.map((m) => m.id));
              for (const movie of plusResponse.results) {
                if (!existingIds.has(movie.id)) {
                  allResults.push(movie);
                }
              }
            } catch (e) {
            }
          }
          return allResults.filter((movie) => {
            if (!movie.release_date) return false;
            const releaseYear = new Date(movie.release_date).getFullYear();
            return releaseYear >= 1970;
          }).sort((a, b) => {
            const aScore = (a.vote_count >= 1e3 ? 1e5 : 0) + a.vote_count + a.vote_average * 100;
            const bScore = (b.vote_count >= 1e3 ? 1e5 : 0) + b.vote_count + b.vote_average * 100;
            return bScore - aScore;
          }).map((movie) => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            poster_path: movie.poster_path,
            overview: movie.overview
          }));
        } catch (error) {
          console.error("Error searching movies:", error);
          return [];
        }
      }
      async getMovieCredits(movieId) {
        try {
          const response = await this.makeRequest(`/movie/${movieId}/credits`);
          return response.cast.map((actor) => ({
            id: actor.id,
            name: actor.name,
            profile_path: actor.profile_path,
            known_for_department: actor.known_for_department
          }));
        } catch (error) {
          console.error("Error getting movie credits:", error);
          return [];
        }
      }
      async getActorMovies(actorId) {
        try {
          const response = await this.makeRequest(`/person/${actorId}/movie_credits`);
          const movies = response.cast.filter((movie) => {
            if (!movie.release_date) return false;
            const releaseYear = new Date(movie.release_date).getFullYear();
            return releaseYear >= 1970;
          }).map((movie) => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            poster_path: movie.poster_path,
            // These may not be available in movie_credits endpoint
            popularity: movie.popularity || 0,
            vote_average: movie.vote_average || 0,
            vote_count: movie.vote_count || 0
          }));
          return movies;
        } catch (error) {
          console.error("Error getting actor movies:", error);
          return [];
        }
      }
      async getActorMoviesWithPopularity(actorId) {
        try {
          const basicMovies = await this.getActorMovies(actorId);
          const enhancedMovies = await Promise.all(
            basicMovies.slice(0, 20).map(async (movie) => {
              try {
                const details = await this.makeRequest(`/movie/${movie.id}`);
                return {
                  ...movie,
                  popularity: details.popularity || 0,
                  vote_average: details.vote_average || 0,
                  vote_count: details.vote_count || 0
                };
              } catch {
                return movie;
              }
            })
          );
          return [...enhancedMovies, ...basicMovies.slice(20)];
        } catch (error) {
          console.error("Error getting actor movies with popularity:", error);
          return [];
        }
      }
      async getActorHintMovies(actorId, count2 = 5) {
        const movies = await this.getActorMoviesWithPopularity(actorId);
        const actorDetails = await this.getActorDetails(actorId);
        let filteredMovies = movies;
        if (actorDetails?.deathday) {
          const deathYear = new Date(actorDetails.deathday).getFullYear();
          filteredMovies = movies.filter((movie) => {
            if (!movie.release_date) return false;
            const releaseYear = new Date(movie.release_date).getFullYear();
            return releaseYear <= deathYear;
          });
          console.log(`Actor ${actorDetails.name} died in ${deathYear}, filtered movies from ${movies.length} to ${filteredMovies.length}`);
        }
        const strategicMovies = this.selectStrategicHintMovies(filteredMovies, count2);
        return strategicMovies;
      }
      /**
       * Select strategic hint movies that provide good gameplay value
       * Prioritizes popular movies while maintaining decade diversity
       */
      selectStrategicHintMovies(movies, count2) {
        if (movies.length <= count2) return movies;
        const moviesWithDetails = movies.map((movie) => ({
          ...movie,
          // Calculate a composite score: popularity + recency + title distinctiveness
          score: this.calculateMovieHintScore(movie)
        }));
        const moviesByDecade = /* @__PURE__ */ new Map();
        moviesWithDetails.forEach((movie) => {
          if (movie.release_date) {
            const decade = Math.floor(new Date(movie.release_date).getFullYear() / 10) * 10;
            if (!moviesByDecade.has(decade)) {
              moviesByDecade.set(decade, []);
            }
            moviesByDecade.get(decade).push(movie);
          }
        });
        moviesByDecade.forEach((decadeMovies) => {
          decadeMovies.sort((a, b) => b.score - a.score);
        });
        const selectedMovies = [];
        const decades = Array.from(moviesByDecade.keys()).sort((a, b) => b - a);
        for (const decade of decades) {
          if (selectedMovies.length >= count2) break;
          const decadeMovies = moviesByDecade.get(decade);
          selectedMovies.push(decadeMovies[0]);
        }
        if (selectedMovies.length < count2) {
          for (const decade of decades) {
            if (selectedMovies.length >= count2) break;
            const decadeMovies = moviesByDecade.get(decade);
            if (decadeMovies.length > 1) {
              const alreadySelected = selectedMovies.some(
                (selected) => decadeMovies[0].id === selected.id
              );
              if (alreadySelected && decadeMovies[1]) {
                selectedMovies.push(decadeMovies[1]);
              }
            }
          }
        }
        if (selectedMovies.length < count2) {
          const remainingMovies = moviesWithDetails.filter((movie) => !selectedMovies.some((selected) => selected.id === movie.id)).sort((a, b) => b.score - a.score);
          selectedMovies.push(...remainingMovies.slice(0, count2 - selectedMovies.length));
        }
        return selectedMovies.sort(() => Math.random() - 0.45).slice(0, count2);
      }
      /**
       * Calculate a hint score for a movie based on TMDB popularity and other factors
       */
      calculateMovieHintScore(movie) {
        let score = 0;
        if (movie.popularity) {
          score += movie.popularity * 2;
        }
        if (movie.vote_count && movie.vote_average) {
          const popularityFromVotes = Math.log(movie.vote_count + 1) * movie.vote_average;
          score += popularityFromVotes;
        }
        if (movie.release_date) {
          const releaseYear = new Date(movie.release_date).getFullYear();
          if (releaseYear >= 1980 && releaseYear <= 2020) {
            score += 10;
          } else if (releaseYear > 2020) {
            score += 8;
          } else if (releaseYear >= 1970) {
            score += 6;
          } else {
            score += 3;
          }
        }
        const titleLength = movie.title.length;
        if (titleLength >= 8 && titleLength <= 25) {
          score += 3;
        } else if (titleLength > 25) {
          score += 2;
        } else {
          score += 1;
        }
        score += Math.random() * 1;
        return score;
      }
      /**
       * Get detailed actor information including birth/death dates
       */
      async getActorDetails(actorId) {
        try {
          const response = await this.makeRequest(`/person/${actorId}`);
          return {
            name: response.name,
            birthday: response.birthday,
            deathday: response.deathday
          };
        } catch (error) {
          console.error(`Error getting actor details for ${actorId}:`, error);
          return null;
        }
      }
      /**
       * Check if an actor has career activity after 1980 (includes deceased actors with modern careers)
       */
      async hasCareerActivityAfter1980(actorId) {
        try {
          const [actorDetails, movieCredits] = await Promise.all([
            this.getActorDetails(actorId),
            this.makeRequest(`/person/${actorId}/movie_credits`)
          ]);
          if (actorDetails?.deathday) {
            const recentMoviesForDeceased = movieCredits.cast.filter((movie) => {
              if (!movie.release_date) return false;
              const releaseYear = new Date(movie.release_date).getFullYear();
              return releaseYear >= 1990;
            });
            if (recentMoviesForDeceased.length >= 3) {
              console.log(`Including deceased actor with modern career: ${actorDetails.name} (${recentMoviesForDeceased.length} movies from 1990+)`);
              return true;
            } else {
              console.log(`Excluding deceased actor without modern career: ${actorDetails.name}`);
              return false;
            }
          }
          const recentMovies = movieCredits.cast.filter((movie) => {
            if (!movie.release_date) return false;
            const releaseYear = new Date(movie.release_date).getFullYear();
            return releaseYear > 1980;
          });
          return recentMovies.length >= 2;
        } catch (error) {
          console.error(`Error checking career activity for actor ${actorId}:`, error);
          return false;
        }
      }
      /**
       * Filter actors by career activity - includes living actors and deceased actors with modern careers (1990+)
       */
      async filterActorsByCareerActivity(actors) {
        console.log("Applying career activity filtering (post-1980) and living status to popular actors...");
        const validActors = [];
        for (let i = 0; i < actors.length; i += 5) {
          const batch = actors.slice(i, i + 5);
          const batchPromises = batch.map(async (actor) => {
            try {
              const hasRecentActivity = await this.hasCareerActivityAfter1980(actor.id);
              return hasRecentActivity ? actor : null;
            } catch (error) {
              console.error(`Error checking career activity for ${actor.name}:`, error);
              return null;
            }
          });
          const batchResults = await Promise.all(batchPromises);
          validActors.push(...batchResults.filter((actor) => actor !== null));
          if (i + 5 < actors.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        console.log(`Filtered from ${actors.length} to ${validActors.length} actors with post-1980 career activity and living status`);
        return validActors;
      }
      /**
       * Filter out actors who primarily appear in documentaries or animated movies
       */
      async filterActorsByGenre(actors) {
        const validActors = [];
        for (let i = 0; i < actors.length; i += 5) {
          const batch = actors.slice(i, i + 5);
          const batchPromises = batch.map(async (actor) => {
            try {
              if (this.EXCLUDED_ACTORS.has(actor.name)) {
                console.log(`Excluding known voice actor: ${actor.name}`);
                return null;
              }
              const isVoiceActor = await this.isPrimarilyVoiceActor(actor.id);
              if (isVoiceActor) {
                console.log(`Excluding detected voice actor: ${actor.name}`);
                return null;
              }
              const movies = await this.getActorMovies(actor.id);
              if (movies.length === 0) {
                return null;
              }
              const liveActionMovies = await this.getNonDocumentaryNonAnimatedMovies(actor.id);
              const rawMovieCredits = await this.makeRequest(`/person/${actor.id}/movie_credits`);
              const englishMovies = rawMovieCredits.cast.filter(
                (movie) => movie.original_language === "en" && movie.release_date && new Date(movie.release_date).getFullYear() >= 1970 && // Exclude documentaries, animated movies, TV movies, and music films
                (!movie.genre_ids || !movie.genre_ids.some(
                  (id) => id === this.EXCLUDED_GENRES.ANIMATION || id === this.EXCLUDED_GENRES.DOCUMENTARY || id === this.EXCLUDED_GENRES.TV_MOVIE || id === this.EXCLUDED_GENRES.MUSIC
                ))
              );
              console.log(`${actor.name}: ${liveActionMovies.length} live-action movies, ${englishMovies.length} in English`);
              if (englishMovies.length >= 5) {
                const popularMovies = englishMovies.filter((movie) => {
                  if (!movie.release_date) return false;
                  const releaseYear = new Date(movie.release_date).getFullYear();
                  return releaseYear >= 1990;
                });
                if (popularMovies.length >= 3) {
                  return actor;
                }
              }
              return null;
            } catch (error) {
              console.error(`Error checking actor ${actor.name}:`, error);
              return null;
            }
          });
          const batchResults = await Promise.all(batchPromises);
          validActors.push(...batchResults.filter((actor) => actor !== null));
          if (i + 5 < actors.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        return validActors;
      }
      /**
       * Get movies for an actor, excluding documentaries, animated movies, and focusing on mainstream releases
       */
      async getNonDocumentaryNonAnimatedMovies(actorId) {
        try {
          const response = await this.makeRequest(`/person/${actorId}/movie_credits`);
          return response.cast.filter((movie) => {
            if (!movie.release_date) return false;
            const releaseYear = new Date(movie.release_date).getFullYear();
            if (releaseYear < 1970) return false;
            if (movie.genre_ids && movie.genre_ids.length > 0) {
              return !movie.genre_ids.includes(this.EXCLUDED_GENRES.ANIMATION) && !movie.genre_ids.includes(this.EXCLUDED_GENRES.DOCUMENTARY) && !movie.genre_ids.includes(this.EXCLUDED_GENRES.TV_MOVIE) && !movie.genre_ids.includes(this.EXCLUDED_GENRES.MUSIC);
            }
            return true;
          }).map((movie) => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            poster_path: movie.poster_path
          }));
        } catch (error) {
          console.error("Error getting non-documentary/non-animated movies:", error);
          return [];
        }
      }
      /**
       * Enhanced check to identify if an actor is primarily a voice actor
       */
      async isPrimarilyVoiceActor(actorId) {
        try {
          const response = await this.makeRequest(`/person/${actorId}/movie_credits`);
          if (response.cast.length === 0) return false;
          let animatedCount = 0;
          let liveActionCount = 0;
          for (const movie of response.cast) {
            if (movie.genre_ids && movie.genre_ids.includes(this.EXCLUDED_GENRES.ANIMATION)) {
              animatedCount++;
            } else {
              liveActionCount++;
            }
          }
          const animatedPercentage = animatedCount / (animatedCount + liveActionCount);
          return animatedPercentage > 0.6;
        } catch (error) {
          console.error(`Error checking voice actor status for ${actorId}:`, error);
          return false;
        }
      }
      async validateActorInMovie(actorId, movieId) {
        try {
          const credits = await this.getMovieCredits(movieId);
          const isValid = credits.some((actor) => actor.id === actorId);
          if (!isValid) {
            console.log(`Validation failed: Actor ${actorId} not found in movie ${movieId} cast (${credits.length} cast members)`);
          }
          return isValid;
        } catch (error) {
          console.error("Error validating actor in movie:", error);
          return false;
        }
      }
      async getPopularActors() {
        try {
          const pages = [];
          const totalPages = 10;
          console.log(`Fetching ${totalPages} pages of popular actors (${totalPages * 20} total)...`);
          for (let i = 1; i <= totalPages; i++) {
            const page = await this.makeRequest("/person/popular", { page: i.toString() });
            pages.push(page);
            if (i < totalPages) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
          const allResults = pages.flatMap((page) => page.results);
          const actors = allResults.filter((person) => person.known_for_department === "Acting").map((person) => ({
            id: person.id,
            name: person.name,
            profile_path: person.profile_path,
            known_for_department: person.known_for_department
          }));
          console.log(`Found ${actors.length} actors from ${totalPages} pages, applying career activity filtering...`);
          const careerFilteredActors = await this.filterActorsByCareerActivity(actors);
          console.log("Applying genre filtering and English movie requirement (5+ credits) to career-filtered actors...");
          const finalFilteredActors = await this.filterActorsByGenre(careerFilteredActors);
          console.log(`Final filtered actors: ${finalFilteredActors.length}`);
          console.log(`Actor pool diversity: ${finalFilteredActors.map((a) => a.name).slice(0, 10).join(", ")}...`);
          return finalFilteredActors.length > 10 ? finalFilteredActors : careerFilteredActors;
        } catch (error) {
          console.error("Error getting popular actors:", error);
          return [];
        }
      }
      async getRandomTopActors() {
        try {
          const actors = await this.getPopularActors();
          if (actors.length < 2) {
            return null;
          }
          const shuffled = actors.sort(() => 0.5 - Math.random());
          console.log(`Selecting from pool of ${actors.length} qualified actors`);
          return {
            actor1: shuffled[0],
            actor2: shuffled[1]
          };
        } catch (error) {
          console.error("Error getting random top actors:", error);
          return null;
        }
      }
      /**
       * Get profile path for a specific actor by ID
       * Useful for verifying/updating thumbnails
       */
      async getActorProfilePath(actorId) {
        try {
          const response = await fetch(
            `${this.config.baseUrl}/person/${actorId}?api_key=${this.config.apiKey}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const actor = await response.json();
          return actor.profile_path;
        } catch (error) {
          console.error("Error fetching actor profile path:", error);
          return null;
        }
      }
      /**
       * Verify and repair challenge thumbnails
       * Ensures actor names match their profile paths
       */
      async verifyChallengeThumbnails(challenge) {
        const issues = [];
        let needsUpdate = false;
        let correctStartPath = null;
        let correctEndPath = null;
        try {
          const fetchedStartPath = await this.getActorProfilePath(challenge.startActorId);
          if (fetchedStartPath !== challenge.startActorProfilePath) {
            issues.push(`Start actor ${challenge.startActorName} has incorrect thumbnail`);
            correctStartPath = fetchedStartPath;
            needsUpdate = true;
          }
          const fetchedEndPath = await this.getActorProfilePath(challenge.endActorId);
          if (fetchedEndPath !== challenge.endActorProfilePath) {
            issues.push(`End actor ${challenge.endActorName} has incorrect thumbnail`);
            correctEndPath = fetchedEndPath;
            needsUpdate = true;
          }
          return {
            needsUpdate,
            correctStartPath: needsUpdate ? correctStartPath : void 0,
            correctEndPath: needsUpdate ? correctEndPath : void 0,
            issues
          };
        } catch (error) {
          console.error("Error verifying challenge thumbnails:", error);
          return {
            needsUpdate: false,
            issues: ["Failed to verify thumbnails due to API error"]
          };
        }
      }
    };
    tmdbService = new TMDbService();
  }
});

// server/services/gameLogic.ts
var gameLogic_exports = {};
__export(gameLogic_exports, {
  gameLogicService: () => gameLogicService
});
var GameLogicService, gameLogicService;
var init_gameLogic = __esm({
  "server/services/gameLogic.ts"() {
    "use strict";
    init_tmdb();
    GameLogicService = class {
      async validateConnection(actorId, movieId, previousActorId, nextActorId) {
        try {
          const actorInMovie = await tmdbService.validateActorInMovie(actorId, movieId);
          if (!actorInMovie) {
            return {
              valid: false,
              message: "This actor did not appear in the specified movie."
            };
          }
          if (previousActorId) {
            const previousActorInMovie = await tmdbService.validateActorInMovie(previousActorId, movieId);
            if (!previousActorInMovie) {
              return {
                valid: false,
                message: "The previous actor did not appear in this movie."
              };
            }
          }
          return {
            valid: true,
            message: "Valid connection!"
          };
        } catch (error) {
          console.error("Error validating connection:", error);
          return {
            valid: false,
            message: "Unable to validate connection. Please try again."
          };
        }
      }
      async validateCompleteChain(context) {
        const { startActorId, endActorId, connections } = context;
        if (connections.length === 0) {
          return {
            valid: false,
            message: "No connections provided."
          };
        }
        if (connections.length > 6) {
          return {
            valid: false,
            message: "Too many connections. Maximum is 6 moves."
          };
        }
        try {
          const firstConnection = connections[0];
          const startActorInFirstMovie = await tmdbService.validateActorInMovie(
            startActorId,
            firstConnection.movieId
          );
          if (!startActorInFirstMovie) {
            return {
              valid: false,
              message: "The starting actor did not appear in the first movie."
            };
          }
          for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            const currentValid = await tmdbService.validateActorInMovie(
              connection.actorId,
              connection.movieId
            );
            if (!currentValid) {
              return {
                valid: false,
                message: `Connection ${i + 1}: ${connection.actorName} did not appear in ${connection.movieTitle}.`
              };
            }
            if (i === 0) {
              const startActorInMovie = await tmdbService.validateActorInMovie(
                startActorId,
                connection.movieId
              );
              if (!startActorInMovie) {
                return {
                  valid: false,
                  message: "The chain doesn't start properly with the given starting actor."
                };
              }
            }
            if (i < connections.length - 1) {
              const nextConnection = connections[i + 1];
              const actorInNextMovie = await tmdbService.validateActorInMovie(
                connection.actorId,
                nextConnection.movieId
              );
              if (!actorInNextMovie) {
                return {
                  valid: false,
                  message: `Connection ${i + 1}: ${connection.actorName} did not appear in the next movie ${nextConnection.movieTitle}.`
                };
              }
            }
          }
          const lastConnection = connections[connections.length - 1];
          const endActorInLastMovie = await tmdbService.validateActorInMovie(
            endActorId,
            lastConnection.movieId
          );
          if (!endActorInLastMovie) {
            return {
              valid: false,
              message: "The ending actor did not appear in the final movie."
            };
          }
          const isComplete = true;
          return {
            valid: true,
            completed: isComplete,
            moves: connections.length,
            message: `Congratulations! You've successfully connected the actors in ${connections.length} moves!`
          };
        } catch (error) {
          console.error("Error validating complete chain:", error);
          return {
            valid: false,
            message: "Unable to validate the connection chain. Please try again."
          };
        }
      }
      async generateDailyActors(excludeActorIds = []) {
        try {
          const popularActors = await tmdbService.getPopularActors();
          if (popularActors.length < 2) {
            console.error("Not enough popular actors found");
            return null;
          }
          const availableActors = popularActors.filter(
            (actor) => !excludeActorIds.includes(actor.id)
          );
          if (availableActors.length < 2) {
            console.warn(`Only ${availableActors.length} actors available after excluding ${excludeActorIds.length} actors`);
            const fallbackActors = popularActors.length >= 2 ? popularActors : availableActors;
            const shuffled2 = fallbackActors.sort(() => 0.5 - Math.random());
            const actor12 = shuffled2[0];
            const actor22 = shuffled2[1];
            console.warn(`Using fallback selection: ${actor12.name} and ${actor22.name}`);
            return { actor1: actor12, actor2: actor22 };
          }
          const shuffled = availableActors.sort(() => 0.5 - Math.random());
          const actor1 = shuffled[0];
          const actor2 = shuffled[1];
          console.log(`Selected new actors (excluding ${excludeActorIds.length} previous): ${actor1.name} and ${actor2.name}`);
          return { actor1, actor2 };
        } catch (error) {
          console.error("Error generating daily actors:", error);
          return null;
        }
      }
    };
    gameLogicService = new GameLogicService();
  }
});

// server/services/email.ts
var email_exports = {};
__export(email_exports, {
  EmailService: () => EmailService,
  emailService: () => emailService
});
import nodemailer from "nodemailer";
var EmailService, emailService;
var init_email = __esm({
  "server/services/email.ts"() {
    "use strict";
    EmailService = class {
      transporter = null;
      constructor() {
        this.initializeTransporter();
      }
      initializeTransporter() {
        const emailUser = process.env.GMAIL_USER;
        const emailPassword = process.env.GMAIL_APP_PASSWORD;
        if (!emailUser || !emailPassword) {
          console.warn("Gmail credentials not provided - email notifications disabled");
          console.log("GMAIL_USER:", emailUser ? "provided" : "missing");
          console.log("GMAIL_APP_PASSWORD:", emailPassword ? "provided" : "missing");
          return;
        }
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: emailUser,
            pass: emailPassword
          }
        });
        console.log("Email service initialized with Gmail SMTP");
      }
      async sendContactNotification(submission) {
        if (!this.transporter) {
          console.log("Email service not configured - skipping notification");
          return false;
        }
        try {
          const mailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            // Send to yourself
            subject: `New Contact Form Submission - Six Degrees Game`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${submission.name}</p>
              <p><strong>Email:</strong> ${submission.email}</p>
              <p><strong>Submitted:</strong> ${new Date(submission.createdAt).toLocaleString()}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #374151;">Message:</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${submission.message}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>You can reply directly to this email to respond to ${submission.name}.</p>
              <p>Submission ID: ${submission.id}</p>
            </div>
          </div>
        `,
            replyTo: submission.email
            // Allow easy reply to the user
          };
          await this.transporter.sendMail(mailOptions);
          console.log(`Contact notification sent for submission: ${submission.id}`);
          return true;
        } catch (error) {
          console.error("Failed to send contact notification:", error);
          return false;
        }
      }
      async testConnection() {
        if (!this.transporter) {
          console.log("No transporter available for testing");
          return false;
        }
        try {
          console.log("Testing Gmail SMTP connection...");
          await this.transporter.verify();
          console.log("\u2705 Email service connection verified successfully");
          return true;
        } catch (error) {
          console.error("\u274C Email service connection failed:");
          console.error("Error code:", error.code);
          console.error("Response:", error.response);
          if (error.code === "EAUTH") {
            console.error("\n\u{1F527} Gmail Authentication Fix Required:");
            console.error("1. Go to https://myaccount.google.com");
            console.error("2. Navigate to Security \u2192 2-Step Verification (enable if not active)");
            console.error("3. Go to Security \u2192 App passwords");
            console.error('4. Generate new app password for "Mail"');
            console.error("5. Update GMAIL_APP_PASSWORD secret with the 16-character code");
            console.error("6. Ensure GMAIL_USER is your full Gmail address");
          }
          return false;
        }
      }
    };
    emailService = new EmailService();
  }
});

// server/index.ts
import * as dotenv2 from "dotenv";
import express2 from "express";
import cron from "node-cron";

// server/routes.ts
init_storage();
init_tmdb();
init_gameLogic();
init_db();
init_schema();
import { createServer } from "http";

// server/adminAuth.ts
init_storage();
import bcrypt2 from "bcryptjs";
import { randomBytes } from "crypto";
async function createAdminUser(email, password) {
  const existingUser = await storage.getAdminUserByEmail(email);
  if (existingUser) {
    return existingUser;
  }
  return await storage.createAdminUser({
    email,
    passwordHash: password
    // Will be hashed in storage layer
  });
}
async function authenticateAdmin(email, password) {
  const user = await storage.getAdminUserByEmail(email);
  if (!user) {
    return null;
  }
  const isValid = await bcrypt2.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }
  await storage.updateAdminLastLogin(user.id);
  return user;
}
async function createAdminSession(adminUserId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
  return await storage.createAdminSession({
    adminUserId,
    token,
    expiresAt
  });
}
async function validateAdminSession(token) {
  return await storage.getValidAdminSession(token);
}
async function deleteAdminSession(token) {
  await storage.deleteAdminSession(token);
}

// server/auth.ts
init_db();
init_storage();
init_schema();
import bcrypt3 from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { ZodError } from "zod";
var PostgresSessionStore = connectPg(session);
function setupAuth(app2) {
  app2.use(session({
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-for-development",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    }
  }));
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      const hashedPassword = await bcrypt3.hash(validatedData.password, 12);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      await storage.createUserStats({
        userId: user.id
      });
      req.session.userId = user.id;
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const passwordValid = await bcrypt3.compare(validatedData.password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      const { password, ...userResponse } = user;
      res.status(200).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/user/me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getUserStats(userId);
      if (!stats) {
        const newStats = await storage.createUserStats({ userId });
        return res.json(newStats);
      }
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
var isAuthenticated = (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// server/routes.ts
init_email();

// server/routes/testEmail.ts
init_email();
function registerTestEmailRoutes(app2) {
  app2.get("/api/test-email", async (req, res) => {
    try {
      console.log("Manual email connection test requested...");
      const isConnected = await emailService.testConnection();
      if (isConnected) {
        res.json({
          success: true,
          message: "Gmail SMTP connection successful"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Gmail SMTP connection failed - check server logs for details"
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({
        success: false,
        message: "Error testing email connection",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

// server/routes.ts
function getESTDateString() {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now);
}
function getTomorrowDateString() {
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(tomorrow);
}
var challengeCreationPromise = null;
var lastChallengeDate = null;
async function registerRoutes(app2) {
  setupAuth(app2);
  setTimeout(async () => {
    const { emailService: emailService2 } = await Promise.resolve().then(() => (init_email(), email_exports));
    await emailService2.testConnection();
  }, 2e3);
  app2.get("/theme-samples", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movie Game Theme Samples</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .theme-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-bottom: 40px; }
        .theme-card { border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .theme-header { padding: 20px; text-align: center; color: white; font-weight: bold; font-size: 18px; }
        .theme-content { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .sample-button { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .sample-card { padding: 16px; border-radius: 8px; border: 1px solid; }
        .color-palette { display: flex; gap: 10px; margin-top: 10px; }
        .color-swatch { width: 40px; height: 40px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3); }
        h1 { text-align: center; margin-bottom: 40px; color: #333; font-size: 32px; }
        .theme-name { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        .back-link { display: inline-block; margin-bottom: 20px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">\u2190 Back to Game</a>
        <h1>\u{1F3AC} Movie Game Theme Samples</h1>
        
        <div class="theme-grid">
            <!-- Classic Hollywood Glamour -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #B8860B, #DAA520);">
                    Classic Hollywood Glamour
                    <div class="theme-name">Rich golds and deep blacks</div>
                </div>
                <div class="theme-content" style="background: #0D0D0D; color: #F8F8FF;">
                    <button class="sample-button" style="background: #B8860B; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F7E7CE; color: #0D0D0D; border-color: #B8860B;">
                        \u2713 Valid connection! Ryan Reynolds and Blake Lively both appear in Green Lantern
                    </div>
                    <button class="sample-button" style="background: #36454F; color: #F8F8FF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #B8860B;"></div>
                        <div class="color-swatch" style="background: #F7E7CE;"></div>
                        <div class="color-swatch" style="background: #0D0D0D;"></div>
                        <div class="color-swatch" style="background: #C0C0C0;"></div>
                    </div>
                </div>
            </div>

            <!-- Film Noir Mystery -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #722F37, #8B0000);">
                    Film Noir Mystery
                    <div class="theme-name">Dramatic shadows and vintage cinema</div>
                </div>
                <div class="theme-content" style="background: #1C1C1C; color: #FFFDD0;">
                    <button class="sample-button" style="background: #722F37; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFDD0; color: #1C1C1C; border-color: #8B0000;">
                        \u2713 Valid connection! Humphrey Bogart and Lauren Bacall both appear in The Big Sleep
                    </div>
                    <button class="sample-button" style="background: #2F4F4F; color: #FFFDD0;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #722F37;"></div>
                        <div class="color-swatch" style="background: #8B0000;"></div>
                        <div class="color-swatch" style="background: #1C1C1C;"></div>
                        <div class="color-swatch" style="background: #FFFDD0;"></div>
                    </div>
                </div>
            </div>

            <!-- Hollywood Sign Sunset -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #FF6347, #FF7F50);">
                    Hollywood Sign Sunset
                    <div class="theme-name">Warm California sunset colors</div>
                </div>
                <div class="theme-content" style="background: #483D8B; color: #FFD700;">
                    <button class="sample-button" style="background: #FF6347; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFB6C1; color: #483D8B; border-color: #FF7F50;">
                        \u2713 Valid connection! Leonardo DiCaprio and Margot Robbie both appear in The Wolf of Wall Street
                    </div>
                    <button class="sample-button" style="background: #2F4F4F; color: #FFD700;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #FF6347;"></div>
                        <div class="color-swatch" style="background: #FF7F50;"></div>
                        <div class="color-swatch" style="background: #483D8B;"></div>
                        <div class="color-swatch" style="background: #FFD700;"></div>
                    </div>
                </div>
            </div>

            <!-- Movie Theater Classic -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #DC143C, #B22222);">
                    Movie Theater Classic
                    <div class="theme-name">Red velvet and gold elegance</div>
                </div>
                <div class="theme-content" style="background: #191970; color: #F5F5DC;">
                    <button class="sample-button" style="background: #DC143C; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F5F5DC; color: #191970; border-color: #DAA520;">
                        \u2713 Valid connection! Tom Hanks and Meg Ryan both appear in You've Got Mail
                    </div>
                    <button class="sample-button" style="background: #DAA520; color: #191970;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #DC143C;"></div>
                        <div class="color-swatch" style="background: #DAA520;"></div>
                        <div class="color-swatch" style="background: #191970;"></div>
                        <div class="color-swatch" style="background: #F5F5DC;"></div>
                    </div>
                </div>
            </div>

            <!-- Silver Screen Elegance -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #C0C0C0, #E5E4E2);">
                    Silver Screen Elegance
                    <div class="theme-name">Monochromatic with metallic accents</div>
                </div>
                <div class="theme-content" style="background: #36454F; color: #FFFFFF;">
                    <button class="sample-button" style="background: #C0C0C0; color: #000;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFFFF; color: #36454F; border-color: #C0C0C0;">
                        \u2713 Valid connection! Grace Kelly and Cary Grant both appear in To Catch a Thief
                    </div>
                    <button class="sample-button" style="background: #708090; color: #FFFFFF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #C0C0C0;"></div>
                        <div class="color-swatch" style="background: #E5E4E2;"></div>
                        <div class="color-swatch" style="background: #36454F;"></div>
                        <div class="color-swatch" style="background: #708090;"></div>
                    </div>
                </div>
            </div>

            <!-- Modern Hollywood -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #0080FF, #00BFFF);">
                    Modern Hollywood
                    <div class="theme-name">Contemporary cinema with neon accents</div>
                </div>
                <div class="theme-content" style="background: #2F4F4F; color: #FFFFFF;">
                    <button class="sample-button" style="background: #0080FF; color: white;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #39FF14; color: #2F4F4F; border-color: #FF1493;">
                        \u2713 Valid connection! Chris Evans and Scarlett Johansson both appear in The Avengers
                    </div>
                    <button class="sample-button" style="background: #FF1493; color: white;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #0080FF;"></div>
                        <div class="color-swatch" style="background: #00BFFF;"></div>
                        <div class="color-swatch" style="background: #FF1493;"></div>
                        <div class="color-swatch" style="background: #39FF14;"></div>
                    </div>
                </div>
            </div>

            <!-- Oscar Night -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #FFD700, #D4A942);">
                    Oscar Night
                    <div class="theme-name">Awards ceremony elegance</div>
                </div>
                <div class="theme-content" style="background: #191970; color: #F8F8FF;">
                    <button class="sample-button" style="background: #FFD700; color: #191970;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #F8F8FF; color: #191970; border-color: #E8B4B8;">
                        \u2713 Valid connection! Meryl Streep and Anne Hathaway both appear in The Devil Wears Prada
                    </div>
                    <button class="sample-button" style="background: #000080; color: #F8F8FF;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #FFD700;"></div>
                        <div class="color-swatch" style="background: #D4A942;"></div>
                        <div class="color-swatch" style="background: #191970;"></div>
                        <div class="color-swatch" style="background: #E8B4B8;"></div>
                    </div>
                </div>
            </div>

            <!-- Vintage Cinema -->
            <div class="theme-card">
                <div class="theme-header" style="background: linear-gradient(135deg, #704214, #D2691E);">
                    Vintage Cinema
                    <div class="theme-name">Warm sepia and earth tones</div>
                </div>
                <div class="theme-content" style="background: #355E3B; color: #FFFDD0;">
                    <button class="sample-button" style="background: #704214; color: #FFFDD0;">Get Daily Hint</button>
                    <div class="sample-card" style="background: #FFFDD0; color: #355E3B; border-color: #D2691E;">
                        \u2713 Valid connection! Clark Gable and Vivien Leigh both appear in Gone with the Wind
                    </div>
                    <button class="sample-button" style="background: #6B8E23; color: #FFFDD0;">Validate Connection</button>
                    <div class="color-palette">
                        <div class="color-swatch" style="background: #704214;"></div>
                        <div class="color-swatch" style="background: #D2691E;"></div>
                        <div class="color-swatch" style="background: #355E3B;"></div>
                        <div class="color-swatch" style="background: #FFFDD0;"></div>
                    </div>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #666; font-size: 14px;">
            <p>Each theme shows sample buttons, validation feedback, and color palette</p>
            <p>Colors can be adjusted based on your preferences</p>
        </div>
    </div>
</body>
</html>
    `);
  });
  app2.post("/api/daily-challenge", async (req, res) => {
    try {
      const { date, forceNew } = req.body;
      const today = date || getESTDateString();
      if (forceNew) {
        console.log(`Force generating new challenge for ${today}`);
        const existingChallenge = await storage.getDailyChallenge(today);
        if (existingChallenge) {
          console.log(`Deleting existing challenge: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
          await storage.deleteDailyChallenge(today);
        }
        let excludeActorIds = [];
        try {
          const yesterdayDate = /* @__PURE__ */ new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toISOString().split("T")[0];
          const previousChallenge = await storage.getDailyChallenge(yesterday);
          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
          }
        } catch (exclusionError) {
          console.log("Could not check for actors to exclude, proceeding with normal generation");
        }
        const actors = await gameLogicService.generateDailyActors(excludeActorIds);
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }
        const newChallenge = await storage.createDailyChallenge({
          date: today,
          status: "active",
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          startActorProfilePath: actors.actor1.profile_path,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: actors.actor2.profile_path,
          hintsUsed: 0
        });
        console.log(`Force-created new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
        return res.json(newChallenge);
      }
      let challenge = await storage.getDailyChallenge(today);
      if (!challenge) {
        let excludeActorIds = [];
        try {
          const yesterdayDate = /* @__PURE__ */ new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toISOString().split("T")[0];
          const previousChallenge = await storage.getDailyChallenge(yesterday);
          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
          }
        } catch (exclusionError) {
          console.log("Could not check for actors to exclude, proceeding with normal generation");
        }
        const actors = await gameLogicService.generateDailyActors(excludeActorIds);
        if (!actors) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }
        challenge = await storage.createDailyChallenge({
          date: today,
          status: "active",
          startActorId: actors.actor1.id,
          startActorName: actors.actor1.name,
          startActorProfilePath: actors.actor1.profile_path,
          endActorId: actors.actor2.id,
          endActorName: actors.actor2.name,
          endActorProfilePath: actors.actor2.profile_path,
          hintsUsed: 0
        });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error in POST daily challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/daily-challenge", async (req, res) => {
    try {
      const today = getESTDateString();
      let challenge;
      try {
        challenge = await withRetry(() => storage.getDailyChallenge(today), 5);
      } catch (dbError) {
        console.error("Database error when fetching challenge:", dbError);
        return res.status(503).json({
          message: "Database temporarily unavailable. Please refresh in a moment.",
          retry: true
        });
      }
      if (!challenge) {
        console.log(`No challenge found for ${today}, checking for pending 'next' challenge to promote...`);
        try {
          const nextChallenge = await storage.getChallengeByStatus("next");
          if (nextChallenge) {
            console.log(`Found pending 'next' challenge: ${nextChallenge.startActorName} to ${nextChallenge.endActorName} - promoting to active`);
            const activeChallenge = await storage.getChallengeByStatus("active");
            if (activeChallenge) {
              await storage.deleteDailyChallenge(activeChallenge.date);
              console.log(`Archived old active challenge: ${activeChallenge.startActorName} to ${activeChallenge.endActorName}`);
            }
            await storage.deleteDailyChallenge(nextChallenge.date);
            challenge = await storage.createDailyChallenge({
              date: today,
              status: "active",
              startActorId: nextChallenge.startActorId,
              startActorName: nextChallenge.startActorName,
              startActorProfilePath: nextChallenge.startActorProfilePath,
              endActorId: nextChallenge.endActorId,
              endActorName: nextChallenge.endActorName,
              endActorProfilePath: nextChallenge.endActorProfilePath,
              hintsUsed: 0
            });
            console.log(`Successfully promoted 'next' to 'active': ${challenge.startActorName} to ${challenge.endActorName} for ${today}`);
            const tomorrow = getTomorrowDateString();
            try {
              const excludeActorIds = [challenge.startActorId, challenge.endActorId];
              const actors = await gameLogicService.generateDailyActors(excludeActorIds);
              if (actors) {
                await storage.createDailyChallenge({
                  date: tomorrow,
                  status: "next",
                  startActorId: actors.actor1.id,
                  startActorName: actors.actor1.name,
                  startActorProfilePath: actors.actor1.profile_path,
                  endActorId: actors.actor2.id,
                  endActorName: actors.actor2.name,
                  endActorProfilePath: actors.actor2.profile_path,
                  hintsUsed: 0
                });
                console.log(`Generated new 'next' challenge for ${tomorrow}: ${actors.actor1.name} to ${actors.actor2.name}`);
              }
            } catch (nextGenError) {
              console.error("Error generating next challenge:", nextGenError);
            }
          }
        } catch (promotionError) {
          console.error("Error checking/promoting next challenge:", promotionError);
        }
      }
      if (!challenge) {
        console.log(`No challenge found for ${today}, generating new challenge...`);
        if (lastChallengeDate !== today) {
          challengeCreationPromise = null;
          lastChallengeDate = today;
        }
        if (!challengeCreationPromise) {
          challengeCreationPromise = (async () => {
            try {
              const existingChallenge = await withRetry(() => storage.getDailyChallenge(today), 5);
              if (existingChallenge) {
                console.log(`Challenge was created by another request: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
                return existingChallenge;
              }
              let excludeActorIds = [];
              try {
                const yesterdayDate = /* @__PURE__ */ new Date();
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                const yesterday = yesterdayDate.toISOString().split("T")[0];
                const previousChallenge = await storage.getDailyChallenge(yesterday);
                if (previousChallenge) {
                  excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
                  console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
                }
              } catch (exclusionError) {
                console.log("Could not check for actors to exclude, proceeding with normal generation");
              }
              const actors = await gameLogicService.generateDailyActors(excludeActorIds);
              if (!actors) {
                throw new Error("Unable to generate daily challenge");
              }
              const newChallenge = await withRetry(() => storage.createDailyChallenge({
                date: today,
                status: "active",
                startActorId: actors.actor1.id,
                startActorName: actors.actor1.name,
                startActorProfilePath: actors.actor1.profile_path,
                endActorId: actors.actor2.id,
                endActorName: actors.actor2.name,
                endActorProfilePath: actors.actor2.profile_path,
                hintsUsed: 0
              }), 5);
              console.log(`Created new challenge: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
              return newChallenge;
            } finally {
              challengeCreationPromise = null;
            }
          })();
        }
        try {
          challenge = await challengeCreationPromise;
        } catch (creationError) {
          console.error("Error creating new challenge:", creationError);
          return res.status(503).json({
            message: "Unable to generate daily challenge due to database issues. Please refresh in a moment.",
            retry: true
          });
        }
        if (!challenge) {
          return res.status(500).json({ message: "Unable to generate daily challenge" });
        }
      } else {
        console.log(`Found existing challenge: ${challenge.startActorName} to ${challenge.endActorName} (hints: ${challenge.hintsUsed || 0})`);
        try {
          const verification = await tmdbService.verifyChallengeThumbnails({
            id: challenge.id,
            startActorId: challenge.startActorId,
            startActorName: challenge.startActorName,
            startActorProfilePath: challenge.startActorProfilePath,
            endActorId: challenge.endActorId,
            endActorName: challenge.endActorName,
            endActorProfilePath: challenge.endActorProfilePath
          });
          if (verification.needsUpdate) {
            console.log(`Detected thumbnail issues for challenge ${challenge.id}: ${verification.issues.join(", ")}`);
            const updates = {};
            if (verification.correctStartPath !== void 0) {
              updates.startActorProfilePath = verification.correctStartPath;
            }
            if (verification.correctEndPath !== void 0) {
              updates.endActorProfilePath = verification.correctEndPath;
            }
            if (Object.keys(updates).length > 0) {
              challenge = await storage.updateDailyChallenge(challenge.id, updates);
              console.log(`Auto-repaired thumbnails for challenge ${challenge.id}`);
            }
          }
        } catch (verificationError) {
          console.log(`Thumbnail verification failed (non-critical): ${verificationError}`);
        }
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error getting daily challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/search/actors", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.json([]);
      }
      const actors = await tmdbService.searchActors(query);
      res.json(actors);
    } catch (error) {
      console.error("Error searching actors:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/search/movies", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.json([]);
      }
      const movies = await tmdbService.searchMovies(query);
      try {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);
        if (challenge) {
          const queryLower = query.toLowerCase().trim();
          const existingIds = new Set(movies.map((m) => m.id));
          const [startMovies, endMovies] = await Promise.all([
            tmdbService.getActorMovies(challenge.startActorId),
            tmdbService.getActorMovies(challenge.endActorId)
          ]);
          const allActorMovies = [...startMovies, ...endMovies];
          const matchingMovies = allActorMovies.filter((movie) => {
            if (existingIds.has(movie.id)) return false;
            const titleLower = movie.title.toLowerCase();
            const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
            return queryWords.every((word) => titleLower.includes(word));
          });
          const uniqueMatches = matchingMovies.filter(
            (movie, index2, self) => self.findIndex((m) => m.id === movie.id) === index2
          );
          movies.unshift(...uniqueMatches);
        }
      } catch (filmographyError) {
        console.log("Filmography search enhancement skipped:", filmographyError);
      }
      res.json(movies);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/validate-connection", async (req, res) => {
    try {
      const { actorId, movieId, previousActorId, nextActorId } = req.body;
      if (!actorId || !movieId) {
        return res.status(400).json({ message: "Actor ID and Movie ID are required" });
      }
      const result = await gameLogicService.validateConnection(
        actorId,
        movieId,
        previousActorId,
        nextActorId
      );
      res.json(result);
    } catch (error) {
      console.error("Error validating connection:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/daily-challenge/regenerate", async (req, res) => {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await storage.deleteDailyChallenge(today);
      console.log(`Challenge for ${today} deleted, hints will reset for new challenge`);
      res.json({ message: "Challenge cleared, next request will generate a new one" });
    } catch (error) {
      console.error("Error clearing challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/daily-challenge/hints", async (req, res) => {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const challenge = await storage.getDailyChallenge(today);
      if (!challenge) {
        return res.status(404).json({ message: "No challenge found" });
      }
      const result = {
        hintsUsed: challenge.hintsUsed || 0,
        startActorHint: null,
        endActorHint: null
      };
      if (challenge.startActorHint) {
        try {
          result.startActorHint = {
            actorName: challenge.startActorName,
            movies: JSON.parse(challenge.startActorHint)
          };
        } catch (error) {
          console.error("Error parsing start actor hint:", error);
        }
      }
      if (challenge.endActorHint) {
        try {
          result.endActorHint = {
            actorName: challenge.endActorName,
            movies: JSON.parse(challenge.endActorHint)
          };
        } catch (error) {
          console.error("Error parsing end actor hint:", error);
        }
      }
      res.json(result);
    } catch (error) {
      console.error("Error getting stored hints:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/daily-challenge/hint", async (req, res) => {
    try {
      const { actorType } = req.body;
      if (!actorType || actorType !== "start" && actorType !== "end") {
        return res.status(400).json({ message: "Actor type must be 'start' or 'end'" });
      }
      const today = getESTDateString();
      const challenge = await storage.getDailyChallenge(today);
      console.log(`Hint request for ${today}, challenge found: ${challenge ? "YES" : "NO"}`);
      if (challenge) {
        console.log(`Challenge: ${challenge.startActorName} to ${challenge.endActorName} (hints: ${challenge.hintsUsed || 0}) [ID: ${challenge.id}]`);
      }
      if (!challenge) {
        return res.status(404).json({ message: "No challenge found for today" });
      }
      const actorId = actorType === "start" ? challenge.startActorId : challenge.endActorId;
      const actorName = actorType === "start" ? challenge.startActorName : challenge.endActorName;
      const movies = await tmdbService.getActorHintMovies(actorId, 5);
      const existingHintField = actorType === "start" ? challenge.startActorHint : challenge.endActorHint;
      let updatedChallenge = challenge;
      if (!existingHintField) {
        const hintContent = JSON.stringify(movies);
        updatedChallenge = await storage.updateDailyChallengeHints(
          challenge.id,
          (challenge.hintsUsed || 0) + 1,
          actorType === "start" ? hintContent : void 0,
          actorType === "end" ? hintContent : void 0
        );
      }
      res.json({
        actorName,
        movies,
        hintsRemaining: Math.max(0, 2 - (updatedChallenge.hintsUsed || 0))
      });
    } catch (error) {
      console.error("Error getting hint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/validate-game", async (req, res) => {
    let validationResult = null;
    let connections = [];
    try {
      const parseResult = gameConnectionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }
      connections = parseResult.data.connections;
      const { startActorId, endActorId } = parseResult.data;
      try {
        validationResult = await gameLogicService.validateCompleteChain({
          startActorId,
          endActorId,
          connections
        });
      } catch (validationError) {
        console.error("Validation error:", validationError);
        validationResult = {
          valid: false,
          completed: false,
          message: "Validation failed due to an error"
        };
      }
      try {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);
        if (challenge) {
          await storage.createGameAttempt({
            challengeId: challenge.id,
            moves: connections.length,
            completed: validationResult.completed || false,
            connections: JSON.stringify(connections)
          });
        }
      } catch (dbError) {
        console.error("Error saving game attempt:", dbError);
      }
      res.json(validationResult);
    } catch (error) {
      console.error("Error validating game:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/analytics", async (req, res) => {
    try {
      let challengeId = req.query.challengeId;
      if (!challengeId) {
        const today = getESTDateString();
        const challenge = await storage.getDailyChallenge(today);
        if (!challenge) {
          return res.status(404).json({ message: "No challenge found for today" });
        }
        challengeId = challenge.id;
      }
      const stats = await storage.getChallengeAnalytics(challengeId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });
  app2.get("/api/user/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.claims) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userData = {
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.given_name,
        lastName: user.claims.family_name,
        profileImageUrl: user.claims.picture
      };
      res.json(userData);
    } catch (error) {
      console.error("Error getting user info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user/stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userId = user.claims.sub;
      const completions = await storage.getUserCompletions(userId);
      const moveDistribution = await storage.getUserMoveDistribution(userId);
      const totalChallenges = completions.length;
      const completedChallenges = completions.filter((c) => c.moves <= 6).length;
      const averageMoves = completions.length > 0 ? Math.round(completions.reduce((sum, c) => sum + c.moves, 0) / completions.length * 10) / 10 : 0;
      const bestScore = completions.length > 0 ? Math.min(...completions.map((c) => c.moves)) : null;
      res.json({
        totalChallenges,
        completedChallenges,
        averageMoves,
        bestScore,
        moveDistribution
      });
    } catch (error) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user/incomplete-challenges", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userId = user.claims.sub;
      const challenges = [];
      for (let i = 1; i <= 5; i++) {
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const challenge = await storage.getDailyChallenge(dateStr);
        if (challenge) {
          const completion = await storage.getUserChallengeCompletion(userId, challenge.id);
          if (!completion) {
            challenges.push(challenge);
          }
        }
      }
      res.json(challenges);
    } catch (error) {
      console.error("Error getting incomplete challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/movie/:id/credits", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      const actors = await tmdbService.getMovieCredits(movieId);
      res.json(actors);
    } catch (error) {
      console.error("Error getting movie credits:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/actor/:id/movies", async (req, res) => {
    try {
      const actorId = parseInt(req.params.id);
      if (isNaN(actorId)) {
        return res.status(400).json({ message: "Invalid actor ID" });
      }
      const movies = await tmdbService.getActorMovies(actorId);
      res.json(movies);
    } catch (error) {
      console.error("Error getting actor movies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/verify-thumbnails", async (req, res) => {
    try {
      const { challengeId } = req.body;
      let challenge;
      if (challengeId) {
        challenge = await storage.getDailyChallengeById(challengeId);
      } else {
        const today = getESTDateString();
        challenge = await storage.getDailyChallenge(today);
      }
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      console.log(`Verifying thumbnails for challenge: ${challenge.startActorName} to ${challenge.endActorName}`);
      const verification = await tmdbService.verifyChallengeThumbnails({
        id: challenge.id,
        startActorId: challenge.startActorId,
        startActorName: challenge.startActorName,
        startActorProfilePath: challenge.startActorProfilePath,
        endActorId: challenge.endActorId,
        endActorName: challenge.endActorName,
        endActorProfilePath: challenge.endActorProfilePath
      });
      if (verification.needsUpdate) {
        const updates = {};
        if (verification.correctStartPath !== void 0) {
          updates.startActorProfilePath = verification.correctStartPath;
        }
        if (verification.correctEndPath !== void 0) {
          updates.endActorProfilePath = verification.correctEndPath;
        }
        if (Object.keys(updates).length > 0) {
          await storage.updateDailyChallenge(challenge.id, updates);
          console.log(`Updated thumbnails for challenge ${challenge.id}:`, updates);
        }
        return res.json({
          message: "Thumbnails verified and updated",
          issues: verification.issues,
          updates,
          success: true
        });
      } else {
        return res.json({
          message: "Thumbnails are correct",
          success: true
        });
      }
    } catch (error) {
      console.error("Error verifying thumbnails:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/generate-challenge", async (req, res) => {
    try {
      let excludeActorIds = [];
      try {
        const yesterdayDate = /* @__PURE__ */ new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split("T")[0];
        const previousChallenge = await storage.getDailyChallenge(yesterday);
        if (previousChallenge) {
          excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
          console.log(`Excluding actors from yesterday's challenge: ${previousChallenge.startActorName} and ${previousChallenge.endActorName}`);
        }
      } catch (exclusionError) {
        console.log("Could not check for actors to exclude, proceeding with normal generation");
      }
      const actors = await gameLogicService.generateDailyActors(excludeActorIds);
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate challenge" });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const challenge = await storage.createDailyChallenge({
        date: today,
        status: "active",
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        startActorProfilePath: actors.actor1.profile_path,
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: actors.actor2.profile_path
      });
      res.json(challenge);
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  const requireAdminAuth = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      const session2 = await validateAdminSession(token);
      if (!session2) {
        return res.status(401).json({ message: "Invalid or expired admin session" });
      }
      req.adminSession = session2;
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  app2.post("/api/admin/setup", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (email !== "qturner17@gmail.com") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const user = await createAdminUser(email, password);
      res.json({ message: "Admin user created successfully", userId: user.id });
    } catch (error) {
      console.error("Admin setup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await authenticateAdmin(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const session2 = await createAdminSession(user.id);
      res.json({
        message: "Login successful",
        token: session2.token,
        expiresAt: session2.expiresAt
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/logout", requireAdminAuth, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token) {
        await deleteAdminSession(token);
      }
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/admin/reset-challenge", requireAdminAuth, async (req, res) => {
    try {
      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();
      await storage.deleteDailyChallenge(today);
      console.log(`Admin reset challenge for ${today}`);
      const nextChallenge = await storage.getChallengeByStatus("next");
      if (nextChallenge) {
        console.log(`Next challenge (${nextChallenge.startActorName} to ${nextChallenge.endActorName}) will be promoted to active`);
        const excludeActorIds = [nextChallenge.startActorId, nextChallenge.endActorId];
        const actors = await gameLogicService.generateDailyActors(excludeActorIds);
        if (actors) {
          const existingTomorrow = await storage.getDailyChallenge(tomorrow);
          if (existingTomorrow) {
            await storage.deleteDailyChallenge(tomorrow);
          }
          const newNextChallenge = await storage.createDailyChallenge({
            date: tomorrow,
            status: "next",
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0
          });
          console.log(`Generated new next challenge: ${newNextChallenge.startActorName} to ${newNextChallenge.endActorName}`);
        }
      }
      res.json({ message: "Daily challenge reset successfully, new next challenge generated" });
    } catch (error) {
      console.error("Admin challenge reset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/set-challenge", requireAdminAuth, async (req, res) => {
    try {
      const { startActorId, startActorName, endActorId, endActorName } = req.body;
      if (!startActorId || !startActorName || !endActorId || !endActorName) {
        return res.status(400).json({ message: "All actor fields are required" });
      }
      const tomorrow = getTomorrowDateString();
      const existingNext = await storage.getChallengeByStatus("next");
      if (existingNext) {
        console.log(`Deleting existing next challenge: ${existingNext.startActorName} to ${existingNext.endActorName}`);
        await storage.deleteDailyChallenge(existingNext.date);
      }
      const challenge = await storage.createDailyChallenge({
        date: tomorrow,
        status: "next",
        startActorId,
        startActorName,
        endActorId,
        endActorName
      });
      console.log(`Admin set custom NEXT challenge for ${tomorrow}: ${startActorName} to ${endActorName}`);
      res.json({ message: "Custom next challenge set successfully - will become active tomorrow", challenge });
    } catch (error) {
      console.error("Admin set challenge error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/next-challenge", requireAdminAuth, async (req, res) => {
    try {
      const tomorrow = getTomorrowDateString();
      console.log(`Looking for next daily challenge for date: ${tomorrow}`);
      const challenge = await storage.getDailyChallenge(tomorrow);
      if (!challenge || challenge.status !== "next") {
        console.log(`No next challenge found for ${tomorrow}, current status: ${challenge?.status || "not found"}`);
        return res.status(404).json({ message: "No challenge scheduled for tomorrow" });
      }
      console.log(`Found next challenge: ${challenge.startActorName} to ${challenge.endActorName}`);
      res.json(challenge);
    } catch (error) {
      console.error("Error getting next challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/reset-next-challenge", requireAdminAuth, async (req, res) => {
    try {
      const tomorrow = getTomorrowDateString();
      const existingChallenge = await storage.getDailyChallenge(tomorrow);
      if (existingChallenge) {
        console.log(`Deleting existing next challenge: ${existingChallenge.startActorName} to ${existingChallenge.endActorName}`);
        await storage.deleteDailyChallenge(tomorrow);
      }
      const actors = await gameLogicService.generateDailyActors();
      if (!actors) {
        return res.status(500).json({ message: "Unable to generate next challenge" });
      }
      const newChallenge = await storage.createDailyChallenge({
        date: tomorrow,
        status: "next",
        startActorId: actors.actor1.id,
        startActorName: actors.actor1.name,
        startActorProfilePath: actors.actor1.profile_path,
        endActorId: actors.actor2.id,
        endActorName: actors.actor2.name,
        endActorProfilePath: actors.actor2.profile_path,
        hintsUsed: 0
      });
      console.log(`Created new next challenge: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
      res.json({ message: "Next challenge reset successfully", challenge: newChallenge });
    } catch (error) {
      console.error("Error resetting tomorrow's challenge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const parseResult = insertContactSubmissionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }
      const submission = await storage.createContactSubmission(parseResult.data);
      emailService.sendContactNotification(submission).catch((error) => {
        console.error("Email notification failed:", error);
      });
      res.json({
        message: "Contact submission received successfully",
        id: submission.id
      });
    } catch (error) {
      console.error("Error creating contact submission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/contacts", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    const adminUser = await validateAdminSession(token);
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      const submissions = await storage.getContactSubmissions();
      const unreadSubmissions = submissions.filter((submission) => submission.status === "new");
      res.json(unreadSubmissions);
    } catch (error) {
      console.error("Error getting contact submissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/admin/contacts/:id", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    const adminUser = await validateAdminSession(token);
    if (!adminUser) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || typeof status !== "string") {
        return res.status(400).json({ message: "Status is required" });
      }
      await storage.updateContactSubmissionStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating contact submission status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/analytics/track-visit", async (req, res) => {
    try {
      const visitorData = req.body;
      if (!visitorData.sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      try {
        const session2 = await withRetry(() => storage.trackVisitor({
          ...visitorData,
          ipAddress: req.ip || req.connection.remoteAddress,
          converted: false,
          bounced: true,
          // Will be updated to false if user engages
          sessionDuration: 0
        }), 3);
        res.json({ sessionId: session2.id, message: "Visit tracked" });
      } catch (dbError) {
        console.error("Database error tracking visitor:", dbError);
        res.json({ sessionId: visitorData.sessionId, message: "Visit tracking temporarily unavailable" });
      }
    } catch (error) {
      console.error("Error tracking visit:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/analytics/referrals", async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const analytics = await storage.getReferralAnalytics(days);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching referral analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/analytics/track-conversion", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      await storage.updateVisitorSession(sessionId, {
        converted: true,
        bounced: false
      });
      res.json({ message: "Conversion tracked" });
    } catch (error) {
      console.error("Error tracking conversion:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/debug/auth-status", async (req, res) => {
    try {
      const user = req.user;
      const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      const repolyDomain = process.env.REPLIT_DOMAINS || "not-set";
      res.json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAuthenticated: !!user,
        user: user ? {
          sub: user.claims?.sub,
          email: user.claims?.email,
          name: `${user.claims?.given_name} ${user.claims?.family_name}`.trim()
        } : null,
        hasGoogleCredentials,
        repolyDomain,
        sessionID: req.sessionID,
        environment: process.env.NODE_ENV || "unknown"
      });
    } catch (error) {
      res.status(500).json({
        error: "Debug endpoint failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/debug/session-test", (req, res) => {
    console.log(`\u{1F9EA} Session test - Session ID: ${req.sessionID}`);
    console.log(`\u{1F9EA} Session exists:`, !!req.session);
    console.log(`\u{1F9EA} Session contents:`, req.session);
    if (!req.session) {
      return res.json({ error: "No session found", sessionId: req.sessionID });
    }
    req.session.testValue = "test-" + Date.now();
    req.session.save((err) => {
      if (err) {
        console.error(`\u{1F9EA} Session save error:`, err);
        return res.json({ error: "Session save failed", details: err.message });
      }
      console.log(`\u{1F9EA} Session saved successfully`);
      res.json({
        sessionId: req.sessionID,
        testValue: req.session.testValue,
        success: true
      });
    });
  });
  app2.get("/api/debug/session-retrieve", (req, res) => {
    console.log(`\u{1F9EA} Session retrieve - Session ID: ${req.sessionID}`);
    console.log(`\u{1F9EA} Session exists:`, !!req.session);
    console.log(`\u{1F9EA} Session contents:`, req.session);
    res.json({
      sessionId: req.sessionID,
      testValue: req.session ? req.session.testValue : null,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
  });
  app2.get("/api/debug/test-callback", async (req, res) => {
    try {
      console.log("\u{1F527} Testing OAuth callback with mock parameters");
      const mockCallbackParams = {
        code: "test-auth-code",
        state: "test-state",
        scope: "openid email profile"
      };
      console.log("\u{1F527} Mock callback params:", mockCallbackParams);
      res.json({
        message: "OAuth callback test initiated",
        mockParams: mockCallbackParams,
        note: "Check server logs for detailed OAuth callback processing"
      });
    } catch (error) {
      res.status(500).json({
        error: "OAuth callback test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/user-challenge-completion", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const parseResult = insertUserChallengeCompletionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: parseResult.error.errors
        });
      }
      const existingCompletion = await storage.getUserChallengeCompletion(userId, parseResult.data.challengeId);
      if (existingCompletion) {
        return res.status(400).json({ message: "Challenge already completed" });
      }
      const completion = await storage.createUserChallengeCompletion({
        ...parseResult.data,
        userId
      });
      const currentStats = await storage.getUserStats(userId);
      if (currentStats) {
        const moves = parseResult.data.moves;
        const statUpdates = {
          totalCompletions: (currentStats.totalCompletions || 0) + 1,
          totalMoves: (currentStats.totalMoves || 0) + moves
        };
        if (moves === 1) statUpdates.completionsAt1Move = (currentStats.completionsAt1Move || 0) + 1;
        else if (moves === 2) statUpdates.completionsAt2Moves = (currentStats.completionsAt2Moves || 0) + 1;
        else if (moves === 3) statUpdates.completionsAt3Moves = (currentStats.completionsAt3Moves || 0) + 1;
        else if (moves === 4) statUpdates.completionsAt4Moves = (currentStats.completionsAt4Moves || 0) + 1;
        else if (moves === 5) statUpdates.completionsAt5Moves = (currentStats.completionsAt5Moves || 0) + 1;
        else if (moves === 6) statUpdates.completionsAt6Moves = (currentStats.completionsAt6Moves || 0) + 1;
        await storage.updateUserStats(userId, statUpdates);
      }
      res.status(201).json(completion);
    } catch (error) {
      console.error("Error creating user challenge completion:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user/recent-challenges", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const recentChallenges = await storage.getRecentChallengesForUser(userId, 5);
      res.json(recentChallenges);
    } catch (error) {
      console.error("Error getting recent challenges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/user/move-distribution", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const moveDistribution = await storage.getUserMoveDistribution(userId);
      res.json(moveDistribution);
    } catch (error) {
      console.error("Error getting user move distribution:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/cron/reset", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      console.log("\u{1F680} Vercel Cron trigger: Daily challenge reset initiated");
      const today = getESTDateString();
      const tomorrow = getTomorrowDateString();
      const nextChallenge = await storage.getChallengeByStatus("next");
      if (nextChallenge) {
        console.log(`Promoting next challenge: ${nextChallenge.startActorName} to ${nextChallenge.endActorName}`);
        const activeChallenge = await storage.getChallengeByStatus("active");
        if (activeChallenge) {
          await storage.deleteDailyChallenge(activeChallenge.date);
        }
        await storage.deleteDailyChallenge(nextChallenge.date);
        await storage.createDailyChallenge({
          date: today,
          status: "active",
          startActorId: nextChallenge.startActorId,
          startActorName: nextChallenge.startActorName,
          startActorProfilePath: nextChallenge.startActorProfilePath,
          endActorId: nextChallenge.endActorId,
          endActorName: nextChallenge.endActorName,
          endActorProfilePath: nextChallenge.endActorProfilePath,
          hintsUsed: 0
        });
      } else {
        console.log("No next challenge found, generating new one for today");
        const actors = await gameLogicService.generateDailyActors([]);
        if (actors) {
          await storage.createDailyChallenge({
            date: today,
            status: "active",
            startActorId: actors.actor1.id,
            startActorName: actors.actor1.name,
            startActorProfilePath: actors.actor1.profile_path,
            endActorId: actors.actor2.id,
            endActorName: actors.actor2.name,
            endActorProfilePath: actors.actor2.profile_path,
            hintsUsed: 0
          });
        }
      }
      const currentActive = await storage.getChallengeByStatus("active");
      if (currentActive) {
        const excludeIds = [currentActive.startActorId, currentActive.endActorId];
        const nextActors = await gameLogicService.generateDailyActors(excludeIds);
        if (nextActors) {
          await storage.createDailyChallenge({
            date: tomorrow,
            status: "next",
            startActorId: nextActors.actor1.id,
            startActorName: nextActors.actor1.name,
            startActorProfilePath: nextActors.actor1.profile_path,
            endActorId: nextActors.actor2.id,
            endActorName: nextActors.actor2.name,
            endActorProfilePath: nextActors.actor2.profile_path,
            hintsUsed: 0
          });
        }
      }
      res.json({ message: "Daily challenge reset completed successfully", date: today });
    } catch (error) {
      console.error("Cron reset error:", error);
      res.status(500).json({ message: "Failed to reset daily challenge", error: String(error) });
    }
  });
  registerTestEmailRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const publicPath = path2.resolve(import.meta.dirname);
  const rootPublicPath = path2.resolve(import.meta.dirname, "..", "dist");
  let actualPublicPath = publicPath;
  if (!fs.existsSync(path2.resolve(actualPublicPath, "index.html"))) {
    if (fs.existsSync(path2.resolve(rootPublicPath, "index.html"))) {
      actualPublicPath = rootPublicPath;
    } else {
      throw new Error(
        `Could not find index.html in: ${actualPublicPath} or ${rootPublicPath}, make sure to build the client first`
      );
    }
  }
  log(`Serving static files from: ${actualPublicPath}`);
  app2.use(express.static(actualPublicPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(actualPublicPath, "index.html"));
  });
}

// server/index.ts
init_storage();
init_db();
dotenv2.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
var initServer = async () => {
  let dbHealthy = false;
  try {
    log("Checking database connection...");
    dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      log("\u2705 Database connection verified successfully");
    } else {
      log("\u26A0\uFE0F Database connection failed, but starting server anyway");
    }
  } catch (error) {
    log(`\u26A0\uFE0F Database health check error: ${error?.message || "Unknown error"}, but starting server anyway`);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  return { app, server, dbHealthy };
};
var serverPromise = initServer();
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  (async () => {
    const { server, dbHealthy } = await serverPromise;
    const port = parseInt(process.env.PORT || "5001", 10);
    server.listen({
      port,
      host: "0.0.0.0"
    }, async () => {
      log(`serving on port ${port}`);
      setupDailyChallengeReset(port);
      if (dbHealthy) {
        try {
          const today = getESTDateString2();
          const allActive = await storage.getAllChallengesByStatus("active");
          const orphaned = allActive.filter((c) => c.date !== today);
          if (orphaned.length > 0) {
            log(`\u{1F9F9} Found ${orphaned.length} orphaned active challenge(s) from missed resets, cleaning up...`);
            for (const challenge of orphaned) {
              await storage.deleteDailyChallenge(challenge.date);
              log(`   Removed orphaned: ${challenge.startActorName} to ${challenge.endActorName} (${challenge.date})`);
            }
          }
        } catch (cleanupError) {
          log(`\u26A0\uFE0F Error during orphaned challenge cleanup: ${cleanupError}`);
        }
      }
    });
  })();
}
var index_default = app;
function setupDailyChallengeReset(port) {
  cron.schedule("0 0 * * *", async () => {
    try {
      log("Daily challenge reset triggered - transitioning next to active and generating new next");
      const today = getESTDateString2();
      const tomorrow = getTomorrowDateString2();
      let storage2;
      let retryCount = 0;
      const maxRetries = 5;
      let promotionSuccessful = false;
      while (retryCount < maxRetries && !promotionSuccessful) {
        try {
          storage2 = (await Promise.resolve().then(() => (init_storage(), storage_exports))).storage;
          const nextChallenge = await storage2.getChallengeByStatus("next");
          if (nextChallenge) {
            log(`Found next challenge to promote: ${nextChallenge.startActorName} to ${nextChallenge.endActorName}`);
            const currentChallenge = await storage2.getChallengeByStatus("active");
            if (currentChallenge) {
              await storage2.deleteDailyChallenge(currentChallenge.date);
              log(`Archived old current challenge: ${currentChallenge.startActorName} to ${currentChallenge.endActorName}`);
            }
            await storage2.deleteDailyChallenge(nextChallenge.date);
            const newCurrentChallenge = await storage2.createDailyChallenge({
              date: today,
              status: "active",
              startActorId: nextChallenge.startActorId,
              startActorName: nextChallenge.startActorName,
              endActorId: nextChallenge.endActorId,
              endActorName: nextChallenge.endActorName
            });
            log(`Successfully promoted next challenge to current: ${newCurrentChallenge.startActorName} to ${newCurrentChallenge.endActorName}`);
            promotionSuccessful = true;
            break;
          } else {
            log("No next challenge found, will generate new challenge via API");
            break;
          }
        } catch (dbError) {
          retryCount++;
          log(`Database connection attempt ${retryCount}/${maxRetries} failed: ${dbError}`);
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1e3;
            log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            log("All database retry attempts failed, falling back to API generation");
          }
        }
      }
      if (!promotionSuccessful) {
        try {
          const response = await fetch(`http://localhost:${port}/api/daily-challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, forceNew: true })
          });
          if (response.ok) {
            const newChallenge = await response.json();
            log(`Generated new challenge for ${today}: ${newChallenge.startActorName} to ${newChallenge.endActorName}`);
          }
        } catch (apiError) {
          log(`Error generating challenge via API: ${apiError}`);
        }
      }
      if (storage2) {
        try {
          const gameLogicService2 = (await Promise.resolve().then(() => (init_gameLogic(), gameLogic_exports))).gameLogicService;
          const previousChallenge = await storage2.getChallengeByStatus("active");
          const excludeActorIds = [];
          if (previousChallenge) {
            excludeActorIds.push(previousChallenge.startActorId, previousChallenge.endActorId);
            log(`Excluding actors from previous challenge: ${previousChallenge.startActorName} (${previousChallenge.startActorId}) and ${previousChallenge.endActorName} (${previousChallenge.endActorId})`);
          }
          const actors = await gameLogicService2.generateDailyActors(excludeActorIds);
          if (actors) {
            const newNextChallenge = await storage2.createDailyChallenge({
              date: tomorrow,
              status: "next",
              startActorId: actors.actor1.id,
              startActorName: actors.actor1.name,
              endActorId: actors.actor2.id,
              endActorName: actors.actor2.name
            });
            log(`Generated new Next Daily Challenge for ${tomorrow}: ${newNextChallenge.startActorName} to ${newNextChallenge.endActorName}`);
          } else {
            log(`Failed to generate actors for Next Daily Challenge`);
          }
        } catch (nextError) {
          log(`Error generating Next Daily Challenge: ${nextError}`);
        }
      }
    } catch (error) {
      console.error("Error during dual challenge reset:", error);
    }
  }, {
    timezone: "America/New_York"
    // Automatically handles EST/EDT
  });
  log("Dual challenge reset scheduler initialized - resets at midnight EST/EDT");
}
function getTomorrowDateString2() {
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(tomorrow);
}
function getESTDateString2() {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now);
}
export {
  app,
  index_default as default,
  initServer
};
