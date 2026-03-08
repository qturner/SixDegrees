import { tmdbService } from "./tmdb.js";
import { Actor, Connection, Movie, ValidationResult } from "../../../shared/schema.js";

interface GameValidationContext {
  startActorId: number;
  endActorId: number;
  connections: Connection[];
}

export type DifficultyLevel = "easy" | "medium" | "hard";

interface DistanceBucket {
  difficulty: DifficultyLevel;
  minDistance: number;
  maxDistance: number;
}

interface CandidateScore {
  actor1: Actor;
  actor2: Actor;
  distance: number;
  score: number;
}

interface SearchBudget {
  remainingActorExpansions: number;
}

interface SearchOptions {
  moviePopularityFloor?: number;
}

class GameLogicService {
  private readonly bannedActorNames = new Set(["Brad Pitt"]);
  private readonly maxActorsPerExpansion = 3;
  private readonly maxMoviesPerActor = 6;
  private readonly maxCastPerMovie = 8;
  private readonly maxFrontierSize = 64;

  private readonly distanceBuckets: DistanceBucket[] = [
    { difficulty: "easy", minDistance: 1, maxDistance: 2 },
    { difficulty: "medium", minDistance: 3, maxDistance: 4 },
    { difficulty: "hard", minDistance: 5, maxDistance: 6 },
  ];

  private readonly maxUnifiedPairAttempts = 30;

  async validateConnection(
    actorId: number,
    movieId: number,
    previousActorId?: number,
    nextActorId?: number
  ): Promise<ValidationResult> {
    try {
      // Validate that the actor appeared in the movie
      const actorInMovie = await tmdbService.validateActorInMovie(actorId, movieId);

      if (!actorInMovie) {
        return {
          valid: false,
          message: "This actor did not appear in the specified movie.",
        };
      }

      // If there's a previous actor, validate they were in the same movie
      if (previousActorId) {
        const previousActorInMovie = await tmdbService.validateActorInMovie(previousActorId, movieId);
        if (!previousActorInMovie) {
          return {
            valid: false,
            message: "The previous actor did not appear in this movie.",
          };
        }
      }

      // If there's a next actor, we'll validate that connection when it's added
      return {
        valid: true,
        message: "Valid connection!",
      };
    } catch (error) {
      console.error("Error validating connection:", error);
      return {
        valid: false,
        message: "Unable to validate connection. Please try again.",
      };
    }
  }

  async validateCompleteChain(context: GameValidationContext): Promise<ValidationResult> {
    const { startActorId, endActorId, connections } = context;

    if (connections.length === 0) {
      return {
        valid: false,
        message: "No connections provided.",
      };
    }

    if (connections.length > 6) {
      return {
        valid: false,
        message: "Too many connections. Maximum is 6 moves.",
      };
    }

    try {
      // Collect all validation promise factories (not promises yet)
      type ValidationCheckResult = {
        valid: boolean;
        message: string;
        type: 'start' | 'end' | 'internal' | 'continuity';
        index?: number;
      };

      const validationFactories: (() => Promise<ValidationCheckResult>)[] = [];

      // 1. Validate starting actor in first movie
      validationFactories.push(
        () => tmdbService.validateActorInMovie(startActorId, connections[0].movieId)
          .then(valid => ({ valid, message: "The starting actor did not appear in the first movie.", type: 'start' as const }))
      );

      // 2. Validate ending actor in last movie
      validationFactories.push(
        () => tmdbService.validateActorInMovie(endActorId, connections[connections.length - 1].movieId)
          .then(valid => ({ valid, message: "The ending actor did not appear in the final movie.", type: 'end' as const }))
      );

      // 3. Validate each connection's internal consistency (Actor X in Movie X)
      connections.forEach((connection, i) => {
        validationFactories.push(
          () => tmdbService.validateActorInMovie(connection.actorId, connection.movieId)
            .then(valid => ({
              valid,
              message: `Connection ${i + 1}: ${connection.actorName} did not appear in ${connection.movieTitle}.`,
              type: 'internal' as const,
              index: i
            }))
        );
      });

      // 4. Validate chain continuity (Actor X in Movie X+1)
      for (let i = 0; i < connections.length - 1; i++) {
        const currentActorId = connections[i].actorId;
        const nextMovieId = connections[i + 1].movieId;
        const currentActorName = connections[i].actorName;
        const nextMovieTitle = connections[i + 1].movieTitle;

        validationFactories.push(
          () => tmdbService.validateActorInMovie(currentActorId, nextMovieId)
            .then(valid => ({
              valid,
              message: `Connection ${i + 1}: ${currentActorName} did not appear in the next movie ${nextMovieTitle}.`,
              type: 'continuity' as const,
              index: i
            }))
        );
      }

      // Execute validations in batches to avoid rate limiting
      const runBatched = async <T>(factories: (() => Promise<T>)[], limit: number): Promise<T[]> => {
        const results: T[] = [];
        for (let i = 0; i < factories.length; i += limit) {
          const batch = factories.slice(i, i + limit);
          const batchResults = await Promise.all(batch.map(f => f()));
          results.push(...batchResults);
        }
        return results;
      };

      // Batch size of 3 means ~4 batches for a full game, preventing connection exhaustion
      const results = await runBatched(validationFactories, 3);

      // Check results in logical order for user-friendly error messages

      // 1. Check start
      const startResult = results.find(r => r.type === 'start');
      if (!startResult?.valid) return { valid: false, message: startResult!.message };

      // 2. Check internal consistency and continuity in order
      for (let i = 0; i < connections.length; i++) {
        // Check if actor is in their own movie
        const internalResult = results.find(r => r.type === 'internal' && r.index === i);
        if (!internalResult?.valid) return { valid: false, message: internalResult!.message };

        // Check if actor connects to next movie
        if (i < connections.length - 1) {
          const continuityResult = results.find(r => r.type === 'continuity' && r.index === i);
          if (!continuityResult?.valid) return { valid: false, message: continuityResult!.message };
        }
      }

      // 3. Check end
      const endResult = results.find(r => r.type === 'end');
      if (!endResult?.valid) return { valid: false, message: endResult!.message };

      // Check if we've successfully connected the actors
      const isComplete = true; // If we've reached here, the chain is valid

      return {
        valid: true,
        completed: isComplete,
        moves: connections.length,
        message: `Congratulations! You've successfully connected the actors in ${connections.length} moves!`,
      };
    } catch (error) {
      console.error("Error validating complete chain:", error);
      return {
        valid: false,
        message: "Unable to validate the connection chain. Please try again.",
      };
    }
  }

  /**
   * Validates that a path exists between two actors within the specified max depth.
   * Uses bidirectional BFS to find a connection.
   */
  async findPath(startId: number, endId: number, maxDepth: number = 6): Promise<boolean> {
    const distance = await this.findPathDistance(startId, endId, maxDepth);
    return distance !== null;
  }

  /**
   * Generate all difficulty pairs sequentially so each difficulty can apply its
   * own actor-pool and BFS constraints while preserving cross-bucket uniqueness.
   */
  async generateAllDailyChallenges(
    excludeActorIds: number[] = [],
  ): Promise<Map<DifficultyLevel, { actor1: Actor; actor2: Actor; distance: number }>> {
    const results = new Map<DifficultyLevel, { actor1: Actor; actor2: Actor; distance: number }>();

    try {
      const usedActorIds = new Set<number>(excludeActorIds);
      for (const bucket of this.distanceBuckets) {
        const pair = await this.generateDailyActors(bucket.difficulty, [...usedActorIds]);
        if (!pair) {
          console.warn(`No pair found for ${bucket.difficulty} difficulty`);
          continue;
        }

        results.set(bucket.difficulty, pair);
        usedActorIds.add(pair.actor1.id);
        usedActorIds.add(pair.actor2.id);
      }

      console.log(`Generated ${results.size}/${this.distanceBuckets.length} difficulty pairs`);
      return results;
    } catch (error) {
      console.error("Error generating all daily challenges:", error);
      return results;
    }
  }

  /**
   * Generate a single actor pair for a specific difficulty.
   * Backward compatible with admin routes and single-difficulty generation.
   */
  async generateDailyActors(
    difficulty: DifficultyLevel = "medium",
    excludeActorIds: number[] = [],
  ): Promise<{ actor1: Actor; actor2: Actor; distance: number } | null> {
    try {
      const pool = await this.getActorPoolForDifficulty(difficulty);
      if (pool.length < 2) {
        console.error(`Actor pool too small for ${difficulty}: ${pool.length}`);
        return null;
      }

      const bucket = this.distanceBuckets.find(b => b.difficulty === difficulty);
      if (!bucket) {
        console.error(`Unknown difficulty: ${difficulty}`);
        return null;
      }

      let bestFallback: CandidateScore | null = null;
      const searchOptions = this.getSearchOptions(difficulty);

      for (let attempt = 0; attempt < this.maxUnifiedPairAttempts; attempt++) {
        const actor1 = this.pickRandomActor(pool);
        const actor2 = this.pickRandomActor(pool);
        if (!actor1 || !actor2) continue;
        if (!this.isEligiblePair(actor1, actor2, excludeActorIds)) continue;

        const distance = await this.findPathDistance(actor1.id, actor2.id, 6, searchOptions);
        if (distance === null) continue;

        if (distance >= bucket.minDistance && distance <= bucket.maxDistance) {
          console.log(`Selected ${difficulty} pair (${distance} hops): ${actor1.name} <-> ${actor2.name}`);
          return { actor1, actor2, distance };
        }

        // Track fallback
        const midpoint = (bucket.minDistance + bucket.maxDistance) / 2;
        let outsidePenalty = 0;
        if (distance < bucket.minDistance) outsidePenalty = bucket.minDistance - distance;
        else if (distance > bucket.maxDistance) outsidePenalty = distance - bucket.maxDistance;
        const score = outsidePenalty * 100 + Math.abs(distance - midpoint);

        if (!bestFallback || score < bestFallback.score) {
          bestFallback = { actor1, actor2, distance, score };
        }
      }

      if (bestFallback) {
        console.warn(`Using fallback ${difficulty} pair (${bestFallback.distance} hops): ${bestFallback.actor1.name} <-> ${bestFallback.actor2.name}`);
        return { actor1: bestFallback.actor1, actor2: bestFallback.actor2, distance: bestFallback.distance };
      }

      console.warn(`Could not generate ${difficulty} pair after ${this.maxUnifiedPairAttempts} attempts`);
      return null;
    } catch (error) {
      console.error("Error generating daily actors:", error);
      return null;
    }
  }

  private getSearchOptions(difficulty: DifficultyLevel): SearchOptions {
    if (difficulty === "easy") {
      return { moviePopularityFloor: 500 };
    }

    return {};
  }

  private async getActorPoolForDifficulty(difficulty: DifficultyLevel): Promise<Actor[]> {
    if (difficulty === "easy") {
      return tmdbService.getActorsByTier("easy");
    }

    return tmdbService.getQualityActorPool();
  }

  private pickRandomActor(pool: Actor[]): Actor | null {
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  private isEligiblePair(actor1: Actor, actor2: Actor, excludeActorIds: number[]): boolean {
    if (actor1.id === actor2.id) return false;
    if (excludeActorIds.includes(actor1.id) || excludeActorIds.includes(actor2.id)) return false;
    if (this.bannedActorNames.has(actor1.name) || this.bannedActorNames.has(actor2.name)) return false;
    return true;
  }

  async findPathDistance(
    startId: number,
    endId: number,
    maxDepth: number,
    searchOptions: SearchOptions = {},
  ): Promise<number | null> {
    if (startId === endId) return 0;

    const startDepth = new Map<number, number>([[startId, 0]]);
    const endDepth = new Map<number, number>([[endId, 0]]);
    let startFrontier: number[] = [startId];
    let endFrontier: number[] = [endId];
    const neighborsCache = new Map<string, number[]>();
    const budget = this.createSearchBudget(maxDepth);

    let expansionCount = 0;
    const maxExpansions = Math.max(1, maxDepth * 5);

    while (
      startFrontier.length > 0 &&
      endFrontier.length > 0 &&
      expansionCount < maxExpansions
    ) {
      const canExpandStart = this.frontierCanExpand(startFrontier, startDepth, maxDepth);
      const canExpandEnd = this.frontierCanExpand(endFrontier, endDepth, maxDepth);
      if (!canExpandStart && !canExpandEnd) {
        break;
      }

      const expandStart =
        canExpandStart && (!canExpandEnd || startFrontier.length <= endFrontier.length);

      if (expandStart) {
        const result = await this.expandFrontier(
          startFrontier,
          startDepth,
          endDepth,
          maxDepth,
          neighborsCache,
          budget,
          searchOptions,
        );
        if (result.matchDistance !== null) {
          return result.matchDistance;
        }
        startFrontier = result.nextFrontier;
      } else {
        const result = await this.expandFrontier(
          endFrontier,
          endDepth,
          startDepth,
          maxDepth,
          neighborsCache,
          budget,
          searchOptions,
        );
        if (result.matchDistance !== null) {
          return result.matchDistance;
        }
        endFrontier = result.nextFrontier;
      }

      expansionCount++;
    }

    return null;
  }

  private createSearchBudget(maxDepth: number): SearchBudget {
    if (maxDepth <= 3) {
      return { remainingActorExpansions: 24 };
    }
    if (maxDepth <= 4) {
      return { remainingActorExpansions: 32 };
    }
    return { remainingActorExpansions: 45 };
  }

  private frontierCanExpand(
    frontier: number[],
    depthMap: Map<number, number>,
    maxDepth: number,
  ): boolean {
    return frontier.some((actorId) => (depthMap.get(actorId) ?? maxDepth) < maxDepth);
  }

  private async expandFrontier(
    frontier: number[],
    thisDepthMap: Map<number, number>,
    otherDepthMap: Map<number, number>,
    maxDepth: number,
    neighborsCache: Map<string, number[]>,
    budget: SearchBudget,
    searchOptions: SearchOptions,
  ): Promise<{ nextFrontier: number[]; matchDistance: number | null }> {
    const nextFrontier: number[] = [];
    const queued = new Set<number>();
    const actorsToExpand = frontier.slice(0, this.maxActorsPerExpansion);

    for (const actorId of actorsToExpand) {
      if (budget.remainingActorExpansions <= 0) {
        return { nextFrontier, matchDistance: null };
      }

      const currentDepth = thisDepthMap.get(actorId);
      if (currentDepth === undefined || currentDepth >= maxDepth) {
        continue;
      }
      budget.remainingActorExpansions--;

      const neighbors = await this.getConnectedActors(
        actorId,
        neighborsCache,
        searchOptions.moviePopularityFloor,
      );
      for (const neighborId of neighbors) {
        if (thisDepthMap.has(neighborId)) {
          continue;
        }

        const nextDepth = currentDepth + 1;
        if (nextDepth > maxDepth) {
          continue;
        }

        thisDepthMap.set(neighborId, nextDepth);
        const otherDepth = otherDepthMap.get(neighborId);
        if (otherDepth !== undefined) {
          const totalDistance = nextDepth + otherDepth;
          if (totalDistance <= maxDepth) {
            return { nextFrontier, matchDistance: totalDistance };
          }
        }

        if (nextDepth < maxDepth && !queued.has(neighborId)) {
          nextFrontier.push(neighborId);
          queued.add(neighborId);

          if (nextFrontier.length >= this.maxFrontierSize) {
            return { nextFrontier, matchDistance: null };
          }
        }
      }
    }

    return { nextFrontier, matchDistance: null };
  }

  private async getConnectedActors(
    actorId: number,
    neighborsCache: Map<string, number[]>,
    moviePopularityFloor?: number,
  ): Promise<number[]> {
    const cacheKey = `${actorId}:${moviePopularityFloor ?? 0}`;
    const cached = neighborsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const movies = await tmdbService.getActorMovies(actorId);
    const eligibleMovies = moviePopularityFloor
      ? movies.filter((movie) => (movie.vote_count ?? 0) >= moviePopularityFloor)
      : movies;
    const topMovies = [...eligibleMovies]
      .sort((a: Movie, b: Movie) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, this.maxMoviesPerActor);

    const creditsByMovie = await Promise.all(
      topMovies.map((movie) => tmdbService.getMovieCredits(movie.id)),
    );

    const neighbors = new Set<number>();
    for (const credits of creditsByMovie) {
      const castSlice = credits.slice(0, this.maxCastPerMovie);
      for (const castMember of castSlice) {
        if (castMember.id !== actorId) {
          neighbors.add(castMember.id);
        }
      }
    }

    const neighborIds = Array.from(neighbors);
    neighborsCache.set(cacheKey, neighborIds);
    return neighborIds;
  }
}

export const gameLogicService = new GameLogicService();
