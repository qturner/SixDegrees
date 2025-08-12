import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, User, Film } from "lucide-react";
import ActorSearch from "./ActorSearch";
import MovieSearch from "./MovieSearch";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface GameGridProps {
  challenge: DailyChallenge;
  connections: Connection[];
  onConnectionUpdate: (index: number, connection: Partial<Connection>) => void;
  onValidationResult: (index: number, result: ValidationResult) => void;
  onGameResult: (result: ValidationResult) => void;
  onReset: () => void;
}

export default function GameGrid({ 
  challenge, 
  connections, 
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
  };

  const handleMovieSelect = (index: number, movie: any) => {
    onConnectionUpdate(index, {
      movieId: movie.id,
      movieTitle: movie.title,
    });

    // Validate the connection when both actor and movie are selected
    const connection = connections[index];
    if (connection?.actorId) {
      setValidatingIndex(index);
      
      const previousActorId = index === 0 ? challenge.startActorId : connections[index - 1]?.actorId;
      const nextActorId = index === connections.length - 1 ? challenge.endActorId : connections[index + 1]?.actorId;

      validateConnectionMutation.mutate({
        index,
        actorId: connection.actorId,
        movieId: movie.id,
        previousActorId,
        nextActorId,
      });
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

  // Ensure we have 5 connection slots
  const connectionSlots = Array.from({ length: 5 }, (_, index) => 
    connections[index] || { actorId: 0, actorName: "", movieId: 0, movieTitle: "" }
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actor Column */}
        <div>
          <h3 className="text-lg font-semibold text-game-primary mb-4 text-center">
            <User className="inline-block w-5 h-5 mr-2" />
            Actors
          </h3>
          <div className="space-y-3">
            {/* Starting Actor */}
            <div className="p-4 bg-game-blue text-white rounded-lg text-center font-medium">
              {challenge.startActorName}
            </div>

            {/* Connection Actors */}
            {connectionSlots.map((connection, index) => (
              <div key={`actor-${index}`} className="relative">
                <ActorSearch
                  onSelect={(actor) => handleActorSelect(index, actor)}
                  placeholder="Search for actor..."
                  value={connection.actorName}
                  disabled={validatingIndex === index}
                />
                {validatingIndex === index && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-game-blue"></div>
                  </div>
                )}
              </div>
            ))}

            {/* Ending Actor */}
            <div className="p-4 bg-game-blue text-white rounded-lg text-center font-medium">
              {challenge.endActorName}
            </div>
          </div>
        </div>

        {/* Movie Column */}
        <div>
          <h3 className="text-lg font-semibold text-game-primary mb-4 text-center">
            <Film className="inline-block w-5 h-5 mr-2" />
            Movies
          </h3>
          <div className="space-y-3">
            {/* Starting space */}
            <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500 font-medium">
              Starting Point
            </div>

            {/* Connection Movies */}
            {connectionSlots.map((connection, index) => (
              <div key={`movie-${index}`} className="relative">
                <MovieSearch
                  onSelect={(movie) => handleMovieSelect(index, movie)}
                  placeholder="Search for movie..."
                  value={connection.movieTitle}
                  disabled={!connection.actorId || validatingIndex === index}
                />
              </div>
            ))}

            {/* Ending space */}
            <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500 font-medium">
              Final Connection
            </div>
          </div>
        </div>
      </div>

      {/* Game Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={handleValidateGame}
          disabled={validateGameMutation.isPending || connections.length === 0}
          className="px-6 py-3 bg-game-blue text-white hover:bg-blue-600"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {validateGameMutation.isPending ? "Validating..." : "Validate Connection"}
        </Button>
        
        <Button 
          onClick={handleReset}
          variant="secondary"
          className="px-6 py-3 bg-gray-500 text-white hover:bg-gray-600"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Game
        </Button>
      </div>
    </div>
  );
}
