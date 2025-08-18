import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RotateCcw, User, Film } from "lucide-react";
import ActorSearch from "./ActorSearch";
import MovieSearch from "./MovieSearch";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
      onGameResult(result);
    },
  });

  const validateConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/validate-connection", data);
      return response.json();
    },
    onSuccess: (result: ValidationResult, variables: any) => {
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
    <div className="bg-game-surface border border-game-accent card-radius shadow-card hover:shadow-card-hover transition-all duration-300 spacing-md sm:spacing-lg mb-8">
      {/* Starting Actor */}
      <div className="mb-6">
        <h3 className="text-heading-md text-game-primary mb-3 text-center">
          <User className="inline-block w-5 h-5 mr-2" />
          Starting Actor
        </h3>
        <div className="spacing-md bg-game-primary text-game-background button-radius text-center font-medium transition-all duration-200 hover:shadow-card-hover">
          {challenge.startActorName}
        </div>
      </div>

      {/* Connection Chain */}
      <div className="space-y-6">
        {connectionSlots.map((connection, index) => {
          const validationResult = validationResults?.[index];
          const isLastConnection = index === connectionSlots.length - 1;
          
          // Calculate previous actor name based on the connection index
          let previousActorName;
          if (index === 0) {
            previousActorName = challenge.startActorName;
          } else {
            // For all other connections (including the last one), get the actor from the previous connection
            const prevConnection = connections[index - 1];
            previousActorName = prevConnection?.actorName || 'previous actor';
          }
          
          return (
            <div key={`connection-${index}`} className="border border-game-accent input-radius spacing-md space-y-4 transition-all duration-200 hover:border-game-primary hover:shadow-card bg-game-background">
              <h4 className="text-body-sm font-medium text-game-accent text-center">
                Connection {index + 1} of {connectionSlots.length}
              </h4>
              
              {/* Movie Input (Primary) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-game-text flex items-center">
                  <Film className="w-4 h-4 mr-1" />
                  Movie featuring {previousActorName || 'previous actor'}
                  {isLastConnection && ` and ${challenge.endActorName}`}
                </label>
                <div className="relative">
                  <MovieSearch
                    onSelect={(movie) => handleMovieSelect(index, movie)}
                    placeholder={isLastConnection ? "Final movie with both actors..." : "Search for movie..."}
                    value={connection.movieTitle}
                    disabled={validatingIndex === index}
                  />
                  
                  {/* Loading Spinner */}
                  {validatingIndex === index && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-game-primary"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actor Input (Subfield) - Not shown for last connection */}
              {!isLastConnection && (
                <div className="space-y-2 ml-4 border-l-2 border-game-accent pl-4">
                  <label className="text-sm font-medium text-game-text flex items-center">
                    <User className="w-4 h-4 mr-1" />
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
                <div className="space-y-2 ml-4 border-l-2 border-game-primary pl-4 bg-game-surface p-3 rounded-md">
                  <div className="text-sm font-medium text-game-primary flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Final connection to {challenge.endActorName}
                  </div>
                  <p className="text-xs text-game-text">
                    This movie should feature both {previousActorName} and {challenge.endActorName}
                  </p>
                </div>
              )}

              {/* Connection Status */}
              {validationResult && connection.movieTitle && connection.actorName && (
                <div className={`text-sm p-3 rounded-md ${
                  validationResult.valid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {validationResult.valid ? (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isLastConnection 
                        ? `Valid final connection! ${previousActorName} and ${challenge.endActorName} both appear in ${connection.movieTitle}`
                        : `Valid connection! ${previousActorName} and ${connection.actorName} both appear in ${connection.movieTitle}`
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
          );
        })}
      </div>

      {/* Target Actor */}
      <div className="mt-6">
        <h3 className="text-heading-md text-game-primary mb-3 text-center">
          <User className="inline-block w-5 h-5 mr-2" />
          Target Actor
        </h3>
        <div className="spacing-md bg-game-primary text-game-background button-radius text-center font-medium transition-all duration-200 hover:shadow-card-hover">
          {challenge.endActorName}
        </div>
      </div>

      {/* Game Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={handleValidateGame}
          disabled={validateGameMutation.isPending || connections.length === 0}
          className="px-6 py-3 bg-game-primary text-game-background hover:bg-game-accent btn-hover button-radius transition-all duration-200"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {validateGameMutation.isPending ? "Validating..." : "Validate Connection"}
        </Button>
        
        <Button 
          onClick={handleReset}
          variant="secondary"
          className="px-6 py-3 bg-game-accent text-game-background hover:bg-game-surface btn-hover button-radius transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Game
        </Button>
      </div>
    </div>
  );
}
