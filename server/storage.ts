import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt, type AdminUser, type InsertAdminUser, type AdminSession, type InsertAdminSession, type ContactSubmission, type InsertContactSubmission, type VisitorAnalytics, type InsertVisitorAnalytics, adminUsers, adminSessions, dailyChallenges, gameAttempts, contactSubmissions, visitorAnalytics } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  getChallengeByStatus(status: string): Promise<DailyChallenge | undefined>;
  getAllChallengesByStatus(status: string): Promise<DailyChallenge[]>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge>;
  updateChallengeStatus(challengeId: string, status: string): Promise<DailyChallenge>;
  deleteDailyChallenge(date: string): Promise<void>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Daily Challenge methods
  async getDailyChallenge(date: string): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.date, date));
    return challenge || undefined;
  }

  async getChallengeByStatus(status: string): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
    return challenge || undefined;
  }

  async getAllChallengesByStatus(status: string): Promise<DailyChallenge[]> {
    return await db.select().from(dailyChallenges).where(eq(dailyChallenges.status, status));
  }

  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [challenge] = await db.insert(dailyChallenges).values(insertChallenge).returning();
    return challenge;
  }

  async updateChallengeStatus(challengeId: string, status: string): Promise<DailyChallenge> {
    const [challenge] = await db.update(dailyChallenges)
      .set({ status })
      .where(eq(dailyChallenges.id, challengeId))
      .returning();
    return challenge;
  }

  async updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge> {
    const updateData: any = { hintsUsed };
    if (startActorHint !== undefined) updateData.startActorHint = startActorHint;
    if (endActorHint !== undefined) updateData.endActorHint = endActorHint;
    
    const [challenge] = await db.update(dailyChallenges)
      .set(updateData)
      .where(eq(dailyChallenges.id, challengeId))
      .returning();
    return challenge;
  }

  async deleteDailyChallenge(date: string): Promise<void> {
    await db.delete(dailyChallenges).where(eq(dailyChallenges.date, date));
  }

  // Game Attempt methods
  async createGameAttempt(insertAttempt: InsertGameAttempt): Promise<GameAttempt> {
    const [attempt] = await db.insert(gameAttempts).values(insertAttempt).returning();
    return attempt;
  }

  async getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]> {
    return await db.select().from(gameAttempts).where(eq(gameAttempts.challengeId, challengeId));
  }

  async getChallengeAnalytics(challengeId: string) {
    const attempts = await this.getGameAttemptsByChallenge(challengeId);
    
    // Get the challenge to know which actors to exclude (start and end actors)
    const challenge = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, challengeId)).limit(1);
    const excludedActorIds = challenge.length > 0 
      ? [challenge[0].startActorId.toString(), challenge[0].endActorId.toString()]
      : [];
    

    
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.completed).length;
    const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;
    
    const completedMoves = attempts.filter(a => a.completed).map(a => a.moves);
    const avgMoves = completedMoves.length > 0 
      ? completedMoves.reduce((sum, moves) => sum + moves, 0) / completedMoves.length 
      : 0;
    
    // Create move distribution (1-6 moves)
    const moveDistribution = Array.from({ length: 6 }, (_, i) => {
      const moves = i + 1;
      const count = completedMoves.filter(m => m === moves).length;
      return { moves, count };
    });

    // Analyze connection chains from completed attempts
    const movieUsage = new Map<string, { title: string; count: number }>();
    const actorUsage = new Map<string, { name: string; count: number }>();

    for (const attempt of attempts.filter(a => a.completed)) {
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

    return {
      totalAttempts,
      completedAttempts,
      completionRate: Math.round(completionRate * 100) / 100,
      avgMoves: Math.round(avgMoves * 100) / 100,
      moveDistribution,
      mostUsedMovies,
      mostUsedActors,
    };
  }

  // Admin methods
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(user.passwordHash, 12);
    const [adminUser] = await db.insert(adminUsers).values({
      ...user,
      passwordHash: hashedPassword,
    }).returning();
    return adminUser;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user || undefined;
  }

  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const [adminSession] = await db.insert(adminSessions).values(session).returning();
    return adminSession;
  }

  async getValidAdminSession(token: string): Promise<AdminSession | undefined> {
    const [session] = await db.select().from(adminSessions)
      .where(and(
        eq(adminSessions.token, token),
        gt(adminSessions.expiresAt, new Date())
      ));
    return session || undefined;
  }

  async deleteAdminSession(token: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
  }

  async updateAdminLastLogin(userId: string): Promise<void> {
    await db.update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, userId));
  }
  
  // Contact methods
  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db.insert(contactSubmissions).values(insertSubmission).returning();
    return submission;
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(contactSubmissions.createdAt);
  }

  async updateContactSubmissionStatus(id: string, status: string): Promise<void> {
    await db.update(contactSubmissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactSubmissions.id, id));
  }
  
  // Visitor Analytics methods
  async trackVisitor(insertAnalytics: InsertVisitorAnalytics): Promise<VisitorAnalytics> {
    const [analytics] = await db.insert(visitorAnalytics).values(insertAnalytics).returning();
    return analytics;
  }

  async createVisitorSession(insertAnalytics: InsertVisitorAnalytics): Promise<VisitorAnalytics> {
    const [analytics] = await db.insert(visitorAnalytics).values(insertAnalytics).returning();
    return analytics;
  }
  
  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorAnalytics>): Promise<void> {
    await db.update(visitorAnalytics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(visitorAnalytics.sessionId, sessionId));
  }
  
  async getReferralAnalytics(days: number = 30): Promise<{
    totalVisitors: number;
    referralBreakdown: { domain: string; type: string; count: number; percentage: number }[];
    topReferrers: { domain: string; count: number; percentage: number }[];
    searchQueries: { query: string; count: number }[];
    utmSources: { source: string; medium: string; campaign: string; count: number }[];
    conversionRates: { total: number; converted: number; rate: number };
    geographicData: { country: string; count: number }[];
    deviceData: { userAgent: string; count: number }[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const visitors = await db.select().from(visitorAnalytics)
      .where(gt(visitorAnalytics.createdAt, cutoffDate));
    
    const totalVisitors = visitors.length;
    
    // Calculate referral breakdown
    const referralCounts = new Map<string, { type: string; count: number }>();
    const searchQueries = new Map<string, number>();
    const utmData = new Map<string, number>();
    const geoCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    let convertedCount = 0;
    
    visitors.forEach(visitor => {
      const domain = visitor.referrerDomain || 'direct';
      const type = visitor.referrerType || 'direct';
      
      if (referralCounts.has(domain)) {
        referralCounts.get(domain)!.count++;
      } else {
        referralCounts.set(domain, { type, count: 1 });
      }
      
      if (visitor.searchQuery) {
        searchQueries.set(visitor.searchQuery, (searchQueries.get(visitor.searchQuery) || 0) + 1);
      }
      
      if (visitor.utmSource) {
        const utmKey = `${visitor.utmSource}|${visitor.utmMedium || ''}|${visitor.utmCampaign || ''}`;
        utmData.set(utmKey, (utmData.get(utmKey) || 0) + 1);
      }
      
      if (visitor.country) {
        geoCounts.set(visitor.country, (geoCounts.get(visitor.country) || 0) + 1);
      }
      
      if (visitor.userAgent) {
        // Extract browser/device from user agent
        const deviceInfo = visitor.userAgent.split(' ')[0] || 'Unknown';
        deviceCounts.set(deviceInfo, (deviceCounts.get(deviceInfo) || 0) + 1);
      }
      
      if (visitor.converted) {
        convertedCount++;
      }
    });
    
    // Format data
    const referralBreakdown = Array.from(referralCounts.entries())
      .map(([domain, data]) => ({
        domain,
        type: data.type,
        count: data.count,
        percentage: Math.round((data.count / totalVisitors) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    const topReferrers = referralBreakdown.slice(0, 10);
    
    const searchQueriesArray = Array.from(searchQueries.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    const utmSourcesArray = Array.from(utmData.entries())
      .map(([key, count]) => {
        const [source, medium, campaign] = key.split('|');
        return { source, medium, campaign, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const geographicData = Array.from(geoCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    const deviceData = Array.from(deviceCounts.entries())
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalVisitors,
      referralBreakdown,
      topReferrers,
      searchQueries: searchQueriesArray,
      utmSources: utmSourcesArray,
      conversionRates: {
        total: totalVisitors,
        converted: convertedCount,
        rate: totalVisitors > 0 ? Math.round((convertedCount / totalVisitors) * 100) : 0
      },
      geographicData,
      deviceData,
    };
  }
}

export class MemStorage implements IStorage {
  private dailyChallenges: Map<string, DailyChallenge>;
  private gameAttempts: Map<string, GameAttempt>;

  constructor() {
    this.dailyChallenges = new Map();
    this.gameAttempts = new Map();
  }

  async getDailyChallenge(date: string): Promise<DailyChallenge | undefined> {
    return Array.from(this.dailyChallenges.values()).find(
      (challenge) => challenge.date === date
    );
  }

  async getChallengeByStatus(status: string): Promise<DailyChallenge | undefined> {
    return Array.from(this.dailyChallenges.values()).find(
      (challenge) => challenge.status === status
    );
  }

  async getAllChallengesByStatus(status: string): Promise<DailyChallenge[]> {
    return Array.from(this.dailyChallenges.values()).filter(
      (challenge) => challenge.status === status
    );
  }

  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const id = randomUUID();
    const challenge: DailyChallenge = { 
      ...insertChallenge, 
      id,
      status: insertChallenge.status || "active",
      createdAt: new Date(),
      startActorProfilePath: insertChallenge.startActorProfilePath || null,
      endActorProfilePath: insertChallenge.endActorProfilePath || null,
      hintsUsed: insertChallenge.hintsUsed || 0,
      startActorHint: null,
      endActorHint: null,
    };
    this.dailyChallenges.set(id, challenge);
    return challenge;
  }

  async updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge> {
    const challenge = this.dailyChallenges.get(challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }
    
    const updatedChallenge = { 
      ...challenge, 
      hintsUsed,
      startActorHint: startActorHint || challenge.startActorHint || null,
      endActorHint: endActorHint || challenge.endActorHint || null,
    };
    
    // Update in the map to ensure it can still be found by ID and date
    this.dailyChallenges.set(challengeId, updatedChallenge);
    
    // Also ensure any existing entry is replaced (defensive programming)
    const existingByDate = Array.from(this.dailyChallenges.entries()).find(
      ([_, c]) => c.date === challenge.date && c.id !== challengeId
    );
    if (existingByDate) {
      this.dailyChallenges.delete(existingByDate[0]);
    }
    
    return updatedChallenge;
  }

  async updateChallengeStatus(challengeId: string, status: string): Promise<DailyChallenge> {
    const challenge = this.dailyChallenges.get(challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }
    
    const updatedChallenge = { ...challenge, status };
    this.dailyChallenges.set(challengeId, updatedChallenge);
    return updatedChallenge;
  }

  async deleteDailyChallenge(date: string): Promise<void> {
    const challengeEntry = Array.from(this.dailyChallenges.entries()).find(
      ([_, challenge]) => challenge.date === date
    );
    if (challengeEntry) {
      this.dailyChallenges.delete(challengeEntry[0]);
    }
  }

  async createGameAttempt(insertAttempt: InsertGameAttempt): Promise<GameAttempt> {
    const id = randomUUID();
    const attempt: GameAttempt = { 
      ...insertAttempt, 
      id,
      createdAt: new Date(),
      completed: insertAttempt.completed || null,
    };
    this.gameAttempts.set(id, attempt);
    return attempt;
  }

  async getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]> {
    return Array.from(this.gameAttempts.values()).filter(
      (attempt) => attempt.challengeId === challengeId
    );
  }

  async getChallengeAnalytics(challengeId: string) {
    const attempts = await this.getGameAttemptsByChallenge(challengeId);
    
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.completed).length;
    const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;
    
    const completedMoves = attempts.filter(a => a.completed).map(a => a.moves);
    const avgMoves = completedMoves.length > 0 
      ? completedMoves.reduce((sum, moves) => sum + moves, 0) / completedMoves.length 
      : 0;
    
    // Create move distribution (1-6 moves)
    const moveDistribution = Array.from({ length: 6 }, (_, i) => {
      const moves = i + 1;
      const count = completedMoves.filter(m => m === moves).length;
      return { moves, count };
    });

    // For MemStorage, return empty arrays since this is just for development
    const mostUsedMovies: { id: string; title: string; count: number }[] = [];
    const mostUsedActors: { id: string; name: string; count: number }[] = [];

    return {
      totalAttempts,
      completedAttempts,
      completionRate: Math.round(completionRate * 100) / 100,
      avgMoves: Math.round(avgMoves * 100) / 100,
      moveDistribution,
      mostUsedMovies,
      mostUsedActors,
    };
  }

  // Admin methods (stub implementations for MemStorage)
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    throw new Error("Admin functionality requires database storage");
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    throw new Error("Admin functionality requires database storage");
  }

  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    throw new Error("Admin functionality requires database storage");
  }

  async getValidAdminSession(token: string): Promise<AdminSession | undefined> {
    throw new Error("Admin functionality requires database storage");
  }

  async deleteAdminSession(token: string): Promise<void> {
    throw new Error("Admin functionality requires database storage");
  }

  async updateAdminLastLogin(userId: string): Promise<void> {
    throw new Error("Admin functionality requires database storage");
  }

  // Contact methods (stub implementations for MemStorage)
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    throw new Error("Contact functionality requires database storage");
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    throw new Error("Contact functionality requires database storage");
  }

  async updateContactSubmissionStatus(id: string, status: string): Promise<void> {
    throw new Error("Contact functionality requires database storage");
  }
  
  // Visitor Analytics methods (not implemented for memory storage)
  async trackVisitor(analytics: InsertVisitorAnalytics): Promise<VisitorAnalytics> {
    throw new Error("Visitor analytics not supported in memory storage");
  }
  
  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorAnalytics>): Promise<void> {
    throw new Error("Visitor analytics not supported in memory storage");
  }
  
  async getReferralAnalytics(days: number = 30): Promise<{
    totalVisitors: number;
    referralBreakdown: { domain: string; type: string; count: number; percentage: number }[];
    topReferrers: { domain: string; count: number; percentage: number }[];
    searchQueries: { query: string; count: number }[];
    utmSources: { source: string; medium: string; campaign: string; count: number }[];
    conversionRates: { total: number; converted: number; rate: number };
    geographicData: { country: string; count: number }[];
    deviceData: { userAgent: string; count: number }[];
  }> {
    // Return empty analytics for memory storage
    return {
      totalVisitors: 0,
      referralBreakdown: [],
      topReferrers: [],
      searchQueries: [],
      utmSources: [],
      conversionRates: { total: 0, converted: 0, rate: 0 },
      geographicData: [],
      deviceData: [],
    };
  }
}

export const storage = new DatabaseStorage();
