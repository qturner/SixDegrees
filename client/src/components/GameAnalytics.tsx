import { useState } from 'react';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, Users, Film, UserCheck, ChevronRight } from 'lucide-react';
import { BestCompletionModal } from './BestCompletionModal';

interface GameAnalyticsProps {
  challengeId: string;
  show: boolean; // Only show after user validates
}

interface AnalyticsData {
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  avgMoves: number;
  moveDistribution: { moves: number; count: number }[];
  mostUsedMovies: { id: string; title: string; count: number }[];
  mostUsedActors: { id: string; name: string; count: number }[];
}

export default function GameAnalytics({ challengeId, show }: GameAnalyticsProps) {
  const [isBestCompletionModalOpen, setIsBestCompletionModalOpen] = useState(false);

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', challengeId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?challengeId=${challengeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    enabled: show, // Only fetch when we want to show the data
  });

  if (!show || isLoading || !analytics) {
    return null;
  }

  // Find the minimum number of moves (best completion)
  const bestCompletion = analytics.moveDistribution && analytics.moveDistribution.length > 0
    ? analytics.moveDistribution
      .filter(item => item.count > 0)
      .reduce((min, curr) => curr.moves < min ? curr.moves : min, 6)
    : 6;

  // Only show if there's actual data
  if (analytics.totalAttempts === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-6 group relative">
        {/* Main card */}
        <div className="deco-card p-6 sm:p-8 relative overflow-hidden backdrop-blur-md bg-deco-black/40 border border-white/10">
          {/* Subtle background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20 pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
            <Users className="h-5 w-5 text-deco-gold" />
            <h3 className="font-display text-xl text-deco-gold tracking-wide">Today's Challenge Stats</h3>
          </div>

          {/* Stats grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className="text-center p-3 bg-black/30 border border-white/5 rounded cursor-pointer hover:bg-black/40 hover:border-deco-gold/30 transition-all group/stats"
              onClick={() => setIsBestCompletionModalOpen(true)}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target className="h-4 w-4 text-game-success" />
                <span className="text-sm font-medium text-deco-cream/70">Best Completion</span>
              </div>
              <div className="text-2xl font-bold text-game-success group-hover/stats:scale-105 transition-transform flex items-center justify-center gap-1">
                {analytics.completedAttempts > 0 ? `${bestCompletion} moves` : 'None yet'}
                <ChevronRight className="h-4 w-4 opacity-0 group-hover/stats:opacity-100 transition-opacity absolute ml-24" />
              </div>
            </div>

            <div className="text-center p-3 bg-black/30 border border-white/5 rounded">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-deco-gold" />
                <span className="text-sm font-medium text-deco-cream/70">Average Moves</span>
              </div>
              <div className="text-2xl font-bold text-deco-gold">
                {analytics.avgMoves > 0 ? `${analytics.avgMoves}` : 'None yet'}
              </div>
            </div>

            <div className="text-center p-3 bg-black/30 border border-white/5 rounded">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-deco-champagne" />
                <span className="text-sm font-medium text-deco-cream/70">Players</span>
              </div>
              <div className="text-2xl font-bold text-deco-champagne">
                {analytics.completedAttempts}/{analytics.totalAttempts}
              </div>
              <div className="text-xs text-deco-cream/50">completed</div>
            </div>
          </div>

          {analytics.completedAttempts > 0 && (
            <div className="relative z-10 mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-center text-deco-cream/60">
                {analytics.completionRate}% success rate • Anonymous player data
              </p>
            </div>
          )}

          {/* Most Used Movies and Actors */}
          {(analytics.mostUsedMovies?.length > 0 || analytics.mostUsedActors?.length > 0) && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.mostUsedMovies && analytics.mostUsedMovies.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="h-4 w-4 text-deco-gold" />
                    <span className="text-sm font-medium text-deco-gold">Popular Movies</span>
                  </div>
                  <div className="space-y-2">
                    {analytics.mostUsedMovies.slice(0, 3).map((movie, index) => (
                      <div key={movie.id} className="flex justify-between items-center text-sm">
                        <span className="text-deco-cream/80 truncate mr-2">
                          {index + 1}. {movie.title}
                        </span>
                        <span className="text-deco-gold font-medium">
                          {movie.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.mostUsedActors && analytics.mostUsedActors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="h-4 w-4 text-deco-champagne" />
                    <span className="text-sm font-medium text-deco-champagne">Popular Actors</span>
                  </div>
                  <div className="space-y-2">
                    {analytics.mostUsedActors.slice(0, 3).map((actor, index) => (
                      <div key={actor.id} className="flex justify-between items-center text-sm">
                        <span className="text-deco-cream/80 truncate mr-2">
                          {index + 1}. {actor.name}
                        </span>
                        <span className="text-deco-champagne font-medium">
                          {actor.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BestCompletionModal
        isOpen={isBestCompletionModalOpen}
        onOpenChange={setIsBestCompletionModalOpen}
        challengeId={challengeId}
      />
    </>
  );
}