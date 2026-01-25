import { tmdbService } from "./tmdb.js";
import { Connection, ValidationResult } from "../../../shared/schema.js";

interface GameValidationContext {
  startActorId: number;
  endActorId: number;
  connections: Connection[];
}

class GameLogicService {
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
      // Collect all validation promises
      type ValidationCheckResult = {
        valid: boolean;
        message: string;
        type: 'start' | 'end' | 'internal' | 'continuity';
        index?: number;
      };

      const validations: Promise<ValidationCheckResult>[] = [];

      // 1. Validate starting actor in first movie
      validations.push(
        tmdbService.validateActorInMovie(startActorId, connections[0].movieId)
          .then(valid => ({ valid, message: "The starting actor did not appear in the first movie.", type: 'start' as const }))
      );

      // 2. Validate ending actor in last movie
      validations.push(
        tmdbService.validateActorInMovie(endActorId, connections[connections.length - 1].movieId)
          .then(valid => ({ valid, message: "The ending actor did not appear in the final movie.", type: 'end' as const }))
      );

      // 3. Validate each connection's internal consistency (Actor X in Movie X)
      connections.forEach((connection, i) => {
        validations.push(
          tmdbService.validateActorInMovie(connection.actorId, connection.movieId)
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

        validations.push(
          tmdbService.validateActorInMovie(currentActorId, nextMovieId)
            .then(valid => ({
              valid,
              message: `Connection ${i + 1}: ${currentActorName} did not appear in the next movie ${nextMovieTitle}.`,
              type: 'continuity' as const,
              index: i
            }))
        );
      }

      // Execute all validations in parallel
      const results = await Promise.all(validations);

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

  async generateDailyActors(excludeActorIds: number[] = []): Promise<{ actor1: any; actor2: any } | null> {
    try {
      const popularActors = await tmdbService.getPopularActors();

      if (popularActors.length < 2) {
        console.error("Not enough popular actors found");
        return null;
      }

      // Filter out excluded actors (from current/previous challenges)
      const availableActors = popularActors.filter(actor =>
        !excludeActorIds.includes(actor.id)
      );

      // Check if we have enough actors after filtering
      if (availableActors.length < 2) {
        console.warn(`Only ${availableActors.length} actors available after excluding ${excludeActorIds.length} actors`);
        // Fall back to using full list if not enough available (shouldn't happen with 200 actors)
        const fallbackActors = popularActors.length >= 2 ? popularActors : availableActors;
        const shuffled = fallbackActors.sort(() => 0.5 - Math.random());
        const actor1 = shuffled[0];
        const actor2 = shuffled[1];
        console.warn(`Using fallback selection: ${actor1.name} and ${actor2.name}`);
        return { actor1, actor2 };
      }

      // Select two random actors from the filtered list
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
}

export const gameLogicService = new GameLogicService();
