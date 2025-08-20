import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Target, TrendingUp, BarChart3, Trophy } from 'lucide-react';

interface AnalyticsDashboardProps {
  challengeId: string;
  challengeName: string;
}

interface AnalyticsData {
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  avgMoves: number;
  fewestMoves: number;
  moveDistribution: { moves: number; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard({ challengeId, challengeName }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', challengeId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?challengeId=${challengeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load analytics data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#000000] pt-[-7px] pb-[-7px]">Game Analytics</h2>
        <p className="text-sm text-gray-500">{challengeName}</p>
      </div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Anonymous game attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Games</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Games completed successfully
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Moves</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgMoves}</div>
            <p className="text-xs text-muted-foreground">
              For completed games
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fewest Moves</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.fewestMoves > 0 ? analytics.fewestMoves : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Best completion record
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Move Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Move Distribution</CardTitle>
            <CardDescription>Number of moves taken to complete the game</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.moveDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="moves" 
                  label={{ value: 'Number of Moves', position: 'insideBottom', offset: -10 }} 
                />
                <YAxis label={{ value: 'Players', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(value) => `${value} moves`}
                  formatter={(value) => [`${value}`, 'Players']}
                />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Success Rate Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Status</CardTitle>
            <CardDescription>Completed vs. incomplete attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: analytics.completedAttempts },
                    { name: 'Incomplete', value: analytics.totalAttempts - analytics.completedAttempts }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Completed', value: analytics.completedAttempts },
                    { name: 'Incomplete', value: analytics.totalAttempts - analytics.completedAttempts }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {/* Additional Insights */}
      {analytics.totalAttempts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                • <strong>{analytics.totalAttempts}</strong> players have attempted today's challenge
              </p>
              <p className="text-sm">
                • <strong>{analytics.completionRate}%</strong> of players successfully completed the game
              </p>
              {analytics.avgMoves > 0 && (
                <p className="text-sm">
                  • Successful players took an average of <strong>{analytics.avgMoves} moves</strong>
                </p>
              )}
              {analytics.moveDistribution.length > 0 && (
                <p className="text-sm">
                  • Most popular solution length: <strong>
                    {analytics.moveDistribution.reduce((max, curr) => 
                      curr.count > max.count ? curr : max
                    ).moves} moves
                  </strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}