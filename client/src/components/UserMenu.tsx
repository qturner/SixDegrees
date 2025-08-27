import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { User, BarChart3, Calendar, LogOut, History } from "lucide-react";
import { DailyChallenge } from "@shared/schema";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface UserStats {
  totalChallenges: number;
  completedChallenges: number;
  averageMoves: number;
  bestScore: number | null;
  moveDistribution: { moves: number; count: number }[];
}

interface UserMenuProps {
  user: UserData;
}

export function UserMenu({ user }: UserMenuProps) {
  const [showStats, setShowStats] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);

  // Query for user's historical stats
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: showStats,
  });

  // Query for incomplete challenges from past 5 days
  const { data: incompleteChallenges } = useQuery<DailyChallenge[]>({
    queryKey: ["/api/user/incomplete-challenges"],
    enabled: showIncomplete,
  });

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-white/90 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-200"
            data-testid="button-user-menu"
          >
            <Avatar className="w-5 h-5">
              <AvatarImage src={user.profileImageUrl} alt={user.firstName} />
              <AvatarFallback className="text-xs">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user.firstName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{user.firstName} {user.lastName}</span>
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
              Incomplete Challenges
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            data-testid="menu-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
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
          <div className="py-4">
            {userStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userStats.totalChallenges}</div>
                  <div className="text-sm text-gray-600">Challenges Played</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{userStats.completedChallenges}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{userStats.averageMoves}</div>
                  <div className="text-sm text-gray-600">Avg Moves</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{userStats.bestScore || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Best Score</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Loading your statistics...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incomplete Challenges Modal */}
      <Dialog open={showIncomplete} onOpenChange={setShowIncomplete}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Incomplete Challenges (Last 5 Days)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {incompleteChallenges && incompleteChallenges.length > 0 ? (
              <div className="space-y-3">
                {incompleteChallenges.map((challenge) => (
                  <div key={challenge.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{challenge.startActorName} → {challenge.endActorName}</div>
                      <div className="text-sm text-gray-600">{new Date(challenge.date).toLocaleDateString()}</div>
                    </div>
                    <Button size="sm" variant="outline">
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {incompleteChallenges === null 
                  ? "Loading incomplete challenges..." 
                  : "No incomplete challenges from the past 5 days"
                }
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}