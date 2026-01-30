import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RotateCcw, User, Film } from "lucide-react";
import ActorSearch from "./ActorSearch";
import MovieSearch from "./MovieSearch";
import ActorCard from "./ActorCard";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { trackGameEvent } from "@/lib/analytics";
import { trackGameStart } from "@/hooks/useVisitorTracking";

interface GameGridProps {
  challenge: DailyChallenge;
  connections: Connection[];
  validationResults: ValidationResult[];
  onConnectionUpdate: (index: number, connection: Partial<Connection>) => void;
  onValidationResult: (index: number, result: ValidationResult | null) => void;
  onGameResult: (result: ValidationResult) => void;
  onReset: () => void;
}

export default function GameGrid({
  challenge,
  connections,
  validationResults,
  onConnectionUpdate,
  onValidationResult,
  onGameResult,
  onReset
}: GameGridProps) {
  const [validatingIndex, setValidatingIndex] = useState<number | null>(null);

  const validateGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      const response = await apiRequest("POST", "/api/validate-game", gameData);
      return response.json();
    },
    onSuccess: (result: ValidationResult) => {
      if (result.valid) {
        trackGameEvent.completeGame(result.moves || 0);
      }
      onGameResult(result);
    },
    onError: (error: any) => {
      onGameResult({
        valid: false,
        message: error.message || "Failed to validate game. Please try again.",
      });
    },
  });

  const validateConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/validate-connection", data);
      return response.json();
    },
    onSuccess: (result: ValidationResult, variables: any) => {
      trackGameEvent.validateMove(result.valid);
      onValidationResult(variables.index, result);
      setValidatingIndex(null);
    },
  });

  const handleActorSelect = (index: number, actor: any) => {
    onConnectionUpdate(index, {
      actorId: actor.id,
      actorName: actor.name,
    });

    // Validate the connection when both actor and movie are selected
    const connection = connections[index];
    if (connection?.movieId) {
      setValidatingIndex(index);

      const previousActorId = index === 0 ? challenge.startActorId : (connections[index - 1]?.actorId || 0);
      const nextActorId = index === connections.length - 1 ? challenge.endActorId : (connections[index + 1]?.actorId || 0);

      // Use setTimeout to ensure state updates complete before validation
      setTimeout(() => {
        validateConnectionMutation.mutate({
          index,
          actorId: actor.id,
          movieId: connection.movieId,
          previousActorId,
          nextActorId,
        });
      }, 10);
    }
  };

  const handleMovieSelect = (index: number, movie: any) => {
    const isLastConnection = index === 5; // 6th connection (0-indexed)

    // For the last connection, automatically set the ending actor
    if (isLastConnection) {
      onConnectionUpdate(index, {
        movieId: movie.id,
        movieTitle: movie.title,
        actorId: challenge.endActorId,
        actorName: challenge.endActorName,
      });

      // Track conversion when user starts interacting with the game
      trackGameStart();

      // Validate immediately for last connection since actor is set automatically
      setValidatingIndex(index);
      const previousActorId = connections[index - 1]?.actorId || 0;

      setTimeout(() => {
        validateConnectionMutation.mutate({
          index,
          actorId: challenge.endActorId,
          movieId: movie.id,
          previousActorId,
        });
      }, 10);
    } else {
      // For non-last connections, just update the movie and clear the actor
      // This prevents validation with mismatched movie/actor pairs
      onConnectionUpdate(index, {
        movieId: movie.id,
        movieTitle: movie.title,
        actorId: 0, // Clear actor so user must select new one
        actorName: "", // Clear actor name
      });

      // Track conversion when user starts interacting with the game
      trackGameStart();

      // Clear any existing validation result since movie changed
      onValidationResult(index, null);
    }
  };

  const handleValidateGame = () => {
    const validConnections = connections.filter(c => c.actorId && c.movieId);

    if (validConnections.length === 0) {
      onGameResult({
        valid: false,
        message: "Please add at least one connection to validate.",
      });
      return;
    }

    validateGameMutation.mutate({
      connections: validConnections,
      startActorId: challenge.startActorId,
      endActorId: challenge.endActorId,
    });
  };

  const handleReset = () => {
    onReset();
  };

  // Ensure we have 6 connection slots (6 movies for 6 degrees)
  const connectionSlots = Array.from({ length: 6 }, (_, index) =>
    connections[index] || { actorId: 0, actorName: "", movieId: 0, movieTitle: "" }
  );

  return (
    <div className="deco-card p-4 sm:p-6 mb-8 relative overflow-hidden">
      <div className="absolute inset-0 art-deco-bg opacity-20 pointer-events-none" />

      <div className="relative z-10">
        {/* Starting Actor */}
        <div className="mb-8 flex flex-col items-center">
          <h3 className="font-display text-lg text-deco-gold mb-4 text-center tracking-wide flex items-center gap-2">
            <User className="w-5 h-5" />
            Starting Actor
          </h3>
          <ActorCard
            name={challenge.startActorName}
            profilePath={challenge.startActorProfilePath}
            variant="cyan"
            size="md"
          />
        </div>

        {/* Connection Chain */}
        <div className="space-y-4">
          {connectionSlots.map((connection, index) => {
            const validationResult = validationResults?.[index];
            const isLastConnection = index === connectionSlots.length - 1;

            let previousActorName;
            if (index === 0) {
              previousActorName = challenge.startActorName;
            } else {
              const prevConnection = connections[index - 1];
              previousActorName = prevConnection?.actorName || 'previous actor';
            }

            return (
              <div key={`connection-${index}`} className="group relative">
                {/* Glow effect behind card */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-deco-gold/20 via-deco-bronze/10 to-transparent rounded blur-sm opacity-40 group-hover:opacity-70 transition-opacity duration-300" />

                {/* Main card */}
                <div className="relative bg-gradient-to-br from-deco-charcoal via-deco-onyx to-deco-black border border-deco-gold/40 p-4 space-y-4 transition-all duration-200 hover:border-deco-gold/70 shadow-[0_4px_16px_rgba(196,151,49,0.15)] hover:shadow-[0_6px_24px_rgba(196,151,49,0.25)]">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-deco-gold/60" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-deco-gold/60" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-deco-gold/60" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-deco-gold/60" />

                  <h4 className="text-xs font-medium text-deco-pewter text-center uppercase tracking-wider">
                    Connection {index + 1} of {connectionSlots.length}
                  </h4>

                  {/* Movie Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-deco-cream">
                      <div className="flex items-center">
                        <Film className="w-4 h-4 mr-2 text-deco-gold" />
                        Movie featuring {previousActorName || 'previous actor'}
                      </div>
                      {isLastConnection && (
                        <div className="text-deco-gold ml-6 mt-1">and {challenge.endActorName}</div>
                      )}
                    </label>
                    <div className="relative">
                      <MovieSearch
                        onSelect={(movie) => handleMovieSelect(index, movie)}
                        placeholder={isLastConnection ? "Final movie with both actors..." : "Search for movie..."}
                        value={connection.movieTitle}
                        disabled={validatingIndex === index}
                      />

                      {validatingIndex === index && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-deco-gold"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actor Input - Not shown for last connection */}
                  {!isLastConnection && (
                    <div className="space-y-2 ml-4 border-l-2 border-deco-gold/30 pl-4">
                      <label className="text-sm font-medium text-deco-cream flex items-center">
                        <User className="w-4 h-4 mr-2 text-deco-gold" />
                        Co-star in {connection.movieTitle || 'this movie'}
                      </label>
                      <div className="relative">
                        <ActorSearch
                          onSelect={(actor) => handleActorSelect(index, actor)}
                          placeholder={connection.movieTitle ? "Who else is in this movie?" : "Select movie first"}
                          value={connection.actorName}
                          disabled={!connection.movieTitle || validatingIndex === index}
                        />
                      </div>
                    </div>
                  )}

                  {/* Special note for last connection */}
                  {isLastConnection && connection.movieTitle && (
                    <div className="space-y-2 ml-4 border-l-2 border-deco-gold pl-4 bg-deco-charcoal/50 p-3">
                      <div className="text-sm font-medium text-deco-gold flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Final connection to {challenge.endActorName}
                      </div>
                      <p className="text-xs text-deco-cream/70">
                        This movie should feature both {previousActorName} and {challenge.endActorName}
                      </p>
                    </div>
                  )}

                  {/* Connection Status */}
                  {validationResult && connection.movieTitle && connection.actorName && (
                    <div className={`text-sm p-3 ${validationResult.valid
                      ? 'bg-game-success/20 text-game-success border border-game-success/30'
                      : 'bg-game-error/20 text-game-error border border-game-error/30'
                      }`}>
                      {validationResult.valid ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isLastConnection
                            ? `Valid! ${previousActorName} and ${challenge.endActorName} both appear in ${connection.movieTitle}`
                            : `Valid! ${previousActorName} and ${connection.actorName} both appear in ${connection.movieTitle}`
                          }
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XCircle className="w-4 h-4 mr-2" />
                          {validationResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Target Actor */}
        <div className="mt-8 flex flex-col items-center">
          <h3 className="font-display text-lg text-deco-gold mb-4 text-center tracking-wide flex items-center gap-2">
            <User className="w-5 h-5" />
            Target Actor
          </h3>
          <ActorCard
            name={challenge.endActorName}
            profilePath={challenge.endActorProfilePath}
            variant="amber"
            size="md"
          />
        </div>

        {/* Game Actions */}
        <div className="mt-8 flex flex-col gap-4 justify-center">
          <p className="text-center text-sm text-deco-cream/70">
            Finished? Verify your connections here!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleValidateGame}
              disabled={validateGameMutation.isPending || connections.length === 0}
              className="px-8 py-3 deco-button uppercase tracking-wider transition-all duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {validateGameMutation.isPending ? "Validating..." : "Validate"}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              className="px-8 py-3 border-2 border-deco-pewter/50 text-deco-pewter hover:border-deco-gold hover:text-deco-gold bg-transparent uppercase tracking-wider transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
