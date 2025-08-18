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
import GameAnalytics from "@/components/GameAnalytics";
import TodaysChallenge from "@/components/TodaysChallenge";
import { AboutModal } from "@/components/AboutModal";
import { ContactModal } from "@/components/ContactModal";
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
  // SEO optimization - update meta tags for game page
  useEffect(() => {
    document.title = "Play Today's Challenge - Six Degrees of Separation";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Play today\'s Six Degrees of Separation challenge! Connect two Hollywood actors through movies in 6 moves or less. New daily challenges with hints and analytics.'
      );
    }
  }, []);

  // Initialize state - will be reset when challenge loads if needed
  const [connections, setConnections] = useState<Connection[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [gameResult, setGameResult] = useState<ValidationResult | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
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

  const handleValidationResult = (index: number, result: ValidationResult | null) => {
    setValidationResults(prev => {
      const newResults = [...prev];
      if (result === null) {
        // Clear the validation result at this index
        newResults[index] = null as any;
      } else {
        newResults[index] = result;
      }
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
    <div className="min-h-screen bg-game-background text-game-text font-sans">
      {/* Admin Access Button - Bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <Link href="/admin-login">
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-white/90 backdrop-blur-sm shadow-card hover:shadow-card-hover btn-hover button-radius transition-all duration-200 text-gray-600 hover:text-gray-800">
            <Shield className="h-4 w-4" />
            Admin
          </Button>
        </Link>
      </div>

      <GameHeader 
        challenge={challenge} 
        currentMoves={connections.filter(c => c.actorId && c.movieId).length}
        isFlipped={isFlipped}
        onFlip={handleFlipActors}
        canFlip={!connections.some(c => c.actorId || c.movieId)}
        gameResult={gameResult}
      />
      
      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        
        <div className="mb-6 sm:mb-8">
          <TodaysChallenge 
            challenge={challenge}
            currentMoves={connections.filter(c => c.actorId && c.movieId).length}
            isFlipped={isFlipped}
            onFlip={handleFlipActors}
            canFlip={!connections.some(c => c.actorId || c.movieId)}
            gameResult={gameResult}
          />
        </div>
        
        <div className="mb-6 sm:mb-8">
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
        
        {/* Show analytics after user validates their game */}
        <GameAnalytics 
          challengeId={challenge.id}
          show={gameResult !== null}
        />
        
        <GameInstructions />
        
        <footer className="text-center text-muted text-body-sm mt-12">
          <div className="mb-4">
            <div className="text-game-primary font-medium mb-2 text-heading-sm">Six Degrees of Separation</div>
            <div>A new daily challenge connecting Hollywood's finest</div>
          </div>
          <div className="flex justify-center space-x-6">
            <button 
              onClick={() => setIsAboutModalOpen(true)}
              className="hover:text-game-primary transition-all duration-200 cursor-pointer"
              data-testid="button-about"
            >
              About
            </button>
            <button 
              onClick={() => setIsContactModalOpen(true)}
              className="hover:text-game-primary transition-all duration-200 cursor-pointer"
              data-testid="button-contact"
            >
              Contact
            </button>
          </div>
        </footer>
      </main>

      <AboutModal 
        open={isAboutModalOpen} 
        onOpenChange={setIsAboutModalOpen} 
      />
      
      <ContactModal 
        open={isContactModalOpen} 
        onOpenChange={setIsContactModalOpen} 
      />
    </div>
  );
}
