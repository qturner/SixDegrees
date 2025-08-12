import { tmdbService } from "./tmdb";
import { Connection, ValidationResult } from "@shared/schema";

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

    if (connections.length > 5) {
      return {
        valid: false,
        message: "Too many connections. Maximum is 5 moves.",
      };
    }

    try {
      // Validate the first connection starts with the start actor
      const firstConnection = connections[0];
      const startActorInFirstMovie = await tmdbService.validateActorInMovie(
        startActorId,
        firstConnection.movieId
      );

      if (!startActorInFirstMovie) {
        return {
          valid: false,
          message: "The starting actor did not appear in the first movie.",
        };
      }

      // Validate each connection in the chain
      for (let i = 0; i < connections.length; i++) {
        const connection = connections[i];
        
        // Validate current actor is in current movie
        const currentValid = await tmdbService.validateActorInMovie(
          connection.actorId,
          connection.movieId
        );

        if (!currentValid) {
          return {
            valid: false,
            message: `Connection ${i + 1}: ${connection.actorName} did not appear in ${connection.movieTitle}.`,
          };
        }

        // Validate chain continuity
        if (i === 0) {
          // First connection should include the start actor
          const startActorInMovie = await tmdbService.validateActorInMovie(
            startActorId,
            connection.movieId
          );
          if (!startActorInMovie) {
            return {
              valid: false,
              message: "The chain doesn't start properly with the given starting actor.",
            };
          }
        }

        if (i < connections.length - 1) {
          // Validate that current actor appears in next movie
          const nextConnection = connections[i + 1];
          const actorInNextMovie = await tmdbService.validateActorInMovie(
            connection.actorId,
            nextConnection.movieId
          );

          if (!actorInNextMovie) {
            return {
              valid: false,
              message: `Connection ${i + 1}: ${connection.actorName} did not appear in the next movie ${nextConnection.movieTitle}.`,
            };
          }
        }
      }

      // Validate the last connection includes the end actor
      const lastConnection = connections[connections.length - 1];
      const endActorInLastMovie = await tmdbService.validateActorInMovie(
        endActorId,
        lastConnection.movieId
      );

      if (!endActorInLastMovie) {
        return {
          valid: false,
          message: "The ending actor did not appear in the final movie.",
        };
      }

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

  async generateDailyActors(): Promise<{ actor1: any; actor2: any } | null> {
    try {
      const popularActors = await tmdbService.getPopularActors();
      
      if (popularActors.length < 2) {
        console.error("Not enough popular actors found");
        return null;
      }

      // Select two random actors from the popular list
      const shuffled = popularActors.sort(() => 0.5 - Math.random());
      const actor1 = shuffled[0];
      const actor2 = shuffled[1];

      return { actor1, actor2 };
    } catch (error) {
      console.error("Error generating daily actors:", error);
      return null;
    }
  }
}

export const gameLogicService = new GameLogicService();
