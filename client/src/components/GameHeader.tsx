import { useState } from "react";
import { HelpCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyChallenge, ValidationResult } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { AuthModal } from "@/components/AuthModal";

interface GameHeaderProps {
  challenge: DailyChallenge;
  currentMoves: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  gameResult?: ValidationResult | null;
}

export default function GameHeader({ challenge, currentMoves, isFlipped = false, onFlip, canFlip = true, gameResult }: GameHeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loginMutation } = useAuth();

  const displayChallenge = isFlipped ? {
    ...challenge,
    startActorName: challenge.endActorName,
    startActorProfilePath: challenge.endActorProfilePath,
    endActorName: challenge.startActorName,
    endActorProfilePath: challenge.startActorProfilePath,
  } : challenge;

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getGameStatus = () => {
    if (gameResult?.valid && gameResult?.completed) return "Complete";
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-deco-gold";
    if (status === "Complete") return "text-game-success";
    if (status === "Game Over") return "text-game-error";
    return "text-deco-gold-light";
  };

  const scrollToHowToPlay = () => {
    const element = document.getElementById('how-to-play');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="bg-transparent border-b border-deco-gold/10 relative overflow-hidden z-10" role="banner">
      <div className="absolute inset-0 art-deco-chevron opacity-30 pointer-events-none" />

      {/* Gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-deco-gold to-transparent" />

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 relative z-10">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center justify-center mb-1">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-[0.2em] uppercase animate-pulse-slow"
                style={{
                  textShadow: '0 0 10px rgba(34,211,238,0.8), 0 0 20px rgba(34,211,238,0.4), 0 0 30px rgba(168,85,247,0.4)',
                  filter: 'drop-shadow(0 0 15px rgba(34,211,238,0.6))'
                }}>
                Six Degrees
              </h1>
            </div>
            <p className="text-deco-gold text-sm uppercase tracking-[0.4em] font-medium">of Separation</p>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-deco-gold/50" />
            <div className="w-2 h-2 rotate-45 bg-deco-gold/50" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-deco-gold/50" />
          </div>

          <p className="text-deco-cream/70 text-base sm:text-lg font-light tracking-wide">
            Connect two actors through movies in 6 moves or less
          </p>

          <Button
            onClick={scrollToHowToPlay}
            variant="ghost"
            size="sm"
            className="mt-4 text-deco-gold/80 hover:text-deco-gold hover:bg-deco-gold/10 border border-deco-gold/30 hover:border-deco-gold/50 transition-all duration-300 uppercase tracking-wider text-xs font-medium"
            data-testid="button-how-to-play"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How to Play
          </Button>
        </div>
      </div>

      {/* Gold accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-deco-gold/50 to-transparent" />
    </header>
  );
}
