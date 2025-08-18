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
    <header className="bg-game-surface shadow-sm border-b border-game-accent text-game-text">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="flex items-center justify-center mb-2">
              <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className="mr-3">
                <defs>
                  {/* Hollywood Glamour Gold Gradients */}
                  <radialGradient id="nodeGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#B8860B"/>
                    <stop offset="50%" stopColor="#DAA520"/>
                    <stop offset="100%" stopColor="#8B6F00"/>
                  </radialGradient>
                  <radialGradient id="centerGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#B8860B"/>
                    <stop offset="100%" stopColor="#8B6F00"/>
                  </radialGradient>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B8860B"/>
                    <stop offset="100%" stopColor="#8B6F00"/>
                  </linearGradient>
                  {/* Drop shadow filter */}
                  <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0D0D0D" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                {/* Shadow layer for depth */}
                <g opacity="0.3" transform="translate(2,3)">
                  <line x1="30" y1="8" x2="45" y2="18" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="18" x2="45" y2="32" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="32" x2="30" y2="42" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="30" y1="42" x2="15" y2="32" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="32" x2="15" y2="18" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="18" x2="30" y2="8" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
                  <circle cx="30" cy="8" r="6" fill="#0D0D0D"/>
                  <circle cx="45" cy="18" r="6" fill="#0D0D0D"/>
                  <circle cx="45" cy="32" r="6" fill="#0D0D0D"/>
                  <circle cx="30" cy="42" r="6" fill="#0D0D0D"/>
                  <circle cx="15" cy="32" r="6" fill="#0D0D0D"/>
                  <circle cx="15" cy="18" r="6" fill="#0D0D0D"/>
                  <circle cx="30" cy="25" r="4" fill="#0D0D0D"/>
                </g>

                {/* Main hexagonal network */}
                <g filter="url(#dropShadow)">
                  {/* Hexagonal network connections */}
                  <line x1="30" y1="8" x2="45" y2="18" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="18" x2="45" y2="32" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="32" x2="30" y2="42" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="30" y1="42" x2="15" y2="32" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="32" x2="15" y2="18" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="18" x2="30" y2="8" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  {/* Internal connections to center */}
                  <line x1="30" y1="8" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="18" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="32" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="30" y1="42" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="32" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="18" x2="30" y2="25" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round"/>
                  
                  {/* Hexagonal nodes with 3D effect */}
                  <circle cx="30" cy="8" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="45" cy="18" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="45" cy="32" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="30" cy="42" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="15" cy="32" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="15" cy="18" r="6" fill="#F8F8FF" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  
                  {/* Center node with enhanced 3D effect */}
                  <circle cx="30" cy="25" r="5" fill="url(#centerGradient)"/>
                  <circle cx="28" cy="23" r="1.5" fill="#FFD700" opacity="0.9"/>
                </g>
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
