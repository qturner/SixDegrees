import { type DailyChallenge, type InsertDailyChallenge, type GameAttempt, type InsertGameAttempt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Daily Challenge methods
  getDailyChallenge(date: string): Promise<DailyChallenge | undefined>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  
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
      createdAt: new Date()
    };
    this.dailyChallenges.set(id, challenge);
    return challenge;
  }

  async createGameAttempt(insertAttempt: InsertGameAttempt): Promise<GameAttempt> {
    const id = randomUUID();
    const attempt: GameAttempt = { 
      ...insertAttempt, 
      id,
      createdAt: new Date()
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
