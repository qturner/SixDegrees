import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";
import { trackGameEvent, trackPageView } from "@/lib/analytics";

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
      // Only load if saved within last 24 hours to avoid stale state
      // AND if it's for the same daily challenge date
      if (Date.now() - state.savedAt < 24 * 60 * 60 * 1000 && 
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
  const queryClient = useQueryClient();
  const previousChallengeIdRef = useRef<string | null>(null);

  usePageMeta({
    title: "Play Today's Challenge",
    description: "Play today's Six Degrees of Separation challenge! Connect two Hollywood actors through movies in 6 moves or less. New daily challenges with hints and analytics.",
    canonical: "https://sixdegrees.app/",
  });

  useEffect(() => {
    trackPageView('/');
  }, []);

  // Initialize state - will be reset when challenge loads if needed
  const [connections, setConnections] = useState<Connection[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [gameResult, setGameResult] = useState<ValidationResult | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { user, recordCompletion } = useAuth();
  const [gameStateInitialized, setGameStateInitialized] = useState(false);

  const { data: challenge, isLoading, error, refetch } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for 503 errors (database temporarily unavailable)
      if (error?.status === 503 && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Query for current user (if logged in)
  const { data: currentUser } = useQuery<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  }>({
    queryKey: ["/api/user/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Clear cached analytics data when daily challenge changes
  useEffect(() => {
    if (challenge?.id) {
      // Check both in-memory ref and localStorage for previous challenge ID
      const previousIdFromRef = previousChallengeIdRef.current;
      const previousIdFromStorage = localStorage.getItem('lastChallengeId');
      const previousId = previousIdFromRef || previousIdFromStorage;
      
      // If we have a previous ID and it's different from the current one, clear caches
      if (previousId && previousId !== challenge.id) {
        console.log('Daily challenge changed - clearing analytics cache');
        
        // Invalidate all analytics queries to force fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
        
        // Also clear any search-related caches to ensure fresh actor/movie data
        queryClient.invalidateQueries({ queryKey: ['/api/search'] });
        
        // Reset game state for new challenge
        setGameStateInitialized(false);
      }
      
      // Update the ref and localStorage with current challenge ID
      previousChallengeIdRef.current = challenge.id;
      localStorage.setItem('lastChallengeId', challenge.id);
    }
  }, [challenge?.id, queryClient]);

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

  const handleGameResult = async (result: ValidationResult) => {
    setGameResult(result);
    
    // Record completion for logged-in users
    if (user && result.completed && challenge && result.moves) {
      try {
        await recordCompletion({
          challengeId: challenge.id,
          moves: result.moves,
          connections: JSON.stringify(connections)
        });
      } catch (error) {
        console.error("Failed to record user completion:", error);
        // Don't show error to user - completion tracking should be silent
      }
    }
  };

  const resetGame = (preserveFlip = false) => {
    setConnections([]);
    setValidationResults([]);
    setGameResult(null);
    if (!preserveFlip) {
      setIsFlipped(false);
    }
    localStorage.removeItem('gameState');
    trackGameEvent.resetGame();
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
    const isDatabaseError = error && (error as any)?.status === 503;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          {isDatabaseError ? (
            <div>
              <p className="text-gray-800 text-lg font-medium mb-3">
                Database temporarily unavailable
              </p>
              <p className="text-gray-600 mb-6">
                We're experiencing connectivity issues. This usually resolves itself quickly.
              </p>
              <button 
                onClick={() => refetch()} 
                className="bg-game-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                data-testid="button-retry"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-800 text-lg font-medium mb-3">
                Failed to load today's challenge
              </p>
              <p className="text-gray-600 mb-6">
                Something went wrong. Please try refreshing the page.
              </p>
              <button 
                onClick={() => refetch()} 
                className="bg-game-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                data-testid="button-retry"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const effectiveChallenge = getEffectiveChallenge();

  return (
    <div className="min-h-screen bg-game-background text-game-text font-sans">
      {/* Admin Login - Bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        {currentUser ? (
          <UserMenu />
        ) : (
          <Link href="/admin-login">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 bg-white/90 backdrop-blur-sm shadow-card hover:shadow-card-hover btn-hover button-radius transition-all duration-200 text-gray-600 hover:text-gray-800"
              data-testid="button-admin"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        )}
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
          connections={connections}
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
            <div className="text-xs mt-1 opacity-75">A Prologue LLC Project</div>
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
