import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt, type AdminUser, type InsertAdminUser, type AdminSession, type InsertAdminSession, type ContactSubmission, type InsertContactSubmission, type VisitorAnalytics, type InsertVisitorAnalytics, type User, type InsertUser, type UserStats, type InsertUserStats, type UserChallengeCompletion, type InsertUserChallengeCompletion, type MovieList, type InsertMovieList, type MovieListEntry, type InsertMovieListEntry, adminUsers, adminSessions, dailyChallenges, gameAttempts, contactSubmissions, visitorAnalytics, users, userStats, userChallengeCompletions, movieLists, movieListEntries } from "../../shared/schema.js";
import { randomUUID } from "crypto";
import { db, withRetry } from "./db.js";
import { eq, and, gt, desc, sql, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  getDailyChallenges(date: string): Promise<DailyChallenge[]>;
  getDailyChallengeById(id: string): Promise<DailyChallenge | undefined>;
  getChallengeByStatus(status: string): Promise<DailyChallenge | undefined>;
  getAllChallengesByStatus(status: string): Promise<DailyChallenge[]>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  updateDailyChallenge(id: string, updates: Partial<DailyChallenge>): Promise<DailyChallenge>;
  updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge>;
  updateChallengeStatus(challengeId: string, status: string): Promise<DailyChallenge>;
  deleteDailyChallenge(date: string): Promise<void>;
  deleteDailyChallengeById(id: string): Promise<void>;

  // Game Attempt methods
  createGameAttempt(attempt: InsertGameAttempt): Promise<GameAttempt>;
  getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]>;
  getChallengeAnalytics(challengeId: string): Promise<{
    totalAttempts: number;
    completedAttempts: number;
    completionRate: number;
    avgMoves: number;
    moveDistribution: { moves: number; count: number }[];
    mostUsedMovies: { id: string; title: string; count: number }[];
    mostUsedActors: { id: string; name: string; count: number }[];
  }>;

  getBestCompletionUsers(challengeId: string): Promise<{
    moves: number;
    users: { id: string; username: string; firstName: string | null; picture: string | null }[];
  }>;

  // User methods (email/password)
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUserAccount(userId: string): Promise<void>;

  // User stats methods
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats>;

  // User Challenge Completion methods
  createUserChallengeCompletion(completion: InsertUserChallengeCompletion): Promise<UserChallengeCompletion>;
  getUserChallengeCompletion(userId: string, challengeId: string): Promise<UserChallengeCompletion | undefined>;
  getUserCompletions(userId: string): Promise<UserChallengeCompletion[]>;
  getUserMoveDistribution(userId: string): Promise<{ moves: number; count: number }[]>;
  getRecentChallengesForUser(userId: string, limit: number): Promise<{
    challenge: DailyChallenge;
    completed: boolean;
    moves?: number;
  }[]>;

  // Admin methods
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminSession(session: InsertAdminSession): Promise<AdminSession>;
  getValidAdminSession(token: string): Promise<AdminSession | undefined>;
  deleteAdminSession(token: string): Promise<void>;
  updateAdminLastLogin(userId: string): Promise<void>;

  // Contact methods
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;
  updateContactSubmissionStatus(id: string, status: string): Promise<void>;

  // Visitor Analytics methods
  trackVisitor(analytics: InsertVisitorAnalytics): Promise<VisitorAnalytics>;
  updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorAnalytics>): Promise<void>;
  getReferralAnalytics(days?: number): Promise<{
    totalVisitors: number;
    referralBreakdown: { domain: string; type: string; count: number; percentage: number }[];
    topReferrers: { domain: string; count: number; percentage: number }[];
    searchQueries: { query: string; count: number }[];
    utmSources: { source: string; medium: string; campaign: string; count: number }[];
    conversionRates: { total: number; converted: number; rate: number };
    geographicData: { country: string; count: number }[];
    deviceData: { userAgent: string; count: number }[];
  }>;

  // Movie Lists methods
  getMovieListsByUser(userId: string): Promise<MovieList[]>;
  getMovieList(id: string): Promise<MovieList | undefined>;
  createMovieList(data: InsertMovieList): Promise<MovieList>;
  updateMovieList(id: string, updates: Partial<MovieList>): Promise<MovieList>;
  deleteMovieList(id: string): Promise<void>;
  getMovieListEntries(listId: string): Promise<MovieListEntry[]>;
  addMovieToList(data: InsertMovieListEntry): Promise<MovieListEntry>;
  removeMovieFromList(listId: string, tmdbMovieId: number): Promise<void>;
  getMovieListWithEntries(id: string): Promise<(MovieList & { entries: MovieListEntry[] }) | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Daily Challenge methods
  async getDailyChallenge(date: string): Promise<DailyChallenge | undefined> {
    return await withRetry(async () => {
      // Prefer 'medium' difficulty if multiple exist for the date
      const challenges = await db.select().from(dailyChallenges).where(eq(dailyChallenges.date, date));
      if (challenges.length === 0) return undefined;

      const medium = challenges.find((c: DailyChallenge) => c.difficulty === 'medium');
      return medium || challenges[0];
    });
  }

  async getDailyChallenges(date: string): Promise<DailyChallenge[]> {
    return await withRetry(async () => {
      return await db.select().from(dailyChallenges).where(eq(dailyChallenges.date, date));
    });
  }

  async getDailyChallengeById(id: string): Promise<DailyChallenge | undefined> {
    return await withRetry(async () => {
      const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, id));
      return challenge || undefined;
    });
  }

  async getChallengeByStatus(status: string): Promise<DailyChallenge | undefined> {
    return await withRetry(async () => {
      // Prefer medium for single-challenge lookups by status
      const challenges = await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
      if (challenges.length === 0) return undefined;

      const medium = challenges.find((c: DailyChallenge) => c.difficulty === 'medium');
      return medium || challenges[0];
    });
  }

  async getAllChallengesByStatus(status: string): Promise<DailyChallenge[]> {
    return await withRetry(async () => {
      return await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
    });
  }

  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    return await withRetry(async () => {
      const [challenge] = await db.insert(dailyChallenges).values(insertChallenge).returning();
      return challenge;
    });
  }

  async updateDailyChallenge(id: string, updates: Partial<DailyChallenge>): Promise<DailyChallenge> {
    return await withRetry(async () => {
      const [challenge] = await db.update(dailyChallenges)
        .set(updates)
        .where(eq(dailyChallenges.id, id))
        .returning();
      return challenge;
    });
  }

  async updateChallengeStatus(challengeId: string, status: string): Promise<DailyChallenge> {
    return await withRetry(async () => {
      const [challenge] = await db.update(dailyChallenges)
        .set({ status })
        .where(eq(dailyChallenges.id, challengeId))
        .returning();
      return challenge;
    });
  }

  async updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge> {
    return await withRetry(async () => {
      const updateData: any = { hintsUsed };
      if (startActorHint !== undefined) updateData.startActorHint = startActorHint;
      if (endActorHint !== undefined) updateData.endActorHint = endActorHint;

      const [challenge] = await db.update(dailyChallenges)
        .set(updateData)
        .where(eq(dailyChallenges.id, challengeId))
        .returning();
      return challenge;
    });
  }

  async deleteDailyChallenge(date: string): Promise<void> {
    await withRetry(async () => {
      await db.delete(dailyChallenges).where(eq(dailyChallenges.date, date));
    });
  }

  async deleteDailyChallengeById(id: string): Promise<void> {
    await withRetry(async () => {
      await db.delete(dailyChallenges).where(eq(dailyChallenges.id, id));
    });
  }

  // Game Attempt methods
  async createGameAttempt(insertAttempt: InsertGameAttempt): Promise<GameAttempt> {
    return await withRetry(async () => {
      const [attempt] = await db.insert(gameAttempts).values(insertAttempt).returning();
      return attempt;
    });
  }

  async getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]> {
    return await withRetry(async () => {
      return await db.select().from(gameAttempts).where(eq(gameAttempts.challengeId, challengeId));
    });
  }

  async getChallengeAnalytics(challengeId: string) {
    return await withRetry(async () => {
      const attempts = await db.select().from(gameAttempts).where(eq(gameAttempts.challengeId, challengeId));

      // Get the challenge to know which actors to exclude (start and end actors)
      const challenge = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, challengeId)).limit(1);
      const excludedActorIds = challenge.length > 0
        ? [challenge[0].startActorId.toString(), challenge[0].endActorId.toString()]
        : [];

      const totalAttempts = attempts.length;
      const completedAttempts = attempts.filter((a: any) => a.completed).length;
      const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;

      const completedMoves = attempts.filter((a: any) => a.completed).map((a: any) => a.moves);
      const avgMoves = completedMoves.length > 0
        ? completedMoves.reduce((sum: number, moves: number) => sum + moves, 0) / completedMoves.length
        : 0;

      // Create move distribution (1-6 moves)
      const moveDistribution = Array.from({ length: 6 }, (_, i) => {
        const moves = i + 1;
        const count = completedMoves.filter((m: any) => m === moves).length;
        return { moves, count };
      });

      // Analyze connection chains from completed attempts
      const movieUsage = new Map<string, { title: string; count: number }>();
      const actorUsage = new Map<string, { name: string; count: number }>();

      for (const attempt of attempts.filter((a: any) => a.completed)) {
        if (attempt.connections) {
          try {
            const connections = JSON.parse(attempt.connections);

            // Get unique actors and movies in THIS solution chain (excluding start/end actors)
            const uniqueMoviesInChain = new Set<string>();
            const uniqueActorsInChain = new Set<string>();

            for (const connection of connections) {
              // Track unique movies in this chain
              if (connection.movieId && connection.movieTitle) {
                uniqueMoviesInChain.add(connection.movieId);
              }
              // Track unique actors in this chain (excluding start/end actors)
              const actorIdStr = connection.actorId.toString();
              if (connection.actorId && connection.actorName && !excludedActorIds.includes(actorIdStr)) {
                uniqueActorsInChain.add(actorIdStr);
              }
            }

            // Count each unique movie once per solution
            uniqueMoviesInChain.forEach(movieId => {
              const connection = connections.find((c: any) => c.movieId === movieId);
              if (connection) {
                const existing = movieUsage.get(movieId);
                movieUsage.set(movieId, {
                  title: connection.movieTitle,
                  count: (existing?.count || 0) + 1
                });
              }
            });

            // Count each unique actor once per solution
            uniqueActorsInChain.forEach(actorId => {
              const connection = connections.find((c: any) => c.actorId.toString() === actorId);
              if (connection) {
                const existing = actorUsage.get(actorId);
                actorUsage.set(actorId, {
                  name: connection.actorName,
                  count: (existing?.count || 0) + 1
                });
              }
            });
          } catch (error) {
            console.error('Error parsing connection chain:', error);
          }
        }
      }

      // Convert to sorted arrays (top 5)
      const mostUsedMovies = Array.from(movieUsage.entries())
        .map(([id, data]) => ({ id, title: data.title, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const mostUsedActors = Array.from(actorUsage.entries())
        .map(([id, data]) => ({ id, name: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate fewest moves from completed attempts
      const fewestMoves = completedMoves.length > 0 ? Math.min(...completedMoves) : 0;

      return {
        totalAttempts,
        completedAttempts,
        completionRate: Math.round(completionRate * 100) / 100,
        avgMoves: Math.round(avgMoves * 100) / 100,
        fewestMoves,
        moveDistribution,
        mostUsedMovies,
        mostUsedActors,
      };
    });
  }

  async getBestCompletionUsers(challengeId: string) {
    return await withRetry(async () => {
      // 1. Find the best score (minimum moves) for this challenge
      const [bestScore] = await db
        .select({ minMoves: sql<number>`MIN(${userChallengeCompletions.moves})` })
        .from(userChallengeCompletions)
        .where(eq(userChallengeCompletions.challengeId, challengeId));

      if (!bestScore || bestScore.minMoves === null) {
        return { moves: 0, users: [] };
      }

      const minMoves = bestScore.minMoves;

      // 2. Get users who achieved this score
      const bestUsers = await db
        .select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          picture: users.picture,
        })
        .from(userChallengeCompletions)
        .innerJoin(users, eq(userChallengeCompletions.userId, users.id))
        .where(and(
          eq(userChallengeCompletions.challengeId, challengeId),
          eq(userChallengeCompletions.moves, minMoves)
        ));

      return {
        moves: minMoves,
        users: bestUsers
      };
    });
  }

  // Admin methods
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    return await withRetry(async () => {
      const hashedPassword = await bcrypt.hash(user.passwordHash, 12);
      const [adminUser] = await db.insert(adminUsers).values({
        ...user,
        passwordHash: hashedPassword,
      }).returning();
      return adminUser;
    });
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      return user || undefined;
    });
  }

  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    return await withRetry(async () => {
      const [adminSession] = await db.insert(adminSessions).values(session).returning();
      return adminSession;
    });
  }

  async getValidAdminSession(token: string): Promise<AdminSession | undefined> {
    return await withRetry(async () => {
      const [session] = await db.select().from(adminSessions)
        .where(and(
          eq(adminSessions.token, token),
          gt(adminSessions.expiresAt, new Date())
        ));
      return session || undefined;
    });
  }

  async deleteAdminSession(token: string): Promise<void> {
    await withRetry(async () => {
      await db.delete(adminSessions).where(eq(adminSessions.token, token));
    });
  }

  async updateAdminLastLogin(userId: string): Promise<void> {
    await withRetry(async () => {
      await db.update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, userId));
    });
  }

  // Contact methods
  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    return await withRetry(async () => {
      const [submission] = await db.insert(contactSubmissions).values(insertSubmission).returning();
      return submission;
    });
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await withRetry(async () => {
      return await db.select().from(contactSubmissions).orderBy(contactSubmissions.createdAt);
    });
  }

  async updateContactSubmissionStatus(id: string, status: string): Promise<void> {
    await withRetry(async () => {
      await db.update(contactSubmissions)
        .set({ status, updatedAt: new Date() })
        .where(eq(contactSubmissions.id, id));
    });
  }

  // Visitor Analytics methods
  async trackVisitor(insertAnalytics: InsertVisitorAnalytics): Promise<VisitorAnalytics> {
    return await withRetry(async () => {
      const [analytics] = await db.insert(visitorAnalytics).values(insertAnalytics).returning();
      return analytics;
    });
  }

  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorAnalytics>): Promise<void> {
    await withRetry(async () => {
      await db.update(visitorAnalytics)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(visitorAnalytics.sessionId, sessionId));
    });
  }

  async getReferralAnalytics(days: number = 30) {
    return await withRetry(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const visitors = await db.select().from(visitorAnalytics)
        .where(gt(visitorAnalytics.createdAt, cutoffDate));

      const totalVisitors = visitors.length;

      // Group by referrer domain and type
      const referrerMap = new Map<string, { type: string; count: number }>();
      const topReferrersMap = new Map<string, number>();
      const searchQueriesMap = new Map<string, number>();
      const utmSourcesMap = new Map<string, { medium: string; campaign: string; count: number }>();
      const geographicMap = new Map<string, number>();
      const deviceMap = new Map<string, number>();

      let convertedVisitors = 0;

      for (const visitor of visitors) {
        // Track conversions
        if (visitor.converted) convertedVisitors++;

        // Track referrer breakdown
        const domain = visitor.referrerDomain || 'direct';
        const type = visitor.referrerType || 'direct';

        if (referrerMap.has(domain)) {
          referrerMap.get(domain)!.count++;
        } else {
          referrerMap.set(domain, { type, count: 1 });
        }

        // Track top referrers
        topReferrersMap.set(domain, (topReferrersMap.get(domain) || 0) + 1);

        // Track search queries
        if (visitor.searchQuery) {
          searchQueriesMap.set(visitor.searchQuery, (searchQueriesMap.get(visitor.searchQuery) || 0) + 1);
        }

        // Track UTM sources
        if (visitor.utmSource) {
          const key = visitor.utmSource;
          const existing = utmSourcesMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            utmSourcesMap.set(key, {
              medium: visitor.utmMedium || '',
              campaign: visitor.utmCampaign || '',
              count: 1
            });
          }
        }

        // Track geographic data
        if (visitor.country) {
          geographicMap.set(visitor.country, (geographicMap.get(visitor.country) || 0) + 1);
        }

        // Track device data (simplified user agent)
        if (visitor.userAgent) {
          // Extract browser/device info from user agent
          let deviceInfo = 'Unknown';
          if (visitor.userAgent.includes('Mobile')) deviceInfo = 'Mobile';
          else if (visitor.userAgent.includes('Tablet')) deviceInfo = 'Tablet';
          else deviceInfo = 'Desktop';

          deviceMap.set(deviceInfo, (deviceMap.get(deviceInfo) || 0) + 1);
        }
      }

      // Convert maps to sorted arrays
      const referralBreakdown = Array.from(referrerMap.entries())
        .map(([domain, data]) => ({
          domain,
          type: data.type,
          count: data.count,
          percentage: Math.round((data.count / totalVisitors) * 100 * 100) / 100
        }))
        .sort((a, b) => b.count - a.count);

      const topReferrers = Array.from(topReferrersMap.entries())
        .map(([domain, count]) => ({
          domain,
          count,
          percentage: Math.round((count / totalVisitors) * 100 * 100) / 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const searchQueries = Array.from(searchQueriesMap.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const utmSources = Array.from(utmSourcesMap.entries())
        .map(([source, data]) => ({
          source,
          medium: data.medium,
          campaign: data.campaign,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count);

      const geographicData = Array.from(geographicMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const deviceData = Array.from(deviceMap.entries())
        .map(([userAgent, count]) => ({ userAgent, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalVisitors,
        referralBreakdown,
        topReferrers,
        searchQueries,
        utmSources,
        conversionRates: {
          total: totalVisitors,
          converted: convertedVisitors,
          rate: totalVisitors > 0 ? Math.round((convertedVisitors / totalVisitors) * 100 * 100) / 100 : 0
        },
        geographicData,
        deviceData,
      };
    });
  }

  // User methods (email/password)
  async getUserById(id: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
      return user || undefined;
    });
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
      return user || undefined;
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await withRetry(async () => {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    });
  }

  async createUser(userData: InsertUser): Promise<User> {
    return await withRetry(async () => {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return await withRetry(async () => {
      const [user] = await db.update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user;
    });
  }

  // User stats methods
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    return await withRetry(async () => {
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
      return stats || undefined;
    });
  }

  async createUserStats(statsData: InsertUserStats): Promise<UserStats> {
    return await withRetry(async () => {
      const [stats] = await db.insert(userStats).values(statsData).returning();
      return stats;
    });
  }

  async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    return await withRetry(async () => {
      const [stats] = await db.update(userStats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userStats.userId, userId))
        .returning();
      return stats;
    });
  }

  // User Challenge Completion methods
  async createUserChallengeCompletion(completion: InsertUserChallengeCompletion): Promise<UserChallengeCompletion> {
    return await withRetry(async () => {
      const [userCompletion] = await db.insert(userChallengeCompletions).values(completion).returning();
      return userCompletion;
    });
  }

  async getUserChallengeCompletion(userId: string, challengeId: string): Promise<UserChallengeCompletion | undefined> {
    return await withRetry(async () => {
      const [completion] = await db.select().from(userChallengeCompletions)
        .where(and(
          eq(userChallengeCompletions.userId, userId),
          eq(userChallengeCompletions.challengeId, challengeId)
        ));
      return completion || undefined;
    });
  }

  async getUserCompletions(userId: string): Promise<UserChallengeCompletion[]> {
    return await withRetry(async () => {
      return await db.select().from(userChallengeCompletions)
        .where(eq(userChallengeCompletions.userId, userId))
        .orderBy(desc(userChallengeCompletions.completedAt));
    });
  }

  async getUserMoveDistribution(userId: string): Promise<{ moves: number; count: number }[]> {
    return await withRetry(async () => {
      const results = await db
        .select({
          moves: userChallengeCompletions.moves,
          count: count(),
        })
        .from(userChallengeCompletions)
        .where(eq(userChallengeCompletions.userId, userId))
        .groupBy(userChallengeCompletions.moves)
        .orderBy(userChallengeCompletions.moves);

      return results.map((row: any) => ({ moves: row.moves, count: Number(row.count) }));
    });
  }

  async getRecentChallengesForUser(userId: string, limit: number): Promise<{
    challenge: DailyChallenge;
    completed: boolean;
    moves?: number;
  }[]> {
    return await withRetry(async () => {
      // Get recent challenges (active or archived)
      const recentChallenges = await db.select().from(dailyChallenges)
        .where(sql`${dailyChallenges.status} IN ('active', 'archived')`)
        .orderBy(desc(dailyChallenges.date))
        .limit(limit);

      // Check which ones the user has completed
      const results = [];
      for (const challenge of recentChallenges) {
        const completion = await this.getUserChallengeCompletion(userId, challenge.id);
        results.push({
          challenge,
          completed: !!completion,
          moves: completion?.moves,
        });
      }

      return results;
    });
  }

  // Merge a duplicate account into the primary account, preserving all stats and completions
  async mergeUserAccounts(primaryUserId: string, duplicateUserId: string, updates: Partial<User>): Promise<User> {
    return await withRetry(async () => {
      // 1. Move challenge completions from duplicate to primary
      //    Skip any that would conflict (same user+challenge)
      const dupCompletions = await db.select().from(userChallengeCompletions)
        .where(eq(userChallengeCompletions.userId, duplicateUserId));
      for (const comp of dupCompletions) {
        const [existing] = await db.select().from(userChallengeCompletions)
          .where(and(
            eq(userChallengeCompletions.userId, primaryUserId),
            eq(userChallengeCompletions.challengeId, comp.challengeId)
          ));
        if (!existing) {
          await db.update(userChallengeCompletions)
            .set({ userId: primaryUserId })
            .where(eq(userChallengeCompletions.id, comp.id));
        }
      }

      // 2. Merge user stats (sum counters, take max of streaks)
      const [primaryStats] = await db.select().from(userStats).where(eq(userStats.userId, primaryUserId));
      const [dupStats] = await db.select().from(userStats).where(eq(userStats.userId, duplicateUserId));
      if (primaryStats && dupStats) {
        await db.update(userStats).set({
          totalCompletions: (primaryStats.totalCompletions ?? 0) + (dupStats.totalCompletions ?? 0),
          totalMoves: (primaryStats.totalMoves ?? 0) + (dupStats.totalMoves ?? 0),
          currentStreak: Math.max(primaryStats.currentStreak ?? 0, dupStats.currentStreak ?? 0),
          maxStreak: Math.max(primaryStats.maxStreak ?? 0, dupStats.maxStreak ?? 0),
          lastPlayedDate: [primaryStats.lastPlayedDate, dupStats.lastPlayedDate]
            .filter(Boolean).sort().pop() ?? primaryStats.lastPlayedDate,
          easyCompletions: (primaryStats.easyCompletions ?? 0) + (dupStats.easyCompletions ?? 0),
          mediumCompletions: (primaryStats.mediumCompletions ?? 0) + (dupStats.mediumCompletions ?? 0),
          hardCompletions: (primaryStats.hardCompletions ?? 0) + (dupStats.hardCompletions ?? 0),
          completionsAt1Move: (primaryStats.completionsAt1Move ?? 0) + (dupStats.completionsAt1Move ?? 0),
          completionsAt2Moves: (primaryStats.completionsAt2Moves ?? 0) + (dupStats.completionsAt2Moves ?? 0),
          completionsAt3Moves: (primaryStats.completionsAt3Moves ?? 0) + (dupStats.completionsAt3Moves ?? 0),
          completionsAt4Moves: (primaryStats.completionsAt4Moves ?? 0) + (dupStats.completionsAt4Moves ?? 0),
          completionsAt5Moves: (primaryStats.completionsAt5Moves ?? 0) + (dupStats.completionsAt5Moves ?? 0),
          completionsAt6Moves: (primaryStats.completionsAt6Moves ?? 0) + (dupStats.completionsAt6Moves ?? 0),
          updatedAt: new Date(),
        }).where(eq(userStats.userId, primaryUserId));
      } else if (!primaryStats && dupStats) {
        // Primary has no stats — reassign duplicate's stats
        await db.update(userStats).set({ userId: primaryUserId, updatedAt: new Date() })
          .where(eq(userStats.userId, duplicateUserId));
      }

      // 3. Update the primary user with new provider IDs
      const [updatedUser] = await db.update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, primaryUserId))
        .returning();

      // 4. Delete the duplicate (remaining completions that were skipped + stats + user)
      await db.delete(userChallengeCompletions).where(eq(userChallengeCompletions.userId, duplicateUserId));
      await db.delete(userStats).where(eq(userStats.userId, duplicateUserId));
      await db.delete(users).where(eq(users.id, duplicateUserId));

      return updatedUser;
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    await withRetry(async () => {
      // Delete children first - manual cascade for safety
      await db.delete(userChallengeCompletions).where(eq(userChallengeCompletions.userId, userId));
      await db.delete(userStats).where(eq(userStats.userId, userId));
      // Delete movie lists (entries cascade automatically)
      await db.delete(movieLists).where(eq(movieLists.userId, userId));
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
    });
  }

  // Movie Lists methods
  async getMovieListsByUser(userId: string): Promise<MovieList[]> {
    return await withRetry(async () => {
      return await db.select().from(movieLists)
        .where(eq(movieLists.userId, userId))
        .orderBy(movieLists.sortOrder);
    });
  }

  async getMovieList(id: string): Promise<MovieList | undefined> {
    return await withRetry(async () => {
      const [list] = await db.select().from(movieLists).where(eq(movieLists.id, id));
      return list || undefined;
    });
  }

  async createMovieList(data: InsertMovieList): Promise<MovieList> {
    return await withRetry(async () => {
      const [list] = await db.insert(movieLists).values(data).returning();
      return list;
    });
  }

  async updateMovieList(id: string, updates: Partial<MovieList>): Promise<MovieList> {
    return await withRetry(async () => {
      const [list] = await db.update(movieLists)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(movieLists.id, id))
        .returning();
      return list;
    });
  }

  async deleteMovieList(id: string): Promise<void> {
    await withRetry(async () => {
      // Entries cascade automatically due to onDelete: 'cascade'
      await db.delete(movieLists).where(eq(movieLists.id, id));
    });
  }

  async getMovieListEntries(listId: string): Promise<MovieListEntry[]> {
    return await withRetry(async () => {
      return await db.select().from(movieListEntries)
        .where(eq(movieListEntries.listId, listId))
        .orderBy(desc(movieListEntries.addedAt));
    });
  }

  async addMovieToList(data: InsertMovieListEntry): Promise<MovieListEntry> {
    return await withRetry(async () => {
      const [entry] = await db.insert(movieListEntries).values(data).returning();
      return entry;
    });
  }

  async removeMovieFromList(listId: string, tmdbMovieId: number): Promise<void> {
    await withRetry(async () => {
      await db.delete(movieListEntries)
        .where(and(
          eq(movieListEntries.listId, listId),
          eq(movieListEntries.tmdbMovieId, tmdbMovieId)
        ));
    });
  }

  async getMovieListWithEntries(id: string): Promise<(MovieList & { entries: MovieListEntry[] }) | undefined> {
    return await withRetry(async () => {
      const list = await this.getMovieList(id);
      if (!list) return undefined;

      const entries = await this.getMovieListEntries(id);
      return { ...list, entries };
    });
  }
}

export const storage = new DatabaseStorage();