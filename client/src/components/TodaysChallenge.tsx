import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Actor {
  id: number;
  name: string;
  profilePath?: string;
}

interface Challenge {
  id: string;
  startActorId: number;
  startActorName: string;
  startActorProfilePath?: string | null;
  endActorId: number;
  endActorName: string;
  endActorProfilePath?: string | null;
  date: string;
}

interface GameResult {
  valid: boolean;
  completed?: boolean;
  message?: string;
}

interface TodaysChallengeProps {
  challenge: Challenge;
  currentMoves: number;
  isFlipped: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  gameResult?: GameResult | null;
}

export default function TodaysChallenge({ 
  challenge, 
  currentMoves, 
  isFlipped, 
  onFlip, 
  canFlip = false,
  gameResult 
}: TodaysChallengeProps) {
  // Handle flipped display of actors
  const displayChallenge = isFlipped 
    ? {
        ...challenge,
        startActorId: challenge.endActorId,
        startActorName: challenge.endActorName,
        startActorProfilePath: challenge.endActorProfilePath,
        endActorId: challenge.startActorId,
        endActorName: challenge.startActorName,
        endActorProfilePath: challenge.startActorProfilePath,
      }
    : challenge;

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
    <div className="bg-game-surface border border-game-accent card-radius shadow-card hover:shadow-card-hover transition-all duration-300 spacing-lg mb-6 sm:mb-8">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-heading-md text-game-primary mb-4">Today's Challenge</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4">
          <div className="relative bg-game-primary text-game-background spacing-sm sm:px-6 sm:py-3 button-radius font-medium text-body w-full sm:w-auto transition-all duration-200 hover:shadow-card-hover flex items-center justify-center">
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
          <div className="text-xl sm:text-2xl text-game-accent rotate-90 sm:rotate-0 transition-transform duration-300">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="relative bg-game-primary text-game-background spacing-sm sm:px-6 sm:py-3 button-radius font-medium text-body w-full sm:w-auto transition-all duration-200 hover:shadow-card-hover flex items-center justify-center">
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
            <span className="text-game-accent">
              Moves: {currentMoves}/6
            </span>
          </div>
          
          {onFlip && (
            <Button
              onClick={onFlip}
              disabled={!canFlip}
              variant="outline"
              size="sm"
              className="border-game-primary text-game-primary hover:bg-game-primary hover:text-white text-xs btn-hover button-radius transition-all duration-200"
            >
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              Switch Starting Actor
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}