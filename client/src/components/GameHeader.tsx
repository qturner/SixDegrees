import { Calendar, ArrowRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyChallenge, ValidationResult } from "@shared/schema";

interface GameHeaderProps {
  challenge: DailyChallenge;
  currentMoves: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  gameResult?: ValidationResult | null;
}

export default function GameHeader({ challenge, currentMoves, isFlipped = false, onFlip, canFlip = true, gameResult }: GameHeaderProps) {
  // Get the effective actors to display based on flip state
  const displayChallenge = isFlipped ? {
    ...challenge,
    startActorName: challenge.endActorName,
    startActorProfilePath: challenge.endActorProfilePath,
    endActorName: challenge.startActorName,
    endActorProfilePath: challenge.startActorProfilePath,
  } : challenge;
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric"
    });
  };

  const getGameStatus = () => {
    // Check if game has been successfully completed
    if (gameResult?.valid && gameResult?.completed) return "Complete";
    
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-game-blue";
    if (status === "Complete") return "text-game-success";
    if (status === "Game Over") return "text-game-error";
    return "text-game-warning";
  };

  return (
    <header className="bg-game-surface shadow-sm border-b border-game-accent text-game-text" role="banner">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="flex items-center justify-center mb-2">
              <svg width="52" height="44" viewBox="0 0 52 44" xmlns="http://www.w3.org/2000/svg" className="mr-3" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                  <linearGradient id="clapperBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2a2a2a"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </linearGradient>
                  <linearGradient id="clapperTop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3a3a3a"/>
                    <stop offset="100%" stopColor="#252525"/>
                  </linearGradient>
                  <filter id="clapperShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                {/* Clapperboard body */}
                <rect x="4" y="14" width="44" height="28" rx="2" fill="url(#clapperBody)" filter="url(#clapperShadow)"/>
                
                {/* White stripes on clapperboard */}
                <rect x="6" y="16" width="40" height="3" fill="#F5F5DC" opacity="0.9"/>
                <rect x="6" y="21" width="40" height="1.5" fill="#F5F5DC" opacity="0.6"/>
                <rect x="6" y="24" width="40" height="1.5" fill="#F5F5DC" opacity="0.6"/>
                
                {/* Clapper stick (top part that moves) */}
                <g transform="rotate(-12, 4, 14)">
                  <rect x="4" y="6" width="44" height="8" rx="1" fill="url(#clapperTop)"/>
                  {/* Diagonal stripes on clapper stick */}
                  <rect x="6" y="7" width="5" height="6" fill="#F5F5DC"/>
                  <rect x="14" y="7" width="5" height="6" fill="#F5F5DC"/>
                  <rect x="22" y="7" width="5" height="6" fill="#F5F5DC"/>
                  <rect x="30" y="7" width="5" height="6" fill="#F5F5DC"/>
                  <rect x="38" y="7" width="5" height="6" fill="#F5F5DC"/>
                </g>
                
                {/* Golden "6" prominently displayed */}
                <text 
                  x="26" 
                  y="37" 
                  fontFamily="Georgia, serif" 
                  fontSize="16" 
                  fontWeight="bold" 
                  fill="url(#goldGrad)" 
                  textAnchor="middle"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >6</text>
                
                {/* Pivot hinge */}
                <circle cx="6" cy="14" r="3" fill="#333"/>
                <circle cx="6" cy="14" r="2" fill="url(#goldGrad)"/>
                <circle cx="5.5" cy="13.5" r="0.6" fill="#FFF5CC" opacity="0.4"/>
              </svg>
              <h1 className="text-heading-lg text-game-primary whitespace-nowrap">Six Degrees of Separation</h1>
            </div>
          </div>
          <p className="text-game-accent text-body-lg">Connect two actors through movies in 6 moves or less</p>
        </div>
      </div>


    </header>
  );
}
