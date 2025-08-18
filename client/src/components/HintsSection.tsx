import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Film } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    <Card className="w-full card-radius shadow-card hover:shadow-card-hover transition-all duration-300 bg-game-surface border-game-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-md text-game-primary">
          <Lightbulb className="h-5 w-5 text-game-primary" />
          Daily Hints
        </CardTitle>
        <CardDescription className="text-body text-game-text">
          Get movie titles for either actor to help find connections. You have{" "}
          <Badge variant="secondary" className="button-radius bg-game-primary text-game-background">{hintsRemaining} hints remaining</Badge> today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Hint Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button 
              onClick={() => handleHintClick('start')}
              disabled={(hintsRemaining <= 0 && !startActorHint) || loadingHintType === 'start'}
              variant={startActorHint ? (activeHintType === 'start' ? "default" : "secondary") : "outline"}
              className={`flex-1 text-body-sm btn-hover button-radius transition-all duration-200 border-game-primary hover:bg-game-primary hover:text-game-background ${
                startActorHint ? 'bg-game-primary text-game-background' : 'text-game-primary'
              }`}
              size="sm"
            >
              {loadingHintType === 'start' ? "Getting hint..." : (
                <span className={`truncate ${startActorHint ? 'text-white' : ''}`}>
                  {startActorHint ? `Show ${dailyChallenge.startActorName} hint` : `Hint for ${dailyChallenge.startActorName}`}
                </span>
              )}
            </Button>
            <Button 
              onClick={() => handleHintClick('end')}
              disabled={(hintsRemaining <= 0 && !endActorHint) || loadingHintType === 'end'}
              variant={endActorHint ? (activeHintType === 'end' ? "default" : "secondary") : "outline"}
              className={`flex-1 text-body-sm btn-hover button-radius transition-all duration-200 border-game-primary hover:bg-game-primary hover:text-game-background ${
                endActorHint ? 'bg-game-primary text-game-background' : 'text-game-primary'
              }`}
              size="sm"
            >
              {loadingHintType === 'end' ? "Getting hint..." : (
                <span className={`truncate ${endActorHint ? 'text-white' : ''}`}>
                  {endActorHint ? `Show ${dailyChallenge.endActorName} hint` : `Hint for ${dailyChallenge.endActorName}`}
                </span>
              )}
            </Button>
          </div>

          {/* Active Hint Display */}
          {activeHint && (
            <Card className="card-radius shadow-card transition-all duration-300 bg-game-background border-game-accent">
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-sm flex items-center gap-2 text-game-primary">
                  <Film className="h-4 w-4" />
                  Movies featuring {activeHint.actorName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeHint.movies.map((movie) => (
                    <div 
                      key={movie.id}
                      className="spacing-sm input-radius border border-game-accent bg-game-surface transition-all duration-200 hover:bg-game-primary hover:text-game-background hover:shadow-card"
                    >
                      <div className="font-medium text-body-sm text-game-text">{movie.title}</div>
                      {movie.release_date && (
                        <div className="text-body-sm text-game-accent">
                          ({new Date(movie.release_date).getFullYear()})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hintsRemaining === 0 && !activeHint && (
            <div className="text-center text-game-accent py-4 text-body">
              You've used all your daily hints. Come back tomorrow for more!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}