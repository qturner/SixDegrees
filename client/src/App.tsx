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
import { useEffect } from "react";

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

  // Initialize Google Analytics
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    
    if (measurementId) {
      // Add Google Analytics script to the head
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script1);

      // Initialize gtag
      const script2 = document.createElement('script');
      script2.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}');
      `;
      document.head.appendChild(script2);

      console.log('Google Analytics initialized with ID:', measurementId);
    } else {
      console.warn('Google Analytics Measurement ID not found in environment variables');
    }
  }, []);

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
