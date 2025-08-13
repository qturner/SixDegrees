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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" className="mr-3">
              <defs>
                <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#667eea', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#764ba2', stopOpacity: 1}} />
                </linearGradient>
              </defs>
              
              {/* Chain of hexagons */}
              <polygon points="5,20 10,12 20,12 25,20 20,28 10,28" fill="url(#hexGrad)" opacity="0.9"/>
              <polygon points="20,20 25,12 35,12 40,20 35,28 25,28" fill="url(#hexGrad)" opacity="0.8"/>
              <polygon points="35,20 40,12 50,12 55,20 50,28 40,28" fill="url(#hexGrad)" opacity="0.7"/>
              <polygon points="50,20 55,12 65,12 70,20 65,28 55,28" fill="url(#hexGrad)" opacity="0.6"/>
              <polygon points="65,20 70,12 80,12 85,20 80,28 70,28" fill="url(#hexGrad)" opacity="0.5"/>
              <polygon points="80,20 85,12 95,12 100,20 95,28 85,28" fill="url(#hexGrad)" opacity="0.4"/>
              
              {/* Numbers */}
              <text x="15" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">1</text>
              <text x="30" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">2</text>
              <text x="45" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">3</text>
              <text x="60" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">4</text>
              <text x="75" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">5</text>
              <text x="90" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">6</text>
            </svg>
            <h1 className="text-2xl sm:text-3xl font-bold text-game-primary">Six Degrees of Separation</h1>
          </div>
          <p className="text-gray-600 text-base sm:text-lg">Connect two actors through movies in 6 moves or less</p>
          <div className="mt-3 sm:mt-4 text-sm text-gray-500">
            <Calendar className="inline-block w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Today's Challenge - {getCurrentDate()}</span>
            <span className="sm:hidden">Today's Challenge</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 max-w-4xl mx-auto -mt-4 mx-4 sm:mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-game-primary mb-4">Today's Challenge</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3 bg-game-blue text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-lg w-full sm:w-auto justify-center">
              {displayChallenge.startActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${displayChallenge.startActorProfilePath}`}
                  alt={displayChallenge.startActorName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {displayChallenge.startActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <span className="truncate">{displayChallenge.startActorName}</span>
            </div>
            <div className="text-xl sm:text-2xl text-gray-400 rotate-90 sm:rotate-0">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 bg-game-blue text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-lg w-full sm:w-auto justify-center">
              {displayChallenge.endActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${displayChallenge.endActorProfilePath}`}
                  alt={displayChallenge.endActorName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {displayChallenge.endActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <span className="truncate">{displayChallenge.endActorName}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm">
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${getStatusColor()}`}>
                Status: {getGameStatus()}
              </span>
              <span className="text-gray-600">
                Moves: {currentMoves}/6
              </span>
            </div>
            
            {onFlip && (
              <Button
                onClick={onFlip}
                disabled={!canFlip}
                variant="outline"
                size="sm"
                className="border-game-blue text-game-blue hover:bg-game-blue hover:text-white text-xs"
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
