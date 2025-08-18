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
    <header className="bg-game-surface shadow-lg border-b-2 border-game-primary text-game-text relative overflow-hidden">
      {/* Background pattern for elegance */}
      <div className="absolute inset-0 bg-gradient-to-r from-game-surface via-game-surface to-game-surface opacity-90"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-game-primary to-transparent"></div>
      
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="flex items-center justify-center mb-4 group">
              <div className="relative">
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className="mr-4 transform group-hover:scale-105 transition-transform duration-300">
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
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-game-primary opacity-20 rounded-full blur-xl scale-75 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              <div className="text-left">
                <h1 className="text-4xl sm:text-5xl font-bold text-game-primary whitespace-nowrap tracking-wide mb-2 relative">
                  Six Degrees of Separation
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-game-primary via-transparent to-game-primary opacity-60"></div>
                </h1>
              </div>
            </div>
            
            {/* Enhanced tagline */}
            <div className="relative">
              <p className="text-xl text-game-accent font-light tracking-wide leading-relaxed">
                Connect two actors through movies in 
                <span className="text-game-primary font-medium mx-2">6 moves or less</span>
              </p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-game-accent to-transparent"></div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="flex justify-center space-x-8 mt-4 opacity-60">
            <div className="w-2 h-2 bg-game-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-game-accent rounded-full animate-pulse delay-300"></div>
            <div className="w-2 h-2 bg-game-primary rounded-full animate-pulse delay-700"></div>
          </div>
        </div>
      </div>


    </header>
  );
}
