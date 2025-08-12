import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import GameHeader from "@/components/GameHeader";
import GameGrid from "@/components/GameGrid";
import ActorSwitcher from "@/components/ActorSwitcher";
import GameInstructions from "@/components/GameInstructions";
import ValidationFeedback from "@/components/ValidationFeedback";
import { HintsSection } from "@/components/HintsSection";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";

// Helper functions for localStorage persistence
const saveGameState = (connections: Connection[], validationResults: ValidationResult[], gameResult: ValidationResult | null, isFlipped: boolean) => {
  const gameState = {
    connections,
    validationResults,
    gameResult,
    isFlipped,
    savedAt: Date.now()
  };
  localStorage.setItem('gameState', JSON.stringify(gameState));
};

const loadGameState = () => {
  try {
    const saved = localStorage.getItem('gameState');
    if (saved) {
      const state = JSON.parse(saved);
      // Only load if saved within last 6 hours to avoid stale state
      if (Date.now() - state.savedAt < 6 * 60 * 60 * 1000) {
        return state;
      }
    }
  } catch (error) {
    console.log('Error loading game state:', error);
  }
  return null;
};

export default function Game() {
  // Initialize state from localStorage if available
  const [connections, setConnections] = useState<Connection[]>(() => {
    const saved = loadGameState();
    return saved?.connections || [];
  });
  const [validationResults, setValidationResults] = useState<ValidationResult[]>(() => {
    const saved = loadGameState();
    return saved?.validationResults || [];
  });
  const [gameResult, setGameResult] = useState<ValidationResult | null>(() => {
    const saved = loadGameState();
    return saved?.gameResult || null;
  });
  const [isFlipped, setIsFlipped] = useState(false);

  const { data: challenge, isLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveGameState(connections, validationResults, gameResult, isFlipped);
  }, [connections, validationResults, gameResult, isFlipped]);

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
    localStorage.removeItem('gameState');
  };

  const handleFlipActors = () => {
    setIsFlipped(prev => !prev);
    // Reset the game when flipping actors
    resetGame();
  };

  // Get the effective start and end actors based on flip state
  const getEffectiveChallenge = () => {
    if (!challenge) return null;
    
    if (isFlipped) {
      return {
        ...challenge,
        startActorId: challenge.endActorId,
        startActorName: challenge.endActorName,
        endActorId: challenge.startActorId,
        endActorName: challenge.startActorName,
      };
    }
    return challenge;
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

  const effectiveChallenge = getEffectiveChallenge();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <GameHeader challenge={challenge} currentMoves={connections.filter(c => c.actorId && c.movieId).length} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ActorSwitcher 
          challenge={challenge}
          isFlipped={isFlipped}
          onFlip={handleFlipActors}
          disabled={connections.some(c => c.actorId || c.movieId)}
        />
        
        <div className="mb-8">
          <HintsSection dailyChallenge={challenge} />
        </div>
        
        <GameGrid 
          challenge={effectiveChallenge!}
          connections={connections}
          validationResults={validationResults}
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
