import { Calendar, ArrowRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyChallenge } from "@shared/schema";

interface GameHeaderProps {
  challenge: DailyChallenge;
  currentMoves: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
}

export default function GameHeader({ challenge, currentMoves, isFlipped = false, onFlip, canFlip = true }: GameHeaderProps) {
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
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-game-blue";
    if (status === "Game Over") return "text-game-error";
    return "text-game-warning";
  };

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="flex items-center justify-center mb-2">
              <svg width="50" height="50" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className="mr-3">
                <defs>
                  {/* 3D Gradients */}
                  <radialGradient id="nodeGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="50%" stopColor="#1e40af"/>
                    <stop offset="100%" stopColor="#1e3a8a"/>
                  </radialGradient>
                  <radialGradient id="centerGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#60a5fa"/>
                    <stop offset="50%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#1e40af"/>
                  </radialGradient>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#1e40af"/>
                  </linearGradient>
                  {/* Drop shadow filter */}
                  <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3"/>
                  </filter>
                </defs>
                
                {/* Shadow layer for depth */}
                <g opacity="0.2" transform="translate(2,3)">
                  <line x1="30" y1="8" x2="45" y2="18" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="18" x2="45" y2="32" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="45" y1="32" x2="30" y2="42" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="30" y1="42" x2="15" y2="32" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="32" x2="15" y2="18" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="15" y1="18" x2="30" y2="8" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                  <circle cx="30" cy="8" r="6" fill="#1e3a8a"/>
                  <circle cx="45" cy="18" r="6" fill="#1e3a8a"/>
                  <circle cx="45" cy="32" r="6" fill="#1e3a8a"/>
                  <circle cx="30" cy="42" r="6" fill="#1e3a8a"/>
                  <circle cx="15" cy="32" r="6" fill="#1e3a8a"/>
                  <circle cx="15" cy="18" r="6" fill="#1e3a8a"/>
                  <circle cx="30" cy="25" r="4" fill="#1e3a8a"/>
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
                  <circle cx="30" cy="8" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="45" cy="18" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="45" cy="32" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="30" cy="42" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="15" cy="32" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  <circle cx="15" cy="18" r="6" fill="white" stroke="url(#nodeGradient)" strokeWidth="4"/>
                  
                  {/* Center node with enhanced 3D effect */}
                  <circle cx="30" cy="25" r="5" fill="url(#centerGradient)"/>
                  <circle cx="28" cy="23" r="1.5" fill="#93c5fd" opacity="0.8"/>
                </g>
              </svg>
              <h1 className="text-heading-lg text-game-primary whitespace-nowrap">Six Degrees of Separation</h1>
            </div>
          </div>
          <p className="text-muted text-body-lg">Connect two actors through movies in 6 moves or less</p>
        </div>
      </div>

      <div className="bg-white card-radius shadow-card hover:shadow-card-hover transition-all duration-300 spacing-lg mb-6 sm:mb-8 max-w-4xl mx-auto -mt-4 mx-4 sm:mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-heading-md text-game-primary mb-4">Today's Challenge</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4">
            <div className="relative bg-game-blue text-white spacing-sm sm:px-6 sm:py-3 button-radius font-medium text-body w-full sm:w-auto transition-all duration-200 hover:shadow-card-hover flex items-center justify-center">
              <div className="absolute left-3 sm:left-6 flex items-center">
                {displayChallenge.startActorProfilePath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w154${displayChallenge.startActorProfilePath}`}
                    alt={displayChallenge.startActorName}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-white flex-shrink-0 transition-all duration-200"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                    <span className="text-lg font-medium text-white">
                      {displayChallenge.startActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <span className="truncate text-center px-20 sm:px-24">{displayChallenge.startActorName}</span>
            </div>
            <div className="text-xl sm:text-2xl text-muted-light rotate-90 sm:rotate-0 transition-transform duration-300">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="relative bg-game-blue text-white spacing-sm sm:px-6 sm:py-3 button-radius font-medium text-body w-full sm:w-auto transition-all duration-200 hover:shadow-card-hover flex items-center justify-center">
              <div className="absolute left-3 sm:left-6 flex items-center">
                {displayChallenge.endActorProfilePath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w154${displayChallenge.endActorProfilePath}`}
                    alt={displayChallenge.endActorName}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-white flex-shrink-0 transition-all duration-200"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                    <span className="text-lg font-medium text-white">
                      {displayChallenge.endActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <span className="truncate text-center px-20 sm:px-24">{displayChallenge.endActorName}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-body-sm">
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${getStatusColor()}`}>
                Status: {getGameStatus()}
              </span>
              <span className="text-muted">
                Moves: {currentMoves}/6
              </span>
            </div>
            
            {onFlip && (
              <Button
                onClick={onFlip}
                disabled={!canFlip}
                variant="outline"
                size="sm"
                className="border-game-blue text-game-blue hover:bg-game-blue hover:text-white text-xs btn-hover button-radius transition-all duration-200"
              >
                <ArrowLeftRight className="w-3 h-3 mr-1" />
                Switch Starting Actor
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
