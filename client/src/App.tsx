import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";
import AdminLogin from "@/pages/admin-login";
import AdminPanel from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Track visitor analytics
  useVisitorTracking();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
