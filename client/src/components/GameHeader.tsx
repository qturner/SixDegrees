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
              <svg width="56" height="48" viewBox="0 0 56 48" xmlns="http://www.w3.org/2000/svg" className="mr-3" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                </defs>
                
                {/* Film strip trailing from reel */}
                <path 
                  d="M28 28 Q35 32 42 38 Q48 42 54 44" 
                  fill="none" 
                  stroke="#1a1a1a" 
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Sprocket holes on trailing film */}
                <circle cx="36" cy="32" r="1" fill="#F5F5DC"/>
                <circle cx="42" cy="37" r="1" fill="#F5F5DC"/>
                <circle cx="48" cy="41" r="1" fill="#F5F5DC"/>
                
                {/* Main reel body */}
                <circle cx="20" cy="22" r="20" fill="#1a1a1a"/>
                
                {/* 5 oval cutouts arranged in pentagon pattern */}
                <ellipse cx="20" cy="9" rx="4" ry="3.5" fill="#F5F5DC"/>
                <ellipse cx="30" cy="16" rx="4" ry="3.5" fill="#F5F5DC"/>
                <ellipse cx="27" cy="30" rx="4" ry="3.5" fill="#F5F5DC"/>
                <ellipse cx="13" cy="30" rx="4" ry="3.5" fill="#F5F5DC"/>
                <ellipse cx="10" cy="16" rx="4" ry="3.5" fill="#F5F5DC"/>
                
                {/* Center hub with gold accent */}
                <circle cx="20" cy="22" r="5" fill="url(#goldGrad)" stroke="#8B6914" strokeWidth="1"/>
                <circle cx="20" cy="22" r="2" fill="#1a1a1a"/>
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
