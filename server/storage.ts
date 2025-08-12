import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt, type AdminUser, type InsertAdminUser, type AdminSession, type InsertAdminSession, adminUsers, adminSessions, dailyChallenges, gameAttempts } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge>;
  deleteDailyChallenge(date: string): Promise<void>;
  
  // Game Attempt methods
  createGameAttempt(attempt: InsertGameAttempt): Promise<GameAttempt>;
  getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]>;
  
  // Admin methods
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminSession(session: InsertAdminSession): Promise<AdminSession>;
  getValidAdminSession(token: string): Promise<AdminSession | undefined>;
  deleteAdminSession(token: string): Promise<void>;
  updateAdminLastLogin(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Daily Challenge methods
  async getDailyChallenge(date: string): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.date, date));
    return challenge || undefined;
  }

  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [challenge] = await db.insert(dailyChallenges).values(insertChallenge).returning();
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

  async createDailyChallenge(insertChallenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const id = randomUUID();
    const challenge: DailyChallenge = { 
      ...insertChallenge, 
      id,
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
}

export const storage = new DatabaseStorage();
