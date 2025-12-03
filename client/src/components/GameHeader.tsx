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
              <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="mr-3" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                  <linearGradient id="spotlightBody" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3a3a3a"/>
                    <stop offset="50%" stopColor="#2a2a2a"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </linearGradient>
                  <radialGradient id="lightBeam" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#FFFACD" stopOpacity="0.9"/>
                    <stop offset="40%" stopColor="#FFD700" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#B8860B" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="lensGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFFEF0"/>
                    <stop offset="60%" stopColor="#FFD700"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </radialGradient>
                  <filter id="spotlightShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="1.5" stdDeviation="1.5" floodOpacity="0.4"/>
                  </filter>
                  <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Light beam cone */}
                <path 
                  d="M24 18 L8 44 L40 44 Z" 
                  fill="url(#lightBeam)" 
                  opacity="0.7"
                />
                
                {/* Spotlight housing */}
                <ellipse cx="24" cy="14" rx="14" ry="10" fill="url(#spotlightBody)" filter="url(#spotlightShadow)"/>
                
                {/* Housing rim highlight */}
                <ellipse cx="24" cy="14" rx="13.5" ry="9.5" fill="none" stroke="#555" strokeWidth="0.5" opacity="0.5"/>
                
                {/* Lens ring */}
                <circle cx="24" cy="16" r="8" fill="#333" filter="url(#spotlightShadow)"/>
                <circle cx="24" cy="16" r="7" fill="url(#goldGrad)"/>
                
                {/* Inner lens with glow */}
                <circle cx="24" cy="16" r="5" fill="url(#lensGlow)" filter="url(#glowFilter)"/>
                
                {/* Lens reflection highlights */}
                <circle cx="22" cy="14" r="1.5" fill="#FFFEF0" opacity="0.6"/>
                <circle cx="26" cy="18" r="0.8" fill="#FFFEF0" opacity="0.4"/>
                
                {/* Mount bracket */}
                <rect x="22" y="4" width="4" height="4" rx="1" fill="#333"/>
                <circle cx="24" cy="5" r="1.5" fill="url(#goldGrad)"/>
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
