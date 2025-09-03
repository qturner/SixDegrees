import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { 
  User, 
  UserStats,
  RegisterType, 
  LoginType,
} from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  userStats: UserStats | null;
  isLoading: boolean;
  isStatsLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginType>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterType>;
  recordCompletion: (data: { challengeId: string; moves: number; connections: string }) => Promise<void>;
  recentChallenges: { challenge: any; completed: boolean; moves?: number }[] | undefined;
  moveDistribution: { moves: number; count: number }[] | undefined;
  refetchUser: () => void;
  refetchStats: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/me");
        return await response.json();
      } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return null;
        }
        throw error;
      }
    },
  });

  const {
    data: userStats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery<UserStats | null, Error>({
    queryKey: ["/api/user/stats"],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiRequest("GET", "/api/user/stats");
        return await response.json();
      } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!user,
  });

  const { data: recentChallenges } = useQuery({
    queryKey: ["/api/user/recent-challenges"],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequest("GET", "/api/user/recent-challenges");
        return await response.json();
      } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user,
  });

  const { data: moveDistribution } = useQuery({
    queryKey: ["/api/user/move-distribution"],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequest("GET", "/api/user/move-distribution");
        return await response.json();
      } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginType) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user/me"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/recent-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/move-distribution"] });
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${user.firstName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterType) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user/me"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({
        title: "Welcome!",
        description: `Account created successfully. Welcome ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/user/stats"] });
      queryClient.removeQueries({ queryKey: ["/api/user/recent-challenges"] });
      queryClient.removeQueries({ queryKey: ["/api/user/move-distribution"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recordCompletion = async (data: { challengeId: string; moves: number; connections: string }) => {
    try {
      await apiRequest("POST", "/api/user-challenge-completion", data);
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/recent-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/move-distribution"] });
    } catch (error) {
      console.error("Failed to record completion:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        userStats: userStats || null,
        isLoading,
        isStatsLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        recordCompletion,
        recentChallenges,
        moveDistribution,
        refetchUser,
        refetchStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}