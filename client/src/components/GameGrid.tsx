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
      actorProfilePath: actor.profile_path,
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
        moviePosterPath: movie.poster_path,
        actorId: challenge.endActorId,
        actorName: challenge.endActorName,
        actorProfilePath: challenge.endActorProfilePath,
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
        moviePosterPath: movie.poster_path,
        actorId: 0, // Clear actor so user must select new one
        actorName: "", // Clear actor name
        actorProfilePath: null,
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
    <div className="deco-card deco-corners p-6 sm:p-10 mb-8 relative md:overflow-visible backdrop-blur-md bg-deco-black/40 border border-white/10">
      {/* Subtle background effects matched from TodaysChallenge */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20 pointer-events-none" />
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
        <div className="space-y-4 md:space-y-0">
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
              <div
                key={`connection-${index}`}
                className={`group relative md:w-1/3 transition-all duration-300 
                  ${index % 2 === 0 ? 'md:mr-auto md:ml-0' : 'md:ml-auto md:mr-0'}
                  ${index > 0 ? 'md:-mt-24' : ''}
                `}
                style={{ zIndex: 50 - index }}
              >
                {/* Glow effect behind card */}
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-500" />
                <div className="absolute -inset-0.5 bg-gradient-to-br from-deco-gold/20 via-deco-bronze/10 to-transparent rounded blur-sm opacity-40 group-hover:opacity-0 transition-opacity duration-300" />


                {/* Main card - Updated border to gradient ring style */}
                <div className="relative bg-gradient-to-br from-deco-charcoal via-deco-onyx to-deco-black p-[2px] rounded-lg shadow-[0_4px_16px_rgba(196,151,49,0.15)] hover:shadow-[0_6px_24px_rgba(196,151,49,0.25)] transition-all duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-deco-gold via-deco-bronze to-transparent rounded-lg opacity-40 group-hover:opacity-60 transition-opacity" />

                  <div className="relative bg-black rounded-lg p-4 space-y-4">

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
                      <div className="space-y-4 ml-4 border-l-2 border-deco-gold/30 pl-4">
                        <label className="text-sm font-medium text-deco-cream flex items-center">
                          <User className="w-4 h-4 mr-2 text-deco-gold" />
                          Co-star in {connection.movieTitle || 'this movie'}
                        </label>

                        <div className="flex items-center gap-4">
                          {/* Small Headshot Display */}
                          {(connection.actorName) && (
                            <div className="shrink-0">
                              <ActorCard
                                name={connection.actorName}
                                profilePath={connection.actorProfilePath}
                                variant="neutral"
                                size="sm"
                                showName={false}
                                allowZoom={false}
                                className="scale-75 origin-left"
                              />
                            </div>
                          )}

                          <div className="relative flex-grow">
                            <ActorSearch
                              onSelect={(actor) => handleActorSelect(index, actor)}
                              placeholder={connection.movieTitle ? "Who else is in this movie?" : "Select movie first"}
                              value={connection.actorName}
                              disabled={!connection.movieTitle || validatingIndex === index}
                            />
                          </div>
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

                {/* Cosmic Connector Line (Desktop Only) - Soft Cosmic Style */}
                {!isLastConnection && (
                  <div className={`hidden md:block absolute top-[50%] w-[100%] pointer-events-none z-40 ${index % 2 === 0
                    ? 'left-[100%]' // From Left card rightward
                    : 'right-[100%]' // From Right card leftward
                    }`}>
                    <svg
                      width="100%"
                      height="250"
                      viewBox="0 0 100 250"
                      className="overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={`cosmic-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                        <filter id={`cosmic-glow-${index}`} x="-100%" y="-100%" width="300%" height="300%">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* elegant narrowed diagonal line */}
                      <line
                        x1={index % 2 === 0 ? "0" : "100"}
                        y1="0"
                        x2={index % 2 === 0 ? "100" : "0"}
                        y2="200"
                        stroke={`url(#cosmic-gradient-${index})`}
                        strokeWidth="1.5"
                        className="opacity-80"
                        style={{ filter: `url(#cosmic-glow-${index})` }}
                      />

                      {/* Connection Nodes (Small subtle dots) */}
                      <circle
                        cx={index % 2 === 0 ? "0" : "100"}
                        cy="0"
                        r="3"
                        fill="#22d3ee"
                        style={{ filter: `url(#cosmic-glow-${index})` }}
                      />
                      <circle
                        cx={index % 2 === 0 ? "100" : "0"}
                        cy="200"
                        r="3"
                        fill="#a855f7"
                        style={{ filter: `url(#cosmic-glow-${index})` }}
                      />
                    </svg>
                  </div>
                )}
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
