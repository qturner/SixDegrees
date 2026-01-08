import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Lightbulb, Film } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackGameEvent } from "@/lib/analytics";

interface Movie {
  id: number;
  title: string;
  release_date: string;
}

interface HintResponse {
  actorName: string;
  movies: Movie[];
  hintsRemaining: number;
}

interface HintsSectionProps {
  dailyChallenge: {
    startActorName: string;
    endActorName: string;
    hintsUsed: number | null;
  };
}

// Helper functions for localStorage hint management
const getHintStorageKey = (challengeDate: string) => `hints-${challengeDate}`;

const saveHintState = (challengeDate: string, hintsUsed: number, startHint?: HintResponse, endHint?: HintResponse) => {
  const hintState = {
    hintsUsed,
    startHint: startHint || null,
    endHint: endHint || null,
    savedAt: Date.now()
  };
  localStorage.setItem(getHintStorageKey(challengeDate), JSON.stringify(hintState));
};

const loadHintState = (challengeDate: string) => {
  try {
    const saved = localStorage.getItem(getHintStorageKey(challengeDate));
    if (saved) {
      const state = JSON.parse(saved);
      // Only load if saved within last 24 hours to avoid stale state
      if (Date.now() - state.savedAt < 24 * 60 * 60 * 1000) {
        return state;
      }
    }
  } catch (error) {
    console.log('Error loading hint state:', error);
  }
  return { hintsUsed: 0, startHint: null, endHint: null };
};

export function HintsSection({ dailyChallenge }: HintsSectionProps) {
  const [startActorHint, setStartActorHint] = useState<HintResponse | null>(null);
  const [endActorHint, setEndActorHint] = useState<HintResponse | null>(null);
  const [activeHintType, setActiveHintType] = useState<'start' | 'end' | null>(null);
  const [userHintsUsed, setUserHintsUsed] = useState<number>(0);
  const [lastChallengeActors, setLastChallengeActors] = useState<string>('');
  const [loadingHintType, setLoadingHintType] = useState<'start' | 'end' | null>(null);
  const { toast } = useToast();
  
  const hintsRemaining = 2 - userHintsUsed;
  const activeHint = activeHintType === 'start' ? startActorHint : endActorHint;
  
  // Load/reset hint state when challenge changes
  useEffect(() => {
    const challengeDate = new Date().toISOString().split('T')[0]; // Today's date
    const currentChallengeActors = `${dailyChallenge.startActorName}-${dailyChallenge.endActorName}`;
    
    if (lastChallengeActors && lastChallengeActors !== currentChallengeActors) {
      // Actors changed - reset all hint state for new challenge
      setStartActorHint(null);
      setEndActorHint(null);
      setActiveHintType(null);
      setUserHintsUsed(0);
      saveHintState(challengeDate, 0);
    } else {
      // Same challenge - load saved state but validate it matches current actors
      const savedState = loadHintState(challengeDate);
      
      // Check if saved hints match current actors
      let validStartHint = null;
      let validEndHint = null;
      
      if (savedState.startHint && savedState.startHint.actorName === dailyChallenge.startActorName) {
        validStartHint = savedState.startHint;
      }
      
      if (savedState.endHint && savedState.endHint.actorName === dailyChallenge.endActorName) {
        validEndHint = savedState.endHint;
      }
      
      // Only use hints that match current actors
      const validHintsCount = (validStartHint ? 1 : 0) + (validEndHint ? 1 : 0);
      
      setUserHintsUsed(validHintsCount);
      setStartActorHint(validStartHint);
      setEndActorHint(validEndHint);
      
      if (validStartHint && !validEndHint) {
        setActiveHintType('start');
      } else if (validEndHint) {
        setActiveHintType('end');
      } else {
        setActiveHintType(null);
      }
      
      // Save the corrected state
      if (validHintsCount !== savedState.hintsUsed || 
          validStartHint !== savedState.startHint || 
          validEndHint !== savedState.endHint) {
        saveHintState(challengeDate, validHintsCount, validStartHint || undefined, validEndHint || undefined);
      }
    }
    setLastChallengeActors(currentChallengeActors);
  }, [dailyChallenge.startActorName, dailyChallenge.endActorName, lastChallengeActors]);

  // Initialize hint state on component mount - validate against current actors
  useEffect(() => {
    const challengeDate = new Date().toISOString().split('T')[0];
    const savedState = loadHintState(challengeDate);
    
    if (savedState.hintsUsed > 0) {
      // Validate saved hints against current actors
      let validStartHint = null;
      let validEndHint = null;
      
      if (savedState.startHint && savedState.startHint.actorName === dailyChallenge.startActorName) {
        validStartHint = savedState.startHint;
      }
      
      if (savedState.endHint && savedState.endHint.actorName === dailyChallenge.endActorName) {
        validEndHint = savedState.endHint;
      }
      
      const validHintsCount = (validStartHint ? 1 : 0) + (validEndHint ? 1 : 0);
      
      setUserHintsUsed(validHintsCount);
      setStartActorHint(validStartHint);
      setEndActorHint(validEndHint);
      
      if (validStartHint && !validEndHint) {
        setActiveHintType('start');
      } else if (validEndHint) {
        setActiveHintType('end');
      }
      
      // Update localStorage with corrected state if needed
      if (validHintsCount !== savedState.hintsUsed || 
          validStartHint !== savedState.startHint || 
          validEndHint !== savedState.endHint) {
        saveHintState(challengeDate, validHintsCount, validStartHint || undefined, validEndHint || undefined);
      }
    }
  }, [dailyChallenge.startActorName, dailyChallenge.endActorName]);

  const hintMutation = useMutation({
    mutationFn: async (actorType: 'start' | 'end'): Promise<HintResponse> => {
      setLoadingHintType(actorType);
      const response = await apiRequest("POST", "/api/daily-challenge/hint", { actorType });
      return await response.json();
    },
    onSuccess: (data: HintResponse, actorType: 'start' | 'end') => {
      const challengeDate = new Date().toISOString().split('T')[0];
      const newHintsUsed = userHintsUsed + 1;
      setUserHintsUsed(newHintsUsed);
      setLoadingHintType(null);
      
      // Track the hint usage
      trackGameEvent.useHint(actorType === 'start' ? 'actor' : 'actor');
      
      if (actorType === 'start') {
        setStartActorHint(data);
        setActiveHintType('start');
        saveHintState(challengeDate, newHintsUsed, data, endActorHint || undefined);
      } else {
        setEndActorHint(data);
        setActiveHintType('end');
        saveHintState(challengeDate, newHintsUsed, startActorHint || undefined, data);
      }
      
      toast({
        title: "Hint revealed!",
        description: `Here are 5 movies featuring ${data.actorName}`,
      });
    },
    onError: (error: any) => {
      setLoadingHintType(null);
      toast({
        title: "Error",
        description: error.message || "Failed to get hint",
        variant: "destructive",
      });
    },
  });

  const handleHintClick = (actorType: 'start' | 'end') => {
    // If hint already exists, just toggle to it
    if ((actorType === 'start' && startActorHint) || (actorType === 'end' && endActorHint)) {
      setActiveHintType(actorType);
      return;
    }
    
    // Otherwise, request a new hint if we have hints remaining
    if (hintsRemaining <= 0) {
      toast({
        title: "No hints remaining",
        description: "You've used all your daily hints!",
        variant: "destructive",
      });
      return;
    }
    hintMutation.mutate(actorType);
  };

  return (
    <div className="deco-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 art-deco-bg opacity-20 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-center mb-4">
          <h3 className="font-display text-lg sm:text-xl text-deco-gold mb-2 tracking-wide flex items-center justify-center gap-2">
            <Lightbulb className="h-5 w-5 text-deco-gold" />
            Daily Hints
          </h3>
          <p className="text-deco-cream/70 text-sm">
            Get movie titles for either actor to help find connections. You have{" "}
            <span className="inline-flex items-center px-2 py-0.5 bg-deco-gold text-deco-black text-xs font-bold">{hintsRemaining} hints</span> remaining today.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button 
              onClick={() => handleHintClick('start')}
              disabled={(hintsRemaining <= 0 && !startActorHint) || loadingHintType === 'start'}
              className={`flex-1 text-sm transition-all duration-200 uppercase tracking-wider shadow-[0_8px_32px_rgba(196,151,49,0.3)] hover:shadow-[0_12px_40px_rgba(196,151,49,0.5)] ${
                startActorHint 
                  ? activeHintType === 'start'
                    ? 'bg-deco-gold text-deco-black border-2 border-deco-gold shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_8px_32px_rgba(196,151,49,0.3)]'
                    : 'bg-deco-charcoal text-deco-gold border-2 border-deco-gold/50 hover:border-deco-gold'
                  : 'bg-transparent text-deco-gold border-2 border-deco-gold/50 hover:border-deco-gold hover:bg-deco-gold/10'
              }`}
              size="sm"
            >
              {loadingHintType === 'start' ? (
                <span>Getting hint...</span>
              ) : (
                <span className="truncate">
                  {startActorHint ? `Show ${dailyChallenge.startActorName}` : `Hint: ${dailyChallenge.startActorName}`}
                </span>
              )}
            </Button>
            <Button 
              onClick={() => handleHintClick('end')}
              disabled={(hintsRemaining <= 0 && !endActorHint) || loadingHintType === 'end'}
              className={`flex-1 text-sm transition-all duration-200 uppercase tracking-wider shadow-[0_8px_32px_rgba(196,151,49,0.3)] hover:shadow-[0_12px_40px_rgba(196,151,49,0.5)] ${
                endActorHint 
                  ? activeHintType === 'end'
                    ? 'bg-deco-gold text-deco-black border-2 border-deco-gold shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_8px_32px_rgba(196,151,49,0.3)]'
                    : 'bg-deco-charcoal text-deco-gold border-2 border-deco-gold/50 hover:border-deco-gold'
                  : 'bg-transparent text-deco-gold border-2 border-deco-gold/50 hover:border-deco-gold hover:bg-deco-gold/10'
              }`}
              size="sm"
            >
              {loadingHintType === 'end' ? (
                <span>Getting hint...</span>
              ) : (
                <span className="truncate">
                  {endActorHint ? `Show ${dailyChallenge.endActorName}` : `Hint: ${dailyChallenge.endActorName}`}
                </span>
              )}
            </Button>
          </div>

          {activeHint && (
            <div className="bg-deco-black/50 border border-deco-gold/30 p-4">
              <h4 className="font-display text-deco-gold text-sm mb-3 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Movies featuring {activeHint.actorName}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeHint.movies.map((movie) => (
                  <div 
                    key={movie.id}
                    className="p-3 border border-deco-gold/20 bg-deco-charcoal/50 transition-all duration-200 hover:border-deco-gold/50 hover:bg-deco-gold/5"
                  >
                    <div className="font-medium text-sm text-deco-cream">{movie.title}</div>
                    {movie.release_date && (
                      <div className="text-xs text-deco-pewter">
                        ({new Date(movie.release_date).getFullYear()})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hintsRemaining === 0 && !activeHint && (
            <div className="text-center text-deco-pewter py-4 text-sm">
              You've used all your daily hints. Come back tomorrow for more!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}