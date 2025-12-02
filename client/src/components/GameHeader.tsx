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
                  <linearGradient id="filmStrip3d" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3a3a3a"/>
                    <stop offset="50%" stopColor="#1a1a1a"/>
                    <stop offset="100%" stopColor="#0a0a0a"/>
                  </linearGradient>
                  <radialGradient id="reelBody" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#454545"/>
                    <stop offset="40%" stopColor="#2d2d2d"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </radialGradient>
                  <filter id="reelShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1.5" dy="1.5" stdDeviation="1.5" floodOpacity="0.5"/>
                  </filter>
                </defs>
                
                {/* Film strip trailing from reel */}
                <path 
                  d="M30 30 Q38 34 46 40 Q52 44 56 46" 
                  fill="none" 
                  stroke="url(#filmStrip3d)" 
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                {/* Sprocket holes on trailing film */}
                <circle cx="38" cy="34" r="0.8" fill="#F5F5DC"/>
                <circle cx="45" cy="39" r="0.8" fill="#F5F5DC"/>
                <circle cx="51" cy="43" r="0.8" fill="#F5F5DC"/>
                
                {/* Reel shadow for depth */}
                <ellipse cx="22" cy="25" r="20" ry="20" fill="#000" opacity="0.3"/>
                
                {/* Main reel body */}
                <circle cx="20" cy="22" r="20" fill="url(#reelBody)" filter="url(#reelShadow)"/>
                
                {/* Subtle rim highlight */}
                <circle cx="20" cy="22" r="19.5" fill="none" stroke="#555" strokeWidth="0.5" opacity="0.5"/>
                
                {/* 6 circles precisely centered around hub - radius 11 from center (20,22) */}
                <circle cx="20" cy="10" r="3.5" fill="#F5F5DC"/>
                <circle cx="29.5" cy="14.5" r="3.5" fill="#F5F5DC"/>
                <circle cx="29.5" cy="29.5" r="3.5" fill="#F5F5DC"/>
                <circle cx="20" cy="34" r="3.5" fill="#F5F5DC"/>
                <circle cx="10.5" cy="29.5" r="3.5" fill="#F5F5DC"/>
                <circle cx="10.5" cy="14.5" r="3.5" fill="#F5F5DC"/>
                
                {/* Center hub - gold with professional 3D look */}
                <circle cx="20" cy="22" r="5.5" fill="#222"/>
                <circle cx="20" cy="22" r="4.5" fill="url(#goldGrad)"/>
                <circle cx="18.5" cy="20.5" r="1.5" fill="#FFF5CC" opacity="0.35"/>
                <circle cx="20" cy="22" r="1.8" fill="#1a1a1a"/>
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
