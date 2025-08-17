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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, RefreshCw, LogOut, Users, Calendar, Search, UserPlus, BarChart3 } from "lucide-react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ContactSubmissions from "@/components/ContactSubmissions";

interface DailyChallenge {
  date: string;
  startActorName: string;
  endActorName: string;
  hintsUsed: number;
  id: string;
  createdAt: string;
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

export default function AdminPanel() {
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics">("dashboard");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSetChallengeDialogOpen, setIsSetChallengeDialogOpen] = useState(false);
  const [startActorSearch, setStartActorSearch] = useState("");
  const [endActorSearch, setEndActorSearch] = useState("");
  const [selectedStartActor, setSelectedStartActor] = useState<{id: string, name: string, profile_path?: string | null} | null>(null);
  const [selectedEndActor, setSelectedEndActor] = useState<{id: string, name: string, profile_path?: string | null} | null>(null);
  interface ActorResult {
    id: number;
    name: string;
    profile_path: string | null;
  }
  
  const [startActorResults, setStartActorResults] = useState<ActorResult[]>([]);
  const [endActorResults, setEndActorResults] = useState<ActorResult[]>([]);
  
  // Auto-dismiss only the set challenge dialog after 1 second
  // Reset dialog remains open until user action
  
  useEffect(() => {
    if (isSetChallengeDialogOpen) {
      const timer = setTimeout(() => {
        setIsSetChallengeDialogOpen(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isSetChallengeDialogOpen]);
  const { toast } = useToast();
  const token = useAdminAuth();

  const { data: challenge, isLoading: challengeLoading } = useQuery<DailyChallenge>({
    queryKey: ["/api/daily-challenge"],
    enabled: !!token,
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
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
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
      setIsSetChallengeDialogOpen(false);
      setSelectedStartActor(null);
      setSelectedEndActor(null);
      setStartActorSearch("");
      setEndActorSearch("");
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
      toast({
        title: "Challenge updated",
        description: "Daily challenge actors have been updated successfully",
      });
    },
    onError: (error: any) => {
      setIsSetChallengeDialogOpen(false);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update challenge",
        variant: "destructive",
      });
    },
  });

  // Actor search functionality
  const searchActors = async (query: string, type: 'start' | 'end') => {
    if (!query || query.length < 2) {
      if (type === 'start') setStartActorResults([]);
      else setEndActorResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/actors?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        if (type === 'start') setStartActorResults(results.slice(0, 5));
        else setEndActorResults(results.slice(0, 5));
      }
    } catch (error) {
      console.error('Error searching actors:', error);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchActors(startActorSearch, 'start');
    }, 500);
    return () => clearTimeout(timer);
  }, [startActorSearch]);

  useEffect(() => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-gray-600 dark:text-gray-400">Six Degrees Game Management</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Current Challenge Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Daily Challenge
            </CardTitle>
            <CardDescription>
              Today's actor pairing and usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {challengeLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading challenge...</span>
              </div>
            ) : challenge ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Start Actor</h3>
                    <p className="text-lg font-medium">{challenge.startActorName}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">End Actor</h3>
                    <p className="text-lg font-medium">{challenge.endActorName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    Hints Used: {challenge.hintsUsed}/2
                  </Badge>
                  <Badge variant="outline">
                    Date: {challenge.date}
                  </Badge>
                  <Badge variant="outline">
                    Created: {new Date(challenge.createdAt).toLocaleTimeString()}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No challenge data available</p>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Challenge Management
            </CardTitle>
            <CardDescription>
              Administrative actions for managing daily challenges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Reset Daily Challenge</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Set Custom Challenge</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Manually select two specific actors for today's challenge.
                  All hints will be reset to 0.
                </p>
                
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Actor Search */}
                    <div className="space-y-2">
                      <Label htmlFor="start-actor">Start Actor</Label>
                      <div className="relative">
                        <Input
                          id="start-actor"
                          placeholder="Search for start actor..."
                          value={startActorSearch}
                          onChange={(e) => setStartActorSearch(e.target.value)}
                          className="pr-8"
                        />
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                      {selectedStartActor && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border flex items-center space-x-3">
                          {selectedStartActor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${selectedStartActor.profile_path}`}
                              alt={selectedStartActor.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                                {selectedStartActor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium">{selectedStartActor.name}</span>
                        </div>
                      )}
                      {startActorResults.length > 0 && !selectedStartActor && (
                        <div className="max-h-32 overflow-y-auto border rounded bg-white dark:bg-gray-800 shadow-lg">
                          {startActorResults.map((actor) => (
                            <button
                              key={actor.id}
                              onClick={() => {
                                setSelectedStartActor({id: actor.id.toString(), name: actor.name, profile_path: actor.profile_path});
                                setStartActorSearch("");
                                setStartActorResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center space-x-3"
                            >
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
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
                      <Label htmlFor="end-actor">End Actor</Label>
                      <div className="relative">
                        <Input
                          id="end-actor"
                          placeholder="Search for end actor..."
                          value={endActorSearch}
                          onChange={(e) => setEndActorSearch(e.target.value)}
                          className="pr-8"
                        />
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                      {selectedEndActor && (
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border flex items-center space-x-3">
                          {selectedEndActor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${selectedEndActor.profile_path}`}
                              alt={selectedEndActor.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-700 flex items-center justify-center">
                              <span className="text-xs font-medium text-green-600 dark:text-green-300">
                                {selectedEndActor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium">{selectedEndActor.name}</span>
                        </div>
                      )}
                      {endActorResults.length > 0 && !selectedEndActor && (
                        <div className="max-h-32 overflow-y-auto border rounded bg-white dark:bg-gray-800 shadow-lg">
                          {endActorResults.map((actor) => (
                            <button
                              key={actor.id}
                              onClick={() => {
                                setSelectedEndActor({id: actor.id.toString(), name: actor.name, profile_path: actor.profile_path});
                                setEndActorSearch("");
                                setEndActorResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center space-x-3"
                            >
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
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

                <AlertDialog open={isSetChallengeDialogOpen} onOpenChange={setIsSetChallengeDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={setChallengeActorsMutation.isPending || !selectedStartActor || !selectedEndActor}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className={`h-4 w-4 ${setChallengeActorsMutation.isPending ? 'animate-spin' : ''}`} />
                      {setChallengeActorsMutation.isPending ? "Setting..." : "Set Custom Challenge"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Set Custom Challenge</AlertDialogTitle>
                      <AlertDialogDescription>
                        Set today's challenge to {selectedStartActor?.name} → {selectedEndActor?.name}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSetChallenge}>
                        Set Challenge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/")} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Game View
              </Button>
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

        {/* Contact Submissions */}
        <Card>
          <CardContent className="p-6">
            <ContactSubmissions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}