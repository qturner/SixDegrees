import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackGameEvent } from "@/lib/analytics";
import { trackGameStart } from "@/hooks/useVisitorTracking";

export interface Movie {
    id: number;
    title: string;
    release_date: string;
}

export interface HintResponse {
    actorName: string;
    movies: Movie[];
    hintsRemaining: number;
}

interface DailyChallengeHelper {
    startActorName: string;
    endActorName: string;
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

export function useHints(dailyChallenge: DailyChallengeHelper) {
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
        // Get date in EST/EDT timezone using en-CA (YYYY-MM-DD)
        const challengeDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()).replace(/\//g, '-');

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
                // If we have both or neither, defaulting to null or keeping current active is fine.
                // Logic from original file:
                // if (validStartHint && !validEndHint) setActiveHintType('start');
                // else if (validEndHint) setActiveHintType('end');
                // else setActiveHintType(null);
                // The above was inside the initialization useEffect, reproducing it here.
            }

            // We need to set active type if we have hints, to show them.
            if (validStartHint && !validEndHint) setActiveHintType('start');
            else if (validEndHint && !validStartHint) setActiveHintType('end');
            // If both, we don't auto-set active? Original logic didn't seem to explicitly handle "both loaded on mount" for active selection, 
            // but standard behavior is usually last one or none. 
        }
        setLastChallengeActors(currentChallengeActors);
    }, [dailyChallenge.startActorName, dailyChallenge.endActorName, lastChallengeActors]);

    const hintMutation = useMutation({
        mutationFn: async (actorType: 'start' | 'end'): Promise<HintResponse> => {
            setLoadingHintType(actorType);
            const response = await apiRequest("POST", "/api/daily-challenge/hint", { actorType });
            return await response.json();
        },
        onSuccess: (data: HintResponse, actorType: 'start' | 'end') => {
            const challengeDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date()).replace(/\//g, '-');

            const newHintsUsed = userHintsUsed + 1;
            setUserHintsUsed(newHintsUsed);
            setLoadingHintType(null);

            trackGameEvent.useHint(actorType === 'start' ? 'actor' : 'actor');
            trackGameStart();

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
        if ((actorType === 'start' && startActorHint) || (actorType === 'end' && endActorHint)) {
            setActiveHintType(actorType); // Just toggle/show
            return;
        }

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

    return {
        startActorHint,
        endActorHint,
        activeHintType,
        activeHint,
        hintsRemaining,
        loadingHintType,
        handleHintClick,
        userHintsUsed
    };
}
