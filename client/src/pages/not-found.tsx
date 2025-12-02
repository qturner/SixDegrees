import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function NotFound() {
  usePageMeta({
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist. Return to Six Degrees of Separation to play the daily movie actor connection challenge.",
    noIndex: true,
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-game-background">
      <Card className="w-full max-w-md mx-4 bg-game-surface border-game-accent">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-game-error" />
            <h1 className="text-2xl font-bold text-game-text">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-game-accent">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link href="/">
            <Button className="mt-6 w-full bg-game-primary hover:bg-game-primary/90 text-game-background" data-testid="button-home">
              <Home className="h-4 w-4 mr-2" />
              Return to Game
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
