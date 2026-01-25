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
    <header className="bg-deco-charcoal border-b border-deco-gold/30 relative overflow-hidden" role="banner">
      {/* Auth UI - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        {user ? (
          <UserMenu />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-deco-gold/50 text-deco-gold hover:bg-deco-gold/10 hover:text-deco-champagne transition-colors"
            onClick={() => setIsAuthModalOpen(true)}
            data-testid="button-signin"
          >
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        )}
      </div>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />

      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 art-deco-chevron opacity-30 pointer-events-none" />

      {/* Gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-deco-gold to-transparent" />

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 relative z-10">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center justify-center mb-3">
              {/* Art Deco Film Reel Logo - Gold Theme */}
              <svg width="60" height="48" viewBox="0 0 56 44" xmlns="http://www.w3.org/2000/svg" className="mr-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <linearGradient id="reelFaceGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F4C979" />
                    <stop offset="25%" stopColor="#C49731" />
                    <stop offset="75%" stopColor="#5A4632" />
                    <stop offset="100%" stopColor="#2a2010" />
                  </linearGradient>
                  <linearGradient id="reelEdgeGold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5A4632" />
                    <stop offset="50%" stopColor="#C49731" />
                    <stop offset="100%" stopColor="#5A4632" />
                  </linearGradient>
                  <linearGradient id="filmStripGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C49731" />
                    <stop offset="50%" stopColor="#5A4632" />
                    <stop offset="100%" stopColor="#2a2010" />
                  </linearGradient>
                  <linearGradient id="hubGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F4C979" />
                    <stop offset="50%" stopColor="#C49731" />
                    <stop offset="100%" stopColor="#5A4632" />
                  </linearGradient>
                  <filter id="reelGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#C49731" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Film strip unrolling */}
                <path
                  d="M32 22 Q40 24 46 30 Q52 36 56 42"
                  fill="none"
                  stroke="url(#filmStripGold)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M32 20 Q40 22 46 28 Q52 34 56 40"
                  fill="none"
                  stroke="#F4C979"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <circle cx="38" cy="25" r="1" fill="#FFF1D1" />
                <circle cx="44" cy="30" r="1" fill="#FFF1D1" />
                <circle cx="50" cy="36" r="1" fill="#FFF1D1" />

                {/* 3D reel edge */}
                <ellipse cx="20" cy="24" rx="18" ry="4" fill="url(#reelEdgeGold)" />

                {/* Main reel face */}
                <circle cx="20" cy="22" r="18" fill="url(#reelFaceGold)" filter="url(#reelGlow)" />

                {/* Outer rim highlight */}
                <circle cx="20" cy="22" r="17" fill="none" stroke="#F4C979" strokeWidth="1.5" />
                <circle cx="20" cy="22" r="15.5" fill="none" stroke="#C49731" strokeWidth="0.5" />

                {/* 6 holes */}
                <circle cx="20" cy="9" r="3.5" fill="#0B0B0D" />
                <ellipse cx="20" cy="9.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                <circle cx="29" cy="14" r="3.5" fill="#0B0B0D" />
                <ellipse cx="29" cy="14.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                <circle cx="29" cy="26" r="3.5" fill="#0B0B0D" />
                <ellipse cx="29" cy="26.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                <circle cx="20" cy="31" r="3.5" fill="#0B0B0D" />
                <ellipse cx="20" cy="31.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                <circle cx="11" cy="26" r="3.5" fill="#0B0B0D" />
                <ellipse cx="11" cy="26.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                <circle cx="11" cy="14" r="3.5" fill="#0B0B0D" />
                <ellipse cx="11" cy="14.5" rx="2.5" ry="2" fill="#F4C979" opacity="0.15" />

                {/* Center hub */}
                <circle cx="20" cy="20" r="6" fill="#0B0B0D" />
                <circle cx="20" cy="20" r="5" fill="url(#hubGradGold)" />
                <circle cx="20" cy="20" r="3" fill="#C49731" />
                <circle cx="20" cy="20" r="2" fill="#0B0B0D" />
                <circle cx="18.5" cy="18.5" r="1.5" fill="#FFF1D1" opacity="0.4" />
              </svg>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-deco-gold tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(196,151,49,0.4)' }}>
                Six Degrees
              </h1>
            </div>
            <p className="text-deco-champagne/80 text-sm uppercase tracking-[0.3em] font-light" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>of Separation</p>
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
