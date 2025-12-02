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
                  <linearGradient id="reel3d" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3a3a3a"/>
                    <stop offset="30%" stopColor="#2a2a2a"/>
                    <stop offset="70%" stopColor="#1a1a1a"/>
                    <stop offset="100%" stopColor="#0a0a0a"/>
                  </linearGradient>
                  <radialGradient id="reelHighlight" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#4a4a4a"/>
                    <stop offset="50%" stopColor="#2a2a2a"/>
                    <stop offset="100%" stopColor="#0a0a0a"/>
                  </radialGradient>
                  <filter id="reelShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="1" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                {/* Film strip trailing from reel */}
                <path 
                  d="M28 28 Q35 32 42 38 Q48 42 54 44" 
                  fill="none" 
                  stroke="url(#reel3d)" 
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Sprocket holes on trailing film */}
                <circle cx="36" cy="32" r="1" fill="#F5F5DC"/>
                <circle cx="42" cy="37" r="1" fill="#F5F5DC"/>
                <circle cx="48" cy="41" r="1" fill="#F5F5DC"/>
                
                {/* Reel shadow/depth layer */}
                <circle cx="21" cy="23" r="20" fill="#0a0a0a" opacity="0.5"/>
                
                {/* Main reel body with 3D gradient */}
                <circle cx="20" cy="22" r="20" fill="url(#reelHighlight)" filter="url(#reelShadow)"/>
                
                {/* Rim highlight for 3D effect */}
                <circle cx="20" cy="22" r="19" fill="none" stroke="#4a4a4a" strokeWidth="1" opacity="0.6"/>
                <circle cx="20" cy="22" r="20" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
                
                {/* 6 oval cutouts arranged in hexagon pattern */}
                <ellipse cx="20" cy="8" rx="3.5" ry="3" fill="#F5F5DC"/>
                <ellipse cx="30" cy="13" rx="3.5" ry="3" fill="#F5F5DC"/>
                <ellipse cx="30" cy="27" rx="3.5" ry="3" fill="#F5F5DC"/>
                <ellipse cx="20" cy="32" rx="3.5" ry="3" fill="#F5F5DC"/>
                <ellipse cx="10" cy="27" rx="3.5" ry="3" fill="#F5F5DC"/>
                <ellipse cx="10" cy="13" rx="3.5" ry="3" fill="#F5F5DC"/>
                
                {/* Center hub with gold accent and 3D effect */}
                <circle cx="20" cy="22" r="6" fill="#2a2a2a"/>
                <circle cx="20" cy="22" r="5" fill="url(#goldGrad)" stroke="#8B6914" strokeWidth="0.5"/>
                <circle cx="19" cy="21" r="2" fill="#FFE55C" opacity="0.4"/>
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
