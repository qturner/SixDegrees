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
              <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg" className="mr-3" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                  <linearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#B8860B"/>
                    <stop offset="30%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#FFFACD"/>
                    <stop offset="70%" stopColor="#FFD700"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                  <linearGradient id="baseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#8B6914"/>
                  </linearGradient>
                  <filter id="statuetteShadow" x="-20%" y="-10%" width="140%" height="120%">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3"/>
                  </filter>
                </defs>
                
                {/* Base/pedestal */}
                <rect x="10" y="42" width="16" height="4" rx="1" fill="url(#baseGrad)" filter="url(#statuetteShadow)"/>
                <rect x="12" y="38" width="12" height="5" rx="0.5" fill="url(#goldGrad)"/>
                
                {/* Legs */}
                <path d="M15 38 L14 32 L16 32 L16.5 38 Z" fill="url(#goldShine)"/>
                <path d="M21 38 L22 32 L20 32 L19.5 38 Z" fill="url(#goldShine)"/>
                
                {/* Body/torso */}
                <path d="M14 32 L13 22 Q13 20 15 19 L15 18 L21 18 L21 19 Q23 20 23 22 L22 32 Z" fill="url(#goldShine)" filter="url(#statuetteShadow)"/>
                
                {/* Arms holding sword/reel */}
                <ellipse cx="11" cy="22" rx="2.5" ry="1.5" fill="url(#goldGrad)" transform="rotate(-20, 11, 22)"/>
                <ellipse cx="25" cy="22" rx="2.5" ry="1.5" fill="url(#goldGrad)" transform="rotate(20, 25, 22)"/>
                
                {/* Sword/crusader element held in front */}
                <rect x="17" y="14" width="2" height="12" fill="url(#goldGrad)"/>
                <rect x="14" y="16" width="8" height="2" rx="0.5" fill="url(#goldGrad)"/>
                
                {/* Head */}
                <circle cx="18" cy="10" r="5" fill="url(#goldShine)" filter="url(#statuetteShadow)"/>
                
                {/* Subtle face indication */}
                <ellipse cx="18" cy="11" rx="3" ry="2" fill="url(#goldGrad)" opacity="0.3"/>
                
                {/* Highlight on head */}
                <circle cx="16.5" cy="8.5" r="1.5" fill="#FFFACD" opacity="0.4"/>
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
