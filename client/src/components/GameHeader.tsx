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
                  <linearGradient id="reelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C0C0C0"/>
                    <stop offset="30%" stopColor="#E8E8E8"/>
                    <stop offset="50%" stopColor="#A0A0A0"/>
                    <stop offset="70%" stopColor="#D0D0D0"/>
                    <stop offset="100%" stopColor="#808080"/>
                  </linearGradient>
                  <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#B8860B"/>
                  </linearGradient>
                </defs>
                
                {/* Outer reel ring */}
                <circle cx="24" cy="24" r="22" fill="url(#reelGradient)" stroke="#606060" strokeWidth="1"/>
                
                {/* Film strip ring (black) */}
                <circle cx="24" cy="24" r="18" fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>
                
                {/* Sprocket holes around the film */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <rect
                    key={i}
                    x="22"
                    y="5"
                    width="4"
                    height="3"
                    rx="0.5"
                    fill="#F8F8FF"
                    transform={`rotate(${angle} 24 24)`}
                  />
                ))}
                
                {/* Inner metallic ring */}
                <circle cx="24" cy="24" r="12" fill="url(#reelGradient)" stroke="#707070" strokeWidth="0.5"/>
                
                {/* Reel spokes */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <line
                    key={i}
                    x1="24"
                    y1="24"
                    x2="24"
                    y2="13"
                    stroke="#505050"
                    strokeWidth="2"
                    transform={`rotate(${angle} 24 24)`}
                  />
                ))}
                
                {/* Center hub */}
                <circle cx="24" cy="24" r="6" fill="url(#goldAccent)" stroke="#8B6914" strokeWidth="1"/>
                <circle cx="24" cy="24" r="3" fill="#1a1a1a"/>
                <circle cx="24" cy="24" r="1.5" fill="url(#goldAccent)"/>
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
