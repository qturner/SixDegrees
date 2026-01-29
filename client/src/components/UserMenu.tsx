import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BarChart3, LogOut, History, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DailyChallenge } from "@shared/schema";

interface UserMenuProps {
  onPlayChallenge?: (challenge: DailyChallenge) => void;
}

export function UserMenu({ onPlayChallenge }: UserMenuProps) {
  const [showStats, setShowStats] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const {
    user,
    userStats,
    recentChallenges,
    moveDistribution,
    logoutMutation,
    isStatsLoading
  } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const displayName = user.firstName || user.username;
  const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;

  const calculateAverageScore = () => {
    if (!userStats || !userStats.totalCompletions || !userStats.totalMoves) return 0;
    return Math.round((userStats.totalMoves / userStats.totalCompletions) * 10) / 10;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="flex items-center gap-2 bg-deco-gold text-deco-charcoal hover:bg-deco-gold/80 hover:text-black transition-colors font-bold shadow-md border border-transparent"
            data-testid="button-user-menu"
          >
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-xs">
                {getInitials(user.firstName, user.lastName, user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{fullName}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setShowStats(true)}
              data-testid="menu-user-stats"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              My Stats
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowIncomplete(true)}
              data-testid="menu-incomplete-challenges"
            >
              <History className="mr-2 h-4 w-4" />
              Recent Challenges
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            data-testid="menu-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Stats Modal */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              My Game Statistics
            </DialogTitle>
          </DialogHeader>

          {isStatsLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading stats...
            </div>
          ) : userStats ? (
            <div className="grid gap-6 py-4">
              {/* Overall Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {userStats.totalCompletions || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completed
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {calculateAverageScore()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Moves
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {userStats.totalMoves || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Moves
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {userStats.currentStreak || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current Streak
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {userStats.maxStreak || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Max Streak
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {userStats.completionsAt1Move || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Perfect Games
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Move Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-4 w-4" />
                    Completion Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((moves) => {
                      const count = userStats[`completionsAt${moves}Move${moves > 1 ? 's' : ''}` as keyof typeof userStats] as number || 0;
                      const percentage = (userStats.totalCompletions || 0) > 0 ? Math.round((count / (userStats.totalCompletions || 1)) * 100) : 0;

                      return (
                        <div key={moves} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{moves} move{moves > 1 ? 's' : ''}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No stats available yet. Complete some challenges to see your progress!
            </div>
          )}
        </DialogContent>
      </Dialog >

      {/* Recent Challenges Modal */}
      <Dialog open={showIncomplete} onOpenChange={setShowIncomplete}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Challenges
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {recentChallenges && recentChallenges.length > 0 ? (
              <div className="space-y-3">
                {recentChallenges.map((item, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">
                            {item.challenge.startActorName} → {item.challenge.endActorName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.challenge.date}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.completed ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <Award className="h-3 w-3 mr-1" />
                              {item.moves} moves
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-orange-600">
                                Not completed
                              </Badge>
                              {onPlayChallenge && (
                                <Button
                                  size="sm"
                                  onClick={() => onPlayChallenge(item.challenge)}
                                  data-testid={`button-play-challenge-${index}`}
                                >
                                  Play Now
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent challenges found. Keep playing to see your history!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}