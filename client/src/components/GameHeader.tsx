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
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                </defs>
                
                {/* Hexagonal network connections */}
                <g stroke="url(#goldGradient)" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <line x1="24" y1="6" x2="38" y2="14"/>
                  <line x1="38" y1="14" x2="38" y2="30"/>
                  <line x1="38" y1="30" x2="24" y2="38"/>
                  <line x1="24" y1="38" x2="10" y2="30"/>
                  <line x1="10" y1="30" x2="10" y2="14"/>
                  <line x1="10" y1="14" x2="24" y2="6"/>
                  {/* Internal connections to center */}
                  <line x1="24" y1="6" x2="24" y2="22"/>
                  <line x1="38" y1="14" x2="24" y2="22"/>
                  <line x1="38" y1="30" x2="24" y2="22"/>
                  <line x1="24" y1="38" x2="24" y2="22"/>
                  <line x1="10" y1="30" x2="24" y2="22"/>
                  <line x1="10" y1="14" x2="24" y2="22"/>
                </g>
                
                {/* Outer nodes */}
                <circle cx="24" cy="6" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                <circle cx="38" cy="14" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                <circle cx="38" cy="30" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                <circle cx="24" cy="38" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                <circle cx="10" cy="30" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                <circle cx="10" cy="14" r="4" fill="#FFFAF0" stroke="#DAA520" strokeWidth="2"/>
                
                {/* Center node */}
                <circle cx="24" cy="22" r="5" fill="#FFD700" stroke="#B8860B" strokeWidth="2"/>
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
