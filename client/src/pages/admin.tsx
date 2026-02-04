import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, RefreshCw, LogOut, Users, Calendar, Search, UserPlus, BarChart3 } from "lucide-react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ContactSubmissions from "@/components/ContactSubmissions";
import ReferralAnalyticsDashboard from "@/components/ReferralAnalyticsDashboard";
import { trackPageView, trackEvent } from "@/lib/analytics";

interface DailyChallenge {
  date: string;
  startActorName: string;
  endActorName: string;
  hintsUsed: number;
  id: string;
  createdAt: string;
}

interface UserData {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  googleId: string | null;
}

function useAdminAuth() {
  const [_, setLocation] = useLocation();

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken');
    const expiry = localStorage.getItem('adminTokenExpiry');

    if (!token || !expiry) {
      return false;
    }

    if (new Date() > new Date(expiry)) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminTokenExpiry');
      return false;
    }

    return token;
  };

  useEffect(() => {
    const token = checkAuth();
    if (!token) {
      setLocation("/admin-login");
    }
  }, [setLocation]);

  return checkAuth();
}

function DiagnosticsCard() {
  const { data: debugInfo, error, isLoading } = useQuery({
    queryKey: ["/api/test"],
    queryFn: async () => {
      const res = await fetch("/api/test");
      if (!res.ok) throw new Error("Failed to fetch diagnostics");
      return res.json();
    }
  });

  return (
    <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-deco-gold">
          <BarChart3 className="h-5 w-5" />
          System Diagnostics (Debug)
        </CardTitle>
        <CardDescription className="text-deco-cream/60">
          Live view of database state and environment variables
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading diagnostics...</p>
        ) : error ? (
          <p className="text-red-400">Error loading diagnostics: {error.message}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-black/60 rounded border border-white/10">
                <p className="text-sm font-bold text-deco-gold">TMDB Key:</p>
                <p className={debugInfo?.env?.hasTmdbKey ? "text-game-success" : "text-red-400"}>
                  {debugInfo?.env?.hasTmdbKey ? "Configured" : "MISSING"}
                </p>
              </div>
              <div className="p-3 bg-black/60 rounded border border-white/10">
                <p className="text-sm font-bold text-deco-gold">Database:</p>
                <p className={debugInfo?.env?.hasDbUrl ? "text-game-success" : "text-red-400"}>
                  {debugInfo?.env?.hasDbUrl ? "Configured" : "MISSING"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/80 text-deco-cream/80 rounded border border-white/10 overflow-auto max-h-60 text-xs font-mono">
              <pre>{JSON.stringify(debugInfo?.db, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function UserList() {
  const { data: users, isLoading, error } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token');

      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  if (isLoading) return <div className="p-4 text-center">Loading users...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading users</div>;

  return (
    <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-deco-gold">
          <Users className="h-5 w-5" />
          Registered Users ({users?.length || 0})
        </CardTitle>
        <CardDescription className="text-deco-cream/60">
          List of all registered accounts by name and email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-deco-gold/10 h-[400px] overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-black/60 text-deco-gold sticky top-0 md:static">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Username</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Auth Method</th>
                <th className="p-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deco-gold/10">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-deco-gold/5 transition-colors">
                  <td className="p-4 font-medium text-deco-cream">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : '-'}
                  </td>
                  <td className="p-4 text-deco-cream/80">{user.username}</td>
                  <td className="p-4 text-deco-cream/80">{user.email}</td>
                  <td className="p-4">
                    <Badge variant={user.googleId ? "secondary" : "outline"} className={user.googleId ? "bg-deco-gold/20 text-deco-gold border-deco-gold/30 hover:bg-deco-gold/30" : "border-deco-gold/30 text-deco-cream/60"}>
                      {user.googleId ? "Google" : "Email"}
                    </Badge>
                  </td>
                  <td className="p-4 max-w-[150px] truncate text-deco-cream/60">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPanel() {
  usePageMeta({
    title: "Admin Dashboard",
    description: "Admin dashboard for Six Degrees of Separation game. Manage daily challenges, view analytics, and monitor contact submissions.",
    noIndex: true,
  });

  useEffect(() => {
    trackPageView('/admin');
    trackEvent('admin_access', 'admin', 'dashboard');
  }, []);

  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics">("dashboard");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSetChallengeDialogOpen, setIsSetChallengeDialogOpen] = useState(false);
  const [isResetTomorrowDialogOpen, setIsResetTomorrowDialogOpen] = useState(false);
  const [startActorSearch, setStartActorSearch] = useState("");
  const [endActorSearch, setEndActorSearch] = useState("");
  const [selectedStartActor, setSelectedStartActor] = useState<{ id: string, name: string, profile_path?: string | null } | null>(null);
  const [selectedEndActor, setSelectedEndActor] = useState<{ id: string, name: string, profile_path?: string | null } | null>(null);
  interface ActorResult {
    id: number;
    name: string;
    profile_path: string | null;
  }

  const [startActorResults, setStartActorResults] = useState<ActorResult[]>([]);
  const [endActorResults, setEndActorResults] = useState<ActorResult[]>([]);


  const { toast } = useToast();
  const token = useAdminAuth();

  const { data: challenge, isLoading: challengeLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
    enabled: !!token,
  });

  const { data: nextChallenge, isLoading: nextChallengeLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/admin/next-challenge"],
    enabled: !!token,
    queryFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token');

      const response = await fetch("/api/admin/next-challenge", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 404) return null; // No next challenge exists
        throw new Error('Failed to fetch next challenge');
      }

      return response.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const response = await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Logout failed');
        }
      }
    },
    onSettled: () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminTokenExpiry');
      setLocation("/admin-login");
    },
  });

  const resetChallengeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch("/api/admin/reset-challenge", {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Reset failed');
      }

      return await response.json();
    },
    onSuccess: () => {
      setIsResetDialogOpen(false);
      // Invalidate both current and next challenge queries to force UI refresh
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/next-challenge"] });
      toast({
        title: "Challenge reset",
        description: "Daily challenge has been reset successfully",
      });
    },
    onError: (error: any) => {
      setIsResetDialogOpen(false);
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset challenge",
        variant: "destructive",
      });
    },
  });

  const setChallengeActorsMutation = useMutation({
    mutationFn: async ({ startActorId, startActorName, endActorId, endActorName }: {
      startActorId: string;
      startActorName: string;
      endActorId: string;
      endActorName: string;
    }) => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch("/api/admin/set-challenge", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startActorId,
          startActorName,
          endActorId,
          endActorName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set challenge');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Keep modal open and don't clear selections until user closes dialog manually
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/next-challenge"] });
      toast({
        title: "Next Challenge Set",
        description: "Next daily challenge has been set - will become active tomorrow",
      });
    },
    onError: (error: any) => {
      // Keep modal open on error so user can retry or cancel manually
      toast({
        title: "Update failed",
        description: error.message || "Failed to update challenge",
        variant: "destructive",
      });
    },
  });

  const resetNextChallengeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch("/api/admin/reset-next-challenge", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Reset tomorrow failed');
      }

      return await response.json();
    },
    onSuccess: () => {
      setIsResetTomorrowDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/next-challenge"] });
      toast({
        title: "Next challenge reset",
        description: "Next daily challenge has been reset successfully",
      });
    },
    onError: (error: any) => {
      setIsResetTomorrowDialogOpen(false);
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset tomorrow's challenge",
        variant: "destructive",
      });
    },
  });

  // Actor search functionality - identical for both start and end actors
  const searchActors = async (query: string, type: 'start' | 'end') => {
    if (!query || query.length < 2) {
      if (type === 'start') setStartActorResults([]);
      else setEndActorResults([]);
      return;
    }

    try {
      console.log(`Searching for ${type} actors with query: "${query}"`);
      const response = await fetch(`/api/search/actors?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        console.log(`${type} search results for "${query}":`, results);
        const actorResults = results.slice(0, 5);
        if (type === 'start') {
          setStartActorResults(actorResults);
        } else {
          setEndActorResults(actorResults);
        }
      } else {
        console.error(`Search failed for ${type} with status:`, response.status);
        if (type === 'start') setStartActorResults([]);
        else setEndActorResults([]);
      }
    } catch (error) {
      console.error(`Error searching ${type} actors:`, error);
      if (type === 'start') setStartActorResults([]);
      else setEndActorResults([]);
    }
  };

  // Clear results when search is empty
  useEffect(() => {
    if (!startActorSearch.trim()) {
      setStartActorResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchActors(startActorSearch, 'start');
    }, 500);
    return () => clearTimeout(timer);
  }, [startActorSearch]);

  useEffect(() => {
    if (!endActorSearch.trim()) {
      setEndActorResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchActors(endActorSearch, 'end');
    }, 500);
    return () => clearTimeout(timer);
  }, [endActorSearch]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleResetChallenge = () => {
    resetChallengeMutation.mutate();
  };

  const handleSetChallenge = () => {
    if (selectedStartActor && selectedEndActor) {
      setChallengeActorsMutation.mutate({
        startActorId: selectedStartActor.id,
        startActorName: selectedStartActor.name,
        endActorId: selectedEndActor.id,
        endActorName: selectedEndActor.name,
      });
    }
  };

  if (!token) {
    return null; // Redirecting to login
  }

  return (
    <div className="min-h-screen bg-deco-charcoal text-deco-cream p-4 dark">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-deco-gold" />
            <div>
              <h1 className="text-3xl font-bold text-deco-gold">Admin Panel</h1>
              <p className="text-deco-cream/60">Six Degrees Game Management</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 border-deco-gold/30 text-deco-gold hover:bg-deco-gold/10">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Quick Navigation */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardHeader>
            <CardTitle className="text-deco-gold">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/")} variant="outline" className="border-deco-gold/30 text-deco-gold hover:bg-deco-gold/10">
                <Users className="h-4 w-4 mr-2" />
                Game View
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Challenge Card */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-deco-gold">
              <Calendar className="h-5 w-5" />
              Current Daily Challenge (Active)
            </CardTitle>
            <CardDescription className="text-deco-cream/60">
              Today's actor pairing and usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {challengeLoading ? (
              <div className="flex items-center justify-center py-8 text-deco-gold">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading challenge...</span>
              </div>
            ) : challenge ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/30 rounded-lg border border-deco-gold/20">
                    <h3 className="font-semibold text-deco-gold">Start Actor</h3>
                    <p className="text-lg font-medium text-deco-cream">{challenge.startActorName}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-deco-gold/20">
                    <h3 className="font-semibold text-deco-gold">End Actor</h3>
                    <p className="text-lg font-medium text-deco-cream">{challenge.endActorName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-deco-gold/20 text-deco-gold">
                    Hints Used: {challenge.hintsUsed}/2
                  </Badge>
                  <Badge variant="outline" className="border-deco-gold/30 text-deco-cream/60">
                    Date: {challenge.date}
                  </Badge>
                  <Badge variant="outline" className="border-deco-gold/30 text-deco-cream/60">
                    Created: {new Date(challenge.createdAt).toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No challenge data available</p>
            )}
          </CardContent>
        </Card>

        {/* Next Challenge Card */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-deco-gold">
              <Calendar className="h-5 w-5" />
              Next Daily Challenge
            </CardTitle>
            <CardDescription className="text-deco-cream/60">
              Preview of next actor pairing (24 hours in advance - becomes current at midnight)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextChallengeLoading ? (
              <div className="flex items-center justify-center py-8 text-deco-gold">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading next challenge...</span>
              </div>
            ) : nextChallenge ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/30 rounded-lg border border-deco-gold/20">
                    <h3 className="font-semibold text-deco-gold">Start Actor</h3>
                    <p className="text-lg font-medium text-deco-cream">{nextChallenge.startActorName}</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-lg border border-deco-gold/20">
                    <h3 className="font-semibold text-deco-gold">End Actor</h3>
                    <p className="text-lg font-medium text-deco-cream">{nextChallenge.endActorName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-deco-gold/10 text-deco-gold/80">
                    Status: Next
                  </Badge>
                  <Badge variant="outline" className="border-deco-gold/30 text-deco-cream/60">
                    Date: {nextChallenge.date}
                  </Badge>
                  <Badge variant="outline" className="border-deco-gold/30 text-deco-cream/60">
                    Created: {new Date(nextChallenge.createdAt).toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-deco-gold/20 rounded-lg bg-black/30">
                <p className="text-deco-gold/80">
                  No next challenge scheduled. One will be automatically generated.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Diagnostics */}
        <DiagnosticsCard />

        {/* Actions Card */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-deco-gold">
              <RefreshCw className="h-5 w-5" />
              Challenge Management
            </CardTitle>
            <CardDescription className="text-deco-cream/60">
              Administrative actions for managing daily challenges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-deco-gold/20 rounded-lg bg-black/30">
                <h3 className="font-semibold mb-2 text-deco-gold">Reset Daily Challenge</h3>
                <p className="text-sm text-deco-cream/60 mb-3">
                  This will delete the current challenge and generate a new one with different actors.
                  All hints will be reset to 0.
                </p>
                <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={resetChallengeMutation.isPending}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${resetChallengeMutation.isPending ? 'animate-spin' : ''}`} />
                      {resetChallengeMutation.isPending ? "Resetting..." : "Reset Challenge"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Daily Challenge</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset today's daily challenge? This will generate new actors.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetChallenge}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reset Challenge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="p-4 border border-deco-gold/20 rounded-lg bg-black/30">
                <h3 className="font-semibold mb-2 text-deco-gold">Reset Next Challenge</h3>
                <p className="text-sm text-deco-cream/60 mb-3">
                  Generate a new challenge for the next daily challenge (24 hours in advance). The current next challenge will be replaced.
                </p>
                <AlertDialog open={isResetTomorrowDialogOpen} onOpenChange={setIsResetTomorrowDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={resetNextChallengeMutation.isPending}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${resetNextChallengeMutation.isPending ? 'animate-spin' : ''}`} />
                      {resetNextChallengeMutation.isPending ? "Resetting..." : "Reset Next"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Next Challenge</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset the next daily challenge? This will generate new actors for the next challenge.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => resetNextChallengeMutation.mutate()}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      >
                        Reset Next
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="p-4 border border-deco-gold/20 rounded-lg bg-black/30">
                <h3 className="font-semibold mb-2 text-deco-gold">Set Custom Next Challenge</h3>
                <p className="text-sm text-deco-cream/60 mb-3">
                  Manually select two specific actors for tomorrow's challenge.
                  This will override the automatic generation and become active at midnight.
                </p>

                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Actor Search */}
                    <div className="space-y-2">
                      <Label htmlFor="start-actor" className="text-deco-gold">Start Actor</Label>
                      <div className="relative">
                        <Input
                          id="start-actor"
                          placeholder="Search for start actor..."
                          value={startActorSearch}
                          onChange={(e) => setStartActorSearch(e.target.value)}
                          className="pr-8 bg-black/50 border-deco-gold/30 text-deco-cream placeholder-deco-cream/30 focus:border-deco-gold"
                        />
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-deco-gold/50" />
                      </div>
                      {selectedStartActor && (
                        <div className="p-2 bg-deco-gold/10 border-deco-gold/20 rounded border flex items-center space-x-3">
                          {selectedStartActor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${selectedStartActor.profile_path}`}
                              alt={selectedStartActor.name}
                              className="w-8 h-8 rounded-full object-cover border border-deco-gold/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-deco-gold/20 flex items-center justify-center border border-deco-gold/30">
                              <span className="text-xs font-medium text-deco-gold">
                                {selectedStartActor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-deco-gold">{selectedStartActor.name}</span>
                        </div>
                      )}
                      {startActorResults.length > 0 && !selectedStartActor && startActorSearch.length >= 2 && (
                        <div className="max-h-32 overflow-y-auto border border-deco-gold/20 rounded bg-black/95 shadow-lg z-10">
                          {startActorResults.map((actor) => (
                            <button
                              key={actor.id}
                              onClick={() => {
                                setSelectedStartActor({ id: actor.id.toString(), name: actor.name, profile_path: actor.profile_path });
                                setStartActorSearch("");
                                setStartActorResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-deco-gold/10 text-sm flex items-center space-x-3 text-deco-cream transition-colors"
                            >
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-8 h-8 rounded-full object-cover border border-deco-gold/30"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-deco-gold/10 flex items-center justify-center border border-deco-gold/20">
                                  <span className="text-xs font-medium text-deco-gold">
                                    {actor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <span>{actor.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* End Actor Search */}
                    <div className="space-y-2">
                      <Label htmlFor="end-actor" className="text-deco-gold">End Actor</Label>
                      <div className="relative">
                        <Input
                          id="end-actor"
                          placeholder="Search for end actor..."
                          value={endActorSearch}
                          onChange={(e) => setEndActorSearch(e.target.value)}
                          className="pr-8 bg-black/50 border-deco-gold/30 text-deco-cream placeholder-deco-cream/30 focus:border-deco-gold"
                        />
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-deco-gold/50" />
                      </div>
                      {selectedEndActor && (
                        <div className="p-2 bg-deco-gold/10 border-deco-gold/20 rounded border flex items-center space-x-3">
                          {selectedEndActor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${selectedEndActor.profile_path}`}
                              alt={selectedEndActor.name}
                              className="w-8 h-8 rounded-full object-cover border border-deco-gold/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-deco-gold/20 flex items-center justify-center border border-deco-gold/30">
                              <span className="text-xs font-medium text-deco-gold">
                                {selectedEndActor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-deco-gold">{selectedEndActor.name}</span>
                        </div>
                      )}
                      {endActorResults.length > 0 && !selectedEndActor && endActorSearch.length >= 2 && (
                        <div className="max-h-32 overflow-y-auto border border-deco-gold/20 rounded bg-black/95 shadow-lg z-10">
                          {endActorResults.map((actor) => (
                            <button
                              key={actor.id}
                              onClick={() => {
                                setSelectedEndActor({ id: actor.id.toString(), name: actor.name, profile_path: actor.profile_path });
                                setEndActorSearch("");
                                setEndActorResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-deco-gold/10 text-sm flex items-center space-x-3 text-deco-cream transition-colors"
                            >
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-8 h-8 rounded-full object-cover border border-deco-gold/30"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-deco-gold/10 flex items-center justify-center border border-deco-gold/20">
                                  <span className="text-xs font-medium text-deco-gold">
                                    {actor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <span>{actor.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog open={isSetChallengeDialogOpen} onOpenChange={(open) => {
                  setIsSetChallengeDialogOpen(open);
                  // Clear selections when dialog is manually closed
                  if (!open) {
                    setSelectedStartActor(null);
                    setSelectedEndActor(null);
                    setStartActorSearch("");
                    setEndActorSearch("");
                  }
                }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={setChallengeActorsMutation.isPending || !selectedStartActor || !selectedEndActor}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className={`h-4 w-4 ${setChallengeActorsMutation.isPending ? 'animate-spin' : ''}`} />
                      {setChallengeActorsMutation.isPending ? "Setting..." : "Set Next Challenge"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Set Custom Next Challenge</AlertDialogTitle>
                      <AlertDialogDescription>
                        Set tomorrow's challenge to {selectedStartActor?.name} → {selectedEndActor?.name}? This will become active at midnight.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-black dark:text-black">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSetChallenge}>
                        Set Next Challenge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Dashboard */}
        {challenge && (
          <AnalyticsDashboard
            challengeId={challenge.id}
            challengeName={`${challenge.startActorName} → ${challenge.endActorName}`}
          />
        )}

        {/* Referral Analytics Dashboard */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-deco-gold">
              <BarChart3 className="h-5 w-5" />
              Traffic Sources & Google Referral Analysis
            </CardTitle>
            <CardDescription className="text-deco-cream/60">
              Understanding your 692 Google referrals and comprehensive traffic analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReferralAnalyticsDashboard />
          </CardContent>
        </Card>

        {/* Contact Submissions */}
        <Card className="bg-black/40 border-deco-gold/20 text-deco-cream">
          <CardContent className="p-6">
            <ContactSubmissions />
          </CardContent>
        </Card>
        {/* User List */}
        <UserList />
      </div>
    </div>
  );
}