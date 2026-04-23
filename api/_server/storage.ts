import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt, type AdminUser, type InsertAdminUser, type AdminSession, type InsertAdminSession, type ContactSubmission, type InsertContactSubmission, type VisitorAnalytics, type InsertVisitorAnalytics, type User, type InsertUser, type UserStats, type InsertUserStats, type UserChallengeCompletion, type InsertUserChallengeCompletion, type MovieList, type InsertMovieList, type MovieListEntry, type InsertMovieListEntry, type Friendship, type UserSubscription, type InsertUserSubscription, type SubscriptionEvent, type InsertSubscriptionEvent, type Reaction, type ReactionEvent, type CastCallChallenge, type InsertCastCallChallenge, type CastCallCompletion, type InsertCastCallCompletion, type PremierChallenge, type InsertPremierChallenge, type PremierCompletion, type InsertPremierCompletion, adminUsers, adminSessions, dailyChallenges, gameAttempts, contactSubmissions, visitorAnalytics, users, userStats, userChallengeCompletions, movieLists, movieListEntries, friendships, userSubscriptions, subscriptionEvents, reactions, reactionEvents, castCallChallenges, castCallCompletions, premierChallenges, premierCompletions } from "../../shared/schema.js";
import { randomUUID } from "crypto";
import { db, withRetry } from "./db.js";
import { eq, and, or, gt, lt, lte, desc, asc, ne, sql, count, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

function isSubscriptionEntitledNow(subscription: Pick<UserSubscription, "status" | "currentPeriodEndsAt"> | undefined): boolean {
  if (!subscription) return false;
  if (subscription.status === "billing_retry" || subscription.status === "grace_period") return true;
  if (subscription.status !== "active") return false;
  if (!subscription.currentPeriodEndsAt) return true;
  return new Date(subscription.currentPeriodEndsAt) > new Date();
}

type ReactionInboxItem = {
  id: string;
  reactorUserId: string;
  reactorUsername: string;
  reactorPicture: string | null;
  targetUserId: string;
  challengeDate: string;
  difficulty: string;
  emoji: string;
  moves: number | null;
  createdAt: Date | null;
  readAt: Date | null;
};

type ReactionInboxPage = {
  items: ReactionInboxItem[];
  nextCursor: string | null;
  unreadCount: number;
};

const homeModePreferenceModes = ["six_degrees", "cast_call", "premier"] as const;
type HomeModePreferenceMode = (typeof homeModePreferenceModes)[number];

type HomeModePreferenceResponse = {
  preferredMode: HomeModePreferenceMode;
  scores: {
    sixDegrees: number;
    castCall: number;
    premier: number;
  };
};

const defaultHomeModePreference: HomeModePreferenceResponse = {
  preferredMode: "six_degrees",
  scores: {
    sixDegrees: 0,
    castCall: 0,
    premier: 0,
  },
};

const HOME_MODE_SCORE_BOOST = 3;
const HOME_MODE_SCORE_PENALTY = 1;
const HOME_MODE_SCORE_DECAY_PER_DAY = 1;
const HOME_MODE_SCORE_MAX = 12;

function normalizeHomeModePreferenceMode(mode: string | null | undefined): HomeModePreferenceMode {
  if (mode === "cast_call" || mode === "premier") {
    return mode;
  }
  return "six_degrees";
}

function clampHomeModeScore(value: number): number {
  return Math.max(0, Math.min(HOME_MODE_SCORE_MAX, value));
}

function elapsedFullDaysSince(date: Date | null | undefined, now: Date): number {
  if (!date) return 0;
  const elapsed = now.getTime() - date.getTime();
  if (elapsed <= 0) return 0;
  return Math.floor(elapsed / (24 * 60 * 60 * 1000));
}

function resolvePreferredHomeMode(
  scores: HomeModePreferenceResponse["scores"],
  preferredOrder: HomeModePreferenceMode[],
): HomeModePreferenceMode {
  const entries: Array<{ mode: HomeModePreferenceMode; score: number }> = [
    { mode: "six_degrees", score: scores.sixDegrees },
    { mode: "cast_call", score: scores.castCall },
    { mode: "premier", score: scores.premier },
  ];
  const maxScore = Math.max(...entries.map((entry) => entry.score));

  if (maxScore <= 0) {
    return "six_degrees";
  }

  const tiedModes = entries
    .filter((entry) => entry.score == maxScore)
    .map((entry) => entry.mode);

  for (const mode of preferredOrder) {
    if (tiedModes.includes(mode)) {
      return mode;
    }
  }

  return tiedModes[0] ?? "six_degrees";
}

function buildHomeModePreferenceResponse(
  stats: UserStats | undefined,
  now: Date = new Date(),
): HomeModePreferenceResponse {
  if (!stats) {
    return defaultHomeModePreference;
  }

  const elapsedDays = elapsedFullDaysSince(stats.homePreferenceLastInteractionAt, now);
  const decay = elapsedDays * HOME_MODE_SCORE_DECAY_PER_DAY;
  const scores = {
    sixDegrees: clampHomeModeScore((stats.homePreferenceSixDegreesScore ?? 0) - decay),
    castCall: clampHomeModeScore((stats.homePreferenceCastCallScore ?? 0) - decay),
    premier: clampHomeModeScore((stats.homePreferencePremierScore ?? 0) - decay),
  };
  const storedPreferredMode = normalizeHomeModePreferenceMode(stats.homePreferredMode);

  return {
    preferredMode: resolvePreferredHomeMode(scores, [storedPreferredMode, "six_degrees"]),
    scores,
  };
}

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  getDailyChallenges(date: string): Promise<DailyChallenge[]>;
  getDailyChallengesInRange(startDate: string, endDate: string): Promise<DailyChallenge[]>;
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
  getHomeModePreference(userId: string): Promise<HomeModePreferenceResponse>;
  trackHomeModeEngagement(userId: string, mode: HomeModePreferenceMode): Promise<HomeModePreferenceResponse>;

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
  getFriendsLeaderboard(userId: string, sortBy: string, isEntitled?: boolean, mode?: string): Promise<any>;
  getUserByUsernameCaseInsensitive(username: string): Promise<User | undefined>;

  // Reaction methods
  upsertReaction(reactorUserId: string, targetUserId: string, challengeDate: string, gameMode: string, difficulty: string, emoji: string): Promise<Reaction>;
  removeReaction(reactorUserId: string, targetUserId: string, challengeDate: string, gameMode: string, difficulty: string): Promise<void>;
  createReactionEvent(targetUserId: string, reactorUserId: string, challengeDate: string, gameMode: string, difficulty: string, emoji: string, reactionId?: string | null): Promise<ReactionEvent>;
  getReactionInbox(userId: string, cursor: string | undefined, limit: number): Promise<ReactionInboxPage>;
  markReactionInboxRead(userId: string, upToEventId?: string): Promise<number>;
  getReactionInboxUnreadCount(userId: string): Promise<number>;
  areFriends(userId1: string, userId2: string): Promise<boolean>;
  hasCompletionForModeAndDifficulty(userId: string, date: string, gameMode: string, difficulty: string): Promise<boolean>;
  getReactionsForUsersOnDate(targetUserIds: string[], date: string): Promise<Reaction[]>;

  // Cast Call methods
  getCastCallChallenges(date: string): Promise<CastCallChallenge[]>;
  createCastCallChallenge(data: InsertCastCallChallenge): Promise<CastCallChallenge>;
  getCastCallChallengeById(id: string): Promise<CastCallChallenge | undefined>;
  updateCastCallChallengeFinalGuessOptions(id: string, options: string): Promise<boolean>;
  getCastCallCompletion(userId: string, challengeId: string): Promise<CastCallCompletion | undefined>;
  recordCastCallCompletionWithStats(
    completion: InsertCastCallCompletion,
    context: {
      difficulty: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<CastCallCompletion | null>;

  // Premier methods
  getPremierChallenges(date: string): Promise<PremierChallenge[]>;
  createPremierChallenge(data: InsertPremierChallenge): Promise<PremierChallenge>;
  getPremierCompletion(userId: string, challengeId: string): Promise<PremierCompletion | undefined>;
  getPremierCompletionsForDate(userId: string, date: string): Promise<(PremierCompletion & { difficulty: string })[]>;
  recordPremierCompletionWithStats(
    completion: InsertPremierCompletion,
    context: {
      difficulty: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<{ completion: PremierCompletion; isNew: boolean }>;

  // Subscription methods
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getSubscriptionByOriginalTransactionId(txnId: string): Promise<UserSubscription | undefined>;
  upsertSubscription(data: Partial<InsertUserSubscription> & { originalTransactionId: string; userId: string; plan: string; productId: string; status: string; environment: string }): Promise<UserSubscription>;
  createSubscriptionEvent(data: InsertSubscriptionEvent): Promise<SubscriptionEvent | null>;
  isUserEntitled(userId: string): Promise<boolean>;
}

// Super streak helper: checks if all 3 modes have completions today,
// and if so, increments super streak (idempotently via superStreakLastDate).
// Must be called inside the same transaction & FOR UPDATE lock scope.
async function updateSuperStreakInTx(tx: any, userId: string, statsId: string, today: string, yesterday: string) {
  // Check all 3 modes for today
  const [sdToday] = await tx.select({ id: userChallengeCompletions.id })
    .from(userChallengeCompletions)
    .innerJoin(dailyChallenges, eq(userChallengeCompletions.challengeId, dailyChallenges.id))
    .where(and(eq(userChallengeCompletions.userId, userId), eq(dailyChallenges.date, today)))
    .limit(1);
  const [ccToday] = await tx.select({ id: castCallCompletions.id })
    .from(castCallCompletions)
    .innerJoin(castCallChallenges, eq(castCallCompletions.challengeId, castCallChallenges.id))
    .where(and(eq(castCallCompletions.userId, userId), eq(castCallChallenges.challengeDate, today)))
    .limit(1);
  const [premToday] = await tx.select({ id: premierCompletions.id })
    .from(premierCompletions)
    .innerJoin(premierChallenges, eq(premierCompletions.challengeId, premierChallenges.id))
    .where(and(eq(premierCompletions.userId, userId), eq(premierChallenges.challengeDate, today)))
    .limit(1);

  if (!sdToday || !ccToday || !premToday) return; // Not all 3 modes completed today

  // All 3 modes done today — update super streak (idempotent via superStreakLastDate)
  await tx.update(userStats)
    .set({
      superStreakCurrent: sql`
        CASE
          WHEN ${userStats.superStreakLastDate} = ${today} THEN COALESCE(${userStats.superStreakCurrent}, 0)
          WHEN ${userStats.superStreakLastDate} = ${yesterday} THEN COALESCE(${userStats.superStreakCurrent}, 0) + 1
          ELSE 1
        END
      `,
      superStreakMax: sql`GREATEST(COALESCE(${userStats.superStreakMax}, 0),
        CASE
          WHEN ${userStats.superStreakLastDate} = ${today} THEN COALESCE(${userStats.superStreakCurrent}, 0)
          WHEN ${userStats.superStreakLastDate} = ${yesterday} THEN COALESCE(${userStats.superStreakCurrent}, 0) + 1
          ELSE 1
        END
      )`,
      superStreakLastDate: today,
    })
    .where(eq(userStats.id, statsId));
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

  async getDailyChallengesInRange(startDate: string, endDate: string): Promise<DailyChallenge[]> {
    return await withRetry(async () => {
      return await db.select().from(dailyChallenges)
        .where(and(
          sql`${dailyChallenges.date} >= ${startDate}`,
          sql`${dailyChallenges.date} <= ${endDate}`,
        ));
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

  async getHomeModePreference(userId: string): Promise<HomeModePreferenceResponse> {
    const stats = await this.getUserStats(userId);
    return buildHomeModePreferenceResponse(stats);
  }

  async trackHomeModeEngagement(
    userId: string,
    mode: HomeModePreferenceMode,
  ): Promise<HomeModePreferenceResponse> {
    return await withRetry(async () => {
      return await db.transaction(async (tx: any) => {
        const now = new Date();

        await tx.execute(sql`
          SELECT ${users.id}
          FROM ${users}
          WHERE ${users.id} = ${userId}
          FOR UPDATE
        `);

        let [existingStats] = await tx.select().from(userStats)
          .where(eq(userStats.userId, userId))
          .limit(1);
        if (!existingStats) {
          const [createdStats] = await tx.insert(userStats)
            .values({ userId })
            .returning();
          existingStats = createdStats;
        }

        const current = buildHomeModePreferenceResponse(existingStats, now);
        const updatedScores = {
          sixDegrees: clampHomeModeScore(
            (mode === "six_degrees" ? current.scores.sixDegrees + HOME_MODE_SCORE_BOOST : current.scores.sixDegrees - HOME_MODE_SCORE_PENALTY)
          ),
          castCall: clampHomeModeScore(
            (mode === "cast_call" ? current.scores.castCall + HOME_MODE_SCORE_BOOST : current.scores.castCall - HOME_MODE_SCORE_PENALTY)
          ),
          premier: clampHomeModeScore(
            (mode === "premier" ? current.scores.premier + HOME_MODE_SCORE_BOOST : current.scores.premier - HOME_MODE_SCORE_PENALTY)
          ),
        };
        const preferredMode = resolvePreferredHomeMode(updatedScores, [mode, current.preferredMode, "six_degrees"]);

        await tx.update(userStats)
          .set({
            homePreferredMode: preferredMode,
            homePreferenceLastInteractionAt: now,
            homePreferenceSixDegreesScore: updatedScores.sixDegrees,
            homePreferenceCastCallScore: updatedScores.castCall,
            homePreferencePremierScore: updatedScores.premier,
            updatedAt: now,
          })
          .where(eq(userStats.id, existingStats.id));

        return {
          preferredMode,
          scores: updatedScores,
        };
      });
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
        // Composite streak (shared columns — any mode played today keeps it alive)
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

        // SD-specific streak (uses SD-specific lastPlayedDate)
        const sdStreakExpr = sql<number>`
          CASE
            WHEN ${userStats.sdLastPlayedDate} = ${context.today} THEN COALESCE(${userStats.sdStreakCurrent}, 0)
            WHEN ${userStats.sdLastPlayedDate} = ${context.yesterday} THEN COALESCE(${userStats.sdStreakCurrent}, 0) + 1
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
            // Composite streak (any mode)
            currentStreak: streakExpr,
            maxStreak: sql`GREATEST(COALESCE(${userStats.maxStreak}, 0), ${streakExpr})`,
            lastPlayedDate: context.today,
            // SD-specific streak
            sdStreakCurrent: sdStreakExpr,
            sdStreakMax: sql`GREATEST(COALESCE(${userStats.sdStreakMax}, 0), ${sdStreakExpr})`,
            sdLastPlayedDate: context.today,
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

        // Check super streak (all 3 modes completed today)
        await updateSuperStreakInTx(tx, completion.userId, existingStats.id, context.today, context.yesterday);

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
      const currentUser = await this.getUserById(userId);

      const participants = [
        ...(currentUser ? [{
          id: currentUser.id,
          friendshipId: null as string | null,
          username: currentUser.username,
          picture: currentUser.picture,
        }] : []),
        ...friends,
      ];

      // Get today's challenges for all modes
      const todayChallenges = await db.select().from(dailyChallenges)
        .where(eq(dailyChallenges.date, date));
      const todayCCChallenges = await db.select().from(castCallChallenges)
        .where(eq(castCallChallenges.challengeDate, date));
      const todayPremierChallenges = await db.select().from(premierChallenges)
        .where(eq(premierChallenges.challengeDate, date));

      // Batch-fetch reactions for all visible participants on this date.
      const participantIds = participants.map(p => p.id);
      const allReactions = participantIds.length > 0
        ? await this.getReactionsForUsersOnDate(participantIds, date)
        : [];
      // Key by targetUserId:gameMode:difficulty
      const reactionsByKey = new Map<string, { reactorUserId: string; emoji: string }[]>();
      for (const reaction of allReactions) {
        const gm = (reaction as any).gameMode || 'six_degrees';
        const key = `${reaction.targetUserId}:${gm}:${reaction.difficulty}`;
        const existing = reactionsByKey.get(key) ?? [];
        existing.push({ reactorUserId: reaction.reactorUserId, emoji: reaction.emoji });
        reactionsByKey.set(key, existing);
      }

      const results = [];
      for (const participant of participants) {
        // Get user stats
        const [stats] = await db.select().from(userStats)
          .where(eq(userStats.userId, participant.id));

        const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        const todayCompletions: any[] = [];

        // Six Degrees completions
        const sortedSDChallenges = [...todayChallenges].sort(
          (a, b) => (difficultyOrder[a.difficulty] ?? 99) - (difficultyOrder[b.difficulty] ?? 99)
        );
        for (const challenge of sortedSDChallenges) {
          const [completion] = await db.select().from(userChallengeCompletions)
            .where(and(
              eq(userChallengeCompletions.userId, participant.id),
              eq(userChallengeCompletions.challengeId, challenge.id)
            ));
          const pillReactions = reactionsByKey.get(`${participant.id}:six_degrees:${challenge.difficulty}`) ?? [];
          todayCompletions.push({
            gameMode: 'six_degrees',
            difficulty: challenge.difficulty,
            completed: !!completion,
            moves: completion?.moves ?? null,
            reactions: pillReactions,
          });
        }

        // Cast Call completions
        const sortedCCChallenges = [...todayCCChallenges].sort(
          (a, b) => (difficultyOrder[a.difficulty] ?? 99) - (difficultyOrder[b.difficulty] ?? 99)
        );
        for (const challenge of sortedCCChallenges) {
          const [completion] = await db.select().from(castCallCompletions)
            .where(and(
              eq(castCallCompletions.userId, participant.id),
              eq(castCallCompletions.challengeId, challenge.id)
            ));
          const pillReactions = reactionsByKey.get(`${participant.id}:cast_call:${challenge.difficulty}`) ?? [];
          todayCompletions.push({
            gameMode: 'cast_call',
            difficulty: challenge.difficulty,
            completed: !!completion,
            stars: completion ? (completion as any).stars : null,
            actorsRevealed: completion ? (completion as any).actorsRevealed : null,
            reactions: pillReactions,
          });
        }

        // Premier completions
        const sortedPremierChallenges = [...todayPremierChallenges].sort(
          (a, b) => (difficultyOrder[a.difficulty] ?? 99) - (difficultyOrder[b.difficulty] ?? 99)
        );
        for (const challenge of sortedPremierChallenges) {
          const [completion] = await db.select().from(premierCompletions)
            .where(and(
              eq(premierCompletions.userId, participant.id),
              eq(premierCompletions.challengeId, challenge.id)
            ));
          const pillReactions = reactionsByKey.get(`${participant.id}:premier:${challenge.difficulty}`) ?? [];
          todayCompletions.push({
            gameMode: 'premier',
            difficulty: challenge.difficulty,
            completed: !!completion,
            reels: completion?.reels ?? null,
            result: completion?.result ?? null,
            reactions: pillReactions,
          });
        }

        results.push({
          id: participant.id,
          friendshipId: participant.friendshipId ?? null,
          username: participant.username,
          picture: participant.picture,
          currentStreak: stats?.currentStreak ?? 0,
          totalCompletions: stats?.totalCompletions ?? 0,
          todayCompletions,
        });
      }

      return results;
    });
  }

  // Reaction methods

  async upsertReaction(reactorUserId: string, targetUserId: string, challengeDate: string, gameMode: string, difficulty: string, emoji: string): Promise<Reaction> {
    return await withRetry(async () => {
      const [reaction] = await db.insert(reactions)
        .values({ reactorUserId, targetUserId, challengeDate, gameMode, difficulty, emoji })
        .onConflictDoUpdate({
          target: [reactions.reactorUserId, reactions.targetUserId, reactions.challengeDate, reactions.gameMode, reactions.difficulty],
          set: { emoji },
        })
        .returning();
      return reaction;
    });
  }

  async removeReaction(reactorUserId: string, targetUserId: string, challengeDate: string, gameMode: string, difficulty: string): Promise<void> {
    await withRetry(async () => {
      await db.delete(reactions).where(and(
        eq(reactions.reactorUserId, reactorUserId),
        eq(reactions.targetUserId, targetUserId),
        eq(reactions.challengeDate, challengeDate),
        eq(reactions.gameMode, gameMode),
        eq(reactions.difficulty, difficulty),
      ));
    });
  }

  async createReactionEvent(
    targetUserId: string,
    reactorUserId: string,
    challengeDate: string,
    gameMode: string,
    difficulty: string,
    emoji: string,
    reactionId?: string | null,
  ): Promise<ReactionEvent> {
    return await withRetry(async () => {
      const [event] = await db.insert(reactionEvents)
        .values({
          targetUserId,
          reactorUserId,
          challengeDate,
          gameMode,
          difficulty,
          emoji,
          reactionId: reactionId ?? null,
        })
        .returning();
      return event;
    });
  }

  async getReactionInbox(userId: string, cursor: string | undefined, limit: number): Promise<ReactionInboxPage> {
    return await withRetry(async () => {
      let whereClause: any = eq(reactionEvents.targetUserId, userId);

      if (cursor) {
        const [cursorEvent] = await db
          .select({
            id: reactionEvents.id,
            createdAt: reactionEvents.createdAt,
          })
          .from(reactionEvents)
          .where(and(
            eq(reactionEvents.id, cursor),
            eq(reactionEvents.targetUserId, userId),
          ));

        if (cursorEvent?.createdAt) {
          whereClause = and(
            eq(reactionEvents.targetUserId, userId),
            or(
              lt(reactionEvents.createdAt, cursorEvent.createdAt),
              and(
                eq(reactionEvents.createdAt, cursorEvent.createdAt),
                lt(reactionEvents.id, cursorEvent.id),
              ),
            ),
          );
        }
      }

      const rows = await db
        .select({
          id: reactionEvents.id,
          reactorUserId: reactionEvents.reactorUserId,
          reactorUsername: users.username,
          reactorPicture: users.picture,
          targetUserId: reactionEvents.targetUserId,
          challengeDate: reactionEvents.challengeDate,
          gameMode: reactionEvents.gameMode,
          difficulty: reactionEvents.difficulty,
          emoji: reactionEvents.emoji,
          moves: userChallengeCompletions.moves,
          stars: castCallCompletions.stars,
          actorsRevealed: castCallCompletions.actorsRevealed,
          reels: premierCompletions.reels,
          result: premierCompletions.result,
          createdAt: reactionEvents.createdAt,
          readAt: reactionEvents.readAt,
        })
        .from(reactionEvents)
        .innerJoin(users, eq(reactionEvents.reactorUserId, users.id))
        // SD join (moves) — only match when gameMode is six_degrees
        .leftJoin(dailyChallenges, and(
          eq(reactionEvents.gameMode, 'six_degrees'),
          eq(dailyChallenges.date, reactionEvents.challengeDate),
          eq(dailyChallenges.difficulty, reactionEvents.difficulty),
        ))
        .leftJoin(userChallengeCompletions, and(
          eq(userChallengeCompletions.userId, reactionEvents.targetUserId),
          eq(userChallengeCompletions.challengeId, dailyChallenges.id),
        ))
        // CC join (stars, actorsRevealed) — only match when gameMode is cast_call
        .leftJoin(castCallChallenges, and(
          eq(reactionEvents.gameMode, 'cast_call'),
          eq(castCallChallenges.challengeDate, reactionEvents.challengeDate),
          eq(castCallChallenges.difficulty, reactionEvents.difficulty),
        ))
        .leftJoin(castCallCompletions, and(
          eq(castCallCompletions.userId, reactionEvents.targetUserId),
          eq(castCallCompletions.challengeId, castCallChallenges.id),
        ))
        // Premier join (reels, result) — only match when gameMode is premier
        .leftJoin(premierChallenges, and(
          eq(reactionEvents.gameMode, 'premier'),
          eq(premierChallenges.challengeDate, reactionEvents.challengeDate),
          eq(premierChallenges.difficulty, reactionEvents.difficulty),
        ))
        .leftJoin(premierCompletions, and(
          eq(premierCompletions.userId, reactionEvents.targetUserId),
          eq(premierCompletions.challengeId, premierChallenges.id),
        ))
        .where(whereClause)
        .orderBy(desc(reactionEvents.createdAt), desc(reactionEvents.id))
        .limit(limit + 1);

      const [unreadRow] = await db
        .select({ count: count() })
        .from(reactionEvents)
        .where(and(
          eq(reactionEvents.targetUserId, userId),
          isNull(reactionEvents.readAt),
        ));

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
        unreadCount: Number(unreadRow?.count ?? 0),
      };
    });
  }

  async markReactionInboxRead(userId: string, upToEventId?: string): Promise<number> {
    await withRetry(async () => {
      const readAt = new Date();

      if (!upToEventId) {
        await db
          .update(reactionEvents)
          .set({ readAt })
          .where(and(
            eq(reactionEvents.targetUserId, userId),
            isNull(reactionEvents.readAt),
          ));
        return;
      }

      const [upToEvent] = await db
        .select({
          createdAt: reactionEvents.createdAt,
        })
        .from(reactionEvents)
        .where(and(
          eq(reactionEvents.id, upToEventId),
          eq(reactionEvents.targetUserId, userId),
        ));

      if (!upToEvent?.createdAt) {
        return;
      }

      await db
        .update(reactionEvents)
        .set({ readAt })
        .where(and(
          eq(reactionEvents.targetUserId, userId),
          isNull(reactionEvents.readAt),
          lte(reactionEvents.createdAt, upToEvent.createdAt),
        ));
    });

    return this.getReactionInboxUnreadCount(userId);
  }

  async getReactionInboxUnreadCount(userId: string): Promise<number> {
    return await withRetry(async () => {
      const [row] = await db
        .select({ count: count() })
        .from(reactionEvents)
        .where(and(
          eq(reactionEvents.targetUserId, userId),
          isNull(reactionEvents.readAt),
        ));
      return Number(row?.count ?? 0);
    });
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    return await withRetry(async () => {
      const [friendship] = await db.select().from(friendships)
        .where(and(
          or(
            and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
            and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
          ),
          eq(friendships.status, "accepted")
        ));
      return !!friendship;
    });
  }

  async hasCompletionForModeAndDifficulty(userId: string, date: string, gameMode: string, difficulty: string): Promise<boolean> {
    return await withRetry(async () => {
      if (gameMode === 'cast_call') {
        const [result] = await db.select({ id: castCallCompletions.id })
          .from(castCallCompletions)
          .innerJoin(castCallChallenges, eq(castCallCompletions.challengeId, castCallChallenges.id))
          .where(and(
            eq(castCallCompletions.userId, userId),
            eq(castCallChallenges.challengeDate, date),
            eq(castCallChallenges.difficulty, difficulty),
          ));
        return !!result;
      }
      if (gameMode === 'premier') {
        const [result] = await db.select({ id: premierCompletions.id })
          .from(premierCompletions)
          .innerJoin(premierChallenges, eq(premierCompletions.challengeId, premierChallenges.id))
          .where(and(
            eq(premierCompletions.userId, userId),
            eq(premierChallenges.challengeDate, date),
            eq(premierChallenges.difficulty, difficulty),
          ));
        return !!result;
      }
      // Default: six_degrees
      const [result] = await db.select({ id: userChallengeCompletions.id })
        .from(userChallengeCompletions)
        .innerJoin(dailyChallenges, eq(userChallengeCompletions.challengeId, dailyChallenges.id))
        .where(and(
          eq(userChallengeCompletions.userId, userId),
          eq(dailyChallenges.date, date),
          eq(dailyChallenges.difficulty, difficulty),
        ));
      return !!result;
    });
  }

  async getReactionsForUsersOnDate(targetUserIds: string[], date: string): Promise<Reaction[]> {
    if (targetUserIds.length === 0) return [];
    return await withRetry(async () => {
      return await db.select().from(reactions).where(and(
        inArray(reactions.targetUserId, targetUserIds),
        eq(reactions.challengeDate, date),
      ));
    });
  }

  async getFriendsLeaderboard(userId: string, sortBy: string, isEntitled: boolean = true, mode: string = 'all'): Promise<any> {
    return await withRetry(async () => {
      const friends = await this.getAcceptedFriends(userId);

      // Include current user in leaderboard
      const currentUser = await this.getUserById(userId);
      const allParticipants = [
        ...friends.map(f => ({ id: f.id, username: f.username, picture: f.picture, isCurrentUser: false })),
        ...(currentUser ? [{ id: currentUser.id, username: currentUser.username, picture: currentUser.picture, isCurrentUser: true }] : []),
      ];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leaderboard = [];
      for (const participant of allParticipants) {
        const [stats] = await db.select().from(userStats)
          .where(eq(userStats.userId, participant.id));

        // Calculate avg moves from last 7 days (SD)
        let avgMoves7Day: number | null = null;
        if (mode === 'six_degrees' || mode === 'all') {
          const recentSDCompletions = await db.select().from(userChallengeCompletions)
            .where(and(
              eq(userChallengeCompletions.userId, participant.id),
              gt(userChallengeCompletions.completedAt, sevenDaysAgo)
            ));
          if (recentSDCompletions.length > 0) {
            const totalMoves = recentSDCompletions.reduce((sum: number, c: any) => sum + c.moves, 0);
            avgMoves7Day = Math.round((totalMoves / recentSDCompletions.length) * 10) / 10;
          }
        }

        // Cast Call avg stars (7 day)
        let castCallAvgStars: number | null = null;
        let castCallStreak = stats?.castCallStreakCurrent ?? 0;
        let castCallTotalTrophies = 0;
        if (mode === 'cast_call' || mode === 'all') {
          const recentCCCompletions = await db.select({ stars: castCallCompletions.stars }).from(castCallCompletions)
            .where(and(
              eq(castCallCompletions.userId, participant.id),
              gt(castCallCompletions.completedAt, sevenDaysAgo)
            ));
          if (recentCCCompletions.length > 0) {
            const totalStars = recentCCCompletions.reduce((sum: number, c: any) => sum + c.stars, 0);
            castCallAvgStars = Math.round((totalStars / recentCCCompletions.length) * 10) / 10;
          }
          castCallTotalTrophies = (stats?.trophyDirectorsCut ?? 0) + (stats?.trophyBoxOfficeHit ?? 0)
            + (stats?.trophyCCMatinee ?? 0) + (stats?.trophyBMovie ?? 0)
            + (stats?.trophyStraightToDvd ?? 0) + (stats?.trophyWalkedOut ?? 0);
        }

        // Premier avg reels (7 day)
        let premierAvgReels: number | null = null;
        let premierStreak = stats?.premierStreakCurrent ?? 0;
        let premierTotalTrophies = 0;
        if (mode === 'premier' || mode === 'all') {
          const recentPremCompletions = await db.select({ reels: premierCompletions.reels, result: premierCompletions.result })
            .from(premierCompletions)
            .where(and(
              eq(premierCompletions.userId, participant.id),
              gt(premierCompletions.completedAt, sevenDaysAgo)
            ));
          if (recentPremCompletions.length > 0) {
            const totalReels = recentPremCompletions.reduce((sum: number, c: any) => sum + c.reels, 0);
            premierAvgReels = Math.round((totalReels / recentPremCompletions.length) * 10) / 10;
          }
          premierTotalTrophies = (stats?.trophyFilmHistorian ?? 0) + (stats?.trophyArchivist ?? 0)
            + (stats?.trophyCinephile ?? 0) + (stats?.trophyCasualViewer ?? 0)
            + (stats?.trophyTimeTraveler ?? 0) + (stats?.trophyLostInTime ?? 0);
        }

        // SD trophy totals
        const sdTrophyBreakdown: Record<string, number> = {
          walkOfFame: stats?.trophyWalkOfFame ?? 0,
          oscar: stats?.trophyOscar ?? 0,
          goldenGlobe: stats?.trophyGoldenGlobe ?? 0,
          emmy: stats?.trophyEmmy ?? 0,
          sag: stats?.trophySag ?? 0,
          popcorn: stats?.trophyPopcorn ?? 0,
        };
        const sdTotalTrophies = Object.values(sdTrophyBreakdown).reduce((sum, v) => sum + v, 0);

        // Compute sort value and totals based on mode
        let sortValue = 0;
        let displayStreak = 0;
        let displayMaxStreak = stats?.maxStreak ?? 0;
        let displayTotalTrophies = 0;
        let trophyBreakdown = sdTrophyBreakdown;

        if (mode === 'six_degrees') {
          displayStreak = stats?.sdStreakCurrent ?? stats?.currentStreak ?? 0;
          displayMaxStreak = stats?.sdStreakMax ?? stats?.maxStreak ?? 0;
          displayTotalTrophies = sdTotalTrophies;
          if (sortBy === "streak") sortValue = displayStreak;
          else if (sortBy === "efficiency") sortValue = avgMoves7Day ?? 999;
          else if (sortBy === "trophies") {
            const wScore = sdTrophyBreakdown.walkOfFame * 6 + sdTrophyBreakdown.oscar * 5
              + sdTrophyBreakdown.goldenGlobe * 4 + sdTrophyBreakdown.emmy * 3
              + sdTrophyBreakdown.sag * 2 + sdTrophyBreakdown.popcorn * 1;
            sortValue = wScore > 0 ? wScore : (stats?.totalCompletions ?? 0);
          }
        } else if (mode === 'cast_call') {
          displayStreak = castCallStreak;
          displayMaxStreak = stats?.castCallStreakMax ?? 0;
          displayTotalTrophies = castCallTotalTrophies;
          if (sortBy === "streak") sortValue = castCallStreak;
          else if (sortBy === "efficiency") sortValue = castCallAvgStars != null ? -castCallAvgStars : 999; // negate: higher stars = better
          else if (sortBy === "trophies") sortValue = castCallTotalTrophies;
        } else if (mode === 'premier') {
          displayStreak = premierStreak;
          displayMaxStreak = stats?.premierStreakMax ?? 0;
          displayTotalTrophies = premierTotalTrophies;
          if (sortBy === "streak") sortValue = premierStreak;
          else if (sortBy === "efficiency") sortValue = premierAvgReels != null ? -premierAvgReels : 999; // negate: higher reels = better
          else if (sortBy === "trophies") sortValue = premierTotalTrophies;
        } else {
          // mode === 'all'
          displayStreak = stats?.currentStreak ?? 0;
          displayTotalTrophies = sdTotalTrophies + castCallTotalTrophies + premierTotalTrophies;
          if (sortBy === "streak") {
            sortValue = displayStreak;
          } else if (sortBy === "efficiency") {
            // Composite score: average of normalized scores across played modes
            const scores: number[] = [];
            if (avgMoves7Day != null) scores.push(100 - Math.min(Math.max((avgMoves7Day - 2) / 4, 0), 1) * 100);
            if (castCallAvgStars != null) scores.push(Math.min(castCallAvgStars / 5, 1) * 100);
            if (premierAvgReels != null) scores.push(Math.min(premierAvgReels / 5, 1) * 100);
            sortValue = scores.length > 0 ? -(scores.reduce((a, b) => a + b, 0) / scores.length) : 999;
          } else if (sortBy === "trophies") {
            sortValue = displayTotalTrophies;
          }
        }

        leaderboard.push({
          id: participant.id,
          username: participant.username,
          picture: participant.picture,
          isCurrentUser: participant.isCurrentUser,
          currentStreak: displayStreak,
          maxStreak: displayMaxStreak,
          avgMoves7Day,
          totalTrophies: displayTotalTrophies,
          trophyBreakdown,
          sortValue,
          // Mode-specific fields
          castCallAvgStars,
          castCallStreak,
          castCallTotalTrophies,
          premierAvgReels,
          premierStreak,
          premierTotalTrophies,
          compositeScore: mode === 'all' && sortBy === 'efficiency' && sortValue !== 999 ? Math.abs(sortValue) : undefined,
          superStreakCurrent: stats?.superStreakCurrent ?? 0,
        });
      }

      // Sort: SD efficiency uses lower-is-better raw values; CC, Premier, and all-mode composite
      // store negated higher-is-better values so ascending sort still works here.
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

  // Cast Call methods
  async getCastCallChallenges(date: string): Promise<CastCallChallenge[]> {
    return await withRetry(async () => {
      return await db.select().from(castCallChallenges).where(eq(castCallChallenges.challengeDate, date));
    });
  }

  async createCastCallChallenge(data: InsertCastCallChallenge): Promise<CastCallChallenge> {
    return await withRetry(async () => {
      const [challenge] = await db.insert(castCallChallenges).values(data).returning();
      return challenge;
    });
  }

  async getCastCallChallengeById(id: string): Promise<CastCallChallenge | undefined> {
    return await withRetry(async () => {
      const [challenge] = await db.select().from(castCallChallenges).where(eq(castCallChallenges.id, id));
      return challenge || undefined;
    });
  }

  async updateCastCallChallengeFinalGuessOptions(id: string, options: string): Promise<boolean> {
    return await withRetry(async () => {
      const result = await db.update(castCallChallenges)
        .set({ finalGuessOptions: options })
        .where(and(eq(castCallChallenges.id, id), isNull(castCallChallenges.finalGuessOptions)));
      return (result.rowCount ?? 0) > 0;
    });
  }

  async getCastCallCompletion(userId: string, challengeId: string): Promise<CastCallCompletion | undefined> {
    return await withRetry(async () => {
      const [completion] = await db.select().from(castCallCompletions)
        .where(and(
          eq(castCallCompletions.userId, userId),
          eq(castCallCompletions.challengeId, challengeId)
        ));
      return completion || undefined;
    });
  }

  async recordCastCallCompletionWithStats(
    completion: InsertCastCallCompletion,
    context: {
      difficulty: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<CastCallCompletion | null> {
    return await withRetry(async () => {
      return await db.transaction(async (tx: any) => {
        // 1. Insert completion — ON CONFLICT DO NOTHING for idempotency
        let rows: any[];
        try {
          rows = await tx.insert(castCallCompletions)
            .values(completion)
            .onConflictDoNothing({ target: [castCallCompletions.userId, castCallCompletions.challengeId] })
            .returning();
        } catch (e: any) {
          if (e?.message?.includes('unique') || e?.message?.includes('ON CONFLICT')) {
            const [existing] = await tx.select().from(castCallCompletions)
              .where(and(
                eq(castCallCompletions.userId, completion.userId),
                eq(castCallCompletions.challengeId, completion.challengeId)
              ));
            if (existing) return null;
            rows = await tx.insert(castCallCompletions)
              .values(completion)
              .returning();
          } else {
            throw e;
          }
        }

        if (rows.length === 0) {
          return null;
        }

        // 2. Lock the user row so stats updates serialize
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

        // Composite streak (shared columns — any mode played today keeps it alive)
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

        // Cast Call-specific streak
        const ccStreakExpr = sql<number>`
          CASE
            WHEN ${userStats.castCallLastPlayedDate} = ${context.today} THEN COALESCE(${userStats.castCallStreakCurrent}, 0)
            WHEN ${userStats.castCallLastPlayedDate} = ${context.yesterday} THEN COALESCE(${userStats.castCallStreakCurrent}, 0) + 1
            ELSE 1
          END
        `;

        const shieldUsed = sql<number>`
          CASE
            WHEN ${userStats.lastPlayedDate} = ${context.dayBeforeYesterday}
              AND COALESCE(${userStats.streakShieldsRemaining}, 0) > 0
              THEN 1
            ELSE 0
          END
        `;

        // CC difficulty deltas
        const ccEasyDelta = context.difficulty === "easy" ? 1 : 0;
        const ccMediumDelta = context.difficulty === "medium" ? 1 : 0;
        const ccHardDelta = context.difficulty === "hard" ? 1 : 0;

        // CC trophy tier deltas based on stars
        const stars = completion.stars;
        const directorsCutDelta = stars === 5 ? 1 : 0;
        const boxOfficeHitDelta = stars === 4 ? 1 : 0;
        const ccMatineeDelta = stars === 3 ? 1 : 0;
        const bMovieDelta = stars === 2 ? 1 : 0;
        const straightToDvdDelta = stars === 1 ? 1 : 0;
        const walkedOutDelta = stars === 0 ? 1 : 0;

        // 4. Update stats atomically — cast call counter + composite streak + CC-specific streak/difficulty/trophies
        await tx.update(userStats)
          .set({
            castCallCompletions: sql`COALESCE(${userStats.castCallCompletions}, 0) + 1`,
            // Composite streak
            currentStreak: streakExpr,
            maxStreak: sql`GREATEST(COALESCE(${userStats.maxStreak}, 0), ${streakExpr})`,
            lastPlayedDate: context.today,
            // CC-specific streak
            castCallStreakCurrent: ccStreakExpr,
            castCallStreakMax: sql`GREATEST(COALESCE(${userStats.castCallStreakMax}, 0), ${ccStreakExpr})`,
            castCallLastPlayedDate: context.today,
            // CC difficulty
            castCallEasyCompletions: sql`COALESCE(${userStats.castCallEasyCompletions}, 0) + ${ccEasyDelta}`,
            castCallMediumCompletions: sql`COALESCE(${userStats.castCallMediumCompletions}, 0) + ${ccMediumDelta}`,
            castCallHardCompletions: sql`COALESCE(${userStats.castCallHardCompletions}, 0) + ${ccHardDelta}`,
            // CC trophy tiers
            trophyDirectorsCut: sql`COALESCE(${userStats.trophyDirectorsCut}, 0) + ${directorsCutDelta}`,
            trophyBoxOfficeHit: sql`COALESCE(${userStats.trophyBoxOfficeHit}, 0) + ${boxOfficeHitDelta}`,
            trophyCCMatinee: sql`COALESCE(${userStats.trophyCCMatinee}, 0) + ${ccMatineeDelta}`,
            trophyBMovie: sql`COALESCE(${userStats.trophyBMovie}, 0) + ${bMovieDelta}`,
            trophyStraightToDvd: sql`COALESCE(${userStats.trophyStraightToDvd}, 0) + ${straightToDvdDelta}`,
            trophyWalkedOut: sql`COALESCE(${userStats.trophyWalkedOut}, 0) + ${walkedOutDelta}`,
            // Shield
            streakShieldsRemaining: sql`COALESCE(${userStats.streakShieldsRemaining}, 0) - ${shieldUsed}`,
            lastShieldUsedDate: sql`CASE WHEN ${shieldUsed} = 1 THEN ${context.today} ELSE ${userStats.lastShieldUsedDate} END`,
            updatedAt: new Date(),
          })
          .where(eq(userStats.id, existingStats.id));

        // Check super streak (all 3 modes completed today)
        await updateSuperStreakInTx(tx, completion.userId, existingStats.id, context.today, context.yesterday);

        return rows[0];
      });
    });
  }

  // Premier methods
  async getPremierChallenges(date: string): Promise<PremierChallenge[]> {
    return await withRetry(async () => {
      return await db.select().from(premierChallenges).where(eq(premierChallenges.challengeDate, date));
    });
  }

  async createPremierChallenge(data: InsertPremierChallenge): Promise<PremierChallenge> {
    return await withRetry(async () => {
      const [challenge] = await db.insert(premierChallenges).values(data).returning();
      return challenge;
    });
  }

  async getPremierCompletion(userId: string, challengeId: string): Promise<PremierCompletion | undefined> {
    return await withRetry(async () => {
      const [completion] = await db.select().from(premierCompletions)
        .where(and(
          eq(premierCompletions.userId, userId),
          eq(premierCompletions.challengeId, challengeId)
        ));
      return completion || undefined;
    });
  }

  async getPremierCompletionsForDate(userId: string, date: string): Promise<(PremierCompletion & { difficulty: string })[]> {
    return await withRetry(async () => {
      const rows = await db.select({
        id: premierCompletions.id,
        userId: premierCompletions.userId,
        challengeId: premierCompletions.challengeId,
        moviesSorted: premierCompletions.moviesSorted,
        reels: premierCompletions.reels,
        result: premierCompletions.result,
        completedAt: premierCompletions.completedAt,
        difficulty: premierChallenges.difficulty,
      })
        .from(premierCompletions)
        .innerJoin(premierChallenges, eq(premierCompletions.challengeId, premierChallenges.id))
        .where(and(
          eq(premierCompletions.userId, userId),
          eq(premierChallenges.challengeDate, date)
        ));
      return rows;
    });
  }

  async recordPremierCompletionWithStats(
    completion: InsertPremierCompletion,
    context: {
      difficulty: string;
      today: string;
      yesterday: string;
      dayBeforeYesterday: string;
    },
  ): Promise<{ completion: PremierCompletion; isNew: boolean }> {
    return await withRetry(async () => {
      return await db.transaction(async (tx: any) => {
        // 1. Insert completion — ON CONFLICT DO NOTHING (write-once)
        let rows: any[];
        try {
          rows = await tx.insert(premierCompletions)
            .values(completion)
            .onConflictDoNothing({ target: [premierCompletions.userId, premierCompletions.challengeId] })
            .returning();
        } catch (e: any) {
          if (e?.message?.includes('unique') || e?.message?.includes('ON CONFLICT')) {
            const [existing] = await tx.select().from(premierCompletions)
              .where(and(
                eq(premierCompletions.userId, completion.userId),
                eq(premierCompletions.challengeId, completion.challengeId)
              ));
            if (existing) return { completion: existing, isNew: false };
            rows = await tx.insert(premierCompletions)
              .values(completion)
              .returning();
          } else {
            throw e;
          }
        }

        if (rows.length === 0) {
          // Conflict — return existing row
          const [existing] = await tx.select().from(premierCompletions)
            .where(and(
              eq(premierCompletions.userId, completion.userId),
              eq(premierCompletions.challengeId, completion.challengeId)
            ));
          return { completion: existing, isNew: false };
        }

        // 2. Lock the user row so stats updates serialize
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

        // Composite streak (shared columns — any mode played today keeps it alive)
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

        // Premier-specific streak
        const premierStreakExpr = sql<number>`
          CASE
            WHEN ${userStats.premierLastPlayedDate} = ${context.today} THEN COALESCE(${userStats.premierStreakCurrent}, 0)
            WHEN ${userStats.premierLastPlayedDate} = ${context.yesterday} THEN COALESCE(${userStats.premierStreakCurrent}, 0) + 1
            ELSE 1
          END
        `;

        const shieldUsed = sql<number>`
          CASE
            WHEN ${userStats.lastPlayedDate} = ${context.dayBeforeYesterday}
              AND COALESCE(${userStats.streakShieldsRemaining}, 0) > 0
              THEN 1
            ELSE 0
          END
        `;

        // Premier difficulty deltas
        const premEasyDelta = context.difficulty === "easy" ? 1 : 0;
        const premMediumDelta = context.difficulty === "medium" ? 1 : 0;
        const premHardDelta = context.difficulty === "hard" ? 1 : 0;

        // Premier trophy tier deltas based on earned reels.
        // These reuse the legacy user_stats trophy columns as six ordered reel buckets.
        const reels = completion.reels;
        const filmHistorianDelta = reels === 0 ? 1 : 0;
        const archivistDelta = reels === 1 ? 1 : 0;
        const cinephileDelta = reels === 2 ? 1 : 0;
        const casualViewerDelta = reels === 3 ? 1 : 0;
        const timeTravelerDelta = reels === 4 ? 1 : 0;
        const lostInTimeDelta = reels === 5 ? 1 : 0;

        // 4. Update stats atomically — premier counter + composite streak + Premier-specific streak/difficulty/trophies
        await tx.update(userStats)
          .set({
            premierAttempts: sql`COALESCE(${userStats.premierAttempts}, 0) + 1`,
            // Composite streak
            currentStreak: streakExpr,
            maxStreak: sql`GREATEST(COALESCE(${userStats.maxStreak}, 0), ${streakExpr})`,
            lastPlayedDate: context.today,
            // Premier-specific streak
            premierStreakCurrent: premierStreakExpr,
            premierStreakMax: sql`GREATEST(COALESCE(${userStats.premierStreakMax}, 0), ${premierStreakExpr})`,
            premierLastPlayedDate: context.today,
            // Premier difficulty
            premierEasyCompletions: sql`COALESCE(${userStats.premierEasyCompletions}, 0) + ${premEasyDelta}`,
            premierMediumCompletions: sql`COALESCE(${userStats.premierMediumCompletions}, 0) + ${premMediumDelta}`,
            premierHardCompletions: sql`COALESCE(${userStats.premierHardCompletions}, 0) + ${premHardDelta}`,
            // Premier trophy tiers
            trophyFilmHistorian: sql`COALESCE(${userStats.trophyFilmHistorian}, 0) + ${filmHistorianDelta}`,
            trophyArchivist: sql`COALESCE(${userStats.trophyArchivist}, 0) + ${archivistDelta}`,
            trophyCinephile: sql`COALESCE(${userStats.trophyCinephile}, 0) + ${cinephileDelta}`,
            trophyCasualViewer: sql`COALESCE(${userStats.trophyCasualViewer}, 0) + ${casualViewerDelta}`,
            trophyTimeTraveler: sql`COALESCE(${userStats.trophyTimeTraveler}, 0) + ${timeTravelerDelta}`,
            trophyLostInTime: sql`COALESCE(${userStats.trophyLostInTime}, 0) + ${lostInTimeDelta}`,
            // Shield
            streakShieldsRemaining: sql`COALESCE(${userStats.streakShieldsRemaining}, 0) - ${shieldUsed}`,
            lastShieldUsedDate: sql`CASE WHEN ${shieldUsed} = 1 THEN ${context.today} ELSE ${userStats.lastShieldUsedDate} END`,
            updatedAt: new Date(),
          })
          .where(eq(userStats.id, existingStats.id));

        // Check super streak (all 3 modes completed today)
        await updateSuperStreakInTx(tx, completion.userId, existingStats.id, context.today, context.yesterday);

        return { completion: rows[0], isNew: true };
      });
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
          target: userSubscriptions.userId,
          set: {
            userId: data.userId,
            status: data.status,
            plan: data.plan,
            productId: data.productId,
            originalTransactionId: data.originalTransactionId,
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
        .where(eq(userSubscriptions.userId, userId));
      return isSubscriptionEntitledNow(sub);
    });
  }
}

export const storage = new DatabaseStorage();
