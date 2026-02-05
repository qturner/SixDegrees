import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Portal from "@/components/ui/portal";
import { Button } from "@/components/ui/button";
import { Shield, User } from "lucide-react";
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
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DailyChallenge, Connection, ValidationResult } from "@shared/schema";
import { trackGameEvent, trackPageView } from "@/lib/analytics";
import { useHints } from "@/hooks/useHints";

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

  const pageTitle = challenge
    ? `Connect ${challenge.startActorName} & ${challenge.endActorName}`
    : "Play Today's Challenge";

  const pageDescription = challenge
    ? `Today's Challenge: Connect ${challenge.startActorName} and ${challenge.endActorName} in 6 moves or less! Play the daily Six Degrees of Separation movie trivia game.`
    : "Play today's Six Degrees of Separation challenge! Connect two Hollywood actors through movies in 6 moves or less. New daily challenges with hints and analytics.";

  const structuredData = challenge ? {
    "@context": "https://schema.org",
    "@type": "Quiz",
    "name": `Daily Connection: ${challenge.startActorName} to ${challenge.endActorName}`,
    "about": {
      "@type": "Thing",
      "name": "Movie Trivia"
    },
    "educationalUse": "Brain Training",
    "learningResourceType": "Quiz",
    "assesses": "Film Knowledge",
    "author": {
      "@type": "Organization",
      "name": "Six Degrees"
    },
    "datePublished": challenge.date,
    "hasPart": {
      "@type": "Question",
      "name": `Connect ${challenge.startActorName} to ${challenge.endActorName}`,
      "text": `Find a connection between ${challenge.startActorName} and ${challenge.endActorName} through movies they have co-starred in.`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Correct connection path found in 6 degrees or less."
      }
    }
  } : null;

  usePageMeta({
    title: pageTitle,
    description: pageDescription,
    keywords: challenge
      ? `six degrees, ${challenge.startActorName}, ${challenge.endActorName}, movie trivia, movie connection, kevin bacon game, film puzzle, movie connection trivia, interactive actor trivia`
      : "six degrees separation, movie game, actor connection, film trivia, Hollywood game, movie connection trivia, interactive actor trivia",
    canonical: "https://sixdegrees.app/",
    structuredData
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, recordCompletion } = useAuth();
  const [gameStateInitialized, setGameStateInitialized] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Scroll detection for admin button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const threshold = 100; // Show when within 100px of bottom

      setIsAtBottom(scrollTop + windowHeight >= documentHeight - threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const {
    startActorHint,
    endActorHint,
    activeHint,
    hintsRemaining,
    loadingHintType,
    handleHintClick
  } = useHints({
    startActorName: challenge?.startActorName || '',
    endActorName: challenge?.endActorName || ''
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
    // Get date in EST/EDT timezone using en-CA (YYYY-MM-DD)
    const challengeDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).replace(/\//g, '-');
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
        startActorProfilePath: challenge.endActorProfilePath,
        endActorId: challenge.startActorId,
        endActorName: challenge.startActorName,
        endActorProfilePath: challenge.startActorProfilePath,
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
    <div className="min-h-screen text-game-text font-sans flex flex-col">
      {/* Auth UI - Bottom Left */}
      {/* Auth UI - Bottom Left - Portalled to escape transforms */}
      <Portal>
        <div className="fixed bottom-4 left-4 z-50 transition-opacity duration-300">
          {user ? (
            <UserMenu />
          ) : (
            <Button
              size="sm"
              className="flex items-center gap-2 bg-deco-gold text-deco-charcoal hover:bg-deco-gold/80 hover:text-black transition-colors font-bold shadow-lg border border-transparent"
              onClick={() => setIsAuthModalOpen(true)}
              data-testid="button-signin"
            >
              <User className="w-4 h-4 mr-2" />
              <span className="font-medium">Sign In</span>
            </Button>
          )}
        </div>
      </Portal>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />



      <GameHeader
        challenge={challenge}
        currentMoves={connections.filter(c => c.actorId && c.movieId).length}
        isFlipped={isFlipped}
        onFlip={handleFlipActors}
        canFlip={!connections.some(c => c.actorId || c.movieId)}
        gameResult={gameResult}
      />

      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 flex-1 w-full">

        <div className="mb-6 sm:mb-8">
          <TodaysChallenge
            challenge={challenge}
            currentMoves={connections.filter(c => c.actorId && c.movieId).length}
            isFlipped={isFlipped}
            onFlip={handleFlipActors}
            canFlip={!connections.some(c => c.actorId || c.movieId)}
            gameResult={gameResult}
            onHint={handleHintClick}
            hintsRemaining={hintsRemaining}
            loadingHintType={loadingHintType}
            startActorHint={startActorHint}
            endActorHint={endActorHint}
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <HintsSection
            activeHint={activeHint}
            hintsRemaining={hintsRemaining}
          />
        </div>

        <GameGrid
          challenge={effectiveChallenge!}
          connections={connections}
          validationResults={validationResults}
          onConnectionUpdate={handleConnectionUpdate}
          onValidationResult={handleValidationResult}
          onGameResult={handleGameResult}
          onReset={resetGame}
          gameResult={gameResult}
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

        <footer className="text-center mt-16 mb-8 relative">
          {/* Decorative top border */}
          <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-deco-gold/40 to-transparent mb-8" />

          <div className="mb-6">
            <div className="font-display text-xl text-deco-gold mb-2 tracking-wide">Six Degrees of Separation</div>
            <div className="text-deco-pewter text-sm">A new daily challenge connecting Hollywood's finest</div>
            <div className="text-xs mt-2 text-deco-pewter/60 tracking-wider uppercase">A Prologue LLC Project</div>
          </div>

          <div className="flex justify-center space-x-8">
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="text-deco-pewter hover:text-deco-gold transition-all duration-200 cursor-pointer text-sm uppercase tracking-wider"
              data-testid="button-about"
            >
              About
            </button>
            <span className="text-deco-gold/30">|</span>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="text-deco-pewter hover:text-deco-gold transition-all duration-200 cursor-pointer text-sm uppercase tracking-wider"
              data-testid="button-contact"
            >
              Contact
            </button>
          </div>

          {/* Decorative bottom element */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="h-px w-8 bg-deco-gold/30" />
            <div className="w-2 h-2 rotate-45 border border-deco-gold/40" />
            <div className="h-px w-8 bg-deco-gold/30" />
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
