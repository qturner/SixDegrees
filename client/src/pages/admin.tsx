import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, RefreshCw, LogOut, Users, Calendar } from "lucide-react";

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
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
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
        await apiRequest("POST", "/api/admin/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      const response = await apiRequest("DELETE", "/api/admin/reset-challenge", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleResetChallenge = () => {
    resetChallengeMutation.mutate();
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
      </div>
    </div>
  );
}