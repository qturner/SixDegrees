import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import GameHeader from "@/components/GameHeader";
import GameGrid from "@/components/GameGrid";

import GameInstructions from "@/components/GameInstructions";
import ValidationFeedback from "@/components/ValidationFeedback";
import { HintsSection } from "@/components/HintsSection";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";

// Helper functions for localStorage persistence
const saveGameState = (connections: Connection[], validationResults: ValidationResult[], gameResult: ValidationResult | null, isFlipped: boolean, challengeDate?: string) => {
  const gameState = {
    connections,
    validationResults,
    gameResult,
    isFlipped,
    challengeDate,
    savedAt: Date.now()
  };
  localStorage.setItem('gameState', JSON.stringify(gameState));
};

const loadGameState = (currentChallengeDate?: string) => {
  try {
    const saved = localStorage.getItem('gameState');
    if (saved) {
      const state = JSON.parse(saved);
      // Only load if saved within last 6 hours to avoid stale state
      // AND if it's for the same daily challenge date
      if (Date.now() - state.savedAt < 6 * 60 * 60 * 1000 && 
          state.challengeDate === currentChallengeDate) {
        return state;
      }
    }
  } catch (error) {
    console.log('Error loading game state:', error);
  }
  return null;
};

export default function Game() {
  // Initialize state - will be reset when challenge loads if needed
  const [connections, setConnections] = useState<Connection[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [gameResult, setGameResult] = useState<ValidationResult | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [gameStateInitialized, setGameStateInitialized] = useState(false);

  const { data: challenge, isLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
  });

  // Initialize or reset game state when challenge loads
  useEffect(() => {
    if (challenge && !gameStateInitialized) {
      const saved = loadGameState(challenge.date);
      if (saved) {
        // Load saved state if it's for the current challenge
        setConnections(saved.connections || []);
        setValidationResults(saved.validationResults || []);
        setGameResult(saved.gameResult || null);
        setIsFlipped(saved.isFlipped || false);
      } else {
        // Reset to clean state if no valid saved state or new challenge
        resetGame();
      }
      setGameStateInitialized(true);
    }
  }, [challenge, gameStateInitialized]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (challenge) {
      saveGameState(connections, validationResults, gameResult, isFlipped, challenge.date);
    }
  }, [connections, validationResults, gameResult, isFlipped, challenge]);

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

  const resetGame = (preserveFlip = false) => {
    setConnections([]);
    setValidationResults([]);
    setGameResult(null);
    if (!preserveFlip) {
      setIsFlipped(false);
    }
    localStorage.removeItem('gameState');
  };

  const clearAllUserData = () => {
    // Clear all localStorage data for this user
    const challengeDate = new Date().toISOString().split('T')[0];
    localStorage.removeItem('gameState');
    localStorage.removeItem(`hints-${challengeDate}`);
    
    // Reset all state
    resetGame();
    window.location.reload(); // Force full reset of component state
  };

  const handleFlipActors = () => {
    setIsFlipped(prev => !prev);
    // Reset the game when flipping actors but preserve the flip state
    resetGame(true);
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
      {/* Admin Access Button - Repositioned for mobile */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <Link href="/admin-login">
          <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm shadow-sm text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Admin</span>
            <span className="xs:hidden text-xs">A</span>
          </Button>
        </Link>
      </div>

      <GameHeader 
        challenge={challenge} 
        currentMoves={connections.filter(c => c.actorId && c.movieId).length}
        isFlipped={isFlipped}
        onFlip={handleFlipActors}
        canFlip={!connections.some(c => c.actorId || c.movieId)}
      />
      
      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        
        <div className="mb-6 sm:mb-8 mx-2 sm:mx-0">
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
