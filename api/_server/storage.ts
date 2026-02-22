import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt, type AdminUser, type InsertAdminUser, type AdminSession, type InsertAdminSession, type ContactSubmission, type InsertContactSubmission, type VisitorAnalytics, type InsertVisitorAnalytics, type User, type InsertUser, type UserStats, type InsertUserStats, type UserChallengeCompletion, type InsertUserChallengeCompletion, type MovieList, type InsertMovieList, type MovieListEntry, type InsertMovieListEntry, type Friendship, type UserSubscription, type InsertUserSubscription, type SubscriptionEvent, type InsertSubscriptionEvent, adminUsers, adminSessions, dailyChallenges, gameAttempts, contactSubmissions, visitorAnalytics, users, userStats, userChallengeCompletions, movieLists, movieListEntries, friendships, userSubscriptions, subscriptionEvents } from "../../shared/schema.js";
import { randomUUID } from "crypto";
import { db, withRetry } from "./db.js";
import { eq, and, or, gt, desc, asc, ne, sql, count, inArray } from "drizzle-orm";
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
  createUserChallengeCompletionIfNotExists(completion: InsertUserChallengeCompletion): Promise<UserChallengeCompletion | null>;
  recordCompletionWithStats(
    completion: InsertUserChallengeCompletion,
    context: {
      difficulty: string;
      trophyTier: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<UserChallengeCompletion | null>;
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

  // Friend methods
  createFriendship(requesterId: string, addresseeId: string): Promise<Friendship>;
  getFriendshipBetween(userId1: string, userId2: string): Promise<Friendship | undefined>;
  getFriendshipById(id: string): Promise<Friendship | undefined>;
  updateFriendshipStatus(id: string, status: string): Promise<Friendship>;
  deleteFriendship(id: string): Promise<void>;
  getPendingRequestsForUser(userId: string): Promise<any[]>;
  getSentRequestsForUser(userId: string): Promise<any[]>;
  getAcceptedFriends(userId: string): Promise<any[]>;
  searchUsersByUsername(query: string, currentUserId: string): Promise<any[]>;
  getFriendsWithTodayStatus(userId: string, date: string): Promise<any[]>;
  getFriendsLeaderboard(userId: string, sortBy: string, isEntitled?: boolean): Promise<any>;
  getUserByUsernameCaseInsensitive(username: string): Promise<User | undefined>;

  // Subscription methods
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getSubscriptionByOriginalTransactionId(txnId: string): Promise<UserSubscription | undefined>;
  upsertSubscription(data: Partial<InsertUserSubscription> & { originalTransactionId: string; userId: string; plan: string; productId: string; status: string; environment: string }): Promise<UserSubscription>;
  createSubscriptionEvent(data: InsertSubscriptionEvent): Promise<SubscriptionEvent | null>;
  isUserEntitled(userId: string): Promise<boolean>;
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

  async createUserChallengeCompletionIfNotExists(completion: InsertUserChallengeCompletion): Promise<UserChallengeCompletion | null> {
    return await withRetry(async () => {
      let rows: UserChallengeCompletion[];
      try {
        rows = await db.insert(userChallengeCompletions)
          .values(completion)
          .onConflictDoNothing({ target: [userChallengeCompletions.userId, userChallengeCompletions.challengeId] })
          .returning();
      } catch (e: any) {
        // Fallback if unique constraint doesn't exist yet in the database
        if (e?.message?.includes('unique') || e?.message?.includes('ON CONFLICT')) {
          const [existing] = await db.select().from(userChallengeCompletions)
            .where(and(
              eq(userChallengeCompletions.userId, completion.userId),
              eq(userChallengeCompletions.challengeId, completion.challengeId)
            ));
          if (existing) return null;
          rows = await db.insert(userChallengeCompletions)
            .values(completion)
            .returning();
        } else {
          throw e;
        }
      }
      return rows.length > 0 ? rows[0] : null;
    });
  }

  async recordCompletionWithStats(
    completion: InsertUserChallengeCompletion,
    context: {
      difficulty: string;
      trophyTier: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<UserChallengeCompletion | null> {
    return await withRetry(async () => {
      return await db.transaction(async (tx: any) => {
        // 1. Insert completion — ON CONFLICT DO NOTHING for idempotency
        let rows: any[];
        try {
          rows = await tx.insert(userChallengeCompletions)
            .values(completion)
            .onConflictDoNothing({ target: [userChallengeCompletions.userId, userChallengeCompletions.challengeId] })
            .returning();
        } catch (e: any) {
          // Fallback if unique constraint doesn't exist yet in the database
          if (e?.message?.includes('unique') || e?.message?.includes('ON CONFLICT')) {
            const [existing] = await tx.select().from(userChallengeCompletions)
              .where(and(
                eq(userChallengeCompletions.userId, completion.userId),
                eq(userChallengeCompletions.challengeId, completion.challengeId)
              ));
            if (existing) return null; // Already completed
            rows = await tx.insert(userChallengeCompletions)
              .values(completion)
              .returning();
          } else {
            throw e;
          }
        }

        if (rows.length === 0) {
          // Already existed — transaction still commits cleanly, no stats change
          return null;
        }

        // 2. Lock the user row so stats updates for the same user serialize.
        await tx.execute(sql`
          SELECT ${users.id}
          FROM ${users}
          WHERE ${users.id} = ${completion.userId}
          FOR UPDATE
        `);

        // 3. Ensure stats row exists
        let [existingStats] = await tx.select().from(userStats)
          .where(eq(userStats.userId, completion.userId))
          .limit(1);
        if (!existingStats) {
          const [createdStats] = await tx.insert(userStats)
            .values({ userId: completion.userId })
            .returning();
          existingStats = createdStats;
        }

        const move1Delta = completion.moves === 1 ? 1 : 0;
        const move2Delta = completion.moves === 2 ? 1 : 0;
        const move3Delta = completion.moves === 3 ? 1 : 0;
        const move4Delta = completion.moves === 4 ? 1 : 0;
        const move5Delta = completion.moves === 5 ? 1 : 0;
        const move6Delta = completion.moves === 6 ? 1 : 0;

        const easyDelta = context.difficulty === "easy" ? 1 : 0;
        const mediumDelta = context.difficulty === "medium" ? 1 : 0;
        const hardDelta = context.difficulty === "hard" ? 1 : 0;

        const walkOfFameDelta = context.trophyTier === "walkOfFame" ? 1 : 0;
        const oscarDelta = context.trophyTier === "oscar" ? 1 : 0;
        const goldenGlobeDelta = context.trophyTier === "goldenGlobe" ? 1 : 0;
        const emmyDelta = context.trophyTier === "emmy" ? 1 : 0;
        const sagDelta = context.trophyTier === "sag" ? 1 : 0;
        const popcornDelta = context.trophyTier === "popcorn" ? 1 : 0;

        // Streak calculation now includes shield logic:
        // If lastPlayedDate is dayBeforeYesterday and shields > 0, the shield saves the streak.
        const streakExpr = sql<number>`
          CASE
            WHEN ${userStats.lastPlayedDate} = ${context.today} THEN COALESCE(${userStats.currentStreak}, 0)
            WHEN ${userStats.lastPlayedDate} = ${context.yesterday} THEN COALESCE(${userStats.currentStreak}, 0) + 1
            WHEN ${userStats.lastPlayedDate} = ${context.dayBeforeYesterday}
              AND COALESCE(${userStats.streakShieldsRemaining}, 0) > 0
              THEN COALESCE(${userStats.currentStreak}, 0) + 1
            ELSE 1
          END
        `;

        // Determine if a shield is being used in this update
        const shieldUsed = sql<number>`
          CASE
            WHEN ${userStats.lastPlayedDate} = ${context.dayBeforeYesterday}
              AND COALESCE(${userStats.streakShieldsRemaining}, 0) > 0
              THEN 1
            ELSE 0
          END
        `;

        // 4. Update stats atomically within the same transaction using DB-side increments.
        await tx.update(userStats)
          .set({
            totalCompletions: sql`COALESCE(${userStats.totalCompletions}, 0) + 1`,
            totalMoves: sql`COALESCE(${userStats.totalMoves}, 0) + ${completion.moves}`,
            currentStreak: streakExpr,
            maxStreak: sql`GREATEST(COALESCE(${userStats.maxStreak}, 0), ${streakExpr})`,
            lastPlayedDate: context.today,
            completionsAt1Move: sql`COALESCE(${userStats.completionsAt1Move}, 0) + ${move1Delta}`,
            completionsAt2Moves: sql`COALESCE(${userStats.completionsAt2Moves}, 0) + ${move2Delta}`,
            completionsAt3Moves: sql`COALESCE(${userStats.completionsAt3Moves}, 0) + ${move3Delta}`,
            completionsAt4Moves: sql`COALESCE(${userStats.completionsAt4Moves}, 0) + ${move4Delta}`,
            completionsAt5Moves: sql`COALESCE(${userStats.completionsAt5Moves}, 0) + ${move5Delta}`,
            completionsAt6Moves: sql`COALESCE(${userStats.completionsAt6Moves}, 0) + ${move6Delta}`,
            easyCompletions: sql`COALESCE(${userStats.easyCompletions}, 0) + ${easyDelta}`,
            mediumCompletions: sql`COALESCE(${userStats.mediumCompletions}, 0) + ${mediumDelta}`,
            hardCompletions: sql`COALESCE(${userStats.hardCompletions}, 0) + ${hardDelta}`,
            trophyWalkOfFame: sql`COALESCE(${userStats.trophyWalkOfFame}, 0) + ${walkOfFameDelta}`,
            trophyOscar: sql`COALESCE(${userStats.trophyOscar}, 0) + ${oscarDelta}`,
            trophyGoldenGlobe: sql`COALESCE(${userStats.trophyGoldenGlobe}, 0) + ${goldenGlobeDelta}`,
            trophyEmmy: sql`COALESCE(${userStats.trophyEmmy}, 0) + ${emmyDelta}`,
            trophySag: sql`COALESCE(${userStats.trophySag}, 0) + ${sagDelta}`,
            trophyPopcorn: sql`COALESCE(${userStats.trophyPopcorn}, 0) + ${popcornDelta}`,
            // Decrement shield if used
            streakShieldsRemaining: sql`COALESCE(${userStats.streakShieldsRemaining}, 0) - ${shieldUsed}`,
            lastShieldUsedDate: sql`CASE WHEN ${shieldUsed} = 1 THEN ${context.today} ELSE ${userStats.lastShieldUsedDate} END`,
            updatedAt: new Date(),
          })
          .where(eq(userStats.id, existingStats.id));

        return rows[0];
      });
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
          trophyWalkOfFame: (primaryStats.trophyWalkOfFame ?? 0) + (dupStats.trophyWalkOfFame ?? 0),
          trophyOscar: (primaryStats.trophyOscar ?? 0) + (dupStats.trophyOscar ?? 0),
          trophyGoldenGlobe: (primaryStats.trophyGoldenGlobe ?? 0) + (dupStats.trophyGoldenGlobe ?? 0),
          trophyEmmy: (primaryStats.trophyEmmy ?? 0) + (dupStats.trophyEmmy ?? 0),
          trophySag: (primaryStats.trophySag ?? 0) + (dupStats.trophySag ?? 0),
          trophyPopcorn: (primaryStats.trophyPopcorn ?? 0) + (dupStats.trophyPopcorn ?? 0),
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

  // Friend methods
  async createFriendship(requesterId: string, addresseeId: string): Promise<Friendship> {
    return await withRetry(async () => {
      // Check if friendship already exists between the two users (in either direction)
      const existing = await db.select().from(friendships)
        .where(or(
          and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
          and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
        ));

      if (existing.length > 0) {
        const friendship = existing[0];
        // If the reverse request is pending (addressee sent to requester), auto-accept
        if (friendship.status === "pending" && friendship.requesterId === addresseeId && friendship.addresseeId === requesterId) {
          const [updated] = await db.update(friendships)
            .set({ status: "accepted", updatedAt: new Date() })
            .where(eq(friendships.id, friendship.id))
            .returning();
          return updated;
        }
        if (friendship.status === "accepted") {
          throw new Error("Already friends");
        }
        // Pending request in same direction already exists
        throw new Error("Friend request already sent");
      }

      try {
        const [friendship] = await db.insert(friendships).values({
          requesterId,
          addresseeId,
        }).returning();
        return friendship;
      } catch (error: any) {
        if (error?.code === "23505") {
          const [existingFriendship] = await db.select().from(friendships)
            .where(or(
              and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
              and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId))
            ));

          if (existingFriendship) {
            if (existingFriendship.status === "accepted") {
              throw new Error("Already friends");
            }

            if (existingFriendship.requesterId === addresseeId && existingFriendship.addresseeId === requesterId) {
              const [updated] = await db.update(friendships)
                .set({ status: "accepted", updatedAt: new Date() })
                .where(eq(friendships.id, existingFriendship.id))
                .returning();
              return updated;
            }

            throw new Error("Friend request already sent");
          }
        }

        throw error;
      }
    });
  }

  async getFriendshipBetween(userId1: string, userId2: string): Promise<Friendship | undefined> {
    return await withRetry(async () => {
      const [friendship] = await db.select().from(friendships)
        .where(or(
          and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
          and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
        ));
      return friendship || undefined;
    });
  }

  async getFriendshipById(id: string): Promise<Friendship | undefined> {
    return await withRetry(async () => {
      const [friendship] = await db.select().from(friendships).where(eq(friendships.id, id));
      return friendship || undefined;
    });
  }

  async updateFriendshipStatus(id: string, status: string): Promise<Friendship> {
    return await withRetry(async () => {
      const [friendship] = await db.update(friendships)
        .set({ status, updatedAt: new Date() })
        .where(eq(friendships.id, id))
        .returning();
      return friendship;
    });
  }

  async deleteFriendship(id: string): Promise<void> {
    await withRetry(async () => {
      await db.delete(friendships).where(eq(friendships.id, id));
    });
  }

  async getPendingRequestsForUser(userId: string): Promise<any[]> {
    return await withRetry(async () => {
      const rows = await db
        .select({
          id: friendships.id,
          requesterId: users.id,
          requesterUsername: users.username,
          requesterPicture: users.picture,
          createdAt: friendships.createdAt,
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.requesterId, users.id))
        .where(and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "pending")
        ))
        .orderBy(desc(friendships.createdAt));

      return rows.map((row: any) => ({
        id: row.id,
        requester: {
          id: row.requesterId,
          username: row.requesterUsername,
          picture: row.requesterPicture,
        },
        createdAt: row.createdAt,
      }));
    });
  }

  async getSentRequestsForUser(userId: string): Promise<any[]> {
    return await withRetry(async () => {
      const rows = await db
        .select({
          id: friendships.id,
          addresseeId: users.id,
          addresseeUsername: users.username,
          addresseePicture: users.picture,
          createdAt: friendships.createdAt,
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.addresseeId, users.id))
        .where(and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, "pending")
        ))
        .orderBy(desc(friendships.createdAt));

      return rows.map((row: any) => ({
        id: row.id,
        addressee: {
          id: row.addresseeId,
          username: row.addresseeUsername,
          picture: row.addresseePicture,
        },
        createdAt: row.createdAt,
      }));
    });
  }

  async getAcceptedFriends(userId: string): Promise<any[]> {
    return await withRetry(async () => {
      // Friends where the user is the requester
      const asRequester = await db
        .select({
          friendshipId: friendships.id,
          friendId: users.id,
          friendUsername: users.username,
          friendPicture: users.picture,
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.addresseeId, users.id))
        .where(and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, "accepted")
        ));

      // Friends where the user is the addressee
      const asAddressee = await db
        .select({
          friendshipId: friendships.id,
          friendId: users.id,
          friendUsername: users.username,
          friendPicture: users.picture,
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.requesterId, users.id))
        .where(and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "accepted")
        ));

      const all = [...asRequester, ...asAddressee];
      return all.map(row => ({
        id: row.friendId,
        friendshipId: row.friendshipId,
        username: row.friendUsername,
        picture: row.friendPicture,
      }));
    });
  }

  async searchUsersByUsername(query: string, currentUserId: string): Promise<any[]> {
    return await withRetry(async () => {
      const matchedUsers = await db
        .select({
          id: users.id,
          username: users.username,
          picture: users.picture,
        })
        .from(users)
        .where(and(
          sql`LOWER(${users.username}) LIKE LOWER(${query + '%'})`,
          ne(users.id, currentUserId)
        ))
        .limit(20);

      // For each result, check friendship status
      const results = [];
      for (const user of matchedUsers) {
        const friendship = await this.getFriendshipBetween(currentUserId, user.id);
        let friendshipStatus: string | null = null;
        if (friendship) {
          if (friendship.status === "accepted") {
            friendshipStatus = "accepted";
          } else if (friendship.requesterId === currentUserId) {
            friendshipStatus = "pending_sent";
          } else {
            friendshipStatus = "pending_received";
          }
        }
        results.push({
          id: user.id,
          username: user.username,
          picture: user.picture,
          friendshipStatus,
          friendshipId: friendship?.id ?? null,
        });
      }
      return results;
    });
  }

  async getFriendsWithTodayStatus(userId: string, date: string): Promise<any[]> {
    return await withRetry(async () => {
      const friends = await this.getAcceptedFriends(userId);

      // Get today's challenges for the given date
      const todayChallenges = await db.select().from(dailyChallenges)
        .where(eq(dailyChallenges.date, date));

      const results = [];
      for (const friend of friends) {
        // Get friend's stats
        const [stats] = await db.select().from(userStats)
          .where(eq(userStats.userId, friend.id));

        // Get friend's completions for today's challenges (include all difficulties)
        const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        const sortedChallenges = [...todayChallenges].sort(
          (a, b) => (difficultyOrder[a.difficulty] ?? 99) - (difficultyOrder[b.difficulty] ?? 99)
        );
        const todayCompletions = [];
        for (const challenge of sortedChallenges) {
          const [completion] = await db.select().from(userChallengeCompletions)
            .where(and(
              eq(userChallengeCompletions.userId, friend.id),
              eq(userChallengeCompletions.challengeId, challenge.id)
            ));
          todayCompletions.push({
            difficulty: challenge.difficulty,
            completed: !!completion,
            moves: completion?.moves ?? null,
          });
        }

        results.push({
          id: friend.id,
          friendshipId: friend.friendshipId,
          username: friend.username,
          picture: friend.picture,
          currentStreak: stats?.currentStreak ?? 0,
          totalCompletions: stats?.totalCompletions ?? 0,
          todayCompletions,
        });
      }

      return results;
    });
  }

  async getFriendsLeaderboard(userId: string, sortBy: string, isEntitled: boolean = true): Promise<any> {
    return await withRetry(async () => {
      const friends = await this.getAcceptedFriends(userId);

      // Include current user in leaderboard
      const currentUser = await this.getUserById(userId);
      const allParticipants = [
        ...friends.map(f => ({ id: f.id, username: f.username, picture: f.picture, isCurrentUser: false })),
        ...(currentUser ? [{ id: currentUser.id, username: currentUser.username, picture: currentUser.picture, isCurrentUser: true }] : []),
      ];

      const leaderboard = [];
      for (const participant of allParticipants) {
        const [stats] = await db.select().from(userStats)
          .where(eq(userStats.userId, participant.id));

        // Calculate avg moves from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentCompletions = await db.select().from(userChallengeCompletions)
          .where(and(
            eq(userChallengeCompletions.userId, participant.id),
            gt(userChallengeCompletions.completedAt, sevenDaysAgo)
          ));
        let avgMoves7Day: number | null = null;
        if (recentCompletions.length > 0) {
          const totalMoves = recentCompletions.reduce((sum: number, c: any) => sum + c.moves, 0);
          avgMoves7Day = Math.round((totalMoves / recentCompletions.length) * 10) / 10;
        }

        // Calculate trophy totals using par-based trophy columns
        const trophyBreakdown: Record<string, number> = {
          walkOfFame: stats?.trophyWalkOfFame ?? 0,
          oscar: stats?.trophyOscar ?? 0,
          goldenGlobe: stats?.trophyGoldenGlobe ?? 0,
          emmy: stats?.trophyEmmy ?? 0,
          sag: stats?.trophySag ?? 0,
          popcorn: stats?.trophyPopcorn ?? 0,
        };
        const totalTrophies = Object.values(trophyBreakdown).reduce((sum, v) => sum + v, 0);

        let sortValue = 0;
        if (sortBy === "streak") {
          sortValue = stats?.currentStreak ?? 0;
        } else if (sortBy === "efficiency") {
          sortValue = avgMoves7Day ?? 999;
        } else if (sortBy === "trophies") {
          // Weighted score: higher tier = more points
          const weightedScore = trophyBreakdown.walkOfFame * 6 + trophyBreakdown.oscar * 5
            + trophyBreakdown.goldenGlobe * 4 + trophyBreakdown.emmy * 3
            + trophyBreakdown.sag * 2 + trophyBreakdown.popcorn * 1;
          // Transition fallback: use totalCompletions when all trophy counts are 0
          sortValue = weightedScore > 0 ? weightedScore : (stats?.totalCompletions ?? 0);
        }

        leaderboard.push({
          id: participant.id,
          username: participant.username,
          picture: participant.picture,
          isCurrentUser: participant.isCurrentUser,
          currentStreak: stats?.currentStreak ?? 0,
          maxStreak: stats?.maxStreak ?? 0,
          avgMoves7Day,
          totalTrophies,
          trophyBreakdown,
          sortValue,
        });
      }

      // Sort: for efficiency, lower is better; for streak and trophies, higher is better
      if (sortBy === "efficiency") {
        leaderboard.sort((a, b) => a.sortValue - b.sortValue);
      } else {
        leaderboard.sort((a, b) => b.sortValue - a.sortValue);
      }

      // Add rank
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      // If not entitled, truncate to top 3 + current user
      if (!isEntitled && rankedLeaderboard.length > 3) {
        const top3 = rankedLeaderboard.slice(0, 3);
        const currentUserEntry = rankedLeaderboard.find(e => e.isCurrentUser);
        const userRank = currentUserEntry?.rank ?? 0;

        // Include current user if they're outside top 3
        const entries = currentUserEntry && currentUserEntry.rank > 3
          ? [...top3, currentUserEntry]
          : top3;

        return {
          entries,
          isTruncated: true,
          lockedCount: rankedLeaderboard.length - entries.length,
          userRank,
        };
      }

      return {
        entries: rankedLeaderboard,
        isTruncated: false,
        lockedCount: 0,
        userRank: rankedLeaderboard.find(e => e.isCurrentUser)?.rank ?? 0,
      };
    });
  }

  async getUserByUsernameCaseInsensitive(username: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users)
        .where(sql`LOWER(${users.username}) = LOWER(${username})`);
      return user || undefined;
    });
  }

  // Subscription methods
  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    return await withRetry(async () => {
      const [sub] = await db.select().from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));
      return sub || undefined;
    });
  }

  async getSubscriptionByOriginalTransactionId(txnId: string): Promise<UserSubscription | undefined> {
    return await withRetry(async () => {
      const [sub] = await db.select().from(userSubscriptions)
        .where(eq(userSubscriptions.originalTransactionId, txnId));
      return sub || undefined;
    });
  }

  async upsertSubscription(
    data: Partial<InsertUserSubscription> & { originalTransactionId: string; userId: string; plan: string; productId: string; status: string; environment: string },
  ): Promise<UserSubscription> {
    return await withRetry(async () => {
      const [sub] = await db.insert(userSubscriptions)
        .values(data as any)
        .onConflictDoUpdate({
          target: userSubscriptions.originalTransactionId,
          set: {
            userId: data.userId,
            status: data.status,
            plan: data.plan,
            productId: data.productId,
            latestTransactionId: data.latestTransactionId,
            currentPeriodEndsAt: data.currentPeriodEndsAt,
            autoRenewEnabled: data.autoRenewEnabled,
            appAccountToken: data.appAccountToken,
            environment: data.environment,
            updatedAt: new Date(),
          },
        })
        .returning();
      return sub;
    });
  }

  async createSubscriptionEvent(data: InsertSubscriptionEvent): Promise<SubscriptionEvent | null> {
    return await withRetry(async () => {
      const rows = await db.insert(subscriptionEvents)
        .values(data)
        .onConflictDoNothing({ target: subscriptionEvents.notificationUUID })
        .returning();
      return rows.length > 0 ? rows[0] : null;
    });
  }

  async isUserEntitled(userId: string): Promise<boolean> {
    return await withRetry(async () => {
      const [sub] = await db.select().from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            inArray(userSubscriptions.status, ["active", "billing_retry", "grace_period"]),
          ),
        );
      return !!sub;
    });
  }
}

export const storage = new DatabaseStorage();
