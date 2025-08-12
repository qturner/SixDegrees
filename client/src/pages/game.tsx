import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GameHeader from "@/components/GameHeader";
import GameGrid from "@/components/GameGrid";
import GameInstructions from "@/components/GameInstructions";
import ValidationFeedback from "@/components/ValidationFeedback";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";

export default function Game() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [gameResult, setGameResult] = useState<ValidationResult | null>(null);

  const { data: challenge, isLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
  });

  const handleConnectionUpdate = (index: number, connection: Partial<Connection>) => {
    setConnections(prev => {
      const newConnections = [...prev];
      newConnections[index] = { ...newConnections[index], ...connection } as Connection;
      return newConnections;
    });
  };

  const handleValidationResult = (index: number, result: ValidationResult) => {
    setValidationResults(prev => {
      const newResults = [...prev];
      newResults[index] = result;
      return newResults;
    });
  };

  const handleGameResult = (result: ValidationResult) => {
    setGameResult(result);
  };

  const resetGame = () => {
    setConnections([]);
    setValidationResults([]);
    setGameResult(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-game-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading today's challenge...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">Failed to load today's challenge. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <GameHeader challenge={challenge} currentMoves={connections.filter(c => c.actorId && c.movieId).length} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <GameGrid 
          challenge={challenge}
          connections={connections}
          onConnectionUpdate={handleConnectionUpdate}
          onValidationResult={handleValidationResult}
          onGameResult={handleGameResult}
          onReset={resetGame}
        />
        
        <ValidationFeedback 
          validationResults={validationResults}
          gameResult={gameResult}
        />
        
        <GameInstructions />
        
        <footer className="text-center text-gray-500 text-sm mt-12">
          <div className="mb-4">
            <div className="text-game-primary font-medium mb-2">6 Degrees of Separation</div>
            <div>A new daily challenge connecting Hollywood's finest</div>
          </div>
          <div className="flex justify-center space-x-6">
            <a href="#" className="hover:text-game-blue transition-colors">About</a>
            <a href="#" className="hover:text-game-blue transition-colors">Rules</a>
            <a href="#" className="hover:text-game-blue transition-colors">Contact</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
