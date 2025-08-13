import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, Users } from 'lucide-react';

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
}

export default function GameAnalytics({ challengeId, show }: GameAnalyticsProps) {
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
  const bestCompletion = analytics.moveDistribution
    .filter(item => item.count > 0)
    .reduce((min, curr) => curr.moves < min ? curr.moves : min, 6);

  // Only show if there's actual data
  if (analytics.totalAttempts === 0) {
    return null;
  }

  return (
    <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Today's Challenge Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Best Completion</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {analytics.completedAttempts > 0 ? `${bestCompletion} moves` : 'None yet'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Average Moves</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.avgMoves > 0 ? `${analytics.avgMoves}` : 'None yet'}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Players</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.completedAttempts}/{analytics.totalAttempts}
            </div>
            <div className="text-xs text-gray-500">completed</div>
          </div>
        </div>

        {analytics.completedAttempts > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-200">
            <p className="text-xs text-center text-gray-600">
              {analytics.completionRate}% success rate • Anonymous player data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}