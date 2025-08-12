import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  updateDailyChallengeHints(challengeId: string, hintsUsed: number, startActorHint?: string, endActorHint?: string): Promise<DailyChallenge>;
  deleteDailyChallenge(date: string): Promise<void>;
  
  // Game Attempt methods
  createGameAttempt(attempt: InsertGameAttempt): Promise<GameAttempt>;
  getGameAttemptsByChallenge(challengeId: string): Promise<GameAttempt[]>;
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
}

export const storage = new MemStorage();
