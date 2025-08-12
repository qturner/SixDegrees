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

export function HintsSection({ dailyChallenge }: HintsSectionProps) {
  const [startActorHint, setStartActorHint] = useState<HintResponse | null>(null);
  const [endActorHint, setEndActorHint] = useState<HintResponse | null>(null);
  const [activeHintType, setActiveHintType] = useState<'start' | 'end' | null>(null);
  const [lastChallengeActors, setLastChallengeActors] = useState<string>('');
  const { toast } = useToast();
  
  const hintsRemaining = 2 - (dailyChallenge.hintsUsed || 0);
  const activeHint = activeHintType === 'start' ? startActorHint : endActorHint;
  
  // Reset hint state when challenge actors change
  useEffect(() => {
    const currentChallengeActors = `${dailyChallenge.startActorName}-${dailyChallenge.endActorName}`;
    if (lastChallengeActors && lastChallengeActors !== currentChallengeActors) {
      // Actors changed - reset all hint state
      setStartActorHint(null);
      setEndActorHint(null);
      setActiveHintType(null);
      // Invalidate React Query cache for hints
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge/hints"] });
    }
    setLastChallengeActors(currentChallengeActors);
  }, [dailyChallenge.startActorName, dailyChallenge.endActorName, lastChallengeActors]);

  // Load stored hints on component mount
  const { data: storedHints } = useQuery({
    queryKey: ["/api/daily-challenge/hints"],
    enabled: (dailyChallenge.hintsUsed || 0) > 0, // Only load if hints were used
  });

  // Update local state when stored hints are loaded
  useEffect(() => {
    if (storedHints) {
      if (storedHints.startActorHint) {
        setStartActorHint(storedHints.startActorHint);
        if (!activeHintType) setActiveHintType('start');
      }
      if (storedHints.endActorHint) {
        setEndActorHint(storedHints.endActorHint);
        if (!activeHintType && !storedHints.startActorHint) setActiveHintType('end');
      }
    }
  }, [storedHints, activeHintType]);

  const hintMutation = useMutation({
    mutationFn: async (actorType: 'start' | 'end'): Promise<HintResponse> => {
      const response = await apiRequest("POST", "/api/daily-challenge/hint", { actorType });
      return await response.json();
    },
    onSuccess: (data: HintResponse, actorType: 'start' | 'end') => {
      if (actorType === 'start') {
        setStartActorHint(data);
        setActiveHintType('start');
      } else {
        setEndActorHint(data);
        setActiveHintType('end');
      }
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
      toast({
        title: "Hint revealed!",
        description: `Here are 5 movies featuring ${data.actorName}`,
      });
    },
    onError: (error: any) => {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Daily Hints
        </CardTitle>
        <CardDescription>
          Get movie titles for either actor to help find connections. You have{" "}
          <Badge variant="secondary">{hintsRemaining} hints remaining</Badge> today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Hint Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button 
              onClick={() => handleHintClick('start')}
              disabled={(hintsRemaining <= 0 && !startActorHint) || hintMutation.isPending}
              variant={startActorHint ? (activeHintType === 'start' ? "default" : "secondary") : "outline"}
              className="flex-1 text-sm"
              size="sm"
            >
              {hintMutation.isPending ? "Getting hint..." : (
                <span className="truncate">
                  {startActorHint ? `Show ${dailyChallenge.startActorName} hint` : `Hint for ${dailyChallenge.startActorName}`}
                </span>
              )}
            </Button>
            <Button 
              onClick={() => handleHintClick('end')}
              disabled={(hintsRemaining <= 0 && !endActorHint) || hintMutation.isPending}
              variant={endActorHint ? (activeHintType === 'end' ? "default" : "secondary") : "outline"}
              className="flex-1 text-sm"
              size="sm"
            >
              {hintMutation.isPending ? "Getting hint..." : (
                <span className="truncate">
                  {endActorHint ? `Show ${dailyChallenge.endActorName} hint` : `Hint for ${dailyChallenge.endActorName}`}
                </span>
              )}
            </Button>
          </div>

          {/* Active Hint Display */}
          {activeHint && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Movies featuring {activeHint.actorName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeHint.movies.map((movie) => (
                    <div 
                      key={movie.id}
                      className="p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="font-medium">{movie.title}</div>
                      {movie.release_date && (
                        <div className="text-sm text-muted-foreground">
                          ({new Date(movie.release_date).getFullYear()})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {activeHint.hintsRemaining > 0 && (
                  <p className="text-sm text-muted-foreground mt-3">
                    You have {activeHint.hintsRemaining} hint{activeHint.hintsRemaining !== 1 ? 's' : ''} remaining today.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {hintsRemaining === 0 && !activeHint && (
            <div className="text-center text-muted-foreground py-4">
              You've used all your daily hints. Come back tomorrow for more!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}