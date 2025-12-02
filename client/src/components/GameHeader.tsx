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
                  <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E8E8E8"/>
                    <stop offset="25%" stopColor="#C0C0C0"/>
                    <stop offset="50%" stopColor="#A8A8A8"/>
                    <stop offset="75%" stopColor="#D0D0D0"/>
                    <stop offset="100%" stopColor="#909090"/>
                  </linearGradient>
                  <linearGradient id="goldCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                </defs>
                
                {/* Outer rim of reel */}
                <circle cx="24" cy="24" r="22" fill="url(#metalGradient)" stroke="#666" strokeWidth="1"/>
                
                {/* Film strip (dark ring with sprocket holes) */}
                <circle cx="24" cy="24" r="19" fill="#1a1a1a" stroke="none"/>
                <circle cx="24" cy="24" r="15" fill="url(#metalGradient)" stroke="none"/>
                
                {/* Sprocket holes on film strip */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                  <rect
                    key={i}
                    x="23"
                    y="3.5"
                    width="2"
                    height="2.5"
                    rx="0.3"
                    fill="#F8F8FF"
                    transform={`rotate(${angle} 24 24)`}
                  />
                ))}
                
                {/* Large circular cutouts (5 holes like classic reel) */}
                <circle cx="24" cy="11" r="3.5" fill="#0D0D0D"/>
                <circle cx="36" cy="19" r="3.5" fill="#0D0D0D"/>
                <circle cx="32" cy="33" r="3.5" fill="#0D0D0D"/>
                <circle cx="16" cy="33" r="3.5" fill="#0D0D0D"/>
                <circle cx="12" cy="19" r="3.5" fill="#0D0D0D"/>
                
                {/* Center hub */}
                <circle cx="24" cy="24" r="5" fill="url(#goldCenter)" stroke="#8B6914" strokeWidth="1"/>
                <circle cx="24" cy="24" r="2" fill="#1a1a1a"/>
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
